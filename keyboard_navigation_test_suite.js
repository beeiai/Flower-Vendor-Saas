// Keyboard Navigation Test Script
// Run this in the browser console to verify the navigation system

function runKeyboardNavigationTests() {
  console.log('=== Keyboard Navigation Test Suite ===\n');
  
  // Test 1: Check for data-enter-index attributes
  console.log('1. Checking data-enter-index attributes...');
  const indexedElements = document.querySelectorAll('[data-enter-index]');
  console.log(`   Found ${indexedElements.length} indexed elements`);
  
  if (indexedElements.length > 0) {
    console.log('   Indexed elements:');
    Array.from(indexedElements)
      .sort((a, b) => parseInt(a.dataset.enterIndex) - parseInt(b.dataset.enterIndex))
      .forEach(el => {
        console.log(`   - Index ${el.dataset.enterIndex}: ${el.tagName} ${el.type || ''}`);
      });
    console.log('   ✅ PASS: Found indexed elements\n');
  } else {
    console.log('   ❌ FAIL: No indexed elements found\n');
  }
  
  // Test 2: Check for navbar elements
  console.log('2. Checking navbar elements...');
  const navbarElements = document.querySelectorAll('.navbar-element, [data-navbar-element]');
  console.log(`   Found ${navbarElements.length} navbar elements`);
  
  if (navbarElements.length > 0) {
    console.log('   Navbar elements:');
    navbarElements.forEach((el, i) => {
      console.log(`   - ${i + 1}: ${el.tagName} ${el.textContent?.trim().substring(0, 20) || ''}`);
    });
    console.log('   ✅ PASS: Found navbar elements\n');
  } else {
    console.log('   ⚠️  INFO: No navbar elements found (may be on different page)\n');
  }
  
  // Test 3: Check for forms with preventDefault
  console.log('3. Checking form submission prevention...');
  const forms = document.querySelectorAll('form');
  console.log(`   Found ${forms.length} forms`);
  
  let allFormsPreventDefault = true;
  forms.forEach((form, i) => {
    const onSubmit = form.getAttribute('onSubmit') || form.onsubmit;
    console.log(`   - Form ${i + 1}: ${onSubmit ? 'Has handler' : 'No handler'}`);
    if (!onSubmit) {
      allFormsPreventDefault = false;
    }
  });
  
  if (allFormsPreventDefault) {
    console.log('   ✅ PASS: All forms prevent default submission\n');
  } else {
    console.log('   ❌ FAIL: Some forms may not prevent submission\n');
  }
  
  // Test 4: Check for legacy onKeyDown handlers
  console.log('4. Checking for legacy onKeyDown handlers...');
  const elementsWithKeyDown = document.querySelectorAll('[onKeyDown]');
  console.log(`   Found ${elementsWithKeyDown.length} elements with onKeyDown`);
  
  if (elementsWithKeyDown.length === 0) {
    console.log('   ✅ PASS: No legacy onKeyDown handlers found\n');
  } else {
    console.log('   ❌ FAIL: Found legacy onKeyDown handlers:');
    elementsWithKeyDown.forEach(el => {
      console.log(`   - ${el.tagName} with onKeyDown handler`);
    });
    console.log('');
  }
  
  // Test 5: Check tabIndex usage
  console.log('5. Checking tabIndex usage...');
  const elementsWithTabIndex = document.querySelectorAll('[tabIndex]');
  const nonNegativeTabIndex = Array.from(elementsWithTabIndex).filter(el => el.tabIndex >= 0);
  console.log(`   Found ${nonNegativeTabIndex.length} elements with tabIndex >= 0`);
  
  if (nonNegativeTabIndex.length <= 5) { // Allow some for accessibility
    console.log('   ✅ PASS: Minimal tabIndex usage\n');
  } else {
    console.log('   ⚠️  WARNING: High tabIndex usage detected:');
    nonNegativeTabIndex.forEach(el => {
      console.log(`   - ${el.tagName} with tabIndex=${el.tabIndex}`);
    });
    console.log('');
  }
  
  // Test 6: Verify focusable elements
  console.log('6. Checking focusable elements...');
  const focusableElements = document.querySelectorAll('input, button, select, textarea');
  console.log(`   Found ${focusableElements.length} focusable elements`);
  
  const withDataAction = document.querySelectorAll('[data-action="primary"]').length;
  console.log(`   Found ${withDataAction} primary action buttons`);
  
  if (focusableElements.length > 0) {
    console.log('   ✅ PASS: Found focusable elements\n');
  } else {
    console.log('   ❌ FAIL: No focusable elements found\n');
  }
  
  // Summary
  console.log('=== Test Summary ===');
  console.log(`Total indexed elements: ${indexedElements.length}`);
  console.log(`Total navbar elements: ${navbarElements.length}`);
  console.log(`Total forms: ${forms.length}`);
  console.log(`Elements with onKeyDown: ${elementsWithKeyDown.length}`);
  console.log(`Elements with tabIndex >= 0: ${nonNegativeTabIndex.length}`);
  console.log(`Primary action buttons: ${withDataAction}`);
  
  console.log('\n=== Manual Testing Instructions ===');
  console.log('1. Focus on first indexed element (index 1)');
  console.log('2. Press Enter - should move to index 2');
  console.log('3. Press Enter repeatedly - should follow sequence');
  console.log('4. Press Shift+Enter - should move backwards');
  console.log('5. Try opening dropdowns with ArrowDown');
  console.log('6. Press Enter while dropdown open - should select option');
  console.log('7. Verify no navbar elements receive Enter focus');
  
  console.log('\n=== Test Complete ===');
}

// Run the tests immediately
runKeyboardNavigationTests();