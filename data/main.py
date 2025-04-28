import os
import pandas as pd
import glob
import numpy as np

def find_unique_values():
    # Find all CSV files in the csv_output directory
    csv_path = "fa/*.csv"
    csv_files = glob.glob(csv_path)
    
    # # Columns to analyze (excluding S.NO, REGISTER NO, STUDENT NAME, EMAILID)
    # columns_to_analyze = ['SECTION', 'YEAR OF STUDY', 'SPECIALAIZATION', 'PROGRAM', 'DEPARTMENT', 'FACULTY ADVISOR']
    columns_to_analyze = ['Faculty ID', 'Faculty Name', 'Designation', 'Mobile No', 'Email ID']
    # Dictionary to store unique values for each column
    unique_values = {col: set() for col in columns_to_analyze}
    
    # Process each CSV file
    for file in csv_files:
        try:
            df = pd.read_csv(file)
            
            # Extract unique values for each column
            for col in columns_to_analyze:
                if col in df.columns:
                    # Get unique values and convert to list
                    col_values = df[col].unique()
                    for val in col_values:
                        if pd.notna(val):  # Only add non-NaN values
                            # Convert NumPy types to native Python types
                            if hasattr(val, 'item'):
                                val = val.item()
                            unique_values[col].add(val)
                        else:
                            unique_values[col].add("N/A")  # Add "N/A" for NaN values
        except Exception as e:
            print(f"Error processing {file}: {e}")
    
    # Display results
    print("Unique values in each column (excluding S.NO, REGISTER NO, STUDENT NAME, EMAILID):")
    print("-" * 80)
    
    for col, values in unique_values.items():
        print(f"{col}:")
        # Convert all values to strings for consistent sorting
        string_values = []
        for value in values:
            if isinstance(value, (int, float, bool)):
                string_values.append(str(value))
            else:
                string_values.append(value)
        
        for value in sorted(string_values):
            print(f"  - {value}")
        print()

if __name__ == "__main__":
    find_unique_values()

