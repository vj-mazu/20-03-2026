import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { SampleEntryDetailModal } from '../components/SampleEntryDetailModal';

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
      alert(singleEventOverride.remarks);
      return;
    }
    setDetailEntry(entry);
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

      
      {detailEntry && (
        <SampleEntryDetailModal
          detailEntry={detailEntry as any}
          detailMode="history"
          onClose={() => setDetailEntry(null)}
        />
      )}

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
