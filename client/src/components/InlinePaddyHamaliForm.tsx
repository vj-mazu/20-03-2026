import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';

const FormContainer = styled.div`
  background: white;
  border-radius: 0;
  padding: 1.5rem;
  box-shadow: none;
  margin: 0;
  border: none;
  border-top: 3px solid #f59e0b;
  border-bottom: 3px solid #f59e0b;
  animation: slideDown 0.3s ease-out;
  width: 100%;
  box-sizing: border-box;

  @keyframes slideDown {
    from {
      opacity: 0;
      max-height: 0;
    }
    to {
      opacity: 1;
      max-height: 2000px;
    }
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #f59e0b;
  padding-bottom: 0.5rem;
`;

const Title = styled.h3`
  color: #1f2937;
  margin: 0;
  font-size: 1.2rem;
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

const TypesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.07);
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #f59e0b;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #f59e0b;
  }
  
  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
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
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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

const CheckboxWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  
  &:hover {
    border-color: #f59e0b;
    background: #fffbeb;
  }
  
  &.selected {
    border-color: #f59e0b;
    background: #fffbeb;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
  }
`;

const TypeCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin-right: 0.75rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const HelpText = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
  font-style: italic;
`;

const SummarySection = styled.div`
  background: #f0fdf4;
  border: 2px solid #10b981;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
`;

const SummaryTitle = styled.div`
  font-weight: 600;
  color: #065f46;
  margin-bottom: 0.5rem;
`;

const TypesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const TypeItem = styled.li`
  padding: 0.5rem 0;
  color: #047857;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #d1fae5;
  
  &:last-child {
    border-bottom: none;
  }
`;

interface PaddyHamaliRate {
    id: number;
    workType: string;
    workDetail: string;
    rate: number;
    isPerLorry: boolean;
    hasMultipleOptions: boolean;
    parentWorkType: string | null;
}

interface OtherHamaliWork {
    id: number;
    workType: string;
    workDetail: string;
    rate: number;
    unit: string;
}

interface WorkerSplit {
    name: string;
    bags: number;
    batchNumber: number;
}

// Split Worker Form Component
const SplitWorkerForm: React.FC<{
    totalBags: number;
    onSave: (splits: WorkerSplit[]) => void;
    onCancel: () => void;
}> = ({ totalBags, onSave, onCancel }) => {
    const [splits, setSplits] = useState<WorkerSplit[]>([
        { name: 'Batch 1', bags: 0, batchNumber: 1 }
    ]);

    const addWorker = () => {
        if (splits.length < 2) { // Maximum 2 batches only
            setSplits(prev => [...prev, { 
                name: `Batch ${prev.length + 1}`, 
                bags: 0, 
                batchNumber: prev.length + 1 
            }]);
        }
    };

    const removeWorker = (index: number) => {
        if (splits.length > 1) {
            setSplits(prev => prev.filter((_, i) => i !== index));
        }
    };

    const updateWorker = (index: number, field: keyof WorkerSplit, value: string | number) => {
        setSplits(prev => prev.map((split, i) => 
            i === index ? { ...split, [field]: value } : split
        ));
    };

    const totalSplitBags = splits.reduce((sum, split) => sum + split.bags, 0);
    const remainingBags = totalBags - totalSplitBags;

    const handleSave = () => {
        // Validation - only check bags, names are auto-generated
        if (splits.some(split => split.bags <= 0)) {
            toast.error('Please enter valid bag counts for all batches');
            return;
        }
        
        if (splits.some(split => split.bags <= 0)) {
            toast.error('All workers must have bags > 0');
            return;
        }

        if (totalSplitBags !== totalBags) {
            toast.error(`Total split bags (${totalSplitBags}) must equal total bags (${totalBags})`);
            return;
        }

        onSave(splits);
    };

    return (
        <div>
            {splits.map((split, index) => (
                <div key={index} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr auto auto', 
                    gap: '0.5rem', 
                    marginBottom: '1rem',
                    alignItems: 'end'
                }}>
                    <div style={{ 
                        padding: '0.75rem', 
                        background: '#f3f4f6', 
                        borderRadius: '8px', 
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {split.name}
                    </div>
                    <div>
                        <Label>Bags</Label>
                        <Input
                            type="number"
                            min="1"
                            max={totalBags}
                            value={split.bags || ''}
                            onChange={(e) => updateWorker(index, 'bags', parseInt(e.target.value) || 0)}
                            placeholder="0"
                        />
                    </div>
                    <Button
                        className="primary"
                        onClick={addWorker}
                        disabled={splits.length >= 2}
                        style={{ padding: '0.5rem' }}
                    >
                        + Add Batch
                    </Button>
                    <Button
                        className="secondary"
                        onClick={() => removeWorker(index)}
                        disabled={splits.length === 1}
                        style={{ padding: '0.5rem' }}
                    >
                        ✕
                    </Button>
                </div>
            ))}

            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem',
                padding: '1rem',
                background: remainingBags === 0 ? '#d1fae5' : '#fee2e2',
                borderRadius: '8px'
            }}>
                <div>
                    <strong>Total: {totalSplitBags} / {totalBags} bags</strong>
                    {remainingBags !== 0 && (
                        <div style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                            {remainingBags > 0 ? `${remainingBags} bags remaining` : `${Math.abs(remainingBags)} bags over limit`}
                        </div>
                    )}
                </div>
                <Button
                    className="primary"
                    onClick={addWorker}
                    style={{ padding: '0.5rem 1rem' }}
                >
                    + Add Worker
                </Button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <Button className="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                <Button 
                    className="primary" 
                    onClick={handleSave}
                    disabled={remainingBags !== 0 || splits.some(s => !s.name.trim() || s.bags <= 0)}
                >
                    Save Split
                </Button>
            </div>
        </div>
    );
};

interface Props {
    arrival: {
        id: number;
        arrivalNumber: string;
        partyName: string;
        bags: number;
    };
    onClose: () => void;
    onSave: () => void;
}

const InlinePaddyHamaliForm: React.FC<Props> = ({ arrival, onClose, onSave }) => {
    const [rates, setRates] = useState<PaddyHamaliRate[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [looseTumbiduBags, setLooseTumbiduBags] = useState(0);
    const [selectedRateIds, setSelectedRateIds] = useState<{ [workType: string]: number }>({});
    const [loading, setLoading] = useState(false);
    
    // New state for splitting feature
    const [showSplitModal, setShowSplitModal] = useState<string | null>(null);
    const [workerSplits, setWorkerSplits] = useState<{ [workType: string]: WorkerSplit[] }>({});
    
    // Remove otherHamaliWorks state - we'll use rates instead
    const [selectedOtherWork, setSelectedOtherWork] = useState<number | null>(null);
    const [otherWorkBags, setOtherWorkBags] = useState<number>(0);
    const [otherWorkDetails, setOtherWorkDetails] = useState<string>('');
    const [otherWorkDescription, setOtherWorkDescription] = useState<string>('');
    const [otherWorkSplits, setOtherWorkSplits] = useState<WorkerSplit[]>([]);

    useEffect(() => {
        fetchRates();
        setSelectedTypes([]);
        setLooseTumbiduBags(0);
        setSelectedRateIds({});
        setWorkerSplits({});
        setOtherWorkSplits([]);
        setOtherWorkDetails('');
        setOtherWorkDescription('');
    }, [arrival.id]);

    const fetchRates = async () => {
        try {
            const response = await axios.get<{ rates: PaddyHamaliRate[] }>('/paddy-hamali-rates');
            setRates(response.data.rates);
        } catch (error) {
            console.error('Error fetching rates:', error);
            toast.error('Failed to fetch hamali rates');
        }
    };

    // Remove fetchOtherHamaliWorks - we'll use rates for Other Hamali too

    const groupedRates = rates.reduce((acc, rate) => {
        const key = rate.parentWorkType || rate.workType;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(rate);
        return acc;
    }, {} as { [key: string]: PaddyHamaliRate[] });

    // Use Paddy Hamali rates for Other Hamali section too
    const groupedOtherRates = groupedRates;

    const getBagsForType = (type: string): number => {
        const isLoose = type.toLowerCase().includes('loose') && type.toLowerCase().includes('tumb');
        if (isLoose) {
            return looseTumbiduBags;
        } else {
            return arrival.bags;
        }
    };

    const handleTypeSelection = (selectedType: string) => {
        let newSelectedTypes = [...selectedTypes];

        if (newSelectedTypes.includes(selectedType)) {
            // Deselect
            newSelectedTypes = newSelectedTypes.filter(t => t !== selectedType);
            // Remove rate selection for this type
            const newRateIds = { ...selectedRateIds };
            delete newRateIds[selectedType];
            setSelectedRateIds(newRateIds);
        } else {
            // Select - no restrictions, allow all combinations
            newSelectedTypes.push(selectedType);

            // Auto-select rate if only one option available
            const options = groupedRates[selectedType];
            if (options && options.length === 1) {
                setSelectedRateIds({
                    ...selectedRateIds,
                    [selectedType]: options[0].id
                });
            }
        }

        setSelectedTypes(newSelectedTypes);
    };

    const handleSave = async () => {
        // Validation
        if (selectedTypes.length === 0 && otherWorkSplits.length === 0) {
            toast.error('Please select at least one hamali type or add other hamali work');
            return;
        }

        // Check if all selected types have rate selections
        for (const type of selectedTypes) {
            if (!selectedRateIds[type]) {
                toast.error(`Please select a rate for ${type}`);
                return;
            }
        }

        // Validate loose tumbidu bags
        const hasLooseTumbidu = selectedTypes.some(type =>
            type.toLowerCase().includes('loose') && type.toLowerCase().includes('tumb')
        );
        if (hasLooseTumbidu && looseTumbiduBags < 1) {
            toast.error('Please enter valid number of bags for Loose Tumbidu');
            return;
        }

        setLoading(true);
        try {
            let totalEntries = 0;

            // Save paddy hamali entries
            if (selectedTypes.length > 0) {
                const paddyEntries: any[] = [];

                selectedTypes.forEach(type => {
                    const rate = rates.find(r => r.id === selectedRateIds[type]);
                    if (!rate) throw new Error(`Rate not found for ${type}`);

                    const splits = workerSplits[type];
                    if (splits && splits.length > 0) {
                        // Save split entries
                        splits.forEach(split => {
                            paddyEntries.push({
                                workType: rate.workType,
                                workDetail: rate.workDetail,
                                rate: rate.rate,
                                bags: split.bags,
                                workerName: split.name,
                                batchNumber: split.batchNumber
                            });
                        });
                    } else {
                        // Save single entry
                        paddyEntries.push({
                            workType: rate.workType,
                            workDetail: rate.workDetail,
                            rate: rate.rate,
                            bags: getBagsForType(type)
                        });
                    }
                });

                await axios.post('/paddy-hamali-entries/bulk', {
                    arrivalId: arrival.id,
                    entries: paddyEntries
                });

                totalEntries += paddyEntries.length;
            }

            // Save other hamali entries (using Paddy Hamali rates)
            if (otherWorkSplits.length > 0) {
                const rate = rates.find(r => r.id === selectedOtherWork);
                if (!rate) throw new Error('Paddy hamali rate not found for other hamali');

                const otherEntries = otherWorkSplits.map(split => ({
                    workType: rate.workType,
                    workDetail: rate.workDetail,
                    description: otherWorkDescription.trim(),
                    rate: rate.rate,
                    bags: split.bags,
                    workerName: split.name,
                    batchNumber: split.batchNumber
                }));

                await axios.post('/other-hamali-entries/bulk', {
                    arrivalId: arrival.id,
                    entries: otherEntries
                });

                totalEntries += otherEntries.length;
            }

            toast.success(`${totalEntries} hamali ${totalEntries === 1 ? 'entry' : 'entries'} added successfully`);
            onSave();
        } catch (error: any) {
            console.error('Error adding hamali:', error);
            toast.error(error.response?.data?.error || 'Failed to add hamali entries');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormContainer>
            <Header>
                <Title>💰 Add Paddy Hamali</Title>
                <CloseButton onClick={onClose}>×</CloseButton>
            </Header>

            {/* Record Row Display - Mimics the clicked table row */}
            <div style={{
                background: 'linear-gradient(to right, #fef3c7, #fde68a)',
                border: '3px solid #f59e0b',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap'
                }}>
                    <div style={{
                        background: '#f59e0b',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '0.875rem'
                    }}>
                        SELECTED RECORD
                    </div>
                    <div style={{ flex: 1, display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>ARRIVAL NUMBER</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>{arrival.arrivalNumber}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>PARTY NAME</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>{arrival.partyName}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>BAGS</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>{arrival.bags}</div>
                        </div>
                    </div>
                </div>
            </div>

            <FormGroup>
                <Label>Select Hamali Type(s)</Label>
                <HelpText>
                    Note: You can select multiple hamali types. Each type can be split between different workers.
                </HelpText>
            </FormGroup>

            <TypesGrid>
                {Object.keys(groupedRates).map(workType => {
                    const options = groupedRates[workType] || [];
                    const isSelected = selectedTypes.includes(workType);
                    const hasSingleOption = options.length === 1;
                    const hasMultipleOptions = options.length > 1;
                    const isLooseTumbidu = workType.toLowerCase().includes('loose') && workType.toLowerCase().includes('tumb');
                    const singleRate = hasSingleOption ? options[0] : null;
                    const selectedRateId = selectedRateIds[workType];

                    return (
                        <TypeCard key={workType}>
                            <CheckboxWrapper
                                className={isSelected ? 'selected' : ''}
                                onClick={() => handleTypeSelection(workType)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Checkbox
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => { }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: '#374151' }}>{workType}</div>
                                        {hasSingleOption && singleRate && (
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                                {singleRate.workDetail}
                                            </div>
                                        )}
                                    </div>
                                    {hasSingleOption && singleRate && (
                                        <div style={{ fontWeight: 'bold', color: '#f59e0b', fontSize: '1.1rem' }}>
                                            ₹{singleRate.rate}
                                        </div>
                                    )}
                                </div>

                                {/* Show dropdown if selected and has multiple options */}
                                {isSelected && hasMultipleOptions && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <Select
                                            value={selectedRateId || ''}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                setSelectedRateIds({
                                                    ...selectedRateIds,
                                                    [workType]: parseInt(e.target.value)
                                                });
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="">Select option...</option>
                                            {options.map(rate => (
                                                <option key={rate.id} value={rate.id}>
                                                    {rate.workDetail} - ₹{rate.rate}/bag
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                )}

                                {/* Show bags input if Loose Tumbidu is selected */}
                                {isSelected && isLooseTumbidu && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={looseTumbiduBags || ''}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                setLooseTumbiduBags(parseInt(e.target.value) || 0);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="Enter number of bags"
                                        />
                                    </div>
                                )}
                            </CheckboxWrapper>
                        </TypeCard>
                    );
                })}
            </TypesGrid>

            {selectedTypes.length > 0 && (
                <SummarySection>
                    <SummaryTitle>Paddy Hamali Summary</SummaryTitle>
                    <TypesList>
                        {selectedTypes.map(type => {
                            const bags = getBagsForType(type);
                            const rateId = selectedRateIds[type];
                            const rate = rates.find(r => r.id === rateId);
                            const amount = rate ? parseFloat(rate.rate.toString()) * bags : 0;
                            const splits = workerSplits[type] || [];
                            const hasSplits = splits.length > 0;

                            return (
                                <TypeItem key={type}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#065f46' }}>{type}</div>
                                        {rate && (
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                {rate.workDetail} • {bags} bags × ₹{rate.rate}
                                                {hasSplits && (
                                                    <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#059669' }}>
                                                        Split between {splits.length} worker{splits.length > 1 ? 's' : ''}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {hasSplits && (
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                                                {splits.map((split, idx) => (
                                                    <div key={idx} style={{ color: '#047857' }}>
                                                        Batch {split.batchNumber}: {split.name} - {split.bags} bags
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        {rate && <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>₹{amount.toFixed(2)}</div>}
                                        {!hasSplits && (
                                            <button
                                                onClick={() => setShowSplitModal(type)}
                                                style={{
                                                    marginTop: '0.5rem',
                                                    padding: '0.25rem 0.5rem',
                                                    background: '#f59e0b',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Split Workers
                                            </button>
                                        )}
                                    </div>
                                </TypeItem>
                            );
                        })}
                        <TypeItem style={{ borderTop: '2px solid #10b981', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#065f46' }}>Paddy Hamali Total</div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#065f46' }}>
                                ₹{selectedTypes.reduce((total, type) => {
                                    const bags = getBagsForType(type);
                                    const rateId = selectedRateIds[type];
                                    const rate = rates.find(r => r.id === rateId);
                                    return total + (rate ? parseFloat(rate.rate.toString()) * bags : 0);
                                }, 0).toFixed(2)}
                            </div>
                        </TypeItem>
                    </TypesList>
                </SummarySection>
            )}

            {/* Other Hamali Works Section */}
            <div style={{ marginTop: '2rem', borderTop: '3px solid #f59e0b', paddingTop: '1.5rem' }}>
                <SummaryTitle style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    ➕ Other Hamali Works
                </SummaryTitle>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <FormGroup>
                        <Label>Work Type</Label>
                        <Select
                            value={selectedOtherWork || ''}
                            onChange={(e) => setSelectedOtherWork(e.target.value ? parseInt(e.target.value) : null)}
                        >
                            <option value="">Select work type...</option>
                            {rates.length === 0 && <option value="">Loading...</option>}
                            {Object.entries(groupedOtherRates).map(([workType, paddyRates]) => (
                                <optgroup key={workType} label={workType}>
                                    {paddyRates.map(rate => (
                                        <option key={rate.id} value={rate.id}>
                                            {rate.workDetail} (₹{rate.rate}/bag)
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </Select>
                    </FormGroup>
                    
                    <FormGroup>
                        <Label>Bags (No Restriction)</Label>
                        <Input
                            type="number"
                            min="1"
                            value={otherWorkBags || ''}
                            onChange={(e) => setOtherWorkBags(parseInt(e.target.value) || 0)}
                            placeholder="Enter any number of bags"
                        />
                    </FormGroup>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <FormGroup>
                        <Label>Details (Manual Entry)</Label>
                        <Input
                            type="text"
                            value={otherWorkDetails || ''}
                            onChange={(e) => setOtherWorkDetails(e.target.value)}
                            placeholder="Enter work details..."
                        />
                    </FormGroup>
                    
                    <FormGroup>
                        <Label>Description</Label>
                        <Input
                            type="text"
                            value={otherWorkDescription || ''}
                            onChange={(e) => setOtherWorkDescription(e.target.value)}
                            placeholder="Enter description..."
                        />
                    </FormGroup>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ 
                        padding: '1rem', 
                        background: '#f3f4f6', 
                        borderRadius: '8px', 
                        fontWeight: 'bold',
                        color: selectedOtherWork && otherWorkBags > 0 ? '#059669' : '#6b7280'
                    }}>
                        Total Amount: ₹{selectedOtherWork && otherWorkBags > 0 ? 
                            ((rates.find(r => r.id === selectedOtherWork)?.rate || 0) * otherWorkBags).toFixed(2) : 
                            '0.00'
                        }
                    </div>
                    
                    <Button
                        className="primary"
                        onClick={() => {
                            if (!selectedOtherWork || otherWorkBags <= 0) {
                                toast.error('Please select work type and enter valid bags');
                                return;
                            }
                            // No bag restriction for other hamali works
                            if (!otherWorkDetails.trim()) {
                                toast.error('Please enter work details');
                                return;
                            }
                            setShowSplitModal('other-work');
                        }}
                        disabled={!selectedOtherWork || otherWorkBags <= 0 || !otherWorkDetails.trim()}
                    >
                        Add & Split Workers
                    </Button>
                </div>

                {otherWorkSplits.length > 0 && (
                    <SummarySection style={{ background: '#fef3c7', borderColor: '#f59e0b' }}>
                        <SummaryTitle style={{ color: '#92400e' }}>Other Hamali Summary</SummaryTitle>
                        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fff', borderRadius: '6px', border: '1px solid #f59e0b' }}>
                            <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.25rem' }}>
                                {rates.find(r => r.id === selectedOtherWork)?.workType} → {rates.find(r => r.id === selectedOtherWork)?.workDetail}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                Details: {otherWorkDetails}
                            </div>
                            {otherWorkDescription && (
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                    Description: {otherWorkDescription}
                                </div>
                            )}
                        </div>
                        <TypesList>
                            {otherWorkSplits.map((split, idx) => {
                                const rate = rates.find(r => r.id === selectedOtherWork);
                                const amount = rate ? rate.rate * split.bags : 0;
                                return (
                                    <TypeItem key={idx}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#92400e' }}>
                                                Batch {split.batchNumber}: {split.name}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                {split.bags} bags × ₹{rate?.rate}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#92400e' }}>
                                            ₹{amount.toFixed(2)}
                                        </div>
                                    </TypeItem>
                                );
                            })}
                            <TypeItem style={{ borderTop: '2px solid #f59e0b', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#92400e' }}>Other Hamali Total</div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#92400e' }}>
                                    ₹{otherWorkSplits.reduce((total, split) => {
                                        const rate = rates.find(r => r.id === selectedOtherWork);
                                        return total + (rate ? rate.rate * split.bags : 0);
                                    }, 0).toFixed(2)}
                                </div>
                            </TypeItem>
                        </TypesList>
                    </SummarySection>
                )}
            </div>

            {/* Split Modal */}
            {showSplitModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#1f2937' }}>
                            Split Workers - {showSplitModal === 'other-work' ? 
                                rates.find(r => r.id === selectedOtherWork)?.workType : 
                                showSplitModal
                            }
                        </h3>
                        
                        <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
                            <strong>Total Bags: {showSplitModal === 'other-work' ? otherWorkBags : getBagsForType(showSplitModal)}</strong>
                        </div>

                        <SplitWorkerForm 
                            totalBags={showSplitModal === 'other-work' ? otherWorkBags : getBagsForType(showSplitModal)}
                            onSave={(splits) => {
                                if (showSplitModal === 'other-work') {
                                    setOtherWorkSplits(splits);
                                } else {
                                    setWorkerSplits(prev => ({ ...prev, [showSplitModal]: splits }));
                                }
                                setShowSplitModal(null);
                            }}
                            onCancel={() => setShowSplitModal(null)}
                        />
                    </div>
                </div>
            )}

            <ButtonGroup>
                <Button className="secondary" onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    className="primary"
                    onClick={handleSave}
                    disabled={loading || (selectedTypes.length === 0 && otherWorkSplits.length === 0)}
                >
                    {loading ? 'Saving...' : 'Add Hamali'}
                </Button>
            </ButtonGroup>
        </FormContainer>
    );
};

export default InlinePaddyHamaliForm;
