const { Op } = require('sequelize');
const SampleEntryAuditLog = require('../models/SampleEntryAuditLog');

const hasAlphaOrPositive = (value) => {
  if (value === null || value === undefined) return false;
  const raw = String(value).trim();
  if (!raw) return false;
  if (/[a-zA-Z]/.test(raw)) return true;
  const num = parseFloat(raw);
  return Number.isFinite(num);
};

const isProvidedNumeric = (rawVal, valueVal) => {
  const raw = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
  if (raw !== '') return true;
  const num = Number(valueVal);
  return Number.isFinite(num);
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
const normalizeAttemptValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  return String(value);
};
const areQualityAttemptsEquivalent = (left, right) => {
  const keys = [
    'reportedBy',
    'moistureRaw', 'moisture',
    'dryMoistureRaw', 'dryMoisture',
    'cutting1Raw', 'cutting1', 'cutting2Raw', 'cutting2',
    'bend1Raw', 'bend1', 'bend2Raw', 'bend2',
    'grainsCountRaw', 'grainsCount',
    'mixRaw', 'mix', 'mixSRaw', 'mixS', 'mixLRaw', 'mixL',
    'kanduRaw', 'kandu', 'oilRaw', 'oil', 'skRaw', 'sk',
    'wbRRaw', 'wbR', 'wbBkRaw', 'wbBk', 'wbTRaw', 'wbT',
    'paddyWbRaw', 'paddyWb',
    'gramsReport', 'smellHas', 'smellType'
  ];
  return keys.every((key) => normalizeAttemptValue(left?.[key]) === normalizeAttemptValue(right?.[key]));
};

const dedupeQualityAttempts = (attempts = []) => {
  const deduped = [];
  attempts.forEach((attempt) => {
    if (!attempt) return;
    const existingIndex = deduped.findIndex((item) => areQualityAttemptsEquivalent(item, attempt));
    if (existingIndex >= 0) {
      deduped[existingIndex] = { ...deduped[existingIndex], ...attempt };
      return;
    }
    deduped.push(attempt);
  });
  return deduped;
};

const hasCookingData = (cr) => {
  if (!cr) return false;
  const status = String(cr.status || '').trim();
  const doneBy = String(cr.cookingDoneBy || '').trim();
  const approvedBy = String(cr.cookingApprovedBy || '').trim();
  return !!(status || doneBy || approvedBy);
};

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

const attachLoadingLotsHistories = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const pushHistoryValue = (list, value) => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) return;
    const lower = normalized.toLowerCase();
    if (list.some((item) => String(item).toLowerCase() === lower)) return;
    list.push(normalized);
  };
  const pushTimelineEntry = (list, value, date) => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) return;
    const normalizedDate = date || null;
    const lastItem = list[list.length - 1];
    if (lastItem && String(lastItem?.name || '').trim().toLowerCase() === normalized.toLowerCase()) {
      if (normalizedDate && (!lastItem?.date || new Date(normalizedDate).getTime() > new Date(lastItem.date).getTime())) {
        lastItem.date = normalizedDate;
      }
      return;
    }
    list.push({ name: normalized, date: normalizedDate });
  };
  const toTime = (value) => {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  };
  const getTimelineEntryForTime = (list, valueTime) => {
    if (!Array.isArray(list) || list.length === 0) return null;
    const entries = list.filter((item) => item && typeof item.name === 'string' && item.name.trim() !== '');
    if (entries.length === 0) return null;
    const targetTime = toTime(valueTime);
    const fallback = entries[entries.length - 1];
    if (!targetTime) return fallback;
    let matched = null;
    entries.forEach((item) => {
      const itemTime = toTime(item.date);
      if (!item.date || itemTime <= targetTime) {
        matched = item;
      }
    });
    return matched || fallback;
  };
  
  const buildQualityAttemptDetail = (source, fallbackCreatedAt) => {
    if (!source) return null;

    const reportedBy = typeof source.reportedBy === 'string' ? source.reportedBy.trim() : '';
    const detail = {
      reportedBy,
      createdAt: source.updatedAt || source.createdAt || fallbackCreatedAt || null,
      moisture: source.moisture ?? null,
      moistureRaw: source.moistureRaw ?? null,
      dryMoisture: source.dryMoisture ?? null,
      dryMoistureRaw: source.dryMoistureRaw ?? null,
      cutting1: source.cutting1 ?? null,
      cutting2: source.cutting2 ?? null,
      cutting1Raw: source.cutting1Raw ?? null,
      cutting2Raw: source.cutting2Raw ?? null,
      bend1: source.bend1 ?? null,
      bend2: source.bend2 ?? null,
      bend1Raw: source.bend1Raw ?? null,
      bend2Raw: source.bend2Raw ?? null,
      mixS: source.mixS ?? null,
      mixL: source.mixL ?? null,
      mix: source.mix ?? null,
      mixSRaw: source.mixSRaw ?? null,
      mixLRaw: source.mixLRaw ?? null,
      mixRaw: source.mixRaw ?? null,
      kandu: source.kandu ?? null,
      oil: source.oil ?? null,
      sk: source.sk ?? null,
      kanduRaw: source.kanduRaw ?? null,
      oilRaw: source.oilRaw ?? null,
      skRaw: source.skRaw ?? null,
      grainsCount: source.grainsCount ?? null,
      grainsCountRaw: source.grainsCountRaw ?? null,
      wbR: source.wbR ?? null,
      wbBk: source.wbBk ?? null,
      wbT: source.wbT ?? null,
      wbRRaw: source.wbRRaw ?? null,
      wbBkRaw: source.wbBkRaw ?? null,
      wbTRaw: source.wbTRaw ?? null,
      paddyWb: source.paddyWb ?? null,
      paddyWbRaw: source.paddyWbRaw ?? null,
      gramsReport: source.gramsReport ?? null,
      smellHas: source.smellHas ?? null,
      smellType: source.smellType ?? null
    };

    const hasData = hasQualityData(source)
      || detail.smellHas === true
      || (typeof detail.smellType === 'string' && detail.smellType.trim() !== '');
    return hasData ? detail : null;
  };

  const sampleEntryIds = rows
    .map((row) => row?.id)
    .filter(Boolean);

  const qualityIds = rows
    .map((row) => row?.qualityParameters?.id)
    .filter(Boolean);

  if (sampleEntryIds.length === 0 && qualityIds.length === 0) return rows;

  const [sampleEntryLogs, qualityLogs] = await Promise.all([
    sampleEntryIds.length > 0
      ? SampleEntryAuditLog.findAll({
        where: {
          tableName: 'sample_entries',
          actionType: { [Op.in]: ['CREATE', 'UPDATE', 'WORKFLOW_TRANSITION'] },
          recordId: { [Op.in]: sampleEntryIds }
        },
        attributes: ['recordId', 'actionType', 'newValues', 'createdAt', 'metadata'],
        order: [['createdAt', 'ASC']],
        raw: true
      })
      : [],
    qualityIds.length > 0
      ? SampleEntryAuditLog.findAll({
        where: {
          tableName: 'quality_parameters',
          actionType: { [Op.in]: ['CREATE', 'UPDATE'] },
          recordId: { [Op.in]: qualityIds }
        },
        attributes: ['recordId', 'newValues', 'createdAt'],
        order: [['createdAt', 'ASC']],
        raw: true
      })
      : []
  ]);

  const sampleEntryLogsByEntryId = new Map();
  sampleEntryLogs.forEach((log) => {
    const key = String(log.recordId);
    if (!sampleEntryLogsByEntryId.has(key)) sampleEntryLogsByEntryId.set(key, []);
    sampleEntryLogsByEntryId.get(key).push(log);
  });

  const qualityHistoryByQualityId = new Map();
  qualityLogs.forEach((log) => {
    const key = String(log.recordId);
    if (!qualityHistoryByQualityId.has(key)) qualityHistoryByQualityId.set(key, []);
    qualityHistoryByQualityId.get(key).push(log);
  });

  rows.forEach((row) => {
    const target = row?.dataValues || row;
    const sampleEntryAuditLogs = sampleEntryLogsByEntryId.get(String(row?.id)) || [];

    const recheckLogs = sampleEntryAuditLogs.filter((log) => {
      if (log.actionType !== 'WORKFLOW_TRANSITION') return false;
      const meta = normalizeAuditMetadata(log.metadata);
      return meta?.recheckRequested === true;
    });
    if (recheckLogs.length > 0) {
      const latestRecheck = recheckLogs[recheckLogs.length - 1];
      const latestMeta = normalizeAuditMetadata(latestRecheck.metadata) || null;
      const recheckType = latestMeta?.recheckType || null;
      const recheckAt = latestRecheck.createdAt || null;
      const previousDecision = latestMeta?.previousDecision || null;
      const recheckTime = recheckAt ? new Date(recheckAt).getTime() : null;

      const qualityUpdatedAt = row?.qualityParameters?.updatedAt || row?.qualityParameters?.createdAt || null;
      const cookingUpdatedAt = row?.cookingReport?.updatedAt || row?.cookingReport?.createdAt || null;
      const qualityTime = qualityUpdatedAt ? new Date(qualityUpdatedAt).getTime() : null;
      const cookingTime = cookingUpdatedAt ? new Date(cookingUpdatedAt).getTime() : null;

      const qualityDone = !!(qualityTime && recheckTime && qualityTime >= recheckTime) && hasQualityData(row?.qualityParameters);
      const cookingDone = !!(cookingTime && recheckTime && cookingTime >= recheckTime) && hasCookingData(row?.cookingReport);

      let isPending = true;
      if (recheckType === 'quality') {
        isPending = !qualityDone;
      } else if (recheckType === 'cooking') {
        isPending = !cookingDone;
      } else if (recheckType === 'both') {
        isPending = !(qualityDone && cookingDone);
      } else {
        isPending = false;
      }

      const qualityPending = (recheckType === 'quality' || recheckType === 'both') ? !qualityDone : false;
      const cookingPending = (recheckType === 'cooking' || recheckType === 'both') ? !cookingDone : false;

      target.recheckRequested = isPending;
      target.recheckType = isPending ? recheckType : null;
      target.recheckAt = isPending ? recheckAt : null;
      target.qualityPending = isPending ? qualityPending : false;
      target.cookingPending = isPending ? cookingPending : false;
      target.recheckPreviousDecision = isPending ? previousDecision : null;
    } else {
      target.recheckRequested = false;
      target.recheckType = null;
      target.recheckAt = null;
      target.qualityPending = false;
      target.cookingPending = false;
      target.recheckPreviousDecision = null;
    }
    
    const failLog = sampleEntryAuditLogs.find((log) => {
      const nv = normalizeAuditMetadata(log.newValues) || {};
      return String(nv.lotSelectionDecision || '').toUpperCase() === 'FAIL';
    });
    const hasResampleFlow = Boolean(failLog) || String(row?.lotSelectionDecision || '').toUpperCase() === 'FAIL';

    // Extract sampleCollectedBy history
    const sampleCollectedHistory = [];
    const sampleCollectedTimeline = [];
    const resampleCollectedHistory = [];
    const resampleCollectedTimeline = [];
    let resampleCollectionActive = false;
    sampleEntryAuditLogs.forEach((log) => {
      const newValues = normalizeAuditMetadata(log.newValues) || {};
      const metadata = normalizeAuditMetadata(log.metadata) || {};
      if (
        String(newValues.lotSelectionDecision || '').toUpperCase() === 'FAIL'
        || metadata.resample === true
        || metadata.resampleAfterFinal === true
      ) {
        resampleCollectionActive = true;
      }

      if (log.actionType !== 'WORKFLOW_TRANSITION') {
        const sampleCollectedBy = typeof newValues?.sampleCollectedBy === 'string'
          ? newValues.sampleCollectedBy.trim()
          : '';
        pushHistoryValue(sampleCollectedHistory, sampleCollectedBy);
        pushTimelineEntry(sampleCollectedTimeline, sampleCollectedBy, log.createdAt || null);
        if (resampleCollectionActive) {
          pushHistoryValue(resampleCollectedHistory, sampleCollectedBy);
          pushTimelineEntry(resampleCollectedTimeline, sampleCollectedBy, log.createdAt || null);
        }
      }
    });

    const currentSampleCollectedBy = typeof row?.sampleCollectedBy === 'string'
      ? row.sampleCollectedBy.trim()
      : '';

    if (currentSampleCollectedBy) {
      pushHistoryValue(sampleCollectedHistory, currentSampleCollectedBy);
      pushTimelineEntry(
        sampleCollectedTimeline,
        currentSampleCollectedBy,
        row?.updatedAt || row?.lotSelectionAt || row?.createdAt || null
      );
      const isBrokerOfficeSample = currentSampleCollectedBy.toLowerCase() === 'broker office sample';
      if (hasResampleFlow && !isBrokerOfficeSample) {
        pushHistoryValue(resampleCollectedHistory, currentSampleCollectedBy);
        pushTimelineEntry(
          resampleCollectedTimeline,
          currentSampleCollectedBy,
          row?.updatedAt || row?.lotSelectionAt || row?.createdAt || null
        );
      }
    }

    target.sampleCollectedHistory = sampleCollectedHistory;
    target.sampleCollectedTimeline = sampleCollectedTimeline;
    target.resampleCollectedHistory = resampleCollectedHistory;
    target.resampleCollectedTimeline = resampleCollectedTimeline;

    const qualityId = row?.qualityParameters?.id;
    if (!qualityId) {
      target.qualityReportHistory = [];
      target.qualityReportAttempts = 0;
      target.qualityAttemptDetails = [];
      return;
    }

    // ReportedBy history from quality logs
    const history = [];
    const auditLogs = qualityHistoryByQualityId.get(String(qualityId)) || [];

    auditLogs.forEach((log) => {
      const reportedBy = typeof log.newValues?.reportedBy === 'string'
        ? log.newValues.reportedBy.trim()
        : '';
      pushHistoryValue(history, reportedBy);
    });

    const currentReportedBy = typeof row.qualityParameters?.reportedBy === 'string'
      ? row.qualityParameters.reportedBy.trim()
      : '';

    if (currentReportedBy) {
      pushHistoryValue(history, currentReportedBy);
    }
    
    target.qualityReportHistory = history;

    // --- Refined Quality Attempt Grouping Logic ---
    // Boundaries are transitions TO 'QUALITY_CHECK' OR transitions TO 'LOT_SELECTION' with resampleQualitySaved metadata
    const transitionLogs = sampleEntryAuditLogs.filter(l => {
      if (l.actionType !== 'WORKFLOW_TRANSITION') return false;
      const nv = normalizeAuditMetadata(l.newValues) || {};
      const metadata = normalizeAuditMetadata(l.metadata) || {};
      // Include transitions to QUALITY_CHECK (recheck/resample assignment)
      if (nv.workflowStatus === 'QUALITY_CHECK') return true;
      // Include transitions to LOT_SELECTION with resampleQualitySaved flag (resample quality saved)
      if (nv.workflowStatus === 'LOT_SELECTION' && metadata.resampleQualitySaved === true) return true;
      return false;
    });
    
    const qualityAttemptDetails = [];
    
    // Find the original FAIL decision time to mark the start of resample flow.
    // If the lot was failed, there will be an audit log setting lotSelectionDecision to 'FAIL'
    const resampleStartTime = failLog ? toTime(failLog.createdAt) : 0;
    target.resampleStartAt = failLog?.createdAt || null;
    
    if (transitionLogs.length > 0) {
      // Each transition marks the start of a new attempt.
      // If quality logs exist BEFORE the first transition, treat that as Attempt 1,
      // and shift transitions to define Attempt 2, 3, ...

      const firstTransitionTime = toTime(transitionLogs[0].createdAt);
      const hasPreTransitionLogs = auditLogs.some((qLog) => toTime(qLog.createdAt) < firstTransitionTime);
      const attemptCount = transitionLogs.length + (hasPreTransitionLogs ? 1 : 0);
      const attempts = Array.from({ length: attemptCount }, () => []);

      const getAttemptIndexForTime = (timeMs) => {
        if (hasPreTransitionLogs && timeMs < firstTransitionTime) return 0;
        const offset = hasPreTransitionLogs ? 1 : 0;
        for (let j = transitionLogs.length - 1; j >= 0; j--) {
          const tTime = toTime(transitionLogs[j].createdAt);
          if (timeMs >= tTime) {
            return j + offset;
          }
        }
        return 0;
      };

      auditLogs.forEach((qLog) => {
        const qTime = toTime(qLog.createdAt);
        const targetAttemptIdx = getAttemptIndexForTime(qTime);
        attempts[targetAttemptIdx].push(qLog);
      });
      
      let seqAttemptNo = 1;
      attempts.forEach((group) => {
        if (group.length > 0) {
          // Search backwards for the last non-null detail in this attempt.
          let detail = null;
          for (let k = group.length - 1; k >= 0; k--) {
            const potentialLog = group[k];
            const potentialDetail = buildQualityAttemptDetail(potentialLog.newValues, potentialLog.createdAt);
            if (potentialDetail) {
              detail = potentialDetail;
              break;
            }
          }
          
          if (detail) {
            qualityAttemptDetails.push({ attemptNo: seqAttemptNo++, ...detail });
          }
        }
      });
      
      // Merge current state carefully:
      // - if it matches an existing attempt, merge into that attempt
      // - otherwise treat it as an edit to the latest real attempt
      // The workflow transitions already define new attempt boundaries, so we
      // should not create an extra attempt here from the current snapshot.
      const currentDetail = buildQualityAttemptDetail(row.qualityParameters, row.qualityParameters?.updatedAt || row.qualityParameters?.createdAt);
      if (currentDetail) {
        const existingIdx = qualityAttemptDetails.findIndex((item) => areQualityAttemptsEquivalent(item, currentDetail));
        if (existingIdx >= 0) {
          qualityAttemptDetails[existingIdx] = { ...qualityAttemptDetails[existingIdx], ...currentDetail };
        } else if (qualityAttemptDetails.length > 0) {
          const lastIdx = qualityAttemptDetails.length - 1;
          qualityAttemptDetails[lastIdx] = { ...qualityAttemptDetails[lastIdx], ...currentDetail };
        } else {
          qualityAttemptDetails.push({ attemptNo: seqAttemptNo++, ...currentDetail });
        }
      }

      const dedupedAttempts = dedupeQualityAttempts(
        qualityAttemptDetails.sort((a, b) => (a.attemptNo || 0) - (b.attemptNo || 0))
      );
      qualityAttemptDetails.length = 0;
      dedupedAttempts.forEach((attempt) => qualityAttemptDetails.push(attempt));
    } else {
      // Fallback if no transition logs (should not happen in normal workflow)
      const fallbackDetail = buildQualityAttemptDetail(row.qualityParameters, row.createdAt);
      if (fallbackDetail) {
        qualityAttemptDetails.push({ attemptNo: 1, ...fallbackDetail });
      }
    }

    qualityAttemptDetails.forEach((item, index) => {
      item.attemptNo = index + 1;
      const timeline = hasResampleFlow
        ? (resampleCollectedTimeline.length > 0 ? resampleCollectedTimeline : [])
        : sampleCollectedTimeline;
      const matchedCollector = getTimelineEntryForTime(timeline, item.createdAt);
      item.sampleCollectedBy = matchedCollector?.name || currentSampleCollectedBy || '';
      item.lotSelectionAt = matchedCollector?.date || row?.lotSelectionAt || null;
    });

    target.qualityReportAttempts = qualityAttemptDetails.length;
    target.qualityAttemptDetails = qualityAttemptDetails;
  });

  return rows;
};

module.exports = {
  attachLoadingLotsHistories
};
