import styled from 'styled-components';

// ═══════════════════════════════════════════════════════
// Extracted from Records.tsx — shared by all tab sub-components
// ═══════════════════════════════════════════════════════

export const Container = styled.div`
`;

export const Title = styled.h1`
  color: #ffffff;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
`;

export const TabContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
`;

export const Tab = styled.button<{ $active: boolean }>`
  padding: 1rem 2rem;
  border: none;
  background: ${props => props.$active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#6b7280'};
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.$active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f3f4f6'};
    color: ${props => props.$active ? 'white' : '#374151'};
  }
`;

export const FilterSection = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
`;

export const FilterRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Label = styled.label`
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
`;

export const InfoText = styled.p`
  color: #6b7280;
  font-size: 0.85rem;
  margin: 0;
`;

export const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

export const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

export const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &.primary {
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
    color: white;
  }

  &.success {
    background: #10b981;
    color: white;
  }

  &.secondary {
    background: #6b7280;
    color: white;
  }

  &.danger {
    background: #ef4444;
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

export const RecordsContainer = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
`;

export const DateGroup = styled.div<{ expanded: boolean }>`
  border-bottom: 1px solid #e5e7eb;
  
  &:last-child {
    border-bottom: none;
  }
`;

export const DateHeader = styled.div`
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

export const DateTitle = styled.h3`
  color: #1f2937;
  font-size: 1.1rem;
  margin: 0;
`;

export const RecordCount = styled.span`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
`;

export const TableContainer = styled.div`
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

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const Th = styled.th`
  background: #f8fafc;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  font-size: 0.9rem;
`;

export const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  color: #6b7280;
  text-transform: uppercase;
`;

export const StatusBadge = styled.span<{ status: string }>`
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

export const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

export const IconButton = styled.button`
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

export const PendingAlert = styled.div`
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-left: 4px solid #f59e0b;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);

  .count {
    background: #f59e0b;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 50%;
    font-weight: 700;
    font-size: 1.2rem;
    min-width: 50px;
    text-align: center;
  }

  .text {
    flex: 1;
    font-weight: 600;
    color: #92400e;
  }
`;

export const VarietyCell = styled.td<{ hasLocation?: boolean; isPurple?: boolean }>`
  background: ${props => props.hasLocation ? (props.isPurple ? '#e2d4ed !important' : '#d4edda !important') : 'inherit'};
  font-weight: ${props => props.hasLocation ? '600' : 'normal'};
  color: ${props => props.hasLocation ? (props.isPurple ? '#6b21a8' : '#155724') : 'inherit'};
`;

export const LocationCell = styled.td<{ hasLocation?: boolean; isPurple?: boolean }>`
  background: ${props => props.hasLocation ? (props.isPurple ? '#e2d4ed !important' : '#d4edda !important') : 'inherit'};
  font-weight: ${props => props.hasLocation ? '600' : 'normal'};
  color: ${props => props.hasLocation ? (props.isPurple ? '#6b21a8' : '#155724') : 'inherit'};
`;

export const ExcelTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Calibri', 'Arial', sans-serif;
  font-size: 10pt;
  background: white;

  thead {
    background: #4472c4;
    color: white;
    font-weight: bold;
  }

  th, td {
    border: 1px solid #d0d0d0;
    padding: 4px 6px;
    text-align: left;
  }

  th {
    font-weight: bold;
    white-space: nowrap;
    font-size: 9pt;
  }

  tbody tr:nth-child(even) {
    background: #f8f9fa;
  }

  tbody tr:hover {
    background: #e8f4f8;
  }
`;

export const PurchaseRow = styled.tr`
  background: #d4edda !important;
  
  &:hover {
    background: #c3e6cb !important;
  }
`;

export const ShiftingRow = styled.tr`
  background: #e2d4ed !important;
  
  &:hover {
    background: #d4c3e6 !important;
  }
`;

export const StockSection = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

export const StockDate = styled.h3`
  background: #4472c4;
  color: white;
  padding: 0.75rem 1rem;
  margin: -1.5rem -1.5rem 1rem;
  border-radius: 8px 8px 0 0;
  font-size: 1.1rem;
  font-weight: bold;
`;

export const StockSummary = styled.div`
  background: #fff3cd;
  border: 2px solid #ffc107;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 6px;
  font-weight: bold;
  font-size: 1.1rem;

  &.opening {
    background: #d1f2eb;
    border-color: #28a745;
  }

  &.closing {
    background: #f8d7da;
    border-color: #dc3545;
  }
`;

export const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;
`;

export const PDFButton = styled.button<{ $variant?: 'all' | 'filtered' }>`
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  background: ${props => props.$variant === 'filtered'
        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
        : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'};
  color: white;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => props.$variant === 'filtered'
        ? 'rgba(16, 185, 129, 0.3)'
        : 'rgba(220, 38, 38, 0.3)'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

export const PaginationStyled = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  background: #f8fafc;
`;

export const PageButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  background: ${props => props.$active ? '#f59e0b' : 'white'};
  color: ${props => props.$active ? 'white' : '#374151'};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: ${props => props.$active ? '#f59e0b' : '#fef3c7'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Rice Stock Styled Components
export const RiceStockSection = styled.div`
  background: white;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  overflow: hidden;
`;

export const RiceStockDateHeader = styled.div`
  background: #4a90e2;
  color: white;
  padding: 1rem 1.5rem;
  font-size: 1.2rem;
  font-weight: bold;
`;

export const RiceStockContent = styled.div`
  padding: 1rem 1.5rem;
`;

export const RiceStockItem = styled.div`
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
`;

export const RiceStockTotal = styled.div`
  font-weight: bold;
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  
  &.opening {
    border-bottom: 2px solid #ddd;
  }
  
  &.closing {
    border-top: 2px solid #ddd;
  }
`;

export const RiceStockQuantity = styled.span`
  font-weight: bold;
  min-width: 80px;
  color: #10b981;
`;

export const RiceStockDetails = styled.span`
  min-width: 200px;
  font-weight: 600;
`;

export const InlineRateFormStyled = styled.tr`
  background: #f8f9fa !important;
`;

export const RateFormCell = styled.td`
  padding: 2rem !important;
  border: 2px solid #10b981 !important;
`;

export const RateFormContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

export const RateFormTitle = styled.h3`
  color: #1f2937;
  margin: 0 0 1.5rem 0;
  font-size: 1.2rem;
  border-bottom: 2px solid #10b981;
  padding-bottom: 0.5rem;
`;

export const RateFormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

export const RateFormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const RateLabel = styled.label`
  font-weight: 600;
  color: #374151;
  font-size: 0.8rem;
`;

export const RateInput = styled.input`
  padding: 0.4rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.85rem;

  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

export const RateRadioGroup = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
`;

export const RateRadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #4b5563;
  cursor: pointer;
  white-space: nowrap;

  input[type="radio"] {
    cursor: pointer;
  }
`;

export const RateCalculationBox = styled.div`
  background: #f0fdf4;
  border: 1px solid #10b981;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  display: flex;
  gap: 2rem;
  align-items: center;
`;

export const RateCalcRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
`;

export const RateCalcLabel = styled.span`
  color: #065f46;
  font-weight: 600;
`;

export const RateCalcValue = styled.span`
  color: #047857;
  font-weight: 700;
`;

export const RateButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;
