# Data Entry & Program Configuration Plan (Detailed)

## 1. Current State Verification (cross-checked in repo)
- `backend/models/student.model.js`
  - `course` enum hardcoded with specific strings (BTech/MTech variants).
  - `program` enum limited to `['BTech', 'MTech', 'MTech-Integrated']`.
  - Department derived by `this.course.split('-')[1]`, assuming course format.
  - `graduationYear` virtual and `advanceToNextYear` use fixed lengths (4 for default, 5 for MTech) which do not reflect the requested durations (BTech 4, MTech 2, MTech-Integrated 5 with leaderboard nuance).
- `backend/models/teacher.model.js`
  - Department enum hardcoded to `['CSE','ECE','EEE','MECH','CIVIL','IT','CINTEL']` and reused for `managedDepartments`.
  - No link to admin-managed enums.
- `backend/models/class.model.js`
  - Department enum hardcoded to `['CSE','ECE','EEE','MECH','CIVIL','IT']` (note CINTEL missing compared to teacher/student models).
- `backend/models/enumConfig.model.js`
  - Only allows `type` in `['category','positionSecured','eventLocation','eventScope','eventOrganizer','participationType','status']`; no support for program/department/course today.
- Bulk imports:
  - Students: `backend/controllers/student.controller.js` → `StudentBulkService` reads CSV; expects `course` and `program` fields matching hardcoded enums.
  - Teachers: `backend/controllers/teacher.controller.js` → `TeacherBulkService`; expects department values matching hardcoded enums.
  - Class/assignment CSVs: `backend/controllers/class.controller.js` and `assignment.controller.js` assume earlier imports already succeeded; no orchestration.

## 2. Issues Summarized
1. Admin cannot adjust program/course/department lists without code changes.
2. Inconsistent enum sets across models (e.g., class lacks CINTEL).
3. Program duration logic is rigid and does not capture MTech 2-year path or the 5-year integrated behavior.
4. Bulk imports rely on manual sequencing and do not validate against a central metadata source.
5. Register number parsing for program detection is not enforced even though requirement mentions verifying via register number.

### Role Responsibilities (confirmed with requirements)
- **Super Admin**: manages global metadata (programs, departments, courses) and other system-wide configurations.
- **Department Admin**: manages department-scoped data entry (students, teachers) and class/faculty/student mappings.

### Compatibility Constraints
- Target minimal code surface change: prefer additive schema/config updates and DB migrations so existing controllers/services continue functioning without modification.
- No dependent backend modules should require rewrites; keep API contracts unchanged and maintain existing enum strings as valid values (now sourced from metadata).
- Use feature toggles or backward-compatible validators to ensure legacy data continues to pass until fully migrated.

## 3. Execution Order Overview
Follow the steps in the order listed. Each step builds on the prior one and references the files/components that must change.

### Step 1 – Introduce Admin-Managed Metadata Backbone
1. Extend `EnumConfig` or create new collections:
   - Option A: Add `program`, `course`, `department` to `EnumConfig.type` enum.
   - Option B: Create dedicated `ProgramConfig` collection with fields: `code`, `name`, `durationYears`, `leaderboardGroup`, `registerPattern`, `departmentRefs`.
   - Whichever option, ensure admin routes (`enumConfig.controller.js`) have CRUD endpoints (reuse existing patterns).
2. Populate initial records:
   - Write migration script under `backend/scripts/` that reads existing hardcoded values and inserts them into the metadata collection(s).
   - Include program metadata requested: BTech → duration 4, MTech → 2, MTech-Integrated → 5 with `leaderboardGroup = Undergraduate` for years 1–4 and `leaderboardGroup = IntegratedFinal` for year 5.
3. Enforce permissions:
   - Restrict metadata CRUD routes to Super Admin (`requireSuperAdmin` middleware) while allowing read access to department admins for validation needs.

### Step 2 – Refactor Models to Use Metadata
1. `student.model.js`
   - Remove hardcoded `enum` arrays and replace with async validator that requires matching metadata entry (e.g., `ProgramConfig.exists({ code: value })`).
   - Update department derivation to read directly from the course metadata record; if metadata is missing treat it as validation failure so no inconsistent values persist.
   - Adjust `graduationYear` virtual and `advanceToNextYear` to read `durationYears` from metadata. For leaderboard parity logic, add helper `getLeaderboardYear()` that respects integrated programs (years 1–4 behave like BTech) using metadata values.
2. `teacher.model.js`
   - Remove hardcoded department enums and enforce metadata-driven validators for `department` and `managedDepartments`.
   - Normalize stored values to canonical metadata codes to keep downstream logic unchanged.
3. `class.model.js`
   - Drop hardcoded department enum and validate against metadata; reject inserts if department code missing.
4. Update services/controllers that create these documents (`student.service.createStudent`, `teacher.service.createTeacher`, `class.service.createClass`) only as needed to surface clearer error messages, but keep method signatures unchanged so rest of backend behaves as before.

### Step 3 – Metadata-Aware Validation Utilities
1. Build utility module (e.g., `backend/utils/metadataCache.js`) to cache program/course/department definitions for validation-heavy paths, with periodic refresh or bust-on-update hooks from admin endpoints.
2. Enforce register number pattern per program:
   - Add metadata field `registerPattern` (regex or parser instructions).
   - Provide a reusable validator/helper that existing student creation flows call before persisting so integrated students are flagged without introducing new endpoints.

### Step 4 – Sequential Data Entry Flow (No Bulk Orchestrator)
1. Retire bulk upload endpoints in favour of guided sequence using existing controllers:
   - Step A: Super Admin configures metadata (programs/departments/courses).
   - Step B: Department Admin creates classes via existing class creation endpoints using metadata codes.
   - Step C: Department Admin onboards teachers through current register endpoints (single or small batch uploads if retained) referencing metadata-driven departments.
   - Step D: Department Admin registers students via existing endpoints, ensuring course/program codes align with metadata.
   - Step E: Department Admin applies assignments using current assignment services to link students and faculty to classes.
2. Provide admin documentation/templates to support this sequence since automated orchestration is intentionally avoided.
3. Add lightweight validation utilities (pre-upload check endpoints or CLI scripts) to verify CSV rows against metadata before invoking existing controllers, keeping backend functions unchanged.

### Step 5 – Leaderboard & Reporting Adjustments
1. Modify leaderboard service (`backend/services/leaderboard.service.js`) to use metadata-driven cohorting:
   - Determine student cohort using `ProgramConfig.leaderboardGroup` and current academic year.
   - Ensure integrated students remain in BTech cohort until year 5, then move to separate view.
2. Review analytics/reporting services (faculty/department/role-based) to confirm new cohorts and program codes are handled (filters should rely on metadata codes, not string parsing).

### Step 6 – Admin UI & Templates
1. Update frontend admin screens to fetch dropdown options from metadata endpoints instead of hardcoded arrays.
2. Regenerate CSV templates dynamically based on metadata (e.g., backend endpoint `GET /api/import/templates` returns zipped CSVs with headers populated from metadata codes).
3. Reflect role capabilities in UI/UX:
   - Super Admin views include metadata management modules (programs/departments/courses).
   - Department Admin dashboards expose student/teacher imports, class mapping tools, and status reporting but hide metadata CRUD.

## 4. Validation Checklist Before Rollout
- Metadata CRUD tested via Postman/insomnia.
- Migration script migrates existing student/teacher/class documents to use metadata codes without validation failures.
- Sequential admin workflow exercised end-to-end (metadata → classes → teachers → students → assignments) with existing controllers to confirm no regressions.
- Leaderboard endpoints verified for BTech, MTech, MTech-Integrated year 5 cases.
- Register number pattern validation passes for known formats; mismatches rejected with clear errors.

## 5. Risk Notes & Mitigation Actions
- **Register pattern uncertainty**: confirm actual patterns per program; store fallback pattern until clarified. Provide override flag for legacy data.
- **Performance**: batch DB writes (e.g., `Student.insertMany` with `ordered: false`) and monitor memory usage with large CSVs.
- **Metadata drift**: schedule nightly job comparing metadata definitions with documents to flag stray values; optionally auto-create deactivated metadata entries for auditing.

## 6. Deliverables (Expanded)
- Metadata schema changes + admin API endpoints.
- Migration script and rollback plan.
- Sequential onboarding documentation and validation helpers for admins.
- Updated models/services/tests reflecting metadata-driven validation and program duration logic.
- Documentation: admin guide for metadata management, import package specification, and troubleshooting matrix.
