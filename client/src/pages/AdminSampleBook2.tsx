import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { toast } from '../utils/toast';

/**
 * AdminSampleBook2 — Broker-Grouped Sample Book
 * Same data as AdminSampleBook but rendered in the staff-style
 * broker-grouped design (date bar → red broker bar → table).
 */

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
    lorryNumber?: string;
    entryType?: string;
    sampleCollectedBy?: string;
    workflowStatus: string;
    lotSelectionDecision?: string;
    lotSelectionAt?: string;
    resampleStartAt?: string;
    qualityReportAttempts?: number;
    qualityAttemptDetails?: any[];
    qualityParameters?: {
        moisture: number;
        cutting1: number;
        cutting2: number;
        bend: number;
        bend1: number;
        bend2: number;
        mixS: number;
        mixL: number;
        mix: number;
        kandu: number;
        oil: number;
        sk: number;
        grainsCount: number;
        wbR: number;
        wbBk: number;
        wbT: number;
        paddyWb: number;
        smellHas?: boolean;
        smellType?: string | null;
        reportedBy: string;
        uploadFileUrl?: string;
    };
    cookingReport?: {
        status: string;
        cookingResult: string;
        recheckCount?: number;
        remarks?: string;
        cookingDoneBy?: string;
        cookingApprovedBy?: string;
        updatedAt?: string;
        createdAt?: string;
        history?: Array<{
            date?: string | null;
            status?: string | null;
            cookingDoneBy?: string | null;
            approvedBy?: string | null;
            remarks?: string | null;
        }>;
    };
    offering?: {
        finalPrice?: number;
        offeringPrice?: number;
        offerBaseRateValue?: number;
        baseRateType?: string;
        baseRateUnit?: string;
        finalBaseRate?: number;
        finalBaseRateType?: string;
        finalBaseRateUnit?: string;
        finalSute?: number;
        finalSuteUnit?: string;
        sute?: number;
        suteUnit?: string;
        moistureValue?: number;
        hamali?: number;
        hamaliUnit?: string;
        brokerage?: number;
        brokerageUnit?: string;
        lf?: number;
        lfUnit?: string;
        egbType?: string;
        egbValue?: number;
        cdEnabled?: boolean;
        cdValue?: number;
        cdUnit?: string;
        bankLoanEnabled?: boolean;
        bankLoanValue?: number;
        bankLoanUnit?: string;
        paymentConditionValue?: number;
        paymentConditionUnit?: string;
        offerVersions?: Array<{
            key: string;
            offerBaseRateValue?: number;
            baseRateType?: string;
            baseRateUnit?: string;
            offeringPrice?: number;
            finalPrice?: number;
            finalBaseRate?: number;
            moistureValue?: number;
            hamali?: number;
            hamaliUnit?: string;
            brokerage?: number;
            brokerageUnit?: string;
            lf?: number;
            lfUnit?: string;
            egbType?: string;
            egbValue?: number;
            cdValue?: number;
            cdUnit?: string;
            bankLoanValue?: number;
            bankLoanUnit?: string;
            paymentConditionValue?: number;
            paymentConditionUnit?: string;
        }>;
    };
    creator?: { username: string };
    staffEntryEditAllowance?: number;
    staffQualityEditAllowance?: number;
    entryEditApprovalStatus?: string | null;
    entryEditApprovalReason?: string | null;
    entryEditApprovalRequestedAt?: string | null;
    entryEditApprovalRequestedByName?: string | null;
    qualityEditApprovalStatus?: string | null;
    qualityEditApprovalReason?: string | null;
    qualityEditApprovalRequestedAt?: string | null;
    qualityEditApprovalRequestedByName?: string | null;
}

const toTitleCase = (str: string) => str ? str.replace(/\b\w/g, c => c.toUpperCase()) : '';
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
const getPartyLabel = (entry: SampleEntry) => {
    const partyNameText = toTitleCase(entry.partyName || '').trim();
    const lorryText = entry.lorryNumber ? entry.lorryNumber.toUpperCase() : '';
    if (entry.entryType === 'DIRECT_LOADED_VEHICLE') return lorryText || partyNameText || '-';
    return partyNameText || lorryText || '-';
};
const getPartyDisplayParts = (entry: SampleEntry) => {
    const partyNameText = toTitleCase(entry.partyName || '').trim();
    const lorryText = entry.lorryNumber ? entry.lorryNumber.toUpperCase() : '';
    
    // FIXED: For DIRECT_LOADED_VEHICLE with empty partyName, use lorryNumber as primary label
    if (entry.entryType === 'DIRECT_LOADED_VEHICLE' && !partyNameText && lorryText) {
        return {
            label: lorryText,
            lorryText,
            showLorrySecondLine: false
        };
    }
    
    return {
        label: partyNameText || lorryText || '-',
        lorryText,
        showLorrySecondLine: entry.entryType === 'DIRECT_LOADED_VEHICLE'
            && !!partyNameText
            && !!lorryText
            && partyNameText.toUpperCase() !== lorryText
    };
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
const formatToggleUnitLabel = (value?: string) => value === 'per_quintal'
    ? 'Per Qtl'
    : value === 'percentage'
        ? '%'
        : value === 'lumps'
            ? 'Lumps'
            : value === 'per_kg'
                ? 'Per Kg'
                : 'Per Bag';
const formatShortDateTime = (value?: string | null) => {
    if (!value) return '';
    try {
        return new Date(value).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return '';
    }
};
const getTimeValue = (value?: string | null) => {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
};
const formatDateInputValue = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const hasAlphaOrPositiveValue = (val: any) => {
  if (val === null || val === undefined || val === '') return false;
  const raw = String(val).trim();
  if (!raw) return false;
  if (/[a-zA-Z]/.test(raw)) return true;
  const num = parseFloat(raw);
  return Number.isFinite(num);
};
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

const getResampleRoundLabel = (attempts: number) => {
    if (attempts <= 1) return '';
    return `Re-sample Round ${attempts}`;
};
const getSamplingLabel = (attemptNo: number) => {
    if (attemptNo <= 1) return '1st';
    if (attemptNo === 2) return '2nd';
    if (attemptNo === 3) return '3rd';
    return `${attemptNo}th`;
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

interface AdminSampleBook2Props {
    entryType?: string;
    excludeEntryType?: string;
}

type PricingDetailState = {
    entry: SampleEntry;
    mode: 'offer' | 'final';
};
type SupervisorUser = {
    id: number;
    username: string;
    fullName?: string | null;
};

const AdminSampleBook2: React.FC<AdminSampleBook2Props> = ({ entryType, excludeEntryType }) => {
    const isRiceBook = entryType === 'RICE_SAMPLE';
    const tableMinWidth = isRiceBook ? '100%' : '1500px';
    const [entries, setEntries] = useState<SampleEntry[]>([]);
    const [approvalEntries, setApprovalEntries] = useState<SampleEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [supervisors, setSupervisors] = useState<SupervisorUser[]>([]);
    const [activeView, setActiveView] = useState<'sample-book' | 'edit-approvals'>('sample-book');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const PAGE_SIZE = 100;

    // Filters
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterBroker, setFilterBroker] = useState('');

    // Detail popup
    const [detailEntry, setDetailEntry] = useState<SampleEntry | null>(null);
    const [detailMode, setDetailMode] = useState<'summary' | 'history'>('summary');
    const [pricingDetail, setPricingDetail] = useState<PricingDetailState | null>(null);
    const [remarksPopup, setRemarksPopup] = useState<{ isOpen: boolean; text: string }>({ isOpen: false, text: '' });
    const [recheckModal, setRecheckModal] = useState<{ isOpen: boolean; entry: SampleEntry | null }>({ isOpen: false, entry: null });
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
    const getCollectorLabel = (value?: string | null) => {
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
    const getCollectedByDisplay = (entry: SampleEntry) => {
        const creatorLabel = getCreatorLabel(entry);
        const fallbackCollector = [
            entry.sampleCollectedBy,
            ...(((entry as any)?.resampleCollectedHistory || []) as string[]),
            ...(((entry as any)?.sampleCollectedHistory || []) as string[])
        ].find((value) => typeof value === 'string' && value.trim() !== '');
        const collectorLabel = getCollectorLabel(fallbackCollector || null);
        const isResample = String((entry as any)?.lotSelectionDecision || '').toUpperCase() === 'FAIL' || Boolean((entry as any)?.resampledLotId);
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

    const handleRecheck = async (type: string) => {
        if (!recheckModal.entry) return;
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/sample-entries/${recheckModal.entry.id}/recheck`, { recheckType: type }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success((response.data as any).message || 'Recheck initiated successfully');
            setRecheckModal({ isOpen: false, entry: null });
            loadEntries();
        } catch (error: any) {
            console.error('Failed to initiate recheck', error);
            const msg = error.response?.data?.error || 'Failed to initiate recheck';
            toast.error(msg);
        }
    };

    useEffect(() => {
        const loadSupervisors = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/sample-entries/paddy-supervisors`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = response.data as any;
                const users = Array.isArray(data) ? data : (data.users || []);
                setSupervisors(users.filter((u: any) => u && u.username));
            } catch (error) {
                console.error('Error loading supervisors:', error);
            }
        };
        loadSupervisors();
    }, []);

    useEffect(() => {
        loadEntries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    useEffect(() => {
        if (activeView === 'edit-approvals') {
            loadApprovalEntries();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeView]);

    const loadEntries = async (fFrom?: string, fTo?: string, fBroker?: string) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const params: any = { page, pageSize: PAGE_SIZE };

            const dFrom = fFrom !== undefined ? fFrom : filterDateFrom;
            const dTo = fTo !== undefined ? fTo : filterDateTo;
            const b = fBroker !== undefined ? fBroker : filterBroker;

            if (dFrom) params.startDate = dFrom;
            if (dTo) params.endDate = dTo;
            if (b) params.broker = b;
            if (entryType) params.entryType = entryType;
            if (excludeEntryType) params.excludeEntryType = excludeEntryType;

            const response = await axios.get(`${API_URL}/sample-entries/ledger/all`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data as any;
            setEntries(data.entries || []);
            if (data.total != null) {
                setTotal(data.total);
                setTotalPages(data.totalPages || Math.ceil(data.total / PAGE_SIZE));
            }
        } catch (error) {
            console.error('Failed to load entries', error);
        } finally {
            setLoading(false);
        }
    };
    const loadApprovalEntries = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/sample-entries/tabs/edit-approvals`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const nextEntries = (response.data as any)?.entries || [];
            setApprovalEntries(nextEntries);
        } catch (error) {
            console.error('Error loading edit approvals:', error);
            toast.error('Failed to load edit approvals');
        } finally {
            setLoading(false);
        }
    };
    const handleApprovalDecision = async (entry: SampleEntry, type: 'entry' | 'quality', decision: 'approve' | 'reject') => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/sample-entries/${entry.id}/edit-approval-decision`, { type, decision }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`${type === 'quality' ? 'Quality' : 'Entry'} edit request ${decision}d`);
            loadApprovalEntries();
            loadEntries();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update approval request');
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

    const handleQuickDateFilter = (preset: 'today' | 'yesterday' | 'last7') => {
        const endDate = new Date();
        const startDate = new Date(endDate);

        if (preset === 'today') {
            // keep today only
        } else if (preset === 'yesterday') {
            startDate.setDate(startDate.getDate() - 1);
            endDate.setDate(endDate.getDate() - 1);
        } else {
            startDate.setDate(startDate.getDate() - 6);
        }

        const startValue = formatDateInputValue(startDate);
        const endValue = formatDateInputValue(endDate);
        setFilterDateFrom(startValue);
        setFilterDateTo(endValue);
        setPage(1);
        setTimeout(() => {
            loadEntries(startValue, endValue, filterBroker);
        }, 0);
    };

    const filteredEntries = useMemo(() => {
        if (isRiceBook) {
            return entries.filter((entry) => {
                const qp = entry.qualityParameters;
                const hasQuality = qp && isProvidedNumeric((qp as any).moistureRaw, qp.moisture) && (
                    isProvidedNumeric((qp as any).cutting1Raw, qp.cutting1)
                    || isProvidedNumeric((qp as any).bend1Raw, qp.bend1)
                    || isProvidedAlpha((qp as any).mixRaw, qp.mix)
                    || isProvidedAlpha((qp as any).mixSRaw, qp.mixS)
                    || isProvidedAlpha((qp as any).mixLRaw, qp.mixL)
                    || isProvidedAlpha((qp as any).skRaw, qp.sk)
                );
                return !!hasQuality;
            });
        }

        return entries.filter((entry) => {
            const qp = entry.qualityParameters as any;
            const hasQualityRecord = !!(qp && (qp.reportedBy || qp.id));
            if (!hasQualityRecord) return true; // Pending entries should show
            const hasMoisture = qp && isProvidedNumeric(qp.moistureRaw, qp.moisture);
            const hasGrains = qp && isProvidedNumeric(qp.grainsCountRaw, qp.grainsCount);
            if (!hasMoisture || !hasGrains) return true; // Pending (partial) shows
            const hasCutting1 = qp && isProvidedNumeric(qp.cutting1Raw, qp.cutting1);
            const hasCutting2 = qp && isProvidedNumeric(qp.cutting2Raw, qp.cutting2);
            const hasBend1 = qp && isProvidedNumeric(qp.bend1Raw, qp.bend1);
            const hasBend2 = qp && isProvidedNumeric(qp.bend2Raw, qp.bend2);
            const hasMix = qp && isProvidedAlpha(qp.mixRaw, qp.mix);
            const hasKandu = qp && isProvidedAlpha(qp.kanduRaw, qp.kandu);
            const hasOil = qp && isProvidedAlpha(qp.oilRaw, qp.oil);
            const hasSk = qp && isProvidedAlpha(qp.skRaw, qp.sk);
            const hasAnyDetail = hasCutting1 || hasCutting2 || hasBend1 || hasBend2 || hasMix || hasKandu || hasOil || hasSk;
            if (!hasAnyDetail) return true; // 100g completed
            const isFullQuality = hasCutting1 && hasCutting2 && hasBend1 && hasBend2 && hasMix && hasKandu && hasOil && hasSk;
            return true; // Pending (partial) shows
        });
    }, [entries, isRiceBook]);

    // Get unique brokers
    const brokersList = useMemo(() => {
        return Array.from(new Set(filteredEntries.map(e => e.brokerName))).sort();
    }, [filteredEntries]);

    // Group entries by date then broker
    const groupedEntries = useMemo(() => {
        const sorted = [...filteredEntries].sort((a, b) => {
            const dateA = new Date(a.entryDate).getTime();
            const dateB = new Date(b.entryDate).getTime();
            if (dateA !== dateB) return dateB - dateA; // Primary sort: Date DESC
            const serialA = Number.isFinite(Number(a.serialNo)) ? Number(a.serialNo) : null;
            const serialB = Number.isFinite(Number(b.serialNo)) ? Number(b.serialNo) : null;
            if (serialA !== null && serialB !== null && serialA !== serialB) return serialA - serialB;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // Secondary sort: CreatedAt ASC for stable Sl No
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
    }, [filteredEntries]);

    // Status badge helper
    const normalizeCookingStatusLabel = (status?: string | null) => {
        const normalized = String(status || '').trim().toUpperCase();
        if (normalized === 'PASS' || normalized === 'OK') return 'Pass';
        if (normalized === 'MEDIUM') return 'Medium';
        if (normalized === 'FAIL') return 'Fail';
        if (normalized === 'RECHECK') return 'Recheck';
        if (normalized === 'RECHECKING') return 'Rechecking';
        if (normalized === 'PENDING') return 'Pending';
        return normalized ? toTitleCase(normalized.toLowerCase()) : 'Pending';
    };

    const getQualityTypeLabel = (attempt: any) => {
        if (!attempt) return 'Pending';
        const hasFullQuality = isProvidedNumeric((attempt as any).cutting1Raw, attempt.cutting1)
            || isProvidedNumeric((attempt as any).bend1Raw, attempt.bend1)
            || isProvidedAlpha((attempt as any).mixRaw, attempt.mix)
            || isProvidedAlpha((attempt as any).mixSRaw, attempt.mixS)
            || isProvidedAlpha((attempt as any).mixLRaw, attempt.mixL);
        const has100g = isProvidedNumeric((attempt as any).grainsCountRaw, attempt.grainsCount);
        if (hasFullQuality) return 'Done';
        if (has100g) return '100-Gms';
        return 'Pending';
    };

    const getQualityTypeStyle = (label: string) => {
        if (label === 'Done') return { bg: '#c8e6c9', color: '#2e7d32' };
        if (label === '100-Gms') return { bg: '#fff8e1', color: '#f57f17' };
        if (label === 'Recheck') return { bg: '#e3f2fd', color: '#1565c0' };
        if (label === 'Resample') return { bg: '#fff3e0', color: '#ef6c00' };
        return { bg: '#f5f5f5', color: '#666' };
    };

    const getStatusStyle = (label: string) => {
        if (label === 'Pass') return { bg: '#a5d6a7', color: '#1b5e20' };
        if (label === 'Pass Without Cooking') return { bg: '#e3f2fd', color: '#1565c0' };
        if (label === 'Medium') return { bg: '#ffe0b2', color: '#f39c12' };
        if (label === 'Fail') return { bg: '#ffcdd2', color: '#b71c1c' };
        if (label === 'Recheck' || label === 'Rechecking') return { bg: '#e3f2fd', color: '#1565c0' };
        if (label === 'Resample' || label === 'Resampling') return { bg: '#fff3e0', color: '#ef6c00' };
        return { bg: '#ffe0b2', color: '#e65100' };
    };

    const mapQualityDecisionToStatus = (decision: string | null | undefined) => {
        const key = String(decision || '').toUpperCase();
        if (key === 'FAIL') return 'Fail';
        if (key.startsWith('PASS') || key === 'SOLDOUT') return 'Pass';
        return 'Pending';
    };

const buildQualityStatusRows = (entry: SampleEntry) => {
        const attemptsSorted = getQualityAttemptsForEntry(entry);
        const isHardFailed = String(entry.workflowStatus || '').toUpperCase() === 'FAILED';
        const isFailDecision = String(entry.lotSelectionDecision || '').toUpperCase() === 'FAIL' && String(entry.workflowStatus || '').toUpperCase() !== 'FAILED';
        const isQualityRecheckPending = (entry as any).qualityPending === true
            || ((entry as any).qualityPending == null && (entry as any).recheckRequested === true && (entry as any).recheckType !== 'cooking');
        const isCookingOnlyRecheck = (entry as any).cookingPending === true && !isQualityRecheckPending;
        const previousDecision = (entry as any).recheckPreviousDecision || null;
        const hasCookingHistory = buildCookingStatusRows(entry).length > 0;
        const isCookingDrivenResample = String(entry.lotSelectionDecision || '').toUpperCase() === 'FAIL' && hasCookingHistory;
        const hasCurrentResampleQuality = attemptsSorted.length > 1;
        
        // FIXED: Check if resample quality is complete (has all required fields)
        const hasCompleteResampleQuality = hasCurrentResampleQuality && attemptsSorted.length >= 2 && (() => {
            const latestAttempt = attemptsSorted[attemptsSorted.length - 1];
            return isProvidedNumeric((latestAttempt as any).moistureRaw, latestAttempt.moisture)
                && isProvidedNumeric((latestAttempt as any).grainsCountRaw, latestAttempt.grainsCount)
                && (
                    isProvidedNumeric((latestAttempt as any).cutting1Raw, latestAttempt.cutting1)
                    || isProvidedNumeric((latestAttempt as any).bend1Raw, latestAttempt.bend1)
                    || isProvidedAlpha((latestAttempt as any).mixRaw, latestAttempt.mix)
                    || isProvidedAlpha((latestAttempt as any).mixSRaw, latestAttempt.mixS)
                    || isProvidedAlpha((latestAttempt as any).mixLRaw, latestAttempt.mixL)
                );
        })();
        
        const rows = attemptsSorted.map((attempt: any, idx: number) => {
            const isLast = idx === attemptsSorted.length - 1;
            let status = mapQualityDecisionToStatus(entry.lotSelectionDecision);

            // LINE-WISE logic: 1st attempt stays Pass, only the failed attempt shows Fail
            if (isHardFailed && attemptsSorted.length > 1) {
                status = isLast ? 'Fail' : 'Pass';
            } else if (isFailDecision) {
                if (attemptsSorted.length <= 1) {
                    status = 'Pass';
                } else {
                    status = isLast ? 'Pending' : 'Pass';
                }
            } else if (isLast && isQualityRecheckPending && !isCookingOnlyRecheck) {
                status = mapQualityDecisionToStatus(previousDecision || entry.lotSelectionDecision);
            } else if (isLast && isCookingDrivenResample) {
                status = 'Pass';
            }

            return {
                type: getQualityTypeLabel(attempt),
                status
            };
        });

        if (rows.length === 0) {
            if (isFailDecision) {
                return [{ type: 'Pending', status: 'Resampling' }];
            }
            if (isQualityRecheckPending && !isCookingOnlyRecheck) {
                return [{ type: 'Recheck', status: 'Rechecking' }];
            }
            return [];
        }

        // FIXED: Show resample status correctly
        // If FAIL decision and no resample quality yet, show "Pending/Resampling"
        if (isFailDecision && !hasCurrentResampleQuality) {
            rows.push({ type: 'Pending', status: 'Resampling' });
        } 
        // If FAIL decision and resample quality exists but only 1 row (shouldn't happen but handle it)
        else if (isFailDecision && hasCurrentResampleQuality && rows.length === 1) {
            rows.unshift({ type: 'Done', status: 'Pass' });
        }
        // If FAIL decision and resample quality is complete, don't add extra row (it's already in rows)
        // The entry should now show in "Resample Pending" with the latest quality status
        else if (isQualityRecheckPending && !isCookingOnlyRecheck) {
            rows.push({ type: 'Recheck', status: 'Rechecking' });
        } else if (isCookingDrivenResample && !hasCurrentResampleQuality && attemptsSorted.length <= 1 && String(entry.workflowStatus || '').toUpperCase() !== 'FAILED') {
            rows.push({ type: 'Pending', status: 'Resampling' });
        }

        return rows;
    };

    const buildCookingStatusRows = (entry: SampleEntry) => {
        const cr = entry.cookingReport;
        const d = entry.lotSelectionDecision;
        const isCookingRecheckPending = (entry as any).cookingPending === true
            || ((entry as any).cookingPending == null && (entry as any).recheckRequested === true && (entry as any).recheckType === 'cooking');
        const isQualityOnlyRecheck = (entry as any).qualityPending === true && !isCookingRecheckPending;

        if (d === 'PASS_WITHOUT_COOKING') {
            return [];
        }

        const toTs = (value: any) => {
            if (!value) return 0;
            const time = new Date(value).getTime();
            return Number.isFinite(time) ? time : 0;
        };

        const historyRaw = Array.isArray(cr?.history) ? cr!.history : [];
        const history = [...historyRaw].sort((a, b) => toTs((a as any)?.date || (a as any)?.updatedAt || (a as any)?.createdAt || '') - toTs((b as any)?.date || (b as any)?.updatedAt || (b as any)?.createdAt || ''));
        const rows: Array<{ status: string; remarks: string; doneBy: string; doneDate: any; approvedBy: string; approvedDate: any; }> = [];
        let pendingDone: { doneBy: string; doneDate: any; remarks: string } | null = null as { doneBy: string; doneDate: any; remarks: string } | null;

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
                rows.push({
                    status: normalizeCookingStatusLabel(h.status),
                    remarks: String(h?.remarks || '').trim(),
                    doneBy: pendingDone?.doneBy || doneByValue || String(cr?.cookingDoneBy || '').trim(),
                    doneDate: pendingDone?.doneDate || doneDateValue,
                    approvedBy: String(h?.approvedBy || h?.cookingApprovedBy || cr?.cookingApprovedBy || '').trim(),
                    approvedDate: h?.approvedDate || h?.cookingApprovedAt || h?.date || null
                });
                pendingDone = null;
            }
        });

        if (rows.length === 0 && cr?.status) {
            rows.push({
                status: normalizeCookingStatusLabel(cr.status),
                remarks: String(cr.remarks || '').trim(),
                doneBy: String(cr.cookingDoneBy || '').trim(),
                doneDate: (cr as any)?.doneDate || (cr as any)?.cookingDoneAt || (cr as any)?.date || cr.updatedAt || cr.createdAt || null,
                approvedBy: String(cr.cookingApprovedBy || '').trim(),
                approvedDate: (cr as any)?.approvedDate || (cr as any)?.cookingApprovedAt || (cr as any)?.date || cr.updatedAt || cr.createdAt || null
            });
        }

        if (pendingDone) {
            rows.push({
                status: 'Pending',
                remarks: pendingDone.remarks,
                doneBy: pendingDone.doneBy,
                doneDate: pendingDone.doneDate,
                approvedBy: '',
                approvedDate: null
            });
        } else if (isCookingRecheckPending && !isQualityOnlyRecheck) {
            const lastRow = rows.length > 0 ? rows[rows.length - 1] : null;
            if (!lastRow || (lastRow.status !== 'Recheck' && lastRow.status !== 'Pending')) {
                rows.push({
                    status: 'Recheck',
                    remarks: String(cr?.remarks || '').trim(),
                    doneBy: '',
                    doneDate: null,
                    approvedBy: '',
                    approvedDate: null
                });
            }
        }

        return rows;
    };

    const cookingBadge = (entry: SampleEntry) => {
        if (entry.lotSelectionDecision === 'PASS_WITHOUT_COOKING') {
            return <span style={{ color: '#999', fontSize: '10px' }}>-</span>;
        }

        const rows = buildCookingStatusRows(entry);
        const qualityAttempts = getQualityAttemptsForEntry(entry);
        const shouldPrefixPassWithoutCooking =
            String(entry.lotSelectionDecision || '').toUpperCase() === 'FAIL'
            && qualityAttempts.length > 1
            && rows.length === 1
            && rows[0]?.status !== 'Pass Without Cooking';
        const displayRows = shouldPrefixPassWithoutCooking
            ? [{ status: 'Pass Without Cooking', remarks: '', doneBy: '', doneDate: null, approvedBy: '', approvedDate: null }, ...rows]
            : rows;
        if (displayRows.length === 0) return null;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', width: '100%' }}>
                {displayRows.map((row, idx) => {
                    const style = getStatusStyle(row.status);
                    return (
                        <div key={`${entry.id}-cook-status-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
                            <span style={{ fontSize: '9px', fontWeight: '800', color: '#334155' }}>
                                {getSamplingLabel(idx + 1)}
                            </span>
                            <span style={{ background: style.bg, color: style.color, padding: '1px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: '700' }}>
                                {row.status}
                            </span>
                            {row.remarks ? (
                                <button
                                    type="button"
                                    onClick={() => setRemarksPopup({ isOpen: true, text: row.remarks })}
                                    style={{ color: '#8e24aa', fontSize: '9px', fontWeight: '700', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}
                                >
                                    Remarks
                                </button>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        );
    };

    const qualityBadge = (entry: SampleEntry) => {
        const rows = buildQualityStatusRows(entry);

        if (rows.length === 0) {
            return <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}><span style={{ background: '#f5f5f5', color: '#c62828', padding: '2px 6px', borderRadius: '10px', fontSize: '9px' }}>Pending</span></div>;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                {rows.map((row, idx) => {
                    const typeStyle = getQualityTypeStyle(row.type);
                    const statusStyle = getStatusStyle(row.status);
                    return (
                        <div key={`${entry.id}-quality-row-${idx}`} style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '9px', fontWeight: '800', color: '#334155' }}>
                                {getSamplingLabel(idx + 1)}
                            </span>
                            <span style={{ background: typeStyle.bg, color: typeStyle.color, padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: '700' }}>{row.type}</span>
                            <span style={{ background: statusStyle.bg, color: statusStyle.color, padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: '700' }}>{row.status}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const openEntryDetail = (entry: SampleEntry) => {
        const qualityAttempts = getQualityAttemptsForEntry(entry);
        const hasQualityHistory = qualityAttempts.length > 1;
        const hasCookingHistory = buildCookingStatusRows(entry).length > 1;
        const isRecheckPending = (entry as any).qualityPending === true
            || (entry as any).cookingPending === true
            || (entry as any).recheckRequested === true;
        const isResampleEntry = String(entry.lotSelectionDecision || '').toUpperCase() === 'FAIL'
            && String(entry.workflowStatus || '').toUpperCase() !== 'FAILED';
        setDetailMode(hasQualityHistory || hasCookingHistory || isRecheckPending || isResampleEntry ? 'history' : 'summary');
        setDetailEntry(entry);
    };

    const getWorkflowStatusMeta = (status?: string | null) => {
        const key = String(status || '').trim().toUpperCase();
        const colors: Record<string, { bg: string; color: string; label: string }> = {
            STAFF_ENTRY: { bg: '#fff8e1', color: '#f57f17', label: 'Pending' },
            QUALITY_CHECK: { bg: '#fff8e1', color: '#e65100', label: 'Pending' },
            LOT_SELECTION: { bg: '#fff8e1', color: '#f57f17', label: 'Pending' },
            COOKING_REPORT: { bg: '#fff8e1', color: '#f57f17', label: 'Pending' },
            FINAL_REPORT: { bg: '#fff8e1', color: '#283593', label: 'Pending' },
            LOT_ALLOTMENT: { bg: '#fff8e1', color: '#006064', label: 'Pending' },
            PENDING_ALLOTTING_SUPERVISOR: { bg: '#fff8e1', color: '#880e4f', label: 'Pending' },
            PHYSICAL_INSPECTION: { bg: '#ffe0b2', color: '#bf360c', label: 'Physical Inspection' },
            INVENTORY_ENTRY: { bg: '#f1f8e9', color: '#33691e', label: 'Inventory Entry' },
            COMPLETED: { bg: '#c8e6c9', color: '#1b5e20', label: 'Completed' },
            FAILED: { bg: '#ffcdd2', color: '#b71c1c', label: 'Failed' }
        };
        return colors[key] || {
            bg: '#f5f5f5',
            color: '#666',
            label: key ? toTitleCase(key.toLowerCase().replace(/_/g, ' ')) : 'Pending'
        };
    };

    const statusBadge = (entry: SampleEntry) => {
        const qp = entry.qualityParameters as any;
        const qualityRows = buildQualityStatusRows(entry);
        const cookingRows = buildCookingStatusRows(entry);
        const latestQuality = qualityRows.length > 0 ? qualityRows[qualityRows.length - 1] : null;
        const latestCooking = cookingRows.length > 0 ? cookingRows[cookingRows.length - 1] : null;
        const hasDetailedQuality = !!(qp
            && isProvidedNumeric((qp as any).cutting1Raw, qp.cutting1)
            && isProvidedNumeric((qp as any).cutting2Raw, qp.cutting2)
            && isProvidedNumeric((qp as any).bend1Raw, qp.bend1)
            && isProvidedNumeric((qp as any).bend2Raw, qp.bend2)
            && isProvidedAlpha((qp as any).mixRaw, qp.mix)
            && isProvidedAlpha((qp as any).kanduRaw, qp.kandu)
            && isProvidedAlpha((qp as any).oilRaw, qp.oil)
            && isProvidedAlpha((qp as any).skRaw, qp.sk));
        const has100GmsOnly = !!(
            qp
            && isProvidedNumeric((qp as any).moistureRaw, qp.moisture)
            && isProvidedNumeric((qp as any).grainsCountRaw, qp.grainsCount)
            && !hasDetailedQuality
        );
        const statusRows: Array<{ label: string; bg: string; color: string }> = [];

        if (entry.lotSelectionDecision === 'SOLDOUT' || (entry.workflowStatus === 'COMPLETED' && (entry.offering?.finalPrice || entry.offering?.finalBaseRate))) {
            statusRows.push({ label: 'Sold Out', bg: '#800000', color: '#ffffff' });
        } else if (entry.workflowStatus === 'FAILED' || latestCooking?.status === 'Fail' || latestQuality?.status === 'Fail') {
            statusRows.push({ label: 'Fail', bg: '#ffcdd2', color: '#b71c1c' });
        } else if (entry.lotSelectionDecision === 'FAIL' && entry.workflowStatus !== 'FAILED') {
            statusRows.push({ label: 'Resample', bg: '#fff3e0', color: '#f57c00' });
        } else if (
            entry.lotSelectionDecision === 'PASS_WITHOUT_COOKING'
            || (entry.lotSelectionDecision === 'PASS_WITH_COOKING' && (latestCooking?.status === 'Pass' || latestCooking?.status === 'Medium'))
        ) {
            statusRows.push({ label: has100GmsOnly ? '100-Gms Done' : 'Pass', bg: has100GmsOnly ? '#fff8e1' : '#c8e6c9', color: has100GmsOnly ? '#f57f17' : '#1b5e20' });
        } else if (latestQuality?.type === '100-Gms') {
            statusRows.push({ label: '100-Gms Done', bg: '#fff8e1', color: '#f57f17' });
        } else if (latestQuality?.type === 'Done' && entry.workflowStatus !== 'STAFF_ENTRY') {
            statusRows.push({ label: 'Pending', bg: '#fff8e1', color: '#f57f17' });
        } else {
            statusRows.push(getWorkflowStatusMeta(entry.workflowStatus));
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                {statusRows.map((row, idx) => (
                    <span
                        key={`${entry.id}-status-${idx}`}
                        style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            backgroundColor: row.bg,
                            color: row.color,
                            fontWeight: '700',
                            lineHeight: '1.15',
                            whiteSpace: 'normal',
                            textAlign: 'center'
                        }}
                    >
                        {row.label}
                    </span>
                ))}
            </div>
        );
    };

    const getChargeText = (value?: number, unit?: string) => {
        if (value === null || value === undefined || Number(value) === 0) return '-';
        return `${toNumberText(value)} / ${formatToggleUnitLabel(unit)}`;
    };

    const getOfferRateText = (offering?: SampleEntry['offering']) => {
        if (!offering) return '-';
        const rateValue = offering.offerBaseRateValue ?? offering.offeringPrice;
        if (!rateValue) return '-';
        const typeText = offering.baseRateType ? offering.baseRateType.replace(/_/g, '/') : '-';
        return `Rs ${toNumberText(rateValue)} / ${typeText} / ${formatRateUnitLabel(offering.baseRateUnit)}`;
    };
    const getOfferSlotLabel = (key?: string | null) => {
        const match = String(key || '').toUpperCase().match(/(\d+)/);
        return match ? `Offer ${match[1]}` : 'Offer';
    };
    const getLatestOfferVersion = (offering?: SampleEntry['offering']) => {
        if (!offering) return null;
        const versions = Array.isArray(offering.offerVersions)
            ? offering.offerVersions.filter((version) => version?.offerBaseRateValue || version?.offeringPrice)
            : [];
        if (versions.length > 0) return versions[versions.length - 1];
        if (offering.offerBaseRateValue || offering.offeringPrice) {
            return {
                key: 'OFFER_1',
                offerBaseRateValue: offering.offerBaseRateValue,
                offeringPrice: offering.offeringPrice,
                baseRateType: offering.baseRateType,
                baseRateUnit: offering.baseRateUnit
            };
        }
        return null;
    };

    const getFinalRateText = (offering?: SampleEntry['offering']) => {
        if (!offering) return '-';
        const rateValue = offering.finalPrice ?? offering.finalBaseRate;
        if (!rateValue) return '-';
        const typeText = offering.baseRateType ? offering.baseRateType.replace(/_/g, '/') : '-';
        return `Rs ${toNumberText(rateValue)} / ${typeText} / ${formatRateUnitLabel(offering.baseRateUnit)}`;
    };
    const getLatestFinalVersion = (offering?: SampleEntry['offering']) => {
        if (!offering) return null;
        const versions = Array.isArray(offering.offerVersions)
            ? offering.offerVersions.filter((version) => version?.finalPrice || version?.finalBaseRate)
            : [];
        if (versions.length > 0) return versions[versions.length - 1];
        if (offering.finalPrice || offering.finalBaseRate) {
            return {
                key: 'FINAL',
                finalPrice: offering.finalPrice,
                finalBaseRate: offering.finalBaseRate,
                baseRateType: offering.finalBaseRateType || offering.baseRateType,
                baseRateUnit: offering.finalBaseRateUnit || offering.baseRateUnit
            };
        }
        return null;
    };

    const getPricingRows = (offering: NonNullable<SampleEntry['offering']>, mode: 'offer' | 'final') => {
        const isFinalMode = mode === 'final';
        const suteValue = isFinalMode ? offering.finalSute : offering.sute;
        const suteUnit = isFinalMode ? offering.finalSuteUnit : offering.suteUnit;

        return [
            [isFinalMode ? 'Final Rate' : 'Offer Rate', isFinalMode ? getFinalRateText(offering) : getOfferRateText(offering)],
            ['Sute', suteValue ? `${toNumberText(suteValue)} / ${formatRateUnitLabel(suteUnit)}` : '-'],
            ['Moisture', offering.moistureValue ? `${toNumberText(offering.moistureValue)}%` : '-'],
            ['Hamali', getChargeText(offering.hamali, offering.hamaliUnit)],
            ['Brokerage', getChargeText(offering.brokerage, offering.brokerageUnit)],
            ['LF', getChargeText(offering.lf, offering.lfUnit)],
            ['EGB', offering.egbType === 'mill'
                ? '0 / Mill'
                : offering.egbType === 'purchase' && offering.egbValue !== undefined && offering.egbValue !== null
                    ? `${toNumberText(offering.egbValue)} / Purchase`
                    : '-'],
            ['CD', offering.cdEnabled
                ? offering.cdValue
                    ? `${toNumberText(offering.cdValue)} / ${formatToggleUnitLabel(offering.cdUnit)}`
                    : 'Pending'
                : '-'],
            ['Bank Loan', offering.bankLoanEnabled
                ? offering.bankLoanValue
                    ? `Rs ${formatIndianCurrency(offering.bankLoanValue)} / ${formatToggleUnitLabel(offering.bankLoanUnit)}`
                    : 'Pending'
                : '-'],
            ['Payment', offering.paymentConditionValue
                ? `${offering.paymentConditionValue} ${offering.paymentConditionUnit === 'month' ? 'Month' : 'Days'}`
                : '-']
        ];
    };



    return (
        <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setActiveView('sample-book')}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', background: activeView === 'sample-book' ? '#1565c0' : '#cbd5e1', color: activeView === 'sample-book' ? '#fff' : '#1e293b' }}
                >
                    Paddy Sample Book
                </button>
                <button
                    onClick={() => setActiveView('edit-approvals')}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', background: activeView === 'edit-approvals' ? '#7c3aed' : '#cbd5e1', color: activeView === 'edit-approvals' ? '#fff' : '#1e293b' }}
                >
                    Approval For Edit
                    {renderTabBadge(approvalEntries.length, '#6d28d9')}
                </button>
            </div>
            {/* Filter Bar */}
            <div style={{ marginBottom: '0px' }}>
                <button onClick={() => setFiltersVisible(!filtersVisible)}
                    style={{ padding: '7px 16px', backgroundColor: filtersVisible ? '#e74c3c' : '#3498db', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {filtersVisible ? '✕ Hide Filters' : '🔍 Filters'}
                </button>
                {filtersVisible && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'flex-end', flexWrap: 'wrap', backgroundColor: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginRight: '4px' }}>
                            {[
                                { label: 'Today', value: 'today' as const },
                                { label: 'Yesterday', value: 'yesterday' as const },
                                { label: 'Last 7 Days', value: 'last7' as const }
                            ].map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => handleQuickDateFilter(preset.value)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '16px',
                                        border: '1px solid #90caf9',
                                        background: '#e3f2fd',
                                        color: '#1565c0',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '3px' }}>From Date</label>
                            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '3px' }}>To Date</label>
                            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '3px' }}>Broker</label>
                            <select value={filterBroker} onChange={e => setFilterBroker(e.target.value)} style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', minWidth: '140px', backgroundColor: 'white' }}>
                                <option value="">All Brokers</option>
                                {brokersList.map((b, i) => <option key={i} value={b}>{b}</option>)}
                            </select>
                        </div>
                        {(filterDateFrom || filterDateTo || filterBroker) && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleApplyFilters} style={{ padding: '5px 12px', border: 'none', borderRadius: '4px', backgroundColor: '#3498db', color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Apply</button>
                                <button onClick={handleClearFilters}
                                    style={{ padding: '5px 12px', border: '1px solid #e74c3c', borderRadius: '4px', backgroundColor: '#fff', color: '#e74c3c', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                                    Clear Filters
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {activeView === 'edit-approvals' ? (
                <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #ddd', marginTop: '12px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>
                    ) : approvalEntries.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No edit approvals pending</div>
                    ) : (
                        <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#1f2a44', color: '#fff' }}>
                                    {['Sl No', 'Type', 'Bags', 'Pkg', 'Party Name', 'Paddy Location', 'Variety', 'Request', 'Reason', 'Requested By', 'Requested At', 'Action'].map((header) => (
                                        <th key={header} style={{ border: '1px solid #000', padding: '8px 10px', fontSize: '12px', whiteSpace: 'nowrap', textAlign: 'left', verticalAlign: 'middle' }}>{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {approvalEntries.map((entry, index) => {
                                    const entryPending = String(entry.entryEditApprovalStatus || '').toLowerCase() === 'pending';
                                    const qualityPending = String(entry.qualityEditApprovalStatus || '').toLowerCase() === 'pending';
                                    const requestType = qualityPending ? 'Request For Quality Parameters' : 'Request For Sample Entry';
                                    const requestReason = qualityPending ? (entry.qualityEditApprovalReason || '-') : (entry.entryEditApprovalReason || '-');
                                    const requestedBy = qualityPending ? (entry.qualityEditApprovalRequestedByName || getCreatorLabel(entry)) : (entry.entryEditApprovalRequestedByName || getCreatorLabel(entry));
                                    const requestedAt = qualityPending ? entry.qualityEditApprovalRequestedAt : entry.entryEditApprovalRequestedAt;
                                    const partyDisplay = getPartyDisplayParts(entry);
                                    return (
                                        <tr key={`${entry.id}-${requestType}`} style={{ background: index % 2 === 0 ? '#fff7ed' : '#ffffff' }}>
                                            <td style={{ border: '1px solid #000', padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700 }}>{entry.serialNo || index + 1}</td>
                                            <td style={{ border: '1px solid #000', padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '700' }}>{entry.entryType === 'DIRECT_LOADED_VEHICLE' ? 'RL' : entry.entryType === 'LOCATION_SAMPLE' ? 'LS' : 'MS'}</td>
                                            <td style={{ border: '1px solid #000', padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>{entry.bags}</td>
                                            <td style={{ border: '1px solid #000', padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>{entry.packaging}</td>
                                            <td style={{ border: '1px solid #000', padding: '8px 10px', verticalAlign: 'middle', minWidth: '180px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEntryDetail(entry)}
                                                        style={{ background: 'transparent', border: 'none', color: '#1565c0', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700, fontSize: '13px', padding: 0, textAlign: 'left' }}
                                                    >
                                                        {partyDisplay.label}
                                                    </button>
                                                    {partyDisplay.showLorrySecondLine ? (
                                                        <div style={{ fontSize: '12px', color: '#1565c0', fontWeight: 600 }}>{partyDisplay.lorryText}</div>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td style={{ border: '1px solid #000', padding: '8px 10px', verticalAlign: 'middle' }}>{toTitleCase(entry.location || '-')}</td>
                                            <td style={{ border: '1px solid #000', padding: '8px 10px', verticalAlign: 'middle' }}>{toTitleCase(entry.variety || '-')}</td>
                                            <td style={{ border: '1px solid #000', padding: '8px 10px', textAlign: 'left', verticalAlign: 'middle', fontWeight: '700', color: '#7c3aed', minWidth: '170px' }}>{requestType}</td>
                                            <td style={{ border: '1px solid #000', padding: '8px 10px', minWidth: '180px', verticalAlign: 'middle', lineHeight: 1.4 }}>{requestReason}</td>
                                            <td style={{ border: '1px solid #000', padding: '8px 10px', verticalAlign: 'middle' }}>{requestedBy}</td>
                                            <td style={{ border: '1px solid #000', padding: '8px 10px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{formatShortDateTime(requestedAt || null) || '-'}</td>
                                            <td style={{ border: '1px solid #000', padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                    <button onClick={() => handleApprovalDecision(entry, qualityPending ? 'quality' : 'entry', 'approve')} style={{ padding: '5px 10px', border: 'none', borderRadius: '4px', background: '#2e7d32', color: '#fff', cursor: 'pointer', fontWeight: '700' }}>Approve</button>
                                                    <button onClick={() => handleApprovalDecision(entry, qualityPending ? 'quality' : 'entry', 'reject')} style={{ padding: '5px 10px', border: 'none', borderRadius: '4px', background: '#c62828', color: '#fff', cursor: 'pointer', fontWeight: '700' }}>Reject</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            ) : null}

            {activeView === 'sample-book' ? (
            <>
            {/* Entries grouped by Date → Broker */}
            <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #ddd' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>
                ) : Object.keys(groupedEntries).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No entries found</div>
                ) : (
                    Object.entries(groupedEntries).map(([dateKey, brokerGroups]) => {
                        let brokerSeq = 0;
                        return (
                            <div key={dateKey} style={{ marginBottom: '20px' }}>
                                {Object.entries(brokerGroups).sort(([a], [b]) => a.localeCompare(b)).map(([brokerName, brokerEntries], brokerIdx) => {
                                    let slNo = 0;
                                    const orderedEntries = [...brokerEntries].sort((a, b) => {
                                        const serialA = Number.isFinite(Number(a.serialNo)) ? Number(a.serialNo) : null;
                                        const serialB = Number.isFinite(Number(b.serialNo)) ? Number(b.serialNo) : null;
                                        if (serialA !== null && serialB !== null && serialA !== serialB) return serialA - serialB;
                                        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                                    });
                                    brokerSeq++;
                                    return (
                                        <div key={brokerName} style={{ marginBottom: '12px' }}>
                                            {/* Date + Paddy Sample bar — only first broker */}
                                            {brokerIdx === 0 && <div style={{
                                                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                                                color: 'white', padding: '6px 10px', fontWeight: '700', fontSize: '14px',
                                                textAlign: 'center', letterSpacing: '0.5px', minWidth: tableMinWidth
                                            }}>
                                                {(() => { const d = new Date(brokerEntries[0]?.entryDate); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; })()}
                                                &nbsp;&nbsp;{entryType === 'RICE_SAMPLE' ? 'Rice Sample' : 'Paddy Sample'}
                                            </div>}
                                            {/* Broker name bar */}
                                            <div style={{
                                                background: '#e8eaf6',
                                                color: '#000', padding: '3px 10px', fontWeight: '700', fontSize: '12px',
                                                display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px solid #c5cae9', minWidth: tableMinWidth
                                            }}>
                                                <span style={{ fontSize: '12px', fontWeight: '800' }}>{brokerSeq}.</span> {toTitleCase(brokerName)}
                                            </div>
                                            {/* Table */}
                                            <table style={{ width: '100%', minWidth: tableMinWidth, borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'fixed', border: '1px solid #000' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: entryType === 'RICE_SAMPLE' ? '#4a148c' : '#1a237e', color: 'white' }}>
                                                        <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '3.5%' }}>SL No</th>
                                                        {!isRiceBook && <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '4%' }}>Type</th>}
                                                        <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '4%' }}>Bags</th>
                                                        <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '4%' }}>Pkg</th>
                                                        <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '12%' }}>Party Name</th>
                                                        <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '12%' }}>{entryType === 'RICE_SAMPLE' ? 'Rice Location' : 'Paddy Location'}</th>
                                                        <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '9%' }}>Variety</th>
                                                        <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '12%' }}>Sample Collected By</th>
                                                        <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '11%' }}>Quality Report</th>
                                                        <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: isRiceBook ? '12%' : '8.5%' }}>Cooking Report</th>
                                                        <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '7%' }}>Offer</th>
                                                        <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '6%' }}>Final</th>
                                                        <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '8.5%' }}>Status</th>
                                                        <th style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: '600', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '9%' }}>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {orderedEntries.map((entry, idx) => {
                                                        slNo++;
                                                        const qp = entry.qualityParameters;
                                                        const cr = entry.cookingReport;
                                                        const latestOfferVersion = getLatestOfferVersion(entry.offering);
                                                        const latestFinalVersion = getLatestFinalVersion(entry.offering);
                                                        const cookingFail = entry.lotSelectionDecision === 'PASS_WITH_COOKING' && cr && cr.status && cr.status.toLowerCase() === 'fail';
                                                        const cookingStatusKey = String(cr?.status || '').toUpperCase();
                                                        const isResampleRow =
                                                            entry.lotSelectionDecision === 'FAIL'
                                                            && entry.workflowStatus !== 'FAILED'
                                                            && !['PASS', 'MEDIUM'].includes(cookingStatusKey)
                                                            && !entry.offering?.finalPrice;
                                                        const rowBg = isResampleRow
                                                            ? '#fff3e0'
                                                            : cookingFail
                                                                ? '#fff0f0'
                                                                : entry.entryType === 'DIRECT_LOADED_VEHICLE' ? '#e3f2fd' : entry.entryType === 'LOCATION_SAMPLE' ? '#ffe0b2' : '#ffffff';

                                                        const fallback = entryType === 'RICE_SAMPLE' ? '--' : '-';
                                                        const fmtVal = (v: any, forceDecimal = false, precision = 2) => {
                                                            if (v == null || v === '') return fallback;
                                                            const n = Number(v);
                                                            if (isNaN(n) || n === 0) return fallback;
                                                            if (forceDecimal) return n.toFixed(1);
                                                            if (precision > 2) return String(parseFloat(n.toFixed(precision)));
                                                            return n % 1 === 0 ? String(Math.round(n)) : String(parseFloat(n.toFixed(2)));
                                                        };
                                                        const hasFullQuality = qp && (
                                                            isProvidedNumeric((qp as any).cutting1Raw, qp.cutting1)
                                                            || isProvidedNumeric((qp as any).bend1Raw, qp.bend1)
                                                            || isProvidedAlpha((qp as any).mixRaw, qp.mix)
                                                            || isProvidedAlpha((qp as any).mixSRaw, qp.mixS)
                                                            || isProvidedAlpha((qp as any).mixLRaw, qp.mixL)
                                                        );
                                                        return (
                                                            <tr key={entry.id} style={{ backgroundColor: rowBg }}>
                                                                <td style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '13px', fontWeight: '600', textAlign: 'center', whiteSpace: 'nowrap' }}>{slNo}</td>
                                                                {!isRiceBook && (
                                                                    <td style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '13px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                        {entry.entryType === 'LOCATION_SAMPLE' ? 'LS' : entry.entryType === 'DIRECT_LOADED_VEHICLE' ? 'RL' : 'MS'}
                                                                    </td>
                                                                )}
                                                                <td style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '13px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>{entry.bags || '0'}</td>
                                                                <td style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap' }}>{Number(entry.packaging) === 0 ? 'Loose' : `${entry.packaging || '75'} kg`}</td>
                                                                <td style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '14px', color: '#1565c0', fontWeight: '600', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {(() => {
                                                                        const partyDisplay = getPartyDisplayParts(entry);
                                                                        return (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => openEntryDetail(entry)}
                                                                                    style={{ background: 'transparent', border: 'none', color: '#1565c0', textDecoration: 'underline', cursor: 'pointer', fontWeight: '700', fontSize: '14px', padding: 0, textAlign: 'left' }}
                                                                                >
                                                                                    {partyDisplay.label}
                                                                                </button>
                                                                                {partyDisplay.showLorrySecondLine ? (
                                                                                    <div style={{ fontSize: '13px', color: '#1565c0', fontWeight: '600' }}>{partyDisplay.lorryText}</div>
                                                                                ) : null}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </td>
                                                                 <td style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                                                                    {toTitleCase(entry.location) || '-'}
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
                                                                <td style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap' }}>{toTitleCase(entry.variety)}</td>
                                                                <td style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                                                                    {(entry as any).sampleGivenToOffice ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                            <span style={{ fontWeight: '700', color: '#9c27b0', fontSize: '13px' }}>{getCreatorLabel(entry)}</span>
                                                                            <span style={{ fontWeight: '600', color: '#333', fontSize: '12px' }}>{getCollectorLabel(entry.sampleCollectedBy || '-')}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span style={{ color: '#333', fontSize: '13px', fontWeight: '600' }}>
                                                                            {entry.sampleCollectedBy ? getCollectorLabel(entry.sampleCollectedBy) : getCreatorLabel(entry)}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', whiteSpace: 'nowrap' }}>{qualityBadge(entry)}</td>
                                                                <td style={{
                                                                    border: '1px solid #000',
                                                                    padding: '3px 4px',
                                                                    fontSize: '11px',
                                                                    textAlign: isRiceBook ? 'left' : 'center',
                                                                    whiteSpace: 'normal',
                                                                    lineHeight: '1.2',
                                                                    verticalAlign: 'middle',
                                                                    minWidth: isRiceBook ? undefined : '104px'
                                                                }}>
                                                                    {cookingBadge(entry)}
                                                                </td>
                                                                <td
                                                                    onClick={() => latestOfferVersion ? setPricingDetail({ entry, mode: 'offer' }) : null}
                                                                    style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '11px', textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: '116px', cursor: latestOfferVersion ? 'pointer' : 'default' }}
                                                                >
                                                                    {latestOfferVersion ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'center', width: '100%' }}>
                                                                            <span style={{ fontSize: '9px', color: '#5f6368', fontWeight: '800' }}>{getOfferSlotLabel((latestOfferVersion as any).key)}</span>
                                                                            <span style={{ fontWeight: '700', color: '#1565c0', fontSize: '11px' }}>
                                                                                Rs {toNumberText((latestOfferVersion as any).offerBaseRateValue || (latestOfferVersion as any).offeringPrice || 0)}
                                                                            </span>
                                                                            <span style={{ fontSize: '9px', color: '#5f6368', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: '1.2' }}>
                                                                                {String((latestOfferVersion as any).baseRateType || entry.offering?.baseRateType || '').replace(/_/g, '/')}
                                                                            </span>
                                                                        </div>
                                                                    ) : '-'}
                                                                </td>
                                                                <td
                                                                    onClick={() => latestFinalVersion ? setPricingDetail({ entry, mode: 'final' }) : null}
                                                                    style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '11px', textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: '104px', cursor: latestFinalVersion ? 'pointer' : 'default' }}
                                                                >
                                                                    {latestFinalVersion ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'center', width: '100%' }}>
                                                                            <span style={{ fontSize: '9px', color: '#5f6368', fontWeight: '800' }}>{(latestFinalVersion as any).key === 'FINAL' ? 'Final' : getOfferSlotLabel((latestFinalVersion as any).key)}</span>
                                                                            <span style={{ fontWeight: '700', color: '#2e7d32', fontSize: '11px' }}>
                                                                                Rs {toNumberText((latestFinalVersion as any).finalPrice || (latestFinalVersion as any).finalBaseRate || 0)}
                                                                            </span>
                                                                            <span style={{ fontSize: '9px', color: '#5f6368', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: '1.2' }}>
                                                                                {String((latestFinalVersion as any).baseRateType || entry.offering?.baseRateType || '').replace(/_/g, '/')}
                                                                            </span>
                                                                        </div>
                                                                    ) : '-'}
                                                                </td>
                                                                <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', whiteSpace: 'normal', minWidth: '108px' }}>{statusBadge(entry)}</td>
                                                                <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', whiteSpace: 'normal', minWidth: '120px' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openEntryDetail(entry)}
                                                                            style={{ padding: '3px 8px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: '700' }}
                                                                        >
                                                                            View
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setRecheckModal({ isOpen: true, entry })}
                                                                            style={{ padding: '3px 8px', background: '#ef6c00', color: 'white', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: '700' }}
                                                                        >
                                                                            Recheck
                                                                        </button>
                                                                    </div>
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
                )}
            </div>
            </>
            ) : null}

            {/* Recheck Modal */}
            {recheckModal.isOpen && recheckModal.entry && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '360px', padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '800', color: '#1a237e' }}>Initiate Recheck</h3>
                        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                            Select the type of recheck for <strong>{getPartyLabel(recheckModal.entry)}</strong>:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button onClick={() => handleRecheck('quality')} style={{ padding: '10px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Quality Parameters Recheck</button>
                            <button onClick={() => handleRecheck('cooking')} style={{ padding: '10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Cooking Report Recheck</button>
                            <button onClick={() => handleRecheck('both')} style={{ padding: '10px', backgroundColor: '#8e44ad', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Both (Quality & Cooking)</button>
                        </div>
                        <button onClick={() => setRecheckModal({ isOpen: false, entry: null })} style={{ marginTop: '16px', width: '100%', padding: '8px', backgroundColor: '#eee', color: '#666', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Detail Popup — same design as AdminSampleBook */}
            {
                detailEntry && (() => {
                    const detailOff = detailEntry.offering;
                    const detailOfferVersions = detailOff?.offerVersions || [];
                    const detailHasPricingSummary = Boolean(
                        detailOff?.finalPrice
                        || detailOff?.finalBaseRate
                        || detailOff?.offerBaseRateValue
                        || detailOff?.offeringPrice
                        || detailOfferVersions.length > 0
                    );
                    const detailHasCookingHistory = buildCookingStatusRows(detailEntry).length > 0;
                    const useCompactDetailShell = detailMode !== 'history'
                        && !detailHasCookingHistory
                        && !detailHasPricingSummary
                        && getQualityAttemptsForEntry(detailEntry as any).length <= 1;
                    const useWideSummaryLayout = detailMode === 'history' || detailHasCookingHistory || detailHasPricingSummary;
                    return (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px 16px' }}
                        onClick={() => setDetailEntry(null)}>
                        <div style={{ backgroundColor: 'white', borderRadius: '8px', width: detailMode === 'history' ? '85vw' : (useCompactDetailShell ? 'min(520px, 95vw)' : '94vw'), maxWidth: detailMode === 'history' ? '88vw' : (useCompactDetailShell ? '95vw' : '1180px'), maxHeight: detailMode === 'history' ? '82vh' : '88vh', overflowY: 'auto', overflowX: detailMode === 'history' ? 'auto' : 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                            onClick={e => e.stopPropagation()}>
                            {/* Redesigned Header — Green Background, Aligned Items */}
                            <div style={{
                                background: detailEntry.entryType === 'DIRECT_LOADED_VEHICLE'
                                    ? '#1565c0'
                                    : detailEntry.entryType === 'LOCATION_SAMPLE'
                                        ? '#e67e22'
                                        : '#4caf50',
                                padding: '16px 20px', borderRadius: '8px 8px 0 0', color: 'white',
                                position: 'relative'
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
                                <div style={{
                                    fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px', marginTop: '4px',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%'
                                }}>
                                    {toTitleCase(detailEntry.brokerName) || '-'}
                                </div>
                                <button onClick={() => setDetailEntry(null)} style={{
                                    position: 'absolute', top: '16px', right: '16px',
                                    background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '50%',
                                    width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px',
                                    color: 'white', fontWeight: '900', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', transition: 'all 0.2s',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                }}>✕</button>
                            </div>
                            <div style={{ padding: '24px', backgroundColor: '#fff', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', minWidth: detailMode === 'history' ? '1200px' : 'auto', position: 'relative' }}>
                                {detailMode !== 'history' && !useCompactDetailShell && (() => {
                                    const off = detailOff;
                                    const versions = detailOfferVersions;
                                    if (!off && versions.length === 0) return null;

                                    return (
                                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                            <h4 style={{ margin: 0, fontSize: '13px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', fontWeight: '900' }}>Pricing & Offers</h4>
                                            {(off?.finalPrice || off?.finalBaseRate) && (
                                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
                                                    <div style={{ fontSize: '10px', color: '#166534', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Confirmed Final Price</div>
                                                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#14532d' }}>Rs {toNumberText(off.finalPrice || off.finalBaseRate || 0)}</div>
                                                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#15803d', marginTop: '4px' }}>{(off.finalBaseRateType || off.baseRateType || '').replace(/_/g, '/')} / {formatRateUnitLabel(off.finalBaseRateUnit || off.baseRateUnit)}</div>
                                                </div>
                                            )}
                                            {versions.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {versions.map((ov, i) => (
                                                        <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', minWidth: 0 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '6px' }}>
                                                                <span style={{ fontSize: '10px', fontWeight: '900', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>{ov.key}</span>
                                                                {(ov.finalPrice || ov.finalBaseRate) && <span style={{ fontSize: '10px', fontWeight: '900', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px' }}>PASSED</span>}
                                                            </div>
                                                            <div style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Rs {toNumberText(ov.offerBaseRateValue || ov.offeringPrice || 0)}</div>
                                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(ov.baseRateType || '').replace(/_/g, '/')}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {versions.length === 0 && (off?.offerBaseRateValue || off?.offeringPrice) && (
                                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                                                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Active Offer</div>
                                                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>Rs {toNumberText(off.offerBaseRateValue || off.offeringPrice || 0)}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{(off.baseRateType || '').replace(/_/g, '/')} / {formatRateUnitLabel(off.baseRateUnit)}</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                {/* Basic Info Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px', maxWidth: '100%' }}>
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
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px', maxWidth: '100%' }}>
                                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Party Name</div>
                                        {(() => {
                                            const partyDisplay = getPartyDisplayParts(detailEntry);
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                                                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{partyDisplay.label}</div>
                                                    {partyDisplay.showLorrySecondLine ? (
                                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1565c0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{partyDisplay.lorryText}</div>
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
                                            const collectedByDisplay = getCollectedByDisplay(detailEntry);
                                            if (collectedByDisplay.secondary) {
                                                return (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: '700', color: collectedByDisplay.highlightPrimary ? '#9c27b0' : '#1e293b' }}>
                                                            {collectedByDisplay.primary}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '800' }}>/</span>
                                                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {collectedByDisplay.secondary}
                                                        </span>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: collectedByDisplay.highlightPrimary ? '#9c27b0' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {collectedByDisplay.primary}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    {(() => {
                                        const smellAttempts = Array.isArray((detailEntry as any).qualityAttemptDetails) ? (detailEntry as any).qualityAttemptDetails : [];
                                        const smellAttempt = [...smellAttempts].reverse().find((qp: any) => qp?.smellHas || (qp?.smellType && String(qp.smellType).trim()));
                                        const smellHasValue = smellAttempt?.smellHas ?? (detailEntry as any).smellHas;
                                        const smellTypeValue = smellAttempt?.smellType ?? (detailEntry as any).smellType;
                                        return (
                                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Smell</div>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(smellHasValue || (smellTypeValue && String(smellTypeValue).trim())) ? toTitleCase(smellTypeValue || 'Yes') : '-'}</div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                {/* Horizontal Layout: Quality Parameters / Cooking History */}
                                <div style={{ display: 'grid', gridTemplateColumns: getQualityAttemptsForEntry(detailEntry as any).length > 1 ? 'minmax(0, 1fr)' : (useWideSummaryLayout ? (detailMode === 'history' ? 'repeat(auto-fit, minmax(340px, 1fr))' : 'minmax(0, 1fr) 340px') : 'minmax(0, 1fr)'), gap: '20px', marginTop: '20px', alignItems: 'start' }}>
                                    {/* LEFT SIDE: Quality Parameters */}
                                    <div style={{ minWidth: 0 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#e67e22', borderBottom: '2px solid #e67e22', paddingBottom: '6px' }}>🔬 Quality Parameters</h4>
                                        {(() => {
                                    const qpAll = getQualityAttemptsForEntry(detailEntry as any);
                                    const shouldShowAllQualityAttempts = detailMode === 'history'
                                        || qpAll.length > 1
                                        || (detailEntry as any).qualityPending === true
                                        || (detailEntry as any).recheckRequested === true
                                        || String(detailEntry.lotSelectionDecision || '').toUpperCase() === 'FAIL';
                                    const qpList = shouldShowAllQualityAttempts
                                        ? qpAll
                                        : (qpAll.length > 0 ? [qpAll[qpAll.length - 1]] : []);

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
                                        const num = Number(rawNumeric);
                                        if (!Number.isFinite(num) || num === 0) return null;
                                        return rawNumeric;
                                    };
                                    const isProvided = (rawVal: any, numericVal: any) => {
                                        const raw = rawVal != null ? String(rawVal).trim() : '';
                                        if (raw !== '') return true;
                                        if (numericVal == null || numericVal === '') return false;
                                        const rawNumeric = String(numericVal).trim();
                                        if (!rawNumeric) return false;
                                        const num = Number(rawNumeric);
                                        return Number.isFinite(num) && num !== 0;
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
                                    const hasHistory = qpList.length > 1;
                                    const useHorizontalQualityHistory = hasHistory;
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
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                                                const smixOn = isEnabled(qp.smixEnabled, qp.mixSRaw, qp.mixS);
                                                const lmixOn = isEnabled(qp.lmixEnabled, qp.mixLRaw, qp.mixL);
                                                const paddyOn = isEnabled(qp.paddyWbEnabled, qp.paddyWbRaw, qp.paddyWb);
                                                const wbOn = isProvided(qp.wbRRaw, qp.wbR) || isProvided(qp.wbBkRaw, qp.wbBk);
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
                                                
                                                const hasKandu = displayVal((qp as any).kanduRaw, qp.kandu);
                                                const hasOil = displayVal((qp as any).oilRaw, qp.oil);
                                                const hasSK = displayVal((qp as any).skRaw, qp.sk);
                                                const row3: { label: string; value: React.ReactNode }[] = [];
                                                if (hasKandu) row3.push({ label: 'Kandu', value: hasKandu });
                                                if (hasOil) row3.push({ label: 'Oil', value: hasOil });
                                                if (hasSK) row3.push({ label: 'SK', value: hasSK });
                                                
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
                                                const smellHasValue = (qp as any).smellHas ?? (qpList.length === 1 ? (detailEntry as any).smellHas : undefined);
                                                const smellTypeValue = (qp as any).smellType ?? (qpList.length === 1 ? (detailEntry as any).smellType : undefined);
                                                if (smellHasValue || (smellTypeValue && String(smellTypeValue).trim())) row5.push({ label: 'Smell', value: toTitleCase(smellTypeValue || 'Yes') });
                                                
                                                const wrapperStyle = qpList.length > 1 ? { background: '#fcfcfc', border: '1px solid #eee', borderRadius: '6px', padding: '12px' } : {};

                                                return (
                                                    <div key={idx} style={wrapperStyle}>
                                                        {qpList.length > 1 && (
                                                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#e67e22', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                {qp.attemptNo ? `${qp.attemptNo}${qp.attemptNo === 1 ? 'st' : qp.attemptNo === 2 ? 'nd' : 'th'} Quality` : `${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : 'th'} Quality`}
                                                            </div>
                                                        )}
                                                        {row1.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row1.length}, 1fr)`, gap: '8px', marginBottom: '8px' }}>{row1.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}</div>}
                                                        {row2.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row2.length}, 1fr)`, gap: '8px', marginBottom: '8px' }}>{row2.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}</div>}
                                                        {row3.length > 0 && (
                                                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row3.length}, 1fr)`, gap: '8px', marginBottom: '8px' }}>
                                                                {row3.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}
                                                            </div>
                                                        )}
                                                        {row4.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row4.length}, 1fr)`, gap: '8px', marginBottom: '8px' }}>{row4.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}</div>}
                                                        {row5.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row5.length}, 1fr)`, gap: '8px', marginBottom: '8px' }}>{row5.map(item => <QItem key={item.label} label={item.label} value={item.value} />)}</div>}
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
                                    {useWideSummaryLayout && (
                                    <div style={{ minWidth: 0 }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#1565c0', borderBottom: '2px solid #1565c0', paddingBottom: '6px' }}>Cooking History & Remarks</h4>
                                        {(() => {
                                            const rows = buildCookingStatusRows(detailEntry);

                                            if (rows.length === 0) return <div style={{ color: '#999', fontSize: '12px' }}>No cooking history.</div>;

                                            return (
                                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>Cooking Activity Log</div>
                                                    <div style={{ overflowX: 'auto' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                            <thead>
                                                                <tr>
                                                                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '40px' }}>No</th>
                                                                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
                                                                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Done By</th>
                                                                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Approved By</th>
                                                                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '44px' }}>Rem</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {rows.map((row, idx) => {
                                                                    const style = getStatusStyle(row.status);
                                                                    return (
                                                                        <tr key={`${detailEntry.id}-cook-history-${idx}`} style={{ borderTop: '1px solid #e2e8f0' }}>
                                                                            <td style={{ padding: '6px 8px', fontWeight: '700' }}>{idx + 1}.</td>
                                                                            <td style={{ padding: '6px 8px' }}>
                                                                                <span style={{ background: style.bg, color: style.color, padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700' }}>
                                                                                    {row.status}
                                                                                </span>
                                                                            </td>
                                                                            <td style={{ padding: '6px 8px' }}>
                                                                                <div style={{ fontWeight: '700', fontSize: '12px' }}>{row.doneBy ? getCollectorLabel(row.doneBy) : '-'}</div>
                                                                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{formatShortDateTime(row.doneDate || null) || '-'}</div>
                                                                            </td>
                                                                            <td style={{ padding: '6px 8px' }}>
                                                                                <div style={{ fontWeight: '700', fontSize: '12px' }}>{row.approvedBy ? getCollectorLabel(row.approvedBy) : '-'}</div>
                                                                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{formatShortDateTime(row.approvedDate || null) || '-'}</div>
                                                                            </td>
                                                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                                                {row.remarks ? (
                                                                                    <button
                                                                                        onClick={() => setRemarksPopup({ isOpen: true, text: String(row.remarks || '') })}
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
                                            );
                                        })()}
                                    </div>
                                    )}
                                </div>

                                {detailMode === 'history' && (
                                <>
                                {/* Pricing & Offers History */}
                                <h4 style={{ margin: '24px 0 12px', fontSize: '14px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    💰 Pricing & Offers
                                </h4>
                                {(() => {
                                    const off = detailEntry.offering;
                                    const versions = off?.offerVersions || [];
                                    if (!off && versions.length === 0) return <div style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>No pricing details available.</div>;

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {/* Final Rate Highlight */}
                                            {(off?.finalPrice || off?.finalBaseRate) && (
                                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: '#166534', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Confirmed Final Price</div>
                                                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#14532d' }}>Rs {toNumberText(off.finalPrice || off.finalBaseRate || 0)}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '10px', color: '#166534', fontWeight: '700', marginBottom: '2px' }}>Base Rate Type</div>
                                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#15803d' }}>{(off.finalBaseRateType || off.baseRateType || '').replace(/_/g, '/')} / {formatRateUnitLabel(off.finalBaseRateUnit || off.baseRateUnit)}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Offer History */}
                                            {versions.length > 0 && (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                                                    {versions.map((ov, i) => (
                                                        <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                                <span style={{ fontSize: '10px', fontWeight: '900', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px' }}>{ov.key}</span>
                                                                {(ov.finalPrice || ov.finalBaseRate) && <span style={{ fontSize: '10px', fontWeight: '900', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px' }}>PASSED</span>}
                                                            </div>
                                                            <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>Rs {toNumberText(ov.offerBaseRateValue || ov.offeringPrice || 0)}</div>
                                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{(ov.baseRateType || '').replace(/_/g, '/')}</div>
                                                            {(ov.finalPrice || ov.finalBaseRate) && (
                                                                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                                                                    <div style={{ fontSize: '9px', color: '#166534', fontWeight: '700' }}>Final: <span style={{ fontSize: '12px', fontWeight: '900' }}>Rs {toNumberText(ov.finalPrice || ov.finalBaseRate || 0)}</span></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Single Offer Fallback */}
                                            {versions.length === 0 && (off?.offerBaseRateValue || off?.offeringPrice) && (
                                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                                                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Active Offer</div>
                                                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>Rs {toNumberText(off.offerBaseRateValue || off.offeringPrice || 0)}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{(off.baseRateType || '').replace(/_/g, '/')} / {formatRateUnitLabel(off.baseRateUnit)}</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                </>
                                )}

                                {/* Cooking History & Remarks */}


                                {/* GPS & Photos for Location Sample */}
                                {detailEntry.entryType === 'LOCATION_SAMPLE' && (
                                    <>
                                        <h4 style={{ margin: '12px 0 10px', fontSize: '13px', color: '#e67e22', borderBottom: '2px solid #e67e22', paddingBottom: '6px' }}>📍 Location Details</h4>
                                        {(detailEntry as any).gpsCoordinates && (
                                            <div style={{ marginBottom: '10px' }}>
                                                <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #e0e0e0', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                                            </div>
                                        )}
                                        {(detailEntry as any).godownImageUrl && (
                                            <div style={{ marginBottom: '10px' }}>
                                                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', fontWeight: '600' }}>Godown Image</div>
                                                <a href={resolveMediaUrl((detailEntry as any).godownImageUrl)} target="_blank" rel="noopener noreferrer">
                                                    <img src={resolveMediaUrl((detailEntry as any).godownImageUrl)} alt="Godown" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '6px', border: '1px solid #e0e0e0' }} />
                                                </a>
                                            </div>
                                        )}
                                        {(detailEntry as any).paddyLotImageUrl && (
                                            <div style={{ marginBottom: '10px' }}>
                                                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', fontWeight: '600' }}>Paddy Lot Image</div>
                                                <a href={resolveMediaUrl((detailEntry as any).paddyLotImageUrl)} target="_blank" rel="noopener noreferrer">
                                                    <img src={resolveMediaUrl((detailEntry as any).paddyLotImageUrl)} alt="Paddy Lot" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '6px', border: '1px solid #e0e0e0' }} />
                                                </a>
                                            </div>
                                        )}
                                    </>
                                )}

                                <button onClick={() => setDetailEntry(null)}
                                    style={{ marginTop: '16px', width: '100%', padding: '8px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )})()
            }

            {pricingDetail && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.55)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000,
                        padding: '16px'
                    }}
                    onClick={() => setPricingDetail(null)}
                >
                    <div
                        style={{
                            background: '#ffffff',
                            width: '100%',
                            maxWidth: '1200px',
                            borderRadius: '10px',
                            boxShadow: '0 16px 50px rgba(0,0,0,0.25)',
                            overflow: 'hidden',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ background: pricingDetail.mode === 'offer' ? '#1565c0' : '#2e7d32', color: '#fff', padding: '14px 18px' }}>
                            <div style={{ fontSize: '18px', fontWeight: '800' }}>
                                {pricingDetail.mode === 'offer' ? 'Offer Details' : 'Final Details'}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.95, marginTop: '4px' }}>
                                {getPartyLabel(pricingDetail.entry)} | {toTitleCase(pricingDetail.entry.variety)} | {toTitleCase(pricingDetail.entry.location)}
                            </div>
                        </div>
                        <div style={{ padding: '16px 18px 18px', overflowY: 'auto' }}>
                            {pricingDetail.entry.offering ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {(() => {
                                        const offering = pricingDetail.entry.offering!;
                                        const versions = Array.isArray(offering.offerVersions) ? offering.offerVersions : [];
                                        const visibleVersions = pricingDetail.mode === 'offer'
                                            ? versions.filter((version) => version?.offerBaseRateValue || version?.offeringPrice)
                                            : versions.filter((version) => version?.finalPrice || version?.finalBaseRate);

                                        const renderGrid = (rows: any[], keyPrefix: string) => (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                                                {rows.map(([label, value]) => (
                                                    <div key={`${keyPrefix}-${String(label)}`} style={{ background: '#f8f9fa', border: '1px solid #dfe3e8', borderRadius: '8px', padding: '10px 12px' }}>
                                                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#5f6368', marginBottom: '4px' }}>{label}</div>
                                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937' }}>{value as string}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        );

                                        if (visibleVersions.length === 0) {
                                            return renderGrid(getPricingRows(offering, pricingDetail.mode), 'current');
                                        }

                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {visibleVersions.map((version, versionIndex) => {
                                                    const pricingVersion = pricingDetail.mode === 'offer'
                                                        ? {
                                                            ...offering,
                                                            offerBaseRateValue: version.offerBaseRateValue,
                                                            offeringPrice: version.offeringPrice,
                                                            baseRateType: version.baseRateType || offering.baseRateType,
                                                            baseRateUnit: version.baseRateUnit || offering.baseRateUnit,
                                                            moistureValue: version.moistureValue ?? offering.moistureValue,
                                                            hamali: version.hamali ?? offering.hamali,
                                                            hamaliUnit: version.hamaliUnit || offering.hamaliUnit,
                                                            brokerage: version.brokerage ?? offering.brokerage,
                                                            brokerageUnit: version.brokerageUnit || offering.brokerageUnit,
                                                            lf: version.lf ?? offering.lf,
                                                            lfUnit: version.lfUnit || offering.lfUnit,
                                                            egbValue: version.egbValue ?? offering.egbValue,
                                                            egbType: version.egbType || offering.egbType,
                                                            cdValue: version.cdValue ?? offering.cdValue,
                                                            cdUnit: version.cdUnit || offering.cdUnit,
                                                            bankLoanValue: version.bankLoanValue ?? offering.bankLoanValue,
                                                            bankLoanUnit: version.bankLoanUnit || offering.bankLoanUnit,
                                                            paymentConditionValue: version.paymentConditionValue ?? offering.paymentConditionValue,
                                                            paymentConditionUnit: version.paymentConditionUnit || offering.paymentConditionUnit
                                                        }
                                                        : {
                                                            ...offering,
                                                            finalPrice: version.finalPrice,
                                                            finalBaseRate: version.finalBaseRate,
                                                            finalBaseRateType: version.baseRateType || offering.finalBaseRateType || offering.baseRateType,
                                                            finalBaseRateUnit: version.baseRateUnit || offering.finalBaseRateUnit || offering.baseRateUnit
                                                        };
                                                    return (
                                                        <div key={`${String(version.key || 'version')}-${versionIndex}`} style={{ border: '1px solid #dfe3e8', borderRadius: '10px', padding: '12px', background: '#fff', minWidth: 0 }}>
                                                            <div style={{ fontSize: '12px', fontWeight: '800', color: pricingDetail.mode === 'offer' ? '#1565c0' : '#2e7d32', marginBottom: '10px' }}>
                                                                {pricingDetail.mode === 'offer' ? getOfferSlotLabel(version.key) : (version.key ? `${getOfferSlotLabel(version.key)} Final` : 'Final')}
                                                            </div>
                                                            {renderGrid(getPricingRows(pricingVersion as NonNullable<SampleEntry['offering']>, pricingDetail.mode), `${String(version.key || 'version')}-${versionIndex}`)}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div style={{ color: '#999', textAlign: 'center', padding: '12px' }}>No pricing data</div>
                            )}
                            <button
                                onClick={() => setPricingDetail(null)}
                                style={{
                                    marginTop: '16px',
                                    width: '100%',
                                    padding: '9px',
                                    backgroundColor: pricingDetail.mode === 'offer' ? '#1565c0' : '#2e7d32',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
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
                        zIndex: 20000,
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
            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '16px 0', marginTop: '12px' }}>
                <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                    style={{ padding: '6px 16px', borderRadius: '4px', border: '1px solid #ccc', background: page <= 1 ? '#eee' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                    ← Prev
                </button>
                <span style={{ fontSize: '13px', color: '#666' }}>Page {page} of {totalPages} &nbsp;({total} total)</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    style={{ padding: '6px 16px', borderRadius: '4px', border: '1px solid #ccc', background: page >= totalPages ? '#eee' : '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                    Next →
                </button>
            </div>
        </div>
    );
};

export default AdminSampleBook2;
