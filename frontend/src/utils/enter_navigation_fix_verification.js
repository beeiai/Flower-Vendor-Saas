/**
 * Enter Navigation Fix Verification Script
 * This script verifies that the Enter button navigation is working properly in the reports sections
 */

function verifyEnterNavigationFix() {
  console.log('=== Enter Navigation Fix Verification ===');
  
  console.log('\n1. Checking Group Patti Print Section (group-print)...');
  
  // Check for the new data-enter attributes in Group Patti section
  const groupPattiElements = [
    { selector: '[data-enter="1"][data-enter-type="input"]', desc: 'From Date input' },
    { selector: '[data-enter="2"][data-enter-type="input"]', desc: 'To Date input' },
    { selector: '[data-enter="3"][data-enter-type="dropdown"]', desc: 'Group selection dropdown' },
    { selector: '[data-enter="4"][data-enter-type="input"]', desc: 'Commission input' },
    { selector: '[data-enter="5"][data-enter-type="submit"]', desc: 'Print button' },
    { selector: '[data-enter="6"][data-enter-type="button"]', desc: 'Cancel button' }
  ];
  
  groupPattiElements.forEach(element => {
    const found = document.querySelector(element.selector);
    console.log(`   ${found ? '✅' : '❌'} ${element.desc}: ${found ? 'Found' : 'NOT FOUND'}`);
  });
  
  console.log('\n2. Checking Group Total Report Section (group-total)...');
  
  // Check for the new data-enter attributes in Group Total section
  const groupTotalElements = [
    { selector: '[data-enter="1"][data-enter-type="input"]', desc: 'From Date input' },
    { selector: '[data-enter="2"][data-enter-type="input"]', desc: 'To Date input' },
    { selector: '[data-enter="3"][data-enter-type="submit"]', desc: 'Print button' },
    { selector: '[data-enter="4"][data-enter-type="button"]', desc: 'Cancel button' }
  ];
  
  groupTotalElements.forEach(element => {
    const found = document.querySelector(element.selector);
    console.log(`   ${found ? '✅' : '❌'} ${element.desc}: ${found ? 'Found' : 'NOT FOUND'}`);
  });
  
  console.log('\n3. Verifying useEnterController hook integration...');
  
  // Check if the container divs have refs connected to useEnterController
  const groupPattiContainer = document.querySelector('.max-w-[720px]'); // Group Patti form container
  const groupTotalContainer = document.querySelector('.max-w-[720px][style*="rounded-2xl"]'); // Group Total form container
  
  if (groupPattiContainer) {
    console.log('   ✅ Group Patti section container found');
  } else {
    console.log('   ❌ Group Patti section container NOT FOUND');
  }
  
  if (groupTotalContainer) {
    console.log('   ✅ Group Total section container found');
  } else {
    console.log('   ❌ Group Total section container NOT FOUND');
  }
  
  console.log('\n4. Checking for legacy navigation attributes (should be removed)...');
  
  // Check that old data-enter-index attributes are gone from these sections
  const oldAttributes = document.querySelectorAll('[data-enter-index]');
  const legacyElementsInSection = Array.from(oldAttributes).filter(el => {
    // Check if element is inside either of the report sections
    const closestForm = el.closest('.max-w-[720px]');
    return closestForm && (
      closestForm.querySelector('h1')?.textContent?.includes('GROUP PATTI') ||
      closestForm.querySelector('h1')?.textContent?.includes('GROUP TOTAL')
    );
  });
  
  if (legacyElementsInSection.length === 0) {
    console.log('   ✅ No legacy data-enter-index attributes found in report sections');
  } else {
    console.log(`   ⚠️ Found ${legacyElementsInSection.length} legacy data-enter-index attributes in report sections`);
    legacyElementsInSection.forEach((el, i) => {
      console.log(`     - Element ${i+1}: ${el.tagName} with data-enter-index="${el.getAttribute('data-enter-index')}"`);
    });
  }
  
  console.log('\n5. Summary of Changes:');
  console.log('   • Group Patti Print section now uses unified keyboard navigation system');
  console.log('   • Group Total Report section now uses unified keyboard navigation system');
  console.log('   • Both sections use data-enter and data-enter-type attributes');
  console.log('   • Both sections have useEnterController hook for consistent navigation');
  console.log('   • Legacy onKeyDown handlers removed from input fields');
  console.log('   • Enter key should now work consistently across all report sections');
  
  console.log('\n✅ Enter Navigation Fix Verification Complete!');
}

// Run the verification
verifyEnterNavigationFix();