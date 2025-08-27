import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import xml.etree.ElementTree as ET

app = Flask(__name__)
CORS(app)

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

@app.route('/api/calculate', methods=['POST'])
def calculate():
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))  # Default to 8080 if PORT is not set
    app.run(debug=True, port=port)

application = app
