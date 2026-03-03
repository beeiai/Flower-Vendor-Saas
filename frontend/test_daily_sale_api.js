// Test script to verify Daily Sale API endpoints
const API_BASE = localStorage.getItem('skfs_api_url') || 'http://localhost:8000/api';

async function testEndpoints() {
  console.log('Testing Daily Sale endpoints...');
  console.log('API Base:', API_BASE);
  
  try {
    // Test groups endpoint
    console.log('\n1. Testing /farmer-groups/...');
    const groupsResponse = await fetch(`${API_BASE}/farmer-groups/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    console.log('Groups status:', groupsResponse.status);
    if (groupsResponse.ok) {
      const groups = await groupsResponse.json();
      console.log('Groups count:', groups.length);
      console.log('Groups:', groups);
    }
    
    // Test customers endpoint
    console.log('\n2. Testing /farmers/...');
    const customersResponse = await fetch(`${API_BASE}/farmers/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    console.log('Customers status:', customersResponse.status);
    if (customersResponse.ok) {
      const customers = await customersResponse.json();
      console.log('Customers count:', customers.length);
    }
    
    // Test items endpoint
    console.log('\n3. Testing /reports/daily-sales/items...');
    const itemsResponse = await fetch(`${API_BASE}/reports/daily-sales/items`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    console.log('Items status:', itemsResponse.status);
    if (itemsResponse.ok) {
      const items = await itemsResponse.json();
      console.log('Items count:', items.length);
      console.log('Items:', items);
    } else {
      console.error('Items endpoint failed! Status:', itemsResponse.status);
      const errorText = await itemsResponse.text();
      console.error('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testEndpoints();
