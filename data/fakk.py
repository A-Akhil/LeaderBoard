import os
import csv
import json
import glob
import time
import random
import traceback
import datetime
import bcrypt
import uuid
from tqdm import tqdm
from pymongo import MongoClient
from bson import ObjectId
from faker import Faker

# Initialize faker
fake = Faker('en_IN')

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['leaderboard_new_new_new']

# Configuration
CURRENT_YEAR = 2024
ACADEMIC_YEAR = "2024-2025"

# Event statuses with weights for random selection
EVENT_STATUSES = ['Pending', 'Approved', 'Rejected']
STATUS_WEIGHTS = [0.2, 0.7, 0.1]  # 20% pending, 70% approved, 10% rejected

# Colleges for outside events
COLLEGES = ['IIT Madras', 'NIT Trichy', 'VIT University', 'SRM University', 'Anna University']

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
    3: "2022-2026",  # 3rd year academic span
    4: "2021-2025",  # 4th year academic span
}

def load_form_configs():
    """Load form field configurations from JSON file"""
    print("Loading form field configurations...")
    try:
        with open('leaderboard_db.formfieldconfigs.json', 'r') as f:
            configs = json.load(f)
            # Convert to dict with category as key for easier access
            config_dict = {config['category']: config for config in configs}
            print(f"Loaded {len(config_dict)} form field configurations")
            return config_dict
    except Exception as e:
        print(f"Error loading form field configurations: {e}")
        traceback.print_exc()
        return {}

def clear_database():
    """Clear all collections before seeding"""
    print("Clearing existing database...")
    db.teachers.drop()
    db.students.drop()
    db['classes'].drop()
    db.events.drop()
    print("Database cleared successfully")

def read_faculty_data():
    """Read faculty data from CSV file"""
    print("Reading faculty data...")
    faculty_data = []
    
    try:
        with open('fa/faculty.csv', 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            # Print header to debug
            print(f"Faculty CSV headers: {reader.fieldnames}")
            for row in reader:
                faculty = {
                    'name': row['Faculty Name'],  # Updated from 'Name' to 'Faculty Name'
                    'email': row['Email ID'],      # Updated from 'Email' to 'Email ID'
                    'faculty_id': row['Faculty ID'],
                    'role': row['Role'],
                    'department': row['department'],  # Note: lowercase 'department'
                    'classes_type': row.get('classes', ''),  # Added to support class assignment
                    'year_guide': row.get('Year-Guide', '')  # Added to support year guidance
                }
                faculty_data.append(faculty)
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
    
    # Get all CSV files in the csv_output directory
    csv_files = glob.glob('csv_output/*.csv')
    print(f"Found {len(csv_files)} CSV files")
    
    if not csv_files:
        print("WARNING: No CSV files found in the csv_output directory!")
        return [], []
    
    for file_path in tqdm(csv_files, desc="Processing CSV files"):
        try:
            with open(file_path, 'r', encoding='utf-8') as csvfile:
                reader = csv.reader(csvfile)
                headers = next(reader)
                
                print(f"Processing file: {file_path}")
                print(f"Headers: {headers}")
                
                # For this specific format, map columns based on position
                # Based on the error logs, columns appear to be:
                # [id, regno, name, email, section, year, specialization, program, department, advisor]
                for row in reader:
                    if len(row) < 9:  # Ensure row has minimum required fields
                        continue
                    
                    try:
                        # Extract values by position
                        register_no = row[1].strip() if len(row) > 1 else ""
                        name = row[2].strip() if len(row) > 2 else ""
                        email = row[3].strip() if len(row) > 3 else ""
                        section = row[4].strip() if len(row) > 4 else ""
                        
                        # Handle year parsing with explicit error handling
                        if len(row) > 5:
                            try:
                                year = int(row[5].strip())
                            except (ValueError, TypeError):
                                year = 1
                        else:
                            year = 1
                            
                        specialization = row[6].strip() if len(row) > 6 else ""
                        program = row[7].strip() if len(row) > 7 else "B.Tech"
                        department = row[8].strip() if len(row) > 8 else ""
                        faculty_advisor = row[9].strip() if len(row) > 9 else ""

                        # Normalize program
                        if 'mtech-integrated' in program.lower():
                            program = 'MTech-Integrated'
                        elif 'mtech' in program.lower():
                            program = 'MTech'
                        else:
                            program = 'BTech'
                        
                        # Create student record
                        student = {
                            'register_no': register_no,
                            'name': name,
                            'email': email,
                            'section': section,
                            'year': year,
                            'specialization': specialization,
                            'program': program,
                            'department': department,
                            'faculty_advisor': faculty_advisor
                        }
                        
                        # Ensure we have required fields
                        if not register_no or not name:
                            continue
                            
                        # Add to student data
                        student_data.append(student)
                        
                        # Add class tuple
                        class_data.add((department, year, section))
                        
                    except Exception as e:
                        print(f"Error processing row: {e}")
                        print(f"Row data: {row}")
                        continue
                        
        except Exception as e:
            print(f"ERROR processing file {file_path}: {str(e)}")
            traceback.print_exc()
            continue
    
    # Convert class_data to list of tuples
    unique_classes = list(class_data)
    print(f"Processed {len(student_data)} students across {len(unique_classes)} unique classes")
    
    return student_data, unique_classes

def create_teachers(faculty_data):
    """Create teacher documents from faculty data"""
    print("Creating teachers...")
    teachers = []
    teacher_map = {}  # Maps faculty_id to teacher document
    
    for faculty in tqdm(faculty_data, desc="Creating teacher documents"):
        # Hash password (using faculty ID as password)
        password = faculty['faculty_id']
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
    
    print(f"Created {len(teachers)} teacher documents")
    return teachers, teacher_map

def create_classes(class_tuples, teacher_map, faculty_data):
    """Create class documents based on unique department/year/section combinations"""
    print("Creating classes...")
    classes = []
    class_map = {}  # Maps (dept, year, section) to class document
    
    for dept, year, section in tqdm(class_tuples, desc="Creating class documents"):
        class_name = f"{year}-{section}-{dept}"
        
        # Find faculty advisors for this class
        assigned_faculty_ids = []
        academic_advisor_ids = []
        
        # Find faculty assigned to this class
        for faculty in faculty_data:
            if faculty['department'] == dept:
                # Find faculty specifically assigned to this section
                if faculty['classes_type'] == section:
                    teacher = teacher_map.get(faculty['faculty_id'])
                    if teacher:
                        assigned_faculty_ids.append(teacher['_id'])
                        
                # Find academic advisors for this year
                if faculty['role'] == 'Academic Advisor' and (faculty['year_guide'] == str(year) or faculty['year_guide'] == 'All'):
                    teacher = teacher_map.get(faculty['faculty_id'])
                    if teacher:
                        academic_advisor_ids.append(teacher['_id'])
                        
                # Add HODs to all classes in their department
                if faculty['role'] == 'HOD':
                    teacher = teacher_map.get(faculty['faculty_id'])
                    if teacher:
                        academic_advisor_ids.append(teacher['_id'])
                        
                # If we still don't have faculty, add regular faculty from the department
                if not assigned_faculty_ids and faculty['role'] == 'Faculty':
                    teacher = teacher_map.get(faculty['faculty_id'])
                    if teacher:
                        assigned_faculty_ids.append(teacher['_id'])
        
        # Limit to reasonable number if we found too many
        if len(assigned_faculty_ids) > 3:
            assigned_faculty_ids = assigned_faculty_ids[:3]
        if len(academic_advisor_ids) > 2:
            academic_advisor_ids = academic_advisor_ids[:2]
        
        # If no faculty found, add a placeholder note
        if not assigned_faculty_ids:
            print(f"WARNING: No faculty members assigned to class {class_name}")
            # Use an academic advisor as a fallback if available
            if academic_advisor_ids:
                assigned_faculty_ids = [academic_advisor_ids[0]]
            else:
                # If we still have no faculty, we'll skip this class
                print(f"ERROR: Could not create class {class_name} - no faculty available")
                continue
            
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
        
        # Update teacher classes
        for faculty_id in assigned_faculty_ids + academic_advisor_ids:
            for teacher in teacher_map.values():
                if teacher['_id'] == faculty_id:
                    teacher['classes'].append(class_obj['_id'])
        
        classes.append(class_obj)
        class_map[(dept, year, section)] = class_obj
    
    print(f"Created {len(classes)} class documents")
    return classes, class_map

def create_students(student_data, class_map):
    """Create student documents from CSV data"""
    print("Creating students...")
    students = []
    problems = 0
    student_map = {}  # Maps student register_no to student document
    
    for student in tqdm(student_data, desc="Creating student documents"):
        # Hash password (using register number as password)
        password = student['register_no']
        try:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode()
            
            # Find the class for this student
            class_key = (student['department'], student['year'], student['section'])
            if class_key not in class_map:
                problems += 1
                print(f"WARNING: No class found for student {student['name']} ({student['register_no']}) - {class_key}")
                continue
            
            class_obj = class_map[class_key]
            
            student_doc = {
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
                "registrationYear": YEAR_TO_REG.get(student['year'], CURRENT_YEAR),
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
            
            # Add student to class's student list
            class_obj["students"].append(student_doc["_id"])
            
            students.append(student_doc)
            student_map[student['register_no']] = student_doc
        except Exception as e:
            print(f"Error creating student {student['name']}: {e}")
            problems += 1
    
    print(f"Created {len(students)} student documents")
    if problems > 0:
        print(f"Encountered {problems} problems while creating students")
    
    return students, student_map

def generate_event_details(category, form_configs):
    """Generate event details based on category and form configuration"""
    config = form_configs.get(category, {})
    
    # Base event details
    event_details = {
        "eventName": f"{category} - {fake.catch_phrase()}",
        "description": fake.paragraph(),
        "date": fake.date_time_between(start_date="-1y", end_date="now"),
    }
    
    # Custom answers based on form config
    custom_answers = {}
    dynamic_fields = {}
    
    # Process custom questions from config
    if "customQuestions" in config:
        for question in config.get("customQuestions", []):
            question_id = question.get("id")
            options = question.get("options", [])
            
            if question_id and options:
                answer = random.choice(options)
                custom_answers[question_id] = answer
                dynamic_fields[f"customAnswer_{question_id}"] = answer
    
    # Add optional fields based on config
    for field in config.get("optionalFields", []):
        if random.random() > 0.3:  # 70% chance of including optional field
            if field == "teamName":
                dynamic_fields[field] = f"Team {fake.color_name().capitalize()}"
            elif field == "eventLocation":
                dynamic_fields[field] = random.choice(["College Campus", "Online", "Convention Center"])
            elif field == "certificateLink":
                dynamic_fields[field] = f"https://certificates.example.com/{uuid.uuid4()}"
            elif field == "publicationLink":
                dynamic_fields[field] = f"https://doi.org/10.1234/{uuid.uuid4().hex[:8]}"
            elif field == "githubRepoUrl":
                dynamic_fields[field] = f"https://github.com/user/{fake.word()}-{fake.word()}"
            elif field == "organizationName":
                dynamic_fields[field] = fake.company()
            elif field == "role":
                dynamic_fields[field] = random.choice(["Leader", "Coordinator", "Organizer", "Member"])
            elif field == "sportName":
                dynamic_fields[field] = random.choice(["Cricket", "Football", "Basketball", "Tennis", "Athletics"])
    
    # Generate proof URLs based on the proof config
    proof_config = config.get("proofConfig", {})
    proof_urls = []
    
    if proof_config and proof_config.get("requireCertificateImage", False):
        max_certs = proof_config.get("maxCertificateSize", 1)
        allow_multiple = proof_config.get("allowMultipleCertificates", False)
        
        if allow_multiple and max_certs > 1:
            num_certs = random.randint(1, max_certs)
        else:
            num_certs = 1
            
        for i in range(num_certs):
            proof_urls.append(f"/uploads/certificates/certificateImages-{int(time.time())}-{random.randint(100000000, 999999999)}.jpeg")
    
    # Generate PDF document if required
    pdf_document = None
    if proof_config and proof_config.get("requirePdfProof", False):
        pdf_document = f"/uploads/documents/pdfDocument-{int(time.time())}-{random.randint(100000000, 999999999)}.pdf"
    
    return event_details, custom_answers, dynamic_fields, proof_urls, pdf_document

def calculate_points(category, custom_answers, form_configs):
    """Calculate points based on event category and custom answers"""
    config = form_configs.get(category, {})
    points = 0
    
    # Base points for different categories
    category_base_points = {
        "Hackathon": 15,
        "Coding Competitions": 10,
        "Research": 25,
        "Open Source": 20,
        "Certifications": 15,
        "Workshops": 5,
        "Sports": 10,
        "NCC_NSS_YRC": 15,
        "Student Leadership": 10,
        "Social Work & Community Impact": 5
    }
    
    # Start with base points for the category
    points = category_base_points.get(category, 5)
    
    # Add points based on specific answers
    if category == "Hackathon":
        # Level multiplier
        level_multipliers = {
            "International": 3.0,
            "National": 2.0,
            "Inter-College": 1.5,
            "Intra-College": 1.0
        }
        
        # Outcome multiplier
        outcome_multipliers = {
            "Winner (1st)": 3.0,
            "Runner-up (2nd)": 2.0,
            "3rd Place": 1.5,
            "Finalist": 1.2,
            "Participant": 1.0
        }
        
        # Apply multipliers
        level = custom_answers.get("level")
        outcome = custom_answers.get("outcome")
        
        if level in level_multipliers:
            points *= level_multipliers[level]
        
        if outcome in outcome_multipliers:
            points *= outcome_multipliers[outcome]
    
    elif category == "Certifications":
        # Provider multiplier
        provider_multipliers = {
            "Stanford/MIT/AWS/Google/Top 500": 3.0,
            "NPTEL": 2.0,
            "Coursera/Udemy": 1.5,
            "Other": 1.0
        }
        
        # Project multiplier
        project_multipliers = {
            "Yes": 1.5,
            "No": 1.0
        }
        
        # Level multiplier
        level_multipliers = {
            "Advanced": 2.0,
            "Intermediate": 1.5,
            "Beginner": 1.0
        }
        
        # Apply multipliers
        provider = custom_answers.get("provider")
        project = custom_answers.get("project_required")
        level = custom_answers.get("level")
        
        if provider in provider_multipliers:
            points *= provider_multipliers[provider]
        
        if project in project_multipliers:
            points *= project_multipliers[project]
            
        if level in level_multipliers:
            points *= level_multipliers[level]
    
    elif category == "Research":
        # Publisher multiplier
        publisher_multipliers = {
            "IEEE/Springer/Elsevier(q1)": 3.0,
            "Other Scopus/SCI Journals (Q2)": 2.0,
            "Others": 1.0
        }
        
        # Authorship multiplier
        authorship_multipliers = {
            "1st Author": 2.0,
            "2nd Author": 1.5,
            "Co-author": 1.0
        }
        
        # Apply multipliers
        publisher = custom_answers.get("publisher")
        authorship = custom_answers.get("authorship")
        
        if publisher in publisher_multipliers:
            points *= publisher_multipliers[publisher]
            
        if authorship in authorship_multipliers:
            points *= authorship_multipliers[authorship]
    
    # Round points to nearest integer
    return round(points)

def create_events(students, class_map, teacher_map, form_configs):
    """Create events for students with various statuses"""
    print("Creating events...")
    events = []
    
    # Get event categories from form configs
    event_categories = list(form_configs.keys())
    
    # Create events for students
    for student in tqdm(students, desc="Generating student events"):
        # Randomly decide how many events this student has (0-5)
        num_events = random.choices([0, 1, 2, 3, 4, 5], weights=[0.2, 0.3, 0.25, 0.15, 0.05, 0.05], k=1)[0]
        
        if num_events == 0:
            continue
            
        # Get the class object for this student
        class_obj = None
        for cls in class_map.values():
            if cls["_id"] == student["class"]:
                class_obj = cls
                break
                
        if not class_obj:
            continue
            
        # Get faculty members for this class
        faculty_id = None
        if class_obj["assignedFaculty"]:
            faculty_id = random.choice(class_obj["assignedFaculty"])
        
        # Generate events for this student
        for _ in range(num_events):
            # Select a random category, weighted towards more common categories
            category = random.choice(event_categories)
            
            # Generate event details based on category
            event_details, custom_answers, dynamic_fields, proof_urls, pdf_document = generate_event_details(
                category, form_configs
            )
            
            # Determine status (pending, approved, rejected)
            status = random.choices(EVENT_STATUSES, weights=STATUS_WEIGHTS, k=1)[0]
            
            # Calculate points based on category and answers
            points = calculate_points(category, custom_answers, form_configs) if status == 'Approved' else 0
            
            # Create base event object
            event = {
                "_id": ObjectId(),
                "eventName": event_details["eventName"],
                "description": event_details["description"],
                "date": event_details["date"],
                "proofUrl": proof_urls,
                "pdfDocument": pdf_document,
                "status": status,
                "category": category,
                "customAnswers": custom_answers,
                "dynamicFields": dynamic_fields,
                "pointsEarned": points,
                "submittedBy": student["_id"],
                "createdAt": event_details["date"],
                "updatedAt": datetime.datetime.now()
            }
            
            # Add approver if approved or rejected
            if status != 'Pending' and faculty_id:
                event["approvedBy"] = faculty_id
                # Make update date after creation date
                event["updatedAt"] = event["createdAt"] + datetime.timedelta(days=random.randint(1, 10))
            
            # Add to events list
            events.append(event)
            
            # Add event to student's participated events and update points
            student["eventsParticipated"].append(event["_id"])
            if status == 'Approved':
                student["totalPoints"] += points
                
                # Add to achievements if significant points
                if points >= 20:
                    achievement = {
                        "id": str(event["_id"]),
                        "title": event["eventName"],
                        "points": points,
                        "date": event["date"]
                    }
                    student["achievements"].append(achievement)
    
    print(f"Created {len(events)} events")
    return events

def seed_database():
    """Main function to seed the database"""
    start_time = time.time()
    
    # Clear existing data
    clear_database()
    print(f"Time after clearing: {time.time() - start_time:.2f} seconds")
    
    # Load form field configurations
    form_configs = load_form_configs()
    print(f"Time after loading configs: {time.time() - start_time:.2f} seconds")
    
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
    students, student_map = create_students(student_data, class_map)
    print(f"Time after creating students: {time.time() - start_time:.2f} seconds")
    
    # Create events
    events = create_events(students, class_map, teacher_map, form_configs)
    print(f"Time after creating events: {time.time() - start_time:.2f} seconds")
    
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
    
    # Insert events
    if events:
        print(f"Inserting {len(events)} event documents into MongoDB...")
        db.events.insert_many(events)
        print(f"Inserted {len(events)} events")
    
    # Print summary
    total_time = time.time() - start_time
    print("\nDatabase seeding completed!")
    print(f"- {len(teachers)} teachers created")
    print(f"- {len(classes)} classes created")
    print(f"- {len(students)} students created")
    print(f"- {len(events)} events created")
    print(f"Total time: {total_time:.2f} seconds")

if __name__ == "__main__":
    seed_database()