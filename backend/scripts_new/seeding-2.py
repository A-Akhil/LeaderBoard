import csv
import itertools
from pathlib import Path

output_dir = Path('docs/generated_datasets')
output_dir.mkdir(parents=True, exist_ok=True)

DEPARTMENTS = [
    {
        'code': 'CINTEL',
        'name': 'Department of Computational Intelligence',
        'courses': [
            'B.Tech-CINTEL-Artificial Intelligence',
            'B.Tech-CINTEL-Computer Science And Engineering with Specialization in Artificial Intelligence and Machine Learning',
            'B.Tech-CINTEL-Computer Science And Engineering with Specialization in Software Engineering',
            'M.Tech-CINTEL-(Integrated) Artificial Intelligence',
            'M.Tech-CINTEL-(Integrated) Computer Science And Engineering with Specialization in Cognitive Computing',
            'M.Tech-CINTEL-Artificial Intelligence (In collaboration with Great Learning)'
        ]
    },
    {
        'code': 'CTECH',
        'name': 'Department of Computing Technologies',
        'courses': [
            'B.Tech-CTECH-Mathematics and Computing',
            'B.Tech-CTECH-Computer Science and Engineering',
            'M.Tech-CTECH-(Integrated) Computer Science and Engineering',
            'M.Tech-CTECH-Computer Science and Engineering (In collaboration with Great Learning)',
            'M.Tech-CTECH-Computer science and Engineering with Specialization in Full Stack (In collaboration with Great Learning)',
            'M.Tech-CTECH-Financial Technologies'
        ]
    },
    {
        'code': 'NWC',
        'name': 'Department of Networking And Communications',
        'courses': [
            'B.Tech-NWC-Computer Science and Engineering (DevSecOps)',
            'B.Tech-NWC-Computer Science And Engineering with Specialization in Cloud Computing',
            'B.Tech-NWC-Computer Science And Engineering with Specialization in Computer Networking',
            'B.Tech-NWC-Computer Science And Engineering with Specialization in Cyber Security',
            'B.Tech-NWC-Computer Science And Engineering with Specialization in Information Technology',
            'B.Tech-NWC-Computer Science And Engineering with Specialization in Internet of Things',
            'M.Tech-NWC-(Integrated) Computer Science And Engineering with Specialization in Cyber Security and Digital Forensics',
            'M.Tech-NWC-Cloud Computing',
            'M.Tech-NWC-Cloud Computing and Block Chain (In collaboration with Great Learning)',
            'M.Tech-NWC-Cyber Security (In collaboration with Great Learning)',
            'M.Tech-NWC-Information Security and Cyber Forensics',
            'M.Tech-NWC-Internet of Things'
        ]
    },
    {
        'code': 'DSBS',
        'name': 'Department of Data Science And Business Systems',
        'courses': [
            'B.Tech-DSBS-Computer Science and Business Systems (In Collaboration with TCS)',
            'B.Tech-DSBS-Computer Science And Engineering (Data Science)',
            'B.Tech-DSBS-Computer Science And Engineering with Specialization in Big Data Analytics',
            'B.Tech-DSBS-Computer Science And Engineering with Specialization in Blockchain Technology',
            'B.Tech-DSBS-Computer Science And Engineering with Specialization in Gaming Technology',
            'M.Tech-DSBS-(Integrated) Computer Science And Engineering with Specialization in Data Science',
            'M.Tech-DSBS-Big Data Analytics (In collaboration with Great Learning)',
            'M.Tech-DSBS-Data Engineering (In collaboration with Great Learning)',
            'M.Tech-DSBS-Data Science (In collaboration with Great Learning)'
        ]
    }
]

SECTIONS_PER_DEPARTMENT = 20
STUDENTS_PER_CLASS = 6
YEARS = [1, 2, 3, 4]
ACADEMIC_YEAR_START_BASE = 2028

FIRST_NAMES = [
    'Aarav', 'Isha', 'Karan', 'Mira', 'Nikhil', 'Priya', 'Rohan', 'Sana', 'Tanvi', 'Vihaan',
    'Esha', 'Ira', 'Kavya', 'Laksh', 'Meera', 'Omkar', 'Parth', 'Riya', 'Sarthak', 'Tara',
    'Advait', 'Bhavya', 'Charvi', 'Dev', 'Gauri', 'Hridaan', 'Ishanvi', 'Jiya', 'Krish', 'Lavanya',
    'Mudit', 'Naira', 'Ojas', 'Pranav', 'Rudra', 'Samaira', 'Tejas', 'Ved', 'Yash', 'Zara'
]
LAST_NAMES = [
    'Acharya', 'Basu', 'Chandra', 'Deshpande', 'Engineer', 'Fernandes', 'Ganguly', 'Hegde', 'Iyengar', 'Jain',
    'Kapoor', 'Lal', 'Mehta', 'Nair', 'Ojha', 'Patel', 'Qureshi', 'Raman', 'Singh', 'Trivedi',
    'Upadhyay', 'Varma', 'Walia', 'Xavier', 'Yadav', 'Zaidi', 'Bhatt', 'Chopra', 'Dubey', 'Gokhale',
    'Joshi', 'Kulkarni', 'Menon', 'Pandey', 'Rao', 'Saxena', 'Talwar', 'Verma', 'Wagh', 'Zaveri'
]

name_cycle = itertools.cycle(itertools.product(FIRST_NAMES, LAST_NAMES))


def section_label_generator():
    n = 0
    while True:
        q = n
        label = ''
        while True:
            label = chr(ord('A') + q % 26) + label
            q = q // 26 - 1
            if q < 0:
                break
        yield label
        n += 1


def next_sections(label_iter, section_count):
    sections = []
    while len(sections) < section_count:
        label = next(label_iter)
        sections.extend([f"{label}1", f"{label}2"])
    return sections[:section_count]


classes = []
students = []
assignments = []

label_iter = section_label_generator()

for dept_index, dept in enumerate(DEPARTMENTS, start=1):
    sections = next_sections(label_iter, SECTIONS_PER_DEPARTMENT)
    course_cycle = itertools.cycle(dept['courses'])
    student_serial = 1

    for year in YEARS:
        base_year = ACADEMIC_YEAR_START_BASE - year
        academic_year = f"{base_year}-{base_year + 1}"

        for section in sections:
            class_record = {
                'year': year,
                'section': section,
                'academicYear': academic_year,
                'department': dept['code'],
                'className': f"{year}-{section}-{dept['code']}"
            }
            classes.append(class_record)

            for _ in range(STUDENTS_PER_CLASS):
                first, last = next(name_cycle)
                full_name = f"{first} {last}"
                registration_year = 2025 - year
                register_no = f"RA{registration_year}{dept['code'][:3].upper()}{student_serial:04d}"
                email = f"{first.lower()}.{last.lower()}{dept_index}{student_serial:04d}@student.edu"
                password = f"Password@{registration_year}"
                course = next(course_cycle)

                student_record = {
                    'name': full_name,
                    'email': email,
                    'password': password,
                    'registerNo': register_no,
                    'course': course,
                    'registrationYear': registration_year,
                    'year': year,
                    'department': dept['code']
                }
                students.append(student_record)
                assignments.append({
                    'studentRegNo': register_no,
                    'className': class_record['className']
                })
                student_serial += 1

classes_path = output_dir / 'classes.csv'
students_path = output_dir / 'students.csv'
assignments_path = output_dir / 'student_class_assignments.csv'

with classes_path.open('w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['year', 'section', 'academicYear', 'department', 'className'])
    writer.writeheader()
    writer.writerows(classes)

with students_path.open('w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['name', 'email', 'password', 'registerNo', 'course', 'registrationYear', 'year', 'department'])
    writer.writeheader()
    writer.writerows(students)

with assignments_path.open('w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['studentRegNo', 'className'])
    writer.writeheader()
    writer.writerows(assignments)

for dept in DEPARTMENTS:
    dept_classes_path = output_dir / f"classes_{dept['code'].lower()}.csv"
    dept_students_path = output_dir / f"students_{dept['code'].lower()}.csv"
    dept_assignments_path = output_dir / f"student_class_assignments_{dept['code'].lower()}.csv"

    dept_classes = [c for c in classes if c['department'] == dept['code']]
    dept_students = [s for s in students if s['department'] == dept['code']]
    dept_assignments = [a for a in assignments if a['className'].endswith(f"-{dept['code']}")]

    with dept_classes_path.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['year', 'section', 'academicYear', 'department', 'className'])
        writer.writeheader()
        writer.writerows(dept_classes)

    with dept_students_path.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'email', 'password', 'registerNo', 'course', 'registrationYear', 'year', 'department'])
        writer.writeheader()
        writer.writerows(dept_students)

    with dept_assignments_path.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['studentRegNo', 'className'])
        writer.writeheader()
        writer.writerows(dept_assignments)

print(f"Generated {len(classes)} classes and {len(students)} students across departments.")