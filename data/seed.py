import pymongo
from pymongo import MongoClient
import bcrypt
import datetime
from bson import ObjectId
import time
import csv
import os
import glob
import traceback

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['leaderboard_new']

# Configuration
CURRENT_YEAR = 2024
ACADEMIC_YEAR = "2024-2025"

# Year to registration year mapping
YEAR_TO_REG = {
    1: 2024,  # 1st year students registered in 2024
    2: 2023,  # 2nd year students registered in 2023
    3: 2022,  # 3rd year students registered in 2022
    4: 2021,  # 4th year students registered in 2021
}

# Updated year to academic year mapping
YEAR_TO_ACADEMIC_YEAR = {
    1: "2024-2028",  # 1st year academic span
    2: "2023-2027",  # 2nd year academic span
    3: "2022-2026",  # 3rd year academic span  - updated as specified
    4: "2021-2025",  # 4th year academic span
}

def clear_database():
    """Clear all collections before seeding"""
    print("Clearing existing database...")
    db.teachers.drop()
    db.students.drop()
    db['classes'].drop()
    print("Database cleared successfully")

def read_faculty_data():
    """Read faculty data from CSV file"""
    print("Reading faculty data...")
    faculty_data = []
    
    try:
        print("Opening fa/faculty.csv...")
        with open('fa/faculty.csv', 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            print(f"CSV header: {reader.fieldnames}")
            for idx, row in enumerate(reader):
                print(f"Processing faculty #{idx+1}: {row.get('Faculty Name', 'Unknown')}")
                try:
                    faculty_data.append({
                        'faculty_id': row['Faculty ID'],
                        'name': row['Faculty Name'],
                        'designation': row['Designation'],
                        'mobile': row['Mobile No'],
                        'email': row['Email ID'],
                        'role': row['Role'],
                        'department': row['department'],
                        'classes_type': row['classes'],
                        'year_guide': row['Year-Guide']
                    })
                    print(f"  - Added faculty: {row['Faculty Name']}, Role: {row['Role']}, Dept: {row['department']}")
                except KeyError as ke:
                    print(f"  - ERROR: Missing key in faculty CSV: {ke}")
                    print(f"  - Available keys: {list(row.keys())}")
    except Exception as e:
        print(f"Error reading faculty data: {e}")
        traceback.print_exc()
    
    print(f"Successfully loaded {len(faculty_data)} faculty members")
    return faculty_data

def read_student_data():
    """Read student data from all CSV files in csv_output directory"""
    print("Reading student data...")
    student_data = []
    class_data = set()  # Set of (department, year, section) tuples
    
    # List of required columns (case-sensitive)
    required_columns = [
        'REGISTER NO', 'STUDENT NAME', 'EMAILID', 'SECTION', 
        'YEAR OF STUDY', 'SPECIALIZATION', 'PROGRAM', 'DEPARTMENT', 'FACULTY ADVISOR'
    ]
    
    # Alternative column names that might be used
    column_alternatives = {
        'EMAILID': ['EMAIL ID', 'EMAIL', 'E-MAIL', 'E MAIL'],
        'REGISTER NO': ['REGNO', 'REG NO', 'REGISTRATION NO', 'REGISTRATION NUMBER'],
        'STUDENT NAME': ['NAME', 'FULL NAME'],
        'SPECIALIZATION': ['SPECIALAIZATION', 'SPECIALISATION'],
        'FACULTY ADVISOR': ['ADVISOR', 'FACULTY GUIDE']
    }
    
    # Get all CSV files in the csv_output directory
    print("Searching for CSV files in csv_output directory...")
    csv_files = glob.glob('csv_output/*.csv')
    print(f"Found {len(csv_files)} CSV files: {csv_files}")
    
    if not csv_files:
        print("WARNING: No CSV files found in the csv_output directory!")
        return [], []
    
    for file_idx, file_path in enumerate(csv_files):
        print(f"\nProcessing file {file_idx+1}/{len(csv_files)}: {file_path}")
        try:
            with open(file_path, 'r', encoding='utf-8') as csvfile:
                # First read the header to check for required columns
                reader = csv.reader(csvfile)
                header = next(reader, None)
                
                if not header:
                    print(f"WARNING: Empty or invalid header in file {file_path}")
                    continue
                
                print(f"CSV header: {header}")
                
                # Create a mapping from standard column name to actual column index
                column_map = {}
                for required_col in required_columns:
                    # Check for exact match
                    if required_col in header:
                        column_map[required_col] = header.index(required_col)
                        print(f"  - Found column '{required_col}' at index {column_map[required_col]}")
                    else:
                        # Check for alternative names
                        found = False
                        if required_col in column_alternatives:
                            for alt_name in column_alternatives[required_col]:
                                if alt_name in header:
                                    column_map[required_col] = header.index(alt_name)
                                    print(f"  - Using '{alt_name}' instead of '{required_col}' at index {column_map[required_col]}")
                                    found = True
                                    break
                        
                        if not found:
                            print(f"ERROR: Required column '{required_col}' not found in {file_path}")
                            print(f"Available columns: {header}")
                            print(f"Skipping file {file_path}")
                            break
                
                # If we didn't find all required columns, skip this file
                if len(column_map) != len(required_columns):
                    print(f"Missing columns: {set(required_columns) - set(column_map.keys())}")
                    print(f"Complete column map: {column_map}")
                    continue
                
                print(f"Successfully mapped all required columns: {column_map}")
                
                # Reset file pointer and skip header
                csvfile.seek(0)
                reader = csv.reader(csvfile)
                next(reader)  # Skip header
                
                # Now process the data with our column mapping
                students_in_file = 0
                for row_idx, row in enumerate(reader):
                    # Skip empty rows or rows that don't have enough columns
                    if not row or len(row) < len(header):
                        print(f"  - Skipping row {row_idx+1}: insufficient data")
                        continue
                    
                    # Skip rows with empty register number
                    if not row[column_map['REGISTER NO']].strip():
                        print(f"  - Skipping row {row_idx+1}: empty register number")
                        continue
                    
                    # Convert year from string to int
                    try:
                        year = int(row[column_map['YEAR OF STUDY']])
                    except (ValueError, TypeError):
                        print(f"  - Warning: Invalid year for student {row[column_map['REGISTER NO']]} in row {row_idx+1}, defaulting to 1")
                        year = 1
                    
                    student = {
                        'register_no': row[column_map['REGISTER NO']],
                        'name': row[column_map['STUDENT NAME']],
                        'email': row[column_map['EMAILID']],
                        'section': row[column_map['SECTION']],
                        'year': year,
                        'specialization': row[column_map['SPECIALIZATION']],
                        'program': row[column_map['PROGRAM']],
                        'department': row[column_map['DEPARTMENT']],
                        'faculty_advisor': row[column_map['FACULTY ADVISOR']]
                    }
                    
                    students_in_file += 1
                    student_data.append(student)
                    
                    # Add to class data
                    class_key = (row[column_map['DEPARTMENT']], year, row[column_map['SECTION']])
                    class_data.add(class_key)
                    
                    # Print occasional debug info
                    if students_in_file <= 2 or students_in_file % 50 == 0:
                        print(f"  - Added student #{students_in_file}: {student['name']} ({student['register_no']}), Year {year}, Section {student['section']}")
                
                print(f"  - Successfully processed {students_in_file} students from file {file_path}")
                    
        except Exception as e:
            print(f"ERROR processing file {file_path}: {str(e)}")
            traceback.print_exc()
    
    unique_classes = list(class_data)
    print(f"\nSummary: Processed {len(student_data)} students across {len(csv_files)} files")
    print(f"Found {len(unique_classes)} unique classes:")
    for dept, year, section in sorted(unique_classes):
        print(f"  - {dept}, Year {year}, Section {section}")
    
    return student_data, unique_classes

def create_teachers(faculty_data):
    """Create teacher documents from faculty data"""
    print("\nCreating teachers...")
    teachers = []
    teacher_map = {}  # Maps faculty_id to teacher document
    
    for idx, faculty in enumerate(faculty_data):
        print(f"Processing teacher #{idx+1}: {faculty['name']}")
        
        # Hash password (using faculty ID as password)
        password = faculty['faculty_id']
        print(f"  - Hashing password for {faculty['name']} (using faculty ID as password)")
        try:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode()
            
            teacher = {
                "_id": ObjectId(),
                "name": faculty['name'],
                "email": faculty['email'],
                "password": hashed_password,
                "rawPassword": password,
                "profileImg": None,
                "registerNo": faculty['faculty_id'],
                "role": faculty['role'],
                "department": faculty['department'],
                "classes": [],
                "isActive": True,
                "createdAt": datetime.datetime.now(),
                "updatedAt": datetime.datetime.now()
            }
            
            teachers.append(teacher)
            teacher_map[faculty['faculty_id']] = teacher
            print(f"  - Created teacher document with ID: {teacher['_id']}")
            print(f"  - Role: {faculty['role']}, Department: {faculty['department']}")
        except Exception as e:
            print(f"  - ERROR creating teacher {faculty['name']}: {e}")
    
    print(f"Created {len(teachers)} teacher documents")
    return teachers, teacher_map

def create_classes(class_tuples, teacher_map, faculty_data):
    """Create class documents based on unique department/year/section combinations"""
    print("\nCreating Classes...")
    classes = []
    class_map = {}  # Maps (dept, year, section) to class document
    
    for idx, (dept, year, section) in enumerate(class_tuples):
        print(f"Processing class #{idx+1}: Dept={dept}, Year={year}, Section={section}")
        class_name = f"{year}-{section}-{dept}"
        
        # Find faculty advisors for this class
        assigned_faculty_ids = []
        academic_advisor_ids = []
        
        print(f"  - Finding faculty members for {class_name}...")
        
        # Find faculty assigned to this class
        for faculty in faculty_data:
            if faculty['department'] == dept:
                # Get faculty member ID
                faculty_id = faculty['faculty_id']
                if faculty_id not in teacher_map:
                    continue
                
                # HOD assignment - assign to all classes in their department
                if faculty['role'] == 'HOD':
                    academic_advisor_ids.append(teacher_map[faculty_id]["_id"])
                    print(f"    - Assigned HOD: {faculty['name']}")
                    continue
                
                # Check year guide (for Academic Advisors)
                year_guide = faculty['year_guide']
                if not year_guide:  # Skip if year_guide is empty
                    continue
                    
                # Only assign to matching year or "All" years
                if year_guide == str(year) or year_guide == "All":
                    if faculty['role'] == 'Academic Advisor':
                        academic_advisor_ids.append(teacher_map[faculty_id]["_id"])
                        print(f"    - Assigned Academic Advisor: {faculty['name']}")
                    elif faculty['role'] == 'Faculty':
                        # For faculty, also check class assignment
                        assigned_class = faculty['classes_type']
                        if assigned_class and (assigned_class == section):
                            assigned_faculty_ids.append(teacher_map[faculty_id]["_id"])
                            print(f"    - Assigned faculty: {faculty['name']} to section {section}")
        
        if not assigned_faculty_ids:
            print(f"  - WARNING: No faculty members assigned to class {class_name}")
        
        class_obj = {
            "_id": ObjectId(),
            "year": year,
            "section": section,
            "className": class_name,
            "academicYear": YEAR_TO_ACADEMIC_YEAR.get(year, "Unknown"),
            "department": dept,
            "assignedFaculty": assigned_faculty_ids,
            "students": [],
            "facultyAssigned": assigned_faculty_ids,
            "academicAdvisors": academic_advisor_ids,
            "createdAt": datetime.datetime.now(),
            "updatedAt": datetime.datetime.now()
        }
        
        print(f"  - Created class document with ID: {class_obj['_id']}")
        print(f"  - Faculty count: {len(assigned_faculty_ids)}, Advisor count: {len(academic_advisor_ids)}")
        
        # Update teacher classes
        for faculty_id in assigned_faculty_ids + academic_advisor_ids:
            for teacher in teacher_map.values():
                if teacher["_id"] == faculty_id:
                    teacher["classes"].append(class_obj["_id"])
        
        classes.append(class_obj)
        class_map[(dept, year, section)] = class_obj
    
    print(f"Created {len(classes)} class documents")
    return classes, class_map

def create_students(student_data, class_map):
    """Create student documents from CSV data"""
    print("\nCreating Students...")
    students = []
    problems = 0
    
    for idx, student in enumerate(student_data):
        # Print progress
        if idx < 5 or idx % 100 == 0:
            print(f"Processing student #{idx+1}/{len(student_data)}: {student['name']}")
        
        # Hash password (using register number as password)
        password = student['register_no']
        try:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode()
            
            # Find the class for this student
            class_key = (student['department'], student['year'], student['section'])
            if class_key not in class_map:
                print(f"WARNING: No class found for student {student['register_no']} with class {class_key}")
                problems += 1
                continue
            
            class_obj = class_map[class_key]
            
            # Create student document
            student_obj = {
                "_id": ObjectId(),
                "name": student['name'],
                "profileImg": None,
                "email": student['email'],
                "registerNo": student['register_no'],
                "password": hashed_password,
                "rawPassword": password,
                "class": class_obj["_id"],
                "year": student['year'],
                "course": f"{student['program']}-{student['department']}",
                "totalPoints": 0,
                "eventsParticipated": [],
                "isActive": True,
                "isGraduated": False,
                "isArchived": False,
                "registrationYear": YEAR_TO_REG.get(student['year'], 2024),
                "program": student['program'],
                "department": student['department'],
                "currentClass": {
                    "year": student['year'],
                    "section": student['section'],
                    "ref": class_obj["_id"]
                },
                "classHistory": [{
                    "year": student['year'],
                    "section": student['section'],
                    "academicYear": YEAR_TO_ACADEMIC_YEAR.get(student['year'], "Unknown"),
                    "classRef": class_obj["_id"]
                }],
                "achievements": [],
                "createdAt": datetime.datetime.now(),
                "updatedAt": datetime.datetime.now()
            }
            
            # Add student to this class's student list
            class_obj["students"].append(student_obj["_id"])
            students.append(student_obj)
            
            # Print occasional debug info
            if idx < 2 or (idx % 500 == 0 and idx > 0):
                print(f"  - Created student document for {student['name']} ({student['register_no']})")
                print(f"  - Assigned to class: {class_obj['className']}")
                print(f"  - Registration year: {student_obj['registrationYear']}")
                print(f"  - Academic year: {student_obj['classHistory'][0]['academicYear']}")
        
        except Exception as e:
            print(f"ERROR creating student {student['register_no']}: {e}")
            problems += 1
    
    print(f"Created {len(students)} student documents")
    if problems > 0:
        print(f"Encountered {problems} problems while creating students")
    
    # Print class distribution
    print("\nClass distribution:")
    class_count = {}
    for class_key, class_obj in class_map.items():
        class_count[class_obj['className']] = len(class_obj['students'])
    
    for class_name, count in sorted(class_count.items()):
        print(f"  - {class_name}: {count} students")
    
    return students

def seed_database():
    """Main function to seed the database"""
    start_time = time.time()
    
    # Clear existing data
    clear_database()
    print(f"Time after clearing: {time.time() - start_time:.2f} seconds")
    
    # Read faculty data
    faculty_data = read_faculty_data()
    print(f"Time after reading faculty: {time.time() - start_time:.2f} seconds")
    
    # Read student data
    student_data, class_tuples = read_student_data()
    print(f"Time after reading students: {time.time() - start_time:.2f} seconds")
    
    # Create teachers
    teachers, teacher_map = create_teachers(faculty_data)
    print(f"Time after creating teachers: {time.time() - start_time:.2f} seconds")
    
    # Create classes
    classes, class_map = create_classes(class_tuples, teacher_map, faculty_data)
    print(f"Time after creating classes: {time.time() - start_time:.2f} seconds")
    
    # Create students
    students = create_students(student_data, class_map)
    print(f"Time after creating students: {time.time() - start_time:.2f} seconds")
    
    # Insert data into database
    print("\nInserting data into database...")
    
    # Insert teachers
    if teachers:
        print(f"Inserting {len(teachers)} teacher documents into MongoDB...")
        db.teachers.insert_many(teachers)
        print(f"Inserted {len(teachers)} teachers")
    
    # Insert classes
    if classes:
        print(f"Inserting {len(classes)} class documents into MongoDB...")
        db['classes'].insert_many(classes)
        print(f"Inserted {len(classes)} classes")
    
    # Insert students
    if students:
        print(f"Inserting {len(students)} student documents into MongoDB...")
        db.students.insert_many(students)
        print(f"Inserted {len(students)} students")
    
    # Print summary
    total_time = time.time() - start_time
    print("\nDatabase seeding completed!")
    print(f"- {len(teachers)} teachers created")
    print(f"- {len(classes)} classes created")
    print(f"- {len(students)} students created")
    print(f"Total time: {total_time:.2f} seconds")

if __name__ == "__main__":
    seed_database()