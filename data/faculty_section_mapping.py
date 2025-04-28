import os
import pandas as pd
import glob
from collections import defaultdict

def get_faculty_section_mapping():
    # Find all CSV files in the csv_output directory
    csv_path = "csv_output/*.csv"
    csv_files = glob.glob(csv_path)
    
    print(f"Analyzing {len(csv_files)} CSV files...")
    
    # Dictionary to store faculty-section mappings
    faculty_sections = defaultdict(set)
    section_faculty = defaultdict(set)
    section_student_count = defaultdict(int)
    
    # Track the number of processed files
    processed_files = 0
    
    # Process each CSV file
    for file in csv_files:
        try:
            # Read the CSV file
            df = pd.read_csv(file)
            file_name = os.path.basename(file)
            
            # Find the section and faculty advisor columns
            section_col = None
            faculty_col = None
            
            for col in df.columns:
                if col.strip() == 'SECTION':
                    section_col = col
                if col.strip() == 'FACULTY ADVISOR':
                    faculty_col = col
            
            # If both columns exist, analyze the file
            if section_col and faculty_col:
                processed_files += 1
                
                # Group by faculty and section
                for _, row in df.iterrows():
                    faculty = row[faculty_col]
                    section = row[section_col]
                    
                    if pd.notna(faculty) and pd.notna(section):
                        faculty_sections[faculty].add(section)
                        section_faculty[section].add(faculty)
                        section_student_count[section] += 1
            
        except Exception as e:
            print(f"Error processing {file}: {e}")
    
    # Display the results
    print(f"\nProcessed {processed_files} files containing faculty and section information.")
    print("\n" + "="*80)
    print(" FACULTY-TO-SECTION MAPPING ")
    print("="*80)
    
    sorted_faculty = sorted(faculty_sections.keys())
    
    for faculty in sorted_faculty:
        sections = sorted(faculty_sections[faculty])
        section_list = ", ".join(sections)
        print(f"Faculty: {faculty}")
        print(f"Assigned Sections: {section_list}")
        print("-" * 40)
    
    print("\n" + "="*80)
    print(" SECTION-TO-FACULTY MAPPING ")
    print("="*80)
    
    sorted_sections = sorted(section_faculty.keys())
    
    for section in sorted_sections:
        faculty_list = sorted(section_faculty[section])
        faculty_str = ", ".join(faculty_list)
        student_count = section_student_count[section]
        print(f"Section: {section} (Students: {student_count})")
        print(f"Faculty Advisors: {faculty_str}")
        print("-" * 40)

if __name__ == "__main__":
    get_faculty_section_mapping()