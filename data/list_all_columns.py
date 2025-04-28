import os
import pandas as pd
import glob
import json

def list_columns_by_file():
    """List column names for each CSV file in the csv_output directory."""
    # Find all CSV files
    csv_path = "csv_output/*.csv"
    csv_files = glob.glob(csv_path)
    
    if not csv_files:
        print("No CSV files found in the csv_output directory.")
        return
    
    print(f"Found {len(csv_files)} CSV files. Analyzing column names...\n")
    
    # Process each CSV file
    for file in csv_files:
        try:
            # Get just the filename without the path
            filename = os.path.basename(file)
            
            # Read only the header row for efficiency
            df = pd.read_csv(file, nrows=0)
            
            # Get column names and strip any whitespace
            columns = [col.strip() for col in df.columns]
            
            # Print the filename and column names in the requested format
            print(f"{filename}")
            print(columns)
            print()
                
        except Exception as e:
            print(f"Error reading {os.path.basename(file)}: {e}\n")

if __name__ == "__main__":
    list_columns_by_file()