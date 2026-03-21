# Complete Resample Workflow - Visual Guide

## Overview
This guide shows EXACTLY what happens at each step of the resample workflow, which tabs to use, and what you'll see on screen.

---

## Step 1: Create New Entry (Staff/Manager)

**Who**: Staff or Manager  
**Tab**: "Paddy Sample Records" → "Location Sample" tab  
**Action**: Click "+ Location Sample" button

**Form Fields**:
- Entry Date: (today's date)
- Broker Name: Mallesh
- Variety: Sum25 Rnr
- Party Name: Test Party
- Location: Marwi
- Bags: 500
- Packaging: 75 kg
- Sample Collected By: Select "Marjuntah Patil" (Location Supervisor)
- Sample Given to Office: ✅ Yes

**Click**: "Save Entry" button

**Result**:
- ✅ Success notification: "Sample entry created successfully"
- Entry appears in "Location Sample" tab
- Entry shows: "Waiting for quality" or "Next >" button

---

## Step 2: Add Original Quality (Location Supervisor)

**Who**: Location Supervisor (Marjuntah Patil)  
**Tab**: "Paddy Sample Records" → "Location Sample" tab  
**What You See**: Entry with orange background and "Next >" button

**Action**: Click "Next >" button on the entry

**Quality Modal Opens**:
```
┌─────────────────────────────────────────┐
│  Add Quality Parameters                 │
├─────────────────────────────────────────┤
│  Moisture: [14]                         │
│  Cutting: [1×4]  (auto-formats)         │
│  Bend: [1×4]     (auto-formats)         │
│  Mix: [4]                               │
│  Kandu: [4]                             │
│  Oil: [4]                               │
│  SK: [4]                                │
│  Grains Count: [144]                    │
│  Reported By: [Marjuntah Patil]         │
│                                         │
│  [Cancel]  [Save Quality Parameters]    │
└─────────────────────────────────────────┘
```

**Click**: "Save Quality Parameters"

**Result**:
- ✅ Success notification: "Quality parameters saved successfully"
- Page refreshes automatically
- Entry shows: "✅ Quality Completed" in GREEN
- Entry DISAPPEARS from "Location Sample" tab
- Entry APPEARS in "Paddy Sample Book" tab

**Where to Find Entry Now**:
- Tab: "Paddy Sample Book" (3rd tab)
- Shows: Party Name, Location, Variety, "✅ Quality Completed"

---

## Step 3: Manager Reviews - Mark as FAIL (Resample)

**Who**: Manager  
**Tab**: "Pending (Sample Selection)" (top navigation)  
**Sub-Tab**: "Pending Sample Selection" (blue button)

**What You See**:
```
┌──────────────────────────────────────────────────────────┐
│  Pending Sample Selection  │  Resample Pending           │
│  (Active - Blue)           │  (Inactive - Gray)          │
└──────────────────────────────────────────────────────────┘

Date: 19-03-2026  Paddy Sample
1. Mallesh
┌────┬──────┬──────┬────────────┬──────────┬─────────┬────────┐
│ SL │ Bags │ Pkg  │ Party Name │ Location │ Variety │ Action │
├────┼──────┼──────┼────────────┼──────────┼─────────┼────────┤
│ 1  │ 500  │ 75kg │ Test Party │ Marwi    │ Sum25   │ [Pass  │
│    │      │      │            │          │ Rnr     │  Without│
│    │      │      │            │          │         │  Cooking]│
│    │      │      │            │          │         │ [Pass  │
│    │      │      │            │          │         │  With  │
│    │      │      │            │          │         │  Cooking]│
│    │      │      │            │          │         │ [Resample]│
│    │      │      │            │          │         │ [Sold Out]│
└────┴──────┴──────┴────────────┴──────────┴─────────┴────────┘
```

**Action**: Click "Resample" button

**Confirmation Dialog**:
```
┌─────────────────────────────────────────┐
│  Confirm Resample                       │
├─────────────────────────────────────────┤
│  Are you sure you want to mark this     │
│  entry for resample?                    │
│                                         │
│  [Cancel]  [Confirm Resample]           │
└─────────────────────────────────────────┘
```

**Click**: "Confirm Resample"

**Result**:
- ✅ Success notification: "Entry marked as failed"
- Entry DISAPPEARS from "Pending Sample Selection" section
- Entry APPEARS in "Resample Allotment" section (scroll down on same page)

**Where to Find Entry Now**:
- Same page, scroll down to "Resample Allotment" section
- Shows: "Assign" button next to the entry

---

## Step 4: Manager Assigns Location Supervisor

**Who**: Manager  
**Tab**: Still on "Pending (Sample Selection)" page  
**Section**: "Resample Allotment" (scroll down)

**What You See**:
```
┌──────────────────────────────────────────────────────────┐
│  Resample Allotment                                      │
├──────────────────────────────────────────────────────────┤
│  Date: 19-03-2026  Paddy Sample                          │
│  1. Mallesh                                              │
│  ┌────┬──────┬──────┬────────────┬──────────┬─────────┐ │
│  │ SL │ Bags │ Pkg  │ Party Name │ Location │ Action  │ │
│  ├────┼──────┼──────┼────────────┼──────────┼─────────┤ │
│  │ 1  │ 500  │ 75kg │ Test Party │ Marwi    │ [Assign]│ │
│  └────┴──────┴──────┴────────────┴──────────┴─────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Action**: Click "Assign" button

**Assignment Modal Opens**:
```
┌─────────────────────────────────────────┐
│  Assign Supervisor for Resample         │
├─────────────────────────────────────────┤
│  Entry: Test Party - Marwi              │
│  Broker: Mallesh                        │
│                                         │
│  Select Supervisor:                     │
│  [Dropdown: Marjuntah Patil ▼]          │
│                                         │
│  [Cancel]  [Assign Supervisor]          │
└─────────────────────────────────────────┘
```

**Select**: "Marjuntah Patil" from dropdown  
**Click**: "Assign Supervisor"

**Result**:
- ✅ Success notification: "Supervisor assigned successfully"
- Entry DISAPPEARS from "Resample Allotment" section
- Entry APPEARS in "Location Sample" tab (for supervisor to add resample quality)

**Where to Find Entry Now**:
- Tab: "Paddy Sample Records" → "Location Sample"
- Shows: Entry with ORANGE background (resample indicator)
- Shows: "Next >" button for quality entry

---

## Step 5: Location Supervisor Adds Resample Quality

**Who**: Location Supervisor (Marjuntah Patil)  
**Tab**: "Paddy Sample Records" → "Location Sample" tab

**What You See**:
```
┌──────────────────────────────────────────────────────────┐
│  Location Sample Tab                                     │
├──────────────────────────────────────────────────────────┤
│  Date: 19-03-2026  Paddy Sample                          │
│  1. Mallesh                                              │
│  ┌────┬──────┬──────┬────────────┬──────────┬─────────┐ │
│  │ SL │ Bags │ Pkg  │ Party Name │ Variety  │ Action  │ │
│  ├────┼──────┼──────┼────────────┼──────────┼─────────┤ │
│  │ 1  │ 500  │ 75kg │ Test Party │ Sum25 Rnr│ [Next >]│ │
│  │    │      │      │            │ 🔄       │         │ │
│  └────┴──────┴──────┴────────────┴──────────┴─────────┘ │
│  (Orange background = Resample entry)                    │
└──────────────────────────────────────────────────────────┘
```

**Action**: Click "Next >" button

**Quality Modal Opens** (FRESH/EMPTY FORM):
```
┌─────────────────────────────────────────┐
│  Add Resample Quality Parameters        │
│  (Resample Round 2)                     │
├─────────────────────────────────────────┤
│  Moisture: [  ]  ← EMPTY                │
│  Cutting: [  ]   ← EMPTY                │
│  Bend: [  ]      ← EMPTY                │
│  Mix: [  ]       ← EMPTY                │
│  Kandu: [  ]     ← EMPTY                │
│  Oil: [  ]       ← EMPTY                │
│  SK: [  ]        ← EMPTY                │
│  Grains Count: [  ]  ← EMPTY            │
│  Reported By: [Marjuntah Patil]         │
│                                         │
│  [Cancel]  [Save Quality Parameters]    │
└─────────────────────────────────────────┘
```

**Fill NEW Quality** (different from original):
- Moisture: 15
- Cutting: 2×5
- Bend: 2×5
- Mix: 5
- Kandu: 5
- Oil: 5
- SK: 5
- Grains Count: 150

**Click**: "Save Quality Parameters"

**Result**:
- ✅ Success notification: "Quality parameters saved successfully"
- Page refreshes automatically
- Entry shows: "✅ Quality Completed" in GREEN
- Entry DISAPPEARS from "Location Sample" tab
- Entry APPEARS in "Paddy Sample Book" tab

**Where to Find Entry Now**:
- Tab: "Paddy Sample Book" (shows quality completed)
- Tab: "Pending (Sample Selection)" → "Resample Pending" (for manager review)

---

## Step 6: Manager Reviews Resample Quality

**Who**: Manager  
**Tab**: "Pending (Sample Selection)" (top navigation)  
**Sub-Tab**: "Resample Pending" (orange button)

**What You See**:
```
┌──────────────────────────────────────────────────────────┐
│  Pending Sample Selection  │  Resample Pending (1)       │
│  (Inactive - Gray)         │  (Active - Orange)          │
└──────────────────────────────────────────────────────────┘

Date: 19-03-2026  Paddy Sample (Resample)
1. Mallesh
┌────┬──────┬──────┬────────────┬──────────┬─────────┬────────┐
│ SL │ Bags │ Pkg  │ Party Name │ Location │ Variety │ Action │
├────┼──────┼──────┼────────────┼──────────┼─────────┼────────┤
│ 1  │ 500  │ 75kg │ Test Party │ Marwi    │ Sum25   │ [Pass  │
│    │      │      │            │          │ Rnr 🔄  │  Without│
│    │      │      │            │          │         │  Cooking]│
│    │      │      │            │          │         │ [Pass  │
│    │      │      │            │          │         │  With  │
│    │      │      │            │          │         │  Cooking]│
│    │      │      │            │          │         │ [Fail]  │
└────┴──────┴──────┴────────────┴──────────┴─────────┴────────┘
```

**Action**: Click "Pass With Cooking" button

**Confirmation Dialog**:
```
┌─────────────────────────────────────────┐
│  Confirm Decision                       │
├─────────────────────────────────────────┤
│  Pass this entry with cooking test?     │
│                                         │
│  [Cancel]  [Confirm]                    │
└─────────────────────────────────────────┘
```

**Click**: "Confirm"

**Result**:
- ✅ Success notification: "Entry passed and moved to Cooking Report"
- Entry DISAPPEARS from "Resample Pending"
- Entry APPEARS in "Cooking Book" → "Resample Cooking Book" tab

**Where to Find Entry Now**:
- Tab: "Cooking Book" (top navigation)
- Sub-Tab: "Resample Cooking Book"
- Shows: Entry ready for cooking test

---

## Step 7: View in Paddy Sample Book 2 (Quality Report)

**Who**: Manager/Admin  
**Tab**: "Paddy Sample Book 2" (top navigation)

**What You See**:
```
┌──────────────────────────────────────────────────────────────────┐
│  Paddy Sample Book 2                                             │
├──────────────────────────────────────────────────────────────────┤
│  Date: 19-03-2026  Paddy Sample                                  │
│  1. Mallesh                                                      │
│  ┌────┬──────┬────────────┬──────────┬─────────┬──────────────┐ │
│  │ SL │ Bags │ Party Name │ Location │ Variety │ Quality      │ │
│  │    │      │            │          │         │ Report       │ │
│  ├────┼──────┼────────────┼──────────┼─────────┼──────────────┤ │
│  │ 1  │ 500  │ Test Party │ Marwi    │ Sum25   │ 1st: Done    │ │
│  │    │      │            │          │ Rnr     │      Pass    │ │
│  │    │      │            │          │         │ 2nd: Done    │ │
│  │    │      │            │          │         │      Pending │ │
│  └────┴──────┴────────────┴──────────┴─────────┴──────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Quality Report Column Shows**:
- **1st**: Done (green) - Pass (green) ← Original quality
- **2nd**: Done (green) - Pending (orange) ← Resample quality

**Click on Party Name** to see full details:
```
┌─────────────────────────────────────────┐
│  Entry Details                          │
├─────────────────────────────────────────┤
│  Party: Test Party                      │
│  Broker: Mallesh                        │
│  Location: Marwi                        │
│  Bags: 500 × 75 kg                      │
│                                         │
│  Quality Attempts:                      │
│  ┌─────────────────────────────────┐   │
│  │ Attempt 1 (Original)            │   │
│  │ Moisture: 14                    │   │
│  │ Cutting: 1×4                    │   │
│  │ Bend: 1×4                       │   │
│  │ Mix: 4, Kandu: 4, Oil: 4, SK: 4 │   │
│  │ Grains: 144                     │   │
│  │ Reported By: Marjuntah Patil    │   │
│  │ Status: Pass                    │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Attempt 2 (Resample)            │   │
│  │ Moisture: 15                    │   │
│  │ Cutting: 2×5                    │   │
│  │ Bend: 2×5                       │   │
│  │ Mix: 5, Kandu: 5, Oil: 5, SK: 5 │   │
│  │ Grains: 150                     │   │
│  │ Reported By: Marjuntah Patil    │   │
│  │ Status: Pending                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Close]                                │
└─────────────────────────────────────────┘
```

---

## Complete Tab Flow Summary

### Normal Workflow (No Resample):
1. **Location Sample** → Add entry
2. **Location Sample** → Add quality (Next >)
3. **Paddy Sample Book** → View completed quality
4. **Pending (Sample Selection)** → Manager decision
5. **Cooking Book** OR **Final Pass Lots** → Final destination

### Resample Workflow:
1. **Location Sample** → Add entry
2. **Location Sample** → Add quality (Next >)
3. **Paddy Sample Book** → View completed quality
4. **Pending (Sample Selection)** → Manager marks FAIL
5. **Pending (Sample Selection)** → Resample Allotment section → Assign supervisor
6. **Location Sample** (orange background) → Add resample quality (Next >)
7. **Paddy Sample Book** → View completed resample quality
8. **Pending (Sample Selection)** → **Resample Pending** tab → Manager decision
9. **Resample Cooking Book** OR **Final Pass Lots** → Final destination

---

## Key Visual Indicators

### Entry Status Colors:
- **Orange Background** = Resample entry (needs new quality)
- **Green ✅** = Quality Completed
- **Red ❌** = Failed/Rejected
- **Blue 🔄** = Recheck pending

### Quality Status Badges:
- **Done** (green background) = Full quality completed
- **100-Gms** (yellow background) = Only 100g test done
- **Pending** (gray background) = Waiting for quality
- **Resampling** (orange background) = Resample in progress

### Tab Badge Counts:
- **Pending Sample Selection (5)** = 5 entries waiting for decision
- **Resample Pending (2)** = 2 resample entries ready for review
- Numbers update in real-time

---

## Common Questions

**Q: Where do I find resample entries after assigning supervisor?**  
A: Go to "Paddy Sample Records" → "Location Sample" tab. Look for entries with ORANGE background.

**Q: How do I know if an entry is a resample?**  
A: Look for:
- Orange background in Location Sample tab
- 🔄 symbol next to variety name
- "Resample Round 2" in quality modal title
- Multiple quality attempts in Paddy Sample Book 2

**Q: Why don't I see the entry in Resample Pending after adding quality?**  
A: Make sure:
- Quality was saved successfully (green notification)
- Page refreshed automatically
- You're on the "Resample Pending" tab (orange button)
- Entry has lotSelectionDecision = 'FAIL'

**Q: Can I see both original and resample quality?**  
A: Yes! Go to "Paddy Sample Book 2" and click on the party name. The popup shows all quality attempts with attempt numbers.

---

## Troubleshooting

### Entry not showing in Resample Pending:
1. Check if quality was saved (should see green notification)
2. Refresh the page
3. Check "Paddy Sample Book" - should show "Quality Completed"
4. Check browser console for errors
5. Verify backend created 2 attempts in qualityAttemptDetails

### Quality modal shows old data:
1. This should NOT happen after the fix
2. If it does, check entry.workflowStatus (should be 'QUALITY_CHECK')
3. Check entry.lotSelectionDecision (should be 'FAIL')
4. Report to developer

### Entry disappeared after quality save:
1. This is CORRECT behavior
2. Entry moves from "Location Sample" to "Paddy Sample Book"
3. Also appears in "Resample Pending" for manager review

---

## Success Checklist

After completing resample workflow, verify:

✅ Entry shows in "Resample Pending" tab  
✅ Quality status shows "1st: Done Pass, 2nd: Done Pending"  
✅ Paddy Sample Book 2 shows 2 quality attempts  
✅ No extra "Resampling" row in quality status  
✅ Manager can make decision (Pass/Fail)  
✅ Entry moves to correct final destination  

---

**Last Updated**: March 19, 2026  
**Version**: 2.0 (After resample workflow fix)
