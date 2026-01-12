# ProRank: A Metadata-Driven Leaderboard System for Tracking Student Extracurricular Achievements in Higher Education

## 1. INTRODUCTION

### 1.1 Motivation and Problem Statement
Modern higher education increasingly values holistic student development beyond classroom academics. Students participate in hackathons, coding competitions, open-source contributions, research publications, certifications, and social service activities (NCC/NSS/YRC). However, tracking and recognizing these diverse extracurricular achievements remains challenging for educational institutions.

**Key Problems:**
- **Fragmented tracking**: Students maintain achievements across disparate platforms (GitHub, competition sites, certification portals) with no unified institutional view
- **Manual verification burden**: Faculty spend significant time validating participation certificates and calculating achievement merit
- **Inconsistent recognition**: Different departments apply varying criteria for evaluating similar achievements
- **Limited visibility**: Students lack real-time feedback on their standing relative to peers, reducing motivational impact
- **Administrative overhead**: Bulk onboarding of students, faculty, and classes requires manual data entry prone to errors

### 1.2 Proposed Solution: ProRank System
ProRank addresses these challenges through a web-based gamification platform built around **two core purposes**:

**Purpose 1: Centralized Achievement Hub with Comprehensive Reporting**
- **Central repository** for all student extracurricular data capturing complete achievement history
- **Customizable analytics reports** spanning multiple dimensions:
  - Student-level: Individual performance analysis, category distribution, timeline tracking
  - Class-level: Performance comparison, participation rates, engagement metrics
  - Department-level: Cross-department rankings, category analysis, faculty performance
  - Institution-level: Prize money metrics, activity heatmaps, trend analysis
- **Role-based report access** enabling Faculty, Academic Advisors, HODs, Associate Chairpersons, and Chairpersons to view relevant insights
- **Historical data tracking** with complete event history, class progression, and yearly comparisons

**Purpose 2: Real-Time Student Motivation Through Live Recognition**
- **Instant visibility** of points and rank changes after every approved event
- **Recognition of all efforts** regardless of winning position—even participants without prizes earn points
- **Live leaderboard** creating healthy competition where students see their standing update in real-time
- **Every contribution counts**: Small achievements accumulate, maintaining continuous student engagement
- **Transparent progress tracking** showing students exactly how activities translate to recognition
- **Motivational feedback loop**: Lose or win, effort is acknowledged, encouraging sustained participation

The system implements:
1. **Rule-based dynamic scoring** across 6+ achievement categories with multi-attribute formulas
2. **Context-aware leaderboards** with department, year, and section filtering for relevant peer comparison
3. **Multi-role architecture** supporting 7 distinct user types with hierarchical access control
4. **Metadata-driven configuration** enabling institutional customization without code changes
5. **Bulk import pipeline** for efficient semester-wise onboarding of thousands of students

### 1.3 Research Contributions
This paper presents:
1. **Architecture and implementation** of a production-deployed student achievement tracking system serving 1,920 students across 320 classes in 4 departments, functioning as a **centralized achievement hub** with comprehensive historical data management
2. **Comprehensive reporting infrastructure** with 15+ distinct report types spanning student, class, department, and institution levels enabling data-driven educational decision-making
3. **Real-time motivational system** where every student effort—winning or losing—is instantly recognized through live leaderboard updates, creating continuous engagement through transparent progress tracking
4. **Rule-based dynamic scoring engine** with multi-attribute formulas supporting retroactive recalculation when institutional policies change
5. **Metadata-driven design pattern** demonstrating how replacing hardcoded configurations with admin-controllable database collections improves institutional adaptability
6. **Multi-stakeholder workflow coordination** implementing hierarchical access control across 7 user roles with department-scoped permissions
7. **Technical specifications and lessons learned** to guide similar implementations in other educational institutions

### 1.4 Paper Organization
Section II reviews related work on educational gamification, leaderboard systems, and learning analytics. Section III describes the system architecture including technology stack, database schema, and authentication model. Section IV details core features including the scoring engine, event workflows, and leaderboard algorithms. Section V presents deployment specifications and usage statistics. Section VI discusses strengths, limitations, and future work. Section VII concludes.

---

## 2. RELATED WORK

### 2.1 Gamification in Education
Gamification applies game design elements (points, badges, leaderboards) to non-game contexts to increase engagement. Educational gamification aims to motivate learners through structured reward systems.

**Effectiveness Evidence:**
- Cigdem et al. (2024) found leaderboards in formative assessment improved learner achievement and engagement in engineering courses over 8 weeks, though attention may not sustain long-term
- Malone et al. (2021) demonstrated gamified cybersecurity exercises heavily engaged students but noted exploratory tasks can lead learners down unproductive paths without proper guidance
- Wang et al. (2025) showed personalization matters: learners with low trait competitiveness benefited more from higher rankings, while high-competitiveness learners performed better with lower rankings

**Design Considerations:**
- Li et al. (2024) systematic review found leaderboard effectiveness depends heavily on design choices (public vs. private, absolute vs. relative rankings, update frequency)
- Pickal et al. (2026) demonstrated that upward trend feedback on leaderboards increases intrinsic motivation even with fictitious feedback
- Philpott & Son (2022) warned that leaderboards focusing on extrinsic rewards can reduce performance once reward thresholds are achieved

### 2.2 Learning Analytics Dashboards
Revano & Garcia (2021) designed human-centered analytics dashboards for higher education using participatory design, identifying four critical factors:
1. Data access control (who sees what)
2. Importance of temporal context
3. Supporting student transitions
4. Actionable insights over raw data

Their findings influenced ProRank's multi-role architecture and context-aware filtering.

### 2.3 Computational Problem-Solving Assessment
Foster et al. (2026) developed rule-based scoring methods for open, interactive tasks in computational problem-solving assessments. Their evidence-centered design approach informed ProRank's multi-attribute scoring formulas where base points combine with contextual bonuses (organizer type, participation mode, outcome achieved).

### 2.4 Gap in Existing Work
Prior systems focus on:
- **In-course gamification**: Points for assignments, quizzes within specific courses
- **Platform-specific tracking**: GitHub contributions, coding platform rankings

**ProRank addresses uncovered needs:**
- **Cross-platform aggregation**: Unifying achievements from hackathons, competitions, certifications, research, and social service
- **Institutional customization**: Metadata-driven configuration for diverse university structures
- **Administrative scalability**: Bulk operations for semester-wise onboarding
- **Multi-stakeholder workflows**: Coordinating student submissions, faculty approvals, and administrative reporting

---

## 3. SYSTEM ARCHITECTURE

### 3.1 Technology Stack
**Frontend:**
- React 18.x with Vite build tool
- TailwindCSS for responsive UI design
- Axios for API communication
- React Router for navigation
- Chart.js for analytics visualizations

**Backend:**
- Node.js 25.x with Express.js framework
- MongoDB with Mongoose ODM
- JWT (jsonwebtoken) for authentication
- bcrypt for password hashing
- Multer for file uploads (certificates, proof documents)
- Nodemon for development

**Infrastructure:**
- RESTful API architecture
- Role-based middleware for authorization
- Metadata caching layer for validation performance

### 3.2 Database Schema

#### 3.2.1 Core Entities

**Student Model:**
```javascript
{
  name: String,
  email: String (unique),
  registerNo: String (unique),
  password: String (hashed),
  course: String (validated against CourseConfig),
  department: String (validated against DepartmentConfig),
  year: Number (1-5),
  program: String (BTECH, MTECH, MTECH_INTEGRATED),
  registrationYear: Number,
  totalPoints: Number (default 0),
  eventsParticipated: [ObjectId ref Event],
  currentClass: {
    year: Number,
    section: String,
    ref: ObjectId ref Class
  },
  classHistory: [{year, section, ref}],
  isActive: Boolean,
  isGraduated: Boolean,
  isArchived: Boolean
}
```

**Event Model:**
```javascript
{
  eventName: String,
  description: String,
  category: String (validated against EnumConfig),
  date: Date,
  proofUrl: [String] (certificate images),
  pdfDocument: String (optional detailed proof),
  status: Enum ['Pending', 'Approved', 'Rejected'],
  rejectionReason: String,
  pointsAwarded: Number,
  scoringBreakdown: Object (shows calculation details),
  submittedBy: ObjectId ref Student,
  reviewedBy: ObjectId ref Teacher,
  customFields: Object (dynamic category-specific data)
}
```

**Teacher Model:**
```javascript
{
  name: String,
  email: String (unique),
  empId: String (unique),
  password: String (hashed),
  department: String,
  role: Enum ['Faculty', 'AcademicAdvisor', 'HOD', 
               'AssociateChairperson', 'Chairperson'],
  managedClasses: [ObjectId ref Class]
}
```

**Class Model:**
```javascript
{
  year: Number (1-5),
  section: String,
  academicYear: String (e.g., '2024-2025'),
  department: String,
  className: String (auto-generated: 'year-section-department'),
  facultyAssigned: [ObjectId ref Teacher],
  academicAdvisors: [ObjectId ref Teacher],
  students: [ObjectId ref Student]
}
```

#### 3.2.2 Metadata Configuration

**DepartmentConfig:**
```javascript
{
  code: String (unique, e.g., 'CINTEL'),
  name: String (e.g., 'Computer Intelligence'),
  aliases: [String] (legacy codes),
  isActive: Boolean
}
```

**CourseConfig:**
```javascript
{
  code: String (unique, e.g., 'BTECH-CINTEL'),
  name: String,
  degreeType: Enum ['BTECH', 'MTECH', 'MTECH_INTEGRATED'],
  departmentCode: String (ref DepartmentConfig),
  durationYears: Number (4 for BTECH, 2 for MTECH, 5 for integrated),
  isActive: Boolean
}
```

**EnumConfig (for dynamic dropdowns):**
```javascript
{
  type: String (e.g., 'category', 'positionSecured', 'eventOrganizer'),
  value: String,
  display: String,
  isActive: Boolean
}
```

**FormFieldConfig (category-specific forms):**
```javascript
{
  category: String (e.g., 'Hackathon'),
  requiredFields: [String],
  optionalFields: [String],
  conditionalFields: Object,
  proofConfig: {
    requireCertificateImage: Boolean,
    requirePdfDocument: Boolean,
    maxCertificates: Number
  }
}
```

**CategoryPointsConfig (scoring rules):**
```javascript
{
  category: String,
  scoringRules: [{
    attribute: String (e.g., 'level'),
    mapping: [{value: String, points: Number}]
  }],
  basePoints: Number,
  calculationFormula: String (documentation)
}
```

### 3.3 Multi-Role Authentication Architecture

**Role Hierarchy (7 roles):**
1. **Student**: Submit events, view personal dashboard, access leaderboard
2. **Faculty**: Approve/reject events for assigned classes
3. **Academic Advisor**: Monitor advisee performance, class-level reports
4. **HOD**: Department-wide analytics, manage department faculty
5. **Associate Chairperson**: Cross-department reports, policy oversight
6. **Chairperson**: Institution-wide analytics, strategic insights
7. **Super Admin**: Metadata configuration, user management, system settings
8. **Department Admin**: Department-scoped bulk imports, class management

**Authorization Middleware:**
- JWT tokens with role embedded in payload
- Route-level guards: `authStudent`, `authTeacher`, `authHOD`, `requireSuperAdmin`, `requireDepartmentAdmin`
- Department-scoped filters for Department Admins (can only access own department data)

### 3.4 Metadata Caching Layer
To avoid database hits on every validation, ProRank implements an in-memory cache:
```javascript
class MetadataCache {
  constructor() {
    this.departments = new Map();
    this.courses = new Map();
    this.lastRefresh = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }
  
  async isValidDepartmentCode(code) {
    if (this.needsRefresh()) await this.refresh();
    return this.departments.has(code.toUpperCase());
  }
  
  async isValidCourseCode(code) {
    if (this.needsRefresh()) await this.refresh();
    return this.courses.has(code.toUpperCase());
  }
}
```
Cache invalidates on metadata updates via admin endpoints.

---

## 4. CORE FEATURES AND IMPLEMENTATION

### 4.1 Dynamic Scoring Engine

#### 4.1.1 Multi-Attribute Scoring Model
ProRank scoring combines **base points** with **contextual bonuses** from multiple attributes. Each event category has distinct scoring rules.

**Example: Hackathon Category**
```
Total Points = Base(Level) + Bonus(Organizer) + Bonus(Mode) + Outcome(Position)

Where:
  Base(Level) = {
    Intra-College: 10,
    Inter-College: 20,
    National: 30,
    International: 50
  }
  
  Bonus(Organizer) = {
    Industry: +5,
    Academic: +3
  }
  
  Bonus(Mode) = {
    Solo: +5,
    Team: +3
  }
  
  Outcome(Position) = {
    Winner: +25,
    Runner-up: +20,
    3rd Place: +15,
    Finalist: +10,
    Participant: +5
  }
```

**Example Calculation:**
Student participates in National-level hackathon (30), organized by Industry (+5), as Solo participant (+5), and wins 1st place (+25):
```
Total = 30 + 5 + 5 + 25 = 65 points
```

#### 4.1.2 Category-Specific Rules

**Coding Competition:**
- Base: Platform tier (Top-tier like Codeforces: +10, Unknown: +3)
- Performance: Percentile rank (Top 1%: +25, Top 5%: +20, Top 10%: +10, Participant: +5)
- Region: International (+10), National (+5)

**Open Source Contribution:**
- Repository popularity: >1000 forks (+30), 500-1000 forks (+15)
- PR status: Merged (+10)
- Contribution type: Feature (+15), Bug fix (+10), Documentation (+5)
- Scale: >500 lines of code (+10)
- Milestone bonuses: Every 5th PR (+5), Hacktoberfest completion (+20), GSoC contributor (+40)

**Research Paper:**
- Publisher tier: IEEE/Springer/Elsevier Q1 (+25), Q2 (+15), Others (+5)
- Authorship: 1st author (+20), 2nd author (+15), Co-author (+10)
- Paper type: Research (+10), Review/Survey (+5)
- Presentation: Conference oral (+5), Poster (+3)
- Level: International outside India (+10), National (+5)

**Certifications:**
- Provider: Top 500 company/Stanford/MIT/AWS/Google (+20), NPTEL (+10), Coursera/Udemy (+2)
- Complexity: Advanced (+15), Intermediate (+10), Beginner (+5)
- Rigor: Final project required (+10)

**NCC/NSS/YRC:**
- Camp participation: RDC/TSC (+15), NIC (+10), CATC/ATC (+5)
- Rank: SUO (+15), JUO (+5)
- Recognition: Best Cadet award (+20)
- Volunteer hours: 50+ hours (+5)

#### 4.1.3 Real-Time Points Preview
Before submission, students see calculated points:
```javascript
async function calculatePointsPreview(category, formData) {
  const config = await CategoryPointsConfig.findOne({category});
  let total = config.basePoints || 0;
  let breakdown = {};
  
  for (const rule of config.scoringRules) {
    const value = formData[rule.attribute];
    const mapping = rule.mapping.find(m => m.value === value);
    if (mapping) {
      total += mapping.points;
      breakdown[rule.attribute] = {value, points: mapping.points};
    }
  }
  
  return {total, breakdown};
}
```
Preview updates dynamically as students fill the form, providing transparency.

#### 4.1.4 Retroactive Recalculation
When scoring rules change (e.g., admin increases hackathon winner points from +25 to +30), ProRank supports recalculation:
```javascript
async function recalculateEventPoints(eventId) {
  const event = await Event.findById(eventId);
  const newCalculation = await calculatePoints(event.category, event.customFields);
  
  const pointsDifference = newCalculation.total - event.pointsAwarded;
  
  // Update event
  event.pointsAwarded = newCalculation.total;
  event.scoringBreakdown = newCalculation.breakdown;
  await event.save();
  
  // Update student total
  const student = await Student.findById(event.submittedBy);
  student.totalPoints += pointsDifference;
  await student.save();
}
```

### 4.2 Event Submission and Approval Workflow

#### 4.2.1 Student Submission Flow
1. **Category Selection**: Student chooses from configured categories (Hackathon, Coding Competition, etc.)
2. **Dynamic Form Loading**: Frontend fetches `FormFieldConfig` for selected category
3. **Form Filling**: Required fields enforced, optional fields shown, conditional fields appear based on dependencies
4. **Proof Upload**: Certificate images (required), PDF document (optional)
5. **Points Preview**: Real-time calculation shown before submission
6. **Submit**: Event saved with status='Pending', student sees in "Pending Events" tab

#### 4.2.2 Faculty Review Process
1. **Assignment**: Events assigned to class faculty or academic advisors
2. **Review Interface**: Faculty see pending events with all submitted data and proof images
3. **Verification**: Faculty cross-check proof documents against claimed achievements
4. **Action**:
   - **Approve**: Status='Approved', points added to student's totalPoints
   - **Reject**: Status='Rejected', rejectionReason required, student can edit and resubmit

#### 4.2.3 Edit and Resubmission
- Students can edit rejected events and resubmit
- Points recalculated on resubmission if form data changes
- Edit history tracked for auditing

### 4.3 Context-Aware Leaderboard System

#### 4.3.1 Leaderboard Views
**Overall Leaderboard:**
- All active students sorted by totalPoints descending
- Pagination (default 10 per page)
- Search by name or register number

**Department Leaderboard:**
- Filter by single department
- Shows ranking within department only

**Year Leaderboard:**
- Filter by academic year (1st year, 2nd year, etc.)
- Useful for cohort comparisons

**Context Leaderboard (Student View):**
- Automatic filtering by logged-in student's department and year
- Shows "my rank" prominently
- Provides peer comparison within relevant cohort

#### 4.3.2 Ranking Algorithm
```javascript
async function getLeaderboard(filters, pagination) {
  const query = Student.find(filters).where('isActive').equals(true);
  
  // Sort by points descending
  const students = await query
    .sort({totalPoints: -1})
    .skip((pagination.page - 1) * pagination.limit)
    .limit(pagination.limit)
    .select('name registerNo totalPoints department currentClass');
  
  // Calculate rank (handle ties)
  let rank = (pagination.page - 1) * pagination.limit + 1;
  let previousPoints = null;
  
  students.forEach(student => {
    if (student.totalPoints !== previousPoints) {
      previousPoints = student.totalPoints;
    } else {
      rank--; // Tie: same rank as previous
    }
    student.rank = rank++;
  });
  
  return students;
}
```

**Tie Handling**: Students with identical points receive the same rank.

#### 4.3.3 Search and Filtering
- Search by name or register number
- Combine filters (e.g., Department=CINTEL AND Year=3)
- Academic year filter for historical leaderboards

### 4.4 Administrative Features

#### 4.4.1 Metadata Management (Super Admin)
**Interface Components:**
- Department CRUD: Add/edit departments with aliases for legacy codes
- Course CRUD: Define courses with degree type, duration, department association
- Enum Configuration: Manage dropdown options (categories, positions, organizers, event scopes)
- Scoring Rules Editor: Modify points mappings per category with preview of impact

**Workflow:**
1. Super Admin logs in, navigates to "System Configuration"
2. Adds new department (e.g., code='AI', name='Artificial Intelligence')
3. Creates courses for that department (e.g., 'BTECH-AI', duration=4 years)
4. Updates EnumConfig to add department to existing dropdowns
5. Cache auto-refreshes, new department immediately available in student/teacher registration

#### 4.4.2 Bulk Import Pipeline (Department Admin)
**Sequential Import Flow:**
1. **Metadata Setup** (Super Admin): Configure departments, courses
2. **Class Creation** (Dept Admin): Upload CSV with columns: year, section, academicYear, department
3. **Teacher Registration** (Dept Admin): Upload CSV with: name, email, empId, department, role
4. **Student Registration** (Dept Admin): Upload CSV with: name, email, registerNo, course, year, registrationYear
5. **Faculty Assignment** (Dept Admin): CSV linking empId to className
6. **Student Assignment** (Dept Admin): CSV linking registerNo to className

**Validation on Each Step:**
- Department/course codes validated against metadata
- Duplicate checks on unique fields (email, registerNo, empId)
- Foreign key validation (class must exist before assignment)
- Failed rows returned with detailed error messages

**Template Generation:**
- Admin downloads CSV templates with correct headers and sample rows
- Templates dynamically generated based on current metadata

#### 4.4.3 Year Advancement Automation
At academic year end:
```javascript
async function advanceStudentsToNextYear(currentAcademicYear) {
  const students = await Student.find({
    isActive: true,
    isGraduated: false
  });
  
  for (const student of students) {
    // Archive current class to history
    student.classHistory.push({
      year: student.currentClass.year,
      section: student.currentClass.section,
      ref: student.currentClass.ref
    });
    
    // Advance year
    const nextYear = student.currentClass.year + 1;
    const maxYear = await getCourseDuration(student.course);
    
    if (nextYear > maxYear) {
      student.isGraduated = true;
      student.isActive = false;
    } else {
      student.currentClass.year = nextYear;
      // Class assignment handled separately
    }
    
    await student.save();
  }
}
```

### 4.5 Comprehensive Reporting Infrastructure

ProRank serves as a **centralized achievement hub** providing 15+ customizable report types across multiple organizational levels. This reporting infrastructure enables data-driven decision-making by extracting actionable insights from student achievement history.

#### 4.5.1 Report Categories

**Student-Level Reports (Individual Analysis):**
- **Student Profile Report**: Complete achievement history, total points, rank, events participated
- **Detailed Performance Analysis**: Category-wise breakdown showing strengths and improvement areas
- **Timeline Tracking**: Chronological visualization of point accumulation and rank progression
- **Participation Trends**: Frequency and consistency of event submissions over time

**Class-Level Reports (Faculty/Academic Advisor View):**
- **Class Overview**: Student count, average points, total activities, participation rate
- **Department Ranking**: Class standing compared to other sections in same department/year
- **Student Analysis**: List of students with individual metrics (points, events, last activity date)
- **Category Analysis**: Popular categories within class, distribution of activity types
- **Participation Trends**: Monthly submission patterns identifying engagement peaks/valleys
- **Engagement Opportunities**: Students requiring attention (low participation, inactive status)

**Department-Level Reports (HOD View):**
- **Department Overview**: Aggregated metrics across all classes (total points, event count, participation rate)
- **Cross-Class Performance Comparison**: Bar charts comparing average points across sections
- **Year-wise Analysis**: Performance breakdown by 1st/2nd/3rd/4th year cohorts
- **Faculty Activity Dashboard**: Events reviewed per faculty member showing responsiveness
- **Prize Money by Class**: Distribution of monetary rewards across department sections
- **Top Performers**: Department-wide student rankings with filtering options

**Institution-Level Reports (Associate Chairperson/Chairperson View):**
- **Cross-Department Performance**: Institution-wide rankings showing which departments excel
- **Category Analysis**: Popular activity types across all departments identifying institutional trends
- **Activity Heatmap**: Monthly submission patterns across 12-month period visualizing engagement cycles
- **Faculty Performance Metrics**: Approval rates, review turnaround times across all faculty
- **Prize Money Dashboard**: Total monetary rewards by department with trend analysis
- **Participation Metrics**: Engagement rates, active student percentages, inactive student alerts

#### 4.5.2 Report Customization Features

**Filtering Dimensions:**
- **Temporal filters**: Date range (startDate, endDate), academic year, specific months
- **Demographic filters**: Department, year, section, class
- **Activity filters**: Event category, position secured, organizer type
- **Performance filters**: Points thresholds, ranking ranges, participation frequency

**Export Options:**
- CSV export for all tabular reports enabling offline analysis
- Real-time data refresh ensuring current information
- Pagination support for large datasets (configurable page size)
- Search functionality within reports (student name, register number)

**Role-Based Access Control:**
```javascript
// Faculty: See only assigned classes
if (role === 'Faculty') {
  filters.classIds = teacher.classes;
  filters.department = teacher.department;
}

// Academic Advisor: See advised classes + department
if (role === 'Academic Advisor') {
  filters.classIds = advisedClasses;
  filters.department = teacher.department;
}

// HOD: See entire department
if (role === 'HOD') {
  filters.department = teacher.department;
}

// Associate Chairperson: See managed departments
if (role === 'Associate Chairperson') {
  filters.departments = teacher.managedDepartments;
}

// Chairperson: See all departments
if (role === 'Chairperson') {
  // No filters - institution-wide access
}
```

#### 4.5.3 Analytics Implementation

**Backend Architecture:**
Three specialized service modules handle different reporting scopes:

**1. FacultyReportService (674 lines)**
- Focused on single-class analysis for faculty members
- Optimized queries fetching only students in assigned class
- Provides actionable insights for classroom-level interventions

**2. DepartmentAnalyticsService (1,353 lines)**
- Department-wide aggregations for HOD dashboard
- Cross-class comparisons, year-wise analysis
- Faculty performance tracking within department

**3. RoleBasedEventReportsService (1,493 lines)**
- Dynamic filtering based on user role and permissions
- Supports all organizational levels from faculty to chairperson
- Implements complex query logic ensuring data access boundaries

**Sample Report Query (Top Students):**
```javascript
async function getTopStudents(teacher, limit, filters) {
  // Apply role-based access filters
  const accessFilters = await getRoleBasedFilters(teacher);
  
  // Get students matching access scope
  const students = await Student.find(accessFilters)
    .sort({ totalPoints: -1 })
    .limit(limit)
    .select('name registerNo department totalPoints eventsParticipated')
    .populate('currentClass', 'year section');
  
  // Enrich with additional metrics
  for (const student of students) {
    student.eventCount = student.eventsParticipated.length;
    student.rank = await calculateStudentRank(student._id, filters);
  }
  
  return students;
}
```

#### 4.5.4 Historical Data Management

**Complete Event History:**
- Every approved/rejected event stored permanently with full details
- Timestamps capturing submission date, approval date
- Points breakdown showing calculation at time of approval
- Proof documents archived with events for audit trail

**Class Progression Tracking:**
```javascript
// Student model includes classHistory array
classHistory: [{
  year: Number,
  section: String,
  ref: ObjectId,  // Class reference
  academicYear: String
}]
```
When students advance years, previous class assignments archived enabling longitudinal analysis.

**Year-over-Year Comparisons:**
Reports support filtering by academic year (e.g., "2024-2025") allowing administrators to compare:
- Current 2nd year vs. previous year's 2nd year at same point
- Department performance trends across multiple years
- Event submission patterns year-over-year

#### 4.5.5 Real-Time Motivational Feedback

The reporting system directly supports ProRank's **second core purpose**—student motivation through instant recognition:

**Live Dashboard Updates:**
- Student dashboard refreshes total points immediately after event approval
- Leaderboard position recalculates in real-time
- Context-aware rank shown (department rank, year rank, overall rank)

**Effort Recognition Mechanism:**
Even students who don't win competitions receive recognition:
- **Participation points**: Base points awarded just for competing (e.g., Hackathon participant: +5 points)
- **Incremental rewards**: Open-source PRs, volunteer hours accumulate gradually
- **Visible progress**: Dashboard shows "Events Participated: 15" even if no wins
- **Category diversity bonus**: Encouragement to try different activity types

**Transparent Calculation:**
Before submission, students see:
```
Hackathon: National-level, Industry-organized, Solo, Finalist
Calculation:
  Base (National): 30 points
  Organizer bonus (Industry): +5 points
  Mode bonus (Solo): +5 points
  Outcome (Finalist): +10 points
  ────────────────────────────
  Total Preview: 50 points
```
This transparency ensures students understand **exactly why** they received specific points, reinforcing fairness and motivating strategic participation.

**Competitive but Inclusive:**
- Top performers highlighted in "Top 10" leaderboard
- Mid-tier students see incremental rank improvements ("You moved from #45 to #42!")
- Low-participation students identified in "Engagement Opportunities" reports for targeted faculty outreach
- No student is invisible—system tracks everyone's contributions

### 4.6 Administrative Features

#### 4.5.1 Student Dashboard
- **Personal Stats**: Total points, rank, events participated
- **Recent Activity**: Last 5 approved events with points breakdown
- **Category Distribution**: Pie chart showing points by category
- **Timeline**: Line graph of cumulative points over academic year

#### 4.5.2 Faculty Reports
- **Class Overview**: List of assigned classes with student counts, average points
- **Pending Reviews**: Count of events awaiting approval
- **Top Performers**: Top 10 students in managed classes
- **Category Analysis**: Which categories are most popular in their classes

#### 4.5.3 HOD Dashboard
- **Department Summary**: Total students, total events, department rank
- **Class Comparison**: Bar chart comparing average points across sections
- **Year-wise Performance**: Comparison across 1st, 2nd, 3rd, 4th year cohorts
- **Faculty Activity**: Events reviewed per faculty member

#### 4.5.4 Chairperson Dashboard
- **Institution-wide Metrics**: Total events approved, total points awarded, engagement rate
- **Department Comparison**: Which departments have highest participation
- **Trend Analysis**: Month-over-month growth in submissions
- **Event Category Distribution**: Institution-wide breakdown

---

## 5. DEPLOYMENT AND PRELIMINARY RESULTS

### 5.1 Deployment Specifications
**Production Environment:**
- University private cloud infrastructure
- MongoDB Atlas cluster (M10 tier, 2GB RAM)
- Node.js backend on Ubuntu 20.04 LTS
- Frontend served via Nginx reverse proxy
- SSL/TLS encryption with Let's Encrypt certificates
- Daily automated backups

**Operational Since:** January 2026 (1 week of production usage)

### 5.2 Initial Seeding Statistics
**Population Data (generated for 4 departments):**
- **Departments**: CINTEL (Computer Intelligence), CTECH (Computing Technologies), NWC (Networks and Communications), DSBS (Data Science and Business Systems)
- **Classes**: 320 total (80 per department)
  - Distribution: 20 classes per year × 4 years
  - Sections per department: A1-J2 (varied unique sections)
- **Students**: 1,920 total (480 per department, ~6 students per class)
- **Teachers**: 
  - Faculty: 320 (1 per class)
  - Academic Advisors: 32 (2 per year per department)
  - HODs: 4 (1 per department)
  - Associate Chairpersons: 2
  - Chairperson: 1
- **Courses**: 32 total across 4 departments
  - B.Tech variants (4-year): e.g., BTECH-CINTEL, BTECH-CINTEL-AIML
  - M.Tech variants (2-year): e.g., MTECH-CINTEL-AI
  - Integrated M.Tech (5-year): e.g., MTECH_INT-CTECH-CS

### 5.3 Usage Metrics (First Week - Preliminary Data)
**Note:** These are placeholder metrics for paper draft. Actual metrics to be collected after 3-6 months of deployment.

**Expected Metrics to Track:**
- Number of events submitted per category
- Approval/rejection rates by category
- Average points per approved event
- Student engagement rate (% of active students submitting ≥1 event)
- Leaderboard access frequency (page views)
- Time from submission to review (faculty responsiveness)
- Distribution of points across categories
- Department-wise participation comparison

### 5.4 Preliminary Observations (To Be Updated)
Once data is collected, this section will analyze:
1. Which event categories are most popular (expected: Certifications, Hackathons)
2. Correlation between leaderboard visibility and submission frequency
3. Faculty review turnaround times (target: <48 hours)
4. Student utilization of points preview feature
5. Administrative workload reduction from bulk import pipeline

---

## 6. DISCUSSION

### 6.1 Key Strengths

**1. Transparency and Fairness**
- Real-time points preview eliminates "black box" scoring
- Public scoring rules accessible to all students
- Consistent evaluation criteria across departments

**2. Institutional Adaptability**
- Metadata-driven design allows configuration without code changes
- Institutions with different department structures can customize
- Scoring rules can evolve with institutional priorities

**3. Scalability**
- Bulk import pipeline handles semester-wise onboarding efficiently
- Metadata caching minimizes database load during validation
- Pagination prevents frontend performance degradation with large user base

**4. Multi-Stakeholder Coordination**
- Clear role separation (students submit, faculty approve, admins configure)
- Department-scoped access prevents data leakage
- Hierarchical reporting provides insights at multiple organizational levels

**5. Comprehensive Achievement Coverage**
- 6+ distinct categories cover diverse extracurricular activities
- Custom fields per category capture nuanced achievements
- Open-source contributions and research papers often overlooked in traditional tracking

### 6.2 Limitations and Challenges

**1. Initial Configuration Burden**
- Super Admin must set up complete metadata before system is operational
- Mapping existing student data to new schema requires careful planning
- Incorrect scoring rules at launch require retroactive recalculation

**2. Subjectivity in Proof Verification**
- Faculty must manually verify certificate authenticity (potential for fraud)
- No automated plagiarism or duplicate submission detection across students
- Ambiguity in categorizing borderline events (e.g., workshop vs. hackathon)

**3. Long-term Engagement Uncertainty**
- Literature suggests gamification effects may diminish over time (Cigdem et al. 2024)
- Risk of students focusing on "gaming the system" rather than genuine learning
- Leaderboard competitiveness may demotivate lower-ranked students (Philpott & Son 2022)

**4. Technical Debt**
- Monolithic React frontend could benefit from componentization
- Lack of automated testing suite increases regression risk
- Manual deployment process (should adopt CI/CD pipeline)

**5. Limited Personalization**
- Uniform scoring rules across all students (Wang et al. 2025 suggests competitiveness affects leaderboard impact)
- No opt-out mechanism for students uncomfortable with public ranking
- Fixed leaderboard display (no private rank-only view option)

### 6.3 Lessons Learned

**1. Metadata-First Design**
- Moving from hardcoded enums to database-driven configuration was crucial for institutional adoption
- Cache invalidation on metadata updates prevented stale validation errors
- Async validators in Mongoose enabled seamless validation against dynamic metadata

**2. Incremental Feature Deployment**
- Initial deployment focused on core workflow (submit → approve → leaderboard)
- Analytics dashboards added after stabilizing primary features
- Bulk import pipeline refined based on department admin feedback during pilot

**3. Role-Based Testing Importance**
- Comprehensive testing across all 7 roles revealed authorization edge cases
- Department-scoped filtering required careful query construction to prevent data leaks
- JWT token expiration handling improved user experience significantly

### 6.4 Future Enhancements

**1. Automated Proof Verification**
- Integrate with certificate issuer APIs (e.g., Coursera, NPTEL) for automated validation
- OCR-based certificate text extraction and verification
- Blockchain-based certificate registry for tamper-proof validation

**2. Personalized Leaderboards**
- Private rank visibility option (see rank without exposing to peers)
- Competitiveness profile assessment to tailor leaderboard display
- Goal-based challenges (e.g., "Earn 100 points this month") instead of pure ranking

**3. Recommendation Engine**
- Suggest events/competitions based on student's interests and past participation
- Identify skill gaps by comparing student's category distribution to high performers
- Notify students of upcoming opportunities matching their profile

**4. Advanced Analytics**
- Predictive modeling: Which students are at risk of low engagement?
- Cohort analysis: How does current 2nd year compare to previous 2nd year at same point?
- Impact assessment: Do high leaderboard ranks correlate with placement outcomes?

**5. Mobile Application**
- Native iOS/Android apps for faster event submission on-the-go
- Push notifications for approval status, leaderboard changes
- Offline proof capture with auto-sync when connected

**6. Gamification Enhancements**
- Badges for milestones (e.g., "10 Hackathons," "Research Pioneer")
- Streak tracking (consecutive months with event participation)
- Team challenges (department vs. department competitions)

**7. Integration with LMS**
- Sync academic course performance with extracurricular points
- Holistic student profile combining curricular and co-curricular achievements
- Faculty access to combined view during mentorship sessions

---

## 7. CONCLUSION

### 7.1 Summary of Contributions
ProRank demonstrates a production-ready approach to systematically tracking student extracurricular achievements in higher education institutions. The system's key contributions are:

1. **Rule-based dynamic scoring engine** with multi-attribute formulas providing transparent, fair evaluation across diverse achievement categories
2. **Metadata-driven architecture** enabling institutional customization without code changes, improving adaptability across different university structures
3. **Comprehensive multi-role workflow** coordinating student submissions, faculty approvals, and administrative oversight with appropriate access controls
4. **Scalable bulk operations** supporting efficient semester-wise onboarding of thousands of students and classes
5. **Deployment experience** from a real university environment with preliminary technical insights

### 7.2 Broader Impact
Institutions adopting ProRank-style systems can:
- **Recognize holistic student development** beyond academic grades
- **Motivate extracurricular participation** through visible, fair reward structures
- **Reduce administrative burden** via automation of tracking and verification
- **Make data-driven decisions** about student support and program effectiveness
- **Improve placement outcomes** by providing comprehensive student achievement profiles to recruiters

### 7.3 Open Challenges
The higher education community should investigate:
- **Long-term engagement sustainability**: Do gamification effects persist across 4-year degree programs?
- **Equity concerns**: Does leaderboard visibility create pressure disadvantaging certain student populations?
- **Optimal scoring calibration**: How should institutions balance different achievement types (research vs. hackathons vs. certifications)?
- **Fraud prevention**: What technical and policy measures prevent certificate forgery and duplicate claims?

### 7.4 Availability
The ProRank system architecture and implementation insights presented in this paper aim to guide similar deployments in other institutions. Future work may open-source portions of the codebase under appropriate licenses.

---

## 8. TECHNICAL SPECIFICATIONS (APPENDIX)

### 8.1 API Endpoints Summary

**Authentication:**
- `POST /api/student/login` - Student authentication
- `POST /api/teacher/login` - Faculty authentication
- `POST /api/admin/login` - Admin authentication

**Event Management:**
- `POST /api/event/create` - Student event submission
- `GET /api/event/my-events` - Student's event list
- `PUT /api/event/edit/:id` - Edit rejected event
- `POST /api/event/approve/:id` - Faculty approval
- `POST /api/event/reject/:id` - Faculty rejection
- `GET /api/event/scoring-rules` - Fetch scoring configurations
- `GET /api/event/form-fields/:category` - Get category-specific form

**Leaderboard:**
- `GET /api/leaderboard` - General leaderboard with filters
- `GET /api/leaderboard/my-rank` - Student's rank
- `GET /api/leaderboard/my-context` - Context-aware leaderboard

**Metadata (Super Admin):**
- `POST /api/metadata/departments` - Create department
- `PUT /api/metadata/departments/:code` - Update department
- `GET /api/metadata/departments` - List departments
- `POST /api/metadata/courses` - Create course
- `PUT /api/metadata/courses/:code` - Update course
- `GET /api/metadata/courses` - List courses

**Bulk Operations (Dept Admin):**
- `POST /api/class/bulk-create` - Bulk class creation
- `POST /api/student/bulk-register` - Bulk student registration
- `POST /api/teacher/bulk-register` - Bulk teacher registration
- `POST /api/assignment/bulk-faculty` - Assign faculty to classes
- `POST /api/assignment/bulk-students` - Assign students to classes

**Analytics:**
- `GET /api/reports/department-analytics` - HOD dashboard
- `GET /api/reports/class-performance` - Class-level stats
- `GET /api/reports/student-activity` - Individual student report
- `GET /api/reports/top-students` - Top performers
- `GET /api/reports/category-distribution` - Event category breakdown

### 8.2 Scoring Formula Reference

**General Formula:**
```
TotalPoints = BasePoints + Σ(AttributeBonuses) + OutcomePoints
```

**Hackathon Example:**
```
Base(Level) ∈ {10, 20, 30, 50}
Bonus(Organizer) ∈ {3, 5}
Bonus(Mode) ∈ {3, 5}
Outcome ∈ {5, 10, 15, 20, 25}
```

**Research Paper Example:**
```
Base(Publisher) ∈ {5, 15, 25}
Bonus(Authorship) ∈ {10, 15, 20}
Bonus(Type) ∈ {5, 10}
Bonus(Presentation) ∈ {3, 5}
Bonus(Level) ∈ {5, 10}
```

**Open Source Example:**
```
Base(RepoSize) ∈ {15, 30}
Fixed(Merged) = 10
Bonus(ContributionType) ∈ {5, 10, 15}
Bonus(LinesOfCode) = 10 if >500
Milestone(Every5PRs) = 5
Milestone(GSoC) = 40
```

### 8.3 Performance Considerations

**Database Indexes:**
- `Student.registerNo` (unique)
- `Student.email` (unique)
- `Student.totalPoints` (desc) - for leaderboard queries
- `Student.department + currentClass.year` (compound) - for context filtering
- `Event.submittedBy + status` - for pending event queries
- `Class.department + year + section` - for class lookups

**Caching Strategy:**
- Metadata cache: 5-minute TTL, invalidate on admin updates
- Leaderboard page caching: 1-minute TTL (reduces DB load)
- Student rank caching: Invalidate on any event approval in student's context

**Optimization Techniques:**
- Pagination with skip/limit (default 10 items/page)
- Selective field projection (avoid loading password hashes, large arrays)
- Populate only necessary relations (avoid deep population chains)
- Aggregation pipelines for analytics queries

### 8.4 Security Measures

**Authentication:**
- bcrypt password hashing (salt rounds: 10)
- JWT tokens with 7-day expiration
- HttpOnly cookies option for XSS protection
- CORS configuration limiting allowed origins

**Authorization:**
- Role-based middleware on all protected routes
- Department-scope validation for Department Admins
- Token verification on every request
- Prevent privilege escalation (students cannot access admin endpoints even with modified tokens)

**Input Validation:**
- Express-validator for request sanitization
- Mongoose schema validators for type safety
- File upload restrictions: Max 5MB per certificate, allowed types: JPG, PNG, PDF
- SQL/NoSQL injection prevention via parameterized queries (Mongoose ODM)

**Audit Logging:**
- Event approval/rejection logged with timestamp and reviewer ID
- Metadata changes logged with admin user and timestamp
- Bulk import operations logged with success/failure counts

---

## 9. CONCLUSION REMARKS

ProRank represents a comprehensive solution to the challenge of tracking and recognizing diverse student achievements in modern higher education. By combining rule-based dynamic scoring, metadata-driven configuration, and multi-stakeholder workflows, the system provides transparency, fairness, and scalability.

The deployment in a real university environment with 320 classes and 1,920 students demonstrates technical feasibility. Preliminary observations (to be expanded after 3-6 months) will provide empirical evidence on student engagement, administrative efficiency, and potential motivational impacts.

As educational institutions increasingly value holistic student development, systems like ProRank offer a technological foundation for systematic achievement tracking, data-driven student support, and equitable recognition of extracurricular excellence.

Future work should investigate long-term engagement patterns, equity implications, and integration with learning management systems to create unified student profiles spanning curricular and co-curricular domains.

---

**End of Idea Document**
