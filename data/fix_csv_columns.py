import os
import pandas as pd
import glob

def fix_csv_column_names():
    """Fix CSV files by removing trailing spaces from column names."""
    # Find all CSV files in the csv_output directory
    csv_path = "csv_output/*.csv"
    csv_files = glob.glob(csv_path)
    
    print(f"Found {len(csv_files)} CSV files to process.")
    
    # Process each CSV file
    fixed_files = 0
    for file in csv_files:
        try:
            # Read the CSV file
            df = pd.read_csv(file)
            
            # Get original column names for comparison
            original_columns = list(df.columns)
            
            # Strip whitespace from column names
            new_columns = [col.strip() for col in df.columns]
            
            # Check if changes were made
            changes_made = (original_columns != new_columns)
            
            if changes_made:
                # Apply the cleaned column names
                df.columns = new_columns
                
                # Save the modified DataFrame back to the CSV file
                df.to_csv(file, index=False)
                
                # Report the changes
                print(f"Fixed columns in: {os.path.basename(file)}")
                for i, (old, new) in enumerate(zip(original_columns, new_columns)):
                    if old != new:
                        print(f"  - Changed: '{old}' → '{new}'")
                
                fixed_files += 1
            else:
                print(f"No changes needed for: {os.path.basename(file)}")
                
        except Exception as e:
            print(f"Error processing {file}: {e}")
    
    print(f"\nSummary: Fixed column names in {fixed_files} out of {len(csv_files)} files.")

if __name__ == "__main__":
    fix_csv_column_names()
    print("\nNow you can run your main.py script with the corrected files.")