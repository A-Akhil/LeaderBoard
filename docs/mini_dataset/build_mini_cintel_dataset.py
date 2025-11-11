#!/usr/bin/env python3
"""Generate miniature CINTEL-only datasets for bulk import testing.

This script creates a compact set of CSV files covering:
- Classes (5 per year across years 1-4)
- Students (20 per class)
- Teachers (faculty per class + academic advisors per year)
- Faculty-to-class assignments
- Academic-advisor-to-class assignments
- Student-to-class assignments

The output aligns with the existing bulk upload templates so it can be
consumed directly by the admin dashboard workflows.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

BASE_DIR = Path(__file__).resolve().parent
DEPARTMENT_CODE = "CINTEL"
COURSE_CODES: Sequence[str] = (
    "BTECH-CINTEL-AI",
    "BTECH-CINTEL-CSE-AIML",
    "BTECH-CINTEL-CSE-SOFT-ENGI",
)
STUDENTS_PER_CLASS = 20
CLASSES_PER_YEAR = 5
SECTIONS = ["A", "B", "C", "D", "E"]
DEFAULT_PASSWORD = "Password@123"

ACADEMIC_YEAR_BY_YEAR: Dict[int, str] = {
    4: "2022-2026",
    3: "2023-2027",
    2: "2024-2028",
    1: "2025-2029",
}
REGISTRATION_YEAR_BY_YEAR: Dict[int, int] = {
    4: 2022,
    3: 2023,
    2: 2024,
    1: 2025,
}

FIRST_NAMES: Sequence[str] = (
    "Aarav",
    "Diya",
    "Ishan",
    "Myra",
    "Vihaan",
    "Advika",
    "Kabir",
    "Saanvi",
    "Reyansh",
    "Anaya",
    "Arjun",
    "Ira",
    "Rohan",
    "Mira",
    "Dev",
    "Kiara",
    "Neel",
    "Tara",
    "Ayaan",
    "Zara",
)
LAST_NAMES: Sequence[str] = (
    "Acharya",
    "Basu",
    "Chandra",
    "Deshpande",
    "Eswaran",
    "Fernandes",
    "Gokhale",
    "Hariharan",
    "Iyengar",
    "Jain",
    "Kulkarni",
    "Lal",
    "Mehta",
    "Nair",
    "Ojha",
    "Pai",
    "Quereshi",
    "Reddy",
    "Sengupta",
    "Trivedi",
)


@dataclass
class ClassRecord:
    year: int
    section: str
    academic_year: str
    department: str
    course_code: str

    @property
    def class_name(self) -> str:
        return f"{self.year}-{self.section}-{self.department}"


@dataclass
class StudentRecord:
    name: str
    email: str
    password: str
    register_no: str
    course: str
    registration_year: int
    year: int
    department: str


@dataclass
class TeacherRecord:
    name: str
    email: str
    register_no: str
    department: str
    role: str
    password: str
    managed_departments: str = ""


def _ensure_output_dir() -> Path:
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    return BASE_DIR


def _generate_classes() -> List[ClassRecord]:
    classes: List[ClassRecord] = []
    for year in sorted(ACADEMIC_YEAR_BY_YEAR):
        academic_year = ACADEMIC_YEAR_BY_YEAR[year]
        for index in range(CLASSES_PER_YEAR):
            section_prefix = SECTIONS[index % len(SECTIONS)]
            section = f"{section_prefix}{year}"
            course_code = COURSE_CODES[(year - 1 + index) % len(COURSE_CODES)]
            classes.append(
                ClassRecord(
                    year=year,
                    section=section,
                    academic_year=academic_year,
                    department=DEPARTMENT_CODE,
                    course_code=course_code,
                )
            )
    return classes


def _student_identity(global_index: int) -> Tuple[str, str]:
    first = FIRST_NAMES[global_index % len(FIRST_NAMES)]
    last = LAST_NAMES[(global_index // len(FIRST_NAMES)) % len(LAST_NAMES)]
    full_name = f"{first} {last}"
    email_local = f"{first}.{last}{global_index + 1:04d}".replace(" ", "").lower()
    email = f"{email_local}@student.edu"
    return full_name, email


def _generate_students(
    classes: Sequence[ClassRecord],
) -> Tuple[List[StudentRecord], List[Tuple[str, str]]]:
    students: List[StudentRecord] = []
    assignments: List[Tuple[str, str]] = []

    per_year_counters: Dict[int, int] = {year: 0 for year in ACADEMIC_YEAR_BY_YEAR}
    global_index = 0

    for class_record in classes:
        per_year_counters[class_record.year] += 1
        for student_idx in range(STUDENTS_PER_CLASS):
            name, email = _student_identity(global_index)
            global_index += 1

            per_year_sequence = (per_year_counters[class_record.year] - 1) * STUDENTS_PER_CLASS + (student_idx + 1)
            registration_year = REGISTRATION_YEAR_BY_YEAR[class_record.year]
            register_no = f"RA{registration_year}{DEPARTMENT_CODE[:3]}{per_year_sequence:04d}"

            student = StudentRecord(
                name=name,
                email=email,
                password=DEFAULT_PASSWORD,
                register_no=register_no,
                course=class_record.course_code,
                registration_year=registration_year,
                year=class_record.year,
                department=class_record.department,
            )
            students.append(student)
            assignments.append((register_no, class_record.class_name))
        # reset class counter increment handled at start of loop for readability
    return students, assignments


def _generate_faculty_teachers(
    classes: Sequence[ClassRecord],
) -> Tuple[List[TeacherRecord], List[Tuple[str, str]]]:
    teachers: List[TeacherRecord] = []
    assignments: List[Tuple[str, str]] = []

    for idx, class_record in enumerate(classes, start=1):
        name = f"CINTEL Faculty {idx:02d}"
        email = f"faculty{idx:02d}.{DEPARTMENT_CODE.lower()}@university.edu"
        register_no = f"EMP98{idx:03d}"
        teacher = TeacherRecord(
            name=name,
            email=email,
            register_no=register_no,
            department=class_record.department,
            role="Faculty",
            password=DEFAULT_PASSWORD,
        )
        teachers.append(teacher)
        assignments.append((register_no, class_record.class_name))

    return teachers, assignments


def _generate_academic_advisors(
    classes: Sequence[ClassRecord],
) -> Tuple[List[TeacherRecord], List[Tuple[str, str]]]:
    advisors: List[TeacherRecord] = []
    assignments: List[Tuple[str, str]] = []

    classes_by_year: Dict[int, List[ClassRecord]] = {}
    for class_record in classes:
        classes_by_year.setdefault(class_record.year, []).append(class_record)

    for year in sorted(classes_by_year):
        for idx in range(2):  # two advisors per year
            adviser_index = len(advisors) + 1
            name = f"CINTEL Academic Advisor Y{year} - {idx + 1:02d}"
            email = f"advisorY{year}{idx + 1:02d}.{DEPARTMENT_CODE.lower()}@university.edu"
            register_no = f"EMP97{year}{idx + 1:02d}"
            advisor = TeacherRecord(
                name=name,
                email=email,
                register_no=register_no,
                department=DEPARTMENT_CODE,
                role="Academic Advisor",
                password=DEFAULT_PASSWORD,
            )
            advisors.append(advisor)

            for class_record in classes_by_year[year]:
                assignments.append((register_no, class_record.class_name))

    return advisors, assignments


def _write_csv(path: Path, fieldnames: Sequence[str], rows: Iterable[Dict[str, object]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def build_dataset() -> None:
    output_dir = _ensure_output_dir()

    classes = _generate_classes()
    students, student_assignments = _generate_students(classes)
    faculty_teachers, faculty_assignments = _generate_faculty_teachers(classes)
    academic_advisors, advisor_assignments = _generate_academic_advisors(classes)

    teacher_records = faculty_teachers + academic_advisors

    class_rows = [
        {
            "year": record.year,
            "section": record.section,
            "academicYear": record.academic_year,
            "department": record.department,
            "className": record.class_name,
        }
        for record in classes
    ]
    _write_csv(
        output_dir / "classes_cintel_mini.csv",
        ["year", "section", "academicYear", "department", "className"],
        class_rows,
    )

    student_rows = [
        {
            "name": student.name,
            "email": student.email,
            "password": student.password,
            "registerNo": student.register_no,
            "course": student.course,
            "registrationYear": student.registration_year,
            "year": student.year,
            "department": student.department,
        }
        for student in students
    ]
    _write_csv(
        output_dir / "students_cintel_mini.csv",
        [
            "name",
            "email",
            "password",
            "registerNo",
            "course",
            "registrationYear",
            "year",
            "department",
        ],
        student_rows,
    )

    teacher_rows = [
        {
            "name": teacher.name,
            "email": teacher.email,
            "registerNo": teacher.register_no,
            "department": teacher.department,
            "role": teacher.role,
            "password": teacher.password,
            "managedDepartments": teacher.managed_departments,
        }
        for teacher in teacher_records
    ]
    _write_csv(
        output_dir / "teachers_cintel_mini.csv",
        ["name", "email", "registerNo", "department", "role", "password", "managedDepartments"],
        teacher_rows,
    )

    _write_csv(
        output_dir / "faculty_class_assignments_cintel_mini.csv",
        ["facultyRegNo", "className"],
        ({"facultyRegNo": reg_no, "className": class_name} for reg_no, class_name in faculty_assignments),
    )

    _write_csv(
        output_dir / "student_class_assignments_cintel_mini.csv",
        ["studentRegNo", "className"],
        ({"studentRegNo": reg_no, "className": class_name} for reg_no, class_name in student_assignments),
    )

    _write_csv(
        output_dir / "advisor_class_assignments_cintel_mini.csv",
        ["advisorRegNo", "className"],
        ({"advisorRegNo": reg_no, "className": class_name} for reg_no, class_name in advisor_assignments),
    )

    print("Generated mini dataset in", output_dir)


if __name__ == "__main__":
    build_dataset()
