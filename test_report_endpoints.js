// Test script to verify report endpoints are working
const API_BASE = 'https://flower-saas-backend-4th7.onrender.com/api';

async function testEndpoint(endpoint, description) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      console.log(`✅ ${description}: ${response.status}`);
      return true;
    } else {
      console.log(`❌ ${description}: ${response.status} - ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: Network error - ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('Testing Report Endpoints...\n');
  
  const tests = [
    { endpoint: '/reports/daily-sales/?from_date=2026-03-02&to_date=2026-03-03&format=json', description: 'Daily Sales Report' },
    { endpoint: '/reports/group-total-by-group/?start_date=2026-03-03&end_date=2026-03-03&group_name=kmp&format=html', description: 'Group Total By Group' },
    { endpoint: '/reports/group-patti/1/?from_date=2026-03-03&to_date=2026-03-03&format=html', description: 'Group Patti Report' },
    { endpoint: '/reports/group-total/?from_date=2026-03-03&to_date=2026-03-03&format=html', description: 'Group Total Report' },
  ];
  
  let passed = 0;
  for (const test of tests) {
    const result = await testEndpoint(test.endpoint, test.description);
    if (result) passed++;
  }
  
  console.log(`\n${passed}/${tests.length} tests passed`);
}

runTests();
