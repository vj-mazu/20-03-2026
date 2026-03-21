import React, { useState, useEffect, useRef } from 'react';
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
  max-width: 500px;
  border-radius: 12px;
  overflow: visible;
  position: relative;
  box-shadow: 0 10px 50px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  cursor: move; /* Indicate draggability */
  user-select: none;
`;

const Title = styled.h2`
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: #f1f5f9;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #e2e8f0;
    color: #0f172a;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem 2rem;
  flex: 1;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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
  transition: border-color 0.2s;

  text-transform: uppercase;
  
  &::placeholder {
    text-transform: none;
  }
  
  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
`;

const SaveButton = styled(Button)`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelButton = styled(Button)`
  background: #f1f5f9;
  color: #475569;

  &:hover {
    background: #e2e8f0;
  }
`;

interface SimplePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Product types available for purchase
const PRODUCT_TYPES = [
  'Rice', 'Bran', 'Broken', 'RJ Rice 1', 'RJ Rice 2', 'RJ Broken',
  '0 Broken', 'Sizer Broken', 'Unpolish', 'Faram'
];

const SimplePurchaseModal: React.FC<SimplePurchaseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    billNumber: '',
    productType: 'Rice', // NEW: Product type selection
    outturnId: null as number | null, // Changed from variety to outturnId
    bags: '',
    bagSize: '26.00',
    packaging: '',
    from: '',
    to: '',
    lorryNumber: ''
  });

  const [packagings, setPackagings] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedVarietyData, setSelectedVarietyData] = useState<any>(null); // Store selected variety metadata

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
    }
  };

  const handleVarietyChange = (outturnId: number | null, varietyData?: any) => {
    setFormData(prev => ({
      ...prev,
      outturnId
    }));
    setSelectedVarietyData(varietyData || null);
  };

  const handleInputChange = (field: string, value: string) => {
    const uppercaseFields = ['billNumber', 'from', 'lorryNumber'];
    const finalValue = uppercaseFields.includes(field) ? value.toUpperCase() : value;
    
    // NEW: Auto-fill bag size when packaging is selected
    if (field === 'packaging' && value) {
      const selectedPkg = packagings.find(pkg => pkg.id === parseInt(value));
      if (selectedPkg) {
        setFormData(prev => ({ 
          ...prev, 
          [field]: finalValue,
          bagSize: String(selectedPkg.allottedKg) // Auto-fill bag size
        }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.billNumber || !formData.bags || !formData.packaging || !formData.to || !formData.outturnId || !formData.productType) {
      toast.error('Please fill in all required fields including product type and rice variety');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      // Calculate QTL'S
      const qtls = (parseInt(formData.bags) * parseFloat(formData.bagSize)) / 100;

      await axios.post('/rice-stock-management/movements', {
        date: formData.date,
        movementType: 'purchase',
        productType: formData.productType, // NEW: Use selected product type
        outturnId: formData.outturnId, // NEW: Include outturn ID for standardization
        variety: selectedVarietyData?.standardized_variety || 'UNKNOWN VARIETY', // BACKWARD COMPATIBILITY: Include variety string
        bags: parseInt(formData.bags),
        bagSizeKg: parseFloat(formData.bagSize),
        quantityQuintals: qtls,
        packagingId: parseInt(formData.packaging),
        locationCode: formData.to,
        fromLocation: formData.from,
        billNumber: formData.billNumber,
        lorryNumber: formData.lorryNumber
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`${formData.productType} purchase added successfully!`);
      onSuccess();
      onClose();

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        billNumber: '',
        productType: 'Rice',
        outturnId: null,
        bags: '',
        bagSize: '26.00',
        packaging: '',
        from: '',
        to: '',
        lorryNumber: ''
      });
      setSelectedVarietyData(null);

    } catch (error: any) {
      console.error('Error adding purchase:', error);
      toast.error(error.response?.data?.error || 'Failed to add purchase');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <ModalOverlay>
      <ModalContent $x={position.x} $y={position.y} onClick={(e) => e.stopPropagation()}>
        <ModalHeader onMouseDown={handleMouseDown}>
          <Title>📦 Add Purchase</Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <ModalBody>
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
                <Label>Bill Number *</Label>
                <Input
                  type="text"
                  value={formData.billNumber}
                  onChange={(e) => handleInputChange('billNumber', e.target.value)}
                  placeholder="Enter bill number"
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
                  {PRODUCT_TYPES.map(type => (
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
                <Label>Packaging *</Label>
                <Select
                  value={formData.packaging}
                  onChange={(e) => handleInputChange('packaging', e.target.value)}
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
                <Label>Bag Size (KG) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bagSize}
                  onChange={(e) => handleInputChange('bagSize', e.target.value)}
                  readOnly
                  style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                  title="Auto-filled from packaging selection"
                />
              </FormGroup>

              <FormGroup>
                <Label>Bags *</Label>
                <Input
                  type="number"
                  value={formData.bags}
                  onChange={(e) => handleInputChange('bags', e.target.value)}
                  min="1"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label>To Location *</Label>
                <Select
                  value={formData.to}
                  onChange={(e) => handleInputChange('to', e.target.value)}
                  required
                >
                  <option value="">Select location...</option>
                  {locations.map(loc => (
                    <option key={loc.code} value={loc.code}>
                      {loc.name ? `${loc.code} - ${loc.name}` : loc.code}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>From (Supplier)</Label>
                <Input
                  type="text"
                  value={formData.from}
                  onChange={(e) => handleInputChange('from', e.target.value)}
                  placeholder="Supplier/Source"
                />
              </FormGroup>

              <FormGroup style={{ gridColumn: '1 / -1' }}>
                <Label>Lorry Number</Label>
                <Input
                  type="text"
                  value={formData.lorryNumber}
                  onChange={(e) => handleInputChange('lorryNumber', e.target.value)}
                  placeholder="Vehicle number"
                />
              </FormGroup>
            </FormGrid>

            <ButtonGroup>
              <CancelButton type="button" onClick={onClose}>
                Cancel
              </CancelButton>
              <SaveButton type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Add Purchase'}
              </SaveButton>
            </ButtonGroup>
          </form>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};

export default SimplePurchaseModal;