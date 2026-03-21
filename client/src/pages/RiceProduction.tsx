import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Container = styled.div`
  animation: fadeIn 0.5s ease-in;
  max-width: 1600px;
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

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 2px solid #f3f4f6;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  color: #1f2937;
  font-size: 1.3rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
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
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const DatePickerWrapper = styled.div`
  .react-datepicker-wrapper {
    width: 100%;
  }
  
  input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.3s ease;

    &:focus {
      outline: none;
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    }
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

const InfoBox = styled.div<{ variant?: 'success' | 'warning' | 'error' }>`
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  
  ${props => {
    switch (props.variant) {
      case 'warning':
        return `
          background: #fef3c7;
          border: 2px solid #fbbf24;
          p { color: #92400e; font-weight: 500; margin: 0.5rem 0; }
        `;
      case 'error':
        return `
          background: #fee2e2;
          border: 2px solid #ef4444;
          p { color: #991b1b; font-weight: 500; margin: 0.5rem 0; }
        `;
      default:
        return `
          background: #f0fdf4;
          border: 2px solid #86efac;
          p { color: #166534; font-weight: 500; margin: 0.5rem 0; }
        `;
    }
  }}
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
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
  color: #4b5563;
`;

const ActionButton = styled.button`
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  margin-right: 0.5rem;
  
  &.approve {
    background: #10b981;
    color: white;
    
    &:hover {
      background: #059669;
    }
  }
  
  &.edit {
    background: #3b82f6;
    color: white;
    
    &:hover {
      background: #2563eb;
    }
  }
  
  &.delete {
    background: #ef4444;
    color: white;
    
    &:hover {
      background: #dc2626;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  
  ${props => {
    switch (props.status) {
      case 'pending':
        return 'background: #fef3c7; color: #92400e;';
      case 'approved':
        return 'background: #d1fae5; color: #065f46;';
      case 'rejected':
        return 'background: #fee2e2; color: #991b1b;';
      default:
        return 'background: #e5e7eb; color: #374151;';
    }
  }}
`;

interface Packaging {
  id: number;
  brandName: string;
  code: string;
  allottedKg: string;
}

interface Outturn {
  id: number;
  code: string;
  allottedVariety: string;
}

interface RiceProduction {
  id: number;
  date: string;
  productType: string;
  quantityQuintals: number;
  bags: number;
  paddyBagsDeducted: number;
  movementType: string;
  locationCode?: string;
  lorryNumber?: string;
  billNumber?: string;
  status: string;
  packaging: Packaging;
  outturn: Outturn;
  creator: { username: string };
  approver?: { username: string };
}

const RiceProduction: React.FC = () => {
  const { user } = useAuth();
  const [outturns, setOutturns] = useState<Outturn[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [riceStockLocations, setRiceStockLocations] = useState<any[]>([]);
  const [productions, setProductions] = useState<RiceProduction[]>([]);

  // Form state
  const [selectedOutturn, setSelectedOutturn] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [productType, setProductType] = useState('Rice');
  const [bags, setBags] = useState('');
  const [selectedPackaging, setSelectedPackaging] = useState('');
  const [movementType, setMovementType] = useState<'kunchinittu'>('kunchinittu');
  const [locationCode, setLocationCode] = useState('');
  const [lorryNumber, setLorryNumber] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Calculated values
  const [quantityQuintals, setQuantityQuintals] = useState<number>(0);
  const [paddyBagsDeducted, setPaddyBagsDeducted] = useState<number>(0);
  const [availablePaddyBags, setAvailablePaddyBags] = useState<number>(0);

  const canApprove = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    fetchOutturns();
    fetchPackagings();
    fetchRiceStockLocations();
    fetchProductions();
  }, []);

  useEffect(() => {
    if (selectedOutturn) {
      fetchAvailablePaddyBags();
    }
  }, [selectedOutturn]);

  useEffect(() => {
    calculateFromBags();
  }, [bags, selectedPackaging, packagings]);

  const fetchOutturns = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<Outturn[]>('/outturns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOutturns(response.data);
    } catch (error) {
      console.error('Error fetching outturns:', error);
      toast.error('Failed to fetch outturns');
    }
  };

  const fetchPackagings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<{ packagings: any[] }>('/packagings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPackagings(response.data.packagings || []);
    } catch (error) {
      console.error('Error fetching packagings:', error);
      toast.error('Failed to fetch packagings');
    }
  };

  const fetchRiceStockLocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<{ locations: any[] }>('/locations/rice-stock-locations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRiceStockLocations(response.data.locations || []);
    } catch (error) {
      console.error('Error fetching rice stock locations:', error);
      toast.error('Failed to fetch rice stock locations');
    }
  };

  const fetchProductions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<{ productions: any[] }>('/rice-productions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductions(response.data.productions || []);
    } catch (error) {
      console.error('Error fetching productions:', error);
      toast.error('Failed to fetch productions');
    }
  };

  const fetchAvailablePaddyBags = async () => {
    if (!selectedOutturn) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<{
        availablePaddyBags: number;
        totalPaddyBags: number;
        usedPaddyBags: number;
        isCleared?: boolean;
        clearedAt?: string;
        remainingBags?: number;
      }>(
        `/rice-productions/outturn/${selectedOutturn}/available-paddy-bags`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailablePaddyBags(response.data.availablePaddyBags);
    } catch (error) {
      console.error('Error fetching available paddy bags:', error);
      setAvailablePaddyBags(0);
    }
  };

  const calculateFromBags = () => {
    if (!bags || !selectedPackaging) {
      setQuantityQuintals(0);
      setPaddyBagsDeducted(0);
      return;
    }

    const packaging = packagings.find(p => p.id === parseInt(selectedPackaging));
    if (!packaging) {
      setQuantityQuintals(0);
      setPaddyBagsDeducted(0);
      return;
    }

    const bagsNum = parseFloat(bags);
    const kgPerBag = parseFloat(packaging.allottedKg);

    // Calculate quintals: (bags × kg_per_bag) / 100
    const quintals = (bagsNum * kgPerBag) / 100;
    setQuantityQuintals(quintals);

    // Calculate paddy deduction: round(quintals × 3)
    const paddyDeduction = Math.round(quintals * 3);
    setPaddyBagsDeducted(paddyDeduction);
  };

  const validateDate = async () => {
    if (!selectedOutturn || !date) return true;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post<{ valid: boolean; message?: string }>(
        '/rice-productions/validate-date',
        {
          outturnId: selectedOutturn,
          date: date.toISOString().split('T')[0]
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data.valid) {
        toast.error(response.data.message || 'Invalid date');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Date validation error:', error);
      return true; // Continue if validation fails
    }
  };

  const resetForm = () => {
    setSelectedOutturn('');
    setDate(new Date());
    setProductType('Rice');
    setBags('');
    setSelectedPackaging('');
    setMovementType('kunchinittu');
    setLocationCode('');
    setLorryNumber('');
    setBillNumber('');
    setEditingId(null);
    setQuantityQuintals(0);
    setPaddyBagsDeducted(0);
    setAvailablePaddyBags(0);
  };

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    // Prevent double-click submission
    if (isSubmitting) {
      return;
    }

    // Validation
    if (!selectedOutturn || !date || !productType || !bags || !selectedPackaging) {
      toast.error('Please fill all required fields');
      return;
    }

    if (movementType === 'kunchinittu' && !locationCode.trim()) {
      toast.error('Location code is required for kunchinittu movement');
      return;
    }



    // Validate paddy bags availability
    if (paddyBagsDeducted > availablePaddyBags) {
      toast.error(`Insufficient paddy bags. Available: ${availablePaddyBags}, Required: ${paddyBagsDeducted}`);
      return;
    }

    // Validate date
    const isDateValid = await validateDate();
    if (!isDateValid) return;

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        outturnId: parseInt(selectedOutturn),
        date: date.toISOString().split('T')[0],
        productType,
        bags: parseFloat(bags),
        packagingId: parseInt(selectedPackaging),
        movementType,
        locationCode: movementType === 'kunchinittu' ? locationCode.trim() : null,
        lorryNumber: null,
        billNumber: null
      };

      if (editingId) {
        await axios.put(`/rice-productions/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Production entry updated successfully!');
      } else {
        await axios.post('/rice-productions', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Production entry created successfully!');
      }

      // Clear form after successful save
      resetForm();
      fetchProductions();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.error || 'Failed to save production entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (production: RiceProduction) => {
    setEditingId(production.id);
    setSelectedOutturn(production.outturn.id.toString());
    setDate(new Date(production.date));
    setProductType(production.productType);
    setBags(production.bags.toString());
    setSelectedPackaging(production.packaging.id.toString());
    setMovementType('kunchinittu');
    setLocationCode(production.locationCode || '');
    setLorryNumber(production.lorryNumber || '');
    setBillNumber(production.billNumber || '');
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this production entry?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/rice-productions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Production entry deleted successfully!');
      fetchProductions();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete production entry');
    }
  };

  const handleApprove = async (id: number) => {
    if (!canApprove) {
      toast.error('Only managers and admins can approve entries');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`/rice-productions/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Production entry approved successfully!');
      fetchProductions();
    } catch (error: any) {
      console.error('Approve error:', error);
      toast.error(error.response?.data?.error || 'Failed to approve production entry');
    }
  };

  const selectedPackagingDetails = packagings.find(p => p.id === parseInt(selectedPackaging));

  return (
    <Container>
      <Title>🏭 Rice Production Management</Title>

      <Card>
        <SectionTitle>{editingId ? 'Edit' : 'Create'} Production Entry</SectionTitle>

        <FormGrid>
          <FormGroup>
            <Label>Outturn *</Label>
            <Select
              value={selectedOutturn}
              onChange={(e) => setSelectedOutturn(e.target.value)}
            >
              <option value="">-- Select Outturn --</option>
              {outturns.map((outturn) => (
                <option key={outturn.id} value={outturn.id}>
                  {outturn.code} - {outturn.allottedVariety}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Date *</Label>
            <DatePickerWrapper>
              <DatePicker
                selected={date}
                onChange={(date) => setDate(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select date"
              />
            </DatePickerWrapper>
          </FormGroup>

          <FormGroup>
            <Label>Product Type *</Label>
            <Select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
            >
              <option value="Rice">Rice</option>
              <option value="Broken">Broken</option>
              <option value="Rejection Rice">Rejection Rice</option>
              <option value="Husk">Husk</option>
              <option value="Bran">Bran</option>
              <option value="Other">Other</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Number of Bags *</Label>
            <Input
              type="number"
              step="1"
              value={bags}
              onChange={(e) => setBags(e.target.value)}
              placeholder="Enter number of bags"
            />
          </FormGroup>

          <FormGroup>
            <Label>Packaging / Brand *</Label>
            <Select
              value={selectedPackaging}
              onChange={(e) => setSelectedPackaging(e.target.value)}
            >
              <option value="">-- Select Packaging --</option>
              {packagings.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.brandName} ({pkg.allottedKg} KG)
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Movement Type</Label>
            <Input
              type="text"
              value="Kunchinittu (Storage)"
              disabled
              style={{ background: '#f3f4f6' }}
            />
          </FormGroup>
        </FormGrid>

        {quantityQuintals > 0 && (
          <InfoBox
            variant={
              paddyBagsDeducted > availablePaddyBags
                ? 'error'
                : paddyBagsDeducted > availablePaddyBags * 0.8
                  ? 'warning'
                  : 'success'
            }
          >
            <p>📊 Calculated Quintals: <strong>{quantityQuintals.toFixed(2)} Q</strong></p>
            <p>🌾 Paddy Bags Deducted: <strong>{paddyBagsDeducted} bags</strong></p>
            {selectedOutturn && (
              <p>
                📦 Available Paddy Bags: <strong>{availablePaddyBags} bags</strong>
              </p>
            )}
            {paddyBagsDeducted > availablePaddyBags && (
              <p style={{ fontWeight: 'bold' }}>
                ⚠️ Insufficient paddy bags! Need {paddyBagsDeducted - availablePaddyBags} more bags.
              </p>
            )}
            {selectedPackagingDetails && (
              <p>
                Using {selectedPackagingDetails.brandName} ({selectedPackagingDetails.allottedKg} KG per bag)
              </p>
            )}
            <p>
              Total Weight: {(quantityQuintals * 100).toFixed(2)} KG
            </p>
          </InfoBox>
        )}

        {movementType === 'kunchinittu' && (
          <FormGrid>
            <FormGroup>
              <Label>Location Code *</Label>
              <Select
                value={locationCode}
                onChange={(e) => setLocationCode(e.target.value)}
              >
                <option value="">-- SELECT LOCATION --</option>
                {riceStockLocations.map((loc: any) => (
                  <option key={loc.id} value={loc.code}>
                    {loc.code} {loc.name ? `- ${loc.name}` : ''}
                  </option>
                ))}
              </Select>
            </FormGroup>
          </FormGrid>
        )}



        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          {editingId && (
            <Button className="secondary" onClick={resetForm}>
              Cancel
            </Button>
          )}
          <Button className="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (editingId ? 'Update Entry' : 'Create Entry')}
          </Button>
        </div>
      </Card>

      <Card>
        <SectionTitle>Production Entries</SectionTitle>

        {productions.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
            No production entries yet
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Outturn</Th>
                <Th>Product</Th>
                <Th>Bags</Th>
                <Th>Quantity (Q)</Th>
                <Th>Packaging</Th>
                <Th>Paddy Used</Th>
                <Th>Movement</Th>
                <Th>Details</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {productions.map((prod) => (
                <tr key={prod.id}>
                  <Td>{new Date(prod.date).toLocaleDateString('en-GB')}</Td>
                  <Td>{prod.outturn.code}</Td>
                  <Td>{prod.productType}</Td>
                  <Td><strong>{prod.bags}</strong></Td>
                  <Td>{prod.quantityQuintals} Q</Td>
                  <Td>{prod.packaging.brandName}</Td>
                  <Td><strong>{prod.paddyBagsDeducted || 0}</strong> bags</Td>
                  <Td>{prod.movementType}</Td>
                  <Td>
                    {prod.movementType === 'kunchinittu' ? (
                      <span>{prod.locationCode}</span>
                    ) : (
                      <span>
                        L: {prod.lorryNumber}<br />
                        B: {prod.billNumber}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge status={prod.status}>
                      {prod.status.toUpperCase()}
                    </StatusBadge>
                  </Td>
                  <Td>
                    {prod.status === 'pending' && (
                      <>
                        <ActionButton className="edit" onClick={() => handleEdit(prod)}>
                          ✏️
                        </ActionButton>
                        {canApprove && (
                          <ActionButton className="approve" onClick={() => handleApprove(prod.id)}>
                            ✓ Approve
                          </ActionButton>
                        )}
                      </>
                    )}
                    <ActionButton
                      className="delete"
                      onClick={() => handleDelete(prod.id)}
                      disabled={prod.status === 'approved' && user?.role !== 'admin'}
                    >
                      🗑️
                    </ActionButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </Container>
  );
};

export default RiceProduction;
