/**
 * Final Navigation System Test
 * Comprehensive test to ensure the unified navigation system is working properly
 */

function testUnifiedNavigation() {
  console.log('=== FINAL NAVIGATION SYSTEM TEST ===\n');
  
  // Test 1: Verify the unified navigation hooks are available
  console.log('1. Testing unified navigation hooks availability...');
  
  // Since we can't directly access the React hooks from browser console,
  // we'll test the functionality by checking the DOM structure and behavior
  
  const testResults = {
    hooksAvailable: true,
    reportComponents: 0,
    navigationElements: 0,
    dataEnterAttributes: 0,
    searchableSelects: 0,
    navigationWorking: false
  };
  
  // Test 2: Check report components structure
  console.log('\n2. Checking report components structure...');
  
  const reportComponents = [
    { name: 'Group Patti Printing', selector: '[data-testid="group-patti"]' },
    { name: 'Group Total Report', selector: '[data-testid="group-total"]' },
    { name: 'Reports Tab', selector: '[data-testid="reports-view"]' }
  ];
  
  reportComponents.forEach(component => {
    const element = document.querySelector(component.selector);
    if (element) {
      testResults.reportComponents++;
      console.log(`✅ ${component.name}: Found`);
      
      // Count data-enter elements
      const dataEnterElements = element.querySelectorAll('[data-enter]');
      testResults.dataEnterAttributes += dataEnterElements.length;
      console.log(`   Navigation elements: ${dataEnterElements.length}`);
      
      // Check for proper structure
      const hasContainerRef = element.hasAttribute('ref');
      console.log(`   Has container reference: ${hasContainerRef ? '✅' : '❌'}`);
      
    } else {
      console.log(`❌ ${component.name}: Not found`);
    }
  });
  
  // Test 3: Check SearchableSelect components
  console.log('\n3. Checking SearchableSelect components...');
  
  const searchableSelects = document.querySelectorAll('[data-searchable-select]');
  testResults.searchableSelects = searchableSelects.length;
  console.log(`✅ Found ${searchableSelects.length} SearchableSelect components`);
  
  // Test 4: Test actual navigation behavior
  console.log('\n4. Testing navigation behavior...');
  
  // Find the first report component
  const firstReport = document.querySelector('[data-testid="group-patti"]') || 
                     document.querySelector('[data-testid="group-total"]');
  
  if (firstReport) {
    // Find the first navigable element
    const firstElement = firstReport.querySelector('[data-enter="1"]');
    if (firstElement) {
      console.log('✅ First navigation element found');
      
      // Test focus
      firstElement.focus();
      const isFocused = document.activeElement === firstElement;
      console.log(`✅ Element focused: ${isFocused ? 'Yes' : 'No'}`);
      
      // Test navigation to next element (simulated)
      const nextElement = firstReport.querySelector('[data-enter="2"]');
      if (nextElement) {
        console.log('✅ Navigation sequence properly defined');
        testResults.navigationWorking = true;
      }
    } else {
      console.log('❌ First navigation element not found');
    }
  } else {
    console.log('❌ No report components found for testing');
  }
  
  // Test 5: Check for conflicting systems
  console.log('\n5. Checking for conflicting navigation systems...');
  
  // Look for inline onKeyDown handlers in report components
  const reportContainers = document.querySelectorAll('[data-testid^="group-"]');
  let conflictingHandlers = 0;
  
  reportContainers.forEach(container => {
    const inlineHandlers = container.querySelectorAll('[onkeydown], [onKeyDown]');
    conflictingHandlers += inlineHandlers.length;
  });
  
  console.log(`✅ Conflicting inline handlers in reports: ${conflictingHandlers}`);
  
  // Test 6: Verify data-enter attributes are properly ordered
  console.log('\n6. Verifying navigation sequence...');
  
  if (firstReport) {
    const orderedElements = [];
    for (let i = 1; i <= 10; i++) {
      const element = firstReport.querySelector(`[data-enter="${i}"]`);
      if (element) {
        orderedElements.push({
          index: i,
          element: element.tagName,
          type: element.getAttribute('data-enter-type') || 'unknown'
        });
      } else {
        break;
      }
    }
    
    console.log('Navigation sequence:');
    orderedElements.forEach(item => {
      console.log(`   ${item.index}. ${item.element} (${item.type})`);
    });
    
    testResults.navigationElements = orderedElements.length;
  }
  
  // Final Results
  console.log('\n=== TEST RESULTS ===');
  console.log(`Report Components: ${testResults.reportComponents}/3`);
  console.log(`Navigation Elements: ${testResults.navigationElements}`);
  console.log(`Data-enter Attributes: ${testResults.dataEnterAttributes}`);
  console.log(`SearchableSelect Components: ${testResults.searchableSelects}`);
  console.log(`Navigation Working: ${testResults.navigationWorking ? '✅' : '❌'}`);
  console.log(`Conflicting Handlers: ${conflictingHandlers === 0 ? '✅ None' : `❌ ${conflictingHandlers} found`}`);
  
  const overallPass = 
    testResults.reportComponents >= 2 && 
    testResults.navigationElements >= 4 && 
    testResults.dataEnterAttributes >= 8 && 
    testResults.navigationWorking &&
    conflictingHandlers === 0;
  
  console.log(`\n🎯 Overall Test Result: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!overallPass) {
    console.log('\n🔧 Troubleshooting steps:');
    if (testResults.reportComponents < 2) {
      console.log('   - Check if report components are being rendered');
    }
    if (testResults.navigationElements < 4) {
      console.log('   - Verify data-enter attributes are properly set');
    }
    if (!testResults.navigationWorking) {
      console.log('   - Check if the navigation hook is properly attached');
    }
    if (conflictingHandlers > 0) {
      console.log('   - Remove conflicting onKeyDown handlers');
    }
  }
  
  return testResults;
}

// Run the test
try {
  const results = testUnifiedNavigation();
  console.log('\n📊 Final Test Results:', results);
} catch (error) {
  console.error('Test execution error:', error);
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testUnifiedNavigation };
}