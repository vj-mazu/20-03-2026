import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  animation: fadeIn 0.5s ease-in;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
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

const FilterSection = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const DateInput = styled.input`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

const SummaryCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 2px solid #e5e7eb;
`;

const SectionTitle = styled.h3`
  color: #374151;
  margin-bottom: 1.5rem;
  font-size: 1.3rem;
  font-weight: 700;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const EntryCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 12px;
  margin-bottom: 1rem;
  border: 2px solid #e5e7eb;
  transition: all 0.3s ease;

  &:hover {
    border-color: #10b981;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
  }
`;

const MainContent = styled.div`
  flex: 1;
  padding-right: 1rem;
`;

const TotalBags = styled.div`
  font-size: 1.4rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 0.5rem;
`;

const WorkDetails = styled.div`
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
`;

const Amount = styled.div`
  font-size: 1.6rem;
  font-weight: bold;
  color: #10b981;
  background: white;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  border: 2px solid #10b981;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  min-width: 120px;
  text-align: center;
`;

const SplitsPanel = styled.div`
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid #10b981;
  min-width: 250px;
  margin-left: 1rem;
`;

const SplitsHeader = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #059669;
  margin-bottom: 0.75rem;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SplitRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #d1fae5;
  
  &:last-child {
    border-bottom: none;
    border-top: 2px solid #10b981;
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    font-weight: bold;
    color: #059669;
  }
`;

const WorkerName = styled.span`
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9rem;
`;

const BagCount = styled.span`
  color: #059669;
  font-weight: 600;
  font-size: 0.9rem;
`;

const OtherHamaliSection = styled.div`
  margin-top: 3rem;
  border-top: 3px solid #f59e0b;
  padding-top: 2rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  padding: 2rem;
  border: 2px solid #f59e0b;
`;

const OtherSectionTitle = styled.h3`
  color: #92400e;
  margin-bottom: 1.5rem;
  font-size: 1.3rem;
  font-weight: 700;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const OtherEntryCard = styled.div`
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  margin-bottom: 1rem;
  border: 2px solid #f59e0b;
  transition: all 0.3s ease;
  min-height: 120px;

  &:hover {
    border-color: #d97706;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
  }
`;

const OtherAmount = styled.div`
  font-size: 1.6rem;
  font-weight: bold;
  color: #d97706;
  background: white;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  border: 2px solid #f59e0b;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  min-width: 120px;
  text-align: center;
`;

const OtherSplitsPanel = styled.div`
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid #f59e0b;
  min-width: 250px;
  margin-left: 1rem;
`;

const OtherSplitsHeader = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #d97706;
  margin-bottom: 0.75rem;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const OtherSplitRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #fde68a;
  
  &:last-child {
    border-bottom: none;
    border-top: 2px solid #f59e0b;
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    font-weight: bold;
    color: #d97706;
  }
`;

const OtherBagCount = styled.span`
  color: #d97706;
  font-weight: 600;
  font-size: 0.9rem;
`;

const GrandTotalCard = styled.div`
  margin-top: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
  border-radius: 12px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
`;

const GrandTotalLabel = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
`;

const GrandTotalAmount = styled.div`
  font-size: 2rem;
  font-weight: bold;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  font-size: 1.1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #9ca3af;
  font-size: 1.1rem;
`;

interface HamaliSummary {
  loadingEntries?: any[];
  unloadingEntries?: any[];
  looseEntries?: any[];
  cuttingEntries?: any[];
  plottingEntries?: any[];
  shiftingEntries?: any[];
  fillingEntries?: any[];
  otherHamaliEntries?: { [key: string]: any };
  grandTotal: number;
  totalEntries: number;
}

const HamaliBookNew: React.FC = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [summary, setSummary] = useState<HamaliSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, [selectedDate]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const dateStr = selectedDate;

      console.log('🔍 Fetching hamali summary for date:', dateStr);

      // Fetch both paddy hamali and other hamali summaries
      const [paddyResponse, otherResponse] = await Promise.all([
        axios.get<{ summary: any }>(`/paddy-hamali-entries/summary/${dateStr}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        }),
        axios.get<{ summary: any }>(`/other-hamali-entries/summary/${dateStr}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        })
      ]);

      console.log('✅ Paddy Response:', paddyResponse.data);
      console.log('✅ Other Response:', otherResponse.data);

      // Combine summaries
      const paddySummary = paddyResponse.data.summary || {};
      const otherSummary = otherResponse.data.summary || {};

      const combinedSummary: HamaliSummary = {
        ...paddySummary,
        otherHamaliEntries: otherSummary.otherHamaliEntries || {},
        grandTotal: (paddySummary.grandTotal || 0) + (otherSummary.grandTotal || 0),
        totalEntries: (paddySummary.totalEntries || 0) + (otherSummary.totalEntries || 0)
      };

      console.log('🎯 Combined Summary:', combinedSummary);

      setSummary(combinedSummary);
    } catch (error) {
      console.error('Error fetching hamali summary:', error);
      toast.error('Failed to fetch hamali summary');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    });
  };

  const formatLocationDisplay = (arrival: any) => {
    if (!arrival) return 'Unknown Location';
    
    const movementType = arrival.movementType;
    const broker = arrival.broker || 'Unknown Broker';
    
    if (movementType === 'purchase') {
      // Check if it's purchase to outturn (has outturn assigned)
      if (arrival.outturn && arrival.outturn.code) {
        return `${arrival.bags || 0} Bags from ${broker} to Outturn ${arrival.outturn.code}`;
      } else {
        // Regular purchase to kunchinittu warehouse
        const kunchinittu = arrival.toKunchinittu?.name || arrival.toKunchinittu?.code || 'Unknown KN';
        const warehouse = arrival.toWarehouse?.name || arrival.toWarehouse?.code || 'Unknown Warehouse';
        return `${arrival.bags || 0} Bags from ${broker} to ${kunchinittu} ${warehouse}`;
      }
    } else if (movementType === 'shifting') {
      // Shifting: bags from kunchinittu warehouse to kunchinittu warehouse
      const fromKN = arrival.fromKunchinittu?.name || arrival.fromKunchinittu?.code || 'Unknown KN';
      const fromWH = arrival.fromWarehouse?.name || arrival.fromWarehouse?.code || 'Unknown Warehouse';
      const toKN = arrival.toKunchinittu?.name || arrival.toKunchinittu?.code || 'Unknown KN';
      const toWH = arrival.toWarehouseShift?.name || arrival.toWarehouseShift?.code || arrival.toWarehouse?.name || 'Unknown Warehouse';
      return `${arrival.bags || 0} Bags from ${fromKN} ${fromWH} to ${toKN} ${toWH}`;
    } else if (movementType === 'production-shifting' || movementType === 'production') {
      // Production shifting: bags from kunchinittu warehouse to outturn number
      const fromKN = arrival.fromKunchinittu?.name || arrival.fromKunchinittu?.code || 'Unknown KN';
      const fromWH = arrival.fromWarehouse?.name || arrival.fromWarehouse?.code || 'Unknown Warehouse';
      const outturn = arrival.outturn?.code || 'Unknown Outturn';
      return `${arrival.bags || 0} Bags from ${fromKN} ${fromWH} to Outturn ${outturn}`;
    }
    
    // Fallback for unknown movement types
    return `${arrival.bags || 0} Bags from ${broker} to ${arrival.toKunchinittu?.name || 'Unknown Location'}`;
  };

  const renderPaddySection = (entries: any[], title: string, icon: string) => {
    if (!entries || entries.length === 0) return null;

    return (
      <div style={{ marginBottom: '2rem' }}>
        <SectionTitle>
          {icon} {title}
        </SectionTitle>
        {entries.map((entry: any, index: number) => (
          <EntryCard key={index}>
            <MainContent>
              <TotalBags>
                📦 {entry.totalBags} Bags from {formatLocationDisplay(entry.arrival)}
              </TotalBags>
              <WorkDetails>
                📋 {entry.workDetail}
              </WorkDetails>
              <WorkDetails style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                🏢 Movement: {entry.arrival?.movementType?.toUpperCase() || 'Unknown'}
              </WorkDetails>
            </MainContent>
            
            {entry.splits && entry.splits.length > 0 && (
              <SplitsPanel>
                <SplitsHeader>Batch Splits</SplitsHeader>
                {entry.splits.map((split: any, splitIndex: number) => (
                  <SplitRow key={splitIndex}>
                    <WorkerName>
                      Batch {split.batchNumber}: {split.workerName}
                    </WorkerName>
                    <BagCount>{split.bags} bags</BagCount>
                  </SplitRow>
                ))}
                <SplitRow>
                  <WorkerName>Total:</WorkerName>
                  <BagCount>{entry.splits.reduce((sum: number, s: any) => sum + s.bags, 0)} bags</BagCount>
                </SplitRow>
              </SplitsPanel>
            )}
            
            <Amount>₹{entry.totalAmount.toFixed(0)}</Amount>
          </EntryCard>
        ))}
      </div>
    );
  };

  const renderOtherHamaliSection = () => {
    if (!summary?.otherHamaliEntries || Object.keys(summary.otherHamaliEntries).length === 0) {
      return null;
    }

    return (
      <OtherHamaliSection>
        <OtherSectionTitle>
          🔧 Other Hamali Works
        </OtherSectionTitle>
        
        {Object.entries(summary.otherHamaliEntries).map(([entryKey, entry]: [string, any]) => (
          <OtherEntryCard key={entryKey}>
            <MainContent>
              <TotalBags>
                📦 {entry.totalBags} Bags from {formatLocationDisplay(entry.arrival)}
              </TotalBags>
              <WorkDetails>
                🔨 {entry.workType}
              </WorkDetails>
              <WorkDetails>
                📋 Details: {entry.workDetail}
              </WorkDetails>
              {entry.description && (
                <WorkDetails>
                  📝 Description: {entry.description}
                </WorkDetails>
              )}
              <WorkDetails style={{ fontSize: '0.8rem', color: '#92400e' }}>
                🏢 Movement: {entry.arrival?.movementType?.toUpperCase() || 'Unknown'}
              </WorkDetails>
            </MainContent>
            
            <OtherAmount>₹{entry.totalAmount.toFixed(0)}</OtherAmount>
            
            {entry.splits && entry.splits.length > 0 && (
              <OtherSplitsPanel style={{ position: 'absolute', bottom: '1rem', right: '1rem' }}>
                <OtherSplitsHeader>Batch Splits</OtherSplitsHeader>
                {entry.splits.map((split: any, splitIndex: number) => (
                  <OtherSplitRow key={splitIndex}>
                    <WorkerName>
                      Batch {split.batchNumber}: {split.workerName}
                    </WorkerName>
                    <OtherBagCount>{split.bags} bags</OtherBagCount>
                  </OtherSplitRow>
                ))}
                <OtherSplitRow>
                  <WorkerName>Total:</WorkerName>
                  <OtherBagCount>{entry.splits.reduce((sum: number, s: any) => sum + s.bags, 0)} bags</OtherBagCount>
                </OtherSplitRow>
              </OtherSplitsPanel>
            )}
          </OtherEntryCard>
        ))}
      </OtherHamaliSection>
    );
  };

  return (
    <Container>
      <Title>📖 Perfect Hamali Book Summary</Title>

      <FilterSection>
        <label style={{ fontWeight: '600', color: '#374151' }}>Select Date:</label>
        <DateInput
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        {summary && summary.totalEntries > 0 && (
          <button
            onClick={() => window.print()}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            📄 Download PDF
          </button>
        )}
      </FilterSection>

      {loading ? (
        <LoadingState>Loading hamali summary...</LoadingState>
      ) : !summary || summary.totalEntries === 0 ? (
        <EmptyState>
          <p>No approved hamali entries found for {formatDate(selectedDate)}</p>
        </EmptyState>
      ) : (
        <SummaryCard>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '2rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <h2 style={{ color: '#1f2937', margin: 0, fontSize: '1.5rem' }}>
              Hamali Book Summary
            </h2>
            <div style={{ color: '#6b7280', fontSize: '1.1rem', fontWeight: '600' }}>
              {formatDate(selectedDate)}
            </div>
          </div>

          {/* Paddy Hamali Sections */}
          {renderPaddySection(summary.loadingEntries || [], 'Paddy Loading Hamali', '🚛')}
          {renderPaddySection(summary.unloadingEntries || [], 'Paddy Unloading Hamali', '📦')}
          {renderPaddySection(summary.looseEntries || [], 'Loose Tumbiddu', '🌾')}
          {renderPaddySection(summary.cuttingEntries || [], 'Paddy Cutting', '✂️')}
          {renderPaddySection(summary.plottingEntries || [], 'Plotting', '📐')}
          {renderPaddySection(summary.shiftingEntries || [], 'Paddy Shifting', '🔄')}
          {renderPaddySection(summary.fillingEntries || [], 'Paddy Filling with Stitching', '🧵')}

          {/* Other Hamali Works Section */}
          {renderOtherHamaliSection()}

          {/* Grand Total */}
          <GrandTotalCard>
            <GrandTotalLabel>Grand Total (Paddy + Other Hamali)</GrandTotalLabel>
            <GrandTotalAmount>₹{summary.grandTotal.toFixed(0)}</GrandTotalAmount>
          </GrandTotalCard>
        </SummaryCard>
      )}
    </Container>
  );
};

export default HamaliBookNew;