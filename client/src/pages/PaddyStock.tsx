import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import DatePicker from 'react-datepicker';

const Container = styled.div`
  animation: fadeIn 0.5s ease-in;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const MainContent = styled.div`
  min-width: 0;
`;

const Sidebar = styled.div`
  position: sticky;
  top: 2rem;
  height: fit-content;
  
  @media (max-width: 1200px) {
    position: relative;
    top: 0;
  }
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
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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

const DaySection = styled.div`
  background: white;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  overflow: hidden;
`;

const DateHeader = styled.div`
  background: #4a90e2;
  color: white;
  padding: 1rem 1.5rem;
  font-size: 1.2rem;
  font-weight: bold;
`;

const StockList = styled.div`
  padding: 1rem 1.5rem;
`;

const StockItem = styled.div`
  display: grid;
  grid-template-columns: 80px 200px 1fr;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
`;

const OpeningTotal = styled.div`
  font-weight: bold;
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  border-bottom: 2px solid #ddd;
`;

const BifurcationSection = styled.div`
  background: #d1fae5;
  padding: 1rem 1.5rem;
`;

const BifurcationItem = styled.div`
  display: grid;
  grid-template-columns: 60px 120px 200px 200px 1fr;
  gap: 1rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: white;
  border-radius: 6px;
  border-left: 4px solid #10b981;
  
  .bags {
    font-weight: bold;
    color: #10b981;
  }
  
  .variety {
    font-weight: 600;
  }
`;

const ClosingSection = styled.div`
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  border-top: 2px solid #ddd;
`;

const ClosingItem = styled.div`
  display: grid;
  grid-template-columns: 150px 200px 1fr;
  gap: 1rem;
  padding: 0.5rem 0;
  font-weight: 600;
`;

const SummaryCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  overflow: hidden;
  margin-bottom: 1.5rem;
`;

const SummaryHeader = styled.div`
  background: #4a90e2;
  color: white;
  padding: 1rem;
  font-weight: bold;
  font-size: 1.1rem;
  text-align: center;
`;

const SummaryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  thead {
    background: #4a90e2;
    color: white;
  }
  
  th {
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  td {
    padding: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  tbody tr:last-child td {
    border-bottom: none;
  }
  
  tbody tr:hover {
    background: #f8f9fa;
  }
`;

const TotalRow = styled.tr`
  background: #4a90e2 !important;
  color: white;
  font-weight: bold;
  
  td {
    border-bottom: none !important;
  }
`;

interface Kunchinittu {
  id: number;
  name: string;
  code: string;
  warehouse: {
    name: string;
    code: string;
  };
  variety?: {
    name: string;
    code: string;
  };
}

interface DailyLedgerEntry {
  date: string;
  openingStock: Array<{ variety: string; bags: number; netWeight: number; outturnCode?: string | null; warehouse?: string }>;
  inward: Array<{
    variety: string;
    bags: number;
    netWeight: number;
    from: string;
    to: string;
    broker?: string;
    outturnCode?: string | null;
    warehouse?: string;
  }>;
  productionShifting?: Array<{
    variety: string;
    bags: number;
    netWeight: number;
    from: string;
    to: string;
    movementType: string;
    outturnCode?: string;
    remainingBags?: number;
  }>;
  outward: Array<{
    variety: string;
    bags: number;
    netWeight: number;
    from: string;
    to: string;
    movementType?: string;
    outturnCode?: string | null;
    warehouse?: string;
  }>;
  riceProduction?: Array<{
    bags: number;
    variety: string;
    outturnCode: string;
    productType: string;
    description: string;
    warehouse?: string;
  }>;
  closingStock: Array<{ variety: string; bags: number; netWeight: number; outturnCode?: string | null; warehouse?: string }>;
  openingTotal: number;
  closingTotal: number;
}

interface RemainingInProduction {
  variety: string;
  remaining: number;
  outturnCode: string;
}

const PaddyStock: React.FC = () => {
  const [kunchinittus, setKunchinittus] = useState<Kunchinittu[]>([]);
  const [selectedKunchinittu, setSelectedKunchinittu] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [dailyLedger, setDailyLedger] = useState<DailyLedgerEntry[]>([]);
  const [allDailyLedger, setAllDailyLedger] = useState<DailyLedgerEntry[]>([]); // Store all data
  const [kunchinittuInfo, setKunchinittuInfo] = useState<Kunchinittu | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 30; // Show 30 days per page

  // Helper function to get remaining bags in production from current day (month-wise)
  // This calculates ONLY for the current month, starting from 0 on the 1st of each month
  const getRemainingInProduction = (
    currentDay: DailyLedgerEntry,
    allDays: DailyLedgerEntry[]
  ): RemainingInProduction[] => {
    try {
      const remaining: RemainingInProduction[] = [];

      // Get current date and calculate first day of current month
      const currentDate = new Date(currentDay.date + 'T00:00:00');
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];
      const lastDayOfMonthStr = lastDayOfMonth.toISOString().split('T')[0];

      // Filter days to ONLY include current month (from 1st to last day of month)
      // This ensures we start from 0 each month
      const currentMonthDays = allDays.filter(day => {
        return day.date >= firstDayOfMonthStr && day.date <= lastDayOfMonthStr;
      });

      // Calculate month-wise totals: production shifting - rice production
      // Starting from 0 for the current month
      const monthWiseTotals: { [key: string]: { shifted: number; consumed: number } } = {};

      currentMonthDays.forEach(day => {
        // Only process days up to and including the current day
        if (day.date <= currentDay.date) {
          // Sum production shifting for this month
          if (day.productionShifting && day.productionShifting.length > 0) {
            day.productionShifting.forEach(entry => {
              const key = `${entry.variety}-${entry.outturnCode || '01'}`;
              if (!monthWiseTotals[key]) {
                monthWiseTotals[key] = { shifted: 0, consumed: 0 };
              }
              monthWiseTotals[key].shifted += entry.bags || 0;
            });
          }

          // Sum rice production consumption for this month
          if (day.riceProduction && day.riceProduction.length > 0) {
            day.riceProduction.forEach(entry => {
              const key = `${entry.variety}-${entry.outturnCode || '01'}`;
              if (!monthWiseTotals[key]) {
                monthWiseTotals[key] = { shifted: 0, consumed: 0 };
              }
              monthWiseTotals[key].consumed += entry.bags || 0;
            });
          }
        }
      });

      // Calculate remaining bags (shifted - consumed) for current month ONLY
      Object.entries(monthWiseTotals).forEach(([key, totals]) => {
        const [variety, outturnCode] = key.split('-');
        const remainingBags = totals.shifted - totals.consumed;

        if (remainingBags > 0) {
          remaining.push({
            variety: variety,
            remaining: remainingBags,
            outturnCode: outturnCode
          });
        }
      });

      return remaining;
    } catch (error) {
      console.error('Error getting remaining in production:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchKunchinittus();
  }, []);

  const fetchKunchinittus = async () => {
    try {
      const response = await axios.get('/ledger/kunchinittus');
      setKunchinittus((response.data as any).kunchinittus);
    } catch (error) {
      console.error('Error fetching kunchinittus:', error);
      toast.error('Failed to fetch kunchinittus');
    }
  };

  const fetchPaddyStock = async () => {
    if (!selectedKunchinittu) {
      toast.error('Please select a Kunchinittu');
      return;
    }

    setLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.dateFrom = dateFrom.toISOString().split('T')[0];
      if (dateTo) params.dateTo = dateTo.toISOString().split('T')[0];

      const response = await axios.get(`/ledger/paddy-stock/${selectedKunchinittu}`, { params });
      const data = response.data as any;
      const allDays = data.dailyLedger || [];

      // Store all data and implement client-side pagination
      setAllDailyLedger(allDays);
      setCurrentPage(1); // Reset to first page

      // Show first page
      const startIndex = 0;
      const endIndex = recordsPerPage;
      const paginatedDays = allDays.slice(startIndex, endIndex);

      setDailyLedger(paginatedDays);
      setKunchinittuInfo(data.kunchinittu);

      if (allDays.length > recordsPerPage) {
        toast.success(`📊 Loaded ${allDays.length} days. Showing first ${paginatedDays.length} days.`);
      }
    } catch (error) {
      console.error('Error fetching paddy stock:', error);
      toast.error('Failed to fetch paddy stock data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const handlePageChange = (newPage: number) => {
    const totalPages = Math.ceil(allDailyLedger.length / recordsPerPage);
    if (newPage < 1 || newPage > totalPages) return;

    setCurrentPage(newPage);
    const startIndex = (newPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const paginatedDays = allDailyLedger.slice(startIndex, endIndex);

    setDailyLedger(paginatedDays);
    toast.info(`📄 Page ${newPage} of ${totalPages} (${paginatedDays.length} days)`);
  };

  return (
    <>
      <Title>📊 Paddy Stock Ledger</Title>

      <FilterSection>
        <FilterRow>
          <FormGroup>
            <Label>Select Kunchinittu</Label>
            <Select
              value={selectedKunchinittu}
              onChange={(e) => setSelectedKunchinittu(e.target.value)}
            >
              <option value="">Select Kunchinittu</option>
              {kunchinittus.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name} ({k.code}) - {k.warehouse.name}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Date From</Label>
            <DatePicker
              selected={dateFrom}
              onChange={(date) => setDateFrom(date)}
              dateFormat="dd-MMM-yyyy"
              placeholderText="Select start date"
              isClearable
            />
          </FormGroup>

          <FormGroup>
            <Label>Date To</Label>
            <DatePicker
              selected={dateTo}
              onChange={(date) => setDateTo(date)}
              dateFormat="dd-MMM-yyyy"
              placeholderText="Select end date"
              isClearable
            />
          </FormGroup>

          <Button className="primary" onClick={fetchPaddyStock} disabled={loading}>
            {loading ? 'Loading...' : '🔍 View Stock'}
          </Button>

          <Button
            className="secondary"
            onClick={() => {
              if (!selectedKunchinittu) {
                toast.error('Please select a Kunchinittu');
                return;
              }

              setLoading(true);
              const params: any = { limit: 200 }; // PERFORMANCE: Reduced from 1000 for 10L scale
              if (dateFrom) params.dateFrom = dateFrom.toISOString().split('T')[0];
              if (dateTo) params.dateTo = dateTo.toISOString().split('T')[0];

              axios.get(`/ledger/paddy-stock/${selectedKunchinittu}`, { params })
                .then(response => {
                  const data = response.data as any;
                  const allDays = data.dailyLedger || [];

                  // Store all data and show first page
                  setAllDailyLedger(allDays);
                  setCurrentPage(1);

                  const paginatedDays = allDays.slice(0, recordsPerPage);
                  setDailyLedger(paginatedDays);
                  setKunchinittuInfo(data.kunchinittu);

                  if (allDays.length > recordsPerPage) {
                    toast.success(`📊 Loaded ${allDays.length} days. Showing first ${paginatedDays.length} days with pagination.`);
                  } else {
                    toast.success(`📊 Loaded ${allDays.length} days of paddy stock data`);
                  }
                })
                .catch(error => {
                  console.error('Error loading stock data:', error);
                  toast.error('Failed to load stock data');
                })
                .then(() => setLoading(false));
            }}
            disabled={loading}
            title="Load more stock data (up to 1000 days)"
          >
            📊 Load More Data
          </Button>
        </FilterRow>
      </FilterSection>

      {kunchinittuInfo && (
        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <strong>Kunchinittu:</strong> {kunchinittuInfo.code} | <strong>Warehouse:</strong> {kunchinittuInfo.warehouse.name}
        </div>
      )}

      <Container>
        <MainContent>
          {dailyLedger.map((day, dayIdx) => {
            // Get outturn bifurcation from opening stock (bags that are in outturns)
            const outturnBifurcation = day.openingStock.filter(stock => stock.outturnCode);
            // Get kunchinittu bifurcation from opening stock (bags that are NOT in outturns)
            const kunchinintuBifurcation = day.openingStock.filter(stock => !stock.outturnCode);

            return (
              <DaySection key={dayIdx}>
                <DateHeader>{formatDate(day.date)}</DateHeader>

                {/* Kunchinittu Bifurcation - ALL opening stock items in GREEN BACKGROUND */}
                {day.openingStock.length > 0 && (
                  <div style={{
                    background: '#d1fae5',
                    padding: '0.5rem 1.5rem'
                  }}>
                    {day.openingStock.map((stock, idx) => (
                      <div key={idx} style={{
                        fontWeight: 'normal',
                        color: '#000',
                        padding: '0.25rem 0',
                        fontFamily: 'Calibri, sans-serif',
                        fontSize: '11pt'
                      }}>
                        {stock.bags} - {stock.variety} - {stock.outturnCode ? (
                          <span style={{ fontWeight: 'bold' }}>{stock.outturnCode}</span>
                        ) : (
                          <span
                            onClick={() => {
                              if (kunchinittuInfo?.code) {
                                const url = `/kunchinittu-ledger?code=${kunchinittuInfo.code}`;
                                window.open(url, '_blank');
                              }
                            }}
                            style={{
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              color: '#2563eb',
                              fontWeight: 'bold'
                            }}
                          >
                            {kunchinittuInfo?.code}
                          </span>
                        )}({stock.warehouse || kunchinittuInfo?.warehouse.name})
                      </div>
                    ))}
                  </div>
                )}

                {/* Show total of opening stock */}
                {day.openingStock.length > 0 && (
                  <div style={{
                    fontWeight: 'bold',
                    padding: '0.5rem 1.5rem',
                    background: '#f8f9fa',
                    borderBottom: '1px solid #ddd'
                  }}>
                    {day.openingStock.reduce((sum, stock) => sum + stock.bags, 0)}
                  </div>
                )}

                <OpeningTotal>{day.openingTotal} Opening Stock</OpeningTotal>

                {/* Bifurcation - Inward (Highlighted) */}
                {day.inward.length > 0 && (
                  <BifurcationSection>
                    {day.inward.map((entry, idx) => (
                      <BifurcationItem key={idx}>
                        <div className="bags">+{entry.bags}</div>
                        <div>{formatDate(day.date)}</div>
                        <div className="variety">{entry.variety}</div>
                        <div>{entry.broker || entry.from}</div>
                        <div>
                          {entry.outturnCode ? `${entry.outturnCode}(${entry.warehouse || kunchinittuInfo?.warehouse.name})` : entry.to}
                        </div>
                      </BifurcationItem>
                    ))}
                  </BifurcationSection>
                )}

                {/* Bifurcation - Production Shifting (Highlighted in orange) */}
                {day.productionShifting && day.productionShifting.length > 0 && (
                  <div style={{ background: '#ffedd5', padding: '1rem 1.5rem' }}>
                    {day.productionShifting.map((entry, idx) => (
                      <BifurcationItem key={idx} style={{ borderLeft: '4px solid #f97316' }}>
                        <div className="bags" style={{ color: '#f97316' }}>(-) {entry.bags}</div>
                        <div className="variety">{entry.variety}</div>
                        <div>{entry.from}</div>
                        <div>
                          <span style={{ color: '#9a3412', fontWeight: 'bold' }}>
                            {entry.to}
                          </span>
                        </div>
                      </BifurcationItem>
                    ))}
                  </div>
                )}

                {/* Bifurcation - Outward (Highlighted in purple for normal shifting) */}
                {day.outward.length > 0 && (
                  <div style={{ background: '#e9d5ff', padding: '1rem 1.5rem' }}>
                    {day.outward.map((entry, idx) => (
                      <BifurcationItem key={idx} style={{ borderLeft: '4px solid #a855f7' }}>
                        <div className="bags" style={{ color: '#a855f7' }}>-{entry.bags}</div>
                        <div>{formatDate(day.date)}</div>
                        <div className="variety">{entry.variety}</div>
                        <div>{entry.from}</div>
                        <div>{entry.to}</div>
                      </BifurcationItem>
                    ))}
                  </div>
                )}

                {/* Closing Stock */}
                <ClosingSection>
                  {day.closingStock.map((stock, idx) => (
                    <ClosingItem key={idx}>
                      <div>
                        {stock.bags} - {stock.variety} - {stock.outturnCode ? (
                          <>
                            {stock.outturnCode}(
                            <span
                              onClick={() => {
                                if (kunchinittuInfo?.code) {
                                  const url = `/kunchinittu-ledger?code=${kunchinittuInfo.code}`;
                                  window.open(url, '_blank');
                                }
                              }}
                              style={{
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                color: '#2563eb',
                                fontWeight: 'bold'
                              }}
                            >
                              {stock.warehouse || kunchinittuInfo?.warehouse.name}
                            </span>)
                          </>
                        ) : (
                          <>
                            (
                            <span
                              onClick={() => {
                                if (kunchinittuInfo?.code) {
                                  const url = `/kunchinittu-ledger?code=${kunchinittuInfo.code}`;
                                  window.open(url, '_blank');
                                }
                              }}
                              style={{
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                color: '#2563eb',
                                fontWeight: 'bold'
                              }}
                            >
                              {stock.warehouse || kunchinittuInfo?.warehouse.name}
                            </span>)
                          </>
                        )}
                      </div>
                      <div></div>
                    </ClosingItem>
                  ))}
                  <div style={{ fontWeight: 'bold', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '2px solid #ddd' }}>
                    {day.closingTotal} Closing Stock
                  </div>
                </ClosingSection>

                {/* Rice Production Consumption - MOVED TO BOTTOM (Working Section) */}
                {day.riceProduction && day.riceProduction.length > 0 && (
                  <div style={{ background: '#fee2e2', padding: '1rem 1.5rem' }}>
                    {day.riceProduction.map((entry, idx) => (
                      <BifurcationItem key={idx} style={{ borderLeft: '4px solid #dc2626', background: 'white' }}>
                        <div className="bags" style={{ color: '#dc2626' }}>(-){entry.bags}</div>
                        <div className="variety">{entry.variety}</div>
                        <div style={{ fontWeight: 'bold', color: '#991b1b' }}>
                          {entry.outturnCode}
                        </div>
                        <div style={{ color: '#991b1b' }}>
                          → Rice Production
                        </div>
                      </BifurcationItem>
                    ))}
                  </div>
                )}
              </DaySection>
            );
          })}

          {dailyLedger.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px' }}>
              <p style={{ color: '#6b7280' }}>📋 Select a Kunchinittu to view Paddy Stock Ledger</p>
            </div>
          )}

          {/* Pagination Controls for Paddy Stock */}
          {allDailyLedger.length > recordsPerPage && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1.5rem',
              background: 'white',
              borderRadius: '12px',
              marginTop: '1rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
            }}>
              <Button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              >
                « First
              </Button>

              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              >
                ‹ Previous
              </Button>

              <div style={{
                margin: '0 1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontSize: '0.85rem',
                color: '#6b7280'
              }}>
                <div style={{ fontWeight: 'bold', color: '#374151' }}>
                  Page {currentPage} of {Math.ceil(allDailyLedger.length / recordsPerPage)}
                </div>
                <div>
                  Showing {dailyLedger.length} of {allDailyLedger.length} days
                </div>
              </div>

              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= Math.ceil(allDailyLedger.length / recordsPerPage)}
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              >
                Next ›
              </Button>

              <Button
                onClick={() => handlePageChange(Math.ceil(allDailyLedger.length / recordsPerPage))}
                disabled={currentPage >= Math.ceil(allDailyLedger.length / recordsPerPage)}
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              >
                Last »
              </Button>
            </div>
          )}
        </MainContent>

        {/* Sidebar with Variety-wise Opening Stock and Working */}
        {dailyLedger.length > 0 && (
          <Sidebar>
            {/* Working Section - Month-wise */}
            {(() => {
              // Get the actual latest day by date (not by array position)
              const latestDay = dailyLedger.reduce((latest, current) => {
                return new Date(current.date) > new Date(latest.date) ? current : latest;
              }, dailyLedger[0]);
              const remainingInProduction = getRemainingInProduction(latestDay, dailyLedger);
              if (remainingInProduction.length > 0) {
                const currentDate = new Date(latestDay.date);
                const monthYear = currentDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                return (
                  <SummaryCard>
                    <SummaryHeader style={{ background: '#dc2626' }}>Working ({monthYear})</SummaryHeader>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
                        {formatDate(latestDay.date)}
                      </div>
                      {remainingInProduction.map((item, idx) => (
                        <div key={idx} style={{
                          padding: '0.5rem 0',
                          borderBottom: idx < remainingInProduction.length - 1 ? '1px solid #e5e7eb' : 'none'
                        }}>
                          <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.remaining}</div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {item.variety} - {item.outturnCode}
                          </div>
                        </div>
                      ))}
                    </div>
                  </SummaryCard>
                );
              }
              return null;
            })()}

            {/* Variety-wise Opening Stock Table */}
            {(() => {
              const latestDay = dailyLedger[dailyLedger.length - 1];
              if (latestDay && latestDay.openingStock.length > 0) {
                // Group by variety ONLY (sum all bags for same variety)
                const varietyMap: { [variety: string]: number } = {};

                latestDay.openingStock.forEach(stock => {
                  if (!varietyMap[stock.variety]) {
                    varietyMap[stock.variety] = 0;
                  }
                  varietyMap[stock.variety] += stock.bags;
                });

                const sortedEntries = Object.entries(varietyMap)
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([variety, bags]) => ({ variety, bags }));

                const totalBags = sortedEntries.reduce((sum, entry) => sum + entry.bags, 0);

                return (
                  <SummaryCard>
                    <SummaryHeader>Variety-wise Opening Stock</SummaryHeader>
                    <SummaryTable>
                      <thead>
                        <tr>
                          <th>Variety</th>
                          <th style={{ textAlign: 'right' }}>Bags</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedEntries.map((entry, idx) => (
                          <tr key={idx}>
                            <td>{entry.variety}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{entry.bags}</td>
                          </tr>
                        ))}
                        <TotalRow>
                          <td>TOTAL</td>
                          <td style={{ textAlign: 'right' }}>{totalBags}</td>
                        </TotalRow>
                      </tbody>
                    </SummaryTable>
                  </SummaryCard>
                );
              }
              return null;
            })()}
          </Sidebar>
        )}
      </Container>
    </>
  );
};

export default PaddyStock;
