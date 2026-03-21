import axios from 'axios';
import type {
  SampleEntry,
  SampleEntryWithDetails,
  SampleEntryFilters,
  QualityParameters,
  CookingReport,
  LotAllotment,
  PhysicalInspection,
  InventoryData,
  FinancialCalculation
} from '../types/sampleEntry';

import { API_URL } from '../config/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const sampleEntryApi = {
  // Sample Entry
  createSampleEntry: (data: Partial<SampleEntry>) =>
    api.post<SampleEntry>('/sample-entries', data),

  getSampleEntriesByRole: (filters: SampleEntryFilters) =>
    api.get<{ entries: SampleEntry[]; total: number }>('/sample-entries/by-role', { params: filters }),

  getSampleEntryById: (id: number) =>
    api.get<SampleEntryWithDetails>(`/sample-entries/${id}`),

  updateSampleEntry: (id: number, data: Partial<SampleEntry>) =>
    api.put<SampleEntry>(`/sample-entries/${id}`, data),

  // Quality Parameters
  addQualityParameters: (id: number, data: Partial<QualityParameters>) =>
    api.post<QualityParameters>(`/sample-entries/${id}/quality-parameters`, data),

  // Lot Selection
  lotSelection: (id: number, decision: 'PASS_WITHOUT_COOKING' | 'PASS_WITH_COOKING' | 'FAIL') =>
    api.post(`/sample-entries/${id}/lot-selection`, { decision }),

  // Cooking Report
  createCookingReport: (id: number, data: Partial<CookingReport>) =>
    api.post<CookingReport>(`/sample-entries/${id}/cooking-report`, data),

  // Offering Price
  updateOfferingPrice: (id: number, data: { offeringPrice: number; priceType: string; remarks?: string }) =>
    api.post<SampleEntry>(`/sample-entries/${id}/offering-price`, data),

  // Lot Allotment
  createLotAllotment: (id: number, data: Partial<LotAllotment>) =>
    api.post<LotAllotment>(`/sample-entries/${id}/lot-allotment`, data),

  // Physical Inspection
  createPhysicalInspection: (id: number, data: Partial<PhysicalInspection>) =>
    api.post<PhysicalInspection>(`/sample-entries/${id}/physical-inspection`, data),

  uploadInspectionImages: (id: number, files: { halfLorryImage?: File; fullLorryImage?: File }) => {
    const formData = new FormData();
    if (files.halfLorryImage) formData.append('halfLorryImage', files.halfLorryImage);
    if (files.fullLorryImage) formData.append('fullLorryImage', files.fullLorryImage);
    return api.post<PhysicalInspection>(`/sample-entries/${id}/inspection-images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Inventory Data
  createInventoryData: (id: number, data: Partial<InventoryData>) =>
    api.post<InventoryData>(`/sample-entries/${id}/inventory-data`, data),

  // Financial Calculation
  createFinancialCalculation: (id: number, data: Partial<FinancialCalculation>) =>
    api.post<FinancialCalculation>(`/sample-entries/${id}/financial-calculation`, data),

  createManagerFinancialCalculation: (id: number, data: Partial<FinancialCalculation>) =>
    api.post<FinancialCalculation>(`/sample-entries/${id}/manager-financial-calculation`, data),

  // Complete
  completeSampleEntry: (id: number) =>
    api.post(`/sample-entries/${id}/complete`),

  // Ledger
  getSampleEntryLedger: (filters: SampleEntryFilters) =>
    api.get<{ entries: SampleEntryWithDetails[]; total: number; page: number; pageSize: number }>('/sample-entries/ledger/all', { params: filters })
};
