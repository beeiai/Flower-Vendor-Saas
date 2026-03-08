// Keyboard Navigation Verification Utility
// This utility helps verify that the keyboard navigation system is working correctly

export function verifyKeyboardNavigation() {
  console.log('=== Keyboard Navigation Verification ===');
  
  // Check for data-enter-index attributes
  const indexedElements = document.querySelectorAll('[data-enter-index]');
  console.log(`Found ${indexedElements.length} elements with data-enter-index`);
  
  // Check for navbar elements
  const navbarElements = document.querySelectorAll('.navbar-element, [data-navbar-element]');
  console.log(`Found ${navbarElements.length} navbar elements`);
  
  // Check for forms with preventDefault
  const forms = document.querySelectorAll('form');
  console.log(`Found ${forms.length} forms`);
  forms.forEach((form, index) => {
    const onSubmit = form.getAttribute('onSubmit');
    console.log(`Form ${index + 1}: ${onSubmit ? 'Has onSubmit handler' : 'No onSubmit handler'}`);
  });
  
  // Check for legacy onKeyDown handlers
  const elementsWithKeyDown = document.querySelectorAll('[onKeyDown]');
  console.log(`Found ${elementsWithKeyDown.length} elements with onKeyDown handlers`);
  elementsWithKeyDown.forEach(el => {
    console.log(`Element: ${el.tagName} with onKeyDown handler`);
  });
  
  // Check for tabIndex attributes (should be minimal)
  const elementsWithTabIndex = document.querySelectorAll('[tabIndex]');
  console.log(`Found ${elementsWithTabIndex.length} elements with tabIndex`);
  elementsWithTabIndex.forEach(el => {
    if (el.tabIndex !== -1) {
      console.log(`Element: ${el.tagName} with tabIndex=${el.tabIndex}`);
    }
  });
  
  console.log('=== Verification Complete ===');
}

// Debug function to show current focus order
export function debugFocusOrder() {
  const indexedElements = Array.from(document.querySelectorAll('[data-enter-index]'))
    .map(el => ({
      index: parseInt(el.getAttribute('data-enter-index')),
      element: el,
      tag: el.tagName,
      type: el.type || 'N/A'
    }))
    .sort((a, b) => a.index - b.index);
  
  console.log('=== Focus Order Debug ===');
  indexedElements.forEach(item => {
    console.log(`Index ${item.index}: ${item.tag} (${item.type})`, item.element);
  });
  console.log('=== End Focus Order Debug ===');
}