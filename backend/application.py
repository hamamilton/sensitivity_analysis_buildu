import os
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import xml.etree.ElementTree as ET
import numpy as np
from scipy import stats
from sklearn.linear_model import LinearRegression
import pandas as pd
import json

# Deployment timestamp: 2025-09-24 - CORS policy update
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

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

@app.route('/api/ratterman-full', methods=['POST'])
@cross_origin()
def ratterman_full_analysis():
    """
    Full Ratterman Method Implementation with Linear Regression
    
    Accepts comprehensive property data including:
    - Sale price, GLA, lot size, condition, date of sale, garage spaces, amenities
    - Calculates adjustment factors for non-GLA factors
    - Strips adjustments to get "bare price" 
    - Performs linear regression on bare price vs GLA
    - Returns market-derived GLA adjustment factor
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Extract subject property and comparables
        subject_property = data.get('subject_property', {})
        comparables = data.get('comparables', [])
        adjustment_factors = data.get('adjustment_factors', {})
        
        # Weak data check
        if len(comparables) < 7: # Example threshold for weak data
            return jsonify({
                "guidance": "The number of comparables is low for a credible regression analysis. Please consider using the alternative methods below for a more robust conclusion.",
                "regression_allowed": False
            }), 200
        
        # Validate required fields
        required_fields = ['sale_price', 'gla']
        for i, comp in enumerate(comparables):
            for field in required_fields:
                if field not in comp or comp[field] is None:
                    return jsonify({"error": f"Comparable {i+1} missing required field: {field}"}), 400
        
        # Step 2: Calculate bare prices by adjusting for non-GLA factors
        adjusted_comparables = []
        
        for i, comp in enumerate(comparables):
            try:
                sale_price = float(comp['sale_price'])
                gla = float(comp['gla'])
                
                if sale_price <= 0 or gla <= 0:
                    continue
                
                # Calculate adjustments for non-GLA factors
                bare_price = sale_price
                adjustments_applied = {}
                total_adjustment = 0
                
                # Time adjustment (date of sale)
                if 'date_of_sale' in comp and 'time_adjustment_per_month' in adjustment_factors:
                    # Simple time adjustment - in real implementation would calculate months difference
                    time_adj = float(adjustment_factors.get('time_adjustment_per_month', 0)) * float(comp.get('months_old', 0))
                    bare_price += time_adj
                    adjustments_applied['time'] = time_adj
                    total_adjustment += time_adj
                
                # Lot size adjustment
                if 'lot_size' in comp and subject_property.get('lot_size'):
                    lot_diff = float(comp['lot_size']) - float(subject_property['lot_size'])
                    lot_adj_factor = float(adjustment_factors.get('lot_size_per_sqft', 0))
                    lot_adj = lot_diff * lot_adj_factor
                    bare_price += lot_adj
                    adjustments_applied['lot_size'] = lot_adj
                    total_adjustment += lot_adj
                
                # Condition adjustment
                if 'condition_rating' in comp and subject_property.get('condition_rating'):
                    condition_diff = float(comp['condition_rating']) - float(subject_property['condition_rating'])
                    condition_adj_factor = float(adjustment_factors.get('condition_per_point', 0))
                    condition_adj = condition_diff * condition_adj_factor
                    bare_price += condition_adj
                    adjustments_applied['condition'] = condition_adj
                    total_adjustment += condition_adj
                
                # Garage adjustment
                if 'garage_spaces' in comp and subject_property.get('garage_spaces'):
                    garage_diff = float(comp['garage_spaces']) - float(subject_property['garage_spaces'])
                    garage_adj_factor = float(adjustment_factors.get('garage_per_space', 0))
                    garage_adj = garage_diff * garage_adj_factor
                    bare_price += garage_adj
                    adjustments_applied['garage'] = garage_adj
                    total_adjustment += garage_adj
                
                # Additional amenities adjustments could be added here
                # Pool, deck, basement finish, etc.
                
                adjusted_comp = {
                    'comparable_number': i + 1,
                    'address': comp.get('address', 'N/A'),
                    'original_sale_price': sale_price,
                    'gla': gla,
                    'bare_price': round(bare_price, 2),
                    'total_adjustments': round(total_adjustment, 2),
                    'adjustments_applied': adjustments_applied,
                    'price_per_sqft_original': round(sale_price / gla, 2),
                    'bare_price_per_sqft': round(bare_price / gla, 2)
                }
                
                # Add all the original comparable data for reference
                for key, value in comp.items():
                    if key not in adjusted_comp:
                        adjusted_comp[key] = value
                
                adjusted_comparables.append(adjusted_comp)
                
            except (ValueError, TypeError) as e:
                continue
        
        if len(adjusted_comparables) < 3:
            return jsonify({"error": "At least 3 valid comparables required after processing"}), 400
        
        # Step 3: Perform Linear Regression Analysis
        # Extract GLA (x) and Bare Price (y) for regression
        gla_values = [comp['gla'] for comp in adjusted_comparables]
        bare_price_values = [comp['bare_price'] for comp in adjusted_comparables]
        
        # Convert to numpy arrays for regression
        X = np.array(gla_values).reshape(-1, 1)
        y = np.array(bare_price_values)
        
        # Perform linear regression
        model = LinearRegression()
        model.fit(X, y)
        
        # Extract regression results
        slope = float(model.coef_[0])  # GLA adjustment factor ($/sqft)
        intercept = float(model.intercept_)  # Non-GLA base value
        r_squared = model.score(X, y)  # Coefficient of determination
        
        # Calculate standard error and statistical measures
        y_pred = model.predict(X)
        residuals = y - y_pred
        mse = np.mean(residuals**2)
        rmse = np.sqrt(mse)
        std_error = np.sqrt(mse / (len(gla_values) - 2))
        
        # Additional statistical measures using scipy
        correlation, p_value = stats.pearsonr(gla_values, bare_price_values)
        
        # Step 4: Apply the derived GLA adjustment factor
        subject_gla = float(subject_property.get('gla', 0)) if subject_property.get('gla') else None
        
        final_adjustments = []
        for comp in adjusted_comparables:
            if subject_gla:
                gla_difference = subject_gla - comp['gla']
                gla_adjustment = gla_difference * slope
                final_adjusted_price = comp['bare_price'] + gla_adjustment
                
                final_adjustments.append({
                    'comparable_number': comp['comparable_number'],
                    'address': comp['address'],
                    'original_sale_price': comp['original_sale_price'],
                    'gla': comp['gla'],
                    'bare_price': comp['bare_price'],
                    'gla_difference': round(gla_difference, 0),
                    'gla_adjustment': round(gla_adjustment, 2),
                    'final_adjusted_price': round(final_adjusted_price, 2),
                    'total_non_gla_adjustments': comp['total_adjustments']
                })
        
        # Prepare comprehensive response
        response_data = {
            'method': 'Full Ratterman Method with Linear Regression',
            'subject_property': subject_property,
            'adjustment_factors_used': adjustment_factors,
            'step1_comparables': adjusted_comparables,
            'step2_regression_analysis': {
                'equation': f'Bare Price = {slope:.2f} × GLA + {intercept:.2f}',
                'gla_adjustment_factor': round(slope, 2),
                'base_value_intercept': round(intercept, 2),
                'r_squared': round(r_squared, 4),
                'correlation_coefficient': round(correlation, 4),
                'p_value': round(p_value, 6),
                'rmse': round(rmse, 2),
                'standard_error': round(std_error, 2),
                'sample_size': len(adjusted_comparables),
                'statistical_significance': 'Significant' if p_value < 0.05 else 'Not Significant'
            },
            'step3_final_adjustments': final_adjustments if subject_gla else None,
            'summary': {
                'market_derived_gla_factor': f'${slope:.2f} per square foot',
                'confidence_level': 'High' if r_squared > 0.8 else 'Medium' if r_squared > 0.6 else 'Low',
                'recommended_use': 'Defensible for appraisal' if r_squared > 0.7 and p_value < 0.05 else 'Additional analysis recommended'
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error in Ratterman full analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Analysis error: {str(e)}"}), 500

@app.route('/api/paired-sales', methods=['POST'])
@cross_origin()
def paired_sales_analysis():
    try:
        data = request.get_json()
        comp_a = data['comp_a']
        comp_b = data['comp_b']

        price_diff = abs(float(comp_a['sale_price']) - float(comp_b['sale_price']))
        gla_diff = abs(float(comp_a['gla']) - float(comp_b['gla']))

        if gla_diff == 0:
            return jsonify({'error': 'GLA values cannot be identical.'}), 400

        adjustment = price_diff / gla_diff
        
        # Simple credibility score
        diff_count = 0
        for key in comp_a:
            if key not in ['sale_price', 'gla', 'address'] and comp_a.get(key) != comp_b.get(key):
                diff_count += 1
        
        credibility = "High" if diff_count == 0 else "Medium" if diff_count <= 2 else "Low"

        return jsonify({
            'gla_adjustment_per_sf': round(adjustment, 2),
            'credibility_score': credibility,
            'differing_variables': diff_count
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/depreciated-cost', methods=['POST'])
@cross_origin()
def depreciated_cost_analysis():
    try:
        data = request.get_json()
        replacement_cost = float(data['replacement_cost_sf'])
        depreciation = float(data['depreciation_rate'])

        adjustment = replacement_cost * (1 - depreciation)
        return jsonify({'gla_adjustment_per_sf': round(adjustment, 2)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/market-ratio', methods=['POST'])
@cross_origin()
def market_ratio_analysis():
    try:
        data = request.get_json()
        avg_price_sf = float(data['avg_price_sf'])
        contrib_percent = float(data['contrib_percent'])

        adjustment = avg_price_sf * contrib_percent
        return jsonify({'gla_adjustment_per_sf': round(adjustment, 2)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))  # Default to 8080 if PORT is not set
    app.run(debug=True, port=port)

application = app
