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
  border-top: 3px solid #10b981;
  border-bottom: 3px solid #10b981;
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
  border-bottom: 2px solid #10b981;
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

const CompactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(4, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const CompactCard = styled.div`
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #10b981;
    background: #f0fdf4;
  }
  
  &.selected {
    border-color: #10b981;
    background: #f0fdf4;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.85rem;
  
  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.85rem;
  
  &:focus {
    outline: none;
    border-color: #10b981;
  }
  
  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.8rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
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

const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  border: none;
  background: ${props => props.active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent'};
  color: ${props => props.active ? 'white' : '#6b7280'};
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px 6px 0 0;
  transition: all 0.3s ease;
  font-size: 0.9rem;

  &:hover {
    background: ${props => props.active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f3f4f6'};
    color: ${props => props.active ? 'white' : '#374151'};
  }
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

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

interface RiceHamaliRate {
  id: number;
  work_type: string;
  work_detail: string;
  rate_24_27: number;
  is_active: boolean;
  display_order: number;
}

// Removed OtherHamaliWork interface - using RiceHamaliRate for Other Hamali too

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

interface RiceProductionData {
  id: number | string; // Allow both number and string IDs
  date: string;
  productType: string;
  bags: number;
  quantityQuintals: number;
  movementType?: string; // Add movementType property
  locationCode?: string; // Add location info
  variety?: string; // Add variety info
  outturn?: {
    code: string;
    allottedVariety: string;
  };
  packaging?: {
    brandName: string;
    allottedKg: number;
  };
}

interface Props {
  riceProduction: RiceProductionData;
  onClose: () => void;
  onSave: () => void;
}

const InlineRiceHamaliForm: React.FC<Props> = ({ riceProduction, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'rice' | 'other'>('rice');
  const [riceRates, setRiceRates] = useState<RiceHamaliRate[]>([]);
  // Remove otherRates state - we'll use riceRates instead
  const [selectedRiceTypes, setSelectedRiceTypes] = useState<string[]>([]);
  const [selectedRateIds, setSelectedRateIds] = useState<{ [workType: string]: number }>({});
  const [workerSplits, setWorkerSplits] = useState<{ [workType: string]: WorkerSplit[] }>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Get display information
  const variety = riceProduction.outturn?.allottedVariety || riceProduction.variety || 'Unknown';
  const location = riceProduction.locationCode || 'Unknown';
  const packaging = riceProduction.packaging?.brandName || 'Unknown';
  const movementTypeDisplay = riceProduction.movementType || 'production';

  // Other hamali states (using Rice Hamali rates)
  const [selectedOtherWork, setSelectedOtherWork] = useState<number | null>(null);
  const [otherWorkBags, setOtherWorkBags] = useState<number>(0);
  const [otherWorkDetails, setOtherWorkDetails] = useState<string>('');
  const [otherWorkDescription, setOtherWorkDescription] = useState<string>('');
  const [otherWorkSplits, setOtherWorkSplits] = useState<WorkerSplit[]>([]);

  // Split modal state
  const [showSplitModal, setShowSplitModal] = useState<string | null>(null);

  useEffect(() => {
    fetchRiceRates();
    setSelectedRiceTypes([]);
    setSelectedRateIds({});
    setWorkerSplits({});
    setSelectedOtherWork(null);
    setOtherWorkBags(0);
    setOtherWorkSplits([]);
    setOtherWorkDetails('');
    setOtherWorkDescription('');
  }, [riceProduction.id]);

  const fetchRiceRates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<{ success: boolean; data: { flatRates: RiceHamaliRate[] } }>('/rice-hamali-rates', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Rice Hamali Rates Response:', response.data);
      if (response.data.success && response.data.data.flatRates) {
        // Ensure rate_24_27 is a valid number
        const validRates = response.data.data.flatRates.map(rate => ({
          ...rate,
          rate_24_27: Number(rate.rate_24_27) || 0
        }));
        console.log('Processed rates:', validRates);
        setRiceRates(validRates);
      }
    } catch (error) {
      console.error('Error fetching rice hamali rates:', error);
      toast.error('Failed to fetch rice hamali rates');
    }
  };

  // Remove fetchOtherRates - we'll use riceRates for Other Hamali too

  const groupedRiceRates = riceRates.reduce((acc, rate) => {
    if (!acc[rate.work_type]) {
      acc[rate.work_type] = [];
    }
    acc[rate.work_type].push(rate);
    return acc;
  }, {} as { [key: string]: RiceHamaliRate[] });

  // Use Rice Hamali rates for Other Hamali section too
  const groupedOtherRates = groupedRiceRates;

  const handleRiceTypeSelection = (selectedType: string) => {
    let newSelectedTypes = [...selectedRiceTypes];

    if (newSelectedTypes.includes(selectedType)) {
      // Deselect
      newSelectedTypes = newSelectedTypes.filter(t => t !== selectedType);
      // Remove rate selection for this type
      const newRateIds = { ...selectedRateIds };
      delete newRateIds[selectedType];
      setSelectedRateIds(newRateIds);
    } else {
      // Select
      newSelectedTypes.push(selectedType);

      // Auto-select rate if only one option available
      const options = groupedRiceRates[selectedType];
      if (options && options.length === 1) {
        setSelectedRateIds({
          ...selectedRateIds,
          [selectedType]: options[0].id
        });
      }
    }

    setSelectedRiceTypes(newSelectedTypes);
  };

  const handleSave = async () => {
    // Validation
    if (selectedRiceTypes.length === 0 && otherWorkSplits.length === 0) {
      toast.error('Please select at least one hamali type or add other hamali work');
      return;
    }

    // Check if all selected types have rate selections
    for (const type of selectedRiceTypes) {
      if (!selectedRateIds[type]) {
        toast.error(`Please select a rate for ${type}`);
        return;
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      let totalEntries = 0;

      // Save rice hamali entries
      if (selectedRiceTypes.length > 0) {
        const riceEntries: any[] = [];

        selectedRiceTypes.forEach(type => {
          const rate = riceRates.find(r => r.id === selectedRateIds[type]);
          if (!rate) throw new Error(`Rate not found for ${type}`);

          const splits = workerSplits[type];
          if (splits && splits.length > 0) {
            // Save split entries
            splits.forEach(split => {
              riceEntries.push({
                workType: rate.work_type,
                workDetail: rate.work_detail,
                rate: rate.rate_24_27, // Use Above 24 feet rate
                bags: split.bags,
                workerName: split.name,
                batchNumber: split.batchNumber
              });
            });
          } else {
            // Save single entry
            riceEntries.push({
              workType: rate.work_type,
              workDetail: rate.work_detail,
              rate: rate.rate_24_27,
              bags: riceProduction.bags
            });
          }
        });

        // Check if this is a stock movement (Purchase/Sale/Palti) or production
        const isStockMovement = typeof riceProduction.id === 'string' && (riceProduction.id as string).startsWith('movement-');
        const actualId = isStockMovement ? parseInt((riceProduction.id as string).replace('movement-', '')) : (riceProduction.id as number);

        console.log('🔍 DEBUG - Saving rice hamali for:', {
          isStockMovement,
          originalId: riceProduction.id,
          actualId,
          movementType: riceProduction.movementType
        });

        await axios.post('/rice-hamali-entries-simple/bulk', {
          riceProductionId: isStockMovement ? null : actualId, // Use null for stock movements
          stockMovementId: isStockMovement ? actualId : null,
          movementType: riceProduction.movementType || 'production',
          isStockMovement: isStockMovement,
          entries: riceEntries
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        totalEntries += riceEntries.length;
      }

      // Save other hamali entries (using Rice Hamali rates)
      if (otherWorkSplits.length > 0) {
        const rate = riceRates.find(r => r.id === selectedOtherWork);
        if (!rate) throw new Error('Rice hamali rate not found for other hamali');

        const otherEntries = otherWorkSplits.map(split => ({
          workType: rate.work_type,
          workDetail: rate.work_detail,
          description: otherWorkDescription.trim(),
          rate: rate.rate_24_27,
          bags: split.bags,
          workerName: split.name,
          batchNumber: split.batchNumber
        }));

        // Use the same logic for other hamali entries
        const isStockMovement = typeof riceProduction.id === 'string' && (riceProduction.id as string).startsWith('movement-');
        const actualId = isStockMovement ? parseInt((riceProduction.id as string).replace('movement-', '')) : (riceProduction.id as number);

        await axios.post('/other-hamali-entries/bulk', {
          riceProductionId: isStockMovement ? null : actualId,
          stockMovementId: isStockMovement ? actualId : null,
          movementType: riceProduction.movementType || 'production',
          isStockMovement: isStockMovement,
          entries: otherEntries
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        totalEntries += otherEntries.length;
      }

      toast.success(`${totalEntries} rice hamali ${totalEntries === 1 ? 'entry' : 'entries'} added successfully`);
      setSaved(true);

      // Show success state for 2 seconds then close
      setTimeout(() => {
        onSave();
      }, 2000);
    } catch (error: any) {
      console.error('Error adding rice hamali:', error);
      toast.error(error.response?.data?.error || 'Failed to add rice hamali entries');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormContainer>
      <Header>
        <Title>🍚 Add Rice Hamali</Title>
        <CloseButton onClick={onClose}>×</CloseButton>
      </Header>

      {/* Record Row Display */}
      <div style={{
        background: 'linear-gradient(to right, #d1fae5, #a7f3d0)',
        border: '3px solid #10b981',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{
            background: '#10b981',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '0.875rem'
          }}>
            SELECTED RICE PRODUCTION
          </div>
          <div style={{ flex: 1, display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>PRODUCT TYPE</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>{riceProduction.productType}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>BAGS</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>{riceProduction.bags}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>QUANTITY</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>{riceProduction.quantityQuintals} qtl</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rice/Other Tabs */}
      <TabContainer>
        <Tab active={activeTab === 'rice'} onClick={() => setActiveTab('rice')}>
          🍚 Rice Hamali
        </Tab>
        <Tab active={activeTab === 'other'} onClick={() => setActiveTab('other')}>
          🔧 Other Hamali
        </Tab>
      </TabContainer>

      {activeTab === 'rice' ? (
        /* Rice Hamali Tab */
        <div>
          <Label style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
            Select Rice Hamali Type(s) - Each type can be split between different workers
          </Label>

          <CompactGrid>
            {Object.entries(groupedRiceRates).map(([workType, rates]) => {
              const options = rates || [];
              const isSelected = selectedRiceTypes.includes(workType);
              const hasSingleOption = options.length === 1;
              const hasMultipleOptions = options.length > 1;
              const singleRate = hasSingleOption ? options[0] : null;
              const selectedRateId = selectedRateIds[workType];

              return (
                <CompactCard
                  key={workType}
                  className={isSelected ? 'selected' : ''}
                  onClick={() => handleRiceTypeSelection(workType)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => { }}
                      style={{ marginRight: '0.25rem' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>{workType}</div>
                      {hasSingleOption && singleRate && (
                        <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.1rem' }}>
                          {singleRate.work_detail}
                        </div>
                      )}
                    </div>
                    {hasSingleOption && singleRate && (
                      <div style={{ fontWeight: 'bold', color: '#10b981', fontSize: '0.75rem' }}>
                        ₹{(Number(singleRate.rate_24_27) || 0).toFixed(0)}
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
                        style={{ fontSize: '0.75rem', padding: '0.25rem' }}
                      >
                        <option value="">Select...</option>
                        {options.map(rate => (
                          <option key={rate.id} value={rate.id}>
                            {rate.work_detail} - ₹{(Number(rate.rate_24_27) || 0).toFixed(0)}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                </CompactCard>
              );
            })}
          </CompactGrid>

          {selectedRiceTypes.length > 0 && (
            <SummarySection>
              <SummaryTitle>Rice Hamali Summary</SummaryTitle>
              <TypesList>
                {selectedRiceTypes.map(type => {
                  const bags = riceProduction.bags;
                  const rateId = selectedRateIds[type];
                  const rate = riceRates.find(r => r.id === rateId);
                  const amount = rate ? Number(rate.rate_24_27) * bags : 0;
                  const splits = workerSplits[type] || [];
                  const hasSplits = splits.length > 0;

                  return (
                    <TypeItem key={type}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#065f46' }}>{type}</div>
                        {rate && (
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {rate.work_detail} • {bags} bags × ₹{(Number(rate.rate_24_27) || 0).toFixed(2)}
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
                        {rate && <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>₹{(Number(amount) || 0).toFixed(2)}</div>}
                        {!hasSplits && (
                          <button
                            onClick={() => setShowSplitModal(type)}
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.25rem 0.5rem',
                              background: '#10b981',
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
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#065f46' }}>Rice Hamali Total</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#065f46' }}>
                    ₹{selectedRiceTypes.reduce((total, type) => {
                      const bags = riceProduction.bags;
                      const rateId = selectedRateIds[type];
                      const rate = riceRates.find(r => r.id === rateId);
                      return total + (rate ? Number(rate.rate_24_27) * bags : 0);
                    }, 0).toFixed(2)}
                  </div>
                </TypeItem>
              </TypesList>
            </SummarySection>
          )}
        </div>
      ) : (
        /* Other Hamali Tab - Exact same structure as Paddy Hamali */
        <div style={{ marginTop: '2rem', borderTop: '3px solid #10b981', paddingTop: '1.5rem' }}>
          <SummaryTitle style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
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
                {riceRates.length === 0 && <option value="">Loading...</option>}
                {Object.entries(groupedOtherRates).map(([workType, rates]) => (
                  <optgroup key={workType} label={workType}>
                    {rates.map(rate => (
                      <option key={rate.id} value={rate.id}>
                        {rate.work_detail} (₹{(Number(rate.rate_24_27) || 0).toFixed(2)}/bag)
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
                ((Number(riceRates.find(r => r.id === selectedOtherWork)?.rate_24_27) || 0) * otherWorkBags).toFixed(2) :
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
            <SummarySection style={{ background: '#fef3c7', borderColor: '#10b981' }}>
              <SummaryTitle style={{ color: '#92400e' }}>Other Hamali Summary</SummaryTitle>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fff', borderRadius: '6px', border: '1px solid #10b981' }}>
                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.25rem' }}>
                  {riceRates.find(r => r.id === selectedOtherWork)?.work_type} → {riceRates.find(r => r.id === selectedOtherWork)?.work_detail}
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
                  const rate = riceRates.find(r => r.id === selectedOtherWork);
                  const amount = rate ? Number(rate.rate_24_27) * split.bags : 0;
                  return (
                    <TypeItem key={idx}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#92400e' }}>
                          Batch {split.batchNumber}: {split.name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {split.bags} bags × ₹{rate ? (Number(rate.rate_24_27) || 0).toFixed(2) : '0.00'}
                        </div>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#92400e' }}>
                        ₹{(Number(amount) || 0).toFixed(2)}
                      </div>
                    </TypeItem>
                  );
                })}
                <TypeItem style={{ borderTop: '2px solid #10b981', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#92400e' }}>Other Hamali Total</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#92400e' }}>
                    ₹{otherWorkSplits.reduce((total, split) => {
                      const rate = riceRates.find(r => r.id === selectedOtherWork);
                      return total + (rate ? Number(rate.rate_24_27) * split.bags : 0);
                    }, 0).toFixed(2)}
                  </div>
                </TypeItem>
              </TypesList>
            </SummarySection>
          )}
        </div>
      )}

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
                riceRates.find(r => r.id === selectedOtherWork)?.work_type :
                showSplitModal
              }
            </h3>

            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
              <strong>Total Bags: {showSplitModal === 'other-work' ? otherWorkBags : riceProduction.bags}</strong>
            </div>

            <SplitWorkerForm
              totalBags={showSplitModal === 'other-work' ? otherWorkBags : riceProduction.bags}
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
        <Button className="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          className="primary"
          onClick={handleSave}
          disabled={saving || saved || (selectedRiceTypes.length === 0 && otherWorkSplits.length === 0)}
          style={{
            background: saved ? '#10b981' : undefined,
            color: saved ? 'white' : undefined
          }}
        >
          {saving ? 'Saving...' : saved ? '✅ Saved Successfully!' : 'Add Rice Hamali'}
        </Button>
      </ButtonGroup>
    </FormContainer>
  );
};

export default InlineRiceHamaliForm;