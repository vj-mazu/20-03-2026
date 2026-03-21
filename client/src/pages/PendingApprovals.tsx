import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationModal from '../components/ConfirmationModal';

// Helper function to format cutting string (e.g., "12X5" → "12 x 5")
const formatCutting = (cutting: string | null | undefined): string => {
    if (!cutting) return '-';
    return cutting.replace(/[Xx]/g, ' x ').replace(/\s+/g, ' ').trim();
};
const Container = styled.div`
  animation: fadeIn 0.5s ease-in;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #ffffff;
  font-size: 2rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  background: white;
  padding: 0.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.$active ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f3f4f6'};
  color: ${props => props.$active ? 'white' : '#374151'};
  position: relative;

  &:hover {
    background: ${props => props.$active ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb'};
  }
`;

const Badge = styled.span`
  background: ${props => props.color || '#ef4444'};
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 0.5rem;
`;

const ContentArea = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  overflow: hidden;
`;

const ActionBar = styled.div`
  background: #f0f4ff;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
`;

const ActionInfo = styled.div`
  .count {
    font-size: 1.2rem;
    font-weight: bold;
    color: #667eea;
  }
  .selected {
    font-size: 0.9rem;
    color: #6b7280;
    margin-left: 1rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const Button = styled.button<{ $variant?: string }>`
  padding: 0.6rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;

  ${props => {
        switch (props.$variant) {
            case 'approve':
                return `
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }
        `;
            case 'reject':
                return `
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          }
        `;
            default:
                return `
          background: #e5e7eb;
          color: #374151;
          &:hover:not(:disabled) {
            background: #d1d5db;
          }
        `;
        }
    }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
  max-height: 60vh;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;

  @media (max-width: 768px) {
    .table-container & {
      table, thead, tbody, th, td, tr {
        display: block;
      }
      
      thead tr {
        position: absolute;
        top: -9999px;
        left: -9999px;
      }

      tr {
        background: white;
        border: 1px solid #e5e7eb;
        margin-bottom: 1rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        overflow: hidden;
      }

      td {
        border: none;
        border-bottom: 1px solid #f3f4f6;
        position: relative;
        padding: 0.75rem !important;
        padding-left: 45% !important;
        text-align: right !important;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        min-height: 40px;
      }
      
      td:last-child {
        border-bottom: none;
      }

      td:before {
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
    }

    /* Arrivals Table Headers */
    .arrivals-table & td:nth-of-type(1):before { content: "Select"; }
    .arrivals-table & td:nth-of-type(2):before { content: "Date"; }
    .arrivals-table & td:nth-of-type(3):before { content: "SL No"; }
    .arrivals-table & td:nth-of-type(4):before { content: "Type"; }
    .arrivals-table & td:nth-of-type(5):before { content: "Broker"; }
    .arrivals-table & td:nth-of-type(6):before { content: "From"; }
    .arrivals-table & td:nth-of-type(7):before { content: "Variety"; }
    .arrivals-table & td:nth-of-type(8):before { content: "Bags"; }
    .arrivals-table & td:nth-of-type(9):before { content: "Gross Wt"; }
    .arrivals-table & td:nth-of-type(10):before { content: "Tare Wt"; }
    .arrivals-table & td:nth-of-type(11):before { content: "Net Wt"; }
    .arrivals-table & td:nth-of-type(12):before { content: "M%"; }
    .arrivals-table & td:nth-of-type(13):before { content: "Cut"; }
    .arrivals-table & td:nth-of-type(14):before { content: "Destination"; }
    .arrivals-table & td:nth-of-type(15):before { content: "WB No"; }
    .arrivals-table & td:nth-of-type(16):before { content: "Lorry"; }
    .arrivals-table & td:nth-of-type(17):before { content: "Created By"; }

    /* Productions Table Headers */
    .productions-table & td:nth-of-type(1):before { content: "Select"; }
    .productions-table & td:nth-of-type(2):before { content: "Date"; }
    .productions-table & td:nth-of-type(3):before { content: "Mvmt Type"; }
    .productions-table & td:nth-of-type(4):before { content: "Bill No"; }
    .productions-table & td:nth-of-type(5):before { content: "Variety"; }
    .productions-table & td:nth-of-type(6):before { content: "Product Type"; }
    .productions-table & td:nth-of-type(7):before { content: "Bags"; }
    .productions-table & td:nth-of-type(8):before { content: "Bag Size"; }
    .productions-table & td:nth-of-type(9):before { content: "QTLS"; }
    .productions-table & td:nth-of-type(10):before { content: "Packaging"; }
    .productions-table & td:nth-of-type(11):before { content: "From"; }
    .productions-table & td:nth-of-type(12):before { content: "To"; }
    .productions-table & td:nth-of-type(13):before { content: "Lorry No"; }
    .productions-table & td:nth-of-type(14):before { content: "Status"; }

    /* Purchase Rates Table Headers */
    .rates-table & td:nth-of-type(1):before { content: "Select"; }
    .rates-table & td:nth-of-type(2):before { content: "Date"; }
    .rates-table & td:nth-of-type(3):before { content: "SL No"; }
    .rates-table & td:nth-of-type(4):before { content: "From"; }
    .rates-table & td:nth-of-type(5):before { content: "Destination"; }
    .rates-table & td:nth-of-type(6):before { content: "Variety"; }
    .rates-table & td:nth-of-type(7):before { content: "Bags"; }
    .rates-table & td:nth-of-type(8):before { content: "Net Weight"; }
    .rates-table & td:nth-of-type(9):before { content: "Rate Type"; }
    .rates-table & td:nth-of-type(10):before { content: "Amount Formula"; }
    .rates-table & td:nth-of-type(11):before { content: "Total Amount"; }
    .rates-table & td:nth-of-type(12):before { content: "Avg Rate/Q"; }
    .rates-table & td:nth-of-type(13):before { content: "Created By"; }
    
    /* Rice Stock Table Headers */
    .rstock-table & td:nth-of-type(1):before { content: "Select"; }
    .rstock-table & td:nth-of-type(2):before { content: "Date"; }
    .rstock-table & td:nth-of-type(3):before { content: "Type"; }
    .rstock-table & td:nth-of-type(4):before { content: "Product"; }
    .rstock-table & td:nth-of-type(5):before { content: "Variety/Packaging"; }
    .rstock-table & td:nth-of-type(6):before { content: "Bags"; }
    .rstock-table & td:nth-of-type(7):before { content: "Quantity (Q)"; }
    .rstock-table & td:nth-of-type(8):before { content: "Location"; }
    .rstock-table & td:nth-of-type(9):before { content: "Lorry"; }
    .rstock-table & td:nth-of-type(10):before { content: "Bill"; }
    .rstock-table & td:nth-of-type(11):before { content: "Created By"; }

    /* Paddy Hamali Table Headers */
    .paddyhamali-table & td:nth-of-type(1):before { content: "Select"; }
    .paddyhamali-table & td:nth-of-type(2):before { content: "Date"; }
    .paddyhamali-table & td:nth-of-type(3):before { content: "SL No"; }
    .paddyhamali-table & td:nth-of-type(4):before { content: "Broker"; }
    .paddyhamali-table & td:nth-of-type(5):before { content: "Variety"; }
    .paddyhamali-table & td:nth-of-type(6):before { content: "Work Type"; }
    .paddyhamali-table & td:nth-of-type(7):before { content: "Work Detail"; }
    .paddyhamali-table & td:nth-of-type(8):before { content: "Bags"; }
    .paddyhamali-table & td:nth-of-type(9):before { content: "Rate"; }
    .paddyhamali-table & td:nth-of-type(10):before { content: "Amount"; }
    .paddyhamali-table & td:nth-of-type(11):before { content: "Worker"; }
    .paddyhamali-table & td:nth-of-type(12):before { content: "Created By"; }

    /* Rice Hamali Table Headers */
    .ricehamali-table & td:nth-of-type(1):before { content: "Select"; }
    .ricehamali-table & td:nth-of-type(2):before { content: "Date"; }
    .ricehamali-table & td:nth-of-type(3):before { content: "Source"; }
    .ricehamali-table & td:nth-of-type(4):before { content: "Work Type"; }
    .ricehamali-table & td:nth-of-type(5):before { content: "Work Detail"; }
    .ricehamali-table & td:nth-of-type(6):before { content: "Bags"; }
    .ricehamali-table & td:nth-of-type(7):before { content: "Rate"; }
    .ricehamali-table & td:nth-of-type(8):before { content: "Amount"; }
    .ricehamali-table & td:nth-of-type(9):before { content: "Created By"; }
  }

  th {
    background: #f9fafb;
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e5e7eb;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  td {
    padding: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }

  tbody tr:hover {
    background: #f9fafb;
  }

  .checkbox-cell {
    width: 40px;
    text-align: center;
  }
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const TypeBadge = styled.span<{ $type: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  
  ${props => {
        switch (props.$type) {
            case 'purchase':
                return 'background: #dbeafe; color: #1e40af;';
            case 'shifting':
                return 'background: #fef3c7; color: #92400e;';
            case 'production-shifting':
                return 'background: #fce7f3; color: #9f1239;';
            case 'rice-production':
                return 'background: #d1fae5; color: #065f46;';
            case 'purchase-rate':
                return 'background: #e0e7ff; color: #3730a3;';
            default:
                return 'background: #e5e7eb; color: #374151;';
        }
    }}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;

  .icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: #374151;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;

  .spinner {
    font-size: 3rem;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const SelectionInfo = styled.span`
  color: #6b7280;
  font-size: 0.9rem;
`;

const RejectButton = styled.button`
  padding: 0.6rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ApproveButton = styled.button`
  padding: 0.6rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const RoleBadge = styled.span<{ $role?: string }>`
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: 0.25rem;
  
  ${props => {
        switch (props.$role) {
            case 'admin':
                return 'background: #e0e7ff; color: #3730a3;';
            case 'manager':
                return 'background: #fae8ff; color: #86198f;';
            case 'staff':
                return 'background: #f3f4f6; color: #4b5563;';
            default:
                return 'background: #f3f4f6; color: #4b5563;';
        }
    }}
`;

const StatusBadge = styled.span<{ $status?: string }>`
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
  
  ${props => {
        switch (props.$status) {
            case 'pending':
                return `
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #92400e;
          border: 1px solid #f59e0b;
        `;
            case 'approved':
                return `
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #065f46;
          border: 1px solid #10b981;
        `;
            case 'rejected':
                return `
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #991b1b;
          border: 1px solid #ef4444;
        `;
            default:
                return `
          background: #e5e7eb;
          color: #374151;
          border: 1px solid #9ca3af;
        `;
        }
    }}
  
  small {
    display: block;
    font-size: 0.65rem;
    opacity: 0.8;
    margin-top: 2px;
  }
`;

// Interfaces
interface PendingArrival {
    id: number;
    slNo: string;
    date: string;
    movementType: string;
    variety?: string;
    bags?: number;
    netWeight: number;
    grossWeight?: number;
    tareWeight?: number;
    wbNo: string;
    lorryNumber: string;
    broker?: string;
    fromLocation?: string;
    moisture?: number;
    cutting?: string;
    status: string;
    creator?: { username: string; role: string };
    toKunchinittu?: { name: string; code: string };
    toWarehouse?: { name: string; code: string };
    fromKunchinittu?: { name: string; code: string };
    fromWarehouse?: { name: string; code: string };
    toWarehouseShift?: { name: string; code: string };
    outturn?: { code: string; allottedVariety: string };
}

interface PendingRiceProduction {
    id: number;
    date: string;
    productType: string;
    variety?: string;
    bags: number;
    quantityQuintals?: number;
    movementType?: string;
    locationCode?: string;
    lorryNumber?: string;
    billNumber?: string;
    status: string;
    creator?: { username: string; role: string };
    outturn?: { code: string; allottedVariety: string; type?: string };
    packaging?: { brandName: string; code: string; allottedKg?: number };
}

interface PendingPurchaseRate {
    id: number;
    totalAmount: number;
    averageRate: number;
    rateType: string;
    amountFormula: string;
    status: string;
    creator?: { username: string; role: string };
    arrival?: {
        slNo: string;
        date: string;
        variety: string;
        bags: number;
        netWeight: number;
        grossWeight?: number;
        tareWeight?: number;
        broker: string;
        fromLocation: string;
        movementType?: string;
        purchaseType?: string;
        moisture?: number;
        cutting?: string;
        lorryNumber?: string;
        wbNo?: string;
        toKunchinittu?: { name: string; code: string };
        toWarehouse?: { name: string; code: string };
        outturn?: { code: string; allottedVariety: string };
    };
}

interface PendingRiceStockMovement {
    id: number;
    date: string;
    movementType: string;
    productType: string;
    variety?: string;
    bags: number;
    quantityQuintals?: number;
    locationCode?: string;
    lorryNumber?: string;
    billNumber?: string;
    status: string;
    createdAt: string;
    packagingId?: number;
    packagingBrand?: string;
    packagingKg?: number;
    creatorUsername?: string;
    creatorRole?: string;
}

interface PendingPaddyHamali {
    id: number;
    arrivalId: number;
    workType: string;
    workDetail: string;
    bags: number;
    rate: number;
    amount: number;
    status: string;
    createdAt: string;
    workerName?: string;
    arrival?: {
        slNo: string;
        broker: string;
        date: string;
        bags: number;
        variety: string;
        movementType: string;
    };
    addedByUser?: { username: string; role: string };
}

interface PendingRiceHamali {
    id: number;
    rice_production_id?: number;
    rice_stock_movement_id?: number;
    workType: string;
    workDetail: string;
    bags: number;
    rate?: number;
    amount?: number;
    status: string;
    createdAt: string;
    productionDate?: string;
    productType?: string;
    movementDate?: string;
    movementType?: string;
    creatorUsername?: string;
    creatorRole?: string;
}

type TabType = 'arrivals' | 'rice-production' | 'rice-stock' | 'paddy-hamali' | 'rice-hamali' | 'purchase-rates';

const PendingApprovals: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('arrivals');
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Data states
    const [pendingArrivals, setPendingArrivals] = useState<PendingArrival[]>([]);
    const [pendingRiceProductions, setPendingRiceProductions] = useState<PendingRiceProduction[]>([]);
    const [pendingPurchaseRates, setPendingPurchaseRates] = useState<PendingPurchaseRate[]>([]);

    // Selection states
    const [selectedArrivalIds, setSelectedArrivalIds] = useState<number[]>([]);
    const [selectedProductionIds, setSelectedProductionIds] = useState<number[]>([]);
    const [selectedRateIds, setSelectedRateIds] = useState<number[]>([]);
    const [selectedStockIds, setSelectedStockIds] = useState<number[]>([]);
    const [selectedPaddyHamaliIds, setSelectedPaddyHamaliIds] = useState<number[]>([]);
    const [selectedRiceHamaliIds, setSelectedRiceHamaliIds] = useState<number[]>([]);

    // New data states
    const [pendingRiceStock, setPendingRiceStock] = useState<PendingRiceStockMovement[]>([]);
    const [pendingPaddyHamali, setPendingPaddyHamali] = useState<PendingPaddyHamali[]>([]);
    const [pendingRiceHamali, setPendingRiceHamali] = useState<PendingRiceHamali[]>([]);

    // Confirmation Modal state
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'approve' | 'reject' | 'confirm';
        showInput?: boolean;
        actionType: 'approve_arrivals' | 'reject_arrivals' | 'approve_productions' | 'reject_productions' | 'approve_rates' | 'reject_rates' | 'approve_rice_stock' | 'reject_rice_stock' | 'approve_paddy_hamali' | 'reject_paddy_hamali' | 'approve_rice_hamali' | 'reject_rice_hamali' | null;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm',
        actionType: null
    });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'arrivals') {
                const response = await axios.get('/arrivals/pending-list');
                const data = response.data as { approvals: PendingArrival[] };
                setPendingArrivals(data.approvals || []);
                setSelectedArrivalIds([]);
            } else if (activeTab === 'rice-production') {
                const response = await axios.get('/rice-productions/pending-list');
                const data = response.data as { productions: PendingRiceProduction[] };
                setPendingRiceProductions(data.productions || []);
                setSelectedProductionIds([]);
            } else if (activeTab === 'rice-stock') {
                const response = await axios.get('/rice-stock-management/pending-list');
                const data = response.data as { movements: PendingRiceStockMovement[] };
                setPendingRiceStock(data.movements || []);
                setSelectedStockIds([]);
            } else if (activeTab === 'paddy-hamali') {
                const response = await axios.get('/paddy-hamali-entries/pending-list');
                const data = response.data as { entries: PendingPaddyHamali[] };
                setPendingPaddyHamali(data.entries || []);
                setSelectedPaddyHamaliIds([]);
            } else if (activeTab === 'rice-hamali') {
                const response = await axios.get('/rice-hamali-entries/pending-list');
                const data = response.data as { entries: PendingRiceHamali[] };
                setPendingRiceHamali(data.entries || []);
                setSelectedRiceHamaliIds([]);
            } else if (activeTab === 'purchase-rates' && user?.role === 'admin') {
                const response = await axios.get('/purchase-rates/pending-list');
                const data = response.data as { rates: PendingPurchaseRate[] };
                setPendingPurchaseRates(data.rates || []);
                setSelectedRateIds([]);
            }
        } catch (error) {
            console.error('Error fetching pending data:', error);
            toast.error('Failed to fetch pending items');
        } finally {
            setLoading(false);
        }
    };

    // Selection handlers for arrivals
    const handleSelectAllArrivals = (checked: boolean) => {
        setSelectedArrivalIds(checked ? pendingArrivals.map(a => a.id) : []);
    };

    const handleSelectArrival = (id: number, checked: boolean) => {
        setSelectedArrivalIds(checked
            ? [...selectedArrivalIds, id]
            : selectedArrivalIds.filter(i => i !== id));
    };

    // Bulk actions for arrivals
    const handleBulkApproveArrivals = () => {
        if (selectedArrivalIds.length === 0) {
            toast.warning('Please select at least one record');
            return;
        }

        setModalConfig({
            isOpen: true,
            title: 'Approve Arrivals',
            message: `Are you sure you want to approve ${selectedArrivalIds.length} arrival record(s)?`,
            type: 'approve',
            actionType: 'approve_arrivals'
        });
    };

    const handleBulkRejectArrivals = () => {
        if (selectedArrivalIds.length === 0) {
            toast.warning('Please select at least one record');
            return;
        }

        setModalConfig({
            isOpen: true,
            title: 'Reject Arrivals',
            message: `Enter rejection reason for ${selectedArrivalIds.length} arrival record(s):`,
            type: 'reject',
            showInput: true,
            actionType: 'reject_arrivals'
        });
    };

    // Selection handlers for rice production
    const handleSelectAllProductions = (checked: boolean) => {
        setSelectedProductionIds(checked ? pendingRiceProductions.map(p => p.id) : []);
    };

    const handleSelectProduction = (id: number, checked: boolean) => {
        setSelectedProductionIds(checked
            ? [...selectedProductionIds, id]
            : selectedProductionIds.filter(i => i !== id));
    };

    // Bulk actions for rice production
    const handleBulkApproveProductions = () => {
        if (selectedProductionIds.length === 0) {
            toast.warning('Please select at least one record');
            return;
        }

        setModalConfig({
            isOpen: true,
            title: 'Approve Productions',
            message: `Are you sure you want to approve ${selectedProductionIds.length} rice production record(s)?`,
            type: 'approve',
            actionType: 'approve_productions'
        });
    };

    const handleBulkRejectProductions = () => {
        if (selectedProductionIds.length === 0) {
            toast.warning('Please select at least one record');
            return;
        }

        setModalConfig({
            isOpen: true,
            title: 'Reject Productions',
            message: `Enter rejection reason for ${selectedProductionIds.length} rice production record(s):`,
            type: 'reject',
            showInput: true,
            actionType: 'reject_productions'
        });
    };

    // Selection handlers for purchase rates
    const handleSelectAllRates = (checked: boolean) => {
        setSelectedRateIds(checked ? pendingPurchaseRates.map(r => r.id) : []);
    };

    const handleSelectRate = (id: number, checked: boolean) => {
        setSelectedRateIds(checked
            ? [...selectedRateIds, id]
            : selectedRateIds.filter(i => i !== id));
    };

    // Bulk actions for purchase rates (Admin only)
    const handleBulkApproveRates = () => {
        if (selectedRateIds.length === 0) {
            toast.warning('Please select at least one record');
            return;
        }

        setModalConfig({
            isOpen: true,
            title: 'Approve Rates',
            message: `Are you sure you want to approve ${selectedRateIds.length} purchase rate(s)?`,
            type: 'approve',
            actionType: 'approve_rates'
        });
    };

    const handleBulkRejectRates = () => {
        if (selectedRateIds.length === 0) {
            toast.warning('Please select at least one record');
            return;
        }

        setModalConfig({
            isOpen: true,
            title: 'Reject Rates',
            message: `Enter rejection reason for ${selectedRateIds.length} purchase rate(s):`,
            type: 'reject',
            showInput: true,
            actionType: 'reject_rates'
        });
    };

    // Selection handlers for rice stock
    const handleSelectAllRiceStock = (checked: boolean) => {
        setSelectedStockIds(checked ? pendingRiceStock.map(m => m.id) : []);
    };

    const handleSelectRiceStock = (id: number, checked: boolean) => {
        setSelectedStockIds(checked
            ? [...selectedStockIds, id]
            : selectedStockIds.filter(i => i !== id));
    };

    // Bulk actions for rice stock
    const handleBulkApproveRiceStock = () => {
        if (selectedStockIds.length === 0) {
            toast.warning('Please select at least one movement');
            return;
        }
        setModalConfig({
            isOpen: true,
            title: 'Approve Rice Stock',
            message: `Are you sure you want to approve ${selectedStockIds.length} rice stock movement(s)?`,
            type: 'approve',
            actionType: 'approve_rice_stock'
        });
    };

    const handleBulkRejectRiceStock = () => {
        if (selectedStockIds.length === 0) {
            toast.warning('Please select at least one movement');
            return;
        }
        setModalConfig({
            isOpen: true,
            title: 'Reject Rice Stock',
            message: `Enter rejection reason for ${selectedStockIds.length} rice stock movement(s):`,
            type: 'reject',
            showInput: true,
            actionType: 'reject_rice_stock'
        });
    };

    // Selection handlers for paddy hamali
    const handleSelectAllPaddyHamali = (checked: boolean) => {
        setSelectedPaddyHamaliIds(checked ? pendingPaddyHamali.map(e => e.id) : []);
    };

    const handleSelectPaddyHamali = (id: number, checked: boolean) => {
        setSelectedPaddyHamaliIds(checked
            ? [...selectedPaddyHamaliIds, id]
            : selectedPaddyHamaliIds.filter(i => i !== id));
    };

    // Bulk actions for paddy hamali
    const handleBulkApprovePaddyHamali = () => {
        if (selectedPaddyHamaliIds.length === 0) {
            toast.warning('Please select at least one entry');
            return;
        }
        setModalConfig({
            isOpen: true,
            title: 'Approve Paddy Hamali',
            message: `Are you sure you want to approve ${selectedPaddyHamaliIds.length} paddy hamali entry/entries?`,
            type: 'approve',
            actionType: 'approve_paddy_hamali'
        });
    };

    const handleBulkRejectPaddyHamali = () => {
        if (selectedPaddyHamaliIds.length === 0) {
            toast.warning('Please select at least one entry');
            return;
        }
        setModalConfig({
            isOpen: true,
            title: 'Reject Paddy Hamali',
            message: `Enter rejection reason for ${selectedPaddyHamaliIds.length} paddy hamali entry/entries:`,
            type: 'reject',
            showInput: true,
            actionType: 'reject_paddy_hamali'
        });
    };

    // Selection handlers for rice hamali
    const handleSelectAllRiceHamali = (checked: boolean) => {
        setSelectedRiceHamaliIds(checked ? pendingRiceHamali.map(e => e.id) : []);
    };

    const handleSelectRiceHamali = (id: number, checked: boolean) => {
        setSelectedRiceHamaliIds(checked
            ? [...selectedRiceHamaliIds, id]
            : selectedRiceHamaliIds.filter(i => i !== id));
    };

    // Bulk actions for rice hamali
    const handleBulkApproveRiceHamali = () => {
        if (selectedRiceHamaliIds.length === 0) {
            toast.warning('Please select at least one entry');
            return;
        }
        setModalConfig({
            isOpen: true,
            title: 'Approve Rice Hamali',
            message: `Are you sure you want to approve ${selectedRiceHamaliIds.length} rice hamali entry/entries?`,
            type: 'approve',
            actionType: 'approve_rice_hamali'
        });
    };

    const handleBulkRejectRiceHamali = () => {
        if (selectedRiceHamaliIds.length === 0) {
            toast.warning('Please select at least one entry');
            return;
        }
        setModalConfig({
            isOpen: true,
            title: 'Reject Rice Hamali',
            message: `Enter rejection reason for ${selectedRiceHamaliIds.length} rice hamali entry/entries:`,
            type: 'reject',
            showInput: true,
            actionType: 'reject_rice_hamali'
        });
    };

    const handleModalConfirm = async (reason?: string) => {
        const { actionType } = modalConfig;
        if (!actionType) return;

        setModalConfig(prev => ({ ...prev, isOpen: false }));
        setProcessing(true);

        try {
            switch (actionType) {
                case 'approve_arrivals':
                    await axios.post('/arrivals/bulk-approve', { arrivalIds: selectedArrivalIds });
                    toast.success(`${selectedArrivalIds.length} arrival(s) approved`);
                    break;
                case 'reject_arrivals':
                    await axios.post('/arrivals/bulk-reject', { arrivalIds: selectedArrivalIds, remarks: reason });
                    toast.success(`${selectedArrivalIds.length} arrival(s) rejected`);
                    break;
                case 'approve_productions':
                    await axios.post('/rice-productions/bulk-approve', { productionIds: selectedProductionIds });
                    toast.success(`${selectedProductionIds.length} rice production(s) approved`);
                    break;
                case 'reject_productions':
                    await axios.post('/rice-productions/bulk-reject', { productionIds: selectedProductionIds, remarks: reason });
                    toast.success(`${selectedProductionIds.length} rice production(s) rejected`);
                    break;
                case 'approve_rates':
                    await axios.post('/purchase-rates/bulk-approve', { rateIds: selectedRateIds });
                    toast.success(`${selectedRateIds.length} purchase rate(s) approved`);
                    break;
                case 'reject_rates':
                    await axios.post('/purchase-rates/bulk-reject', { rateIds: selectedRateIds, remarks: reason });
                    toast.success(`${selectedRateIds.length} purchase rate(s) rejected`);
                    break;
                case 'approve_rice_stock':
                    await axios.post('/rice-stock-management/bulk-approve', { movementIds: selectedStockIds });
                    toast.success(`${selectedStockIds.length} rice stock movement(s) approved`);
                    break;
                case 'reject_rice_stock':
                    await axios.post('/rice-stock-management/bulk-reject', { movementIds: selectedStockIds, remarks: reason });
                    toast.success(`${selectedStockIds.length} rice stock movement(s) rejected`);
                    break;
                case 'approve_paddy_hamali':
                    await axios.post('/paddy-hamali-entries/bulk-approve', { entryIds: selectedPaddyHamaliIds });
                    toast.success(`${selectedPaddyHamaliIds.length} paddy hamali entry/entries approved`);
                    break;
                case 'reject_paddy_hamali':
                    await axios.post('/paddy-hamali-entries/bulk-reject', { entryIds: selectedPaddyHamaliIds, remarks: reason });
                    toast.success(`${selectedPaddyHamaliIds.length} paddy hamali entry/entries rejected`);
                    break;
                case 'approve_rice_hamali':
                    await axios.post('/rice-hamali-entries/bulk-approve', { entryIds: selectedRiceHamaliIds });
                    toast.success(`${selectedRiceHamaliIds.length} rice hamali entry/entries approved`);
                    break;
                case 'reject_rice_hamali':
                    await axios.post('/rice-hamali-entries/bulk-reject', { entryIds: selectedRiceHamaliIds, remarks: reason });
                    toast.success(`${selectedRiceHamaliIds.length} rice hamali entry/entries rejected`);
                    break;
            }
            fetchData();
        } catch (error) {
            console.error('Error in bulk action:', error);
            toast.error('Failed to process request');
        } finally {
            setProcessing(false);
            setModalConfig({ isOpen: false, title: '', message: '', type: 'confirm', actionType: null });
        }
    };

    const getDestination = (arrival: PendingArrival) => {
        if (arrival.movementType === 'purchase') {
            // For "for-production" purchases, show the outturn code
            if (arrival.outturn?.code) {
                return `→ ${arrival.outturn.code} (Outturn)`;
            }
            return `${arrival.toKunchinittu?.code || ''} - ${arrival.toWarehouse?.name || ''}`;
        } else if (arrival.movementType === 'shifting') {
            // Show full from-to path like Records page: KN1 - W1 → KN2 - W2
            const fromKc = arrival.fromKunchinittu?.code || arrival.fromKunchinittu?.name || '';
            const fromWh = arrival.fromWarehouse?.name || '';
            const toKc = arrival.toKunchinittu?.code || arrival.toKunchinittu?.name || '';
            const toWh = arrival.toWarehouseShift?.name || arrival.toWarehouse?.name || '';
            const from = fromKc && fromWh ? `${fromKc} - ${fromWh}` : (fromKc || fromWh);
            const to = toKc && toWh ? `${toKc} - ${toWh}` : (toKc || toWh);
            return `${from} → ${to}`;
        } else if (arrival.movementType === 'production-shifting') {
            // Show kunchinittu, warehouse, and outturn code for production-shifting
            const from = `${arrival.fromKunchinittu?.code || ''} - ${arrival.fromWarehouse?.name || ''}`;
            return `${from} → ${arrival.outturn?.code || 'Production'}`;
        }
        return '-';
    };

    const renderArrivalsTable = () => {
        if (loading) {
            return <LoadingState><div className="spinner">⏳</div><p>Loading...</p></LoadingState>;
        }

        if (pendingArrivals.length === 0) {
            return (
                <EmptyState>
                    <div className="icon">✅</div>
                    <h3>No Pending Arrivals</h3>
                    <p>All arrival records have been processed!</p>
                </EmptyState>
            );
        }

        return (
            <>
                <ActionBar>
                    <ActionInfo>
                        <span className="count">{pendingArrivals.length} pending arrival(s)</span>
                        {selectedArrivalIds.length > 0 && (
                            <span className="selected">{selectedArrivalIds.length} selected</span>
                        )}
                    </ActionInfo>
                    <ActionButtons>
                        <Button
                            $variant="reject"
                            onClick={handleBulkRejectArrivals}
                            disabled={selectedArrivalIds.length === 0 || processing}
                        >
                            ❌ Reject ({selectedArrivalIds.length})
                        </Button>
                        <Button
                            $variant="approve"
                            onClick={handleBulkApproveArrivals}
                            disabled={selectedArrivalIds.length === 0 || processing}
                        >
                            ✅ Approve ({selectedArrivalIds.length})
                        </Button>
                    </ActionButtons>
                </ActionBar>
                <TableContainer className="table-container arrivals-table">
                    <Table>
                        <thead>
                            <tr>
                                <th className="checkbox-cell">
                                    <Checkbox
                                        type="checkbox"
                                        checked={selectedArrivalIds.length === pendingArrivals.length && pendingArrivals.length > 0}
                                        onChange={(e) => handleSelectAllArrivals(e.target.checked)}
                                    />
                                </th>
                                <th>Date</th>
                                <th>SL No</th>
                                <th>Type</th>
                                <th>Broker</th>
                                <th>From</th>
                                <th>Variety</th>
                                <th>Bags</th>
                                <th>Gross Wt</th>
                                <th>Tare Wt</th>
                                <th>Net Wt</th>
                                <th>M%</th>
                                <th>Cut</th>
                                <th>Destination</th>
                                <th>WB No</th>
                                <th>Lorry</th>
                                <th>Created By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingArrivals.map(arrival => (
                                <tr key={arrival.id}>
                                    <td className="checkbox-cell">
                                        <Checkbox
                                            type="checkbox"
                                            checked={selectedArrivalIds.includes(arrival.id)}
                                            onChange={(e) => handleSelectArrival(arrival.id, e.target.checked)}
                                        />
                                    </td>
                                    <td>{new Date(arrival.date).toLocaleDateString('en-GB')}</td>
                                    <td><strong>{arrival.slNo}</strong></td>
                                    <td>
                                        <TypeBadge $type={arrival.movementType}>
                                            {arrival.movementType === 'production-shifting' ? 'Production' : arrival.movementType}
                                        </TypeBadge>
                                    </td>
                                    <td>{arrival.broker || '-'}</td>
                                    <td>{arrival.fromLocation || '-'}</td>
                                    <td><strong>{arrival.variety || '-'}</strong></td>
                                    <td>{arrival.bags || '-'}</td>
                                    <td>{arrival.grossWeight ? parseFloat(arrival.grossWeight.toString()).toFixed(0) : '-'}</td>
                                    <td>{arrival.tareWeight ? parseFloat(arrival.tareWeight.toString()).toFixed(0) : '-'}</td>
                                    <td><strong>{parseFloat(arrival.netWeight.toString()).toFixed(0)}</strong></td>
                                    <td>{arrival.moisture ? `${arrival.moisture}%` : '-'}</td>
                                    <td>{formatCutting(arrival.cutting)}</td>
                                    <td style={{ fontSize: '0.85rem' }}>{getDestination(arrival)}</td>
                                    <td>{arrival.wbNo}</td>
                                    <td>{arrival.lorryNumber}</td>
                                    <td>{arrival.creator?.username} <small>({arrival.creator?.role})</small></td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    const renderRiceProductionsTable = () => {
        if (loading) {
            return <LoadingState><div className="spinner">⏳</div><p>Loading...</p></LoadingState>;
        }

        if (pendingRiceProductions.length === 0) {
            return (
                <EmptyState>
                    <div className="icon">✅</div>
                    <h3>No Pending Rice Productions</h3>
                    <p>All rice production records have been processed!</p>
                </EmptyState>
            );
        }

        return (
            <>
                <ActionBar>
                    <ActionInfo>
                        <span className="count">{pendingRiceProductions.length} pending rice production(s)</span>
                        {selectedProductionIds.length > 0 && (
                            <span className="selected">{selectedProductionIds.length} selected</span>
                        )}
                    </ActionInfo>
                    <ActionButtons>
                        <Button
                            $variant="approve"
                            onClick={handleBulkApproveProductions}
                            disabled={selectedProductionIds.length === 0 || processing}
                        >
                            ✅ Approve ({selectedProductionIds.length})
                        </Button>
                        <Button
                            $variant="reject"
                            onClick={handleBulkRejectProductions}
                            disabled={selectedProductionIds.length === 0 || processing}
                        >
                            ❌ Reject ({selectedProductionIds.length})
                        </Button>
                    </ActionButtons>
                </ActionBar>
                <TableContainer className="table-container productions-table">
                    <Table>
                        <thead>
                            <tr>
                                <th className="checkbox-cell">
                                    <Checkbox
                                        type="checkbox"
                                        checked={selectedProductionIds.length === pendingRiceProductions.length && pendingRiceProductions.length > 0}
                                        onChange={(e) => handleSelectAllProductions(e.target.checked)}
                                    />
                                </th>
                                <th>Date</th>
                                <th>Mvmt Type</th>
                                <th>Bill No</th>
                                <th>Variety</th>
                                <th>Product Type</th>
                                <th>Bags</th>
                                <th>Bag Size</th>
                                <th>QTLS</th>
                                <th>Packaging</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Lorry No</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingRiceProductions.map(prod => {
                                const variety = prod.outturn?.type
                                    ? `${prod.outturn.allottedVariety} ${prod.outturn.type}`
                                    : prod.outturn?.allottedVariety || '-';
                                const fromLoc = prod.movementType === 'loading'
                                    ? prod.locationCode || '-'
                                    : `Outt1-${prod.outturn?.code || '?'}`;
                                const toLoc = prod.movementType === 'loading'
                                    ? 'DIRECT_LOAD'
                                    : prod.locationCode || '-';

                                return (
                                    <tr key={prod.id}>
                                        <td className="checkbox-cell">
                                            <Checkbox
                                                type="checkbox"
                                                checked={selectedProductionIds.includes(prod.id)}
                                                onChange={(e) => handleSelectProduction(prod.id, e.target.checked)}
                                            />
                                        </td>
                                        <td>{new Date(prod.date).toLocaleDateString('en-GB')}</td>
                                        <td>
                                            <TypeBadge $type="rice-production">
                                                {prod.movementType === 'loading' ? '📦 Loading' : '🏭 Production'}
                                            </TypeBadge>
                                        </td>
                                        <td>{prod.billNumber || '-'}</td>
                                        <td><strong>{variety}</strong></td>
                                        <td>
                                            <TypeBadge $type={prod.productType?.toLowerCase().includes('rice') ? 'purchase' : 'production-shifting'}>
                                                {prod.productType}
                                            </TypeBadge>
                                        </td>
                                        <td><strong>{prod.bags || 0}</strong></td>
                                        <td>{prod.packaging?.allottedKg || '-'}</td>
                                        <td><strong>{prod.quantityQuintals ? parseFloat(prod.quantityQuintals.toString()).toFixed(2) : '-'}</strong></td>
                                        <td>{prod.packaging?.brandName || '-'}</td>
                                        <td style={{ fontSize: '0.85rem' }}>{fromLoc}</td>
                                        <td style={{ fontSize: '0.85rem' }}>{toLoc}</td>
                                        <td>{prod.lorryNumber || '-'}</td>
                                        <td>
                                            <StatusBadge $status="pending">
                                                PENDING<br /><small>By: {prod.creator?.username || '?'}</small>
                                            </StatusBadge>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    const renderPurchaseRatesTable = () => {
        if (user?.role !== 'admin') {
            return (
                <EmptyState>
                    <div className="icon">🔒</div>
                    <h3>Admin Access Required</h3>
                    <p>Only administrators can approve purchase rates.</p>
                </EmptyState>
            );
        }

        if (loading) {
            return <LoadingState><div className="spinner">⏳</div><p>Loading...</p></LoadingState>;
        }

        if (pendingPurchaseRates.length === 0) {
            return (
                <EmptyState>
                    <div className="icon">✅</div>
                    <h3>No Pending Purchase Rates</h3>
                    <p>All purchase rates have been approved!</p>
                </EmptyState>
            );
        }

        return (
            <>
                <ActionBar>
                    <ActionInfo>
                        <span className="count">{pendingPurchaseRates.length} pending purchase rate(s)</span>
                        {selectedRateIds.length > 0 && (
                            <span className="selected">{selectedRateIds.length} selected</span>
                        )}
                    </ActionInfo>
                    <ActionButtons>
                        <Button
                            $variant="approve"
                            onClick={handleBulkApproveRates}
                            disabled={selectedRateIds.length === 0 || processing}
                        >
                            ✅ Approve ({selectedRateIds.length})
                        </Button>
                        <Button
                            $variant="reject"
                            onClick={handleBulkRejectRates}
                            disabled={selectedRateIds.length === 0 || processing}
                        >
                            ❌ Reject ({selectedRateIds.length})
                        </Button>
                    </ActionButtons>
                </ActionBar>
                <TableContainer className="table-container rates-table">
                    <Table>
                        <thead>
                            <tr>
                                <th className="checkbox-cell">
                                    <Checkbox
                                        type="checkbox"
                                        checked={selectedRateIds.length === pendingPurchaseRates.length && pendingPurchaseRates.length > 0}
                                        onChange={(e) => handleSelectAllRates(e.target.checked)}
                                    />
                                </th>
                                <th>Date</th>
                                <th>SL No</th>
                                <th>From</th>
                                <th>Destination</th>
                                <th>Variety</th>
                                <th>Bags</th>
                                <th>Net Weight</th>
                                <th>Rate Type</th>
                                <th>Amount Formula</th>
                                <th>Total Amount</th>
                                <th>Avg Rate/Q</th>
                                <th>Created By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingPurchaseRates.map(rate => {
                                // Calculate destination display
                                const getDestination = () => {
                                    if (rate.arrival?.movementType === 'for-production' && rate.arrival?.outturn) {
                                        return `→ Production (${rate.arrival.outturn.code})`;
                                    }
                                    if (rate.arrival?.toKunchinittu && rate.arrival?.toWarehouse) {
                                        return `${rate.arrival.toKunchinittu.code} - ${rate.arrival.toWarehouse.name}`;
                                    }
                                    if (rate.arrival?.toKunchinittu) {
                                        return rate.arrival.toKunchinittu.code;
                                    }
                                    return '-';
                                };

                                return (
                                    <tr key={rate.id}>
                                        <td className="checkbox-cell">
                                            <Checkbox
                                                type="checkbox"
                                                checked={selectedRateIds.includes(rate.id)}
                                                onChange={(e) => handleSelectRate(rate.id, e.target.checked)}
                                            />
                                        </td>
                                        <td>{rate.arrival?.date ? new Date(rate.arrival.date).toLocaleDateString('en-GB') : '-'}</td>
                                        <td><strong>{rate.arrival?.slNo}</strong></td>
                                        <td>{rate.arrival?.fromLocation || '-'}</td>
                                        <td style={{ fontSize: '0.85rem', color: rate.arrival?.movementType === 'for-production' ? '#7c3aed' : '#059669' }}>
                                            <strong>{getDestination()}</strong>
                                        </td>
                                        <td>{rate.arrival?.variety || '-'}</td>
                                        <td>{rate.arrival?.bags || '-'}</td>
                                        <td><strong>{rate.arrival?.netWeight ? parseFloat(rate.arrival.netWeight.toString()).toFixed(0) : '-'}</strong></td>
                                        <td>
                                            <TypeBadge $type="purchase-rate">{rate.rateType}</TypeBadge>
                                        </td>
                                        <td style={{ fontSize: '0.75rem', whiteSpace: 'pre-line' }}>{rate.amountFormula || '-'}</td>
                                        <td><strong>₹{parseFloat(rate.totalAmount.toString()).toFixed(2)}</strong></td>
                                        <td>₹{parseFloat(rate.averageRate.toString()).toFixed(2)}/Q</td>
                                        <td>{rate.creator?.username}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    // Render Rice Stock Table
    const renderRiceStockTable = () => {
        if (pendingRiceStock.length === 0) {
            return (
                <EmptyState>
                    <div className="icon">📦</div>
                    <h3>No Pending Rice Stock</h3>
                    <p>All rice stock movements have been approved!</p>
                </EmptyState>
            );
        }

        return (
            <>
                <ActionBar>
                    <SelectionInfo>
                        {selectedStockIds.length > 0
                            ? `${selectedStockIds.length} of ${pendingRiceStock.length} selected`
                            : `${pendingRiceStock.length} pending rice stock movement(s)`
                        }
                    </SelectionInfo>
                    <ActionButtons>
                        <RejectButton
                            onClick={handleBulkRejectRiceStock}
                            disabled={selectedStockIds.length === 0 || processing}
                        >
                            ✕ Reject ({selectedStockIds.length})
                        </RejectButton>
                        <ApproveButton
                            onClick={handleBulkApproveRiceStock}
                            disabled={selectedStockIds.length === 0 || processing}
                        >
                            ✓ Approve ({selectedStockIds.length})
                        </ApproveButton>
                    </ActionButtons>
                </ActionBar>
                <TableContainer className="table-container rstock-table">
                    <Table>
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedStockIds.length === pendingRiceStock.length && pendingRiceStock.length > 0}
                                        onChange={(e) => handleSelectAllRiceStock(e.target.checked)}
                                    />
                                </th>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Product</th>
                                <th>Variety/Packaging</th>
                                <th>Bags</th>
                                <th>Quantity (Q)</th>
                                <th>Location</th>
                                <th>Lorry</th>
                                <th>Bill</th>
                                <th>Created By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingRiceStock.map(movement => (
                                <tr key={movement.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedStockIds.includes(movement.id)}
                                            onChange={(e) => handleSelectRiceStock(movement.id, e.target.checked)}
                                        />
                                    </td>
                                    <td>{new Date(movement.date).toLocaleDateString('en-GB')}</td>
                                    <td>
                                        <TypeBadge $type={movement.movementType || 'sale'}>
                                            {movement.movementType?.charAt(0).toUpperCase() + movement.movementType?.slice(1)}
                                        </TypeBadge>
                                    </td>
                                    <td>{movement.productType}</td>
                                    <td>{movement.variety || movement.packagingBrand || '-'}</td>
                                    <td><strong>{movement.bags}</strong></td>
                                    <td>{movement.quantityQuintals ? parseFloat(movement.quantityQuintals.toString()).toFixed(2) : '-'}</td>
                                    <td>{movement.locationCode || '-'}</td>
                                    <td>{movement.lorryNumber || '-'}</td>
                                    <td>{movement.billNumber || '-'}</td>
                                    <td>{movement.creatorUsername} <RoleBadge $role={movement.creatorRole || 'staff'}>{movement.creatorRole}</RoleBadge></td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    // Render Paddy Hamali Table
    const renderPaddyHamaliTable = () => {
        if (pendingPaddyHamali.length === 0) {
            return (
                <EmptyState>
                    <div className="icon">🏋️</div>
                    <h3>No Pending Paddy Hamali</h3>
                    <p>All paddy hamali entries have been approved!</p>
                </EmptyState>
            );
        }

        return (
            <>
                <ActionBar>
                    <SelectionInfo>
                        {selectedPaddyHamaliIds.length > 0
                            ? `${selectedPaddyHamaliIds.length} of ${pendingPaddyHamali.length} selected`
                            : `${pendingPaddyHamali.length} pending paddy hamali entry/entries`
                        }
                    </SelectionInfo>
                    <ActionButtons>
                        <RejectButton
                            onClick={handleBulkRejectPaddyHamali}
                            disabled={selectedPaddyHamaliIds.length === 0 || processing}
                        >
                            ✕ Reject ({selectedPaddyHamaliIds.length})
                        </RejectButton>
                        <ApproveButton
                            onClick={handleBulkApprovePaddyHamali}
                            disabled={selectedPaddyHamaliIds.length === 0 || processing}
                        >
                            ✓ Approve ({selectedPaddyHamaliIds.length})
                        </ApproveButton>
                    </ActionButtons>
                </ActionBar>
                <TableContainer className="table-container paddyhamali-table">
                    <Table>
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedPaddyHamaliIds.length === pendingPaddyHamali.length && pendingPaddyHamali.length > 0}
                                        onChange={(e) => handleSelectAllPaddyHamali(e.target.checked)}
                                    />
                                </th>
                                <th>Date</th>
                                <th>SL No</th>
                                <th>Broker</th>
                                <th>Variety</th>
                                <th>Work Type</th>
                                <th>Work Detail</th>
                                <th>Bags</th>
                                <th>Rate</th>
                                <th>Amount</th>
                                <th>Worker</th>
                                <th>Created By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingPaddyHamali.map(entry => (
                                <tr key={entry.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedPaddyHamaliIds.includes(entry.id)}
                                            onChange={(e) => handleSelectPaddyHamali(entry.id, e.target.checked)}
                                        />
                                    </td>
                                    <td>{entry.arrival?.date ? new Date(entry.arrival.date).toLocaleDateString('en-GB') : '-'}</td>
                                    <td><strong>{entry.arrival?.slNo || '-'}</strong></td>
                                    <td>{entry.arrival?.broker || '-'}</td>
                                    <td>{entry.arrival?.variety || '-'}</td>
                                    <td><TypeBadge $type="paddy-hamali">{entry.workType}</TypeBadge></td>
                                    <td>{entry.workDetail}</td>
                                    <td><strong>{entry.bags}</strong></td>
                                    <td>₹{parseFloat(entry.rate.toString()).toFixed(2)}</td>
                                    <td><strong>₹{parseFloat(entry.amount.toString()).toFixed(2)}</strong></td>
                                    <td>{entry.workerName || '-'}</td>
                                    <td>{entry.addedByUser?.username} <RoleBadge $role={entry.addedByUser?.role || 'staff'}>{entry.addedByUser?.role}</RoleBadge></td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    // Render Rice Hamali Table
    const renderRiceHamaliTable = () => {
        if (pendingRiceHamali.length === 0) {
            return (
                <EmptyState>
                    <div className="icon">🍚</div>
                    <h3>No Pending Rice Hamali</h3>
                    <p>All rice hamali entries have been approved!</p>
                </EmptyState>
            );
        }

        return (
            <>
                <ActionBar>
                    <SelectionInfo>
                        {selectedRiceHamaliIds.length > 0
                            ? `${selectedRiceHamaliIds.length} of ${pendingRiceHamali.length} selected`
                            : `${pendingRiceHamali.length} pending rice hamali entry/entries`
                        }
                    </SelectionInfo>
                    <ActionButtons>
                        <RejectButton
                            onClick={handleBulkRejectRiceHamali}
                            disabled={selectedRiceHamaliIds.length === 0 || processing}
                        >
                            ✕ Reject ({selectedRiceHamaliIds.length})
                        </RejectButton>
                        <ApproveButton
                            onClick={handleBulkApproveRiceHamali}
                            disabled={selectedRiceHamaliIds.length === 0 || processing}
                        >
                            ✓ Approve ({selectedRiceHamaliIds.length})
                        </ApproveButton>
                    </ActionButtons>
                </ActionBar>
                <TableContainer className="table-container ricehamali-table">
                    <Table>
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedRiceHamaliIds.length === pendingRiceHamali.length && pendingRiceHamali.length > 0}
                                        onChange={(e) => handleSelectAllRiceHamali(e.target.checked)}
                                    />
                                </th>
                                <th>Date</th>
                                <th>Source</th>
                                <th>Work Type</th>
                                <th>Work Detail</th>
                                <th>Bags</th>
                                <th>Rate</th>
                                <th>Amount</th>
                                <th>Created By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingRiceHamali.map(entry => (
                                <tr key={entry.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedRiceHamaliIds.includes(entry.id)}
                                            onChange={(e) => handleSelectRiceHamali(entry.id, e.target.checked)}
                                        />
                                    </td>
                                    <td>{entry.productionDate ? new Date(entry.productionDate).toLocaleDateString('en-GB') : (entry.movementDate ? new Date(entry.movementDate).toLocaleDateString('en-GB') : '-')}</td>
                                    <td>
                                        {entry.rice_production_id ?
                                            <TypeBadge $type="production">{entry.productType || 'Production'}</TypeBadge> :
                                            <TypeBadge $type="shifting">{entry.movementType || 'Movement'}</TypeBadge>
                                        }
                                    </td>
                                    <td><TypeBadge $type="rice-hamali">{entry.workType}</TypeBadge></td>
                                    <td>{entry.workDetail}</td>
                                    <td><strong>{entry.bags}</strong></td>
                                    <td>₹{entry.rate ? parseFloat(entry.rate.toString()).toFixed(2) : '-'}</td>
                                    <td><strong>₹{entry.amount ? parseFloat(entry.amount.toString()).toFixed(2) : '-'}</strong></td>
                                    <td>{entry.creatorUsername} <RoleBadge $role={entry.creatorRole || 'staff'}>{entry.creatorRole}</RoleBadge></td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </TableContainer>
            </>
        );
    };

    return (
        <Container>
            <Header>
                <Title>📋 Pending Approvals</Title>
            </Header>

            <TabContainer>
                <Tab $active={activeTab === 'arrivals'} onClick={() => setActiveTab('arrivals')}>
                    Arrivals
                    {pendingArrivals.length > 0 && <Badge>{pendingArrivals.length}</Badge>}
                </Tab>
                <Tab $active={activeTab === 'rice-production'} onClick={() => setActiveTab('rice-production')}>
                    Rice Production
                    {pendingRiceProductions.length > 0 && <Badge>{pendingRiceProductions.length}</Badge>}
                </Tab>
                <Tab $active={activeTab === 'rice-stock'} onClick={() => setActiveTab('rice-stock')}>
                    Rice Stock
                    {pendingRiceStock.length > 0 && <Badge color="#0891b2">{pendingRiceStock.length}</Badge>}
                </Tab>
                <Tab $active={activeTab === 'paddy-hamali'} onClick={() => setActiveTab('paddy-hamali')}>
                    Paddy Hamali
                    {pendingPaddyHamali.length > 0 && <Badge color="#d97706">{pendingPaddyHamali.length}</Badge>}
                </Tab>
                <Tab $active={activeTab === 'rice-hamali'} onClick={() => setActiveTab('rice-hamali')}>
                    Rice Hamali
                    {pendingRiceHamali.length > 0 && <Badge color="#be185d">{pendingRiceHamali.length}</Badge>}
                </Tab>
                {user?.role === 'admin' && (
                    <Tab $active={activeTab === 'purchase-rates'} onClick={() => setActiveTab('purchase-rates')}>
                        Purchase Rates
                        {pendingPurchaseRates.length > 0 && <Badge color="#8b5cf6">{pendingPurchaseRates.length}</Badge>}
                    </Tab>
                )}
            </TabContainer>

            <ContentArea>
                {activeTab === 'arrivals' && renderArrivalsTable()}
                {activeTab === 'rice-production' && renderRiceProductionsTable()}
                {activeTab === 'rice-stock' && renderRiceStockTable()}
                {activeTab === 'paddy-hamali' && renderPaddyHamaliTable()}
                {activeTab === 'rice-hamali' && renderRiceHamaliTable()}
                {activeTab === 'purchase-rates' && renderPurchaseRatesTable()}
            </ContentArea>

            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                showInput={modalConfig.showInput}
                onConfirm={handleModalConfirm}
                onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                confirmText={modalConfig.type === 'approve' ? 'Approve' : (modalConfig.type === 'reject' ? 'Reject' : 'Confirm')}
            />
        </Container>
    );
};

export default PendingApprovals;
