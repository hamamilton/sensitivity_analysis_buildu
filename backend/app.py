import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import xml.etree.ElementTree as ET

app = Flask(__name__)
CORS(app)  # Enable cross-origin requests.

def calculate_sensitivity(xml_file):
    try:
        # Parse the XML file
        tree = ET.parse(xml_file)
        root = tree.getroot()

        # Initialize lists and variables
        comparables = []
        subject_property = None
        comp_number = 0  # Initialize comparable number
        pre_adj_values = []  # To calculate pre-adjustment range
        post_adj_values = []  # To calculate post-adjustment range

        # Iterate over all "COMPARABLE_SALE" elements
        for comp in root.findall(".//COMPARABLE_SALE"):
            # Extract PropertySequenceIdentifier
            property_sequence_id = comp.get("PropertySequenceIdentifier")

            # Extract values from attributes
            pre_adj = comp.get("PropertySalesAmount")
            post_adj = comp.get("AdjustedSalesPriceAmount")  # Only applicable for comparables
            total_adj_percent = comp.get("SalePriceTotalAdjustmentNetPercent")
            location = comp.find(".//LOCATION")

            # Extract address components with default values
            if location is not None:
                street = location.get("PropertyStreetAddress", "Unknown")
                street2 = location.get("PropertyStreetAddress2", "")  # Capture PropertyStreetAddress2
                address = f"{street}, {street2}".strip(", ")
            else:
                address = "Unknown"

            # Extract ComparableType from SalesConcessions _Description
            comp_type = "Unknown"
            for adjustment in comp.findall(".//SALE_PRICE_ADJUSTMENT"):
                if adjustment.get("_Type") == "SalesConcessions":
                    comp_type = adjustment.get("_Description", "Unknown")
                    break  # Use the first SalesConcessions description found

            # Replace "ArmLth" with "Sale" for comparables
            if comp_type == "ArmLth":
                comp_type = "Sale"

            # Extract Date of Sale from _Description
            sale_date = "N/A"
            for adjustment in comp.findall(".//SALE_PRICE_ADJUSTMENT"):
                if adjustment.get("_Type") == "DateOfSale":
                    description = adjustment.get("_Description", "")
                    if "s" in description:
                        sale_date = description.split(";")[0].replace("s", "").strip()
                    break

            # Convert to float if possible
            try:
                pre_adj = float(pre_adj) if pre_adj is not None else None
                post_adj = float(post_adj) if post_adj is not None else None
            except ValueError:
                pre_adj = None
                post_adj = None

            # Determine if this is the subject property or a comparable
            if property_sequence_id == "0":
                # Subject property does not have AdjustedSalesPriceAmount
                subject_property = {
                    "property_type": "Subject",  # Add property type
                    "address": address,
                    "pre_adj": pre_adj if pre_adj is not None else "N/A",
                    "post_adj": "",  # Not applicable for subject property
                    "comp_type": "",  # Not applicable for subject property
                    "total_adj_percent": "",  # Not applicable for subject property
                    "sale_date": "",  # Not applicable for subject property
                }
            else:
                # Comparables include AdjustedSalesPriceAmount
                comp_number += 1
                comparables.append({
                    "property_type": f"Comparable {comp_number}",  # Add property type
                    "address": address,
                    "pre_adj": pre_adj if pre_adj is not None else "N/A",
                    "post_adj": post_adj if post_adj is not None else "N/A",
                    "comp_type": comp_type,
                    "total_adj_percent": total_adj_percent if total_adj_percent is not None else "N/A",
                    "sale_date": sale_date,  # Include sale date
                })

                # Add to ranges if it's a valid comparable sale
                if post_adj is not None and comp_type == "Sale":
                    pre_adj_values.append(pre_adj)
                    post_adj_values.append(post_adj)

        # Ensure there are comparables to display
        if not subject_property:
            return {"error": "No subject property found in the XML file."}
        if not comparables:
            return {"error": "No valid comparable data found in the XML file."}

        # Calculate pre-adjustment and post-adjustment ranges
        pre_adj_range = {
            "min": min(pre_adj_values) if pre_adj_values else "N/A",
            "max": max(pre_adj_values) if pre_adj_values else "N/A",
        }
        post_adj_range = {
            "min": min(post_adj_values) if post_adj_values else "N/A",
            "max": max(post_adj_values) if post_adj_values else "N/A",
        }

        # Return the subject property, comparables, and ranges
        return {
            "subject_property": subject_property,
            "comparables": comparables,
            "pre_adj_range": pre_adj_range,
            "post_adj_range": post_adj_range,
        }

    except ET.ParseError:
        return {"error": "Failed to parse XML file. Ensure it is well-formed."}
    except ValueError as e:
        return {"error": f"Invalid data in XML file: {str(e)}"}
    except Exception as e:
        return {"error": f"An unexpected error occurred: {str(e)}"}
    try:
        # Parse the XML file
        tree = ET.parse(xml_file)
        root = tree.getroot()

        # Initialize lists and variables
        comparables = []
        subject_property = None
        comp_number = 0  # Initialize comparable number

        # Iterate over all "COMPARABLE_SALE" elements
        for comp in root.findall(".//COMPARABLE_SALE"):
            # Extract PropertySequenceIdentifier
            property_sequence_id = comp.get("PropertySequenceIdentifier")

            # Extract values from attributes
            pre_adj = comp.get("PropertySalesAmount")
            post_adj = comp.get("AdjustedSalesPriceAmount")  # Only applicable for comparables
            total_adj_percent = comp.get("SalePriceTotalAdjustmentNetPercent")
            location = comp.find(".//LOCATION")

            # Extract address components with default values
            if location is not None:
                street = location.get("PropertyStreetAddress", "Unknown")
                street2 = location.get("PropertyStreetAddress2", "")  # Capture PropertyStreetAddress2
                address = f"{street}, {street2}".strip(", ")
            else:
                address = "Unknown"

            # Extract ComparableType from SalesConcessions _Description
            comp_type = "Unknown"
            for adjustment in comp.findall(".//SALE_PRICE_ADJUSTMENT"):
                if adjustment.get("_Type") == "SalesConcessions":
                    comp_type = adjustment.get("_Description", "Unknown")
                    break  # Use the first SalesConcessions description found

            # Replace "ArmLth" with "Sale" for comparables
            if comp_type == "ArmLth":
                comp_type = "Sale"

            # Extract Date of Sale from _Description
            sale_date = "N/A"
            for adjustment in comp.findall(".//SALE_PRICE_ADJUSTMENT"):
                if adjustment.get("_Type") == "DateOfSale":
                    description = adjustment.get("_Description", "")
                    if "s" in description:
                        sale_date = description.split(";")[0].replace("s", "").strip()
                    break

            # Convert to float if possible
            try:
                pre_adj = float(pre_adj) if pre_adj is not None else None
                post_adj = float(post_adj) if post_adj is not None else None
            except ValueError:
                pre_adj = None
                post_adj = None

            # Determine if this is the subject property or a comparable
            if property_sequence_id == "0":
                # Subject property does not have AdjustedSalesPriceAmount
                subject_property = {
                    "property_type": "Subject",  # Add property type
                    "address": address,
                    "pre_adj": pre_adj if pre_adj is not None else "N/A",
                    "post_adj": "",  # Not applicable for subject property
                    "comp_type": "",  # Not applicable for subject property
                    "total_adj_percent": "",  # Not applicable for subject property
                    "sale_date": "",  # Not applicable for subject property
                }
            else:
                # Comparables include AdjustedSalesPriceAmount
                comp_number += 1
                comparables.append({
                    "property_type": f"Comparable {comp_number}",  # Add property type
                    "address": address,
                    "pre_adj": pre_adj if pre_adj is not None else "N/A",
                    "post_adj": post_adj if post_adj is not None else "N/A",
                    "comp_type": comp_type,
                    "total_adj_percent": total_adj_percent if total_adj_percent is not None else "N/A",
                    "sale_date": sale_date,  # Include sale date
                })

        # Ensure there are comparables to display
        if not subject_property:
            return {"error": "No subject property found in the XML file."}
        if not comparables:
            return {"error": "No valid comparable data found in the XML file."}

        # Return the subject property and comparables
        return {
            "subject_property": subject_property,
            "comparables": comparables,
        }

    except ET.ParseError:
        return {"error": "Failed to parse XML file. Ensure it is well-formed."}
    except ValueError as e:
        return {"error": f"Invalid data in XML file: {str(e)}"}
    except Exception as e:
        return {"error": f"An unexpected error occurred: {str(e)}"}
    try:
        # Parse the XML file
        tree = ET.parse(xml_file)
        root = tree.getroot()

        # Initialize lists and variables
        comparables = []
        subject_property = None
        comp_number = 0  # Initialize comparable number

        # Iterate over all "COMPARABLE_SALE" elements
        for comp in root.findall(".//COMPARABLE_SALE"):
            # Extract PropertySequenceIdentifier
            property_sequence_id = comp.get("PropertySequenceIdentifier")
            print(f"Found PropertySequenceIdentifier: {property_sequence_id}")  # Debug log

            # Extract values from attributes
            pre_adj = comp.get("PropertySalesAmount")
            post_adj = comp.get("AdjustedSalesPriceAmount")  # Only applicable for comparables
            total_adj_percent = comp.get("SalePriceTotalAdjustmentNetPercent")
            sale_date = comp.get("SaleDate")  # Extract the sale date
            location = comp.find(".//LOCATION")

            # Extract address components with default values
            if location is not None:
                street = location.get("PropertyStreetAddress", "Unknown")
                street2 = location.get("PropertyStreetAddress2", "")  # Capture PropertyStreetAddress2
                address = f"{street}, {street2}".strip(", ")
            else:
                address = "Unknown"

            # Extract ComparableType from SalesConcessions _Description
            comp_type = "Unknown"
            for adjustment in comp.findall(".//SALE_PRICE_ADJUSTMENT"):
                if adjustment.get("_Type") == "SalesConcessions":
                    comp_type = adjustment.get("_Description", "Unknown")
                    break  # Use the first SalesConcessions description found

            # Replace "ArmLth" with "Sale" for comparables
            if comp_type == "ArmLth":
                comp_type = "Sale"

            # Convert to float if possible
            try:
                pre_adj = float(pre_adj) if pre_adj is not None else None
                post_adj = float(post_adj) if post_adj is not None else None
            except ValueError:
                pre_adj = None
                post_adj = None

            # Determine if this is the subject property or a comparable
            if property_sequence_id == "0":
                # Subject property does not have AdjustedSalesPriceAmount
                subject_property = {
                    "property_type": "Subject",  # Add property type
                    "address": address,
                    "pre_adj": pre_adj if pre_adj is not None else "N/A",
                    "post_adj": "N/A",  # Not applicable for subject property
                    "comp_type": "N/A",  # Not applicable for subject property
                    "total_adj_percent": "N/A",  # Not applicable for subject property
                    "sale_date": "N/A",  # Not applicable for subject property
                }
            else:
                # Comparables include AdjustedSalesPriceAmount
                comp_number += 1
                comparables.append({
                    "property_type": f"Comparable {comp_number}",  # Add property type
                    "address": address,
                    "pre_adj": pre_adj if pre_adj is not None else "N/A",
                    "post_adj": post_adj if post_adj is not None else "N/A",
                    "comp_type": comp_type,
                    "total_adj_percent": total_adj_percent if total_adj_percent is not None else "N/A",
                    "sale_date": sale_date if sale_date is not None else "N/A",  # Include sale date
                })

        # Ensure there are comparables to display
        if not subject_property:
            return {"error": "No subject property found in the XML file."}
        if not comparables:
            return {"error": "No valid comparable data found in the XML file."}

        # Return the subject property and comparables
        return {
            "subject_property": subject_property,
            "comparables": comparables,
        }

    except ET.ParseError:
        return {"error": "Failed to parse XML file. Ensure it is well-formed."}
    except ValueError as e:
        return {"error": f"Invalid data in XML file: {str(e)}"}
    except Exception as e:
        return {"error": f"An unexpected error occurred: {str(e)}"}
    try:
        # Parse the XML file
        tree = ET.parse(xml_file)
        root = tree.getroot()

        # Initialize lists and variables
        comparables = []
        subject_property = None
        comp_number = 0  # Initialize comparable number

        # Iterate over all "COMPARABLE_SALE" elements
        for comp in root.findall(".//COMPARABLE_SALE"):
            # Extract PropertySequenceIdentifier
            property_sequence_id = comp.get("PropertySequenceIdentifier")
            print(f"Found PropertySequenceIdentifier: {property_sequence_id}")  # Debug log

            # Extract values from attributes
            pre_adj = comp.get("PropertySalesAmount")
            post_adj = comp.get("AdjustedSalesPriceAmount")  # Only applicable for comparables
            total_adj_percent = comp.get("SalePriceTotalAdjustmentNetPercent")
            location = comp.find(".//LOCATION")

            # Extract address components with default values
            if location is not None:
                street = location.get("PropertyStreetAddress", "Unknown")
                street2 = location.get("PropertyStreetAddress2", "")  # Capture PropertyStreetAddress2
                address = f"{street}, {street2}".strip(", ")
            else:
                address = "Unknown"

            # Extract ComparableType from SalesConcessions _Description
            comp_type = "Unknown"
            for adjustment in comp.findall(".//SALE_PRICE_ADJUSTMENT"):
                if adjustment.get("_Type") == "SalesConcessions":
                    comp_type = adjustment.get("_Description", "Unknown")
                    break  # Use the first SalesConcessions description found

            # Convert to float if possible
            try:
                pre_adj = float(pre_adj) if pre_adj is not None else None
                post_adj = float(post_adj) if post_adj is not None else None
            except ValueError:
                pre_adj = None
                post_adj = None

            # Determine if this is the subject property or a comparable
            if property_sequence_id == "0":
                # Subject property does not have AdjustedSalesPriceAmount
                subject_property = {
                    "property_type": "Subject",  # Add property type
                    "address": address,
                    "pre_adj": pre_adj if pre_adj is not None else "N/A",
                    "post_adj": "N/A",  # Not applicable for subject property
                    "comp_type": "N/A",  # Not applicable for subject property
                    "total_adj_percent": "N/A",  # Not applicable for subject property
                }
            else:
                # Comparables include AdjustedSalesPriceAmount
                comp_number += 1
                comparables.append({
                    "property_type": f"Comparable {comp_number}",  # Add property type
                    "address": address,
                    "pre_adj": pre_adj if pre_adj is not None else "N/A",
                    "post_adj": post_adj if post_adj is not None else "N/A",
                    "comp_type": comp_type,
                    "total_adj_percent": total_adj_percent if total_adj_percent is not None else "N/A",
                })

        # Ensure there are comparables to display
        if not subject_property:
            return {"error": "No subject property found in the XML file."}
        if not comparables:
            return {"error": "No valid comparable data found in the XML file."}

        # Return the subject property and comparables
        return {
            "subject_property": subject_property,
            "comparables": comparables,
        }

    except ET.ParseError:
        return {"error": "Failed to parse XML file. Ensure it is well-formed."}
    except ValueError as e:
        return {"error": f"Invalid data in XML file: {str(e)}"}
    except Exception as e:
        return {"error": f"An unexpected error occurred: {str(e)}"}
    try:
        # Parse the XML file
        tree = ET.parse(xml_file)
        root = tree.getroot()

        # Initialize lists and variables
        comparables = []
        subject_property = None
        comp_number = 0  # Initialize comparable number

        # Iterate over all "COMPARABLE_SALE" elements
        for comp in root.findall(".//COMPARABLE_SALE"):
            # Extract PropertySequenceIdentifier
            property_sequence_id = comp.get("PropertySequenceIdentifier")
            print(f"Found PropertySequenceIdentifier: {property_sequence_id}")  # Debug log

            # Extract values from attributes
            pre_adj = comp.get("PropertySalesAmount")
            post_adj = comp.get("AdjustedSalesPriceAmount")  # Only applicable for comparables
            total_adj_percent = comp.get("SalePriceTotalAdjustmentNetPercent")
            location = comp.find(".//LOCATION")

            # Extract address components with default values
            if location is not None:
                street = location.get("PropertyStreetAddress", "Unknown")
                city = location.get("PropertyCity", "Unknown")
                state = location.get("PropertyState", "Unknown")
                postal_code = location.get("PropertyPostalCode", "Unknown")
                address = f"{street}, {city}, {state} {postal_code}"
            else:
                address = "Unknown"

            # Extract ComparableType from SalesConcessions _Description
            comp_type = "Unknown"
            for adjustment in comp.findall(".//SALE_PRICE_ADJUSTMENT"):
                if adjustment.get("_Type") == "SalesConcessions":
                    comp_type = adjustment.get("_Description", "Unknown")
                    break  # Use the first SalesConcessions description found

            # Convert to float if possible
            try:
                pre_adj = float(pre_adj) if pre_adj is not None else None
                post_adj = float(post_adj) if post_adj is not None else None
            except ValueError:
                pre_adj = None
                post_adj = None

            # Determine if this is the subject property or a comparable
            if property_sequence_id == "0":
                # Subject property does not have AdjustedSalesPriceAmount
                subject_property = {
                    "comp_number": "Subject",
                    "address": address,
                    "pre_adj": pre_adj if pre_adj is not None else "N/A",
                    "post_adj": "",  # Not applicable for subject property
                    "comp_type": "",  # Not applicable for subject property
                    "total_adj_percent": "",  # Not applicable for subject property
                }
            else:
                # Comparables include AdjustedSalesPriceAmount
                comp_number += 1
                comparables.append({
                    "comp_number": f"Comp {comp_number}",
                    "address": address,
                    "pre_adj": pre_adj if pre_adj is not None else "N/A",
                    "post_adj": post_adj if post_adj is not None else "N/A",
                    "comp_type": comp_type,
                    "total_adj_percent": total_adj_percent if total_adj_percent is not None else "N/A",
                })

        # Ensure there are comparables to display
        if not subject_property:
            return {"error": "No subject property found in the XML file."}
        if not comparables:
            return {"error": "No valid comparable data found in the XML file."}

        # Return the subject property and comparables
        return {
            "subject_property": subject_property,
            "comparables": comparables,
        }

    except ET.ParseError:
        return {"error": "Failed to parse XML file. Ensure it is well-formed."}
    except ValueError as e:
        return {"error": f"Invalid data in XML file: {str(e)}"}
    except Exception as e:
        return {"error": f"An unexpected error occurred: {str(e)}"}
    try:
        # Parse the XML file
        tree = ET.parse(xml_file)
        root = tree.getroot()

        # Initialize lists and variables
        comparables = []
        subject_property = None
        comp_number = 0  # Initialize comparable number

        # Iterate over all "COMPARABLE_SALE" elements
        for comp in root.findall(".//COMPARABLE_SALE"):
            # Extract PropertySequenceIdentifier
            property_sequence_id = comp.get("PropertySequenceIdentifier")
            print(f"Found PropertySequenceIdentifier: {property_sequence_id}")  # Debug log

            # Extract values from attributes
            pre_adj = comp.get("PropertySalesAmount")
            post_adj = comp.get("AdjustedSalesPriceAmount")
            total_adj_percent = comp.get("SalePriceTotalAdjustmentNetPercent")
            location = comp.find(".//LOCATION")

            # Extract address components with default values
            if location is not None:
                street = location.get("PropertyStreetAddress", "Unknown")
                city = location.get("PropertyCity", "Unknown")
                state = location.get("PropertyState", "Unknown")
                postal_code = location.get("PropertyPostalCode", "Unknown")
                address = f"{street}, {city}, {state} {postal_code}"
            else:
                address = "Unknown"

            # Extract ComparableType from SalesConcessions _Description
            comp_type = "Unknown"
            for adjustment in comp.findall(".//SALE_PRICE_ADJUSTMENT"):
                if adjustment.get("_Type") == "SalesConcessions":
                    comp_type = adjustment.get("_Description", "Unknown")
                    break  # Use the first SalesConcessions description found

            # Skip if pre_adj or post_adj is missing
            if pre_adj is None or post_adj is None:
                continue

            # Convert to float
            try:
                pre_adj = float(pre_adj)
                post_adj = float(post_adj)
            except ValueError:
                continue

            # Determine if this is the subject property or a comparable
            if property_sequence_id == "0":
                subject_property = {
                    "comp_number": "Subject",
                    "address": address,
                    "pre_adj": pre_adj,
                    "post_adj": post_adj,
                    "comp_type": comp_type,
                    "total_adj_percent": total_adj_percent,
                }
            else:
                comp_number += 1
                comparables.append({
                    "comp_number": f"Comp {comp_number}",
                    "address": address,
                    "pre_adj": pre_adj,
                    "post_adj": post_adj,
                    "comp_type": comp_type,
                    "total_adj_percent": total_adj_percent,
                })

        # Ensure there are comparables to display
        if not subject_property:
            return {"error": "No subject property found in the XML file."}
        if not comparables:
            return {"error": "No valid comparable data found in the XML file."}

        # Return the subject property and comparables
        return {
            "subject_property": subject_property,
            "comparables": comparables,
        }

    except ET.ParseError:
        return {"error": "Failed to parse XML file. Ensure it is well-formed."}
    except ValueError as e:
        return {"error": f"Invalid data in XML file: {str(e)}"}
    except Exception as e:
        return {"error": f"An unexpected error occurred: {str(e)}"}
    try:
        # Parse the XML file
        tree = ET.parse(xml_file)
        root = tree.getroot()

        # Initialize lists and variables
        comparables = []
        subject_property = None
        comp_number = 0  # Initialize comparable number

        # Iterate over all "COMPARABLE_SALE" elements
        for comp in root.findall(".//COMPARABLE_SALE"):
            # Extract values from attributes
            pre_adj = comp.get("PropertySalesAmount")
            post_adj = comp.get("AdjustedSalesPriceAmount")
            total_adj_percent = comp.get("SalePriceTotalAdjustmentNetPercent")
            location = comp.find(".//LOCATION")

            # Extract address components with default values
            if location is not None:
                street = location.get("PropertyStreetAddress", "Unknown")
                city = location.get("PropertyCity", "Unknown")
                state = location.get("PropertyState", "Unknown")
                postal_code = location.get("PropertyPostalCode", "Unknown")
                address = f"{street}, {city}, {state} {postal_code}"
            else:
                address = "Unknown"

            # Extract ComparableType from SalesConcessions _Description
            comp_type = "Unknown"
            for adjustment in comp.findall(".//SALE_PRICE_ADJUSTMENT"):
                if adjustment.get("_Type") == "SalesConcessions":
                    comp_type = adjustment.get("_Description", "Unknown")
                    break  # Use the first SalesConcessions description found

            # Skip if pre_adj or post_adj is missing
            if pre_adj is None or post_adj is None:
                continue

            # Convert to float
            try:
                pre_adj = float(pre_adj)
                post_adj = float(post_adj)
            except ValueError:
                continue

            # Determine if this is the subject property or a comparable
            if comp.get("PropertySequenceIdentifier") == "0":
                subject_property = {
                    "comp_number": "Subject",
                    "address": address,
                    "pre_adj": pre_adj,
                    "post_adj": post_adj,
                    "comp_type": comp_type,
                    "total_adj_percent": total_adj_percent,
                }
            else:
                comp_number += 1
                comparables.append({
                    "comp_number": f"Comp {comp_number}",
                    "address": address,
                    "pre_adj": pre_adj,
                    "post_adj": post_adj,
                    "comp_type": comp_type,
                    "total_adj_percent": total_adj_percent,
                })

        # Ensure there are comparables to display
        if not subject_property:
            return {"error": "No subject property found in the XML file."}
        if not comparables:
            return {"error": "No valid comparable data found in the XML file."}

        # Return the subject property and comparables
        return {
            "subject_property": subject_property,
            "comparables": comparables,
        }

    except ET.ParseError:
        return {"error": "Failed to parse XML file. Ensure it is well-formed."}
    except ValueError as e:
        return {"error": f"Invalid data in XML file: {str(e)}"}
    except Exception as e:
        return {"error": f"An unexpected error occurred: {str(e)}"}

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