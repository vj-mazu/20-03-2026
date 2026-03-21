import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { API_URL } from '../config/api';

interface SampleEntry {
  id: string;
  serialNo?: number;
  entryDate: string;
  brokerName: string;
  variety: string;
  partyName: string;
  location: string;
  bags: number;
  packaging: string;
  workflowStatus: string;
  createdAt?: string;
  qualityParameters?: {
    id?: string;
    reportedBy?: string;
    moisture?: number | string | null;
    dryMoisture?: number | string | null;
    cutting1?: number | string | null;
    bend1?: number | string | null;
    mix?: number | string | null;
    sk?: number | string | null;
    grainsCount?: number | string | null;
    smellHas?: boolean;
    smellType?: string | null;
    updatedAt?: string;
    createdAt?: string;
  };
  cookingReport?: {
    id?: string;
    status?: string;
    remarks?: string;
    history?: CookingAttemptDetail[];
    updatedAt?: string;
    createdAt?: string;
  };
  offering?: any;
  entryType?: string;
  lorryNumber?: string;
  sampleCollectedBy?: string;
  sampleGivenToOffice?: boolean;
  sampleCollectedHistory?: string[];
  qualityReportHistory?: string[];
  qualityAttemptDetails?: QualityAttemptDetail[];
  qualityReportAttempts?: number;
  lotSelectionDecision?: string;
  lotSelectionAt?: string;
  finalPrice?: number;
  creator?: { id: number; username: string; fullName?: string };
  updatedAt?: string;
}

interface QualityAttemptDetail {
  attemptNo: number;
  reportedBy?: string;
  createdAt?: string;
  moisture?: number | string | null;
  dryMoisture?: number | string | null;
  cutting1?: number | string | null;
  cutting2?: number | string | null;
  bend1?: number | string | null;
  bend2?: number | string | null;
  mix?: number | string | null;
  mixS?: number | string | null;
  mixL?: number | string | null;
  kandu?: number | string | null;
  oil?: number | string | null;
  sk?: number | string | null;
  grainsCount?: number | string | null;
  wbR?: number | string | null;
  wbBk?: number | string | null;
  wbT?: number | string | null;
  paddyWb?: number | string | null;
  gramsReport?: string | null;
  smellHas?: boolean;
  smellType?: string | null;
  moistureRaw?: number | string | null;
  cutting1Raw?: number | string | null;
  cutting2Raw?: number | string | null;
  bend1Raw?: number | string | null;
  bend2Raw?: number | string | null;
  grainsCountRaw?: number | string | null;
  mixRaw?: number | string | null;
  mixSRaw?: number | string | null;
  mixLRaw?: number | string | null;
  kanduRaw?: number | string | null;
  oilRaw?: number | string | null;
  skRaw?: number | string | null;
  wbRRaw?: number | string | null;
  wbBkRaw?: number | string | null;
  wbTRaw?: number | string | null;
  paddyWbRaw?: number | string | null;
  smixEnabled?: boolean;
  lmixEnabled?: boolean;
  paddyWbEnabled?: boolean;
  updatedAt?: string;
}

interface CookingAttemptDetail {
  date?: string;
  status?: string | null;
  cookingDoneBy?: string | null;
  approvedBy?: string | null;
  remarks?: string | null;
}

interface LoadingLotsProps {
  entryType?: string;
  excludeEntryType?: string;
}

const unitLabel = (u: string) => ({ per_kg: '/Kg', per_ton: '/Ton', per_bag: '/Bag', per_quintal: '/Qtl' }[u] || u || '');
const toEnteredAmountText = (value: any) => {
  if (value == null || value === '') return '-';
  const raw = String(value).trim();
  if (!raw) return '-';
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return raw;
  return raw.replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
};
const fmtVal = (val: any, unit?: string) => (val == null || val === '' ? '-' : unit ? `${toEnteredAmountText(val)} ${unitLabel(unit)}` : toEnteredAmountText(val));
const toTitleCase = (str: string) => str ? str.replace(/\b\w/g, (c) => c.toUpperCase()) : '';
const toSentenceCase = (value: string) => {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};
const toNumberText = (value: any, digits = 2) => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits).replace(/\.00$/, '') : '-';
};
const formatIndianNumber = (value: any, digits = 2) => {
  const num = Number(value);
  return Number.isFinite(num)
    ? num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: digits })
    : '-';
};
const formatIndianCurrency = (value: any) => {
  const num = Number(value);
  return Number.isFinite(num)
    ? num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : '-';
};
const toOptionalInputValue = (value: any) => {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (Number.isFinite(num) && num === 0) return '';
  return String(value);
};
const parseOptionalNumber = (value: string) => value === '' ? null : parseFloat(value);
const LF_RATE_TYPES = new Set(['PD_LOOSE', 'MD_LOOSE', 'PD_WB']);
const EGB_RATE_TYPES = new Set(['PD_LOOSE', 'MD_LOOSE']);
const hasLfForRateType = (value?: string) => LF_RATE_TYPES.has(String(value || '').toUpperCase());
const hasEgbForRateType = (value?: string) => EGB_RATE_TYPES.has(String(value || '').toUpperCase());
const formatPaymentCondition = (value: any, unit?: string) => {
  if (value == null || value === '') return '-';
  const num = Number(value);
  const intVal = Number.isFinite(num) ? Math.round(num) : value;
  return `${intVal} ${unit === 'month' ? 'Month' : 'Days'}`;
};
const formatRateTypeLabel = (value?: string) => {
  if (!value) return '-';
  return value.replace(/_/g, '/').replace('LOOSE', 'Loose').replace('WB', 'WB');
};
const formatRateUnitLabel = (value?: string) => value === 'per_quintal'
  ? 'Per Quintal'
  : value === 'per_kg'
    ? 'Per Kg'
    : value === 'per_ton'
      ? 'Per Ton'
      : 'Per Bag';
const formatSuteUnitLabel = (value?: string) => value === 'per_bag' ? 'Per Bag' : 'Per Ton';
const formatChargeUnitLabel = (value?: string) => value === 'per_quintal'
  ? 'Per Quintal'
  : value === 'percentage'
    ? 'Percent'
    : value === 'lumps'
      ? 'Lumps'
      : value === 'per_bag'
        ? 'Per Bag'
        : value === 'per_kg'
          ? 'Per Kg'
          : value === 'per_ton'
            ? 'Per Ton'
            : 'Amount';
const formatRsWithUnitLabel = (value: any, unit?: string) => {
  if (!hasValue(value)) return 'Pending';
  const unitLabel = formatChargeUnitLabel(unit);
  return `Rs ${formatIndianCurrency(value)}${unitLabel && unitLabel !== 'Amount' ? ` / ${unitLabel.replace(/^Per /, '')}` : ''}`;
};
const formatManagerChargeValue = (value: any, unit?: string) => {
  if (!hasValue(value)) return 'Pending';
  return `${toEnteredAmountText(value)} | ${formatChargeUnitLabel(unit)}`;
};
const formatManagerRateValue = (value: any, unit?: string) => {
  if (!hasValue(value)) return 'Pending';
  return `Rs ${formatIndianCurrency(value)} | ${formatRateUnitLabel(unit)}`;
};
const formatManagerSuteValue = (value: any, unit?: string) => {
  if (!hasValue(value)) return 'Pending';
  return `${toEnteredAmountText(value)} | ${formatSuteUnitLabel(unit)}`;
};
const getOfferActorRole = (offering: any) => {
  const activeOffer = offering?.activeOffer;
  const latestOffer = offering?.latestOffer;
  const fallbackOffer = Array.isArray(offering?.offerVersions) && offering.offerVersions.length > 0
    ? [...offering.offerVersions].sort((left: any, right: any) => new Date(right?.updatedAt || 0).getTime() - new Date(left?.updatedAt || 0).getTime())[0]
    : null;
  return String(
    activeOffer?.updatedByRole
    || activeOffer?.createdByRole
    || latestOffer?.updatedByRole
    || latestOffer?.createdByRole
    || fallbackOffer?.updatedByRole
    || fallbackOffer?.createdByRole
    || ''
  ).trim().toLowerCase();
};
const getOfferActorMeta = (offering: any) => {
  if (getOfferActorRole(offering) === 'manager') {
    return {
      label: 'Manager Added',
      style: {
        color: '#9a3412',
        background: '#ffedd5',
        border: '1px solid #fdba74'
      }
    };
  }
  return {
    label: 'Admin Added',
    style: {
      color: '#155724',
      background: '#d4edda',
      border: '1px solid #c3e6cb'
    }
  };
};
const toTs = (value?: string | null) => {
  const ts = value ? new Date(value).getTime() : 0;
  return Number.isFinite(ts) ? ts : 0;
};
const hasCookingActivity = (entry?: SampleEntry | null) => {
  const history = Array.isArray(entry?.cookingReport?.history)
    ? entry.cookingReport.history.filter(Boolean)
    : [];
  return history.length > 0 || Boolean(
    entry?.cookingReport?.status
    || entry?.cookingReport?.remarks
    || (entry as any)?.cookingReport?.cookingDoneBy
    || (entry as any)?.cookingReport?.cookingApprovedBy
  );
};
const hasValue = (value: any) => value !== null && value !== undefined && value !== '';
const hasPositiveAmount = (value: any) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
};
const sanitizeMoistureInput = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [integerPartRaw, ...rest] = cleaned.split('.');
  const integerPart = integerPartRaw.slice(0, 2);
  const hasTrailingDot = cleaned.endsWith('.') && rest.length === 1 && rest[0] === '';

  if (rest.length === 0) return integerPart;

  const decimalPart = rest.join('').slice(0, 2);
  if (decimalPart) {
    return `${integerPart}.${decimalPart}`.slice(0, 5);
  }

  return hasTrailingDot ? `${integerPart}.` : integerPart;
};
const sanitizeAmountInput = (value: string, integerDigits = 5, decimalDigits = 2) => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [integerPartRaw, ...rest] = cleaned.split('.');
  const integerPart = integerPartRaw.slice(0, integerDigits);
  const hasTrailingDot = cleaned.endsWith('.') && rest.length === 1 && rest[0] === '';

  if (rest.length === 0) return integerPart;

  const decimalPart = rest.join('').slice(0, decimalDigits);
  if (decimalPart) {
    return `${integerPart}.${decimalPart}`;
  }

  return hasTrailingDot ? `${integerPart}.` : integerPart;
};
const getEntryTypeCode = (entryTypeValue?: string) => entryTypeValue === 'DIRECT_LOADED_VEHICLE' ? 'RL' : entryTypeValue === 'LOCATION_SAMPLE' ? 'LS' : 'MS';
const normalizeCaseInsensitiveList = (values: Array<string | null | undefined>) => {
  const normalizedValues: string[] = [];
  values.forEach((value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    normalizedValues.push(normalized);
  });
  return normalizedValues;
};
const getEntrySmellLabel = (entry: any) => {
  const attempts = Array.isArray(entry?.qualityAttemptDetails) ? entry.qualityAttemptDetails : [];
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
const paddyColumnWidths = ['48px', '54px', '74px', '66px', '250px', '118px', '124px', '180px', '180px', '96px', '120px', '120px', '94px', '74px', '70px', '90px', '64px', '78px', '72px', '72px', '120px', '110px', '150px', '104px'];
const compactStatusText = (parts: string[]) => parts.filter(Boolean).join(' | ');
const getAttemptLabel = (attemptNo: number) => {
  if (attemptNo <= 1) return '1st';
  return '2nd';
};
const getQualityAttemptLabel = (attemptNo: number) => {
  if (attemptNo <= 1) return '1st';
  return '2nd';
};
const formatAttemptValue = (value: any, suffix = '') => {
  if (value === null || value === undefined || value === '') return '-';
  return `${toNumberText(value)}${suffix}`;
};
const formatQualityMix = (attempt: QualityAttemptDetail) => {
  const rows = [
    attempt.mix != null && attempt.mix !== '' ? toNumberText(attempt.mix) : ''
  ].filter(Boolean);
  return rows.length ? rows.join(' | ') : '-';
};
const formatOilKandu = (attempt: QualityAttemptDetail) => {
  const rows = [
    attempt.oil != null && attempt.oil !== '' ? `Oil ${toNumberText(attempt.oil)}` : '',
    attempt.kandu != null && attempt.kandu !== '' ? `Kandu ${toNumberText(attempt.kandu)}` : ''
  ].filter(Boolean);
  return rows.length ? rows.join(' | ') : '-';
};
const formatCuttingPair = (attempt: QualityAttemptDetail) => {
  const c1 = attempt.cutting1;
  const c2 = attempt.cutting2;
  if ((c1 === null || c1 === undefined || c1 === '') && (c2 === null || c2 === undefined || c2 === '')) return '-';
  return `${toNumberText(c1)} x ${toNumberText(c2)}`;
};
const formatBendPair = (attempt: QualityAttemptDetail) => {
  const b1 = attempt.bend1;
  const b2 = attempt.bend2;
  if ((b1 === null || b1 === undefined || b1 === '') && (b2 === null || b2 === undefined || b2 === '')) return '-';
  return `${toNumberText(b1)} x ${toNumberText(b2)}`;
};
const formatWBRows = (attempt: QualityAttemptDetail) => {
  const rows = [
    attempt.wbR != null && attempt.wbR !== '' ? `R-${toNumberText(attempt.wbR)}` : '',
    attempt.wbBk != null && attempt.wbBk !== '' ? `BK-${toNumberText(attempt.wbBk)}` : '',
    attempt.wbT != null && attempt.wbT !== '' ? `T-${toNumberText(attempt.wbT)}` : ''
  ].filter(Boolean);
  return rows.length ? rows.join(' | ') : '-';
};
const isMeaningfulCellValue = (value: any) => {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  if (!text || text === '-') return false;
  if (/[A-Za-z]/.test(text)) return true;
  return /[1-9]/.test(text);
};
const normalizeCookingStatus = (status?: string) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PASS') return 'Pass';
  if (normalized === 'MEDIUM') return 'Medium';
  if (normalized === 'FAIL') return 'Fail';
  if (normalized === 'RECHECK') return 'Recheck';
  return normalized ? toTitleCase(normalized.toLowerCase()) : 'Not Applicable';
};

const LoadingLots: React.FC<LoadingLotsProps> = ({ entryType, excludeEntryType }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const isRiceMode = entryType === 'RICE_SAMPLE';
  const tableMinWidth = isRiceMode ? '100%' : '2500px';
  const pageSize = 100;

  const [entries, setEntries] = useState<SampleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ broker: '', variety: '', party: '', location: '', startDate: '', endDate: '' });
  const [selectedEntry, setSelectedEntry] = useState<SampleEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showOfferEditModal, setShowOfferEditModal] = useState(false);
  const [showFinalEditModal, setShowFinalEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qualityHistoryModal, setQualityHistoryModal] = useState<{ open: boolean; entry: SampleEntry | null }>({ open: false, entry: null });
  const [remarksPopup, setRemarksPopup] = useState<{ isOpen: boolean; title: string; text: string }>({ isOpen: false, title: '', text: '' });
  const [offerEditData, setOfferEditData] = useState({
    offerBaseRateValue: '',
    baseRateType: 'PD_WB',
    baseRateUnit: 'per_bag',
    sute: '',
    suteUnit: 'per_bag',
    moistureValue: '',
    hamaliEnabled: false,
    hamaliValue: '',
    hamaliUnit: 'per_bag',
    brokerageEnabled: false,
    brokerageValue: '',
    brokerageUnit: 'per_bag',
    lfEnabled: false,
    lfValue: '',
    lfUnit: 'per_bag',
    cdEnabled: false,
    cdValue: '',
    cdUnit: 'percentage',
    bankLoanEnabled: false,
    bankLoanValue: '',
    bankLoanUnit: 'per_bag',
    paymentConditionEnabled: true,
    paymentConditionValue: '15',
    paymentConditionUnit: 'days',
    egbType: 'mill',
    egbValue: '0',
    customDivisor: '',
    remarks: ''
  });
  const [finalEditData, setFinalEditData] = useState({
    finalSute: '',
    finalSuteUnit: 'per_ton',
    finalBaseRate: '',
    baseRateUnit: 'per_bag',
    suteEnabled: true,
    moistureEnabled: true,
    hamaliEnabled: false,
    brokerageEnabled: false,
    lfEnabled: false,
    moistureValue: '',
    hamali: '',
    hamaliUnit: 'per_bag',
    brokerage: '',
    brokerageUnit: 'per_bag',
    lf: '',
    lfUnit: 'per_bag',
    egbValue: '',
    egbType: 'mill',
    customDivisor: '',
    cdEnabled: false,
    cdValue: '',
    cdUnit: 'percentage',
    bankLoanEnabled: false,
    bankLoanValue: '',
    bankLoanUnit: 'per_bag',
    paymentConditionEnabled: true,
    paymentConditionValue: '15',
    paymentConditionUnit: 'days',
    finalPrice: '',
    remarks: ''
  });
  const [managerData, setManagerData] = useState({
    sute: '', suteUnit: 'per_ton', moistureValue: '', hamali: '', hamaliUnit: 'per_bag',
    brokerage: '', brokerageUnit: 'per_bag', lf: '', lfUnit: 'per_bag',
    finalBaseRate: '', baseRateType: 'PD_LOOSE', egbValue: '', egbType: 'mill',
    cdValue: '', cdUnit: 'percentage', bankLoanValue: '', bankLoanUnit: 'per_bag',
    paymentConditionEnabled: false,
    paymentConditionValue: '15', paymentConditionUnit: 'days'
  });

  const [paddySupervisors, setPaddySupervisors] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const isAdminOrOwner = ['admin', 'owner'].includes(String(user?.role || '').toLowerCase());
  const canEditOffer = ['admin', 'owner', 'manager'].includes(String(user?.role || '').toLowerCase());

  const fetchSupervisors = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/sample-entries/paddy-supervisors`,
        {
          params: { staffType: 'location' },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = res.data as any;
      setPaddySupervisors(data.users || []);
    } catch {
      setPaddySupervisors([]);
    }
  };

  useEffect(() => {
    fetchSupervisors();
  }, []);

  useEffect(() => {
    if (isRiceMode) {
      // setLoadingView('FINAL_LOADING');
    }
  }, [isRiceMode]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (filters.broker) params.broker = filters.broker;
      if (filters.variety) params.variety = filters.variety;
      if (filters.party) params.party = filters.party;
      if (filters.location) params.location = filters.location;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (entryType) params.entryType = entryType;
      if (excludeEntryType) params.excludeEntryType = excludeEntryType;
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/sample-entries/tabs/loading-lots`, { params, headers: { Authorization: `Bearer ${token}` } });
      const data = res.data as { entries: SampleEntry[]; total: number };
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching loading lots:', err);
    }
    setLoading(false);
  }, [page, filters, entryType, excludeEntryType]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleUpdateClick = (entry: SampleEntry) => {
    if (entry.entryType !== 'RICE_SAMPLE' && !entry.qualityParameters?.id && !entry.qualityParameters?.reportedBy) {
      showNotification('Add quality report before filling manager values.', 'error');
      return;
    }
    const o = entry.offering || {};
    setSelectedEntry(entry);
    setManagerData({
      sute: o.finalSute?.toString() ?? o.sute?.toString() ?? '',
      suteUnit: o.finalSuteUnit || o.suteUnit || 'per_ton',
      moistureValue: o.moistureValue?.toString() ?? '',
      hamali: toOptionalInputValue(o.hamali),
      hamaliUnit: o.hamaliUnit || 'per_bag',
      brokerage: toOptionalInputValue(o.brokerage),
      brokerageUnit: o.brokerageUnit || 'per_bag',
      lf: toOptionalInputValue(o.lf),
      lfUnit: o.lfUnit || 'per_bag',
      finalBaseRate: o.finalBaseRate?.toString() ?? o.offerBaseRateValue?.toString() ?? '',
      baseRateType: o.baseRateType || 'PD_WB',
      egbValue: o.egbValue?.toString() ?? '',
      egbType: o.egbType || ((o.egbValue && parseFloat(o.egbValue) > 0) ? 'purchase' : 'mill'),
      cdValue: toOptionalInputValue(o.cdValue),
      cdUnit: o.cdUnit || 'percentage',
      bankLoanValue: toOptionalInputValue(o.bankLoanValue),
      bankLoanUnit: o.bankLoanUnit || 'per_bag',
      paymentConditionEnabled: !(o.paymentConditionValue == null || o.paymentConditionValue === ''),
      paymentConditionValue: o.paymentConditionValue?.toString() ?? '15',
      paymentConditionUnit: o.paymentConditionUnit || 'days'
    });
    setShowModal(true);
  };

  const handleOpenQualityPopup = (entry: SampleEntry) => {
    const qualityAttempts = Array.isArray(entry.qualityAttemptDetails) ? entry.qualityAttemptDetails : [];
    const hasQualityData = qualityAttempts.length > 0 || !!entry.qualityParameters?.reportedBy || !!entry.qualityParameters?.id;
    if (!hasQualityData) {
      showNotification('Quality parameters are not available for this lot yet.', 'error');
      return;
    }
    setQualityHistoryModal({ open: true, entry });
  };

  const handleOpenOfferEdit = (entry: SampleEntry) => {
    const o = entry.offering || {};
    setSelectedEntry(entry);
    setShowModal(false);
    setShowFinalEditModal(false);
    setOfferEditData({
      offerBaseRateValue: o.offerBaseRateValue != null ? String(o.offerBaseRateValue) : '',
      baseRateType: o.baseRateType || 'PD_LOOSE',
      baseRateUnit: o.baseRateUnit || 'per_bag',
      sute: o.sute != null ? String(o.sute) : '',
      suteUnit: o.suteUnit || 'per_bag',
      moistureValue: o.moistureValue != null ? String(o.moistureValue) : '',
      hamaliEnabled: !!o.hamaliEnabled,
      hamaliValue: toOptionalInputValue(o.hamali),
      hamaliUnit: o.hamaliUnit || 'per_bag',
      brokerageEnabled: !!o.brokerageEnabled,
      brokerageValue: toOptionalInputValue(o.brokerage),
      brokerageUnit: o.brokerageUnit || 'per_bag',
      lfEnabled: !!o.lfEnabled,
      lfValue: toOptionalInputValue(o.lf),
      lfUnit: o.lfUnit || 'per_bag',
      cdEnabled: !!o.cdEnabled,
      cdValue: toOptionalInputValue(o.cdValue),
      cdUnit: o.cdUnit || 'percentage',
      bankLoanEnabled: !!o.bankLoanEnabled,
      bankLoanValue: toOptionalInputValue(o.bankLoanValue),
      bankLoanUnit: o.bankLoanUnit || 'per_bag',
      paymentConditionEnabled: o.paymentConditionEnabled != null ? !!o.paymentConditionEnabled : true,
      paymentConditionValue: o.paymentConditionValue != null ? String(o.paymentConditionValue) : '15',
      paymentConditionUnit: o.paymentConditionUnit || 'days',
      egbType: o.egbType || 'mill',
      egbValue: o.egbType === 'purchase' ? (o.egbValue != null ? String(o.egbValue) : '') : '0',
      customDivisor: o.customDivisor != null ? String(o.customDivisor) : '',
      remarks: o.remarks || ''
    });
    setShowOfferEditModal(true);
  };

  const handleOpenFinalEdit = (entry: SampleEntry) => {
    const o = entry.offering || {};
    setSelectedEntry(entry);
    setShowModal(false);
    setShowOfferEditModal(false);
    setFinalEditData({
      finalSute: o.finalSute != null ? String(o.finalSute) : '',
      finalSuteUnit: o.finalSuteUnit || 'per_ton',
      finalBaseRate: o.finalBaseRate != null ? String(o.finalBaseRate) : (o.offerBaseRateValue != null ? String(o.offerBaseRateValue) : ''),
      baseRateUnit: o.baseRateUnit || 'per_bag',
      suteEnabled: o.suteEnabled != null ? !!o.suteEnabled : true,
      moistureEnabled: o.moistureEnabled != null ? !!o.moistureEnabled : true,
      hamaliEnabled: !!o.hamaliEnabled,
      brokerageEnabled: !!o.brokerageEnabled,
      lfEnabled: !!o.lfEnabled,
      moistureValue: o.moistureValue != null ? String(o.moistureValue) : '',
      hamali: toOptionalInputValue(o.hamali),
      hamaliUnit: o.hamaliUnit || 'per_bag',
      brokerage: toOptionalInputValue(o.brokerage),
      brokerageUnit: o.brokerageUnit || 'per_bag',
      lf: toOptionalInputValue(o.lf),
      lfUnit: o.lfUnit || 'per_bag',
      egbValue: o.egbValue != null ? String(o.egbValue) : '',
      egbType: o.egbType || ((o.egbValue && Number(o.egbValue) > 0) ? 'purchase' : 'mill'),
      customDivisor: o.customDivisor != null ? String(o.customDivisor) : '',
      cdEnabled: !!o.cdEnabled,
      cdValue: toOptionalInputValue(o.cdValue),
      cdUnit: o.cdUnit || 'lumps',
      bankLoanEnabled: !!o.bankLoanEnabled,
      bankLoanValue: toOptionalInputValue(o.bankLoanValue),
      bankLoanUnit: o.bankLoanUnit || 'lumps',
      paymentConditionEnabled: o.paymentConditionEnabled != null ? !!o.paymentConditionEnabled : true,
      paymentConditionValue: o.paymentConditionValue != null ? String(o.paymentConditionValue) : '15',
      paymentConditionUnit: o.paymentConditionUnit || 'days',
      finalPrice: o.finalPrice != null ? String(o.finalPrice) : (entry.finalPrice != null ? String(entry.finalPrice) : ''),
      remarks: o.finalRemarks || ''
    });
    setShowFinalEditModal(true);
  };

  const handleSaveOfferEdit = async () => {
    if (!selectedEntry || isSubmitting) return;
    const rateValue = offerEditData.offerBaseRateValue ? parseFloat(offerEditData.offerBaseRateValue) : 0;
    if (!rateValue) {
      showNotification('Enter a valid offer rate.', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      const activeKey = selectedEntry.offering?.activeOfferKey || 'offer1';
      await axios.post(
        `${API_URL}/sample-entries/${selectedEntry.id}/offering-price`,
        {
          offerSlot: activeKey,
          activeOfferKey: activeKey,
          baseRateType: offerEditData.baseRateType,
          baseRateUnit: offerEditData.baseRateUnit,
          offerBaseRateValue: rateValue,
          offerRate: rateValue,
          sute: offerEditData.sute ? parseFloat(offerEditData.sute) : 0,
          suteUnit: offerEditData.suteUnit,
          hamaliEnabled: offerEditData.hamaliEnabled,
          hamali: parseOptionalNumber(offerEditData.hamaliValue),
          hamaliUnit: offerEditData.hamaliUnit,
          moistureValue: offerEditData.moistureValue ? parseFloat(offerEditData.moistureValue) : 0,
          brokerageValue: parseOptionalNumber(offerEditData.brokerageValue),
          brokerageEnabled: offerEditData.brokerageEnabled,
          brokerageUnit: offerEditData.brokerageUnit,
          lfValue: parseOptionalNumber(offerEditData.lfValue),
          lfEnabled: offerEditData.lfEnabled,
          lfUnit: offerEditData.lfUnit,
          egbValue: offerEditData.egbType === 'mill' ? 0 : (offerEditData.egbValue ? parseFloat(offerEditData.egbValue) : 0),
          egbType: offerEditData.egbType,
          customDivisor: offerEditData.customDivisor ? parseFloat(offerEditData.customDivisor) : null,
          cdEnabled: offerEditData.cdEnabled,
          cdValue: parseOptionalNumber(offerEditData.cdValue),
          cdUnit: offerEditData.cdUnit,
          bankLoanEnabled: offerEditData.bankLoanEnabled,
          bankLoanValue: parseOptionalNumber(offerEditData.bankLoanValue),
          bankLoanUnit: offerEditData.bankLoanUnit,
          paymentConditionValue: offerEditData.paymentConditionEnabled && offerEditData.paymentConditionValue ? parseFloat(offerEditData.paymentConditionValue) : null,
          paymentConditionUnit: offerEditData.paymentConditionUnit,
          remarks: offerEditData.remarks
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('Offer rate updated', 'success');
      setShowOfferEditModal(false);
      setSelectedEntry(null);
      fetchEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to update offer rate', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveFinalEdit = async () => {
    if (!selectedEntry || isSubmitting) return;
    const rateValue = finalEditData.finalBaseRate ? parseFloat(finalEditData.finalBaseRate) : 0;
    if (!rateValue) {
      showNotification('Enter a valid final rate.', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/sample-entries/${selectedEntry.id}/final-price`,
        {
          finalSute: finalEditData.finalSute ? parseFloat(finalEditData.finalSute) : null,
          finalSuteUnit: finalEditData.finalSuteUnit,
          finalBaseRate: rateValue,
          baseRateUnit: finalEditData.baseRateUnit,
          suteEnabled: finalEditData.suteEnabled,
          moistureEnabled: finalEditData.moistureEnabled,
          hamaliEnabled: finalEditData.hamaliEnabled,
          brokerageEnabled: finalEditData.brokerageEnabled,
          lfEnabled: finalEditData.lfEnabled,
          moistureValue: finalEditData.moistureValue ? parseFloat(finalEditData.moistureValue) : null,
          hamali: finalEditData.hamali ? parseFloat(finalEditData.hamali) : null,
          hamaliUnit: finalEditData.hamaliUnit,
          brokerage: finalEditData.brokerage ? parseFloat(finalEditData.brokerage) : null,
          brokerageUnit: finalEditData.brokerageUnit,
          lf: finalEditData.lf ? parseFloat(finalEditData.lf) : null,
          lfUnit: finalEditData.lfUnit,
          egbValue: finalEditData.egbType === 'mill' ? 0 : (finalEditData.egbValue ? parseFloat(finalEditData.egbValue) : null),
          egbType: finalEditData.egbType,
          customDivisor: finalEditData.customDivisor ? parseFloat(finalEditData.customDivisor) : null,
          cdEnabled: finalEditData.cdEnabled,
          cdValue: finalEditData.cdValue ? parseFloat(finalEditData.cdValue) : null,
          cdUnit: finalEditData.cdUnit,
          bankLoanEnabled: finalEditData.bankLoanEnabled,
          bankLoanValue: finalEditData.bankLoanValue ? parseFloat(finalEditData.bankLoanValue) : null,
          bankLoanUnit: finalEditData.bankLoanUnit,
          paymentConditionValue: finalEditData.paymentConditionEnabled && finalEditData.paymentConditionValue ? parseFloat(finalEditData.paymentConditionValue) : null,
          paymentConditionUnit: finalEditData.paymentConditionUnit,
          finalPrice: finalEditData.finalPrice ? parseFloat(finalEditData.finalPrice) : rateValue,
          remarks: finalEditData.remarks,
          isFinalized: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('Final rate updated', 'success');
      setShowFinalEditModal(false);
      setSelectedEntry(null);
      fetchEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to update final rate', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleSaveValues = async () => {
    if (!selectedEntry || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      const o = selectedEntry.offering || {};
      const hasLf = hasLfForRateType(managerData.baseRateType || o.baseRateType);
      const hasEgb = hasEgbForRateType(managerData.baseRateType || o.baseRateType);
      const cdEnabled = !!managerData.cdValue || !!o.cdEnabled;
      const bankLoanEnabled = !!managerData.bankLoanValue || !!o.bankLoanEnabled;
      const payload: any = {
        finalSute: managerData.sute ? parseFloat(managerData.sute) : (o.finalSute ?? o.sute ?? null),
        finalSuteUnit: managerData.suteUnit || o.finalSuteUnit || o.suteUnit || 'per_ton',
        finalBaseRate: managerData.finalBaseRate ? parseFloat(managerData.finalBaseRate) : (o.finalBaseRate ?? o.offerBaseRateValue ?? null),
        suteEnabled: o.suteEnabled, moistureEnabled: o.moistureEnabled, hamaliEnabled: o.hamaliEnabled, brokerageEnabled: o.brokerageEnabled, lfEnabled: o.lfEnabled,
        moistureValue: managerData.moistureValue ? parseFloat(managerData.moistureValue) : (o.moistureValue ?? null),
        hamali: managerData.hamali ? parseFloat(managerData.hamali) : (o.hamali ?? null),
        hamaliUnit: managerData.hamaliUnit || o.hamaliUnit || 'per_bag',
        brokerage: managerData.brokerage ? parseFloat(managerData.brokerage) : (o.brokerage ?? null),
        brokerageUnit: managerData.brokerageUnit || o.brokerageUnit || 'per_bag',
        lf: hasLf ? (managerData.lf ? parseFloat(managerData.lf) : (o.lf ?? null)) : 0,
        lfUnit: managerData.lfUnit || o.lfUnit || 'per_bag',
        egbValue: hasEgb && managerData.egbType !== 'mill' ? (managerData.egbValue ? parseFloat(managerData.egbValue) : (o.egbValue ?? 0)) : 0,
        egbType: hasEgb ? (managerData.egbType || o.egbType || 'mill') : 'mill',
        customDivisor: o.customDivisor ?? null,
        cdEnabled,
        cdValue: managerData.cdValue ? parseFloat(managerData.cdValue) : (o.cdValue ?? null),
        cdUnit: managerData.cdUnit || o.cdUnit || 'lumps',
        bankLoanEnabled,
        bankLoanValue: managerData.bankLoanValue ? parseFloat(managerData.bankLoanValue) : (o.bankLoanValue ?? null),
        bankLoanUnit: managerData.bankLoanUnit || o.bankLoanUnit || 'lumps',
        paymentConditionValue: managerData.paymentConditionEnabled && managerData.paymentConditionValue ? parseInt(managerData.paymentConditionValue, 10) : null,
        paymentConditionUnit: managerData.paymentConditionUnit || o.paymentConditionUnit || 'days',
        isFinalized: true
      };
      await axios.post(`${API_URL}/sample-entries/${selectedEntry.id}/final-price`, payload, { headers: { Authorization: `Bearer ${token}` } });
      setShowModal(false);
      setSelectedEntry(null);
      fetchEntries();
      showNotification('Values saved successfully. Lot moved to Pending Allotting Supervisor', 'success');
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to save values', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignResample = async (entry: SampleEntry) => {
    const selected = assignments[entry.id] !== undefined ? assignments[entry.id] : (entry.sampleCollectedBy || '');

    if (!selected) {
      showNotification('Select Sample Collected By', 'error');
      return;
    }

    if (selected === entry.sampleCollectedBy && entry.sampleCollectedBy !== null) {
      showNotification('No changes made to supervisor assignment', 'info');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        sampleCollectedBy: selected
      };
      if (entry.entryType !== 'LOCATION_SAMPLE') {
        payload.entryType = 'LOCATION_SAMPLE';
      }
      await axios.put(`${API_URL}/sample-entries/${entry.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification('Resample user assigned successfully', 'success');
      fetchEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to assign user', 'error');
    }
  };

  const groupedByDateBroker: Record<string, Record<string, SampleEntry[]>> = {};

  const filteredEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const dateA = new Date(a.entryDate).getTime();
      const dateB = new Date(b.entryDate).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const brokerCmp = String(a.brokerName || '').localeCompare(String(b.brokerName || ''));
      if (brokerCmp !== 0) return brokerCmp;
      const serialA = Number.isFinite(Number(a.serialNo)) ? Number(a.serialNo) : null;
      const serialB = Number.isFinite(Number(b.serialNo)) ? Number(b.serialNo) : null;
      if (serialA !== null && serialB !== null && serialA !== serialB) return serialA - serialB;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });
  }, [entries]);

  filteredEntries.forEach((entry) => {
    const dt = new Date(entry.entryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const broker = entry.brokerName || 'Unknown';
    if (!groupedByDateBroker[dt]) groupedByDateBroker[dt] = {};
    if (!groupedByDateBroker[dt][broker]) groupedByDateBroker[dt][broker] = [];
    groupedByDateBroker[dt][broker].push(entry);
  });

  const isManagerOrOwner = user?.role === 'manager' || user?.role === 'owner' || user?.role === 'admin';
  const totalPages = Math.ceil(total / pageSize);

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
    const history = entry.sampleCollectedHistory || [];
    const fallbackCollector = history.length > 0 
      ? history[0] 
      : entry.sampleCollectedBy;
    const collectorLabel = getCollectorLabel(fallbackCollector || null);
    
    // For resamples or office samples, we still want to show the original collector
    // and potentially the office name if it's an office sample.
    const isResample = String((entry as any)?.lotSelectionDecision || '').toUpperCase() === 'FAIL' || Boolean((entry as any)?.resampledLotId);
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
  const buildOrderedNameList = (values: Array<string | null | undefined>) => values
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  const renderIndexedNames = (
    names: string[],
    formatter: (value: string) => string,
    options?: { primaryColor?: string; secondaryColor?: string; }
  ) => {
    if (names.length === 0) return '-';
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          lineHeight: '1.35',
          fontWeight: 700,
          color: '#1f2937',
          fontSize: '13px'
        }}
      >
        {names.map((name, index) => (
          <div key={`${name}-${index}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <span style={{ minWidth: '16px', color: '#64748b', fontWeight: 800 }}>{index + 1}.</span>
            <span style={{ color: index === 0 ? (options?.primaryColor || '#1f2937') : (options?.secondaryColor || '#334155') }}>
              {formatter(name)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderCollectedByHistory = (entry: SampleEntry) => {
    const history = entry.sampleCollectedHistory || [];
    
    // For single collector or empty history, just show the primary collector
    if (history.length <= 1) {
      const firstCollector = history.length > 0 ? history[0] : entry.sampleCollectedBy;
      if (!firstCollector) return '-';
      
      const isGivenToOffice = (entry as any).sampleGivenToOffice;
      if (isGivenToOffice) {
        const officeNames = buildOrderedNameList([getCreatorLabel(entry), getCollectorLabel(firstCollector)]);
        return renderIndexedNames(officeNames, (name) => name, { primaryColor: '#7e22ce', secondaryColor: '#1f2937' });
      }
      return (
        <div style={{ fontWeight: 700, color: '#1f2937', fontSize: '13px' }}>
          {getCollectorLabel(firstCollector)}
        </div>
      );
    }

    // For multiple collectors (resample), show indexed names (1. Name, 2. Name)
    const formattedNames = history.map(h => getCollectorLabel(h));
    return renderIndexedNames(formattedNames, (name) => name);
  };

  const qualityModalEntry = qualityHistoryModal.entry;
  const qualityAttemptDetails = [...(qualityModalEntry?.qualityAttemptDetails || [])]
    .sort((a, b) => (a.attemptNo || 0) - (b.attemptNo || 0));
  const qualityModalCollectedNames = buildOrderedNameList(
    (qualityModalEntry?.sampleCollectedHistory || []).filter(Boolean).length > 0
      ? (qualityModalEntry?.sampleCollectedHistory || [])
      : (qualityModalEntry?.sampleCollectedBy ? [qualityModalEntry.sampleCollectedBy] : [])
  );
  const qualityModalHasCookingHistory = hasCookingActivity(qualityModalEntry);

  const modalOffering = selectedEntry?.offering || {};
  const modalRateType = managerData.baseRateType || modalOffering.baseRateType || 'PD_LOOSE';
  const modalHasLf = hasLfForRateType(modalRateType);
  const modalHasEgb = hasEgbForRateType(modalRateType);
  const modalBaseRateUnit = modalOffering.baseRateUnit || 'per_bag';
  const modalSuteUnit = managerData.suteUnit || modalOffering.finalSuteUnit || modalOffering.suteUnit;
  const modalHamaliUnit = managerData.hamaliUnit || modalOffering.hamaliUnit || 'per_bag';
  const modalBrokerageUnit = managerData.brokerageUnit || modalOffering.brokerageUnit || 'per_bag';
  const modalLfUnit = managerData.lfUnit || modalOffering.lfUnit || 'per_bag';
  const modalCdUnit = managerData.cdUnit || modalOffering.cdUnit || 'percentage';
  const modalBankLoanUnit = managerData.bankLoanUnit || modalOffering.bankLoanUnit || 'per_bag';
  const modalPaymentUnit = managerData.paymentConditionUnit || modalOffering.paymentConditionUnit || 'days';
  const modalPaymentEnabled = modalOffering.paymentConditionEnabled != null ? !!modalOffering.paymentConditionEnabled : !!managerData.paymentConditionEnabled;
  const modalSuteMissing = !!selectedEntry && modalOffering.suteEnabled === false && !parseFloat(modalOffering.finalSute ?? '') && !parseFloat(modalOffering.sute ?? '');
  const modalMoistureMissing = !!selectedEntry && modalOffering.moistureEnabled === false && !parseFloat(modalOffering.moistureValue ?? '');
  const modalHamaliMissing = !!selectedEntry && modalOffering.hamaliEnabled === false && !hasPositiveAmount(modalOffering.hamali ?? modalOffering.hamaliPerKg);
  const modalBrokerageMissing = !!selectedEntry && modalOffering.brokerageEnabled === false && !parseFloat(modalOffering.brokerage ?? '');
  const modalLfMissing = !!selectedEntry && modalHasLf && modalOffering.lfEnabled === false && !parseFloat(modalOffering.lf ?? '');
  const modalCdMissing = !!selectedEntry && !!modalOffering.cdEnabled && !parseFloat(modalOffering.cdValue ?? '');
  const modalBankLoanMissing = !!selectedEntry && !!modalOffering.bankLoanEnabled && !parseFloat(modalOffering.bankLoanValue ?? '');
  const modalPaymentMissing = !!selectedEntry && modalPaymentEnabled && !parseInt(modalOffering.paymentConditionValue ?? '', 10);
  const modalEgbMissing = !!selectedEntry && modalHasEgb && modalOffering.egbType === 'purchase' && !parseFloat(modalOffering.egbValue ?? '');
  const modalMissingFields = [
    modalSuteMissing ? 'Sute' : '',
    modalMoistureMissing ? 'Moisture (%)' : '',
    modalHamaliMissing ? `Hamali (${formatChargeUnitLabel(modalHamaliUnit)})` : '',
    modalBrokerageMissing ? `Brokerage (${formatChargeUnitLabel(modalBrokerageUnit)})` : '',
    modalLfMissing ? `LF (${formatChargeUnitLabel(modalLfUnit)})` : '',
    modalCdMissing ? 'CD' : '',
    modalBankLoanMissing ? 'Bank Loan' : '',
    modalPaymentMissing ? 'Payment' : '',
    modalEgbMissing ? 'EGB' : ''
  ].filter(Boolean);
  const modalCardStyle: React.CSSProperties = { borderRadius: '8px', padding: '10px', border: '1px solid #d7e1ea', background: '#f8fafc', minWidth: 0 };
  const modalEditableCardStyle: React.CSSProperties = { ...modalCardStyle, border: '1px solid #f5c542', background: '#fffdf3' };
  const modalLabelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '6px' };
  const modalMetaStyle: React.CSSProperties = { fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '6px' };
  const modalReadonlyValueStyle: React.CSSProperties = { minHeight: '34px', borderRadius: '6px', border: '1px solid #d0d7de', background: '#eef2f7', padding: '7px 9px', fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', fontWeight: 600 };
  const modalInputStyle: React.CSSProperties = { width: '100%', padding: '7px 9px', border: '1px solid #3498db', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box', background: '#fff' };
  const modalInlineSelectStyle: React.CSSProperties = { width: '110px', padding: '7px 9px', border: '1px solid #3498db', borderRadius: '6px', fontSize: '12px', background: '#fff' };
  const modalOfferActorMeta = getOfferActorMeta(modalOffering);
  const modalTagStyle = (editable: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '999px',
    marginBottom: '6px',
    background: editable ? '#fff3cd' : modalOfferActorMeta.style.background,
    color: editable ? '#8a6400' : modalOfferActorMeta.style.color,
    border: editable ? '1px solid #f9d976' : modalOfferActorMeta.style.border
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          type="button"
          style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, border: 'none', borderRadius: '4px', background: '#1565c0', color: 'white', cursor: 'default' }}
        >
          Final Loading Lots
        </button>
      </div>

      <div style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>Showing {filteredEntries.length} lots (of {total} total passed lots)</span>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowFilters(!showFilters)} style={{ padding: '6px 14px', fontSize: '13px', background: showFilters ? '#e74c3c' : '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {showFilters ? 'Hide Filters' : 'Filters'} ▾
              </button>
              {showFilters && (
                <div style={{ position: 'absolute', right: 0, top: '38px', zIndex: 5, display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', padding: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e0e0e0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxWidth: '90vw' }}>
                  <select
                    value={filters.broker}
                    onChange={(e) => setFilters({ ...filters, broker: e.target.value })}
                    style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px', width: '160px' }}
                  >
                    <option value="">Broker</option>
                    {Array.from(new Set(entries.map((entry) => entry.brokerName))).sort().map((broker) => (
                      <option key={broker} value={broker}>{broker}</option>
                    ))}
                  </select>
                  <select
                    value={filters.variety}
                    onChange={(e) => setFilters({ ...filters, variety: e.target.value })}
                    style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px', width: '160px' }}
                  >
                    <option value="">Variety</option>
                    {Array.from(new Set(entries.map((entry) => entry.variety))).sort().map((variety) => (
                      <option key={variety} value={variety}>{variety}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Party"
                    value={filters.party}
                    onChange={(e) => setFilters({ ...filters, party: e.target.value })}
                    style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px', width: '160px' }}
                  />
                  <input
                    placeholder="Location"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px', width: '160px' }}
                  />
                  <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px' }} />
                  <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px' }} />
                  <button onClick={() => { setPage(1); fetchEntries(); }} style={{ padding: '6px 14px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Apply</button>
                  <button onClick={() => { setFilters({ broker: '', variety: '', party: '', location: '', startDate: '', endDate: '' }); setPage(1); }} style={{ padding: '6px 14px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Clear</button>
                </div>
              )}
            </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '6px' }}>
            {loading ? <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>Loading...</div> : filteredEntries.length === 0 ? <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>No loading lots found in this tab</div> : Object.entries(groupedByDateBroker).map(([dateStr, brokerGroups]) => {
              let brokerSeq = 0;
              return (
                <div key={dateStr}>
                  {Object.entries(brokerGroups).sort(([a], [b]) => a.localeCompare(b)).map(([brokerName, brokerEntries], brokerIdx) => {
                    const orderedEntries = [...brokerEntries].sort((a, b) => {
                      const serialA = Number.isFinite(Number(a.serialNo)) ? Number(a.serialNo) : null;
                      const serialB = Number.isFinite(Number(b.serialNo)) ? Number(b.serialNo) : null;
                      if (serialA !== null && serialB !== null && serialA !== serialB) return serialA - serialB;
                      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                    });
                    brokerSeq++;
                    return (
                      <div key={brokerName} style={{ marginBottom: 0 }}>
                        {brokerIdx === 0 && <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white', padding: '6px 10px', fontWeight: 700, fontSize: '14px', textAlign: 'center', letterSpacing: '0.5px', minWidth: tableMinWidth }}>{(() => { const d = new Date(brokerEntries[0]?.entryDate); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; })()}&nbsp;&nbsp;{isRiceMode ? 'Rice Sample' : 'Paddy Sample'}</div>}
                        <div style={{ background: '#e8eaf6', color: '#000', padding: '4px 10px', fontWeight: 700, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '4px', minWidth: tableMinWidth }}><span style={{ fontSize: '13.5px', fontWeight: 800 }}>{brokerSeq}.</span> {brokerName}</div>
                        <table style={{ width: '100%', minWidth: tableMinWidth, borderCollapse: 'collapse', fontSize: '12px', tableLayout: isRiceMode ? 'fixed' : 'fixed', border: '1px solid #000' }}>
                          {!isRiceMode && (
                            <colgroup>
                              {paddyColumnWidths.map((width, widthIndex) => (
                                <col key={`${brokerName}-col-${widthIndex}`} style={{ width }} />
                              ))}
                            </colgroup>
                          )}
                          <thead style={{ position: 'sticky', top: 56, zIndex: 2 }}>
                            <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
                              {(isRiceMode ? ['SL', 'Type', 'Bags', 'Pkg', 'Party Name', 'Rice Location', 'Variety', 'Final Rate', 'Sute', 'Mst%', 'Hamali', 'Bkrg', 'LF', 'Status', 'Action'] : ['SL No', 'Type', 'Bags', 'Pkg', 'Party Name', 'Paddy Location', 'Variety', 'Sample Collected By', 'Sample Report By', 'Smell', 'Quality Report', 'Cooking Report', 'Final Rate', 'Sute', 'Moist', 'Brokerage', 'LF', 'Hamali', 'CD', 'EGB', 'Bank Loan', 'Payment', 'Status', 'Action']).map((header) => (
                                <th
                                  key={header}
                                  style={{
                                    border: '1px solid #000',
                                    padding: '3px 4px',
                                    textAlign: ['Status', 'Action', 'EGB', 'Sute', 'Moist', 'Mst%'].includes(header) ? 'center' : 'left',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    fontSize: '12px'
                                  }}
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {orderedEntries.map((entry, index) => {
                              const o = entry.offering || {};
                              const hasLf = hasLfForRateType(o.baseRateType);
                              const hasEgb = hasEgbForRateType(o.baseRateType);
                              const effectiveHamaliValue = o.hamali ?? o.hamaliPerKg;
                              const suteMissing = o.suteEnabled === false && !parseFloat(o.finalSute) && !parseFloat(o.sute);
                              const mstMissing = o.moistureEnabled === false && !parseFloat(o.moistureValue);
                              const hamaliMissing = o.hamaliEnabled === false && !hasPositiveAmount(effectiveHamaliValue);
                              const bkrgMissing = o.brokerageEnabled === false && !parseFloat(o.brokerage);
                              const lfMissing = hasLf && o.lfEnabled === false && !parseFloat(o.lf);
                              const cdMissing = !!o.cdEnabled && !parseFloat(o.cdValue);
                              const bankLoanMissing = !!o.bankLoanEnabled && !parseFloat(o.bankLoanValue);
                              const paymentMissing = !(o.paymentConditionValue == null || o.paymentConditionValue === '') && !parseInt(o.paymentConditionValue, 10);
                              const needsFill = suteMissing || mstMissing || hamaliMissing || bkrgMissing || lfMissing || cdMissing || bankLoanMissing || paymentMissing;
                              const missingFieldLabels = [
                                suteMissing ? 'Sute' : '',
                                mstMissing ? 'Moist' : '',
                                bkrgMissing ? 'Brokerage' : '',
                                lfMissing ? 'LF' : '',
                                hamaliMissing ? 'Hamali' : '',
                                cdMissing ? 'CD' : '',
                                bankLoanMissing ? 'BL' : '',
                                paymentMissing ? 'Payment' : ''
                              ].filter(Boolean);
                              const qualityData = entry.qualityParameters || {};
                              const qualityAttemptsBase = [...(entry.qualityAttemptDetails || [])].sort((a, b) => (a.attemptNo || 0) - (b.attemptNo || 0));
                              const qualityAttempts = [...qualityAttemptsBase];
                              const hasQualityReport = qualityAttempts.length > 0 || !!qualityData.reportedBy || !!qualityData.id;
                              const isResampleCase = qualityAttempts.length > 1 || String(entry.lotSelectionDecision || '').toUpperCase() === 'FAIL';
                              const lotSelectionTs = toTs((entry as any).lotSelectionAt || (entry as any).updatedAt || (entry as any).createdAt || '');
                              const historyReportedNames = buildOrderedNameList(
                                (entry.qualityReportHistory || [])
                              );
                              const sampleReportNames = buildOrderedNameList(
                                qualityAttempts.length > 0
                                  ? qualityAttempts
                                    .sort((a, b) => (a.attemptNo || 0) - (b.attemptNo || 0))
                                    .map((attempt, idx) => String(attempt.reportedBy || historyReportedNames[idx] || qualityData.reportedBy || '').trim())
                                  : (historyReportedNames.length > 0
                                    ? historyReportedNames.map((name) => String(name || qualityData.reportedBy || '').trim())
                                    : (entry.qualityParameters?.reportedBy ? [String(entry.qualityParameters.reportedBy).trim()] : []))
                              );

                              const sampleCollectedNames = buildOrderedNameList(
                                (entry.sampleCollectedHistory && entry.sampleCollectedHistory.length > 1)
                                  ? entry.sampleCollectedHistory
                                  : (sampleReportNames.length > 1 && entry.sampleCollectedBy
                                    ? [entry.sampleCollectedBy, ...Array(sampleReportNames.length - 1).fill(entry.sampleCollectedBy)]
                                    : (entry.sampleCollectedBy ? [entry.sampleCollectedBy] : []))
                              );
                              const isResamplePendingAdminAssign = entry.lotSelectionDecision === 'FAIL' && !entry.sampleCollectedBy;
                              const cookingHistoryRaw = Array.isArray(entry.cookingReport?.history) ? entry.cookingReport?.history || [] : [];
                              const cookingHistory = [...cookingHistoryRaw].sort((a, b) => toTs(a?.date || '') - toTs(b?.date || ''));
                              const firstAttemptEvents = isResampleCase && lotSelectionTs > 0
                                ? cookingHistory.filter((item) => toTs(item?.date || '') < lotSelectionTs)
                                : cookingHistory;
                              const secondAttemptEvents = isResampleCase && lotSelectionTs > 0
                                ? cookingHistory.filter((item) => toTs(item?.date || '') >= lotSelectionTs)
                                : [];

                              const deriveCookingAttempt = (
                                events: CookingAttemptDetail[],
                                attemptNo: number,
                                fallback?: { status?: string; remarks?: string; updatedAt?: string; createdAt?: string },
                                forcePendingIfEmpty = false
                              ) => {
                                const staffEvents = events.filter((item) => !!item?.cookingDoneBy && !item?.status);
                                const approvedEvents = events.filter((item) => !!item?.status);
                                const lastStaff = staffEvents[staffEvents.length - 1] || null;
                                const lastApproved = approvedEvents[approvedEvents.length - 1] || null;
                                const lastStaffTs = toTs(lastStaff?.date || '');
                                const lastApprovedTs = toTs(lastApproved?.date || fallback?.updatedAt || fallback?.createdAt || '');

                                if (lastStaff && (!lastApproved || lastStaffTs > lastApprovedTs)) {
                                  return { attemptNo, status: 'Pending', remarks: '', date: lastStaff?.date || '' };
                                }
                                if (lastApproved) {
                                  return {
                                    attemptNo,
                                    status: normalizeCookingStatus(lastApproved?.status || undefined),
                                    remarks: lastApproved?.remarks || '',
                                    date: lastApproved?.date || ''
                                  };
                                }
                                if (fallback?.status) {
                                  return {
                                    attemptNo,
                                    status: normalizeCookingStatus(fallback.status),
                                    remarks: fallback.remarks || '',
                                    date: fallback.updatedAt || fallback.createdAt || ''
                                  };
                                }
                                if (forcePendingIfEmpty) {
                                  return { attemptNo, status: 'Pending', remarks: '', date: '' };
                                }
                                return null;
                              };

                              const firstCookingAttempt = deriveCookingAttempt(
                                firstAttemptEvents,
                                1,
                                !isResampleCase ? entry.cookingReport : undefined,
                                !isResampleCase
                              );
                              const secondCookingAttempt = isResampleCase
                                ? deriveCookingAttempt(secondAttemptEvents, 2, undefined, true)
                                : null;
                              const cookingAttempts = [firstCookingAttempt, secondCookingAttempt].filter(Boolean) as Array<{ attemptNo: number; status: string; remarks: string; date: string }>;
                              const cookingMap = new Map<number, { attemptNo: number; status: string; remarks: string; date: string }>();
                              cookingAttempts.forEach((attempt) => cookingMap.set(attempt.attemptNo, attempt));
                              const hasSecondQuality = qualityAttempts.some((attempt) => attempt.attemptNo === 2);
                              const secondCookingStatus = cookingMap.get(2)?.status;
                              const secondCookingResolved = entry.lotSelectionDecision === 'PASS_WITHOUT_COOKING'
                                ? true
                                : !!secondCookingStatus && secondCookingStatus !== 'Pending' && secondCookingStatus !== '-';
                              const resampleComplete = isResampleCase && hasSecondQuality && secondCookingResolved;
                              const isResampleActive = isResampleCase && !resampleComplete;
                              const failedCookingAttempt = [...cookingAttempts]
                                .reverse()
                                .find((attempt) => attempt.status === 'Fail');
                              const failedCookingLabel = failedCookingAttempt
                                ? `Cooking Failed - ${getAttemptLabel(failedCookingAttempt.attemptNo)}`
                                : '';
                              const adjustedAttemptCount = isResampleCase ? 2 : 1;
                              const rowBg = entry.entryType === 'DIRECT_LOADED_VEHICLE' ? '#e3f2fd' : entry.entryType === 'LOCATION_SAMPLE' ? '#ffe0b2' : '#ffffff';
                              const typeCode = getEntryTypeCode(entry.entryType);
                              const partyNameText = toTitleCase(entry.partyName || '').trim();
                              const lorryText = entry.lorryNumber ? entry.lorryNumber.toUpperCase() : '';
                              const partyLabel = entry.entryType === 'DIRECT_LOADED_VEHICLE'
                                ? (lorryText || partyNameText || '-')
                                : (partyNameText || lorryText || '-');
                              const showLorrySecondLine = entry.entryType === 'DIRECT_LOADED_VEHICLE'
                                && !!partyNameText
                                && !!lorryText
                                && partyNameText.toUpperCase() !== lorryText;
                              const finalRateValue = o.finalBaseRate ?? o.offerBaseRateValue;
                              const finalRateUnit = unitLabel(o.baseRateUnit || 'per_bag');
                              const cellStyle = (missing: boolean): React.CSSProperties => ({ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', background: missing ? '#fff3cd' : rowBg, color: missing ? '#856404' : '#333', fontWeight: missing ? '700' : '400', fontSize: '12px' });
                              const offerActorMeta = getOfferActorMeta(o);

                              if (isRiceMode) {
                                return (
                                  <tr key={entry.id} style={{ background: rowBg }}>
                                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>{entry.serialNo || (index + 1)}</td>
                                    <td style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'center', verticalAlign: 'middle' }}>{entry.entryType === 'DIRECT_LOADED_VEHICLE' ? <span style={{ color: 'white', backgroundColor: '#1565c0', padding: '1px 4px', borderRadius: '3px', fontSize: '10px', fontWeight: 800 }}>RL</span> : entry.entryType === 'LOCATION_SAMPLE' ? <span style={{ color: 'white', backgroundColor: '#e67e22', padding: '1px 4px', borderRadius: '3px', fontSize: '10px', fontWeight: 800 }}>LS</span> : <span style={{ color: '#333', backgroundColor: '#fff', padding: '1px 4px', borderRadius: '3px', fontSize: '10px', fontWeight: 800, border: '1px solid #ccc' }}>MS</span>}</td>
                                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>{entry.bags?.toLocaleString('en-IN')}</td>
                                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', fontSize: '14px' }}>{entry.packaging || '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', fontSize: '14px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <button
                                          type="button"
                                          onClick={() => hasQualityReport && handleOpenQualityPopup(entry)}
                                          style={{ background: 'transparent', border: 'none', color: '#1565c0', textDecoration: hasQualityReport ? 'underline' : 'none', cursor: hasQualityReport ? 'pointer' : 'default', fontWeight: 700, fontSize: '14px', padding: 0, textAlign: 'left' }}
                                        >
                                          {partyLabel}
                                        </button>
                                        {showLorrySecondLine ? (
                                          <div style={{ fontSize: '12px', color: '#1565c0', fontWeight: 600 }}>{lorryText}</div>
                                        ) : null}
                                        {entry.sampleCollectedBy ? (
                                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                                            {getCollectorLabel(entry.sampleCollectedBy)}
                                          </div>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', fontSize: '14px' }}>{entry.location || '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', fontSize: '14px' }}>{entry.variety}</td>
                                    <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', fontSize: '14px' }}>{finalRateValue ? <div><div style={{ fontWeight: 700, fontSize: '14px', color: '#2c3e50' }}>Rs {finalRateValue}<span style={{ fontSize: '10px', color: '#666' }}>{finalRateUnit}</span></div><div style={{ fontSize: '9px', color: '#888', fontWeight: 500 }}>{o.baseRateType?.replace('_', '/') || ''}</div>{o.egbValue != null && o.egbValue > 0 && <div style={{ fontSize: '9px', color: '#e67e22', fontWeight: 600 }}>EGB: {o.egbValue}</div>}</div> : '-'}</td>
                                    <td style={cellStyle(suteMissing)}>{suteMissing ? 'Need' : fmtVal(o.finalSute ?? o.sute, o.finalSuteUnit ?? o.suteUnit)}</td>
                                    <td style={cellStyle(mstMissing)}>{mstMissing ? 'Need' : (o.moistureValue != null ? `${o.moistureValue}%` : '-')}</td>
                                    <td style={cellStyle(hamaliMissing)}>{hamaliMissing ? 'Need' : (hasValue(effectiveHamaliValue) ? fmtVal(effectiveHamaliValue, o.hamaliUnit) : o.hamaliEnabled === false ? 'Pending' : '-')}</td>
                                    <td style={cellStyle(bkrgMissing)}>{bkrgMissing ? 'Need' : (o.brokerage ? fmtVal(o.brokerage, o.brokerageUnit) : o.brokerageEnabled === false ? 'Pending' : '-')}</td>
                                    <td style={cellStyle(lfMissing)}>{lfMissing ? 'Need' : (o.lf ? fmtVal(o.lf, o.lfUnit) : o.lfEnabled === false ? 'Pending' : '-')}</td>
                                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}><div><span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: '#d4edda', color: '#155724', whiteSpace: 'nowrap', display: 'inline-block', marginBottom: '2px', border: '1px solid #c3e6cb' }}>Admin Added</span></div><div><span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: needsFill ? '#fff3cd' : '#d4edda', color: needsFill ? '#856404' : '#155724', whiteSpace: 'nowrap', display: 'inline-block', marginBottom: '2px', border: needsFill ? '1px solid #ffeeba' : '1px solid #c3e6cb' }}>{needsFill ? 'Manager Missing' : 'Manager Added'}</span></div></td>
                                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{isManagerOrOwner && <button onClick={() => handleUpdateClick(entry)} style={{ padding: '3px 4px', background: needsFill ? '#e67e22' : '#3498db', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>{needsFill ? 'Fill Values' : 'View/Edit'}</button>}</td>
                                  </tr>
                                );
                              }

                              return (
                                <tr key={entry.id} style={{ background: rowBg }}>
                                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 700 }}>{entry.serialNo || (index + 1)}</td>
                                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center' }}><span style={{ display: 'inline-block', minWidth: '28px', padding: '1px 4px', borderRadius: '3px', fontSize: '10px', fontWeight: 800, color: typeCode === 'RL' || typeCode === 'LS' ? '#fff' : '#333', backgroundColor: typeCode === 'RL' ? '#1565c0' : typeCode === 'LS' ? '#e67e22' : '#fff', border: typeCode === 'MS' ? '1px solid #ccc' : 'none' }}>{typeCode}</span></td>
                                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>{entry.bags?.toLocaleString('en-IN') || '-'}</td>
                                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '13px' }}>{entry.packaging || '-'}</td>
                                  <td style={{ border: '1px solid #000', padding: '3px 5px', textAlign: 'left', fontSize: '13px', lineHeight: '1.35', wordBreak: 'break-word' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <button
                                        type="button"
                                        onClick={() => hasQualityReport && handleOpenQualityPopup(entry)}
                                        style={{ background: 'transparent', border: 'none', color: '#1565c0', textDecoration: hasQualityReport ? 'underline' : 'none', cursor: hasQualityReport ? 'pointer' : 'default', fontWeight: 700, fontSize: '13px', padding: 0, textAlign: 'left' }}
                                      >
                                        {partyLabel}
                                      </button>
                                      {showLorrySecondLine ? (
                                        <div style={{ fontSize: '12px', color: '#1565c0', fontWeight: 600 }}>{lorryText}</div>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td style={{ border: '1px solid #000', padding: '3px 5px', textAlign: 'left', fontSize: '13px', wordBreak: 'break-word' }}>{toTitleCase(entry.location) || '-'}</td>
                                  <td style={{ border: '1px solid #000', padding: '3px 5px', textAlign: 'left', fontSize: '13px', wordBreak: 'break-word' }}>{toTitleCase(entry.variety) || '-'}</td>
                                  <td style={{ border: '1px solid #000', padding: '3px 5px', textAlign: 'left', fontSize: '13px', lineHeight: '1.35', wordBreak: 'break-word' }}>
                                    {sampleCollectedNames.length === 0 ? '-' : (
                                      sampleCollectedNames.length > 1
                                        ? renderIndexedNames(sampleCollectedNames, getCollectorLabel)
                                        : <div style={{ fontWeight: 700, color: '#1f2937' }}>{getCollectorLabel(sampleCollectedNames[0])}</div>
                                    )}
                                  </td>
                                  <td style={{ border: '1px solid #000', padding: '3px 5px', textAlign: 'left', fontSize: '13px', lineHeight: '1.35', wordBreak: 'break-word' }}>
                                    {sampleReportNames.length === 0 ? '-' : (
                                      renderIndexedNames(sampleReportNames, getCollectorLabel)
                                    )}
                                  </td>
                                  <td style={{ border: '1px solid #000', padding: '3px 5px', textAlign: 'left', fontSize: '12px', lineHeight: '1.2', fontWeight: 700, color: getEntrySmellLabel(entry) === '-' ? '#666' : '#8a4b00', whiteSpace: 'nowrap' }}>
                                    {getEntrySmellLabel(entry)}
                                  </td>
                                  <td style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'left', fontSize: '10px', lineHeight: '1.2' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      {Array.from({ length: adjustedAttemptCount }, (_, idx) => idx + 1).map((attemptNo) => {
                                        const attempt = qualityAttempts.find((item) => item.attemptNo === attemptNo);
                                        const isLatestAttempt = attemptNo === adjustedAttemptCount;
                                        
                                        // Quality Type (Done/Pending)
                                        const stateLabel = attempt ? 'Done' : (isLatestAttempt ? 'Pending' : '-');
                                        const stateStyle = stateLabel === 'Done'
                                          ? { background: '#c8e6c9', color: '#2e7d32' }
                                          : stateLabel === 'Pending'
                                              ? { background: '#fff8e1', color: '#f57f17' }
                                              : { background: '#f5f5f5', color: '#666' };

                                        // Quality Decision (Pass/Fail) - LINE-WISE per attempt
                                        let decisionLabel = 'Pending';
                                        const normalizedDecision = String(entry.lotSelectionDecision || '').toUpperCase();
                                        const isHardFailed = String(entry.workflowStatus || '').toUpperCase() === 'FAILED';
                                        
                                        if (normalizedDecision === 'FAIL') decisionLabel = 'Fail';
                                        else if (normalizedDecision.startsWith('PASS') || normalizedDecision === 'SOLDOUT') decisionLabel = 'Pass';

                                        // LINE-WISE: 1st attempt stays Pass, only failed attempt shows Fail
                                        if (isHardFailed && adjustedAttemptCount > 1) {
                                           decisionLabel = isLatestAttempt ? 'Fail' : 'Pass';
                                        } else if (normalizedDecision === 'FAIL' && !isHardFailed) {
                                           if (adjustedAttemptCount <= 1) {
                                              decisionLabel = 'Pass';
                                           } else {
                                              decisionLabel = isLatestAttempt ? 'Pending' : 'Pass';
                                           }
                                        }
                                        const decisionStyle = decisionLabel === 'Pass' ? { background: '#a5d6a7', color: '#1b5e20' }
                                          : decisionLabel === 'Fail' ? { background: '#ffcdd2', color: '#b71c1c' }
                                          : { background: '#ffe0b2', color: '#e65100' };

                                        return (
                                          <div key={`${entry.id}-quality-${attemptNo}`} style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
                                            <span style={{ ...stateStyle, padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: 700, whiteSpace: 'nowrap' }}>{stateLabel}</span>
                                            {stateLabel !== '-' && <span style={{ ...decisionStyle, padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: 700, whiteSpace: 'nowrap' }}>{decisionLabel}</span>}
                                          </div>
                                        );
                                      })}
                                      {isResamplePendingAdminAssign && (
                                        <div style={{ marginTop: '3px', padding: '5px', background: '#fff8e1', borderRadius: '4px', border: '1px solid #f4d06f' }}>
                                          <div style={{ fontWeight: 800, color: '#8a6400', marginBottom: '3px' }}>Assign Resample User</div>
                                          <select
                                            value={assignments[entry.id] ?? entry.sampleCollectedBy ?? ''}
                                            onChange={(e) => setAssignments(prev => ({ ...prev, [entry.id]: e.target.value }))}
                                            style={{ width: '100%', padding: '3px', fontSize: '10px', border: '1px solid #ccc', borderRadius: '3px', marginBottom: '4px' }}
                                          >
                                            <option value="">Select Staff</option>
                                            {paddySupervisors.map((sup) => (
                                              <option key={sup.id} value={sup.username}>
                                                {toTitleCase(sup.fullName || sup.username)}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            onClick={() => handleAssignResample(entry)}
                                            style={{ width: '100%', padding: '3px 6px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                                          >
                                            Assign
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'left', fontSize: '10px', lineHeight: '1.2' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      {entry.lotSelectionDecision === 'PASS_WITHOUT_COOKING' ? (
                                        <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', alignSelf: 'flex-start' }}>Not Applicable</span>
                                      ) : (
                                        Array.from({ length: adjustedAttemptCount }, (_, idx) => idx + 1).map((attemptNo) => {
                                          const attempt = cookingMap.get(attemptNo);
                                          const rawStatus = attempt?.status || (attemptNo === adjustedAttemptCount ? 'Pending' : '-');
                                          const statusText = rawStatus ? toTitleCase(rawStatus.toLowerCase()) : 'Pending';

                                          const statusStyle = statusText === 'Pass'
                                            ? { background: '#a5d6a7', color: '#1b5e20' }
                                            : statusText === 'Medium'
                                              ? { background: '#ffe0b2', color: '#f39c12' }
                                            : statusText === 'Fail'
                                              ? { background: '#ffcdd2', color: '#b71c1c' }
                                              : statusText === 'Recheck' || statusText === 'Rechecking'
                                                ? { background: '#e3f2fd', color: '#1565c0' }
                                                : statusText === 'Resample' || statusText === 'Resampling'
                                                  ? { background: '#fff3e0', color: '#ef6c00' }
                                                  : statusText === 'Pending'
                                                    ? { background: '#ffe0b2', color: '#e65100' }
                                                    : { background: '#f3f4f6', color: '#6b7280' };

                                          return (
                                            <div key={`${entry.id}-cooking-${attemptNo}`}>
                                              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
                                                <span style={{ fontSize: '9px', fontWeight: '800', color: '#334155' }}>{attemptNo === 1 ? '1st S.' : attemptNo === 2 ? '2nd S.' : `${attemptNo}th S.` }</span>
                                                <span style={{ ...statusStyle, padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: 700, whiteSpace: 'nowrap' }}>{statusText}</span>
                                              </div>
                                              {attempt?.remarks ? (
                                                <div
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRemarksPopup({
                                                      isOpen: true,
                                                      title: `Cooking Remark - ${getAttemptLabel(attemptNo)}`,
                                                      text: attempt.remarks || ''
                                                    });
                                                  }}
                                                  style={{ marginTop: '2px', fontSize: '10px', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontWeight: 700 }}
                                                >
                                                  View Remark
                                                </div>
                                              ) : null}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ border: '1px solid #000', padding: '3px 5px', textAlign: 'center', fontSize: '13px' }}>{finalRateValue ? <div style={{ fontWeight: 700, color: '#2e7d32', lineHeight: '1.3' }}><div>Rs {toNumberText(finalRateValue)}</div><div style={{ fontSize: '10px', color: '#5f6368', fontWeight: 600 }}>{o.baseRateType?.replace(/_/g, '/') || finalRateUnit}</div></div> : '-'}</td>
                                  <td style={{ ...cellStyle(suteMissing), textAlign: 'center' }}>{suteMissing ? 'Need' : fmtVal(o.finalSute ?? o.sute, o.finalSuteUnit ?? o.suteUnit)}</td>
                                  <td style={{ ...cellStyle(mstMissing), textAlign: 'center' }}>{mstMissing ? 'Need' : (o.moistureValue != null ? `${toNumberText(o.moistureValue)}%` : '-')}</td>
                                  <td style={cellStyle(bkrgMissing)}>{bkrgMissing ? 'Need' : fmtVal(o.brokerage, o.brokerageUnit)}</td>
                                  <td style={cellStyle(lfMissing)}>{hasLf ? (lfMissing ? 'Need' : fmtVal(o.lf, o.lfUnit)) : 'Not Applicable'}</td>
                                  <td style={cellStyle(hamaliMissing)}>{hamaliMissing ? 'Need' : fmtVal(effectiveHamaliValue, o.hamaliUnit)}</td>
                                  <td style={cellStyle(cdMissing)}>
                                    {o.cdEnabled ? `${Math.round(Number(o.cdValue) || 0)} ${o.cdUnit === 'percentage' ? '%' : 'L'}` : '-'}
                                  </td>
                                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '12px' }}>
                                    {hasEgb ? (o.egbType === 'mill' ? 'Mill' : (o.egbValue != null ? toNumberText(o.egbValue) : '-')) : 'Not Applicable'}
                                  </td>
                                  <td style={cellStyle(bankLoanMissing)}>
                                    {o.bankLoanEnabled ? (o.bankLoanUnit === 'per_bag' ? `Rs ${formatIndianCurrency(o.bankLoanValue)} / Bag` : `Rs ${formatIndianCurrency(o.bankLoanValue)}`) : '-'}
                                  </td>
                                  <td style={cellStyle(paymentMissing)}>{formatPaymentCondition(o.paymentConditionValue, o.paymentConditionUnit)}</td>
                                  {/* Disabled resample block */}
                                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', background: '#fafcff' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'stretch' }}>
                                      <div style={{ fontSize: '10px', fontWeight: 800, borderRadius: '4px', padding: '2px 4px', ...offerActorMeta.style }}>{offerActorMeta.label}</div>
                                      <div style={{ fontSize: '10px', fontWeight: 700, color: needsFill ? '#856404' : '#155724', background: needsFill ? '#fff3cd' : '#d4edda', border: needsFill ? '1px solid #ffeeba' : '1px solid #c3e6cb', borderRadius: '4px', padding: '2px 4px', lineHeight: '1.25' }}>
                                        {needsFill ? `Missing: ${compactStatusText(missingFieldLabels)}` : 'Manager Added'}
                                      </div>
                                      {isResampleActive && (
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#8a6400', background: '#fff8e1', border: '1px solid #f4d06f', borderRadius: '4px', padding: '2px 4px', lineHeight: '1.2' }}>
                                          Re-sample Active
                                        </div>
                                      )}
                                      {failedCookingAttempt && (
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#b71c1c', background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '4px', padding: '2px 4px', lineHeight: '1.2' }}>
                                          {failedCookingLabel}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                      {isManagerOrOwner && (
                                        <button
                                          onClick={() => handleUpdateClick(entry)}
                                          disabled={!hasQualityReport}
                                          style={{
                                            padding: '3px 8px',
                                            background: !hasQualityReport ? '#b0bec5' : (needsFill ? '#e67e22' : '#3498db'),
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            cursor: !hasQualityReport ? 'not-allowed' : 'pointer',
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap'
                                          }}
                                        >
                                          {!hasQualityReport ? 'Quality Pending' : (needsFill ? 'Fill Values' : 'View/Edit')}
                                        </button>
                                      )}
                                      {canEditOffer && (
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                          <button
                                            onClick={() => handleOpenOfferEdit(entry)}
                                            style={{ padding: '3px 6px', background: '#2196F3', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 700 }}
                                          >
                                            Edit Offer
                                          </button>
                                          {isAdminOrOwner && (
                                            <button
                                              onClick={() => handleOpenFinalEdit(entry)}
                                              style={{ padding: '3px 6px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 700 }}
                                            >
                                              Edit Final
                                            </button>
                                          )}
                                        </div>
                                      )}
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
            })}
          </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px', alignItems: 'center' }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ padding: '6px 12px', borderRadius: '4px', cursor: page <= 1 ? 'not-allowed' : 'pointer', background: page <= 1 ? '#f5f5f5' : 'white' }}>Prev</button>
        <span style={{ padding: '6px 12px', fontSize: '13px', color: '#666' }}>Page {page} of {Math.max(1, totalPages)} ({total} total)</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ padding: '6px 12px', borderRadius: '4px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', background: page >= totalPages ? '#f5f5f5' : 'white' }}>Next</button>
      </div>

      {qualityHistoryModal.open && qualityModalEntry && (() => {
        const qpAll = qualityAttemptDetails;
        const hasCooking = qualityModalHasCookingHistory;
        const useAttemptComparisonLayout = qualityAttemptDetails.length > 1;
        const useCompactQualityModal = qpAll.length <= 1;

        const trimZeros = (raw: string) => raw.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
        const displayVal = (rawVal: any, numericVal: any, enabled = true) => {
          if (!enabled) return null;
          const raw = rawVal != null ? String(rawVal).trim() : '';
          if (raw !== '') return raw;
          if (numericVal == null || numericVal === '') return null;
          const rawNumeric = String(numericVal).trim();
          if (!rawNumeric) return null;
          const num = Number(rawNumeric);
          if (!Number.isFinite(num) || num === 0) return null;
          return trimZeros(rawNumeric);
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

        const QItem = ({ label, value }: { label: string; value: React.ReactNode }) => {
          const isBold = ['Grains Count', 'Paddy WB'].includes(label);
          const isPaddyWb = label === 'Paddy WB';
          return (
            <div style={{ 
              background: isPaddyWb ? '#f0f9ff' : '#fff', 
              padding: '10px 8px', 
              borderRadius: '8px', 
              border: isPaddyWb ? '1px solid #bae6fd' : '1px solid #e2e8f0', 
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: '54px'
            }}>
              <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '4px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{label}</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: isBold ? '#0f172a' : '#334155' }}>{value || '-'}</div>
            </div>
          );
        };

        const getAttemptLabelPopup = (attemptNo: number, idx: number) => {
          const num = attemptNo || idx + 1;
          if (num === 1) return '1st Sample';
          if (num === 2) return '2nd Sample';
          if (num === 3) return '3rd Sample';
          return `${num}th Sample`;
        };

        return (
          <div
            onClick={() => setQualityHistoryModal({ open: false, entry: null })}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px 16px' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ backgroundColor: 'white', borderRadius: '8px', width: useCompactQualityModal ? 'min(520px, 95vw)' : 'min(1080px, 94vw)', maxWidth: useCompactQualityModal ? '95vw' : '94vw', maxHeight: '88vh', overflowY: 'auto', overflowX: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
            >
              {/* Header */}
              <div style={{
                background: qualityModalEntry.entryType === 'DIRECT_LOADED_VEHICLE'
                  ? '#1565c0'
                  : qualityModalEntry.entryType === 'LOCATION_SAMPLE'
                    ? '#e67e22'
                    : '#4caf50',
                padding: '16px 20px', borderRadius: '8px 8px 0 0', color: 'white', position: 'relative'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', opacity: 0.9, textAlign: 'left' }}>
                    {new Date(qualityModalEntry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', textAlign: 'center' }}>
                    {qualityModalEntry.entryType === 'DIRECT_LOADED_VEHICLE' ? 'Ready Lorry' : qualityModalEntry.entryType === 'LOCATION_SAMPLE' ? 'Location Sample' : 'Mill Sample'}
                  </div>
                  <div></div>
                </div>
                <div style={{
                  fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px', marginTop: '4px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%'
                }}>
                  {toTitleCase(qualityModalEntry.brokerName) || '-'}
                </div>
                <button onClick={() => setQualityHistoryModal({ open: false, entry: null })} style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px',
                  color: 'white', fontWeight: '900', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>✕</button>
              </div>

              {/* Body Content */}
              <div style={{ padding: '24px', backgroundColor: '#fff', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', position: 'relative' }}>
                 {/* Basic Info Grid - Refined 4x3 alignment to match image */}
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
                   {[
                     ['Date', new Date(qualityModalEntry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
                     ['Bags', qualityModalEntry.bags?.toLocaleString('en-IN')],
                     ['Packaging', `${qualityModalEntry.packaging || '75'} Kg`],
                     ['Variety', toTitleCase(qualityModalEntry.variety || '-')],
                   ].map(([label, value], i) => (
                     <div key={`basic-top-${i}`} style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                       <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '3px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                       <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{value || '-'}</div>
                     </div>
                   ))}
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                   {[
                     ['Party Name', toTitleCase(qualityModalEntry.partyName) || '-'],
                     ['Paddy Location', toTitleCase(qualityModalEntry.location || '-')],
                   ].map(([label, value], i) => (
                     <div key={`basic-mid-${i}`} style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                       <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '3px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                       <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || '-'}</div>
                     </div>
                   ))}
                   <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                     <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '3px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sample Collected By</div>
                     {(() => {
                       const col = getCollectedByDisplay(qualityModalEntry);
                       return (
                         <div style={{ fontSize: '14px', fontWeight: '800', color: col.highlightPrimary ? '#7e22ce' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                           {col.primary}
                         </div>
                       );
                     })()}
                   </div>
                 </div>
                {/* Quality Parameters */}
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#e67e22', borderBottom: '2px solid #e67e22', paddingBottom: '6px' }}>🔬 Quality Parameters</h4>
                {qpAll.length === 0 ? (
                  <div style={{ color: '#999', textAlign: 'center', padding: '12px', fontSize: '12px' }}>No quality data</div>
                ) : useAttemptComparisonLayout ? (() => {
                   const buildAttemptRows = (qp: QualityAttemptDetail) => {
                    const smixOn = isEnabled(qp.smixEnabled, qp.mixSRaw, qp.mixS);
                    const lmixOn = isEnabled(qp.lmixEnabled, qp.mixLRaw, qp.mixL);
                    const paddyOn = isEnabled(qp.paddyWbEnabled, qp.paddyWbRaw, qp.paddyWb);
                    const wbOn = isProvided(qp.wbRRaw, qp.wbR) || isProvided(qp.wbBkRaw, qp.wbBk);
                    const smellHasVal = qp.smellHas ?? qualityModalEntry.qualityParameters?.smellHas;
                    const smellTypeVal = qp.smellType ?? qualityModalEntry.qualityParameters?.smellType;
                    
                    const firstCollectorName = qualityModalEntry.sampleCollectedHistory && qualityModalEntry.sampleCollectedHistory.length > 0 
                      ? qualityModalEntry.sampleCollectedHistory[0] 
                      : (qualityModalEntry.sampleCollectedBy || '-');
                    
                    return [
                      [
                        { label: 'Sample Collected By', value: toTitleCase(getCollectorLabel(firstCollectorName)), span: 3 },
                        { label: 'Sample Reported By', value: toTitleCase(qp.reportedBy || '-'), span: 3 },
                        { label: 'Reported At', value: qp.updatedAt || qp.createdAt ? new Date(qp.updatedAt || qp.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-', span: 3 },
                      ],
                      [
                        { label: 'Moisture', value: (() => { const val = displayVal((qp as any).moistureRaw, (qp as any).moisture); return val ? `${val}%` : '-'; })() },
                        { label: 'Cutting', value: (() => { const cut1 = displayVal((qp as any).cutting1Raw, (qp as any).cutting1); const cut2 = displayVal((qp as any).cutting2Raw, (qp as any).cutting2); return cut1 && cut2 ? `${cut1}x${cut2}` : '-'; })() },
                        { label: 'Bend', value: (() => { const b1 = displayVal((qp as any).bend1Raw, (qp as any).bend1); const b2 = displayVal((qp as any).bend2Raw, (qp as any).bend2); return b1 && b2 ? `${b1}x${b2}` : '-'; })() }
                      ],
                      [
                        { label: 'Grains Count', value: (() => { const val = displayVal((qp as any).grainsCountRaw, (qp as any).grainsCount); return val ? `(${val})` : '-'; })() },
                        { label: 'Mix', value: displayVal((qp as any).mixRaw, (qp as any).mix) || '-' },
                        { label: 'S Mix', value: displayVal((qp as any).mixSRaw, (qp as any).mixS, smixOn) || '-' },
                        { label: 'L Mix', value: displayVal((qp as any).mixLRaw, (qp as any).mixL, lmixOn) || '-' },
                        { label: 'Kandu', value: displayVal((qp as any).kanduRaw, (qp as any).kandu) || '-' }
                      ],
                      [
                        { label: 'Oil', value: displayVal((qp as any).oilRaw, (qp as any).oil) || '-' },
                        { label: 'SK', value: displayVal((qp as any).skRaw, (qp as any).sk) || '-' },
                        { label: 'WB-R', value: displayVal((qp as any).wbRRaw, (qp as any).wbR, wbOn) || '-' },
                        { label: 'WB-BK', value: displayVal((qp as any).wbBkRaw, (qp as any).wbBk, wbOn) || '-' },
                        { label: 'WB-T', value: displayVal((qp as any).wbTRaw, (qp as any).wbT, wbOn) || '-' }
                      ],
                      [
                        { label: 'Paddy WB', value: displayVal((qp as any).paddyWbRaw, (qp as any).paddyWb, paddyOn) || '-', span: 5 }
                      ].filter((item) => item.value && item.value !== '-'),
                      [
                        { label: 'Smell', value: (smellHasVal || (smellTypeVal && String(smellTypeVal).trim())) ? toTitleCase(smellTypeVal || 'Yes') : '-' }
                      ].filter((item) => item.value && item.value !== '-')
                    ] as any;
                  };
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {qpAll.map((qp: any, idx: number) => (
                        <div key={`${qualityModalEntry.id}-${qp.attemptNo || idx}-cards`} style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
                          <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '10px', minHeight: '62px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '900', color: '#9a3412' }}>
                            {getAttemptLabelPopup(qp.attemptNo, idx)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {buildAttemptRows(qp).map((row, rowIdx) => (
                              row.length > 0 ? (
                                <div key={`${qp.attemptNo || idx}-row-${rowIdx}`} style={{ display: 'grid', gridTemplateColumns: rowIdx === 0 ? 'repeat(9, minmax(0, 1fr))' : `repeat(${row.length}, minmax(0, 1fr))`, gap: '12px' }}>
                                  {row.map((item: any, cardIdx: number) => (
                                    <div key={`${qp.attemptNo || idx}-${item.label}-${cardIdx}`} style={{ gridColumn: rowIdx === 0 ? `span ${(item as any).span || 1}` : undefined }}>
                                      <QItem label={item.label} value={item.value} />
                                    </div>
                                  ))}
                                </div>
                              ) : null
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })() : (() => {
                  // Single attempt — premium vertical card grid as per image
                  const qp = qpAll[0] as QualityAttemptDetail;
                  const smixOn = isEnabled(qp.smixEnabled, qp.mixSRaw, qp.mixS);
                  const lmixOn = isEnabled(qp.lmixEnabled, qp.mixLRaw, qp.mixL);
                  const paddyOn = isEnabled(qp.paddyWbEnabled, qp.paddyWbRaw, qp.paddyWb);
                  const wbOn = isProvided(qp.wbRRaw, qp.wbR) || isProvided(qp.wbBkRaw, qp.wbBk);
                  const smellHasVal = qp.smellHas ?? qualityModalEntry.qualityParameters?.smellHas;
                  const smellTypeVal = qp.smellType ?? qualityModalEntry.qualityParameters?.smellType;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        <QItem label="Moisture" value={displayVal((qp as any).moistureRaw, (qp as any).moisture) ? `${displayVal((qp as any).moistureRaw, (qp as any).moisture)}%` : '-'} />
                        <QItem label="Cutting" value={(() => { const c1 = displayVal((qp as any).cutting1Raw, (qp as any).cutting1); const c2 = displayVal((qp as any).cutting2Raw, (qp as any).cutting2); return c1 && c2 ? `${c1}×${c2}` : '-'; })()} />
                        <QItem label="Bend" value={(() => { const b1 = displayVal((qp as any).bend1Raw, (qp as any).bend1); const b2 = displayVal((qp as any).bend2Raw, (qp as any).bend2); return b1 && b2 ? `${b1}×${b2}` : '-'; })()} />
                        <QItem label="Grains Count" value={displayVal((qp as any).grainsCountRaw, (qp as any).grainsCount) ? `(${displayVal((qp as any).grainsCountRaw, (qp as any).grainsCount)})` : '-'} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <QItem label="Mix" value={displayVal((qp as any).mixRaw, (qp as any).mix) || '-'} />
                        <QItem label="S Mix" value={displayVal((qp as any).mixSRaw, (qp as any).mixS, smixOn) || '-'} />
                        <QItem label="L Mix" value={displayVal((qp as any).mixLRaw, (qp as any).mixL, lmixOn) || '-'} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <QItem label="Kandu" value={displayVal((qp as any).kanduRaw, (qp as any).kandu) || '-'} />
                        <QItem label="Oil" value={displayVal((qp as any).oilRaw, (qp as any).oil) || '-'} />
                        <QItem label="SK" value={displayVal((qp as any).skRaw, (qp as any).sk) || '-'} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <QItem label="WB-R" value={displayVal((qp as any).wbRRaw, (qp as any).wbR, wbOn) || '-'} />
                        <QItem label="WB-BK" value={displayVal((qp as any).wbBkRaw, (qp as any).wbBk, wbOn) || '-'} />
                        <QItem label="WB-T" value={displayVal((qp as any).wbTRaw, (qp as any).wbT, wbOn) || '-'} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                         <div style={{ width: 'min(240px, 100%)' }}>
                            <QItem label="Paddy WB" value={displayVal((qp as any).paddyWbRaw, (qp as any).paddyWb, paddyOn) || '-'} />
                         </div>
                      </div>
                      {(qp as any).reportedBy && (
                        <div style={{ marginTop: '14px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Sample Reported By</div>
                          <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: '800' }}>{toTitleCase((qp as any).reportedBy)}</div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <button onClick={() => setQualityHistoryModal({ open: false, entry: null })}
                  style={{ marginTop: '16px', width: '100%', padding: '8px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {remarksPopup.isOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee', color: '#1f2937', fontSize: '16px' }}>
              <span role="img" aria-label="remark">🔍</span> {remarksPopup.title}
            </h3>
            <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.5', minHeight: '60px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              {remarksPopup.text}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setRemarksPopup({ isOpen: false, title: '', text: '' })}
                style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && selectedEntry && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '12px', width: '92%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px', fontSize: '16px', textAlign: 'center' }}>{selectedEntry.brokerName}</h3>
            <div style={{ background: '#f8f9fa', padding: '8px 14px', borderRadius: '6px', marginBottom: '14px', border: '1px solid #e0e0e0', textAlign: 'center', fontSize: '12px', color: '#333' }}>
              Bags: <b>{selectedEntry.bags}</b> | Pkg: <b>{selectedEntry.packaging || '75'} Kg</b> | Party: <b>{toTitleCase(selectedEntry.partyName) || (selectedEntry.entryType === 'DIRECT_LOADED_VEHICLE' ? selectedEntry.lorryNumber?.toUpperCase() : '')}</b> | Paddy Location: <b>{selectedEntry.location || '-'}</b> | Variety: <b>{selectedEntry.variety}</b> | Collected By: <b>{selectedEntry.sampleCollectedBy ? getCollectorLabel(selectedEntry.sampleCollectedBy) : getCreatorLabel(selectedEntry)}</b>{(() => {
                const smellAttempts = Array.isArray((selectedEntry as any).qualityAttemptDetails) ? (selectedEntry as any).qualityAttemptDetails : [];
                const smellAttempt = [...smellAttempts].reverse().find((attempt: any) => attempt?.smellHas || (attempt?.smellType && String(attempt.smellType).trim()));
                const smellHasValue = smellAttempt?.smellHas ?? (selectedEntry as any).smellHas;
                const smellTypeValue = smellAttempt?.smellType ?? (selectedEntry as any).smellType;
                if (!(smellHasValue || (smellTypeValue && String(smellTypeValue).trim()))) return null;
                return <> | Smell: <b>{toTitleCase(smellTypeValue || 'Yes')}</b></>;
              })()}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px' }}>
              <div style={{ flex: 1, background: modalMissingFields.length > 0 ? '#fff7db' : '#e8f5e9', border: modalMissingFields.length > 0 ? '1px solid #f3d37b' : '1px solid #c8e6c9', borderRadius: '8px', padding: '9px 10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: modalMissingFields.length > 0 ? '#8a6400' : '#2e7d32', marginBottom: '4px' }}>
                  {modalMissingFields.length > 0 ? 'Manager Missing Fields' : 'All Values Already Added'}
                </div>
                <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                  {modalMissingFields.length > 0 ? modalMissingFields.join('  |  ') : 'This lot already has all manager-side values.'}
                </div>
              </div>
              {(() => {
                const role = modalOffering.createdByRole;
                if (role === 'manager') {
                  return (
                    <div style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, backgroundColor: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74', whiteSpace: 'nowrap' }}>
                      Manager Added
                    </div>
                  );
                }
                if (role === 'admin' || role === 'owner') {
                  return (
                    <div style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', whiteSpace: 'nowrap' }}>
                      Admin Added
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.2fr) repeat(2, minmax(160px, 1fr))', gap: '10px', marginBottom: '10px' }}>
              <div style={modalCardStyle}>
                <span style={modalTagStyle(false)}>{modalOfferActorMeta.label}</span>
                <label style={modalLabelStyle}>Final Rate</label>
                <div style={modalMetaStyle}>{formatRateTypeLabel(modalRateType)} | {formatRateUnitLabel(modalBaseRateUnit)}</div>
                <div style={modalReadonlyValueStyle}>{formatManagerRateValue(modalOffering.finalBaseRate ?? modalOffering.offerBaseRateValue, modalBaseRateUnit)}</div>
              </div>
              <div style={modalSuteMissing ? modalEditableCardStyle : modalCardStyle}>
                <span style={modalTagStyle(modalSuteMissing)}>{modalSuteMissing ? 'Manager Add' : modalOfferActorMeta.label}</span>
                <label style={modalLabelStyle}>Sute</label>
                <div style={modalMetaStyle}>{formatSuteUnitLabel(modalSuteUnit)}</div>
                {modalSuteMissing ? (
                  <input type="text" inputMode="decimal" value={managerData.sute} onChange={(e) => setManagerData({ ...managerData, sute: sanitizeAmountInput(e.target.value) })} style={modalInputStyle} placeholder="Enter sute" />
                ) : (
                  <div style={modalReadonlyValueStyle}>{formatManagerSuteValue(modalOffering.finalSute ?? modalOffering.sute, modalSuteUnit)}</div>
                )}
              </div>
              <div style={modalMoistureMissing ? modalEditableCardStyle : modalCardStyle}>
                <span style={modalTagStyle(modalMoistureMissing)}>{modalMoistureMissing ? 'Manager Add' : modalOfferActorMeta.label}</span>
                <label style={modalLabelStyle}>Moisture</label>
                <div style={modalMetaStyle}>Percent</div>
                {modalMoistureMissing ? (
                  <input type="text" inputMode="decimal" value={managerData.moistureValue} onChange={(e) => setManagerData({ ...managerData, moistureValue: sanitizeMoistureInput(e.target.value) })} style={modalInputStyle} placeholder="Enter moisture" />
                ) : (
                  <div style={modalReadonlyValueStyle}>{hasValue(modalOffering.moistureValue) ? `${toNumberText(modalOffering.moistureValue)}%` : 'No'}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))', gap: '10px', marginBottom: '10px' }}>
              <div style={modalHamaliMissing ? modalEditableCardStyle : modalCardStyle}>
                <span style={modalTagStyle(modalHamaliMissing)}>{modalHamaliMissing ? 'Manager Add' : modalOfferActorMeta.label}</span>
                <label style={modalLabelStyle}>Hamali</label>
                <div style={modalMetaStyle}>{modalOffering.hamaliEnabled === false ? `Pending from manager | ${formatChargeUnitLabel(modalHamaliUnit)}` : formatChargeUnitLabel(modalHamaliUnit)}</div>
                {modalHamaliMissing ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" inputMode="decimal" value={managerData.hamali} onChange={(e) => setManagerData({ ...managerData, hamali: sanitizeAmountInput(e.target.value) })} style={{ ...modalInputStyle, flex: 1 }} placeholder="Enter hamali" />
                    <select value={managerData.hamaliUnit} onChange={(e) => setManagerData({ ...managerData, hamaliUnit: e.target.value })} style={modalInlineSelectStyle}>
                      <option value="per_bag">Per Bag</option>
                      <option value="per_quintal">Per Quintal</option>
                    </select>
                  </div>
                ) : (
                  <div style={modalReadonlyValueStyle}>{formatManagerChargeValue(modalOffering.hamali ?? modalOffering.hamaliPerKg, modalHamaliUnit)}</div>
                )}
              </div>
              <div style={modalBrokerageMissing ? modalEditableCardStyle : modalCardStyle}>
                <span style={modalTagStyle(modalBrokerageMissing)}>{modalBrokerageMissing ? 'Manager Add' : modalOfferActorMeta.label}</span>
                <label style={modalLabelStyle}>Brokerage</label>
                <div style={modalMetaStyle}>{modalOffering.brokerageEnabled === false ? `Pending from manager | ${formatChargeUnitLabel(modalBrokerageUnit)}` : formatChargeUnitLabel(modalBrokerageUnit)}</div>
                {modalBrokerageMissing ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" inputMode="decimal" value={managerData.brokerage} onChange={(e) => setManagerData({ ...managerData, brokerage: sanitizeAmountInput(e.target.value) })} style={{ ...modalInputStyle, flex: 1 }} placeholder="Enter brokerage" />
                    <select value={managerData.brokerageUnit} onChange={(e) => setManagerData({ ...managerData, brokerageUnit: e.target.value })} style={modalInlineSelectStyle}>
                      <option value="per_bag">Per Bag</option>
                      <option value="per_quintal">Per Quintal</option>
                    </select>
                  </div>
                ) : (
                  <div style={modalReadonlyValueStyle}>{formatManagerChargeValue(modalOffering.brokerage, modalBrokerageUnit)}</div>
                )}
              </div>
              <div style={modalHasLf ? (modalLfMissing ? modalEditableCardStyle : modalCardStyle) : modalCardStyle}>
                <span style={modalTagStyle(modalHasLf && modalLfMissing)}>{modalHasLf ? (modalLfMissing ? 'Manager Add' : modalOfferActorMeta.label) : 'Not Applicable'}</span>
                <label style={modalLabelStyle}>LF</label>
                <div style={modalMetaStyle}>{modalHasLf ? (modalOffering.lfEnabled === false ? `Pending from manager | ${formatChargeUnitLabel(modalLfUnit)}` : formatChargeUnitLabel(modalLfUnit)) : 'Not applicable for MD/WB'}</div>
                {modalHasLf ? (
                  modalLfMissing ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" inputMode="decimal" value={managerData.lf} onChange={(e) => setManagerData({ ...managerData, lf: sanitizeAmountInput(e.target.value) })} style={{ ...modalInputStyle, flex: 1 }} placeholder="Enter LF" />
                      <select value={managerData.lfUnit} onChange={(e) => setManagerData({ ...managerData, lfUnit: e.target.value })} style={modalInlineSelectStyle}>
                        <option value="per_bag">Per Bag</option>
                        <option value="per_quintal">Per Quintal</option>
                      </select>
                    </div>
                  ) : (
                    <div style={modalReadonlyValueStyle}>{formatManagerChargeValue(modalOffering.lf, modalLfUnit)}</div>
                  )
                ) : (
                  <div style={modalReadonlyValueStyle}>Not Applicable</div>
                )}
              </div>
            </div>

            {!isRiceMode && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                <div style={modalCdMissing ? modalEditableCardStyle : modalCardStyle}>
                  <span style={modalTagStyle(modalCdMissing)}>{modalCdMissing ? 'Manager Add' : modalOfferActorMeta.label}</span>
                  <label style={modalLabelStyle}>CD</label>
                  <div style={modalMetaStyle}>{modalOffering.cdEnabled ? formatChargeUnitLabel(modalCdUnit) : 'No'}</div>
                  {modalCdMissing ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" inputMode="decimal" value={managerData.cdValue} onChange={(e) => setManagerData({ ...managerData, cdValue: sanitizeAmountInput(e.target.value, 8) })} style={{ ...modalInputStyle, flex: 1 }} placeholder="Enter CD" />
                      <select value={managerData.cdUnit} onChange={(e) => setManagerData({ ...managerData, cdUnit: e.target.value })} style={modalInlineSelectStyle}>
                        <option value="percentage">Percent</option>
                        <option value="lumps">Lumps</option>
                      </select>
                    </div>
                  ) : (
                    <div style={modalReadonlyValueStyle}>{modalOffering.cdEnabled ? (hasValue(modalOffering.cdValue) ? `${toNumberText(modalOffering.cdValue)} | ${modalCdUnit === 'percentage' ? 'Percent' : 'Lumps'}` : 'Pending') : 'No'}</div>
                  )}
                </div>
                <div style={modalBankLoanMissing ? modalEditableCardStyle : modalCardStyle}>
                  <span style={modalTagStyle(modalBankLoanMissing)}>{modalBankLoanMissing ? 'Manager Add' : modalOfferActorMeta.label}</span>
                  <label style={modalLabelStyle}>Bank Loan</label>
                  <div style={modalMetaStyle}>{modalOffering.bankLoanEnabled ? formatChargeUnitLabel(modalBankLoanUnit) : 'No'}</div>
                  {modalBankLoanMissing ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" inputMode="decimal" value={managerData.bankLoanValue} onChange={(e) => setManagerData({ ...managerData, bankLoanValue: sanitizeAmountInput(e.target.value, 8) })} style={{ ...modalInputStyle, flex: 1 }} placeholder="Enter bank loan" />
                      <select value={managerData.bankLoanUnit} onChange={(e) => setManagerData({ ...managerData, bankLoanUnit: e.target.value })} style={modalInlineSelectStyle}>
                        <option value="per_bag">Per Bag</option>
                        <option value="per_quintal">Per Quintal</option>
                      </select>
                    </div>
                  ) : (
                    <div style={modalReadonlyValueStyle}>{modalOffering.bankLoanEnabled ? formatManagerRateValue(modalOffering.bankLoanValue, modalBankLoanUnit) : 'No'}</div>
                  )}
                </div>
                <div style={modalPaymentMissing ? modalEditableCardStyle : modalCardStyle}>
                  <span style={modalTagStyle(modalPaymentMissing)}>{modalPaymentMissing ? 'Manager Add' : modalOfferActorMeta.label}</span>
                  <label style={modalLabelStyle}>Payment Condition</label>
                  <div style={modalMetaStyle}>{modalPaymentEnabled ? (modalPaymentUnit === 'month' ? 'Month' : 'Days') : 'No'}</div>
                  {modalPaymentMissing ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" inputMode="numeric" value={managerData.paymentConditionValue} onChange={(e) => setManagerData({ ...managerData, paymentConditionValue: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} style={{ ...modalInputStyle, flex: 1 }} placeholder="Enter payment" />
                      <select value={managerData.paymentConditionUnit} onChange={(e) => setManagerData({ ...managerData, paymentConditionUnit: e.target.value })} style={modalInlineSelectStyle}>
                        <option value="days">Days</option>
                        <option value="month">Month</option>
                      </select>
                    </div>
                  ) : (
                    <div style={modalReadonlyValueStyle}>{modalPaymentEnabled ? formatPaymentCondition(modalOffering.paymentConditionValue ?? managerData.paymentConditionValue, modalPaymentUnit) : 'No'}</div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '14px' }}>
              <div style={modalHasEgb && modalEgbMissing ? modalEditableCardStyle : modalCardStyle}>
                <span style={modalTagStyle(modalHasEgb && modalEgbMissing)}>{modalHasEgb ? (modalEgbMissing ? 'Manager Add' : modalOfferActorMeta.label) : 'Not Applicable'}</span>
                <label style={modalLabelStyle}>EGB</label>
                <div style={modalMetaStyle}>
                  {!modalHasEgb
                    ? 'Not applicable for WB types'
                    : modalOffering.egbType === 'purchase'
                      ? 'Purchase'
                      : 'Mill'}
                </div>
                {!modalHasEgb ? (
                  <div style={modalReadonlyValueStyle}>Not Applicable</div>
                ) : modalOffering.egbType === 'purchase' && modalEgbMissing ? (
                  <input type="text" inputMode="decimal" value={managerData.egbValue} onChange={(e) => setManagerData({ ...managerData, egbValue: sanitizeAmountInput(e.target.value), egbType: 'purchase' })} style={modalInputStyle} placeholder="Enter EGB" />
                ) : (
                  <div style={modalReadonlyValueStyle}>
                    {modalOffering.egbType === 'mill'
                      ? '0 (Mill ledger)'
                      : hasValue(modalOffering.egbValue)
                        ? toNumberText(modalOffering.egbValue)
                        : 'Pending'}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowModal(false)} disabled={isSubmitting} style={{ padding: '8px 16px', borderRadius: '6px', background: 'white', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleSaveValues} disabled={isSubmitting} style={{ padding: '8px 24px', border: 'none', borderRadius: '6px', background: isSubmitting ? '#95a5a6' : 'linear-gradient(135deg, #27ae60, #2ecc71)', color: 'white', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '13px' }}>{isSubmitting ? 'Saving...' : 'Save Values'}</button>
            </div>
          </div>
        </div>
      )}

      {showOfferEditModal && selectedEntry && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '20px 16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '10px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 40px rgba(0,0,0,0.32)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px', fontWeight: '700', color: '#2c3e50', borderBottom: '3px solid #3498db', paddingBottom: '8px', textAlign: 'center' }}>
              {selectedEntry.brokerName}
            </h3>
            <div style={{ backgroundColor: '#eaf2f8', padding: '6px 8px', borderRadius: '6px', marginBottom: '6px', fontSize: '10px', textAlign: 'center', lineHeight: '1.4' }}>
              Bags: <b>{selectedEntry.bags}</b> | Pkg: <b>{selectedEntry.packaging || '75'} Kg</b> | Party: <b>{toTitleCase(selectedEntry.partyName) || (selectedEntry.entryType === 'DIRECT_LOADED_VEHICLE' ? selectedEntry.lorryNumber?.toUpperCase() : '-')}</b> | Paddy Location: <b>{toTitleCase(selectedEntry.location) || '-'}</b> | Variety: <b>{toTitleCase(selectedEntry.variety) || '-'}</b>
            </div>
            <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '10px', color: '#2563eb' }}>Edit Offer Rate</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 118px', gap: '10px', marginBottom: '10px', alignItems: 'start' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Offer Rate</label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={offerEditData.offerBaseRateValue}
                    onChange={(e) => setOfferEditData({ ...offerEditData, offerBaseRateValue: sanitizeAmountInput(e.target.value) })}
                    placeholder="Rate"
                    style={{ flex: 1, padding: '7px 9px', border: '1px solid #2563eb', borderRadius: '6px', fontSize: '12px', minWidth: '100px' }}
                  />
                  <select
                    value={offerEditData.baseRateType}
                    onChange={(e) => setOfferEditData({ ...offerEditData, baseRateType: e.target.value as any })}
                    style={{ width: '100px', flexShrink: 0, padding: '7px 9px', border: '1px solid #2563eb', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    <option value="PD_WB">PD/WB</option>
                    <option value="PD_LOOSE">PD/Loose</option>
                    <option value="MD_WB">MD/WB</option>
                    <option value="MD_LOOSE">MD/Loose</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Rate Uses</label>
                <select
                  value={offerEditData.baseRateUnit}
                  onChange={(e) => setOfferEditData({ ...offerEditData, baseRateUnit: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
                >
                  <option value="per_bag">Per Bag</option>
                  <option value="per_quintal">Per Quintal</option>
                  <option value="per_kg">Per Kg</option>
                </select>
              </div>
            </div>
            {offerEditData.baseRateUnit === 'per_kg' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '11px' }}>
                <span style={{ fontWeight: 700, color: '#475569' }}>Custom Divisor</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={offerEditData.customDivisor}
                  onChange={(e) => setOfferEditData({ ...offerEditData, customDivisor: sanitizeAmountInput(e.target.value) })}
                  style={{ flex: '0 0 120px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
                  placeholder="Divisor"
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '126px minmax(0, 1fr)', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Sute</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={offerEditData.sute}
                  onChange={(e) => setOfferEditData({ ...offerEditData, sute: sanitizeAmountInput(e.target.value) })}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
                  placeholder="Sute"
                />
                <div style={{ display: 'flex', gap: '6px', fontSize: '11px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="radio" name="offerEditSuteUnit" checked={offerEditData.suteUnit === 'per_bag'} onChange={() => setOfferEditData({ ...offerEditData, suteUnit: 'per_bag' })} />
                    Per Bag
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="radio" name="offerEditSuteUnit" checked={offerEditData.suteUnit === 'per_ton'} onChange={() => setOfferEditData({ ...offerEditData, suteUnit: 'per_ton' })} />
                    Per Ton
                  </label>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Moisture (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={offerEditData.moistureValue}
                  onChange={(e) => setOfferEditData({ ...offerEditData, moistureValue: sanitizeMoistureInput(e.target.value) })}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
                  placeholder="Moisture"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Hamali</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '11px', marginBottom: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><input type="radio" name="offerEditHamali" checked={offerEditData.hamaliEnabled} onChange={() => setOfferEditData({ ...offerEditData, hamaliEnabled: true })} /> Yes</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><input type="radio" name="offerEditHamali" checked={!offerEditData.hamaliEnabled} onChange={() => setOfferEditData({ ...offerEditData, hamaliEnabled: false, hamaliValue: '' })} /> No</label>
                </div>
                {offerEditData.hamaliEnabled && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="text" inputMode="decimal" value={offerEditData.hamaliValue} onChange={(e) => setOfferEditData({ ...offerEditData, hamaliValue: sanitizeAmountInput(e.target.value) })} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="Amount" />
                    <select value={offerEditData.hamaliUnit} onChange={(e) => setOfferEditData({ ...offerEditData, hamaliUnit: e.target.value })} style={{ width: '100px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                      <option value="per_bag">Per Bag</option>
                      <option value="per_quintal">Per Quintal</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Brokerage</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '11px', marginBottom: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><input type="radio" name="offerEditBrokerage" checked={offerEditData.brokerageEnabled} onChange={() => setOfferEditData({ ...offerEditData, brokerageEnabled: true })} /> Yes</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><input type="radio" name="offerEditBrokerage" checked={!offerEditData.brokerageEnabled} onChange={() => setOfferEditData({ ...offerEditData, brokerageEnabled: false, brokerageValue: '' })} /> No</label>
                </div>
                {offerEditData.brokerageEnabled && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="text" inputMode="decimal" value={offerEditData.brokerageValue} onChange={(e) => setOfferEditData({ ...offerEditData, brokerageValue: sanitizeAmountInput(e.target.value) })} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="Amount" />
                    <select value={offerEditData.brokerageUnit} onChange={(e) => setOfferEditData({ ...offerEditData, brokerageUnit: e.target.value })} style={{ width: '100px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                      <option value="per_bag">Per Bag</option>
                      <option value="per_quintal">Per Quintal</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>LF</label>
                {hasLfForRateType(offerEditData.baseRateType) ? (
                  <>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '11px', marginBottom: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><input type="radio" name="offerEditLf" checked={offerEditData.lfEnabled} onChange={() => setOfferEditData({ ...offerEditData, lfEnabled: true })} /> Yes</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><input type="radio" name="offerEditLf" checked={!offerEditData.lfEnabled} onChange={() => setOfferEditData({ ...offerEditData, lfEnabled: false, lfValue: '' })} /> No</label>
                    </div>
                    {offerEditData.lfEnabled && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input type="text" inputMode="decimal" value={offerEditData.lfValue} onChange={(e) => setOfferEditData({ ...offerEditData, lfValue: sanitizeAmountInput(e.target.value) })} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="Amount" />
                        <select value={offerEditData.lfUnit} onChange={(e) => setOfferEditData({ ...offerEditData, lfUnit: e.target.value })} style={{ width: '100px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                          <option value="per_bag">Per Bag</option>
                          <option value="per_quintal">Per Quintal</option>
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: '11px', color: '#94a3b8', padding: '6px 0' }}>Not Applicable</div>
                )}
              </div>
            </div>

            {!isRiceMode && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>CD</label>
                  <div style={{ display: 'flex', gap: '6px', fontSize: '11px', marginBottom: '4px' }}>
                    <label><input type="radio" name="offerEditCd" checked={offerEditData.cdEnabled} onChange={() => setOfferEditData({ ...offerEditData, cdEnabled: true })} /> Yes</label>
                    <label><input type="radio" name="offerEditCd" checked={!offerEditData.cdEnabled} onChange={() => setOfferEditData({ ...offerEditData, cdEnabled: false, cdValue: '' })} /> No</label>
                  </div>
                  {offerEditData.cdEnabled && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="text" inputMode="decimal" value={offerEditData.cdValue} onChange={(e) => setOfferEditData({ ...offerEditData, cdValue: sanitizeAmountInput(e.target.value, 8) })} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="CD" />
                      <select value={offerEditData.cdUnit} onChange={(e) => setOfferEditData({ ...offerEditData, cdUnit: e.target.value })} style={{ width: '90px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                        <option value="percentage">%</option>
                        <option value="lumps">Lumps</option>
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Bank Loan</label>
                  <div style={{ display: 'flex', gap: '6px', fontSize: '11px', marginBottom: '4px' }}>
                    <label><input type="radio" name="offerEditBankLoan" checked={offerEditData.bankLoanEnabled} onChange={() => setOfferEditData({ ...offerEditData, bankLoanEnabled: true })} /> Yes</label>
                    <label><input type="radio" name="offerEditBankLoan" checked={!offerEditData.bankLoanEnabled} onChange={() => setOfferEditData({ ...offerEditData, bankLoanEnabled: false, bankLoanValue: '' })} /> No</label>
                  </div>
                  {offerEditData.bankLoanEnabled && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="text" inputMode="decimal" value={offerEditData.bankLoanValue} onChange={(e) => setOfferEditData({ ...offerEditData, bankLoanValue: sanitizeAmountInput(e.target.value, 8) })} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="Amount" />
                      <select value={offerEditData.bankLoanUnit} onChange={(e) => setOfferEditData({ ...offerEditData, bankLoanUnit: e.target.value })} style={{ width: '90px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                        <option value="per_bag">Per Bag</option>
                        <option value="lumps">Lumps</option>
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Payment</label>
                  <div style={{ display: 'flex', gap: '6px', fontSize: '11px', marginBottom: '4px' }}>
                    <label><input type="radio" name="offerEditPayment" checked={offerEditData.paymentConditionEnabled} onChange={() => setOfferEditData({ ...offerEditData, paymentConditionEnabled: true, paymentConditionValue: offerEditData.paymentConditionValue || '15' })} /> Yes</label>
                    <label><input type="radio" name="offerEditPayment" checked={!offerEditData.paymentConditionEnabled} onChange={() => setOfferEditData({ ...offerEditData, paymentConditionEnabled: false, paymentConditionValue: '15' })} /> No</label>
                  </div>
                  {offerEditData.paymentConditionEnabled && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="text" inputMode="numeric" value={offerEditData.paymentConditionValue} onChange={(e) => setOfferEditData({ ...offerEditData, paymentConditionValue: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="Days" />
                      <select value={offerEditData.paymentConditionUnit} onChange={(e) => setOfferEditData({ ...offerEditData, paymentConditionUnit: e.target.value })} style={{ width: '90px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                        <option value="days">Days</option>
                        <option value="month">Month</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasEgbForRateType(offerEditData.baseRateType) && (
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>EGB</label>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', marginBottom: '4px' }}>
                  <label><input type="radio" name="offerEditEgb" checked={offerEditData.egbType === 'mill'} onChange={() => setOfferEditData({ ...offerEditData, egbType: 'mill', egbValue: '0' })} /> Mill</label>
                  <label><input type="radio" name="offerEditEgb" checked={offerEditData.egbType === 'purchase'} onChange={() => setOfferEditData({ ...offerEditData, egbType: 'purchase' })} /> Purchase</label>
                </div>
                {offerEditData.egbType === 'purchase' && (
                  <input type="text" inputMode="decimal" value={offerEditData.egbValue} onChange={(e) => setOfferEditData({ ...offerEditData, egbValue: sanitizeAmountInput(e.target.value) })} style={{ width: '160px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="EGB value" />
                )}
              </div>
            )}

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Remarks</label>
              <textarea
                value={offerEditData.remarks}
                onChange={(e) => setOfferEditData({ ...offerEditData, remarks: e.target.value })}
                rows={2}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowOfferEditModal(false)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveOfferEdit} style={{ padding: '6px 12px', border: 'none', borderRadius: '4px', background: '#2196F3', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Save Offer</button>
            </div>
          </div>
        </div>
      )}

      {showFinalEditModal && selectedEntry && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '20px 16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '10px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 40px rgba(0,0,0,0.32)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px', fontWeight: '700', color: '#2c3e50', borderBottom: '3px solid #27ae60', paddingBottom: '8px', textAlign: 'center' }}>
              {selectedEntry.brokerName}
            </h3>
            <div style={{ backgroundColor: '#e8f8f5', padding: '6px 8px', borderRadius: '6px', marginBottom: '6px', fontSize: '10px', textAlign: 'center', lineHeight: '1.4' }}>
              Bags: <b>{selectedEntry.bags}</b> | Pkg: <b>{selectedEntry.packaging || '75'} Kg</b> | Party: <b>{toTitleCase(selectedEntry.partyName) || (selectedEntry.entryType === 'DIRECT_LOADED_VEHICLE' ? selectedEntry.lorryNumber?.toUpperCase() : '-')}</b> | Paddy Location: <b>{toTitleCase(selectedEntry.location) || '-'}</b> | Variety: <b>{toTitleCase(selectedEntry.variety) || '-'}</b>
            </div>
            <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '10px', color: '#16a34a' }}>Edit Final Rate</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Final Rate</label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={finalEditData.finalBaseRate}
                    onChange={(e) => setFinalEditData({ ...finalEditData, finalBaseRate: sanitizeAmountInput(e.target.value) })}
                    placeholder="Rate"
                    style={{ flex: 1, padding: '7px 9px', border: '1px solid #27ae60', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <select
                    value={finalEditData.baseRateUnit}
                    onChange={(e) => setFinalEditData({ ...finalEditData, baseRateUnit: e.target.value })}
                    style={{ width: '100px', flexShrink: 0, padding: '7px 9px', border: '1px solid #27ae60', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    <option value="PD_WB">PD/WB</option>
                    <option value="PD_LOOSE">PD/Loose</option>
                    <option value="MD_WB">MD/WB</option>
                    <option value="MD_LOOSE">MD/Loose</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Final Price</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={finalEditData.finalPrice}
                  onChange={(e) => setFinalEditData({ ...finalEditData, finalPrice: sanitizeAmountInput(e.target.value) })}
                  placeholder="Final Price"
                  style={{ width: '100%', padding: '7px 9px', border: '1px solid #27ae60', borderRadius: '6px', fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '126px minmax(0, 1fr)', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Final Sute</label>
                <input type="text" inputMode="decimal" value={finalEditData.finalSute} onChange={(e) => setFinalEditData({ ...finalEditData, finalSute: sanitizeAmountInput(e.target.value) })} style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="Sute" />
                <div style={{ display: 'flex', gap: '6px', fontSize: '11px', marginTop: '4px' }}>
                  <label><input type="radio" name="finalEditSuteUnit" checked={finalEditData.finalSuteUnit === 'per_bag'} onChange={() => setFinalEditData({ ...finalEditData, finalSuteUnit: 'per_bag' })} /> Per Bag</label>
                  <label><input type="radio" name="finalEditSuteUnit" checked={finalEditData.finalSuteUnit === 'per_ton'} onChange={() => setFinalEditData({ ...finalEditData, finalSuteUnit: 'per_ton' })} /> Per Ton</label>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Moisture (%)</label>
                <input type="text" inputMode="decimal" value={finalEditData.moistureValue} onChange={(e) => setFinalEditData({ ...finalEditData, moistureValue: sanitizeMoistureInput(e.target.value) })} style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="Moisture" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Hamali</label>
                <div style={{ display: 'flex', gap: '6px', fontSize: '11px', marginBottom: '4px' }}>
                  <label><input type="radio" name="finalEditHamali" checked={finalEditData.hamaliEnabled} onChange={() => setFinalEditData({ ...finalEditData, hamaliEnabled: true })} /> Yes</label>
                  <label><input type="radio" name="finalEditHamali" checked={!finalEditData.hamaliEnabled} onChange={() => setFinalEditData({ ...finalEditData, hamaliEnabled: false, hamali: '' })} /> No</label>
                </div>
                {finalEditData.hamaliEnabled && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="text" inputMode="decimal" value={finalEditData.hamali} onChange={(e) => setFinalEditData({ ...finalEditData, hamali: sanitizeAmountInput(e.target.value) })} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="Amount" />
                    <select value={finalEditData.hamaliUnit} onChange={(e) => setFinalEditData({ ...finalEditData, hamaliUnit: e.target.value })} style={{ width: '100px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                      <option value="per_bag">Per Bag</option>
                      <option value="per_quintal">Per Quintal</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Brokerage</label>
                <div style={{ display: 'flex', gap: '6px', fontSize: '11px', marginBottom: '4px' }}>
                  <label><input type="radio" name="finalEditBrokerage" checked={finalEditData.brokerageEnabled} onChange={() => setFinalEditData({ ...finalEditData, brokerageEnabled: true })} /> Yes</label>
                  <label><input type="radio" name="finalEditBrokerage" checked={!finalEditData.brokerageEnabled} onChange={() => setFinalEditData({ ...finalEditData, brokerageEnabled: false, brokerage: '' })} /> No</label>
                </div>
                {finalEditData.brokerageEnabled && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="text" inputMode="decimal" value={finalEditData.brokerage} onChange={(e) => setFinalEditData({ ...finalEditData, brokerage: sanitizeAmountInput(e.target.value) })} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="Amount" />
                    <select value={finalEditData.brokerageUnit} onChange={(e) => setFinalEditData({ ...finalEditData, brokerageUnit: e.target.value })} style={{ width: '100px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                      <option value="per_bag">Per Bag</option>
                      <option value="per_quintal">Per Quintal</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>LF</label>
                {hasLfForRateType(selectedEntry?.offering?.baseRateType || 'PD_LOOSE') ? (
                  <>
                    <div style={{ display: 'flex', gap: '6px', fontSize: '11px', marginBottom: '4px' }}>
                      <label><input type="radio" name="finalEditLf" checked={finalEditData.lfEnabled} onChange={() => setFinalEditData({ ...finalEditData, lfEnabled: true })} /> Yes</label>
                      <label><input type="radio" name="finalEditLf" checked={!finalEditData.lfEnabled} onChange={() => setFinalEditData({ ...finalEditData, lfEnabled: false, lf: '' })} /> No</label>
                    </div>
                    {finalEditData.lfEnabled && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input type="text" inputMode="decimal" value={finalEditData.lf} onChange={(e) => setFinalEditData({ ...finalEditData, lf: sanitizeAmountInput(e.target.value) })} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="Amount" />
                        <select value={finalEditData.lfUnit} onChange={(e) => setFinalEditData({ ...finalEditData, lfUnit: e.target.value })} style={{ width: '100px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                          <option value="per_bag">Per Bag</option>
                          <option value="per_quintal">Per Quintal</option>
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: '11px', color: '#94a3b8', padding: '6px 0' }}>Not Applicable</div>
                )}
              </div>
            </div>

            {!isRiceMode && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>CD</label>
                  <div style={{ display: 'flex', gap: '6px', fontSize: '11px', marginBottom: '4px' }}>
                    <label><input type="radio" name="finalEditCd" checked={finalEditData.cdEnabled} onChange={() => setFinalEditData({ ...finalEditData, cdEnabled: true })} /> Yes</label>
                    <label><input type="radio" name="finalEditCd" checked={!finalEditData.cdEnabled} onChange={() => setFinalEditData({ ...finalEditData, cdEnabled: false, cdValue: '' })} /> No</label>
                  </div>
                  {finalEditData.cdEnabled && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="text" inputMode="decimal" value={finalEditData.cdValue} onChange={(e) => setFinalEditData({ ...finalEditData, cdValue: sanitizeAmountInput(e.target.value, 8) })} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="CD" />
                      <select value={finalEditData.cdUnit} onChange={(e) => setFinalEditData({ ...finalEditData, cdUnit: e.target.value })} style={{ width: '90px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                        <option value="percentage">%</option>
                        <option value="lumps">Lumps</option>
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Bank Loan</label>
                  <div style={{ display: 'flex', gap: '6px', fontSize: '11px', marginBottom: '4px' }}>
                    <label><input type="radio" name="finalEditBankLoan" checked={finalEditData.bankLoanEnabled} onChange={() => setFinalEditData({ ...finalEditData, bankLoanEnabled: true })} /> Yes</label>
                    <label><input type="radio" name="finalEditBankLoan" checked={!finalEditData.bankLoanEnabled} onChange={() => setFinalEditData({ ...finalEditData, bankLoanEnabled: false, bankLoanValue: '' })} /> No</label>
                  </div>
                  {finalEditData.bankLoanEnabled && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="text" inputMode="decimal" value={finalEditData.bankLoanValue} onChange={(e) => setFinalEditData({ ...finalEditData, bankLoanValue: sanitizeAmountInput(e.target.value, 8) })} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="Amount" />
                      <select value={finalEditData.bankLoanUnit} onChange={(e) => setFinalEditData({ ...finalEditData, bankLoanUnit: e.target.value })} style={{ width: '90px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                        <option value="per_bag">Per Bag</option>
                        <option value="lumps">Lumps</option>
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Payment</label>
                  <div style={{ display: 'flex', gap: '6px', fontSize: '11px', marginBottom: '4px' }}>
                    <label><input type="radio" name="finalEditPayment" checked={finalEditData.paymentConditionEnabled} onChange={() => setFinalEditData({ ...finalEditData, paymentConditionEnabled: true, paymentConditionValue: finalEditData.paymentConditionValue || '15' })} /> Yes</label>
                    <label><input type="radio" name="finalEditPayment" checked={!finalEditData.paymentConditionEnabled} onChange={() => setFinalEditData({ ...finalEditData, paymentConditionEnabled: false, paymentConditionValue: '15' })} /> No</label>
                  </div>
                  {finalEditData.paymentConditionEnabled && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="text" inputMode="numeric" value={finalEditData.paymentConditionValue} onChange={(e) => setFinalEditData({ ...finalEditData, paymentConditionValue: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="Days" />
                      <select value={finalEditData.paymentConditionUnit} onChange={(e) => setFinalEditData({ ...finalEditData, paymentConditionUnit: e.target.value })} style={{ width: '90px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                        <option value="days">Days</option>
                        <option value="month">Month</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasEgbForRateType(selectedEntry?.offering?.baseRateType || 'PD_LOOSE') && (
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>EGB</label>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', marginBottom: '4px' }}>
                  <label><input type="radio" name="finalEditEgb" checked={finalEditData.egbType === 'mill'} onChange={() => setFinalEditData({ ...finalEditData, egbType: 'mill', egbValue: '' })} /> Mill</label>
                  <label><input type="radio" name="finalEditEgb" checked={finalEditData.egbType === 'purchase'} onChange={() => setFinalEditData({ ...finalEditData, egbType: 'purchase' })} /> Purchase</label>
                </div>
                {finalEditData.egbType === 'purchase' && (
                  <input type="text" inputMode="decimal" value={finalEditData.egbValue} onChange={(e) => setFinalEditData({ ...finalEditData, egbValue: sanitizeAmountInput(e.target.value) })} style={{ width: '160px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }} placeholder="EGB value" />
                )}
              </div>
            )}

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#1f2937', marginBottom: '4px', display: 'block' }}>Remarks</label>
              <textarea
                value={finalEditData.remarks}
                onChange={(e) => setFinalEditData({ ...finalEditData, remarks: e.target.value })}
                rows={2}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowFinalEditModal(false)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveFinalEdit} style={{ padding: '6px 12px', border: 'none', borderRadius: '4px', background: '#27ae60', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Save Final</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LoadingLots;
