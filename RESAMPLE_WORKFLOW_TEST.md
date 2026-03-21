# Resample Workflow Test Plan

## Test Case: Complete Resample Workflow

### Prerequisites
- Fresh database or clean test environment
- Manager login credentials
- Location Supervisor login credentials

---

## Step 1: Create Initial Entry (Staff/Manager)
**Action**: Create a new paddy sample entry
- Entry Type: LOCATION_SAMPLE
- Party Name: Test Party
- Bags: 500
- Location: Marwi
- Variety: Sum25 Rnr
- Sample Collected By: Select a Location Supervisor
- Sample Given to Office: Yes

**Expected Result**:
- Entry created successfully
- Entry appears in "Location Sample" tab
- Status: Waiting for quality

---

## Step 2: Add Original Quality (Location Supervisor)
**Action**: Location supervisor adds quality parameters
- Login as Location Supervisor
- Go to "Location Sample" tab
- Click "Next" on the entry
- Fill quality parameters:
  - Moisture: 14
  - Cutting: 1×4
  - Bend: 1×4
  - Mix: 4
  - Kandu: 4
  - Oil: 4
  - SK: 4
  - Grains Count: 144
- Click Save

**Expected Result**:
- ✅ Quality saved successfully
- ✅ Entry shows "Quality Completed" in green
- ✅ Entry moves to "Paddy Sample Book" tab (LOT_SELECTION status)
- ✅ Entry disappears from "Location Sample" tab

**Debug Check**:
```javascript
// Check in browser console after save:
// 1. Entry workflowStatus should be 'LOT_SELECTION'
// 2. qualityParameters should exist
// 3. qualityAttemptDetails should have 1 attempt
```

---

## Step 3: Manager Reviews - Mark as FAIL (Resample)
**Action**: Manager reviews and marks for resample
- Login as Manager
- Go to "Pending (Sample Selection)" tab
- Find the entry
- Click "Resample" button
- Confirm resample

**Expected Result**:
- ✅ Entry marked as FAIL
- ✅ lotSelectionDecision = 'FAIL'
- ✅ lotSelectionAt timestamp set
- ✅ Entry moves to "Resample Allotment" section

**Debug Check**:
```javascript
// Check entry data:
// 1. lotSelectionDecision should be 'FAIL'
// 2. lotSelectionAt should have timestamp
// 3. workflowStatus should be 'FINAL_REPORT' or 'LOT_ALLOTMENT'
```

---

## Step 4: Manager Assigns Location Supervisor
**Action**: Manager assigns location supervisor for resample
- In "Resample Allotment" section
- Click "Assign" on the entry
- Select a Location Supervisor
- Click "Assign Supervisor"

**Expected Result**:
- ✅ Supervisor assigned
- ✅ sampleCollectedBy updated to supervisor username
- ✅ Entry moves to "Location Sample" tab (for supervisor to collect new sample)
- ✅ workflowStatus changes to 'QUALITY_CHECK' or 'LOT_ALLOTMENT'

**Debug Check**:
```javascript
// Check entry data:
// 1. sampleCollectedBy should be supervisor username
// 2. workflowStatus should be 'QUALITY_CHECK' or 'LOT_ALLOTMENT'
// 3. lotSelectionDecision should still be 'FAIL'
```

---

## Step 5: Location Supervisor Adds Resample Quality (CRITICAL TEST)
**Action**: Location supervisor adds NEW quality for resample
- Login as Location Supervisor
- Go to "Location Sample" tab
- Find the resample entry (should have orange background)
- Click "Next" button

**Expected Result - Quality Modal**:
- ✅ Modal opens with FRESH/EMPTY form
- ✅ All quality fields should be empty (not showing old quality)
- ✅ Modal title should indicate this is for resample
- ❌ OLD quality should NOT be pre-filled in the form

**If OLD quality is showing**: BUG FOUND - Modal logic is wrong

**Action - Fill NEW Quality**:
- Moisture: 15 (different from original)
- Cutting: 2×5 (different from original)
- Bend: 2×5 (different from original)
- Mix: 5
- Kandu: 5
- Oil: 5
- SK: 5
- Grains Count: 150
- Click Save

**Expected Result After Save**:
- ✅ "Quality parameters saved successfully" notification
- ✅ Page refreshes automatically
- ✅ Entry should show "Quality Completed" in GREEN
- ✅ Entry should move to "Paddy Sample Book" tab (LOT_SELECTION status)
- ✅ Entry should appear in "Resample Pending" section

**Debug Check**:
```javascript
// After save, check entry data:
// 1. qualityParameters should have NEW values (15, 2×5, etc.)
// 2. qualityAttemptDetails should have 2 attempts now
// 3. workflowStatus should be 'LOT_SELECTION'
// 4. lotSelectionDecision should still be 'FAIL'
```

---

## Step 6: Manager Reviews Resample - Pass with Cooking
**Action**: Manager reviews resample quality
- Login as Manager
- Go to "Pending (Sample Selection)" tab
- Find the resample entry in "Resample Pending" section
- Click "Pass with Cooking"
- Confirm decision

**Expected Result**:
- ✅ Entry marked as PASS_WITH_COOKING
- ✅ Entry moves to "Resample Cooking Book" tab
- ✅ Entry should have indicator showing it's a resample entry

**Debug Check**:
```javascript
// Check entry data:
// 1. lotSelectionDecision should be 'PASS_WITH_COOKING'
// 2. workflowStatus should be 'COOKING_REPORT'
// 3. qualityReportAttempts should be 2
```

---

## Common Issues and Debugging

### Issue 1: Quality Modal Shows Old Data
**Symptom**: When clicking "Next" on resample entry, old quality values are pre-filled

**Debug**:
1. Check `entry.workflowStatus` - should be 'QUALITY_CHECK' or 'LOT_ALLOTMENT'
2. Check `entry.lotSelectionDecision` - should be 'FAIL'
3. Check browser console for errors
4. Check if `needsNewAttempt` variable is true in handleViewEntry function

**Fix Location**: Line ~1075 in SampleEntry.tsx

---

### Issue 2: Entry Not Moving After Quality Save
**Symptom**: After saving resample quality, entry stays in Location Sample tab

**Debug**:
1. Check network tab - verify API call succeeded
2. Check response data - verify workflowStatus changed
3. Check if `loadEntries()` was called after save
4. Check backend logs for workflow transition

**Fix Location**: Line ~1302 in SampleEntry.tsx (loadEntries call)

---

### Issue 3: Status Not Showing Green
**Symptom**: After resample quality saved, status doesn't show "Quality Completed" in green

**Debug**:
1. Check `qualityAttempts.length` - should be 2 after resample
2. Check `resampleQualitySaved` variable - should be true
3. Check `showResampleQualityCompleted` variable - should be true
4. Check if entry has `qualityAttemptDetails` array populated

**Fix Location**: Line ~1800 in SampleEntry.tsx

---

### Issue 4: Entry Not in Resample Pending
**Symptom**: After resample quality saved, entry doesn't appear in "Resample Pending" section

**Debug**:
1. Check backend filtering logic in SampleEntryService.js
2. Check if `hasPostResampleAttempt()` returns true
3. Check if `hasSampleBookReadySnapshot()` returns true for latest attempt
4. Check backend logs for PENDING_LOT_SELECTION filter

**Fix Location**: Server-side filtering in SampleEntryService.js line ~450

---

## Expected Data Flow

### Initial Entry:
```json
{
  "id": 1,
  "workflowStatus": "STAFF_ENTRY",
  "lotSelectionDecision": null,
  "qualityParameters": null,
  "qualityAttemptDetails": []
}
```

### After Original Quality:
```json
{
  "id": 1,
  "workflowStatus": "LOT_SELECTION",
  "lotSelectionDecision": null,
  "qualityParameters": { "moisture": 14, "cutting1": 1, ... },
  "qualityAttemptDetails": [
    { "attemptNo": 1, "moisture": 14, "cutting1": 1, ... }
  ]
}
```

### After Resample Mark:
```json
{
  "id": 1,
  "workflowStatus": "FINAL_REPORT",
  "lotSelectionDecision": "FAIL",
  "lotSelectionAt": "2026-03-19T10:00:00Z",
  "qualityParameters": { "moisture": 14, "cutting1": 1, ... },
  "qualityAttemptDetails": [
    { "attemptNo": 1, "moisture": 14, "cutting1": 1, ... }
  ]
}
```

### After Supervisor Assignment:
```json
{
  "id": 1,
  "workflowStatus": "QUALITY_CHECK",
  "lotSelectionDecision": "FAIL",
  "sampleCollectedBy": "supervisor1",
  "qualityParameters": { "moisture": 14, "cutting1": 1, ... },
  "qualityAttemptDetails": [
    { "attemptNo": 1, "moisture": 14, "cutting1": 1, ... }
  ]
}
```

### After Resample Quality (EXPECTED):
```json
{
  "id": 1,
  "workflowStatus": "LOT_SELECTION",
  "lotSelectionDecision": "FAIL",
  "sampleCollectedBy": "supervisor1",
  "qualityParameters": { "moisture": 15, "cutting1": 2, ... },
  "qualityAttemptDetails": [
    { "attemptNo": 1, "moisture": 14, "cutting1": 1, ... },
    { "attemptNo": 2, "moisture": 15, "cutting1": 2, ... }
  ]
}
```

---

## Browser Console Debug Commands

```javascript
// Check current entry data
console.log('Entry:', selectedEntry);

// Check quality attempts
console.log('Quality Attempts:', getQualityAttemptsForEntry(selectedEntry));

// Check workflow status
console.log('Workflow Status:', selectedEntry.workflowStatus);
console.log('Lot Decision:', selectedEntry.lotSelectionDecision);

// Check if resample logic triggers
const isResampleFlow = selectedEntry.lotSelectionDecision === 'FAIL'
  && selectedEntry.workflowStatus !== 'FAILED'
  && selectedEntry.entryType !== 'RICE_SAMPLE';
console.log('Is Resample Flow:', isResampleFlow);

const needsNewAttempt = isResampleFlow 
  && (selectedEntry.workflowStatus === 'QUALITY_CHECK' || selectedEntry.workflowStatus === 'LOT_ALLOTMENT');
console.log('Needs New Attempt:', needsNewAttempt);
```

---

## Success Criteria

✅ All 6 steps complete without errors
✅ Quality modal shows fresh form for resample
✅ Entry moves through workflow correctly
✅ Status displays correctly at each stage
✅ qualityAttemptDetails has 2 attempts after resample
✅ Entry appears in correct tabs/sections

---

## If Test Fails

1. Note which step failed
2. Check debug output at that step
3. Check browser console for errors
4. Check network tab for API responses
5. Check backend logs for workflow transitions
6. Report exact error message and step number
