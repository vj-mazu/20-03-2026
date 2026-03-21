import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-in;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  width: 95%;
  max-width: 1400px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModalHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 12px 12px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 {
    margin: 0;
    font-size: 1.5rem;
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: rotate(90deg);
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const InfoBar = styled.div`
  background: #f0f4ff;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .count {
    font-size: 1.2rem;
    font-weight: bold;
    color: #667eea;
  }

  .selected {
    font-size: 1rem;
    color: #374151;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;

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

const Badge = styled.span<{ type: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  
  ${props => {
    switch (props.type) {
      case 'purchase':
        return 'background: #dbeafe; color: #1e40af;';
      case 'shifting':
        return 'background: #fef3c7; color: #92400e;';
      case 'production-shifting':
        return 'background: #fce7f3; color: #9f1239;';
      default:
        return 'background: #e5e7eb; color: #374151;';
    }
  }}
`;

const ModalFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const Button = styled.button<{ variant?: string }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;

  ${props => {
    switch (props.variant) {
      case 'approve':
        return `
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }
        `;
      case 'reject':
        return `
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          }
        `;
      default:
        return `
          background: #e5e7eb;
          color: #374151;
          &:hover {
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

interface Arrival {
  id: number;
  slNo: string;
  date: string;
  movementType: string;
  variety?: string;
  bags?: number;
  netWeight: number;
  wbNo: string;
  lorryNumber: string;
  creator?: { username: string };
  toKunchinittu?: { name: string; code: string };
  toWarehouse?: { name: string; code: string };
  fromKunchinittu?: { name: string; code: string };
  fromWarehouse?: { name: string; code: string };
  toWarehouseShift?: { name: string; code: string };
}

interface BulkApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprovalComplete?: () => void;
}

const BulkApprovalModal: React.FC<BulkApprovalModalProps> = ({ isOpen, onClose, onApprovalComplete }) => {
  const { user } = useAuth();
  const [pendingArrivals, setPendingArrivals] = useState<Arrival[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPendingArrivals();
      setSelectedIds([]);
    }
  }, [isOpen]);

  const fetchPendingArrivals = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/arrivals/pending-list');
      const data = response.data as { approvals: Arrival[] };
      setPendingArrivals(data.approvals || []);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast.error('Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(pendingArrivals.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Please select at least one record to approve');
      return;
    }

    if (!window.confirm(`Are you sure you want to approve ${selectedIds.length} record(s)?`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post('/arrivals/bulk-approve', {
        arrivalIds: selectedIds
      });

      const data = response.data as { message: string };
      toast.success(data.message);
      
      // Refresh the list
      await fetchPendingArrivals();
      setSelectedIds([]);
      
      if (onApprovalComplete) {
        onApprovalComplete();
      }
    } catch (error) {
      console.error('Error bulk approving:', error);
      toast.error('Failed to approve records');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Please select at least one record to reject');
      return;
    }

    const remarks = window.prompt('Enter rejection reason (optional):');
    if (remarks === null) return; // User cancelled

    if (!window.confirm(`Are you sure you want to reject ${selectedIds.length} record(s)?`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post('/arrivals/bulk-reject', {
        arrivalIds: selectedIds,
        remarks
      });

      const data = response.data as { message: string };
      toast.success(data.message);
      
      // Refresh the list
      await fetchPendingArrivals();
      setSelectedIds([]);
      
      if (onApprovalComplete) {
        onApprovalComplete();
      }
    } catch (error) {
      console.error('Error bulk rejecting:', error);
      toast.error('Failed to reject records');
    } finally {
      setProcessing(false);
    }
  };

  const getDestination = (arrival: Arrival) => {
    if (arrival.movementType === 'purchase') {
      return `${arrival.toKunchinittu?.code || ''} - ${arrival.toWarehouse?.name || ''}`;
    } else if (arrival.movementType === 'shifting') {
      return `${arrival.fromKunchinittu?.code || ''} ${arrival.fromWarehouse?.name || ''} → ${arrival.toWarehouseShift?.name || ''}`;
    } else if (arrival.movementType === 'production-shifting') {
      return `${arrival.fromKunchinittu?.code || ''} - ${arrival.fromWarehouse?.name || ''} → Production`;
    }
    return '-';
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h2>
            {user?.role === 'manager' ? '📋 Pending Manager Approvals' : '🔵 Pending Admin Approvals'}
          </h2>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <ModalBody>
          {loading ? (
            <EmptyState>
              <div className="icon">⏳</div>
              <h3>Loading pending approvals...</h3>
            </EmptyState>
          ) : pendingArrivals.length === 0 ? (
            <EmptyState>
              <div className="icon">✅</div>
              <h3>No Pending Approvals</h3>
              <p>All records have been processed!</p>
            </EmptyState>
          ) : (
            <>
              <InfoBar>
                <div className="count">
                  {pendingArrivals.length} record(s) pending approval
                </div>
                <div className="selected">
                  {selectedIds.length > 0 && `${selectedIds.length} selected`}
                </div>
              </InfoBar>

              <TableContainer>
                <Table>
                  <thead>
                    <tr>
                      <th className="checkbox-cell">
                        <Checkbox
                          type="checkbox"
                          checked={selectedIds.length === pendingArrivals.length && pendingArrivals.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th>Date</th>
                      <th>SL No</th>
                      <th>Type</th>
                      <th>Variety</th>
                      <th>Bags</th>
                      <th>Net Wt (kg)</th>
                      <th>Destination/Route</th>
                      <th>WB No</th>
                      <th>Lorry</th>
                      <th>Created By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingArrivals.map((arrival) => (
                      <tr key={arrival.id}>
                        <td className="checkbox-cell">
                          <Checkbox
                            type="checkbox"
                            checked={selectedIds.includes(arrival.id)}
                            onChange={(e) => handleSelectOne(arrival.id, e.target.checked)}
                          />
                        </td>
                        <td>{new Date(arrival.date).toLocaleDateString('en-GB')}</td>
                        <td><strong>{arrival.slNo}</strong></td>
                        <td>
                          <Badge type={arrival.movementType}>
                            {arrival.movementType === 'production-shifting' ? 'Production' : arrival.movementType}
                          </Badge>
                        </td>
                        <td>{arrival.variety || '-'}</td>
                        <td>{arrival.bags || '-'}</td>
                        <td>{parseFloat(arrival.netWeight.toString()).toFixed(2)}</td>
                        <td style={{ fontSize: '0.85rem' }}>{getDestination(arrival)}</td>
                        <td>{arrival.wbNo}</td>
                        <td>{arrival.lorryNumber}</td>
                        <td>{arrival.creator?.username}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableContainer>
            </>
          )}
        </ModalBody>

        {pendingArrivals.length > 0 && (
          <ModalFooter>
            <Button onClick={onClose}>
              Close
            </Button>
            <Button
              variant="reject"
              onClick={handleBulkReject}
              disabled={selectedIds.length === 0 || processing}
            >
              ❌ Reject Selected ({selectedIds.length})
            </Button>
            <Button
              variant="approve"
              onClick={handleBulkApprove}
              disabled={selectedIds.length === 0 || processing}
            >
              ✅ Approve Selected ({selectedIds.length})
            </Button>
          </ModalFooter>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default BulkApprovalModal;
