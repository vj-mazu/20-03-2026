import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import PaginationControls from '../components/PaginationControls';
import { generateKunchinintuLedgerPDF, generateKunchinintuPortraitPDF } from '../utils/ledgerPdfGenerator';

// Format cutting string from "12X5" to "12 x 5"
const formatCutting = (cutting: string | null | undefined): string => {
  if (!cutting || cutting === '-') return '-';
  const str = String(cutting).trim();
  if (str.includes('X') || str.includes('x')) {
    const parts = str.split(/[Xx]/);
    if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
      return `${parts[0].trim()} x ${parts[1].trim()}`;
    }
  }
  return str;
};

const Container = styled.div`
  animation: fadeIn 0.5s ease-in;
`;

const Title = styled.h1`
  color: #ffffff;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
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

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  background: white;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #667eea;
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  &.success {
    background: #10b981;
    color: white;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const LedgerContainer = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
`;

const LedgerHeader = styled.div`
  background: #f8fafc;
  padding: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
`;

const LedgerInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;

  .info-item {
    font-weight: 600;
    color: #374151;
  }
`;

const SectionTitle = styled.h3`
  background: #4a90e2;
  color: white;
  padding: 0.75rem 1rem;
  margin: 0;
  font-size: 1.1rem;
  font-weight: bold;
`;

const ExactFormatTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Calibri', 'Arial', sans-serif;
  font-size: 10pt;
  margin-bottom: 1rem;

  th {
    background: #4a90e2;
    color: white;
    padding: 6px 8px;
    text-align: center;
    font-weight: bold;
    border: 1px solid #ddd;
    font-size: 9pt;
  }

  td {
    padding: 4px 6px;
    text-align: center;
    border: 1px solid #ddd;
    font-size: 9pt;
  }

  tbody tr:nth-child(even) {
    background: #f8f9fa;
  }

  .total-row {
    background: #000000 !important;
    color: white;
    font-weight: bold;
  }

  .section-header {
    background: #d4edda;
    color: #000;
    font-weight: bold;
    text-align: left;
    padding: 8px;
  }

  .production-link {
    color: #667eea;
    cursor: pointer;
    text-decoration: underline;
    
    &:hover {
      color: #764ba2;
      font-weight: bold;
    }
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Calibri', 'Arial', sans-serif;
  font-size: 11pt;

  th {
    background: #4a90e2;
    color: white;
    padding: 8px;
    text-align: center;
    font-weight: bold;
    border: 1px solid #ddd;
  }

  td {
    padding: 6px 8px;
    text-align: center;
    border: 1px solid #ddd;
    font-size: 10pt;
  }

  tbody tr:nth-child(even) {
    background: #f8f9fa;
  }

  tbody tr:hover {
    background: #e8f4f8;
  }

  .total-row {
    background: #000000 !important;
    color: white;
    font-weight: bold;
  }
`;

const SummarySection = styled.div`
  background: #f8fafc;
  padding: 1.5rem;
  border-top: 2px solid #e5e7eb;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
`;

const SummaryCard = styled.div`
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  text-align: center;

  .label {
    font-weight: 600;
    color: #6b7280;
    font-size: 0.9rem;
  }

  .value {
    font-size: 1.2rem;
    font-weight: bold;
    color: #374151;
    margin-top: 0.5rem;
  }

  &.inward {
    border-color: #10b981;
    .value { color: #10b981; }
  }

  &.outward {
    border-color: #ef4444;
    .value { color: #ef4444; }
  }

  &.remaining {
    border-color: #f59e0b;
    .value { color: #f59e0b; }
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;
`;

interface Kunchinittu {
  id: number;
  name: string;
  code: string;
  isClosed?: boolean;
  closedAt?: string;
  warehouse: {
    name: string;
    code: string;
  };
  variety?: {
    name: string;
    code: string;
  };
}

interface Warehouse {
  id: number;
  name: string;
  code: string;
}

interface Transaction {
  id: number;
  date: string;
  movementType: string;
  broker?: string;
  variety?: string;
  bags?: number;
  moisture?: number;
  cutting?: string;
  wbNo: string;
  netWeight: number;
  lorryNumber: string;
  fromLocation?: string;
  toKunchinittu?: { name: string; code: string };
  toWarehouse?: { name: string; code: string };
  fromKunchinittu?: { name: string; code: string };
  fromWarehouse?: { name: string; code: string };
  toWarehouseShift?: { name: string; code: string };
  outturn?: { code: string; allottedVariety: string };
}

interface BifurcatedEntry {
  date: string;
  variety: string;
  bags: number;
  netWeight: number;
  movementType: string;
  broker?: string;
  from: string;
  to: string;
  transactionCount: number;
  outturnCode?: string;
}

interface LedgerData {
  kunchinittu: Kunchinittu;
  transactions?: {
    inward: Transaction[];
    outward: Transaction[];
  };
  bifurcation?: {
    inward: BifurcatedEntry[];
    outward: BifurcatedEntry[];
  };
  totals: {
    inward: { bags: number; netWeight: number };
    outward: { bags: number; netWeight: number };
    remaining: { bags: number; netWeight: number };
  };
}

const KunchinintuLedger: React.FC = () => {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [allKunchinittus, setAllKunchinittus] = useState<Kunchinittu[]>([]); // Store all
  const [kunchinittus, setKunchinittus] = useState<Kunchinittu[]>([]); // Filtered list
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedKunchinittu, setSelectedKunchinittu] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [multipleLedgerData, setMultipleLedgerData] = useState<LedgerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'detailed' | 'bifurcated'>('detailed');
  const [groupBy, setGroupBy] = useState<'kunchinittu' | 'warehouse'>('kunchinittu');
  const [showLooseModal, setShowLooseModal] = useState(false);
  const [selectedKunchinintuForLoose, setSelectedKunchinintuForLoose] = useState<{
    id: number;
    code: string;
    warehouseName: string;
  } | null>(null);
  const [looseFormData, setLooseFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bags: ''
  });
  const [savingLoose, setSavingLoose] = useState(false);
  const [closingKunchinittu, setClosingKunchinittu] = useState<number | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState<{ id: number; code: string } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 250;

  // Month-wise filter state for PDF export
  const [selectedMonth, setSelectedMonth] = useState<string>('');


  useEffect(() => {
    fetchKunchinittusAndWarehouses();
  }, []);

  // Handle URL parameter for kunchinittu code using native URLSearchParams
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const codeParam = urlParams.get('code');
      console.log('🔍 URL code parameter:', codeParam);
      console.log('🔍 All kunchinittus:', allKunchinittus);

      if (codeParam && allKunchinittus.length > 0) {
        // Find the kunchinittu by code
        const kunchinittu = allKunchinittus.find(kn => kn.code === codeParam);
        console.log('🔍 Found kunchinittu:', kunchinittu);

        if (kunchinittu && kunchinittu.warehouse) {
          console.log('✅ Setting warehouse:', kunchinittu.warehouse.code);
          console.log('✅ Setting kunchinittu:', kunchinittu.id);

          // Set the warehouse first
          setSelectedWarehouse(kunchinittu.warehouse.code);
          // Then set the kunchinittu (will be set after warehouse filter runs)
          setTimeout(() => {
            setSelectedKunchinittu(kunchinittu.id.toString());
          }, 100);
        }
      }
    } catch (error) {
      console.error('❌ Error handling URL parameter:', error);
    }
  }, [allKunchinittus]);

  useEffect(() => {
    if (selectedWarehouse) {
      filterKunchinintusByWarehouse();
    } else {
      setKunchinittus([]);
      setSelectedKunchinittu('');
    }
  }, [selectedWarehouse]);

  // Refetch ledger data when currentPage changes
  useEffect(() => {
    if (multipleLedgerData.length > 0 && kunchinittus.length > 0) {
      fetchLedger();
    }
  }, [currentPage]);

  const fetchKunchinittusAndWarehouses = async () => {
    try {
      const response = await axios.get('/ledger/kunchinittus');
      const fetchedKunchinittus = (response.data as { kunchinittus: Kunchinittu[] }).kunchinittus;

      // Store all kunchinittus
      setAllKunchinittus(fetchedKunchinittus);

      // Extract unique warehouses from kunchinittus
      const warehouseMap = new Map<string, Warehouse>();
      fetchedKunchinittus.forEach(kn => {
        if (kn.warehouse && kn.warehouse.name && kn.warehouse.code) {
          const key = kn.warehouse.code;
          if (!warehouseMap.has(key)) {
            warehouseMap.set(key, {
              id: fetchedKunchinittus.indexOf(kn), // Use index as temp ID
              name: kn.warehouse.name,
              code: kn.warehouse.code
            });
          }
        }
      });

      const uniqueWarehouses = Array.from(warehouseMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setWarehouses(uniqueWarehouses);
    } catch (error) {
      console.error('Error fetching kunchinittus:', error);
      toast.error('Failed to fetch data');
    }
  };

  const filterKunchinintusByWarehouse = () => {
    // Find selected warehouse details
    const selectedWarehouseObj = warehouses.find(w =>
      w.code === selectedWarehouse
    );

    if (!selectedWarehouseObj) {
      setKunchinittus([]);
      return;
    }

    // Filter kunchinittus by selected warehouse code
    const filtered = allKunchinittus.filter(kn =>
      kn.warehouse?.code === selectedWarehouseObj.code
    );

    setKunchinittus(filtered);
    setSelectedKunchinittu(''); // Reset kunchinittu selection

    if (filtered.length === 0) {
      toast.info(`No kunchinittus found in ${selectedWarehouseObj.name}`);
    }
  };

  const fetchLedger = async () => {
    if (!selectedWarehouse) {
      toast.error('Please select a Warehouse');
      return;
    }

    if (kunchinittus.length === 0) {
      toast.error('No kunchinittus found in selected warehouse');
      return;
    }

    // Helper function to convert DD-MM-YYYY to YYYY-MM-DD
    const convertDateFormat = (dateStr: string): string => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return dateStr;
    };

    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: recordsPerPage
      };
      if (dateFrom) params.dateFrom = convertDateFormat(dateFrom);
      if (dateTo) params.dateTo = convertDateFormat(dateTo);

      // Fetch data for ALL kunchinittus in the warehouse with pagination
      const ledgerPromises = kunchinittus.map(async (kn) => {
        const endpoint = viewMode === 'bifurcated'
          ? `/ledger/paddy-stock/${kn.id}`
          : `/ledger/kunchinittu/${kn.id}`;

        const response = await axios.get(endpoint, { params });
        return response.data as LedgerData;
      });

      const allLedgerData = await Promise.all(ledgerPromises);
      setMultipleLedgerData(allLedgerData);

      // Show pagination info if available and update state
      const firstLedgerWithPagination = allLedgerData.find((ld: any) => ld.pagination);
      if (firstLedgerWithPagination && (firstLedgerWithPagination as any).pagination) {
        const pag = (firstLedgerWithPagination as any).pagination;
        setTotalPages(pag.totalPages || 1);
        setTotalRecords(pag.totalRecords || 0);
        toast.success(`Page ${pag.page}/${pag.totalPages}: Loaded ${kunchinittus.length} kunchinittus (${pag.totalRecords.toLocaleString()} total records)`);
      } else {
        setTotalPages(1);
        setTotalRecords(0);
        toast.success(`Loaded data for ${kunchinittus.length} kunchinittus`);
      }
    } catch (error) {
      console.error('Error fetching ledger:', error);
      toast.error('Failed to fetch ledger data');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!ledgerData) {
      toast.error('Please view ledger first');
      return;
    }

    console.log('📊 Export PDF - ledgerData:', ledgerData);

    try {
      // Safely extract data with fallbacks for all properties
      const kunchinittu = ledgerData.kunchinittu || { id: 0, code: 'Unknown' };
      const warehouseData = (kunchinittu as any).warehouse || { name: '-', code: '-' };
      const varietyData = (kunchinittu as any).variety?.name || 'SUM25 RNR';

      // Handle both 'totals' structure
      const totals = ledgerData.totals || {
        inward: { bags: 0, netWeight: 0 },
        outward: { bags: 0, netWeight: 0 },
        remaining: { bags: 0, netWeight: 0 }
      };

      // Get transactions - try both 'transactions' and direct arrays
      const transactions = ledgerData.transactions || { inward: [], outward: [] };
      const inwardTrans = transactions.inward || [];
      const outwardTrans = transactions.outward || [];

      console.log('📊 PDF Data Ready:', {
        kunchinittu: kunchinittu.code,
        warehouse: warehouseData.name,
        variety: varietyData,
        totals,
        inwardCount: inwardTrans.length,
        outwardCount: outwardTrans.length
      });

      // Prepare PDF data
      const pdfData = {
        kunchinittu: {
          id: kunchinittu.id,
          code: kunchinittu.code,
          name: kunchinittu.name || kunchinittu.code
        },
        warehouse: {
          name: warehouseData.name || '-',
          code: warehouseData.code || '-'
        },
        variety: varietyData,
        averageRate: 0,
        summary: {
          inward: { bags: totals.inward?.bags || 0, netWeight: totals.inward?.netWeight || 0 },
          outward: { bags: totals.outward?.bags || 0, netWeight: totals.outward?.netWeight || 0 },
          remaining: { bags: totals.remaining?.bags || 0, netWeight: totals.remaining?.netWeight || 0 }
        },
        inwardRecords: inwardTrans.map((r: any, idx: number) => ({
          id: r.id || idx,
          slNo: (idx + 1).toString(),
          date: r.date,
          movementType: r.movementType || 'Purchase',
          broker: r.broker || '-',
          variety: r.variety || varietyData,
          bags: r.bags || 0,
          moisture: r.moisture,
          cutting: r.cutting,
          wbNo: r.wbNo || '-',
          netWeight: r.netWeight || 0,
          lorryNumber: r.lorryNumber || '-',
          fromLocation: r.fromLocation || r.fromKunchinittu?.code || '-',
          toLocation: r.toLocation || r.toKunchinittu?.code || kunchinittu.code || '-'
        })),
        outwardRecords: outwardTrans.map((r: any, idx: number) => ({
          id: r.id || idx,
          slNo: (idx + 1).toString(),
          date: r.date,
          movementType: r.movementType || 'Production-Shifting',
          broker: r.broker || '-',
          variety: r.variety || varietyData,
          bags: r.bags || 0,
          moisture: r.moisture,
          cutting: r.cutting,
          wbNo: r.wbNo || '-',
          netWeight: r.netWeight || 0,
          lorryNumber: r.lorryNumber || '-',
          fromLocation: r.fromLocation || kunchinittu.code || '-',
          toLocation: r.toLocation || r.outturn?.code || '-'
        }))
      };

      console.log('📊 Calling generateKunchinintuLedgerPDF...');

      // Generate PDF
      generateKunchinintuLedgerPDF(pdfData as any, { from: dateFrom, to: dateTo });
      toast.success('PDF exported successfully!');
    } catch (error: any) {
      console.error('❌ Error exporting PDF:', error);
      console.error('Stack:', error.stack);
      toast.error(`PDF export failed: ${error.message || 'Unknown error'}`);
    }
  };








  const handleAddLoose = (kunchinintuId: number, kunchinintuCode: string, warehouseName: string) => {
    if (showLooseModal) {
      // Close if already open
      setShowLooseModal(false);
      setSelectedKunchinintuForLoose(null);
    } else {
      // Open inline form
      setSelectedKunchinintuForLoose({
        id: kunchinintuId,
        code: kunchinintuCode,
        warehouseName
      });
      setShowLooseModal(true);
    }
  };

  const handleLooseSuccess = () => {
    // Refresh the ledger data
    fetchLedger();
  };

  const handleLooseInputChange = (field: string, value: string) => {
    setLooseFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveLoose = async () => {
    if (!looseFormData.date || !looseFormData.bags || parseInt(looseFormData.bags) <= 0) {
      toast.error('Please enter valid date and number of bags');
      return;
    }

    if (!selectedKunchinintuForLoose) return;

    try {
      setSavingLoose(true);
      await axios.post('/arrivals/loose', {
        kunchinintuId: selectedKunchinintuForLoose.id,
        date: looseFormData.date,
        bags: parseInt(looseFormData.bags)
      });

      toast.success('Loose bags entry created successfully');
      setShowLooseModal(false);
      setSelectedKunchinintuForLoose(null);
      setLooseFormData({
        date: new Date().toISOString().split('T')[0],
        bags: ''
      });
      fetchLedger();
    } catch (error: any) {
      console.error('Error creating loose bags entry:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create loose bags entry';
      toast.error(errorMessage);
    } finally {
      setSavingLoose(false);
    }
  };

  // Show inline close confirmation
  const showCloseConfirmation = (kunchinittuId: number, kunchinittuCode: string) => {
    setShowCloseConfirm({ id: kunchinittuId, code: kunchinittuCode });
  };

  // Cancel confirmation
  const cancelCloseConfirmation = () => {
    setShowCloseConfirm(null);
  };

  // Confirm close Kunchinittu (PERMANENT - cannot be reopened)
  const confirmCloseKunchinittu = async () => {
    if (!showCloseConfirm) return;

    try {
      setClosingKunchinittu(showCloseConfirm.id);
      await axios.post(`/ledger/kunchinittu/${showCloseConfirm.id}/close`);
      toast.success(`Kunchinittu ${showCloseConfirm.code} has been closed PERMANENTLY`);
      setShowCloseConfirm(null);
      fetchKunchinittusAndWarehouses();
      fetchLedger();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.response?.data?.error || 'Failed to close kunchinittu');
    } finally {
      setClosingKunchinittu(null);
    }
  };

  // Download PDF for a specific Kunchinittu (Portrait Mode)
  const downloadKunchinintuPDF = (ledgerDataItem: LedgerData) => {
    try {
      const kunchi = ledgerDataItem.kunchinittu;
      const transactions = ledgerDataItem.transactions || { inward: [], outward: [] };
      const totals = ledgerDataItem.totals || {
        inward: { bags: 0, netWeight: 0 },
        outward: { bags: 0, netWeight: 0 },
        remaining: { bags: 0, netWeight: 0 }
      };

      const pdfData = {
        kunchinittu: {
          id: kunchi.id,
          code: kunchi.code,
          name: kunchi.name,
          warehouse: kunchi.warehouse,
          variety: kunchi.variety,
          averageRate: (kunchi as any).averageRate || 0
        },
        warehouse: kunchi.warehouse,
        variety: kunchi.variety?.name || 'N/A',
        averageRate: (kunchi as any).averageRate || 0,
        summary: totals,
        totals: totals,
        inwardRecords: transactions.inward.map((r, idx) => ({
          id: r.id,
          slNo: (idx + 1).toString(),
          date: r.date,
          movementType: r.movementType,
          broker: r.broker || '-',
          variety: r.variety || kunchi.variety?.name || '-',
          bags: r.bags || 0,
          moisture: r.moisture,
          cutting: r.cutting,
          wbNo: r.wbNo || '-',
          netWeight: r.netWeight || 0,
          lorryNumber: r.lorryNumber || '-',
          fromLocation: r.fromLocation || r.fromKunchinittu?.code || '-',
          toLocation: r.toKunchinittu?.code || kunchi.code || '-',
          fromKunchinittu: r.fromKunchinittu,
          toKunchinittu: r.toKunchinittu
        })),
        outwardRecords: transactions.outward.map((r, idx) => ({
          id: r.id,
          slNo: (idx + 1).toString(),
          date: r.date,
          movementType: r.movementType,
          broker: r.broker || '-',
          variety: r.variety || kunchi.variety?.name || '-',
          bags: r.bags || 0,
          moisture: r.moisture,
          cutting: r.cutting,
          wbNo: r.wbNo || '-',
          netWeight: r.netWeight || 0,
          lorryNumber: r.lorryNumber || '-',
          fromLocation: kunchi.code || '-',
          toLocation: r.outturn?.code || r.toWarehouseShift?.code || '-',
          outturn: r.outturn
        })),
        transactions: transactions
      };

      generateKunchinintuPortraitPDF(pdfData, { from: dateFrom, to: dateTo });
      toast.success(`PDF downloaded for ${kunchi.code}`);
    } catch (error: any) {
      console.error('❌ PDF Download error:', error);
      toast.error(`Failed to generate PDF: ${error.message}`);
    }
  };

  // Helper function to get warehouse name from transaction
  const getWarehouseName = (record: Transaction, isInward: boolean): string => {
    if (isInward) {
      return record.toWarehouse?.name || ledgerData?.kunchinittu.warehouse.name || 'N/A';
    } else {
      return record.fromWarehouse?.name || ledgerData?.kunchinittu.warehouse.name || 'N/A';
    }
  };

  // Group transactions by warehouse
  const groupByWarehouse = (transactions: Transaction[], isInward: boolean) => {
    const grouped: { [warehouse: string]: Transaction[] } = {};

    transactions.forEach(transaction => {
      const warehouseName = getWarehouseName(transaction, isInward);
      if (!grouped[warehouseName]) {
        grouped[warehouseName] = [];
      }
      grouped[warehouseName].push(transaction);
    });

    return grouped;
  };

  // Calculate cutting total from cutting strings like "23X10"
  const calculateCuttingTotal = (transactions: Transaction[]) => {
    return transactions.reduce((sum, record) => {
      const cutting = record.cutting;
      if (!cutting || cutting === '-') return sum;

      // Check if it's multiplication format (e.g., "23X10")
      if (cutting.includes('X') || cutting.includes('x')) {
        const parts = cutting.split(/[Xx]/);
        if (parts.length === 2) {
          const num1 = parseInt(parts[0]);
          const num2 = parseInt(parts[1]);
          if (!isNaN(num1) && !isNaN(num2)) {
            return sum + (num1 * num2);
          }
        }
      }

      // Otherwise try to parse as number
      const num = parseInt(cutting);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  };

  return (
    <Container>
      <Title>📋 Kunchinittu Ledger</Title>

      <FilterSection>
        <FilterRow>
          <FormGroup>
            <Label>🏭 Select Warehouse *</Label>
            <Select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name} ({w.code})
                </option>
              ))}
            </Select>
          </FormGroup>

          {/* Month-wise Filter Dropdown */}
          <FormGroup>
            <Label>📅 Quick Month Filter</Label>
            <Select
              value={selectedMonth}
              onChange={(e) => {
                const monthValue = e.target.value;
                setSelectedMonth(monthValue);

                if (monthValue) {
                  // Parse YYYY-MM and calculate first/last day
                  const [year, month] = monthValue.split('-').map(Number);
                  const firstDay = new Date(year, month - 1, 1);
                  const lastDay = new Date(year, month, 0);

                  // Format as DD-MM-YYYY for the existing date inputs
                  const formatDate = (d: Date) => {
                    const dd = String(d.getDate()).padStart(2, '0');
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const yyyy = d.getFullYear();
                    return `${dd}-${mm}-${yyyy}`;
                  };

                  setDateFrom(formatDate(firstDay));
                  setDateTo(formatDate(lastDay));
                } else {
                  // Clear dates when month is cleared
                  setDateFrom('');
                  setDateTo('');
                }
              }}
            >
              <option value="">Select Month...</option>
              {/* Generate last 12 months options */}
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Date From</Label>
            <Input
              type="text"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="DD-MM-YYYY"
            />
          </FormGroup>

          <FormGroup>
            <Label>Date To</Label>
            <Input
              type="text"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="DD-MM-YYYY"
            />
          </FormGroup>

          <Button className="primary" onClick={fetchLedger} disabled={loading}>
            {loading ? 'Loading...' : '🔍 View Ledger'}
          </Button>

          <Button className="success" onClick={exportPDF} disabled={!ledgerData}>
            📑 Export PDF
          </Button>
        </FilterRow>
      </FilterSection>


      {multipleLedgerData.length > 0 ? (
        <>
          {multipleLedgerData.map((ledgerData, index) => {
            // Skip if kunchinittu is null (error case)
            if (!ledgerData.kunchinittu) {
              return null;
            }

            return (
              <LedgerContainer key={index} style={{ marginBottom: '2rem' }}>
                {/* Simple Header Info - Text Only */}
                <div style={{
                  background: 'white',
                  padding: '1rem',
                  marginBottom: '1rem',
                  fontFamily: 'Calibri, Arial, sans-serif',
                  fontSize: '11pt',
                  borderBottom: '2px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <table style={{ borderCollapse: 'collapse', flex: 1 }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px 8px', fontWeight: 'bold', width: '200px' }}>Kanchi Nittu Code:</td>
                        <td style={{ padding: '4px 8px' }}>
                          {ledgerData.kunchinittu.code}
                          {(ledgerData.kunchinittu as any).isClosed && (
                            <span style={{
                              background: '#fef2f2',
                              color: '#dc2626',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              marginLeft: '0.5rem',
                              border: '1px solid #dc2626'
                            }}>
                              🔒 CLOSED
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '4px 8px' }} colSpan={8}></td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Alloted Warehouse:</td>
                        <td style={{ padding: '4px 8px' }}>{ledgerData.kunchinittu.warehouse.name}</td>
                        <td style={{ padding: '4px 8px' }} colSpan={8}></td>
                      </tr>

                      <tr>
                        <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Alloted Variety:</td>
                        <td style={{ padding: '4px 8px' }}>{ledgerData.kunchinittu.variety?.name || 'N/A'}</td>
                        <td style={{ padding: '4px 8px' }} colSpan={8}></td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Average Rate:</td>
                        <td style={{ padding: '4px 8px', color: '#10b981', fontWeight: 'bold' }}>
                          {(ledgerData.kunchinittu as any).averageRate ? `₹${Number((ledgerData.kunchinittu as any).averageRate).toFixed(2)}/Q` : 'Not calculated'}
                        </td>
                        <td style={{ padding: '4px 8px' }} colSpan={8}></td>
                      </tr>
                    </tbody>
                  </table>
                  {(user?.role === 'manager' || user?.role === 'admin') && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                      {/* PDF Download Button - Always visible */}
                      <Button
                        className="primary"
                        onClick={() => downloadKunchinintuPDF(ledgerData)}
                        style={{ background: '#6366f1', whiteSpace: 'nowrap' }}
                      >
                        📄 PDF
                      </Button>
                      {/* Only show Add Loose when NOT closed */}
                      {!(ledgerData.kunchinittu as any).isClosed && (
                        <Button
                          className="success"
                          onClick={() => handleAddLoose(
                            ledgerData.kunchinittu.id,
                            ledgerData.kunchinittu.code,
                            ledgerData.kunchinittu.warehouse.name
                          )}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {showLooseModal && selectedKunchinintuForLoose?.id === ledgerData.kunchinittu.id ? 'Close' : '+ Add Loose'}
                        </Button>
                      )}
                      {/* Close/Reopen Kunchinittu Button */}
                      {(ledgerData.kunchinittu as any).isClosed ? (
                        // Show CLOSED status - no reopen option
                        null
                      ) : (
                        // Close button - Admin only (PERMANENT)
                        user?.role === 'admin' && (
                          <Button
                            className="primary"
                            onClick={() => showCloseConfirmation(
                              ledgerData.kunchinittu.id,
                              ledgerData.kunchinittu.code
                            )}
                            disabled={closingKunchinittu === ledgerData.kunchinittu.id || showCloseConfirm?.id === ledgerData.kunchinittu.id}
                            style={{ background: '#ef4444', whiteSpace: 'nowrap' }}
                          >
                            {closingKunchinittu === ledgerData.kunchinittu.id ? 'Closing...' : '🔒 Close'}
                          </Button>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Inline Close Confirmation Box (PERMANENT - No Reopen) */}
                {showCloseConfirm?.id === ledgerData.kunchinittu.id && (
                  <div style={{
                    background: '#fef2f2',
                    border: '2px solid #dc2626',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    marginTop: '0.5rem'
                  }}>
                    <h3 style={{
                      margin: '0 0 0.75rem 0',
                      color: '#dc2626',
                      fontSize: '1rem'
                    }}>
                      ⚠️ PERMANENTLY Close Kunchinittu?
                    </h3>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#374151' }}>
                      Are you sure you want to <strong>permanently close</strong> <strong>{showCloseConfirm.code}</strong>?
                    </p>
                    <ul style={{ margin: '0 0 1rem 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#6b7280' }}>
                      <li><strong style={{ color: '#dc2626' }}>This action CANNOT be undone</strong></li>
                      <li>It will NOT appear in dropdown selections for new entries</li>
                      <li>No new arrivals or loose can be added</li>
                      <li>You can still view the ledger history</li>
                    </ul>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Button
                        className="secondary"
                        onClick={cancelCloseConfirmation}
                        disabled={closingKunchinittu === ledgerData.kunchinittu.id}
                        style={{ background: '#e5e7eb', color: '#374151' }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="primary"
                        onClick={confirmCloseKunchinittu}
                        disabled={closingKunchinittu === ledgerData.kunchinittu.id}
                        style={{ background: '#dc2626', whiteSpace: 'nowrap' }}
                      >
                        {closingKunchinittu === ledgerData.kunchinittu.id ? 'Closing...' : 'Yes, Close Permanently'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Inline Loose Form */}
                {showLooseModal && selectedKunchinintuForLoose?.id === ledgerData.kunchinittu.id && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '2px solid #10b981',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#065f46' }}>📊 Add Loose Bags</h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                          Kunchinittu
                        </label>
                        <input
                          type="text"
                          value={selectedKunchinintuForLoose.code}
                          disabled
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            width: '100%',
                            background: '#f3f4f6'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                          Date *
                        </label>
                        <input
                          type="date"
                          value={looseFormData.date}
                          onChange={(e) => handleLooseInputChange('date', e.target.value)}
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            width: '100%'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                          Bags *
                        </label>
                        <input
                          type="number"
                          value={looseFormData.bags}
                          onChange={(e) => handleLooseInputChange('bags', e.target.value)}
                          placeholder="Enter bags"
                          min="1"
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            width: '100%'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Button
                        className="secondary"
                        onClick={() => {
                          setShowLooseModal(false);
                          setSelectedKunchinintuForLoose(null);
                          setLooseFormData({ date: new Date().toISOString().split('T')[0], bags: '' });
                        }}
                        disabled={savingLoose}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="success"
                        onClick={handleSaveLoose}
                        disabled={savingLoose}
                      >
                        {savingLoose ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                )
                }

                {/* Simple Summary Table */}
                <div style={{
                  background: 'white',
                  padding: '1rem',
                  marginBottom: '1rem',
                  fontFamily: 'Calibri, Arial, sans-serif',
                  fontSize: '11pt'
                }}>
                  <table style={{ borderCollapse: 'collapse', width: '600px' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '2px solid #333' }}></th>
                        <th style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '2px solid #333' }}>Bags</th>
                        <th style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '2px solid #333' }}>NetWeight</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Inward</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>{ledgerData.totals.inward.bags}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                          {isNaN(Number(ledgerData.totals.inward.netWeight)) ? '0.00' : Number(ledgerData.totals.inward.netWeight).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 8px', fontWeight: 'bold', borderBottom: '2px solid #333' }}>Outward</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', borderBottom: '2px solid #333' }}>{ledgerData.totals.outward.bags}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', borderBottom: '2px solid #333' }}>
                          {isNaN(Number(ledgerData.totals.outward.netWeight)) ? '0.00' : Number(ledgerData.totals.outward.netWeight).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px', fontWeight: 'bold', fontSize: '14pt' }}>Remaining</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14pt' }}>{ledgerData.totals.remaining.bags}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14pt' }}>
                          {isNaN(Number(ledgerData.totals.remaining.netWeight)) ? '0.00' : Number(ledgerData.totals.remaining.netWeight).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Inward Section - Bifurcated or Detailed Mode */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{
                    background: '#d4edda',
                    color: '#000',
                    padding: '8px',
                    fontWeight: 'bold',
                    fontFamily: 'Calibri, Arial, sans-serif',
                    fontSize: '11pt'
                  }}>
                    Inward {viewMode === 'bifurcated' && '(Grouped by Date & Variety)'} {groupBy === 'warehouse' && '(Warehouse-wise)'}
                  </div>

                  {groupBy === 'warehouse' && ledgerData.transactions?.inward ? (
                    // Warehouse-wise grouping
                    (() => {
                      const warehouseGroups = groupByWarehouse(ledgerData.transactions.inward, true);
                      return Object.entries(warehouseGroups).map(([warehouseName, transactions]) => (
                        <div key={warehouseName} style={{ marginBottom: '1.5rem' }}>
                          <div style={{
                            background: '#10b981',
                            color: 'white',
                            padding: '6px 12px',
                            fontWeight: 'bold',
                            fontSize: '10pt',
                            marginTop: '1rem'
                          }}>
                            Warehouse: {warehouseName}
                          </div>
                          <ExactFormatTable>
                            <thead>
                              <tr>
                                <th>S.No</th>
                                <th>Date</th>
                                <th>Type of Movement</th>
                                <th>Broker</th>
                                <th>From</th>
                                <th>Variety</th>
                                <th>Bags</th>
                                <th>Moisture</th>
                                <th>Cutting</th>
                                <th>Wb No</th>
                                <th>Net Weight</th>
                                <th>Lorry No</th>
                                <th>Total Amount</th>
                                <th>Avg Rate/Q</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transactions.map((record, idx) => (
                                <tr key={record.id} style={record.movementType === 'loose' ? { background: '#fffbeb' } : {}}>
                                  <td>{idx + 1}</td>
                                  <td>{new Date(record.date).toLocaleDateString('en-GB')}</td>
                                  <td>{record.movementType === 'purchase' ? 'Purchase' : record.movementType === 'loose' ? 'Loose' : 'Shifting'}</td>
                                  <td>{record.movementType === 'loose' ? '-' : (record.broker || '-')}</td>
                                  <td>{record.movementType === 'loose' ? '-' : (record.fromLocation || record.fromKunchinittu?.name || '-')}</td>
                                  <td>{record.movementType === 'loose' ? '-' : (record.variety || '-')}</td>
                                  <td>{record.bags || 0}</td>
                                  <td>{record.movementType === 'loose' ? '-' : (record.moisture || '-')}</td>
                                  <td>{record.movementType === 'loose' ? '-' : formatCutting(record.cutting)}</td>
                                  <td>{record.movementType === 'loose' ? '-' : record.wbNo}</td>
                                  <td>{record.movementType === 'loose' ? '-' : (isNaN(Number(record.netWeight)) ? '0.00' : Number(record.netWeight || 0).toFixed(2))}</td>
                                  <td>{record.movementType === 'loose' ? '-' : record.lorryNumber}</td>
                                  <td>{(record as any).purchaseRate?.totalAmount ? `₹${Number((record as any).purchaseRate.totalAmount).toFixed(2)}` : '-'}</td>
                                  <td>{(record as any).purchaseRate?.averageRate ? `₹${Number((record as any).purchaseRate.averageRate).toFixed(2)}` : '-'}</td>
                                </tr>
                              ))}
                              <tr style={{ background: '#059669', color: 'white', fontWeight: 'bold' }}>
                                <td colSpan={6}>Warehouse Total</td>
                                <td>{transactions.reduce((sum, r) => sum + (r.bags || 0), 0)}</td>
                                <td></td>
                                <td>{calculateCuttingTotal(transactions)}</td>
                                <td></td>
                                <td>{transactions.reduce((sum, r) => sum + Number(r.netWeight || 0), 0).toFixed(2)}</td>
                                <td></td>
                                <td>₹{transactions.reduce((sum, r) => sum + Number((r as any).purchaseRate?.totalAmount || 0), 0).toFixed(2)}</td>
                                <td></td>
                              </tr>
                            </tbody>
                          </ExactFormatTable>
                        </div>
                      ));
                    })()
                  ) : (
                    // Original kunchinittu-wise view
                    <ExactFormatTable>
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>Date</th>
                          {viewMode === 'detailed' && <th>Type of Movement</th>}
                          {viewMode === 'detailed' && <th>Broker</th>}
                          <th>From</th>
                          <th>To</th>
                          <th>Variety</th>
                          <th>Bags</th>
                          {viewMode === 'detailed' && <th>Moisture</th>}
                          {viewMode === 'detailed' && <th>Cutting</th>}
                          {viewMode === 'detailed' && <th>Wb No</th>}
                          <th>Net Weight</th>
                          {viewMode === 'detailed' && <th>Lorry No</th>}
                          {viewMode === 'detailed' && <th>Total Amount</th>}
                          {viewMode === 'detailed' && <th>Avg Rate/Q</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {viewMode === 'bifurcated' && ledgerData.bifurcation?.inward.map((entry, idx) => (
                          <tr key={idx} style={{ background: '#e7f5e7' }}>
                            <td>{idx + 1}</td>
                            <td>{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                            <td>{entry.from}</td>
                            <td><strong>{entry.to}</strong></td>
                            <td><strong>{entry.variety}</strong></td>
                            <td><strong>+{entry.bags}</strong></td>
                            <td><strong>+{entry.netWeight.toFixed(2)}</strong></td>
                          </tr>
                        ))}
                        {viewMode === 'detailed' && ledgerData.transactions?.inward.map((record, idx) => (
                          <tr key={record.id} style={record.movementType === 'loose' ? { background: '#fffbeb' } : {}}>
                            <td>{idx + 1}</td>
                            <td>{new Date(record.date).toLocaleDateString('en-GB')}</td>
                            <td>{record.movementType === 'purchase' ? 'Purchase' : record.movementType === 'loose' ? 'Loose' : 'Shifting'}</td>
                            <td>{record.movementType === 'loose' ? '-' : (record.broker || '-')}</td>
                            <td>
                              {record.movementType === 'loose'
                                ? '-'
                                : record.movementType === 'purchase'
                                  ? (record.fromLocation || '-')
                                  : `${record.fromKunchinittu?.code || ''} ${record.fromWarehouse?.name || ''}`
                              }
                            </td>
                            <td>
                              {record.movementType === 'loose' ? '-' : `${ledgerData.kunchinittu.code} ${record.toWarehouse?.name || ledgerData.kunchinittu.warehouse.name}`}
                            </td>
                            <td>{record.movementType === 'loose' ? '-' : (record.variety || '-')}</td>
                            <td>{record.bags || 0}</td>
                            <td>{record.movementType === 'loose' ? '-' : (record.moisture || '-')}</td>
                            <td>{record.movementType === 'loose' ? '-' : formatCutting(record.cutting)}</td>
                            <td>{record.movementType === 'loose' ? '-' : record.wbNo}</td>
                            <td>{record.movementType === 'loose' ? '-' : (isNaN(Number(record.netWeight)) ? '0.00' : Number(record.netWeight || 0).toFixed(2))}</td>
                            <td>{record.movementType === 'loose' ? '-' : record.lorryNumber}</td>
                            <td>{(record as any).purchaseRate?.totalAmount ? `₹${Number((record as any).purchaseRate.totalAmount).toFixed(2)}` : '-'}</td>
                            <td>{(record as any).purchaseRate?.averageRate ? `₹${Number((record as any).purchaseRate.averageRate).toFixed(2)}` : '-'}</td>
                          </tr>
                        ))}
                        <tr className="total-row">
                          <td colSpan={viewMode === 'bifurcated' ? 5 : 7}>Total</td>
                          <td>{ledgerData.totals.inward.bags}</td>
                          {viewMode === 'detailed' && (
                            <>
                              <td></td>
                              <td>{calculateCuttingTotal(ledgerData.transactions?.inward || [])}</td>
                              <td></td>
                            </>
                          )}
                          <td>{isNaN(Number(ledgerData.totals.inward.netWeight)) ? '0.00' : Number(ledgerData.totals.inward.netWeight).toFixed(2)}</td>
                          {viewMode === 'detailed' && <td></td>}
                          {viewMode === 'detailed' && <td>₹{(ledgerData.transactions?.inward || []).reduce((sum, r) => sum + Number((r as any).purchaseRate?.totalAmount || 0), 0).toFixed(2)}</td>}
                          {viewMode === 'detailed' && <td></td>}
                        </tr>
                      </tbody>
                    </ExactFormatTable>
                  )}
                </div>

                {/* Outward Section - Bifurcated or Detailed Mode */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{
                    background: '#f8d7da',
                    color: '#000',
                    padding: '8px',
                    fontWeight: 'bold',
                    fontFamily: 'Calibri, Arial, sans-serif',
                    fontSize: '11pt'
                  }}>
                    Outward {viewMode === 'bifurcated' && '(Grouped by Date & Variety)'}
                  </div>
                  <ExactFormatTable>
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Date</th>
                        {viewMode === 'detailed' && <th>Type of Movement</th>}
                        {viewMode === 'detailed' && <th>Broker</th>}
                        <th>From</th>
                        <th>To</th>
                        <th>Variety</th>
                        <th>Bags</th>
                        {viewMode === 'detailed' && <th>Moisture</th>}
                        {viewMode === 'detailed' && <th>Cutting</th>}
                        {viewMode === 'detailed' && <th>Wb No</th>}
                        <th>Net Weight</th>
                        {viewMode === 'detailed' && <th>Lorry No</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {viewMode === 'bifurcated' && ledgerData.bifurcation?.outward.map((entry, idx) => (
                        <tr key={idx} style={{ background: '#fde7e9' }}>
                          <td>{idx + 1}</td>
                          <td>{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                          <td><strong>{entry.from}</strong></td>
                          <td>
                            {entry.to.includes('→ Production') || entry.movementType === 'production-shifting' || entry.movementType === 'for-production' ? (
                              <span style={{ color: '#9f1239', fontWeight: 'bold' }}>
                                {entry.to} 🏭
                              </span>
                            ) : (
                              entry.to
                            )}
                          </td>
                          <td><strong>{entry.variety}</strong></td>
                          <td><strong>-{entry.bags}</strong></td>
                          <td><strong>-{entry.netWeight.toFixed(2)}</strong></td>
                        </tr>
                      ))}
                      {viewMode === 'detailed' && groupBy === 'kunchinittu' && ledgerData.transactions?.outward.map((record, idx) => (
                        <tr key={record.id}>
                          <td>{idx + 1}</td>
                          <td>{new Date(record.date).toLocaleDateString('en-GB')}</td>
                          <td>
                            {record.movementType === 'production-shifting' || record.movementType === 'for-production' ? (
                              <span className="production-link" title="Production Shifting - Click to view in Outturn Report">
                                🏭 {record.movementType === 'for-production' ? 'For Production' : 'Production Shifting'}
                              </span>
                            ) : (
                              'Shifting'
                            )}
                          </td>
                          <td>-</td>
                          <td>
                            {record.movementType === 'production-shifting' || record.movementType === 'for-production' ? (
                              `${ledgerData.kunchinittu.code} ${record.fromWarehouse?.name || ledgerData.kunchinittu.warehouse.name}`
                            ) : (
                              `${ledgerData.kunchinittu.code} ${record.fromWarehouse?.name || ledgerData.kunchinittu.warehouse.name}`
                            )}
                          </td>
                          <td>
                            {record.movementType === 'production-shifting' || record.movementType === 'for-production' ? (
                              <span style={{ color: '#9f1239', fontWeight: 'bold' }}>
                                Production - {record.outturn?.code || 'out01'}
                              </span>
                            ) : (
                              `${record.toKunchinittu?.code || ''} ${record.toWarehouseShift?.name || ''}`
                            )}
                          </td>
                          <td>{record.variety || '-'}</td>
                          <td>{record.bags || 0}</td>
                          <td>{record.moisture || '-'}</td>
                          <td>{formatCutting(record.cutting)}</td>
                          <td>{record.wbNo}</td>
                          <td>{isNaN(Number(record.netWeight)) ? '0.00' : Number(record.netWeight || 0).toFixed(2)}</td>
                          <td>{record.lorryNumber}</td>
                        </tr>
                      ))}
                      {groupBy === 'warehouse' && ledgerData.transactions?.outward && (() => {
                        const warehouseGroups = groupByWarehouse(ledgerData.transactions.outward, false);
                        return Object.entries(warehouseGroups).map(([warehouseName, transactions]) => (
                          <React.Fragment key={warehouseName}>
                            <tr style={{ background: '#dc2626', color: 'white' }}>
                              <td colSpan={13} style={{ fontWeight: 'bold', padding: '6px 12px' }}>
                                Warehouse: {warehouseName}
                              </td>
                            </tr>
                            {transactions.map((record, idx) => (
                              <tr key={record.id}>
                                <td>{idx + 1}</td>
                                <td>{new Date(record.date).toLocaleDateString('en-GB')}</td>
                                <td>
                                  {record.movementType === 'production-shifting' || record.movementType === 'for-production' ? `🏭 ${record.movementType === 'for-production' ? 'For Production' : 'Production Shifting'}` : 'Shifting'}
                                </td>
                                <td>-</td>
                                <td>{ledgerData.kunchinittu.code} - {record.fromWarehouse?.name || warehouseName}</td>
                                <td>
                                  {record.movementType === 'production-shifting' || record.movementType === 'for-production' ? (
                                    <span style={{ color: '#9f1239', fontWeight: 'bold' }}>
                                      → Production {record.outturn?.code ? `(${record.outturn.code})` : ''}
                                    </span>
                                  ) : (
                                    `${record.toKunchinittu?.name || ''} - ${record.toWarehouseShift?.name || ''}`
                                  )}
                                </td>
                                <td>{record.variety || '-'}</td>
                                <td>{record.bags || 0}</td>
                                <td>{record.moisture || '-'}</td>
                                <td>{formatCutting(record.cutting)}</td>
                                <td>{record.wbNo}</td>
                                <td>{isNaN(Number(record.netWeight)) ? '0.00' : Number(record.netWeight || 0).toFixed(2)}</td>
                                <td>{record.lorryNumber}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ));
                      })()}
                      <tr className="total-row">
                        <td colSpan={viewMode === 'bifurcated' ? 5 : 7}>Total</td>
                        <td>{ledgerData.totals.outward.bags}</td>
                        {viewMode === 'detailed' && (
                          <>
                            <td></td>
                            <td>{calculateCuttingTotal(ledgerData.transactions?.outward || [])}</td>
                            <td></td>
                          </>
                        )}
                        <td>{isNaN(Number(ledgerData.totals.outward.netWeight)) ? '0.00' : Number(ledgerData.totals.outward.netWeight).toFixed(2)}</td>
                        {viewMode === 'detailed' && <td></td>}
                      </tr>
                    </tbody>
                  </ExactFormatTable>
                </div>

              </LedgerContainer>
            );
          })}
        </>
      ) : (
        <EmptyState>
          <p>🏭 Select a Warehouse to view all kunchinittus ledger</p>
        </EmptyState>
      )
      }

      {/* Pagination Controls for Kunchinittu Ledger */}
      {
        multipleLedgerData.length > 0 && totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            recordsPerPage={recordsPerPage}
            onPageChange={(newPage) => {
              setCurrentPage(newPage);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              // Refetch with new page - will be triggered by useEffect
            }}
            loading={loading}
          />
        )
      }

    </Container >
  );
};

export default KunchinintuLedger;