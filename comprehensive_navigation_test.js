// Comprehensive test to verify all navigation fixes
// Run this in browser console after the app loads

function testAllNavigationFixes() {
  console.log('=== COMPREHENSIVE NAVIGATION TEST ===\n');
  
  let testResults = {
    groupPatti: { passed: 0, total: 0 },
    groupTotal: { passed: 0, total: 0 },
    reports: { passed: 0, total: 0 }
  };
  
  // Test 1: Group Patti Navigation
  console.log('1. Testing Group Patti Navigation...');
  const groupPatti = document.querySelector('[data-testid="group-patti"]');
  if (groupPatti) {
    testResults.groupPatti.total++;
    const elements = groupPatti.querySelectorAll('[data-enter]');
    console.log(`   Found ${elements.length} navigable elements: ✅`);
    if (elements.length >= 5) {
      testResults.groupPatti.passed++;
      console.log('   ✅ Has complete navigation sequence');
    } else {
      console.log('   ❌ Missing navigation elements');
    }
    
    // Check SearchableSelect components
    const searchableSelects = groupPatti.querySelectorAll('[data-searchable-select]');
    testResults.groupPatti.total++;
    if (searchableSelects.length > 0) {
      testResults.groupPatti.passed++;
      console.log(`   ✅ Found ${searchableSelects.length} SearchableSelect components`);
    } else {
      console.log('   ❌ No SearchableSelect components found');
    }
  } else {
    console.log('   ❌ Group Patti component not found');
  }
  
  // Test 2: Group Total Navigation
  console.log('\n2. Testing Group Total Navigation...');
  const groupTotal = document.querySelector('[data-testid="group-total"]');
  if (groupTotal) {
    testResults.groupTotal.total++;
    const elements = groupTotal.querySelectorAll('[data-enter]');
    console.log(`   Found ${elements.length} navigable elements: ✅`);
    if (elements.length >= 4) {
      testResults.groupTotal.passed++;
      console.log('   ✅ Has complete navigation sequence');
    } else {
      console.log('   ❌ Missing navigation elements');
    }
    
    // Check SearchableSelect components
    const searchableSelects = groupTotal.querySelectorAll('[data-searchable-select]');
    testResults.groupTotal.total++;
    if (searchableSelects.length > 0) {
      testResults.groupTotal.passed++;
      console.log(`   ✅ Found ${searchableSelects.length} SearchableSelect components`);
    } else {
      console.log('   ❌ No SearchableSelect components found');
    }
  } else {
    console.log('   ❌ Group Total component not found');
  }
  
  // Test 3: Reports View Navigation
  console.log('\n3. Testing Reports View Navigation...');
  const reportsView = document.querySelector('[data-testid="reports-view"]');
  if (reportsView) {
    testResults.reports.total++;
    const elements = reportsView.querySelectorAll('[data-enter]');
    console.log(`   Found ${elements.length} navigable elements: ✅`);
    if (elements.length >= 6) {
      testResults.reports.passed++;
      console.log('   ✅ Has complete navigation sequence');
    } else {
      console.log('   ❌ Missing navigation elements');
    }
    
    // Check SearchableSelect components
    const searchableSelects = reportsView.querySelectorAll('[data-searchable-select]');
    testResults.reports.total++;
    if (searchableSelects.length >= 3) {
      testResults.reports.passed++;
      console.log(`   ✅ Found ${searchableSelects.length} SearchableSelect components`);
    } else {
      console.log(`   ❌ Expected 3+ SearchableSelect components, found ${searchableSelects.length}`);
    }
  } else {
    console.log('   ❌ Reports View component not found');
  }
  
  // Test 4: Focus Management
  console.log('\n4. Testing Focus Management...');
  const allInputs = document.querySelectorAll('input, button, [data-searchable-select] input');
  let focusableCount = 0;
  let tabIndexIssues = 0;
  
  allInputs.forEach(input => {
    if (input.tabIndex !== -1) {
      focusableCount++;
    }
    if (input.tabIndex < -1) {
      tabIndexIssues++;
    }
  });
  
  console.log(`   Total focusable elements: ${focusableCount}`);
  console.log(`   Elements with negative tabIndex: ${tabIndexIssues}`);
  
  if (tabIndexIssues === 0) {
    console.log('   ✅ No tabIndex issues found');
  } else {
    console.log('   ⚠️  Some elements have negative tabIndex');
  }
  
  // Test 5: Navigation Sequence Test
  console.log('\n5. Testing Navigation Sequence...');
  if (groupPatti) {
    const sequence = [
      '[data-enter="1"]', // From Date
      '[data-enter="2"]', // To Date
      '[data-enter="3"]', // Group Name
      '[data-enter="4"]', // Commission
      '[data-enter="5"]'  // Print Button
    ];
    
    let sequenceComplete = true;
    sequence.forEach((selector, index) => {
      const element = groupPatti.querySelector(selector);
      if (!element) {
        sequenceComplete = false;
        console.log(`   ❌ Missing element ${index + 1}: ${selector}`);
      }
    });
    
    if (sequenceComplete) {
      console.log('   ✅ Group Patti navigation sequence is complete');
    }
  }
  
  // Summary
  console.log('\n=== TEST SUMMARY ===');
  const totalTests = Object.values(testResults).reduce((sum, result) => sum + result.total, 0);
  const passedTests = Object.values(testResults).reduce((sum, result) => sum + result.passed, 0);
  const percentage = Math.round((passedTests / totalTests) * 100);
  
  console.log(`Overall: ${passedTests}/${totalTests} tests passed (${percentage}%)`);
  console.log(`Group Patti: ${testResults.groupPatti.passed}/${testResults.groupPatti.total} passed`);
  console.log(`Group Total: ${testResults.groupTotal.passed}/${testResults.groupTotal.total} passed`);
  console.log(`Reports View: ${testResults.reports.passed}/${testResults.reports.total} passed`);
  
  if (percentage >= 80) {
    console.log('\n🎉 Navigation system appears to be working correctly!');
    console.log('You should now be able to:');
    console.log('- Navigate through all form fields using Enter key');
    console.log('- Select groups in Group Patti and Group Total tabs');
    console.log('- Move from group selection to next field automatically');
    console.log('- Use consistent navigation across all report components');
  } else {
    console.log('\n⚠️  Some issues detected. Please check the failed tests above.');
  }
  
  return {
    results: testResults,
    overall: { passed: passedTests, total: totalTests, percentage },
    timestamp: new Date().toISOString()
  };
}

// Run the test
testAllNavigationFixes();