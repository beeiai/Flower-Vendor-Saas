// Enter Navigation Verification Script
// Run this in browser console to verify the hard-block approach

function verifyEnterNavigation() {
  console.log('=== ENTER NAVIGATION VERIFICATION ===');
  
  // Test 1: Check global blocker is active
  console.log('\n1. Testing global Enter blocker...');
  const testEvent = new KeyboardEvent('keydown', { key: 'Enter' });
  const originalPreventDefault = testEvent.preventDefault;
  let preventDefaultCalled = false;
  testEvent.preventDefault = function() {
    preventDefaultCalled = true;
    return originalPreventDefault.call(this);
  };
  
  window.dispatchEvent(testEvent);
  console.log(`   Global blocker active: ${preventDefaultCalled ? '✅ YES' : '❌ NO'}`);
  
  // Test 2: Check for remaining onKeyDown handlers
  console.log('\n2. Checking for legacy onKeyDown handlers...');
  const elementsWithKeyDown = document.querySelectorAll('[onKeyDown]');
  console.log(`   Found ${elementsWithKeyDown.length} elements with onKeyDown`);
  if (elementsWithKeyDown.length > 0) {
    elementsWithKeyDown.forEach(el => {
      console.log(`   - ${el.tagName} with onKeyDown handler`);
    });
  } else {
    console.log('   ✅ No legacy onKeyDown handlers found');
  }
  
  // Test 3: Check data-enter attributes
  console.log('\n3. Checking data-enter attributes...');
  const dataEnterElements = document.querySelectorAll('[data-enter]');
  console.log(`   Found ${dataEnterElements.length} elements with data-enter`);
  
  const sortedElements = Array.from(dataEnterElements)
    .map(el => ({
      enter: parseInt(el.getAttribute('data-enter')),
      element: el,
      tag: el.tagName,
      type: el.type || 'N/A'
    }))
    .sort((a, b) => a.enter - b.enter);
  
  console.log('   Sequence:');
  sortedElements.forEach(item => {
    console.log(`   ${item.enter}: ${item.tag} (${item.type})`);
  });
  
  // Test 4: Check for data-enter-submit
  console.log('\n4. Checking submit buttons...');
  const submitButtons = document.querySelectorAll('[data-enter-submit]');
  console.log(`   Found ${submitButtons.length} submit buttons`);
  submitButtons.forEach((btn, i) => {
    console.log(`   ${i + 1}: ${btn.textContent.trim()}`);
  });
  
  // Test 5: Check SearchableSelect behavior
  console.log('\n5. Checking SearchableSelect components...');
  const searchableSelects = document.querySelectorAll('[data-searchable-select]');
  console.log(`   Found ${searchableSelects.length} SearchableSelect components`);
  
  // Test 6: Manual testing instructions
  console.log('\n=== MANUAL TESTING INSTRUCTIONS ===');
  console.log('1. Focus on first element (data-enter="1")');
  console.log('2. Press Enter - should see "Enter captured by controller" in console');
  console.log('3. Focus should move to next element in sequence');
  console.log('4. Continue pressing Enter through all elements');
  console.log('5. On submit button, Enter should click it and loop back to first');
  console.log('6. No dropdowns should open automatically');
  console.log('7. No navbar elements should receive Enter focus');
  
  console.log('\n=== VERIFICATION COMPLETE ===');
}

// Run verification
verifyEnterNavigation();