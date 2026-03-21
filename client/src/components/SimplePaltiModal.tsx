import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';

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
`;

const Title = styled.h2`
  color: #1f2937;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

const ShortageBox = styled.div`
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  grid-column: 1 / -1;
`;

const ShortageTitle = styled.h3`
  color: #92400e;
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
`;

const ShortageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
`;

const ShortageItem = styled.div`
  text-align: center;
`;

const ShortageLabel = styled.div`
  font-size: 0.8rem;
  color: #92400e;
  font-weight: 600;
`;

const ShortageValue = styled.div`
  font-size: 1.2rem;
  color: #d97706;
  font-weight: 700;
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
  background: #6b7280;
  color: white;

  &:hover {
    background: #4b5563;
  }
`;

interface SimplePaltiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SimplePaltiModal: React.FC<SimplePaltiModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    variety: '',
    sourceBags: '',
    sourcePackaging: '',
    targetPackaging: '',
    location: ''
  });

  const [packagings, setPackagings] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [shortageInfo, setShortageInfo] = useState<{
    targetBags: number;
    shortageKg: number;
    shortageBags: number;
    shortagePercentage: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPackagings();
      fetchLocations();
    }
  }, [isOpen]);

  // Calculate shortage when source bags, source packaging, or target packaging changes
  useEffect(() => {
    calculateShortage();
  }, [formData.sourceBags, formData.sourcePackaging, formData.targetPackaging, packagings]);

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
        { code: 'WAREHOUSE1', name: 'WAREHOUSE1' }
      ]);
    }
  };

  const calculateShortage = () => {
    if (!formData.sourceBags || !formData.sourcePackaging || !formData.targetPackaging) {
      setShortageInfo(null);
      return;
    }

    const sourceBags = parseInt(formData.sourceBags);
    const sourcePackaging = packagings.find(p => p.id === parseInt(formData.sourcePackaging));
    const targetPackaging = packagings.find(p => p.id === parseInt(formData.targetPackaging));

    if (!sourcePackaging || !targetPackaging || sourceBags <= 0) {
      setShortageInfo(null);
      return;
    }

    const sourceKgPerBag = parseFloat(sourcePackaging.allottedKg);
    const targetKgPerBag = parseFloat(targetPackaging.allottedKg);

    // Calculate total weight
    const totalKg = sourceBags * sourceKgPerBag;

    // Calculate theoretical target bags (with decimals)
    const calculatedTargetBags = totalKg / targetKgPerBag;

    // Get actual target bags (floor value)
    const actualTargetBags = Math.floor(calculatedTargetBags);

    // Calculate shortage
    const shortageKg = totalKg - (actualTargetBags * targetKgPerBag);
    const shortageBags = shortageKg / targetKgPerBag;
    const shortagePercentage = (shortageKg / totalKg) * 100;

    setShortageInfo({
      targetBags: actualTargetBags,
      shortageKg: parseFloat(shortageKg.toFixed(3)),
      shortageBags: parseFloat(shortageBags.toFixed(3)),
      shortagePercentage: parseFloat(shortagePercentage.toFixed(2))
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (saving) {
      return;
    }

    if (!formData.date || !formData.sourceBags || !formData.sourcePackaging || !formData.targetPackaging || !formData.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!shortageInfo) {
      toast.error('Unable to calculate conversion. Please check your inputs.');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      await axios.post('/rice-stock-management/movements', {
        date: formData.date,
        movementType: 'palti',
        productType: 'Rice',
        variety: formData.variety,
        sourcePackagingId: parseInt(formData.sourcePackaging),
        targetPackagingId: parseInt(formData.targetPackaging),
        sourceBags: parseInt(formData.sourceBags),
        locationCode: formData.location
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Palti conversion created successfully! Shortage: ${shortageInfo.shortageKg}kg (${shortageInfo.shortagePercentage}%)`);
      onSuccess();
      onClose();

      // Reset form - FIXED: Don't default to "Raw", leave variety empty
      setFormData({
        date: new Date().toISOString().split('T')[0],
        variety: '',
        sourceBags: '',
        sourcePackaging: '',
        targetPackaging: '',
        location: ''
      });
      setShortageInfo(null);

    } catch (error: any) {
      console.error('Error creating Palti:', error);
      toast.error(error.response?.data?.error || 'Failed to create Palti conversion');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const sourcePackaging = packagings.find(p => p.id === parseInt(formData.sourcePackaging));
  const targetPackaging = packagings.find(p => p.id === parseInt(formData.targetPackaging));

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <Title>🔄 Palti (Brand Conversion)</Title>

        {/* PHASE 3: TYPE CONVERSION WARNING */}
        <div style={{
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ color: '#1e40af', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            ℹ️ Type Conversion Rules
          </div>
          <div style={{ color: '#1e3a8a', fontSize: '0.9rem', lineHeight: '1.5' }}>
            • Rice types can only convert to Rice types<br/>
            • Broken types can only convert to Broken types<br/>
            • Bran types can only convert to Bran types<br/>
            • Cross-category conversions are not allowed
          </div>
          <div style={{ color: '#1e40af', fontSize: '0.85rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
            Note: This modal is for Rice type conversions only. All 5 dimensions (type + variety + bagsize + packaging + location) must match source stock.
          </div>
        </div>

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
              <Label>Variety</Label>
              <Input
                type="text"
                value={formData.variety}
                onChange={(e) => handleInputChange('variety', e.target.value)}
                placeholder="Enter variety (e.g., SUM25 RNR STEAM)"
              />
            </FormGroup>

            <FormGroup>
              <Label>Source Packaging *</Label>
              <Select
                value={formData.sourcePackaging}
                onChange={(e) => handleInputChange('sourcePackaging', e.target.value)}
                required
              >
                <option value="">Select source packaging...</option>
                {packagings.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.brandName} ({pkg.allottedKg}kg)
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Source Bags *</Label>
              <Input
                type="number"
                value={formData.sourceBags}
                onChange={(e) => handleInputChange('sourceBags', e.target.value)}
                min="1"
                placeholder="Number of source bags"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Target Packaging *</Label>
              <Select
                value={formData.targetPackaging}
                onChange={(e) => handleInputChange('targetPackaging', e.target.value)}
                required
              >
                <option value="">Select target packaging...</option>
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
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
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

            {/* Shortage Information */}
            {shortageInfo && sourcePackaging && targetPackaging && (
              <ShortageBox>
                <ShortageTitle>⚠️ Conversion Shortage Information</ShortageTitle>
                <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#92400e' }}>
                  Converting {formData.sourceBags} × {sourcePackaging.brandName} ({sourcePackaging.allottedKg}kg)
                  → {shortageInfo.targetBags} × {targetPackaging.brandName} ({targetPackaging.allottedKg}kg)
                </div>
                <ShortageGrid>
                  <ShortageItem>
                    <ShortageLabel>Target Bags</ShortageLabel>
                    <ShortageValue>{shortageInfo.targetBags}</ShortageValue>
                  </ShortageItem>
                  <ShortageItem>
                    <ShortageLabel>Shortage (KG)</ShortageLabel>
                    <ShortageValue>{shortageInfo.shortageKg}</ShortageValue>
                  </ShortageItem>
                  <ShortageItem>
                    <ShortageLabel>Shortage (%)</ShortageLabel>
                    <ShortageValue>{shortageInfo.shortagePercentage}%</ShortageValue>
                  </ShortageItem>
                </ShortageGrid>
              </ShortageBox>
            )}


          </FormGrid>

          <ButtonGroup>
            <CancelButton type="button" onClick={onClose}>
              Cancel
            </CancelButton>
            <SaveButton type="submit" disabled={saving || !shortageInfo}>
              {saving ? 'Creating...' : 'Create Palti'}
            </SaveButton>
          </ButtonGroup>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default SimplePaltiModal;