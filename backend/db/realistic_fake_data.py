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
db = client['leaderboard_db_full_fake']

# Configuration
PASSWORD = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt()).decode()
RAW_PASSWORD = "password123"
CURRENT_YEAR = 2024
ACADEMIC_YEAR = "2024-2025"

# Updated departments as requested
DEPARTMENTS = ['CTECH', 'CINTEL', 'DSBS', 'NWC']
SECTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2']  # At least 10 sections
STUDENTS_PER_CLASS = 25
CLASSES_PER_YEAR_PER_DEPT = 10  # 10 sections per department

# Event configuration - using all categories from the configuration
EVENT_CATEGORIES = ['Hackathon', 'Coding Competitions', 'Open Source', 'Research', 'Certifications', 'NCC_NSS_YRC', 'Sports', 'Workshops', 'Student Leadership', 'Social Work & Community Impact']
EVENT_STATUSES = ['Pending', 'Approved', 'Rejected']
EVENT_POSITIONS = ['Winner (1st)', 'Runner-up (2nd)', '3rd Place', 'Finalist', 'Participant']
EVENT_LEVELS = ['Intra-College', 'Inter-College', 'National', 'International']
EVENT_ORGANIZERS = ['Industry', 'Academic Institution']
EVENT_MODES = ['Solo Participation', 'Team Participation']
EVENT_LOCATIONS = ['Within College', 'Outside College']  # Keep for backward compatibility
EVENT_SCOPES = ['International', 'National', 'State']  # Keep for backward compatibility
EVENT_TYPES = ['Individual', 'Team']  # Keep for backward compatibility
COLLEGES = ['IIT Madras', 'NIT Trichy', 'VIT University', 'SRM University', 'Anna University']

# Updated points configuration based on the provided schema
POINTS_CONFIG = {
    'Hackathon': {
        'Level': {
            'Intra-College': 10,
            'Inter-College': 20,
            'National': 30,
            'International': 50
        },
        'Organizer': {
            'Industry': 5,
            'Academic Institution': 3
        },
        'Mode': {
            'Solo Participation': 5,
            'Team Participation': 3
        },
        'Outcome': {
            'Winner (1st)': 25,
            'Runner-up (2nd)': 20,
            '3rd Place': 15,
            'Finalist': 10,
            'Participant': 5
        }
    },
    'Coding Competitions': {
        'Platform': {
            'Top-tier': 10,
            'Unknown': 3
        },
        'Result Percentile': {
            'Top 1%': 25,
            'Top 5%': 20,
            'Top 10%': 10,
            'Participant': 5
        },
        'Region': {
            'International': 10,
            'National': 5
        }
    },
    'Open Source': {
        'Repo Forks': {
            '>1000': 30,
            '500–1000': 15,
            'Less than 500': 0
        },
        'PR Status': {
            'Merged': 10,
            'Pending Review': 0
        },
        'Type of Work': {
            'Feature': 15,
            'Bug Fix': 10,
            'Documentation': 5
        },
        'Lines of Code': {
            '0–100': 2,
            '100–500': 5,
            '500+': 10
        },
        'Contributor Badge': {
            'Hacktoberfest finisher': 20,
            'GSoC Contributor': 40,
            'None': 0
        }
    },
    'Research': {
        'Publisher': {
            'IEEE/Springer/Elsevier(Q1)': 25,
            'Other Scopus/SCI Journals (Q2)': 15,
            'Others': 5
        },
        'Authorship': {
            '1st Author': 20,
            '2nd Author': 15,
            'Co-author': 10
        },
        'Paper Type': {
            'Research': 10,
            'Review/Survey': 5
        },
        'Level': {
            'National': 5,
            'International': 10
        }
    },
    'Certifications': {
        'Provider': {
            'Stanford/MIT/AWS/Google/Top 500': 20,
            'NPTEL': 10,
            'Coursera/Udemy': 2
        },
        'Final Project Required': {
            'Yes': 10
        },
        'Certification Level': {
            'Beginner': 5,
            'Intermediate': 10,
            'Advanced': 15
        }
    },
    'NCC_NSS_YRC': {
        'Camps Attended': {
            'RDC/TSC/NSC/VSC': 15,
            'NIC/Others': 10,
            'CATC/ATC': 5
        },
        'Equivalent Rank': {
            'SUO': 15,
            'JUO': 12,
            'CSM': 10,
            'CQMS': 8,
            'Sgt': 6,
            'Cp': 4,
            'Lc': 2,
            'Cdt': 1
        },
        'Award': {
            'Best Cadet/Parade': 20
        },
        'Volunteer Hours': {
            '50+': 5,
            '100+': 10,
            '200+': 20
        }
    },
    'Sports': {
        'Level': {
            'College': 10,
            'Inter-College': 20,
            'State': 30,
            'National': 50,
            'International': 70
        },
        'Position': {
            'Winner': 30,
            'Runner-Up': 20,
            'Participant': 10
        },
        'Type': {
            'Individual Sport': 10,
            'Team Sport': 5
        }
    },
    'Workshops': {
        'Duration': {
            '1 day': 5,
            '3 day': 15,
            '>5 full day': 20
        },
        'Role': {
            'Attendee': 0,
            'Organizer': 10
        },
        'Industry organizer': {
            'Yes(Top 500 MNCs)': 10,
            'No': 0
        }
    },
    'Student Leadership': {
        'Role': {
            'Club President': 20,
            'Secretary/Core Team Heads': 10,
            'Member': 5
        },
        'Events Managed': {
            '<100 participants': 10,
            '100–500': 15,
            '500+': 20
        },
        'Organized Series': {
            'Webinars/Tech Talks/etc': 10
        }
    },
    'Social Work & Community Impact': {
        'Type of Activity': {
            'Plantation/Cleanup Drive': 10,
            'Education/NGO Teaching': 15,
            'Health/Disaster Relief': 20
        },
        'Hours Invested': {
            '20–50 hrs': 10,
            '50–100 hrs': 20,
            '100+ hrs': 30
        }
    }
}

# Year to registration year mapping - 2026 passout students are 4th year
YEAR_TO_REG = {
    1: 2025,  # 1st year students registered in 2025 (will passout in 2029)
    2: 2024,  # 2nd year students registered in 2024 (will passout in 2028)
    3: 2023,  # 3rd year students registered in 2023 (will passout in 2027)
    4: 2022,  # 4th year students registered in 2022 (will passout in 2026)
}

YEAR_TO_ACADEMIC_YEAR = {
    1: "2025-2029",  # 1st year academic span
    2: "2024-2028",  # 2nd year academic span
    3: "2023-2027",  # 3rd year academic span
    4: "2022-2026",  # 4th year academic span - 2026 passout
}

# Department mappings for new departments
DEPT_FULL_NAMES = {
    'CTECH': 'Computer Technology',
    'CINTEL': 'Computational Intelligence',
    'DSBS': 'Data Science and Business Systems',
    'NWC': 'Networks and Communications'
}

def clear_database():
    """Clear all collections before seeding"""
    print("Clearing existing database...")
    db.teachers.drop()
    db.students.drop()
    db['classes'].drop()
    db.events.drop()
    print("Database cleared successfully")

def create_chairperson():
    """Create one Chairperson for the institution"""
    print("Creating Chairperson...")
    
    chairperson = {
        "_id": ObjectId(),
        "name": f"Dr. {fake.name()}",
        "email": "chairperson@college.edu",
        "password": PASSWORD,
        "rawPassword": RAW_PASSWORD,
        "profileImg": None,
        "registerNo": "CHAIR-001",
        "role": "Chairperson",
        # No department for Chairperson - institution-wide access
        "classes": [],
        "isActive": True,
        "createdAt": datetime.datetime.now(),
        "updatedAt": datetime.datetime.now()
    }
    
    return chairperson

def create_associate_chairpersons():
    """Create 2 Associate Chairpersons, each managing 2 departments"""
    print("Creating Associate Chairpersons...")
    
    # Divide departments: First AC manages CTECH & CINTEL, Second AC manages DSBS & NWC
    department_assignments = [
        ['CTECH', 'CINTEL'],
        ['DSBS', 'NWC']
    ]
    
    associate_chairpersons = []
    
    for i, managed_depts in enumerate(department_assignments, 1):
        associate_chairperson = {
            "_id": ObjectId(),
            "name": f"Dr. {fake.name()}",
            "email": f"associate.chair{i}@college.edu",
            "password": PASSWORD,
            "rawPassword": RAW_PASSWORD,
            "profileImg": None,
            "registerNo": f"ACHAIR-{i:03d}",
            "role": "Associate Chairperson",
            "department": managed_depts[0],  # Primary department
            "managedDepartments": managed_depts,  # All managed departments
            "classes": [],
            "isActive": True,
            "createdAt": datetime.datetime.now(),
            "updatedAt": datetime.datetime.now()
        }
        associate_chairpersons.append(associate_chairperson)
    
    return associate_chairpersons

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
            # Create one academic advisor per year per department
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
            # Create faculty for each class (one faculty per class)
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
                # Use sections A1, A2, B1, B2 as requested
                section = sections[i % len(sections)]
                class_name = f"{year}-{section}-{dept}"
                
                # Assign faculty (one faculty per class)
                assigned_faculty = dept_faculty[i] if i < len(dept_faculty) else dept_faculty[0]
                
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

def create_realistic_events(students, classes_data, faculty_data):
    """Create realistic events where students apply and faculty approve/reject/leave pending"""
    print("Creating Events with realistic approval workflow...")
    events = []
    
    # Current date for reference
    now = datetime.datetime.now()
    six_months_ago = now - datetime.timedelta(days=180)
    
    # Create events with realistic patterns
    for student in tqdm(students, desc="Creating events for students"):
        # More active students have more events (realistic distribution)
        activity_level = random.choices(
            ['low', 'medium', 'high'], 
            weights=[0.4, 0.4, 0.2], 
            k=1
        )[0]
        
        if activity_level == 'low':
            num_events = random.randint(0, 2)
        elif activity_level == 'medium':
            num_events = random.randint(2, 5)
        else:  # high
            num_events = random.randint(5, 8)
        
        if num_events == 0:
            continue
        
        # Find faculty for this student
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
            continue
            
        # Get the assigned faculty for approval/rejection
        faculty_id = class_obj["assignedFaculty"][0]
        
        # Create events for this student
        for event_num in range(num_events):
            # Random submission date in the past 6 months
            submission_date = fake.date_time_between(
                start_date=six_months_ago,
                end_date=now
            )
            
            # Event date should be before or around submission date
            event_date = fake.date_time_between(
                start_date=six_months_ago,
                end_date=submission_date + datetime.timedelta(days=7)
            )
            
            # Random event category
            category = random.choice(EVENT_CATEGORIES)
            
            # Create realistic event names and calculate points based on category
            event_name, points, event_details, custom_answers = create_event_details(category)
            
            # Realistic status distribution based on faculty behavior
            status_weights = [0.25, 0.6, 0.15]  # Pending, Approved, Rejected
            
            # Better events (higher points) have higher approval rates
            if points > 50:
                status_weights = [0.1, 0.85, 0.05]  # Higher approval for high-value events
            elif points > 20:
                status_weights = [0.2, 0.7, 0.1]  # Good approval for medium events
            else:
                status_weights = [0.4, 0.4, 0.2]  # Lower approval for low-value events
                
            status = random.choices(EVENT_STATUSES, weights=status_weights, k=1)[0]
            
            # Only approved events contribute points
            final_points = points if status == "Approved" else 0
            
            # Create event object
            event = {
                "_id": ObjectId(),
                "eventName": event_name,
                "description": f"Participated in {event_name}",
                "date": event_date,
                "proofUrl": f"https://drive.google.com/proof/{fake.uuid4()}",
                "pdfDocument": f"certificate_{fake.uuid4()}.pdf",
                "category": category,
                "status": status,
                "pointsEarned": final_points,
                "submittedBy": student["_id"],
                "approvedBy": faculty_id if status in ["Approved", "Rejected"] else None,
                "submissionDate": submission_date,
                "department": student_dept,  # Add department for filtering
                "customAnswers": custom_answers,  # Add custom answers for validation
                "createdAt": submission_date,
                "updatedAt": datetime.datetime.now() if status != "Pending" else submission_date
            }
            
            # Add event-specific details
            for key, value in event_details.items():
                event[key] = value
                
            # Add event to list
            events.append(event)
            
            # Add event to student's participated events
            student["eventsParticipated"].append(event["_id"])
            
            # Add points to student's total if approved
            if status == "Approved":
                student["totalPoints"] += final_points
    
    return events

def create_event_details(category):
    """Create realistic event details and calculate points based on category"""
    points = 0
    event_details = {}
    custom_answers = {}
    
    if category == 'Hackathon':
        event_names = ['Smart India Hackathon', 'TechFest Hackathon', 'Google Solution Challenge', 'Microsoft Imagine Cup', 'AngelHack Global']
        event_name = random.choice(event_names)
        
        # Custom answers for Hackathon based on form field configuration
        level = random.choice(['Intra-College', 'Inter-College', 'National', 'International'])
        organizer_type = random.choice(['Industry', 'Academic Institution'])
        participation_mode = random.choice(['Solo Participation', 'Team Participation'])
        outcome = random.choice(['Winner (1st)', 'Runner-up (2nd)', '3rd Place', 'Finalist', 'Participant'])
        
        custom_answers = {
            'level': level,
            'organizer_type': organizer_type,
            'participation_mode': participation_mode,
            'outcome': outcome
        }
        
        points = (POINTS_CONFIG['Hackathon']['Level'][level] + 
                 POINTS_CONFIG['Hackathon']['Organizer'][organizer_type] + 
                 POINTS_CONFIG['Hackathon']['Mode'][participation_mode] + 
                 POINTS_CONFIG['Hackathon']['Outcome'][outcome])
        
        event_details = {
            'eventLevel': level,
            'organizer': organizer_type,
            'participationMode': participation_mode,
            'positionSecured': outcome
        }
        
    elif category == 'Coding Competitions':
        event_names = ['LeetCode Weekly Contest', 'CodeChef Long Challenge', 'HackerRank Competition', 'AtCoder Contest', 'Codeforces Round']
        event_name = random.choice(event_names)
        
        platform = random.choice(['Top-tier', 'Unknown'])
        percentile = random.choice(['Top 1%', 'Top 5%', 'Top 10%', 'Participant'])
        region = random.choice(['International', 'National'])
        
        custom_answers = {
            'platform': platform,
            'percentile': percentile,
            'region': region
        }
        
        points = (POINTS_CONFIG['Coding Competitions']['Platform'][platform] + 
                 POINTS_CONFIG['Coding Competitions']['Result Percentile'][percentile] + 
                 POINTS_CONFIG['Coding Competitions']['Region'][region])
        
        event_details = {
            'platform': platform,
            'resultPercentile': percentile,
            'region': region,
            'positionSecured': percentile
        }
        
    elif category == 'Open Source':
        event_names = ['Hacktoberfest Contribution', 'GSoC Project', 'Apache Foundation PR', 'Mozilla Contribution', 'Linux Kernel Patch']
        event_name = random.choice(event_names)
        
        repo_forks = random.choice(['>1000', '500–1000', 'Less than 500'])
        pr_status = random.choice(['Merged', 'Pending Review'])
        work_type = random.choice(['Feature', 'Bug Fix', 'Documentation'])
        lines_of_code = random.choice(['0–100', '100–500', '500+'])
        contributor_badge = random.choice(['Hacktoberfest finisher', 'GSoC Contributor', 'None'])
        
        custom_answers = {
            'repo_forks': repo_forks,
            'pr_status': pr_status,
            'type_of_work': work_type,
            'lines_of_code': lines_of_code,
            'contributor_badge': contributor_badge
        }
        
        points = (POINTS_CONFIG['Open Source']['Repo Forks'][repo_forks] + 
                 POINTS_CONFIG['Open Source']['PR Status'][pr_status] + 
                 POINTS_CONFIG['Open Source']['Type of Work'][work_type] + 
                 POINTS_CONFIG['Open Source']['Lines of Code'][lines_of_code] + 
                 POINTS_CONFIG['Open Source']['Contributor Badge'][contributor_badge])
        
        event_details = {
            'repoForks': repo_forks,
            'prStatus': pr_status,
            'workType': work_type,
            'linesOfCode': lines_of_code,
            'contributorBadge': contributor_badge,
            'positionSecured': 'Contributor'
        }
        
    elif category == 'Research':
        event_names = ['IEEE Conference Paper', 'Springer Journal Publication', 'ACM Conference', 'Elsevier Journal', 'Research Presentation']
        event_name = random.choice(event_names)
        
        publisher = random.choice(['IEEE/Springer/Elsevier(Q1)', 'Other Scopus/SCI Journals (Q2)', 'Others'])
        authorship = random.choice(['1st Author', '2nd Author', 'Co-author'])
        paper_type = random.choice(['Research', 'Review/Survey'])
        event_type = random.choice(['Conference Presentation', 'Poster Presentation'])
        conference_level = random.choice(['International', 'National'])
        
        custom_answers = {
            'publisher': publisher,
            'authorship': authorship,
            'paper_type': paper_type,
            'event_type': event_type,
            'conference_level': conference_level
        }
        
        points = (POINTS_CONFIG['Research']['Publisher'][publisher] + 
                 POINTS_CONFIG['Research']['Authorship'][authorship] + 
                 POINTS_CONFIG['Research']['Paper Type'][paper_type] + 
                 POINTS_CONFIG['Research']['Level'][conference_level])
        
        event_details = {
            'publisher': publisher,
            'authorship': authorship,
            'paperType': paper_type,
            'eventType': event_type,
            'eventLevel': conference_level,
            'positionSecured': authorship
        }
        
    elif category == 'Certifications':
        event_names = ['AWS Cloud Practitioner', 'Google Cloud Professional', 'Microsoft Azure Fundamentals', 'NPTEL Course', 'Coursera Specialization']
        event_name = random.choice(event_names)
        
        provider = random.choice(['Stanford/MIT/AWS/Google/Top 500', 'NPTEL', 'Coursera/Udemy'])
        final_project = random.choice(['Yes', 'No'])
        cert_level = random.choice(['Beginner', 'Intermediate', 'Advanced'])
        
        custom_answers = {
            'provider': provider,
            'final_project': final_project,
            'level': cert_level
        }
        
        points = (POINTS_CONFIG['Certifications']['Provider'][provider] + 
                 POINTS_CONFIG['Certifications']['Certification Level'][cert_level])
        
        if final_project == 'Yes':
            points += POINTS_CONFIG['Certifications']['Final Project Required']['Yes']
        
        event_details = {
            'provider': provider,
            'finalProject': final_project,
            'certificationLevel': cert_level,
            'positionSecured': 'Certified'
        }
        
    elif category == 'NCC_NSS_YRC':
        event_names = ['NCC Republic Day Camp', 'NSS Special Camp', 'YRC Blood Donation Drive', 'NCC Adventure Training', 'NSS Community Service']
        event_name = random.choice(event_names)
        
        camp = random.choice(['RDC/TSC/NSC/VSC', 'NIC/Others', 'CATC/ATC'])
        rank = random.choice(['SUO', 'JUO', 'CSM', 'CQMS', 'Sgt', 'Cp', 'Lc', 'Cdt'])
        award = random.choice(['Best Cadet/Parade', 'None'])
        volunteer_hours = random.choice(['50+', '100+', '200+'])
        
        custom_answers = {
            'camps_attended': camp,
            'equivalent_rank': rank,
            'award': award,
            'volunteer_hours': volunteer_hours
        }
        
        points = (POINTS_CONFIG['NCC_NSS_YRC']['Camps Attended'][camp] + 
                 POINTS_CONFIG['NCC_NSS_YRC']['Equivalent Rank'][rank] + 
                 POINTS_CONFIG['NCC_NSS_YRC']['Volunteer Hours'][volunteer_hours])
        
        if award != 'None':
            points += POINTS_CONFIG['NCC_NSS_YRC']['Award'][award]
        
        event_details = {
            'campAttended': camp,
            'rank': rank,
            'award': award,
            'volunteerHours': volunteer_hours,
            'positionSecured': rank
        }
        
    elif category == 'Sports':
        event_names = ['Inter-College Cricket Tournament', 'State Basketball Championship', 'National Swimming Competition', 'Athletic Meet', 'Table Tennis Tournament']
        event_name = random.choice(event_names)
        
        level = random.choice(['College', 'Inter-College', 'State', 'National', 'International'])
        position = random.choice(['Winner', 'Runner-Up', 'Participant'])
        sport_type = random.choice(['Individual Sport', 'Team Sport'])
        
        custom_answers = {
            'level': level,
            'position': position,
            'type': sport_type
        }
        
        points = (POINTS_CONFIG['Sports']['Level'][level] + 
                 POINTS_CONFIG['Sports']['Position'][position] + 
                 POINTS_CONFIG['Sports']['Type'][sport_type])
        
        event_details = {
            'eventLevel': level,
            'positionSecured': position,
            'sportType': sport_type
        }
        
    elif category == 'Workshops':
        event_names = ['AI/ML Workshop by Google', 'Cybersecurity Workshop', 'Data Science Bootcamp', 'Web Development Workshop', 'Cloud Computing Training']
        event_name = random.choice(event_names)
        
        duration = random.choice(['1 day', '3 day', '>5 full day'])
        role = random.choice(['Attendee', 'Organizer'])
        industry_organizer = random.choice(['Yes(Top 500 MNCs)', 'No'])
        
        custom_answers = {
            'duration': duration,
            'role': role,
            'industry_organizer': industry_organizer
        }
        
        points = (POINTS_CONFIG['Workshops']['Duration'][duration] + 
                 POINTS_CONFIG['Workshops']['Role'][role] + 
                 POINTS_CONFIG['Workshops']['Industry organizer'][industry_organizer])
        
        event_details = {
            'duration': duration,
            'role': role,
            'industryOrganizer': industry_organizer,
            'positionSecured': role
        }
        
    elif category == 'Student Leadership':
        event_names = ['Technical Club President', 'Event Organization', 'Webinar Series', 'Student Council Member', 'Tech Talk Series']
        event_name = random.choice(event_names)
        
        role = random.choice(['Club President', 'Secretary/Core Team Heads', 'Member'])
        events_managed = random.choice(['<100 participants', '100–500', '500+'])
        organized_series = random.choice(['Webinars/Tech Talks/etc', 'None'])
        
        custom_answers = {
            'role': role,
            'events_managed': events_managed,
            'organized_series': organized_series
        }
        
        points = (POINTS_CONFIG['Student Leadership']['Role'][role] + 
                 POINTS_CONFIG['Student Leadership']['Events Managed'][events_managed])
        
        if organized_series != 'None':
            points += POINTS_CONFIG['Student Leadership']['Organized Series'][organized_series]
        
        event_details = {
            'leadershipRole': role,
            'eventsManaged': events_managed,
            'organizedSeries': organized_series,
            'positionSecured': role
        }
        
    elif category == 'Social Work & Community Impact':
        event_names = ['Tree Plantation Drive', 'NGO Teaching Program', 'Disaster Relief Work', 'Community Health Camp', 'Educational Outreach']
        event_name = random.choice(event_names)
        
        activity_type = random.choice(['Plantation/Cleanup Drive', 'Education/NGO Teaching', 'Health/Disaster Relief'])
        hours_invested = random.choice(['20–50 hrs', '50–100 hrs', '100+ hrs'])
        
        custom_answers = {
            'activity_type': activity_type,
            'hours_invested': hours_invested
        }
        
        points = (POINTS_CONFIG['Social Work & Community Impact']['Type of Activity'][activity_type] + 
                 POINTS_CONFIG['Social Work & Community Impact']['Hours Invested'][hours_invested])
        
        event_details = {
            'activityType': activity_type,
            'hoursInvested': hours_invested,
            'positionSecured': 'Volunteer'
        }
    
    return event_name, points, event_details, custom_answers

def seed_database():
    """Main function to seed the database"""
    start_time = time.time()
    
    # Clear existing data
    clear_database()
    
    # Define years for BTech program
    years = [1, 2, 3, 4]
    
    # Create leadership roles
    chairperson = create_chairperson()
    associate_chairpersons = create_associate_chairpersons()
    
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
    
    # Create realistic events
    events = create_realistic_events(students, classes, faculty)
    
    # Insert data into database
    print("Inserting data into database...")
    
    # Prepare all teachers
    all_teachers = [chairperson] + associate_chairpersons + list(hods.values())
    
    # Add academic advisors
    for dept in DEPARTMENTS:
        for year in years:
            all_teachers.extend(academic_advisors[dept][year])
    
    # Add faculty
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
    
    # Insert classes
    db['classes'].insert_many(all_classes)
    print(f"Inserted {len(all_classes)} classes")
    
    # Insert students
    db.students.insert_many(students)
    print(f"Inserted {len(students)} students")
    
    # Insert events
    if events:
        db.events.insert_many(events)
        print(f"Inserted {len(events)} events")
    
    # Print detailed summary
    print("\n" + "="*60)
    print("DATABASE SEEDING COMPLETED SUCCESSFULLY!")
    print("="*60)
    
    print(f"\n📊 SUMMARY:")
    print(f"   • Total Teachers: {len(all_teachers)}")
    print(f"     - 1 Chairperson")
    print(f"     - 2 Associate Chairpersons")
    print(f"     - {len(DEPARTMENTS)} HODs (one per department)")
    print(f"     - {len(DEPARTMENTS) * len(years)} Academic Advisors")
    print(f"     - {len(DEPARTMENTS) * len(years) * CLASSES_PER_YEAR_PER_DEPT} Faculty")
    
    print(f"\n   • Departments: {', '.join(DEPARTMENTS)}")
    print(f"   • Classes per department per year: {CLASSES_PER_YEAR_PER_DEPT}")
    print(f"   • Students per class: {STUDENTS_PER_CLASS}")
    print(f"   • Total Classes: {len(all_classes)}")
    print(f"   • Total Students: {len(students)}")
    print(f"   • Total Events: {len(events)}")
    
    # Event status breakdown
    if events:
        pending = sum(1 for e in events if e['status'] == 'Pending')
        approved = sum(1 for e in events if e['status'] == 'Approved')
        rejected = sum(1 for e in events if e['status'] == 'Rejected')
        
        print(f"\n   • Event Status Distribution:")
        print(f"     - Pending: {pending} ({pending/len(events)*100:.1f}%)")
        print(f"     - Approved: {approved} ({approved/len(events)*100:.1f}%)")
        print(f"     - Rejected: {rejected} ({rejected/len(events)*100:.1f}%)")
    
    print(f"\n🔐 Login Credentials:")
    print(f"   • Password for all users: password123")
    print(f"   • Chairperson: chairperson@college.edu")
    print(f"   • Associate Chairperson 1: associate.chair1@college.edu")
    print(f"   • Associate Chairperson 2: associate.chair2@college.edu")
    
    print(f"\n⏱️  Total execution time: {time.time() - start_time:.2f} seconds")
    print("="*60)

if __name__ == "__main__":
    seed_database()
