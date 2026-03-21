import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  
  @media print {
    padding: 0;
    max-width: 100%;
  }
`;

const Title = styled.h1`
  color: #ffffff;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  
  @media print {
    display: none;
  }
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
  
  @media print {
    display: none;
  }
`;

const PrintContainer = styled.div`
  background: white;
  border: 3px solid #000;
  padding: 2rem;
  
  @media print {
    border: 2px solid #000;
    padding: 1rem;
    page-break-inside: avoid;
  }
`;

const PrintHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 3px solid #000;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
`;

const PrintTitle = styled.h2`
  font-size: 1.8rem;
  font-weight: bold;
  margin: 0;
`;

const PrintDate = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
`;

const WorkTypeSection = styled.div`
  margin-bottom: 2rem;
`;

const WorkTypeTitle = styled.div`
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #000;
`;

const EntryRow = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr;
  padding: 0.5rem 0;
  padding-left: 2rem;
  gap: 2rem;
  align-items: start;
`;

const Amount = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  text-align: right;
`;

const Details = styled.div`
  font-size: 1.1rem;
  line-height: 1.6;
`;

const TotalSection = styled.div`
  border-top: 3px solid #000;
  padding-top: 1.5rem;
  margin-top: 2rem;
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 2rem;
  padding-left: 2rem;
`;

const TotalAmount = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  text-align: right;
`;

const TotalLabel = styled.div`
  font-size: 1.3rem;
  font-weight: bold;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #9ca3af;
`;

interface Entry {
  id: number;
  workType: string;
  workDetail: string;
  rate: number;
  bags: number;
  amount: number;
  arrival: {
    slNo: string;
    broker: string;
    variety: string;
    date: string;
    movementType: 'purchase' | 'shifting' | 'production-shifting' | 'for-production' | 'loose';
    toKunchinittu?: {
      name: string;
      warehouse?: {
        name: string;
      };
    };
    toWarehouse?: {
      name: string;
    };
    fromKunchinittu?: {
      name: string;
      warehouse?: {
        name: string;
      };
    };
    fromWarehouse?: {
      name: string;
    };
    toWarehouseShift?: {
      name: string;
    };
    outturn?: {
      code: string;
    };
  };
}

const PaddyHamaliBook: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      fetchEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedDate) {
        params.dateFrom = selectedDate;
        params.dateTo = selectedDate;
      }

      const response = await axios.get<{ entries: Entry[]; total: number }>(
        '/paddy-hamali-entries/book',
        { params }
      );

      setEntries(response.data.entries || []);
    } catch (error: any) {
      console.error('Error fetching hamali book:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch hamali book');
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

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${numAmount.toFixed(0)}`;
  };

  // Group entries by work type
  const groupedByType = entries.reduce((acc, entry) => {
    if (!acc[entry.workType]) {
      acc[entry.workType] = [];
    }
    acc[entry.workType].push(entry);
    return acc;
  }, {} as { [key: string]: Entry[] });

  // Calculate total
  const total = entries.reduce((sum, entry) => {
    const amount = typeof entry.amount === 'string' ? parseFloat(entry.amount) : entry.amount;
    return sum + amount;
  }, 0);

  return (
    <Container>
      <Title>💰 Hamali Book</Title>

      <FilterSection>
        <label style={{ fontWeight: 600 }}>Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: '0.75rem',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '1rem'
          }}
        />
        {entries.length > 0 && (
          <button
            onClick={() => window.print()}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            📄 Print
          </button>
        )}
      </FilterSection>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
      ) : entries.length === 0 ? (
        <EmptyState>
          No hamali entries found for {formatDate(selectedDate)}
        </EmptyState>
      ) : (
        <PrintContainer>
          <PrintHeader>
            <PrintTitle>Hamali Book Summary</PrintTitle>
            <PrintDate>{formatDate(selectedDate)}</PrintDate>
          </PrintHeader>

          {Object.keys(groupedByType).map(workType => (
            <WorkTypeSection key={workType}>
              <WorkTypeTitle>{workType}:</WorkTypeTitle>
              {groupedByType[workType].map((entry) => {
                // Determine destination based on movement type
                let kunchinintuName = '';
                let warehouseName = '';
                let fromKunchinintuName = '';
                let fromWarehouseName = '';
                let outturnCode = '';
                
                if (entry.arrival) {
                  const { movementType } = entry.arrival;
                  
                  if (movementType === 'purchase') {
                    // Purchase: Show kunchinittu and warehouse OR outturn
                    if (entry.arrival.toKunchinittu) {
                      kunchinintuName = entry.arrival.toKunchinittu.name;
                      warehouseName = entry.arrival.toKunchinittu.warehouse?.name || '';
                    } else if (entry.arrival.toWarehouse) {
                      warehouseName = entry.arrival.toWarehouse.name;
                    } else if (entry.arrival.outturn) {
                      outturnCode = entry.arrival.outturn.code;
                    }
                  } else if (movementType === 'shifting') {
                    // Shifting: Show from kunchinittu/warehouse to kunchinittu/warehouse
                    if (entry.arrival.fromKunchinittu) {
                      fromKunchinintuName = entry.arrival.fromKunchinittu.name;
                      fromWarehouseName = entry.arrival.fromKunchinittu.warehouse?.name || '';
                    } else if (entry.arrival.fromWarehouse) {
                      fromWarehouseName = entry.arrival.fromWarehouse.name;
                    }
                    
                    if (entry.arrival.toKunchinittu) {
                      kunchinintuName = entry.arrival.toKunchinittu.name;
                      warehouseName = entry.arrival.toKunchinittu.warehouse?.name || '';
                    } else if (entry.arrival.toWarehouseShift) {
                      warehouseName = entry.arrival.toWarehouseShift.name;
                    } else if (entry.arrival.toWarehouse) {
                      warehouseName = entry.arrival.toWarehouse.name;
                    }
                  } else if (movementType === 'production-shifting') {
                    // Production Shifting: Show from kunchinittu/warehouse to outturn
                    if (entry.arrival.fromKunchinittu) {
                      fromKunchinintuName = entry.arrival.fromKunchinittu.name;
                      fromWarehouseName = entry.arrival.fromKunchinittu.warehouse?.name || '';
                    } else if (entry.arrival.fromWarehouse) {
                      fromWarehouseName = entry.arrival.fromWarehouse.name;
                    }
                    outturnCode = entry.arrival.outturn?.code || '';
                  } else {
                    // Other types: fallback
                    if (entry.arrival.toKunchinittu) {
                      kunchinintuName = entry.arrival.toKunchinittu.name;
                      warehouseName = entry.arrival.toKunchinittu.warehouse?.name || '';
                    } else if (entry.arrival.toWarehouse) {
                      warehouseName = entry.arrival.toWarehouse.name;
                    } else if (entry.arrival.outturn) {
                      outturnCode = entry.arrival.outturn.code;
                    }
                  }
                }
                
                // Build destination string
                let destinationStr = '';
                if (fromKunchinintuName || fromWarehouseName) {
                  // Shifting or production-shifting with from location
                  const fromStr = fromKunchinintuName 
                    ? `${fromKunchinintuName}${fromWarehouseName ? ' - ' + fromWarehouseName : ''}`
                    : fromWarehouseName;
                  const toStr = outturnCode 
                    ? outturnCode 
                    : kunchinintuName 
                      ? `${kunchinintuName}${warehouseName ? ' - ' + warehouseName : ''}`
                      : warehouseName;
                  destinationStr = `${fromStr} to ${toStr}`;
                } else {
                  // Purchase or simple destination
                  if (outturnCode) {
                    destinationStr = outturnCode;
                  } else if (kunchinintuName) {
                    destinationStr = `${kunchinintuName}${warehouseName ? ' - ' + warehouseName : ''}`;
                  } else if (warehouseName) {
                    destinationStr = warehouseName;
                  } else {
                    destinationStr = 'N/A';
                  }
                }
                
                return (
                  <EntryRow key={entry.id}>
                    <Amount>{formatCurrency(entry.amount)}</Amount>
                    <Details>
                      {entry.bags} Bags from {entry.arrival?.broker || 'N/A'} to {destinationStr}
                    </Details>
                  </EntryRow>
                );
              })}
            </WorkTypeSection>
          ))}

          <TotalSection>
            <TotalAmount>{formatCurrency(total)}</TotalAmount>
            <TotalLabel>Total</TotalLabel>
          </TotalSection>
        </PrintContainer>
      )}
    </Container>
  );
};

export default PaddyHamaliBook;
