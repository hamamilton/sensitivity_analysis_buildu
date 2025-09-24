import os
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import xml.etree.ElementTree as ET

# Deployment timestamp: 2025-09-23 - Backend redeployment with fixed endpoints
app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Sensitivity Analysis & GLA API is running'})

def calculate_sensitivity(xml_file):
    try:
        pre_adj_values = []
        post_adj_values = []
        comparables = []
        subject_property = None
        comp_number = 0
        tree = ET.parse(xml_file)
        root = tree.getroot()
        for comp in root.findall('.//COMPARABLE_SALE'):
            property_sequence_id = comp.get('PropertySequenceIdentifier')
            pre_adj = comp.get('PropertySalesAmount')
            post_adj = comp.get('AdjustedSalesPriceAmount')
            total_adj_percent = comp.get('SalePriceTotalAdjustmentNetPercent')
            sale_date = comp.get('SaleDate')
            location = comp.find('.//LOCATION')
            if location is not None:
                street = location.get('PropertyStreetAddress', 'Unknown')
                street2 = location.get('PropertyStreetAddress2', '')
                address = f"{street}, {street2}".strip(', ')
            else:
                address = 'Unknown'

            comp_type = 'Unknown'
            for adjustment in comp.findall('.//SALE_PRICE_ADJUSTMENT'):
                if adjustment.get('_Type') == 'SalesConcessions':
                    comp_type = adjustment.get('_Description', 'Unknown')
                    break
            if comp_type == 'ArmLth':
                comp_type = 'Sale'

            try:
                pre_adj = float(pre_adj) if pre_adj is not None else None
                post_adj = float(post_adj) if post_adj is not None else None
            except ValueError:
                pre_adj = None
                post_adj = None

            if property_sequence_id == '0':
                subject_property = {
                    'property_type': 'Subject',
                    'address': address,
                    'pre_adj': pre_adj if pre_adj is not None else 'N/A',
                    'post_adj': 'N/A',
                    'comp_type': 'N/A',
                    'total_adj_percent': 'N/A',
                    'sale_date': 'N/A',
                }
            else:
                comp_number += 1
                comparables.append({
                    'property_type': f'Comparable {comp_number}',
                    'address': address,
                    'pre_adj': pre_adj if pre_adj is not None else 'N/A',
                    'post_adj': post_adj if post_adj is not None else 'N/A',
                    'comp_type': comp_type,
                    'total_adj_percent': total_adj_percent if total_adj_percent is not None else 'N/A',
                    'sale_date': sale_date if sale_date is not None else 'N/A',
                })
                if post_adj is not None and comp_type == 'Sale':
                    pre_adj_values.append(pre_adj)
                    post_adj_values.append(post_adj)

        if not subject_property:
            return {'error': 'No subject property found in the XML file.'}
        if not comparables:
            return {'error': 'No valid comparable data found in the XML file.'}

        pre_adj_range = {
            'min': min(pre_adj_values) if pre_adj_values else 'N/A',
            'max': max(pre_adj_values) if pre_adj_values else 'N/A',
        }
        post_adj_range = {
            'min': min(post_adj_values) if post_adj_values else 'N/A',
            'max': max(post_adj_values) if post_adj_values else 'N/A',
        }

        return {
            'subject_property': subject_property,
            'comparables': comparables,
            'pre_adj_range': pre_adj_range,
            'post_adj_range': post_adj_range,
        }
    except ET.ParseError as e:
        return {'error': f'Failed to parse XML file. Ensure it is well-formed. {str(e)}'}
    except ValueError as e:
        return {'error': f'Invalid data in XML file: {str(e)}'}
    except Exception as e:
        return {'error': f'An unexpected error occurred: {str(e)}'}

@app.route('/api/sensitivity/calculate', methods=['POST'])
def sensitivity_calculate():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file:
        try:
            results = calculate_sensitivity(file)
            return jsonify(results)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/calculate', methods=['POST'])
@cross_origin()
def calculate_gla_adjustment():
    """
    Calculate GLA adjustment using proper Ratterman method
    Adjusts each comparable to market average price per square foot
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Extract comparables (subject_gla is optional for this method)
        comparables = data.get('comparables', [])
        subject_gla = data.get('subject_gla')  # Optional
        
        if not comparables or len(comparables) == 0:
            return jsonify({"error": "At least one comparable is required"}), 400
        
        # Validate and filter comparables
        valid_comparables = []
        for i, comp in enumerate(comparables):
            required_comp_fields = ['gla', 'price']
            for field in required_comp_fields:
                if field not in comp:
                    return jsonify({"error": f"Comparable {i+1} missing field: {field}"}), 400
            
            try:
                comp_gla = float(comp['gla'])
                comp_price = float(comp['price'])
                comp_address = comp.get('address', 'N/A')
                
                if comp_price <= 0 or comp_gla <= 0:
                    continue
                    
                valid_comparables.append({
                    'comparable_number': i + 1,
                    'address': comp_address,
                    'original_gla': comp_gla,
                    'original_price': comp_price,
                    'price_per_sqft': round(comp_price / comp_gla, 2)
                })
            except (ValueError, TypeError):
                continue
        
        if len(valid_comparables) < 1:
            return jsonify({"error": "At least one valid comparable required"}), 400
        
        # Ratterman method: calculate averages
        avg_price_per_sqft = sum(c['price_per_sqft'] for c in valid_comparables) / len(valid_comparables)
        avg_gla = sum(c['original_gla'] for c in valid_comparables) / len(valid_comparables)
        
        # Calculate GLA adjustment for each comparable
        results = []
        for comp in valid_comparables:
            # Calculate differences and adjustments
            price_per_sqft_diff = avg_price_per_sqft - comp['price_per_sqft']
            gla_diff_from_avg = comp['original_gla'] - avg_gla
            
            # Ratterman adjustment: (market_avg_price_per_sf - comp_price_per_sf) × comp_gla
            gla_adjustment = price_per_sqft_diff * comp['original_gla']
            adjusted_price = comp['original_price'] + gla_adjustment
            
            result = {
                'comparable_number': comp['comparable_number'],
                'address': comp['address'],
                'original_gla': comp['original_gla'],
                'original_price': comp['original_price'],
                'price_per_sqft': comp['price_per_sqft'],
                'gla_diff_from_avg': round(gla_diff_from_avg, 0),
                'price_per_sqft_diff': round(price_per_sqft_diff, 2),
                'adjustment_per_sqft': round(price_per_sqft_diff, 2),  # Same as price_per_sqft_diff for clarity
                'gla_adjustment': round(gla_adjustment, 2),
                'adjusted_price': round(adjusted_price, 2),
                'calculation_breakdown': {
                    'formula': f"({avg_price_per_sqft:.2f} - {comp['price_per_sqft']:.2f}) × {comp['original_gla']:.0f}",
                    'step_by_step': f"{price_per_sqft_diff:.2f} × {comp['original_gla']:.0f} = {gla_adjustment:.2f}"
                }
            }
            
            results.append(result)
        
        # Calculate summary statistics
        adjusted_prices = [r['adjusted_price'] for r in results]
        avg_adjusted_price = sum(adjusted_prices) / len(adjusted_prices)
        
        response_data = {
            'subject_gla': subject_gla,  # Optional, may be null
            'comparables_analysis': results,
            'summary': {
                'average_adjusted_price': round(avg_adjusted_price, 2),
                'average_price_per_sqft': round(avg_price_per_sqft, 2),
                'average_gla': round(avg_gla, 0),
                'number_of_comparables': len(results),
                'calculation_method': 'Ratterman Method - Market Average Price Per Square Foot'
            }
        }
        
        return jsonify(response_data)
        
    except ValueError as e:
        return jsonify({"error": f"Invalid numeric value: {str(e)}"}), 400
    except Exception as e:
        print(f"Error in GLA calculation: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Calculation error: {str(e)}"}), 500

# Backward compatibility: File upload endpoint for GLA calculation
@app.route('/api/calculate_gla', methods=['POST'])
@cross_origin() 
def calculate_gla_from_file():
    """
    Backward compatibility endpoint for file-based GLA calculation
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # For now, return a message indicating this endpoint is available
        # You can implement file parsing logic here if needed
        return jsonify({
            "message": "File upload endpoint available",
            "filename": file.filename,
            "note": "Use /api/calculate endpoint with JSON data for GLA calculations"
        })
        
    except Exception as e:
        print(f"Error in file upload: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))  # Default to 8080 if PORT is not set
    app.run(debug=True, port=port)

application = app
