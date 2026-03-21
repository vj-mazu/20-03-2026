import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  display: ${props => props.isOpen ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 2rem;
  overflow-y: auto;
  animation: fadeIn 0.3s ease-in;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 1000px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  margin: auto;
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

  /* Smooth scrolling */
  scroll-behavior: smooth;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #10b981;
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #059669;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 3px solid #10b981;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
`;

const ModalTitle = styled.h2`
  color: #1f2937;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: #f3f4f6;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.3s ease;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: #e5e7eb;
    color: #1f2937;
    transform: rotate(90deg);
  }
`;

const PendingList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PendingCard = styled.div`
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: flex-start;
  transition: all 0.3s ease;

  &:hover {
    border-color: #10b981;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const CardDetails = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const CardTitle = styled.div`
  font-weight: 700;
  font-size: 1.1rem;
  color: #1f2937;
  margin-bottom: 0.5rem;
  word-wrap: break-word;
`;

const CardInfo = styled.div`
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
  line-height: 1.5;
  word-wrap: break-word;
`;

const CardMeta = styled.div`
  font-size: 0.85rem;
  color: #9ca3af;
  margin-top: 0.5rem;
  line-height: 1.4;
  word-wrap: break-word;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  align-self: center;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: stretch;
    
    button {
      flex: 1;
    }
  }
`;

const ApproveButton = styled.button`
  background: #10b981;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #059669;
    transform: translateY(-2px);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }
`;

const BulkApproveButton = styled.button`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
  width: 100%;
  font-size: 1rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #9ca3af;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
`;

interface HamaliApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprovalComplete: () => void;
}

const HamaliApprovalModal: React.FC<HamaliApprovalModalProps> = ({
  isOpen,
  onClose,
  onApprovalComplete
}) => {
  const [pendingEntries, setPendingEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState<number | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPendingEntries();
    }
  }, [isOpen]);

  const fetchPendingEntries = async () => {
    setLoading(true);
    try {
      const response = await axios.get<{ entries: any[] }>('/hamali-entries?status=pending&limit=100');
      console.log('Pending hamali entries:', response.data);
      setPendingEntries(response.data.entries || []);
    } catch (error: any) {
      console.error('Error fetching pending hamali entries:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to fetch pending hamali entries');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (entryId: number) => {
    setApproving(entryId);
    try {
      await axios.post(`/hamali-entries/${entryId}/approve`);
      toast.success('Hamali entry approved successfully!');
      
      // Remove from list
      setPendingEntries(prev => prev.filter(e => e.id !== entryId));
      onApprovalComplete();
    } catch (error: any) {
      console.error('Error approving hamali entry:', error);
      toast.error(error.response?.data?.error || 'Failed to approve hamali entry');
    } finally {
      setApproving(null);
    }
  };

  const handleBulkApprove = async () => {
    if (pendingEntries.length === 0) return;

    setBulkApproving(true);
    try {
      let successCount = 0;
      let failCount = 0;

      // Approve all entries one by one
      for (const entry of pendingEntries) {
        try {
          await axios.post(`/hamali-entries/${entry.id}/approve`);
          successCount++;
        } catch (error) {
          console.error(`Failed to approve entry ${entry.id}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} hamali ${successCount === 1 ? 'entry' : 'entries'} approved successfully!`);
      }
      if (failCount > 0) {
        toast.warning(`${failCount} ${failCount === 1 ? 'entry' : 'entries'} failed to approve`);
      }

      // Refresh list
      fetchPendingEntries();
      onApprovalComplete();
    } catch (error) {
      toast.error('Failed to approve hamali entries');
    } finally {
      setBulkApproving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <ModalOverlay isOpen={isOpen} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>💰 Pending Hamali Approvals</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        {loading ? (
          <LoadingState>Loading pending hamali entries...</LoadingState>
        ) : pendingEntries.length === 0 ? (
          <EmptyState>
            <p>✓ No pending hamali entries</p>
          </EmptyState>
        ) : (
          <>
            <PendingList>
              {pendingEntries.map((entry) => (
                <PendingCard key={entry.id}>
                  <CardDetails>
                    <CardTitle>
                      ₹{(entry.grandTotal || 0).toFixed(0)} - {entry.arrival?.slNo || 'N/A'}
                    </CardTitle>
                    <CardInfo>
                      📅 {entry.date ? formatDate(entry.date) : 'No date'}
                    </CardInfo>
                    <CardInfo>
                      {entry.hasLoadingHamali && `Loading: ${entry.loadingBags || 0} bags × ₹${entry.loadingRate || 0}`}
                      {entry.hasLoadingHamali && entry.hasUnloadingHamali && ' | '}
                      {entry.hasUnloadingHamali && `Unloading (${entry.unloadingType?.toUpperCase() || 'N/A'}): ${entry.unloadingBags || 0} bags × ₹${entry.unloadingRate || 0}`}
                      {(entry.hasLoadingHamali || entry.hasUnloadingHamali) && entry.hasLooseTumbiddu && ' | '}
                      {entry.hasLooseTumbiddu && `Loose: ${entry.looseBags || 0} bags × ₹${entry.looseRate || 0}`}
                    </CardInfo>
                    <CardMeta>
                      Created by: {entry.creator?.username || 'Unknown'} • {entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-GB') : 'Unknown date'}
                    </CardMeta>
                  </CardDetails>
                  <ButtonGroup>
                    <ApproveButton
                      onClick={() => handleApprove(entry.id)}
                      disabled={approving === entry.id}
                    >
                      {approving === entry.id ? '⏳' : '✓'} Approve
                    </ApproveButton>
                  </ButtonGroup>
                </PendingCard>
              ))}
            </PendingList>

            <BulkApproveButton
              onClick={handleBulkApprove}
              disabled={bulkApproving || pendingEntries.length === 0}
            >
              {bulkApproving ? '⏳ Approving All...' : `✓ Approve All (${pendingEntries.length})`}
            </BulkApproveButton>
          </>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default HamaliApprovalModal;
