import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';

const FormContainer = styled.div`
  background: #f0fdf4;
  border: 2px solid #10b981;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 0.5rem 0;
`;

const FormTitle = styled.h4`
  color: #10b981;
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormRow = styled.div<{ selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 2px solid ${props => props.selected ? '#10b981' : '#e5e7eb'};
  min-width: 0;
  overflow: hidden;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
`;

const Rate = styled.span`
  color: #6b7280;
  font-size: 0.9rem;
  white-space: nowrap;
  flex-shrink: 0;
`;

const Total = styled.span`
  font-weight: 700;
  color: #10b981;
  font-size: 1.1rem;
  min-width: 90px;
  text-align: right;
  white-space: nowrap;
  flex-shrink: 0;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  width: 80px;
  text-align: right;
  flex-shrink: 0;

  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &.primary {
    background: #10b981;
    color: white;
  }

  &.secondary {
    background: #6b7280;
    color: white;
  }

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface InlineHamaliFormProps {
  arrival: any;
  onClose: () => void;
  onSuccess: () => void;
}

const InlineHamaliForm: React.FC<InlineHamaliFormProps> = ({ arrival, onClose, onSuccess }) => {
  const [rates, setRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    if (!rates || !arrival.bags) return '0.00';
    return (arrival.bags * rates.loadingRate).toFixed(2);
  };

  const calculateUnloadingTotal = (type: 'sada' | 'kn') => {
    if (!rates || !arrival.bags) return '0.00';
    const rate = type === 'sada' ? rates.unloadingSadaRate : rates.unloadingKnRate;
    return (arrival.bags * rate).toFixed(2);
  };

  const calculateLooseTotal = () => {
    if (!rates || !looseBags) return '0.00';
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

      toast.success('Hamali entry saved successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating hamali entry:', error);
      toast.error(error.response?.data?.error || 'Failed to create hamali entry');
    }
  };

  if (loading) {
    return <FormContainer><p>Loading...</p></FormContainer>;
  }

  if (!rates) {
    return <FormContainer><p>Hamali rates not configured</p></FormContainer>;
  }

  return (
    <FormContainer>
      <FormTitle>+add Hamali - Bags: {arrival.bags}</FormTitle>

      <FormGrid>
        <FormRow selected={hasLoadingHamali}>
          <Checkbox
            type="checkbox"
            checked={hasLoadingHamali}
            onChange={() => setHasLoadingHamali(!hasLoadingHamali)}
          />
          <Label>Loading Hamali</Label>
          <Rate>₹{rates.loadingRate}</Rate>
          <Total>₹ {calculateLoadingTotal()}</Total>
        </FormRow>

        <FormRow selected={unloadingType === 'sada'}>
          <Checkbox
            type="checkbox"
            checked={unloadingType === 'sada'}
            onChange={() => handleUnloadingTypeChange('sada')}
          />
          <Label>Unloading - Sada</Label>
          <Rate>₹{rates.unloadingSadaRate}</Rate>
          <Total>₹ {calculateUnloadingTotal('sada')}</Total>
        </FormRow>

        <FormRow selected={unloadingType === 'kn'}>
          <Checkbox
            type="checkbox"
            checked={unloadingType === 'kn'}
            onChange={() => handleUnloadingTypeChange('kn')}
          />
          <Label>Unloading - KN</Label>
          <Rate>₹{rates.unloadingKnRate}</Rate>
          <Total>₹ {calculateUnloadingTotal('kn')}</Total>
        </FormRow>

        <FormRow selected={hasLooseTumbiddu}>
          <Checkbox
            type="checkbox"
            checked={hasLooseTumbiddu}
            onChange={() => setHasLooseTumbiddu(!hasLooseTumbiddu)}
          />
          <Label>Loose Tumbiddu</Label>
          <Rate>₹{rates.looseTumbidduRate}</Rate>
          <Input
            type="number"
            value={looseBags}
            onChange={(e) => setLooseBags(e.target.value)}
            placeholder="Bags"
            disabled={!hasLooseTumbiddu}
          />
          <Total>₹ {calculateLooseTotal()}</Total>
        </FormRow>
      </FormGrid>

      <ButtonGroup>
        <Button className="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button className="primary" onClick={handleSave}>
          Save
        </Button>
      </ButtonGroup>
    </FormContainer>
  );
};

export default InlineHamaliForm;
