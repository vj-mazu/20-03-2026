import React, { useState, useEffect, useMemo, useRef } from 'react';
import { sampleEntryApi } from '../utils/sampleEntryApi';
import type { SampleEntry, EntryType } from '../types/sampleEntry';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';
import { generateSampleEntryPDF } from '../utils/sampleEntryPdfGenerator';

import { API_URL } from '../config/api';

const SampleEntryPage: React.FC<{
  defaultTab?: 'MILL_SAMPLE' | 'LOCATION_SAMPLE' | 'SAMPLE_BOOK';
  filterEntryType?: string;
  excludeEntryType?: string;
  showGps?: boolean;
}> = ({ defaultTab, filterEntryType, excludeEntryType, showGps }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [showModal, setShowModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<SampleEntry | null>(null);
  const [selectedEntryType, setSelectedEntryType] = useState<EntryType>('CREATE_NEW');
  useEffect(() => {
    if (selectedEntryType === 'RICE_SAMPLE') {
      setFormData(prev => ({ ...prev, packaging: '26 kg' }));
    } else {
      setFormData(prev => ({ ...prev, packaging: '75' }));
    }
  }, [selectedEntryType]);
  const [entries, setEntries] = useState<SampleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasExistingQualityData, setHasExistingQualityData] = useState(false);
  const [qualityRecordExists, setQualityRecordExists] = useState(false);
  const [activeTab, setActiveTab] = useState<'MILL_SAMPLE' | 'LOCATION_SAMPLE' | 'SAMPLE_BOOK'>(defaultTab || 'MILL_SAMPLE');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showQualitySaveConfirm, setShowQualitySaveConfirm] = useState(false);
  const [pendingSubmitEvent, setPendingSubmitEvent] = useState<React.FormEvent | null>(null);
  const [editingEntry, setEditingEntry] = useState<SampleEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [smixEnabled, setSmixEnabled] = useState(false);
  const [lmixEnabled, setLmixEnabled] = useState(false);
  const [paddyWbEnabled, setPaddyWbEnabled] = useState(false);
  const [wbEnabled, setWbEnabled] = useState(false);
  const [dryMoistureEnabled, setDryMoistureEnabled] = useState(false);
  const [brokerSampleEnabled, setBrokerSampleEnabled] = useState(false);
  const [brokerSampleData, setBrokerSampleData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);
  const [qualityUsers, setQualityUsers] = useState<string[]>([]);
  const [photoOnlyEntry, setPhotoOnlyEntry] = useState<SampleEntry | null>(null);
  const [showPhotoOnlyModal, setShowPhotoOnlyModal] = useState(false);
  const submissionLocksRef = useRef<Set<string>>(new Set());
  const loadDropdownDataRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const loadEntriesRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Sample Collected By — radio state
  const [sampleCollectType, setSampleCollectType] = useState<'broker' | 'supervisor'>('broker');
  const [paddySupervisors, setPaddySupervisors] = useState<{ id: number; username: string; fullName?: string | null; staffType?: string | null }[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  // Title Case helper: first letter of each word
  const toTitleCase = (value?: string | null) => {
    const str = typeof value === 'string' ? value.trim() : '';
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
  };
  const getCollectorLabel = (value?: string | null) => {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return '-';
    if (raw.toLowerCase() === 'broker office sample') return 'Broker Office Sample';
    const match = paddySupervisors.find((sup) => String(sup.username || '').trim().toLowerCase() === raw.toLowerCase());
    if (match?.fullName) return toTitleCase(match.fullName);
    return toTitleCase(raw);
  };
  const getCreatorLabel = (entry: SampleEntry) => {
    const creator = (entry as any)?.creator;
    const raw = creator?.fullName || creator?.username || '';
    return raw ? toTitleCase(raw) : '-';
  };
  const getCollectedByDisplay = (entry: SampleEntry) => {
    const creatorLabel = getCreatorLabel(entry);
    const collectorLabel = getCollectorLabel(entry.sampleCollectedBy || null);
    const isGivenToOffice = Boolean((entry as any)?.sampleGivenToOffice);

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
  const collectedByHighlightColor = '#0f766e';
  const formatDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const formatShortDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  };
  const toNumberText = (val: number | string | null | undefined) => {
    const num = Number(val);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-IN');
  };
  const toSentenceCase = (value: string) => {
    const normalized = String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (!normalized) return '';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };
  const requiredMark = <span style={{ color: '#e53935' }}>*</span>;
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
  const getQualityAttemptsForEntry = (entry: any) => {
    const baseAttempts = Array.isArray(entry?.qualityAttemptDetails)
      ? [...entry.qualityAttemptDetails].filter(Boolean).sort((a: any, b: any) => (a.attemptNo || 0) - (b.attemptNo || 0))
      : [];
    const currentQuality = entry?.qualityParameters;

    if (!currentQuality) return baseAttempts;
    if (baseAttempts.length === 0) return hasQualitySnapshot(currentQuality) ? [currentQuality] : [];

    const latestStoredAttempt = baseAttempts[baseAttempts.length - 1];
    const latestStoredTs = getTimeValue(latestStoredAttempt?.updatedAt || latestStoredAttempt?.createdAt || null);
    const currentQualityTs = getTimeValue(currentQuality.updatedAt || currentQuality.createdAt || null);
    const lotSelectionTs = getTimeValue(entry?.lotSelectionAt || null);
    const isResampleFlow = String(entry?.lotSelectionDecision || '').toUpperCase() === 'FAIL' || baseAttempts.length > 1;
    const shouldAppendCurrentQuality =
      hasQualitySnapshot(currentQuality) &&
      isResampleFlow &&
      currentQualityTs > latestStoredTs &&
      (!lotSelectionTs || currentQualityTs >= lotSelectionTs);

    if (!shouldAppendCurrentQuality) return baseAttempts;

    return [
      ...baseAttempts,
      {
        ...currentQuality,
        attemptNo: Math.max(...baseAttempts.map((attempt: any) => Number(attempt.attemptNo) || 0), 1) + 1
      }
    ];
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
  const isRiceQualityEntry = filterEntryType === 'RICE_SAMPLE' || selectedEntry?.entryType === 'RICE_SAMPLE';
  const isStaffUser = ['staff', 'physical_supervisor', 'paddy_supervisor'].includes(String(user?.role || '').toLowerCase());
  const isMillStaffOnly = String(user?.role || '').toLowerCase() === 'staff' && String(user?.staffType || '').toLowerCase() === 'mill';
  const detailEditLocked = isStaffUser && (editingEntry as any)?.staffPartyNameEdits >= 1;
  const qualityEditLocked = isStaffUser && (editingEntry as any)?.staffBagsEdits >= 1;
  // Backward compatibility for existing field locks in Edit Modal
  const partyEditLocked = detailEditLocked;
  const bagsEditLocked = detailEditLocked;
  const riceReportedByOptions = useMemo(() => {
    return Array.from(
      new Set(
        qualityUsers
          .map((name) => (name || '').trim())
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right));
  }, [qualityUsers]);
  const locationSupervisors = useMemo(
    () => paddySupervisors.filter((supervisor) => String(supervisor.staffType || '').toLowerCase() === 'location'),
    [paddySupervisors]
  );
  const locationSupervisorSet = useMemo(
    () => new Set(locationSupervisors.map((sup) => String(sup.username || '').trim().toLowerCase()).filter(Boolean)),
    [locationSupervisors]
  );
  const collectedBySuggestions = useMemo(() => {
    const suggestionMap = new Map<string, string>();
    suggestionMap.set('Broker Office Sample', 'Broker Office Sample');
    paddySupervisors.forEach((sup) => {
      const fullName = String(sup.fullName || '').trim();
      const username = String(sup.username || '').trim();
      if (fullName) suggestionMap.set(fullName, username);
      if (username) suggestionMap.set(username, username);
    });
    return Array.from(suggestionMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }));
  }, [paddySupervisors]);
  const locationSuggestions = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((entry) => {
      const loc = toTitleCase(entry.location || '').trim();
      if (loc) set.add(loc);
    });
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [entries]);

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterBroker, setFilterBroker] = useState('');
  const [filterVariety, setFilterVariety] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCollectedBy, setFilterCollectedBy] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Server-side Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const PAGE_SIZE = 100;
  
  // Memoized grouped entries for performance
  const groupedEntries = useMemo(() => {
    const filtered = entries.filter((entry) => {
      if (filterEntryType === 'RICE_SAMPLE') {
        const qp = (entry as any).qualityParameters;
        const hasQuality = qp && qp.moisture != null && (
          (qp.cutting1 && Number(qp.cutting1) !== 0) ||
          (qp.bend1 && Number(qp.bend1) !== 0) ||
          hasAlphaOrPositiveValue(qp.mix) ||
          hasAlphaOrPositiveValue(qp.sk)
        );
        if (activeTab === 'MILL_SAMPLE') return !hasQuality;
        if (activeTab === 'SAMPLE_BOOK') return hasQuality;
      }
      return true;
    });

    const grouped: Record<string, Record<string, SampleEntry[]>> = {};
    filtered.forEach(entry => {
      const dateKey = new Date(entry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const brokerKey = entry.brokerName || 'Unknown';
      if (!grouped[dateKey]) grouped[dateKey] = {};
      if (!grouped[dateKey][brokerKey]) grouped[dateKey][brokerKey] = [];
      grouped[dateKey][brokerKey].push(entry);
    });
    return { grouped, totalCount: filtered.length };
  }, [entries, activeTab, filterEntryType]);

  const acquireSubmissionLock = (key: string) => {
    if (submissionLocksRef.current.has(key)) return false;
    submissionLocksRef.current.add(key);
    return true;
  };

  const releaseSubmissionLock = (key: string) => {
    submissionLocksRef.current.delete(key);
  };

  // Dropdown options
  const [brokers, setBrokers] = useState<string[]>([]);
  const [varieties, setVarieties] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    brokerName: '',
    variety: '',
    partyName: '',
    location: '',
    bags: '',
    lorryNumber: '',
    packaging: '75',
    sampleCollectedBy: '',
    sampleGivenToOffice: false,
    smellHas: false,
    smellType: '',
    gpsCoordinates: ''
  });
  const [godownImage, setGodownImage] = useState<File | null>(null);
  const [paddyLotImage, setPaddyLotImage] = useState<File | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);

  // Quality parameters form — cutting & bend use single-column format: e.g. "32×24"
  const [qualityData, setQualityData] = useState({
    moisture: '',
    cutting: '', // single column: "32×24"
    cutting1: '',
    cutting2: '',
    bend: '', // single column: "12×8"
    bend1: '',
    bend2: '',
    mixS: '',
    mixL: '',
    mix: '',
    kandu: '',
    oil: '',
    sk: '',
    grainsCount: '',
    wbR: '',
    wbBk: '',
    wbT: '',
    paddyWb: '',
    dryMoisture: '',
    smellHas: false,
    smellType: '',
    reportedBy: '',
    gramsReport: '10gms',
    uploadFile: null as File | null
  });

  const [detailEntry, setDetailEntry] = useState<SampleEntry | null>(null);
  const detailMode: 'quick' | 'full' = 'quick'; // Use quick/vertical mode as requested

  const getPartyLabel = (entry: SampleEntry) => {
    const partyNameText = toTitleCase(entry.partyName || '').trim();
    const lorryText = (entry as any).lorryNumber ? String((entry as any).lorryNumber).toUpperCase() : '';
    if (entry.entryType === 'DIRECT_LOADED_VEHICLE') return lorryText || partyNameText || '-';
    return partyNameText || lorryText || '-';
  };

  // Auto-insert × symbol for cutting/bend - 1 digit before × and 4 digits after ×
  const handleCuttingInput = (value: string) => {
    // For Rice entries, allow manual entry with 5-digit limit and NO auto-prefix
    if (filterEntryType === 'RICE_SAMPLE' || selectedEntry?.entryType === 'RICE_SAMPLE') {
      const cleaned = value.replace(/[^0-9.]/g, '');
      if (cleaned.length > 5) return;
      setQualityData(prev => ({ ...prev, cutting: cleaned, cutting1: cleaned }));
      return;
    }

    // Existing Paddy logic with 1× prefix
    let clean = value.replace(/[^0-9.×xX]/g, '').replace(/[xX]/g, '×');
    const xCount = (clean.match(/×/g) || []).length;
    if (xCount > 1) {
      const idx = clean.indexOf('×');
      clean = clean.substring(0, idx + 1) + clean.substring(idx + 1).replace(/×/g, '');
    }
    if (clean.length === 1 && !clean.includes('×') && /^\d$/.test(clean)) {
      clean = clean + '×';
    }
    const parts = clean.split('×');
    const first = (parts[0] || '').substring(0, 1);
    const second = (parts[1] || '').substring(0, 4);
    clean = second !== undefined && clean.includes('×') ? `${first}×${second}` : first;
    setQualityData(prev => ({ ...prev, cutting: clean, cutting1: first, cutting2: second }));
  };

  const handleBendInput = (value: string) => {
    // For Rice entries, allow manual entry with 5-digit limit and NO auto-prefix
    if (filterEntryType === 'RICE_SAMPLE' || selectedEntry?.entryType === 'RICE_SAMPLE') {
      const cleaned = value.replace(/[^0-9.]/g, '');
      if (cleaned.length > 5) return;
      setQualityData(prev => ({ ...prev, bend: cleaned, bend1: cleaned }));
      return;
    }

    // Existing Paddy logic with 1× prefix
    let clean = value.replace(/[^0-9.×xX]/g, '').replace(/[xX]/g, '×');
    const xCount = (clean.match(/×/g) || []).length;
    if (xCount > 1) {
      const idx = clean.indexOf('×');
      clean = clean.substring(0, idx + 1) + clean.substring(idx + 1).replace(/×/g, '');
    }
    if (clean.length === 1 && !clean.includes('×') && /^\d$/.test(clean)) {
      clean = clean + '×';
    }
    const parts = clean.split('×');
    const first = (parts[0] || '').substring(0, 1);
    const second = (parts[1] || '').substring(0, 4);
    clean = second !== undefined && clean.includes('×') ? `${first}×${second}` : first;
    setQualityData(prev => ({ ...prev, bend: clean, bend1: first, bend2: second }));
  };

  // Helper: restrict quality param value - 5 digits total for most, 3 digits for grains
  // Allow one optional alphabet character for specific fields (mixS, mixL, mix, oil, kandu, sk)
  const handleQualityInput = (field: string, value: string) => {
    const alphaFields = ['mixS', 'mixL', 'mix', 'oil', 'kandu', 'sk'];
    let cleaned = '';

    if (alphaFields.includes(field)) {
      cleaned = value.replace(/[^0-9.a-zA-Z]/g, '');
      const alphaMatch = cleaned.match(/[a-zA-Z]/g);
      if (alphaMatch && alphaMatch.length > 1) {
        let firstAlphaFound = false;
        cleaned = Array.from(cleaned).filter(char => {
          if (/[a-zA-Z]/.test(char)) {
            if (!firstAlphaFound) {
              firstAlphaFound = true;
              return true;
            }
            return false;
          }
          return true;
        }).join('');
      }
    } else {
      cleaned = value.replace(/[^0-9.]/g, '');
    }

    const threeDigitFields = ['grainsCount'];
    if (threeDigitFields.includes(field)) {
      if (cleaned.length > 3) return;
    } else {
      // Limit to 5 digits for moisture and other fields
      if (cleaned.length > 5) return;
    }
    setQualityData(prev => ({ ...prev, [field]: cleaned }));
  };
  const hasAlphaOrPositiveValue = (val: any) => {
    if (val === null || val === undefined || val === '') return false;
    const raw = String(val).trim();
    if (!raw) return false;
    if (/[a-zA-Z]/.test(raw)) return true;
    const num = parseFloat(raw);
    return Number.isFinite(num);
  };
  const validateEntryForm = (entryType: EntryType, data: typeof formData) => {
    const isEmpty = (value: string) => !String(value || '').trim();
    if (isEmpty(data.entryDate)) return 'Entry Date is required';
    if (isEmpty(data.brokerName)) return 'Broker Name is required';
    if (isEmpty(data.variety)) return 'Variety is required';
    if (entryType !== 'DIRECT_LOADED_VEHICLE' && isEmpty(data.partyName)) return 'Party Name is required';
    if (isEmpty(data.location)) return 'Location is required';
    if (isEmpty(data.bags)) return 'Bags is required';
    if (isEmpty(data.packaging)) return 'Packaging is required';
    if (isEmpty(data.sampleCollectedBy)) return 'Sample Collected By is required';
    if (entryType === 'DIRECT_LOADED_VEHICLE' && isEmpty(data.lorryNumber)) return 'Lorry Number is required';
    if (entryType === 'LOCATION_SAMPLE' && isEmpty(data.gpsCoordinates)) return 'GPS coordinates are required';
    if (data.smellHas && isEmpty(data.smellType)) return 'Smell type is required';
    return '';
  };

  useEffect(() => {
    const wbR = wbEnabled ? (parseFloat(qualityData.wbR) || 0) : 0;
    const wbBk = wbEnabled ? (parseFloat(qualityData.wbBk) || 0) : 0;
    const wbT = (wbR + wbBk).toString(); // Removed toFixed(2)
    if (qualityData.wbT !== wbT) {
      setQualityData(prev => ({ ...prev, wbT }));
    }
  }, [qualityData.wbR, qualityData.wbBk, wbEnabled]);

  useEffect(() => {
    loadEntries();
    loadDropdownData();
  }, [page]);

  useEffect(() => {
    if (showModal || showEditModal) {
      loadDropdownData();
    }
  }, [showModal, showEditModal]);

  useEffect(() => {
    if (page === 1) {
      loadEntries();
    } else {
      setPage(1);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isMillStaffOnly && activeTab === 'LOCATION_SAMPLE') {
      setActiveTab('MILL_SAMPLE');
    }
  }, [isMillStaffOnly, activeTab]);

  const handleClearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterBroker('');
    setFilterVariety('');
    setFilterType('');
    setFilterLocation('');
    setFilterCollectedBy('');
    if (page === 1) {
      loadEntries(1, '', '', '', '', '', '', '');
    } else {
      setPage(1);
      loadEntries(1, '', '', '', '', '', '', '');
    }
  };
  const applyQuickDateFilter = (preset: 'today' | 'yesterday' | 'last7') => {
    const startDate = new Date();
    const endDate = new Date();

    if (preset === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1);
      endDate.setDate(endDate.getDate() - 1);
    } else if (preset === 'last7') {
      startDate.setDate(startDate.getDate() - 6);
    }

    const startValue = formatDateInputValue(startDate);
    const endValue = formatDateInputValue(endDate);
    setFilterDateFrom(startValue);
    setFilterDateTo(endValue);

    if (page === 1) {
      loadEntries(1, startValue, endValue);
    } else {
      setPage(1);
      loadEntries(1, startValue, endValue);
    }
  };

  const loadEntries = async (targetPage?: number, fFrom?: string, fTo?: string, fBroker?: string, fVariety?: string, fLocation?: string, fCollectedBy?: string, fType?: string, targetStatus?: string) => {
    try {
      setLoading(true);
      const p = targetPage !== undefined ? targetPage : page;
      const params: any = { page: p, pageSize: PAGE_SIZE };
      
      if (!filterEntryType && !excludeEntryType) {
        params.excludeEntryType = 'RICE_SAMPLE';
      }
      const dFrom = fFrom !== undefined ? fFrom : filterDateFrom;
      const dTo = fTo !== undefined ? fTo : filterDateTo;
      const b = fBroker !== undefined ? fBroker : filterBroker;
      const v = fVariety !== undefined ? fVariety : filterVariety;
      const l = fLocation !== undefined ? fLocation : filterLocation;
      const cb = fCollectedBy !== undefined ? fCollectedBy : filterCollectedBy;
      const normalizeCollectedBy = (value: string) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (raw.toLowerCase() === 'broker office sample') return 'Broker Office Sample';
        const match = paddySupervisors.find((sup) => {
          const username = String(sup.username || '').trim().toLowerCase();
          const fullName = String(sup.fullName || '').trim().toLowerCase();
          return raw.toLowerCase() === username || (fullName && raw.toLowerCase() === fullName);
        });
        return match?.username || raw;
      };
      const t = fType !== undefined ? fType : filterType;
      const s = targetStatus !== undefined ? targetStatus : activeTab;

      if (dFrom) params.startDate = dFrom;
      if (dTo) params.endDate = dTo;
      if (b) params.broker = b;
      if (v) params.variety = v;
      if (l) params.location = l;
      if (cb) params.collectedBy = normalizeCollectedBy(cb);
      if (t) params.sampleType = t;
      if (s) params.status = s;
      if (filterEntryType) params.entryType = filterEntryType;
      if (excludeEntryType) params.excludeEntryType = excludeEntryType;

      // Privacy: Pass user identity for role-based filtering
      if (user?.username) params.staffUsername = user.username;
      if (user?.staffType) params.staffType = user.staffType;
      // If staffType is missing but role is physical_supervisor, default to 'location'
      if (!user?.staffType && user?.role === 'physical_supervisor') params.staffType = 'location';

      const response = await axios.get(`${API_URL}/sample-entries/by-role`, { params });
      const data = response.data as any;
      setEntries(data.entries);
      if (data.total != null) {
        setTotalEntries(data.total);
        setTotalPages(data.totalPages || Math.ceil(data.total / PAGE_SIZE));
      }
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to load entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntriesRef.current = () => loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    loadDropdownDataRef.current = loadDropdownData;
  }, [loadDropdownData]);

  useEffect(() => {
    const handleLocationsUpdated = () => {
      loadDropdownDataRef.current();
      loadEntriesRef.current();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'locationsUpdatedAt') {
        loadDropdownDataRef.current();
        loadEntriesRef.current();
      }
    };
    window.addEventListener('locations:updated', handleLocationsUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('locations:updated', handleLocationsUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleApplyFilters = () => {
    if (page === 1) {
      loadEntries(1);
    } else {
      setPage(1);
    }
  };

  async function loadDropdownData() {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch varieties from locations API
      const varietiesResponse = await axios.get<{ varieties: Array<{ name: string }> }>(`${API_URL}/locations/varieties`, {
        headers,
        params: { t: Date.now() }
      });
      const varietyNames = Array.from(new Set(varietiesResponse.data.varieties.map((v) => toTitleCase(v.name))));
      setVarieties(varietyNames);

      // Fetch brokers from locations API (new broker endpoint)
      const brokersResponse = await axios.get<{ brokers: Array<{ name: string }> }>(`${API_URL}/locations/brokers`, {
        headers,
        params: { t: Date.now() }
      });
      const brokerNames = Array.from(new Set(brokersResponse.data.brokers.map((b) => toTitleCase(b.name))));
      setBrokers(brokerNames);

      // Fetch quality users (users who have qualityName set)
      try {
        const usersResponse = await axios.get<{ success: boolean, users: Array<{ qualityName: string | null, role?: string, isActive?: boolean }> }>(`${API_URL}/admin/users`, { headers });
        if (usersResponse.data.success) {
          const qNames = usersResponse.data.users
            .filter((u: any) => u.isActive !== false && u.qualityName && u.qualityName.trim() !== '' && u.role === 'staff' && u.username?.toLowerCase() !== 'admin' && u.qualityName.toLowerCase() !== 'admin')
            .map((u: any) => u.qualityName.trim())
            .sort((a: string, b: string) => a.localeCompare(b));
          setQualityUsers(Array.from(new Set(qNames)));
        }
      } catch (qErr) {
        console.log('Could not fetch quality users for dropdown');
      }

      // Fetch paddy supervisors (mill staff) for Sample Collected By dropdown
      try {
        const supervisorRes = await axios.get<{ success: boolean, users: Array<{ id: number, username: string, fullName?: string | null, staffType?: string | null }> }>(`${API_URL}/sample-entries/paddy-supervisors`, { headers });
        if (supervisorRes.data.success) {
          setPaddySupervisors(supervisorRes.data.users);
        }
      } catch (psErr) {
        console.log('Could not fetch paddy supervisors for dropdown');
      }
    } catch (error: any) {
      console.error('Failed to load dropdown data:', error);
    }
  }

  // GPS Capture logic
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      showNotification('Geolocation is not supported by your browser', 'error');
      return;
    }

    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = `${latitude},${longitude}`;
        setFormData(prev => ({ ...prev, gpsCoordinates: coords }));
        setIsCapturingGps(false);
        showNotification('GPS coordinates captured successfully', 'success');
      },
      (error) => {
        console.error('GPS error:', error);
        setIsCapturingGps(false);
        showNotification('Failed to capture GPS location. Please ensure location permissions are enabled.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Show save confirmation before actually saving
  const handleSubmitWithConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const validationError = validateEntryForm(selectedEntryType, formData);
    if (validationError) {
      showNotification(validationError, 'error');
      return;
    }
    setPendingSubmitEvent(e);
    setShowSaveConfirm(true);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const lockKey = 'entry-create';
    if (!acquireSubmissionLock(lockKey)) return;

    try {
      if (!user || !user.id) {
        showNotification('User not authenticated', 'error');
        return;
      }
      setIsSubmitting(true);

      // Close confirmation dialog
      setShowSaveConfirm(false);

      const formDataToSend = new FormData();
      formDataToSend.append('entryDate', formData.entryDate);
      formDataToSend.append('brokerName', toTitleCase(formData.brokerName));
      formDataToSend.append('variety', toTitleCase(formData.variety));
      formDataToSend.append('partyName', toTitleCase(formData.partyName));
      formDataToSend.append('location', toTitleCase(formData.location));
      formDataToSend.append('bags', formData.bags);
      if (formData.lorryNumber) formDataToSend.append('lorryNumber', formData.lorryNumber.toUpperCase());
      formDataToSend.append('entryType', selectedEntryType);
      formDataToSend.append('packaging', formData.packaging);
      if (formData.sampleCollectedBy) formDataToSend.append('sampleCollectedBy', toTitleCase(formData.sampleCollectedBy));
      formDataToSend.append('sampleGivenToOffice', String(formData.sampleGivenToOffice));
      
      // New fields
      formDataToSend.append('smellHas', String(formData.smellHas));
      formDataToSend.append('smellType', formData.smellType);
      formDataToSend.append('gpsCoordinates', formData.gpsCoordinates);
      if (selectedEntryType === 'LOCATION_SAMPLE') {
        if (godownImage) formDataToSend.append('godownImage', godownImage);
        if (paddyLotImage) formDataToSend.append('paddyLotImage', paddyLotImage);
      }

      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/sample-entries`, formDataToSend, {
        headers: { 
          Authorization: `Bearer ${token}`
        }
      });

      // Close modal after successful save
      setShowModal(false);
      showNotification('Sample entry created successfully', 'success');
      setActiveTab(selectedEntryType === 'LOCATION_SAMPLE' ? 'LOCATION_SAMPLE' : 'MILL_SAMPLE');
      setSampleCollectType('broker');
      setFormData({
        entryDate: new Date().toISOString().split('T')[0],
        brokerName: '',
        variety: '',
        partyName: '',
        location: '',
        bags: '',
        lorryNumber: '',
        packaging: selectedEntryType === 'RICE_SAMPLE' ? '26 kg' : '75',
        sampleCollectedBy: 'Broker Office Sample',
        sampleGivenToOffice: false,
        smellHas: false,
        smellType: '',
        gpsCoordinates: ''
      });
      setGodownImage(null);
      setPaddyLotImage(null);
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to create entry', 'error');
    } finally {
      setIsSubmitting(false);
      releaseSubmissionLock(lockKey);
    }
  };

  // Open edit modal for a staff entry
  const handleEditEntry = (entry: SampleEntry) => {
    loadDropdownData();
    setEditingEntry(entry);
    // Get bags value - handle both number and string types
    const bagsValue = typeof entry.bags === 'number' ? entry.bags.toString() : (entry.bags || '');

    // Determine sampleCollectType for edit form
    const isBroker = (entry as any).sampleCollectedBy === 'Broker Office Sample';
    setSampleCollectType(isBroker ? 'broker' : 'supervisor');

    setFormData({
      entryDate: entry.entryDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      brokerName: toTitleCase(entry.brokerName || ''),
      variety: toTitleCase(entry.variety || ''),
      partyName: entry.partyName || '',
      location: entry.location || '',
      bags: bagsValue,
      lorryNumber: entry.lorryNumber || '',
      packaging: (entry as any).packaging || '75',
      sampleCollectedBy: (entry as any).sampleCollectedBy || '',
      sampleGivenToOffice: (entry as any).sampleGivenToOffice || false,
      smellHas: (entry as any).smellHas || false,
      smellType: (entry as any).smellType || '',
      gpsCoordinates: (entry as any).gpsCoordinates || ''
    });
    setSelectedEntryType(entry.entryType);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry || isSubmitting) return;
    const lockKey = `entry-edit-${editingEntry.id}`;
    if (!acquireSubmissionLock(lockKey)) return;
    try {
      const validationError = validateEntryForm(editingEntry.entryType, formData);
      if (validationError) {
        showNotification(validationError, 'error');
        releaseSubmissionLock(lockKey);
        return;
      }
      setIsSubmitting(true);
      const formDataToSend = new FormData();
      formDataToSend.append('entryDate', formData.entryDate);
      formDataToSend.append('brokerName', toTitleCase(formData.brokerName));
      formDataToSend.append('variety', toTitleCase(formData.variety));
      formDataToSend.append('partyName', toTitleCase(formData.partyName));
      formDataToSend.append('location', toTitleCase(formData.location));
      formDataToSend.append('bags', formData.bags);
      if (formData.lorryNumber) formDataToSend.append('lorryNumber', formData.lorryNumber.toUpperCase());
      formDataToSend.append('packaging', formData.packaging);
      if (formData.sampleCollectedBy) formDataToSend.append('sampleCollectedBy', toTitleCase(formData.sampleCollectedBy));
      formDataToSend.append('sampleGivenToOffice', String(formData.sampleGivenToOffice));
      
      // New fields
      formDataToSend.append('smellHas', String(formData.smellHas));
      formDataToSend.append('smellType', formData.smellType);
      formDataToSend.append('gpsCoordinates', formData.gpsCoordinates);
      if (godownImage) formDataToSend.append('godownImage', godownImage);
      if (paddyLotImage) formDataToSend.append('paddyLotImage', paddyLotImage);

      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/sample-entries/${editingEntry.id}`, formDataToSend, {
        headers: { 
          Authorization: `Bearer ${token}`
        }
      });
      showNotification('Entry updated successfully', 'success');
      setShowEditModal(false);
      setEditingEntry(null);
      setGodownImage(null);
      setPaddyLotImage(null);
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to update entry', 'error');
    } finally {
      setIsSubmitting(false);
      releaseSubmissionLock(lockKey);
    }
  };

  const handlePhotoOnlyUpload = async () => {
    if (!photoOnlyEntry || isSubmitting) return;
    const lockKey = `photo-upload-${photoOnlyEntry.id}`;
    if (!acquireSubmissionLock(lockKey)) return;
    try {
      setIsSubmitting(true);
      const formDataToSend = new FormData();
      if (godownImage) formDataToSend.append('godownImage', godownImage);
      if (paddyLotImage) formDataToSend.append('paddyLotImage', paddyLotImage);
      if (!godownImage && !paddyLotImage) {
        showNotification('Please select at least one image', 'error');
        return;
      }
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/sample-entries/${photoOnlyEntry.id}`, formDataToSend, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification('Photos uploaded successfully', 'success');
      setShowPhotoOnlyModal(false);
      setPhotoOnlyEntry(null);
      setGodownImage(null);
      setPaddyLotImage(null);
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to upload photos', 'error');
    } finally {
      setIsSubmitting(false);
      releaseSubmissionLock(lockKey);
    }
  };

  const brokerOptions = useMemo(() => {
    const list = [...brokers];
    const current = (formData.brokerName || '').trim();
    if (current && !list.some((b) => b.toLowerCase() === current.toLowerCase())) {
      list.push(current);
    }
    return list;
  }, [brokers, formData.brokerName]);

  const varietyOptions = useMemo(() => {
    const list = [...varieties];
    const current = (formData.variety || '').trim();
    if (current && !list.some((v) => v.toLowerCase() === current.toLowerCase())) {
      list.push(current);
    }
    return list;
  }, [varieties, formData.variety]);



  // Title case handler
  const handleInputChange = (field: string, value: string) => {
    if (field === 'location' || field === 'partyName') {
      setFormData(prev => ({ ...prev, [field]: value }));
      return;
    }
    setFormData(prev => ({ ...prev, [field]: toTitleCase(value) }));
  };

  const resetQualityForm = () => {
    setQualityData({
      moisture: '',
      cutting: '',
      cutting1: '',
      cutting2: '',
      bend: '',
      bend1: '',
      bend2: '',
      mixS: '',
      mixL: '',
      mix: '',
      kandu: '',
      oil: '',
      sk: '',
      grainsCount: '',
      wbR: '',
      wbBk: '',
      wbT: '',
      paddyWb: '',
      dryMoisture: '',
      smellHas: false,
      smellType: '',
      reportedBy: '',
      gramsReport: '10gms',
      uploadFile: null
    });
    setHasExistingQualityData(false);
    setSmixEnabled(false);
    setLmixEnabled(false);
    setPaddyWbEnabled(false);
    setWbEnabled(false);
    setDryMoistureEnabled(false);
  };

  const handleViewEntry = async (entry: SampleEntry) => {
    setSelectedEntry(entry);
    setShowQualityModal(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<any>(
        `${API_URL}/sample-entries/${entry.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.qualityParameters) {
        setQualityRecordExists(true);
        const qp = response.data.qualityParameters;
        
        // If quality recheck is pending, always open a fresh form
        const isQualityRecheckPending = response.data.recheckRequested === true && response.data.recheckType !== 'cooking';
        if (isQualityRecheckPending) {
          setQualityRecordExists(true); // Record exists but it's reset
          resetQualityForm();
          return;
        }

        // Resample: if the latest quality is BEFORE the resample start, open a fresh form
        const isResampleFlow = entry.lotSelectionDecision === 'FAIL'
          && entry.workflowStatus !== 'FAILED'
          && entry.entryType !== 'RICE_SAMPLE';
        const lotSelectionAt = entry.lotSelectionAt ? getTimeValue(entry.lotSelectionAt) : 0;
        const qualityUpdatedAt = getTimeValue(qp.updatedAt || qp.createdAt);
        if (isResampleFlow && lotSelectionAt > 0 && qualityUpdatedAt > 0 && qualityUpdatedAt < lotSelectionAt) {
          setQualityRecordExists(true); // Keep history, but reset input form
          resetQualityForm();
          return;
        }

        const zeroToEmpty = (v: any) => {
          if (v === null || v === undefined) return '';
          const raw = String(v).trim();
          if (!raw) return '';
          return raw;
        };
        const rawOrEmpty = (rawVal: any, value: any) => {
          const raw = rawVal != null ? String(rawVal).trim() : '';
          if (raw !== '') return raw;
          return zeroToEmpty(value);
        };
        const c1 = rawOrEmpty(qp.cutting1Raw, qp.cutting1);
        const c2 = rawOrEmpty(qp.cutting2Raw, qp.cutting2);
        const b1 = rawOrEmpty(qp.bend1Raw, qp.bend1);
        const b2 = rawOrEmpty(qp.bend2Raw, qp.bend2);
        setQualityData({
          moisture: rawOrEmpty(qp.moistureRaw, qp.moisture),
          cutting: c1 && c2 ? `${c1}×${c2}` : c1 || '',
          cutting1: c1,
          cutting2: c2,
          bend: b1 && b2 ? `${b1}×${b2}` : b1 || '',
          bend1: b1,
          bend2: b2,
          mixS: rawOrEmpty(qp.mixSRaw, qp.mixS),
          mixL: rawOrEmpty(qp.mixLRaw, qp.mixL),
          mix: rawOrEmpty(qp.mixRaw, qp.mix),
          kandu: rawOrEmpty(qp.kanduRaw, qp.kandu),
          oil: rawOrEmpty(qp.oilRaw, qp.oil),
          sk: rawOrEmpty(qp.skRaw, qp.sk),
          grainsCount: rawOrEmpty(qp.grainsCountRaw, qp.grainsCount),
          wbR: rawOrEmpty(qp.wbRRaw, qp.wbR),
          wbBk: rawOrEmpty(qp.wbBkRaw, qp.wbBk),
          wbT: rawOrEmpty(qp.wbTRaw, qp.wbT),
          paddyWb: rawOrEmpty(qp.paddyWbRaw, qp.paddyWb),
          dryMoisture: rawOrEmpty(qp.dryMoistureRaw, qp.dryMoisture),
          smellHas: (qp as any).smellHas ?? (entry as any).smellHas ?? false,
          smellType: (qp as any).smellType ?? (entry as any).smellType ?? '',
          reportedBy: qp.reportedBy || '',
          gramsReport: qp.gramsReport || '10gms',
          uploadFile: null
        });
        setHasExistingQualityData(true);
          const hasProvided = (rawVal: any, valueVal: any) => {
            const raw = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
            if (raw !== '') return true;
            if (valueVal === null || valueVal === undefined || valueVal === '') return false;
            const num = parseFloat(valueVal);
            return Number.isFinite(num) && num !== 0;
          };
          if (hasProvided(qp.mixSRaw, qp.mixS)) setSmixEnabled(true);
          if (hasProvided(qp.mixLRaw, qp.mixL)) setLmixEnabled(true);
        if (hasProvided(qp.paddyWbRaw, qp.paddyWb)) setPaddyWbEnabled(true);
        if (hasProvided(qp.wbRRaw, qp.wbR) || hasProvided(qp.wbBkRaw, qp.wbBk)) setWbEnabled(true);
        if (hasProvided(qp.dryMoistureRaw, qp.dryMoisture)) setDryMoistureEnabled(true);
      } else {
        setQualityRecordExists(false);
        resetQualityForm();
      }
    } catch (error) {
      console.error('Error fetching quality parameters:', error);
      setQualityRecordExists(false);
      resetQualityForm();
    }
  };

  const handleSubmitQualityParametersWithConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const isMissing = (val: any) => String(val ?? '').trim() === '';
    const isProvided = (val: any) => !isMissing(val);
    if (isMissing(qualityData.moisture)) { showNotification('Moisture is required', 'error'); return; }

    const reportedByValue = qualityData.reportedBy || '';
    if (!reportedByValue || reportedByValue.trim() === '') { showNotification('Sample Reported By is required', 'error'); return; }
    if (qualityData.smellHas && isMissing(qualityData.smellType)) { showNotification('Smell type is required', 'error'); return; }

    if (selectedEntry?.entryType === 'RICE_SAMPLE') {
      // All fields mandatory for Rice except toggles
      if (isMissing(qualityData.grainsCount)) { showNotification('Grains Count is required', 'error'); return; }
      if (isMissing(qualityData.mix)) { showNotification('Broken is required', 'error'); return; }
      if (isMissing(qualityData.cutting1)) { showNotification('Rice is required', 'error'); return; }
      if (isMissing(qualityData.bend1)) { showNotification('Bend is required', 'error'); return; }
      if (isMissing(qualityData.sk)) { showNotification('Mix is required', 'error'); return; }
      if (isMissing(qualityData.kandu)) { showNotification('Kandu is required', 'error'); return; }
      if (isMissing(qualityData.oil)) { showNotification('Oil is required', 'error'); return; }
      if (isMissing(qualityData.gramsReport)) { showNotification('Grams Report is required', 'error'); return; }
    } else {
      // 100g save = moisture + grainsCount only for Paddy
      if (isMissing(qualityData.grainsCount)) { showNotification('Grains Count is required', 'error'); return; }
      const has100g = isProvided(qualityData.moisture) && isProvided(qualityData.grainsCount);
      const qualityFields = (
        isProvided(qualityData.cutting1) || isProvided(qualityData.cutting2)
        || isProvided(qualityData.bend1) || isProvided(qualityData.bend2)
        || isProvided(qualityData.mix) || isProvided(qualityData.mixS) || isProvided(qualityData.mixL)
        || isProvided(qualityData.kandu) || isProvided(qualityData.oil) || isProvided(qualityData.sk)
      );
      const allQualityFilled = (
        isProvided(qualityData.cutting1) && isProvided(qualityData.cutting2)
        && isProvided(qualityData.bend1) && isProvided(qualityData.bend2)
        && isProvided(qualityData.mix) && isProvided(qualityData.kandu)
        && isProvided(qualityData.oil) && isProvided(qualityData.sk)
        && isProvided(qualityData.grainsCount)
      );
      if (qualityFields && !allQualityFilled) {
        if (isMissing(qualityData.cutting1)) { showNotification('Cutting is required', 'error'); return; }
        if (isMissing(qualityData.bend1)) { showNotification('Bend is required', 'error'); return; }
        if (isMissing(qualityData.mix)) { showNotification('Mix is required', 'error'); return; }
        if (isMissing(qualityData.kandu)) { showNotification('Kandu is required', 'error'); return; }
        if (isMissing(qualityData.oil)) { showNotification('Oil is required', 'error'); return; }
        if (isMissing(qualityData.sk)) { showNotification('SK is required', 'error'); return; }
        if (isMissing(qualityData.grainsCount)) { showNotification('Grains Count is required', 'error'); return; }
      }
    }
    setShowQualitySaveConfirm(true);
  };

  const handleSubmitQualityParameters = async () => {
    if (!selectedEntry || isSubmitting) return;
    const lockKey = `quality-save-${selectedEntry.id}`;
    if (!acquireSubmissionLock(lockKey)) return;

    setShowQualitySaveConfirm(false);

    // 100g = ONLY moisture (and optionally dry moisture) entered, no other quality fields
    // Quality Complete = moisture + all other required fields filled
    const isProvided = (val: any) => String(val ?? '').trim() !== '';
    const allQualityFieldsFilled = (
      isProvided(qualityData.moisture)
      && isProvided(qualityData.cutting1) && isProvided(qualityData.cutting2)
      && isProvided(qualityData.bend1) && isProvided(qualityData.bend2)
      && isProvided(qualityData.mix) && isProvided(qualityData.kandu)
      && isProvided(qualityData.oil) && isProvided(qualityData.sk)
      && isProvided(qualityData.grainsCount)
    );
    const has100gOnly = (isProvided(qualityData.moisture) && isProvided(qualityData.grainsCount))
      && !(isProvided(qualityData.cutting1) || isProvided(qualityData.cutting2)
        || isProvided(qualityData.bend1) || isProvided(qualityData.bend2)
        || isProvided(qualityData.mix) || isProvided(qualityData.mixS) || isProvided(qualityData.mixL)
        || isProvided(qualityData.kandu) || isProvided(qualityData.oil) || isProvided(qualityData.sk));
    const is100GramsSave = selectedEntry.entryType === 'RICE_SAMPLE' ? false : has100gOnly;

    try {
      setIsSubmitting(true);
      const formDataToSend = new FormData();
      const toFormValue = (value: string) => {
        if (value === undefined || value === null) return '';
        return String(value).trim() === '' ? '' : String(value);
      };
      formDataToSend.append('moisture', toFormValue(qualityData.moisture));
      formDataToSend.append('cutting1', toFormValue(qualityData.cutting1));
      formDataToSend.append('cutting2', toFormValue(qualityData.cutting2));
      formDataToSend.append('bend1', toFormValue(qualityData.bend1));
      formDataToSend.append('bend2', toFormValue(qualityData.bend2));
      if (selectedEntry.entryType === 'RICE_SAMPLE' && qualityData.gramsReport) {
        formDataToSend.append('gramsReport', qualityData.gramsReport);
      }
      formDataToSend.append('mixS', smixEnabled ? toFormValue(qualityData.mixS) : '');
      formDataToSend.append('mixL', lmixEnabled ? toFormValue(qualityData.mixL) : '');
      formDataToSend.append('mix', toFormValue(qualityData.mix));
      formDataToSend.append('kandu', toFormValue(qualityData.kandu));
      formDataToSend.append('oil', toFormValue(qualityData.oil));
      formDataToSend.append('sk', toFormValue(qualityData.sk));
      formDataToSend.append('grainsCount', toFormValue(qualityData.grainsCount));
      formDataToSend.append('wbR', wbEnabled ? toFormValue(qualityData.wbR) : '');
      formDataToSend.append('wbBk', wbEnabled ? toFormValue(qualityData.wbBk) : '');
      formDataToSend.append('wbT', toFormValue(qualityData.wbT));
      formDataToSend.append('paddyWb', paddyWbEnabled ? toFormValue(qualityData.paddyWb) : '');
      formDataToSend.append('dryMoisture', dryMoistureEnabled ? toFormValue(qualityData.dryMoisture) : '');
      formDataToSend.append('smellHas', String(qualityData.smellHas));
      formDataToSend.append('smellType', qualityData.smellHas ? String(qualityData.smellType || '') : '');
      formDataToSend.append('smixEnabled', smixEnabled ? 'true' : 'false');
      formDataToSend.append('lmixEnabled', lmixEnabled ? 'true' : 'false');
      formDataToSend.append('wbEnabled', wbEnabled ? 'true' : 'false');
      formDataToSend.append('paddyWbEnabled', paddyWbEnabled ? 'true' : 'false');
      formDataToSend.append('dryMoistureEnabled', dryMoistureEnabled ? 'true' : 'false');
      const reportedByValue = qualityData.reportedBy || '';
      if (!reportedByValue) {
        showNotification('Sample Reported By is required', 'error');
        setIsSubmitting(false);
        releaseSubmissionLock(lockKey);
        return;
      }
      formDataToSend.append('reportedBy', reportedByValue);
      if (is100GramsSave) {
        formDataToSend.append('is100Grams', 'true');
      }

      if (qualityData.uploadFile) {
        formDataToSend.append('photo', qualityData.uploadFile);
      }

      const method = qualityRecordExists ? 'put' : 'post';
      await axios[method](
        `${API_URL}/sample-entries/${selectedEntry.id}/quality-parameters`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      showNotification(
        is100GramsSave ? '100 Grams Completed' : 'Quality parameters saved successfully',
        'success'
      );
      setShowQualityModal(false);
      setSelectedEntry(null);
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to save quality parameters', 'error');
    } finally {
      setIsSubmitting(false);
      releaseSubmissionLock(lockKey);
    }
  };

  const isPaddyResampleModal = !!selectedEntry
    && selectedEntry.entryType !== 'RICE_SAMPLE'
    && (selectedEntry.workflowStatus === 'QUALITY_CHECK' || selectedEntry.workflowStatus === 'LOT_ALLOTMENT')
    && selectedEntry.lotSelectionDecision === 'FAIL';
  const showQualityAsUpdate = hasExistingQualityData && !isPaddyResampleModal;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '15px',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', background: filterEntryType === 'RICE_SAMPLE' ? 'linear-gradient(135deg, #2e7d32, #43a047)' : 'linear-gradient(135deg, #2e7d32, #43a047)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '1px' }}>
          {filterEntryType === 'RICE_SAMPLE' ? '🍚 NEW RICE SAMPLE' : '🌾 NEW PADDY SAMPLE'}
        </h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {filterEntryType === 'RICE_SAMPLE' ? (
            <button
              onClick={() => {
                loadDropdownData();
                setSelectedEntryType('RICE_SAMPLE');
                setSampleCollectType('broker');
                setFormData({ entryDate: new Date().toISOString().split('T')[0], brokerName: '', variety: '', partyName: '', location: '', bags: '', lorryNumber: '', packaging: '26 kg', sampleCollectedBy: 'Broker Office Sample', sampleGivenToOffice: false, smellHas: false, smellType: '', gpsCoordinates: '' });
                setEditingEntry(null);
                setShowModal(true);
              }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                backgroundColor: '#2e7d32',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(46,125,50,0.3)'
              }}
            >
              + New Rice Entry
            </button>
          ) : (
            <>
              {/* Mill Sample button */}
              {true && (
                <button
                  onClick={() => {
                    loadDropdownData();
                    setSelectedEntryType('CREATE_NEW');
                    setSampleCollectType('broker');
                    setFormData({ entryDate: new Date().toISOString().split('T')[0], brokerName: '', variety: '', partyName: '', location: '', bags: '', lorryNumber: '', packaging: '75', sampleCollectedBy: 'Broker Office Sample', sampleGivenToOffice: false, smellHas: false, smellType: '', gpsCoordinates: '' });
                    setEditingEntry(null);
                    setShowModal(true);
                  }}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(76,175,80,0.3)'
                  }}
                >
                  + New Mill Sample
                </button>
              )}
              {/* Ready Lorry button */}
              {true && (
                <button
                  onClick={() => {
                    loadDropdownData();
                    setSelectedEntryType('DIRECT_LOADED_VEHICLE');
                    setSampleCollectType('broker');
                    setFormData({ entryDate: new Date().toISOString().split('T')[0], brokerName: '', variety: '', partyName: '', location: '', bags: '', lorryNumber: '', packaging: '75', sampleCollectedBy: 'Broker Office Sample', sampleGivenToOffice: false, smellHas: false, smellType: '', gpsCoordinates: '' });
                    setEditingEntry(null);
                    setShowModal(true);
                  }}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(33,150,243,0.3)'
                  }}
                >
                  + Ready Lorry
                </button>
              )}
              {/* Location Sample button - hidden for mill staff */}
              {(user?.role !== 'staff' || user?.staffType !== 'mill') && (
                <button
                  onClick={() => {
                    loadDropdownData();
                    setSelectedEntryType('LOCATION_SAMPLE');
                    setFormData({ entryDate: new Date().toISOString().split('T')[0], brokerName: '', variety: '', partyName: '', location: '', bags: '', lorryNumber: '', packaging: '75', sampleCollectedBy: user?.username || '', sampleGivenToOffice: false, smellHas: false, smellType: '', gpsCoordinates: '' });
                    setEditingEntry(null);
                    setShowModal(true);
                  }}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(255,152,0,0.3)'
                  }}
                >
                  + Location Sample
                </button>
              )}
            </>
          )}
        </div>
      </div >

      {/* Filter Tabs */}
      < div style={{
        display: 'flex',
        gap: '0',
        marginBottom: '15px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        {(['MILL_SAMPLE', 'LOCATION_SAMPLE', 'SAMPLE_BOOK'] as const)
          .filter((tab) => {
            // Rice Sample logic: No Location Sample tab
            if (filterEntryType === 'RICE_SAMPLE') return tab !== 'LOCATION_SAMPLE';
            if (isMillStaffOnly) return tab !== 'LOCATION_SAMPLE';
            return true;
          })
          .map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #4a90e2' : '3px solid transparent',
                backgroundColor: activeTab === tab ? '#fff' : 'transparent',
                color: activeTab === tab ? '#4a90e2' : '#666',
                fontWeight: activeTab === tab ? '700' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '-2px'
              }}
            >
              {filterEntryType === 'RICE_SAMPLE' ? (
                tab === 'MILL_SAMPLE' ? 'RICE SAMPLE' : tab === 'SAMPLE_BOOK' ? 'RICE SAMPLE BOOK' : tab
              ) : (
                tab === 'MILL_SAMPLE' ? 'MILL SAMPLE' : tab === 'LOCATION_SAMPLE' ? 'LOCATION SAMPLE' : 'PADDY SAMPLE BOOK'
              )}
            </button>
          ))}
      </div>

      {/* Filter Row Section */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: filtersVisible ? '8px' : '0' }}>
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
          
          {activeTab === 'SAMPLE_BOOK' && entries.length > 0 && (
            <button
              onClick={() => generateSampleEntryPDF(entries, {
                title: filterEntryType === 'RICE_SAMPLE' ? 'Rice Sample Book Report' : 'Paddy Sample Book Report',
                entryType: filterEntryType === 'RICE_SAMPLE' ? 'RICE' : 'PADDY',
                dateRange: filterDateFrom && filterDateTo ? `${filterDateFrom} to ${filterDateTo}` : 'Full Records'
              })}
              style={{
                padding: '7px 16px',
                backgroundColor: '#2e7d32',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(46,125,50,0.2)'
              }}
            >
              📄 Download PDF
            </button>
          )}
        </div>

        {filtersVisible && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '8px',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            backgroundColor: '#f8f9fa',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#1a237e', marginBottom: '4px' }}>From Date</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', width: '135px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#1a237e', marginBottom: '4px' }}>To Date</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', width: '135px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#1a237e', marginBottom: '4px' }}>Quick Date</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Today', value: 'today' as const },
                  { label: 'Yesterday', value: 'yesterday' as const },
                  { label: 'Last 7 Days', value: 'last7' as const }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => applyQuickDateFilter(option.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '999px',
                      border: '1px solid #bfdbfe',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#1a237e', marginBottom: '4px' }}>Broker</label>
              <select value={filterBroker} onChange={e => setFilterBroker(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', minWidth: '150px', backgroundColor: 'white' }}>
                <option value="">All Brokers</option>
                {brokers.map((b, i) => <option key={i} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#1a237e', marginBottom: '4px' }}>Variety</label>
              <select value={filterVariety} onChange={e => setFilterVariety(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', minWidth: '150px', backgroundColor: 'white' }}>
                <option value="">All Varieties</option>
                {varieties.map((v, i) => <option key={i} value={v}>{v}</option>)}
              </select>
            </div>
            {filterEntryType !== 'RICE_SAMPLE' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#1a237e', marginBottom: '4px' }}>Type</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', minWidth: '110px', backgroundColor: 'white' }}>
                  <option value="">All Types</option>
                  <option value="MS">MS</option>
                  <option value="LS">LS</option>
                  <option value="RL">RL</option>
                </select>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#1a237e', marginBottom: '4px' }}>Collected By</label>
              <input
                type="text"
                list="collected-by-options"
                value={filterCollectedBy}
                onChange={e => setFilterCollectedBy(e.target.value)}
                placeholder="Search collector..."
                style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', minWidth: '140px' }}
              />
              <datalist id="collected-by-options">
                {collectedBySuggestions.map((option) => (
                  <option key={option.value} value={option.value} label={option.label} />
                ))}
              </datalist>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#1a237e', marginBottom: '4px' }}>Location</label>
              <input
                type="text"
                list="location-options"
                value={filterLocation}
                onChange={e => setFilterLocation(e.target.value)}
                placeholder="Search location..."
                style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', minWidth: '140px' }}
              />
              <datalist id="location-options">
                {locationSuggestions.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button onClick={handleApplyFilters}
                style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', backgroundColor: '#3498db', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' }}>
                Apply Filters
              </button>
              <button onClick={handleClearFilters}
                style={{ padding: '8px 16px', border: '1px solid #e74c3c', borderRadius: '4px', backgroundColor: '#fff', color: '#e74c3c', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Entries Table */}
      <div className="table-container" style={{
        overflowX: 'auto',
        backgroundColor: 'white'
      }}>
        <style>{`
          .responsive-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            table-layout: fixed;
            border: 1px solid #000;
          }
          .responsive-table th, .responsive-table td {
            border: 1px solid #000;
            padding: 3px 4px;
          }
          @media (max-width: 768px) {
            .table-container {
               overflowX: 'visible';
            }
            .responsive-table, .responsive-table thead, .responsive-table tbody, .responsive-table th, .responsive-table td, .responsive-table tr { 
              display: block; 
            }
            .responsive-table thead tr { 
              position: absolute;
              top: -9999px;
              left: -9999px;
            }
            .responsive-table tr { border: 1px solid #ccc; margin-bottom: 10px; border-radius: 6px; overflow: hidden; }
            .responsive-table td { 
              border: none;
              border-bottom: 1px solid #eee; 
              position: relative;
              padding-left: 50% !important; 
              text-align: right !important;
              min-height: 28px;
            }
            .responsive-table td:before { 
              position: absolute;
              top: 4px;
              left: 6px;
              width: 45%; 
              padding-right: 10px; 
              white-space: nowrap;
              text-align: left;
              font-weight: 600;
              color: #555;
            }
            
            /* Label mapping for MS/RS/LS/RL variants */
            .responsive-table td:nth-of-type(1):before { content: "SL No"; }
            
             /* When "Type" column is present (Paddy) */
            .has-type-col td:nth-of-type(2):before { content: "Type"; }
            .has-type-col td:nth-of-type(3):before { content: "Bags"; }
            .has-type-col td:nth-of-type(4):before { content: "Pkg"; }
            .has-type-col td:nth-of-type(5):before { content: "Party Name"; }
            .has-type-col td:nth-of-type(6):before { content: "Location"; }
            .has-type-col td:nth-of-type(7):before { content: "Variety"; }
            .has-type-col td:nth-of-type(8):before { content: "Sample Reports"; }
            .has-type-col td:nth-of-type(9):before { content: "Collected By"; }

             /* When "Type" column is MISSING (Rice) */
            .no-type-col td:nth-of-type(2):before { content: "Bags"; }
            .no-type-col td:nth-of-type(3):before { content: "Pkg"; }
            .no-type-col td:nth-of-type(4):before { content: "Party Name"; }
            .no-type-col td:nth-of-type(5):before { content: "Location"; }
            .no-type-col td:nth-of-type(6):before { content: "Variety"; }
            .no-type-col td:nth-of-type(7):before { content: "Sample Reports"; }
            .no-type-col td:nth-of-type(8):before { content: "Collected By"; }
          }
        `}</style>
        {(() => {
          const { grouped, totalCount } = groupedEntries;

          if (loading) {
            return <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>;
          }
          if (totalCount === 0) {
            return <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No entries found</div>;
          }


          return Object.entries(grouped).map(([dateKey, brokerGroups]) => {
            let brokerSeq = 0;
            return (
              <div key={dateKey} style={{ marginBottom: '20px' }}>
                {Object.entries(brokerGroups).sort(([a], [b]) => a.localeCompare(b)).map(([brokerName, brokerEntries], brokerIdx) => {
                  brokerSeq++;
                  let slNo = 0;
                  return (
                    <div key={brokerName} style={{ marginBottom: '0px' }}>
                      {/* Date + Paddy Sample bar — only first broker */}
                      {brokerIdx === 0 && <div style={{
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                        color: 'white',
                        padding: '6px 10px',
                        fontWeight: '700',
                        fontSize: '14px',
                        textAlign: 'center',
                        letterSpacing: '0.5px'
                      }}>
                        {(() => { const d = new Date(brokerEntries[0]?.entryDate); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; })()}
                        &nbsp;&nbsp;{filterEntryType === 'RICE_SAMPLE' ? 'Rice Sample' : 'Paddy Sample'}
                      </div>}
                      {/* Broker name bar */}
                      <div style={{
                        background: '#e8eaf6',
                        color: '#000',
                        padding: '4px 10px',
                        fontWeight: '700',
                        fontSize: '13.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '800' }}>{brokerSeq}.</span> {toTitleCase(brokerName)}
                      </div>
                      <table className={`responsive-table ${filterEntryType === 'RICE_SAMPLE' ? 'no-type-col' : 'has-type-col'}`}>
                        <thead>
                          <tr style={{ backgroundColor: filterEntryType === 'RICE_SAMPLE' ? '#4a148c' : '#1a237e', color: 'white' }}>
                            <th style={{ fontWeight: '600', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '3%' }}>SL No</th>
                            {filterEntryType !== 'RICE_SAMPLE' && (
                              <th style={{ fontWeight: '600', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '4%' }}>Type</th>
                            )}
                            <th style={{ fontWeight: '600', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '6%' }}>Bags</th>
                            <th style={{ fontWeight: '600', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '6%' }}>Pkg</th>
                            <th style={{ fontWeight: '600', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '16%' }}>Party Name</th>
                           <th style={{ fontWeight: '600', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '14%' }}>{filterEntryType === 'RICE_SAMPLE' ? 'Rice Location' : 'Paddy Location'}</th>
                           <th style={{ fontWeight: '600', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '12%' }}>Variety</th>
                            <th style={{ fontWeight: '600', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '33%' }}>Sample Reports</th>
                            <th style={{ fontWeight: '600', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '12%' }}>Sample Collected By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...brokerEntries].sort((a, b) => {
                            const serialA = Number.isFinite(Number(a.serialNo)) ? Number(a.serialNo) : null;
                            const serialB = Number.isFinite(Number(b.serialNo)) ? Number(b.serialNo) : null;
                            if (serialA !== null && serialB !== null && serialA !== serialB) return serialA - serialB;
                            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                          }).map((entry, index) => {
                            slNo++;
                            const qp = (entry as any).qualityParameters;
                            const qualityAttempts = getQualityAttemptsForEntry(entry as any);
                            const resampleAttempts = Math.max(0, qualityAttempts.length - 1);
                            const isPaddyResampleWorkflow =
                              filterEntryType !== 'RICE_SAMPLE'
                              && entry.lotSelectionDecision === 'FAIL'
                              && entry.workflowStatus !== 'FAILED';
                            const resampleQualitySaved = isPaddyResampleWorkflow
                              && !!entry.lotSelectionAt
                              && qualityAttempts.some((attempt: any) => (
                                getTimeValue(attempt?.updatedAt || attempt?.createdAt || null) >= getTimeValue(entry.lotSelectionAt)
                                && hasQualitySnapshot(attempt)
                              ));
                            const assignedResampleCollector = !!entry.sampleCollectedBy
                              && locationSupervisorSet.has(entry.sampleCollectedBy.trim().toLowerCase());
                            const isPaddyResampleEntry = isPaddyResampleWorkflow
                              && (!entry.lotSelectionAt || !resampleQualitySaved)
                              && assignedResampleCollector;
                            const needsResampleAssignment = isPaddyResampleWorkflow
                              && entry.lotSelectionDecision === 'FAIL'
                              && !assignedResampleCollector;
                            const isQualityRecheckPending = (entry as any).qualityPending === true
                              || ((entry as any).qualityPending == null && (entry as any).recheckRequested === true && (entry as any).recheckType !== 'cooking');
                            const isCookingRecheckPending = (entry as any).cookingPending === true
                              || ((entry as any).cookingPending == null && (entry as any).recheckRequested === true && (entry as any).recheckType === 'cooking');
                            const isRecheckEntry = isQualityRecheckPending || isCookingRecheckPending;
                            const isProvidedNumeric = (rawVal: any, valueVal: any) => {
                              const raw = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
                              if (raw !== '') return true;
                              const num = Number(valueVal);
                              return Number.isFinite(num) && num > 0;
                            };
                            const isProvidedAlpha = (rawVal: any, valueVal: any) => {
                              const raw = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
                              if (raw !== '') return true;
                              return hasAlphaOrPositiveValue(valueVal);
                            };
                            const baseHasQuality = qp && isProvidedNumeric(qp.moistureRaw, qp.moisture) && (
                               isProvidedNumeric(qp.cutting1Raw, qp.cutting1) ||
                               isProvidedNumeric(qp.bend1Raw, qp.bend1) ||
                               isProvidedAlpha(qp.mixRaw, qp.mix) ||
                               isProvidedAlpha(qp.mixSRaw, qp.mixS) ||
                               isProvidedAlpha(qp.mixLRaw, qp.mixL)
                             );
                             const baseHas100Grams = entry.entryType !== 'RICE_SAMPLE' && qp
                              && isProvidedNumeric(qp.moistureRaw, qp.moisture)
                              && isProvidedNumeric(qp.grainsCountRaw, qp.grainsCount)
                              && !baseHasQuality;
                            const hasQuality = isQualityRecheckPending ? false : baseHasQuality;
                            const has100Grams = isQualityRecheckPending ? false : baseHas100Grams;
                            const showResampleQualityCompleted = isPaddyResampleWorkflow && resampleQualitySaved && hasQuality;
                            const showResample100GramsCompleted = isPaddyResampleWorkflow && resampleQualitySaved && has100Grams;
                            const showDetailedQualityStatus = false;
                            const qualityAttemptLabels = resampleAttempts > 0
                              ? ['Original Quality', ...Array.from({ length: resampleAttempts }, (_, i) => `Resample ${i + 1}`)]
                              : ['Quality Completed'];

                            // Location staff restriction: only the creator can enter/edit quality FOR LOCATION SAMPLES
                            const isLocationStaff = user?.role === 'physical_supervisor';
                            const isLocationSample = entry.entryType === 'LOCATION_SAMPLE';
                            const isEntryCreator = (entry as any).creator?.id === user?.id || (entry as any).createdByUserId === user?.id;
                            const isAssignedCollector = !!(entry.sampleCollectedBy && user?.username)
                              && entry.sampleCollectedBy.trim().toLowerCase() === user.username.trim().toLowerCase();
                            
                            // Staff can edit anyone's entry, but Location Samples NOT given to office are restricted to collector
                            const isNotGivenToOffice = (entry as any).sampleGivenToOffice === false;
                            const canEditQuality = !(isLocationStaff && isLocationSample && isNotGivenToOffice) || isAssignedCollector || isEntryCreator;
                            
                            const canAssignResample = ['admin', 'manager', 'owner'].includes(String(user?.role || '').toLowerCase());
                            
                            // Staff one-time edit visibility check (per row entry)
                            const staffCanEditDetails = !isStaffUser || ((entry as any).staffPartyNameEdits || 0) < 1;
                            const staffCanEditQuality = !isStaffUser || ((entry as any).staffBagsEdits || 0) < 1;
                            const canUploadPhotos = entry.entryType === 'LOCATION_SAMPLE' && (canEditQuality || !isStaffUser);

                            const handleNextClick = () => {
                              handleViewEntry(entry);
                            };
                            const renderUploadButton = () => {
                              if (!canUploadPhotos) return null;
                              return (
                                <button
                                  onClick={() => { setPhotoOnlyEntry(entry); setShowPhotoOnlyModal(true); setGodownImage(null); setPaddyLotImage(null); }}
                                  title="Upload Photos"
                                  style={{
                                    fontSize: '9px',
                                    padding: '2px 5px',
                                    backgroundColor: '#2e7d32',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '2px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                  }}
                                >
                                  Upload
                                </button>
                              );
                            };

                            return (
                              <tr key={entry.id} style={{ backgroundColor: isPaddyResampleWorkflow ? '#fff3e0' : entry.entryType === 'DIRECT_LOADED_VEHICLE' ? '#e3f2fd' : entry.entryType === 'LOCATION_SAMPLE' ? '#ffcc80' : '#ffffff', border: isPaddyResampleWorkflow ? '2px solid #f4a460' : undefined }}>
                                <td style={{ padding: '1px 4px', textAlign: 'center', fontWeight: '700', fontSize: '13px', verticalAlign: 'middle' }}>{slNo}</td>
                                {filterEntryType !== 'RICE_SAMPLE' && (
                                  <td style={{ padding: '1px 4px', textAlign: 'center', fontSize: '11px', fontWeight: '700', lineHeight: '1.2', color: entry.entryType === 'DIRECT_LOADED_VEHICLE' ? '#1565c0' : entry.entryType === 'LOCATION_SAMPLE' ? '#e65100' : entry.entryType === 'RICE_SAMPLE' ? '#2e7d32' : '#333' }}>{entry.entryType === 'DIRECT_LOADED_VEHICLE' ? 'RL' : entry.entryType === 'LOCATION_SAMPLE' ? 'LS' : entry.entryType === 'RICE_SAMPLE' ? 'RS' : 'MS'}</td>
                                )}
                                <td style={{ padding: '1px 4px', textAlign: 'center', fontSize: '13px', fontWeight: '600', lineHeight: '1.2' }}>{entry.bags?.toLocaleString('en-IN') || '0'}</td>
                                <td style={{ padding: '1px 4px', textAlign: 'center', fontSize: '13px', lineHeight: '1.2' }}>{(() => {
                                  let pkg = String((entry as any).packaging || '75');
                                  if (pkg.toLowerCase() === '0' || pkg.toLowerCase() === 'loose') return 'Loose';
                                  if (pkg.toLowerCase().includes('kg')) return pkg;
                                  if (pkg.toLowerCase().includes('tons')) return pkg;
                                  return `${pkg} Kg`;
                                })()}</td>
                                <td 
                                  onClick={() => setDetailEntry(entry)}
                                  style={{ padding: '1px 4px', textAlign: 'left', fontSize: '14px', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', color: '#1565c0', fontWeight: '700', textDecoration: 'underline' }}
                                >
                                  {(() => {
                                    const party = (entry.partyName || '').trim();
                                    const lorry = (entry as any).lorryNumber ? String((entry as any).lorryNumber).toUpperCase() : '';
                                    if (party) {
                                      return (
                                        <>
                                          {toTitleCase(party)}
                                          {entry.entryType === 'DIRECT_LOADED_VEHICLE' && lorry ? (
                                            <div style={{ fontSize: '13px', color: '#1565c0', fontWeight: '600' }}>{lorry}</div>
                                          ) : null}
                                        </>
                                      );
                                    }
                                    return lorry || '-';
                                  })()}
                                </td>
                                 <td style={{ padding: '1px 4px', textAlign: 'left', fontSize: '14px', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {toTitleCase(entry.location)}
                                  {entry.entryType === 'LOCATION_SAMPLE' && (entry as any).gpsCoordinates && (() => {
                                    const gps = (entry as any).gpsCoordinates;
                                    const query = typeof gps === 'object' ? `${gps.lat},${gps.lng}` : gps;
                                    return (
                                      <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${query}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="View on Map"
                                        style={{ marginLeft: '4px', textDecoration: 'none', fontSize: '14px' }}
                                      >
                                        📍
                                      </a>
                                    );
                                  })()}
                                </td>
                                <td style={{ padding: '1px 4px', textAlign: 'left', fontSize: '14px', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {toTitleCase(entry.variety)}
                                  {isRecheckEntry && <span style={{ marginLeft: '3px', color: '#1565c0', fontSize: '11px' }} title='Recheck pending'>&#8634;</span>}
                                  {isPaddyResampleEntry && !isRecheckEntry && <span style={{ marginLeft: '3px', color: '#f59e0b', fontSize: '11px' }} title='Re-sample pending'>&#8634;</span>}
                                  {hasQuality && <span style={{ marginLeft: '3px', color: '#27ae60', fontSize: '11px' }} title="Quality Completed">✅</span>}
                                  {has100Grams && <span style={{ marginLeft: '3px', color: '#e65100', fontSize: '11px' }} title="100g Completed">⚡</span>}
                                </td>
                                <td style={{ padding: '0px 2px', textAlign: 'left', lineHeight: '1.1' }}>
                                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-start', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {needsResampleAssignment ? (
                                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#c62828' }}>Pending Supervisor Assignment</span>
                                    ) : isCookingRecheckPending && !isQualityRecheckPending ? (
                                      <span style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#e3f2fd', color: '#1565c0', borderRadius: '3px', fontWeight: '700', border: '1.5px solid #90caf9' }}>
                                        Cooking Recheck
                                      </span>
                                    ) : isPaddyResampleEntry && canEditQuality ? (
                                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-start' }}>
                                        <button
                                          onClick={() => handleNextClick()}
                                          style={{
                                            fontSize: '10px',
                                            padding: '3px 8px',
                                            backgroundColor: isRecheckEntry ? '#1565c0' : (isPaddyResampleEntry ? '#e67e22' : '#c62828'),
                                            color: 'white',
                                            border: isRecheckEntry ? '1px solid #0d47a1' : (isPaddyResampleEntry ? '1px solid #c25f0f' : '1px solid #8e0000'),
                                            borderRadius: '2px',
                                            cursor: 'pointer',
                                            fontWeight: '700'
                                          }}
                                        >
                                          Next {'>'}
                                        </button>
                                        {staffCanEditDetails && (
                                          <button
                                            onClick={() => handleEditEntry(entry)}
                                            title="Edit Entry"
                                            style={{
                                              fontSize: '9px',
                                              padding: '2px 5px',
                                              backgroundColor: '#2980b9',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '2px',
                                              cursor: 'pointer',
                                              fontWeight: '600'
                                            }}
                                          >
                                            Edit
                                          </button>
                                        )}
                                        {renderUploadButton()}
                                      </div>
                                    ) : has100Grams ? (
                                      <>
                                        <span
                                          onClick={() => canEditQuality ? setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id) : null}
                                          style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: showResample100GramsCompleted ? '#fff3cd' : '#ffeb3b', color: showResample100GramsCompleted ? '#8a4b00' : '#333', borderRadius: '3px', fontWeight: '700', border: showResample100GramsCompleted ? '1.5px solid #f0ad4e' : '1.5px solid #f9a825', cursor: canEditQuality ? 'pointer' : 'default' }}
                                        >⚡ 100-Gms Completed</span>
                                        {canEditQuality && expandedEntryId === entry.id && (
                                          <div style={{ width: '100%', display: 'flex', gap: '4px', marginTop: '2px', justifyContent: 'flex-start' }}>
                                            {staffCanEditQuality && (
                                              <button onClick={() => handleViewEntry(entry)} title="Edit Quality" style={{ fontSize: '10px', padding: '3px 6px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontWeight: '600' }}>Edit Qlty</button>
                                            )}
                                            {staffCanEditDetails && (
                                              <button onClick={() => handleEditEntry(entry)} title="Edit Entry" style={{ fontSize: '10px', padding: '3px 6px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontWeight: '600' }}>Edit</button>
                                            )}
                                            {renderUploadButton()}
                                          </div>
                                        )}
                                      </>
                                    ) : hasQuality ? (
                                      <>
                                        <div
                                          onClick={() => canEditQuality ? setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id) : null}
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-start',
                                            gap: '2px',
                                            cursor: canEditQuality ? 'pointer' : 'default'
                                          }}
                                        >
                                          {showDetailedQualityStatus ? (
                                            qualityAttemptLabels.map((label: string, idx: number) => (
                                              <span
                                                key={`${entry.id}-quality-label-${idx}`}
                                                style={{
                                                  fontSize: '10px',
                                                  padding: '2px 6px',
                                                  backgroundColor: idx === 0 ? '#e8f5e9' : '#ccfbf1',
                                                  color: idx === 0 ? '#2e7d32' : '#115e59',
                                                  borderRadius: '10px',
                                                  fontWeight: '700',
                                                  border: idx === 0 ? '1.5px solid #66bb6a' : '1.5px solid #14b8a6',
                                                  whiteSpace: 'nowrap'
                                                }}
                                              >
                                                {label}
                                              </span>
                                            ))
                                          ) : (
                                             <>
                                               <span
                                                 style={{
                                                   fontSize: '11px',
                                                   padding: '3px 8px',
                                                   backgroundColor: showResampleQualityCompleted ? '#ccfbf1' : '#e8f5e9',
                                                   color: showResampleQualityCompleted ? '#115e59' : '#27ae60',
                                                   borderRadius: '3px',
                                                   fontWeight: '700',
                                                   border: showResampleQualityCompleted ? '1.5px solid #14b8a6' : '1.5px solid #66bb6a'
                                                 }}
                                               >
                                                 ✓ Quality Completed
                                               </span>

                                             </>
                                           )}
                                        </div>

                                        {canEditQuality && expandedEntryId === entry.id && (
                                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-start' }}>
                                            {staffCanEditQuality && (
                                              <button
                                                onClick={() => handleViewEntry(entry)}
                                                title="Edit Quality Parameters"
                                                style={{
                                                  fontSize: '9px',
                                                  padding: '2px 5px',
                                                  backgroundColor: '#e67e22',
                                                  color: 'white',
                                                  border: 'none',
                                                  borderRadius: '2px',
                                                  cursor: 'pointer',
                                                  fontWeight: '600'
                                                }}
                                              >
                                                Edit Qlty
                                              </button>
                                            )}
                                            {staffCanEditDetails && (
                                              <button
                                                onClick={() => handleEditEntry(entry)}
                                                title="Edit Entry"
                                                style={{
                                                  fontSize: '9px',
                                                  padding: '2px 5px',
                                                  backgroundColor: '#2980b9',
                                                  color: 'white',
                                                  border: 'none',
                                                  borderRadius: '2px',
                                                  cursor: 'pointer',
                                                  fontWeight: '600'
                                                }}
                                              >
                                                Edit
                                              </button>
                                            )}
                                            {renderUploadButton()}
                                          </div>
                                        )}
                                      </>
                                    ) : canEditQuality ? (
                                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-start' }}>
                                        <button
                                          onClick={() => handleNextClick()}
                                          style={{
                                            fontSize: '10px',
                                            padding: '3px 8px',
                                            backgroundColor: isRecheckEntry ? '#1565c0' : (isPaddyResampleEntry ? '#e67e22' : '#c62828'),
                                            color: 'white',
                                            border: isRecheckEntry ? '1px solid #0d47a1' : (isPaddyResampleEntry ? '1px solid #c25f0f' : '1px solid #8e0000'),
                                            borderRadius: '2px',
                                            cursor: 'pointer',
                                            fontWeight: '700'
                                          }}
                                        >
                                          Next {'>'}
                                        </button>
                                        {staffCanEditDetails && (
                                          <button
                                            onClick={() => handleEditEntry(entry)}
                                            title="Edit Entry"
                                            style={{
                                              fontSize: '9px',
                                              padding: '2px 5px',
                                              backgroundColor: '#2980b9',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '2px',
                                              cursor: 'pointer',
                                              fontWeight: '600'
                                            }}
                                          >
                                            Edit
                                          </button>
                                        )}
                                        {renderUploadButton()}
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#f5f5f5', color: '#999', borderRadius: '3px', fontWeight: '600' }}>Pending</span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '1px 8px', textAlign: 'left', fontSize: '11px', lineHeight: '1.2', verticalAlign: 'middle' }}>
                                  {(() => {
                                    const collectedByDisplay = getCollectedByDisplay(entry as any);

                                    if (collectedByDisplay.secondary) {
                                      return (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                          <span style={{ color: collectedByDisplay.highlightPrimary ? collectedByHighlightColor : '#1e293b', fontWeight: '700', fontSize: '11px' }}>
                                            {collectedByDisplay.primary}
                                          </span>
                                          <span style={{ color: '#94a3b8', fontWeight: '800', fontSize: '10px' }}>/</span>
                                          <span style={{ color: '#1e293b', fontWeight: '600', fontSize: '10px' }}>
                                            {collectedByDisplay.secondary}
                                          </span>
                                        </div>
                                      );
                                    }

                                    return collectedByDisplay.primary;
                                  })()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            );
          })
        })()}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 12px',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              backgroundColor: page === 1 ? '#eee' : '#3498db',
              color: page === 1 ? '#999' : 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalEntries} entries)
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '6px 12px',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              backgroundColor: page === totalPages ? '#eee' : '#3498db',
              color: page === totalPages ? '#999' : 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Modal - Full Screen */}
      {
        showModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            zIndex: 9999,
            padding: '20px',
            overflowY: 'auto'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '420px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #ddd',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}>
              <div style={{
                background: selectedEntryType === 'CREATE_NEW' ? 'linear-gradient(135deg, #2ecc71, #27ae60)' :
                  selectedEntryType === 'DIRECT_LOADED_VEHICLE' ? 'linear-gradient(135deg, #3498db, #2980b9)' :
                    'linear-gradient(135deg, #e67e22, #d35400)',
                padding: '10px 15px',
                borderRadius: '8px 8px 0 0',
                marginBottom: '10px',
                marginTop: '-15px',
                marginLeft: '-15px',
                marginRight: '-15px',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: '700',
                  color: 'white',
                  letterSpacing: '0.5px'
                }}>
                  {selectedEntryType === 'CREATE_NEW' ? '🌾 NEW PADDY SAMPLE' : selectedEntryType === 'DIRECT_LOADED_VEHICLE' ? '🚛 READY LORRY' : selectedEntryType === 'RICE_SAMPLE' ? '🍚 NEW RICE SAMPLE' : '📍 LOCATION SAMPLE'}
                </h3>
              </div>
              <form onSubmit={handleSubmitWithConfirm}>
                {/* 1. Date */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '2px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Date {requiredMark}</label>
                  <input
                    type="date"
                    value={formData.entryDate}
                    onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                    style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px' }}
                    required
                  />
                </div>

                {/* 2. Broker Name */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '2px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Broker Name {requiredMark}</label>
                  <select
                    value={formData.brokerName}
                    onChange={(e) => setFormData({ ...formData, brokerName: e.target.value })}
                    onFocus={() => loadDropdownData()}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '13px', backgroundColor: 'white', cursor: 'pointer' }}
                    required
                  >
                    <option value="">-- Select Broker --</option>
                    {brokerOptions.map((broker, index) => (
                      <option key={index} value={toTitleCase(broker)}>{toTitleCase(broker)}</option>
                    ))}
                  </select>
                </div>

                {/* Lorry Number (only for READY LORRY) — right after Broker Name */}
                {selectedEntryType === 'DIRECT_LOADED_VEHICLE' && (
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '2px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Lorry Number {requiredMark}</label>
                    <input
                      type="text"
                      value={formData.lorryNumber}
                      onChange={(e) => handleInputChange('lorryNumber', e.target.value)}
                      maxLength={11}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '13px', textTransform: 'capitalize' }}
                    />
                  </div>
                )}

                {/* 3. Bags - validation based on packaging */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '2px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    Bags {requiredMark}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.bags}
                    onChange={(e) => {
                      const maxDigits = formData.packaging === '75' ? 4 : 5;
                      const val = e.target.value.replace(/[^0-9]/g, '').substring(0, maxDigits);
                      setFormData({ ...formData, bags: val });
                    }}
                    style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px' }}
                    required
                  />
                </div>

                {/* 4. Packaging - dynamic based on entryType */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#555', fontSize: '13px' }}>Packaging {requiredMark}</label>
                  {selectedEntryType === 'RICE_SAMPLE' ? (
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="radio" name="packaging" value="26 kg" checked={formData.packaging === '26 kg'} onChange={() => {
                          setFormData({ ...formData, packaging: '26 kg' });
                        }} style={{ accentColor: '#4a90e2' }} />
                        26 Kg
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="radio" name="packaging" value="50 kg" checked={formData.packaging === '50 kg'} onChange={() => {
                          setFormData({ ...formData, packaging: '50 kg' });
                        }} style={{ accentColor: '#4a90e2' }} />
                        50 Kg
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="radio" name="packaging" value="Tons" checked={formData.packaging === 'Tons'} onChange={() => {
                          setFormData({ ...formData, packaging: 'Tons' });
                        }} style={{ accentColor: '#4a90e2' }} />
                        Tons
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="radio" name="packaging" value="Loose" checked={formData.packaging === 'Loose'} onChange={() => {
                          setFormData({ ...formData, packaging: 'Loose' });
                        }} style={{ accentColor: '#4a90e2' }} />
                        Loose
                      </label>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="radio" name="packaging" value="75" checked={formData.packaging === '75'} onChange={() => {
                          setFormData({ ...formData, packaging: '75', bags: formData.bags.substring(0, 4) });
                        }} style={{ accentColor: '#4a90e2' }} />
                        75 Kg
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="radio" name="packaging" value="40" checked={formData.packaging === '40'} onChange={() => {
                          setFormData({ ...formData, packaging: '40' });
                        }} style={{ accentColor: '#4a90e2' }} />
                        40 Kg
                      </label>
                    </div>
                  )}
                </div>

                {/* 5. Variety — moved before Party Name */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '2px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Variety {requiredMark}</label>
                  <select
                    value={formData.variety}
                    onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                    onFocus={() => loadDropdownData()}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '13px', backgroundColor: 'white', cursor: 'pointer' }}
                    required
                  >
                    <option value="">-- Select Variety --</option>
                    {varietyOptions.map((variety, index) => (
                      <option key={index} value={toTitleCase(variety)}>{toTitleCase(variety)}</option>
                    ))}
                  </select>
                </div>

                {/* 6. Party Name — NOT for Ready Lorry */}
                {selectedEntryType !== 'DIRECT_LOADED_VEHICLE' && (
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '2px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Party Name {requiredMark}</label>
                    <input
                      type="text"
                      value={formData.partyName}
                      onChange={(e) => handleInputChange('partyName', e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '13px', textTransform: 'capitalize' }}
                      required
                    />
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '2px', fontWeight: '500', color: '#555', fontSize: '12px' }}>{selectedEntryType === 'RICE_SAMPLE' ? 'Rice Location' : 'Paddy Location'} {requiredMark}</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '13px', marginBottom: '6px' }}
                    required
                  />
                  {selectedEntryType === 'LOCATION_SAMPLE' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleCaptureGps}
                        disabled={isCapturingGps}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isCapturingGps ? 'Capturing...' : 'Add GPS'}
                      </button>
                      {formData.gpsCoordinates && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${formData.gpsCoordinates}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#3498db', textDecoration: 'underline', fontSize: '11px', fontWeight: '600' }}
                        >
                          📍 Exact Location
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Smell Section */}
                {selectedEntryType !== 'RICE_SAMPLE' && (
                  <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #eee' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#333', fontSize: '13px' }}>Smell</label>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        <input 
                          type="radio" 
                          name="smellHas" 
                          checked={formData.smellHas === true}
                          onChange={() => setFormData(prev => ({ ...prev, smellHas: true }))}
                        /> Yes
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        <input 
                          type="radio" 
                          name="smellHas" 
                          checked={formData.smellHas === false}
                          onChange={() => setFormData(prev => ({ ...prev, smellHas: false, smellType: '' }))}
                        /> No
                      </label>
                    </div>

                    {formData.smellHas && (
                      <div style={{ display: 'flex', gap: '20px', marginTop: '10px', paddingLeft: '5px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#333' }}>
                          <input
                            type="radio"
                            name="smellType"
                            value="LIGHT"
                            checked={formData.smellType === 'LIGHT'}
                            onChange={() => setFormData(prev => ({ ...prev, smellType: 'LIGHT' }))}
                            style={{ accentColor: '#ffeb3b' }}
                          />
                          <span style={{ padding: '2px 8px', backgroundColor: '#ffeb3b', borderRadius: '3px', border: '1px solid #ccc' }}>Light</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#333' }}>
                          <input
                            type="radio"
                            name="smellType"
                            value="MEDIUM"
                            checked={formData.smellType === 'MEDIUM'}
                            onChange={() => setFormData(prev => ({ ...prev, smellType: 'MEDIUM' }))}
                            style={{ accentColor: '#ff9800' }}
                          />
                          <span style={{ padding: '2px 8px', backgroundColor: '#ff9800', borderRadius: '3px', border: '1px solid #ccc', color: 'white' }}>Medium</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#333' }}>
                          <input
                            type="radio"
                            name="smellType"
                            value="DARK"
                            checked={formData.smellType === 'DARK'}
                            onChange={() => setFormData(prev => ({ ...prev, smellType: 'DARK' }))}
                            style={{ accentColor: '#f44336' }}
                          />
                          <span style={{ padding: '2px 8px', backgroundColor: '#f44336', borderRadius: '3px', border: '1px solid #ccc', color: 'white' }}>Dark</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Godown & Paddy Lot Images (Location Sample only) */}
                {selectedEntryType === 'LOCATION_SAMPLE' && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#333', marginBottom: '6px' }}>Photos <span style={{ color: '#999', fontWeight: '500' }}>(Optional)</span></div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '2px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Godown Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setGodownImage(e.target.files?.[0] || null)}
                          style={{ width: '100%', fontSize: '11px' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '2px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Paddy Lot Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPaddyLotImage(e.target.files?.[0] || null)}
                          style={{ width: '100%', fontSize: '11px' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 8. Sample Collected By — Radio UI for Mill Sample and Rice Sample */}
                {(selectedEntryType === 'CREATE_NEW' || selectedEntryType === 'RICE_SAMPLE') && (
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#333', fontSize: '13px' }}>
                      Sample Collected By {requiredMark}
                    </label>
                    {/* Radio Options */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                        <input
                          type="radio"
                          name="sampleCollectType"
                          checked={sampleCollectType === 'broker'}
                          onChange={() => {
                            setSampleCollectType('broker');
                            setFormData(prev => ({ ...prev, sampleCollectedBy: 'Broker Office Sample' }));
                          }}
                          style={{ accentColor: '#e65100' }}
                        />
                        <span style={{ color: '#e65100', fontWeight: '700' }}>Broker</span>
                        <span style={{ color: '#e65100', fontWeight: '700' }}>Office</span>
                        <span style={{ color: '#e65100', fontWeight: '700' }}>Sample</span>
                      </label>
                    </div>

                    {/* Second option: Mill Gumasta / Paddy Supervisor — mutually exclusive */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                      <input
                        type="radio"
                        name="sampleCollectType"
                        checked={sampleCollectType === 'supervisor'}
                        onChange={() => {
                          setSampleCollectType('supervisor');
                          setFormData(prev => ({ ...prev, sampleCollectedBy: '' }));
                        }}
                        style={{ accentColor: '#1565c0', marginTop: '4px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '4px', display: 'block' }}>Paddy Staff Name {requiredMark}</label>

                        {/* Dropdown: Paddy Supervisor — hidden when manual text has been typed */}
                        {paddySupervisors.length > 0 && !(sampleCollectType === 'supervisor' && formData.sampleCollectedBy && !paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy)) && (
                          <select
                            value={sampleCollectType === 'supervisor' && paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy) ? formData.sampleCollectedBy : ''}
                            onChange={(e) => {
                              setSampleCollectType('supervisor');
                              setFormData(prev => ({ ...prev, sampleCollectedBy: e.target.value }));
                            }}
                            onFocus={() => {
                              if (sampleCollectType !== 'supervisor') {
                                setSampleCollectType('supervisor');
                                setFormData(prev => ({ ...prev, sampleCollectedBy: '' }));
                              }
                            }}
                            disabled={sampleCollectType !== 'supervisor'}
                            style={{
                              width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px',
                              backgroundColor: sampleCollectType === 'supervisor' ? 'white' : '#f5f5f5',
                              cursor: sampleCollectType === 'supervisor' ? 'pointer' : 'not-allowed',
                              marginBottom: '4px'
                            }}
                          >
                            <option value="">-- Select from list --</option>
                            {paddySupervisors.map(s => (
                              <option key={s.id} value={toTitleCase(s.username)}>{toTitleCase(s.fullName || s.username)}</option>
                            ))}
                          </select>
                        )}

                        {/* Manual text input — hidden when dropdown has a value selected */}
                        {!(sampleCollectType === 'supervisor' && paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy)) && (
                          <input
                            type="text"
                            value={sampleCollectType === 'supervisor' && !paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy) ? formData.sampleCollectedBy : ''}
                            onChange={(e) => {
                              setSampleCollectType('supervisor');
                              setFormData(prev => ({ ...prev, sampleCollectedBy: e.target.value }));
                            }}
                            onFocus={() => {
                              if (sampleCollectType !== 'supervisor') {
                                setSampleCollectType('supervisor');
                                setFormData(prev => ({ ...prev, sampleCollectedBy: '' }));
                              }
                            }}
                            placeholder="Or type name manually"
                            disabled={sampleCollectType !== 'supervisor'}
                            style={{
                              width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px',
                              backgroundColor: sampleCollectType === 'supervisor' ? 'white' : '#f5f5f5',
                              textTransform: 'capitalize'
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Lorry Sample Collected By — Broker / Gumasta toggle for Ready Lorry */}
                {selectedEntryType === 'DIRECT_LOADED_VEHICLE' && (
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#333', fontSize: '13px' }}>
                      Lorry Sample Collected By {requiredMark}
                    </label>
                    {/* Radio Options */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                        <input
                          type="radio"
                          name="readyLorrySampleCollectType"
                          checked={sampleCollectType === 'broker'}
                          onChange={() => {
                            setSampleCollectType('broker');
                            setFormData(prev => ({ ...prev, sampleCollectedBy: 'Broker Office Sample' }));
                          }}
                          style={{ accentColor: '#e65100' }}
                        />
                        <span style={{ color: '#e65100', fontWeight: '700' }}>Broker</span>
                        <span style={{ color: '#e65100', fontWeight: '700' }}>Office</span>
                        <span style={{ color: '#e65100', fontWeight: '700' }}>Sample</span>
                      </label>
                    </div>

                    {/* Second option: Mill Gumasta / Paddy Supervisor */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                      <input
                        type="radio"
                        name="readyLorrySampleCollectType"
                        checked={sampleCollectType === 'supervisor'}
                        onChange={() => {
                          setSampleCollectType('supervisor');
                          setFormData(prev => ({ ...prev, sampleCollectedBy: '' }));
                        }}
                        style={{ accentColor: '#1565c0', marginTop: '4px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '4px', display: 'block' }}>Paddy Staff Name {requiredMark}</label>

                        {/* Dropdown: Paddy Supervisor */}
                        {paddySupervisors.length > 0 && !(sampleCollectType === 'supervisor' && formData.sampleCollectedBy && !paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy)) && (
                          <select
                            value={sampleCollectType === 'supervisor' && paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy) ? formData.sampleCollectedBy : ''}
                            onChange={(e) => {
                              setSampleCollectType('supervisor');
                              setFormData(prev => ({ ...prev, sampleCollectedBy: e.target.value }));
                            }}
                            onFocus={() => {
                              if (sampleCollectType !== 'supervisor') {
                                setSampleCollectType('supervisor');
                                setFormData(prev => ({ ...prev, sampleCollectedBy: '' }));
                              }
                            }}
                            disabled={sampleCollectType !== 'supervisor'}
                            style={{
                              width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px',
                              backgroundColor: sampleCollectType === 'supervisor' ? 'white' : '#f5f5f5',
                              cursor: sampleCollectType === 'supervisor' ? 'pointer' : 'not-allowed',
                              marginBottom: '4px'
                            }}
                          >
                            <option value="">-- Select from list --</option>
                            {paddySupervisors.map(s => (
                              <option key={s.id} value={toTitleCase(s.username)}>{toTitleCase(s.fullName || s.username)}</option>
                            ))}
                          </select>
                        )}

                        {/* Manual text input */}
                        {!(sampleCollectType === 'supervisor' && paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy)) && (
                          <input
                            type="text"
                            value={sampleCollectType === 'supervisor' && !paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy) ? formData.sampleCollectedBy : ''}
                            onChange={(e) => {
                              setSampleCollectType('supervisor');
                              setFormData(prev => ({ ...prev, sampleCollectedBy: e.target.value }));
                            }}
                            onFocus={() => {
                              if (sampleCollectType !== 'supervisor') {
                                setSampleCollectType('supervisor');
                                setFormData(prev => ({ ...prev, sampleCollectedBy: '' }));
                              }
                            }}
                            placeholder="Or type name manually"
                            disabled={sampleCollectType !== 'supervisor'}
                            style={{
                              width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px',
                              backgroundColor: sampleCollectType === 'supervisor' ? 'white' : '#f5f5f5',
                              textTransform: 'capitalize'
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sample Given To — only for LOCATION SAMPLE */}
                {selectedEntryType === 'LOCATION_SAMPLE' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555', fontSize: '13px' }}>Sample Collected By {requiredMark}</label>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#555' }}>
                        <input
                          type="radio"
                          name="sampleGivenTo"
                          checked={!formData.sampleGivenToOffice}
                          onChange={() => setFormData({ ...formData, sampleGivenToOffice: false, sampleCollectedBy: user?.username || '' })}
                          style={{ accentColor: '#4a90e2', cursor: 'pointer' }}
                        />
                        Taken By
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#555' }}>
                        <input
                          type="radio"
                          name="sampleGivenTo"
                          checked={formData.sampleGivenToOffice === true}
                          onChange={() => setFormData({ ...formData, sampleGivenToOffice: true, sampleCollectedBy: '' })}
                          style={{ accentColor: '#4a90e2', cursor: 'pointer' }}
                        />
                        Given to Office
                      </label>
                    </div>
                    {/* If Given to Staff — show Staff Name input */}
                    {!formData.sampleGivenToOffice && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Staff Name</label>
                        <input
                          type="text"
                          value={formData.sampleCollectedBy || user?.username || ''}
                          disabled
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '13px', textTransform: 'uppercase', backgroundColor: '#f0f0f0', cursor: 'not-allowed', fontWeight: '600', color: '#333' }}
                        />
                      </div>
                    )}
                    {formData.sampleGivenToOffice && (
                      <div style={{ marginTop: '8px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Handed Over To (Supervisor) {requiredMark}</label>
                        {/* Dropdown: Paddy Supervisor */}
                        {paddySupervisors.length > 0 && (
                          <select
                            value={paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy) ? formData.sampleCollectedBy : ''}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, sampleCollectedBy: e.target.value }));
                            }}
                            style={{
                              width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px',
                              backgroundColor: 'white',
                              cursor: 'pointer',
                              marginBottom: paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy) ? '0' : '4px'
                            }}
                          >
                            <option value="">-- Select Supervisor -- *</option>
                            {paddySupervisors.map(s => (
                              <option key={s.id} value={toTitleCase(s.username)}>{toTitleCase(s.fullName || s.username)}</option>
                            ))}
                          </select>
                        )}

                        {/* Manual text input if not selected from dropdown or for flexibility */}
                        {!paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy) && (
                          <input
                            type="text"
                            value={formData.sampleCollectedBy || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, sampleCollectedBy: e.target.value }))}
                            placeholder="Or type name manually *"
                            style={{
                              width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px',
                              backgroundColor: 'white',
                              textTransform: 'capitalize'
                            }}
                            required
                          />
                        )}
                        
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#4CAF50', fontWeight: '500' }}>
                          ✓ This entry will also appear in MILL SAMPLE tab
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      border: '1px solid #ddd',
                      borderRadius: '3px',
                      backgroundColor: 'white',
                      fontSize: '13px',
                      color: '#666'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '8px 16px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      backgroundColor: isSubmitting ? '#95a5a6' : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Quality Parameters Modal */}
      {
        showQualityModal && selectedEntry && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '80px 20px 20px 20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '460px',
              maxHeight: 'calc(100vh - 100px)',
              overflowY: 'auto',
              border: '1px solid #e0e0e0',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
            }}>
              <h3 style={{
                marginTop: 0,
                marginBottom: '10px',
                fontSize: '15px',
                fontWeight: '700',
                color: 'white',
                background: selectedEntry.entryType === 'RICE_SAMPLE' ? 'linear-gradient(135deg, #1565c0, #0d47a1)' : 'linear-gradient(135deg, #2e7d32, #1b5e20)',
                padding: '10px 14px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {selectedEntry.entryType === 'RICE_SAMPLE'
                  ? (showQualityAsUpdate ? 'Edit Rice Quality Parameters' : 'Rice Quality Parameters')
                  : (isPaddyResampleModal ? 'Re-Sample Quality Parameters' : (showQualityAsUpdate ? 'Edit Quality Parameters' : 'Add Quality Parameters'))}
              </h3>
              
              {isStaffUser && (
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#fff4e5', 
                  border: '1px solid #ffe2b3', 
                  borderRadius: '4px', 
                  marginBottom: '12px', 
                  color: '#663c00', 
                  fontSize: '11px', 
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>⚠️</span> Quality parameters can be added/edited only once by staff. Please ensure all values are correct.
                </div>
              )}

              {/* Entry Details */}
              <div style={{
                backgroundColor: '#e8eaf6',
                padding: '8px 10px',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '11px',
                border: '1px solid #c5cae9'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                  <div><strong style={{ color: '#1a237e' }}>Broker:</strong> {toTitleCase(selectedEntry.brokerName)}</div>
                  <div><strong style={{ color: '#1a237e' }}>Variety:</strong> {toTitleCase(selectedEntry.variety)}</div>
                  <div><strong style={{ color: '#1a237e' }}>Party:</strong> {toTitleCase(selectedEntry.partyName)}</div>
                  <div><strong style={{ color: '#1a237e' }}>Bags:</strong> {selectedEntry.bags?.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <form onSubmit={handleSubmitQualityParametersWithConfirm}>
                {selectedEntry.entryType === 'RICE_SAMPLE' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 10px', alignItems: 'start', marginBottom: '10px' }}>
                      {/* Row 1: Moisture, Grains Count, Broken (mix) */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Moisture <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="number" step="0.01" required value={qualityData.moisture}
                          onChange={(e) => handleQualityInput('moisture', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Grains Count <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="number" value={qualityData.grainsCount}
                          onChange={(e) => handleQualityInput('grainsCount', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Broken <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="text" value={qualityData.mix}
                          onChange={(e) => handleQualityInput('mix', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>

                      {/* Row 2: Rice 1× (cutting), Bend 1×, Mix (sk) */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Rice <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="text" value={qualityData.cutting}
                          onChange={(e) => handleCuttingInput(e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Bend <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="text" value={qualityData.bend}
                          onChange={(e) => handleBendInput(e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Mix <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="text" value={qualityData.sk}
                          onChange={(e) => handleQualityInput('sk', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>

                      {/* Row 3: SMix, LMix, Grams Report */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <label style={{ fontWeight: '600', color: '#333', fontSize: '11px', whiteSpace: 'nowrap' }}>SMix</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <label style={{ fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <input type="radio" name="smixEnabled" checked={smixEnabled} onChange={() => { setSmixEnabled(true); if (!qualityData.mixS) setQualityData(q => ({ ...q, mixS: '' })); }} style={{ margin: 0 }} /> Y
                            </label>
                            <label style={{ fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <input type="radio" name="smixEnabled" checked={!smixEnabled} onChange={() => { setSmixEnabled(false); setQualityData(q => ({ ...q, mixS: '' })); }} style={{ margin: 0 }} /> N
                            </label>
                          </div>
                        </div>
                        {smixEnabled && (
                          <input type="text" value={qualityData.mixS}
                            onChange={(e) => handleQualityInput('mixS', e.target.value)}
                            style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <label style={{ fontWeight: '600', color: '#333', fontSize: '11px', whiteSpace: 'nowrap' }}>LMix</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <label style={{ fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <input type="radio" name="lmixEnabled" checked={lmixEnabled} onChange={() => { setLmixEnabled(true); if (!qualityData.mixL) setQualityData(q => ({ ...q, mixL: '' })); }} style={{ margin: 0 }} /> Y
                            </label>
                            <label style={{ fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <input type="radio" name="lmixEnabled" checked={!lmixEnabled} onChange={() => { setLmixEnabled(false); setQualityData(q => ({ ...q, mixL: '' })); }} style={{ margin: 0 }} /> N
                            </label>
                          </div>
                        </div>
                        {lmixEnabled && (
                          <input type="text" value={qualityData.mixL}
                            onChange={(e) => handleQualityInput('mixL', e.target.value)}
                            style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px', whiteSpace: 'nowrap' }}>Grams Report <span style={{ color: '#e53935' }}>*</span></label>
                        <select
                          value={qualityData.gramsReport || '10gms'}
                          onChange={(e) => setQualityData({ ...qualityData, gramsReport: e.target.value })}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box', backgroundColor: 'white' }}
                        >
                          <option value="10gms">10 gms</option>
                          <option value="5gms">5 gms</option>
                        </select>
                      </div>

                      {/* Row 4: Kandu, Oil, Smell */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Kandu <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="text" value={qualityData.kandu}
                          onChange={(e) => handleQualityInput('kandu', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Oil <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="text" value={qualityData.oil}
                          onChange={(e) => handleQualityInput('oil', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Smell</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: qualityData.smellHas ? '4px' : 0, alignItems: 'center' }}>
                          <label style={{ fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <input
                              type="radio"
                              name="qualitySmellHasRice"
                              checked={qualityData.smellHas === true}
                              onChange={() => setQualityData(prev => ({ ...prev, smellHas: true }))}
                              style={{ margin: 0 }}
                            />
                            Yes
                          </label>
                          <label style={{ fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <input
                              type="radio"
                              name="qualitySmellHasRice"
                              checked={qualityData.smellHas === false}
                              onChange={() => setQualityData(prev => ({ ...prev, smellHas: false, smellType: '' }))}
                              style={{ margin: 0 }}
                            />
                            No
                          </label>
                        </div>
                        {qualityData.smellHas && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {['LIGHT', 'MEDIUM', 'DARK'].map((opt) => (
                              <label key={opt} style={{ fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <input
                                  type="radio"
                                  name="qualitySmellTypeRice"
                                  checked={qualityData.smellType === opt}
                                  onChange={() => setQualityData(prev => ({ ...prev, smellType: opt }))}
                                  style={{ margin: 0 }}
                                />
                                {toTitleCase(opt.toLowerCase())}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* ── All Fields in one 3-column grid ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 10px', alignItems: 'start', marginBottom: '10px' }}>
                      {/* Row 1: Moisture, Dry Moisture, Grains Count */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Moisture <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="number" step="0.01" required value={qualityData.moisture}
                          onChange={(e) => handleQualityInput('moisture', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                          <label style={{ fontWeight: '600', color: '#333', fontSize: '11px', whiteSpace: 'nowrap' }}>Dry Moisture</label>
                          <label style={{ fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input type="radio" name="dryMoistureEnabled" checked={dryMoistureEnabled} onChange={() => { setDryMoistureEnabled(true); setQualityData({ ...qualityData, dryMoisture: '' }); }} style={{ margin: 0 }} /> Y
                          </label>
                          <label style={{ fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input type="radio" name="dryMoistureEnabled" checked={!dryMoistureEnabled} onChange={() => { setDryMoistureEnabled(false); setQualityData({ ...qualityData, dryMoisture: '' }); }} style={{ margin: 0 }} /> N
                          </label>
                        </div>
                        <input type="number" step="0.01" value={qualityData.dryMoisture}
                          onChange={(e) => handleQualityInput('dryMoisture', e.target.value)}
                          disabled={!dryMoistureEnabled}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box', visibility: dryMoistureEnabled ? 'visible' : 'hidden' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Grains Count <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="number" value={qualityData.grainsCount}
                          onChange={(e) => handleQualityInput('grainsCount', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>

                      {/* Row 2: Cutting, Bend, Mix */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Cutting <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="text" value={qualityData.cutting} placeholder="1×"
                          onFocus={() => { if (!qualityData.cutting) handleCuttingInput('1×'); }}
                          onChange={(e) => handleCuttingInput(e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box', fontWeight: '700', letterSpacing: '1px', textAlign: 'center' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Bend <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="text" value={qualityData.bend} placeholder="1×"
                          onFocus={() => { if (!qualityData.bend) handleBendInput('1×'); }}
                          onChange={(e) => handleBendInput(e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box', fontWeight: '700', letterSpacing: '1px', textAlign: 'center' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Mix <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="text" value={qualityData.mix}
                          onChange={(e) => handleQualityInput('mix', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>

                      {/* Row 3: SMix, LMix, SK */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                          <label style={{ fontWeight: '600', color: '#333', fontSize: '11px', whiteSpace: 'nowrap' }}>SMix</label>
                          <label style={{ fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input type="radio" name="smixEnabled" checked={smixEnabled} onChange={() => { setSmixEnabled(true); setQualityData({ ...qualityData, mixS: '' }); }} style={{ margin: 0 }} /> Y
                          </label>
                          <label style={{ fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input type="radio" name="smixEnabled" checked={!smixEnabled} onChange={() => { setSmixEnabled(false); setQualityData({ ...qualityData, mixS: '' }); }} style={{ margin: 0 }} /> N
                          </label>
                        </div>
                        <input type="text" value={qualityData.mixS}
                          onChange={(e) => handleQualityInput('mixS', e.target.value)}
                          disabled={!smixEnabled}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box', visibility: smixEnabled ? 'visible' : 'hidden' }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                          <label style={{ fontWeight: '600', color: '#333', fontSize: '11px', whiteSpace: 'nowrap' }}>LMix</label>
                          <label style={{ fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input type="radio" name="lmixEnabled" checked={lmixEnabled} onChange={() => { setLmixEnabled(true); setQualityData({ ...qualityData, mixL: '' }); }} style={{ margin: 0 }} /> Y
                          </label>
                          <label style={{ fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input type="radio" name="lmixEnabled" checked={!lmixEnabled} onChange={() => { setLmixEnabled(false); setQualityData({ ...qualityData, mixL: '' }); }} style={{ margin: 0 }} /> N
                          </label>
                        </div>
                        <input type="text" value={qualityData.mixL}
                          onChange={(e) => handleQualityInput('mixL', e.target.value)}
                          disabled={!lmixEnabled}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box', visibility: lmixEnabled ? 'visible' : 'hidden' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>SK <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="text" value={qualityData.sk}
                          onChange={(e) => handleQualityInput('sk', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>

                      {/* Row 4: Kandu, Oil, Smell */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Kandu <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="text" value={qualityData.kandu}
                          onChange={(e) => handleQualityInput('kandu', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Oil <span style={{ color: '#e53935' }}>*</span></label>
                        <input type="text" value={qualityData.oil}
                          onChange={(e) => handleQualityInput('oil', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Smell</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: qualityData.smellHas ? '4px' : 0, alignItems: 'center' }}>
                          <label style={{ fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <input
                              type="radio"
                              name="qualitySmellHasPaddy"
                              checked={qualityData.smellHas === true}
                              onChange={() => setQualityData(prev => ({ ...prev, smellHas: true }))}
                              style={{ margin: 0 }}
                            />
                            Yes
                          </label>
                          <label style={{ fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <input
                              type="radio"
                              name="qualitySmellHasPaddy"
                              checked={qualityData.smellHas === false}
                              onChange={() => setQualityData(prev => ({ ...prev, smellHas: false, smellType: '' }))}
                              style={{ margin: 0 }}
                            />
                            No
                          </label>
                        </div>
                        {qualityData.smellHas && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {['LIGHT', 'MEDIUM', 'DARK'].map((opt) => (
                              <label key={opt} style={{ fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <input
                                  type="radio"
                                  name="qualitySmellTypePaddy"
                                  checked={qualityData.smellType === opt}
                                  onChange={() => setQualityData(prev => ({ ...prev, smellType: opt }))}
                                  style={{ margin: 0 }}
                                />
                                {toTitleCase(opt.toLowerCase())}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Section 3: WB Parameters ── */}
                    <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f0f7ff', borderRadius: '6px', border: '1px solid #d0e3f7' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#1565c0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', borderBottom: '1px solid #bbdefb', paddingBottom: '4px' }}>WB Parameters</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 10px', alignItems: 'start' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '2px', fontWeight: '600', color: '#333', fontSize: '11px' }}>WB (R) & WB (BK)</label>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                            <label style={{ fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <input type="radio" name="wbEnabled" checked={wbEnabled} onChange={() => { setWbEnabled(true); setQualityData({ ...qualityData, wbR: qualityData.wbR || '', wbBk: qualityData.wbBk || '' }); }} /> Yes
                            </label>
                            <label style={{ fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <input type="radio" name="wbEnabled" checked={!wbEnabled} onChange={() => { setWbEnabled(false); setQualityData({ ...qualityData, wbR: '', wbBk: '' }); }} /> No
                            </label>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', visibility: wbEnabled ? 'visible' : 'hidden' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', marginBottom: '2px', fontWeight: '500', color: '#555', fontSize: '9px' }}>R</label>
                              <input type="number" step="0.01" value={qualityData.wbR}
                                onChange={(e) => handleQualityInput('wbR', e.target.value)}
                                disabled={!wbEnabled}
                                style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', marginBottom: '2px', fontWeight: '500', color: '#555', fontSize: '9px' }}>BK</label>
                              <input type="number" step="0.01" value={qualityData.wbBk}
                                onChange={(e) => handleQualityInput('wbBk', e.target.value)}
                                disabled={!wbEnabled}
                                style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>WB (T) — Auto</label>
                          <input type="number" step="0.01" readOnly value={qualityData.wbT}
                            style={{ width: '100%', padding: '6px', border: '1px solid #a5d6a7', borderRadius: '4px', fontSize: '12px', backgroundColor: '#e8f5e9', fontWeight: '700', cursor: 'not-allowed', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>Paddy WB</label>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '3px' }}>
                            <label style={{ fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <input type="radio" name="paddyWbEnabled" checked={paddyWbEnabled} onChange={() => { setPaddyWbEnabled(true); setQualityData({ ...qualityData, paddyWb: '' }); }} /> Yes
                            </label>
                            <label style={{ fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <input type="radio" name="paddyWbEnabled" checked={!paddyWbEnabled} onChange={() => { setPaddyWbEnabled(false); setQualityData({ ...qualityData, paddyWb: '' }); }} /> No
                            </label>
                          </div>
                          <input type="number" step="0.01" value={qualityData.paddyWb}
                            onChange={(e) => handleQualityInput('paddyWb', e.target.value)}
                            disabled={!paddyWbEnabled}
                            style={{ width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box', visibility: paddyWbEnabled ? 'visible' : 'hidden' }} />
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {/* Upload & Sample Collected By */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>
                      Upload Photo <span style={{ color: '#999', fontWeight: '400' }}>(Optional)</span>
                    </label>
                    <input type="file" accept="image/*"
                      onChange={(e) => setQualityData({ ...qualityData, uploadFile: e.target.files?.[0] || null })}
                      style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '11px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#333', fontSize: '11px' }}>
                      Sample Reported By <span style={{ color: '#e53935' }}>*</span>
                    </label>
                      <select
                        value={(() => {
                          const options = isRiceQualityEntry ? riceReportedByOptions : qualityUsers;
                          const current = qualityData.reportedBy || '';
                          const match = options.find((name) => String(name).toLowerCase() === String(current).toLowerCase());
                          return match || current;
                        })()}
                        onChange={(e) => setQualityData({ ...qualityData, reportedBy: e.target.value })}
                        style={{ width: '100%', padding: '6px', border: '1.5px solid #bbb', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box', fontWeight: '600' }}
                      >
                        <option value="">-- Select --</option>
                        {(isRiceQualityEntry ? riceReportedByOptions : qualityUsers).map((qName, idx) => (
                          <option key={idx} value={qName}>{toTitleCase(qName)}</option>
                        ))}
                      </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #e0e0e0', paddingTop: '12px' }}>
                  <button type="button"
                    onClick={() => { setShowQualityModal(false); setSelectedEntry(null); }}
                    style={{ padding: '8px 18px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}
                  >Cancel</button>
                  <button type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '8px 18px', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      backgroundColor: (() => {
                        const isRice = selectedEntry?.entryType === 'RICE_SAMPLE';
                        if (isSubmitting) return '#95a5a6';
                        if (isRice) return showQualityAsUpdate ? '#1565c0' : '#2e7d32';
                        const has100g = !!(qualityData.moisture && qualityData.grainsCount);
                        const allFilled = !!(has100g && qualityData.cutting1 && qualityData.cutting2 && qualityData.bend1 && qualityData.bend2 && qualityData.mix && qualityData.kandu && qualityData.oil && qualityData.sk);
                        if (allFilled) return showQualityAsUpdate ? '#1565c0' : '#2e7d32';
                        return '#e65100';
                      })(),
                      color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '700'
                    }}
                  >
                    {(() => {
                      if (isSubmitting) return 'Saving...';
                      const isRice = selectedEntry?.entryType === 'RICE_SAMPLE';
                      const has100g = !!(qualityData.moisture && qualityData.grainsCount);
                      const allFilled = !!(has100g && qualityData.cutting1 && qualityData.cutting2 && qualityData.bend1 && qualityData.bend2 && qualityData.mix && qualityData.kandu && qualityData.oil && qualityData.sk);
                      if (allFilled || isRice) return showQualityAsUpdate ? 'Update Quality' : 'Submit Quality';
                      if (has100g) return showQualityAsUpdate ? 'Update 100g' : 'Save 100g';
                      return showQualityAsUpdate ? 'Update' : 'Save';
                    })()}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Save Confirmation Dialog - Main Form */}
      {
        showSaveConfirm && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
          }}>
            <div style={{
              backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '380px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)', textAlign: 'center'
            }}>
              <h3 style={{ marginBottom: '16px', color: '#333', fontSize: '16px' }}>Confirm Save</h3>
              <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>Are you sure you want to save this entry?</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowSaveConfirm(false)}
                  style={{ padding: '8px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{ padding: '8px 20px', backgroundColor: isSubmitting ? '#95a5a6' : '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Save Confirmation Dialog - Quality Data */}
      {
        showQualitySaveConfirm && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
          }}>
            <div style={{
              backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '380px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)', textAlign: 'center'
            }}>
              <h3 style={{ marginBottom: '16px', color: '#333', fontSize: '16px' }}>Confirm Save Quality Data</h3>
              <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>Are you sure you want to save quality data?</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowQualitySaveConfirm(false)}
                  style={{ padding: '8px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitQualityParameters}
                  disabled={isSubmitting}
                  style={{ padding: '8px 20px', backgroundColor: isSubmitting ? '#95a5a6' : '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Entry Modal */}
      {
        showEditModal && editingEntry && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white', borderRadius: '8px', padding: '20px', width: '90%', maxWidth: '600px',
              maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#333', fontSize: '16px' }}>Edit Entry</h3>
                <button onClick={() => { setShowEditModal(false); setEditingEntry(null); }}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Date {requiredMark}</label>
                  <input type="date" value={formData.entryDate} onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Broker Name {requiredMark}</label>
                  <select
                    value={formData.brokerName}
                    onChange={(e) => setFormData({ ...formData, brokerName: e.target.value })}
                    onFocus={() => loadDropdownData()}
                    disabled={bagsEditLocked}
                    style={{ 
                      width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', 
                      backgroundColor: bagsEditLocked ? '#f5f5f5' : 'white', 
                      cursor: bagsEditLocked ? 'not-allowed' : 'pointer' 
                    }}
                    required
                  >
                    <option value="">-- Select Broker --</option>
                    {brokerOptions.map((broker, index) => (
                      <option key={index} value={broker}>{toTitleCase(broker)}</option>
                    ))}
                  </select>
                  {bagsEditLocked && (
                    <div style={{ fontSize: '10px', color: '#b71c1c', marginTop: '4px' }}>Broker Name can be edited only once by staff.</div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Bags {requiredMark}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.bags}
                    onChange={(e) => {
                      const maxDigits = formData.packaging === '75' ? 4 : 5;
                      const val = e.target.value.replace(/[^0-9]/g, '').substring(0, maxDigits);
                      setFormData({ ...formData, bags: val });
                    }}
                    disabled={bagsEditLocked}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      backgroundColor: bagsEditLocked ? '#f5f5f5' : 'white',
                      cursor: bagsEditLocked ? 'not-allowed' : 'text'
                    }}
                  />
                  {bagsEditLocked && (
                    <div style={{ fontSize: '10px', color: '#b71c1c', marginTop: '4px' }}>Bags can be edited only once by staff.</div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Packaging {requiredMark}</label>
                  <select
                    value={formData.packaging}
                    onChange={(e) => {
                      const nextPackaging = e.target.value;
                      const nextBags = nextPackaging === '75' ? formData.bags.substring(0, 4) : formData.bags;
                      setFormData({ ...formData, packaging: nextPackaging, bags: nextBags });
                    }}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
                    <option value="75">75 Kg</option>
                    <option value="40">40 Kg</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Variety {requiredMark}</label>
                  <select
                    value={formData.variety}
                    onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                    onFocus={() => loadDropdownData()}
                    disabled={bagsEditLocked}
                    style={{ 
                      width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', 
                      backgroundColor: bagsEditLocked ? '#f5f5f5' : 'white', 
                      cursor: bagsEditLocked ? 'not-allowed' : 'pointer' 
                    }}
                    required
                  >
                    <option value="">-- Select Variety --</option>
                    {varietyOptions.map((variety, index) => (
                      <option key={index} value={variety}>{toTitleCase(variety)}</option>
                    ))}
                  </select>
                  {bagsEditLocked && (
                    <div style={{ fontSize: '10px', color: '#b71c1c', marginTop: '4px' }}>Variety can be edited only once by staff.</div>
                  )}
                </div>
                {editingEntry.entryType !== 'DIRECT_LOADED_VEHICLE' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Party Name {requiredMark}</label>
                    <input
                      value={formData.partyName}
                      onChange={(e) => handleInputChange('partyName', e.target.value)}
                      disabled={partyEditLocked}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '13px',
                        backgroundColor: partyEditLocked ? '#f5f5f5' : 'white',
                        cursor: partyEditLocked ? 'not-allowed' : 'text'
                      }}
                    />
                    {partyEditLocked && (
                      <div style={{ fontSize: '10px', color: '#b71c1c', marginTop: '4px' }}>Party Name can be edited only once by staff.</div>
                    )}
                  </div>
                )}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Paddy Location {requiredMark}</label>
                  <input value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', marginBottom: '6px' }} />
                  {editingEntry.entryType === 'LOCATION_SAMPLE' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleCaptureGps}
                        disabled={isCapturingGps}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isCapturingGps ? 'Capturing...' : 'Add GPS'}
                      </button>
                      {formData.gpsCoordinates && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${formData.gpsCoordinates}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#3498db', textDecoration: 'underline', fontSize: '11px', fontWeight: '600' }}
                        >
                          📍 Exact Location
                        </a>
                      )}
                    </div>
                  )}
                </div>
                {/* Smell Section */}
                {editingEntry.entryType !== 'RICE_SAMPLE' && (
                  <div style={{ marginTop: '12px', gridColumn: 'span 2', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #eee' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#333', fontSize: '13px' }}>Smell</label>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        <input 
                          type="radio" 
                          name="editSmellHas" 
                          checked={formData.smellHas === true}
                          onChange={() => setFormData(prev => ({ ...prev, smellHas: true }))}
                        /> Yes
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        <input 
                          type="radio" 
                          name="editSmellHas" 
                          checked={formData.smellHas === false}
                          onChange={() => setFormData(prev => ({ ...prev, smellHas: false, smellType: '' }))}
                        /> No
                      </label>
                    </div>

                    {formData.smellHas && (
                      <div style={{ display: 'flex', gap: '20px', marginTop: '10px', paddingLeft: '5px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#333' }}>
                          <input
                            type="radio"
                            name="editSmellType"
                            value="LIGHT"
                            checked={formData.smellType === 'LIGHT'}
                            onChange={() => setFormData(prev => ({ ...prev, smellType: 'LIGHT' }))}
                            style={{ accentColor: '#ffeb3b' }}
                          />
                          <span style={{ padding: '2px 8px', backgroundColor: '#ffeb3b', borderRadius: '3px', border: '1px solid #ccc' }}>Light</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#333' }}>
                          <input
                            type="radio"
                            name="editSmellType"
                            value="MEDIUM"
                            checked={formData.smellType === 'MEDIUM'}
                            onChange={() => setFormData(prev => ({ ...prev, smellType: 'MEDIUM' }))}
                            style={{ accentColor: '#ff9800' }}
                          />
                          <span style={{ padding: '2px 8px', backgroundColor: '#ff9800', borderRadius: '3px', border: '1px solid #ccc', color: 'white' }}>Medium</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#333' }}>
                          <input
                            type="radio"
                            name="editSmellType"
                            value="DARK"
                            checked={formData.smellType === 'DARK'}
                            onChange={() => setFormData(prev => ({ ...prev, smellType: 'DARK' }))}
                            style={{ accentColor: '#f44336' }}
                          />
                          <span style={{ padding: '2px 8px', backgroundColor: '#f44336', borderRadius: '3px', border: '1px solid #ccc', color: 'white' }}>Dark</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Godown & Paddy Lot Images (Location Sample only) */}
                {editingEntry.entryType === 'LOCATION_SAMPLE' && (
                  <div style={{ gridColumn: 'span 2', marginBottom: '8px', marginTop: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#333', marginBottom: '6px' }}>Photos <span style={{ color: '#999', fontWeight: '500' }}>(Optional)</span></div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '2px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Update Godown Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setGodownImage(e.target.files?.[0] || null)}
                          style={{ width: '100%', fontSize: '11px' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '2px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Update Paddy Lot Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPaddyLotImage(e.target.files?.[0] || null)}
                          style={{ width: '100%', fontSize: '11px' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sample Collected By (Split logic for Location Sample vs Others) */}
                {editingEntry.entryType === 'LOCATION_SAMPLE' ? (
                  <div style={{ gridColumn: 'span 2', marginBottom: '12px', marginTop: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555', fontSize: '13px' }}>Sample Collected By {requiredMark}</label>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#555' }}>
                        <input
                          type="radio"
                          name="editSampleGivenTo"
                          checked={!formData.sampleGivenToOffice}
                          onChange={() => setFormData({ ...formData, sampleGivenToOffice: false, sampleCollectedBy: user?.username || '' })}
                          style={{ accentColor: '#4a90e2', cursor: 'pointer' }}
                        />
                        Taken By
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#555' }}>
                        <input
                          type="radio"
                          name="editSampleGivenTo"
                          checked={formData.sampleGivenToOffice === true}
                          onChange={() => setFormData({ ...formData, sampleGivenToOffice: true, sampleCollectedBy: '' })}
                          style={{ accentColor: '#4a90e2', cursor: 'pointer' }}
                        />
                        Given to Office
                      </label>
                    </div>

                    {!formData.sampleGivenToOffice ? (
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Staff Name</label>
                        <input
                          type="text"
                          value={formData.sampleCollectedBy || user?.username || ''}
                          disabled
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '13px', textTransform: 'uppercase', backgroundColor: '#f0f0f0', cursor: 'not-allowed', fontWeight: '600', color: '#333' }}
                        />
                      </div>
                    ) : (
                      <div style={{ marginTop: '8px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Handed Over To (Supervisor) {requiredMark}</label>
                        {paddySupervisors.length > 0 && (
                          <select
                            value={paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy) ? formData.sampleCollectedBy : ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, sampleCollectedBy: e.target.value }))}
                            style={{ width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: 'white', cursor: 'pointer', marginBottom: paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy) ? '0' : '4px' }}
                          >
                            <option value="">-- Select Supervisor -- *</option>
                            {paddySupervisors.map(s => (
                              <option key={s.id} value={toTitleCase(s.username)}>{toTitleCase(s.fullName || s.username)}</option>
                            ))}
                          </select>
                        )}
                        {!paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy) && (
                          <input
                            type="text"
                            value={formData.sampleCollectedBy || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, sampleCollectedBy: e.target.value }))}
                            placeholder="Or type name manually *"
                            style={{ width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: 'white', textTransform: 'capitalize' }}
                            required
                          />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '13px' }}>
                      Sample Collected By {requiredMark}
                    </label>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                        <input
                          type="radio"
                          name="editSampleCollectType"
                          checked={sampleCollectType === 'broker'}
                          onChange={() => {
                            setSampleCollectType('broker');
                            setFormData(prev => ({ ...prev, sampleCollectedBy: 'Broker Office Sample' }));
                          }}
                          style={{ accentColor: '#e65100' }}
                        />
                        <span style={{ color: '#e65100', fontWeight: '700' }}>Broker Office Sample</span>
                      </label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <input
                        type="radio"
                        name="editSampleCollectType"
                        checked={sampleCollectType === 'supervisor'}
                        onChange={() => {
                          setSampleCollectType('supervisor');
                          setFormData(prev => ({ ...prev, sampleCollectedBy: '' }));
                        }}
                        style={{ accentColor: '#1565c0', marginTop: '4px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '4px', display: 'block' }}>Paddy Staff Name {requiredMark}</label>
                        {paddySupervisors.length > 0 && !(sampleCollectType === 'supervisor' && formData.sampleCollectedBy && !paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy)) && (
                          <select
                            value={sampleCollectType === 'supervisor' && paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy) ? formData.sampleCollectedBy : ''}
                            onChange={(e) => {
                              setSampleCollectType('supervisor');
                              setFormData(prev => ({ ...prev, sampleCollectedBy: e.target.value }));
                            }}
                            disabled={sampleCollectType !== 'supervisor'}
                            style={{
                              width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px',
                              backgroundColor: sampleCollectType === 'supervisor' ? 'white' : '#f5f5f5',
                              cursor: sampleCollectType === 'supervisor' ? 'pointer' : 'not-allowed',
                              marginBottom: '6px'
                            }}
                          >
                            <option value="">-- Select from list --</option>
                            {paddySupervisors.map(s => (
                              <option key={s.id} value={toTitleCase(s.username)}>{toTitleCase(s.fullName || s.username)}</option>
                            ))}
                          </select>
                        )}
                        {!(sampleCollectType === 'supervisor' && paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy)) && (
                          <input
                            type="text"
                            value={sampleCollectType === 'supervisor' && !paddySupervisors.some(s => toTitleCase(s.username) === formData.sampleCollectedBy) ? formData.sampleCollectedBy : ''}
                            onChange={(e) => {
                              setSampleCollectType('supervisor');
                              const val = e.target.value;
                              setFormData(prev => ({ ...prev, sampleCollectedBy: toTitleCase(val) }));
                            }}
                            placeholder="Or type name manually"
                            disabled={sampleCollectType !== 'supervisor'}
                            style={{
                              width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px',
                              backgroundColor: sampleCollectType === 'supervisor' ? 'white' : '#f5f5f5'
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {editingEntry.entryType === 'DIRECT_LOADED_VEHICLE' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>Lorry Number {requiredMark}</label>
                    <input
                      value={formData.lorryNumber}
                      onChange={(e) => handleInputChange('lorryNumber', e.target.value)}
                      maxLength={11}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowEditModal(false); setEditingEntry(null); }}
                  style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                  Cancel
                </button>
                <button onClick={handleSaveEdit} disabled={isSubmitting}
                  style={{ padding: '8px 16px', backgroundColor: isSubmitting ? '#95a5a6' : '#4a90e2', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
 
      {/* Detail Popup — same design as AdminSampleBook */}
      {detailEntry && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}
           onClick={() => setDetailEntry(null)}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '95%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}>
            {/* Elite Header */}
            <div style={{
              background: detailEntry.entryType === 'DIRECT_LOADED_VEHICLE' ? '#1565c0' : detailEntry.entryType === 'LOCATION_SAMPLE' ? '#e67e22' : '#4caf50',
              padding: '16px 20px', borderRadius: '8px 8px 0 0', color: 'white', position: 'relative'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', opacity: 0.9, textAlign: 'left' }}>
                  {new Date(detailEntry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', textAlign: 'center' }}>
                  {detailEntry.entryType === 'DIRECT_LOADED_VEHICLE' ? 'Ready Lorry' : detailEntry.entryType === 'LOCATION_SAMPLE' ? 'Location Sample' : 'Mill Sample'}
                </div>
                <div></div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%' }}>
                {toTitleCase(detailEntry.brokerName) || '-'}
              </div>
              <button onClick={() => setDetailEntry(null)} style={{
                position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}>✕</button>
            </div>

            <div style={{ padding: '24px', backgroundColor: '#fff', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px' }}>
              {/* Basic Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                  ['Date', new Date(detailEntry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
                  ['Bags', detailEntry.bags?.toLocaleString('en-IN')],
                  ['Pack', `${detailEntry.packaging || '75'} Kg`],
                  ['Variety', toTitleCase(detailEntry.variety || '-')],
                ].map(([label, value], i) => (
                  <div key={i} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{value || '-'}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase' }}>Party Name</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getPartyLabel(detailEntry)}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase' }}>Location</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{toTitleCase(detailEntry.location || '-')}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase' }}>Collected By</div>
                  {(() => {
                    const collectedByDisplay = getCollectedByDisplay(detailEntry as any);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {collectedByDisplay.secondary ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: collectedByDisplay.highlightPrimary ? collectedByHighlightColor : '#1e293b' }}>
                              {collectedByDisplay.primary}
                            </span>
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '800' }}>/</span>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>
                              {collectedByDisplay.secondary}
                            </span>
                          </div>
                        ) : null}
                        {!collectedByDisplay.secondary ? (
                          <div style={{ fontSize: '14px', fontWeight: '700', color: collectedByDisplay.highlightPrimary ? collectedByHighlightColor : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {collectedByDisplay.primary}
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
                {getEntrySmellLabel(detailEntry as any) !== '-' ? (
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase' }}>Smell</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getEntrySmellLabel(detailEntry as any)}
                    </div>
                  </div>
                ) : null}
              </div>
              {/* GPS & Media - Hide in quick mode if redundant or keep minimal */}
              {((detailEntry as any).gpsCoordinates || (detailEntry as any).godownImageUrl || (detailEntry as any).paddyLotImageUrl) && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: '#e67e22', borderBottom: '2px solid #e67e22', paddingBottom: '6px', fontWeight: '900' }}>📍 Location & Media</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(detailEntry as any).gpsCoordinates && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>GPS Location Captured</div>
                        </div>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${(detailEntry as any).gpsCoordinates}`} target="_blank" rel="noreferrer"
                           style={{ background: '#e67e22', color: 'white', padding: '6px 16px', borderRadius: '6px', textDecoration: 'none', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>
                          MAP LINK
                        </a>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {(detailEntry as any).godownImageUrl && (
                        <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <div style={{ padding: '6px', background: '#f8fafc', fontSize: '10px', textAlign: 'center', fontWeight: '800', borderBottom: '1px solid #e2e8f0' }}>GODOWN IMAGE</div>
                          <img src={`${API_URL.replace('/api', '')}${(detailEntry as any).godownImageUrl}`} alt="Godown" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                        </div>
                      )}
                      {(detailEntry as any).paddyLotImageUrl && (
                        <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <div style={{ padding: '6px', background: '#f8fafc', fontSize: '10px', textAlign: 'center', fontWeight: '800', borderBottom: '1px solid #e2e8f0' }}>LOT IMAGE</div>
                          <img src={`${API_URL.replace('/api', '')}${(detailEntry as any).paddyLotImageUrl}`} alt="Paddy Lot" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Horizontal Layout: Quality Parameters / Cooking History */}
              <div style={{ display: 'grid', gridTemplateColumns: getQualityAttemptsForEntry(detailEntry as any).length > 1 ? 'minmax(0, 1fr)' : 'minmax(0, 1.6fr) minmax(340px, 1fr)', gap: '20px', marginTop: '20px', alignItems: 'start' }}>
                {/* LEFT SIDE: Quality Parameters */}
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#e67e22', borderBottom: '2px solid #e67e22', paddingBottom: '6px', fontWeight: '800' }}>🔬 Quality Parameters</h4>
                  {(() => {
                const qpAll = getQualityAttemptsForEntry(detailEntry as any);
                const qpList = qpAll;

                if (qpList.length === 0) return <div style={{ color: '#999', textAlign: 'center', padding: '12px', fontSize: '12px' }}>No quality data</div>;

                const trimZeros = (raw: string) => raw.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
                const fmt = (v: any, forceDecimal = false, precision = 2) => {
                  if (v == null || v === '') return null;
                  if (typeof v === 'string') {
                    const raw = v.trim();
                    if (!raw) return null;
                    if (/[a-zA-Z]/.test(raw)) return raw;
                    const num = Number(raw);
                    if (!Number.isFinite(num) || num === 0) return null;
                    return trimZeros(raw);
                  }
                  const n = Number(v);
                  if (isNaN(n) || n === 0) return null;
                  const fixed = n.toFixed(forceDecimal ? 1 : precision);
                  return trimZeros(fixed);
                };
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
                const fmtB = (v: any, useBrackets = false) => {
                  const f = fmt(v);
                  return f && useBrackets ? `(${f})` : f;
                };

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
                const getAttemptLabel = (attemptNo: number, idx: number) => {
                  const num = attemptNo || idx + 1;
                  if (num === 1) return '1st Sample';
                  if (num === 2) return '2nd Sample';
                  if (num === 3) return '3rd Sample';
                  return `${num}th Sample`;
                };

                if (hasMultipleAttempts) {
                  const columns = [
                    { key: 'reportedBy', label: 'Sample Reported By' },
                    { key: 'moisture', label: 'Moisture' },
                    { key: 'cutting', label: 'Cutting' },
                    { key: 'bend', label: 'Bend' },
                    { key: 'grainsCount', label: 'Grains Count' },
                    { key: 'mix', label: 'Mix' },
                    { key: 'mixS', label: 'S Mix' },
                    { key: 'mixL', label: 'L Mix' },
                    { key: 'kandu', label: 'Kandu' },
                    { key: 'oil', label: 'Oil' },
                    { key: 'sk', label: 'SK' },
                    { key: 'wbR', label: 'WB-R' },
                    { key: 'wbBk', label: 'WB-BK' },
                    { key: 'wbT', label: 'WB-T' },
                    { key: 'smell', label: 'Smell' },
                    { key: 'paddyWb', label: 'Paddy WB' }
                  ];

                  const getCellValue = (qp: any, key: string) => {
                    const smixOn = isEnabled(qp.smixEnabled, qp.mixSRaw, qp.mixS);
                    const lmixOn = isEnabled(qp.lmixEnabled, qp.mixLRaw, qp.mixL);
                    const paddyOn = isEnabled(qp.paddyWbEnabled, qp.paddyWbRaw, qp.paddyWb);
                    const wbOn = isProvided(qp.wbRRaw, qp.wbR) || isProvided(qp.wbBkRaw, qp.wbBk);
                    if (key === 'reportedBy') return toTitleCase(qp.reportedBy || '-');
                    if (key === 'moisture') {
                      const val = displayVal(qp.moistureRaw, qp.moisture);
                      return val ? `${val}%` : '-';
                    }
                    if (key === 'cutting') {
                      const cut1 = displayVal(qp.cutting1Raw, qp.cutting1);
                      const cut2 = displayVal(qp.cutting2Raw, qp.cutting2);
                      return cut1 && cut2 ? `${cut1}x${cut2}` : '-';
                    }
                    if (key === 'bend') {
                      const bend1 = displayVal(qp.bend1Raw, qp.bend1);
                      const bend2 = displayVal(qp.bend2Raw, qp.bend2);
                      return bend1 && bend2 ? `${bend1}x${bend2}` : '-';
                    }
                    if (key === 'grainsCount') {
                      const val = displayVal(qp.grainsCountRaw, qp.grainsCount);
                      return val ? `(${val})` : '-';
                    }
                    if (key === 'mix') return displayVal(qp.mixRaw, qp.mix) || '-';
                    if (key === 'mixS') return displayVal(qp.mixSRaw, qp.mixS, smixOn) || '-';
                    if (key === 'mixL') return displayVal(qp.mixLRaw, qp.mixL, lmixOn) || '-';
                    if (key === 'kandu') return displayVal(qp.kanduRaw, qp.kandu) || '-';
                    if (key === 'oil') return displayVal(qp.oilRaw, qp.oil) || '-';
                    if (key === 'sk') return displayVal(qp.skRaw, qp.sk) || '-';
                    if (key === 'wbR') return displayVal(qp.wbRRaw, qp.wbR, wbOn) || '-';
                    if (key === 'wbBk') return displayVal(qp.wbBkRaw, qp.wbBk, wbOn) || '-';
                    if (key === 'wbT') return displayVal(qp.wbTRaw, qp.wbT, wbOn) || '-';
                    if (key === 'smell') {
                      const smellHasValue = qp.smellHas ?? (detailEntry as any).smellHas;
                      const smellTypeValue = qp.smellType ?? (detailEntry as any).smellType;
                      return smellHasValue ? toTitleCase(smellTypeValue || 'Yes') : '-';
                    }
                    if (key === 'paddyWb') return displayVal(qp.paddyWbRaw, qp.paddyWb, paddyOn) || '-';
                    return '-';
                  };

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 0 12px 0' }}>
                      {qualityPhotoUrl && (
                        <div style={{
                          width: '100%',
                          background: '#fff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '12px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '900',
                            color: '#fff',
                            backgroundColor: '#1d4ed8',
                            margin: '-12px -12px 10px -12px',
                            padding: '6px 12px',
                            borderRadius: '8px 8px 0 0',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                          }}>
                            Quality Photo
                          </div>
                          <img
                            src={`${API_URL.replace('/api', '')}${qualityPhotoUrl}`}
                            alt="Quality"
                            style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                          />
                        </div>
                      )}
                      <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%', minWidth: '1180px', borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'auto' }}>
                          <thead>
                            <tr>
                              <th style={{ border: '1px solid #e0e0e0', padding: '6px', background: '#f7f7f7', textAlign: 'left', whiteSpace: 'nowrap' }}>Sample</th>
                              {columns.map((col) => (
                                <th key={col.key} style={{ border: '1px solid #e0e0e0', padding: '6px', background: '#f7f7f7', textAlign: 'center', whiteSpace: 'nowrap' }}>{col.label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {qpList.map((qp: any, idx: number) => (
                              <tr key={`${qp.attemptNo || idx}-row`}>
                                <td style={{ border: '1px solid #e0e0e0', padding: '6px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                  {getAttemptLabel(qp.attemptNo, idx)}
                                </td>
                                {columns.map((col) => (
                                  <td key={`${qp.attemptNo || idx}-${col.key}`} style={{ border: '1px solid #e0e0e0', padding: '6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    {getCellValue(qp, col.key)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                return (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '0 0 12px 0'
                  }}>
                    {qualityPhotoUrl && (
                      <div style={{
                        width: '100%',
                        background: '#fff',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        flexShrink: 0
                      }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '900',
                          color: '#fff',
                          backgroundColor: '#1d4ed8',
                          margin: '-12px -12px 10px -12px',
                          padding: '6px 12px',
                          borderRadius: '8px 8px 0 0',
                          textAlign: 'center',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}>
                          Quality Photo
                        </div>
                        <img
                          src={`${API_URL.replace('/api', '')}${qualityPhotoUrl}`}
                          alt="Quality"
                          style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                      </div>
                    )}
                    {qpList.map((qp: any, idx: number) => {
                      const smixEnabled = isEnabled((qp as any).smixEnabled, (qp as any).mixSRaw, qp.mixS);
                      const lmixEnabled = isEnabled((qp as any).lmixEnabled, (qp as any).mixLRaw, qp.mixL);
                      const paddyWbEnabled = isEnabled((qp as any).paddyWbEnabled, (qp as any).paddyWbRaw, qp.paddyWb);
                      const wbEnabled = isProvided((qp as any).wbRRaw, qp.wbR) || isProvided((qp as any).wbBkRaw, qp.wbBk);
                      const dryEnabled = isProvided((qp as any).dryMoistureRaw, (qp as any).dryMoisture);
                      const row1: { label: string; value: React.ReactNode }[] = [];
                      const moistureVal = displayVal((qp as any).moistureRaw, qp.moisture);
                      if (moistureVal) {
                        const dryVal = displayVal((qp as any).dryMoistureRaw, (qp as any).dryMoisture, dryEnabled);
                        row1.push({
                          label: 'Moisture',
                          value: dryVal ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px' }}>
                              <span style={{ color: '#e67e22', fontWeight: '800', fontSize: '10px' }}>{dryVal}%</span>
                              <span style={{ fontSize: '11px' }}>{moistureVal}%</span>
                            </div>
                          ) : `${moistureVal}%`
                        });
                      }
                      const cut1 = displayVal((qp as any).cutting1Raw, qp.cutting1);
                      const cut2 = displayVal((qp as any).cutting2Raw, qp.cutting2);
                      if (cut1 && cut2) row1.push({ label: 'Cutting', value: `${cut1}×${cut2}` });
                      const bend1 = displayVal((qp as any).bend1Raw, qp.bend1);
                      const bend2 = displayVal((qp as any).bend2Raw, qp.bend2);
                      if (bend1 && bend2) row1.push({ label: 'Bend', value: `${bend1}×${bend2}` });
                      const grainsVal = displayVal((qp as any).grainsCountRaw, qp.grainsCount);
                      if (grainsVal) row1.push({ label: 'Grains Count', value: `(${grainsVal})` });
                      
                      const row2: { label: string; value: React.ReactNode }[] = [];
                      const mixVal = displayVal((qp as any).mixRaw, qp.mix);
                      const mixSVal = displayVal((qp as any).mixSRaw, qp.mixS, smixEnabled);
                      const mixLVal = displayVal((qp as any).mixLRaw, qp.mixL, lmixEnabled);
                      if (mixVal) row2.push({ label: 'Mix', value: mixVal });
                      if (mixSVal) row2.push({ label: 'S Mix', value: mixSVal });
                      if (mixLVal) row2.push({ label: 'L Mix', value: mixLVal });
                      
                      const hasKandu = displayVal((qp as any).kanduRaw, qp.kandu);
                      const hasOil = displayVal((qp as any).oilRaw, qp.oil);
                      const hasSK = displayVal((qp as any).skRaw, qp.sk);
                      const row3: { label: string; value: React.ReactNode }[] = [];
                      if (hasKandu) row3.push({ label: 'Kandu', value: hasKandu });
                      if (hasOil) row3.push({ label: 'Oil', value: hasOil });
                      if (hasSK) row3.push({ label: 'SK', value: hasSK });
                      
                      const row4: { label: string; value: React.ReactNode }[] = [];
                      const wbRVal = displayVal((qp as any).wbRRaw, qp.wbR, wbEnabled);
                      const wbBkVal = displayVal((qp as any).wbBkRaw, qp.wbBk, wbEnabled);
                      const wbTVal = displayVal((qp as any).wbTRaw, qp.wbT, wbEnabled);
                      if (wbRVal) row4.push({ label: 'WB-R', value: wbRVal });
                      if (wbBkVal) row4.push({ label: 'WB-BK', value: wbBkVal });
                      if (wbTVal) row4.push({ label: 'WB-T', value: wbTVal });
                      const smellHas = (qp as any).smellHas ?? (qpList.length === 1 ? (detailEntry as any).smellHas : undefined);
                      const smellType = (qp as any).smellType ?? (qpList.length === 1 ? (detailEntry as any).smellType : undefined);
                      if (smellHas || (smellType && String(smellType).trim())) {
                        row4.push({ label: 'Smell', value: toTitleCase(smellType || 'Yes') });
                      }
                      
                      const hasPaddyWb = displayVal((qp as any).paddyWbRaw, qp.paddyWb, paddyWbEnabled);
                      if (hasPaddyWb) {
                        row4.push({
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
                      
                      const attemptLabel = qp.attemptNo ? `${qp.attemptNo}${qp.attemptNo === 1 ? 'st' : qp.attemptNo === 2 ? 'nd' : 'th'} Quality` : `${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : 'th'} Quality`;

                      return (
                        <div key={idx} style={{ 
                          width: '100%',
                          background: '#fff', 
                          border: '1.5px solid #e2e8f0', 
                          borderRadius: '10px', 
                          padding: '12px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          flexShrink: 0
                        }}>
                          {hasMultipleAttempts && (
                            <div style={{ 
                              fontSize: '11px', 
                              fontWeight: '900', 
                              color: '#fff', 
                              backgroundColor: '#e67e22',
                              margin: '-12px -12px 10px -12px',
                              padding: '6px 12px',
                              borderRadius: '8px 8px 0 0',
                              textAlign: 'center',
                              textTransform: 'uppercase', 
                              letterSpacing: '1px' 
                            }}>
                              {attemptLabel}
                            </div>
                          )}
                          
                          {row1.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row1.length}, 1fr)`, gap: '6px', marginBottom: '6px' }}>{row1.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}</div>}
                          {row2.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row2.length}, 1fr)`, gap: '6px', marginBottom: '6px' }}>{row2.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}</div>}
                          
                          {row3.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row3.length}, 1fr)`, gap: '6px', marginBottom: '6px' }}>
                              {row3.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}
                            </div>
                          )}
                          
                          {row4.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row4.length}, 1fr)`, gap: '6px', marginBottom: '6px' }}>{row4.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}</div>}
                          
                          {qp.reportedBy && (
                            <div style={{ marginTop: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textAlign: 'center' }}>Reported By: <span style={{ color: '#1e293b', fontWeight: '800', fontSize: '13px' }}>{(() => {
                                // Display full name if reportedByUser object is available, otherwise use reportedBy string
                                const reportedByUser = (qp as any).reportedByUser;
                                if (reportedByUser && reportedByUser.fullName) {
                                  return toTitleCase(reportedByUser.fullName);
                                }
                                return toTitleCase(qp.reportedBy);
                              })()}</span></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
                </div>

                {/* RIGHT SIDE: Cooking History */}
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#1565c0', borderBottom: '2px solid #1565c0', paddingBottom: '6px', fontWeight: '800' }}>🍳 Cooking History & Remarks</h4>
                  {(() => {
                const cr = (detailEntry as any).cookingReport;
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
                                <th style={{ textAlign: 'center', padding: '8px 4px', fontWeight: '800', width: '30px', border: '1px solid #e2e8f0' }}>No</th>
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
                                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ textAlign: 'center', padding: '8px 4px', fontWeight: '700', color: '#64748b', border: '1px solid #e2e8f0' }}>{idx + 1}.</td>
                                    <td style={{ padding: '8px 4px', border: '1px solid #e2e8f0' }}>
                                      <span style={{ background: statusBg, color: statusColor, padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '800' }}>
                                        {statusString}
                                      </span>
                                    </td>
                                    <td style={{ padding: '8px 4px', color: '#334155', border: '1px solid #e2e8f0' }}>
                                      <div style={{ fontWeight: '700', fontSize: '12px' }}>{h.doneBy ? getCollectorLabel(String(h.doneBy)) : '-'}</div>
                                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>{formatShortDateTime(h.doneDate) || '-'}</div>
                                    </td>
                                    <td style={{ padding: '8px 4px', color: '#334155', border: '1px solid #e2e8f0' }}>
                                      <div style={{ fontWeight: '700', fontSize: '12px' }}>{h.approvedBy ? getCollectorLabel(String(h.approvedBy)) : '-'}</div>
                                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>{formatShortDateTime(h.approvedDate) || '-'}</div>
                                    </td>
                                    <td style={{ padding: '8px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                      {h.remarks ? (
                                        <button
                                          onClick={() => setRemarksPopup({ isOpen: true, text: String(h.remarks || '') })}
                                          style={{ border: '1px solid #90caf9', background: '#e3f2fd', color: '#1565c0', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
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
                      <div style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>No cooking history available.</div>
                    )}
                  </div>
                );
              })()}

                </div>
              </div>

              <button onClick={() => setDetailEntry(null)}
                style={{ marginTop: '20px', width: '100%', padding: '12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(231, 76, 60, 0.2)' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPhotoOnlyModal && photoOnlyEntry && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '16px' }}
          onClick={() => { setShowPhotoOnlyModal(false); setPhotoOnlyEntry(null); }}>
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#1f2937', marginBottom: '10px' }}>Upload Photos</div>
            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '12px' }}>
              Party: <b>{toTitleCase(photoOnlyEntry.partyName || '') || '-'}</b> | Location: <b>{toTitleCase(photoOnlyEntry.location || '') || '-'}</b>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px' }}>Godown Image</label>
                <input type="file" accept="image/*" onChange={(e) => setGodownImage(e.target.files?.[0] || null)} style={{ width: '100%', fontSize: '11px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px' }}>Paddy Lot Image</label>
                <input type="file" accept="image/*" onChange={(e) => setPaddyLotImage(e.target.files?.[0] || null)} style={{ width: '100%', fontSize: '11px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { setShowPhotoOnlyModal(false); setPhotoOnlyEntry(null); }}
                style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePhotoOnlyUpload}
                disabled={isSubmitting}
                style={{ padding: '8px 14px', border: 'none', borderRadius: '4px', background: isSubmitting ? '#95a5a6' : '#2e7d32', color: 'white', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 700 }}
              >
                {isSubmitting ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
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
          Page {page} of {totalPages} &nbsp;({totalEntries} total)
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          style={{ padding: '6px 16px', borderRadius: '4px', border: '1px solid #ccc', background: page >= totalPages ? '#eee' : '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontWeight: '600' }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default SampleEntryPage;
