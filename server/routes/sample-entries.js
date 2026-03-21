const express = require('express');
const router = express.Router();
const { auth: authenticateToken } = require('../middleware/auth');
const SampleEntryService = require('../services/SampleEntryService');
const QualityParametersService = require('../services/QualityParametersService');
const CookingReportService = require('../services/CookingReportService');
const LotAllotmentService = require('../services/LotAllotmentService');
const PhysicalInspectionService = require('../services/PhysicalInspectionService');
const InventoryDataService = require('../services/InventoryDataService');
const FinancialCalculationService = require('../services/FinancialCalculationService');
const WorkflowEngine = require('../services/WorkflowEngine');
const FileUploadService = require('../services/FileUploadService');
const SampleEntry = require('../models/SampleEntry');
const QualityParameters = require('../models/QualityParameters');
const SampleEntryOffering = require('../models/SampleEntryOffering');
const CookingReport = require('../models/CookingReport');
const SampleEntryAuditLog = require('../models/SampleEntryAuditLog');
const User = require('../models/User');
const { Op, col, where: sqlWhere } = require('sequelize');
const getWorkflowRole = (user) => user?.effectiveRole || user?.role;
const canLocationStaffEditQuality = async (sampleEntry, reqUser) => {
  const workflowRole = getWorkflowRole(reqUser);
  if (workflowRole !== 'physical_supervisor') {
    return true;
  }

  let currentUsername = String(reqUser?.username || '').trim().toLowerCase();
  if (!currentUsername) {
    const currentUser = await User.findByPk(reqUser.userId, { attributes: ['username'], raw: true });
    currentUsername = String(currentUser?.username || '').trim().toLowerCase();
  }

  const assignedUsername = String(sampleEntry.sampleCollectedBy || '').trim().toLowerCase();

  // Resample assignment: only the assigned location staff can edit quality (any entry type).
  if (sampleEntry.lotSelectionDecision === 'FAIL' && assignedUsername) {
    return assignedUsername === currentUsername;
  }

  if (sampleEntry.entryType !== 'LOCATION_SAMPLE') {
    return true;
  }

  // Restriction: If Location Sample is "Taken By" (not given to office),
  // only the specific user who collected it can add quality.
  if (sampleEntry.sampleGivenToOffice === true) {
    return true;
  }

  if (assignedUsername && currentUsername) {
    return assignedUsername === currentUsername;
  }

  return sampleEntry.createdByUserId === reqUser.userId;
};

const invalidateSampleEntryTabCaches = () => {
  [
    'sample-entries/tabs/edit-approvals',
    'sample-entries/tabs/final-pass-lots',
    'sample-entries/tabs/loading-lots',
    'sample-entries/tabs/resample-assignments',
    'sample-entries/tabs/completed-lots',
    'sample-entries/tabs/sample-book',
    'sample-entries/by-role'
  ].forEach(invalidateCache);
};

// --- Quality Parameters Helper Functions ---
const parseFloatSafe = (value, fallback = 0) => {
  if (value === undefined || value === null) return fallback;
  if (value === '') return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
};

const parseIntSafe = (value, fallback = 0) => {
  if (value === undefined || value === null) return fallback;
  if (value === '') return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

const normalizeAlphaNumeric = (value, fallback = '0') => {
  if (value === undefined || value === null) return fallback;
  if (value === '') return '0';
  const raw = String(value).trim();
  if (!raw) return fallback;
  const capped = raw.slice(0, 20);
  if (/[a-zA-Z]/.test(capped)) return capped;
  const num = parseFloat(capped);
  return Number.isFinite(num) ? String(num) : fallback;
};

const normalizeRaw = (value) => {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  return raw === '' ? null : raw;
};

const parseBoolFlag = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return null;
};
const toTitleCaseWords = (value) => String(value || '')
  .toLowerCase()
  .replace(/\b\w/g, (char) => char.toUpperCase())
  .trim();

const normalizeAuditMetadata = (metadata) => {
  if (!metadata) return null;
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch (error) {
      return null;
    }
  }
  return metadata;
};

const hasAlphaOrPositive = (value) => {
  if (value === undefined || value === null) return false;
  const raw = String(value).trim();
  if (!raw) return false;
  if (/[a-zA-Z]/.test(raw)) return true;
  const num = Number(raw);
  return Number.isFinite(num);
};

const normalizeGramsReport = (value, fallback = '10gms') => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === '5gms' ? '5gms' : '10gms';
};
const isProvidedNumericValue = (rawVal, valueVal) => {
  const raw = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
  if (raw !== '') return true;
  const num = Number(valueVal);
  return Number.isFinite(num);
};
const isProvidedAlphaValue = (rawVal, valueVal) => {
  const raw = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
  if (raw !== '') return true;
  return hasAlphaOrPositive(valueVal);
};
const hasQualitySnapshot = (attempt = {}) => {
  const hasMoisture = isProvidedNumericValue(attempt.moistureRaw, attempt.moisture);
  const hasGrains = isProvidedNumericValue(attempt.grainsCountRaw, attempt.grainsCount);
  const hasDetailedQuality =
    isProvidedNumericValue(attempt.cutting1Raw, attempt.cutting1) ||
    isProvidedNumericValue(attempt.bend1Raw, attempt.bend1) ||
    isProvidedAlphaValue(attempt.mixRaw, attempt.mix) ||
    isProvidedAlphaValue(attempt.mixSRaw, attempt.mixS) ||
    isProvidedAlphaValue(attempt.mixLRaw, attempt.mixL) ||
    isProvidedAlphaValue(attempt.kanduRaw, attempt.kandu) ||
    isProvidedAlphaValue(attempt.oilRaw, attempt.oil) ||
    isProvidedAlphaValue(attempt.skRaw, attempt.sk);

  return hasMoisture && (hasGrains || hasDetailedQuality);
};
const hasAnyDetailedQuality = (attempt = {}) => (
  isProvidedNumericValue(attempt.cutting1Raw, attempt.cutting1)
  || isProvidedNumericValue(attempt.cutting2Raw, attempt.cutting2)
  || isProvidedNumericValue(attempt.bend1Raw, attempt.bend1)
  || isProvidedNumericValue(attempt.bend2Raw, attempt.bend2)
  || isProvidedAlphaValue(attempt.mixRaw, attempt.mix)
  || isProvidedAlphaValue(attempt.mixSRaw, attempt.mixS)
  || isProvidedAlphaValue(attempt.mixLRaw, attempt.mixL)
  || isProvidedAlphaValue(attempt.kanduRaw, attempt.kandu)
  || isProvidedAlphaValue(attempt.oilRaw, attempt.oil)
  || isProvidedAlphaValue(attempt.skRaw, attempt.sk)
);
const hasFullQualitySnapshot = (attempt = {}) => {
  const hasMoisture = isProvidedNumericValue(attempt.moistureRaw, attempt.moisture);
  const hasGrains = isProvidedNumericValue(attempt.grainsCountRaw, attempt.grainsCount);
  return hasMoisture
    && hasGrains
    && isProvidedNumericValue(attempt.cutting1Raw, attempt.cutting1)
    && isProvidedNumericValue(attempt.cutting2Raw, attempt.cutting2)
    && isProvidedNumericValue(attempt.bend1Raw, attempt.bend1)
    && isProvidedNumericValue(attempt.bend2Raw, attempt.bend2)
    && isProvidedAlphaValue(attempt.mixRaw, attempt.mix)
    && isProvidedAlphaValue(attempt.kanduRaw, attempt.kandu)
    && isProvidedAlphaValue(attempt.oilRaw, attempt.oil)
    && isProvidedAlphaValue(attempt.skRaw, attempt.sk);
};
const hasSampleBookReadySnapshot = (attempt = {}) => {
  const hasMoisture = isProvidedNumericValue(attempt.moistureRaw, attempt.moisture);
  const hasGrains = isProvidedNumericValue(attempt.grainsCountRaw, attempt.grainsCount);
  if (!hasMoisture || !hasGrains) return false;
  if (hasFullQualitySnapshot(attempt)) return true;
  return !hasAnyDetailedQuality(attempt);
};
const normalizeAttemptValue = (value = '') => String(value ?? '').trim().toLowerCase();
const areQualityAttemptsEquivalent = (left = {}, right = {}) => {
  const fields = [
    'reportedBy',
    'moistureRaw', 'moisture',
    'grainsCountRaw', 'grainsCount',
    'cutting1Raw', 'cutting1',
    'cutting2Raw', 'cutting2',
    'bend1Raw', 'bend1',
    'bend2Raw', 'bend2',
    'mixRaw', 'mix',
    'mixSRaw', 'mixS',
    'mixLRaw', 'mixL',
    'kanduRaw', 'kandu',
    'oilRaw', 'oil',
    'skRaw', 'sk',
    'wbRRaw', 'wbR',
    'wbBkRaw', 'wbBk',
    'wbTRaw', 'wbT',
    'paddyWbRaw', 'paddyWb',
    'smellHas', 'smellType'
  ];
  return fields.every((field) => normalizeAttemptValue(left?.[field]) === normalizeAttemptValue(right?.[field]));
};
const getQualityAttemptsForEntry = (entry = {}) => {
  const attempts = Array.isArray(entry.qualityAttemptDetails)
    ? [...entry.qualityAttemptDetails].filter(Boolean).sort((a, b) => (a.attemptNo || 0) - (b.attemptNo || 0))
    : [];
  const currentQuality = entry.qualityParameters;
  if (!currentQuality || !hasQualitySnapshot(currentQuality)) {
    return attempts;
  }
  const alreadyIncluded = attempts.some((attempt) => (
    (attempt.id && currentQuality.id && String(attempt.id) === String(currentQuality.id))
    || areQualityAttemptsEquivalent(attempt, currentQuality)
  ));
  if (alreadyIncluded) {
    return attempts;
  }
  return [
    ...attempts,
    {
      ...currentQuality,
      attemptNo: attempts.length + 1
    }
  ];
};
const hasPostResampleSampleBookAttempt = (entry = {}) => {
  const attempts = getQualityAttemptsForEntry(entry);
  if (attempts.length <= 1) return false;
  const latestAttempt = attempts[attempts.length - 1] || null;
  return !!latestAttempt && hasSampleBookReadySnapshot(latestAttempt);
};
const hasAssignedResampleCollector = (entry = {}) => {
  const timeline = Array.isArray(entry?.resampleCollectedTimeline) ? entry.resampleCollectedTimeline.filter(Boolean) : [];
  const history = Array.isArray(entry?.resampleCollectedHistory) ? entry.resampleCollectedHistory.filter(Boolean) : [];
  if (timeline.length > 0 || history.length > 0) return true;
  const assignedName = String(entry.sampleCollectedBy || '').trim().toLowerCase();
  return !!assignedName && assignedName !== 'broker office sample';
};
const hasCompletedResampleSampleBookAttempt = (entry = {}) => {
  if (!hasAssignedResampleCollector(entry)) return false;
  const workflow = String(entry.workflowStatus || '').toUpperCase();
  if (workflow === 'STAFF_ENTRY' || workflow === 'LOT_ALLOTMENT') return false;
  return hasPostResampleSampleBookAttempt(entry);
};
const isFinalPassVisibleEntry = (entry = {}) => {
  const workflow = String(entry.workflowStatus || '').toUpperCase();
  const decision = String(entry.lotSelectionDecision || '').toUpperCase();
  const cookingStatus = String(entry.cookingReport?.status || '').toUpperCase();
  const hasResampleHistory = Boolean(entry.resampleStartAt) || Number(entry.qualityReportAttempts || 0) > 1;
  const hasFinalizedOffer = Boolean(entry.offering?.finalPrice || entry.offering?.isFinalized || entry.finalPrice);

  if (workflow === 'FAILED' || decision === 'SOLDOUT') return false;

  if (decision === 'FAIL') {
    if (workflow === 'LOT_ALLOTMENT' && hasFinalizedOffer) return false;
    return ['STAFF_ENTRY', 'QUALITY_CHECK', 'COOKING_REPORT', 'LOT_SELECTION', 'FINAL_REPORT', 'LOT_ALLOTMENT'].includes(workflow);
  }

  if (hasResampleHistory && decision === 'PASS_WITH_COOKING') {
    if (workflow === 'LOT_ALLOTMENT' && hasFinalizedOffer) return false;
    return ['QUALITY_CHECK', 'COOKING_REPORT', 'LOT_SELECTION', 'FINAL_REPORT', 'LOT_ALLOTMENT'].includes(workflow);
  }

  if (workflow === 'FINAL_REPORT') return true;

  return workflow === 'LOT_SELECTION'
    && decision === 'PASS_WITH_COOKING'
    && ['PASS', 'MEDIUM'].includes(cookingStatus);
};
// ------------------------------------------
const getRecheckState = async (sampleEntryId, qualityUpdatedAt, cookingUpdatedAt, qualitySnapshot = null, cookingSnapshot = null) => {
  try {
    const isProvidedNumeric = (rawVal, valueVal) => {
      const raw = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
      if (raw !== '') return true;
      const num = Number(valueVal);
      return Number.isFinite(num) && num > 0;
    };
    const isProvidedAlpha = (rawVal, valueVal) => {
      const raw = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
      if (raw !== '') return true;
      return hasAlphaOrPositive(valueVal);
    };
    const hasQualityData = (qp) => {
      if (!qp) return false;
      const moisture = isProvidedNumeric(qp.moistureRaw, qp.moisture);
      const grains = isProvidedNumeric(qp.grainsCountRaw, qp.grainsCount);
      const cutting = isProvidedNumeric(qp.cutting1Raw, qp.cutting1);
      const bend = isProvidedNumeric(qp.bend1Raw, qp.bend1);
      const mix = isProvidedAlpha(qp.mixRaw, qp.mix)
        || isProvidedAlpha(qp.mixSRaw, qp.mixS)
        || isProvidedAlpha(qp.mixLRaw, qp.mixL);
      return moisture && (grains || cutting || bend || mix);
    };
    const hasCookingData = (cr) => {
      if (!cr) return false;
      const status = String(cr.status || '').trim();
      const doneBy = String(cr.cookingDoneBy || '').trim();
      const approvedBy = String(cr.cookingApprovedBy || '').trim();
      return !!(status || doneBy || approvedBy);
    };

    const transitionLogs = await SampleEntryAuditLog.findAll({
      where: {
        tableName: 'sample_entries',
        actionType: 'WORKFLOW_TRANSITION',
        recordId: sampleEntryId
      },
      order: [['createdAt', 'DESC']],
      limit: 50,
      raw: true
    });
    const latestRecheckLog = transitionLogs.find((log) => {
      const meta = normalizeAuditMetadata(log?.metadata);
      return meta?.recheckRequested === true;
    });
    const latestMeta = normalizeAuditMetadata(latestRecheckLog?.metadata) || null;

    if (!latestMeta?.recheckRequested) {
      return {
        recheckRequested: false,
        recheckType: null,
        recheckAt: null,
        qualityPending: false,
        cookingPending: false
      };
    }

    const recheckType = latestMeta.recheckType || null;
    const previousDecision = latestMeta.previousDecision || null;
    const recheckAt = latestRecheckLog.createdAt || null;
    const recheckTime = recheckAt ? new Date(recheckAt).getTime() : null;
    const qualityTime = qualityUpdatedAt ? new Date(qualityUpdatedAt).getTime() : null;
    const cookingTime = cookingUpdatedAt ? new Date(cookingUpdatedAt).getTime() : null;

    const qualityDone = !!(qualityTime && recheckTime && qualityTime >= recheckTime) && hasQualityData(qualitySnapshot);
    const cookingDone = !!(cookingTime && recheckTime && cookingTime >= recheckTime) && hasCookingData(cookingSnapshot);

    let recheckRequested = true;
    if (recheckType === 'quality') {
      recheckRequested = !qualityDone;
    } else if (recheckType === 'cooking') {
      recheckRequested = !cookingDone;
    } else if (recheckType === 'both') {
      recheckRequested = !(qualityDone && cookingDone);
    } else {
      recheckRequested = false;
    }

      return {
        recheckRequested,
        recheckType,
        recheckAt,
        recheckPreviousDecision: previousDecision,
        qualityPending: (recheckType === 'quality' || recheckType === 'both') ? !qualityDone : false,
        cookingPending: (recheckType === 'cooking' || recheckType === 'both') ? !cookingDone : false
      };
  } catch (error) {
    console.error('Non-critical error fetching recheck status:', error);
    return {
      recheckRequested: false,
      recheckType: null,
      recheckAt: null,
      recheckPreviousDecision: null,
      qualityPending: false,
      cookingPending: false
    };
  }
};

const getRecheckStateForEntries = async (entries) => {
  const result = new Map();
  const ids = entries.map((entry) => entry.id).filter(Boolean);
  if (ids.length === 0) return result;

  const logs = await SampleEntryAuditLog.findAll({
    where: {
      tableName: 'sample_entries',
      actionType: 'WORKFLOW_TRANSITION',
      recordId: { [Op.in]: ids }
    },
    order: [['createdAt', 'DESC']],
    raw: true
  });

  const latestByEntry = new Map();
  logs.forEach((log) => {
    if (latestByEntry.has(log.recordId)) return;
    const meta = normalizeAuditMetadata(log?.metadata);
    if (meta?.recheckRequested === true) {
      latestByEntry.set(log.recordId, {
        meta,
        createdAt: log.createdAt || null
      });
    }
  });

  const isProvidedNumeric = (rawVal, valueVal) => {
    const raw = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
    if (raw !== '') return true;
    const num = Number(valueVal);
    return Number.isFinite(num) && num > 0;
  };
  const isProvidedAlpha = (rawVal, valueVal) => {
    const raw = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
    if (raw !== '') return true;
    return hasAlphaOrPositive(valueVal);
  };
  const hasQualityData = (qp) => {
    if (!qp) return false;
    const moisture = isProvidedNumeric(qp.moistureRaw, qp.moisture);
    const grains = isProvidedNumeric(qp.grainsCountRaw, qp.grainsCount);
    const cutting = isProvidedNumeric(qp.cutting1Raw, qp.cutting1);
    const bend = isProvidedNumeric(qp.bend1Raw, qp.bend1);
    const mix = isProvidedAlpha(qp.mixRaw, qp.mix)
      || isProvidedAlpha(qp.mixSRaw, qp.mixS)
      || isProvidedAlpha(qp.mixLRaw, qp.mixL);
    return moisture && (grains || cutting || bend || mix);
  };
  const hasCookingData = (cr) => {
    if (!cr) return false;
    const status = String(cr.status || '').trim();
    const doneBy = String(cr.cookingDoneBy || '').trim();
    const approvedBy = String(cr.cookingApprovedBy || '').trim();
    return !!(status || doneBy || approvedBy);
  };

  entries.forEach((entry) => {
    const latest = latestByEntry.get(entry.id);
    if (!latest?.meta?.recheckRequested) {
      result.set(entry.id, {
        recheckRequested: false,
        recheckType: null,
        recheckAt: null,
        recheckPreviousDecision: null,
        qualityPending: false,
        cookingPending: false
      });
      return;
    }

    const recheckType = latest.meta.recheckType || null;
    const recheckAt = latest.createdAt || null;
    const qualitySnapshot = entry.qualityParameters || null;
    const cookingSnapshot = entry.cookingReport || null;

    const qualityDone = hasQualityData(qualitySnapshot);
    const cookingDone = hasCookingData(cookingSnapshot);

    let recheckRequested = true;
    if (recheckType === 'quality') {
      recheckRequested = !qualityDone;
    } else if (recheckType === 'cooking') {
      recheckRequested = !cookingDone;
    } else if (recheckType === 'both') {
      recheckRequested = !(qualityDone && cookingDone);
    } else {
      recheckRequested = false;
    }

    result.set(entry.id, {
      recheckRequested,
      recheckType,
      recheckAt,
      recheckPreviousDecision: latest.meta.previousDecision || null,
      qualityPending: (recheckType === 'quality' || recheckType === 'both') ? !qualityDone : false,
      cookingPending: (recheckType === 'cooking' || recheckType === 'both') ? !cookingDone : false
    });
  });

  return result;
};

// ─── Paddy Supervisors list (for Sample Collected By dropdown) ───
router.get('/paddy-supervisors', authenticateToken, async (req, res) => {
  try {
    const { staffType } = req.query;
    const whereClause = {
      role: { [Op.in]: ['staff', 'paddy_supervisor'] },
      isActive: true
    };
    if (staffType) {
      whereClause.staffType = staffType;
    }
    const supervisors = await User.findAll({
      where: whereClause,
      attributes: ['id', 'username', 'fullName', 'staffType'],
      order: [['username', 'ASC']]
    });

    res.json({
      success: true,
      users: supervisors.map(u => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName || null,
        staffType: u.staffType || null
      }))
    });
  } catch (error) {
    console.error('Get paddy supervisors error:', error);
    res.status(500).json({ error: 'Failed to fetch paddy supervisors' });
  }
});

// Staff-only: Move entry to QUALITY_CHECK without adding quality parameters
router.post('/:id/send-to-quality', authenticateToken, async (req, res) => {
  try {
    const entryId = req.params.id;

    // Only staff can use this endpoint
    if (req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Only staff can use this endpoint' });
    }

    // Get the entry to verify it exists
    const SampleEntry = require('../models/SampleEntry');
    const entry = await SampleEntry.findByPk(entryId);

    if (!entry) {
      return res.status(404).json({ error: 'Sample entry not found' });
    }

    // Check current status
    if (entry.workflowStatus !== 'STAFF_ENTRY') {
      return res.status(400).json({ error: 'Entry is not in STAFF_ENTRY status' });
    }

    // Transition to QUALITY_CHECK
    await WorkflowEngine.transitionTo(
      entryId,
      'QUALITY_CHECK',
      req.user.userId,
      getWorkflowRole(req.user),
      { sentByStaff: true }
    );

    res.json({ message: 'Entry sent to Quality Supervisor successfully' });
  } catch (error) {
    console.error('Error sending to quality:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create sample entry (Staff)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const upload = FileUploadService.getUploadMiddleware();
    upload.fields([{ name: 'godownImage', maxCount: 1 }, { name: 'paddyLotImage', maxCount: 1 }])(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      try {
        const entryData = { ...req.body };

        // Handle uploaded files
        if (req.files) {
          if (req.files.godownImage && req.files.godownImage[0]) {
            const uploadResult = await FileUploadService.uploadFile(req.files.godownImage[0], { compress: true });
            entryData.godownImageUrl = uploadResult.fileUrl;
          }
          if (req.files.paddyLotImage && req.files.paddyLotImage[0]) {
            const uploadResult = await FileUploadService.uploadFile(req.files.paddyLotImage[0], { compress: true });
            entryData.paddyLotImageUrl = uploadResult.fileUrl;
          }
        }

        // Parse boolean and numeric values that might come as strings from FormData
        if (entryData.smellHas !== undefined) {
          entryData.smellHas = entryData.smellHas === 'true';
        }
        if (entryData.sampleGivenToOffice !== undefined) {
          entryData.sampleGivenToOffice = entryData.sampleGivenToOffice === 'true';
        }
        if (Object.prototype.hasOwnProperty.call(entryData, 'bags')) {
          const rawBags = String(entryData.bags ?? '').trim();
          const parsedBags = parseInt(rawBags, 10);
          if (!rawBags || Number.isNaN(parsedBags) || parsedBags < 1) {
            return res.status(400).json({ error: 'Bags must be a positive number.' });
          }
          entryData.bags = parsedBags;
        }

        const requiredError = validateRequiredEntryFields(entryData.entryType, entryData);
        if (requiredError) {
          return res.status(400).json({ error: requiredError });
        }

        const entry = await SampleEntryService.createSampleEntry(entryData, req.user.userId);
        res.status(201).json(entry);
      } catch (error) {
        console.error('Error creating sample entry:', error);
        res.status(400).json({ error: error.message });
      }
    });
  } catch (error) {
    console.error('Error setting up file upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sample entries by role
router.get('/by-role', authenticateToken, async (req, res) => {
  try {
    const { status, startDate, endDate, broker, variety, party, location, collectedBy, page, pageSize, cursor, entryType, excludeEntryType, sampleType } = req.query;

    const filters = {
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      broker,
      variety,
      party,
      location,
      collectedBy,
      sampleType,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 50,
      cursor,
      staffType: req.user.staffType || null,
      staffUsername: req.user.username || null,
      entryType,
      excludeEntryType
    };

    // Keep sample-book visibility for all staff users (mill/location).
    // For listing endpoints, using effectiveRole (quality_supervisor/physical_supervisor)
    // applies strict workflow status filters and hides normal staff entries.
    const queryRole =
      req.user.role === 'staff'
        ? 'staff'
        : getWorkflowRole(req.user);

    // DEBUG: Log privacy context for troubleshooting
    if (status === 'LOCATION_SAMPLE' || status === 'SAMPLE_BOOK') {
      console.log('[PRIVACY DEBUG] by-role request:', {
        queryRole,
        userId: req.user.userId,
        username: req.user.username,
        staffType: req.user.staffType,
        status,
        entryType
      });
    }

    const result = await SampleEntryService.getSampleEntriesByRole(queryRole, filters, req.user.userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting sample entries:', error);
    res.status(500).json({ error: error.message });
  }
});

const { buildCursorQuery, formatCursorResponse } = require('../utils/cursorPagination');
const {
  SAMPLE_ENTRY_CURSOR_FIELDS,
  fetchHydratedSampleEntryPage
} = require('../utils/sampleEntryPagination');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

// ─── TAB ROUTES (MUST be before /:id to avoid route shadowing) ───

const { attachLoadingLotsHistories } = require('../utils/historyUtil');

const REQUIRED_ENTRY_TYPES = new Set([
  'CREATE_NEW',
  'NEW_PADDY_SAMPLE',
  'DIRECT_LOADED_VEHICLE',
  'READY_LORRY',
  'LOCATION_SAMPLE'
]);

const validateRequiredEntryFields = (entryType, data) => {
  if (!entryType || !REQUIRED_ENTRY_TYPES.has(entryType)) return null;
  const isEmpty = (value) => !String(value ?? '').trim();

  if (isEmpty(data.entryDate)) return 'Entry Date is required';
  if (isEmpty(data.brokerName)) return 'Broker Name is required';
  if (isEmpty(data.variety)) return 'Variety is required';
  if (entryType !== 'DIRECT_LOADED_VEHICLE' && entryType !== 'READY_LORRY' && isEmpty(data.partyName)) {
    return 'Party Name is required';
  }
  if (isEmpty(data.location)) return 'Location is required';
  if (isEmpty(data.bags)) return 'Bags is required';
  if (isEmpty(data.packaging)) return 'Packaging is required';
  if (isEmpty(data.sampleCollectedBy)) return 'Sample Collected By is required';

  if ((entryType === 'DIRECT_LOADED_VEHICLE' || entryType === 'READY_LORRY') && isEmpty(data.lorryNumber)) {
    return 'Lorry Number is required';
  }

  if (data.smellHas === true && isEmpty(data.smellType)) return 'Smell type is required';
  if (entryType === 'LOCATION_SAMPLE') {
    if (isEmpty(data.gpsCoordinates)) return 'GPS coordinates are required';
  }

  return null;
};

// ─── Loading Lots (passed lots in processing) ───
router.get('/tabs/loading-lots', authenticateToken, cacheMiddleware(30), async (req, res) => {
  try {
    const { page = 1, pageSize = 50, cursor, broker, variety, party, location, startDate, endDate, entryType, excludeEntryType } = req.query;

    const where = {
      workflowStatus: {
        [Op.in]: ['LOT_ALLOTMENT', 'PHYSICAL_INSPECTION', 'INVENTORY_ENTRY', 'OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW', 'COMPLETED']
      }
    };
    if (broker) where.brokerName = { [Op.iLike]: `%${broker}%` };
    if (variety) where.variety = { [Op.iLike]: `%${variety}%` };
    if (party) where.partyName = { [Op.iLike]: `%${party}%` };
    if (location) where.location = { [Op.iLike]: `%${location}%` };
    if (startDate && endDate) where.entryDate = { [Op.between]: [startDate, endDate] };
    if (entryType) where.entryType = entryType;
    if (excludeEntryType) where.entryType = { [Op.ne]: excludeEntryType };

    // Use cursor pagination if cursor provided, else fallback to offset
    const paginationQuery = buildCursorQuery(req.query, 'DESC', {
      fields: SAMPLE_ENTRY_CURSOR_FIELDS
    });
    const result = await fetchHydratedSampleEntryPage({
      model: SampleEntry,
      baseWhere: where,
      paginationQuery,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      hydrateOptions: {
        attributes: ['id', 'serialNo', 'entryDate', 'brokerName', 'variety', 'partyName', 'location', 'bags', 'packaging', 'workflowStatus', 'createdAt', 'sampleCollectedBy', 'entryType', 'lorryNumber', 'lotSelectionDecision', 'lotSelectionAt'],
        include: [
          {
            model: QualityParameters,
            as: 'qualityParameters',
            attributes: [
              'id', 'reportedBy', 'moisture', 'dryMoisture', 'cutting1', 'cutting2',
              'bend1', 'bend2', 'mix', 'kandu', 'oil', 'sk', 'grainsCount',
              'wbR', 'wbBk', 'wbT', 'paddyWb', 'gramsReport', 'createdAt', 'updatedAt'
            ],
            include: [
              {
                model: User,
                as: 'reportedByUser',
                attributes: ['id', 'username', 'fullName'],
                required: false
              }
            ],
            required: false
          },
          {
            model: CookingReport,
            as: 'cookingReport',
            attributes: ['id', 'status', 'remarks', 'cookingDoneBy', 'cookingApprovedBy', 'history', 'updatedAt', 'createdAt'],
            include: [
              {
                model: User,
                as: 'reviewedBy',
                attributes: ['id', 'username', 'fullName'],
                required: false
              }
            ],
            required: false
          },
          { model: SampleEntryOffering, as: 'offering' },
          { model: User, as: 'creator', attributes: ['id', 'username', 'fullName'] }
        ],
        subQuery: false
      }
    });

    await attachLoadingLotsHistories(result.entries);
    result.entries = result.entries.filter((entry) => String(entry?.lotSelectionDecision || '').toUpperCase() !== 'FAIL');

    if (result.pagination) {
      res.json({ entries: result.entries, pagination: result.pagination });
    } else {
      res.json({ entries: result.entries, total: result.total, page: parseInt(page, 10), pageSize: parseInt(pageSize, 10) });
    }
  } catch (error) {
    console.error('Error getting loading lots:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ——— Resample Allotment (location resamples) ———
router.get('/tabs/resample-assignments', authenticateToken, cacheMiddleware(30), async (req, res) => {
  try {
    const { page = 1, pageSize = 50, broker, variety, party, location, startDate, endDate, entryType, excludeEntryType } = req.query;

    const where = {
      lotSelectionDecision: 'FAIL',
      workflowStatus: { [Op.in]: ['STAFF_ENTRY', 'QUALITY_CHECK', 'LOT_SELECTION', 'FINAL_REPORT', 'LOT_ALLOTMENT'] }
    };
    if (broker) where.brokerName = { [Op.iLike]: `%${broker}%` };
    if (variety) where.variety = { [Op.iLike]: `%${variety}%` };
    if (party) where.partyName = { [Op.iLike]: `%${party}%` };
    if (location) where.location = { [Op.iLike]: `%${location}%` };
    if (startDate && endDate) where.entryDate = { [Op.between]: [startDate, endDate] };
    if (entryType) where.entryType = entryType;
    if (excludeEntryType) where.entryType = { [Op.ne]: excludeEntryType };

    const paginationQuery = buildCursorQuery(req.query, 'DESC', {
      fields: SAMPLE_ENTRY_CURSOR_FIELDS
    });
    const result = await fetchHydratedSampleEntryPage({
      model: SampleEntry,
      baseWhere: where,
      paginationQuery,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      hydrateOptions: {
        attributes: [
          'id', 'serialNo', 'entryDate', 'brokerName', 'variety', 'partyName', 'location', 'bags',
          'packaging', 'workflowStatus', 'createdAt', 'updatedAt', 'sampleCollectedBy', 'entryType',
          'lorryNumber', 'lotSelectionDecision', 'lotSelectionAt'
        ],
        include: [
          {
            model: QualityParameters,
            as: 'qualityParameters',
            attributes: ['id', 'createdAt', 'updatedAt'],
            required: false
          }
        ],
        subQuery: false
      }
    });

    await attachLoadingLotsHistories(result.entries);
    result.entries = result.entries.filter((entry) => !hasPostResampleSampleBookAttempt(entry));

    if (result.pagination) {
      res.json({ entries: result.entries, pagination: result.pagination });
    } else {
      res.json({ entries: result.entries, total: result.entries.length, page: parseInt(page, 10), pageSize: parseInt(pageSize, 10) });
    }
  } catch (error) {
    console.error('Error getting resample assignments:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/tabs/edit-approvals', authenticateToken, cacheMiddleware(15), async (req, res) => {
  try {
    const workflowRole = getWorkflowRole(req.user);
    if (!['admin', 'manager', 'owner'].includes(workflowRole)) {
      return res.status(403).json({ error: 'Only admin/manager can view edit approvals' });
    }

    const entries = await SampleEntry.findAll({
      where: {
        [Op.or]: [
          { entryEditApprovalStatus: 'pending' },
          { qualityEditApprovalStatus: 'pending' }
        ]
      },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'fullName'], required: false }
      ],
      order: [
        ['entryDate', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    const requestUserIds = Array.from(new Set(entries.flatMap((entry) => ([
      entry.entryEditApprovalRequestedBy,
      entry.qualityEditApprovalRequestedBy
    ])).filter(Boolean)));
    const users = requestUserIds.length
      ? await User.findAll({ where: { id: requestUserIds }, attributes: ['id', 'username', 'fullName'], raw: true })
      : [];
    const userMap = new Map(users.map((user) => [user.id, user]));

    const payload = entries.map((entry) => {
      const plain = entry.toJSON ? entry.toJSON() : entry;
      return {
        ...plain,
        entryEditApprovalRequestedByName: plain.entryEditApprovalRequestedBy
          ? (userMap.get(plain.entryEditApprovalRequestedBy)?.fullName || userMap.get(plain.entryEditApprovalRequestedBy)?.username || '')
          : '',
        qualityEditApprovalRequestedByName: plain.qualityEditApprovalRequestedBy
          ? (userMap.get(plain.qualityEditApprovalRequestedBy)?.fullName || userMap.get(plain.qualityEditApprovalRequestedBy)?.username || '')
          : ''
      };
    });

    return res.json({ entries: payload });
  } catch (error) {
    console.error('Error getting edit approvals:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:id/edit-approval-request', authenticateToken, async (req, res) => {
  try {
    const workflowRole = getWorkflowRole(req.user);
    if (!['staff', 'physical_supervisor', 'paddy_supervisor'].includes(workflowRole)) {
      return res.status(403).json({ error: 'Only staff can request edit approval' });
    }

    const { type, reason } = req.body || {};
    const requestType = String(type || '').trim().toLowerCase();
    if (!['entry', 'quality'].includes(requestType)) {
      return res.status(400).json({ error: 'Approval type must be entry or quality' });
    }

    const sampleEntry = await SampleEntry.findByPk(req.params.id);
    if (!sampleEntry) {
      return res.status(404).json({ error: 'Sample entry not found' });
    }

    const isQualityRequest = requestType === 'quality';
    const usedCount = Number(isQualityRequest ? sampleEntry.staffBagsEdits : sampleEntry.staffPartyNameEdits) || 0;
    const allowance = Math.max(1, Number(isQualityRequest ? sampleEntry.staffQualityEditAllowance : sampleEntry.staffEntryEditAllowance) || 1);
    if (usedCount < allowance) {
      return res.status(400).json({ error: 'This entry still has a direct staff edit available. Approval is not needed yet.' });
    }

    const statusKey = isQualityRequest ? 'qualityEditApprovalStatus' : 'entryEditApprovalStatus';
    if (sampleEntry[statusKey] === 'pending') {
      return res.status(400).json({ error: 'Approval request is already pending for this edit type.' });
    }

    const updates = isQualityRequest
      ? {
        qualityEditApprovalStatus: 'pending',
        qualityEditApprovalReason: String(reason || '').trim() || null,
        qualityEditApprovalRequestedBy: req.user.userId,
        qualityEditApprovalRequestedAt: new Date(),
        qualityEditApprovalApprovedBy: null,
        qualityEditApprovalApprovedAt: null
      }
      : {
        entryEditApprovalStatus: 'pending',
        entryEditApprovalReason: String(reason || '').trim() || null,
        entryEditApprovalRequestedBy: req.user.userId,
        entryEditApprovalRequestedAt: new Date(),
        entryEditApprovalApprovedBy: null,
        entryEditApprovalApprovedAt: null
      };

    await sampleEntry.update(updates);
    invalidateSampleEntryTabCaches();
    return res.json({ success: true, message: `${isQualityRequest ? 'Quality' : 'Entry'} edit approval requested.` });
  } catch (error) {
    console.error('Error requesting edit approval:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:id/edit-approval-decision', authenticateToken, async (req, res) => {
  try {
    const workflowRole = getWorkflowRole(req.user);
    if (!['admin', 'manager', 'owner'].includes(workflowRole)) {
      return res.status(403).json({ error: 'Only admin/manager can approve edit requests' });
    }

    const { type, decision } = req.body || {};
    const requestType = String(type || '').trim().toLowerCase();
    const nextDecision = String(decision || '').trim().toLowerCase();
    if (!['entry', 'quality'].includes(requestType) || !['approve', 'reject'].includes(nextDecision)) {
      return res.status(400).json({ error: 'Invalid approval decision request' });
    }

    const sampleEntry = await SampleEntry.findByPk(req.params.id);
    if (!sampleEntry) {
      return res.status(404).json({ error: 'Sample entry not found' });
    }

    const isQualityRequest = requestType === 'quality';
    const statusKey = isQualityRequest ? 'qualityEditApprovalStatus' : 'entryEditApprovalStatus';
    const approvedByKey = isQualityRequest ? 'qualityEditApprovalApprovedBy' : 'entryEditApprovalApprovedBy';
    const approvedAtKey = isQualityRequest ? 'qualityEditApprovalApprovedAt' : 'entryEditApprovalApprovedAt';
    const allowanceKey = isQualityRequest ? 'staffQualityEditAllowance' : 'staffEntryEditAllowance';

    if (sampleEntry[statusKey] !== 'pending') {
      return res.status(400).json({ error: 'No pending request found for this edit type.' });
    }

    const updates = {
      [statusKey]: nextDecision === 'approve' ? 'approved' : 'rejected',
      [approvedByKey]: req.user.userId,
      [approvedAtKey]: new Date()
    };

    if (nextDecision === 'approve') {
      updates[allowanceKey] = Math.max(1, Number(sampleEntry[allowanceKey] || 1)) + 1;
    }

    await sampleEntry.update(updates);
    invalidateSampleEntryTabCaches();
    return res.json({ success: true, message: `${isQualityRequest ? 'Quality' : 'Entry'} edit request ${nextDecision}d.` });
  } catch (error) {
    console.error('Error deciding edit approval:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ─── Final Pass Lots (optimized for very large datasets) ───
router.get('/tabs/final-pass-lots', authenticateToken, cacheMiddleware(15), async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 100,
      broker,
      variety,
      party,
      location,
      startDate,
      endDate,
      entryType,
      excludeEntryType
    } = req.query;

    // Final Pass Lots should include:
    // 1) entries directly moved to FINAL_REPORT
    // 2) entries that went to cooking and came back to LOT_SELECTION with PASS/MEDIUM
    // 3) entries marked as resample from Final Lots (FAIL) which may already be in loading flow
    const cookingStatusPassOrMedium = sqlWhere(col('cookingReport.status'), { [Op.in]: ['PASS', 'MEDIUM'] });
    const conditionBlocks = [
      {
        [Op.or]: [
          { workflowStatus: 'FINAL_REPORT' },
          {
            [Op.and]: [
              { workflowStatus: 'LOT_SELECTION', lotSelectionDecision: 'PASS_WITH_COOKING' },
              cookingStatusPassOrMedium
            ]
          },
          {
            [Op.and]: [
              {
                workflowStatus: {
                  [Op.in]: ['QUALITY_CHECK', 'COOKING_REPORT', 'LOT_SELECTION', 'FINAL_REPORT', 'LOT_ALLOTMENT']
                }
              },
              { lotSelectionDecision: 'PASS_WITH_COOKING' }
            ]
          },
          {
            [Op.and]: [
              { lotSelectionDecision: 'FAIL' },
              {
                // Re-sample BEFORE final should stay visible in Final Pass Lots.
                // Re-sample AFTER final (already in loading workflow) must skip this tab.
                workflowStatus: {
                  [Op.in]: [
                    'STAFF_ENTRY',
                    'QUALITY_CHECK',
                    'COOKING_REPORT',
                    'LOT_SELECTION',
                    'FINAL_REPORT',
                    'LOT_ALLOTMENT'
                  ]
                }
              }
            ]
          }
        ]
      }
    ];

    if (broker) conditionBlocks.push({ brokerName: { [Op.iLike]: `%${broker}%` } });
    if (variety) conditionBlocks.push({ variety: { [Op.iLike]: `%${variety}%` } });
    if (party) conditionBlocks.push({ partyName: { [Op.iLike]: `%${party}%` } });
    if (location) conditionBlocks.push({ location: { [Op.iLike]: `%${location}%` } });

    if (startDate && endDate) {
      conditionBlocks.push({ entryDate: { [Op.between]: [startDate, endDate] } });
    } else if (startDate) {
      conditionBlocks.push({ entryDate: { [Op.gte]: startDate } });
    } else if (endDate) {
      conditionBlocks.push({ entryDate: { [Op.lte]: endDate } });
    }

    if (entryType) {
      conditionBlocks.push({ entryType });
    } else if (excludeEntryType) {
      conditionBlocks.push({ entryType: { [Op.ne]: excludeEntryType } });
    }

    const include = [
      {
        model: QualityParameters,
        as: 'qualityParameters',
        attributes: [
          'id', 'moisture', 'dryMoisture', 'cutting1', 'cutting2', 'bend', 'bend1', 'bend2',
          'mixS', 'mixL', 'mix', 'kandu', 'oil', 'sk', 'grainsCount', 'wbR', 'wbBk', 'wbT',
          'paddyWb', 'gramsReport', 'reportedBy',
          'moistureRaw', 'dryMoistureRaw', 'cutting1Raw', 'cutting2Raw', 'bend1Raw', 'bend2Raw',
          'mixRaw', 'mixSRaw', 'mixLRaw', 'kanduRaw', 'oilRaw', 'skRaw', 'grainsCountRaw',
          'wbRRaw', 'wbBkRaw', 'wbTRaw', 'paddyWbRaw',
          'updatedAt', 'createdAt'
        ],
        include: [
          {
            model: User,
            as: 'reportedByUser',
            attributes: ['id', 'username', 'fullName'],
            required: false
          }
        ],
        required: false
      },
      {
        model: CookingReport,
        as: 'cookingReport',
        attributes: ['id', 'status', 'remarks', 'cookingDoneBy', 'cookingApprovedBy', 'history', 'updatedAt'],
        include: [
          {
            model: User,
            as: 'reviewedBy',
            attributes: ['id', 'username', 'fullName'],
            required: false
          }
        ],
        required: false
      },
      {
        model: SampleEntryOffering,
        as: 'offering',
        attributes: [
          'id', 'offerRate', 'sute', 'suteUnit', 'baseRateType', 'baseRateUnit',
          'offerBaseRateValue', 'hamaliEnabled', 'hamaliPerKg', 'hamaliPerQuintal',
          'hamaliUnit', 'moistureValue', 'brokerage', 'brokerageEnabled', 'brokerageUnit',
          'lf', 'lfEnabled', 'lfUnit', 'egbType', 'egbValue', 'customDivisor',
          'offerVersions', 'activeOfferKey', 'cdEnabled', 'cdValue', 'cdUnit',
          'bankLoanEnabled', 'bankLoanValue', 'bankLoanUnit',
          'paymentConditionValue', 'paymentConditionUnit',
          'finalBaseRate', 'finalSute', 'finalSuteUnit', 'finalPrice', 'isFinalized'
        ],
        required: false
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'fullName'],
        required: false
      }
    ];

    const paginationQuery = buildCursorQuery(req.query, 'DESC', {
      fields: SAMPLE_ENTRY_CURSOR_FIELDS
    });
    if (paginationQuery.where && Object.keys(paginationQuery.where).length) {
      conditionBlocks.push(paginationQuery.where);
    }
    const mergedWhere = conditionBlocks.length === 1
      ? conditionBlocks[0]
      : { [Op.and]: conditionBlocks };

    const attributes = [
      'id', 'serialNo', 'entryDate', 'createdAt', 'updatedAt', 'workflowStatus', 'lotSelectionDecision', 'lotSelectionAt',
      'brokerName', 'variety', 'partyName', 'location', 'bags', 'packaging',
      'entryType', 'sampleCollectedBy', 'offeringPrice', 'finalPrice', 'lorryNumber'
    ];

    if (paginationQuery.isCursor) {
      const rows = await SampleEntry.findAll({
        where: mergedWhere,
        attributes,
        include,
        order: paginationQuery.order,
        limit: paginationQuery.limit,
        subQuery: false
      });

      const recheckStates = await getRecheckStateForEntries(rows);
      const filteredRows = rows.filter((row) => {
        const state = recheckStates.get(row.id);
        if (state) {
          row.setDataValue('recheckRequested', state.recheckRequested);
          row.setDataValue('recheckType', state.recheckType);
          row.setDataValue('recheckAt', state.recheckAt);
          row.setDataValue('recheckPreviousDecision', state.recheckPreviousDecision);
          row.setDataValue('qualityPending', state.qualityPending);
          row.setDataValue('cookingPending', state.cookingPending);
        }
        if (!(state && state.recheckRequested)) return true;
        const rowData = row?.toJSON ? row.toJSON() : row;
        return isFinalPassVisibleEntry(rowData);
      });
      await attachLoadingLotsHistories(filteredRows);
      const visibleRows = filteredRows.filter((row) => isFinalPassVisibleEntry(row?.toJSON ? row.toJSON() : row));

      const response = formatCursorResponse(visibleRows, paginationQuery.limit, null, {
        fields: SAMPLE_ENTRY_CURSOR_FIELDS
      });
      return res.json({ entries: response.data, pagination: response.pagination });
    }

    const { count, rows } = await SampleEntry.findAndCountAll({
      where: mergedWhere,
      attributes,
      include,
      order: paginationQuery.order,
      limit: paginationQuery.limit,
      offset: paginationQuery.offset,
      subQuery: false,
      distinct: true
    });

    const recheckStates = await getRecheckStateForEntries(rows);
    const filteredRows = rows.filter((row) => {
      const state = recheckStates.get(row.id);
      if (state) {
        row.setDataValue('recheckRequested', state.recheckRequested);
        row.setDataValue('recheckType', state.recheckType);
        row.setDataValue('recheckAt', state.recheckAt);
        row.setDataValue('recheckPreviousDecision', state.recheckPreviousDecision);
        row.setDataValue('qualityPending', state.qualityPending);
        row.setDataValue('cookingPending', state.cookingPending);
      }
      if (!(state && state.recheckRequested)) return true;
      const rowData = row?.toJSON ? row.toJSON() : row;
      return isFinalPassVisibleEntry(rowData);
    });
    await attachLoadingLotsHistories(filteredRows);
    const visibleRows = filteredRows.filter((row) => isFinalPassVisibleEntry(row?.toJSON ? row.toJSON() : row));

    return res.json({
      entries: visibleRows,
      total: visibleRows.length,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      totalPages: Math.max(1, Math.ceil(visibleRows.length / Math.max(1, parseInt(pageSize, 10) || 100)))
    });
  } catch (error) {
    console.error('Error getting final pass lots:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ─── Completed Lots (patti not yet added) ───
router.get('/tabs/completed-lots', authenticateToken, cacheMiddleware(30), async (req, res) => {
  try {
    const { page = 1, pageSize = 50, broker, variety, party, location, startDate, endDate, entryType, excludeEntryType } = req.query;

    const where = { workflowStatus: 'COMPLETED' };
    if (broker) where.brokerName = { [Op.iLike]: `%${broker}%` };
    if (variety) where.variety = { [Op.iLike]: `%${variety}%` };
    if (party) where.partyName = { [Op.iLike]: `%${party}%` };
    if (location) where.location = { [Op.iLike]: `%${location}%` };
    if (startDate && endDate) where.entryDate = { [Op.between]: [startDate, endDate] };
    if (entryType) where.entryType = entryType;
    if (excludeEntryType) where.entryType = { [Op.ne]: excludeEntryType };

    const paginationQuery = buildCursorQuery(req.query, 'DESC', {
      fields: SAMPLE_ENTRY_CURSOR_FIELDS
    });
    const result = await fetchHydratedSampleEntryPage({
      model: SampleEntry,
      baseWhere: where,
      paginationQuery,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      hydrateOptions: {
        include: [
          { model: QualityParameters, as: 'qualityParameters' },
          { model: SampleEntryOffering, as: 'offering' },
          { model: User, as: 'creator', attributes: ['id', 'username'] }
        ]
      }
    });

    if (result.pagination) {
      res.json({ entries: result.entries, pagination: result.pagination });
    } else {
      res.json({ entries: result.entries, total: result.total, page: parseInt(page, 10), pageSize: parseInt(pageSize, 10) });
    }
  } catch (error) {
    console.error('Error getting completed lots:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Sample Book (all entries from lot selection onwards) ───
router.get('/tabs/sample-book', authenticateToken, cacheMiddleware(30), async (req, res) => {
  try {
    const { page = 1, pageSize = 50, broker, variety, party, location, startDate, endDate, entryType, excludeEntryType } = req.query;

    const where = {};
    if (broker) where.brokerName = { [Op.iLike]: `%${broker}%` };
    if (variety) where.variety = { [Op.iLike]: `%${variety}%` };
    if (party) where.partyName = { [Op.iLike]: `%${party}%` };
    if (location) where.location = { [Op.iLike]: `%${location}%` };
    if (startDate && endDate) where.entryDate = { [Op.between]: [startDate, endDate] };
    if (entryType) where.entryType = entryType;
    if (excludeEntryType) where.entryType = { [Op.ne]: excludeEntryType };

    const paginationQuery = buildCursorQuery(req.query, 'DESC', {
      fields: SAMPLE_ENTRY_CURSOR_FIELDS
    });
    const result = await fetchHydratedSampleEntryPage({
      model: SampleEntry,
      baseWhere: where,
      paginationQuery,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      hydrateOptions: {
        include: [
          { model: QualityParameters, as: 'qualityParameters' },
          { model: CookingReport, as: 'cookingReport' },
          { model: SampleEntryOffering, as: 'offering' },
          { model: User, as: 'creator', attributes: ['id', 'username'] }
        ]
      }
    });

    await attachLoadingLotsHistories(result.entries);

    if (result.pagination) {
      res.json({ entries: result.entries, pagination: result.pagination });
    } else {
      res.json({ entries: result.entries, total: result.total, page: parseInt(page, 10), pageSize: parseInt(pageSize, 10) });
    }
  } catch (error) {
    console.error('Error getting sample book:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch get offering data for multiple entries (for performance)
// IMPORTANT: This must be BEFORE /:id route to avoid route shadowing
router.get('/offering-data-batch', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ error: 'ids parameter is required' });
    }

    const idList = ids.split(',');
    const offerings = await SampleEntryOffering.findAll({
      where: { sampleEntryId: idList }
    });

    // Convert to map
    const result = {};
    offerings.forEach(o => {
      result[o.sampleEntryId] = o;
    });

    res.json(result);
  } catch (error) {
    console.error('Error batch fetching offering data:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get sample entry by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const entry = await SampleEntryService.getSampleEntryById(
      req.params.id, // Keep as UUID string
      {
        includeQuality: true,
        includeCooking: true,
        includeAllotment: true,
        includeInspection: true,
        includeInventory: true,
        includeFinancial: true
      }
    );

    if (!entry) {
      return res.status(404).json({ error: 'Sample entry not found' });
    }

    const result = entry.toJSON ? entry.toJSON() : { ...entry };
    const qualityUpdatedAt = entry?.qualityParameters?.updatedAt || entry?.qualityParameters?.createdAt || null;
    const cookingUpdatedAt = entry?.cookingReport?.updatedAt || entry?.cookingReport?.createdAt || null;
    const recheckState = await getRecheckState(req.params.id, qualityUpdatedAt, cookingUpdatedAt, entry?.qualityParameters, entry?.cookingReport);
    result.recheckRequested = recheckState.recheckRequested;
    result.recheckType = recheckState.recheckType;
    result.recheckAt = recheckState.recheckAt;
    result.qualityPending = recheckState.qualityPending;
    result.cookingPending = recheckState.cookingPending;
    result.recheckPreviousDecision = recheckState.recheckPreviousDecision;
    await attachLoadingLotsHistories([result]);

    res.json(result);
  } catch (error) {
    console.error('Error getting sample entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update sample entry
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const upload = FileUploadService.getUploadMiddleware();
    upload.fields([{ name: 'godownImage', maxCount: 1 }, { name: 'paddyLotImage', maxCount: 1 }])(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      try {
        const existingEntry = await SampleEntryService.getSampleEntryById(req.params.id);
        if (!existingEntry) {
          return res.status(404).json({ error: 'Sample entry not found' });
        }

        const updates = { ...req.body };

        // Handle uploaded files
        if (req.files) {
          if (req.files.godownImage && req.files.godownImage[0]) {
            const uploadResult = await FileUploadService.uploadFile(req.files.godownImage[0], { compress: true });
            updates.godownImageUrl = uploadResult.fileUrl;
            // Optionally delete old image
            if (existingEntry.godownImageUrl) {
              const oldFileName = existingEntry.godownImageUrl.split('/').pop();
              if (oldFileName) await FileUploadService.deleteFile(oldFileName).catch(e => console.error("Failed to delete old image:", e));
            }
          }
          if (req.files.paddyLotImage && req.files.paddyLotImage[0]) {
            const uploadResult = await FileUploadService.uploadFile(req.files.paddyLotImage[0], { compress: true });
            updates.paddyLotImageUrl = uploadResult.fileUrl;
            // Optionally delete old image
            if (existingEntry.paddyLotImageUrl) {
              const oldFileName = existingEntry.paddyLotImageUrl.split('/').pop();
              if (oldFileName) await FileUploadService.deleteFile(oldFileName).catch(e => console.error("Failed to delete old image:", e));
            }
          }
        }

        // Parse boolean and numeric values that might come as strings from FormData
        if (updates.smellHas !== undefined) {
          updates.smellHas = updates.smellHas === 'true';
        }
        if (updates.sampleGivenToOffice !== undefined) {
          updates.sampleGivenToOffice = updates.sampleGivenToOffice === 'true';
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'bags')) {
          const rawBags = String(updates.bags ?? '').trim();
          const parsedBags = parseInt(rawBags, 10);
          if (!rawBags || Number.isNaN(parsedBags) || parsedBags < 1) {
            return res.status(400).json({ error: 'Bags must be a positive number.' });
          }
          updates.bags = parsedBags;
        }

        const isResampleAssignmentUpdate =
          Object.prototype.hasOwnProperty.call(updates, 'sampleCollectedBy')
          && existingEntry.lotSelectionDecision === 'FAIL';

        if (!isResampleAssignmentUpdate) {
          const mergedEntry = {
            ...(existingEntry?.toJSON ? existingEntry.toJSON() : existingEntry),
            ...updates
          };
          const requiredError = validateRequiredEntryFields(mergedEntry.entryType, mergedEntry);
          if (requiredError) {
            return res.status(400).json({ error: requiredError });
          }
        }

        if (isResampleAssignmentUpdate) {
          const workflowRole = getWorkflowRole(req.user);
          if (!['admin', 'manager', 'owner'].includes(workflowRole)) {
            return res.status(403).json({ error: 'Only admin/manager can assign resample supervisor' });
          }

          const assignedName = String(updates.sampleCollectedBy || '').trim();
          if (!assignedName) {
            return res.status(400).json({ error: 'Sample Collected By is required for resample assignment' });
          }

          const locationStaffUser = await User.findOne({
            where: {
              username: assignedName,
              role: 'staff',
              staffType: 'location',
              isActive: true
            },
            attributes: ['id', 'username']
          });

          if (!locationStaffUser) {
            return res.status(400).json({ error: 'Assigned user must be an active location staff' });
          }

          updates.sampleCollectedBy = locationStaffUser.username;
        }

        // Staff edit limits are now handled cleanly inside SampleEntryService.updateSampleEntry


        const entry = await SampleEntryService.updateSampleEntry(
          req.params.id, // Keep as UUID string
          updates,
          req.user.userId // Use userId from JWT token
        );

        if (!entry) {
          return res.status(404).json({ error: 'Sample entry not found' });
        }

        if (isResampleAssignmentUpdate) {
          try {
            const currentWorkflow = String(entry.workflowStatus || '').toUpperCase();
            const workflowRole = getWorkflowRole(req.user);
            if (['STAFF_ENTRY', 'FINAL_REPORT', 'LOT_ALLOTMENT', 'QUALITY_CHECK'].includes(currentWorkflow)) {
              await WorkflowEngine.transitionTo(
                req.params.id,
                'QUALITY_CHECK',
                req.user.userId,
                workflowRole,
                {
                  resampleAssignment: true,
                  resampleCollectorAssigned: true,
                  resampleCollectedBy: updates.sampleCollectedBy
                }
              );
            }
          } catch (transitionError) {
            console.error('Error transitioning resample assignment to QUALITY_CHECK:', transitionError);
            return res.status(400).json({ error: transitionError.message });
          }
        }

        res.json(entry);
      } catch (error) {
        console.error('Error updating sample entry:', error);
        res.status(400).json({ error: error.message });
      }
    });
  } catch (error) {
    console.error('Error setting up file upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add quality parameters (Quality Supervisor)
router.post('/:id/quality-parameters', authenticateToken, async (req, res) => {
  try {
    // Use multer to handle multipart/form-data (for photo upload)
    const upload = FileUploadService.getUploadMiddleware();

    upload.single('photo')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      try {
        // --- Authorization Check for Location Staff ---
        const userRole = getWorkflowRole(req.user);
        const sampleEntry = await SampleEntry.findByPk(req.params.id);

        if (!sampleEntry) {
          return res.status(404).json({ error: 'Sample entry not found' });
        }

        // Location staff can edit own LOCATION_SAMPLE entries OR assigned resample lots.
        if (userRole === 'physical_supervisor' && sampleEntry.entryType === 'LOCATION_SAMPLE') {
          const canEdit = await canLocationStaffEditQuality(sampleEntry, req.user);
          if (!canEdit) {
            return res.status(403).json({
              error: 'You do not have permission to edit this lot. Only the assigned location staff can edit quality parameters.'
            });
          }
        }
        // --------------------------------------------

        const reportedByValue = typeof req.body.reportedBy === 'string' ? req.body.reportedBy.trim() : '';
        if (!reportedByValue || reportedByValue.toLowerCase() === 'unknown') {
          return res.status(400).json({ error: 'Sample Reported By is required' });
        }

        const isProvided = (value) => normalizeRaw(value) !== null;
        const hasMoisture = isProvided(req.body.moisture);
        const hasGrains = isProvided(req.body.grainsCount);
        const hasCutting1 = isProvided(req.body.cutting1);
        const hasCutting2 = isProvided(req.body.cutting2);
        const hasBend1 = isProvided(req.body.bend1);
        const hasBend2 = isProvided(req.body.bend2);

        if (hasMoisture && !Number.isFinite(parseFloat(req.body.moisture))) {
          return res.status(400).json({ error: 'Moisture must be a valid number' });
        }
        if (hasGrains && !Number.isFinite(parseFloat(req.body.grainsCount))) {
          return res.status(400).json({ error: 'Grains Count must be a valid number' });
        }
        if (hasCutting1 && !Number.isFinite(parseFloat(req.body.cutting1))) {
          return res.status(400).json({ error: 'Cutting must be a valid number' });
        }
        if (hasCutting2 && !Number.isFinite(parseFloat(req.body.cutting2))) {
          return res.status(400).json({ error: 'Cutting must be a valid number' });
        }
        if (hasBend1 && !Number.isFinite(parseFloat(req.body.bend1))) {
          return res.status(400).json({ error: 'Bend must be a valid number' });
        }
        if (hasBend2 && !Number.isFinite(parseFloat(req.body.bend2))) {
          return res.status(400).json({ error: 'Bend must be a valid number' });
        }
        const hasMix = hasAlphaOrPositive(req.body.mix);
        const hasKandu = hasAlphaOrPositive(req.body.kandu);
        const hasOil = hasAlphaOrPositive(req.body.oil);
        const hasSk = hasAlphaOrPositive(req.body.sk);
        const hasSmix = hasAlphaOrPositive(req.body.mixS);
        const hasLmix = hasAlphaOrPositive(req.body.mixL);
        const hasWbR = isProvided(req.body.wbR);
        const hasWbBk = isProvided(req.body.wbBk);
        const hasPaddyWb = isProvided(req.body.paddyWb);
        const hasDryMoisture = isProvided(req.body.dryMoisture);
        const smixEnabledFlag = parseBoolFlag(req.body.smixEnabled);
        const lmixEnabledFlag = parseBoolFlag(req.body.lmixEnabled);
        const wbEnabledFlag = parseBoolFlag(req.body.wbEnabled);
        const paddyWbEnabledFlag = parseBoolFlag(req.body.paddyWbEnabled);
        const dryMoistureEnabledFlag = parseBoolFlag(req.body.dryMoistureEnabled);
        const smellHasFlag = parseBoolFlag(req.body.smellHas);
        const smellHas = smellHasFlag !== null ? smellHasFlag : (sampleEntry.smellHas === true);
        const smellType = smellHas ? String(req.body.smellType ?? sampleEntry.smellType ?? '').trim() : '';
        const smixEnabled = smixEnabledFlag !== null ? smixEnabledFlag : hasSmix;
        const lmixEnabled = lmixEnabledFlag !== null ? lmixEnabledFlag : hasLmix;
        const wbEnabled = wbEnabledFlag !== null ? wbEnabledFlag : (hasWbR || hasWbBk);
        const paddyWbEnabled = paddyWbEnabledFlag !== null ? paddyWbEnabledFlag : hasPaddyWb;
        const dryMoistureEnabled = dryMoistureEnabledFlag !== null ? dryMoistureEnabledFlag : hasDryMoisture;

        const hasAnyFullDetail = hasCutting1 || hasCutting2 || hasBend1 || hasBend2 || hasMix || hasKandu || hasOil || hasSk;
        const is100gOnly = hasMoisture && hasGrains && !hasAnyFullDetail;

        if (!is100gOnly) {
          if (!hasMoisture) return res.status(400).json({ error: 'Moisture is required' });
          if (!hasGrains) return res.status(400).json({ error: 'Grains Count is required' });
          if (!hasCutting1 || !hasCutting2) return res.status(400).json({ error: 'Cutting is required' });
          if (!hasBend1 || !hasBend2) return res.status(400).json({ error: 'Bend is required' });
          if (!hasMix) return res.status(400).json({ error: 'Mix is required' });
          if (!hasKandu) return res.status(400).json({ error: 'Kandu is required' });
          if (!hasOil) return res.status(400).json({ error: 'Oil is required' });
          if (!hasSk) return res.status(400).json({ error: 'SK is required' });
        }

        // Convert string values from FormData to numbers (with safe parsing)
        const qualityData = {
          sampleEntryId: req.params.id,
          moisture: parseFloatSafe(req.body.moisture),
          dryMoisture: parseFloatSafe(req.body.dryMoisture),
          cutting1: parseFloatSafe(req.body.cutting1),
          cutting2: parseFloatSafe(req.body.cutting2),
          bend: parseFloatSafe(req.body.bend || req.body.bend1), // Support both bend and bend1
          bend1: parseFloatSafe(req.body.bend1),
          bend2: parseFloatSafe(req.body.bend2),
          mixS: smixEnabled ? normalizeAlphaNumeric(req.body.mixS) : '0',
          mixL: lmixEnabled ? normalizeAlphaNumeric(req.body.mixL) : '0',
          mix: normalizeAlphaNumeric(req.body.mix),
          kandu: normalizeAlphaNumeric(req.body.kandu),
          oil: normalizeAlphaNumeric(req.body.oil),
          sk: normalizeAlphaNumeric(req.body.sk),
          grainsCount: parseIntSafe(req.body.grainsCount),
          wbR: wbEnabled ? parseFloatSafe(req.body.wbR) : 0,
          wbBk: wbEnabled ? parseFloatSafe(req.body.wbBk) : 0,
          wbT: wbEnabled ? parseFloatSafe(req.body.wbT) : 0,
          paddyWb: paddyWbEnabled ? parseFloatSafe(req.body.paddyWb) : 0,
          moistureRaw: normalizeRaw(req.body.moisture),
          dryMoistureRaw: dryMoistureEnabled ? normalizeRaw(req.body.dryMoisture) : null,
          cutting1Raw: normalizeRaw(req.body.cutting1),
          cutting2Raw: normalizeRaw(req.body.cutting2),
          bend1Raw: normalizeRaw(req.body.bend1),
          bend2Raw: normalizeRaw(req.body.bend2),
          mixSRaw: smixEnabled ? normalizeRaw(req.body.mixS) : null,
          mixLRaw: lmixEnabled ? normalizeRaw(req.body.mixL) : null,
          mixRaw: hasMix ? normalizeRaw(req.body.mix) : null,
          kanduRaw: hasKandu ? normalizeRaw(req.body.kandu) : null,
          oilRaw: hasOil ? normalizeRaw(req.body.oil) : null,
          skRaw: hasSk ? normalizeRaw(req.body.sk) : null,
          grainsCountRaw: normalizeRaw(req.body.grainsCount),
          wbRRaw: wbEnabled ? normalizeRaw(req.body.wbR) : null,
          wbBkRaw: wbEnabled ? normalizeRaw(req.body.wbBk) : null,
          wbTRaw: wbEnabled ? normalizeRaw(req.body.wbT) : null,
          paddyWbRaw: paddyWbEnabled ? normalizeRaw(req.body.paddyWb) : null,
          gramsReport: normalizeGramsReport(req.body.gramsReport),
          reportedBy: reportedByValue,
          smellHas,
          smellType,
          smixEnabled,
          lmixEnabled,
          paddyWbEnabled
        };

        const existingQuality = await QualityParametersService.getQualityParametersBySampleEntry(req.params.id);
        if (existingQuality) {
          const sampleEntry = await SampleEntry.findByPk(req.params.id);
          const recheckState = await getRecheckState(
            req.params.id,
            existingQuality?.updatedAt || existingQuality?.createdAt || null,
            null,
            existingQuality,
            null
          );
          const isRecheckQualityPending = recheckState.qualityPending === true;
          const isResampleQualityPending = String(sampleEntry?.lotSelectionDecision || '').toUpperCase() === 'FAIL';

          // Staff one-time edit check: if already used their available chances, block
          const qualityEditAllowance = Math.max(1, Number(sampleEntry?.staffQualityEditAllowance || 1));
          const isLimitedStaffRole = ['staff', 'physical_supervisor', 'paddy_supervisor'].includes(String(getWorkflowRole(req.user) || '').toLowerCase());
          if (isLimitedStaffRole && Number(sampleEntry?.staffBagsEdits || 0) >= qualityEditAllowance && !isRecheckQualityPending && !isResampleQualityPending) {
            return res.status(403).json({ error: 'Quality parameters can only be edited once by staff.' });
          }

          const same =
            String(existingQuality.mixS || '0') === String(qualityData.mixS || '0') &&
            String(existingQuality.mixL || '0') === String(qualityData.mixL || '0') &&
            String(existingQuality.mix || '0') === String(qualityData.mix || '0') &&
            String(existingQuality.kandu || '0') === String(qualityData.kandu || '0') &&
            String(existingQuality.oil || '0') === String(qualityData.oil || '0') &&
            String(existingQuality.sk || '0') === String(qualityData.sk || '0') &&
            Boolean(existingQuality.smellHas) === Boolean(qualityData.smellHas) &&
            String(existingQuality.smellType || '') === String(qualityData.smellType || '') &&
            Number(existingQuality.moisture || 0) === Number(qualityData.moisture || 0) &&
            Number(existingQuality.cutting1 || 0) === Number(qualityData.cutting1 || 0) &&
            Number(existingQuality.cutting2 || 0) === Number(qualityData.cutting2 || 0) &&
            Number(existingQuality.bend1 || 0) === Number(qualityData.bend1 || 0) &&
            Number(existingQuality.bend2 || 0) === Number(qualityData.bend2 || 0) &&
            Number(existingQuality.grainsCount || 0) === Number(qualityData.grainsCount || 0);

          if (same && !isRecheckQualityPending) {
            return res.json(existingQuality);
          }

          // Staff with staffBagsEdits=0 get ONE chance to update quality
          // Admin/manager can always update (no 409 block for them)
          if (isLimitedStaffRole) {
            // Staff one-time edit: allow update, then lock
            if (req.file) {
              const uploadResult = await FileUploadService.uploadFile(req.file, { compress: true });
              qualityData.uploadFileUrl = uploadResult.fileUrl;
            }
            const updatedQuality = await QualityParametersService.updateQualityParameters(
              existingQuality.id,
              {
                ...qualityData,
                is100Grams: req.body.is100Grams === 'true' || req.body.is100Grams === true,
                reportedByUserId: req.user.userId
              },
              req.user.userId,
              getWorkflowRole(req.user)
            );
            // Increment the edit counter to lock future edits
            if (sampleEntry) {
              await sampleEntry.update({
                staffBagsEdits: (sampleEntry.staffBagsEdits || 0) + 1,
                qualityEditApprovalStatus: null,
                qualityEditApprovalReason: null,
                qualityEditApprovalRequestedBy: null,
                qualityEditApprovalRequestedAt: null,
                qualityEditApprovalApprovedBy: null,
                qualityEditApprovalApprovedAt: null
              });
            }
            invalidateSampleEntryTabCaches();
            return res.status(200).json(updatedQuality);
          } else if (['admin', 'manager', 'owner'].includes(req.user.role)) {
            // Admin/manager/owner can always update - no restriction
            if (req.file) {
              const uploadResult = await FileUploadService.uploadFile(req.file, { compress: true });
              qualityData.uploadFileUrl = uploadResult.fileUrl;
            }
            const updatedQuality = await QualityParametersService.updateQualityParameters(
              existingQuality.id,
              {
                ...qualityData,
                is100Grams: req.body.is100Grams === 'true' || req.body.is100Grams === true,
                reportedByUserId: req.user.userId
              },
              req.user.userId,
              getWorkflowRole(req.user)
            );
            invalidateSampleEntryTabCaches();
            return res.status(200).json(updatedQuality);
          }

          // Other roles: block with 409
          return res.status(409).json({ error: 'Quality parameters already saved. Please contact admin/manager to update.' });
        }

        // Handle photo upload if present (first-time creation)
        if (req.file) {
          const uploadResult = await FileUploadService.uploadFile(req.file, { compress: true });
          qualityData.uploadFileUrl = uploadResult.fileUrl;
        }

        const quality = await QualityParametersService.addQualityParameters(
          qualityData,
          req.user.userId,
          getWorkflowRole(req.user)
        );

        invalidateSampleEntryTabCaches();
        res.status(201).json(quality);
      } catch (error) {
        console.error('Error adding quality parameters:', error);
        res.status(400).json({ error: error.message });
      }
    });
  } catch (error) {
    console.error('Error setting up file upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update quality parameters (Admin/Manager edit)
router.put('/:id/quality-parameters', authenticateToken, async (req, res) => {
  try {
    const upload = FileUploadService.getUploadMiddleware();

    upload.single('photo')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      try {
        const sampleEntryId = req.params.id;

        // --- Authorization Check for Location Staff ---
        const userRole = getWorkflowRole(req.user);
        const sampleEntry = await SampleEntry.findByPk(sampleEntryId);

        if (!sampleEntry) {
          return res.status(404).json({ error: 'Sample entry not found' });
        }

        // Location staff can edit own LOCATION_SAMPLE entries OR assigned resample lots.
        if (userRole === 'physical_supervisor' && sampleEntry.entryType === 'LOCATION_SAMPLE') {
          const canEdit = await canLocationStaffEditQuality(sampleEntry, req.user);
          if (!canEdit) {
            return res.status(403).json({
              error: 'You do not have permission to edit this lot. Only the assigned location staff can edit quality parameters.'
            });
          }
        }
        // --------------------------------------------

        // Get existing quality parameters for this entry
        const existing = await QualityParametersService.getQualityParametersBySampleEntry(sampleEntryId);
        if (!existing) {
          return res.status(404).json({ error: 'Quality parameters not found for this entry' });
        }

        const recheckState = await getRecheckState(
          sampleEntryId,
          existing?.updatedAt || existing?.createdAt || null,
          null,
          existing,
          null
        );
        const isRecheckQualityPending = recheckState.qualityPending === true;
        const isResampleQualityPending = String(sampleEntry?.lotSelectionDecision || '').toUpperCase() === 'FAIL';

        // Admin/Manager edit only. Staff can edit quality only up to their approved allowance.
        const qualityEditAllowance = Math.max(1, Number(sampleEntry.staffQualityEditAllowance || 1));
        const isLimitedStaffRole = ['staff', 'physical_supervisor', 'paddy_supervisor'].includes(String(getWorkflowRole(req.user) || '').toLowerCase());
        if (isLimitedStaffRole && Number(sampleEntry.staffBagsEdits || 0) >= qualityEditAllowance && !isRecheckQualityPending && !isResampleQualityPending) {
          return res.status(403).json({ error: 'Quality parameters can only be edited once by staff. Please contact admin/manager for further changes.' });
        }

        const reportedByValue = typeof req.body.reportedBy === 'string' ? req.body.reportedBy.trim() : '';
        if (!reportedByValue || reportedByValue.toLowerCase() === 'unknown') {
          return res.status(400).json({ error: 'Sample Reported By is required' });
        }

        const hasSmix = hasAlphaOrPositive(req.body.mixS);
        const hasLmix = hasAlphaOrPositive(req.body.mixL);
        const hasMix = hasAlphaOrPositive(req.body.mix);
        const hasKandu = hasAlphaOrPositive(req.body.kandu);
        const hasOil = hasAlphaOrPositive(req.body.oil);
        const hasSk = hasAlphaOrPositive(req.body.sk);
        const hasWbR = normalizeRaw(req.body.wbR) !== null;
        const hasWbBk = normalizeRaw(req.body.wbBk) !== null;
        const hasPaddyWb = normalizeRaw(req.body.paddyWb) !== null;
        const hasDryMoisture = normalizeRaw(req.body.dryMoisture) !== null;
        const smixEnabledFlag = parseBoolFlag(req.body.smixEnabled);
        const lmixEnabledFlag = parseBoolFlag(req.body.lmixEnabled);
        const wbEnabledFlag = parseBoolFlag(req.body.wbEnabled);
        const paddyWbEnabledFlag = parseBoolFlag(req.body.paddyWbEnabled);
        const dryMoistureEnabledFlag = parseBoolFlag(req.body.dryMoistureEnabled);
        const smixEnabled = smixEnabledFlag !== null ? smixEnabledFlag : hasSmix;
        const lmixEnabled = lmixEnabledFlag !== null ? lmixEnabledFlag : hasLmix;
        const wbEnabled = wbEnabledFlag !== null ? wbEnabledFlag : (hasWbR || hasWbBk);
        const paddyWbEnabled = paddyWbEnabledFlag !== null ? paddyWbEnabledFlag : hasPaddyWb;
        const dryMoistureEnabled = dryMoistureEnabledFlag !== null ? dryMoistureEnabledFlag : hasDryMoisture;

        const smellHasFlag = parseBoolFlag(req.body.smellHas);
        const smellHas = smellHasFlag !== null ? smellHasFlag : (existing.smellHas === true);
        const smellType = smellHas ? String(req.body.smellType ?? existing.smellType ?? '').trim() : '';

        // Prepare update data
        const updates = {
          sampleEntryId,
          is100Grams: req.body.is100Grams === 'true' || req.body.is100Grams === true,
          moisture: parseFloatSafe(req.body.moisture, existing.moisture),
          dryMoisture: dryMoistureEnabled ? parseFloatSafe(req.body.dryMoisture, existing.dryMoisture) : null,
          cutting1: parseFloatSafe(req.body.cutting1, existing.cutting1),
          cutting2: parseFloatSafe(req.body.cutting2, existing.cutting2),
          bend1: parseFloatSafe(req.body.bend1, existing.bend1),
          bend2: parseFloatSafe(req.body.bend2, existing.bend2),
          bend: parseFloatSafe(req.body.bend || req.body.bend1, existing.bend),
          mixS: smixEnabled ? normalizeAlphaNumeric(req.body.mixS, existing.mixS) : '0',
          mixL: lmixEnabled ? normalizeAlphaNumeric(req.body.mixL, existing.mixL) : '0',
          mix: normalizeAlphaNumeric(req.body.mix, existing.mix),
          kandu: normalizeAlphaNumeric(req.body.kandu, existing.kandu),
          oil: normalizeAlphaNumeric(req.body.oil, existing.oil),
          sk: normalizeAlphaNumeric(req.body.sk, existing.sk),
          grainsCount: parseIntSafe(req.body.grainsCount, existing.grainsCount),
          wbR: wbEnabled ? parseFloatSafe(req.body.wbR, existing.wbR) : 0,
          wbBk: wbEnabled ? parseFloatSafe(req.body.wbBk, existing.wbBk) : 0,
          wbT: wbEnabled ? parseFloatSafe(req.body.wbT, existing.wbT) : 0,
          paddyWb: paddyWbEnabled ? parseFloatSafe(req.body.paddyWb, existing.paddyWb) : 0,
          smellHas,
          smellType,
          moistureRaw: normalizeRaw(req.body.moisture) ?? existing.moistureRaw ?? null,
          dryMoistureRaw: dryMoistureEnabled ? (normalizeRaw(req.body.dryMoisture) ?? existing.dryMoistureRaw ?? null) : null,
          cutting1Raw: normalizeRaw(req.body.cutting1) ?? existing.cutting1Raw ?? null,
          cutting2Raw: normalizeRaw(req.body.cutting2) ?? existing.cutting2Raw ?? null,
          bend1Raw: normalizeRaw(req.body.bend1) ?? existing.bend1Raw ?? null,
          bend2Raw: normalizeRaw(req.body.bend2) ?? existing.bend2Raw ?? null,
          mixSRaw: smixEnabled ? (normalizeRaw(req.body.mixS) ?? existing.mixSRaw ?? null) : null,
          mixLRaw: lmixEnabled ? (normalizeRaw(req.body.mixL) ?? existing.mixLRaw ?? null) : null,
          mixRaw: hasMix ? (normalizeRaw(req.body.mix) ?? existing.mixRaw ?? null) : (existing.mixRaw ?? null),
          kanduRaw: hasKandu ? (normalizeRaw(req.body.kandu) ?? existing.kanduRaw ?? null) : (existing.kanduRaw ?? null),
          oilRaw: hasOil ? (normalizeRaw(req.body.oil) ?? existing.oilRaw ?? null) : (existing.oilRaw ?? null),
          skRaw: hasSk ? (normalizeRaw(req.body.sk) ?? existing.skRaw ?? null) : (existing.skRaw ?? null),
          grainsCountRaw: normalizeRaw(req.body.grainsCount) ?? existing.grainsCountRaw ?? null,
          wbRRaw: wbEnabled ? (normalizeRaw(req.body.wbR) ?? existing.wbRRaw ?? null) : null,
          wbBkRaw: wbEnabled ? (normalizeRaw(req.body.wbBk) ?? existing.wbBkRaw ?? null) : null,
          wbTRaw: wbEnabled ? (normalizeRaw(req.body.wbT) ?? existing.wbTRaw ?? null) : null,
          paddyWbRaw: paddyWbEnabled ? (normalizeRaw(req.body.paddyWb) ?? existing.paddyWbRaw ?? null) : null,
          gramsReport: normalizeGramsReport(req.body.gramsReport, existing.gramsReport),
          reportedBy: reportedByValue,
          reportedByUserId: req.user.userId,
          smixEnabled,
          lmixEnabled,
          paddyWbEnabled
        };

        // Handle photo upload if present
        if (req.file) {
          const uploadResult = await FileUploadService.uploadFile(req.file, { compress: true });
          updates.uploadFileUrl = uploadResult.fileUrl;
        }

        const updated = await QualityParametersService.updateQualityParameters(
          existing.id,
          updates,
          req.user.userId,
          getWorkflowRole(req.user)
        );

        // Increment edit counter for staff to prevent further changes (skip during recheck)
        if (isLimitedStaffRole && !isRecheckQualityPending) {
          await sampleEntry.update({
            staffBagsEdits: (sampleEntry.staffBagsEdits || 0) + 1,
            qualityEditApprovalStatus: null,
            qualityEditApprovalReason: null,
            qualityEditApprovalRequestedBy: null,
            qualityEditApprovalRequestedAt: null,
            qualityEditApprovalApprovedBy: null,
            qualityEditApprovalApprovedAt: null
          });
        }

        invalidateSampleEntryTabCaches();
        res.json(updated);
      } catch (innerError) {
        console.error('Error in quality parameters update logic:', innerError);
        res.status(400).json({ error: innerError.message });
      }
    });
  } catch (error) {
    console.error('Error setting up file upload or updating quality parameters:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update physical inspection (Admin/Manager edit)
router.put('/:id/physical-inspection/:inspectionId', authenticateToken, async (req, res) => {
  try {
    const { inspectionId } = req.params;

    const updates = {};
    if (req.body.inspectionDate !== undefined) updates.inspectionDate = req.body.inspectionDate;
    if (req.body.lorryNumber !== undefined) updates.lorryNumber = req.body.lorryNumber;
    if (req.body.bags !== undefined) updates.bags = parseInt(req.body.bags);
    if (req.body.cutting1 !== undefined) updates.cutting1 = parseFloat(req.body.cutting1);
    if (req.body.cutting2 !== undefined) updates.cutting2 = parseFloat(req.body.cutting2);
    if (req.body.bend !== undefined) updates.bend = parseFloat(req.body.bend);
    if (req.body.remarks !== undefined) updates.remarks = req.body.remarks;

    const updated = await PhysicalInspectionService.updatePhysicalInspection(
      inspectionId,
      updates,
      req.user.userId
    );

    if (!updated) {
      return res.status(404).json({ error: 'Physical inspection not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating physical inspection:', error);
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/lot-selection', authenticateToken, async (req, res) => {
  try {
    let { decision } = req.body; // 'PASS_WITHOUT_COOKING', 'PASS_WITH_COOKING', 'FAIL'
    const entry = await SampleEntry.findByPk(req.params.id, {
      attributes: ['id', 'entryType', 'workflowStatus', 'lotSelectionDecision']
    });

    if (!entry) {
      return res.status(404).json({ error: 'Sample entry not found' });
    }

    // In re-sample workflow, pending selection is always treated as pass-with-cooking.
    if (entry.lotSelectionDecision === 'FAIL' && decision === 'PASS_WITHOUT_COOKING') {
      decision = 'PASS_WITH_COOKING';
    }

    let nextStatus;
    if (decision === 'PASS_WITHOUT_COOKING') {
      nextStatus = 'FINAL_REPORT';
    } else if (decision === 'PASS_WITH_COOKING') {
      nextStatus = 'COOKING_REPORT';
    } else if (decision === 'FAIL') {
      nextStatus = 'FAILED';
    } else if (decision === 'RESAMPLE') {
      nextStatus = 'STAFF_ENTRY';
    } else if (decision === 'SOLDOUT') {
      nextStatus = 'FAILED';
    } else {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    await WorkflowEngine.transitionTo(
      req.params.id, // Keep as UUID string, don't parse to int
      nextStatus,
      req.user.userId, // Use userId from JWT token
      getWorkflowRole(req.user),
      { lotSelectionDecision: decision === 'RESAMPLE' ? 'FAIL' : decision }
    );

    // Explicitly update the lot selection fields on the SampleEntry
    const resampleUpdates = decision === 'RESAMPLE'
      ? {
        entryType: 'LOCATION_SAMPLE',
        sampleCollectedBy: null,
        staffBagsEdits: 0
      }
      : {};

    await SampleEntryService.updateSampleEntry(
      req.params.id,
      {
        lotSelectionDecision: decision === 'RESAMPLE' ? 'FAIL' : decision,
        lotSelectionByUserId: req.user.userId,
        lotSelectionAt: new Date(),
        ...resampleUpdates
      },
      req.user.userId
    );

    invalidateSampleEntryTabCaches();

    // Auto-skip Final Pass Lots for resample entries that already have offering/final price
    // Scenario 2: PASS_WITHOUT_COOKING goes to FINAL_REPORT, but if price exists, skip to LOT_ALLOTMENT
    if (nextStatus === 'FINAL_REPORT') {
      try {
        const SampleEntryOffering = require('../models/SampleEntryOffering');
        const offering = await SampleEntryOffering.findOne({
          where: { sampleEntryId: req.params.id },
          attributes: ['id', 'finalPrice', 'isFinalized', 'offerBaseRateValue'],
          raw: true
        });

        // If offering exists with a finalized price, this is Scenario 2 — auto-skip to LOT_ALLOTMENT
        if (offering && (offering.finalPrice || offering.isFinalized)) {
          console.log(`[LOT-SELECTION] Auto-skipping Final Pass Lots for resample entry ${req.params.id} — offering already exists`);
          await WorkflowEngine.transitionTo(
            req.params.id,
            'LOT_ALLOTMENT',
            req.user.userId,
            getWorkflowRole(req.user),
            { autoSkipFinalPassLots: true, resample: true }
          );
        }
      } catch (skipErr) {
        console.log(`[LOT-SELECTION] Auto-skip note: ${skipErr.message}`);
      }
    }

    res.json({ message: 'Workflow transitioned successfully', nextStatus });
  } catch (error) {
    console.error('Error transitioning workflow:', error);
    res.status(400).json({ error: error.message });
  }
});

// Recheck endpoint (Admin/Manager)
router.post('/:id/recheck', authenticateToken, async (req, res) => {
  try {
    const { recheckType } = req.body; // 'quality', 'cooking', 'both'
    const workflowRole = getWorkflowRole(req.user);

    if (!['admin', 'manager', 'owner'].includes(workflowRole)) {
      return res.status(403).json({ error: 'Only admin or manager can request recheck' });
    }

    const entry = await SampleEntry.findByPk(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Sample entry not found' });
    }

    // Expand Eligibility: Allow recheck for any lot unless it's fully COMPLETED
    if (entry.workflowStatus === 'COMPLETED') {
      return res.status(400).json({ error: 'Recheck is not allowed for finalized/completed lots' });
    }

    let nextStatus;
    if (recheckType === 'quality' || recheckType === 'both') {
      nextStatus = 'QUALITY_CHECK';
    } else if (recheckType === 'cooking') {
      nextStatus = 'COOKING_REPORT';
    } else {
      return res.status(400).json({ error: 'Invalid recheck type' });
    }

    // 1. Capture metadata for the recheck
    const transitionMetadata = {
      recheckRequested: true,
      recheckType,
      previousStatus: entry.workflowStatus,
      previousDecision: entry.lotSelectionDecision || null
    };

    // 2. Transition workflow FIRST to mark the end of the current attempt in audit logs
    await WorkflowEngine.transitionTo(
      req.params.id,
      nextStatus,
      req.user.userId,
      workflowRole,
      transitionMetadata
    );

    // Reset lot selection decision for quality/both rechecks so previous FAIL doesn't persist
    if (recheckType === 'quality' || recheckType === 'both') {
      try {
        await SampleEntry.update(
          { lotSelectionDecision: null, lotSelectionAt: null },
          { where: { id: entry.id } }
        );
      } catch (lsError) {
        console.error('Non-critical error resetting lot selection during recheck:', lsError);
      }
    }

    // 3. Reset parameters AFTER transition to provide "Fresh Form" for the NEXT attempt
    if (recheckType === 'quality' || recheckType === 'both') {
      try {
        const qp = await QualityParameters.findOne({ where: { sampleEntryId: entry.id } });
        if (qp) {
          await QualityParametersService.resetQualityParameters(entry.id, req.user.userId);
        }
      } catch (qpError) {
        console.error('Non-critical error resetting quality parameters during recheck:', qpError);
      }
    }

    if (recheckType === 'cooking' || recheckType === 'both') {
      try {
        const CookingReport = require('../models/CookingReport');
        const CookingReportService = require('../services/CookingReportService');
        const cr = await CookingReport.findOne({ where: { sampleEntryId: entry.id } });
        if (cr) {
          const currentHistory = Array.isArray(cr.history) ? cr.history : [];
          if (cr.status) {
            currentHistory.push({
              date: new Date().toISOString(),
              status: cr.status,
              cookingDoneBy: cr.cookingDoneBy,
              approvedBy: cr.cookingApprovedBy,
              remarks: cr.remarks
            });
          }
          const freshCookingData = {
            sampleEntryId: entry.id,
            status: null,
            remarks: null,
            cookingDoneBy: null,
            cookingApprovedBy: null,
            hasRemarks: false,
            history: currentHistory
          };
          await CookingReportService.updateCookingReport(cr.id, freshCookingData, req.user.userId);
        }
      } catch (crError) {
        console.error('Non-critical error resetting cooking report during recheck:', crError);
      }
    }

    invalidateSampleEntryTabCaches();
    res.json({ success: true, message: `Recheck initiated. Entry moved to ${nextStatus}`, nextStatus });
  } catch (error) {
    console.error('Error initiating recheck:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create cooking report (Owner/Admin)
router.post('/:id/cooking-report', authenticateToken, async (req, res) => {
  try {
    const workflowRole = getWorkflowRole(req.user);
    const reportData = {
      ...req.body,
      sampleEntryId: req.params.id // Keep as UUID string
    };
    // Staff/quality supervisor should only submit "Cooking Done By".
    // They cannot set final cooking status transitions.
    if (['staff', 'quality_supervisor'].includes(workflowRole)) {
      reportData.status = null;
      reportData.cookingApprovedBy = null;
    }

    const report = await CookingReportService.createCookingReport(
      reportData,
      req.user.userId, // Use userId from JWT token
      workflowRole
    );

    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating cooking report:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update offering price (Owner/Admin/Manager)
router.post('/:id/offering-price', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'owner', 'manager'].includes(getWorkflowRole(req.user))) {
      return res.status(403).json({ error: 'Only admin, owner, or manager can update offering price' });
    }

    const entry = await SampleEntryService.updateOfferingPrice(
      req.params.id, // Keep as UUID string
      req.body,
      req.user.userId, // Use userId from JWT token
      getWorkflowRole(req.user)
    );

    res.json(entry);
  } catch (error) {
    console.error('Error updating offering price:', error);
    res.status(400).json({ error: error.message });
  }
});

// Set final price (Admin sets toggles, Manager fills values)
router.post('/:id/final-price', authenticateToken, async (req, res) => {
  try {
    console.log(`[FINAL-PRICE] ===== START =====`);
    console.log(`[FINAL-PRICE] Entry ID: ${req.params.id}`);
    console.log(`[FINAL-PRICE] User role: ${getWorkflowRole(req.user)}, baseRole: ${req.user.role}, userId: ${req.user.userId}`);
    console.log(`[FINAL-PRICE] isFinalized: ${req.body.isFinalized}`);
    console.log(`[FINAL-PRICE] finalPrice: ${req.body.finalPrice}`);

    const result = await SampleEntryService.setFinalPrice(
      req.params.id,
      req.body,
      req.user.userId,
      getWorkflowRole(req.user)
    );

    console.log(`[FINAL-PRICE] setFinalPrice succeeded. isFinalized in body: ${req.body.isFinalized}`);

    if (req.body.resampleAfterFinal) {
      const resampleUpdate = {
        lotSelectionDecision: 'FAIL',
        lotSelectionByUserId: req.user.userId,
        lotSelectionAt: new Date(),
        entryType: 'LOCATION_SAMPLE',
        staffBagsEdits: 0,
        sampleCollectedBy: null
      };
      if (req.body.resampleCollectedBy) {
        resampleUpdate.sampleCollectedBy = req.body.resampleCollectedBy;
      }
      await SampleEntryService.updateSampleEntry(req.params.id, resampleUpdate, req.user.userId);
      console.log(`[FINAL-PRICE] Resample flagged for ${req.params.id}`);
    }

    // After updating the final price, ALWAYS check if we can transition to LOT_ALLOTMENT
    if (req.body.isFinalized) {
      try {
        const entry = await SampleEntryService.getSampleEntryById(req.params.id);
        console.log(`[FINAL-PRICE] Entry found: ${!!entry}, workflowStatus: ${entry ? entry.workflowStatus : 'N/A'}`);

        if (entry && ['FINAL_REPORT', 'LOT_SELECTION'].includes(entry.workflowStatus)) {
          console.log(`[FINAL-PRICE] Transitioning ${req.params.id} to LOT_ALLOTMENT (Loading Lots) (Triggered by ${getWorkflowRole(req.user)})`);
          await WorkflowEngine.transitionTo(
            req.params.id,
            'LOT_ALLOTMENT',
            req.user.userId,
            getWorkflowRole(req.user),
            { finalPriceSet: true }
          );
          console.log(`[FINAL-PRICE] ✅ Transition to LOT_ALLOTMENT (Loading Lots) SUCCEEDED!`);
        } else if (entry && entry.workflowStatus === 'LOT_ALLOTMENT' && req.body.resampleAfterFinal) {
          // Resample on an entry already at LOT_ALLOTMENT — stay at LOT_ALLOTMENT.
          // Offering price already exists, so it skips Final Lots and goes directly to Loading Lots.
          console.log(`[FINAL-PRICE] ✅ Entry ${req.params.id} already at LOT_ALLOTMENT (resample) — staying at Loading Lots`);
        } else {
          console.log(`[FINAL-PRICE] ⚠️ Skipped transition - entry status is: ${entry ? entry.workflowStatus : 'NOT FOUND'}`);
        }
      } catch (transitionError) {
        console.error(`[FINAL-PRICE] ❌ Transition FAILED:`, transitionError.message);
      }
    } else {
      console.log(`[FINAL-PRICE] ⚠️ isFinalized is false/undefined - no transition attempted`);
    }

    invalidateSampleEntryTabCaches();
    console.log(`[FINAL-PRICE] ===== END =====`);
    res.json(result);
  } catch (error) {
    console.error('[FINAL-PRICE] ❌ FATAL ERROR:', error.message);
    console.error('[FINAL-PRICE] Stack:', error.stack);
    res.status(400).json({ error: error.message });
  }
});

// Transition workflow status (Manager can move lot to next stage)
router.post('/:id/transition', authenticateToken, async (req, res) => {
  try {
    const { toStatus } = req.body;
    if (!toStatus) {
      return res.status(400).json({ error: 'toStatus is required' });
    }

    const result = await WorkflowEngine.transitionTo(
      req.params.id,
      toStatus,
      req.user.userId,
      getWorkflowRole(req.user),
      {}
    );

    invalidateSampleEntryTabCaches();
    res.json({ success: true, message: `Transitioned to ${toStatus}`, result });
  } catch (error) {
    console.error('[TRANSITION] Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// offering-data-batch route moved above /:id to prevent route shadowing

// Get offering data for auto-population in final price modal
router.get('/:id/offering-data', authenticateToken, async (req, res) => {
  try {
    const offering = await SampleEntryService.getOfferingData(req.params.id);
    res.json(offering || {});
  } catch (error) {
    console.error('Error fetching offering data:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create lot allotment (Manager)
router.post('/:id/lot-allotment', authenticateToken, async (req, res) => {
  try {
    // Server-side enforcement: block supervisor assignment if manager fields are still missing
    const entry = await SampleEntryService.getSampleEntryById(req.params.id);
    if (entry && entry.offering) {
      const o = entry.offering;
      const missingFields = [];
      if (o.suteEnabled === false && !parseFloat(o.finalSute) && !parseFloat(o.sute)) missingFields.push('Sute');
      if (o.moistureEnabled === false && !parseFloat(o.moistureValue)) missingFields.push('Moisture');
      if (o.hamaliEnabled === false && !parseFloat(o.hamali)) missingFields.push('Hamali');
      if (o.brokerageEnabled === false && !parseFloat(o.brokerage)) missingFields.push('Brokerage');
      if (o.lfEnabled === false && !parseFloat(o.lf)) missingFields.push('LF');
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Manager must fill missing fields before assigning supervisor: ${missingFields.join(', ')}. Update in Loading Lots tab first.`
        });
      }
    }

    const allotmentData = {
      ...req.body,
      sampleEntryId: req.params.id // Keep as UUID string
    };

    const allotment = await LotAllotmentService.createLotAllotment(
      allotmentData,
      req.user.userId, // Use userId from JWT token
      getWorkflowRole(req.user)
    );

    res.status(201).json(allotment);
  } catch (error) {
    console.error('Error creating lot allotment:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update lot allotment (Manager - for reassigning supervisor)
router.put('/:id/lot-allotment', authenticateToken, async (req, res) => {
  try {
    const sampleEntryId = req.params.id;
    const { physicalSupervisorId } = req.body;

    if (!physicalSupervisorId) {
      return res.status(400).json({ error: 'Physical supervisor ID is required' });
    }

    // Get existing lot allotment
    const existingAllotment = await LotAllotmentService.getLotAllotmentBySampleEntry(sampleEntryId);

    if (!existingAllotment) {
      return res.status(404).json({ error: 'Lot allotment not found for this entry' });
    }

    // Update the supervisor assignment
    const updated = await LotAllotmentService.updateLotAllotment(
      existingAllotment.id,
      { allottedToSupervisorId: physicalSupervisorId },
      req.user.userId
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating lot allotment:', error);
    res.status(400).json({ error: error.message });
  }
});

// Close lot (Manager - when party doesn't send all bags)
router.post('/:id/close-lot', authenticateToken, async (req, res) => {
  try {
    const sampleEntryId = req.params.id;
    const { reason } = req.body;

    // Only manager/admin can close lots
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only manager or admin can close lots' });
    }

    // Get existing lot allotment
    const existingAllotment = await LotAllotmentService.getLotAllotmentBySampleEntry(sampleEntryId);
    if (!existingAllotment) {
      return res.status(404).json({ error: 'Lot allotment not found for this entry' });
    }

    // Get inspection progress to know how many bags were inspected
    const progress = await PhysicalInspectionService.getInspectionProgress(sampleEntryId);
    const inspectedBags = progress.inspectedBags || 0;

    // Update lot allotment with close info
    await LotAllotmentService.updateLotAllotment(
      existingAllotment.id,
      {
        closedAt: new Date(),
        closedByUserId: req.user.userId,
        closedReason: reason || `Lot closed by manager. ${inspectedBags} of ${progress.totalBags} bags inspected. Party did not send remaining ${progress.remainingBags} bags.`,
        inspectedBags: inspectedBags
      },
      req.user.userId
    );

    // Transition workflow to INVENTORY_ENTRY (skipping remaining bags)
    await WorkflowEngine.transitionTo(
      sampleEntryId,
      'INVENTORY_ENTRY',
      req.user.userId,
      getWorkflowRole(req.user),
      {
        closedByManager: true,
        inspectedBags,
        totalAllottedBags: progress.totalBags,
        remainingBags: progress.remainingBags,
        reason: reason || 'Party did not send remaining bags'
      }
    );

    res.json({
      message: 'Lot closed successfully',
      inspectedBags,
      totalBags: progress.totalBags,
      remainingBags: progress.remainingBags
    });
  } catch (error) {
    console.error('Error closing lot:', error);
    res.status(400).json({ error: error.message });
  }
});

// Cancel lot (Admin/Manager)
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { remarks } = req.body;
    const SampleEntry = require('../models/SampleEntry');

    // Only manager/admin/owner can cancel lots
    if (!['manager', 'admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only manager or admin can cancel lots' });
    }

    if (!remarks || remarks.trim() === '') {
      return res.status(400).json({ error: 'Remarks are required to cancel a lot.' });
    }

    const entry = await SampleEntry.findByPk(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Sample entry not found' });
    }

    entry.workflowStatus = 'CANCELLED';
    entry.cancelRemarks = remarks.trim();
    await entry.save();

    invalidateSampleEntryTabCaches();

    res.json({ message: 'Lot cancelled successfully', id: entry.id });
  } catch (error) {
    console.error('Error cancelling lot:', error);
    res.status(400).json({ error: error.message });
  }
});
// Create physical inspection (Physical Supervisor)
router.post('/:id/physical-inspection', authenticateToken, async (req, res) => {
  try {
    const upload = FileUploadService.getUploadMiddleware();

    upload.fields([
      { name: 'halfLorryImage', maxCount: 1 },
      { name: 'fullLorryImage', maxCount: 1 }
    ])(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      try {
        // Parse FormData values to correct types
        const inspectionData = {
          sampleEntryId: req.params.id, // Keep as UUID string
          inspectionDate: req.body.inspectionDate,
          lorryNumber: req.body.lorryNumber,
          actualBags: Number.parseInt(req.body.actualBags),
          cutting1: Number.parseFloat(req.body.cutting1),
          cutting2: Number.parseFloat(req.body.cutting2),
          bend: req.body.bend1 ? Number.parseFloat(req.body.bend1) : Number.parseFloat(req.body.bend),
          bend1: req.body.bend1 ? Number.parseFloat(req.body.bend1) : Number.parseFloat(req.body.bend),
          bend2: req.body.bend2 ? Number.parseFloat(req.body.bend2) : 0,
          remarks: req.body.remarks || null
        };

        const inspection = await PhysicalInspectionService.createPhysicalInspection(
          inspectionData,
          req.user.userId, // Use userId from JWT token
          getWorkflowRole(req.user)
        );

        // Upload images if provided (optional - don't fail if images not provided)
        if (req.files && (req.files.halfLorryImage || req.files.fullLorryImage)) {
          try {
            await PhysicalInspectionService.uploadInspectionImages(
              inspection.id,
              req.files,
              req.user.userId
            );
          } catch (imageError) {
            console.error('Error uploading images (non-critical):', imageError);
            // Continue without images - they are optional
          }
        }

        res.status(201).json(inspection);
      } catch (error) {
        console.error('Error creating physical inspection:', error);
        res.status(400).json({ error: error.message });
      }
    });
  } catch (error) {
    console.error('Error in physical inspection route:', error);
    res.status(400).json({ error: error.message });
  }
});

// Upload inspection images
router.post('/:id/inspection-images', authenticateToken, async (req, res) => {
  try {
    const upload = FileUploadService.getUploadMiddleware();

    upload.fields([
      { name: 'halfLorryImage', maxCount: 1 },
      { name: 'fullLorryImage', maxCount: 1 }
    ])(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const inspection = await PhysicalInspectionService.uploadInspectionImages(
        req.params.id, // Keep as UUID string
        req.files,
        req.user.userId // Use userId from JWT token
      );

      res.json(inspection);
    });
  } catch (error) {
    console.error('Error uploading inspection images:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create inventory data (Inventory Staff)
router.post('/:id/inventory-data', authenticateToken, async (req, res) => {
  try {
    const inventoryData = {
      ...req.body,
      sampleEntryId: req.params.id // Keep as UUID string
    };

    const inventory = await InventoryDataService.createInventoryData(
      inventoryData,
      req.user.userId, // Use userId from JWT token
      getWorkflowRole(req.user)
    );

    res.status(201).json(inventory);
  } catch (error) {
    console.error('Error creating inventory data:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create financial calculation (Owner/Admin)
router.post('/:id/financial-calculation', authenticateToken, async (req, res) => {
  try {
    const calculationData = {
      ...req.body,
      sampleEntryId: req.params.id // Keep as UUID string
    };

    const calculation = await FinancialCalculationService.createFinancialCalculation(
      calculationData,
      req.user.userId, // Use userId from JWT token
      getWorkflowRole(req.user)
    );

    res.status(201).json(calculation);
  } catch (error) {
    console.error('Error creating financial calculation:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create manager financial calculation (Manager)
router.post('/:id/manager-financial-calculation', authenticateToken, async (req, res) => {
  try {
    const calculationData = {
      ...req.body,
      sampleEntryId: req.params.id // Keep as UUID string
    };

    const calculation = await FinancialCalculationService.createManagerFinancialCalculation(
      calculationData,
      req.user.userId, // Use userId from JWT token
      getWorkflowRole(req.user)
    );

    res.status(201).json(calculation);
  } catch (error) {
    console.error('Error creating manager financial calculation:', error);
    res.status(400).json({ error: error.message });
  }
});

// Complete workflow (Final Review -> Completed) + Auto-create Arrival records
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    // CHECK: Get inspection progress to see if all bags are inspected
    const progress = await PhysicalInspectionService.getInspectionProgress(req.params.id);
    const remainingBags = progress.remainingBags || 0;

    if (remainingBags > 0) {
      return res.status(400).json({
        error: `Cannot complete this lot! There are still ${remainingBags} bags remaining to be inspected. Please have the Physical Supervisor add the remaining bags first.`,
        remainingBags,
        inspectedBags: progress.inspectedBags,
        totalBags: progress.totalBags
      });
    }

    await WorkflowEngine.transitionTo(
      req.params.id, // Keep as UUID string
      'COMPLETED',
      req.user.userId, // Use userId from JWT token
      getWorkflowRole(req.user)
    );

    // ═══════════════════════════════════════════════════════════════════════
    // AUTO-CREATE ARRIVAL RECORDS from completed workflow data
    // This ensures data flows into kunchinittu ledger, outturn stock, paddy stock
    // ═══════════════════════════════════════════════════════════════════════
    try {
      const SampleEntry = require('../models/SampleEntry');
      const LotAllotment = require('../models/LotAllotment');
      const PhysicalInspection = require('../models/PhysicalInspection');
      const InventoryData = require('../models/InventoryData');
      const Arrival = require('../models/Arrival');
      const { Kunchinittu } = require('../models/Location');

      // Fetch the full sample entry with all associations
      const sampleEntry = await SampleEntry.findByPk(req.params.id, {
        include: [
          {
            model: LotAllotment,
            as: 'lotAllotment',
            include: [
              {
                model: PhysicalInspection,
                as: 'physicalInspections',
                include: [
                  {
                    model: InventoryData,
                    as: 'inventoryData',
                    required: false
                  }
                ]
              }
            ]
          },
          {
            model: require('../models/QualityParameters'),
            as: 'qualityParameters',
            required: false
          }
        ]
      });

      if (sampleEntry && sampleEntry.lotAllotment && sampleEntry.lotAllotment.physicalInspections) {
        const inspections = sampleEntry.lotAllotment.physicalInspections;
        let arrivalsCreated = 0;

        for (const inspection of inspections) {
          const invData = inspection.inventoryData;
          if (!invData) continue; // Skip inspections without inventory data

          // Generate SL No for each arrival
          const lastArrival = await Arrival.findOne({
            order: [['createdAt', 'DESC']],
            attributes: ['slNo']
          });
          let slNo = 'A01';
          if (lastArrival && lastArrival.slNo) {
            const lastNumber = parseInt(lastArrival.slNo.substring(1));
            slNo = `A${(lastNumber + 1).toString().padStart(2, '0')}`;
          }

          // Determine movementType and destination based on inventoryData.location
          let movementType = 'purchase';
          let toKunchinintuId = invData.kunchinittuId || null;
          let toWarehouseId = null;
          let outturnId = null;

          if (invData.location === 'DIRECT_OUTTURN_PRODUCTION') {
            // For production — goes to outturn
            outturnId = invData.outturnId || null;
            toKunchinintuId = null;
          } else if (toKunchinintuId) {
            // Normal purchase — get warehouse from kunchinittu
            const kunchinittu = await Kunchinittu.findByPk(toKunchinintuId, {
              attributes: ['id', 'warehouseId']
            });
            if (kunchinittu) {
              toWarehouseId = kunchinittu.warehouseId || null;
            }
          }

          const grossWeight = parseFloat(invData.grossWeight) || 0;
          const tareWeight = parseFloat(invData.tareWeight) || 0;
          const netWeight = grossWeight - tareWeight;

          // Create the Arrival record — auto-approved since it comes from completed workflow
          await Arrival.create({
            slNo,
            date: invData.entryDate || sampleEntry.entryDate,
            movementType,
            broker: sampleEntry.brokerName || null,
            variety: invData.variety ? invData.variety.trim().toUpperCase() : (sampleEntry.variety ? sampleEntry.variety.trim().toUpperCase() : null),
            bags: invData.bags || sampleEntry.bags || 0,
            fromLocation: sampleEntry.location || null,
            toKunchinintuId,
            toWarehouseId,
            outturnId,
            moisture: invData.moisture || null,
            cutting: (sampleEntry.qualityParameters?.cutting1 && sampleEntry.qualityParameters?.cutting2)
              ? `${sampleEntry.qualityParameters.cutting1} x ${sampleEntry.qualityParameters.cutting2}`
              : (sampleEntry.qualityParameters?.cutting1 || sampleEntry.qualityParameters?.cutting2 || null),
            wbNo: invData.wbNumber || 'N/A',
            grossWeight,
            tareWeight,
            netWeight,
            lorryNumber: inspection.lorryNumber || sampleEntry.lorryNumber || 'N/A',
            status: 'approved',
            createdBy: req.user.userId,
            approvedBy: req.user.userId,
            approvedAt: new Date(),
            adminApprovedBy: req.user.userId,
            adminApprovedAt: new Date(),
            remarks: `Auto-created from completed sample entry #${sampleEntry.id}`
          });

          arrivalsCreated++;
          console.log(`✅ Arrival ${slNo} created from sample entry ${sampleEntry.id} (inspection ${inspection.id})`);
        }

        console.log(`✅ Workflow COMPLETED: ${arrivalsCreated} arrival(s) auto-created for sample entry ${sampleEntry.id}`);
      }
    } catch (arrivalError) {
      // Log but don't fail the completion — arrival creation is secondary
      console.error('⚠️ Error auto-creating arrivals (workflow still completed):', arrivalError);
    }

    res.json({ message: 'Sample entry completed successfully' });
  } catch (error) {
    console.error('Error completing sample entry:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get sample entry ledger
router.get('/ledger/all', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, broker, variety, party, location, status, limit, page, pageSize, cursor, entryType, excludeEntryType } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      broker,
      variety,
      party,
      location,
      status,
      limit: limit ? parseInt(limit) : undefined,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 100,
      cursor,
      entryType,
      excludeEntryType
    };

    const ledger = await SampleEntryService.getSampleEntryLedger(filters);

    res.json(ledger);
  } catch (error) {
    console.error('Error getting sample entry ledger:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get inspection progress for a sample entry
router.get('/:id/inspection-progress', authenticateToken, async (req, res) => {
  try {
    const progress = await PhysicalInspectionService.getInspectionProgress(req.params.id);
    res.json(progress);
  } catch (error) {
    console.error('Error getting inspection progress:', error);
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;
