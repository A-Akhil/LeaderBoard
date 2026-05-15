const axios = require('axios');
require('dotenv').config({ path: '.env' });

const BASE_URL = process.env.VITE_BASE_URL || 'http://localhost:4000';
// Using a predefined admin token instead of logging in
const adminToken = process.env.ADMIN_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2N2Y3NmRmOWY4NGE1ZWMxYzBkYjVlN2EiLCJpYXQiOjE3NDQzNzg4MDksImV4cCI6MTc0NDQ2NTIwOX0.aShsCrNa6wgBlwLBmwwYjKAF0sdxvQyrnAvNYRsp1Qg';

// Category-specific form configurations based on marking scheme
const categoryConfigs = {
  'Hackathon': {
    requiredFields: ['eventName', 'date', 'description', 'positionSecured', 'eventScope', 'eventOrganizer', 'participationType'],
    optionalFields: ['teamName', 'teamSize', 'priceMoney', 'eventLocation'],
    proofConfig: {
      requireCertificateImage: true,
      requirePdfProof: false,
      maxCertificateSize: 5,
      allowMultipleCertificates: true
    }
  },
  
  'Coding': {
    requiredFields: ['eventName', 'date', 'description', 'positionSecured', 'platform', 'resultPercentile'],
    optionalFields: ['eventScope', 'eventType'],
    proofConfig: {
      requireCertificateImage: true,
      requirePdfProof: false,
      maxCertificateSize: 5,
      allowMultipleCertificates: false
    },
    customQuestions: [
      {
        id: 'coding_platform',
        text: 'Which coding platform did you participate on?',
        type: 'singleChoice',
        required: true,
        options: ['CodeForces', 'AtCoder', 'LeetCode', 'HackerRank', 'GeeksForGeeks', 'Other']
      },
      {
        id: 'percentile_rank',
        text: 'What percentile rank did you achieve?',
        type: 'singleChoice',
        required: true,
        options: ['Top 1%', 'Top 5%', 'Top 10%', 'Other']
      }
    ]
  },
  
  'Open Source': {
    requiredFields: ['eventName', 'date', 'description', 'githubRepoUrl'],
    optionalFields: ['contributionType'],
    proofConfig: {
      requireCertificateImage: false,
      requirePdfProof: false,
      maxCertificateSize: 5,
      allowMultipleCertificates: false
    },
    customQuestions: [
      {
        id: 'repo_forks',
        text: 'How many forks does the repository have?',
        type: 'singleChoice',
        required: true,
        options: ['More than 1000 forks', '500-1000 forks', 'Less than 500 forks']
      },
      {
        id: 'pr_status',
        text: 'What is the status of your pull request?',
        type: 'singleChoice',
        required: true,
        options: ['Merged', 'Still Open']
      },
      {
        id: 'contribution_type',
        text: 'What type of contribution did you make?',
        type: 'singleChoice',
        required: true,
        options: ['Feature', 'Bug Fix', 'Documentation']
      },
      {
        id: 'lines_of_code',
        text: 'Approximately how many lines of code did you contribute?',
        type: 'text',
        required: false
      },
      {
        id: 'pr_count',
        text: 'How many PRs did you contribute to this project?',
        type: 'text',
        required: false
      }
    ]
  },
  
  'Research': {
    requiredFields: ['eventName', 'date', 'description'],
    optionalFields: ['eventScope'],
    proofConfig: {
      requireCertificateImage: false,
      requirePdfProof: true,
      maxPdfSize: 15,
      allowMultipleCertificates: false
    },
    customQuestions: [
      {
        id: 'publisher',
        text: 'Which publisher published your paper?',
        type: 'singleChoice',
        required: true,
        options: ['IEEE/Springer/Elsevier', 'UGC Listed', 'Others']
      },
      {
        id: 'authorship',
        text: 'What was your authorship position?',
        type: 'singleChoice',
        required: true,
        options: ['1st Author', 'Co-author']
      },
      {
        id: 'paper_type',
        text: 'What type of paper did you publish?',
        type: 'singleChoice',
        required: true,
        options: ['Research', 'Review/Survey']
      },
      {
        id: 'event_type',
        text: 'What was the presentation type?',
        type: 'singleChoice',
        required: true,
        options: ['Conference Presentation', 'Poster Presentation']
      },
      {
        id: 'conference_level',
        text: 'What was the level of the conference?',
        type: 'singleChoice',
        required: true,
        options: ['International', 'National']
      }
    ]
  },
  
  'Global-Certificates': {
    requiredFields: ['eventName', 'date', 'description', 'issuer'],
    optionalFields: [],
    proofConfig: {
      requireCertificateImage: true,
      requirePdfProof: false,
      maxCertificateSize: 5,
      allowMultipleCertificates: false
    },
    customQuestions: [
      {
        id: 'provider',
        text: 'Who is the certification provider?',
        type: 'singleChoice',
        required: true,
        options: ['Stanford/MIT/AWS/Google/Top 500 company', 'NPTEL', 'Coursera/Udemy', 'Other']
      },
      {
        id: 'duration',
        text: 'What was the duration of the certification?',
        type: 'singleChoice',
        required: true,
        options: ['Less than 4 weeks', '4-8 weeks', 'More than 8 weeks']
      },
      {
        id: 'final_project',
        text: 'Did the certification require a final project?',
        type: 'singleChoice',
        required: true,
        options: ['Yes', 'No']
      },
      {
        id: 'cert_level',
        text: 'What is the certification level?',
        type: 'singleChoice',
        required: true,
        options: ['Beginner', 'Intermediate', 'Advanced']
      }
    ]
  },
  
  'NCC-NSS': {
    requiredFields: ['eventName', 'date', 'description'],
    optionalFields: [],
    proofConfig: {
      requireCertificateImage: true,
      requirePdfProof: false,
      maxCertificateSize: 5,
      allowMultipleCertificates: true
    },
    customQuestions: [
      {
        id: 'camps_attended',
        text: 'Which camps have you attended?',
        type: 'singleChoice',
        required: true,
        options: ['RDC/TSC', 'NIC', 'CATC, ATC', 'None']
      },
      {
        id: 'rank',
        text: 'What is your rank?',
        type: 'singleChoice',
        required: true,
        options: ['SUO', 'JUO', 'Other/None']
      },
      {
        id: 'volunteer_hours',
        text: 'How many volunteer hours have you completed?',
        type: 'singleChoice',
        required: true,
        options: ['50+', '100+', '200+', 'Less than 50']
      }
    ]
  },
  
  'Sports': {
    requiredFields: ['eventName', 'date', 'description', 'positionSecured', 'eventScope'],
    optionalFields: ['eventLocation'],
    proofConfig: {
      requireCertificateImage: true,
      requirePdfProof: false,
      maxCertificateSize: 5,
      allowMultipleCertificates: true
    },
    customQuestions: [
      {
        id: 'sport_type',
        text: 'Is this an individual or team sport?',
        type: 'singleChoice',
        required: true,
        options: ['Individual Sport', 'Team Sport']
      }
    ]
  },
  
  'Workshop': {
    requiredFields: ['eventName', 'date', 'description'],
    optionalFields: ['eventLocation', 'eventOrganizer'],
    proofConfig: {
      requireCertificateImage: true,
      requirePdfProof: false,
      maxCertificateSize: 5,
      allowMultipleCertificates: false
    },
    customQuestions: [
      {
        id: 'workshop_duration',
        text: 'What was the duration of the workshop?',
        type: 'singleChoice',
        required: true,
        options: ['Less than 1 day', '1 full day', '2+ days']
      },
      {
        id: 'workshop_role',
        text: 'Were you an attendee or did you conduct the workshop?',
        type: 'singleChoice',
        required: true,
        options: ['Attendee', 'Conducted Workshop']
      },
      {
        id: 'industry_organizer',
        text: 'Was the workshop organized by an industry partner?',
        type: 'singleChoice',
        required: true,
        options: ['Yes (Google, Microsoft, etc.)', 'No']
      }
    ]
  },
  
  'Leadership': {
    requiredFields: ['eventName', 'date', 'description'],
    optionalFields: ['eventLocation'],
    proofConfig: {
      requireCertificateImage: true,
      requirePdfProof: false,
      maxCertificateSize: 5,
      allowMultipleCertificates: true
    },
    customQuestions: [
      {
        id: 'leadership_role',
        text: 'What was your role?',
        type: 'singleChoice',
        required: true,
        options: ['Club President', 'Secretary / Event Lead', 'Member / Core Team']
      },
      {
        id: 'events_managed',
        text: 'How many participants were in the events you managed?',
        type: 'singleChoice',
        required: true,
        options: ['Less than 50 participants', '50-100 participants', '100+ participants']
      },
      {
        id: 'event_series',
        text: 'Did you organize a series of events?',
        type: 'singleChoice',
        required: true,
        options: ['Yes', 'No']
      },
      {
        id: 'event_count',
        text: 'How many events did you organize in the series?',
        type: 'text',
        required: false
      }
    ]
  },
  
  'Social Work': {
    requiredFields: ['eventName', 'date', 'description'],
    optionalFields: ['eventLocation'],
    proofConfig: {
      requireCertificateImage: true,
      requirePdfProof: false,
      maxCertificateSize: 5,
      allowMultipleCertificates: true
    },
    customQuestions: [
      {
        id: 'activity_type',
        text: 'What type of social work activity did you perform?',
        type: 'singleChoice',
        required: true,
        options: ['Plantation / Cleanup Drive', 'Education / NGO Teaching', 'Health / Disaster Relief']
      },
      {
        id: 'hours_invested',
        text: 'How many hours did you invest in this activity?',
        type: 'singleChoice',
        required: true,
        options: ['20-50 hours', '50-100 hours', '100+ hours']
      }
    ]
  }
};

async function getCategories() {
  console.log('📋 Fetching categories...');
  try {
    const response = await axios.get(`${BASE_URL}/admin/config/type/category`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.data.success) {
      console.log(`✅ Found ${response.data.data.values.length} categories`);
      return response.data.data.values;
    } else {
      console.error('❌ Failed to fetch categories:', response.data.message);
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching categories:', error.message);
    return [];
  }
}

async function updateCategoryConfig(category, config) {
  console.log(`📝 Configuring form fields for category: ${category}`);
  try {
    const response = await axios.put(
      `${BASE_URL}/admin/config/form-fields/${category}`,
      config,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      console.log(`✅ Successfully configured ${category}`);
      return true;
    } else {
      console.error(`❌ Failed to configure ${category}:`, response.data.message);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error configuring ${category}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting category form configuration');
  
  // No need to login, using predefined token
  console.log('🔑 Using predefined admin token for configuration');
  
  // Get all categories from database
  const categories = await getCategories();
  if (categories.length === 0) {
    console.error('No categories found in database');
    process.exit(1);
  }
  
  // Configure each category
  for (const category of categories) {
    // Check if we have a predefined config for this category
    if (categoryConfigs[category]) {
      console.log(`📌 Found predefined config for ${category}`);
      const success = await updateCategoryConfig(category, categoryConfigs[category]);
      if (success) {
        console.log(`🎉 ${category} configuration updated successfully`);
      }
    } else {
      console.log(`⚠️ No predefined config for ${category}, skipping...`);
    }
  }
  
  console.log('✨ Category form configuration completed');
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});