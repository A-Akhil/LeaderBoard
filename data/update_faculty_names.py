import os
import pandas as pd
import glob

def update_faculty_names():
    # Find all CSV files in the csv_output directory
    csv_path = "csv_output/*.csv"
    csv_files = glob.glob(csv_path)
    
    # Define the mapping for faculty advisor names
    faculty_mapping = {
        "Dr. S. Raguvaran": "Dr. S. Raguvaran",
        "Dr. S. Raguvaran ": "Dr. S. Raguvaran",
        "Dr. Vinston Raja R": "Dr. R.Vinston Raja Retnakumar",
        "Dr.A.K.Reshmy": "Dr.A.K. Reshmy",
        "Dr.AR.Arunarani": "Dr.AR.Aruna Rani",
        "Dr.AR.Arunarani ": "Dr.AR.Aruna Rani",
        "Dr.G.Sumathy": "Dr.G. Sumathy",
        "Dr.K.Babu": "Dr.K. Babu",
        "Dr.K.Babu ": "Dr.K. Babu",
        "Dr.Kaavya Kanagaraj": "Dr.Kaavya Kanagaraj",
        "Dr.Kanipriya": "Dr.Kanipriya .M",
        "Dr.Kanipriya ": "Dr.Kanipriya .M",
        "Dr.Nagendra Prabhu": "Dr. S. Nagendra Prabhu",
        "Dr.Nagendra Prabhu  ": "Dr. S. Nagendra Prabhu",
        "Dr.P.V. Gopi Rajan": "Dr.Gopirajan PV",
        "Dr.P.V. Gopi Rajan ": "Dr.Gopirajan PV",
        "Dr.Prithi": "Dr.S. Prithi",
        "Dr.Prithi  ": "Dr.S. Prithi",
        "Dr.Salomi": "Dr. M.Salomi",
        "Dr.Salomi ": "Dr. M.Salomi",
        "Dr.Sherin Shibi": "Dr.C.Sherin Shibi",
        "Dr.Sherin Shibi ": "Dr.C.Sherin Shibi",
        "Dr.Siva Sankar": "Dr.G.Sivashankar",
        "Dr.U.Sakthi": "Dr.U.Sakthi",
        "Dr.U.Sakthi ": "Dr.U.Sakthi"
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
            
            # Find the faculty advisor column (with or without trailing spaces)
            faculty_col = None
            for col in df.columns:
                if col.strip() == 'FACULTY ADVISOR':
                    faculty_col = col
                    break
            
            if faculty_col is not None:
                # Check if any values need updating
                has_changes = False
                
                # Create a copy of the column for comparison
                original_values = df[faculty_col].copy()
                
                # Update the faculty advisor names
                df[faculty_col] = df[faculty_col].apply(lambda x: faculty_mapping.get(x, x) if pd.notna(x) else x)
                
                # Check if any values were changed
                if not original_values.equals(df[faculty_col]):
                    has_changes = True
                
                if has_changes:
                    # Save the modified DataFrame back to the CSV file
                    df.to_csv(file, index=False)
                    updated_files += 1
                    print(f"Updated faculty advisor names in: {file_name}")
                
                processed_files += 1
            else:
                print(f"No faculty advisor column found in: {file_name}")
                
        except Exception as e:
            print(f"Error processing {file}: {e}")
    
    print(f"\nSummary: Updated faculty advisor names in {updated_files} out of {processed_files} processed files.")

if __name__ == "__main__":
    update_faculty_names()
    print("\nFaculty advisor names have been updated successfully.")