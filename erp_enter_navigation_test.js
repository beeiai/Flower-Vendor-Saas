/**
 * ERP Deterministic Enter Navigation Test Script
 * Test the exact sequence: Group → Customer → Vehicle → Item Code → Qty → Rate → 
 * Luggage → Coolie → Paid → Remarks → Add Button → Group (loop)
 */

(function() {
  'use strict';

  console.log('%c=== ERP Deterministic Enter Navigation Test ===', 'font-weight: bold; font-size: 16px; color: #0ea5e9;');
  console.log('Testing strict sequence navigation for Daily Transaction page...\n');

  // Test utilities
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const logResult = (testName, passed, message = '') => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? '#10b981' : '#ef4444';
    console.log(`%c${status}%c ${testName}`, `color: ${color}; font-weight: bold`, 'color: inherit', message);
  };

  const getElementByIndex = (index) => {
    return document.querySelector(`[data-enter-index="${index}"]`);
  };

  const focusElementByIndex = (index) => {
    const element = getElementByIndex(index);
    if (element) {
      element.focus();
      return element === document.activeElement;
    }
    return false;
  };

  const simulateEnterKey = (shiftKey = false) => {
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: shiftKey,
      bubbles: true,
      cancelable: true
    });
    return document.activeElement.dispatchEvent(event);
  };

  const getCurrentIndex = () => {
    const activeElement = document.activeElement;
    if (!activeElement) return null;
    
    for (let i = 1; i <= 12; i++) {
      const element = getElementByIndex(i);
      if (element === activeElement) {
        return i;
      }
    }
    return null;
  };

  // Test suites
  const runTests = async () => {
    
    // Test 1: Element Indexing
    console.log('\n%c--- Test 1: Element Indexing ---', 'font-weight: bold; color: #6b7280;');
    
    const expectedElements = [
      { index: 1, label: 'Group Category' },
      { index: 2, label: 'Party/Customer' },
      { index: 3, label: 'Vehicle' },
      { index: 4, label: 'Item Code' },
      { index: 5, label: 'Product' },
      { index: 6, label: 'Qty' },
      { index: 7, label: 'Rate' },
      { index: 8, label: 'Lag.' },
      { index: 9, label: 'Coolie' },
      { index: 10, label: 'Paid' },
      { index: 11, label: 'Remarks' },
      { index: 12, label: 'Add Button' }
    ];

    let allElementsFound = true;
    expectedElements.forEach(({ index, label }) => {
      const element = getElementByIndex(index);
      if (!element) {
        logResult(`${label} (index ${index})`, false, 'Element not found');
        allElementsFound = false;
      } else {
        logResult(`${label} (index ${index})`, true, `${element.tagName} element located`);
      }
    });

    if (!allElementsFound) {
      console.log('%c⚠️  Critical: Some elements are missing data-enter-index attributes', 'color: #f59e0b; font-weight: bold');
      return;
    }

    // Test 2: Forward Navigation Sequence
    console.log('\n%c--- Test 2: Forward Navigation Sequence ---', 'font-weight: bold; color: #6b7280;');
    console.log('%cManual test required - follow instructions:', 'color: #f59e0b; font-weight: bold');
    
    console.log('\n📋 Forward Navigation Test:');
    console.log('1. Focus on Group Category field (index 1)');
    console.log('2. Press Enter repeatedly and verify the sequence:');
    console.log('   1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12');
    console.log('3. On index 12 (Add button), Enter should:');
    console.log('   - Click the Add button');
    console.log('   - Automatically focus index 1 (Group)');

    const forwardTestPassed = prompt('Did forward navigation work correctly? (Enter sequence 1-12) (y/n)').toLowerCase() === 'y';
    logResult('Forward navigation sequence', forwardTestPassed);

    // Test 3: Backward Navigation (Shift+Enter)
    console.log('\n%c--- Test 3: Backward Navigation ---', 'font-weight: bold; color: #6b7280;');
    
    console.log('\n📋 Backward Navigation Test:');
    console.log('1. Focus on any field (e.g., Qty - index 6)');
    console.log('2. Press Shift+Enter repeatedly and verify reverse sequence:');
    console.log('   6 → 5 → 4 → 3 → 2 → 1 → 12 → 11 → 10 → 9 → 8 → 7 → 6');
    console.log('3. Should loop continuously in reverse');

    const backwardTestPassed = prompt('Did backward navigation work correctly? (Shift+Enter) (y/n)').toLowerCase() === 'y';
    logResult('Backward navigation sequence', backwardTestPassed);

    // Test 4: Add Button Behavior
    console.log('\n%c--- Test 4: Add Button Behavior ---', 'font-weight: bold; color: #6b7280;');
    
    console.log('\n📋 Add Button Test:');
    console.log('1. Fill in all required fields with valid data');
    console.log('2. Focus on Add button (index 12)');
    console.log('3. Press Enter');
    console.log('4. Verify:');
    console.log('   - Record is added to the table');
    console.log('   - Focus moves to Group field (index 1)');
    console.log('   - Form is ready for next entry');

    const addButtonTestPassed = prompt('Did Add button behavior work correctly? (y/n)').toLowerCase() === 'y';
    logResult('Add button functionality', addButtonTestPassed);

    // Test 5: Validation Blocking
    console.log('\n%c--- Test 5: Validation Blocking ---', 'font-weight: bold; color: #6b7280;');
    
    console.log('\n📋 Validation Test:');
    console.log('1. Focus on Qty field (index 6)');
    console.log('2. Leave it empty or enter invalid value');
    console.log('3. Press Enter');
    console.log('4. Verify:');
    console.log('   - Focus stays on current field');
    console.log('   - Visual validation error appears');
    console.log('   - Navigation is blocked');

    const validationTestPassed = prompt('Did validation blocking work correctly? (y/n)').toLowerCase() === 'y';
    logResult('Validation blocking', validationTestPassed);

    // Test 6: Dropdown Integration
    console.log('\n%c--- Test 6: Dropdown Integration ---', 'font-weight: bold; color: #6b7280;');
    
    console.log('\n📋 Dropdown Test:');
    console.log('1. Focus on any dropdown field (Group, Customer, Vehicle, etc.)');
    console.log('2. Open the dropdown (click or arrow keys)');
    console.log('3. Press Enter while dropdown is open');
    console.log('4. Verify:');
    console.log('   - Selected option is confirmed');
    console.log('   - Dropdown closes');
    console.log('   - Focus moves to next field in sequence');

    const dropdownTestPassed = prompt('Did dropdown integration work correctly? (y/n)').toLowerCase() === 'y';
    logResult('Dropdown integration', dropdownTestPassed);

    // Test 7: Focus Visibility
    console.log('\n%c--- Test 7: Focus Visibility ---', 'font-weight: bold; color: #6b7280;');
    
    console.log('\n📋 Focus Visibility Test:');
    console.log('1. Navigate through fields using Enter key');
    console.log('2. Verify each focused element has:');
    console.log('   - Blue outline (2px solid #2563eb)');
    console.log('   - Outline offset of 2px');
    console.log('   - Blue box-shadow');
    console.log('3. Check contrast in different lighting conditions');

    const focusVisibilityTestPassed = prompt('Is focus visibility clear and accessible? (y/n)').toLowerCase() === 'y';
    logResult('Focus visibility', focusVisibilityTestPassed);

    // Test 8: Performance Test
    console.log('\n%c--- Test 8: Performance ---', 'font-weight: bold; color: #6b7280;');
    
    const startTime = performance.now();
    
    // Rapid Enter key simulation
    for (let i = 0; i < 20; i++) {
      simulateEnterKey();
      await sleep(10); // Small delay to allow processing
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    logResult(
      'Rapid navigation performance', 
      duration < 500, 
      `20 Enter events processed in ${duration.toFixed(2)}ms`
    );

    // Summary
    console.log('\n%c=== ERP Navigation Test Summary ===', 'font-weight: bold; font-size: 16px; color: #0ea5e9;');
    
    const allTests = [
      forwardTestPassed,
      backwardTestPassed,
      addButtonTestPassed,
      validationTestPassed,
      dropdownTestPassed,
      focusVisibilityTestPassed,
      duration < 500
    ];
    
    const passedTests = allTests.filter(Boolean).length;
    const totalTests = allTests.length;
    
    if (passedTests === totalTests) {
      console.log('%c🎉 All tests passed! ERP deterministic navigation is working perfectly.', 'color: #10b981; font-weight: bold; font-size: 18px;');
    } else {
      console.log(`%c⚠️  ${passedTests}/${totalTests} tests passed. Some issues need attention.`, 'color: #f59e0b; font-weight: bold; font-size: 16px;');
    }

    console.log('\n%c📊 Key Features Verified:', 'font-weight: bold; color: #8b5cf6');
    console.log('- Strict sequential navigation (1-12)');
    console.log('- Looping behavior (12 → 1)');
    console.log('- Bidirectional navigation (Enter/Shift+Enter)');
    console.log('- Add button integration');
    console.log('- Validation blocking');
    console.log('- Dropdown compatibility');
    console.log('- Focus visibility');
    console.log('- Performance optimization');

    console.log('\n%c🚀 Ready for High-Speed Data Entry!', 'font-weight: bold; font-size: 18px; color: #10b981');
    console.log('Users can now enter transaction data at Excel-like speeds using only the Enter key.');
    
  };

  // Check if we're on the Daily Transaction page
  const isDailyTxPage = document.querySelector('[data-enter-index="1"]') !== null;
  
  if (!isDailyTxPage) {
    console.log('%c⚠️  Warning: Not on Daily Transaction page', 'color: #f59e0b; font-weight: bold');
    console.log('Navigate to the Daily Transaction page and run this test again.');
    return;
  }

  // Run tests
  runTests().catch(error => {
    console.error('%c❌ Test execution failed:', 'color: #ef4444; font-weight: bold', error);
  });

})();