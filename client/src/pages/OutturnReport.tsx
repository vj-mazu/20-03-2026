import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';

interface Outturn {
  id: number;
  outturnNumber: string;
  paddyDate: string;
  isCleared?: boolean;
  clearedAt?: string;
}

interface Packaging {
  id: number;
  brandName: string;
  kgPerBag: number;
}

interface Location {
  id: number;
  locationCode: string;
}

interface ByProduct {
  id: number;
  date: string;
  rice: number;
  rejectionRice: number;
  rjRice1: number;
  rjRice2: number;
  broken: number;
  rejectionBroken: number;
  zeroBroken: number;
  faram: number;
  bran: number;
  unpolished: number;
}

interface ProductionEntry {
  date: string;
  productType: string;
  bags: string;
  packagingId: string;
  quantityQuintals: number;
  paddyBagsDeducted: number;
  movementType: 'kunchinittu';
  locationCode: string;
  lorryNumber: string;
  billNumber: string;
}

const Container = styled.div`
  padding: 1.5rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
`;

const CardTitle = styled.h3`
  color: #374151;
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #f3f4f6;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const FlexRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1rem;
`;

const FormGroup = styled.div`
  flex: 1;
`;

const Label = styled.label`
  display: block;
  color: #374151;
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const Button = styled.button`
  background-color: #10b981;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background-color: #059669;
  }
  
  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }
`;

const InfoText = styled.p`
  color: #6b7280;
  font-size: 0.85rem;
  margin: 0.5rem 0 0 0;
`;

const YieldingBox = styled.div`
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
`;

const YieldingRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
  
  &:last-child {
    border-bottom: none;
  }
`;

const YieldingLabel = styled.span`
  color: #6b7280;
  font-weight: 500;
`;

const YieldingValue = styled.span`
  color: #1f2937;
  font-weight: 600;
`;

const OutturnReport: React.FC = () => {
  const { user } = useAuth();
  const [outturns, setOutturns] = useState<Outturn[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedOutturn, setSelectedOutturn] = useState<string>('');
  const [paddyDate, setPaddyDate] = useState<string>('');
  const [byProducts, setByProducts] = useState<ByProduct[]>([]);
  const [remainingBags, setRemainingBags] = useState<number>(0);
  const [clearingOutturn, setClearingOutturn] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearDate, setClearDate] = useState<string>('');

  const [entry, setEntry] = useState<ProductionEntry>({
    date: '',
    productType: '',
    bags: '',
    packagingId: '',
    quantityQuintals: 0,
    paddyBagsDeducted: 0,
    movementType: 'kunchinittu',
    locationCode: '',
    lorryNumber: '',
    billNumber: ''
  });

  const [availablePaddyBags, setAvailablePaddyBags] = useState<number>(0);
  const [isOutturnCleared, setIsOutturnCleared] = useState<boolean>(false);

  const productTypes = [
    'Rice',
    'Bran',
    'Farm Bran',
    'Rejection Rice',
    'Sizer Broken',
    'RJ Broken',
    'Broken',
    'Zero Broken',
    'Faram',
    'Unpolished',
    'RJ Rice 1',
    'RJ Rice 2'
  ];

  useEffect(() => {
    fetchOutturns();
    fetchPackagings();
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedOutturn) {
      fetchByProducts();
      fetchAvailablePaddyBags();
      calculateRemainingBags();
    }
  }, [selectedOutturn]);

  useEffect(() => {
    if (entry.bags && entry.packagingId) {
      calculateFromBags();
    }
  }, [entry.bags, entry.packagingId]);

  const fetchOutturns = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<Outturn[]>('/outturns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOutturns(response.data);
    } catch (error) {
      toast.error('Failed to fetch outturns');
    }
  };

  const fetchPackagings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<Packaging[]>('/locations/packagings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPackagings(response.data);
    } catch (error) {
      toast.error('Failed to fetch packagings');
    }
  };

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<Location[]>('/locations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocations(response.data);
    } catch (error) {
      toast.error('Failed to fetch locations');
    }
  };

  const fetchByProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<ByProduct[]>(`/byproducts/outturn/${selectedOutturn}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setByProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch byproducts');
      setByProducts([]);
    }
  };

  const fetchAvailablePaddyBags = async () => {
    if (!selectedOutturn) return;

    try {
      const token = localStorage.getItem('token');
      const outturn = outturns.find(o => o.outturnNumber === selectedOutturn);
      if (!outturn) return;

      const response = await axios.get<{
        availablePaddyBags: number;
        totalPaddyBags: number;
        usedPaddyBags: number;
        isCleared?: boolean;
        clearedAt?: string;
        remainingBags?: number;
      }>(
        `/rice-productions/outturn/${outturn.id}/available-paddy-bags`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailablePaddyBags(response.data.availablePaddyBags);
      setIsOutturnCleared(response.data.isCleared || false);

      // If outturn is cleared, also set remaining bags to 0
      if (response.data.isCleared) {
        setRemainingBags(0);
      }
    } catch (error) {
      console.error('Error fetching available paddy bags:', error);
      setAvailablePaddyBags(0);
      setIsOutturnCleared(false);
    }
  };

  const calculateRemainingBags = async () => {
    if (!selectedOutturn) return;

    try {
      const token = localStorage.getItem('token');
      const outturn = outturns.find(o => o.outturnNumber === selectedOutturn);
      if (!outturn) return;

      // Calculate remaining bags: total bags - used bags
      const response = await axios.get<{
        availablePaddyBags: number;
        totalPaddyBags: number;
        usedPaddyBags: number;
        isCleared?: boolean;
        clearedAt?: string;
        remainingBags?: number;
      }>(
        `/rice-productions/outturn/${outturn.id}/available-paddy-bags`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRemainingBags(response.data.availablePaddyBags);
      setIsOutturnCleared(response.data.isCleared || false);
    } catch (error) {
      console.error('Error calculating remaining bags:', error);
      setRemainingBags(0);
      setIsOutturnCleared(false);
    }
  };

  const handleClearOutturn = async () => {
    if (!selectedOutturn) {
      toast.error('Please select an outturn number');
      return;
    }

    if (remainingBags <= 0) {
      toast.error('No remaining bags to clear');
      return;
    }

    // Show dialog to enter clear date
    setClearDate(new Date().toISOString().split('T')[0]);
    setShowClearDialog(true);
  };

  const confirmClearOutturn = async () => {
    if (!clearDate) {
      toast.error('Please select a clear date');
      return;
    }

    setClearingOutturn(true);
    try {
      const token = localStorage.getItem('token');
      const outturn = outturns.find(o => o.outturnNumber === selectedOutturn);
      if (!outturn) {
        toast.error('Outturn not found');
        return;
      }

      await axios.post(
        `/outturns/${outturn.id}/clear`,
        { clearDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Store the old value for the success message
      const clearedBags = remainingBags;

      // Close dialog first
      setShowClearDialog(false);

      // Immediately set to 0 to update UI
      setRemainingBags(0);
      setAvailablePaddyBags(0);

      // Refresh all data to reflect cleared status from backend
      await fetchOutturns();
      await fetchAvailablePaddyBags();
      await calculateRemainingBags();

      // Show success message
      toast.success(`Outturn cleared! ${clearedBags} bags consumed on ${clearDate} and added to working section.`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to clear outturn');
    } finally {
      setClearingOutturn(false);
    }
  };

  const calculateFromBags = () => {
    const bagsNum = parseFloat(entry.bags) || 0;
    const packaging = packagings.find(p => p.id === parseInt(entry.packagingId));
    if (packaging && bagsNum > 0) {
      // Calculate quintals: (bags × kg_per_bag) / 100
      const quintals = (bagsNum * packaging.kgPerBag) / 100;

      // Calculate paddy deduction: round(quintals × 3)
      const paddyDeduction = Math.round(quintals * 3);

      setEntry(prev => ({ ...prev, quantityQuintals: quintals, paddyBagsDeducted: paddyDeduction }));
    } else {
      setEntry(prev => ({ ...prev, quantityQuintals: 0, paddyBagsDeducted: 0 }));
    }
  };

  const handleOutturnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const outturnNum = e.target.value;
    setSelectedOutturn(outturnNum);

    const outturn = outturns.find(o => o.outturnNumber === outturnNum);
    if (outturn) {
      setPaddyDate(outturn.paddyDate);
      // Fix: Use local date without timezone conversion
      const paddyDateLocal = new Date(outturn.paddyDate + 'T00:00:00');
      const nextDay = new Date(paddyDateLocal);
      nextDay.setDate(nextDay.getDate() + 1);
      // Format as YYYY-MM-DD without timezone conversion
      const year = nextDay.getFullYear();
      const month = String(nextDay.getMonth() + 1).padStart(2, '0');
      const day = String(nextDay.getDate()).padStart(2, '0');
      const nextDayStr = `${year}-${month}-${day}`;
      setEntry(prev => ({ ...prev, date: nextDayStr }));

      // Fetch available paddy bags for the selected outturn
      fetchAvailablePaddyBags();
    }
  };

  const handleSubmit = async () => {
    if (!selectedOutturn) {
      toast.error('Please select an outturn number');
      return;
    }

    if (!entry.date || !entry.productType || !entry.bags || !entry.packagingId) {
      toast.error('Please fill all required fields');
      return;
    }

    const paddyDateObj = new Date(paddyDate);
    const entryDateObj = new Date(entry.date);

    if (entryDateObj < paddyDateObj) {
      toast.error(`Production date cannot be before paddy date (${paddyDate})`);
      return;
    }

    // Validate paddy bags availability
    if (entry.paddyBagsDeducted > availablePaddyBags) {
      toast.error(`Insufficient paddy bags. Available: ${availablePaddyBags}, Required: ${entry.paddyBagsDeducted}`);
      return;
    }

    // Location code is always required since loading has been removed
    if (!entry.locationCode) {
      toast.error('Location code is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        outturnNumber: selectedOutturn,
        date: entry.date,
        productType: entry.productType,
        bags: parseFloat(entry.bags),
        packagingId: parseInt(entry.packagingId),
        movementType: 'kunchinittu',
        locationCode: entry.locationCode,
        lorryNumber: null,
        billNumber: null
      };

      await axios.post('/rice-productions', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Rice production entry saved successfully!');

      // Fix: Calculate next day without timezone conversion
      const paddyDateLocal = new Date(paddyDate + 'T00:00:00');
      const nextDay = new Date(paddyDateLocal);
      nextDay.setDate(nextDay.getDate() + 1);
      const year = nextDay.getFullYear();
      const month = String(nextDay.getMonth() + 1).padStart(2, '0');
      const day = String(nextDay.getDate()).padStart(2, '0');
      const nextDayStr = `${year}-${month}-${day}`;

      setEntry({
        date: nextDayStr,
        productType: '',
        bags: '',
        packagingId: '',
        quantityQuintals: 0,
        paddyBagsDeducted: 0,
        movementType: 'kunchinittu',
        locationCode: '',
        lorryNumber: '',
        billNumber: ''
      });

      // Refresh available paddy bags and remaining bags
      fetchAvailablePaddyBags();
      calculateRemainingBags();

    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save entry');
    }
  };

  const getByProductQuantity = (field: keyof ByProduct): number => {
    return byProducts.reduce((total, bp) => {
      const val = bp[field];
      return total + (typeof val === 'number' ? val : parseFloat(val as any) || 0);
    }, 0);
  };

  return (
    <Container>
      <Card>
        <CardTitle>Select Outturn Number</CardTitle>
        <FormGroup>
          <Label>Outturn Number</Label>
          <Select value={selectedOutturn} onChange={handleOutturnChange}>
            <option value="">-- Select Outturn --</option>
            {outturns.map(outturn => (
              <option key={outturn.id} value={outturn.outturnNumber}>
                {outturn.outturnNumber} (Paddy Date: {outturn.paddyDate})
              </option>
            ))}
          </Select>
          {paddyDate && (
            <InfoText>
              Paddy Date: {paddyDate} | Rice production can be entered from next day onwards
            </InfoText>
          )}
          {selectedOutturn && isOutturnCleared && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#fee2e2',
              border: '2px solid #ef4444',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#991b1b'
            }}>
              ✅ This outturn has been cleared and closed. No more production entries can be added.
            </div>
          )}
          {selectedOutturn && availablePaddyBags > 0 && !isOutturnCleared && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#d1fae5',
              border: '2px solid #10b981',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#065f46'
            }}>
              Available Bags for Production: {availablePaddyBags} bags
            </div>
          )}
          {/* Clear Outturn - Only for Admin and Manager */}
          {selectedOutturn && (user?.role === 'admin' || user?.role === 'manager') && remainingBags > 0 && !isOutturnCleared && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '8px'
            }}>
              <div style={{
                marginBottom: '0.75rem',
                fontWeight: 'bold',
                color: '#92400e',
                textAlign: 'center'
              }}>
                ⚠️ Outturn Completion
              </div>
              <div style={{
                marginBottom: '0.75rem',
                textAlign: 'center',
                color: '#78350f'
              }}>
                Remaining Bags: <strong>{remainingBags} bags</strong>
              </div>
              <div style={{
                fontSize: '0.85rem',
                color: '#78350f',
                marginBottom: '0.75rem',
                textAlign: 'center'
              }}>
                These bags will be added back to paddy stock (working) when outturn is cleared.
              </div>
              <Button
                onClick={handleClearOutturn}
                disabled={clearingOutturn}
                style={{
                  width: '100%',
                  backgroundColor: '#f59e0b',
                  color: 'white'
                }}
              >
                {clearingOutturn ? 'Clearing...' : 'Clear Outturn'}
              </Button>
            </div>
          )}
        </FormGroup>
      </Card>

      {selectedOutturn && (
        <Grid>
          <Card>
            <CardTitle>Rice Production Data Entry</CardTitle>

            <FormGroup style={{ marginBottom: '1rem' }}>
              <Label>Date *</Label>
              <Input
                type="date"
                value={entry.date}
                onChange={(e) => setEntry({ ...entry, date: e.target.value })}
                min={paddyDate ? (() => {
                  // Fix: Calculate min date without timezone conversion
                  const paddyDateLocal = new Date(paddyDate + 'T00:00:00');
                  const nextDay = new Date(paddyDateLocal);
                  nextDay.setDate(nextDay.getDate() + 1);
                  const year = nextDay.getFullYear();
                  const month = String(nextDay.getMonth() + 1).padStart(2, '0');
                  const day = String(nextDay.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                })() : ''}
              />
            </FormGroup>

            <FormGroup style={{ marginBottom: '1rem' }}>
              <Label>Select Product *</Label>
              <Select
                value={entry.productType}
                onChange={(e) => setEntry({ ...entry, productType: e.target.value })}
              >
                <option value="">-- Select Product --</option>
                {productTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup style={{ marginBottom: '1rem' }}>
              <Label>Bags *</Label>
              <Input
                type="number"
                step="1"
                value={entry.bags}
                onChange={(e) => setEntry({ ...entry, bags: e.target.value })}
                placeholder="Enter number of bags"
              />
            </FormGroup>

            <FormGroup style={{ marginBottom: '1rem' }}>
              <Label>Packaging *</Label>
              <Select
                value={entry.packagingId}
                onChange={(e) => setEntry({ ...entry, packagingId: e.target.value })}
              >
                <option value="">-- Select Packaging --</option>
                {packagings.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.brandName} ({pkg.kgPerBag} kg/bag)
                  </option>
                ))}
              </Select>
            </FormGroup>

            {/* Calculation Summary Box */}
            {entry.quantityQuintals > 0 && (
              <div style={{
                background: entry.paddyBagsDeducted > availablePaddyBags ? '#fee2e2' : '#f0fdf4',
                border: entry.paddyBagsDeducted > availablePaddyBags ? '2px solid #ef4444' : '2px solid #86efac',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ marginBottom: '0.75rem', fontWeight: 'bold', color: '#1f2937', fontSize: '0.95rem' }}>
                  📊 Calculation Summary
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr auto 1fr',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  background: 'white',
                  borderRadius: '6px',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Bags</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>{entry.bags}</div>
                  </div>

                  <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>×</div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Packaging (KG)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                      {packagings.find(p => p.id === parseInt(entry.packagingId))?.kgPerBag || 0}
                    </div>
                  </div>

                  <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>=</div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Quintals</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                      {entry.quantityQuintals.toFixed(2)} Q
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0',
                  borderTop: '1px solid #e5e7eb',
                  color: entry.paddyBagsDeducted > availablePaddyBags ? '#991b1b' : '#166534',
                  fontWeight: 500,
                  fontSize: '0.9rem'
                }}>
                  <span>🌾 Paddy Bags Deducted:</span>
                  <span style={{ fontWeight: 'bold' }}>{entry.paddyBagsDeducted} bags</span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0',
                  color: entry.paddyBagsDeducted > availablePaddyBags ? '#991b1b' : '#166534',
                  fontWeight: 500,
                  fontSize: '0.9rem'
                }}>
                  <span>📦 Available Paddy Bags:</span>
                  <span style={{ fontWeight: 'bold' }}>{availablePaddyBags} bags</span>
                </div>

                {entry.paddyBagsDeducted > availablePaddyBags && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    background: '#fef2f2',
                    borderRadius: '6px',
                    color: '#991b1b',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    ⚠️ Insufficient paddy bags! Need {entry.paddyBagsDeducted - availablePaddyBags} more bags.
                  </div>
                )}
              </div>
            )}

            {/* Location Code - always shown since loading has been removed */}
            <FormGroup style={{ marginBottom: '1rem' }}>
              <Label>Location Code *</Label>
              <Select
                value={entry.locationCode}
                onChange={(e) => setEntry({ ...entry, locationCode: e.target.value })}
              >
                <option value="">-- Select Location --</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.locationCode}>
                    {loc.locationCode}
                  </option>
                ))}
              </Select>
            </FormGroup>

            <Button onClick={handleSubmit}>Save Entry</Button>
          </Card>

          <Card>
            <CardTitle>Yielding Summary (Quintals)</CardTitle>
            <YieldingBox>
              <YieldingRow>
                <YieldingLabel>Rice:</YieldingLabel>
                <YieldingValue>{getByProductQuantity('rice').toFixed(2)} Q</YieldingValue>
              </YieldingRow>
              <YieldingRow>
                <YieldingLabel>Sizer Broken:</YieldingLabel>
                <YieldingValue>{getByProductQuantity('rejectionRice').toFixed(2)} Q</YieldingValue>
              </YieldingRow>
              <YieldingRow>
                <YieldingLabel>RJ Rice 1:</YieldingLabel>
                <YieldingValue>{getByProductQuantity('rjRice1').toFixed(2)} Q</YieldingValue>
              </YieldingRow>
              <YieldingRow>
                <YieldingLabel>RJ Rice 2:</YieldingLabel>
                <YieldingValue>{getByProductQuantity('rjRice2').toFixed(2)} Q</YieldingValue>
              </YieldingRow>
              <YieldingRow>
                <YieldingLabel>Broken:</YieldingLabel>
                <YieldingValue>{getByProductQuantity('broken').toFixed(2)} Q</YieldingValue>
              </YieldingRow>
              <YieldingRow>
                <YieldingLabel>RJ Broken:</YieldingLabel>
                <YieldingValue>{getByProductQuantity('rejectionBroken').toFixed(2)} Q</YieldingValue>
              </YieldingRow>
              <YieldingRow>
                <YieldingLabel>Zero Broken:</YieldingLabel>
                <YieldingValue>{getByProductQuantity('zeroBroken').toFixed(2)} Q</YieldingValue>
              </YieldingRow>
              <YieldingRow>
                <YieldingLabel>Faram:</YieldingLabel>
                <YieldingValue>{getByProductQuantity('faram').toFixed(2)} Q</YieldingValue>
              </YieldingRow>
              <YieldingRow>
                <YieldingLabel>Bran:</YieldingLabel>
                <YieldingValue>{getByProductQuantity('bran').toFixed(2)} Q</YieldingValue>
              </YieldingRow>
              <YieldingRow>
                <YieldingLabel>Unpolished:</YieldingLabel>
                <YieldingValue>{getByProductQuantity('unpolished').toFixed(2)} Q</YieldingValue>
              </YieldingRow>
              <div style={{
                marginTop: '1rem',
                paddingTop: '0.5rem',
                borderTop: '2px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                color: '#111827'
              }}>
                <span>Total Yield:</span>
                <span>{(
                  getByProductQuantity('rice') +
                  getByProductQuantity('rejectionRice') +
                  getByProductQuantity('rjRice1') +
                  getByProductQuantity('rjRice2') +
                  getByProductQuantity('broken') +
                  getByProductQuantity('rejectionBroken') +
                  getByProductQuantity('zeroBroken') +
                  getByProductQuantity('faram') +
                  getByProductQuantity('bran') +
                  getByProductQuantity('unpolished')
                ).toFixed(2)} Q</span>
              </div>
            </YieldingBox>

            {byProducts.length === 0 && (
              <InfoText style={{ marginTop: '1rem', textAlign: 'center' }}>
                No byproduct data available for this outturn
              </InfoText>
            )}
          </Card>
        </Grid>
      )}

      {/* Clear Outturn Dialog */}
      {showClearDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#1f2937' }}>
              Clear Outturn: {selectedOutturn}
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                background: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '0.5rem' }}>
                  ⚠️ Remaining Bags: {remainingBags} bags
                </div>
                <div style={{ fontSize: '0.9rem', color: '#78350f' }}>
                  These bags will be consumed and added to the working section on the selected date.
                </div>
              </div>

              <Label>Select Clear Date *</Label>
              <Input
                type="date"
                value={clearDate}
                onChange={(e) => setClearDate(e.target.value)}
                style={{ marginTop: '0.5rem' }}
              />
              <InfoText style={{ marginTop: '0.5rem' }}>
                Choose the date when this outturn should be cleared
              </InfoText>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setShowClearDialog(false);
                  setClearingOutturn(false);
                }}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  padding: '0.75rem 1.5rem'
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmClearOutturn}
                disabled={clearingOutturn || !clearDate}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  padding: '0.75rem 1.5rem'
                }}
              >
                {clearingOutturn ? 'Clearing...' : 'Confirm Clear'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default OutturnReport;
