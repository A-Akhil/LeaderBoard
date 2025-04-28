import pymongo
from pymongo import MongoClient
import random
from faker import Faker
import bcrypt
import datetime
from bson import ObjectId
import time
from tqdm import tqdm

# Initialize faker
fake = Faker('en_IN')

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['leaderboard_new']

# Configuration
PASSWORD = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt()).decode()
RAW_PASSWORD = "password123"
CURRENT_YEAR = 2024
ACADEMIC_YEAR = "2024-2025"
DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT']
SECTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2']
STUDENTS_PER_CLASS = 20
CLASSES_PER_YEAR_PER_DEPT = 20  # User specified 20 classes per year per department

# Event configuration
EVENT_CATEGORIES = ['Hackathon', 'Ideathon', 'Coding', 'Global-Certificates', 'Workshop', 'Conference', 'Others']
EVENT_STATUSES = ['Pending', 'Approved', 'Rejected']
EVENT_POSITIONS = ['First', 'Second', 'Third', 'Participant', 'None']
EVENT_LOCATIONS = ['Within College', 'Outside College']
EVENT_SCOPES = ['International', 'National', 'State']
EVENT_ORGANIZERS = ['Industry Based', 'College Based']
EVENT_TYPES = ['Individual', 'Team']
COLLEGES = ['IIT Madras', 'NIT Trichy', 'VIT University', 'SRM University', 'Anna University']

# Points configuration
POINTS_CONFIG = {
    'First': {'International': 100, 'National': 75, 'State': 50},
    'Second': {'International': 75, 'National': 50, 'State': 30},
    'Third': {'International': 50, 'National': 30, 'State': 20},
    'Participant': {'International': 25, 'National': 15, 'State': 10},
    'None': {'International': 10, 'National': 5, 'State': 3}
}

# Year to registration year mapping
YEAR_TO_REG = {
    1: 2024,  # 1st year students registered in 2024
    2: 2023,  # 2nd year students registered in 2023
    3: 2022,  # 3rd year students registered in 2022
    4: 2021,  # 4th year students registered in 2021
}

YEAR_TO_ACADEMIC_YEAR = {
    1: "2024-2028",  # 1st year academic span
    2: "2023-2027",  # 2nd year academic span
    3: "2022-2026",  # 3rd year academic span
    4: "2021-2025",  # 4th year academic span
}

def clear_database():
    """Clear all collections before seeding"""
    print("Clearing existing database...")
    db.teacher.drop()
    db.student.drop()
    # Fix: Use dictionary-style access for the 'class' collection
    db['classes'].drop()
    db.events.drop()
    print("Database cleared successfully")

def create_hods():
    """Create HOD for each department"""
    print("Creating HODs...")
    hods = {}
    
    for dept in DEPARTMENTS:
        register_no = f"HOD-{dept}-001"
        hod = {
            "_id": ObjectId(),
            "name": f"Dr. {fake.name()}",
            "email": f"hod.{dept.lower()}@college.edu",
            "password": PASSWORD,
            "rawPassword": RAW_PASSWORD,
            "profileImg": None,
            "registerNo": register_no,
            "role": "HOD",
            "department": dept,
            "classes": [],
            "isActive": True,
            "createdAt": datetime.datetime.now(),
            "updatedAt": datetime.datetime.now()
        }
        hods[dept] = hod
    
    return hods

def create_academic_advisors(departments, years):
    """Create academic advisors for each department and year"""
    print("Creating Academic Advisors...")
    advisors = {}
    counter = 1
    
    for dept in departments:
        advisors[dept] = {}
        for year in years:
            advisors[dept][year] = []
            # Create two academic advisors per year per department
            for i in range(2):
                register_no = f"ADV-{dept}-{year}-{counter:03d}"
                advisor = {
                    "_id": ObjectId(),
                    "name": f"Dr. {fake.name()}",
                    "email": f"advisor{counter}.{dept.lower()}@college.edu",
                    "password": PASSWORD,
                    "rawPassword": RAW_PASSWORD,
                    "profileImg": None,
                    "registerNo": register_no,
                    "role": "Academic Advisor",
                    "department": dept,
                    "classes": [],
                    "isActive": True,
                    "createdAt": datetime.datetime.now(),
                    "updatedAt": datetime.datetime.now()
                }
                advisors[dept][year].append(advisor)
                counter += 1
    
    return advisors

def create_faculty(departments, years, classes_per_year):
    """Create faculty members for each class"""
    print("Creating Faculty members...")
    faculty = {}
    counter = 1
    
    for dept in departments:
        faculty[dept] = {}
        for year in years:
            faculty[dept][year] = []
            # Create faculty for each class
            for i in range(classes_per_year):
                register_no = f"FAC-{dept}-{year}-{counter:03d}"
                teacher = {
                    "_id": ObjectId(),
                    "name": f"Prof. {fake.name()}",
                    "email": f"faculty{counter}.{dept.lower()}@college.edu",
                    "password": PASSWORD,
                    "rawPassword": RAW_PASSWORD,
                    "profileImg": None,
                    "registerNo": register_no,
                    "role": "Faculty",
                    "department": dept,
                    "classes": [],
                    "isActive": True,
                    "createdAt": datetime.datetime.now(),
                    "updatedAt": datetime.datetime.now()
                }
                faculty[dept][year].append(teacher)
                counter += 1
    
    return faculty

def create_classes(departments, years, faculty_data, advisors_data, sections):
    """Create classes for each department and year"""
    print("Creating Classes...")
    classes = {}
    
    for dept in departments:
        classes[dept] = {}
        for year in years:
            classes[dept][year] = []
            
            # Get faculty and academic advisors for this department and year
            dept_faculty = faculty_data[dept][year]
            dept_advisors = advisors_data[dept][year]
            
            # Create classes for this department and year
            for i in range(CLASSES_PER_YEAR_PER_DEPT):
                # Cycle through sections if we have more classes than sections
                section = sections[i % len(sections)]
                class_name = f"{year}-{section}-{dept}"
                
                # Assign faculty (cycle through available faculty if needed)
                assigned_faculty = dept_faculty[i % len(dept_faculty)]
                
                class_obj = {
                    "_id": ObjectId(),
                    "year": year,
                    "section": section,
                    "className": class_name,
                    "academicYear": YEAR_TO_ACADEMIC_YEAR[year],
                    "department": dept,
                    "assignedFaculty": [assigned_faculty["_id"]],
                    "students": [],
                    "facultyAssigned": [assigned_faculty["_id"]],
                    "academicAdvisors": [advisor["_id"] for advisor in dept_advisors],
                    "createdAt": datetime.datetime.now(),
                    "updatedAt": datetime.datetime.now()
                }
                
                # Add this class to the faculty's classes
                assigned_faculty["classes"].append(class_obj["_id"])
                
                # Add this class to the advisors' classes
                for advisor in dept_advisors:
                    advisor["classes"].append(class_obj["_id"])
                
                classes[dept][year].append(class_obj)
    
    return classes

def create_students(departments, years, classes_data):
    """Create students for each class"""
    print("Creating Students...")
    students = []
    register_counter = {}
    
    # Initialize counters for each department
    for dept in departments:
        register_counter[dept] = 1
    
    for dept in departments:
        for year in years:
            dept_classes = classes_data[dept][year]
            
            for class_obj in dept_classes:
                # Create students for this class
                for i in range(STUDENTS_PER_CLASS):
                    # Generate register number with format YYYY[DEPT]XXX
                    # e.g., 2024CSE001 for first CSE student who registered in 2024
                    reg_year = YEAR_TO_REG[year]
                    reg_no = f"{reg_year}{dept}{register_counter[dept]:03d}"
                    
                    student = {
                        "_id": ObjectId(),
                        "name": fake.name(),
                        "profileImg": None,
                        "email": f"{reg_no.lower()}@student.college.edu",
                        "registerNo": reg_no,
                        "password": PASSWORD,
                        "rawPassword": RAW_PASSWORD,
                        "class": class_obj["_id"],
                        "year": year,
                        "course": f"BTech-{dept}",
                        "totalPoints": 0,
                        "eventsParticipated": [],
                        "isActive": True,
                        "isGraduated": False,
                        "isArchived": False,
                        "registrationYear": YEAR_TO_REG[year],
                        "program": "BTech",
                        "department": dept,
                        "currentClass": {
                            "year": year,
                            "section": class_obj["section"],
                            "ref": class_obj["_id"]
                        },
                        "classHistory": [{
                            "year": year,
                            "section": class_obj["section"],
                            "academicYear": YEAR_TO_ACADEMIC_YEAR[year],
                            "classRef": class_obj["_id"]
                        }],
                        "achievements": [],
                        "createdAt": datetime.datetime.now(),
                        "updatedAt": datetime.datetime.now()
                    }
                    
                    # Add student to this class's student list
                    class_obj["students"].append(student["_id"])
                    students.append(student)
                    
                    # Increment counter
                    register_counter[dept] += 1
    
    return students

def create_events(students, classes_data, faculty_data):
    """Create events for students with various statuses"""
    print("Creating Events...")
    events = []
    
    # Current date for reference
    now = datetime.datetime.now()
    one_year_ago = now - datetime.timedelta(days=365)
    
    # Create events with random distribution
    for student in tqdm(students):
        # Randomly decide how many events this student has (0-5)
        num_events = random.randint(0, 5)
        
        if num_events == 0:
            continue
        
        # Get the faculty for this student's class
        student_class_id = student["class"]
        student_dept = student["department"]
        student_year = student["year"]
        
        # Find the class object and its assigned faculty
        class_obj = None
        for cls in classes_data[student_dept][student_year]:
            if cls["_id"] == student_class_id:
                class_obj = cls
                break
        
        if not class_obj:
            continue  # Skip if class not found
            
        faculty_id = class_obj["assignedFaculty"][0]
        
        # Create events
        for _ in range(num_events):
            # Random date in the past year
            event_date = fake.date_time_between(
                start_date=one_year_ago,
                end_date=now
            )
            
            # Random event category
            category = random.choice(EVENT_CATEGORIES)
            
            # Default values for optional fields
            event_location = None
            other_college = None
            event_scope = None
            event_organizer = None
            participation_type = None
            price_money = None
            
            # Fill required fields based on category
            if category in ['Hackathon', 'Ideathon', 'Coding', 'Workshop', 'Conference']:
                event_location = random.choice(EVENT_LOCATIONS)
                if event_location == 'Outside College':
                    other_college = random.choice(COLLEGES)
                event_scope = random.choice(EVENT_SCOPES)
                event_organizer = random.choice(EVENT_ORGANIZERS)
                participation_type = random.choice(EVENT_TYPES)
                
            # Position and points
            position = random.choice(EVENT_POSITIONS)
            points = 0
            
            if position in ['First', 'Second', 'Third'] and event_scope:
                points = POINTS_CONFIG[position][event_scope]
                price_money = random.randint(1000, 50000)
            elif position == 'Participant' and event_scope:
                points = POINTS_CONFIG['Participant'][event_scope]
            elif event_scope:
                points = POINTS_CONFIG['None'][event_scope]
            
            # Status (randomly choose, with bias toward approval)
            status = random.choices(
                EVENT_STATUSES, 
                weights=[0.2, 0.7, 0.1],  # 20% pending, 70% approved, 10% rejected
                k=1
            )[0]
            
            # Only approved events contribute points
            if status != "Approved":
                points = 0
                
            # Create event object
            event = {
                "_id": ObjectId(),
                "eventName": f"{category} - {fake.bs()}",
                "description": fake.paragraph(),
                "date": event_date,
                "proofUrl": f"https://proof.example.com/{fake.uuid4()}",
                "pdfDocument": f"https://docs.example.com/{fake.uuid4()}.pdf",
                "category": category,
                "positionSecured": position,
                "status": status,
                "pointsEarned": points,
                "submittedBy": student["_id"],
                "approvedBy": faculty_id if status != "Pending" else None,
                "createdAt": event_date,
                "updatedAt": datetime.datetime.now()
            }
            
            # Add conditional fields
            if event_location:
                event["eventLocation"] = event_location
            if other_college:
                event["otherCollegeName"] = other_college
            if event_scope:
                event["eventScope"] = event_scope
            if event_organizer:
                event["eventOrganizer"] = event_organizer
            if participation_type:
                event["participationType"] = participation_type
            if price_money:
                event["priceMoney"] = price_money
                
            # Add event to list
            events.append(event)
            
            # Add event to student's participated events
            student["eventsParticipated"].append(event["_id"])
            
            # Add points to student's total if approved
            if status == "Approved":
                student["totalPoints"] += points
    
    return events

def seed_database():
    """Main function to seed the database"""
    start_time = time.time()
    
    # Clear existing data
    clear_database()
    
    # Define years for BTech program
    years = [1, 2, 3, 4]
    
    # Create HODs
    hods = create_hods()
    
    # Create academic advisors
    academic_advisors = create_academic_advisors(DEPARTMENTS, years)
    
    # Create faculty
    faculty = create_faculty(DEPARTMENTS, years, CLASSES_PER_YEAR_PER_DEPT)
    
    # Create classes
    classes = create_classes(DEPARTMENTS, years, faculty, academic_advisors, SECTIONS)
    
    # Create students
    students = create_students(DEPARTMENTS, years, classes)
    
    # Create events
    events = create_events(students, classes, faculty)
    
    # Insert data into database
    print("Inserting data into database...")
    
    # Insert HODs
    all_teachers = list(hods.values())
    
    # Insert academic advisors
    for dept in DEPARTMENTS:
        for year in years:
            all_teachers.extend(academic_advisors[dept][year])
    
    # Insert faculty
    for dept in DEPARTMENTS:
        for year in years:
            all_teachers.extend(faculty[dept][year])
    
    # Insert teachers
    db.teachers.insert_many(all_teachers)
    print(f"Inserted {len(all_teachers)} teachers")
    
    # Flatten classes
    all_classes = []
    for dept in DEPARTMENTS:
        for year in years:
            all_classes.extend(classes[dept][year])
    
    # Insert classes (fix: use dictionary-style access)
    db['classes'].insert_many(all_classes)
    print(f"Inserted {len(all_classes)} classes")
    
    # Insert students
    db.students.insert_many(students)
    print(f"Inserted {len(students)} students")
    
    # Insert events
    if events:
        db.events.insert_many(events)
        print(f"Inserted {len(events)} events")
    
    # Print summary
    print("\nDatabase seeding completed!")
    print(f"- {len(all_teachers)} teachers created")
    print(f"- {len(all_classes)} classes created")
    print(f"- {len(students)} students created")
    print(f"- {len(events)} events created")
    print(f"Total time: {time.time() - start_time:.2f} seconds")

if __name__ == "__main__":
    seed_database()