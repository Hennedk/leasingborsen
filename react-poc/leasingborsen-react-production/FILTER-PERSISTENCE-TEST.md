# Filter Persistence Testing Guide

## ✅ How to Test Filter Persistence

The filter persistence feature should now be working correctly. Here's how to test it:

### **Test Scenario 1: Basic Persistence**

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Navigate to listings** (http://localhost:5173/listings)
   - Make sure the URL has no filter parameters

3. **Apply some filters**:
   - Select a car make (e.g., "Toyota")
   - Choose a fuel type (e.g., "Electric")
   - Set a price range
   - Change sorting to "Højeste pris"

4. **Check URL updates**:
   - URL should automatically update to include filter parameters
   - Example: `http://localhost:5173/listings?make=Toyota&fuel_type=Electric&price_min=3000&sort=desc`

5. **Check browser console** for save message:
   ```
   💾 Saving filters to localStorage: { filters: {...}, sortOrder: "desc" }
   ```

6. **Refresh the page**:
   - Your filters should be restored automatically
   - Check console for restore message:
   ```
   🔄 Restoring saved filters: { filters: {...}, sortOrder: "desc" }
   ```

### **Test Scenario 2: URL Sharing & Direct Links**

1. **Apply filters and wait for URL to update**

2. **Copy the URL** from the address bar:
   ```
   http://localhost:5173/listings?make=Toyota&fuel_type=Electric&price_min=3000&sort=desc
   ```

3. **Open URL in new tab/window**:
   - Should show the exact same filters applied
   - Should see console message:
   ```
   🔗 URL filters detected, skipping persistence restoration
   ```

4. **Navigate back to clean URL**:
   ```
   http://localhost:5173/listings
   ```
   - Should restore your previously saved filters (if any were saved without URL params)

### **Test Scenario 3: Mobile Persistence**

1. **Open dev tools and set mobile viewport**

2. **Apply filters using mobile filter overlay**

3. **Refresh page** - filters should persist on mobile too

### **Test Scenario 4: Reset All Functionality**

1. **Apply multiple filters**:
   - Select make, fuel type, price range, etc.
   - URL should update with parameters

2. **Click "Reset All" or "Nulstil alle" button**:
   - All filters should be cleared
   - URL should return to clean `/listings` (no parameters)
   - Filter chips should disappear

3. **Verify persistence**:
   - No filters should be saved to localStorage after reset
   - Refreshing page should show no filters applied

### **Test Scenario 5: Expiry**

1. **Open browser dev tools → Application → Local Storage**

2. **Find key**: `leasingborsen_last_filters`

3. **Manually edit the timestamp** to be older than 7 days:
   ```json
   {
     "filters": {...},
     "sortOrder": "desc",
     "timestamp": 1640995200000  // Old timestamp
   }
   ```

4. **Refresh page** - filters should NOT be restored (expired)

## 🐛 Troubleshooting

### **Filters not persisting:**
- Check browser console for save/restore messages
- Verify localStorage in dev tools (Application → Local Storage)
- Make sure you're testing without URL parameters

### **Console messages to look for:**
- `💾 Saving filters to localStorage:` - Confirms saving works
- `🔄 Restoring saved filters:` - Confirms restoration works  
- `🔗 URL filters detected, skipping persistence restoration` - URL takes priority

### **Clear saved filters:**
```javascript
// Run in browser console to clear saved filters
localStorage.removeItem('leasingborsen_last_filters')
```

## 📱 Mobile Testing

The persistence works identically on mobile:
- Apply filters using mobile filter overlay
- Refresh page or return to site later
- Filters should be automatically restored

## ⏰ Timing

- **Save delay**: 1 second after filter changes
- **Restore delay**: 100ms after page load (to ensure URL sync completes first)
- **Expiry**: 7 days from last save

## 🔍 Verification

To verify persistence is working correctly:

1. Apply filters
2. Wait 2 seconds for save
3. Check localStorage in dev tools
4. Refresh page (without URL params)
5. Verify filters are restored
6. Check console logs for confirmation

The feature should now work seamlessly without any user intervention!