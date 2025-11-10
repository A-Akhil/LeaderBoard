#!/usr/bin/env python3
"""Generate seeded teacher roster and class assignment CSVs."""
from __future__ import annotations

import csv
import itertools
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
CLASSES_CSV = BASE_DIR / "classes.csv"
TEACHERS_CSV = BASE_DIR / "teachers.csv"
FACULTY_ASSIGN_CSV = BASE_DIR / "faculty_class_assignments.csv"
ADVISOR_ASSIGN_CSV = BASE_DIR / "advisor_class_assignments.csv"

DEPARTMENTS = [
    ("CINTEL", "Centre for Intelligent Systems"),
    ("CTECH", "College of Technology"),
    ("NWC", "Networks and Cybersecurity"),
    ("DSBS", "Data Science and Business Systems"),
]

FACULTY_PER_DEPARTMENT = 12
ADVISORS_PER_DEPARTMENT = 6
DEFAULT_PASSWORD = "Password@123"


def build_teacher_records():
    register_counter = itertools.count(1001)
    teacher_rows = []
    faculty_by_department = {}
    advisors_by_department = {}

    for dept_code, dept_title in DEPARTMENTS:
        # Head of Department
        hod_reg = f"EMP{next(register_counter):05d}"
        teacher_rows.append(
            {
                "name": f"{dept_title} HOD",
                "email": f"hod.{dept_code.lower()}@university.edu",
                "registerNo": hod_reg,
                "department": dept_code,
                "role": "HOD",
                "password": DEFAULT_PASSWORD,
                "managedDepartments": "",
            }
        )

        # Academic Advisors
        advisor_regs = []
        for idx in range(1, ADVISORS_PER_DEPARTMENT + 1):
            reg_no = f"EMP{next(register_counter):05d}"
            advisor_regs.append(reg_no)
            teacher_rows.append(
                {
                    "name": f"{dept_title} Academic Advisor {idx:02d}",
                    "email": f"advisor{idx:02d}.{dept_code.lower()}@university.edu",
                    "registerNo": reg_no,
                    "department": dept_code,
                    "role": "Academic Advisor",
                    "password": DEFAULT_PASSWORD,
                    "managedDepartments": "",
                }
            )
        advisors_by_department[dept_code] = advisor_regs

        # Faculty members
        faculty_regs = []
        for idx in range(1, FACULTY_PER_DEPARTMENT + 1):
            reg_no = f"EMP{next(register_counter):05d}"
            faculty_regs.append(reg_no)
            teacher_rows.append(
                {
                    "name": f"{dept_title} Faculty {idx:02d}",
                    "email": f"faculty{idx:02d}.{dept_code.lower()}@university.edu",
                    "registerNo": reg_no,
                    "department": dept_code,
                    "role": "Faculty",
                    "password": DEFAULT_PASSWORD,
                    "managedDepartments": "",
                }
            )
        faculty_by_department[dept_code] = faculty_regs

    # Associate Chairpersons (cover first two departments and remaining two)
    associate_one_reg = f"EMP{next(register_counter):05d}"
    teacher_rows.append(
        {
            "name": "Associate Chairperson - Applied Sciences",
            "email": "associate1@university.edu",
            "registerNo": associate_one_reg,
            "department": "CINTEL",
            "role": "Associate Chairperson",
            "password": DEFAULT_PASSWORD,
            "managedDepartments": "CINTEL,CTECH",
        }
    )

    associate_two_reg = f"EMP{next(register_counter):05d}"
    teacher_rows.append(
        {
            "name": "Associate Chairperson - Emerging Technologies",
            "email": "associate2@university.edu",
            "registerNo": associate_two_reg,
            "department": "NWC",
            "role": "Associate Chairperson",
            "password": DEFAULT_PASSWORD,
            "managedDepartments": "NWC,DSBS",
        }
    )

    # Institution Chairperson (department intentionally blank)
    chair_reg = f"EMP{next(register_counter):05d}"
    teacher_rows.append(
        {
            "name": "Institution Chairperson",
            "email": "chairperson@university.edu",
            "registerNo": chair_reg,
            "department": "",
            "role": "Chairperson",
            "password": DEFAULT_PASSWORD,
            "managedDepartments": "",
        }
    )

    return teacher_rows, faculty_by_department, advisors_by_department


def load_classes_by_department():
    if not CLASSES_CSV.exists():
        raise FileNotFoundError(f"Missing classes CSV at {CLASSES_CSV}")

    classes_by_dept = {dept: [] for dept, _ in DEPARTMENTS}
    with CLASSES_CSV.open(newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            dept = row["department"].strip().upper()
            class_name = row["className"].strip()
            if dept in classes_by_dept:
                classes_by_dept[dept].append(class_name)
    for dept in classes_by_dept:
        classes_by_dept[dept].sort()
    return classes_by_dept


def write_csv(path: Path, fieldnames, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main():
    teacher_rows, faculty_by_department, advisors_by_department = build_teacher_records()
    classes_by_dept = load_classes_by_department()

    # Write teacher roster
    write_csv(
        TEACHERS_CSV,
        [
            "name",
            "email",
            "registerNo",
            "department",
            "role",
            "password",
            "managedDepartments",
        ],
        teacher_rows,
    )

    # Prepare faculty assignments
    faculty_assignments = []
    for dept_code, _ in DEPARTMENTS:
        class_names = classes_by_dept.get(dept_code, [])
        faculty_pool = faculty_by_department.get(dept_code, [])
        if not class_names or not faculty_pool:
            continue
        for idx, class_name in enumerate(class_names):
            faculty_reg = faculty_pool[idx % len(faculty_pool)]
            faculty_assignments.append(
                {
                    "facultyRegNo": faculty_reg,
                    "className": class_name,
                }
            )

    write_csv(
        FACULTY_ASSIGN_CSV,
        ["facultyRegNo", "className"],
        faculty_assignments,
    )

    # Prepare academic advisor assignments
    advisor_assignments = []
    for dept_code, _ in DEPARTMENTS:
        class_names = classes_by_dept.get(dept_code, [])
        advisor_pool = advisors_by_department.get(dept_code, [])
        if not class_names or not advisor_pool:
            continue
        for idx, class_name in enumerate(class_names):
            advisor_reg = advisor_pool[idx % len(advisor_pool)]
            advisor_assignments.append(
                {
                    "advisorRegNo": advisor_reg,
                    "className": class_name,
                }
            )

    write_csv(
        ADVISOR_ASSIGN_CSV,
        ["advisorRegNo", "className"],
        advisor_assignments,
    )

    print(
        "Generated teachers, faculty assignments, and advisor assignments in",
        BASE_DIR,
    )


if __name__ == "__main__":
    main()
