import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { createPortal } from 'react-dom';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  animation: fadeIn 0.3s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Modal = styled.div<{ $x: number; $y: number }>`
  background: white;
  width: 95%;
  max-width: 700px;
  max-height: 85vh;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 50px rgba(0,0,0,0.3);
  position: relative;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  transform: translate(${props => props.$x}px, ${props => props.$y}px);
  animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  @keyframes modalPop {
    from { opacity: 0; transform: translate(${props => props.$x}px, ${props => props.$y + 20}px) scale(0.95); }
    to { opacity: 1; transform: translate(${props => props.$x}px, ${props => props.$y}px) scale(1); }
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  cursor: move;
  user-select: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  color: white;
  margin: 0;
  font-size: 1.5rem;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: rotate(90deg);
  }
`;

const ContentWrapper = styled.div`
  padding: 1.5rem 2rem;
  overflow-y: auto;
  flex: 1;
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

const SectionTitle = styled.h2`
  color: #374151;
  font-size: 1.1rem;
  margin: 0 0 0.75rem 0;
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
  text-transform: uppercase;
`;

const DetailValue = styled.span`
  font-size: 1rem;
  color: #1f2937;
  font-weight: 600;
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
  grid-column: 1 / -1;
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

const CheckboxGroup = styled.div`
  display: contents;
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

const CheckboxLabel = styled.label`
  cursor: pointer;
  font-weight: 500;
  color: #374151;
  flex: 1;
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  arrival: {
    id: number;
    arrivalNumber: string;
    partyName: string;
    bags: number;
  };
  onSave: () => void;
}

const AddPaddyHamaliModal: React.FC<Props> = ({ isOpen, onClose, arrival, onSave }) => {
  const [rates, setRates] = useState<PaddyHamaliRate[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [looseTumbiduBags, setLooseTumbiduBags] = useState(0);
  const [selectedRateIds, setSelectedRateIds] = useState<{ [workType: string]: number }>({});
  const [loading, setLoading] = useState(false);

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
      fetchRates();
      setSelectedTypes([]);
      setLooseTumbiduBags(0);
      setSelectedRateIds({});
      setPosition({ x: 0, y: 0 }); // Reset position when opened
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen]);

  const fetchRates = async () => {
    try {
      const response = await axios.get<{ rates: PaddyHamaliRate[] }>('/paddy-hamali-rates');
      setRates(response.data.rates);
    } catch (error) {
      console.error('Error fetching rates:', error);
      toast.error('Failed to fetch hamali rates');
    }
  };

  const groupedRates = rates.reduce((acc, rate) => {
    const key = rate.parentWorkType || rate.workType;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(rate);
    return acc;
  }, {} as { [key: string]: PaddyHamaliRate[] });

  const getBagsForType = (type: string): number => {
    const isLoose = type.toLowerCase().includes('loose') && type.toLowerCase().includes('tumb');
    if (isLoose) {
      return looseTumbiduBags;
    } else {
      return arrival.bags;
    }
  };

  const handleTypeSelection = (selectedType: string) => {
    // Define restricted types (mutual exclusion)
    const restrictedTypes = ['Paddy Unloading', 'Paddy Shifting', 'Per Lorry'];
    const isRestricted = restrictedTypes.includes(selectedType);

    let newSelectedTypes = [...selectedTypes];

    if (newSelectedTypes.includes(selectedType)) {
      // Deselect
      newSelectedTypes = newSelectedTypes.filter(t => t !== selectedType);
      // Remove rate selection for this type
      const newRateIds = { ...selectedRateIds };
      delete newRateIds[selectedType];
      setSelectedRateIds(newRateIds);
    } else {
      // Select
      if (isRestricted) {
        // Remove any other restricted type before adding this one
        newSelectedTypes = newSelectedTypes.filter(
          t => !restrictedTypes.includes(t)
        );

        // Remove rate selections for removed restricted types
        const newRateIds = { ...selectedRateIds };
        restrictedTypes.forEach(type => {
          if (type !== selectedType) {
            delete newRateIds[type];
          }
        });
        setSelectedRateIds(newRateIds);
      }

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
    if (selectedTypes.length === 0) {
      toast.error('Please select at least one hamali type');
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
      const entries = selectedTypes.map(type => {
        const rate = rates.find(r => r.id === selectedRateIds[type]);
        if (!rate) throw new Error(`Rate not found for ${type}`);

        return {
          workType: rate.workType,
          workDetail: rate.workDetail,
          rate: rate.rate,
          bags: getBagsForType(type)
        };
      });

      await axios.post('/paddy-hamali-entries/bulk', {
        arrivalId: arrival.id,
        entries
      });

      toast.success(`${entries.length} hamali ${entries.length === 1 ? 'entry' : 'entries'} added successfully`);
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error adding hamali:', error);
      toast.error(error.response?.data?.error || 'Failed to add hamali entries');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <Overlay>
      <Modal $x={position.x} $y={position.y} onClick={(e) => e.stopPropagation()}>
        <Header onMouseDown={handleMouseDown}>
          <div>
            <Title>💰 Add Paddy Hamali</Title>
          </div>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>

        <ContentWrapper>
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
              Note: Only one of Paddy Unloading, Paddy Shifting, or Per Lorry can be selected at a time
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
              <SummaryTitle>Summary</SummaryTitle>
              <TypesList>
                {selectedTypes.map(type => {
                  const bags = getBagsForType(type);
                  const rateId = selectedRateIds[type];
                  const rate = rates.find(r => r.id === rateId);
                  const amount = rate ? parseFloat(rate.rate.toString()) * bags : 0;

                  return (
                    <TypeItem key={type}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#065f46' }}>{type}</div>
                        {rate && (
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {rate.workDetail} • {bags} bags × ₹{rate.rate}
                          </div>
                        )}
                      </div>
                      {rate && <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>₹{amount.toFixed(2)}</div>}
                    </TypeItem>
                  );
                })}
                <TypeItem style={{ borderTop: '2px solid #10b981', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#065f46' }}>Total</div>
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

          <ButtonGroup>
            <Button className="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="primary"
              onClick={handleSave}
              disabled={loading || selectedTypes.length === 0}
            >
              {loading ? 'Saving...' : 'Add Hamali'}
            </Button>
          </ButtonGroup>
        </ContentWrapper>
      </Modal>
    </Overlay>,
    document.body
  );
};

export default AddPaddyHamaliModal;
