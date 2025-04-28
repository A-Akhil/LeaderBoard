import os
import pandas as pd
import glob

def update_specialization_values():
    # Find all CSV files in the csv_output directory
    csv_path = "csv_output/*.csv"
    csv_files = glob.glob(csv_path)
    
    # Define the mapping for specialization values
    specialization_mapping = {
        'AI': 'BTech-CSE-AI',
        'AIML': 'BTech-CSE-AIML',
        'CC': 'MTech-Integrated-CSE-ws-CC',
        'SWE': 'MTech-Integrated-CSE-ws-SWE'
    }
    
    # Track processed files
    processed_files = 0
    updated_files = 0
    
    print(f"Found {len(csv_files)} CSV files to process.")
    
    # Process each CSV file
    for file in csv_files:
        try:
            # Read the CSV file
            df = pd.read_csv(file)
            file_name = os.path.basename(file)
            
            # Find the specialization column (with or without trailing spaces)
            specialization_col = None
            for col in df.columns:
                if col.strip() == 'SPECIALAIZATION':
                    specialization_col = col
                    break
            
            if specialization_col is not None:
                # Check if we need to update any values
                original_values = set(df[specialization_col].dropna().unique())
                needs_update = any(val in specialization_mapping for val in original_values)
                
                if needs_update:
                    # Create a function to map values
                    def map_specialization(val):
                        if pd.isna(val):
                            return val
                        return specialization_mapping.get(val, val)
                    
                    # Apply the mapping
                    df[specialization_col] = df[specialization_col].apply(map_specialization)
                    
                    # Save the modified DataFrame back to the CSV file
                    df.to_csv(file, index=False)
                    
                    # Report the changes
                    updated_files += 1
                    print(f"Updated specialization values in: {file_name}")
                    print(f"  - Changed values: {', '.join(original_values)}")
                
                processed_files += 1
            else:
                print(f"No specialization column found in: {file_name}")
                
        except Exception as e:
            print(f"Error processing {file}: {e}")
    
    print(f"\nSummary: Updated specialization values in {updated_files} out of {processed_files} processed files.")

if __name__ == "__main__":
    update_specialization_values()
    print("\nSpecialization values have been updated.")