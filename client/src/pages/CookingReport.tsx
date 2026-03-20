import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

import { API_URL } from '../config/api';

interface SampleEntry {
  id: string;
  serialNo?: number;
  entryDate: string;
  createdAt: string;
  brokerName: string;
  variety: string;
  partyName: string;
  location: string;
  bags: number;
  packaging?: string;
  workflowStatus: string;
  entryType?: string;
  lorryNumber?: string;
  sampleCollectedBy?: string;
  sampleGivenToOffice?: boolean;
  lotSelectionDecision?: string;
  lotSelectionAt?: string;
  resampleStartAt?: string;
  qualityReportAttempts?: number;
  qualityAttemptDetails?: any[];
  creator?: { id: number; username: string; fullName?: string };
  qualityParameters?: {
    grainsCount?: number;
    reportedBy?: string;
    kandu?: number;
    oil?: number;
    mixKandu?: number;
    smellHas?: boolean;
    smellType?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  cookingReport?: {
    status: string;
    remarks: string;
    cookingDoneBy?: string;
    cookingApprovedBy?: string;
    history?: any[];
    updatedAt?: string;
  };
}

interface SupervisorUser {
  id: number;
  username: string;
  fullName?: string | null;
}

const toTitleCase = (str: string) => str ? str.replace(/\b\w/g, c => c.toUpperCase()) : '';
const getCollectorLabel = (value: string | null | undefined, supervisors: SupervisorUser[]) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '-';
  if (raw.toLowerCase() === 'broker office sample') return 'Broker Office Sample';
  const match = supervisors.find((sup) => String(sup.username || '').trim().toLowerCase() === raw.toLowerCase());
  if (match?.fullName) return toTitleCase(match.fullName);
  return toTitleCase(raw);
};
const getCreatorLabel = (entry: SampleEntry) => {
  const creator = (entry as any)?.creator;
  const raw = creator?.fullName || creator?.username || '';
  return raw ? toTitleCase(raw) : '-';
};
const getCollectedByDisplay = (entry: SampleEntry, supervisors: SupervisorUser[]) => {
  const creatorLabel = getCreatorLabel(entry);
  const fallbackCollector = [
    entry.sampleCollectedBy,
    ...(((entry as any)?.resampleCollectedHistory || []) as string[]),
    ...(((entry as any)?.sampleCollectedHistory || []) as string[])
  ].find((value) => typeof value === 'string' && value.trim() !== '');
  const collectorLabel = getCollectorLabel(fallbackCollector || null, supervisors);
  const isResample = String((entry as any)?.lotSelectionDecision || '').toUpperCase() === 'FAIL'
    || Number((entry as any)?.qualityReportAttempts || 0) > 1
    || (Array.isArray((entry as any)?.resampleCollectedHistory) && (entry as any).resampleCollectedHistory.length > 0);
  const isGivenToOffice = Boolean((entry as any)?.sampleGivenToOffice) || isResample;

  if (isGivenToOffice) {
    const primary = creatorLabel !== '-' ? creatorLabel : collectorLabel;
    const secondary = collectorLabel !== '-' && collectorLabel !== primary ? collectorLabel : null;
    return { primary, secondary, highlightPrimary: true };
  }

  return {
    primary: collectorLabel !== '-' ? collectorLabel : creatorLabel,
    secondary: null,
    highlightPrimary: false
  };
};
const toSentenceCase = (value: string) => {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};
const resolveMediaUrl = (value?: string | null) => {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = API_URL.replace(/\/api\/?$/, '');
  return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
};
const toNumberText = (value: any, digits = 2) => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits).replace(/\.00$/, '') : '-';
};
const formatIndianCurrency = (value: any) => {
  const num = Number(value);
  return Number.isFinite(num)
    ? num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '-';
};
const formatRateUnitLabel = (value?: string) => value === 'per_quintal'
  ? 'Per Qtl'
  : value === 'per_ton'
    ? 'Per Ton'
    : value === 'per_kg'
      ? 'Per Kg'
      : 'Per Bag';
const formatChargeUnitLabel = (value?: string) => value === 'per_quintal'
  ? 'Per Qtl'
  : value === 'percentage'
    ? '%'
    : value === 'lumps'
      ? 'Lumps'
      : value === 'per_kg'
        ? 'Per Kg'
        : 'Per Bag';
const formatShortDateTime = (value?: string | null) => {
  if (!value) return '-';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};
const getPartyLabel = (entry: any) => {
  const party = (entry?.partyName || '').trim();
  const lorry = entry?.lorryNumber ? String(entry.lorryNumber).toUpperCase() : '';
  return party ? toTitleCase(party) : (lorry || '-');
};
const getPartyDisplayParts = (entry: any) => {
  const party = toTitleCase((entry?.partyName || '').trim());
  const lorry = entry?.lorryNumber ? String(entry.lorryNumber).toUpperCase() : '';
  return {
    label: party || lorry || '-',
    lorry,
    showLorrySecondLine: entry?.entryType === 'DIRECT_LOADED_VEHICLE'
      && !!party
      && !!lorry
      && party.toUpperCase() !== lorry
  };
};
const getTimeValue = (value?: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};
const isProvidedNumericValue = (rawVal: any, valueVal: any) => {
  const raw = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
  if (raw !== '') return true;
  const num = Number(valueVal);
  return Number.isFinite(num) && num > 0;
};
const hasAlphaOrPositiveValue = (val: any) => {
  if (val === null || val === undefined || val === '') return false;
  const raw = String(val).trim();
  if (!raw) return false;
  if (/[a-zA-Z]/.test(raw)) return true;
  const num = parseFloat(raw);
  return Number.isFinite(num);
};
const isProvidedAlphaValue = (rawVal: any, valueVal: any) => {
  const raw = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
  if (raw !== '') return true;
  return hasAlphaOrPositiveValue(valueVal);
};
const hasQualitySnapshot = (attempt: any) => {
  const hasMoisture = isProvidedNumericValue(attempt?.moistureRaw, attempt?.moisture);
  const hasGrains = isProvidedNumericValue(attempt?.grainsCountRaw, attempt?.grainsCount);
  const hasDetailedQuality =
    isProvidedNumericValue(attempt?.cutting1Raw, attempt?.cutting1) ||
    isProvidedNumericValue(attempt?.bend1Raw, attempt?.bend1) ||
    isProvidedAlphaValue(attempt?.mixRaw, attempt?.mix) ||
    isProvidedAlphaValue(attempt?.mixSRaw, attempt?.mixS) ||
    isProvidedAlphaValue(attempt?.mixLRaw, attempt?.mixL) ||
    isProvidedAlphaValue(attempt?.kanduRaw, attempt?.kandu) ||
    isProvidedAlphaValue(attempt?.oilRaw, attempt?.oil) ||
    isProvidedAlphaValue(attempt?.skRaw, attempt?.sk);

  return hasMoisture && (hasGrains || hasDetailedQuality);
};
const normalizeAttemptValue = (value: any) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  return String(value);
};
const areQualityAttemptsEquivalent = (left: any, right: any) => {
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
const isResampleWorkflowEntry = (entry: any) => {
  const baseAttempts = Array.isArray(entry?.qualityAttemptDetails)
    ? entry.qualityAttemptDetails.filter(Boolean)
    : [];
  const decision = String(entry?.lotSelectionDecision || '').toUpperCase();
  return decision === 'FAIL'
    || Boolean(entry?.resampleStartAt)
    || baseAttempts.length > 1
    || Number(entry?.qualityReportAttempts || 0) > 1;
};
const getQualityAttemptsForEntry = (entry: any) => {
  const getAttemptFingerprint = (attempt: any) => ([
    attempt?.reportedBy ?? '',
    attempt?.moistureRaw ?? attempt?.moisture ?? '',
    attempt?.grainsCountRaw ?? attempt?.grainsCount ?? '',
    attempt?.cutting1Raw ?? attempt?.cutting1 ?? '',
    attempt?.cutting2Raw ?? attempt?.cutting2 ?? '',
    attempt?.bend1Raw ?? attempt?.bend1 ?? '',
    attempt?.bend2Raw ?? attempt?.bend2 ?? '',
    attempt?.mixRaw ?? attempt?.mix ?? '',
    attempt?.mixSRaw ?? attempt?.mixS ?? '',
    attempt?.mixLRaw ?? attempt?.mixL ?? '',
    attempt?.kanduRaw ?? attempt?.kandu ?? '',
    attempt?.oilRaw ?? attempt?.oil ?? '',
    attempt?.skRaw ?? attempt?.sk ?? '',
    attempt?.wbRRaw ?? attempt?.wbR ?? '',
    attempt?.wbBkRaw ?? attempt?.wbBk ?? '',
    attempt?.wbTRaw ?? attempt?.wbT ?? '',
    attempt?.paddyWbRaw ?? attempt?.paddyWb ?? '',
    attempt?.smellHas ?? '',
    attempt?.smellType ?? ''
  ].map((value) => String(value ?? '').trim()).join('|'));

  const baseAttempts = Array.isArray(entry?.qualityAttemptDetails)
    ? [...entry.qualityAttemptDetails].filter(Boolean).sort((a: any, b: any) => (a.attemptNo || 0) - (b.attemptNo || 0))
    : [];
  const normalizedBaseAttempts = baseAttempts.reduce((acc: any[], attempt: any) => {
    const previous = acc[acc.length - 1];
    if (!previous) {
      acc.push(attempt);
      return acc;
    }

    const sameAttemptNo = Number(previous?.attemptNo || 0) === Number(attempt?.attemptNo || 0);
    const sameFingerprint = getAttemptFingerprint(previous) === getAttemptFingerprint(attempt);

    if (sameAttemptNo && sameFingerprint) {
      acc[acc.length - 1] = { ...previous, ...attempt };
      return acc;
    }

    acc.push(attempt);
    return acc;
  }, []);
  const currentQuality = entry?.qualityParameters;

  if (normalizedBaseAttempts.length > 0) {
    return normalizedBaseAttempts.map((attempt: any, index: number) => ({
      ...attempt,
      attemptNo: Number(attempt?.attemptNo) || index + 1
    }));
  }

  if (!currentQuality || !hasQualitySnapshot(currentQuality)) return [];
  return [{ ...currentQuality, attemptNo: 1 }];
};
const buildCookingStatusRows = (entry: any) => {
  const cr = entry?.cookingReport;
  const normalizeCookingStatus = (status?: string | null) => {
    const normalized = String(status || '').trim().toUpperCase();
    if (normalized === 'PASS' || normalized === 'OK') return 'Pass';
    if (normalized === 'MEDIUM') return 'Medium';
    if (normalized === 'FAIL') return 'Fail';
    if (normalized === 'RECHECK') return 'Recheck';
    if (normalized === 'PENDING') return 'Pending';
    return normalized ? toTitleCase(normalized.toLowerCase()) : 'Pending';
  };
  const toTs = (value: any) => {
    if (!value) return 0;
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : 0;
  };
  const historyRaw = Array.isArray(cr?.history) ? cr.history : [];
  const history = [...historyRaw].sort((a: any, b: any) => toTs(a?.date || a?.updatedAt || a?.createdAt || '') - toTs(b?.date || b?.updatedAt || b?.createdAt || ''));
  const rows: any[] = [];
  let pendingDone: any = null;

  history.forEach((item: any) => {
    const hasStatus = !!item?.status;
    const doneByValue = String(item?.cookingDoneBy || '').trim();
    const doneDateValue = item?.doneDate || item?.cookingDoneAt || item?.submittedAt || item?.date || null;

    if (!hasStatus && doneByValue) {
      pendingDone = {
        doneBy: doneByValue,
        doneDate: doneDateValue,
        remarks: String(item?.remarks || '').trim()
      };
      return;
    }

    if (hasStatus) {
      rows.push({
        status: normalizeCookingStatus(item.status),
        doneBy: pendingDone?.doneBy || doneByValue || String(cr?.cookingDoneBy || '').trim(),
        doneDate: pendingDone?.doneDate || doneDateValue,
        approvedBy: String(item?.approvedBy || item?.cookingApprovedBy || cr?.cookingApprovedBy || '').trim(),
        approvedDate: item?.approvedDate || item?.cookingApprovedAt || item?.date || null,
        remarks: String(item?.remarks || '').trim()
      });
      pendingDone = null;
    }
  });

  if (rows.length === 0 && cr?.status) {
    rows.push({
      status: normalizeCookingStatus(cr.status),
      doneBy: String(cr.cookingDoneBy || '').trim(),
      doneDate: cr?.doneDate || cr?.cookingDoneAt || cr?.date || cr?.updatedAt || cr?.createdAt || null,
      approvedBy: String(cr.cookingApprovedBy || '').trim(),
      approvedDate: cr?.approvedDate || cr?.cookingApprovedAt || cr?.date || cr?.updatedAt || cr?.createdAt || null,
      remarks: String(cr.remarks || '').trim()
    });
  }

  if (pendingDone) {
    rows.push({
      status: 'Pending',
      doneBy: pendingDone.doneBy,
      doneDate: pendingDone.doneDate,
      approvedBy: '',
      approvedDate: null,
      remarks: pendingDone.remarks
    });
  }

  return rows;
};
const getEntrySmellLabel = (entry: any) => {
  const attempts = getQualityAttemptsForEntry(entry);
  for (let idx = attempts.length - 1; idx >= 0; idx -= 1) {
    const attempt = attempts[idx];
    if (attempt?.smellHas || (attempt?.smellType && String(attempt.smellType).trim())) {
      return toTitleCase(attempt.smellType || 'Yes');
    }
  }

  const quality = entry?.qualityParameters;
  if (quality?.smellHas || (quality?.smellType && String(quality.smellType).trim())) {
    return toTitleCase(quality.smellType || 'Yes');
  }
  if (entry?.smellHas || (entry?.smellType && String(entry.smellType).trim())) {
    return toTitleCase(entry.smellType || 'Yes');
  }
  return '-';
};

const splitHistoryByResampleStart = (entry: SampleEntry, history: any[]) => {
  const attempts = getQualityAttemptsForEntry(entry);
  const resampleCycleCount = Math.max(attempts.length - 1, 0);
  if (!isResampleWorkflowEntry(entry) || resampleCycleCount <= 0 || !Array.isArray(history) || history.length === 0) {
    return { before: history || [], after: history || [], hasSplit: false };
  }

  let completedCycles = 0;
  let splitIndex = -1;
  history.forEach((item: any, index: number) => {
    if (splitIndex >= 0) return;
    const statusKey = String(item?.status || '').toUpperCase();
    if (!['PASS', 'MEDIUM', 'FAIL'].includes(statusKey)) return;
    completedCycles += 1;
    if (completedCycles === resampleCycleCount) {
      splitIndex = index + 1;
    }
  });

  if (splitIndex < 0) {
    return { before: [], after: history, hasSplit: false };
  }

  return {
    before: history.slice(0, splitIndex),
    after: history.slice(splitIndex),
    hasSplit: true
  };
};
const hasCurrentCycleQualityData = (entry: SampleEntry) => {
  const attempts = getQualityAttemptsForEntry(entry);
  if (attempts.length === 0) return false;
  if (!isResampleWorkflowEntry(entry)) return hasQualitySnapshot(attempts[attempts.length - 1]);
  if (attempts.length <= 1) return false;
  return hasQualitySnapshot(attempts[attempts.length - 1]);
};
const getCurrentCycleCookingHistory = (entry: SampleEntry, history: any[]) => {
  if (!isResampleWorkflowEntry(entry)) return history;
  const { after, hasSplit } = splitHistoryByResampleStart(entry, history);
  return hasSplit ? after : [];
};
const getLatestMatchingHistoryItem = (history: any[], matcher: (item: any) => boolean) => {
  if (!Array.isArray(history) || history.length === 0) return null;
  for (let idx = history.length - 1; idx >= 0; idx -= 1) {
    const item = history[idx];
    if (matcher(item)) return item;
  }
  return null;
};

const getSamplingLabel = (attemptNo: number) => {
  if (attemptNo <= 1) return 'First Sampling';
  if (attemptNo === 2) return 'Second Sampling';
  if (attemptNo === 3) return 'Third Sampling';
  return `${attemptNo}th Sampling`;
};

const isResolvedResampleEntry = (entry: SampleEntry) => {
  if (!isResampleWorkflowEntry(entry)) return false;
  const history = Array.isArray(entry.cookingReport?.history) ? entry.cookingReport?.history || [] : [];
  const cycleStatuses = getCurrentCycleCookingHistory(entry, history).filter((item: any) => !!item?.status);
  if (cycleStatuses.length === 0) return false;
  const latest = cycleStatuses[cycleStatuses.length - 1] || null;
  const key = String(latest?.status || entry.cookingReport?.status || '').toUpperCase();
  return ['PASS', 'MEDIUM', 'FAIL'].includes(key);
};

interface CookingReportProps {
  entryType?: string;
  excludeEntryType?: string;
  forceStaffMode?: boolean;
}

const CookingReport: React.FC<CookingReportProps> = ({ entryType, excludeEntryType, forceStaffMode = false }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const createEmptyCookingData = () => ({
    status: '',
    remarks: '',
    cookingDoneBy: '',
    cookingApprovedBy: ''
  });
  const [entries, setEntries] = useState<SampleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<SampleEntry | null>(null);
  const [cookingData, setCookingData] = useState(createEmptyCookingData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLocksRef = useRef<Set<string>>(new Set());
  const [supervisors, setSupervisors] = useState<SupervisorUser[]>([]);
  const [manualCookingName, setManualCookingName] = useState('');
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [showRemarksInput, setShowRemarksInput] = useState(false);

  // --- HISTORY MODAL STATES ---
  const [historyModal, setHistoryModal] = useState<{ visible: boolean; title: string; content: React.ReactNode }>({ visible: false, title: '', content: null });
  const [detailEntry, setDetailEntry] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [remarksPopup, setRemarksPopup] = useState<{ isOpen: boolean; text: string }>({ isOpen: false, text: '' });

  // --- NEW RICE FEATURE STATES ---
  const [activeTab, setActiveTab] = useState<'PADDY_COOKING_REPORT' | 'RICE_COOKING_REPORT' | 'RESAMPLE_COOKING_REPORT'>(
    entryType === 'RICE_SAMPLE' ? 'RICE_COOKING_REPORT' : 'PADDY_COOKING_REPORT'
  );

  // Synchronize activeTab if props change (though unlikely in this app's routing)
  useEffect(() => {
    if (entryType === 'RICE_SAMPLE') {
      setActiveTab('RICE_COOKING_REPORT');
    } else if (excludeEntryType === 'RICE_SAMPLE') {
      setActiveTab('PADDY_COOKING_REPORT');
    }
  }, [entryType, excludeEntryType]);

  // Custom states for Admin/Manager 'Cooking Approved by' toggles
  const [approvalType, setApprovalType] = useState<'owner' | 'manager' | 'admin' | 'manual'>('owner');
  const [manualApprovalName, setManualApprovalName] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const isCookingStaffRole = (['staff', 'quality_supervisor', 'paddy_supervisor'].includes(String(user?.role || '').toLowerCase())) || forceStaffMode;

  const resetReportFormState = () => {
    setCookingData(createEmptyCookingData());
    setManualCookingName('');
    setUseManualEntry(false);
    setShowRemarksInput(false);
    setApprovalType('owner');
    setManualApprovalName('');
    setManualDate(new Date().toISOString().split('T')[0]);
  };

  const closeReportModal = () => {
    setShowModal(false);
    setSelectedEntry(null);
    resetReportFormState();
  };

  // Filters
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterBroker, setFilterBroker] = useState('');
  const [resampleCookingCount, setResampleCookingCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 100;
  const canTakeAction = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'staff' || user?.role === 'quality_supervisor';
  const renderTabBadge = (count: number, background: string) => (
    count > 0 ? (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '18px',
          height: '18px',
          marginLeft: '6px',
          padding: '0 6px',
          borderRadius: '999px',
          background,
          color: '#fff',
          fontSize: '11px',
          fontWeight: 800,
          lineHeight: 1
        }}
      >
        {count}
      </span>
    ) : null
  );

  useEffect(() => {
    loadEntries();
  }, [page, activeTab]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    const loadResampleCookingCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/sample-entries/by-role`, {
          params: {
            status: 'RESAMPLE_COOKING_BOOK',
            page: 1,
            pageSize: 500,
            ...(entryType ? { entryType } : {}),
            ...(excludeEntryType ? { excludeEntryType } : {})
          },
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data as any;
        setResampleCookingCount(Array.isArray(data.entries) ? data.entries.length : 0);
      } catch (error) {
        console.error('Error loading resample cooking count:', error);
      }
    };

    if (!entryType || entryType !== 'RICE_SAMPLE') {
      loadResampleCookingCount();
    }
  }, [entryType, excludeEntryType]);

  const acquireSubmissionLock = (key: string) => {
    if (submissionLocksRef.current.has(key)) return false;
    submissionLocksRef.current.add(key);
    return true;
  };

  const releaseSubmissionLock = (key: string) => {
    submissionLocksRef.current.delete(key);
  };

  useEffect(() => {
    loadSupervisors();
  }, []);

  const loadSupervisors = async () => {
    try {
      const token = localStorage.getItem('token');
      const normalizeUsers = (users: any[]) => users
        .filter((u: any) => u && u.username)
        .map((u: any) => ({
          id: u.id,
          username: String(u.username),
          fullName: u.fullName || u.username
        }));

      let mergedUsers: SupervisorUser[] = [];
      const shouldIncludeManagers = isCookingStaffRole && (user?.role === 'manager' || user?.role === 'admin');

      if (shouldIncludeManagers) {
        const response = await axios.get(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data as any;
        const users = Array.isArray(data) ? data : (data.users || []);
        const allowedRoles = new Set(['staff', 'paddy_supervisor', 'quality_supervisor', 'manager']);
        mergedUsers = normalizeUsers(users.filter((u: any) => u?.isActive !== false && allowedRoles.has(u.role)));
      } else {
        // All paddy supervisors are allowed (mill + location staff).
        const response = await axios.get(`${API_URL}/sample-entries/paddy-supervisors`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data as any;
        const users = Array.isArray(data) ? data : (data.users || []);
        mergedUsers = normalizeUsers(users);
      }

      const unique = new Map<string, SupervisorUser>();
      mergedUsers.forEach((u) => {
        const key = String(u.username || '').trim().toLowerCase();
        if (key && !unique.has(key)) {
          unique.set(key, u);
        }
      });
      const finalUsers = Array.from(unique.values()).sort((a, b) =>
        String(a.fullName || '').localeCompare(String(b.fullName || ''), undefined, { sensitivity: 'base' })
      );
      setSupervisors(finalUsers);
    } catch (error) {
      console.error('Error loading supervisors:', error);
    }
  };

  const loadEntries = async (fFrom?: string, fTo?: string, fBroker?: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Always show entries that have finished cooking (or await final approval)
      const status = activeTab === 'RESAMPLE_COOKING_REPORT' ? 'RESAMPLE_COOKING_BOOK' : 'COOKING_BOOK';
      const params: any = { status, page, pageSize: PAGE_SIZE };

      const dFrom = fFrom !== undefined ? fFrom : filterDateFrom;
      const dTo = fTo !== undefined ? fTo : filterDateTo;
      const b = fBroker !== undefined ? fBroker : filterBroker;

      if (dFrom) params.startDate = dFrom;
      if (dTo) params.endDate = dTo;
      if (b) params.broker = b;
      if (entryType) params.entryType = entryType;
      if (excludeEntryType) params.excludeEntryType = excludeEntryType;

      const response = await axios.get(`${API_URL}/sample-entries/by-role`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data as any;
      const actualEntries = data.entries || [];
      setEntries(actualEntries);
      
      if (status === 'RESAMPLE_COOKING_BOOK') {
        const trueCount = actualEntries.length;
        setTotal(trueCount);
        setTotalPages(Math.ceil(trueCount / PAGE_SIZE) || 1);
        setResampleCookingCount(trueCount);
      } else if (data.total != null) {
        setTotal(data.total);
        setTotalPages(data.totalPages || Math.ceil(data.total / PAGE_SIZE));
      }
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to load entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setPage(1);
    setTimeout(() => {
      loadEntries();
    }, 0);
  };

  const handleClearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterBroker('');
    setPage(1);
    setTimeout(() => {
      loadEntries('', '', '');
    }, 0);
  };

  const handleOpenModal = (entry: SampleEntry) => {
    setSelectedEntry(entry);
    setShowModal(true);
    resetReportFormState();

    // Auto-select current supervisor if it's a resample case
    if (isCookingStaffRole && isResampleWorkflowEntry(entry)) {
      const currentUserName = user?.username || '';
      if (currentUserName) {
        setCookingData(prev => ({ ...prev, cookingDoneBy: currentUserName }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry || isSubmitting) return;
    const lockKey = `cooking-submit-${selectedEntry.id}`;
    if (!acquireSubmissionLock(lockKey)) return;

    // Capitalize function
    const capitalize = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

    // Determine cookingDoneBy value (from form, fallback to existing, or clear if RECHECK)
    let finalCookingDoneBy = capitalize(useManualEntry ? manualCookingName.trim() : cookingData.cookingDoneBy);
    if (!finalCookingDoneBy && selectedEntry.cookingReport?.cookingDoneBy) {
      finalCookingDoneBy = selectedEntry.cookingReport.cookingDoneBy;
    }

    // On RECHECK, preserve the existing cookingDoneBy and cookingApprovedBy names
    // so they remain visible in the cooking report table

    // Determine cookingApprovedBy value (Admin/Manager overrides, staff preserves existing)
    let finalCookingApprovedBy = selectedEntry.cookingReport?.cookingApprovedBy || '';
    if (!isCookingStaffRole) {
      if (approvalType === 'owner') finalCookingApprovedBy = 'Harish';
      else if (approvalType === 'manager') finalCookingApprovedBy = 'Guru';
      else if (approvalType === 'admin') finalCookingApprovedBy = 'MK Subbu';
    }

    const finalRemarks = showRemarksInput ? cookingData.remarks : '';

    // Determine status (Staff cannot set status, and submitting a Recheck should reset it to Pending)
    let finalStatus = cookingData.status;
    if (isCookingStaffRole) {
      finalStatus = ''; // Staff submitting always resets the admin's status decision
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/sample-entries/${selectedEntry.id}/cooking-report`,
        { ...cookingData, status: finalStatus, remarks: finalRemarks, cookingDoneBy: finalCookingDoneBy, cookingApprovedBy: finalCookingApprovedBy, manualDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showNotification('Cooking report added successfully', 'success');
      closeReportModal();
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to add cooking report', 'error');
    } finally {
      setIsSubmitting(false);
      releaseSubmissionLock(lockKey);
    }
  };

  const brokersList = useMemo(() => {
    const allBrokers = entries.map(e => e.brokerName);
    return Array.from(new Set(allBrokers)).filter(Boolean).sort();
  }, [entries]);

  const groupedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());

    const grouped: Record<string, Record<string, typeof sorted>> = {};
    sorted.forEach(entry => {
      const dateKey = new Date(entry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const brokerKey = entry.brokerName || 'Unknown';
      if (!grouped[dateKey]) grouped[dateKey] = {};
      if (!grouped[dateKey][brokerKey]) grouped[dateKey][brokerKey] = [];
      grouped[dateKey][brokerKey].push(entry);
    });
    return grouped;
  }, [entries]);

  const handleOpenHistory = (entry: any, type: 'all' | 'cooking' | 'approval' | 'single-remark' = 'all', singleEventOverride: any = null) => {
    if (type === 'single-remark' && singleEventOverride) {
      setHistoryModal({
        visible: true,
        title: 'Remark Details',
        content: <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{singleEventOverride.remarks}</div>
      });
      return;
    }

    const cr = entry.cookingReport || {};
    let history = cr.history ? [...cr.history] : [];

    // Synthesize legacy history if missing
    const hasStaffHistory = history.some((h: any) => h.cookingDoneBy && !h.status);
    if (!hasStaffHistory && cr?.cookingDoneBy) {
      history = [{ cookingDoneBy: cr.cookingDoneBy, date: null }, ...history];
    }

    const hasAdminHistory = history.some((h: any) => h.approvedBy && h.status);
    if (!hasAdminHistory && cr?.cookingApprovedBy) {
      history.push({ approvedBy: cr.cookingApprovedBy, status: cr.status, date: null, remarks: cr.remarks });
    }

    // Add Sample Report Entry (Step 0) for Full History
    if (type === 'all' && entry.qualityParameters) {
      history.unshift({
        isSampleReportEvent: true,
        reportedBy: entry.qualityParameters.reportedBy || 'Unknown',
        date: entry.qualityParameters.createdAt || entry.createdAt || null,
        status: 'Sample Reported',
        remarks: entry.qualityParameters.remarks || 'Sample selected and initially reported.'
      });
    }

    let modalTitle = 'History';
    if (type === 'cooking') {
      history = history.filter((h: any) => h.cookingDoneBy && !h.status);
      modalTitle = 'Cooking History';
    } else if (type === 'approval') {
      history = history.filter((h: any) => h.approvedBy && h.status);
      modalTitle = 'Approval History';
    } else if (type === 'single-remark' && singleEventOverride) {
      history = [singleEventOverride];
      modalTitle = 'Remark Details';
    } else {
      modalTitle = 'Full History';
    }

    const statusMap: Record<string, { color: string; bg: string; label: string }> = {
      PASS: { color: '#27ae60', bg: '#e8f5e9', label: '✓ Pass' },
      FAIL: { color: '#e74c3c', bg: '#fdecea', label: '✕ Fail' },
      RECHECK: { color: '#e67e22', bg: '#fff3e0', label: '↻ Recheck' },
      MEDIUM: { color: '#f39c12', bg: '#ffe0b2', label: '◎ Medium' },
      'Sample Reported': { color: '#607d8b', bg: '#eceff1', label: '📝 Sample Reported' }
    };
    if (history.length > 0) {
      const formatEventDate = (value?: string | null) => value
        ? new Date(value).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
        : '-';

      const entrySummary = (() => {
        if (type !== 'all') return null;
        const qp = entry.qualityParameters;
        const entryDateText = entry.entryDate
          ? new Date(entry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '-';
        const cutText = qp?.cutting1 && qp?.cutting2 ? `${qp.cutting1}x${qp.cutting2}` : '-';
        const bendText = qp?.bend1 && qp?.bend2 ? `${qp.bend1}x${qp.bend2}` : '-';
        const moistureText = qp?.moisture != null && qp?.moisture !== '' ? `${qp.moisture}%` : '-';
        const grainsText = qp?.grainsCount ? `(${qp.grainsCount})` : '-';
        return (
          <div style={{ marginBottom: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Entry Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '12px' }}>
              <div><strong>Date:</strong> {entryDateText}</div>
              <div><strong>Bags:</strong> {entry.bags?.toLocaleString('en-IN') || '-'}</div>
              <div><strong>Pkg:</strong> {entry.packaging || '-'}</div>
              <div><strong>Variety:</strong> {toTitleCase(entry.variety) || '-'}</div>
              <div><strong>Location:</strong> {toTitleCase(entry.location) || '-'}</div>
              <div><strong>Collected By:</strong> {getCollectorLabel(entry.sampleCollectedBy || entry.creator?.username || '-', supervisors)}</div>
            </div>
            {qp && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Quality Parameters</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px', fontSize: '12px' }}>
                  <div><strong>Moisture:</strong> {moistureText}</div>
                  <div><strong>Cutting:</strong> {cutText}</div>
                  <div><strong>Bend:</strong> {bendText}</div>
                  <div><strong>Grains:</strong> {grainsText}</div>
                </div>
              </div>
            )}
          </div>
        );
      })();

      const histContent = (
        <div style={{ maxHeight: '420px', overflowY: 'auto', overflowX: 'auto' }}>
          {entrySummary}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ border: '1px solid #e0e0e0', padding: '6px', textAlign: 'center', width: '6%' }}>No</th>
                <th style={{ border: '1px solid #e0e0e0', padding: '6px', textAlign: 'center', width: '16%' }}>Status</th>
                <th style={{ border: '1px solid #e0e0e0', padding: '6px', textAlign: 'left', width: '26%' }}>Done By</th>
                <th style={{ border: '1px solid #e0e0e0', padding: '6px', textAlign: 'left', width: '26%' }}>Approved By</th>
                <th style={{ border: '1px solid #e0e0e0', padding: '6px', textAlign: 'center', width: '10%' }}>Rem</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h: any, i: number) => {
                const isStatusAction = !!h.status;
                const isSampleReported = !!h.isSampleReportEvent;
                const statusKey = isSampleReported ? 'Sample Reported' : (h.status || 'COOKING');
                const statusInfo = statusMap[statusKey] || (isStatusAction ? statusMap[h.status] : null);
                const doneByName = isSampleReported
                  ? (h.reportedBy || '-')
                  : (!isStatusAction && h.cookingDoneBy ? h.cookingDoneBy : '');
                const approvedByName = isStatusAction ? (h.approvedBy || '') : '';
                const doneByDate = doneByName ? formatEventDate(h.date) : '-';
                const approvedByDate = approvedByName ? formatEventDate(h.date) : '-';

                return (
                  <tr key={i}>
                    <td style={{ border: '1px solid #e0e0e0', padding: '6px', textAlign: 'center', fontWeight: '700' }}>{i + 1}</td>
                    <td style={{ border: '1px solid #e0e0e0', padding: '6px', textAlign: 'center' }}>
                      {statusInfo ? (
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                          {statusKey}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f0f0f0', color: '#555' }}>
                          {statusKey}
                        </span>
                      )}
                    </td>
                    <td style={{ border: '1px solid #e0e0e0', padding: '6px' }}>
                      <div style={{ fontWeight: '700', color: '#6a1b9a' }}>{doneByName || '-'}</div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{doneByDate}</div>
                    </td>
                    <td style={{ border: '1px solid #e0e0e0', padding: '6px' }}>
                      <div style={{ fontWeight: '700', color: '#1565c0' }}>{approvedByName || '-'}</div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{approvedByDate}</div>
                    </td>
                    <td style={{ border: '1px solid #e0e0e0', padding: '6px', textAlign: 'center' }}>
                      {h.remarks ? (
                        <button
                          type="button"
                          onClick={() => handleOpenHistory(entry, 'single-remark', h)}
                          style={{ fontSize: '11px', padding: '2px 6px', background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: '6px', color: '#e65100', cursor: 'pointer', fontWeight: '700' }}
                        >
                          Remark
                        </button>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      setHistoryModal({ visible: true, title: modalTitle, content: histContent });
    } else if (cr.remarks) {
      setHistoryModal({ visible: true, title: 'Remarks', content: <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{cr.remarks}</div> });
    } else {
      setHistoryModal({ visible: true, title: modalTitle, content: <div style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>No history for this entry.</div> });
    }
  };

  const handleOpenDetail = async (entry: SampleEntry) => {
    try {
      setDetailLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/sample-entries/${entry.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDetailEntry(response.data || entry);
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to load entry details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusBadge = (entry: SampleEntry) => {
    const normalizeStatus = (value?: string | null) => String(value || '').toUpperCase();
    const toStatusInfo = (statusKey?: string | null) => {
      const key = normalizeStatus(statusKey);
      if (key === 'PASS') return { color: '#27ae60', bg: '#e8f5e9', label: 'Pass' };
      if (key === 'MEDIUM') return { color: '#f39c12', bg: '#ffe0b2', label: 'Medium' };
      if (key === 'FAIL') return { color: '#e74c3c', bg: '#fdecea', label: 'Fail' };
      if (key === 'RECHECK') return { color: '#e67e22', bg: '#fff3e0', label: 'Recheck' };
      return { color: '#999', bg: '#f5f5f5', label: 'Pending' };
    };

    const cr = entry.cookingReport;
    const history = Array.isArray(cr?.history) ? cr.history : [];
    const staffHistory = history.filter((item: any) => !!item?.cookingDoneBy && !item?.status);
    const adminHistory = history.filter((item: any) => !!item?.status);
    const isWaitingForAdmin = staffHistory.length > adminHistory.length;
    const isResampleCase = activeTab === 'RESAMPLE_COOKING_REPORT' || isResampleWorkflowEntry(entry);
    const { before: historyBeforeResample, after: historyAfterResample, hasSplit: hasResampleSplit } =
      splitHistoryByResampleStart(entry, history);

    const firstAdminStatus = normalizeStatus(adminHistory[0]?.status || null);
    const lastAdminStatus = normalizeStatus(adminHistory[adminHistory.length - 1]?.status || cr?.status || null);

    if (!isResampleCase) {
      if (!cr) {
        return <span style={{ color: '#e67e22', fontWeight: '700' }}>Pending</span>;
      }

      let info = toStatusInfo(lastAdminStatus);
      if (isWaitingForAdmin) {
        info = { color: '#2980b9', bg: '#e3f2fd', label: 'Admin want to approve' };
      } else if (!lastAdminStatus && staffHistory.length > 0) {
        info = { color: '#2980b9', bg: '#e3f2fd', label: 'Admin want to approve' };
      }

      return (
        <span
          onClick={() => handleOpenHistory(entry, 'all')}
          style={{
            color: info.color,
            backgroundColor: info.bg,
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
          title="Click to see full history"
        >
          {info.label}
        </span>
      );
    }

    const pendingApprovalInfo = { color: '#2980b9', bg: '#e3f2fd', label: 'Admin want to approve' };
    const passWithoutCookingInfo = { color: '#1565c0', bg: '#e3f2fd', label: 'Pass Without Cooking' };

    // Re-sample should keep first sampling from pre-resample cycle and second sampling from current resample cycle.
    const beforeAdminHistory = historyBeforeResample.filter((item: any) => !!item?.status);
    const afterStaffHistory = historyAfterResample.filter((item: any) => !!item?.cookingDoneBy && !item?.status);
    const afterAdminHistory = historyAfterResample.filter((item: any) => !!item?.status);
    const lastAfterStaff = afterStaffHistory[afterStaffHistory.length - 1];
    const lastAfterAdmin = afterAdminHistory[afterAdminHistory.length - 1];
    const lastAfterStaffAt = getTimeValue(lastAfterStaff?.date);
    const lastAfterAdminAt = getTimeValue(lastAfterAdmin?.date);
    const waitingAdminAfterResample = !!lastAfterStaff && (!lastAfterAdmin || lastAfterStaffAt > lastAfterAdminAt);
    const baselineFirstStatus = normalizeStatus(
      beforeAdminHistory[beforeAdminHistory.length - 1]?.status
      || adminHistory[adminHistory.length - 1]?.status
      || cr?.status
      || null
    );

    const shouldShowPassWithoutCookingFirstLine = hasResampleSplit && beforeAdminHistory.length === 0;
    const firstInfo = baselineFirstStatus
      ? toStatusInfo(baselineFirstStatus)
      : shouldShowPassWithoutCookingFirstLine
        ? passWithoutCookingInfo
        : (isWaitingForAdmin && staffHistory.length > 0 ? pendingApprovalInfo : { color: '#e67e22', bg: '#fff3e0', label: 'Pending' });

    // Re-sample always shows two lines (1st + 2nd) for clarity.
    const hasCurrentCycleCooking = afterStaffHistory.length > 0 || afterAdminHistory.length > 0;
    const showFirstLine = Boolean(baselineFirstStatus) || shouldShowPassWithoutCookingFirstLine;
    const showSecondLine = hasCurrentCycleCooking;
    const latestSecondStatus = normalizeStatus(lastAfterAdmin?.status || null);
    let secondInfo = { color: '#e67e22', bg: '#fff3e0', label: 'Pending' };

    if (hasResampleSplit) {
      if (waitingAdminAfterResample) {
        secondInfo = pendingApprovalInfo;
      } else if (latestSecondStatus) {
        secondInfo = toStatusInfo(latestSecondStatus);
      }
    } else {
      // Legacy fallback for old records without reliable split timestamp.
      if (adminHistory.length >= 2 && normalizeStatus(adminHistory[adminHistory.length - 1]?.status || null)) {
        secondInfo = toStatusInfo(normalizeStatus(adminHistory[adminHistory.length - 1]?.status || null));
      } else if (staffHistory.length >= 2 && isWaitingForAdmin) {
        secondInfo = pendingApprovalInfo;
      } else if (isWaitingForAdmin && staffHistory.length > 1) {
        secondInfo = pendingApprovalInfo;
      }
    }

    const isSecondPendingState = ['PENDING', 'PENDING APPROVAL', 'ADMIN WANT TO APPROVE'].includes(
      String(secondInfo.label || '').toUpperCase()
    );

    if (!hasCurrentCycleCooking) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%', minWidth: 0 }}>
          {showFirstLine ? (
            <div
              onClick={() => handleOpenHistory(entry, 'all')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', cursor: 'pointer', flexWrap: 'wrap', maxWidth: '100%' }}
              title="Click to see full history"
            >
              <span style={{ fontWeight: 700, color: '#555' }}>1st:</span>
              <span style={{ color: firstInfo.color, backgroundColor: firstInfo.bg, fontWeight: 700, padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>
                {firstInfo.label}
              </span>
            </div>
          ) : null}
          <div
            onClick={() => handleOpenHistory(entry, 'all')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', cursor: 'pointer', flexWrap: 'wrap', maxWidth: '100%' }}
            title="Click to see full history"
          >
            <span style={{ fontWeight: 700, color: '#555' }}>{showFirstLine ? '2nd:' : 'Re-sample:'}</span>
            <span style={{ color: secondInfo.color, backgroundColor: secondInfo.bg, fontWeight: 700, padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>
              {secondInfo.label}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%', minWidth: 0 }}>
        {showFirstLine ? (
          <div
            onClick={() => handleOpenHistory(entry, 'all')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', cursor: 'pointer', flexWrap: 'wrap', maxWidth: '100%' }}
            title="Click to see full history"
          >
            <span style={{ fontWeight: 700, color: '#555' }}>1st:</span>
            <span style={{ color: firstInfo.color, backgroundColor: firstInfo.bg, fontWeight: 700, padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>
              {firstInfo.label}
            </span>
          </div>
        ) : null}
        {showSecondLine && (
          <div
            onClick={() => handleOpenHistory(entry, 'all')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', cursor: 'pointer', flexWrap: 'wrap', maxWidth: '100%' }}
            title="Click to see full history"
          >
            <span style={{ fontWeight: 700, color: '#555' }}>{showFirstLine ? '2nd:' : 'Re-sample:'}</span>
            <span style={{ color: secondInfo.color, backgroundColor: secondInfo.bg, fontWeight: 700, padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>
              {secondInfo.label}
            </span>
          </div>
        )}
      </div>
    );
  };

  const canStaffAddCookingForEntry = (entry: SampleEntry) => {
    const normalizeStatus = (value?: string | null) => String(value || '').toUpperCase();
    const cr = entry.cookingReport;
    const history = Array.isArray(cr?.history) ? cr.history : [];
    const staffHistory = history.filter((item: any) => !!item?.cookingDoneBy && !item?.status);
    const adminHistory = history.filter((item: any) => !!item?.status);
    const waitingAdmin = staffHistory.length > adminHistory.length;
    const latestAdminStatus = normalizeStatus(adminHistory[adminHistory.length - 1]?.status || cr?.status || null);
    const isResampleCase = isResampleWorkflowEntry(entry) || activeTab === 'RESAMPLE_COOKING_REPORT';

    if (isResampleCase) {
      const assignedUser = String(entry.sampleCollectedBy || '').trim().toLowerCase();
      // If not allotted yet, block.
      if (!assignedUser) return { canAdd: false, reason: 'Awaiting Assign' };

      const currentUser = String(user?.username || '').trim().toLowerCase();
      
      // If current user is a staff/supervisor but NOT the assigned one, block.
      if (isCookingStaffRole && currentUser && assignedUser !== currentUser) {
        return { canAdd: false, reason: `Assigned to ${getCollectorLabel(entry.sampleCollectedBy || '-', supervisors)}` };
      }

      if (!hasCurrentCycleQualityData(entry)) {
        return { canAdd: false, reason: 'Awaiting Quality' };
      }
    }

    // Normal flow: one staff entry, then wait for admin.
    if (!isResampleCase) {
      if (waitingAdmin) return { canAdd: false, reason: 'Awaiting Admin' };
      if (!cr || staffHistory.length === 0 || latestAdminStatus === 'RECHECK') {
        return { canAdd: true, reason: '' };
      }
      return { canAdd: false, reason: 'Locked' };
    }

    // Re-sample flow: only use history from current resample cycle determined by attempt count.
    const { after: historyAfterResample, hasSplit: hasResampleSplit } = splitHistoryByResampleStart(entry, history);
    const currentCycleHistory = hasResampleSplit ? historyAfterResample : history;
    const currentCycleStaffHistory = currentCycleHistory.filter((item: any) => !!item?.cookingDoneBy && !item?.status);
    const currentCycleAdminHistory = currentCycleHistory.filter((item: any) => !!item?.status);
    const lastCurrentCycleStaff = currentCycleStaffHistory[currentCycleStaffHistory.length - 1];
    const lastCurrentCycleAdmin = currentCycleAdminHistory[currentCycleAdminHistory.length - 1];
    const lastCurrentCycleStaffAt = getTimeValue(lastCurrentCycleStaff?.date);
    const lastCurrentCycleAdminAt = getTimeValue(lastCurrentCycleAdmin?.date);
    const waitingAdminCurrentCycle = !!lastCurrentCycleStaff && (!lastCurrentCycleAdmin || lastCurrentCycleStaffAt > lastCurrentCycleAdminAt);
    const latestCurrentCycleAdminStatus = normalizeStatus(lastCurrentCycleAdmin?.status || null);
    const hasSecondSamplingStarted = currentCycleStaffHistory.length > 0;
    const needsSecondSampling = !hasSecondSamplingStarted;
    const needsRecheckRetry = latestCurrentCycleAdminStatus === 'RECHECK' && lastCurrentCycleAdminAt >= lastCurrentCycleStaffAt;

    if (waitingAdminCurrentCycle) return { canAdd: false, reason: 'Admin want to approve' };

    if (needsSecondSampling || needsRecheckRetry) {
      return { canAdd: true, reason: '' };
    }
    return { canAdd: false, reason: 'Locked' };
  };

  const renderSampleReportByWithDate = (entry: any) => {
    const qp = entry.qualityParameters;
    if (!qp || !qp.reportedBy) return '-';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
        <div style={{ fontWeight: '600', color: '#333', lineHeight: '1.2' }}>{toSentenceCase(qp.reportedBy)}</div>
        {qp.remarks && (
          <div
            onClick={() => handleOpenHistory(entry, 'single-remark', {
              isSampleReportEvent: true,
              reportedBy: qp.reportedBy || 'Unknown',
              date: qp.createdAt || entry.createdAt || null,
              status: 'Sample Reported',
              remarks: qp.remarks
            })}
            style={{
              fontSize: '10.5px', color: '#558b2f', backgroundColor: '#ffffff',
              padding: '2px 6px', borderRadius: '4px', marginTop: '4px',
              border: '1px solid #c5e1a5', fontWeight: '700',
              cursor: 'pointer', display: 'inline-block', margin: '0 auto',
              transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
            Remarks 🔍
          </div>
        )}
      </div>
    );
  };

  const renderCookingDoneByWithDate = (entry: any, fallback: string) => {
    const cr = entry.cookingReport;
    const history = Array.isArray(cr?.history) ? cr.history : [];
    let cookings = history.filter((h: any) => h.cookingDoneBy && !h.status);

    if (cookings.length === 0 && cr?.cookingDoneBy) {
      cookings = [{ cookingDoneBy: cr.cookingDoneBy, date: null }];
    }

    if (cookings.length === 0) return <div>{fallback || '-'}</div>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {cookings.map((h: any, i: number) => {
          return (
            <div key={i} style={{ borderBottom: i < cookings.length - 1 ? '1px dashed #ccc' : 'none', paddingBottom: i < cookings.length - 1 ? '6px' : '0' }}>
              <div style={{ fontWeight: '600', color: '#6a1b9a', lineHeight: '1.2' }}>{i + 1}. {getCollectorLabel(h.cookingDoneBy, supervisors)}</div>
              {h.date && (
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px', fontWeight: 'normal', whiteSpace: 'normal', lineHeight: '1.2' }}>
                  {new Date(h.date).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderApprovedByWithDate = (entry: any) => {
    const cr = entry.cookingReport || {};
    const history = Array.isArray(cr?.history) ? cr.history : [];
    const relevantHistory = getCurrentCycleCookingHistory(entry, history);
    let approvals = relevantHistory.filter((h: any) => h.approvedBy && h.status);

    if (approvals.length === 0) {
      const latestExistingApproval = getLatestMatchingHistoryItem(history, (item: any) => !!item?.approvedBy && !!item?.status);
      if (latestExistingApproval) {
        approvals = [latestExistingApproval];
      }
    }

    if (approvals.length === 0 && cr?.cookingApprovedBy) {
      approvals = [{ approvedBy: cr.cookingApprovedBy, status: cr?.status, date: null, remarks: cr?.remarks }];
    }

    if (approvals.length === 0) return '-';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {approvals.map((h: any, i: number) => {
          return (
            <div key={i} style={{ borderBottom: i < approvals.length - 1 ? '1px dashed #ccc' : 'none', paddingBottom: i < approvals.length - 1 ? '6px' : '0' }}>
              <div style={{ fontWeight: '600', color: '#1565c0', lineHeight: '1.2' }}>{i + 1}. {toTitleCase(h.approvedBy)}</div>
              {h.date && (
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px', fontWeight: 'normal', whiteSpace: 'normal', lineHeight: '1.2' }}>
                  {new Date(h.date).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
              )}
              {h.remarks && (
                <div
                  onClick={() => handleOpenHistory(entry, 'single-remark', h)}
                  style={{
                    fontSize: '10.5px', color: '#e65100', backgroundColor: '#ffffff',
                    padding: '2px 6px', borderRadius: '4px', marginTop: '4px',
                    border: '1px solid #ffcc80', fontWeight: '700',
                    cursor: 'pointer', display: 'inline-block',
                    transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                  Remarks 🔍
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Filter entries to display
  // We want to display all fetched entries since we need both pending and completed ones
  const displayEntries = useMemo(() => {
    if (activeTab !== 'RESAMPLE_COOKING_REPORT') return entries;
    return entries.filter((entry) => {
      if (isResolvedResampleEntry(entry)) return false;
      return hasCurrentCycleQualityData(entry);
    });
  }, [entries, activeTab]);

  const displayGrouped = useMemo(() => {
    const sorted = [...displayEntries].sort((a, b) => {
      const dateA = new Date(a.entryDate).getTime();
      const dateB = new Date(b.entryDate).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const serialA = Number.isFinite(Number(a.serialNo)) ? Number(a.serialNo) : null;
      const serialB = Number.isFinite(Number(b.serialNo)) ? Number(b.serialNo) : null;
      if (serialA !== null && serialB !== null && serialA !== serialB) return serialA - serialB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    const grouped: Record<string, Record<string, typeof sorted>> = {};
    sorted.forEach(entry => {
      const dateKey = new Date(entry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const brokerKey = entry.brokerName || 'Unknown';
      if (!grouped[dateKey]) grouped[dateKey] = {};
      if (!grouped[dateKey][brokerKey]) grouped[dateKey][brokerKey] = [];
      grouped[dateKey][brokerKey].push(entry);
    });
    return grouped;
  }, [displayEntries]);

  return (
    <div>
      <style>
        {`
        @media (max-width: 768px) {
          .cooking-table .responsive-table，
          .cooking-table .responsive-table thead,
          .cooking-table .responsive-table tbody,
          .cooking-table .responsive-table th,
          .cooking-table .responsive-table td,
          .cooking-table .responsive-table tr {
            display: block;
            width: 100% !important;
          }

          .cooking-table .responsive-table thead tr {
            position: absolute;
            top: -9999px;
            left: -9999px;
          }

          .cooking-table .responsive-table tr {
            border: 1px solid #ccc;
            margin-bottom: 0.5rem;
            padding: 0.2rem;
            border-radius: 8px;
            background: white !important;
          }

          .cooking-table .responsive-table td {
            border: none !important;
            border-bottom: 1px solid #eee !important;
            position: relative;
            padding-left: 45% !important;
            text-align: left !important;
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
          }
          
          .cooking-table .responsive-table td:before {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            left: 12px;
            width: 40%;
            padding-right: 10px;
            white-space: nowrap;
            text-align: left;
            font-weight: 600;
            color: #6b7280;
            font-size: 0.85rem;
          }

          .action-col {
             justify-content: flex-end;
             text-align: right;
          }

          /* Match columns mapping - Paddy Cooking */
          .cooking-table .responsive-table.has-type td:nth-of-type(1):before { content: "SL No"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(2):before { content: "Type"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(3):before { content: "Bags"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(4):before { content: "Pkg"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(5):before { content: "Party Name"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(6):before { content: "Location"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(7):before { content: "Variety"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(8):before { content: "Quality"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(9):before { content: "Sample Report By"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(10):before { content: "Smell"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(11):before { content: "Grain"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(12):before { content: "Cooking Done by"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(13):before { content: "Cooking Apprvd By"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(14):before { content: "Status"; }
          .cooking-table .responsive-table.has-type td:nth-of-type(15):before { content: "Action"; }

          /* Match columns mapping - Rice Cooking */
          .cooking-table .responsive-table.no-type td:nth-of-type(1):before { content: "SL No"; }
          .cooking-table .responsive-table.no-type td:nth-of-type(2):before { content: "Bags"; }
          .cooking-table .responsive-table.no-type td:nth-of-type(3):before { content: "Pkg"; }
          .cooking-table .responsive-table.no-type td:nth-of-type(4):before { content: "Party Name"; }
          .cooking-table .responsive-table.no-type td:nth-of-type(5):before { content: "Location"; }
          .cooking-table .responsive-table.no-type td:nth-of-type(6):before { content: "Variety"; }
          .cooking-table .responsive-table.no-type td:nth-of-type(7):before { content: "Sample Report"; }
          .cooking-table .responsive-table.no-type td:nth-of-type(8):before { content: "Cooking Done by"; }
          .cooking-table .responsive-table.no-type td:nth-of-type(9):before { content: "Cooking Apprvd By"; }
          .cooking-table .responsive-table.no-type td:nth-of-type(10):before { content: "Status"; }
          .cooking-table .responsive-table.no-type td:nth-of-type(11):before { content: "Action"; }
        }
        `}
      </style>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {(!entryType || entryType !== 'RICE_SAMPLE') && (
          <button
            onClick={() => setActiveTab('PADDY_COOKING_REPORT')}
            style={{
              padding: '8px 20px', fontSize: '13px', fontWeight: '700', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer', whiteSpace: 'nowrap',
              backgroundColor: activeTab === 'PADDY_COOKING_REPORT' ? '#1a237e' : '#e0e0e0',
              color: activeTab === 'PADDY_COOKING_REPORT' ? 'white' : '#555',
              boxShadow: activeTab === 'PADDY_COOKING_REPORT' ? '0 -2px 5px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            📖 PADDY SAMPLE COOKING
          </button>
        )}
        {(!entryType || entryType !== 'RICE_SAMPLE') && (
          <button
            onClick={() => setActiveTab('RESAMPLE_COOKING_REPORT')}
            style={{
              padding: '8px 20px', fontSize: '13px', fontWeight: '700', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer', whiteSpace: 'nowrap',
              backgroundColor: activeTab === 'RESAMPLE_COOKING_REPORT' ? '#c62828' : '#e0e0e0',
              color: activeTab === 'RESAMPLE_COOKING_REPORT' ? 'white' : '#555',
              boxShadow: activeTab === 'RESAMPLE_COOKING_REPORT' ? '0 -2px 5px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            🔄 RESAMPLE COOKING
            {renderTabBadge(resampleCookingCount, '#b91c1c')}
          </button>
        )}
        {(!excludeEntryType || excludeEntryType !== 'RICE_SAMPLE') && (
          <button
            onClick={() => setActiveTab('RICE_COOKING_REPORT')}
            style={{
              padding: '8px 20px', fontSize: '13px', fontWeight: '700', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer', whiteSpace: 'nowrap',
              backgroundColor: activeTab === 'RICE_COOKING_REPORT' ? '#d35400' : '#e0e0e0',
              color: activeTab === 'RICE_COOKING_REPORT' ? 'white' : '#555',
              boxShadow: activeTab === 'RICE_COOKING_REPORT' ? '0 -2px 5px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            🍚 RICE SAMPLE COOKING
          </button>
        )}
      </div>

      {(activeTab === 'PADDY_COOKING_REPORT' || activeTab === 'RESAMPLE_COOKING_REPORT') && (
        <>
          {/* Collapsible Filter Bar */}
          <div style={{ marginBottom: '0px' }}>
            <button
              onClick={() => setFiltersVisible(!filtersVisible)}
              style={{
                padding: '7px 16px',
                backgroundColor: filtersVisible ? '#e74c3c' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {filtersVisible ? '✕ Hide Filters' : '🔍 Filters'}
            </button>
            {filtersVisible && (
              <div style={{
                display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'flex-end', flexWrap: 'wrap',
                backgroundColor: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e0e0e0'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#555', marginBottom: '3px' }}>From Date</label>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                    style={{ padding: '5px 8px', borderRadius: '4px', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#555', marginBottom: '3px' }}>To Date</label>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                    style={{ padding: '5px 8px', borderRadius: '4px', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#555', marginBottom: '3px' }}>Broker</label>
                  <select value={filterBroker} onChange={e => setFilterBroker(e.target.value)}
                    style={{ padding: '5px 8px', borderRadius: '4px', fontSize: '12px', minWidth: '140px', backgroundColor: 'white' }}>
                    <option value="">All Brokers</option>
                    {brokersList.map((b, i) => <option key={i} value={b}>{b}</option>)}
                  </select>
                </div>
                {(filterDateFrom || filterDateTo || filterBroker) && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleApplyFilters}
                      style={{ padding: '5px 12px', border: 'none', borderRadius: '4px', backgroundColor: '#3498db', color: 'white', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                      Apply Filters
                    </button>
                    <button onClick={handleClearFilters}
                      style={{ padding: '5px 12px', border: '1px solid #e74c3c', borderRadius: '4px', backgroundColor: '#fff', color: '#e74c3c', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto', backgroundColor: 'white' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>
            ) : Object.keys(displayGrouped).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No cooking reports found</div>
            ) : (
              Object.entries(displayGrouped).map(([dateKey, brokerGroups]) => {
                // Filter brokers that have at least one Paddy entry
                const visibleBrokers = Object.entries(brokerGroups)
                  .map(([bName, bEntries]) => ({
                    name: bName,
                    entries: bEntries.filter((e: any) => entryType === 'RICE_SAMPLE' ? e.entryType === 'RICE_SAMPLE' : e.entryType !== 'RICE_SAMPLE')
                  }))
                  .filter(b => b.entries.length > 0)
                  .sort((a, b) => a.name.localeCompare(b.name));

                if (visibleBrokers.length === 0) return null;

                let brokerSeq = 0;
                return (
                  <div key={dateKey} style={{ marginBottom: '20px' }}>
                    {visibleBrokers.map((brokerGroup, vIdx) => {
                      brokerSeq++;
                      const { name: brokerName, entries: paddyEntries } = brokerGroup;
                      const orderedEntries = [...paddyEntries].sort((a, b) => {
                        const serialA = Number.isFinite(Number(a.serialNo)) ? Number(a.serialNo) : null;
                        const serialB = Number.isFinite(Number(b.serialNo)) ? Number(b.serialNo) : null;
                        if (serialA !== null && serialB !== null && serialA !== serialB) return serialA - serialB;
                        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                      });
                      return (
                        <div key={brokerName} style={{ marginBottom: '0px' }}>
                          {/* Date bar — only first visible broker */}
                          {vIdx === 0 && (
                            <div style={{
                              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                              color: 'white', padding: '6px 10px', fontWeight: '700', fontSize: '14px',
                              textAlign: 'center', letterSpacing: '0.5px'
                            }}>
                              {(() => { const d = new Date(paddyEntries[0]?.entryDate); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; })()}
                              &nbsp;&nbsp;{(activeTab as string) === 'RICE_COOKING_REPORT' ? 'Rice Sample Cooking' : 'Paddy Sample Cooking'}
                            </div>
                          )}
                          {/* Broker name bar */}
                          <div style={{
                            background: '#e8eaf6',
                            color: '#000', padding: '4px 10px', fontWeight: '700', fontSize: '13.5px',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            <span style={{ fontSize: '13.5px', fontWeight: '800' }}>{brokerSeq}.</span> {brokerName}
                          </div>
                          <div className="table-container cooking-table">
                            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed', border: '1px solid #000' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '3%' }}>SL No</th>
                                  {(activeTab as string) !== 'RICE_COOKING_REPORT' && (
                                    <th style={{ border: '1px solid #000', padding: '1px 3px', fontWeight: '600', fontSize: '12px', textAlign: 'center', width: '3%' }}>Type</th>
                                  )}
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '4%' }}>Bags</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '4%' }}>Pkg</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'left', width: '11%' }}>Party Name</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'left', width: '9%' }}>Location</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'left', width: '7%' }}>Variety</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '4%' }}>Quality</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '6%' }}>Sample Report By</th>
                                  {(activeTab as string) !== 'RICE_COOKING_REPORT' && (
                                    <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '6%' }}>Smell</th>
                                  )}
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '4%' }}>G C</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '6%' }}>Cooking Done by</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '7%' }}>Cooking Apprvd By</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '5%' }}>Status</th>
                                  {canTakeAction && (
                                    <th className="action-col" style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '8%' }}>Action</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {orderedEntries.map((entry, idx) => {
                                  const slNo = entry.serialNo || (idx + 1);

                                  // Determine Quality Info (Pass)
                                  let objQuality: React.ReactNode = '-';
                                  if (entry.qualityParameters) {
                                    objQuality = <span style={{ color: '#2e7d32' }}>Pass</span>;
                                  }

                                  return (
                                    <tr key={entry.id} style={{ backgroundColor: entry.entryType === 'DIRECT_LOADED_VEHICLE' ? '#e3f2fd' : entry.entryType === 'LOCATION_SAMPLE' ? '#ffe0b2' : '#ffffff', }}>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: '600', fontSize: '13px' }}>{slNo}</td>
                                      {(activeTab as string) !== 'RICE_COOKING_REPORT' && (
                                        <td style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'center', verticalAlign: 'middle' }}>
                                          {entry.entryType === 'DIRECT_LOADED_VEHICLE' && <span style={{ color: 'white', backgroundColor: '#1565c0', padding: '1px 4px', borderRadius: '3px', fontSize: '12px', fontWeight: '800' }}>RL</span>}
                                          {entry.entryType === 'LOCATION_SAMPLE' && <span style={{ color: 'white', backgroundColor: '#e67e22', padding: '1px 4px', borderRadius: '3px', fontSize: '12px', fontWeight: '800' }}>LS</span>}
                                          {entry.entryType !== 'DIRECT_LOADED_VEHICLE' && entry.entryType !== 'LOCATION_SAMPLE' && <span style={{ color: '#333', backgroundColor: '#fff', padding: '1px 4px', borderRadius: '3px', fontSize: '12px', fontWeight: '800', border: '1px solid #ccc' }}>MS</span>}
                                        </td>
                                      )}
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: '600', fontSize: '13px' }}>{entry.bags?.toLocaleString('en-IN') || '0'}</td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '13px', textAlign: 'center' }}>{entry.packaging || '-'}</td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#1565c0' }}>
                                        {(() => {
                                          const partyDisplay = getPartyDisplayParts(entry);
                                          return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenDetail(entry)}
                                                style={{ background: 'transparent', border: 'none', color: '#1565c0', textDecoration: 'underline', cursor: 'pointer', fontWeight: '700', fontSize: '14px', padding: 0, textAlign: 'left' }}
                                              >
                                                {partyDisplay.label}
                                              </button>
                                              {partyDisplay.showLorrySecondLine ? (
                                                <div style={{ fontSize: '13px', color: '#1565c0', fontWeight: '600' }}>{partyDisplay.lorry}</div>
                                              ) : null}
                                            </div>
                                          );
                                        })()}
                                      </td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', fontSize: '13px' }}>{toTitleCase(entry.location) || '-'}</td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', fontSize: '13px' }}>{toTitleCase(entry.variety)}</td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '12px', fontWeight: '700' }}>{objQuality}</td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                                        {renderSampleReportByWithDate(entry)}
                                      </td>
                                      {(activeTab as string) !== 'RICE_COOKING_REPORT' && (
                                        <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: getEntrySmellLabel(entry) === '-' ? '#666' : '#8a4b00', whiteSpace: 'nowrap' }}>
                                          {getEntrySmellLabel(entry)}
                                        </td>
                                      )}
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#333' }}>
                                        {(() => {
                                          const qp: any = entry.qualityParameters;
                                          const raw = qp?.grainsCountRaw != null ? String(qp.grainsCountRaw).trim() : '';
                                          if (raw !== '') return `(${raw})`;
                                          const val = qp?.grainsCount;
                                          if (val == null || val === '') return '-';
                                          const rawNumeric = String(val).trim();
                                          if (!rawNumeric) return '-';
                                          const num = Number(rawNumeric);
                                          if (!Number.isFinite(num) || num === 0) return '-';
                                          return `(${rawNumeric})`;
                                        })()}
                                      </td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6a1b9a' }}>
                                        {renderCookingDoneByWithDate(entry, '')}
                                      </td>

                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#1565c0' }}>
                                        {renderApprovedByWithDate(entry)}
                                      </td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '12px' }}>
                                        {getStatusBadge(entry)}
                                      </td>
                                      {canTakeAction && (
                                        <td className="action-col" style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>
                                          {(() => {
                                            const actionState = canStaffAddCookingForEntry(entry);
                                            if (!isCookingStaffRole || actionState.canAdd) {
                                              return (
                                                <button
                                                  onClick={() => handleOpenModal(entry)}
                                                  style={{
                                                    fontSize: '9px', padding: '4px 10px',
                                                    backgroundColor: '#3498db', color: 'white', border: 'none',
                                                    borderRadius: '10px', cursor: 'pointer', fontWeight: '600'
                                                  }}
                                                >
                                                  {isCookingStaffRole ? 'Add Cooking Done By' : 'Add Report'}
                                                </button>
                                              );
                                            } else {
                                              return <span style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>{actionState.reason || 'Locked'}</span>;
                                            }
                                          })()}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div >
        </>
      )}

      {
        activeTab === 'RICE_COOKING_REPORT' && (
          <div style={{ overflowX: 'auto', backgroundColor: 'white' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>
            ) : Object.keys(displayGrouped).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No rice samples found</div>
            ) : (
              Object.entries(displayGrouped).map(([dateKey, brokerGroups]) => {
                // Filter brokers that have at least one Rice entry
                const visibleBrokers = Object.entries(brokerGroups)
                  .map(([bName, bEntries]) => ({
                    name: bName,
                    entries: bEntries.filter(e => e.entryType === 'RICE_SAMPLE')
                  }))
                  .filter(b => b.entries.length > 0)
                  .sort((a, b) => a.name.localeCompare(b.name));

                if (visibleBrokers.length === 0) return null;

                let brokerSeq = 0;
                return (
                  <div key={dateKey} style={{ marginBottom: '20px' }}>
                    {visibleBrokers.map((brokerGroup, vIdx) => {
                      brokerSeq++;
                      const { name: brokerName, entries: riceEntries } = brokerGroup;
                      const orderedEntries = [...riceEntries].sort((a, b) => {
                        const serialA = Number.isFinite(Number(a.serialNo)) ? Number(a.serialNo) : null;
                        const serialB = Number.isFinite(Number(b.serialNo)) ? Number(b.serialNo) : null;
                        if (serialA !== null && serialB !== null && serialA !== serialB) return serialA - serialB;
                        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                      });
                      return (
                        <div key={brokerName} style={{ marginBottom: '0px' }}>
                          {/* Date bar — only first visible broker */}
                          {vIdx === 0 && (
                            <div style={{
                              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                              color: 'white', padding: '6px 10px', fontWeight: '700', fontSize: '14px',
                              textAlign: 'center', letterSpacing: '0.5px'
                            }}>
                              {(() => { const d = new Date(riceEntries[0]?.entryDate); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; })()}
                              &nbsp;&nbsp;Rice Sample Cooking
                            </div>
                          )}

                          {/* Broker name bar */}
                          <div style={{
                            background: '#e8eaf6',
                            color: '#000', padding: '4px 10px', fontWeight: '700', fontSize: '13.5px',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            <span style={{ fontSize: '13.5px', fontWeight: '800' }}>{brokerSeq}.</span> {brokerName}
                          </div>

                          <div className="table-container cooking-table">
                            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed', border: '1px solid #000' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#4a148c', color: 'white' }}>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '3%' }}>SL No</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '6%' }}>Bags</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '6%' }}>Pkg</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'left', width: '16%' }}>Party Name</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'left', width: '12%' }}>Location</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'left', width: '8%' }}>Variety</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '10%' }}>Sample Report By</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '10%' }}>Cooking Done by</th>

                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '10%' }}>Cooking Apprvd By</th>
                                  <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '8%' }}>Status</th>

                                  {canTakeAction && (
                                    <th className="action-col" style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', width: '9%' }}>Action</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {orderedEntries.map((entry, idx) => {
                                  const slNo = entry.serialNo || (idx + 1);
                                  return (
                                    <tr key={entry.id}>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: '600', fontSize: '13px' }}>{slNo}</td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: '700', fontSize: '13px', color: '#1565c0' }}>{entry.bags?.toLocaleString('en-IN') || '0'}</td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '11px' }}>{(() => {
                                        let pkg = String(entry.packaging || '75');
                                        if (pkg.toLowerCase() === '0' || pkg.toLowerCase() === 'loose') return 'Loose';
                                        if (pkg.toLowerCase().includes('kg')) return pkg;
                                        if (pkg.toLowerCase().includes('tons')) return pkg;
                                        return `${pkg} kg`;
                                      })()}</td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#1565c0' }}>
                                        {(() => {
                                          const partyDisplay = getPartyDisplayParts(entry);
                                          return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenHistory(entry, 'all')}
                                                style={{ background: 'transparent', border: 'none', color: '#1565c0', textDecoration: 'underline', cursor: 'pointer', fontWeight: '700', fontSize: '14px', padding: 0, textAlign: 'left' }}
                                              >
                                                {partyDisplay.label}
                                              </button>
                                              {partyDisplay.showLorrySecondLine ? (
                                                <div style={{ fontSize: '13px', color: '#1565c0', fontWeight: '600' }}>{partyDisplay.lorry}</div>
                                              ) : null}
                                            </div>
                                          );
                                        })()}
                                      </td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', fontSize: '13px' }}>{toTitleCase(entry.location) || '-'}</td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', fontSize: '13px' }}>{toTitleCase(entry.variety)}</td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                                        {renderSampleReportByWithDate(entry)}
                                      </td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6a1b9a' }}>
                                        {renderCookingDoneByWithDate(entry, '')}
                                      </td>

                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#1565c0' }}>
                                        {renderApprovedByWithDate(entry)}
                                      </td>
                                      <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '12px' }}>
                                        {getStatusBadge(entry)}
                                      </td>
                                      {canTakeAction && (
                                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>
                                          {(() => {
                                            const actionState = canStaffAddCookingForEntry(entry);
                                            if (!isCookingStaffRole || actionState.canAdd) {
                                              return (
                                                <button
                                                  onClick={() => handleOpenModal(entry)}
                                                  style={{
                                                    fontSize: '9px', padding: '4px 10px',
                                                    backgroundColor: '#3498db', color: 'white', border: 'none',
                                                    borderRadius: '10px', cursor: 'pointer', fontWeight: '600'
                                                  }}
                                                >
                                                  {isCookingStaffRole ? 'Add Cooking Done By' : 'Add Report'}
                                                </button>
                                              );
                                            }
                                            return <span style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>{actionState.reason || 'Locked'}</span>;
                                          })()}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )
      }

      {/* Cooking Report Modal */}
      {
        showModal && selectedEntry && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white', borderRadius: '8px', width: '100%', maxWidth: '500px',
              border: '1px solid #999', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '16px 20px', color: 'white'
              }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isCookingStaffRole ? '🍳 Add Preparing for Cooking' : `🍳 Add ${selectedEntry.entryType === 'RICE_SAMPLE' ? 'Rice' : 'Paddy'} Cooking Report`}
                </h3>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4', opacity: 0.95, fontWeight: '500' }}>
                  <span style={{ fontWeight: '800' }}>Broker Name:</span> {selectedEntry.brokerName}<br />
                  <span style={{ fontWeight: '800' }}>Party Name:</span> {(() => {
                    const party = (selectedEntry.partyName || '').trim();
                    const lorry = selectedEntry.lorryNumber ? selectedEntry.lorryNumber.toUpperCase() : '';
                    return party ? toTitleCase(party) : (lorry || '-');
                  })()}<br />
                  <span style={{ fontWeight: '800' }}>Variety:</span> {selectedEntry.variety}<br />
                  <span style={{ fontWeight: '800' }}>Bags:</span> {selectedEntry.bags?.toLocaleString('en-IN')}
                </p>
              </div>

              <div style={{ padding: '20px' }}>

                {(!isCookingStaffRole && !selectedEntry.cookingReport?.cookingDoneBy) ? (
                  <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '4px', color: '#856404' }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>⚠️ Action Required by Paddy Supervisor</p>
                    <p style={{ margin: '8px 0 0', fontSize: '13px' }}>The Paddy Supervisor must select "Cooking Done By" and save their details before an Admin or Manager can approve and set the Status.</p>
                    <div style={{ marginTop: '16px' }}>
                      <button type="button" onClick={closeReportModal}
                        style={{ padding: '8px 16px', cursor: 'pointer', border: '1px solid #999', borderRadius: '3px', backgroundColor: 'white', fontSize: '13px', color: '#666' }}>
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    {/* Status & Date - Hidden for staff */}
                    {!isCookingStaffRole && (
                      <>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontWeight: '600', color: '#555', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
                            Date
                          </label>
                          <input
                            type="date"
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid #999', borderRadius: '3px', fontSize: '13px' }}
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontWeight: '600', color: '#555', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
                            Status *
                          </label>
                          <select
                            value={cookingData.status}
                            onChange={(e) => setCookingData({ ...cookingData, status: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid #999', borderRadius: '3px', fontSize: '13px' }}
                            required
                          >
                            <option value="">-- Select Status --</option>
                            <option value="PASS">Pass</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="RECHECK">Recheck</option>
                            <option value="FAIL">Fail</option>
                          </select>
                        </div>
                      </>
                    )}

                    {/* Cooking Done By - STRICTLY FOR STAFF */}
                    {isCookingStaffRole && (
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '13px' }}>
                          Cooking Done by*
                        </label>
                        {!useManualEntry && (
                          <select
                            value={cookingData.cookingDoneBy}
                            onChange={(e) => {
                              setCookingData({ ...cookingData, cookingDoneBy: e.target.value });
                            }}
                            disabled={isCookingStaffRole && isResampleWorkflowEntry(selectedEntry)}
                            style={{
                              width: '100%', padding: '6px 8px', border: '1px solid #999', borderRadius: '3px', fontSize: '13px',
                              backgroundColor: isCookingStaffRole && isResampleWorkflowEntry(selectedEntry) ? '#f5f5f5' : 'white', marginBottom: '6px'
                            }}
                          >
                            <option value="">-- Select from list --</option>
                            {supervisors.map(s => (
                              <option key={s.id} value={s.username}>{toTitleCase(s.fullName || s.username)}</option>
                            ))}
                          </select>
                        )}

                        {(!cookingData.cookingDoneBy) && (
                          <input
                            type="text"
                            placeholder="Or Type Name Manually"
                            value={manualCookingName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setManualCookingName(val);
                              setUseManualEntry(val.trim() !== '');
                            }}
                            style={{
                              width: '100%', padding: '6px 8px', border: '1px solid #999', borderRadius: '3px', fontSize: '13px',
                              backgroundColor: 'white'
                            }}
                          />
                        )}
                      </div>
                    )}

                    {/* Admin and Manager Block - Cooking Approved By & Remarks */}
                    {!isCookingStaffRole && (
                      <>
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555', fontSize: '13px' }}>
                            Cooking Approved by*
                          </label>
                          <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', marginBottom: '8px', fontSize: '13px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="approvalType"
                                checked={approvalType === 'owner'}
                                onChange={() => setApprovalType('owner')}
                              />
                              Harish
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="approvalType"
                                checked={approvalType === 'manager'}
                                onChange={() => setApprovalType('manager')}
                              />
                              Guru
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="approvalType"
                                checked={approvalType === 'admin'}
                                onChange={() => setApprovalType('admin')}
                              />
                              MK Subbu
                            </label>
                          </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '500', color: '#555' }}>Remarks</span>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px', fontSize: '13px' }}>
                              <input
                                type="radio"
                                checked={!showRemarksInput}
                                onChange={() => setShowRemarksInput(false)}
                              /> No
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px', fontSize: '13px' }}>
                              <input
                                type="radio"
                                checked={showRemarksInput}
                                onChange={() => setShowRemarksInput(true)}
                              /> Yes
                            </label>
                          </div>

                          {showRemarksInput && (
                            <textarea
                              value={cookingData.remarks}
                              onChange={(e) => setCookingData({ ...cookingData, remarks: e.target.value })}
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #999', borderRadius: '3px', fontSize: '13px', minHeight: '60px' }}
                              placeholder="Enter remarks..."
                            />
                          )}
                        </div>
                      </>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                      <button type="button" onClick={closeReportModal} disabled={isSubmitting}
                        style={{ padding: '8px 16px', cursor: isSubmitting ? 'not-allowed' : 'pointer', border: '1px solid #999', borderRadius: '3px', backgroundColor: 'white', fontSize: '13px', color: '#666' }}>
                        Cancel
                      </button>
                      <button type="submit" disabled={isSubmitting}
                        style={{ padding: '8px 16px', cursor: isSubmitting ? 'not-allowed' : 'pointer', backgroundColor: isSubmitting ? '#95a5a6' : '#27ae60', color: 'white', border: 'none', borderRadius: '3px', fontSize: '13px', fontWeight: '600' }}>
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Detail Popup (same design as Admin Sample Book) */}
      {detailEntry && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1200,
            padding: '20px 16px'
          }}
          onClick={() => setDetailEntry(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '94vw',
              maxWidth: '1180px',
              maxHeight: '88vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: detailEntry.entryType === 'DIRECT_LOADED_VEHICLE'
                  ? '#1565c0'
                  : detailEntry.entryType === 'LOCATION_SAMPLE'
                    ? '#e67e22'
                    : '#4caf50',
                padding: '16px 20px',
                borderRadius: '8px 8px 0 0',
                color: 'white',
                position: 'relative'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', opacity: 0.9, textAlign: 'left' }}>
                  {new Date(detailEntry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', textAlign: 'center' }}>
                  {detailEntry.entryType === 'DIRECT_LOADED_VEHICLE'
                    ? 'Ready Lorry'
                    : detailEntry.entryType === 'LOCATION_SAMPLE'
                      ? 'Location Sample'
                      : 'Mill Sample'}
                </div>
                <div></div>
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: '900',
                  letterSpacing: '-0.5px',
                  marginTop: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '85%'
                }}
              >
                {toTitleCase(detailEntry.brokerName) || '-'}
              </div>
              <button
                onClick={() => setDetailEntry(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(255,255,255,0.25)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: 'white',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                X
              </button>
            </div>
            <div style={{ padding: '24px', backgroundColor: '#fff', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', position: 'relative' }}>
              {detailLoading && (
                <div style={{ padding: '12px 0', fontSize: '13px', color: '#666' }}>Loading details...</div>
              )}
              {(() => {
                const off = (detailEntry as any).offering;
                if (!off) return null;
                const pricingRows = [
                  ['Offer Rate', off.offerBaseRateValue || off.offeringPrice
                    ? `Rs ${toNumberText(off.offerBaseRateValue ?? off.offeringPrice)} / ${String(off.baseRateType || '').replace(/_/g, '/')} / ${formatRateUnitLabel(off.baseRateUnit)}`
                    : '-'],
                  ['Final Rate', off.finalPrice || off.finalBaseRate
                    ? `Rs ${toNumberText(off.finalPrice ?? off.finalBaseRate)} / ${String(off.finalBaseRateType || off.baseRateType || '').replace(/_/g, '/')} / ${formatRateUnitLabel(off.finalBaseRateUnit || off.baseRateUnit)}`
                    : '-'],
                  ['Sute', off.finalSute || off.sute
                    ? `${toNumberText(off.finalSute ?? off.sute)} / ${formatRateUnitLabel(off.finalSuteUnit || off.suteUnit)}`
                    : '-'],
                  ['Moisture', off.moistureValue ? `${toNumberText(off.moistureValue)}%` : '-'],
                  ['Hamali', off.hamali ? `${toNumberText(off.hamali)} / ${formatChargeUnitLabel(off.hamaliUnit)}` : (off.hamaliEnabled ? 'Pending' : '-')],
                  ['Brokerage', off.brokerage ? `${toNumberText(off.brokerage)} / ${formatChargeUnitLabel(off.brokerageUnit)}` : (off.brokerageEnabled ? 'Pending' : '-')],
                  ['LF', off.lf ? `${toNumberText(off.lf)} / ${formatChargeUnitLabel(off.lfUnit)}` : (off.lfEnabled ? 'Pending' : '-')],
                  ['CD', off.cdEnabled ? (off.cdValue ? `${toNumberText(off.cdValue)} / ${formatChargeUnitLabel(off.cdUnit)}` : 'Pending') : '-'],
                  ['Bank Loan', off.bankLoanEnabled ? (off.bankLoanValue ? `Rs ${formatIndianCurrency(off.bankLoanValue)} / ${formatChargeUnitLabel(off.bankLoanUnit)}` : 'Pending') : '-'],
                  ['Payment', off.paymentConditionValue ? `${off.paymentConditionValue} ${off.paymentConditionUnit === 'month' ? 'Month' : 'Days'}` : '-']
                ];
                if (pricingRows.every(([, value]) => value === '-')) return null;

                return (
                  <div style={{ position: 'absolute', top: 24, right: 24, width: 340, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', color: '#0f766e', borderBottom: '2px solid #0f766e', paddingBottom: '6px' }}>Pricing Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                      {pricingRows.map(([label, value]) => (
                        <div key={label} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', lineHeight: '1.35', wordBreak: 'break-word' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px', maxWidth: 'calc(100% - 360px)' }}>
                {[
                  ['Date', new Date(detailEntry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
                  ['Total Bags', detailEntry.bags?.toLocaleString('en-IN')],
                  ['Packaging', `${detailEntry.packaging || '75'} Kg`],
                  ['Variety', toTitleCase(detailEntry.variety || '-')],
                ].map(([label, value], i) => (
                  <div key={i} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{value || '-'}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px', maxWidth: 'calc(100% - 360px)' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Party Name</div>
                  {(() => {
                    const partyDisplay = getPartyDisplayParts(detailEntry);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{partyDisplay.label}</div>
                        {partyDisplay.showLorrySecondLine ? (
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1565c0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{partyDisplay.lorry}</div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{toTitleCase(detailEntry.location || '-')}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Collected By</div>
                  {(() => {
                    const collectedByDisplay = getCollectedByDisplay(detailEntry, supervisors);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: collectedByDisplay.highlightPrimary ? '#9c27b0' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {collectedByDisplay.primary}
                        </div>
                        {collectedByDisplay.secondary ? (
                          <div style={{ fontSize: '12px', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {collectedByDisplay.secondary}
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
                {(() => {
                  const smellAttempts = getQualityAttemptsForEntry(detailEntry as any);
                  const smellAttempt = [...smellAttempts].reverse().find((qp: any) => qp?.smellHas || (qp?.smellType && String(qp.smellType).trim()));
                  const smellHasValue = smellAttempt?.smellHas ?? (detailEntry as any).smellHas;
                  const smellTypeValue = smellAttempt?.smellType ?? (detailEntry as any).smellType;
                  if (!(smellHasValue || (smellTypeValue && String(smellTypeValue).trim()))) return null;
                  return (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Smell</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{toTitleCase(smellTypeValue || 'Yes')}</div>
                    </div>
                  );
                })()}
              </div>

              {((detailEntry as any).gpsCoordinates || (detailEntry as any).godownImageUrl || (detailEntry as any).paddyLotImageUrl) && (
                <div style={{ marginBottom: '24px', maxWidth: 'calc(100% - 360px)' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: '#e67e22', borderBottom: '2px solid #e67e22', paddingBottom: '6px', fontWeight: '900' }}>Location & Media</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(detailEntry as any).gpsCoordinates && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#666', fontWeight: '800', textTransform: 'uppercase' }}>GPS Coordinates Captured</div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((detailEntry as any).gpsCoordinates)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-block', padding: '6px 16px', background: '#e67e22', color: 'white', borderRadius: '4px', textDecoration: 'none', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}
                        >
                          MAP LINK
                        </a>
                      </div>
                    )}
                    {((detailEntry as any).godownImageUrl || (detailEntry as any).paddyLotImageUrl) && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                        {(detailEntry as any).godownImageUrl && (
                          <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>
                            <div style={{ padding: '6px', background: '#f8fafc', fontSize: '10px', textAlign: 'center', fontWeight: '800', borderBottom: '1px solid #e2e8f0' }}>GODOWN IMAGE</div>
                            <img src={resolveMediaUrl((detailEntry as any).godownImageUrl)} alt="Godown" style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                          </div>
                        )}
                        {(detailEntry as any).paddyLotImageUrl && (
                          <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>
                            <div style={{ padding: '6px', background: '#f8fafc', fontSize: '10px', textAlign: 'center', fontWeight: '800', borderBottom: '1px solid #e2e8f0' }}>LOT IMAGE</div>
                            <img src={resolveMediaUrl((detailEntry as any).paddyLotImageUrl)} alt="Paddy Lot" style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: (getQualityAttemptsForEntry(detailEntry as any).length > 1 ? 'minmax(0, 1fr)' : (buildCookingStatusRows(detailEntry as any).length > 0 ? 'minmax(0, 1fr) 340px' : 'minmax(0, 1fr)')), gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#e67e22', borderBottom: '2px solid #e67e22', paddingBottom: '6px' }}>Quality Parameters</h4>
                  {(() => {
                    const qpList = getQualityAttemptsForEntry(detailEntry as any);
                    if (qpList.length === 0) return <div style={{ color: '#999', textAlign: 'center', padding: '12px', fontSize: '12px' }}>No quality data</div>;

                    const displayVal = (rawVal: any, numericVal: any, enabled = true) => {
                      if (!enabled) return null;
                      const raw = rawVal != null ? String(rawVal).trim() : '';
                      if (raw !== '') return raw;
                      if (numericVal == null || numericVal === '') return null;
                      const rawNumeric = String(numericVal).trim();
                      if (!rawNumeric) return null;
                      const n = Number(rawNumeric);
                      if (!Number.isFinite(n) || n === 0) return null;
                      return rawNumeric;
                    };
                    const isProvided = (rawVal: any, numericVal: any) => {
                      const raw = rawVal != null ? String(rawVal).trim() : '';
                      if (raw !== '') return true;
                      if (numericVal == null || numericVal === '') return false;
                      const rawNumeric = String(numericVal).trim();
                      if (!rawNumeric) return false;
                      const n = Number(rawNumeric);
                      return Number.isFinite(n) && n !== 0;
                    };
                    const isEnabled = (flag: any, rawVal: any, numericVal: any) => (
                      flag === true || (flag == null && isProvided(rawVal, numericVal))
                    );

                    const QItem = ({ label, value }: { label: string; value: React.ReactNode }) => {
                      const isBold = ['Grains Count', 'Paddy WB'].includes(label);
                      return (
                        <div style={{ background: '#f8f9fa', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '2px', fontWeight: '600', textTransform: 'uppercase' }}>{label}</div>
                          <div style={{ fontSize: '12px', fontWeight: isBold ? '800' : '700', color: isBold ? '#000' : '#2c3e50' }}>{value || '-'}</div>
                        </div>
                      );
                    };
                    const qualityPhotoUrl = qpList.find((qp: any) => qp?.uploadFileUrl)?.uploadFileUrl;
                    const hasMultipleAttempts = qpList.length > 1;
                    const hasCookingHistory = Array.isArray((detailEntry as any).cookingReport?.history)
                      ? (detailEntry as any).cookingReport.history.filter(Boolean).length > 0
                      : Boolean((detailEntry as any).cookingReport?.status || (detailEntry as any).cookingReport?.remarks);
                    const useHorizontalQualityHistory = qpList.length > 1;
                    const getAttemptLabel = (attemptNo: number, idx: number) => {
                      const num = attemptNo || idx + 1;
                      if (num === 1) return '1st Sample';
                      if (num === 2) return '2nd Sample';
                      if (num === 3) return '3rd Sample';
                      return `${num}th Sample`;
                    };

                    if (useHorizontalQualityHistory) {
                      const thStyle: React.CSSProperties = { padding: '6px 8px', textAlign: 'center', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', borderBottom: '2px solid #e0e0e0', background: '#fff8f0', color: '#9a3412' };
                      const tdStyle: React.CSSProperties = { padding: '5px 8px', textAlign: 'center', fontSize: '12px', fontWeight: '600', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', color: '#333' };
                      const tdLabelStyle: React.CSSProperties = { ...tdStyle, textAlign: 'left', fontWeight: '800', color: '#9a3412', background: '#fff8f0', position: 'sticky' as any, left: 0, zIndex: 1 };

                      const getRowData = (qp: any, idx: number) => {
                        const smixOn = isEnabled(qp.smixEnabled, qp.mixSRaw, qp.mixS);
                        const lmixOn = isEnabled(qp.lmixEnabled, qp.mixLRaw, qp.mixL);
                        const paddyOn = isEnabled(qp.paddyWbEnabled, qp.paddyWbRaw, qp.paddyWb);
                        const wbOn = isProvided(qp.wbRRaw, qp.wbR) || isProvided(qp.wbBkRaw, qp.wbBk);
                        const smellHasValue = qp.smellHas ?? (detailEntry as any).smellHas;
                        const smellTypeValue = qp.smellType ?? (detailEntry as any).smellType;
                        return {
                          label: getAttemptLabel(qp.attemptNo, idx),
                          reportedBy: toTitleCase(qp.reportedBy || '-'),
                          reportedAt: formatShortDateTime(qp.updatedAt || qp.createdAt || null) || '-',
                          moisture: (() => { const val = displayVal(qp.moistureRaw, qp.moisture); return val ? `${val}%` : '-'; })(),
                          cutting: (() => { const cut1 = displayVal(qp.cutting1Raw, qp.cutting1); const cut2 = displayVal(qp.cutting2Raw, qp.cutting2); return cut1 && cut2 ? `${cut1}x${cut2}` : '-'; })(),
                          bend: (() => { const bend1 = displayVal(qp.bend1Raw, qp.bend1); const bend2 = displayVal(qp.bend2Raw, qp.bend2); return bend1 && bend2 ? `${bend1}x${bend2}` : '-'; })(),
                          grainsCount: (() => { const val = displayVal(qp.grainsCountRaw, qp.grainsCount); return val ? `(${val})` : '-'; })(),
                          mix: displayVal(qp.mixRaw, qp.mix) || '-',
                          sMix: displayVal(qp.mixSRaw, qp.mixS, smixOn) || '-',
                          lMix: displayVal(qp.mixLRaw, qp.mixL, lmixOn) || '-',
                          kandu: displayVal(qp.kanduRaw, qp.kandu) || '-',
                          oil: displayVal(qp.oilRaw, qp.oil) || '-',
                          sk: displayVal(qp.skRaw, qp.sk) || '-',
                          wbR: displayVal(qp.wbRRaw, qp.wbR, wbOn) || '-',
                          wbBk: displayVal(qp.wbBkRaw, qp.wbBk, wbOn) || '-',
                          wbT: displayVal(qp.wbTRaw, qp.wbT, wbOn) || '-',
                          smell: smellHasValue ? toTitleCase(smellTypeValue || 'Yes') : '-',
                          paddyWb: displayVal(qp.paddyWbRaw, qp.paddyWb, paddyOn) || '-',
                        };
                      };

                      const rows = qpList.map((qp: any, idx: number) => getRowData(qp, idx));

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {qualityPhotoUrl && (
                            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px' }}>
                              <div style={{ fontSize: '11px', fontWeight: '800', color: '#1d4ed8', marginBottom: '8px', textTransform: 'uppercase' }}>Quality Photo</div>
                              <img src={resolveMediaUrl(qualityPhotoUrl)} alt="Quality" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e0e0e0' }} />
                            </div>
                          )}
                          <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
                              <thead>
                                <tr>
                                  <th style={{ ...thStyle, textAlign: 'left', position: 'sticky' as any, left: 0, zIndex: 2, background: '#fff8f0', minWidth: '100px' }}>Sample</th>
                                  <th style={thStyle}>Sample Reported By</th>
                                  <th style={thStyle}>Reported At</th>
                                  <th style={thStyle}>Moisture</th>
                                  <th style={thStyle}>Cutting</th>
                                  <th style={thStyle}>Bend</th>
                                  <th style={thStyle}>Grains Count</th>
                                  <th style={thStyle}>Mix</th>
                                  <th style={thStyle}>S Mix</th>
                                  <th style={thStyle}>L Mix</th>
                                  <th style={thStyle}>Kandu</th>
                                  <th style={thStyle}>Oil</th>
                                  <th style={thStyle}>SK</th>
                                  <th style={thStyle}>WB-R</th>
                                  <th style={thStyle}>WB-BK</th>
                                  <th style={thStyle}>WB-T</th>
                                  <th style={thStyle}>Smell</th>
                                  <th style={thStyle}>Paddy WB</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row, idx) => (
                                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={tdLabelStyle}>{row.label}</td>
                                    <td style={tdStyle}>{row.reportedBy}</td>
                                    <td style={{ ...tdStyle, fontSize: '10px' }}>{row.reportedAt}</td>
                                    <td style={{ ...tdStyle, color: '#e67e22', fontWeight: '800' }}>{row.moisture}</td>
                                    <td style={tdStyle}>{row.cutting}</td>
                                    <td style={tdStyle}>{row.bend}</td>
                                    <td style={{ ...tdStyle, fontWeight: '800' }}>{row.grainsCount}</td>
                                    <td style={tdStyle}>{row.mix}</td>
                                    <td style={tdStyle}>{row.sMix}</td>
                                    <td style={tdStyle}>{row.lMix}</td>
                                    <td style={tdStyle}>{row.kandu}</td>
                                    <td style={tdStyle}>{row.oil}</td>
                                    <td style={tdStyle}>{row.sk}</td>
                                    <td style={tdStyle}>{row.wbR}</td>
                                    <td style={tdStyle}>{row.wbBk}</td>
                                    <td style={tdStyle}>{row.wbT}</td>
                                    <td style={tdStyle}>{row.smell}</td>
                                    <td style={tdStyle}>{row.paddyWb}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {qualityPhotoUrl && (
                          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#1d4ed8', marginBottom: '8px', textTransform: 'uppercase' }}>Quality Photo</div>
                            <img
                              src={resolveMediaUrl(qualityPhotoUrl)}
                              alt="Quality"
                              style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e0e0e0' }}
                            />
                          </div>
                        )}
                        {qpList.map((qp: any, idx: number) => {
                          const smixOn = isEnabled(qp.smixEnabled, (qp as any).mixSRaw, qp.mixS);
                          const lmixOn = isEnabled(qp.lmixEnabled, (qp as any).mixLRaw, qp.mixL);
                          const paddyOn = isEnabled(qp.paddyWbEnabled, (qp as any).paddyWbRaw, qp.paddyWb);
                          const wbOn = isProvided((qp as any).wbRRaw, qp.wbR) || isProvided((qp as any).wbBkRaw, qp.wbBk);
                          const dryOn = isProvided((qp as any).dryMoistureRaw, (qp as any).dryMoisture);
                          const row1: { label: string; value: React.ReactNode }[] = [];
                          const moistureVal = displayVal((qp as any).moistureRaw, qp.moisture);
                          if (moistureVal) {
                            const dryVal = displayVal((qp as any).dryMoistureRaw, (qp as any).dryMoisture, dryOn);
                            row1.push({
                              label: 'Moisture',
                              value: dryVal ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                                  <span style={{ color: '#e67e22', fontWeight: '800', fontSize: '11px' }}>{dryVal}%</span>
                                  <span>{moistureVal}%</span>
                                </div>
                              ) : `${moistureVal}%`
                            });
                          }
                          const cut1 = displayVal((qp as any).cutting1Raw, qp.cutting1);
                          const cut2 = displayVal((qp as any).cutting2Raw, qp.cutting2);
                          if (cut1 && cut2) row1.push({ label: 'Cutting', value: `${cut1}x${cut2}` });
                          const bend1 = displayVal((qp as any).bend1Raw, qp.bend1);
                          const bend2 = displayVal((qp as any).bend2Raw, qp.bend2);
                          if (bend1 && bend2) row1.push({ label: 'Bend', value: `${bend1}x${bend2}` });
                          const grainsVal = displayVal((qp as any).grainsCountRaw, qp.grainsCount);
                          if (grainsVal) row1.push({ label: 'Grains Count', value: `(${grainsVal})` });

                          const row2: { label: string; value: React.ReactNode }[] = [];
                          const mixVal = displayVal((qp as any).mixRaw, qp.mix);
                          const mixSVal = displayVal((qp as any).mixSRaw, qp.mixS, smixOn);
                          const mixLVal = displayVal((qp as any).mixLRaw, qp.mixL, lmixOn);
                          if (mixVal) row2.push({ label: 'Mix', value: mixVal });
                          if (mixSVal) row2.push({ label: 'S Mix', value: mixSVal });
                          if (mixLVal) row2.push({ label: 'L Mix', value: mixLVal });

                          const row3: { label: string; value: React.ReactNode }[] = [];
                          const kanduVal = displayVal((qp as any).kanduRaw, qp.kandu);
                          const oilVal = displayVal((qp as any).oilRaw, qp.oil);
                          const skVal = displayVal((qp as any).skRaw, qp.sk);
                          if (kanduVal) row3.push({ label: 'Kandu', value: kanduVal });
                          if (oilVal) row3.push({ label: 'Oil', value: oilVal });
                          if (skVal) row3.push({ label: 'SK', value: skVal });

                          const row4: { label: string; value: React.ReactNode }[] = [];
                          const row5: { label: string; value: React.ReactNode }[] = [];
                          const wbRVal = displayVal((qp as any).wbRRaw, qp.wbR, wbOn);
                          const wbBkVal = displayVal((qp as any).wbBkRaw, qp.wbBk, wbOn);
                          const wbTVal = displayVal((qp as any).wbTRaw, qp.wbT, wbOn);
                          if (wbRVal) row4.push({ label: 'WB-R', value: wbRVal });
                          if (wbBkVal) row4.push({ label: 'WB-BK', value: wbBkVal });
                          if (wbTVal) row4.push({ label: 'WB-T', value: wbTVal });
                          const hasPaddyWb = displayVal((qp as any).paddyWbRaw, qp.paddyWb, paddyOn);
                          if (hasPaddyWb) {
                            row5.push({
                              label: 'Paddy WB',
                              value: (
                                <span style={{
                                  color: Number(qp.paddyWb) < 50 ? '#d32f2f' : (Number(qp.paddyWb) <= 50.5 ? '#f39c12' : '#1b5e20'),
                                  fontWeight: '800'
                                }}>
                                  {hasPaddyWb}
                                </span>
                              )
                            });
                          }
                          const smellHas = (qp as any).smellHas ?? (qpList.length === 1 ? (detailEntry as any).smellHas : undefined);
                          const smellType = (qp as any).smellType ?? (qpList.length === 1 ? (detailEntry as any).smellType : undefined);
                          if (smellHas || (smellType && String(smellType).trim())) {
                            row5.push({ label: 'Smell', value: toTitleCase(smellType || 'Yes') });
                          }

                          return (
                            <div key={idx} style={qpList.length > 1 ? { background: '#fcfcfc', border: '1px solid #eee', borderRadius: '6px', padding: '12px' } : {}}>
                              {qpList.length > 1 && (
                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#e67e22', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  {qp.attemptNo ? `${qp.attemptNo}${qp.attemptNo === 1 ? 'st' : qp.attemptNo === 2 ? 'nd' : 'th'} Quality` : `${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : 'th'} Quality`}
                                </div>
                              )}
                              {row1.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row1.length}, 1fr)`, gap: '8px' }}>{row1.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}</div>}
                              {row2.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row2.length}, 1fr)`, gap: '8px' }}>{row2.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}</div>}
                              {row3.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row3.length}, 1fr)`, gap: '8px' }}>{row3.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}</div>}
                              {row4.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row4.length}, 1fr)`, gap: '8px' }}>{row4.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}</div>}
                              {row5.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row5.length}, 1fr)`, gap: '8px' }}>{row5.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}</div>}
                              {qp.reportedBy && (
                                <div style={{ marginTop: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textAlign: 'center' }}>
                                    Reported By: <span style={{ color: '#1e293b', fontWeight: '800', fontSize: '13px' }}>{toSentenceCase(qp.reportedBy)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#1565c0', borderBottom: '2px solid #1565c0', paddingBottom: '6px' }}>Cooking History & Remarks</h4>
                  {(() => {
                    const cr = detailEntry.cookingReport;
                    const normalizeCookingStatus = (status?: string | null) => {
                      const normalized = String(status || '').trim().toUpperCase();
                      if (normalized === 'PASS' || normalized === 'OK') return 'Pass';
                      if (normalized === 'MEDIUM') return 'Medium';
                      if (normalized === 'FAIL') return 'Fail';
                      if (normalized === 'RECHECK') return 'Recheck';
                      if (normalized === 'PENDING') return 'Pending';
                      return normalized ? toTitleCase(normalized.toLowerCase()) : 'Pending';
                    };
                    const toTs = (value: any) => {
                      if (!value) return 0;
                      const ts = new Date(value).getTime();
                      return Number.isFinite(ts) ? ts : 0;
                    };
                    const historyRaw = Array.isArray(cr?.history) ? cr!.history : [];
                    const history = [...historyRaw].sort((a: any, b: any) => toTs(a?.date || a?.updatedAt || a?.createdAt || '') - toTs(b?.date || b?.updatedAt || b?.createdAt || ''));
                    const rows = (() => {
                      const result: any[] = [];
                      let pendingDone: any = null;

                      history.forEach((h: any) => {
                        const hasStatus = !!h?.status;
                        const doneByValue = String(h?.cookingDoneBy || '').trim();
                        const doneDateValue = h?.doneDate || h?.cookingDoneAt || h?.submittedAt || h?.date || null;

                        if (!hasStatus && doneByValue) {
                          pendingDone = {
                            doneBy: doneByValue,
                            doneDate: doneDateValue,
                            remarks: String(h?.remarks || '').trim()
                          };
                          return;
                        }

                        if (hasStatus) {
                          result.push({
                            status: normalizeCookingStatus(h.status),
                            doneBy: pendingDone?.doneBy || doneByValue || String(cr?.cookingDoneBy || '').trim(),
                            doneDate: pendingDone?.doneDate || doneDateValue,
                            approvedBy: String(h?.approvedBy || h?.cookingApprovedBy || cr?.cookingApprovedBy || '').trim(),
                            approvedDate: h?.approvedDate || h?.cookingApprovedAt || h?.date || null,
                            remarks: String(h?.remarks || '').trim()
                          });
                          pendingDone = null;
                        }
                      });

                      if (result.length === 0 && cr?.status) {
                        result.push({
                          status: normalizeCookingStatus(cr.status),
                          doneBy: String(cr.cookingDoneBy || '').trim(),
                          doneDate: (cr as any)?.doneDate || (cr as any)?.cookingDoneAt || (cr as any)?.date || cr.updatedAt || cr.createdAt || null,
                          approvedBy: String(cr.cookingApprovedBy || '').trim(),
                          approvedDate: (cr as any)?.approvedDate || (cr as any)?.cookingApprovedAt || (cr as any)?.date || cr.updatedAt || cr.createdAt || null,
                          remarks: String(cr.remarks || '').trim()
                        });
                      }

                      if (pendingDone) {
                        result.push({
                          status: 'Pending',
                          doneBy: pendingDone.doneBy,
                          doneDate: pendingDone.doneDate,
                          approvedBy: '',
                          approvedDate: null,
                          remarks: pendingDone.remarks
                        });
                      }

                      return result;
                    })();

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {rows.length > 0 ? (
                          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>Cooking Activity Log</div>
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                  <tr style={{ color: '#475569', borderBottom: '2px solid #f1f5f9' }}>
                                    <th style={{ textAlign: 'center', padding: '8px 4px', fontWeight: '800', width: '40px', border: '1px solid #e2e8f0' }}>No</th>
                                    <th style={{ textAlign: 'left', padding: '8px 4px', fontWeight: '800', border: '1px solid #e2e8f0' }}>Status</th>
                                    <th style={{ textAlign: 'left', padding: '8px 4px', fontWeight: '800', border: '1px solid #e2e8f0' }}>Done By</th>
                                    <th style={{ textAlign: 'left', padding: '8px 4px', fontWeight: '800', border: '1px solid #e2e8f0' }}>Approved By</th>
                                    <th style={{ textAlign: 'center', padding: '8px 4px', fontWeight: '800', width: '44px', border: '1px solid #e2e8f0' }}>Rem</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((h: any, idx: number) => {
                                    const statusString = String(h.status || 'Pending');
                                    const statusColor = statusString === 'Pass' ? '#166534' : statusString === 'Fail' ? '#991b1b' : statusString === 'Recheck' ? '#1565c0' : statusString === 'Medium' ? '#d97706' : '#475569';
                                    const statusBg = statusString === 'Pass' ? '#dcfce7' : statusString === 'Fail' ? '#fee2e2' : statusString === 'Recheck' ? '#e0f2fe' : statusString === 'Medium' ? '#ffedd5' : '#f1f5f9';
                                    return (
                                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                                        <td style={{ textAlign: 'center', padding: '8px 4px', fontWeight: '700', color: '#64748b', border: '1px solid #e2e8f0' }}>{idx + 1}.</td>
                                        <td style={{ padding: '8px 4px', border: '1px solid #e2e8f0' }}>
                                          <span style={{ background: statusBg, color: statusColor, padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '800' }}>
                                            {statusString}
                                          </span>
                                        </td>
                                        <td style={{ padding: '8px 4px', color: '#334155', border: '1px solid #e2e8f0' }}>
                                          <div style={{ fontWeight: '700', fontSize: '13px' }}>{h.doneBy ? getCollectorLabel(h.doneBy, supervisors) : '-'}</div>
                                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>{formatShortDateTime(h.doneDate) || '-'}</div>
                                        </td>
                                        <td style={{ padding: '8px 4px', color: '#334155', border: '1px solid #e2e8f0' }}>
                                          <div style={{ fontWeight: '700', fontSize: '13px' }}>{h.approvedBy ? getCollectorLabel(h.approvedBy, supervisors) : '-'}</div>
                                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>{formatShortDateTime(h.approvedDate) || '-'}</div>
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '8px 4px', border: '1px solid #e2e8f0' }}>
                                          {h.remarks ? (
                                            <button
                                              onClick={() => setRemarksPopup({ isOpen: true, text: h.remarks || '' })}
                                              style={{ border: '1px solid #90caf9', background: '#e3f2fd', color: '#1565c0', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                                              title="View Remarks"
                                            >
                                              🔍
                                            </button>
                                          ) : '-'}
                                        </td>
                                      </tr>
                                    );
                                  })}

                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div style={{ background: '#fff9f0', padding: '10px', borderRadius: '8px', border: '1px solid #ffe0b2', textAlign: 'center', fontSize: '12px', color: '#e65100' }}>
                            No cooking history recorded yet.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <button
                onClick={() => setDetailEntry(null)}
                style={{ marginTop: '16px', width: '100%', padding: '8px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {remarksPopup.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 3000,
            padding: '16px'
          }}
          onClick={() => setRemarksPopup({ isOpen: false, text: '' })}
        >
          <div
            style={{ background: '#fff', width: '100%', maxWidth: '420px', borderRadius: '10px', boxShadow: '0 16px 50px rgba(0,0,0,0.25)', padding: '16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#1f2937', marginBottom: '10px' }}>Remarks</div>
            <div style={{ fontSize: '13px', color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '60px' }}>
              {remarksPopup.text || '-'}
            </div>
            <button
              onClick={() => setRemarksPopup({ isOpen: false, text: '' })}
              style={{ marginTop: '12px', width: '100%', padding: '9px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* History Modal */}
      {
        historyModal.visible && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1100, padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white', borderRadius: '8px', width: '100%', maxWidth: '400px',
              border: '1px solid #999', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden'
            }}>
              <div style={{
                background: '#f8f9fa', padding: '12px 16px', borderBottom: '1px solid #e0e0e0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#333' }}>
                  {historyModal.title}
                </h3>
                <button
                  onClick={() => setHistoryModal({ visible: false, title: '', content: null })}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
                {historyModal.content}
              </div>
              <div style={{ padding: '12px 16px', background: '#f8f9fa', borderTop: '1px solid #e0e0e0', textAlign: 'right' }}>
                <button
                  onClick={() => setHistoryModal({ visible: false, title: '', content: null })}
                  style={{ padding: '6px 16px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '16px 0', marginTop: '12px' }}>
        <button
          disabled={page <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          style={{ padding: '6px 16px', borderRadius: '4px', border: '1px solid #ccc', background: page <= 1 ? '#eee' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontWeight: '600' }}
        >
          ← Prev
        </button>
        <span style={{ fontSize: '13px', color: '#666' }}>
          Page {page} of {totalPages} &nbsp;({total} total)
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          style={{ padding: '6px 16px', borderRadius: '4px', border: '1px solid #ccc', background: page >= totalPages ? '#eee' : '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontWeight: '600' }}
        >
          Next →
        </button>
      </div>
    </div >
  );
};

export default CookingReport;
