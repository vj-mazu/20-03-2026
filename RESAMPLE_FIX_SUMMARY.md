# Resample Workflow - Issue Analysis and Fix

## Issue Summary
After adding resample quality, entries are not showing in the "Resample Pending" section of the Lot Selection page.

## Root Causes

### 1. AdminSampleBook2 Quality Status Display (FIXED)
**File**: `17-03-2026-main/client/src/pages/AdminSampleBook2.tsx`
**Function**: `buildQualityStatusRows`

**Problem**: When a resample entry has quality added (2 attempts), the function wasn't correctly showing the quality status rows.

**Fix Applied**: 
- Added `hasCompleteResampleQuality` check to verify if resample quality has all required fields
- Updated logic to correctly display quality status for resample entries with complete quality
- Removed the extra "Resampling" row when resample quality is complete

### 2. Backend Quality Attempt Detection (FIXED)
**File**: `17-03-2026-main/server/utils/historyUtil.js`
**Function**: `attachLoadingLotsHistories`

**Problem**: The function only looked for transitions TO `'QUALITY_CHECK'` status to mark attempt boundaries. When resample quality is saved, the transition is TO `'LOT_SELECTION'` with `resampleQualitySaved` metadata, so it wasn't being detected as a new attempt.

**Fix Applied**:
- Updated the transition filter to include transitions TO `'LOT_SELECTION'` with `resampleQualitySaved: true` metadata
- This ensures the `qualityAttemptDetails` array is populated with 2 attempts after resample quality is saved
- The `hasPostResampleAttempt()` function will now return true, making entries appear in "Resample Pending"

## How It Works

1. **Original Quality Save**: 
   - Transition: `STAFF_ENTRY` → `LOT_SELECTION`
   - Creates 1 attempt in `qualityAttemptDetails`

2. **Manager Marks as FAIL**:
   - Sets `lotSelectionDecision = 'FAIL'`
   - Transition: `LOT_SELECTION` → `FINAL_REPORT`

3. **Manager Assigns Supervisor**:
   - Transition: `FINAL_REPORT` → `QUALITY_CHECK`
   - This transition marks the start of resample attempt

4. **Resample Quality Save**:
   - Transition: `QUALITY_CHECK` → `LOT_SELECTION` with `{ resampleQualitySaved: true }`
   - This transition is NOW detected as a new attempt boundary
   - Creates 2nd attempt in `qualityAttemptDetails`

5. **Backend Filtering**:
   - `hasPostResampleAttempt(entry, hasSampleBookReadySnapshot)` checks if `qualityAttemptDetails.length > 1`
   - Returns true, entry is included in PENDING_LOT_SELECTION results
   - Entry shows in "Resample Pending" tab

## Testing

To verify the fix:

1. **Test Resample Workflow**:
   - Create entry → Add quality → Mark as FAIL → Assign supervisor → Add resample quality
   - After resample quality is saved, check:
     - Entry should appear in "Resample Pending" tab
     - `qualityAttemptDetails` should have 2 attempts
     - Quality status should show correctly in AdminSampleBook2

2. **Check Backend Data**:
   ```sql
   SELECT 
     id, 
     workflowStatus, 
     lotSelectionDecision,
     (SELECT COUNT(*) FROM sample_entry_audit_logs 
      WHERE recordId = sample_entries.id 
      AND actionType = 'WORKFLOW_TRANSITION'
      AND JSON_EXTRACT(metadata, '$.resampleQualitySaved') = true) as resample_transitions
   FROM sample_entries 
   WHERE lotSelectionDecision = 'FAIL';
   ```

3. **Check Audit Logs**:
   - Verify there's a workflow transition with `resampleQualitySaved: true` metadata
   - This transition should be created when resample quality is saved

## Success Criteria

✅ AdminSampleBook2 shows correct quality status for resample entries
✅ Resample entries with quality appear in "Resample Pending" tab
✅ `qualityAttemptDetails` array has 2 attempts after resample quality
✅ Quality status shows "Done" or "100-Gms" for completed resample quality
✅ No extra "Resampling" row when resample quality is complete
