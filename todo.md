<!-- Create the modal to show certificate new the pdf proof  -->


<!-- #teacher profile -> class assigned should be section name -->

<!-- #teacher profile remove Teacher ID from bottom -->

<!-- #student dashboard ->upcoming events backbutton -->

<!-- #teacher dashboard events list Invalid Date -->

<!-- homepage edit it -->

<!-- HOD MAM add year filter -->

<!-- add review comments -->

from teacher class list when we click a students view event it takes to the page but the problem is when we click back it comes to dashboard and not class list

<!-- student upcoming event back button  -->
and update the ui

<!-- upcoming event navigate correctly in student dashboard -->

<!-- hod profile page do same format as student/teacher profile -->

<!-- password show/hide icon -->

<!-- #add upcoming evnts for faculty also  -->


CHANGE GIT
AkhilAndroid to A Akhil
Revanth Rev0212


20 March:
Revanth A Observation In Reports Page:

1. Need to check the download of Reports
<!-- 2. Need to check the inactive students -->
<!-- 3. There are class Name Coming 2 Times Need to fix that -->
<!-- 4. Class Activity Summary Table Department Column must be removed -->

Revanth A Observation In HoD Dashboard

1. Need to optimise it for mobile view
<!-- 2. Need year filter in All Classses in all classes overview -->
<!-- 3. The Points is not comming for students in (Class View) -->
4. Add pagination


21 March:
Revanth A Observations 
<!-- 1. Leaderboard Yearwise,Department wise Filer(backend) - Fixed -->
<!-- 2. Have the LeftDashboard Constant in all pages -->
<!-- 3. Remove Back to Dashboard -->
<!-- 4. Make the Profile Page Similar to HOD Profile Page -->

22 March:
<!-- 1. Add a file size limit -->
2. Add PDF back to event
<!-- 3. Teacherdashboard class list Unauthorized -->



<!-- inactive students UI -->
<!-- 
Apply Similar Updates to All Report Methods
You'll need to apply the department filtering approach to all other report methods: -->

<!-- getTopStudents -->
<!-- getPopularCategories -->
<!-- getClassPerformance -->
<!-- getApprovalRates
getCategoryPerformanceByClass
getTrends
getClassParticipation -->


10 Apr

Right to modify the enum (add remove update the catogory)
Create the points calculation
Update the admin frontend
if incase the admin changes the point table in must reflect for the past events where students have already secured the points
    my plan is example
        if event x secured position's points has been changed
            go to event table find all the events of it update the respective points in events and update the students +- of his total points



academic advisor report page year filter remove (if advisor remove the filter if hod keep the filter)

now hod year filter is not working 

only when clicked on that its coming
    reason first it pushes the assgined class report to report page so all reports come in report page need to change that behaviour


Event form in student portal:
1. date - year going till 6 digits limit to 4 (only working in global certificates)
2. event type if individual limit team size to 1



MongoDB server
Edit your MongoDB config file (usually at /etc/mongod.conf
replication:
  replSetName: "rs0"

FUTURE UPDATES
HOD, chair mam can ask question to student, so if she wanna ask question to whole department, class or even sepeate couse
    1 - CHAIRMAM all 4 department 
    2 associate
        1- 2 department
        2- 2 department




check 
Untapped Categories in FA report