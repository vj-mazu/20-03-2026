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
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
`;

const ModalTitle = styled.h2`
  color: #10b981;
  margin: 0;
  font-size: 1.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0.5rem;
  
  &:hover {
    color: #374151;
  }
`;

const DetailsBox = styled.div`
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 2px solid #e5e7eb;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`;

const Label = styled.span`
  font-weight: 600;
  color: #374151;
`;

const Value = styled.span`
  color: #6b7280;
  font-size: 1.1rem;
`;

const HamaliSection = styled.div`
  margin-bottom: 1.5rem;
`;

const HamaliRow = styled.div<{ selected?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 2px solid ${props => props.selected ? '#10b981' : '#e5e7eb'};
  border-radius: 8px;
  margin-bottom: 0.75rem;
  background: ${props => props.selected ? '#f0fdf4' : 'white'};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: #10b981;
  }
`;

const HamaliLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
`;

const HamaliInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Rate = styled.span`
  color: #6b7280;
  font-size: 0.9rem;
`;

const Total = styled.span`
  font-weight: 700;
  color: #10b981;
  font-size: 1.2rem;
`;

const SubSection = styled.div`
  padding-left: 2rem;
  margin-top: 0.5rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  width: 120px;
  text-align: right;

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

interface AddHamaliModalProps {
  arrival: any;
  onClose: () => void;
  onSuccess: () => void;
}

const AddHamaliModal: React.FC<AddHamaliModalProps> = ({ arrival, onClose, onSuccess }) => {
  const [rates, setRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [hasLoadingHamali, setHasLoadingHamali] = useState(false);
  const [hasUnloadingHamali, setHasUnloadingHamali] = useState(false);
  const [unloadingType, setUnloadingType] = useState<'sada' | 'kn' | null>(null);
  const [hasLooseTumbiddu, setHasLooseTumbiddu] = useState(false);
  const [looseBags, setLooseBags] = useState('');

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<{ rates: any }>('/hamali-rates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRates(response.data.rates);
    } catch (error) {
      console.error('Error fetching rates:', error);
      toast.error('Failed to fetch hamali rates');
    } finally {
      setLoading(false);
    }
  };

  const calculateLoadingTotal = () => {
    if (!rates || !arrival.bags) return 0;
    return (arrival.bags * rates.loadingRate).toFixed(2);
  };

  const calculateUnloadingTotal = (type: 'sada' | 'kn') => {
    if (!rates || !arrival.bags) return 0;
    const rate = type === 'sada' ? rates.unloadingSadaRate : rates.unloadingKnRate;
    return (arrival.bags * rate).toFixed(2);
  };

  const calculateLooseTotal = () => {
    if (!rates || !looseBags) return 0;
    return (parseFloat(looseBags) * rates.looseTumbidduRate).toFixed(2);
  };

  const handleUnloadingTypeChange = (type: 'sada' | 'kn') => {
    if (unloadingType === type) {
      setUnloadingType(null);
      setHasUnloadingHamali(false);
    } else {
      setUnloadingType(type);
      setHasUnloadingHamali(true);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!hasLoadingHamali && !hasUnloadingHamali && !hasLooseTumbiddu) {
      toast.error('Please select at least one hamali type');
      return;
    }

    if (hasLooseTumbiddu && (!looseBags || parseFloat(looseBags) <= 0)) {
      toast.error('Please enter bags for Loose Tumbiddu');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        arrivalId: arrival.id,
        hasLoadingHamali,
        hasUnloadingHamali,
        unloadingType,
        hasLooseTumbiddu,
        looseBags: hasLooseTumbiddu ? parseInt(looseBags) : null
      };

      await axios.post('/hamali-entries', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Hamali entry created successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating hamali entry:', error);
      toast.error(error.response?.data?.error || 'Failed to create hamali entry');
    }
  };

  if (loading) {
    return (
      <ModalOverlay>
        <ModalContent>
          <p>Loading...</p>
        </ModalContent>
      </ModalOverlay>
    );
  }

  if (!rates) {
    return (
      <ModalOverlay>
        <ModalContent>
          <p>Hamali rates not configured. Please configure rates in Locations page.</p>
          <ButtonGroup>
            <Button className="secondary" onClick={onClose}>Close</Button>
          </ButtonGroup>
        </ModalContent>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>+add Hamali</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <DetailsBox>
          <h3 style={{ margin: '0 0 1rem 0', color: '#374151' }}>Details</h3>
          <DetailRow>
            <Label>Bags</Label>
            <Value>{arrival.bags}</Value>
          </DetailRow>
        </DetailsBox>

        <HamaliSection>
          <HamaliRow
            selected={hasLoadingHamali}
            onClick={() => setHasLoadingHamali(!hasLoadingHamali)}
          >
            <HamaliLabel>
              <Checkbox
                type="checkbox"
                checked={hasLoadingHamali}
                onChange={() => setHasLoadingHamali(!hasLoadingHamali)}
                onClick={(e) => e.stopPropagation()}
              />
              <Label>Loading Hamali</Label>
            </HamaliLabel>
            <HamaliInfo>
              <Rate>₹{rates.loadingRate}</Rate>
              <Total>₹ {calculateLoadingTotal()}</Total>
            </HamaliInfo>
          </HamaliRow>

          <div>
            <Label style={{ display: 'block', marginBottom: '0.75rem', marginLeft: '0.5rem' }}>
              Unloading Hamali
            </Label>
            <SubSection>
              <HamaliRow
                selected={unloadingType === 'sada'}
                onClick={() => handleUnloadingTypeChange('sada')}
              >
                <HamaliLabel>
                  <Checkbox
                    type="checkbox"
                    checked={unloadingType === 'sada'}
                    onChange={() => handleUnloadingTypeChange('sada')}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Label>Sada</Label>
                </HamaliLabel>
                <HamaliInfo>
                  <Rate>₹{rates.unloadingSadaRate}</Rate>
                  <Total>₹ {calculateUnloadingTotal('sada')}</Total>
                </HamaliInfo>
              </HamaliRow>

              <HamaliRow
                selected={unloadingType === 'kn'}
                onClick={() => handleUnloadingTypeChange('kn')}
              >
                <HamaliLabel>
                  <Checkbox
                    type="checkbox"
                    checked={unloadingType === 'kn'}
                    onChange={() => handleUnloadingTypeChange('kn')}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Label>KN</Label>
                </HamaliLabel>
                <HamaliInfo>
                  <Rate>₹{rates.unloadingKnRate}</Rate>
                  <Total>₹ {calculateUnloadingTotal('kn')}</Total>
                </HamaliInfo>
              </HamaliRow>
            </SubSection>
          </div>

          <HamaliRow
            selected={hasLooseTumbiddu}
            onClick={() => setHasLooseTumbiddu(!hasLooseTumbiddu)}
          >
            <HamaliLabel>
              <Checkbox
                type="checkbox"
                checked={hasLooseTumbiddu}
                onChange={() => setHasLooseTumbiddu(!hasLooseTumbiddu)}
                onClick={(e) => e.stopPropagation()}
              />
              <Label>Loose Tumbiddu</Label>
            </HamaliLabel>
            <HamaliInfo>
              <Rate>₹{rates.looseTumbidduRate}</Rate>
              <Input
                type="number"
                value={looseBags}
                onChange={(e) => setLooseBags(e.target.value)}
                placeholder="Bags"
                onClick={(e) => e.stopPropagation()}
                disabled={!hasLooseTumbiddu}
              />
              <Total>₹ {calculateLooseTotal()}</Total>
            </HamaliInfo>
          </HamaliRow>
        </HamaliSection>

        <ButtonGroup>
          <Button className="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button className="primary" onClick={handleSave}>
            Save
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default AddHamaliModal;
