// Debug script to identify navigation issues
// Run this in browser console to diagnose problems

function debugNavigationIssues() {
  console.log('=== DEBUGGING NAVIGATION ISSUES ===\n');
  
  // Test 1: Check if unified navigation is active
  console.log('1. Checking unified navigation system...');
  const hasUseReportNavigation = typeof window.useReportNavigation !== 'undefined';
  console.log(`useReportNavigation hook available: ${hasUseReportNavigation ? '✅' : '❌'}`);
  
  // Test 2: Check report components
  console.log('\n2. Checking report components...');
  const reportComponents = [
    { name: 'Group Patti', selector: '[data-testid="group-patti"]' },
    { name: 'Group Total', selector: '[data-testid="group-total"]' },
    { name: 'Reports View', selector: '[data-testid="reports-view"]' }
  ];
  
  reportComponents.forEach(comp => {
    const element = document.querySelector(comp.selector);
    console.log(`   ${comp.name}: ${element ? '✅ Found' : '❌ Not found'}`);
    if (element) {
      console.log(`     - Has data-enter attributes: ${element.querySelectorAll('[data-enter]').length > 0 ? '✅' : '❌'}`);
      console.log(`     - Has SearchableSelect: ${element.querySelectorAll('[data-searchable-select]').length > 0 ? '✅' : '❌'}`);
    }
  });
  
  // Test 3: Check current focus and navigation elements
  console.log('\n3. Checking current focus state...');
  const activeElement = document.activeElement;
  console.log(`   Currently focused element:`, activeElement?.tagName, activeElement?.className);
  
  if (activeElement?.closest('[data-searchable-select]')) {
    console.log('   ✅ Focus is on a SearchableSelect component');
    const container = activeElement.closest('[data-searchable-select]');
    const hasOnSelectionComplete = container.querySelector('[onselectioncomplete]') || 
                                  container.querySelector('[onSelectionComplete]');
    console.log(`   - Has onSelectionComplete handler: ${hasOnSelectionComplete ? '✅' : '❌'}`);
  }
  
  // Test 4: Check navigation sequence
  console.log('\n4. Checking navigation sequence...');
  const groupPatti = document.querySelector('[data-testid="group-patti"]');
  if (groupPatti) {
    const elements = [
      '[data-enter="1"]', // From Date
      '[data-enter="2"]', // To Date  
      '[data-enter="3"]', // Group Name
      '[data-enter="4"]', // Commission
      '[data-enter="5"]'  // Print Button
    ];
    
    elements.forEach((selector, index) => {
      const element = groupPatti.querySelector(selector);
      console.log(`   ${index + 1}. ${selector}: ${element ? '✅ Found' : '❌ Missing'}`);
      if (element) {
        console.log(`      - Type: ${element.type || element.tagName}`);
        console.log(`      - Can focus: ${element.tabIndex !== -1 || element.tabIndex === 0 ? '✅' : '❌'}`);
      }
    });
  }
  
  // Test 5: Simulate Enter key press
  console.log('\n5. Testing Enter key simulation...');
  if (activeElement) {
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    const prevented = !activeElement.dispatchEvent(event);
    console.log(`   Enter key event on current element: ${prevented ? '✅ Prevented (handled)' : '❌ Not prevented'}`);
  }
  
  console.log('\n=== DEBUG SUMMARY ===');
  console.log('Check the console output above for specific issues.');
  console.log('Common problems to look for:');
  console.log('- Missing data-enter attributes');
  console.log('- SearchableSelect components without proper refs');
  console.log('- Focus not moving to next element after selection');
  console.log('- Unified navigation system not properly attached');
  
  return {
    unifiedNavigationActive: hasUseReportNavigation,
    reportComponents: reportComponents.map(c => ({ 
      name: c.name, 
      found: !!document.querySelector(c.selector) 
    })),
    currentFocus: activeElement?.tagName,
    hasSearchableSelect: !!document.querySelector('[data-searchable-select]')
  };
}

// Run the debug
debugNavigationIssues();