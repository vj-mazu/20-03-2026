import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import InlinePaddyHamaliForm from '../components/InlinePaddyHamaliForm';

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

const Tab = styled.button<{ active: boolean }>`
  padding: 1rem 2rem;
  border: none;
  background: ${props => props.active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent'};
  color: ${props => props.active ? 'white' : '#6b7280'};
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: all 0.3s ease;
  font-size: 1.1rem;

  &:hover {
    background: ${props => props.active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f3f4f6'};
    color: ${props => props.active ? 'white' : '#374151'};
  }
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

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &.primary {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
  }

  &.secondary {
    background: #6b7280;
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

const RecordsContainer = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
`;

const DateGroup = styled.div`
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

const TableContainer = styled.div`
  overflow-x: auto;
  width: 100%;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  background: #f8fafc;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  font-size: 0.9rem;
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  color: #6b7280;
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;
`;

const LoadingState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;
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

interface Arrival {
  id: number;
  slNo: string;
  date: string;
  movementType: string;
  broker?: string;
  variety?: string;
  bags?: number;
  fromLocation?: string;
  toKunchinittu?: { name: string; code?: string };
  toWarehouse?: { name: string; code?: string };
  fromKunchinittu?: { name: string; code?: string };
  fromWarehouse?: { name: string; code?: string };
  toWarehouseShift?: { name: string; code?: string };
  moisture?: number;
  cutting?: string;
  wbNo: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  lorryNumber: string;
  status: string;
  creator?: { username: string };
}

const HamaliEnhanced: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'paddy' | 'rice'>('paddy');
  const [records, setRecords] = useState<{ [key: string]: Arrival[] }>({});
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hamaliEntries, setHamaliEntries] = useState<{ [key: number]: any }>({});
  const [riceHamaliEntries, setRiceHamaliEntries] = useState<{ [key: number]: any }>({});

  // Get business date (if before 6 AM, use previous day)
  const getBusinessDate = () => {
    const now = new Date();
    const hours = now.getHours();

    if (hours < 6) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }

    return now.toISOString().split('T')[0];
  };

  useEffect(() => {
    // Set default date to business date
    const businessDate = getBusinessDate();
    setDateFrom(businessDate);
    setDateTo(businessDate);
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchRecords();
    }
  }, [dateFrom, dateTo, activeTab]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params: any = {
        dateFrom,
        dateTo,
        page: 1,
        limit: 200
      };

      const response = await axios.get<{ records: { [key: string]: Arrival[] } }>('/records/arrivals', { params });

      if (response.data.records) {
        setRecords(response.data.records);

        // Fetch hamali entries for all arrivals
        const allArrivalIds = Object.values(response.data.records)
          .flat()
          .map((record: Arrival) => record.id);

        if (allArrivalIds.length > 0) {
          if (activeTab === 'paddy') {
            await fetchPaddyHamaliEntries(allArrivalIds);
          } else {
            await fetchRiceHamaliEntries(allArrivalIds);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      toast.error('Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaddyHamaliEntries = async (arrivalIds: number[]) => {
    try {
      const response = await axios.post<{ entries: { [key: number]: any } }>('/paddy-hamali-entries/batch', { arrivalIds });
      if (response.data.entries) {
        setHamaliEntries(response.data.entries);
      }
    } catch (error) {
      console.error('Error fetching paddy hamali entries:', error);
    }
  };

  const fetchRiceHamaliEntries = async (arrivalIds: number[]) => {
    try {
      const response = await axios.post<{ entries: { [key: number]: any } }>('/rice-hamali-entries/batch', { arrivalIds });
      if (response.data.entries) {
        setRiceHamaliEntries(response.data.entries);
      }
    } catch (error) {
      console.error('Error fetching rice hamali entries:', error);
    }
  };

  const toggleDateExpansion = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const handleSearch = () => {
    if (!dateFrom || !dateTo) {
      toast.error('Please select both from and to dates');
      return;
    }
    fetchRecords();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getCurrentHamaliEntries = () => {
    return activeTab === 'paddy' ? hamaliEntries : riceHamaliEntries;
  };

  const getHamaliStatus = (recordId: number) => {
    const entries = getCurrentHamaliEntries()[recordId];
    if (!entries || entries.entryCount === 0) {
      return { hasEntries: false, count: 0, totalAmount: 0 };
    }
    return {
      hasEntries: true,
      count: entries.entryCount,
      totalAmount: entries.totalAmount
    };
  };

  return (
    <Container>
      <Title>
        💰 Hamali Management System
      </Title>

      <TabContainer>
        <Tab active={activeTab === 'paddy'} onClick={() => setActiveTab('paddy')}>
          🌾 Paddy Hamali
        </Tab>
        <Tab active={activeTab === 'rice'} onClick={() => setActiveTab('rice')}>
          🍚 Rice Hamali
        </Tab>
      </TabContainer>

      <InfoBox>
        📅 Currently showing: <strong>{activeTab === 'paddy' ? 'Paddy' : 'Rice'} Hamali</strong> entries for selected dates
      </InfoBox>

      <FilterSection>
        <FilterRow>
          <FormGroup>
            <Label>From Date</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <Label>To Date</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <Button className="primary" onClick={handleSearch} disabled={loading}>
              {loading ? 'Loading...' : '🔍 Search Records'}
            </Button>
          </FormGroup>
        </FilterRow>
      </FilterSection>

      {loading ? (
        <RecordsContainer>
          <LoadingState>
            <div>Loading {activeTab} hamali records...</div>
          </LoadingState>
        </RecordsContainer>
      ) : Object.keys(records).length === 0 ? (
        <RecordsContainer>
          <EmptyState>
            <div>No records found for the selected date range</div>
          </EmptyState>
        </RecordsContainer>
      ) : (
        <RecordsContainer>
          {Object.entries(records)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, dateRecords]) => (
              <DateGroup key={date}>
                <DateHeader onClick={() => toggleDateExpansion(date)}>
                  <DateTitle>
                    📅 {formatDate(date)}
                  </DateTitle>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <RecordCount>
                      {dateRecords.length} record{dateRecords.length !== 1 ? 's' : ''}
                    </RecordCount>
                    <span style={{ color: '#6b7280' }}>
                      {expandedDates.has(date) ? '▼' : '▶'}
                    </span>
                  </div>
                </DateHeader>

                {expandedDates.has(date) && (
                  <TableContainer>
                    <Table>
                      <thead>
                        <tr>
                          <Th>SL No</Th>
                          <Th>Type</Th>
                          <Th>Broker</Th>
                          <Th>Variety</Th>
                          <Th>Bags</Th>
                          <Th>Net Weight</Th>
                          <Th>Lorry Number</Th>
                          <Th>{activeTab === 'paddy' ? 'Paddy' : 'Rice'} Hamali</Th>
                          <Th>Actions</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {dateRecords.map((record) => {
                          const hamaliStatus = getHamaliStatus(record.id);

                          return (
                            <tr key={record.id}>
                              <Td>{record.slNo}</Td>
                              <Td>{record.movementType}</Td>
                              <Td>{record.broker || '-'}</Td>
                              <Td>{record.variety || '-'}</Td>
                              <Td>{record.bags || '-'}</Td>
                              <Td>{record.netWeight ? `${record.netWeight} kg` : '-'}</Td>
                              <Td>{record.lorryNumber}</Td>
                              <Td>
                                {hamaliStatus.hasEntries ? (
                                  <div style={{
                                    background: '#d1fae5',
                                    color: '#059669',
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    textAlign: 'center'
                                  }}>
                                    ✓ {hamaliStatus.count} entries
                                    <br />
                                    ₹{hamaliStatus.totalAmount.toFixed(2)}
                                  </div>
                                ) : (
                                  <div style={{
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    textAlign: 'center'
                                  }}>
                                    No entries
                                  </div>
                                )}
                              </Td>
                              <Td>
                                <Button
                                  className="primary"
                                  style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.9rem',
                                    background: hamaliStatus.hasEntries
                                      ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                  }}
                                >
                                  {hamaliStatus.hasEntries ? '✓ View/Edit' : '+ Add'} {activeTab === 'paddy' ? 'Paddy' : 'Rice'} Hamali
                                </Button>
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </TableContainer>
                )}
              </DateGroup>
            ))}
        </RecordsContainer>
      )}
    </Container>
  );
};

export default HamaliEnhanced;