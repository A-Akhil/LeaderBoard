import os
import pandas as pd
import glob

def check_and_fix_spaces():
    """Check and fix leading/trailing spaces in all CSV files."""
    # Find all CSV files in the csv_output directory
    csv_path = "csv_output/*.csv"
    csv_files = glob.glob(csv_path)
    
    print(f"Found {len(csv_files)} CSV files.\n")
    
    # Track statistics
    files_with_issues = 0
    total_issues = 0
    
    # Process each CSV file
    for file in csv_files:
        file_name = os.path.basename(file)
        try:
            # Read the CSV file
            df = pd.read_csv(file, dtype=str)  # Read everything as string to catch spaces correctly
            
            original_columns = df.columns.tolist()
            fixed_columns = [col.strip() for col in original_columns]
            
            # Fix column names
            df.columns = fixed_columns
            
            # Track issues found in this file
            issues_found = False
            file_issues = []
            
            # Fix each cell
            for col in df.columns:
                for idx, value in df[col].items():
                    if pd.isna(value):
                        continue  # Skip NaN cells
                    if value != value.strip():
                        leading_spaces = len(value) - len(value.lstrip())
                        trailing_spaces = len(value) - len(value.rstrip())
                        issue_type = []
                        if leading_spaces > 0:
                            issue_type.append(f"{leading_spaces} leading")
                        if trailing_spaces > 0:
                            issue_type.append(f"{trailing_spaces} trailing")
                        
                        issue_info = f"Row {idx+1}, Column '{col}': '{value}' has {' and '.join(issue_type)} space(s)"
                        file_issues.append(issue_info)
                        issues_found = True
                        total_issues += 1
                        
                        # Fix the cell value
                        df.at[idx, col] = value.strip()
            
            if issues_found or original_columns != fixed_columns:
                files_with_issues += 1
                print(f"Issues found and fixed in: {file_name}")
                for issue in file_issues:
                    print(f"  - {issue}")
                
                # Save the fixed CSV back to the same file
                df.to_csv(file, index=False)
                print(f"Saved fixed file: {file_name}\n")
            else:
                print(f"No issues found in: {file_name}\n")
            
        except Exception as e:
            print(f"Error processing {file_name}: {e}\n")
    
    # Print summary
    print(f"\nSummary:")
    print(f"- {files_with_issues} out of {len(csv_files)} files had spaces and were fixed")
    print(f"- Total of {total_issues} cell issues fixed")
    
    if files_with_issues == 0:
        print("\nNo issues found. All files were already properly formatted!")

if __name__ == "__main__":
    check_and_fix_spaces()
