import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import RiceStockVarietyDropdown from './RiceStockVarietyDropdown';

const FormContainer = styled.div`
  background: #fffbeb;
  border: 2px solid #f59e0b;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 0.5rem 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
`;

const FormTitle = styled.h4`
  color: #d97706;
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
  font-size: 0.85rem;
`;

const Select = styled.select`
  padding: 0.6rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.95rem;
  background: white;

  &:focus {
    outline: none;
    border-color: #f59e0b;
  }
`;

const Input = styled.input`
  padding: 0.6rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.95rem;

  &:focus {
    outline: none;
    border-color: #f59e0b;
  }
`;

const StatsRow = styled.div`
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #fde68a;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatLabel = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  font-weight: 600;
`;

const StatValue = styled.span<{ $type?: 'source' | 'target' | 'shortage' }>`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${props => {
        if (props.$type === 'source') return '#1e40af';
        if (props.$type === 'target') return '#059669';
        if (props.$type === 'shortage') return '#dc2626';
        return '#1f2937';
    }};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
`;

const Button = styled.button`
  padding: 0.6rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &.primary {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    box-shadow: 0 2px 4px rgba(217, 119, 6, 0.2);
  }

  &.secondary {
    background: #e5e7eb;
    color: #4b5563;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface InlinePaltiFormProps {
    arrival: any;
    onClose: () => void;
    onSuccess: () => void;
}

const InlinePaltiForm: React.FC<InlinePaltiFormProps> = ({ arrival, onClose, onSuccess }) => {
    const [packagings, setPackagings] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [targetVariety, setTargetVariety] = useState(arrival.variety || '');
    const [selectedOutturnId, setSelectedOutturnId] = useState<number | null>(arrival.outturnId || null);
    const [targetPackagingId, setTargetPackagingId] = useState('');
    const [targetBags, setTargetBags] = useState(arrival.bags?.toString() || '');
    const [targetLocationCode, setTargetLocationCode] = useState(arrival.toWarehouse?.code || arrival.fromLocation || '');

    useEffect(() => {
        fetchFormData();
    }, []);

    const fetchFormData = async () => {
        try {
            const [pkgRes, locRes] = await Promise.all([
                axios.get<{ packagings: any[] }>('/packagings'),
                axios.get<{ locations: any[] }>('/locations/rice-stock-locations')
            ]);
            setPackagings(pkgRes.data.packagings || []);
            setLocations(locRes.data.locations || []);
        } catch (error) {
            console.error('Error fetching form data:', error);
            toast.error('Failed to load required data');
        } finally {
            setLoading(false);
        }
    };

    const calculateSourceStats = () => {
        const bags = arrival.bags || 0;
        // Assuming source is always 26kg if not specified, or use outturn variety logic
        const kgPerBag = 26;
        const qtls = (bags * kgPerBag) / 100;
        return { bags, qtls };
    };

    const calculateTargetStats = () => {
        const bags = parseInt(targetBags) || 0;
        const pkg = packagings.find(p => p.id === parseInt(targetPackagingId));
        const kgPerBag = pkg ? parseFloat(pkg.allottedKg) : 26;
        const qtls = (bags * kgPerBag) / 100;
        return { bags, qtls };
    };

    const sourceStats = calculateSourceStats();
    const targetStats = calculateTargetStats();
    const shortageQtls = sourceStats.qtls - targetStats.qtls;

    const handleSave = async () => {
        if (!targetPackagingId || !targetBags || !targetLocationCode) {
            toast.error('Please fill all required fields');
            return;
        }

        if (targetStats.qtls > sourceStats.qtls) {
            toast.error('Target weight cannot exceed source weight');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                date: new Date().toISOString().split('T')[0], // Use today for palti
                movementType: 'palti',
                productType: 'Rice', // Default to Rice as per project standard
                outturnId: selectedOutturnId,
                variety: targetVariety,
                sourceLocationCode: arrival.toWarehouse?.code || arrival.fromLocation,
                sourcePackagingId: null, // Assuming source info comes from arrival
                sourceBags: arrival.bags,
                targets: [
                    {
                        targetPackagingId: parseInt(targetPackagingId),
                        bags: parseInt(targetBags),
                        targetLocationCode
                    }
                ],
                shortageKg: shortageQtls * 100
            };

            await axios.post('/rice-stock-management/movements', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Palti entry created successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error creating palti entry:', error);
            toast.error(error.response?.data?.error || 'Failed to create palti entry');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <FormContainer>Loading...</FormContainer>;

    return (
        <FormContainer onClick={(e) => e.stopPropagation()}>
            <FormTitle>🔄 Inline Palti Conversion - {arrival.slNo}</FormTitle>

            <FormGrid>
                <FormGroup>
                    <Label>Target Variety</Label>
                    <RiceStockVarietyDropdown
                        value={selectedOutturnId}
                        onChange={(id: number | null, data?: any) => {
                            setSelectedOutturnId(id);
                            if (data) setTargetVariety(data.standardized_variety);
                        }}
                    />
                </FormGroup>

                <FormGroup>
                    <Label>Target Packaging</Label>
                    <Select
                        value={targetPackagingId}
                        onChange={(e) => setTargetPackagingId(e.target.value)}
                    >
                        <option value="">Select Packaging</option>
                        {packagings.map(pkg => (
                            <option key={pkg.id} value={pkg.id}>
                                {pkg.brandName} ({pkg.allottedKg}kg)
                            </option>
                        ))}
                    </Select>
                </FormGroup>

                <FormGroup>
                    <Label>Bags To Palti</Label>
                    <Input
                        type="number"
                        value={targetBags}
                        onChange={(e) => setTargetBags(e.target.value)}
                        placeholder="No. of bags"
                    />
                </FormGroup>

                <FormGroup>
                    <Label>Target Location</Label>
                    <Select
                        value={targetLocationCode}
                        onChange={(e) => setTargetLocationCode(e.target.value)}
                    >
                        <option value="">Select Location</option>
                        {locations.map(loc => (
                            <option key={loc.code} value={loc.code}>
                                {loc.code} - {loc.name}
                            </option>
                        ))}
                    </Select>
                </FormGroup>
            </FormGrid>

            <StatsRow>
                <StatItem>
                    <StatLabel>Source Weight</StatLabel>
                    <StatValue $type="source">{sourceStats.qtls.toFixed(2)} QTL</StatValue>
                </StatItem>
                <StatItem>
                    <StatLabel>Target Weight</StatLabel>
                    <StatValue $type="target">{targetStats.qtls.toFixed(2)} QTL</StatValue>
                </StatItem>
                <StatItem>
                    <StatLabel>Shortage</StatLabel>
                    <StatValue $type="shortage">{shortageQtls.toFixed(2)} QTL</StatValue>
                </StatItem>
            </StatsRow>

            <ButtonGroup>
                <Button className="secondary" onClick={onClose} disabled={submitting}>
                    Cancel
                </Button>
                <Button className="primary" onClick={handleSave} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Create Palti Entry'}
                </Button>
            </ButtonGroup>
        </FormContainer>
    );
};

export default InlinePaltiForm;
