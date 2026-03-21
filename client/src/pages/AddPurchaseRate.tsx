import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  animation: fadeIn 0.5s ease-in;
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const BackButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  background: #6b7280;
  color: white;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #4b5563;
    transform: translateY(-2px);
  }
`;

const Title = styled.h1`
  color: #1f2937;
  font-size: 1.8rem;
  margin: 0;
`;

const Card = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.07);
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  color: #374151;
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  font-size: 0.9rem;
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const DetailLabel = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 600;
`;

const DetailValue = styled.span`
  font-size: 0.85rem;
  color: #1f2937;
  font-weight: 500;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
`;

const BaseRateSection = styled.div`
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const AdjustmentsSection = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const SectionSubtitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
`;

const AdjustmentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
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
  font-size: 0.85rem;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #f59e0b;
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const RadioGroup = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #4b5563;
  cursor: pointer;
  white-space: nowrap;

  input[type="radio"] {
    cursor: pointer;
  }
`;

const CalculationBox = styled.div`
  background: #f0fdf4;
  border: 2px solid #10b981;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
`;

const CalculationRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  &:last-child {
    font-weight: 700;
    color: #059669;
  }
`;

const CalculationLabel = styled.span`
  color: #065f46;
  font-weight: 600;
  font-size: 0.75rem;
`;

const CalculationValue = styled.span`
  color: #047857;
  font-weight: 600;
  font-size: 0.9rem;
  white-space: pre-line;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 0.75rem 2rem;
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

const ErrorText = styled.span`
  color: #dc2626;
  font-size: 0.85rem;
  margin-top: 0.25rem;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  font-size: 1.2rem;
  color: #6b7280;
`;

interface Arrival {
  id: number;
  slNo: string;
  date: string;
  movementType: string;
  broker: string;
  fromLocation: string;
  toKunchinittu?: { name: string; code?: string };
  toWarehouse?: { name: string; code?: string };
  variety: string;
  bags: number;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  moisture: number;
  cutting: string;
  lorryNumber: string;
}

interface PurchaseRate {
  baseRate: string;
  rateType: 'CDL' | 'CDWB' | 'MDL' | 'MDWB';
  baseRateCalculationMethod: 'per_bag' | 'per_quintal';
  sute: string;
  suteCalculationMethod: 'per_bag' | 'per_quintal';
  h: string;
  hCalculationMethod: 'per_bag' | 'per_quintal';
  b: string;
  bCalculationMethod: 'per_bag' | 'per_quintal';
  lf: string;
  lfCalculationMethod: 'per_bag' | 'per_quintal';
  egb: string;
}

const AddPurchaseRate: React.FC = () => {
  const { arrivalId } = useParams<{ arrivalId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [isUpdate, setIsUpdate] = useState(false);

  const [formData, setFormData] = useState<PurchaseRate>({
    baseRate: '',
    rateType: 'CDL',
    baseRateCalculationMethod: 'per_bag',
    sute: '0',
    suteCalculationMethod: 'per_bag',
    h: '0',
    hCalculationMethod: 'per_bag',
    b: '0',
    bCalculationMethod: 'per_bag',
    lf: '0',
    lfCalculationMethod: 'per_bag',
    egb: '0'
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Fetch arrival details and existing rate
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch arrival details
        const arrivalResponse = await axios.get<{ arrival: Arrival }>(`/arrivals/${arrivalId}`);
        const arrivalData = arrivalResponse.data.arrival;

        if (arrivalData.movementType !== 'purchase') {
          toast.error('Rates can only be added to purchase records');
          navigate('/records');
          return;
        }

        setArrival(arrivalData);

        // Fetch existing rate if any
        const rateResponse = await axios.get<{ purchaseRate: any }>(`/purchase-rates/${arrivalId}`);
        if (rateResponse.data.purchaseRate) {
          const rate = rateResponse.data.purchaseRate;
          setFormData({
            baseRate: rate.baseRate.toString(),
            rateType: rate.rateType,
            baseRateCalculationMethod: rate.baseRateCalculationMethod || 'per_bag',
            sute: rate.sute?.toString() || '0',
            suteCalculationMethod: rate.suteCalculationMethod || 'per_bag',
            h: rate.h.toString(),
            hCalculationMethod: rate.hCalculationMethod || 'per_bag',
            b: rate.b.toString(),
            bCalculationMethod: rate.bCalculationMethod || 'per_bag',
            lf: rate.lf.toString(),
            lfCalculationMethod: rate.lfCalculationMethod || 'per_bag',
            egb: rate.egb.toString()
          });
          setIsUpdate(true);
        } else {
          // No existing rate - reset form to default values
          setFormData({
            baseRate: '',
            rateType: 'CDL',
            baseRateCalculationMethod: 'per_bag',
            sute: '0',
            suteCalculationMethod: 'per_bag',
            h: '0',
            hCalculationMethod: 'per_bag',
            b: '0',
            bCalculationMethod: 'per_bag',
            lf: '0',
            lfCalculationMethod: 'per_bag',
            egb: '0'
          });
          setIsUpdate(false);
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load purchase record');
        navigate('/records');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [arrivalId, navigate]);

  // Calculate values
  const weightInQuintals = arrival ? parseFloat(arrival.netWeight.toString()) / 100 : 0;
  const bags = arrival ? arrival.bags : 0;
  const actualNetWeight = arrival ? parseFloat(arrival.netWeight.toString()) : 0;

  // Calculate sute net weight first (needed for base rate calculation)
  let suteNetWeight = actualNetWeight;
  let suteAmount = 0;
  if (arrival && formData.sute) {
    const suteValue = parseFloat(formData.sute);
    if (formData.suteCalculationMethod === 'per_bag') {
      // Per bag: sute amount = sute value × bags
      suteAmount = suteValue * bags;
    } else {
      // Per quintal: sute amount = (actual net weight ÷ 100) × sute value
      suteAmount = (actualNetWeight / 100) * suteValue;
    }
    // ALWAYS deduct sute from actual net weight to get sute net weight
    suteNetWeight = actualNetWeight - suteAmount;
  }

  // Base Rate Calculation based on calculation method - ALWAYS uses Sute Net Weight
  let baseRateAmount = 0;
  if (formData.baseRateCalculationMethod === 'per_bag') {
    // Per Bag: (sute net weight ÷ 75) × base rate
    baseRateAmount = (suteNetWeight / 75) * parseFloat(formData.baseRate || '0');
  } else {
    // Per Quintal: (sute net weight ÷ 100) × base rate
    baseRateAmount = (suteNetWeight / 100) * parseFloat(formData.baseRate || '0');
  }

  // Calculate hamali amount
  // For MDL and MDWB: if H is negative, it should DEDUCT from total
  const hamaliValue = parseFloat(formData.h || '0');
  let hamaliAmount = 0;
  if (formData.hCalculationMethod === 'per_bag') {
    hamaliAmount = bags * hamaliValue;
  } else {
    hamaliAmount = (actualNetWeight / 100) * hamaliValue;
  }
  // For display purposes
  const effectiveHamaliValue = hamaliValue;

  // Calculate B amount
  let bAmount = 0;
  if (arrival && formData.b) {
    const bValue = parseFloat(formData.b);
    if (formData.bCalculationMethod === 'per_bag') {
      bAmount = bValue * bags;
    } else {
      bAmount = bValue * weightInQuintals;
    }
  }

  // Calculate LF amount with column-type specific rules
  // MDL and MDWB: LF = 0 (no LF allowed)
  let lfAmount = 0;
  const effectiveLfValue = ['MDL', 'MDWB'].includes(formData.rateType) ? 0 : parseFloat(formData.lf || '0');
  if (arrival && effectiveLfValue > 0) {
    if (formData.lfCalculationMethod === 'per_bag') {
      lfAmount = effectiveLfValue * bags;
    } else {
      lfAmount = effectiveLfValue * weightInQuintals;
    }
  }

  // EGB calculation based on rate type
  const showEGB = formData.rateType === 'CDL' || formData.rateType === 'MDL';
  const egbAmount = showEGB ? bags * parseFloat(formData.egb || '0') : 0;

  const totalAmount = baseRateAmount + hamaliAmount + bAmount + lfAmount + egbAmount;
  // Calculate average rate per 75 kg
  const averageRate = actualNetWeight > 0 ? (totalAmount / actualNetWeight) * 75 : 0;

  // Build amount formula with base rate on top, sute on second line, other calculations follow
  const baseRateLine = `${formData.baseRate || '0'}${formData.rateType.toLowerCase()}`;
  const adjustmentParts = [];

  // NEW: Add sute FIRST on second line
  if (parseFloat(formData.sute || '0') !== 0) {
    const suteLabel = formData.suteCalculationMethod === 'per_bag' ? 's/bag' : 's/Q';
    const suteValue = parseFloat(formData.sute || '0');
    adjustmentParts.push(`${suteValue > 0 ? '+' : ''}${formData.sute || '0'}${suteLabel}`);
  }

  // Show hamali with correct sign and calculation method suffix
  if (effectiveHamaliValue !== 0) {
    const hLabel = formData.hCalculationMethod === 'per_bag' ? 'h/b' : 'h/q';
    adjustmentParts.push(`${effectiveHamaliValue > 0 ? '+' : ''}${effectiveHamaliValue}${hLabel}`);
  }
  if (parseFloat(formData.b || '0') !== 0) {
    const bLabel = formData.bCalculationMethod === 'per_bag' ? 'b/b' : 'b/q';
    adjustmentParts.push(`+${formData.b || '0'}${bLabel}`);
  }
  // LF only shown for CDL/CDWB (0 for MDL/MDWB)
  if (effectiveLfValue !== 0) {
    const lfLabel = formData.lfCalculationMethod === 'per_bag' ? 'lf/b' : 'lf/q';
    adjustmentParts.push(`+${effectiveLfValue}${lfLabel}`);
  }
  if (showEGB && parseFloat(formData.egb || '0') !== 0) {
    adjustmentParts.push(`+${formData.egb || '0'}egb/b`);
  }

  const amountFormula = adjustmentParts.length > 0
    ? `${baseRateLine}\n${adjustmentParts.join('')}`
    : baseRateLine;

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.baseRate || parseFloat(formData.baseRate) <= 0) {
      newErrors.baseRate = 'Base rate is required and must be greater than 0';
    }

    if (!formData.rateType) {
      newErrors.rateType = 'Rate type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change with column-type rules
  const handleInputChange = (field: keyof PurchaseRate, value: string) => {
    if (field === 'rateType') {
      // Apply column-type specific rules when rate type changes
      const rateTypeValue = value as 'CDL' | 'CDWB' | 'MDL' | 'MDWB';
      const updates: Partial<PurchaseRate> = { rateType: rateTypeValue };

      // CDWB and MDWB: force EGB = 0
      if (rateTypeValue === 'CDWB' || rateTypeValue === 'MDWB') {
        updates.egb = '0';
      }
      // MDL and MDWB: force LF = 0
      if (rateTypeValue === 'MDL' || rateTypeValue === 'MDWB') {
        updates.lf = '0';
      }

      setFormData(prev => ({ ...prev, ...updates }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    try {
      setSaving(true);

      await axios.post('/purchase-rates', {
        arrivalId: parseInt(arrivalId!),
        sute: parseFloat(formData.sute),
        suteCalculationMethod: formData.suteCalculationMethod,
        baseRate: parseFloat(formData.baseRate),
        rateType: formData.rateType,
        baseRateCalculationMethod: formData.baseRateCalculationMethod,
        h: parseFloat(formData.h),
        hCalculationMethod: formData.hCalculationMethod,
        b: parseFloat(formData.b),
        bCalculationMethod: formData.bCalculationMethod,
        lf: parseFloat(formData.lf),
        lfCalculationMethod: formData.lfCalculationMethod,
        egb: parseFloat(formData.egb)
      });

      toast.success(isUpdate ? 'Rate updated successfully!' : 'Rate added successfully!');
      navigate('/records');
    } catch (error: any) {
      console.error('Error saving rate:', error);
      toast.error(error.response?.data?.error || 'Failed to save rate');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/records');
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>Loading purchase record...</LoadingSpinner>
      </Container>
    );
  }

  if (!arrival) {
    return (
      <Container>
        <LoadingSpinner>Purchase record not found</LoadingSpinner>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={handleCancel}>← Back to Purchase Records</BackButton>
        <Title>📊 {isUpdate ? 'Update' : 'Add'} Rate - Purchase Record</Title>
      </Header>

      {/* Selected Record Details */}
      <Card>
        <SectionTitle>Selected Record Details</SectionTitle>
        <DetailGrid>
          <DetailItem>
            <DetailLabel>Date</DetailLabel>
            <DetailValue>{new Date(arrival.date).toLocaleDateString('en-GB')}</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>Lorry Number</DetailLabel>
            <DetailValue>{arrival.lorryNumber}</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>Broker</DetailLabel>
            <DetailValue>{arrival.broker}</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>From</DetailLabel>
            <DetailValue>{arrival.fromLocation}</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>To</DetailLabel>
            <DetailValue>
              {arrival.toKunchinittu?.name || arrival.toWarehouse?.name || '-'}
            </DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>Variety</DetailLabel>
            <DetailValue>{arrival.variety}</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>Bags</DetailLabel>
            <DetailValue>{arrival.bags}</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>Gross Weight</DetailLabel>
            <DetailValue>{parseFloat(arrival.grossWeight.toString()).toFixed(2)} kg</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>Tare Weight</DetailLabel>
            <DetailValue>{parseFloat(arrival.tareWeight.toString()).toFixed(2)} kg</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>Net Weight</DetailLabel>
            <DetailValue>{parseFloat(arrival.netWeight.toString()).toFixed(2)} kg ({weightInQuintals.toFixed(2)} quintals)</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>Moisture</DetailLabel>
            <DetailValue>{arrival.moisture}%</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>Cutting</DetailLabel>
            <DetailValue>{(() => {
              const c = arrival.cutting;
              if (!c || c === '-') return '-';
              const s = String(c).trim();
              if (s.includes('X') || s.includes('x')) {
                const parts = s.split(/[Xx]/);
                if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
                  return `${parts[0].trim()} x ${parts[1].trim()}`;
                }
              }
              return s;
            })()}</DetailValue>
          </DetailItem>
        </DetailGrid>
      </Card>

      {/* Rate Calculation Form */}
      <Card>
        <SectionTitle>Rate Calculation Form</SectionTitle>

        {/* Base Rate Section */}
        <BaseRateSection>
          <SectionSubtitle>Base Rate</SectionSubtitle>
          <FormGroup>
            <Label>Base Rate *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.baseRate}
              onChange={(e) => handleInputChange('baseRate', e.target.value)}
              placeholder="Base rate"
            />
            {errors.baseRate && <ErrorText>{errors.baseRate}</ErrorText>}
            <RadioGroup>
              {['CDL', 'CDWB', 'MDL', 'MDWB'].map(type => (
                <RadioLabel key={type}>
                  <input
                    type="radio"
                    name="rateType"
                    value={type}
                    checked={formData.rateType === type}
                    onChange={(e) => handleInputChange('rateType', e.target.value as any)}
                  />
                  {type}
                </RadioLabel>
              ))}
            </RadioGroup>
            <RadioGroup style={{ marginTop: '0.5rem' }}>
              <RadioLabel>
                <input
                  type="radio"
                  name="baseRateCalculationMethod"
                  value="per_bag"
                  checked={formData.baseRateCalculationMethod === 'per_bag'}
                  onChange={(e) => handleInputChange('baseRateCalculationMethod', e.target.value as any)}
                />
                Per Bag (÷75)
              </RadioLabel>
              <RadioLabel>
                <input
                  type="radio"
                  name="baseRateCalculationMethod"
                  value="per_quintal"
                  checked={formData.baseRateCalculationMethod === 'per_quintal'}
                  onChange={(e) => handleInputChange('baseRateCalculationMethod', e.target.value as any)}
                />
                Per Quintal (÷100)
              </RadioLabel>
            </RadioGroup>
            {/* Live Calculation Output */}
            {parseFloat(formData.baseRate || '0') > 0 && (
              <div style={{ background: '#d1fae5', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', marginTop: '4px' }}>
                <div><strong>Formula:</strong> ({suteNetWeight.toFixed(2)} ÷ {formData.baseRateCalculationMethod === 'per_bag' ? '75' : '100'}) × {formData.baseRate}</div>
                <div><strong>Base Rate Amt:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{baseRateAmount.toFixed(2)}</span></div>
              </div>
            )}
          </FormGroup>
        </BaseRateSection>

        {/* Adjustments Section */}
        <AdjustmentsSection>
          <SectionSubtitle>Adjustments</SectionSubtitle>
          <AdjustmentsGrid>
            {/* Sute */}
            <FormGroup>
              <Label>Sute</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.sute}
                onChange={(e) => handleInputChange('sute', e.target.value)}
                placeholder="Sute"
              />
              <RadioGroup>
                <RadioLabel>
                  <input
                    type="radio"
                    name="suteCalculationMethod"
                    value="per_bag"
                    checked={formData.suteCalculationMethod === 'per_bag'}
                    onChange={(e) => handleInputChange('suteCalculationMethod', e.target.value as any)}
                  />
                  Per Bag
                </RadioLabel>
                <RadioLabel>
                  <input
                    type="radio"
                    name="suteCalculationMethod"
                    value="per_quintal"
                    checked={formData.suteCalculationMethod === 'per_quintal'}
                    onChange={(e) => handleInputChange('suteCalculationMethod', e.target.value as any)}
                  />
                  Per Quintal
                </RadioLabel>
              </RadioGroup>
              {/* Live Calculation Output */}
              {parseFloat(formData.sute || '0') > 0 && (
                <div style={{ background: '#fef3c7', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', marginTop: '4px' }}>
                  <div><strong>Sute Amt:</strong> {formData.suteCalculationMethod === 'per_bag' ? `${formData.sute} × ${bags} = ` : `(${actualNetWeight}/100) × ${formData.sute} = `}<span style={{ color: '#dc2626' }}>-{suteAmount.toFixed(2)} kg</span></div>
                  <div><strong>Sute Net Wt:</strong> {actualNetWeight.toFixed(0)} - {suteAmount.toFixed(2)} = <span style={{ color: '#059669', fontWeight: 'bold' }}>{suteNetWeight.toFixed(2)} kg</span></div>
                </div>
              )}
            </FormGroup>

            {/* H */}
            <FormGroup>
              <Label>H (Hamali)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.h}
                onChange={(e) => handleInputChange('h', e.target.value)}
                placeholder="H (negative to deduct)"
                title="Enter negative value (e.g., -100) to subtract from total"
              />
              <RadioGroup>
                <RadioLabel>
                  <input
                    type="radio"
                    name="hCalculationMethod"
                    value="per_bag"
                    checked={formData.hCalculationMethod === 'per_bag'}
                    onChange={(e) => handleInputChange('hCalculationMethod', e.target.value as any)}
                  />
                  Bag
                </RadioLabel>
                <RadioLabel>
                  <input
                    type="radio"
                    name="hCalculationMethod"
                    value="per_quintal"
                    checked={formData.hCalculationMethod === 'per_quintal'}
                    onChange={(e) => handleInputChange('hCalculationMethod', e.target.value as any)}
                  />
                  Quintal
                </RadioLabel>
              </RadioGroup>
              {/* Live Calculation Output */}
              {parseFloat(formData.h || '0') !== 0 && (
                <div style={{ background: hamaliAmount >= 0 ? '#d1fae5' : '#fee2e2', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', marginTop: '4px' }}>
                  <div><strong>Formula:</strong> {formData.h} × {formData.hCalculationMethod === 'per_bag' ? `${bags} bags` : `(${actualNetWeight}/100)`}</div>
                  <div><strong>H Amt:</strong> <span style={{ color: hamaliAmount >= 0 ? '#059669' : '#dc2626', fontWeight: 'bold' }}>{hamaliAmount >= 0 ? '+' : ''}₹{hamaliAmount.toFixed(2)}</span></div>
                </div>
              )}
            </FormGroup>

            {/* B */}
            <FormGroup>
              <Label>B</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.b}
                onChange={(e) => handleInputChange('b', e.target.value)}
                placeholder="B"
              />
              <RadioGroup>
                <RadioLabel>
                  <input
                    type="radio"
                    name="bCalculationMethod"
                    value="per_bag"
                    checked={formData.bCalculationMethod === 'per_bag'}
                    onChange={(e) => handleInputChange('bCalculationMethod', e.target.value as any)}
                  />
                  Bag
                </RadioLabel>
                <RadioLabel>
                  <input
                    type="radio"
                    name="bCalculationMethod"
                    value="per_quintal"
                    checked={formData.bCalculationMethod === 'per_quintal'}
                    onChange={(e) => handleInputChange('bCalculationMethod', e.target.value as any)}
                  />
                  Quintal
                </RadioLabel>
              </RadioGroup>
              {/* Live Calculation Output */}
              {parseFloat(formData.b || '0') > 0 && (
                <div style={{ background: '#d1fae5', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', marginTop: '4px' }}>
                  <div><strong>Formula:</strong> {formData.b} × {formData.bCalculationMethod === 'per_bag' ? `${bags} bags` : `(${actualNetWeight}/100)`}</div>
                  <div><strong>B Amt:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>+₹{bAmount.toFixed(2)}</span></div>
                </div>
              )}
            </FormGroup>

            {/* LF - Disabled for MDL and MDWB */}
            <FormGroup>
              <Label>LF {['MDL', 'MDWB'].includes(formData.rateType) && <span style={{ color: '#dc2626', fontSize: '0.7rem' }}>(N/A for {formData.rateType})</span>}</Label>
              <Input
                type="number"
                step="0.01"
                value={['MDL', 'MDWB'].includes(formData.rateType) ? '0' : formData.lf}
                onChange={(e) => handleInputChange('lf', e.target.value)}
                placeholder="LF"
                disabled={['MDL', 'MDWB'].includes(formData.rateType)}
                style={['MDL', 'MDWB'].includes(formData.rateType) ? { background: '#fee2e2', cursor: 'not-allowed' } : {}}
              />
              {!['MDL', 'MDWB'].includes(formData.rateType) && (
                <RadioGroup>
                  <RadioLabel>
                    <input
                      type="radio"
                      name="lfCalculationMethod"
                      value="per_bag"
                      checked={formData.lfCalculationMethod === 'per_bag'}
                      onChange={(e) => handleInputChange('lfCalculationMethod', e.target.value as any)}
                    />
                    Bag
                  </RadioLabel>
                  <RadioLabel>
                    <input
                      type="radio"
                      name="lfCalculationMethod"
                      value="per_quintal"
                      checked={formData.lfCalculationMethod === 'per_quintal'}
                      onChange={(e) => handleInputChange('lfCalculationMethod', e.target.value as any)}
                    />
                    Quintal
                  </RadioLabel>
                </RadioGroup>
              )}
              {/* Live Calculation Output */}
              {lfAmount > 0 && (
                <div style={{ background: '#d1fae5', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', marginTop: '4px' }}>
                  <div><strong>Formula:</strong> {formData.lf} × {formData.lfCalculationMethod === 'per_bag' ? `${bags} bags` : `(${actualNetWeight}/100)`}</div>
                  <div><strong>LF Amt:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>+₹{lfAmount.toFixed(2)}</span></div>
                </div>
              )}
            </FormGroup>

            {/* EGB - Show for CDL and MDL */}
            {(formData.rateType === 'CDL' || formData.rateType === 'MDL') && (
              <FormGroup>
                <Label>EGB</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.egb}
                  onChange={(e) => handleInputChange('egb', e.target.value)}
                  placeholder="EGB"
                />
                {/* Live Calculation Output */}
                {parseFloat(formData.egb || '0') > 0 && (
                  <div style={{ background: '#d1fae5', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', marginTop: '4px' }}>
                    <div><strong>Formula:</strong> {formData.egb} × {bags} bags</div>
                    <div><strong>EGB Amt:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>+₹{egbAmount.toFixed(2)}</span></div>
                  </div>
                )}
              </FormGroup>
            )}
          </AdjustmentsGrid>
        </AdjustmentsSection>

        {/* Calculations */}
        <CalculationBox>
          <CalculationRow>
            <CalculationLabel>Net Weight</CalculationLabel>
            <CalculationValue>{weightInQuintals.toFixed(2)} Q ({actualNetWeight.toFixed(0)} kg)</CalculationValue>
          </CalculationRow>

          {/* Detailed Breakdown */}
          <div style={{
            background: '#f8fafc',
            padding: '0.75rem',
            borderRadius: '6px',
            margin: '0.5rem 0',
            fontSize: '0.85rem',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#1e40af' }}>📊 Calculation Breakdown:</div>

            {parseFloat(formData.sute || '0') > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span>Sute ({formData.sute} × {formData.suteCalculationMethod === 'per_bag' ? `${bags} bags` : `${weightInQuintals.toFixed(2)}Q`})</span>
                <span style={{ color: '#dc2626' }}>-{suteAmount.toFixed(2)} kg</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>Sute Net Weight</span>
              <span style={{ fontWeight: 'bold' }}>{suteNetWeight.toFixed(2)} kg</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderTop: '1px solid #e2e8f0', marginTop: '4px', paddingTop: '4px' }}>
              <span>Base Rate ({formData.baseRate} × {formData.baseRateCalculationMethod === 'per_bag' ? `${suteNetWeight.toFixed(2)}/75` : `${(suteNetWeight / 100).toFixed(2)}Q`})</span>
              <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{baseRateAmount.toFixed(2)}</span>
            </div>

            {effectiveHamaliValue !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span>H ({effectiveHamaliValue} × {formData.hCalculationMethod === 'per_bag' ? `${bags} bags` : `${weightInQuintals.toFixed(2)}Q`})</span>
                <span style={{ color: hamaliAmount >= 0 ? '#059669' : '#dc2626' }}>{hamaliAmount >= 0 ? '+' : ''}₹{hamaliAmount.toFixed(2)}</span>
              </div>
            )}

            {bAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span>B ({formData.b} × {formData.bCalculationMethod === 'per_bag' ? `${bags} bags` : `${weightInQuintals.toFixed(2)}Q`})</span>
                <span style={{ color: '#059669' }}>+₹{bAmount.toFixed(2)}</span>
              </div>
            )}

            {lfAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span>LF ({formData.lf} × {formData.lfCalculationMethod === 'per_bag' ? `${bags} bags` : `${weightInQuintals.toFixed(2)}Q`})</span>
                <span style={{ color: '#059669' }}>+₹{lfAmount.toFixed(2)}</span>
              </div>
            )}

            {egbAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span>EGB ({formData.egb} × {bags} bags)</span>
                <span style={{ color: '#059669' }}>+₹{egbAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <CalculationRow>
            <CalculationLabel>Formula</CalculationLabel>
            <CalculationValue>{amountFormula}</CalculationValue>
          </CalculationRow>
          <CalculationRow style={{ background: '#dcfce7', padding: '8px', borderRadius: '4px' }}>
            <CalculationLabel style={{ fontWeight: 'bold', color: '#166534' }}>Total Amount</CalculationLabel>
            <CalculationValue style={{ fontWeight: 'bold', color: '#166534', fontSize: '1.1rem' }}>₹{totalAmount.toFixed(2)}</CalculationValue>
          </CalculationRow>
          <CalculationRow>
            <CalculationLabel>Avg Rate/Q</CalculationLabel>
            <CalculationValue>₹{averageRate.toFixed(2)}</CalculationValue>
          </CalculationRow>
        </CalculationBox>

        {/* Action Buttons */}
        <ButtonGroup>
          <Button className="secondary" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isUpdate ? 'Update Rate' : 'Save Rate'}
          </Button>
        </ButtonGroup>
      </Card>
    </Container>
  );
};

export default AddPurchaseRate;
