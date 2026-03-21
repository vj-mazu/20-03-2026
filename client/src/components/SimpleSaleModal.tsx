import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { createPortal } from 'react-dom';
import RiceStockVarietyDropdown from './RiceStockVarietyDropdown';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  animation: fadeIn 0.2s ease;
  overflow-y: auto;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div<{ $x: number; $y: number }>`
  background: white;
  width: 95%;
  max-width: 900px;
  border-radius: 12px;
  overflow: visible;
  box-shadow: 0 10px 50px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  position: relative;
  pointer-events: auto;
  flex-shrink: 0;
  transform: translate(${props => props.$x}px, ${props => props.$y}px);
  animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  @keyframes modalPop {
    from { opacity: 0; transform: translate(${props => props.$x}px, ${props => props.$y + 20}px) scale(0.95); }
    to { opacity: 1; transform: translate(${props => props.$x}px, ${props => props.$y}px) scale(1); }
  }
`;

const ModalHeader = styled.div`
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  padding: 1.5rem 2rem;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem 2rem;
  overflow-y: auto;
  flex: 1; /* Take up all available space between header and footer */
`;

const Section = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #6b7280;
  margin: 0 0 1rem 0;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
  font-size: 0.85rem;
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.2s;
  
  text-transform: uppercase;
  
  &::placeholder {
    text-transform: none;
  }
  
  &:focus {
    outline: none;
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #dc2626;
  }
`;

const LineItemsContainer = styled.div`
  background: #f9fafb;
  border-radius: 12px;
  padding: 1rem;
  border: 2px dashed #d1d5db;
`;

const LineItem = styled.div`
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  display: grid;
  grid-template-columns: 50px 1fr 1fr 1fr 100px 60px 40px;
  gap: 0.75rem;
  align-items: end;
  
  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const LineNumber = styled.div`
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
`;

const DeleteButton = styled.button`
  background: #fee2e2;
  border: none;
  color: #dc2626;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1.25rem;
  
  &:hover {
    background: #fecaca;
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const AddItemButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: white;
  border: 2px dashed #dc2626;
  border-radius: 10px;
  color: #b91c1c;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: #fef2f2;
    border-style: solid;
  }
`;

const TotalSection = styled.div`
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 2px solid #dc2626;
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1rem;
  display: flex;
  justify-content: space-around;
  text-align: center;
`;

const TotalItem = styled.div`
  .label {
    font-size: 0.8rem;
    color: #991b1b;
    font-weight: 600;
    text-transform: uppercase;
  }
  .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #dc2626;
  }
`;

const ModalFooter = styled.div`
  padding: 1rem 2rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 0.875rem 2rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
`;

const CancelButton = styled(Button)`
  background: #e5e7eb;
  color: #4b5563;
  
  &:hover {
    background: #d1d5db;
  }
`;

const SaveButton = styled(Button)`
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  box-shadow: 0 4px 14px 0 rgba(220, 38, 38, 0.3);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PRODUCT_TYPES = [
  'Rice', 'Bran', 'Broken', 'RJ Rice 1', 'RJ Rice 2', 'RJ Broken',
  '0 Broken', 'Sizer Broken', 'Unpolish', 'Faram'
];

interface SaleLineItem {
  id: string;
  locationCode: string;
  packagingId: string;
  productType: string;
  bags: string;
  bagSizeKg: string;
}

interface SimpleSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SimpleSaleModal: React.FC<SimpleSaleModalProps> = ({ isOpen, onClose, onSuccess }) => {
  // Common fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [billNumber, setBillNumber] = useState('');
  const [outturnId, setOutturnId] = useState<number | null>(null);
  const [selectedVarietyData, setSelectedVarietyData] = useState<any>(null);
  const [lorryNumber, setLorryNumber] = useState('');
  const [toLocation, setToLocation] = useState('');

  // Line items
  const [lineItems, setLineItems] = useState<SaleLineItem[]>([
    { id: '1', locationCode: '', packagingId: '', productType: 'Rice', bags: '', bagSizeKg: '26' }
  ]);

  const [packagings, setPackagings] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    if (isOpen) {
      fetchPackagings();
      fetchLocations();
      setPosition({ x: 0, y: 0 }); // Reset position when opened
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen]);

  const fetchPackagings = async () => {
    try {
      const response = await axios.get('/packagings');
      const pkgs = (response.data as any).packagings || [];
      setPackagings(pkgs);
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
    }
  };

  // Handle variety selection from RiceStockVarietyDropdown
  const handleVarietyChange = (selectedOutturnId: number | null, varietyData: any) => {
    setOutturnId(selectedOutturnId);
    setSelectedVarietyData(varietyData);
  };

  const addLineItem = () => {
    const newId = String(Date.now());
    setLineItems([...lineItems, {
      id: newId,
      locationCode: '',
      packagingId: '',
      productType: 'Rice',
      bags: '',
      bagSizeKg: '26'
    }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof SaleLineItem, value: string) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto-update bag size when packaging is selected
        if (field === 'packagingId') {
          const pkg = packagings.find(p => p.id === parseInt(value));
          if (pkg) {
            updated.bagSizeKg = String(pkg.allottedKg);
          }
        }
        return updated;
      }
      return item;
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalBags = 0;
    let totalQuintals = 0;

    lineItems.forEach(item => {
      const bags = parseInt(item.bags) || 0;
      const bagSize = parseFloat(item.bagSizeKg) || 26;
      totalBags += bags;
      totalQuintals += (bags * bagSize) / 100;
    });

    return { totalBags, totalQuintals: totalQuintals.toFixed(2) };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !billNumber || !outturnId || !selectedVarietyData) {
      toast.error('Please fill in Date, Bill Number and Variety');
      return;
    }

    // Validate line items
    const validItems = lineItems.filter(item =>
      item.locationCode && item.packagingId && parseInt(item.bags) > 0
    );

    if (validItems.length === 0) {
      toast.error('Please add at least one valid sale item');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      // Create each line item as a separate movement with same bill number
      for (const item of validItems) {
        const bags = parseInt(item.bags);
        const bagSize = parseFloat(item.bagSizeKg) || 26;
        const qtls = (bags * bagSize) / 100;

        await axios.post('/rice-stock-management/movements', {
          date,
          movementType: 'sale',
          productType: item.productType,
          outturnId: outturnId,
          variety: selectedVarietyData?.standardized_variety || 'UNKNOWN',
          bags,
          bagSizeKg: bagSize,
          quantityQuintals: qtls,
          packagingId: parseInt(item.packagingId),
          locationCode: item.locationCode,
          toLocation,
          billNumber,
          lorryNumber
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      toast.success(`Sale added successfully! ${validItems.length} item(s) with Bill #${billNumber}`);
      onSuccess();
      onClose();

      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setBillNumber('');
      setOutturnId(null);
      setSelectedVarietyData(null);
      setLorryNumber('');
      setToLocation('');
      setLineItems([{ id: '1', locationCode: '', packagingId: '', productType: 'Rice', bags: '', bagSizeKg: '26' }]);

    } catch (error: any) {
      console.error('Error adding sale:', error);
      toast.error(error.response?.data?.error || 'Failed to add sale');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <ModalOverlay>
      <ModalContent $x={position.x} $y={position.y} onClick={(e) => e.stopPropagation()}>
        <ModalHeader onMouseDown={handleMouseDown}>
          <Title>💰 Add Sale - Multi Location</Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody>
            {/* Common Fields */}
            <Section>
              <SectionTitle>📋 Bill Details</SectionTitle>
              <FormGrid>
                <FormGroup>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Bill Number *</Label>
                  <Input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value.toUpperCase())}
                    placeholder="Enter bill number"
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <RiceStockVarietyDropdown
                    value={outturnId}
                    onChange={handleVarietyChange}
                    label="Rice Variety *"
                    placeholder="Select variety..."
                    required={true}
                    showVarietyInfo={true}
                    processingTypeFilter="all"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Lorry Number</Label>
                  <Input
                    type="text"
                    value={lorryNumber}
                    onChange={(e) => setLorryNumber(e.target.value.toUpperCase())}
                    placeholder="Vehicle number"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>To (Customer/Party)</Label>
                  <Input
                    type="text"
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value.toUpperCase())}
                    placeholder="Customer name"
                  />
                </FormGroup>
              </FormGrid>
            </Section>

            {/* Line Items */}
            <Section>
              <SectionTitle>📦 Sale Items</SectionTitle>
              <LineItemsContainer>
                {lineItems.map((item, index) => (
                  <LineItem key={item.id}>
                    <LineNumber>{index + 1}</LineNumber>

                    <FormGroup>
                      <Label>Location *</Label>
                      <Select
                        value={item.locationCode}
                        onChange={(e) => updateLineItem(item.id, 'locationCode', e.target.value)}
                        required
                      >
                        <option value="">Select...</option>
                        {locations.map(loc => (
                          <option key={loc.code} value={loc.code}>
                            {loc.code} {loc.name ? `- ${loc.name}` : ''}
                          </option>
                        ))}
                      </Select>
                    </FormGroup>

                    <FormGroup>
                      <Label>Product</Label>
                      <Select
                        value={item.productType}
                        onChange={(e) => updateLineItem(item.id, 'productType', e.target.value)}
                      >
                        {PRODUCT_TYPES.map(pt => (
                          <option key={pt} value={pt}>{pt}</option>
                        ))}
                      </Select>
                    </FormGroup>

                    <FormGroup>
                      <Label>Packaging *</Label>
                      <Select
                        value={item.packagingId}
                        onChange={(e) => updateLineItem(item.id, 'packagingId', e.target.value)}
                        required
                      >
                        <option value="">Select...</option>
                        {packagings.map(pkg => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.brandName} ({pkg.allottedKg}kg)
                          </option>
                        ))}
                      </Select>
                    </FormGroup>

                    <FormGroup>
                      <Label>Bags *</Label>
                      <Input
                        type="number"
                        value={item.bags}
                        onChange={(e) => updateLineItem(item.id, 'bags', e.target.value)}
                        min="1"
                        placeholder="0"
                        required
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Qtls</Label>
                      <div style={{
                        padding: '0.75rem',
                        background: '#f3f4f6',
                        borderRadius: '10px',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}>
                        {item.bags && item.bagSizeKg
                          ? ((parseInt(item.bags) * parseFloat(item.bagSizeKg)) / 100).toFixed(2)
                          : '0.00'
                        }
                      </div>
                    </FormGroup>

                    <DeleteButton
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
                    >
                      🗑️
                    </DeleteButton>
                  </LineItem>
                ))}

                <AddItemButton type="button" onClick={addLineItem}>
                  ➕ Add Another Item
                </AddItemButton>
              </LineItemsContainer>

              <TotalSection>
                <TotalItem>
                  <div className="label">Total Items</div>
                  <div className="value">{lineItems.filter(i => i.bags).length}</div>
                </TotalItem>
                <TotalItem>
                  <div className="label">Total Bags</div>
                  <div className="value">{totals.totalBags}</div>
                </TotalItem>
                <TotalItem>
                  <div className="label">Total Quintals</div>
                  <div className="value">{totals.totalQuintals}</div>
                </TotalItem>
              </TotalSection>
            </Section>
          </ModalBody>

          <ModalFooter>
            <CancelButton type="button" onClick={onClose}>
              Cancel
            </CancelButton>
            <SaveButton type="submit" disabled={saving}>
              {saving ? 'Saving...' : `💰 Create Sale (${lineItems.filter(i => i.bags && i.locationCode).length} items)`}
            </SaveButton>
          </ModalFooter>
        </form>
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};

export default SimpleSaleModal;