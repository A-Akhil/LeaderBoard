import os
import pandas as pd
import glob
from pymongo import MongoClient
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        # logging.FileHandler('update_student_courses.log'),
        logging.StreamHandler()
    ]
)

def update_student_courses():
    """
    Updates student course and program information in MongoDB based on CSV data.
    """
    # MongoDB connection settings - update these with your actual connection details
    mongo_uri = "mongodb://localhost:27017/"
    db_name = "leaderboard_new"  # Replace with your actual database name
    collection_name = "students"  # Replace with your actual collection name

    # Connect to MongoDB
    try:
        client = MongoClient(mongo_uri)
        db = client[db_name]
        students_collection = db[collection_name]
        logging.info("Connected to MongoDB successfully")
    except Exception as e:
        logging.error(f"Failed to connect to MongoDB: {e}")
        return

    # Find all CSV files in the csv_output directory
    csv_path = "csv_output/*.csv"
    csv_files = glob.glob(csv_path)
    
    logging.info(f"Found {len(csv_files)} CSV files to process")
    
    # Track updates
    total_students = 0
    updated_students = 0
    failed_updates = 0
    
    # Process each CSV file
    for file in csv_files:
        file_name = os.path.basename(file)
        logging.info(f"Processing file: {file_name}")
        
        try:
            # Read the CSV file
            df = pd.read_csv(file)
            
            # Find the specialization column (with or without trailing spaces)
            specialization_col = None
            program_col = None
            register_col = None
            
            for col in df.columns:
                if col.strip() == 'SPECIALAIZATION':
                    specialization_col = col
                if col.strip() == 'PROGRAM':
                    program_col = col
                if col.strip() == 'REGISTER NO':
                    register_col = col
            
            if not all([specialization_col, program_col, register_col]):
                logging.warning(f"Required columns not found in {file_name}. "
                               f"Found: SPECIALAIZATION={specialization_col is not None}, "
                               f"PROGRAM={program_col is not None}, "
                               f"REGISTER NO={register_col is not None}")
                continue
            
            # Process each student in the CSV
            for _, row in df.iterrows():
                total_students += 1
                register_no = row[register_col]
                specialization = row[specialization_col]
                
                # Program validation and normalization
                valid_programs = ['BTech', 'MTech', 'MTech-Integrated']
                program = row[program_col]
                
                if program not in valid_programs:
                    program_lower = program.lower().replace('.', '').replace('-', '').replace(' ', '')
                    
                    if 'btech' in program_lower:
                        program = 'BTech'
                    elif 'mtechintegrated' in program_lower or 'integratedmtech' in program_lower:
                        program = 'MTech-Integrated'
                    elif 'mtech' in program_lower:
                        program = 'MTech'
                    else:
                        logging.warning(f"Unknown program format '{program}' for student {register_no}, defaulting to 'BTech'")
                        program = 'BTech'
                
                try:
                    # Update the student record in MongoDB
                    result = students_collection.update_one(
                        {"registerNo": register_no},
                        {"$set": {"course": specialization, "program": program}}
                    )
                    
                    if result.matched_count > 0:
                        if result.modified_count > 0:
                            updated_students += 1
                            logging.debug(f"Updated student {register_no}: course={specialization}, program={program}")
                    else:
                        logging.warning(f"Student not found: {register_no}")
                        failed_updates += 1
                        
                except Exception as e:
                    logging.error(f"Error updating student {register_no}: {e}")
                    failed_updates += 1
                    
        except Exception as e:
            logging.error(f"Error processing file {file}: {e}")
    
    # Print summary
    logging.info(f"Update complete!")
    logging.info(f"Total students processed: {total_students}")
    logging.info(f"Students successfully updated: {updated_students}")
    logging.info(f"Failed updates: {failed_updates}")

if __name__ == "__main__":
    update_student_courses()
    print("\nStudent course and program information has been updated.")