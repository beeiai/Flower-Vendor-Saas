// Script to verify group data fetching
async function verifyGroupsFetch() {
  console.log('=== Verifying Group Data Fetching ===');
  
  // Check if we're on the correct page
  const appContainer = document.querySelector('#root');
  if (!appContainer) {
    console.log('❌ App container not found');
    return;
  }
  
  console.log('✅ App container found');
  
  // Check if groups data is available in the React component state
  // This is a bit tricky since we can't directly access React state
  // Let's check if the group dropdowns have options
  
  // Check ReportsView group dropdown
  const reportsGroupSelect = document.querySelector('[data-enter-type="dropdown"] input[placeholder*="Select group"]');
  if (reportsGroupSelect) {
    console.log('✅ Reports group dropdown found');
    console.log('   Placeholder:', reportsGroupSelect.placeholder);
    // Try to focus and see if options appear
    reportsGroupSelect.focus();
    // Simulate Enter key to open dropdown
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    reportsGroupSelect.dispatchEvent(enterEvent);
    setTimeout(() => {
      const dropdownOptions = document.querySelectorAll('[data-searchable-select] [role="button"]');
      console.log(`   Dropdown options found: ${dropdownOptions.length}`);
      if (dropdownOptions.length > 0) {
        console.log('   ✅ Group options are available in dropdown');
        dropdownOptions.forEach((option, index) => {
          console.log(`     ${index + 1}. ${option.textContent.trim()}`);
        });
      } else {
        console.log('   ❌ No group options found in dropdown');
      }
    }, 500);
  } else {
    console.log('❌ Reports group dropdown not found');
  }
  
  // Check Group Patti Printing group dropdown
  setTimeout(() => {
    const groupPattiGroupSelect = document.querySelector('input[placeholder*="Select group"]');
    if (groupPattiGroupSelect && groupPattiGroupSelect !== reportsGroupSelect) {
      console.log('✅ Group Patti group dropdown found');
      console.log('   Placeholder:', groupPattiGroupSelect.placeholder);
      groupPattiGroupSelect.focus();
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      groupPattiGroupSelect.dispatchEvent(enterEvent);
      setTimeout(() => {
        const dropdownOptions = document.querySelectorAll('[data-searchable-select] [role="button"]');
        console.log(`   Dropdown options found: ${dropdownOptions.length}`);
        if (dropdownOptions.length > 0) {
          console.log('   ✅ Group options are available in dropdown');
        } else {
          console.log('   ❌ No group options found in dropdown');
        }
      }, 500);
    } else {
      console.log('ℹ️ Group Patti group dropdown not found (might not be on that page)');
    }
  }, 1000);
  
  // Check Group Total Report group dropdown
  setTimeout(() => {
    const groupTotalGroupSelect = document.querySelector('input[placeholder*="Select Group"]');
    if (groupTotalGroupSelect) {
      console.log('✅ Group Total group dropdown found');
      console.log('   Placeholder:', groupTotalGroupSelect.placeholder);
      groupTotalGroupSelect.focus();
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      groupTotalGroupSelect.dispatchEvent(enterEvent);
      setTimeout(() => {
        const dropdownOptions = document.querySelectorAll('[data-searchable-select] [role="button"]');
        console.log(`   Dropdown options found: ${dropdownOptions.length}`);
        if (dropdownOptions.length > 0) {
          console.log('   ✅ Group options are available in dropdown');
          dropdownOptions.forEach((option, index) => {
            console.log(`     ${index + 1}. ${option.textContent.trim()}`);
          });
        } else {
          console.log('   ❌ No group options found in dropdown');
        }
      }, 500);
    } else {
      console.log('ℹ️ Group Total group dropdown not found (might not be on that page)');
    }
  }, 2000);
  
  console.log('\n=== Verification Complete ===');
}

// Run the verification
verifyGroupsFetch();