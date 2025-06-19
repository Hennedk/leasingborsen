// Simple debug script to check for duplicate keys in common patterns

// Run this in browser console when on admin listing create/edit page
// to see what keys are actually being generated

function debugSelectItemKeys() {
  console.log('=== DEBUGGING REACT KEYS ===');
  
  // Find all SelectItem elements
  const selectItems = document.querySelectorAll('[role="option"]');
  const keys = [];
  
  selectItems.forEach((item, index) => {
    // Try to extract React fiber key
    const reactKey = item._reactInternalFiber?.key || 
                     item._reactInternalInstance?.key ||
                     item.__reactInternalInstance?.key ||
                     'no-key-found';
    
    keys.push({
      index,
      key: reactKey,
      text: item.textContent?.trim(),
      element: item
    });
  });
  
  console.log('All SelectItem keys found:', keys);
  
  // Check for duplicates
  const keyMap = {};
  const duplicates = [];
  
  keys.forEach(item => {
    if (keyMap[item.key]) {
      duplicates.push({
        duplicate_key: item.key,
        first_item: keyMap[item.key],
        second_item: item
      });
    } else {
      keyMap[item.key] = item;
    }
  });
  
  if (duplicates.length > 0) {
    console.error('DUPLICATE KEYS FOUND:', duplicates);
  } else {
    console.log('✅ No duplicate keys found in current DOM');
  }
  
  return { keys, duplicates };
}

// Export for console use
window.debugSelectItemKeys = debugSelectItemKeys;

console.log('Debug script loaded. Run debugSelectItemKeys() in console when on admin form page.');