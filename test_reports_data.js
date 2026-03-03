/**
 * Test script to verify report data fetching fixes
 * Run this after deploying to Render
 */

const API_BASE = 'https://flower-saas-backend-4th7.onrender.com/api';

// You'll need to replace this with a real token after login
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
};

async function testDailySalesReport() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Daily Sales Report');
  console.log('='.repeat(60));
  
  const fromDate = '2026-03-01';
  const toDate = '2026-03-03';
  
  try {
    const url = `${API_BASE}/reports/daily-sales?from_date=${fromDate}&to_date=${toDate}&format=json`;
    console.log(`URL: ${url}`);
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Response received');
    console.log(`   - Data entries: ${data.data?.length || 0}`);
    console.log(`   - Has metadata: ${!!data.metadata}`);
    
    if (data.data && data.data.length > 0) {
      const firstEntry = data.data[0];
      console.log('\n   Sample entry:');
      console.log(`     - Date: ${firstEntry.date}`);
      console.log(`     - Party: ${firstEntry.party}`);
      console.log(`     - Item: ${firstEntry.item}`);
      console.log(`     - Qty: ${firstEntry.qty}`);
      console.log(`     - Rate: ${firstEntry.rate}`);
      console.log(`     - Luggage: ${firstEntry.luggage}`);
      console.log(`     - Coolie: ${firstEntry.coolie}`);
      
      // Verify critical fields are present
      const requiredFields = ['date', 'vehicle', 'party', 'item', 'qty', 'rate', 'luggage', 'coolie'];
      const missingFields = requiredFields.filter(field => !(field in firstEntry));
      
      if (missingFields.length > 0) {
        console.log(`\n⚠️  WARNING: Missing fields: ${missingFields.join(', ')}`);
      } else {
        console.log(`\n✅ All required fields present`);
      }
    } else {
      console.log('⚠️  No data returned for date range');
    }
    
    return true;
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testGroupTotalReport() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Group Total Report (All Groups)');
  console.log('='.repeat(60));
  
  const fromDate = '2026-03-01';
  const toDate = '2026-03-03';
  
  try {
    const url = `${API_BASE}/reports/group-total?from_date=${fromDate}&to_date=${toDate}&format=json`;
    console.log(`URL: ${url}`);
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Response received');
    console.log(`   - Has HTML: ${!!data.html}`);
    console.log(`   - Has metadata: ${!!data.metadata}`);
    
    if (data.metadata) {
      console.log(`   - Record count: ${data.metadata.record_count}`);
      console.log(`   - Page count: ${data.metadata.page_count}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testGroupTotalByGroup() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Group Total By Group (Specific Group)');
  console.log('='.repeat(60));
  
  const groupName = 'kmp'; // Replace with actual group name from your system
  const fromDate = '2026-03-01';
  const toDate = '2026-03-03';
  
  try {
    const url = `${API_BASE}/reports/group-total-by-group?group_name=${groupName}&start_date=${fromDate}&end_date=${toDate}&format=json`;
    console.log(`URL: ${url}`);
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Response received');
    console.log(`   - Has HTML: ${!!data.html}`);
    console.log(`   - Has metadata: ${!!data.metadata}`);
    console.log(`   - Group name: ${data.metadata?.group_name}`);
    
    return true;
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    console.log('   Note: Make sure to use a valid group_name from your system');
    return false;
  }
}

async function testSMSSend() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: SMS Send Endpoint');
  console.log('='.repeat(60));
  
  const testPhone = '+919876543210'; // Replace with test number
  const testMessage = 'Test message from Flower Saas API';
  
  try {
    const url = `${API_BASE}/sms/send`;
    console.log(`URL: ${url}`);
    console.log(`Payload: { phone: "${testPhone}", message: "${testMessage}" }`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        phone: testPhone,
        message: testMessage
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Response received');
    console.log(`   - Success: ${data.success || false}`);
    console.log(`   - Message ID: ${data.message_id || 'N/A'}`);
    
    return true;
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    console.log('   Note: SMS may fail if Twilio not configured');
    return false;
  }
}

async function runAllTests() {
  console.log('\n' + '🔍'.repeat(30));
  console.log('REPORT DATA FETCHING VERIFICATION TESTS');
  console.log('🔍'.repeat(30));
  console.log(`\nBackend URL: ${API_BASE}`);
  console.log(`Test Date: ${new Date().toISOString()}`);
  console.log('\n⚠️  IMPORTANT: Replace AUTH_TOKEN with your actual JWT token\n');
  
  const results = {
    dailySales: await testDailySalesReport(),
    groupTotal: await testGroupTotalReport(),
    groupTotalByGroup: await testGroupTotalByGroup(),
    smsSend: await testSMSSend()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  console.log(`\nResults: ${passed}/${total} tests passed\n`);
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').trim();
    console.log(`${icon} ${testName}`);
  });
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Reports should be working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check errors above and verify:');
    console.log('   1. Backend is deployed with latest code');
    console.log('   2. JWT token is valid and not expired');
    console.log('   3. Database has data for selected date ranges');
    console.log('   4. SMS service (Twilio) is properly configured');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// Run the tests
runAllTests().catch(console.error);
