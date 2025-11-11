#!/bin/bash
set -euo pipefail

API_URL=${API_URL:-http://localhost:4000}
TOKEN=${TOKEN:-}

if [ -z "$TOKEN" ]; then
  echo "TOKEN environment variable is required (admin JWT)." >&2
  exit 1
fi

courses_data=$(cat <<'EOF'
B.Tech-CINTEL-Artificial Intelligence|B.Tech CINTEL Artificial Intelligence|BTECH-CINTEL|CINTEL|4
B.Tech-CINTEL-Computer Science And Engineering with Specialization in Artificial Intelligence and Machine Learning|B.Tech CINTEL CSE AI ML|BTECH-CINTEL|CINTEL|4
B.Tech-CINTEL-Computer Science And Engineering with Specialization in Software Engineering|B.Tech CINTEL CSE Software Engineering|BTECH-CINTEL|CINTEL|4
M.Tech-CINTEL-(Integrated) Artificial Intelligence|M.Tech CINTEL Integrated AI|MTECH-CINTEL|CINTEL|5
M.Tech-CINTEL-(Integrated) Computer Science And Engineering with Specialization in Cognitive Computing|M.Tech CINTEL Integrated CSE Cognitive Computing|MTECH-CINTEL|CINTEL|5
M.Tech-CINTEL-Artificial Intelligence (In collaboration with Great Learning)|M.Tech CINTEL AI (GL Collaboration)|MTECH-CINTEL|CINTEL|2
B.Tech-CTECH-Mathematics and Computing|B.Tech CTECH Mathematics and Computing|BTECH-CTECH|CTECH|4
B.Tech-CTECH-Computer Science and Engineering|B.Tech CTECH CSE|BTECH-CTECH|CTECH|4
M.Tech-CTECH-(Integrated) Computer Science and Engineering|M.Tech CTECH Integrated CSE|MTECH-CTECH|CTECH|5
M.Tech-CTECH-Computer Science and Engineering (In collaboration with Great Learning)|M.Tech CTECH CSE (GL Collaboration)|MTECH-CTECH|CTECH|2
M.Tech-CTECH-Computer science and Engineering with Specialization in Full Stack (In collaboration with Great Learning)|M.Tech CTECH CSE Full Stack (GL Collaboration)|MTECH-CTECH|CTECH|2
M.Tech-CTECH-Financial Technologies|M.Tech CTECH Financial Technologies|MTECH-CTECH|CTECH|2
B.Tech-NWC-Computer Science and Engineering (DevSecOps)|B.Tech NWC CSE DevSecOps|BTECH-NWC|NWC|4
B.Tech-NWC-Computer Science And Engineering with Specialization in Cloud Computing|B.Tech NWC CSE Cloud Computing|BTECH-NWC|NWC|4
B.Tech-NWC-Computer Science And Engineering with Specialization in Computer Networking|B.Tech NWC CSE Computer Networking|BTECH-NWC|NWC|4
B.Tech-NWC-Computer Science And Engineering with Specialization in Cyber Security|B.Tech NWC CSE Cyber Security|BTECH-NWC|NWC|4
B.Tech-NWC-Computer Science And Engineering with Specialization in Information Technology|B.Tech NWC CSE Information Technology|BTECH-NWC|NWC|4
B.Tech-NWC-Computer Science And Engineering with Specialization in Internet of Things|B.Tech NWC CSE Internet of Things|BTECH-NWC|NWC|4
M.Tech-NWC-(Integrated) Computer Science And Engineering with Specialization in Cyber Security and Digital Forensics|M.Tech NWC Integrated CSE Cyber Security and Digital Forensics|MTECH-NWC|NWC|5
M.Tech-NWC-Cloud Computing|M.Tech NWC Cloud Computing|MTECH-NWC|NWC|2
M.Tech-NWC-Cloud Computing and Block Chain (In collaboration with Great Learning)|M.Tech NWC Cloud Computing and Block Chain (GL Collaboration)|MTECH-NWC|NWC|2
M.Tech-NWC-Cyber Security (In collaboration with Great Learning)|M.Tech NWC Cyber Security (GL Collaboration)|MTECH-NWC|NWC|2
M.Tech-NWC-Information Security and Cyber Forensics|M.Tech NWC Information Security and Cyber Forensics|MTECH-NWC|NWC|2
M.Tech-NWC-Internet of Things|M.Tech NWC Internet of Things|MTECH-NWC|NWC|2
B.Tech-DSBS-Computer Science and Business Systems (In Collaboration with TCS)|B.Tech DSBS CSBS (TCS Collaboration)|BTECH-DSBS|DSBS|4
B.Tech-DSBS-Computer Science And Engineering (Data Science)|B.Tech DSBS CSE Data Science|BTECH-DSBS|DSBS|4
B.Tech-DSBS-Computer Science And Engineering with Specialization in Big Data Analytics|B.Tech DSBS CSE Big Data Analytics|BTECH-DSBS|DSBS|4
B.Tech-DSBS-Computer Science And Engineering with Specialization in Blockchain Technology|B.Tech DSBS CSE Blockchain Technology|BTECH-DSBS|DSBS|4
B.Tech-DSBS-Computer Science And Engineering with Specialization in Gaming Technology|B.Tech DSBS CSE Gaming Technology|BTECH-DSBS|DSBS|4
M.Tech-DSBS-(Integrated) Computer Science And Engineering with Specialization in Data Science|M.Tech DSBS Integrated CSE Data Science|MTECH-DSBS|DSBS|5
M.Tech-DSBS-Big Data Analytics (In collaboration with Great Learning)|M.Tech DSBS Big Data Analytics (GL Collaboration)|MTECH-DSBS|DSBS|2
M.Tech-DSBS-Data Engineering (In collaboration with Great Learning)|M.Tech DSBS Data Engineering (GL Collaboration)|MTECH-DSBS|DSBS|2
M.Tech-DSBS-Data Science (In collaboration with Great Learning)|M.Tech DSBS Data Science (GL Collaboration)|MTECH-DSBS|DSBS|2
EOF
)

IFS=$'\n'
for entry in $courses_data; do
  [ -z "$entry" ] && continue
  IFS='|' read -r code name program department span <<< "$entry"
  case "$span" in
    4) degreeType="BTECH" ;;
    5) degreeType="MTECH_INTEGRATED" ;;
    2) degreeType="MTECH" ;;
    *)
      echo "Unsupported duration $span for course $code" >&2
      continue
      ;;
  esac
  echo "Seeding course $code..."
  curl -s -X POST "$API_URL/api/metadata/courses" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"code\":\"$code\",\"name\":\"$name\",\"displayName\":\"$name\",\"degreeType\":\"$degreeType\",\"departmentCode\":\"$department\",\"durationYears\":$span}" \
    | sed '/^$/d'
  echo ""
done
