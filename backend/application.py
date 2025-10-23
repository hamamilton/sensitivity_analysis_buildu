import os
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import xml.etree.ElementTree as ET
import json
import re
from difflib import SequenceMatcher
import statistics
import math

# Simple linear regression function
def linear_regression(x_values, y_values):
    """Simple linear regression: y = mx + b"""
    n = len(x_values)
    if n < 2:
        return 0, 0  # slope, intercept
    
    sum_x = sum(x_values)
    sum_y = sum(y_values)
    sum_xy = sum(x * y for x, y in zip(x_values, y_values))
    sum_x_squared = sum(x * x for x in x_values)
    
    # Calculate slope (m) and intercept (b)
    denominator = n * sum_x_squared - sum_x * sum_x
    if denominator == 0:
        return 0, sum_y / n  # No slope, just average
    
    slope = (n * sum_xy - sum_x * sum_y) / denominator
    intercept = (sum_y - slope * sum_x) / n
    
    return slope, intercept

# Load environment variables
PORT = int(os.environ.get('PORT', 8080))
FLASK_ENV = os.environ.get('FLASK_ENV', 'development')

# Deployment timestamp: 2025-10-23 - Production deployment fixes
app = Flask(__name__)

# Configure CORS for production
if FLASK_ENV == 'production':
    # Production CORS - allow specific origins
    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "http://localhost:3000",  # Local development
                "https://your-frontend-domain.onrender.com",  # Replace with your actual frontend domain
                "https://*.onrender.com"  # Allow all Render.com subdomains for now
            ]
        }
    })
else:
    # Development CORS - allow all origins
    CORS(app, resources={r"/api/*": {"origins": "*"}})

def detect_outliers(comparables, threshold_std_devs=1.5):
    """
    Detect outliers in price per square foot using standard deviation method.
    
    Args:
        comparables: List of comparable properties with price_per_sqft
        threshold_std_devs: Number of standard deviations beyond which to consider outliers
        
    Returns:
        dict: {
            'valid_comparables': list of comparables without outliers,
            'outliers': list of outlier comparables with reason,
            'outlier_info': dict with statistical information about outliers
        }
    """
    if len(comparables) < 3:
        # If we have fewer than 3 comparables, don't remove any as outliers
        return {
            'valid_comparables': comparables,
            'outliers': [],
            'outlier_info': {
                'detection_applied': False,
                'reason': 'Insufficient data for outlier detection (minimum 3 comparables required)',
                'threshold_std_devs': threshold_std_devs,
                'original_count': len(comparables),
                'final_count': len(comparables)
            }
        }
    
    # Extract price per sqft values
    price_per_sqft_values = [c['price_per_sqft'] for c in comparables]
    
    # Calculate mean and standard deviation
    mean_ppsf = statistics.mean(price_per_sqft_values)
    std_ppsf = statistics.stdev(price_per_sqft_values)  # Sample standard deviation
    
    # Define outlier bounds
    lower_bound = mean_ppsf - (threshold_std_devs * std_ppsf)
    upper_bound = mean_ppsf + (threshold_std_devs * std_ppsf)
    
    valid_comparables = []
    outliers = []
    
    for comp in comparables:
        ppsf = comp['price_per_sqft']
        
        if ppsf < lower_bound:
            outliers.append({
                **comp,
                'outlier_reason': f'Price per sqft ${ppsf:.2f} is {abs(ppsf - mean_ppsf)/std_ppsf:.1f} standard deviations below mean (${mean_ppsf:.2f})',
                'outlier_type': 'below_threshold',
                'std_devs_from_mean': (ppsf - mean_ppsf) / std_ppsf
            })
        elif ppsf > upper_bound:
            outliers.append({
                **comp,
                'outlier_reason': f'Price per sqft ${ppsf:.2f} is {abs(ppsf - mean_ppsf)/std_ppsf:.1f} standard deviations above mean (${mean_ppsf:.2f})',
                'outlier_type': 'above_threshold',
                'std_devs_from_mean': (ppsf - mean_ppsf) / std_ppsf
            })
        else:
            valid_comparables.append(comp)
    
    return {
        'valid_comparables': valid_comparables,
        'outliers': outliers,
        'outlier_info': {
            'detection_applied': True,
            'threshold_std_devs': threshold_std_devs,
            'mean_price_per_sqft': round(mean_ppsf, 2),
            'std_dev_price_per_sqft': round(std_ppsf, 2),
            'lower_bound': round(lower_bound, 2),
            'upper_bound': round(upper_bound, 2),
            'original_count': len(comparables),
            'final_count': len(valid_comparables),
            'outliers_removed': len(outliers)
        }
    }

def intelligent_column_mapper(columns):
    """
    AI-powered column header mapping using semantic analysis, fuzzy matching, and keyword recognition.
    Returns a mapping dictionary from original column names to standardized field names.
    """
    
    # Define semantic field patterns with keywords, synonyms, and variations
    field_patterns = {
        'sale_price': {
            'keywords': ['price', 'sale', 'sold', 'amount', 'cost', 'value', 'close', 'contract'],
            'variations': ['sale_price', 'saleprice', 'sales_price', 'selling_price', 'sold_price', 
                          'adjusted_sale_price', 'final_price', 'transaction_price', 'purchase_price',
                          'close_price', 'contract_price', 'list_price', 'price'],
            'weight': 1.0
        },
        'gla': {
            'keywords': ['gla', 'living', 'area', 'sqft', 'square', 'feet', 'finished', 'heated', 'building', 'size'],
            'variations': ['gla', 'gross_living_area', 'living_area', 'sqft', 'sq_ft', 'square_feet',
                          'finished_area', 'heated_area', 'total_living_area', 'above_grade_finished_area',
                          'interior_sqft', 'livable_area', 'conditioned_area', 'floor_area', 'square_feet',
                          'building_size', 'total_square_feet', 'heated_sqft', 'building size', 'square feet'],
            'weight': 1.0
        },
        'lot_size': {
            'keywords': ['lot', 'land', 'acreage', 'site', 'parcel', 'acres'],
            'variations': ['lot_size', 'lotsize', 'lot_sq_ft', 'lot_sqft', 'land_area', 'site_area',
                          'parcel_size', 'lot_area', 'land_size', 'acreage', 'acres', 'lot size'],
            'weight': 0.8
        },
        'condition_rating': {
            'keywords': ['condition', 'quality', 'rating', 'grade', 'score'],
            'variations': ['condition', 'condition_rating', 'condition_score', 'quality_rating',
                          'property_condition', 'overall_condition', 'condition_grade'],
            'weight': 0.7
        },
        'garage_spaces': {
            'keywords': ['garage', 'parking', 'car', 'stall', 'space'],
            'variations': ['garage', 'garage_spaces', 'garage_stalls', 'garages', 'parking_spaces',
                          'car_spaces', 'covered_parking', 'garage_count'],
            'weight': 0.6
        },
        'date_of_sale': {
            'keywords': ['date', 'sale', 'sold', 'close', 'closing', 'contract', 'settlement'],
            'variations': ['date_of_sale', 'sale_date', 'sold_date', 'close_date', 'closing_date',
                          'contract_date', 'settlement_date', 'transaction_date', 'deed_date'],
            'weight': 0.7
        },
        'address': {
            'keywords': ['address', 'street', 'property', 'location'],
            'variations': ['address', 'property_address', 'street_address', 'location', 'property_location'],
            'weight': 0.5
        },
        'date_of_sale': {
            'keywords': ['date', 'sale', 'closing', 'sold', 'transaction'],
            'variations': ['date_of_sale', 'sale_date', 'closing_date', 'sold_date', 'transaction_date'],
            'weight': 0.4
        }
    }
    
    def calculate_similarity_score(column_name, field_info):
        """Calculate semantic similarity score between column name and field patterns."""
        column_lower = str(column_name).lower()
        column_normalized = column_lower.replace(' ', '_').replace('-', '_')
        score = 0.0
        
        # Exact match with variations gets highest score (check both original and normalized)
        for variation in field_info['variations']:
            if column_lower == variation.lower() or column_normalized == variation.lower().replace(' ', '_').replace('-', '_'):
                return 1.0 * field_info['weight']
        
        # Fuzzy string matching with variations
        max_fuzzy_score = 0.0
        for variation in field_info['variations']:
            variation_normalized = variation.lower().replace(' ', '_').replace('-', '_')
            fuzzy_score = SequenceMatcher(None, column_normalized, variation_normalized).ratio()
            max_fuzzy_score = max(max_fuzzy_score, fuzzy_score)
        
        # Keyword presence scoring
        keyword_score = 0.0
        for keyword in field_info['keywords']:
            if keyword in column_lower:
                keyword_score += 1.0
        keyword_score = min(keyword_score / len(field_info['keywords']), 1.0)
        
        # Combine scores with weights
        combined_score = (max_fuzzy_score * 0.7 + keyword_score * 0.3) * field_info['weight']
        
        return combined_score
    
    print(f"DEBUG: Analyzing columns for intelligent mapping: {columns[:10]}...")  # Show first 10 columns
    
    # Create mapping dictionary
    column_mapping = {}
    used_fields = set()
    
    # Sort columns by length (shorter names often more specific)
    sorted_columns = sorted(columns, key=len)
    
    # Track all potential mappings for debugging
    all_potential_mappings = []
    
    for column in sorted_columns:
        best_field = None
        best_score = 0.0
        column_scores = {}
        
        for field_name, field_info in field_patterns.items():
            if field_name in used_fields:
                continue
                
            score = calculate_similarity_score(column, field_info)
            column_scores[field_name] = score
            
            if score > best_score and score > 0.15:  # Lower threshold to catch more potential matches
                best_score = score
                best_field = field_name
        
        # Log potential mappings for debugging
        if any(score > 0.1 for score in column_scores.values()):
            top_scores = sorted(column_scores.items(), key=lambda x: x[1], reverse=True)[:3]
            all_potential_mappings.append({
                'column': column,
                'top_matches': top_scores,
                'selected': best_field,
                'selected_score': best_score
            })

        if best_field:
            column_mapping[best_field] = column  # Fixed: field -> column mapping
            used_fields.add(best_field)
    
    # Debug output
    print(f"DEBUG: Column mapping results: {column_mapping}")
    print(f"DEBUG: Top 10 potential mappings considered:")
    for mapping in all_potential_mappings[:10]:
        print(f"  '{mapping['column']}' -> {mapping['top_matches']} (selected: {mapping['selected']} with score {mapping['selected_score']:.3f})")
    
    return column_mapping

def smart_normalize_comparable(comp, column_mapping):
    """
    Normalize comparable data using AI-generated column mapping with fallback logic.
    """
    normalized = {}
    
    # Apply intelligent mapping
    for original_key, value in comp.items():
        if original_key in column_mapping:
            normalized[column_mapping[original_key]] = value
        else:
            # Keep unmapped fields as-is
            normalized[original_key] = value
    
    # Smart fallback logic for critical fields with null values
    if normalized.get('gla') is None or normalized.get('gla') == 'NA':
        # Try alternative GLA fields (including original column names)
        gla_alternatives = ['Square Feet', 'Building Size', 'Total Square Feet', 'Heated SQFT', 'Living Area', 'GLA', 'sqft', 'sq_ft']
        for alt_field in gla_alternatives:
            if alt_field in normalized and normalized[alt_field] not in [None, 'NA', '', 0]:
                try:
                    # Extract numeric value if it's a string with numbers
                    alt_value = str(normalized[alt_field])
                    import re
                    # Remove commas and extract numbers
                    cleaned_value = alt_value.replace(',', '').replace('$', '')
                    numbers = re.findall(r'\d+\.?\d*', cleaned_value)
                    if numbers:
                        normalized['gla'] = float(numbers[0])
                        print(f"DEBUG: Found GLA in {alt_field}: {normalized['gla']}")
                        break
                except Exception as e:
                    print(f"DEBUG: Failed to parse {alt_field} value {normalized[alt_field]}: {e}")
                    continue
    
    if normalized.get('sale_price') is None or normalized.get('sale_price') == 'NA':
        # Try alternative price fields  
        price_alternatives = ['Close Price', 'Contract Price', 'List Price', 'Sold Price', 'Price', 'sale_price']
        for alt_field in price_alternatives:
            if alt_field in normalized and normalized[alt_field] not in [None, 'NA', '', 0]:
                try:
                    # Extract numeric value from price string
                    alt_value = str(normalized[alt_field]).replace('$', '').replace(',', '')
                    numbers = re.findall(r'\d+\.?\d*', alt_value)
                    if numbers:
                        normalized['sale_price'] = float(numbers[0])
                        print(f"DEBUG: Found sale_price in {alt_field}: {normalized['sale_price']}")
                        break
                except Exception as e:
                    print(f"DEBUG: Failed to parse {alt_field} value {normalized[alt_field]}: {e}")
                    continue
    
    return normalized

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'status': 'ok', 
        'message': 'BuildU Property Analysis API',
        'version': '1.0',
        'endpoints': [
            '/api/health',
            '/api/auth/token', 
            '/api/sensitivity/calculate',
            '/api/calculate'
        ]
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Sensitivity Analysis & GLA API is running'})

@app.route('/api/auth/token', methods=['POST'])
@cross_origin()
def validate_token():
    """
    Validate authentication token from GoHighLevel
    Expected payload: {"token": "base64_encoded_data"}
    """
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Token is required'}), 400
        
        # Decode the token (you can implement more sophisticated validation here)
        try:
            import base64
            decoded_data = base64.b64decode(token).decode('utf-8')
            
            # You can parse JSON or other structured data from the token
            # For example: {"email": "user@example.com", "timestamp": "...", "signature": "..."}
            try:
                user_data = json.loads(decoded_data)
                email = user_data.get('email')
                
                if not email:
                    return jsonify({'error': 'Invalid token format'}), 400
                
                return jsonify({
                    'success': True,
                    'user': {'email': email}
                })
            except json.JSONDecodeError:
                # If it's not JSON, treat it as a plain email
                return jsonify({
                    'success': True,
                    'user': {'email': decoded_data}
                })
                
        except Exception as e:
            return jsonify({'error': 'Invalid token'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
            
            # Extract sale date from SALE_PRICE_ADJUSTMENT with _Type="DateOfSale"
            sale_date = None
            for adjustment in comp.findall('.//SALE_PRICE_ADJUSTMENT'):
                if adjustment.get('_Type') == 'DateOfSale':
                    date_desc = adjustment.get('_Description', '')
                    # Parse format like "s03/24;c02/24" - extract sale date (s)
                    if ';' in date_desc and date_desc.startswith('s'):
                        sale_part = date_desc.split(';')[0]
                        if sale_part.startswith('s') and len(sale_part) >= 6:
                            # Convert s03/24 to 03/2024
                            month_year = sale_part[1:]  # Remove 's'
                            if '/' in month_year:
                                month, year = month_year.split('/')
                                # Convert 2-digit year to 4-digit year
                                if len(year) == 2:
                                    year = '20' + year
                                sale_date = f"{month}/{year}"
                    elif date_desc and date_desc != 'Active':
                        # If it's not in expected format but not "Active", use as-is
                        sale_date = date_desc
                    break
            
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
                
                # Determine the sale date - use "N/A" for listings, actual date for sales
                display_sale_date = 'N/A'
                if comp_type == 'Sale' and sale_date is not None:
                    display_sale_date = sale_date
                
                comparables.append({
                    'property_type': f'Comparable {comp_number}',
                    'address': address,
                    'pre_adj': pre_adj if pre_adj is not None else 'N/A',
                    'post_adj': post_adj if post_adj is not None else 'N/A',
                    'comp_type': comp_type,
                    'total_adj_percent': total_adj_percent if total_adj_percent is not None else 'N/A',
                    'sale_date': display_sale_date,
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
        
        # Apply outlier detection based on price per square foot
        outlier_analysis = detect_outliers(valid_comparables, threshold_std_devs=1.5)
        filtered_comparables = outlier_analysis['valid_comparables']
        outliers = outlier_analysis['outliers']
        outlier_info = outlier_analysis['outlier_info']
        
        # Ensure we still have enough comparables after outlier removal
        if len(filtered_comparables) < 1:
            return jsonify({
                "error": "No valid comparables remaining after outlier removal",
                "outlier_details": outlier_analysis
            }), 400
        
        # Ratterman method: calculate averages using filtered comparables
        avg_price_per_sqft = sum(c['price_per_sqft'] for c in filtered_comparables) / len(filtered_comparables)
        avg_gla = sum(c['original_gla'] for c in filtered_comparables) / len(filtered_comparables)
        
        # Calculate GLA adjustment for each filtered comparable
        results = []
        for comp in filtered_comparables:
            # Calculate differences and adjustments
            price_per_sqft_diff = avg_price_per_sqft - comp['price_per_sqft']
            gla_diff_from_avg = comp['original_gla'] - avg_gla
            
            # Corrected GLA adjustment: (comp_gla - avg_gla) × avg_price_per_sqft
            gla_adjustment = gla_diff_from_avg * avg_price_per_sqft
            adjusted_price = comp['original_price'] + gla_adjustment
            
            result = {
                'comparable_number': comp['comparable_number'],
                'address': comp['address'],
                'original_gla': comp['original_gla'],
                'original_price': comp['original_price'],
                'price_per_sqft': comp['price_per_sqft'],
                'gla_diff_from_avg': round(gla_diff_from_avg, 0),
                'price_per_sqft_diff': round(price_per_sqft_diff, 2),
                'adjustment_per_sqft': round(avg_price_per_sqft, 2),  # Price per sqft used in adjustment
                'gla_adjustment': round(gla_adjustment, 2),
                'adjusted_price': round(adjusted_price, 2),
                'calculation_breakdown': {
                    'formula': f"({comp['original_gla']:.0f} - {avg_gla:.0f}) × {avg_price_per_sqft:.2f}",
                    'step_by_step': f"{gla_diff_from_avg:.0f} × {avg_price_per_sqft:.2f} = {gla_adjustment:.2f}"
                }
            }
            
            results.append(result)
        
        # Calculate summary statistics
        adjusted_prices = [r['adjusted_price'] for r in results]
        avg_adjusted_price = sum(adjusted_prices) / len(adjusted_prices)
        
        response_data = {
            'subject_gla': subject_gla,  # Optional, may be null
            'comparables_analysis': results,
            'outliers': outliers,
            'outlier_analysis': outlier_info,
            'summary': {
                'average_adjusted_price': round(avg_adjusted_price, 2),
                'average_price_per_sqft': round(avg_price_per_sqft, 2),
                'average_gla': round(avg_gla, 0),
                'number_of_comparables': len(results),
                'number_of_outliers_removed': len(outliers),
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

@app.route('/api/analyze-columns', methods=['POST'])
@cross_origin()
def analyze_columns():
    """
    Analyze uploaded data columns and return mapping suggestions for user review.
    Returns AI-suggested mappings along with all available columns for user selection.
    """
    try:
        data = request.get_json()
        
        if not data or 'data' not in data:
            return jsonify({"error": "No data provided"}), 400
        
        comparables = data.get('data', [])
        if not comparables:
            return jsonify({"error": "No data found"}), 400
        
        # Extract all unique column names from the dataset
        all_columns = set()
        for comp in comparables:
            all_columns.update(comp.keys())
        all_columns = sorted(list(all_columns))
        
        # Generate intelligent column mapping suggestions
        ai_mapping_raw = intelligent_column_mapper(all_columns)
        
        # Reverse the mapping: field_name -> column_name
        ai_mapping = {}
        for column, field in ai_mapping_raw.items():
            ai_mapping[field] = column
        
        # Find the reverse mapping - what field does each column map to
        column_to_field = {}
        for field, column in ai_mapping.items():
            if column:
                column_to_field[column] = field

        # Categorize columns for better user interface
        potential_mappings = {}
        for field_type in ['sale_price', 'gla', 'lot_size', 'condition_rating', 'garage_spaces', 'address', 'date_of_sale']:
            ai_suggested_column = ai_mapping.get(field_type)
            
            # If this field is mapped by the AI, use high confidence
            if ai_suggested_column:
                confidence = 0.95
                best_match = ai_suggested_column
            else:
                confidence = 0.0
                best_match = None
                
            potential_mappings[field_type] = {
                'ai_suggestion': ai_suggested_column,
                'best_match': best_match,
                'confidence': confidence,
                'candidates': []
            }
        
        # Find potential candidates for each field type
        field_patterns = {
            'sale_price': ['price', 'cost', 'value', 'amount', 'close', 'contract', 'sold'],
            'gla': ['gla', 'sqft', 'square', 'feet', 'area', 'size', 'building', 'living'],
            'lot_size': ['lot', 'land', 'acre', 'site', 'parcel'],
            'condition_rating': ['condition', 'quality', 'rating', 'grade', 'score'],
            'garage_spaces': ['garage', 'parking', 'car', 'stall', 'space'],
            'address': ['address', 'street', 'location', 'property'],
            'date_of_sale': ['date', 'close', 'contract', 'sold', 'sale']
        }
        
        for field_type, keywords in field_patterns.items():
            candidates = []
            for column in all_columns:
                column_lower = column.lower()
                if any(keyword in column_lower for keyword in keywords):
                    # Calculate a simple relevance score
                    relevance = sum(1 for keyword in keywords if keyword in column_lower)
                    # Convert relevance to confidence (0.0 to 1.0)
                    confidence = min(relevance / len(keywords), 1.0)
                    candidates.append({
                        'column': column,
                        'relevance': relevance,
                        'confidence': confidence,
                        'sample_value': None  # Will be filled below
                    })
            
            # Sort by confidence and get top candidates
            candidates.sort(key=lambda x: x['confidence'], reverse=True)
            
            potential_mappings[field_type]['candidates'] = candidates[:5]  # Top 5 candidates
            
            # Make sure AI suggestions have high confidence and aren't overridden
            ai_suggested_column = potential_mappings[field_type]['ai_suggestion']
            if ai_suggested_column:
                # Ensure AI suggestion is the best match with high confidence
                potential_mappings[field_type]['best_match'] = ai_suggested_column
                potential_mappings[field_type]['confidence'] = 0.95
                
                # Make sure AI suggestion is in candidates with high confidence
                ai_candidate_found = False
                for candidate in potential_mappings[field_type]['candidates']:
                    if candidate['column'] == ai_suggested_column:
                        candidate['confidence'] = 0.95
                        ai_candidate_found = True
                        break
                
                if not ai_candidate_found:
                    # Add AI suggestion as top candidate
                    potential_mappings[field_type]['candidates'].insert(0, {
                        'column': ai_suggested_column,
                        'relevance': 999,
                        'confidence': 0.95,
                        'sample_value': None  # Will be filled below
                    })
            elif candidates:
                # Only use pattern matching if no AI suggestion
                potential_mappings[field_type]['best_match'] = candidates[0]['column']
                potential_mappings[field_type]['confidence'] = candidates[0]['confidence']
        
        # Add sample values for better user understanding
        first_comparable = comparables[0] if comparables else {}
        for field_type in potential_mappings:
            for candidate in potential_mappings[field_type]['candidates']:
                column = candidate['column']
                sample_value = first_comparable.get(column, 'N/A')
                if sample_value and len(str(sample_value)) > 50:
                    sample_value = str(sample_value)[:50] + '...'
                candidate['sample_value'] = sample_value
        
        # Count total comparables
        total_comparables = len(comparables)
        
        # Check if we have a reasonable number for analysis
        analysis_feasible = total_comparables >= 3
        recommended_min = 7 if 'ratterman' in request.path else 3
        
        return jsonify({
            'total_comparables': total_comparables,
            'all_columns': all_columns,
            'ai_mapping_suggestions': ai_mapping,  # This is now field -> column
            'potential_mappings': potential_mappings,
            'analysis_feasible': analysis_feasible,
            'recommended_minimum': recommended_min,
            'message': f"Found {total_comparables} comparables with {len(all_columns)} columns. Please review and confirm the column mappings below."
        })
        
    except Exception as e:
        print(f"Error in column analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Column analysis error: {str(e)}"}), 500

def derive_market_adjustment_factors(comparables):
    """
    Derive adjustment factors from market data using paired sales analysis
    and regression techniques for time, lot size, and garage adjustments.
    """
    factors = {}
    
    try:
        # Convert all comparables to proper data types
        valid_comparables = []
        for comp in comparables:
            try:
                sale_price = float(comp.get('sale_price', 0))
                gla = float(comp.get('gla', 0))
                if sale_price > 0 and gla > 0:
                    processed_comp = {
                        'sale_price': sale_price,
                        'gla': gla,
                        'price_per_sqft': sale_price / gla
                    }
                    
                    # Add lot size if available (handle acres conversion)
                    lot_size_fields = ['lot_size', 'lot_sq_ft', 'lot_sqft', 'acres', 'acreage']
                    for lot_field in lot_size_fields:
                        if lot_field in comp and comp[lot_field] not in [None, '', 'NA', 'N/A']:
                            try:
                                lot_value = float(comp[lot_field])
                                if lot_value > 0:
                                    # Convert acres to square feet if needed
                                    if lot_field in ['acres', 'acreage'] and lot_value < 5:  # Likely acres
                                        lot_value = lot_value * 43560  # Convert acres to sqft
                                    processed_comp['lot_size'] = lot_value
                                    break
                            except (ValueError, TypeError):
                                pass
                    
                    # Add garage spaces if available
                    if 'garage_spaces' in comp and comp['garage_spaces'] not in [None, '', 'NA', 'N/A']:
                        try:
                            garage = float(comp['garage_spaces'])
                            if garage >= 0:  # 0 garages is valid
                                processed_comp['garage_spaces'] = garage
                        except (ValueError, TypeError):
                            pass
                    
                    # Add date info if available - look for various date fields
                    date_fields = ['date_of_sale', 'sale_date', 'close_date', 'closing_date']
                    for date_field in date_fields:
                        if date_field in comp and comp[date_field] not in [None, '', 'NA', 'N/A']:
                            processed_comp['sale_date'] = comp[date_field]
                            # Calculate approximate months old (simplified)
                            try:
                                # For now, use a simple heuristic - could be enhanced with date parsing
                                if '2024' in str(comp[date_field]):
                                    processed_comp['months_old'] = 12  # Approximate for 2024 sales
                                elif '2023' in str(comp[date_field]):
                                    processed_comp['months_old'] = 24  # Approximate for 2023 sales
                                else:
                                    processed_comp['months_old'] = 6   # Default recent
                            except:
                                processed_comp['months_old'] = 6
                            break
                    
                    valid_comparables.append(processed_comp)
            except (ValueError, TypeError):
                continue
        
        if len(valid_comparables) < 3:
            print(f"DEBUG: Insufficient valid comparables ({len(valid_comparables)}) for market factor derivation")
            return factors
        
        print(f"DEBUG: Analyzing {len(valid_comparables)} valid comparables for market factors")
        
        # Always provide reasonable default factors based on typical market conditions
        factors = {
            'time_adjustment_per_month': 500,    # Conservative $500/month default
            'lot_size_per_sqft': 3.0,           # Conservative $3/sqft default
            'garage_per_space': 8000            # Conservative $8,000/space default
        }
        
        print(f"DEBUG: Starting with default factors: {factors}")
        
        # Try to derive better factors from market data
        lot_data = [(c['sale_price'], c['lot_size']) for c in valid_comparables if 'lot_size' in c]
        if len(lot_data) >= 3:
            try:
                print(f"DEBUG: Attempting lot size derivation with {len(lot_data)} data points")
                lot_sizes = [d[1] for d in lot_data]
                lot_prices = [d[0] for d in lot_data]
                
                # Remove outliers (simple method)
                lot_size_median = statistics.median(lot_sizes)
                lot_price_median = statistics.median(lot_prices)
                
                filtered_data = [(p, l) for p, l in lot_data 
                                if abs(l - lot_size_median) < 3 * statistics.stdev(lot_sizes) 
                                and abs(p - lot_price_median) < 3 * statistics.stdev(lot_prices)]
                
                if len(filtered_data) >= 3:
                    filtered_lots = [d[1] for d in filtered_data]
                    filtered_prices = [d[0] for d in filtered_data]
                    
                    # Use simple linear regression
                    lot_factor_total, intercept = linear_regression(filtered_lots, filtered_prices)
                    
                    print(f"DEBUG: Lot size regression: slope=${lot_factor_total:.2f}")
                    
                    if lot_factor_total != 0:  # Simple acceptance check
                        # Convert to per sqft adjustment (lot size affects total price)
                        factors['lot_size_per_sqft'] = round(lot_factor_total, 2)
                        print(f"DEBUG: Derived lot size factor: ${lot_factor_total:.2f}/sqft")
                    else:
                        # Provide conservative default if correlation is too low
                        factors['lot_size_per_sqft'] = 5.0  # Conservative $5/sqft default
                        print(f"DEBUG: Using default lot size factor: $5.00/sqft (low correlation)")
            except Exception as e:
                print(f"DEBUG: Could not derive lot size factor: {e}")
                factors['lot_size_per_sqft'] = 5.0  # Conservative default
        
        # DERIVE GARAGE ADJUSTMENT FACTOR
        garage_data = [(c['sale_price'], c['garage_spaces']) for c in valid_comparables if 'garage_spaces' in c]
        if len(garage_data) >= 3:
            try:
                print(f"DEBUG: Attempting garage derivation with {len(garage_data)} data points")
                garage_spaces = [d[1] for d in garage_data]
                garage_prices = [d[0] for d in garage_data]
                
                # Use simple linear regression
                garage_factor, intercept = linear_regression(garage_spaces, garage_prices)
                
                print(f"DEBUG: Garage regression: slope=${garage_factor:.0f}")
                
                if garage_factor != 0:  # Simple acceptance check
                    factors['garage_per_space'] = round(garage_factor, 0)
                    print(f"DEBUG: Derived garage factor: ${garage_factor:.0f}/space")
                else:
                    # Provide conservative default
                    factors['garage_per_space'] = 10000  # Conservative $10,000/space default
                    print(f"DEBUG: Using default garage factor: $10,000/space (no correlation)")
            except Exception as e:
                print(f"DEBUG: Could not derive garage factor: {e}")
                factors['garage_per_space'] = 10000  # Conservative default
        
        # DERIVE TIME ADJUSTMENT FACTOR
        time_data = [(c['sale_price'], c.get('months_old', 6), c['price_per_sqft']) for c in valid_comparables if 'sale_date' in c]
        if len(time_data) >= 3:
            try:
                print(f"DEBUG: Attempting time derivation with {len(time_data)} data points")
                months_old = [d[1] for d in time_data]
                prices_per_sqft = [d[2] for d in time_data]
                
                # Use simple linear regression
                time_factor_per_sqft, intercept = linear_regression(months_old, prices_per_sqft)
                
                print(f"DEBUG: Time regression: slope=${time_factor_per_sqft:.2f}/sqft/month")
                
                # Convert to total price adjustment using average GLA
                avg_gla = statistics.mean([c['gla'] for c in valid_comparables])
                time_factor_total = time_factor_per_sqft * avg_gla
                
                if abs(time_factor_total) > 100:  # Must be meaningful amount
                    factors['time_adjustment_per_month'] = round(time_factor_total, 0)
                    print(f"DEBUG: Derived time factor: ${time_factor_total:.0f}/month")
                else:
                    # Conservative default for time adjustment
                    factors['time_adjustment_per_month'] = 500  # Conservative $500/month
                    print(f"DEBUG: Using default time factor: $500/month")
            except Exception as e:
                print(f"DEBUG: Could not derive time factor: {e}")
                factors['time_adjustment_per_month'] = 500  # Conservative default
        
        print(f"DEBUG: Final derived factors: {factors}")
        return factors
        
    except Exception as e:
        print(f"DEBUG: Error deriving market factors: {e}")
        import traceback
        traceback.print_exc()
        return factors

# Full Ratterman Analysis - DISABLED FOR PRODUCTION
@app.route('/api/ratterman-full', methods=['POST'])
@cross_origin()
def ratterman_full_analysis():
    """
    Full Ratterman Method Implementation - TEMPORARILY DISABLED
    This feature is being refined and is not available in production.
    """
    return jsonify({
        "error": "Full Ratterman Analysis is temporarily disabled while we refine the feature. Please use the GLA Calculator for now.",
        "status": "feature_disabled",
        "alternative": "Use GLA Calculator for basic GLA adjustments"
    }), 503

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

if __name__ == "__main__":
    # This should only run in development, not in production
    port = int(os.environ.get('PORT', 8080))  # Default to 8080 if PORT is not set
    app.run(debug=False, port=port, host='0.0.0.0')

# For WSGI servers like Gunicorn
application = app
