import os
import pandas as pd
import glob

def find_files_with_sections(target_sections=["A", "B"]):
    # Find all CSV files in the csv_output directory
    csv_path = "csv_output/*.csv"
    csv_files = glob.glob(csv_path)
    
    # Dictionary to store files for each section
    section_files = {section: [] for section in target_sections}
    
    # Process each CSV file
    for file in csv_files:
        try:
            df = pd.read_csv(file)
            # Look for section column
            section_col = None
            for col in df.columns:
                if col.strip() == "SECTION":  # Fixed: removed trailing space
                    section_col = col
                    break
            
            # If section column not found, try another approach
            if not section_col:
                for col in df.columns:
                    if "SECTION" in col:  # Alternative: look for any column containing "SECTION"
                        section_col = col
                        break
            
            if section_col:
                # Get all unique sections in this file
                sections_in_file = df[section_col].unique()
                
                # Output for debugging
                file_name = os.path.basename(file)
                print(f"Checking file: {file_name}, found sections: {sections_in_file}")
                
                # Check if target sections exist in this file
                for section in target_sections:
                    if section in sections_in_file:
                        section_files[section].append(file_name)
                        print(f"Found section '{section}' in file: {file_name}")
        
        except Exception as e:
            print(f"Error processing {file}: {e}")
    
    # Print summary
    print("\n" + "="*50)
    print("SUMMARY OF FILES BY SECTION")
    print("="*50)
    
    for section, files in section_files.items():
        print(f"\nFiles containing section '{section}':")
        if files:
            for file in files:
                print(f"  - {file}")
        else:
            print("  No files found")

if __name__ == "__main__":
    find_files_with_sections(["A", "B"])