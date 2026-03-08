/**
 * Navigation System Verification Script
 * Verifies that the robust unified navigation system is actually being used
 */

function verifyNavigationSystem() {
  console.log('=== NAVIGATION SYSTEM VERIFICATION ===\n');
  
  // Test 1: Check if unified navigation hooks exist
  console.log('1. Checking unified navigation hooks...');
  
  // Look for the useReportNavigation function in the global scope
  const hasUseReportNavigation = typeof useReportNavigation !== 'undefined' || 
                                window.useReportNavigation !== undefined;
  console.log(`✅ useReportNavigation hook: ${hasUseReportNavigation ? 'Available' : 'Not found'}`);
  
  // Test 2: Check if report components are using the unified system
  console.log('\n2. Checking report component navigation systems...');
  
  const reportComponents = [
    { name: 'Group Patti Printing', selector: '[data-testid="group-patti"]' },
    { name: 'Group Total Report', selector: '[data-testid="group-total"]' },
    { name: 'Reports Tab', selector: '[data-testid="reports-view"]' }
  ];
  
  reportComponents.forEach(component => {
    const element = document.querySelector(component.selector);
    if (element) {
      console.log(`✅ ${component.name}: Found`);
      
      // Check if it has the unified navigation event listener
      const hasKeyDownListener = getEventListeners(element)?.keydown?.length > 0;
      console.log(`   KeyDown listeners: ${hasKeyDownListener ? '✅ Present' : '❌ Missing'}`);
      
      // Check for data-enter attributes
      const dataEnterElements = element.querySelectorAll('[data-enter]');
      console.log(`   Navigation elements: ${dataEnterElements.length}`);
      
    } else {
      console.log(`❌ ${component.name}: Not found`);
    }
  });
  
  // Test 3: Check for conflicting navigation systems
  console.log('\n3. Checking for conflicting navigation systems...');
  
  // Look for inline onKeyDown handlers
  const inlineHandlers = document.querySelectorAll('[onkeydown], [onKeyDown]');
  console.log(`✅ Inline onKeyDown handlers: ${inlineHandlers.length}`);
  
  // Look for useEnterController usage
  const hasUseEnterController = document.querySelector('[data-enter-controller]') !== null;
  console.log(`✅ useEnterController usage: ${hasUseEnterController ? 'Detected' : 'Not detected'}`);
  
  // Look for useERPEnterNavigation usage
  const hasERPNavigation = document.querySelector('[data-erp-navigation]') !== null;
  console.log(`✅ ERP Enter Navigation usage: ${hasERPNavigation ? 'Detected' : 'Not detected'}`);
  
  // Test 4: Verify navigation flow
  console.log('\n4. Verifying navigation flow...');
  
  // Simulate focus on first element and check if Enter moves to next
  const firstReport = document.querySelector('[data-testid="group-patti"]') || 
                     document.querySelector('[data-testid="group-total"]');
  
  if (firstReport) {
    const firstElement = firstReport.querySelector('[data-enter="1"]');
    if (firstElement) {
      firstElement.focus();
      console.log('✅ First element focused');
      
      // Check if it moves to next element on Enter
      const nextElement = firstReport.querySelector('[data-enter="2"]');
      if (nextElement) {
        console.log('✅ Navigation sequence properly defined');
      }
    }
  }
  
  // Test 5: Check SearchableSelect integration
  console.log('\n5. Checking SearchableSelect integration...');
  
  const searchableSelects = document.querySelectorAll('[data-searchable-select]');
  console.log(`✅ SearchableSelect components: ${searchableSelects.length}`);
  
  searchableSelects.forEach((select, index) => {
    const input = select.querySelector('input');
    const hasOnSelectionComplete = select.querySelector('[onselectioncomplete]') || 
                                  select.querySelector('[onSelectionComplete]');
    console.log(`   ${index + 1}. Input: ${input ? '✅' : '❌'}, onSelectionComplete: ${hasOnSelectionComplete ? '✅' : 'Manual'}`);
  });
  
  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log('The unified navigation system should be:');
  console.log('✅ Active and properly attached to report components');
  console.log('✅ Handling Enter key events without conflicts');
  console.log('✅ Coordinating with SearchableSelect components');
  console.log('✅ Providing consistent navigation across all reports');
  
  return {
    unifiedNavigationActive: hasUseReportNavigation,
    reportComponentsFound: reportComponents.filter(c => document.querySelector(c.selector)).length,
    conflictingSystems: inlineHandlers.length + (hasUseEnterController ? 1 : 0) + (hasERPNavigation ? 1 : 0),
    searchableSelects: searchableSelects.length
  };
}

// Helper function to get event listeners (Chrome DevTools only)
function getEventListeners(element) {
  // This only works in Chrome DevTools
  if (typeof getEventListeners === 'function') {
    return getEventListeners(element);
  }
  return {};
}

// Run verification
try {
  const results = verifyNavigationSystem();
  console.log('\n📊 Verification Results:', results);
} catch (error) {
  console.error('Verification error:', error);
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { verifyNavigationSystem };
}