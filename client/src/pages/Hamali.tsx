import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import InlinePaddyHamaliForm from '../components/InlinePaddyHamaliForm';
import InlineRiceHamaliForm from '../components/InlineRiceHamaliForm';
import hamaliStatusManager from '../utils/hamaliStatusManager';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Container = styled.div`
  animation: fadeIn 0.5s ease-in;
`;

const Title = styled.h1`
  color: #ffffff;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
`;

const TabContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 1rem 2rem;
  border: none;
  background: ${props => props.$active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#6b7280'};
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: all 0.3s ease;
  font-size: 1.1rem;

  &:hover {
    background: ${props => props.$active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f3f4f6'};
    color: ${props => props.$active ? 'white' : '#374151'};
  }
`;

const InfoBox = styled.div`
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-left: 4px solid #f59e0b;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  color: #92400e;
  font-weight: 600;
`;

const FilterSection = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
`;

const FilterRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
`;

const InfoText = styled.p`
  color: #6b7280;
  font-size: 0.85rem;
  margin: 0;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

const RecordsContainer = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
`;

const DateGroup = styled.div<{ expanded: boolean }>`
  border-bottom: 1px solid #e5e7eb;
  
  &:last-child {
    border-bottom: none;
  }
`;

const DateHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #f3f4f6;
  }
`;

const DateTitle = styled.h3`
  color: #1f2937;
  font-size: 1.1rem;
  margin: 0;
`;

const RecordCount = styled.span`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
`;

const LoadHamaliButton = styled.button`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin: 1rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
`;

const PDFDownloadButton = styled.button`
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin: 1rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
  width: 100%;
  margin: 0;
  padding: 0;
  
  /* Ensure table extends to edges */
  table {
    margin: 0;
    border-left: none;
    border-right: none;
  }
`;

const ExcelTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Calibri', 'Arial', sans-serif;
  font-size: 11px;
  background: white;
  border: 2px solid #4472C4;

  thead {
    background: #4472C4;
    color: white;
    font-weight: bold;
  }

  th {
    border: 1px solid #2563eb;
    padding: 8px 4px;
    text-align: center;
    font-weight: bold;
    white-space: nowrap;
    font-size: 12px;
    background: #4472C4;
    color: white;
  }

  td {
    border: 1px solid #d1d5db;
    padding: 4px;
    text-align: center;
    font-size: 11px;
    vertical-align: middle;
    text-transform: uppercase;
  }

  tbody tr:hover {
    opacity: 0.9;
  }

  /* Specific column widths to match Excel */
  th:nth-child(1), td:nth-child(1) { width: 40px; } /* Sl No */
  th:nth-child(2), td:nth-child(2) { width: 80px; } /* Date */
  th:nth-child(3), td:nth-child(3) { width: 90px; } /* Mvmt Type */
  th:nth-child(4), td:nth-child(4) { width: 80px; } /* Product */
  th:nth-child(5), td:nth-child(5) { width: 120px; } /* Variety */
  th:nth-child(6), td:nth-child(6) { width: 50px; } /* Bags */
  th:nth-child(7), td:nth-child(7) { width: 60px; } /* Bag Size */
  th:nth-child(8), td:nth-child(8) { width: 60px; } /* QTL S */
  th:nth-child(9), td:nth-child(9) { width: 100px; } /* Packaging */
  th:nth-child(10), td:nth-child(10) { width: 150px; } /* From */
  th:nth-child(11), td:nth-child(11) { width: 80px; } /* To */
`;

const PurchaseRow = styled.tr`
  background: #d4edda !important;
  
  &:hover {
    background: #c3e6cb !important;
  }
`;

const ShiftingRow = styled.tr`
  background: #e2d4ed !important;
  
  &:hover {
    background: #d4c3e6 !important;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  
  ${props => {
    switch (props.status) {
      case 'pending':
        return 'background: #fef3c7; color: #d97706;';
      case 'approved':
        return 'background: #d1fae5; color: #059669;';
      case 'rejected':
        return 'background: #fee2e2; color: #dc2626;';
      default:
        return 'background: #e5e7eb; color: #6b7280;';
    }
  }}
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  padding: 0.5rem;
  border: none;
  background: #f3f4f6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #e5e7eb;
  }

  &.edit:hover {
    background: #fef3c7;
    color: #f59e0b;
  }

  &.delete:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  &.approve:hover {
    background: #d1fae5;
    color: #059669;
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;
`;

interface Arrival {
  id: number;
  slNo: string;
  date: string;
  movementType: string;
  broker?: string;
  variety?: string;
  bags?: number;
  fromLocation?: string;
  toKunchinintuId?: number;
  toKunchinittu?: { name: string; code?: string };
  toWarehouse?: { name: string; code?: string };
  fromKunchinittu?: { name: string; code?: string };
  fromWarehouse?: { name: string; code?: string };
  toWarehouseShift?: { name: string; code?: string };
  outturnId?: number;
  outturn?: { code: string; allottedVariety?: string; isCleared?: boolean; clearedAt?: string };
  moisture?: number;
  cutting?: string;
  wbNo: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  lorryNumber: string;
  status: string;
  creator?: { username: string };
  approver?: { username: string; role: string };
  adminApprover?: { username: string; role: string };
  adminApprovedBy?: number;
}

const Hamali: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'paddy' | 'rice'>('paddy');
  const [hamaliDate, setHamaliDate] = useState<string>(() => {
    // FIXED: Default to test date with rice hamali data (2025-12-20)
    return '2025-12-20';
  });
  const [hamaliRecords, setHamaliRecords] = useState<Arrival[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHamali, setLoadingHamali] = useState(false);
  const [hamaliLoaded, setHamaliLoaded] = useState(false);
  const [selectedArrivalForHamali, setSelectedArrivalForHamali] = useState<any>(null);
  const [paddyHamaliEntries, setPaddyHamaliEntries] = useState<{ [key: number]: any[] }>({});
  const [otherHamaliEntries, setOtherHamaliEntries] = useState<{ [key: number]: any[] }>({});
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Rice Hamali states
  const [riceStockData, setRiceStockData] = useState<any[]>([]);
  const [riceReportSearch, setRiceReportSearch] = useState<string>('');

  // Rice Hamali states
  const [selectedRiceProductionForHamali, setSelectedRiceProductionForHamali] = useState<any>(null);
  const [riceHamaliEntries, setRiceHamaliEntries] = useState<{ [key: string]: any[] }>({});
  const [riceOtherHamaliEntries, setRiceOtherHamaliEntries] = useState<{ [key: string]: any[] }>({});
  const [riceHamaliLoaded, setRiceHamaliLoaded] = useState(false);
  const [loadingRiceHamali, setLoadingRiceHamali] = useState(false);

  useEffect(() => {
    if (activeTab === 'paddy') {
      fetchHamaliRecords();
    } else if (activeTab === 'rice') {
      fetchRiceStock();
    }
  }, [hamaliDate, activeTab]);

  // Force load hamali entries for the specific test date
  useEffect(() => {
    if (hamaliDate === '2025-06-29' && hamaliRecords.length > 0 && !hamaliLoaded) {
      console.log('🎯 Force loading hamali entries for test date');
      const arrivalIds = hamaliRecords.map(r => r.id);
      fetchPaddyHamaliEntries(arrivalIds);
    }
  }, [hamaliDate, hamaliRecords, hamaliLoaded]);

  const fetchHamaliRecords = async () => {
    setLoading(true);
    const startTime = Date.now();

    try {
      const params: any = {
        dateFrom: hamaliDate,
        dateTo: hamaliDate
      };

      // OPTIMIZED: Only fetch arrivals first, hamali entries loaded on demand
      const response = await axios.get('/records/arrivals', { params });
      const data = response.data as { records: { [key: string]: Arrival[] } };

      // Only get records for the selected date (not all dates)
      const selectedDateRecords = data.records?.[hamaliDate] || [];
      console.log(`📅 Filtering arrivals for selected date: ${hamaliDate}`);
      console.log(`📊 Found ${selectedDateRecords.length} arrivals for ${hamaliDate}`);

      // Ensure numeric fields are properly converted
      const processedRecords = selectedDateRecords.map(record => ({
        ...record,
        grossWeight: typeof record.grossWeight === 'string' ? parseFloat(record.grossWeight) || 0 : record.grossWeight || 0,
        tareWeight: typeof record.tareWeight === 'string' ? parseFloat(record.tareWeight) || 0 : record.tareWeight || 0,
        netWeight: typeof record.netWeight === 'string' ? parseFloat(record.netWeight) || 0 : record.netWeight || 0,
      }));

      setHamaliRecords(processedRecords);

      // OPTIMIZED: Auto-load hamali entries for reasonable datasets to show status immediately
      const arrivalIds = selectedDateRecords.map(r => r.id);
      console.log(`📊 Found ${arrivalIds.length} arrivals for ${hamaliDate}`);

      // FORCE AUTO-LOAD: Always auto-load for any number of arrivals to ensure right marks show
      if (arrivalIds.length > 0) {
        console.log('🚀 Force auto-loading hamali entries for all arrivals...');
        fetchPaddyHamaliEntries(arrivalIds);
      } else {
        // No arrivals
        setHamaliLoaded(false);
        setPaddyHamaliEntries({});
        setOtherHamaliEntries({});
      }

      const loadTime = Date.now() - startTime;
      if (loadTime > 1000) {
        console.warn(`⚠️ Slow arrivals load: ${loadTime}ms for ${hamaliDate}`);
      }
    } catch (error) {
      console.error('Error fetching hamali records:', error);
      toast.error('Failed to fetch records for hamali');
      setHamaliRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaddyHamaliEntries = async (arrivalIds: number[]) => {
    setLoadingHamali(true);
    const startTime = Date.now();

    try {
      console.log('🌾 Fetching paddy hamali entries using status manager...');

      const result = await hamaliStatusManager.getPaddyHamaliStatus(arrivalIds, {
        useCache: true,
        date: hamaliDate
      });

      console.log('📊 Paddy hamali status result:', {
        paddyEntries: Object.keys(result.paddyEntries || {}).length,
        otherEntries: Object.keys(result.otherEntries || {}).length,
        totalPaddyEntries: Object.values(result.paddyEntries || {}).flat().length,
        totalOtherEntries: Object.values(result.otherEntries || {}).flat().length
      });

      setPaddyHamaliEntries(result.paddyEntries || {});
      setOtherHamaliEntries(result.otherEntries || {});
      setHamaliLoaded(true);

      const loadTime = Date.now() - startTime;
      toast.success(`⚡ Loaded hamali entries in ${loadTime}ms`);
    } catch (error) {
      console.error('Error fetching hamali entries:', error);
      toast.error('Failed to load hamali entries');
      setPaddyHamaliEntries({});
      setOtherHamaliEntries({});
    } finally {
      setLoadingHamali(false);
    }
  };

  const handleEditEntry = (entry: any, entryType: 'paddy' | 'other') => {
    setEditingEntry({ ...entry, entryType });
    setEditForm({
      rate: entry.rate?.toString() || '',
      bags: entry.bags?.toString() || '',
      workerName: entry.workerName || '',
      batchNumber: entry.batchNumber?.toString() || '1',
      description: entry.description || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editingEntry || !editForm.rate || !editForm.bags) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = editingEntry.entryType === 'paddy'
        ? `/paddy-hamali-entries/${editingEntry.id}`
        : `/other-hamali-entries/${editingEntry.id}`;

      const updateData: any = {
        workType: editingEntry.workType,
        workDetail: editingEntry.workDetail,
        rate: parseFloat(editForm.rate),
        bags: parseInt(editForm.bags)
      };

      if (editingEntry.entryType === 'paddy') {
        updateData.workerName = editForm.workerName;
        updateData.batchNumber = parseInt(editForm.batchNumber);
      } else {
        updateData.description = editForm.description;
      }

      await axios.put(endpoint, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Hamali entry updated successfully');

      // Refresh the hamali entries
      const arrivalIds = hamaliRecords.map(r => r.id);
      if (arrivalIds.length > 0) {
        fetchPaddyHamaliEntries(arrivalIds);
      }

      handleCancelEdit();
    } catch (error: any) {
      console.error('Error updating hamali entry:', error);
      toast.error(error.response?.data?.error || 'Failed to update hamali entry');
    } finally {
      setSaving(false);
    }
  };

  const fetchRiceStock = async () => {
    setLoading(true);
    try {
      console.log('🍚 Fetching rice stock data for Rice Hamali...');

      const token = localStorage.getItem('token');

      // Fetch rice productions
      const productionsResponse = await axios.get<{ productions: any[] }>('/rice-productions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Rice productions response:', productionsResponse.data);

      // Fetch rice stock movements (Purchase/Sale/Palti) - FIXED API CALL
      let stockMovements: any[] = [];
      try {
        console.log('🔍 Fetching rice stock movements with correct API...');
        const movementsResponse: any = await axios.get('/rice-stock-management/movements', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            dateFrom: hamaliDate,
            dateTo: hamaliDate,
            limit: 200
            // FIXED: Don't filter by approval status - admin movements are auto-approved
          }
        });

        console.log('📥 Raw movements API response:', movementsResponse.data);

        // FIXED: Handle correct API response structure and filter by status
        if (movementsResponse.data.success && movementsResponse.data.data) {
          const allMovements = movementsResponse.data.data.movements || [];
          // Filter to only show approved movements (admin movements are auto-approved)
          stockMovements = allMovements.filter((m: any) =>
            m.status && m.status.toLowerCase() === 'approved'
          );
        } else {
          console.warn('⚠️ Unexpected API response structure:', movementsResponse.data);
          stockMovements = [];
        }

        console.log('✅ Successfully fetched movements:', {
          total: stockMovements.length,
          purchase: stockMovements.filter(m => m.movement_type === 'purchase').length,
          sale: stockMovements.filter(m => m.movement_type === 'sale').length,
          palti: stockMovements.filter(m => m.movement_type === 'palti').length
        });

        // Enhanced debug for palti movements
        const paltiMovements = stockMovements.filter(m => m.movement_type === 'palti');
        if (paltiMovements.length > 0) {
          console.log('🔍 Palti movements packaging data:', paltiMovements.map(m => ({
            id: m.id,
            source_packaging_brand: m.source_packaging_brand,
            target_packaging_brand: m.target_packaging_brand,
            source_packaging_kg: m.source_packaging_kg,
            target_packaging_kg: m.target_packaging_kg
          })));
        }

      } catch (error: any) {
        console.error('❌ Error fetching rice stock movements:', error);
        console.error('❌ Error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });

        // Show user-friendly error message
        if (error.response?.status === 401) {
          toast.error('Authentication failed. Please login again.');
        } else if (error.response?.status === 404) {
          toast.error('Rice stock movements API not found. Please check server configuration.');
        } else {
          toast.error('Failed to fetch rice stock movements. Please try again.');
        }

        stockMovements = [];
      }

      if (productionsResponse.data.productions || stockMovements.length > 0) {
        // Combine and format all movements
        const allMovements = [
          // Production entries
          ...productionsResponse.data.productions.map((prod: any) => ({
            ...prod,
            movementType: 'production',
            isRiceProduction: true
          })),
          // Purchase/Sale/Palti entries (convert to rice production format for hamali compatibility)
          ...stockMovements
            .filter((movement: any) => {
              if (!hamaliDate) return true;

              // More robust date comparison
              const movementDate = new Date(movement.date);
              const selectedDate = new Date(hamaliDate);

              // Compare dates (ignore time)
              const movementDateStr = movementDate.toISOString().split('T')[0];
              const selectedDateStr = selectedDate.toISOString().split('T')[0];

              const matches = movementDateStr === selectedDateStr;
              if (!matches) {
                console.log('🔍 Date filter - excluding movement:', {
                  movementId: movement.id,
                  movementDate: movementDateStr,
                  selectedDate: selectedDateStr
                });
              }
              return matches;
            })
            .map((movement: any) => {
              // High-resilience extraction
              const mvtType = (movement.movementType || movement.movement_type || movement.movementtype || movement.MovementType || 'unknown').toLowerCase();
              const bags = parseInt(movement.bags || movement.BAGS || movement.Bags) || 0;
              const bagSize = parseFloat(movement.bagSizeKg || movement.bag_size_kg || movement.bagsizekg || movement.packagingKg || 26);

              let qtls = parseFloat(movement.quantityQuintals || movement.quantity_quintals || movement.quantityquintals || movement.QuantityQuintals);
              if (isNaN(qtls) || qtls === 0) {
                qtls = (bags * bagSize) / 100;
              }

              return {
                id: `movement-${movement.id || movement.ID}`,
                date: movement.date || movement.DATE || movement.Date,
                productType: movement.productType || movement.product_type || movement.producttype || 'Rice',
                movementType: mvtType,
                bags: bags,
                quantityQuintals: qtls,
                locationCode: movement.locationCode || movement.location_code || movement.locationcode,
                fromLocation: movement.fromLocation || movement.from_location || movement.fromlocation,
                toLocation: movement.toLocation || movement.to_location || movement.tolocation,
                // FIXED: Use correct packaging field names from backend with full fallbacks
                packaging: {
                  brandName: movement.packagingBrand || movement.packaging_brand || movement.packagingbrand || movement.targetPackagingBrand || movement.target_packaging_brand || 'White Packet',
                  allottedKg: bagSize
                },
                // FIXED: Map palti packaging fields correctly
                source_packaging_brand: movement.sourcePackagingBrand || movement.source_packaging_brand || movement.sourcepackagingbrand,
                source_packaging_kg: movement.sourcePackagingKg || movement.source_packaging_kg || movement.sourcepackagingkg || 26,
                target_packaging_brand: movement.targetPackagingBrand || movement.target_packaging_brand || movement.targetpackagingbrand,
                target_packaging_kg: movement.targetPackagingKg || movement.target_packaging_kg || movement.targetpackagingkg || 26,
                outturn: {
                  code: mvtType === 'purchase' ? 'Purchase' :
                    mvtType === 'sale' ? 'Sale' :
                      mvtType === 'palti' ? 'Palti' : mvtType,
                  allottedVariety: movement.variety || movement.VARIETY || movement.Variety || 'Sum25 RNR Raw'
                },
                status: movement.status || movement.STATUS || movement.Status,
                isRiceProduction: false,
                originalMovement: {
                  ...movement,
                  id: movement.id || movement.ID,
                  movement_type: mvtType,
                  bill_number: movement.billNumber || movement.bill_number || movement.billnumber || '-',
                  lorry_number: movement.lorryNumber || movement.lorry_number || movement.lorrynumber || '-'
                }
              };
            })
        ];

        console.log('✅ Combined movements summary:', {
          total: allMovements.length,
          production: allMovements.filter(m => m.movementType === 'production').length,
          purchase: allMovements.filter(m => m.movementType === 'purchase').length,
          sale: allMovements.filter(m => m.movementType === 'sale').length,
          palti: allMovements.filter(m => m.movementType === 'palti').length
        });

        // Filter by selected date (final filter)
        const filteredMovements = allMovements.filter((item: any) => {
          if (!hamaliDate) return true;
          const itemDate = new Date(item.date).toISOString().split('T')[0];
          return itemDate === hamaliDate;
        });

        console.log('✅ Final filtered movements for display:', {
          total: filteredMovements.length,
          production: filteredMovements.filter(m => m.movementType === 'production').length,
          purchase: filteredMovements.filter(m => m.movementType === 'purchase').length,
          sale: filteredMovements.filter(m => m.movementType === 'sale').length,
          palti: filteredMovements.filter(m => m.movementType === 'palti').length
        });

        setRiceStockData(filteredMovements);

        // FORCE AUTO-LOAD: Always auto-load rice hamali entries to ensure right marks show
        if (filteredMovements.length > 0) {
          console.log('🚀 Auto-loading rice hamali entries for all movements...');

          // Separate production and stock movement IDs
          const productionIds: number[] = [];
          const stockMovementIds: number[] = [];

          filteredMovements.forEach(item => {
            if (item.isRiceProduction) {
              productionIds.push(item.id);
            } else {
              // Extract numeric ID from "movement-123" format
              const numericId = parseInt(item.id.toString().replace('movement-', ''));
              if (!isNaN(numericId)) {
                stockMovementIds.push(numericId);
              }
            }
          });

          console.log('📊 IDs for hamali loading:', { productionIds, stockMovementIds });
          fetchRiceHamaliEntries(productionIds, stockMovementIds);
        } else {
          console.log('⚠️ No movements found for date, clearing hamali data');
          setRiceHamaliLoaded(false);
          setRiceHamaliEntries({});
          setRiceOtherHamaliEntries({});
        }
      } else {
        console.log('⚠️ No rice data available');
        setRiceStockData([]);
        setRiceHamaliLoaded(false);
        setRiceHamaliEntries({});
        setRiceOtherHamaliEntries({});
      }
    } catch (error) {
      console.error('Error fetching rice stock:', error);
      toast.error('Failed to fetch rice stock data');
      setRiceStockData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Rice Hamali entries for rice productions and stock movements
  const fetchRiceHamaliEntries = async (riceProductionIds: number[] = [], stockMovementIds: number[] = []) => {
    if (riceProductionIds.length === 0 && stockMovementIds.length === 0) {
      setRiceHamaliEntries({});
      setRiceOtherHamaliEntries({});
      setRiceHamaliLoaded(true);
      return;
    }

    setLoadingRiceHamali(true);
    try {
      console.log('🍚 Fetching rice hamali entries using status manager...');
      console.log('📊 IDs to fetch:', { riceProductionIds, stockMovementIds });

      const result = await hamaliStatusManager.getRiceHamaliStatus(riceProductionIds, stockMovementIds, {
        useCache: true,
        date: hamaliDate
      });

      console.log('📊 Rice hamali status result:', {
        riceEntries: Object.keys(result.riceEntries || {}).length,
        otherEntries: Object.keys(result.otherEntries || {}).length,
        totalRiceEntries: Object.values(result.riceEntries || {}).flat().length,
        totalOtherEntries: Object.values(result.otherEntries || {}).flat().length
      });

      setRiceHamaliEntries(result.riceEntries || {});
      setRiceOtherHamaliEntries(result.otherEntries || {});
      setRiceHamaliLoaded(true);

      console.log('✅ Rice Hamali entries loaded successfully');
    } catch (error) {
      console.error('Error fetching rice hamali entries:', error);
      toast.error('Failed to fetch rice hamali entries');
      setRiceHamaliEntries({});
      setRiceOtherHamaliEntries({});
    } finally {
      setLoadingRiceHamali(false);
    }
  };

  return (
    <Container>
      <Title>💰 Hamali Management</Title>

      {/* Paddy/Rice Tabs */}
      <TabContainer>
        <Tab $active={activeTab === 'paddy'} onClick={() => setActiveTab('paddy')}>
          🌾 Paddy Hamali
        </Tab>
        <Tab $active={activeTab === 'rice'} onClick={() => setActiveTab('rice')}>
          🍚 Rice Hamali
        </Tab>
      </TabContainer>

      {/* Date Filter for Hamali */}
      <FilterSection>
        <FilterRow>
          <FormGroup>
            <Label>Select Date</Label>
            <Input
              type="date"
              value={hamaliDate}
              onChange={(e) => setHamaliDate(e.target.value)}
            />
            <InfoText>
              {activeTab === 'paddy'
                ? 'Select date to view arrivals for hamali entry'
                : 'Select date to view rice entries for hamali'
              }
            </InfoText>
          </FormGroup>
        </FilterRow>
      </FilterSection>

      {/* Content based on active tab */}
      {activeTab === 'paddy' ? (
        /* Paddy Hamali Records Display */
        loading ? (
          <EmptyState>
            <div className="spinner"></div>
            <p>Loading records...</p>
          </EmptyState>
        ) : hamaliRecords.length === 0 ? (
          <EmptyState>
            <p>📭 No arrivals found for {new Date(hamaliDate).toLocaleDateString('en-GB')}</p>
            <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Select a different date to view arrivals</p>
          </EmptyState>
        ) : (
          <RecordsContainer>
            <DateGroup expanded={true}>
              <DateHeader>
                <DateTitle>
                  📅 {new Date(hamaliDate).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </DateTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <RecordCount>{hamaliRecords.length} arrivals</RecordCount>
                  {!hamaliLoaded && (
                    <LoadHamaliButton
                      onClick={() => {
                        console.log('🔘 Manual load button clicked');
                        const arrivalIds = hamaliRecords.map(r => r.id);
                        console.log(`📊 Loading hamali for ${arrivalIds.length} arrivals`);
                        fetchPaddyHamaliEntries(arrivalIds);
                      }}
                      disabled={loadingHamali}
                      style={{
                        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        animation: 'pulse 2s infinite',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        border: '2px solid #fff',
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)'
                      }}
                    >
                      {loadingHamali ? '⚡ Loading Hamali Status...' : '🚨 CLICK TO LOAD HAMALI STATUS'}
                    </LoadHamaliButton>
                  )}
                  {hamaliLoaded && (
                    <span style={{
                      color: '#10b981',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      background: '#d1fae5',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '2px solid #10b981'
                    }}>
                      ✅ Hamali Status Loaded - Check Actions Column for ✓ Marks
                    </span>
                  )}
                  {/* Debug: Cache Clear Button */}
                  <button
                    onClick={() => {
                      console.log('🧹 Clearing hamali cache...');
                      hamaliStatusManager.clearCache();
                      // Force reload hamali entries
                      const arrivalIds = hamaliRecords.map(r => r.id);
                      if (arrivalIds.length > 0) {
                        fetchPaddyHamaliEntries(arrivalIds);
                      }
                    }}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    🧹 Clear Cache & Reload
                  </button>
                </div>
              </DateHeader>

              <TableContainer>
                <ExcelTable>
                  <thead>
                    <tr>
                      <th>Sl No</th>
                      <th>Date</th>
                      <th>Type of Movement</th>
                      <th>Broker</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Variety</th>
                      <th>Bags</th>
                      <th>Moisture</th>
                      <th>Cutting</th>
                      <th>Wb No</th>
                      <th>Gross Weight</th>
                      <th>Tare Weight</th>
                      <th>Net Weight</th>
                      <th>Lorry No</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hamaliRecords.map((record) => {
                      const RowComponent = record.movementType === 'purchase' ? PurchaseRow :
                        record.movementType === 'shifting' ? ShiftingRow : 'tr';

                      return (
                        <React.Fragment key={record.id}>
                          <RowComponent>
                            <td>{record.slNo}</td>
                            <td>{new Date(record.date).toLocaleDateString('en-GB')}</td>
                            <td style={{ textTransform: 'capitalize' }}>
                              {record.movementType === 'production-shifting' ? 'Production Shifting' : record.movementType}
                            </td>
                            <td>{record.broker || '-'}</td>
                            <td>
                              {record.movementType === 'purchase' ? (record.fromLocation || '-') :
                                record.movementType === 'shifting' ?
                                  `${record.fromKunchinittu?.code || '-'} (${record.fromWarehouse?.code || '-'})` :
                                  record.movementType === 'production-shifting' ?
                                    `${record.fromKunchinittu?.code || '-'} (${record.fromWarehouse?.code || '-'})` : '-'}
                            </td>
                            <td>
                              {record.movementType === 'purchase' ?
                                `${record.toKunchinittu?.code || '-'} (${record.toWarehouse?.code || '-'})` :
                                record.movementType === 'shifting' ?
                                  `${record.toKunchinittu?.code || '-'} (${record.toWarehouseShift?.code || '-'})` :
                                  record.movementType === 'production-shifting' ?
                                    `${record.outturn?.code || '-'}` : '-'}
                            </td>
                            <td>
                              {record.variety || '-'}
                            </td>
                            <td>{record.bags || '-'}</td>
                            <td>{record.moisture ? `${record.moisture}%` : '-'}</td>
                            <td>{(() => {
                              const c = record.cutting;
                              if (!c || c === '-') return '-';
                              const s = String(c).trim();
                              if (s.includes('X') || s.includes('x')) {
                                const parts = s.split(/[Xx]/);
                                if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
                                  return `${parts[0].trim()} x ${parts[1].trim()}`;
                                }
                              }
                              return s;
                            })()}</td>
                            <td>{record.wbNo}</td>
                            <td>{record.grossWeight.toFixed(2)}</td>
                            <td>{record.tareWeight.toFixed(2)}</td>
                            <td style={{ fontWeight: 'bold' }}>{record.netWeight.toFixed(2)}</td>
                            <td>{record.lorryNumber}</td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <StatusBadge status={record.status}>
                                  {record.status}
                                </StatusBadge>
                                {/* Hamali Status Indicator */}
                                {hamaliLoaded && (
                                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    {paddyHamaliEntries[record.id] && paddyHamaliEntries[record.id].length > 0 && (
                                      <span style={{
                                        background: '#d1fae5',
                                        color: '#059669',
                                        padding: '2px 6px',
                                        borderRadius: '12px',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px'
                                      }}>
                                        ✓ PADDY ({paddyHamaliEntries[record.id].length})
                                      </span>
                                    )}
                                    {otherHamaliEntries[record.id] && otherHamaliEntries[record.id].length > 0 && (
                                      <span style={{
                                        background: '#ddd6fe',
                                        color: '#7c3aed',
                                        padding: '2px 6px',
                                        borderRadius: '12px',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px'
                                      }}>
                                        ✓ OTHER ({otherHamaliEntries[record.id].length})
                                      </span>
                                    )}
                                    {(!paddyHamaliEntries[record.id] || paddyHamaliEntries[record.id].length === 0) &&
                                      (!otherHamaliEntries[record.id] || otherHamaliEntries[record.id].length === 0) && (
                                        <span style={{
                                          background: '#fee2e2',
                                          color: '#dc2626',
                                          padding: '2px 6px',
                                          borderRadius: '12px',
                                          fontSize: '0.7rem',
                                          fontWeight: '600'
                                        }}>
                                          NO HAMALI
                                        </span>
                                      )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <ActionButtons>
                                {/* Hamali Status Indicator - Always visible */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  marginBottom: '4px'
                                }}>
                                  {hamaliLoaded && paddyHamaliEntries[record.id] && paddyHamaliEntries[record.id].length > 0 && (
                                    <span style={{
                                      background: '#10b981',
                                      color: 'white',
                                      padding: '4px 8px',
                                      borderRadius: '16px',
                                      fontSize: '0.75rem',
                                      fontWeight: 'bold',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                                    }}>
                                      ✓ HAMALI SAVED
                                    </span>
                                  )}
                                  {hamaliLoaded && (!paddyHamaliEntries[record.id] || paddyHamaliEntries[record.id].length === 0) &&
                                    (!otherHamaliEntries[record.id] || otherHamaliEntries[record.id].length === 0) && (
                                      <span style={{
                                        background: '#ef4444',
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '16px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        animation: 'pulse 2s infinite'
                                      }}>
                                        ⚠ NO HAMALI
                                      </span>
                                    )}
                                </div>

                                {/* Add Hamali button - For all records (not loose) - All roles can add */}
                                {record.movementType !== 'loose' && (
                                  <IconButton
                                    className="approve"
                                    onClick={() => {
                                      if (selectedArrivalForHamali?.id === record.id) {
                                        setSelectedArrivalForHamali(null);
                                      } else {
                                        // Validate required fields before opening modal
                                        if (!record.slNo || !record.id) {
                                          toast.error('Unable to load arrival information. Missing required fields.');
                                          return;
                                        }
                                        if (!record.bags || record.bags <= 0) {
                                          toast.error('Cannot add hamali to arrival with no bags.');
                                          return;
                                        }
                                        setSelectedArrivalForHamali(record);
                                      }
                                    }}
                                    title={(() => {
                                      if (selectedArrivalForHamali?.id === record.id) return "Close Form";

                                      const paddyCount = paddyHamaliEntries[record.id]?.length || 0;
                                      const otherCount = otherHamaliEntries[record.id]?.length || 0;
                                      const totalCount = paddyCount + otherCount;

                                      if (totalCount > 0) {
                                        return `✓ Hamali Already Added - Paddy: ${paddyCount}, Other: ${otherCount}`;
                                      }

                                      return hamaliLoaded ? "Add Hamali (No entries yet)" : "Click 'Load Hamali Entries' first";
                                    })()}
                                    style={(() => {
                                      if (selectedArrivalForHamali?.id === record.id) {
                                        return {
                                          background: '#6b7280',
                                          position: 'relative' as const
                                        };
                                      }

                                      const hasPaddyHamali = paddyHamaliEntries[record.id]?.length > 0;
                                      const hasOtherHamali = otherHamaliEntries[record.id]?.length > 0;
                                      const hasAnyHamali = hasPaddyHamali || hasOtherHamali;

                                      if (hasAnyHamali) {
                                        return {
                                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                          position: 'relative' as const,
                                          transform: 'scale(1.1)',
                                          boxShadow: '0 4px 12px rgba(5, 150, 105, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                                          border: '2px solid #10b981'
                                        };
                                      }

                                      return {
                                        background: '#10b981',
                                        position: 'relative' as const
                                      };
                                    })()}
                                  >
                                    {(() => {
                                      if (selectedArrivalForHamali?.id === record.id) return '✕';

                                      const hasPaddyHamali = paddyHamaliEntries[record.id]?.length > 0;
                                      const hasOtherHamali = otherHamaliEntries[record.id]?.length > 0;
                                      const hasAnyHamali = hasPaddyHamali || hasOtherHamali;

                                      // Debug logging (remove in production)
                                      if (record.slNo === 'SL019523' || record.slNo === 'SL019626' || record.id === 401) {
                                        console.log(`🔍 Debug ${record.slNo} (ID: ${record.id}):`, {
                                          hamaliLoaded,
                                          hasPaddyHamali,
                                          hasOtherHamali,
                                          hasAnyHamali,
                                          paddyCount: paddyHamaliEntries[record.id]?.length || 0,
                                          otherCount: otherHamaliEntries[record.id]?.length || 0,
                                          paddyEntries: paddyHamaliEntries[record.id],
                                          otherEntries: otherHamaliEntries[record.id],
                                          allPaddyKeys: Object.keys(paddyHamaliEntries),
                                          allOtherKeys: Object.keys(otherHamaliEntries)
                                        });
                                      }

                                      return hasAnyHamali ?
                                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>✓</span> :
                                        '💰';
                                    })()}

                                    {/* Show count badge if hamali entries exist */}
                                    {(() => {
                                      if (selectedArrivalForHamali?.id === record.id) return null;

                                      const paddyCount = paddyHamaliEntries[record.id]?.length || 0;
                                      const otherCount = otherHamaliEntries[record.id]?.length || 0;
                                      const totalCount = paddyCount + otherCount;

                                      if (totalCount > 0) {
                                        return (
                                          <span style={{
                                            position: 'absolute' as const,
                                            top: '-6px',
                                            right: '-6px',
                                            background: '#dc2626',
                                            color: 'white',
                                            borderRadius: '50%',
                                            minWidth: '20px',
                                            height: '20px',
                                            display: 'flex' as const,
                                            alignItems: 'center' as const,
                                            justifyContent: 'center' as const,
                                            fontSize: '11px',
                                            fontWeight: 'bold' as const,
                                            border: '2px solid white',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                            padding: '0 2px'
                                          }}>
                                            {totalCount}
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </IconButton>
                                )}
                              </ActionButtons>
                            </td>
                          </RowComponent>
                          {selectedArrivalForHamali?.id === record.id && (
                            <tr style={{ background: 'white' }}>
                              <td colSpan={17} style={{
                                padding: 0,
                                margin: 0,
                                border: 'none',
                                background: 'white'
                              }}>
                                <div style={{
                                  width: '100%',
                                  overflow: 'hidden',
                                  background: 'white'
                                }}>
                                  <InlinePaddyHamaliForm
                                    arrival={{
                                      id: selectedArrivalForHamali.id,
                                      arrivalNumber: selectedArrivalForHamali.slNo,
                                      partyName: selectedArrivalForHamali.broker || 'N/A',
                                      bags: selectedArrivalForHamali.bags
                                    }}
                                    onClose={() => setSelectedArrivalForHamali(null)}
                                    onSave={() => {
                                      // Task 2.3: Enhanced immediate status refresh for paddy hamali
                                      console.log('🔄 Paddy hamali saved - refreshing status immediately');

                                      // FIXED: Clear all cache first to ensure fresh data is fetched
                                      hamaliStatusManager.clearCache();
                                      console.log('🧹 Cache cleared for immediate status refresh');

                                      // Use the new immediate refresh method
                                      hamaliStatusManager.refreshStatusImmediate('paddy', selectedArrivalForHamali.id, {
                                        date: hamaliDate
                                      }).then(() => {
                                        // Refresh the display data
                                        const arrivalIds = hamaliRecords.map(r => r.id);
                                        if (arrivalIds.length > 0) {
                                          fetchPaddyHamaliEntries(arrivalIds);
                                        }
                                      }).catch(error => {
                                        console.error('Error refreshing paddy hamali status:', error);
                                        // Fallback to regular refresh
                                        const arrivalIds = hamaliRecords.map(r => r.id);
                                        if (arrivalIds.length > 0) {
                                          fetchPaddyHamaliEntries(arrivalIds);
                                        }
                                      });

                                      setSelectedArrivalForHamali(null);
                                      toast.success('✅ Paddy Hamali added successfully! Right mark should appear immediately.');
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </ExcelTable>
              </TableContainer>
            </DateGroup>
          </RecordsContainer>
        )
      ) : (
        /* Rice Hamali Display */
        <>
          {loading ? (
            <EmptyState>
              <div className="spinner"></div>
              <p>Loading rice hamali entries...</p>
            </EmptyState>
          ) : (
            <RecordsContainer>
              <DateHeader>
                <DateTitle>
                  🍚 Rice Hamali - {new Date(hamaliDate).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </DateTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <RecordCount>{riceStockData.length} entries</RecordCount>
                  {!riceHamaliLoaded && riceStockData.length > 0 && (
                    <LoadHamaliButton
                      onClick={() => {
                        console.log('🔘 Manual load rice hamali button clicked');
                        const riceProductionIds = riceStockData.map(r => r.id);
                        console.log(`📊 Loading rice hamali for ${riceProductionIds.length} productions`);
                        fetchRiceHamaliEntries(riceProductionIds);
                      }}
                      disabled={loadingRiceHamali}
                      style={{
                        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        animation: 'pulse 2s infinite'
                      }}
                    >
                      {loadingRiceHamali ? '⚡ Loading...' : '🚨 LOAD RICE HAMALI STATUS'}
                    </LoadHamaliButton>
                  )}
                  {riceHamaliLoaded && (
                    <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: '600' }}>
                      ✅ Rice Hamali entries loaded
                    </span>
                  )}
                  {/* Debug: Cache Clear Button for Rice */}
                  <button
                    onClick={() => {
                      console.log('🧹 Clearing rice hamali cache...');
                      hamaliStatusManager.clearCache();
                      // Force reload rice hamali entries
                      if (riceStockData.length > 0) {
                        const productionIds = riceStockData
                          .filter((item: any) => item.isRiceProduction)
                          .map((item: any) => item.id);
                        const stockMovementIds = riceStockData
                          .filter((item: any) => !item.isRiceProduction && item.originalMovement)
                          .map((item: any) => item.originalMovement.id);

                        if (productionIds.length > 0 || stockMovementIds.length > 0) {
                          fetchRiceHamaliEntries(productionIds, stockMovementIds);
                        }
                      }
                    }}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    🧹 Clear Cache
                  </button>
                </div>
              </DateHeader>

              {/* Search Input */}
              <div style={{ padding: '1rem', background: '#f8fafc' }}>
                <Input
                  type="text"
                  placeholder="Search by outturn number, product type, or location..."
                  value={riceReportSearch}
                  onChange={(e) => setRiceReportSearch(e.target.value)}
                  style={{ maxWidth: '500px' }}
                />
              </div>

              {riceStockData.length === 0 ? (
                <EmptyState>
                  <p>📭 No rice entries found for {new Date(hamaliDate).toLocaleDateString('en-GB')}</p>
                  <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Select a different date to view rice hamali entries</p>
                </EmptyState>
              ) : (
                <TableContainer>
                  <ExcelTable>
                    <thead>
                      <tr style={{
                        backgroundColor: '#4472C4',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '40px', maxWidth: '40px' }}>Sl No</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '80px', maxWidth: '80px' }}>Date</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '90px', maxWidth: '90px' }}>Mvmt Type</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '70px', maxWidth: '70px' }}>Product</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '80px', maxWidth: '80px' }}>Variety</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '50px', maxWidth: '50px' }}>Bags</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '60px', maxWidth: '60px' }}>Bag Size</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '60px', maxWidth: '60px' }}>QTL S</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '80px', maxWidth: '80px' }}>Packaging</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '100px', maxWidth: '100px' }}>From</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '60px', maxWidth: '60px' }}>To</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '70px', maxWidth: '70px' }}>Bill Number</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '70px', maxWidth: '70px' }}>Lorry Number</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #2563eb', width: '90px', maxWidth: '90px' }}>Rice Hamali</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filteredData = riceStockData
                          .filter((item: any) => {
                            // Exclude CLEARING entries from Rice Hamali
                            if (item.locationCode === 'CLEARING') return false;

                            if (!riceReportSearch) return true;
                            const searchLower = riceReportSearch.toLowerCase();
                            return (
                              item.outturn?.code?.toLowerCase().includes(searchLower) ||
                              item.productType?.toLowerCase().includes(searchLower) ||
                              item.locationCode?.toLowerCase().includes(searchLower) ||
                              item.lorryNumber?.toLowerCase().includes(searchLower) ||
                              item.billNumber?.toLowerCase().includes(searchLower)
                            );
                          });

                        console.log('🔍 DEBUG - Rice Hamali Table Rendering:', {
                          totalData: riceStockData.length,
                          filteredData: filteredData.length,
                          sampleData: riceStockData.slice(0, 2).map(item => ({
                            id: item.id,
                            movementType: item.movementType,
                            productType: item.productType,
                            locationCode: item.locationCode,
                            isRiceProduction: item.isRiceProduction
                          }))
                        });

                        // Build bill/palti groups for rowspan calculation
                        const groupMap: { [key: string]: number[] } = {};
                        filteredData.forEach((item: any, i: number) => {
                          let groupKey = '';
                          if (item.movementType === 'sale' && item.originalMovement?.bill_number) {
                            groupKey = `sale_${item.originalMovement.bill_number}_${item.date}`;
                          }

                          if (groupKey) {
                            if (!groupMap[groupKey]) {
                              groupMap[groupKey] = [];
                            }
                            groupMap[groupKey].push(i);
                          }
                        });

                        // Assign SL numbers and rowspan info
                        const slAssigned: { [key: string]: boolean } = {};
                        let currentSl = 0;
                        const processedData = filteredData.map((item: any, i: number) => {
                          let groupKey = '';
                          if (item.movementType === 'sale' && item.originalMovement?.bill_number) {
                            groupKey = `sale_${item.originalMovement.bill_number}_${item.date}`;
                          }

                          if (groupKey) {
                            const groupIndices = groupMap[groupKey];

                            if (!slAssigned[groupKey]) {
                              currentSl++;
                              slAssigned[groupKey] = true;
                              return {
                                ...item,
                                _slNumber: currentSl,
                                _rowspan: groupIndices.length,
                                _isFirstOfGroup: true,
                                _isPartOfGroup: groupIndices.length > 1
                              };
                            } else {
                              return {
                                ...item,
                                _slNumber: null,
                                _rowspan: 0,
                                _isFirstOfGroup: false,
                                _isPartOfGroup: true
                              };
                            }
                          } else {
                            currentSl++;
                            return {
                              ...item,
                              _slNumber: currentSl,
                              _rowspan: 1,
                              _isFirstOfGroup: true,
                              _isPartOfGroup: false
                            };
                          }
                        });

                        return processedData.map((item: any, idx: number) => {
                          // Determine row color based on movement type and product type
                          let rowColor = '#ffffff';
                          if (item.movementType === 'purchase') {
                            rowColor = '#d1fae5'; // Light green for purchases
                          } else if (item.movementType === 'sale') {
                            rowColor = '#fee2e2'; // Light red for sales
                          } else if (item.productType === 'Broken' || item.productType === '0 Broken' || item.productType === 'Rj Broken') {
                            rowColor = '#E2EFDA'; // Light green for Broken
                          } else if (item.productType === 'Bran') {
                            rowColor = '#FFF2CC'; // Light yellow for Bran
                          } else if (item.productType === 'unpolish' || item.productType === 'Unpolish') {
                            rowColor = '#DEEBF7'; // Light blue for unpolish
                          } else if (item.productType === 'Faram') {
                            rowColor = '#F2F2F2'; // Light gray for Faram
                          }

                          // Format variety name
                          const variety = item.outturn?.allottedVariety || 'Sum25 RNR Raw';

                          // Format packaging info
                          const packagingBrand = (() => {
                            if (item.movementType === 'palti') {
                              // FIXED: Use proper server-provided packaging data
                              const sourcePackaging = item.originalMovement?.source_packaging_brand || item.source_packaging_brand || 'A1';
                              const targetPackaging = item.originalMovement?.target_packaging_brand || item.target_packaging_brand || 'A1';
                              console.log('🔍 DEBUG - Palti packaging in Hamali table:', {
                                id: item.id,
                                sourcePackaging,
                                targetPackaging,
                                originalMovement: item.originalMovement,
                                itemPackaging: item.packaging,
                                'item.source_packaging_brand': item.source_packaging_brand,
                                'item.target_packaging_brand': item.target_packaging_brand
                              });
                              return `${sourcePackaging} → ${targetPackaging}`;
                            }
                            return item.packaging?.brandName || 'White Packet';
                          })();

                          // ENHANCED: Show bag size conversion for palti movements
                          const bagSize = (() => {
                            if (item.movementType === 'palti') {
                              const sourceKg = item.originalMovement?.source_packaging_kg || item.source_packaging_kg || 26;
                              const targetKg = item.originalMovement?.target_packaging_kg || item.target_packaging_kg || 26;
                              return `${sourceKg} → ${targetKg}`;
                            }
                            return `${item.packaging?.allottedKg || 26}kg`;
                          })();

                          // DEBUG: Log hamali status checking for first few items
                          if (idx < 3) {
                            const riceKey = item.isRiceProduction ? item.id : `movement-${item.originalMovement?.id}`;
                            console.log(`🔍 DEBUG - Rice Hamali Status Check (${idx + 1}):`, {
                              itemId: item.id,
                              isRiceProduction: item.isRiceProduction,
                              originalMovementId: item.originalMovement?.id,
                              riceKey,
                              hasRiceHamali: riceHamaliEntries[riceKey]?.length > 0,
                              riceHamaliCount: riceHamaliEntries[riceKey]?.length || 0,
                              allRiceHamaliKeys: Object.keys(riceHamaliEntries),
                              movementType: item.movementType
                            });
                          }

                          // Format From and To fields based on movement type
                          let fromField = '';
                          let toField = '';

                          if (item.movementType === 'purchase') {
                            fromField = item.originalMovement?.fromLocation || item.originalMovement?.from_location || item.originalMovement?.fromlocation || 'Purchase';
                            toField = item.locationCode || 'Stock';
                          } else if (item.movementType === 'sale') {
                            fromField = item.locationCode || 'Stock';
                            toField = item.originalMovement?.toLocation || item.originalMovement?.to_location || item.originalMovement?.tolocation || 'Sale';
                          } else if (item.movementType === 'palti') {
                            fromField = item.locationCode || item.originalMovement?.locationCode || item.fromLocation || 'Source';
                            toField = item.toLocation || item.originalMovement?.toLocation || 'Target';
                          } else {
                            // Production entries
                            fromField = `Outt1-${item.outturn?.code || 'Sum25 RNR Raw'}`;

                            if (item.movementType === 'kunchinittu') {
                              toField = item.locationCode;
                            } else {
                              // Map product types to locations like Excel
                              switch (item.productType) {
                                case 'Bran':
                                  toField = 'Bran Room';
                                  break;
                                case 'Broken':
                                case '0 Broken':
                                case 'Rj Broken':
                                  toField = 'B1';
                                  break;
                                case 'unpolish':
                                case 'Unpolish':
                                  toField = 'U1';
                                  break;
                                case 'Faram':
                                  toField = 'F1';
                                  break;
                                case 'Rj Rice 1':
                                  toField = 'N3';
                                  break;
                                case 'Rj Rice 2':
                                  toField = 'N4';
                                  break;
                                default:
                                  toField = item.locationCode || 'U1';
                              }
                            }
                          }

                          // Remove top border for grouped rows
                          const borderStyle = item._isPartOfGroup && !item._isFirstOfGroup
                            ? 'none'
                            : '1px solid #d1d5db';

                          return (
                            <tr key={item.id} style={{
                              backgroundColor: rowColor,
                              fontSize: '11px',
                              border: '1px solid #d1d5db',
                              borderTop: borderStyle
                            }}>
                              {/* SL cell - only render for first row of group with rowspan */}
                              {item._isFirstOfGroup && (
                                <td rowSpan={item._rowspan} style={{
                                  padding: '3px',
                                  textAlign: 'center',
                                  border: '1px solid #d1d5db',
                                  verticalAlign: 'middle',
                                  fontWeight: 'bold'
                                }}>
                                  {item._slNumber}
                                </td>
                              )}
                              <td style={{ padding: '3px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                                {new Date(item.date).toLocaleDateString('en-GB')}
                              </td>
                              <td style={{
                                padding: '3px',
                                textAlign: 'center',
                                border: '1px solid #d1d5db',
                                fontWeight: item.movementType !== 'production' ? 'bold' : 'normal',
                                color: item.movementType === 'purchase' ? '#059669' : item.movementType === 'sale' ? '#dc2626' : 'inherit'
                              }}>
                                {(() => {
                                  const displayType = item.movementType === 'production' ? 'Production' :
                                    item.movementType === 'purchase' ? 'Purchase' :
                                      item.movementType === 'sale' ? 'Sale' :
                                        item.movementType === 'palti' ? 'Palti' : item.movementType;

                                  console.log('🔍 DEBUG - Movement Type display:', {
                                    id: item.id,
                                    movementType: item.movementType,
                                    displayType
                                  });

                                  return displayType;
                                })()}
                              </td>
                              <td style={{ padding: '3px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                                {item.productType}
                              </td>
                              <td style={{ padding: '3px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                                {variety}
                              </td>
                              <td style={{ padding: '3px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                                {item.bags}
                              </td>
                              <td style={{ padding: '3px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                                {bagSize}
                              </td>
                              <td style={{ padding: '3px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                                {Number(item.quantityQuintals).toFixed(2)}
                              </td>
                              <td style={{ padding: '3px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                                {packagingBrand}
                              </td>
                              <td style={{ padding: '3px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                                {fromField}
                              </td>
                              <td style={{ padding: '3px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                                {toField}
                              </td>
                              <td style={{ padding: '3px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                                {/* Bill Number - Show bill number for Purchase/Sale, empty for Production */}
                                {item.movementType === 'purchase' || item.movementType === 'sale'
                                  ? (item.originalMovement?.bill_number || '-')
                                  : '-'
                                }
                              </td>
                              <td style={{ padding: '3px', textAlign: 'center', border: '1px solid #d1d5db', textTransform: 'uppercase' }}>
                                {/* Lorry Number - Show lorry number for Purchase/Sale, empty for Production */}
                                {item.movementType === 'purchase' || item.movementType === 'sale'
                                  ? (item.originalMovement?.lorry_number || '-')
                                  : '-'
                                }
                              </td>
                              {/* Rice Hamali cell - only render for first row of group with rowspan */}
                              {item._isFirstOfGroup && (
                                <td rowSpan={item._rowspan} style={{ padding: '3px', textAlign: 'center', border: '1px solid #d1d5db', verticalAlign: 'middle' }}>
                                  {/* Rice Hamali Status and Button - For ALL entries (Production + Purchase/Sale/Palti) */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                    {/* Hamali Status Indicators */}
                                    {riceHamaliLoaded && (
                                      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        {/* Check for production entries */}
                                        {item.isRiceProduction && riceHamaliEntries[item.id as string] && riceHamaliEntries[item.id as string].length > 0 && (
                                          <span style={{
                                            background: '#d1fae5',
                                            color: '#059669',
                                            padding: '1px 4px',
                                            borderRadius: '8px',
                                            fontSize: '0.6rem',
                                            fontWeight: '600'
                                          }}>
                                            ✓ RICE ({riceHamaliEntries[item.id as string].length})
                                          </span>
                                        )}
                                        {/* Check for stock movement entries (Purchase/Sale/Palti) */}
                                        {!item.isRiceProduction && riceHamaliEntries[`movement-${item.originalMovement?.id}` as string] && riceHamaliEntries[`movement-${item.originalMovement?.id}` as string].length > 0 && (
                                          <span style={{
                                            background: '#d1fae5',
                                            color: '#059669',
                                            padding: '1px 4px',
                                            borderRadius: '8px',
                                            fontSize: '0.6rem',
                                            fontWeight: '600'
                                          }}>
                                            ✓ RICE ({riceHamaliEntries[`movement-${item.originalMovement?.id}` as string].length})
                                          </span>
                                        )}
                                        {/* Check for other hamali - production */}
                                        {item.isRiceProduction && riceOtherHamaliEntries[item.id] && riceOtherHamaliEntries[item.id].length > 0 && (
                                          <span style={{
                                            background: '#ddd6fe',
                                            color: '#7c3aed',
                                            padding: '1px 4px',
                                            borderRadius: '8px',
                                            fontSize: '0.6rem',
                                            fontWeight: '600'
                                          }}>
                                            ✓ OTHER ({riceOtherHamaliEntries[item.id].length})
                                          </span>
                                        )}
                                        {/* Check for other hamali - stock movements */}
                                        {!item.isRiceProduction && riceOtherHamaliEntries[`movement-${item.originalMovement?.id}`] && riceOtherHamaliEntries[`movement-${item.originalMovement?.id}`].length > 0 && (
                                          <span style={{
                                            background: '#ddd6fe',
                                            color: '#7c3aed',
                                            padding: '1px 4px',
                                            borderRadius: '8px',
                                            fontSize: '0.6rem',
                                            fontWeight: '600'
                                          }}>
                                            ✓ OTHER ({riceOtherHamaliEntries[`movement-${item.originalMovement?.id}`].length})
                                          </span>
                                        )}
                                        {/* NO HAMALI indicator for Rice entries */}
                                        {riceHamaliLoaded && (
                                          (() => {
                                            // Check if this entry has any hamali
                                            const riceKey = item.isRiceProduction ? item.id : `movement-${item.originalMovement?.id}`;
                                            const hasRiceHamali = riceHamaliEntries[riceKey] && riceHamaliEntries[riceKey].length > 0;
                                            const hasOtherHamali = riceOtherHamaliEntries[riceKey] && riceOtherHamaliEntries[riceKey].length > 0;

                                            if (!hasRiceHamali && !hasOtherHamali) {
                                              return (
                                                <span style={{
                                                  background: '#fee2e2',
                                                  color: '#dc2626',
                                                  padding: '1px 4px',
                                                  borderRadius: '8px',
                                                  fontSize: '0.6rem',
                                                  fontWeight: '600'
                                                }}>
                                                  NO HAMALI
                                                </span>
                                              );
                                            }
                                            return null;
                                          })()
                                        )}
                                      </div>
                                    )}

                                    {/* Conditional Rice Hamali Button based on entry type */}
                                    {item.isRiceProduction ? (
                                      /* Production entries - Show Rice Hamali button with full functionality */
                                      <div>
                                        <button
                                          onClick={() => {
                                            if (selectedRiceProductionForHamali?.id === item.id) {
                                              setSelectedRiceProductionForHamali(null);
                                            } else {
                                              setSelectedRiceProductionForHamali(item);
                                            }
                                          }}
                                          style={{
                                            padding: '4px 8px',
                                            fontSize: '0.7rem',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            background: (() => {
                                              if (selectedRiceProductionForHamali?.id === item.id) {
                                                return '#6b7280';
                                              }

                                              // Check hamali for production entries
                                              const hasRiceHamali = item.isRiceProduction
                                                ? riceHamaliEntries[item.id]?.length > 0
                                                : riceHamaliEntries[`movement-${item.originalMovement?.id}`]?.length > 0;
                                              const hasOtherHamali = item.isRiceProduction
                                                ? riceOtherHamaliEntries[item.id]?.length > 0
                                                : riceOtherHamaliEntries[`movement-${item.originalMovement?.id}`]?.length > 0;

                                              if (hasRiceHamali || hasOtherHamali) {
                                                return 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                                              }

                                              return '#10b981';
                                            })(),
                                            color: 'white',
                                            transition: 'all 0.2s ease'
                                          }}
                                          title={(() => {
                                            if (selectedRiceProductionForHamali?.id === item.id) return "Close Form";

                                            // FIXED: Use item.id directly - stock movements already have id in "movement-{id}" format
                                            const riceKey = item.isRiceProduction ? item.id : item.id;
                                            const riceCount = riceHamaliEntries[riceKey]?.length || 0;
                                            const otherCount = riceOtherHamaliEntries[riceKey]?.length || 0;

                                            if (riceCount > 0 || otherCount > 0) {
                                              return `✓ Hamali Added - Rice: ${riceCount}, Other: ${otherCount}`;
                                            }

                                            return "Add Rice Hamali";
                                          })()}
                                        >
                                          {(() => {
                                            if (selectedRiceProductionForHamali?.id === item.id) return '✕';

                                            // Check if hamali exists for this entry
                                            // FIXED: Use item.id directly - stock movements already have id in "movement-{id}" format
                                            const hamaliKey = item.isRiceProduction ? item.id : item.id;
                                            const hasRiceHamali = riceHamaliEntries[hamaliKey]?.length > 0;
                                            const hasOtherHamali = riceOtherHamaliEntries[hamaliKey]?.length > 0;

                                            return (hasRiceHamali || hasOtherHamali) ?
                                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>✓</span> :
                                              '🍚';
                                          })()}
                                        </button>
                                      </div>
                                    ) : (
                                      /* Purchase/Sale entries - Show ONLY Rice Hamali button (no badges) */
                                      <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                      }}>
                                        {/* Rice Hamali Button - Same as Production, no status badges */}
                                        <button
                                          onClick={() => {
                                            if (selectedRiceProductionForHamali?.id === item.id) {
                                              setSelectedRiceProductionForHamali(null);
                                            } else {
                                              // Aggregate data for grouped entries
                                              if (item._isPartOfGroup && item.movementType === 'sale' && item.originalMovement?.bill_number) {
                                                const billKey = `${item.originalMovement.bill_number}_${item.date}`;
                                                const groupItems = riceStockData.filter((d: any) =>
                                                  d.movementType === 'sale' &&
                                                  d.originalMovement?.bill_number &&
                                                  `${d.originalMovement.bill_number}_${d.date}` === billKey
                                                );
                                                const totalBags = groupItems.reduce((sum: number, d: any) => sum + (d.bags || 0), 0);
                                                const totalQty = groupItems.reduce((sum: number, d: any) => sum + (parseFloat(d.quantityQuintals) || 0), 0);
                                                setSelectedRiceProductionForHamali({
                                                  ...item,
                                                  bags: totalBags,
                                                  quantityQuintals: totalQty,
                                                  _groupedItems: groupItems
                                                });
                                              } else if (item._isPartOfGroup && item.movementType === 'palti') {
                                                const from = item.originalMovement?.from_location || item.originalMovement?.fromLocation || item.fromLocation || '';
                                                const groupKey = `palti_${from}_${item.date}`;
                                                const groupItems = riceStockData.filter((d: any) => {
                                                  const dFrom = d.originalMovement?.from_location || d.originalMovement?.fromLocation || d.fromLocation || '';
                                                  return d.movementType === 'palti' &&
                                                    `palti_${dFrom}_${d.date}` === groupKey;
                                                });
                                                const totalBags = groupItems.reduce((sum: number, d: any) => sum + (d.bags || 0), 0);
                                                const totalQty = groupItems.reduce((sum: number, d: any) => sum + (parseFloat(d.quantityQuintals) || 0), 0);
                                                setSelectedRiceProductionForHamali({
                                                  ...item,
                                                  bags: totalBags,
                                                  quantityQuintals: totalQty,
                                                  _groupedItems: groupItems
                                                });
                                              } else {
                                                setSelectedRiceProductionForHamali(item);
                                              }
                                            }
                                          }}

                                          style={{
                                            padding: '4px 8px',
                                            fontSize: '0.7rem',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            background: (() => {
                                              if (selectedRiceProductionForHamali?.id === item.id) {
                                                return '#6b7280';
                                              }

                                              // FIXED: Check hamali using item.id directly - already in correct format
                                              const hasRiceHamali = riceHamaliEntries[item.id]?.length > 0;
                                              const hasOtherHamali = riceOtherHamaliEntries[item.id]?.length > 0;

                                              if (hasRiceHamali || hasOtherHamali) {
                                                return 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                                              }

                                              return '#10b981';
                                            })(),
                                            color: 'white',
                                            transition: 'all 0.2s ease'
                                          }}
                                          title={(() => {
                                            if (selectedRiceProductionForHamali?.id === item.id) return "Close Form";

                                            // FIXED: Check hamali counts using item.id directly
                                            const riceCount = riceHamaliEntries[item.id]?.length || 0;
                                            const otherCount = riceOtherHamaliEntries[item.id]?.length || 0;

                                            if (riceCount > 0 || otherCount > 0) {
                                              return `✓ Hamali Added - Rice: ${riceCount}, Other: ${otherCount}`;
                                            }

                                            return "Add Rice Hamali";
                                          })()}
                                        >
                                          {(() => {
                                            if (selectedRiceProductionForHamali?.id === item.id) return '✕';

                                            // FIXED: Check hamali using item.id directly - already in correct format
                                            const hasRiceHamali = riceHamaliEntries[item.id]?.length > 0;
                                            const hasOtherHamali = riceOtherHamaliEntries[item.id]?.length > 0;

                                            return (hasRiceHamali || hasOtherHamali) ?
                                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>✓</span> :
                                              '🍚';
                                          })()}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </ExcelTable>
                </TableContainer>
              )}
            </RecordsContainer>
          )}

          {/* Rice Hamali Form */}
          {selectedRiceProductionForHamali && (
            <InlineRiceHamaliForm
              riceProduction={selectedRiceProductionForHamali}
              onClose={() => setSelectedRiceProductionForHamali(null)}
              onSave={() => {
                // Task 2.5: Enhanced immediate status refresh for rice hamali
                console.log('🔄 Rice hamali saved - refreshing status immediately');

                // FIXED: Clear all cache first to ensure fresh data is fetched
                hamaliStatusManager.clearCache();
                console.log('🧹 Cache cleared for immediate status refresh');

                // Determine the entity ID for refresh
                // FIXED: Use item.id directly - stock movements already have id in "movement-{id}" format
                const entityId = selectedRiceProductionForHamali.id;

                // Use the new immediate refresh method
                hamaliStatusManager.refreshStatusImmediate('rice', entityId, {
                  date: hamaliDate
                }).then(() => {
                  // Refresh the display data
                  if (riceStockData.length > 0) {
                    const productionIds = riceStockData
                      .filter((item: any) => item.isRiceProduction)
                      .map((item: any) => item.id);
                    // FIXED: Extract numeric IDs from "movement-123" format like fetchRiceStock does
                    const stockMovementIds = riceStockData
                      .filter((item: any) => !item.isRiceProduction)
                      .map((item: any) => parseInt(item.id.toString().replace('movement-', '')))
                      .filter((id: number) => !isNaN(id));

                    if (productionIds.length > 0 || stockMovementIds.length > 0) {
                      fetchRiceHamaliEntries(productionIds, stockMovementIds);
                    }
                  }
                }).catch(error => {
                  console.error('Error refreshing rice hamali status:', error);
                  // Fallback to regular refresh
                  if (riceStockData.length > 0) {
                    const productionIds = riceStockData
                      .filter((item: any) => item.isRiceProduction)
                      .map((item: any) => item.id);
                    // FIXED: Extract numeric IDs from "movement-123" format
                    const stockMovementIds = riceStockData
                      .filter((item: any) => !item.isRiceProduction)
                      .map((item: any) => parseInt(item.id.toString().replace('movement-', '')))
                      .filter((id: number) => !isNaN(id));

                    if (productionIds.length > 0 || stockMovementIds.length > 0) {
                      fetchRiceHamaliEntries(productionIds, stockMovementIds);
                    }
                  }
                });


                setSelectedRiceProductionForHamali(null);
                toast.success('✅ Rice Hamali added successfully! Right mark should appear immediately.');
              }}
            />
          )}
        </>
      )}
    </Container>
  );
};

export default Hamali;
