import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import RiceStockVarietyDropdown from './RiceStockVarietyDropdown';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 2px solid #dc2626;
  padding-bottom: 1rem;
`;

const Title = styled.h2`
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.2s;
  
  &:hover {
    color: #ef4444;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
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
    border-color: #dc2626;
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
  
  &:focus {
    outline: none;
    border-color: #dc2626;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  resize: vertical;
  min-height: 80px;
  
  &:focus {
    outline: none;
    border-color: #dc2626;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 2px solid #e5e7eb;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &.primary {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
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

const InfoBox = styled.div`
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-left: 4px solid #dc2626;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  color: #991b1b;
  font-size: 0.9rem;
`;

const StockInfo = styled.div`
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px solid #0ea5e9;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  color: #0c4a6e;
`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddRiceSaleModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    productType: '',
    outturnId: null as number | null, // Changed from variety to outturnId
    bags: '',
    bagSizeKg: '26.00',
    packagingId: '',
    locationCode: '',
    toLocation: '',
    ratePerBag: '',
    billNumber: '',
    lorryNumber: '',
    partyName: '',
    remarks: ''
  });

  const [packagings, setPackagings] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedVarietyData, setSelectedVarietyData] = useState<any>(null); // Store selected variety metadata
  const [availableStock, setAvailableStock] = useState<any>(null);
  const [calculatedValues, setCalculatedValues] = useState({
    quantityQuintals: 0,
    totalAmount: 0
  });

  const productTypes = [
    'Rice', 'Bran', 'Broken', 'RJ Rice 1', 'RJ Rice 2', 'RJ Broken',
    '0 Broken', 'Sizer Broken', 'Unpolish', 'Faram'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchPackagings();
      fetchLocations();
    }
  }, [isOpen]);

  useEffect(() => {
    // Calculate derived values
    const bags = Number.parseInt(formData.bags) || 0;
    const bagSizeKg = Number.parseFloat(formData.bagSizeKg) || 0;
    const ratePerBag = Number.parseFloat(formData.ratePerBag) || 0;

    const quantityQuintals = (bags * bagSizeKg) / 100;
    const totalAmount = bags * ratePerBag;

    setCalculatedValues({
      quantityQuintals,
      totalAmount
    });
  }, [formData.bags, formData.bagSizeKg, formData.ratePerBag]);

  useEffect(() => {
    // Check available stock when product, location, or packaging changes
    if (formData.productType && formData.locationCode && formData.packagingId && formData.outturnId) {
      checkAvailableStock();
    } else {
      setAvailableStock(null);
    }
  }, [formData.productType, formData.outturnId, formData.locationCode, formData.packagingId, formData.date]);

  const fetchPackagings = async () => {
    try {
      const response = await axios.get('/packagings');
      setPackagings((response.data as any).packagings || []);
    } catch (error) {
      console.error('Error fetching packagings:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await axios.get('/locations/rice-stock-locations');
      setLocations((response.data as any).locations || []);
    } catch (error) {
      console.error('Error fetching rice stock locations:', error);
      // Fallback locations
      setLocations([
        { code: 'B1', name: 'Broken Room 1' },
        { code: 'U1', name: 'Unpolish Room 1' },
        { code: 'F1', name: 'Faram Room 1' },
        { code: 'N3', name: 'Rice Room N3' },
        { code: 'N4', name: 'Rice Room N4' },
        { code: 'Bran Room', name: 'Bran Storage' }
      ]);
    }
  };

  const checkAvailableStock = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/rice-stock-management/available-stock', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          productType: formData.productType,
          packagingId: formData.packagingId,
          locationCode: formData.locationCode,
          outturnId: formData.outturnId,
          date: formData.date
        }
      });

      const data = response.data as any;
      setAvailableStock({
        closing_stock_bags: data.availableBags || 0,
        closing_stock_quintals: data.availableQtls || 0,
        location_code: data.locationCode
      });
    } catch (error) {
      console.error('Error checking available stock:', error);
      setAvailableStock(null);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVarietyChange = (outturnId: number | null, varietyData?: any) => {
    setFormData(prev => ({
      ...prev,
      outturnId
    }));
    setSelectedVarietyData(varietyData || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.date || !formData.productType || !formData.bags || !formData.packagingId || !formData.locationCode || !formData.outturnId) {
      toast.error('Please fill in all required fields including rice variety');
      return;
    }

    const bags = Number.parseInt(formData.bags);
    if (bags <= 0) {
      toast.error('Bags must be greater than 0');
      return;
    }

    // Check stock availability
    if (availableStock && bags > availableStock.closing_stock_bags) {
      toast.error(`Insufficient stock. Available: ${availableStock.closing_stock_bags} bags, Requested: ${bags} bags`);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      await axios.post('/rice-stock-management/movements', {
        ...formData,
        movementType: 'sale',
        bags: bags,
        bagSizeKg: Number.parseFloat(formData.bagSizeKg),
        ratePerBag: Number.parseFloat(formData.ratePerBag) || null,
        // Include variety string for backward compatibility during transition
        variety: selectedVarietyData?.standardized_variety || 'UNKNOWN VARIETY'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Rice sale added successfully!');
      onSuccess();
      onClose();

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        productType: '',
        outturnId: null,
        bags: '',
        bagSizeKg: '26.00',
        packagingId: '',
        locationCode: '',
        toLocation: '',
        ratePerBag: '',
        billNumber: '',
        lorryNumber: '',
        partyName: '',
        remarks: ''
      });
      setSelectedVarietyData(null);
      setAvailableStock(null);
    } catch (error: any) {
      console.error('Error adding rice sale:', error);
      toast.error(error.response?.data?.error || 'Failed to add rice sale');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <Title>💰 Add Rice Sale</Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <InfoBox>
          <strong>Sale Entry:</strong> This will deduct rice stock from your inventory.
          Make sure you have sufficient stock before proceeding with the sale.
        </InfoBox>

        {/* Stock Information */}
        {availableStock && (
          <StockInfo>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Available Stock:</strong> {availableStock.closing_stock_bags} bags
                ({availableStock.closing_stock_quintals.toFixed(2)} quintals)
              </div>
              <div style={{ fontSize: '0.8rem', color: '#0369a1' }}>
                Location: {availableStock.location_code}
              </div>
            </div>
          </StockInfo>
        )}

        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormGroup>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Product Type *</Label>
              <Select
                value={formData.productType}
                onChange={(e) => handleInputChange('productType', e.target.value)}
                required
              >
                <option value="">Select product type...</option>
                {productTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <RiceStockVarietyDropdown
                value={formData.outturnId}
                onChange={handleVarietyChange}
                label="Rice Variety"
                placeholder="-- Select Rice Variety --"
                required={true}
                showVarietyInfo={true}
                processingTypeFilter="all"
              />
            </FormGroup>

            <FormGroup>
              <Label>Bags *</Label>
              <Input
                type="number"
                min="1"
                max={availableStock?.closing_stock_bags || undefined}
                value={formData.bags}
                onChange={(e) => handleInputChange('bags', e.target.value)}
                placeholder="Enter number of bags"
                required
              />
              {availableStock && Number.parseInt(formData.bags) > availableStock.closing_stock_bags && (
                <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>
                  Exceeds available stock ({availableStock.closing_stock_bags} bags)
                </span>
              )}
            </FormGroup>

            <FormGroup>
              <Label>Bag Size (KG)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.bagSizeKg}
                onChange={(e) => handleInputChange('bagSizeKg', e.target.value)}
              />
            </FormGroup>

            <FormGroup>
              <Label>Packaging *</Label>
              <Select
                value={formData.packagingId}
                onChange={(e) => handleInputChange('packagingId', e.target.value)}
                required
              >
                <option value="">Select packaging...</option>
                {packagings.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.brandName} ({pkg.allottedKg}kg)
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Location *</Label>
              <Select
                value={formData.locationCode}
                onChange={(e) => handleInputChange('locationCode', e.target.value)}
                required
              >
                <option value="">Select location...</option>
                {locations.map(loc => (
                  <option key={loc.code} value={loc.code}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>To Location</Label>
              <Input
                type="text"
                value={formData.toLocation}
                onChange={(e) => handleInputChange('toLocation', e.target.value)}
                placeholder="Customer/Destination location"
              />
            </FormGroup>

            <FormGroup>
              <Label>Rate per Bag</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.ratePerBag}
                onChange={(e) => handleInputChange('ratePerBag', e.target.value)}
                placeholder="0.00"
              />
            </FormGroup>

            <FormGroup>
              <Label>Bill Number</Label>
              <Input
                type="text"
                value={formData.billNumber}
                onChange={(e) => handleInputChange('billNumber', e.target.value)}
                placeholder="Sale bill number"
              />
            </FormGroup>

            <FormGroup>
              <Label>Lorry Number</Label>
              <Input
                type="text"
                value={formData.lorryNumber}
                onChange={(e) => handleInputChange('lorryNumber', e.target.value)}
                placeholder="Vehicle number"
              />
            </FormGroup>

            <FormGroup>
              <Label>Party Name</Label>
              <Input
                type="text"
                value={formData.partyName}
                onChange={(e) => handleInputChange('partyName', e.target.value)}
                placeholder="Customer name"
              />
            </FormGroup>
          </FormGrid>

          <FormGroup>
            <Label>Remarks</Label>
            <TextArea
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              placeholder="Additional notes..."
            />
          </FormGroup>

          {/* Calculated Values Display */}
          {(calculatedValues.quantityQuintals > 0 || calculatedValues.totalAmount > 0) && (
            <InfoBox style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', borderColor: '#10b981', color: '#065f46' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Quantity:</strong> {calculatedValues.quantityQuintals.toFixed(3)} quintals
                </div>
                {calculatedValues.totalAmount > 0 && (
                  <div>
                    <strong>Total Amount:</strong> ₹{calculatedValues.totalAmount.toFixed(2)}
                  </div>
                )}
              </div>
            </InfoBox>
          )}

          <ButtonGroup>
            <Button type="button" className="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="primary" disabled={saving}>
              {saving ? 'Adding Sale...' : 'Add Sale'}
            </Button>
          </ButtonGroup>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default AddRiceSaleModal;