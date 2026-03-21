import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { NotificationMessages } from '../utils/notificationMessages';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  animation: fadeIn 0.5s ease-in;
  max-width: 1400px;
  margin: 0 auto;
`;

const Title = styled.h1`
  color: #ffffff;
  margin-bottom: 2rem;
  font-size: 2rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1.5rem;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const FormCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 2px solid #f3f4f6;
`;

const InfoPanel = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 2px solid #e5e7eb;
  height: fit-content;
  position: sticky;
  top: 20px;
`;

const InfoTitle = styled.h3`
  color: #667eea;
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.5rem;
`;

const InfoItem = styled.div`
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #667eea;

  .label {
    font-weight: 600;
    color: #374151;
    font-size: 0.85rem;
    margin-bottom: 0.25rem;
  }

  .value {
    color: #667eea;
    font-weight: 700;
    font-size: 1.1rem;
  }
`;

const InfoTable = styled.div`
  margin-bottom: 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
`;

const InfoTableHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem;
  font-weight: 600;
  font-size: 0.95rem;
  text-align: center;
`;

const InfoTableBody = styled.div`
  background: white;
`;

const InfoTableRow = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f9fafb;
  }
`;

const InfoTableLabel = styled.div`
  font-weight: 600;
  color: #6b7280;
  font-size: 0.85rem;
`;

const InfoTableValue = styled.div`
  color: #667eea;
  font-weight: 600;
  font-size: 0.95rem;
`;

const FormHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
`;

const ToggleButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  background: #f3f4f6;
  padding: 0.25rem;
  border-radius: 8px;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$active ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#6b7280'};

  &:hover {
    background: ${props => props.$active ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb'};
  }
`;

const TopSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
`;

const FormSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  color: #ffffff;
  margin-bottom: 1rem;
  font-size: 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const TwoColumnRow = styled.div`
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
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const SmallInput = styled(Input)`
  width: 100%;
`;

const CalculatedDisplay = styled.div`
  padding: 0.75rem;
  background: #f0fdf4;
  border: 2px solid #10b981;
  border-radius: 8px;
  font-weight: 700;
  color: #059669;
  font-size: 1.1rem;
  text-align: center;
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid #e5e7eb;
`;

const Button = styled.button`
  padding: 0.875rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }
  }

  &.secondary {
    background: #6b7280;
    color: white;

    &:hover:not(:disabled) {
      background: #4b5563;
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const SlNoDisplay = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 8px;
  text-align: center;
`;

const InfoText = styled.p`
  color: #6b7280;
  font-size: 0.85rem;
  margin-top: 0.25rem;
`;

interface VarietyAllocation {
  kunchinintuName: string;
  kunchinintuCode: string;
  warehouseName: string;
  warehouseCode: string;
}

const Arrivals: React.FC = () => {
  const { user } = useAuth();
  const { warehouses, kunchinittus, varieties, fetchWarehouses, fetchKunchinittus, fetchVarieties } = useLocation();

  // Form state
  const [slNo, setSlNo] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [dateInput, setDateInput] = useState('');
  const [movementType, setMovementType] = useState<'purchase' | 'shifting'>('purchase');

  // Purchase type selection
  const [purchaseFromType, setPurchaseFromType] = useState<'kunchinittu' | 'for-production'>('kunchinittu');

  // Shifting type selection
  const [shiftingType, setShiftingType] = useState<'normal' | 'production'>('normal');

  // Purchase fields
  const [broker, setBroker] = useState('');
  const [variety, setVariety] = useState('');
  const [bags, setBags] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toKunchinintuId, setToKunchinintuId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');

  // Outturn fields (for purchase from outturn)
  const [fromOutturnId, setFromOutturnId] = useState('');
  const [outturns, setOutturns] = useState<any[]>([]);

  // Shifting fields
  const [fromKunchinintuId, setFromKunchinintuId] = useState('');
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseShiftId, setToWarehouseShiftId] = useState('');

  // Production shifting fields (for shifting type = production)
  const [toOutturnId, setToOutturnId] = useState('');

  // Cutting fields (split into two)
  const [cuttingValue1, setCuttingValue1] = useState('');
  const [cuttingValue2, setCuttingValue2] = useState('');

  // Common fields
  const [moisture, setMoisture] = useState('');
  const [wbNo, setWbNo] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  const [lorryNumber, setLorryNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stock locations state
  const [stockLocations, setStockLocations] = useState<any[]>([]);
  const [loadingStockLocations, setLoadingStockLocations] = useState(false);

  // Filter out closed kunchinittus for dropdowns
  const activeKunchinittus = useMemo(() => {
    return kunchinittus.filter(k => !k.isClosed);
  }, [kunchinittus]);

  // Calculate cutting total
  const cuttingTotal = useMemo(() => {
    const val1 = parseFloat(cuttingValue1) || 0;
    const val2 = parseFloat(cuttingValue2) || 0;
    return val1 && val2 ? val1 * val2 : 0;
  }, [cuttingValue1, cuttingValue2]);

  // Get ALL variety allocations for this variety
  const varietyAllocations = useMemo(() => {
    if (!variety || variety.trim() === '') return [];

    const normalizedVariety = variety.trim().toUpperCase();

    // Find ALL kunchinittus allocated to this variety
    const allocatedKunchinittus = kunchinittus.filter(k => {
      // Only include if NOT closed
      if (k.isClosed) return false;

      if (k.variety && k.variety.name) {
        return k.variety.name.trim().toUpperCase() === normalizedVariety;
      }
      return false;
    });

    return allocatedKunchinittus.map(k => {
      const allocatedWarehouse = warehouses.find(w => w.id === k.warehouseId);
      return {
        kunchinintuId: k.id,
        kunchinintuName: k.name,
        kunchinintuCode: k.code,
        warehouseName: allocatedWarehouse?.name || '',
        warehouseCode: allocatedWarehouse?.code || '',
        warehouseId: allocatedWarehouse?.id || ''
      };
    }).filter(item => item.warehouseName);
  }, [variety, kunchinittus, warehouses]);

  // Get first allocation for backward compatibility
  const varietyAllocation = useMemo((): VarietyAllocation | null => {
    if (varietyAllocations.length === 0) return null;

    const first = varietyAllocations[0];
    return {
      kunchinintuName: first.kunchinintuName,
      kunchinintuCode: first.kunchinintuCode,
      warehouseName: first.warehouseName,
      warehouseCode: first.warehouseCode
    };
  }, [varietyAllocations]);

  // Auto-populate kunchinittu and warehouse when variety is selected
  useEffect(() => {
    if (varietyAllocation && movementType === 'purchase' && purchaseFromType === 'kunchinittu') {
      const kunchinittu = kunchinittus.find(k => k.code === varietyAllocation.kunchinintuCode);
      const warehouse = warehouses.find(w => w.code === varietyAllocation.warehouseCode);

      if (kunchinittu && toKunchinintuId !== String(kunchinittu.id)) {
        setToKunchinintuId(String(kunchinittu.id));
      }
      if (warehouse && toWarehouseId !== String(warehouse.id)) {
        setToWarehouseId(String(warehouse.id));
      }
    }
  }, [varietyAllocation, movementType, purchaseFromType, kunchinittus, warehouses]);

  // Auto-populate shifting fields when variety is selected
  useEffect(() => {
    if (varietyAllocations.length > 0 && movementType === 'shifting' && shiftingType === 'normal') {
      // If only one kunchinittu for this variety, auto-select it for "from"
      if (varietyAllocations.length === 1) {
        const allocation = varietyAllocations[0];
        if (fromKunchinintuId !== String(allocation.kunchinintuId)) {
          setFromKunchinintuId(String(allocation.kunchinintuId));
        }
        if (fromWarehouseId !== String(allocation.warehouseId)) {
          setFromWarehouseId(String(allocation.warehouseId));
        }
      }
    }
  }, [varietyAllocations, movementType, shiftingType]);

  // Fetch stock locations when variety changes (for shifting only)
  useEffect(() => {
    const fetchStockLocations = async () => {
      if (!variety || variety.trim() === '' || movementType !== 'shifting') {
        setStockLocations([]);
        return;
      }

      setLoadingStockLocations(true);
      try {
        const response = await axios.get<{ locations: any[] }>(`/arrivals/stock/variety-locations/${encodeURIComponent(variety.trim())}`);
        setStockLocations(response.data.locations || []);
      } catch (error) {
        console.error('Error fetching stock locations:', error);
        setStockLocations([]);
        toast.warning('Could not fetch stock locations for this variety');
      } finally {
        setLoadingStockLocations(false);
      }
    };

    // Debounce the API call to avoid too many requests while typing
    const timeoutId = setTimeout(fetchStockLocations, 500);
    return () => clearTimeout(timeoutId);
  }, [variety, movementType]);

  // Auto-populate fields based on stock locations
  useEffect(() => {
    if (movementType !== 'shifting' || shiftingType !== 'normal') return;

    if (stockLocations.length === 1) {
      // Only one location - auto-populate "From" fields
      const location = stockLocations[0];
      setFromKunchinintuId(String(location.kunchinintuId));
      setFromWarehouseId(String(location.warehouseId));
    } else if (stockLocations.length === 2) {
      // Two locations - auto-populate both "From" and "To" fields
      const [location1, location2] = stockLocations;
      setFromKunchinintuId(String(location1.kunchinintuId));
      setFromWarehouseId(String(location1.warehouseId));
      setToKunchinintuId(String(location2.kunchinintuId));
      setToWarehouseShiftId(String(location2.warehouseId));
    }
    // For more than 2 locations, user will choose from the available options
  }, [stockLocations, movementType, shiftingType]);

  const selectedToKunchinittu = useMemo(() => {
    if (!toKunchinintuId) return undefined;
    return kunchinittus.find(k => String(k.id) === toKunchinintuId);
  }, [kunchinittus, toKunchinintuId]);

  // Available warehouses for purchase (based on selected kunchinittu)
  const availableWarehouses = useMemo(() => {
    if (!selectedToKunchinittu) return [];
    if (selectedToKunchinittu.warehouse) return [selectedToKunchinittu.warehouse];
    if (selectedToKunchinittu.warehouseId) {
      const match = warehouses.find(w => w.id === selectedToKunchinittu.warehouseId);
      return match ? [match] : [];
    }
    return [];
  }, [selectedToKunchinittu, warehouses]);

  // Available warehouses for shifting (filtered by selected kunchinittu)
  const availableFromWarehouses = useMemo(() => {
    if (!fromKunchinintuId) return warehouses;
    const selectedKunchinittu = kunchinittus.find(k => String(k.id) === fromKunchinintuId);
    if (!selectedKunchinittu) return warehouses;
    return warehouses.filter(w => String(w.id) === String(selectedKunchinittu.warehouseId));
  }, [warehouses, kunchinittus, fromKunchinintuId]);

  const availableToWarehousesForShifting = useMemo(() => {
    if (!toKunchinintuId) return warehouses;
    const selectedKunchinittu = kunchinittus.find(k => String(k.id) === toKunchinintuId);
    if (!selectedKunchinittu) return warehouses;
    return warehouses.filter(w => String(w.id) === String(selectedKunchinittu.warehouseId));
  }, [warehouses, kunchinittus, toKunchinintuId]);

  // Determine which fields to show based on stock locations count
  const shouldShowSingleLocationFields = useMemo(() => {
    return stockLocations.length === 1;
  }, [stockLocations]);

  const shouldShowMultipleLocationFields = useMemo(() => {
    return stockLocations.length >= 2;
  }, [stockLocations]);

  // Fetch data on mount and auto-populate date
  useEffect(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    setDate(today);
    setDateInput(today.toLocaleDateString('en-GB').split('/').join('-'));

    fetchNextSlNo();
    fetchWarehouses();
    fetchKunchinittus();
    fetchVarieties();
    fetchOutturns();
  }, []);

  const fetchNextSlNo = async () => {
    try {
      const response = await axios.get('/arrivals/next-sl-no');
      setSlNo((response.data as { slNo: string }).slNo);
    } catch (error) {
      console.error('Error fetching SL No:', error);
      toast.error('Failed to fetch SL number');
    }
  };

  const fetchOutturns = async () => {
    try {
      const response = await axios.get<any[]>('/outturns');
      setOutturns(response.data);
    } catch (error) {
      console.error('Error fetching outturns:', error);
    }
  };

  const netWeight = grossWeight && tareWeight ?
    (parseFloat(grossWeight) - parseFloat(tareWeight)).toFixed(2) : '0.00';

  const handleReset = () => {
    setBroker('');
    setVariety('');
    setBags('');
    setFromLocation('');
    setToKunchinintuId('');
    setToWarehouseId('');
    setFromKunchinintuId('');
    setFromWarehouseId('');
    setToWarehouseShiftId('');
    setFromOutturnId('');
    setToOutturnId('');
    setMoisture('');
    setCuttingValue1('');
    setCuttingValue2('');
    setWbNo('');
    setGrossWeight('');
    setTareWeight('');
    setLorryNumber('');
    setRemarks('');
    setPurchaseFromType('kunchinittu');
    setShiftingType('normal');

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    setDate(today);
    setDateInput(today.toLocaleDateString('en-GB').split('/').join('-'));

    fetchNextSlNo();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double-click submission
    if (isSubmitting) {
      return;
    }

    // Validation
    if (!wbNo || !grossWeight || !tareWeight || !lorryNumber) {
      toast.error('Please fill all required fields');
      return;
    }

    if (parseFloat(grossWeight) <= parseFloat(tareWeight)) {
      toast.error('Gross weight must be greater than tare weight');
      return;
    }

    setIsSubmitting(true);

    // Build cutting string
    const cuttingString = (cuttingValue1 && cuttingValue2) ?
      `${cuttingValue1}X${cuttingValue2}` : '';

    if (movementType === 'purchase') {
      if (purchaseFromType === 'kunchinittu') {
        if (!broker || !broker.trim() || !variety || !toKunchinintuId || !toWarehouseId) {
          toast.error('Please enter broker name, variety and select to location (kunchinittu & warehouse)');
          return;
        }
      } else {
        // For production - direct to outturn
        if (!broker || !broker.trim() || !variety || !toOutturnId) {
          toast.error('Please fill broker, variety and select outturn');
          return;
        }
      }
    } else if (movementType === 'shifting') {
      if (shiftingType === 'normal') {
        if (!fromKunchinintuId || !fromWarehouseId || !toKunchinintuId || !toWarehouseShiftId) {
          toast.error('Please fill all location fields for shifting');
          return;
        }
      } else {
        // Production shifting
        if (!fromKunchinintuId || !fromWarehouseId || !toOutturnId || !variety) {
          toast.error('Please fill all fields for production shifting');
          return;
        }
      }
    }

    setLoading(true);

    try {
      const data: any = {
        date: date.toISOString().split('T')[0],
        movementType: shiftingType === 'production' ? 'production-shifting' : movementType,
        purchaseType: purchaseFromType, // Add purchaseType to distinguish normal vs for-production
        variety: variety || null,
        bags: bags ? parseInt(bags) : null,
        moisture: moisture ? parseFloat(moisture) : null,
        cutting: cuttingString || null,
        wbNo,
        grossWeight: parseFloat(grossWeight),
        tareWeight: parseFloat(tareWeight),
        lorryNumber,
        remarks
      };

      if (movementType === 'purchase') {
        if (purchaseFromType === 'kunchinittu') {
          data.broker = broker.trim();
          data.fromLocation = fromLocation || null;
          data.toKunchinintuId = parseInt(toKunchinintuId);
          data.toWarehouseId = parseInt(toWarehouseId);
        } else {
          // For production - direct to outturn (no kunchinittu/warehouse)
          data.broker = broker.trim();
          data.fromLocation = fromLocation || null;
          data.outturnId = parseInt(toOutturnId);
        }
      } else if (movementType === 'shifting') {
        if (shiftingType === 'normal') {
          data.fromKunchinintuId = parseInt(fromKunchinintuId);
          data.fromWarehouseId = parseInt(fromWarehouseId);
          data.toKunchinintuId = parseInt(toKunchinintuId);
          data.toWarehouseShiftId = parseInt(toWarehouseShiftId);
        } else {
          // Production shifting
          data.fromKunchinintuId = parseInt(fromKunchinintuId);
          data.fromWarehouseId = parseInt(fromWarehouseId);
          data.outturnId = parseInt(toOutturnId);
          data.toKunchinintuId = parseInt(fromKunchinintuId); // Same kunchinittu
        }
      }

      await axios.post('/arrivals', data);

      toast.success(NotificationMessages.arrivals.created);
      handleReset();
    } catch (error: any) {
      console.error('Error creating arrival:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create arrival';

      if (errorMessage.includes('VARIETY MISMATCH') || errorMessage.includes('SOURCE VARIETY NOT FOUND') || errorMessage.includes('DESTINATION VARIETY MISMATCH')) {
        toast.error(errorMessage, {
          autoClose: 8000,
          style: {
            fontSize: '14px',
            lineHeight: '1.4'
          }
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <Title>📝 Arrivals - Data Entry</Title>

      <MainGrid>
        <FormCard>
          <form onSubmit={handleSubmit}>
            {/* Form Header with Movement Type Toggle */}
            <FormHeader>
              <div>
                <Label style={{ marginBottom: '0.5rem' }}>Entry Type</Label>
              </div>
              <ToggleButtonGroup>
                <ToggleButton
                  type="button"
                  $active={movementType === 'purchase'}
                  onClick={() => {
                    setMovementType('purchase');
                    setPurchaseFromType('kunchinittu');
                    setShiftingType('normal');
                  }}
                >
                  📦 Purchase
                </ToggleButton>
                <ToggleButton
                  type="button"
                  $active={movementType === 'shifting'}
                  onClick={() => {
                    setMovementType('shifting');
                    setPurchaseFromType('kunchinittu');
                    setShiftingType('normal');
                  }}
                >
                  🔄 Shifting
                </ToggleButton>
              </ToggleButtonGroup>
            </FormHeader>

            {/* Top Section - SL No and Date */}
            <TopSection>
              <FormGroup>
                <Label>SL No</Label>
                <SlNoDisplay>{slNo || 'Loading...'}</SlNoDisplay>
                <InfoText>Auto-generated serial number</InfoText>
              </FormGroup>

              <FormGroup>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={date ? date.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value + 'T12:00:00');
                    if (!isNaN(selectedDate.getTime())) {
                      setDate(selectedDate);
                    }
                  }}
                />
                <InfoText>Click the calendar icon to select date</InfoText>
              </FormGroup>
            </TopSection>

            {/* Conditional Fields Based on Movement Type */}
            {movementType === 'purchase' ? (
              <>
                {/* Purchase Type Selection */}
                <FormSection>
                  <FormRow>
                    <FormGroup>
                      <Label>To *</Label>
                      <Select
                        value={purchaseFromType}
                        onChange={(e) => setPurchaseFromType(e.target.value as 'kunchinittu' | 'for-production')}
                      >
                        <option value="kunchinittu">Kunchinittu (Normal Purchase)</option>
                        <option value="for-production">For Production (Direct to Outturn)</option>
                      </Select>
                    </FormGroup>
                  </FormRow>
                </FormSection>

                {purchaseFromType === 'kunchinittu' ? (
                  <>
                    {/* Normal Purchase Fields */}
                    <FormSection>
                      <SectionTitle>Purchase Details</SectionTitle>
                      <FormRow>
                        <FormGroup>
                          <Label>Broker *</Label>
                          <Input
                            type="text"
                            value={broker}
                            onChange={(e) => setBroker(e.target.value.toUpperCase())}
                            placeholder="Enter broker name"
                            style={{ textTransform: 'uppercase' }}
                            required
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label>Variety *</Label>
                          <Input
                            type="text"
                            value={variety}
                            onChange={(e) => setVariety(e.target.value.toUpperCase())}
                            required
                            placeholder="Enter variety name"
                            style={{ textTransform: 'uppercase' }}
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label>Bags</Label>
                          <Input
                            type="number"
                            value={bags}
                            onChange={(e) => setBags(e.target.value)}
                            placeholder="Number of bags"
                            min="0"
                          />
                        </FormGroup>
                      </FormRow>

                      <FormRow>
                        <FormGroup>
                          <Label>From Location</Label>
                          <Input
                            type="text"
                            value={fromLocation}
                            onChange={(e) => setFromLocation(e.target.value.toUpperCase())}
                            placeholder="Source location"
                            style={{ textTransform: 'uppercase' }}
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label>To Kunchinittu *</Label>
                          <Select
                            value={toKunchinintuId}
                            onChange={(e) => {
                              setToKunchinintuId(e.target.value);
                              setToWarehouseId('');
                            }}
                            required
                          >
                            <option value="">Select Kunchinittu</option>
                            {varietyAllocations.length > 0 ? (
                              // Show only kunchinittus for this variety
                              varietyAllocations.map((allocation) => (
                                <option key={allocation.kunchinintuId} value={allocation.kunchinintuId}>
                                  {allocation.kunchinintuCode} - {allocation.warehouseName}
                                </option>
                              ))
                            ) : (
                              // Show all kunchinittus if no variety selected
                              activeKunchinittus.map((k) => (
                                <option key={k.id} value={k.id}>
                                  {k.code}
                                </option>
                              ))
                            )}
                          </Select>
                        </FormGroup>

                        <FormGroup>
                          <Label>Warehouse *</Label>
                          <Select
                            value={toWarehouseId}
                            onChange={(e) => setToWarehouseId(e.target.value)}
                            required
                            disabled={!toKunchinintuId}
                          >
                            <option value="">Select Warehouse</option>
                            {availableWarehouses.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.code}
                              </option>
                            ))}
                          </Select>
                        </FormGroup>
                      </FormRow>
                    </FormSection>
                  </>
                ) : (
                  <>
                    {/* For Production - Direct to Outturn */}
                    <FormSection>
                      <SectionTitle>For Production (Direct to Outturn)</SectionTitle>
                      <FormRow>
                        <FormGroup>
                          <Label>Broker *</Label>
                          <Input
                            type="text"
                            value={broker}
                            onChange={(e) => setBroker(e.target.value.toUpperCase())}
                            placeholder="Broker name"
                            style={{ textTransform: 'uppercase' }}
                            required
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label>Variety *</Label>
                          <Input
                            type="text"
                            value={variety}
                            onChange={(e) => setVariety(e.target.value.toUpperCase())}
                            required
                            placeholder="Enter variety name"
                            style={{ textTransform: 'uppercase' }}
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label>Bags</Label>
                          <Input
                            type="number"
                            value={bags}
                            onChange={(e) => setBags(e.target.value)}
                            placeholder="Number of bags"
                            min="0"
                          />
                        </FormGroup>
                      </FormRow>

                      <FormRow>
                        <FormGroup>
                          <Label>From Location</Label>
                          <Input
                            type="text"
                            value={fromLocation}
                            onChange={(e) => setFromLocation(e.target.value.toUpperCase())}
                            placeholder="Source location"
                            style={{ textTransform: 'uppercase' }}
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label>To Outturn * (No Warehouse Storage)</Label>
                          <Select
                            value={toOutturnId}
                            onChange={(e) => {
                              setToOutturnId(e.target.value);
                              const selected = outturns.find(o => o.id === parseInt(e.target.value));
                              if (selected) {
                                setVariety(selected.allottedVariety);
                              }
                            }}
                            required
                          >
                            <option value="">Select Outturn</option>
                            {outturns.filter(o => !o.isCleared).map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.code} - {o.allottedVariety}
                              </option>
                            ))}
                          </Select>
                        </FormGroup>
                      </FormRow>
                    </FormSection>
                  </>
                )}

                {/* Cutting Fields */}
                <FormSection>
                  <SectionTitle>Additional Details</SectionTitle>
                  <FormRow>
                    <FormGroup>
                      <Label>Moisture (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={moisture}
                        onChange={(e) => setMoisture(e.target.value)}
                        placeholder="e.g., 12.5"
                        min="0"
                        max="100"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Cutting (multiply)</Label>
                      <TwoColumnRow>
                        <SmallInput
                          type="number"
                          value={cuttingValue1}
                          onChange={(e) => setCuttingValue1(e.target.value)}
                          placeholder="e.g., 20"
                          min="0"
                        />
                        <SmallInput
                          type="number"
                          value={cuttingValue2}
                          onChange={(e) => setCuttingValue2(e.target.value)}
                          placeholder="e.g., 10"
                          min="0"
                        />
                      </TwoColumnRow>
                      {/* Cutting total hidden as per user request */}
                    </FormGroup>
                  </FormRow>
                </FormSection>
              </>
            ) : (
              <>
                {/* Shifting Type Selection */}
                <FormSection>
                  <FormRow>
                    <FormGroup>
                      <Label>Shifting Type *</Label>
                      <Select
                        value={shiftingType}
                        onChange={(e) => setShiftingType(e.target.value as 'normal' | 'production')}
                      >
                        <option value="normal">Normal Shifting</option>
                        <option value="production">Production Shifting</option>
                      </Select>
                    </FormGroup>
                  </FormRow>
                </FormSection>

                {shiftingType === 'normal' ? (
                  <>
                    {/* Normal Shifting Fields */}
                    <FormSection>
                      <SectionTitle>Shifting Details</SectionTitle>
                      <FormRow>
                        <FormGroup>
                          <Label>Variety *</Label>
                          <Input
                            type="text"
                            value={variety}
                            onChange={(e) => setVariety(e.target.value.toUpperCase())}
                            placeholder="Enter variety name"
                            style={{ textTransform: 'uppercase' }}
                            required
                          />
                          {loadingStockLocations && (
                            <InfoText style={{ color: '#667eea' }}>
                              🔍 Checking stock locations...
                            </InfoText>
                          )}
                          {!loadingStockLocations && variety && stockLocations.length === 0 && (
                            <InfoText style={{ color: '#ef4444' }}>
                              ⚠️ No stock found for this variety
                            </InfoText>
                          )}
                        </FormGroup>

                        <FormGroup>
                          <Label>Bags</Label>
                          <Input
                            type="number"
                            value={bags}
                            onChange={(e) => setBags(e.target.value)}
                            placeholder="Number of bags"
                            min="0"
                          />
                        </FormGroup>
                      </FormRow>

                      {/* Conditional Field Rendering Based on Stock Locations */}
                      {shouldShowSingleLocationFields && (
                        <>
                          <SectionTitle>From Location</SectionTitle>
                          <FormRow>
                            <FormGroup>
                              <Label>From Kunchinittu *</Label>
                              <Select
                                value={fromKunchinintuId}
                                onChange={(e) => setFromKunchinintuId(e.target.value)}
                                required
                              >
                                <option value="">Select Kunchinittu</option>
                                {stockLocations.map((loc) => (
                                  <option key={loc.kunchinintuId} value={loc.kunchinintuId}>
                                    {loc.kunchinintuCode} - {loc.warehouseName} ({loc.stockBags} bags)
                                  </option>
                                ))}
                              </Select>
                              <InfoText style={{ color: '#10b981' }}>
                                ✓ Auto-populated (only one location has stock)
                              </InfoText>
                            </FormGroup>

                            <FormGroup>
                              <Label>From Warehouse *</Label>
                              <Select
                                value={fromWarehouseId}
                                onChange={(e) => setFromWarehouseId(e.target.value)}
                                required
                              >
                                <option value="">Select Warehouse</option>
                                {stockLocations.map((loc) => (
                                  <option key={loc.warehouseId} value={loc.warehouseId}>
                                    {loc.warehouseName}
                                  </option>
                                ))}
                              </Select>
                            </FormGroup>
                          </FormRow>

                          <SectionTitle>To Location</SectionTitle>
                          <FormRow>
                            <FormGroup>
                              <Label>To Kunchinittu *</Label>
                              <Select
                                value={toKunchinintuId}
                                onChange={(e) => {
                                  setToKunchinintuId(e.target.value);
                                  setToWarehouseShiftId('');
                                }}
                                required
                              >
                                <option value="">Select Kunchinittu</option>
                                {activeKunchinittus.map((k) => (
                                  <option key={k.id} value={k.id}>
                                    {k.code}
                                  </option>
                                ))}
                              </Select>
                            </FormGroup>

                            <FormGroup>
                              <Label>To Warehouse *</Label>
                              <Select
                                value={toWarehouseShiftId}
                                onChange={(e) => setToWarehouseShiftId(e.target.value)}
                                required
                                disabled={!toKunchinintuId}
                              >
                                <option value="">Select Warehouse</option>
                                {availableToWarehousesForShifting.map((w) => (
                                  <option key={w.id} value={w.id}>
                                    {w.code}
                                  </option>
                                ))}
                              </Select>
                            </FormGroup>
                          </FormRow>
                        </>
                      )}

                      {shouldShowMultipleLocationFields && (
                        <>
                          <SectionTitle>From Kunchinittu Warehouse</SectionTitle>
                          <FormRow>
                            <FormGroup>
                              <Label>From Kunchinittu Warehouse *</Label>
                              <Select
                                value={fromKunchinintuId ? `${fromKunchinintuId}-${fromWarehouseId}` : ''}
                                onChange={(e) => {
                                  const [kId, wId] = e.target.value.split('-');
                                  setFromKunchinintuId(kId);
                                  setFromWarehouseId(wId);
                                }}
                                required
                              >
                                <option value="">Select From Location</option>
                                {stockLocations.map((loc) => (
                                  <option
                                    key={`${loc.kunchinintuId}-${loc.warehouseId}`}
                                    value={`${loc.kunchinintuId}-${loc.warehouseId}`}
                                  >
                                    {loc.kunchinintuCode} - {loc.warehouseName} ({loc.stockBags} bags)
                                  </option>
                                ))}
                              </Select>
                              {stockLocations.length === 2 && (
                                <InfoText style={{ color: '#10b981' }}>
                                  ✓ Auto-populated (two locations available)
                                </InfoText>
                              )}
                            </FormGroup>
                          </FormRow>

                          <SectionTitle>To Kunchinittu Warehouse</SectionTitle>
                          <FormRow>
                            <FormGroup>
                              <Label>To Kunchinittu Warehouse *</Label>
                              <Select
                                value={toKunchinintuId ? `${toKunchinintuId}-${toWarehouseShiftId}` : ''}
                                onChange={(e) => {
                                  const [kId, wId] = e.target.value.split('-');
                                  setToKunchinintuId(kId);
                                  setToWarehouseShiftId(wId);
                                }}
                                required
                              >
                                <option value="">Select To Location</option>
                                {stockLocations.map((loc) => (
                                  <option
                                    key={`${loc.kunchinintuId}-${loc.warehouseId}`}
                                    value={`${loc.kunchinintuId}-${loc.warehouseId}`}
                                  >
                                    {loc.kunchinintuCode} - {loc.warehouseName} ({loc.stockBags} bags)
                                  </option>
                                ))}
                              </Select>
                              {stockLocations.length === 2 && (
                                <InfoText style={{ color: '#10b981' }}>
                                  ✓ Auto-populated (two locations available)
                                </InfoText>
                              )}
                            </FormGroup>
                          </FormRow>
                        </>
                      )}

                      {!shouldShowSingleLocationFields && !shouldShowMultipleLocationFields && variety && !loadingStockLocations && (
                        <>
                          <SectionTitle>From Location</SectionTitle>
                          <FormRow>
                            <FormGroup>
                              <Label>From Kunchinittu *</Label>
                              <Select
                                value={fromKunchinintuId}
                                onChange={(e) => {
                                  setFromKunchinintuId(e.target.value);
                                  setFromWarehouseId('');
                                }}
                                required
                              >
                                <option value="">Select Kunchinittu</option>
                                {activeKunchinittus.map((k) => (
                                  <option key={k.id} value={k.id}>
                                    {k.code}
                                  </option>
                                ))}
                              </Select>
                            </FormGroup>

                            <FormGroup>
                              <Label>From Warehouse *</Label>
                              <Select
                                value={fromWarehouseId}
                                onChange={(e) => setFromWarehouseId(e.target.value)}
                                required
                                disabled={!fromKunchinintuId}
                              >
                                <option value="">
                                  {fromKunchinintuId ? 'Select Warehouse' : 'Select Kunchinittu First'}
                                </option>
                                {availableFromWarehouses.map((w) => (
                                  <option key={w.id} value={w.id}>
                                    {w.code}
                                  </option>
                                ))}
                              </Select>
                            </FormGroup>
                          </FormRow>

                          <SectionTitle>To Location</SectionTitle>
                          <FormRow>
                            <FormGroup>
                              <Label>To Kunchinittu *</Label>
                              <Select
                                value={toKunchinintuId}
                                onChange={(e) => {
                                  setToKunchinintuId(e.target.value);
                                  setToWarehouseShiftId('');
                                }}
                                required
                              >
                                <option value="">Select Kunchinittu</option>
                                {activeKunchinittus.map((k) => (
                                  <option key={k.id} value={k.id}>
                                    {k.code}
                                  </option>
                                ))}
                              </Select>
                            </FormGroup>

                            <FormGroup>
                              <Label>To Warehouse *</Label>
                              <Select
                                value={toWarehouseShiftId}
                                onChange={(e) => setToWarehouseShiftId(e.target.value)}
                                required
                                disabled={!toKunchinintuId}
                              >
                                <option value="">
                                  {toKunchinintuId ? 'Select Warehouse' : 'Select Kunchinittu First'}
                                </option>
                                {availableToWarehousesForShifting.map((w) => (
                                  <option key={w.id} value={w.id}>
                                    {w.code}
                                  </option>
                                ))}
                              </Select>
                            </FormGroup>
                          </FormRow>
                        </>
                      )}
                    </FormSection>
                  </>
                ) : (
                  <>
                    {/* Production Shifting Fields */}
                    <FormSection>
                      <SectionTitle>Production Shifting Details</SectionTitle>
                      <FormRow>
                        <FormGroup>
                          <Label>Variety *</Label>
                          <Input
                            type="text"
                            value={variety}
                            onChange={(e) => setVariety(e.target.value.toUpperCase())}
                            placeholder="Enter variety name"
                            style={{ textTransform: 'uppercase' }}
                            required
                          />
                          {loadingStockLocations && (
                            <InfoText style={{ color: '#667eea' }}>
                              🔍 Checking stock locations...
                            </InfoText>
                          )}
                          {!loadingStockLocations && variety && stockLocations.length === 0 && (
                            <InfoText style={{ color: '#ef4444' }}>
                              ⚠️ No stock found for this variety
                            </InfoText>
                          )}
                        </FormGroup>

                        <FormGroup>
                          <Label>Bags</Label>
                          <Input
                            type="number"
                            value={bags}
                            onChange={(e) => setBags(e.target.value)}
                            placeholder="Number of bags"
                            min="0"
                          />
                        </FormGroup>
                      </FormRow>

                      {/* Conditional rendering based on stock locations */}
                      {shouldShowSingleLocationFields && (
                        <>
                          <SectionTitle>From Location</SectionTitle>
                          <FormRow>
                            <FormGroup>
                              <Label>From Kunchinittu *</Label>
                              <Select
                                value={fromKunchinintuId}
                                onChange={(e) => {
                                  setFromKunchinintuId(e.target.value);
                                  setToKunchinintuId(e.target.value);
                                }}
                                required
                              >
                                <option value="">Select Kunchinittu</option>
                                {stockLocations.map((loc) => (
                                  <option key={loc.kunchinintuId} value={loc.kunchinintuId}>
                                    {loc.kunchinintuCode} - {loc.warehouseName} ({loc.stockBags} bags)
                                  </option>
                                ))}
                              </Select>
                              <InfoText style={{ color: '#10b981' }}>
                                ✓ Auto-populated (only one location has stock)
                              </InfoText>
                            </FormGroup>

                            <FormGroup>
                              <Label>From Warehouse *</Label>
                              <Select
                                value={fromWarehouseId}
                                onChange={(e) => setFromWarehouseId(e.target.value)}
                                required
                              >
                                <option value="">Select Warehouse</option>
                                {stockLocations.map((loc) => (
                                  <option key={loc.warehouseId} value={loc.warehouseId}>
                                    {loc.warehouseName}
                                  </option>
                                ))}
                              </Select>
                            </FormGroup>
                          </FormRow>
                        </>
                      )}

                      {shouldShowMultipleLocationFields && (
                        <>
                          <SectionTitle>From Kunchinittu Warehouse</SectionTitle>
                          <FormRow>
                            <FormGroup>
                              <Label>From Kunchinittu Warehouse *</Label>
                              <Select
                                value={fromKunchinintuId ? `${fromKunchinintuId}-${fromWarehouseId}` : ''}
                                onChange={(e) => {
                                  const [kId, wId] = e.target.value.split('-');
                                  setFromKunchinintuId(kId);
                                  setFromWarehouseId(wId);
                                  setToKunchinintuId(kId);
                                }}
                                required
                              >
                                <option value="">Select From Location</option>
                                {stockLocations.map((loc) => (
                                  <option
                                    key={`${loc.kunchinintuId}-${loc.warehouseId}`}
                                    value={`${loc.kunchinintuId}-${loc.warehouseId}`}
                                  >
                                    {loc.kunchinintuCode} - {loc.warehouseName} ({loc.stockBags} bags)
                                  </option>
                                ))}
                              </Select>
                            </FormGroup>
                          </FormRow>
                        </>
                      )}

                      {!shouldShowSingleLocationFields && !shouldShowMultipleLocationFields && variety && !loadingStockLocations && (
                        <>
                          <SectionTitle>From Location</SectionTitle>
                          <FormRow>
                            <FormGroup>
                              <Label>From Kunchinittu *</Label>
                              <Select
                                value={fromKunchinintuId}
                                onChange={(e) => {
                                  setFromKunchinintuId(e.target.value);
                                  setFromWarehouseId('');
                                  setToKunchinintuId(e.target.value);
                                }}
                                required
                              >
                                <option value="">Select Kunchinittu</option>
                                {activeKunchinittus.map((k) => (
                                  <option key={k.id} value={k.id}>
                                    {k.code}
                                  </option>
                                ))}
                              </Select>
                            </FormGroup>

                            <FormGroup>
                              <Label>From Warehouse *</Label>
                              <Select
                                value={fromWarehouseId}
                                onChange={(e) => setFromWarehouseId(e.target.value)}
                                required
                                disabled={!fromKunchinintuId}
                              >
                                <option value="">
                                  {fromKunchinintuId ? 'Select Warehouse' : 'Select Kunchinittu First'}
                                </option>
                                {availableFromWarehouses.map((w) => (
                                  <option key={w.id} value={w.id}>
                                    {w.code}
                                  </option>
                                ))}
                              </Select>
                            </FormGroup>
                          </FormRow>
                        </>
                      )}

                      <SectionTitle>To Outturn</SectionTitle>
                      <FormRow>
                        <FormGroup>
                          <Label>Outturn Number *</Label>
                          <Select
                            value={toOutturnId}
                            onChange={(e) => {
                              setToOutturnId(e.target.value);
                              const selected = outturns.find(o => o.id === parseInt(e.target.value));
                              if (selected) {
                                setVariety(selected.allottedVariety);
                              }
                            }}
                            required
                          >
                            <option value="">Select Outturn</option>
                            {outturns.filter(o => !o.isCleared).map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.code} - {o.allottedVariety}
                              </option>
                            ))}
                          </Select>
                        </FormGroup>
                      </FormRow>
                    </FormSection>
                  </>
                )}

                {/* Cutting Fields for Shifting */}
                <FormSection>
                  <FormRow>
                    <FormGroup>
                      <Label>Moisture (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={moisture}
                        onChange={(e) => setMoisture(e.target.value)}
                        placeholder="e.g., 12.5"
                        min="0"
                        max="100"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Cutting (multiply)</Label>
                      <TwoColumnRow>
                        <SmallInput
                          type="number"
                          value={cuttingValue1}
                          onChange={(e) => setCuttingValue1(e.target.value)}
                          placeholder="e.g., 20"
                          min="0"
                        />
                        <SmallInput
                          type="number"
                          value={cuttingValue2}
                          onChange={(e) => setCuttingValue2(e.target.value)}
                          placeholder="e.g., 10"
                          min="0"
                        />
                      </TwoColumnRow>
                      {/* Cutting total hidden as per user request */}
                    </FormGroup>
                  </FormRow>
                </FormSection>
              </>
            )}

            {/* Common Measurement Fields */}
            <FormSection>
              <SectionTitle>Measurements</SectionTitle>
              <FormRow>
                <FormGroup>
                  <Label>WB No *</Label>
                  <Input
                    type="text"
                    value={wbNo}
                    onChange={(e) => setWbNo(e.target.value.toUpperCase())}
                    placeholder="Weighbridge number"
                    required
                    style={{ textTransform: 'uppercase' }}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Gross Weight (kg) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    placeholder="0.00"
                    required
                    min="0"
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Tare Weight (kg) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={tareWeight}
                    onChange={(e) => setTareWeight(e.target.value)}
                    placeholder="0.00"
                    required
                    min="0"
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Net Weight (kg)</Label>
                  <Input
                    type="text"
                    value={netWeight}
                    disabled
                    style={{
                      background: '#f3f4f6',
                      fontWeight: 'bold',
                      color: '#059669'
                    }}
                  />
                  <InfoText>Auto-calculated (Gross - Tare)</InfoText>
                </FormGroup>

                <FormGroup>
                  <Label>Lorry Number *</Label>
                  <Input
                    type="text"
                    value={lorryNumber}
                    onChange={(e) => setLorryNumber(e.target.value.toUpperCase())}
                    placeholder="Vehicle registration"
                    required
                    style={{ textTransform: 'uppercase' }}
                  />
                </FormGroup>
              </FormRow>
            </FormSection>

            {/* Remarks */}
            <FormSection>
              <FormGroup>
                <Label>Remarks</Label>
                <Input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional notes"
                />
              </FormGroup>
            </FormSection>

            {/* Action Buttons */}
            <ButtonGroup>
              <Button type="button" className="secondary" onClick={handleReset}>
                Reset Form
              </Button>
              <Button type="submit" className="primary" disabled={isSubmitting || loading}>
                {isSubmitting ? 'Saving...' : `Save ${movementType === 'purchase' ? 'Purchase' : 'Shifting'}`}
              </Button>
            </ButtonGroup>

            {user?.role === 'staff' && (
              <InfoText style={{ textAlign: 'center', marginTop: '1rem' }}>
                ℹ️ Your entries will be pending until approved by Manager/Admin
              </InfoText>
            )}
          </form>
        </FormCard>

        {/* Right Side Info Panel */}
        <InfoPanel>
          <InfoTitle>📋 Quick Info</InfoTitle>

          {/* Show stock locations when in shifting mode */}
          {movementType === 'shifting' && variety && (
            <InfoTable>
              <InfoTableHeader>
                Variety Stock Locations
              </InfoTableHeader>
              <InfoTableBody>
                <InfoTableRow>
                  <InfoTableLabel>Variety:</InfoTableLabel>
                  <InfoTableValue>{variety}</InfoTableValue>
                </InfoTableRow>
                {loadingStockLocations && (
                  <InfoTableRow>
                    <InfoTableValue style={{ textAlign: 'center', color: '#6b7280', padding: '1rem' }}>
                      Loading stock locations...
                    </InfoTableValue>
                  </InfoTableRow>
                )}
                {!loadingStockLocations && stockLocations.length === 0 && (
                  <InfoTableRow>
                    <InfoTableValue style={{ textAlign: 'center', color: '#ef4444', padding: '1rem' }}>
                      ⚠️ No stock found for this variety
                    </InfoTableValue>
                  </InfoTableRow>
                )}
                {!loadingStockLocations && stockLocations.length > 0 && (
                  <>
                    <InfoTableRow>
                      <InfoTableValue style={{ color: '#10b981', fontWeight: 'bold', padding: '0.5rem' }}>
                        ✓ {stockLocations.length} {stockLocations.length === 1 ? 'location' : 'locations'} available
                      </InfoTableValue>
                    </InfoTableRow>
                    {stockLocations.map((loc, index) => (
                      <InfoTableRow key={`${loc.kunchinintuId}-${loc.warehouseId}`}>
                        <InfoTableLabel>Option {index + 1}:</InfoTableLabel>
                        <InfoTableValue>
                          <div style={{ fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 'bold', color: '#667eea' }}>{loc.kunchinintuCode}</div>
                            <div style={{ color: '#6b7280' }}>{loc.warehouseName}</div>
                            <div style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '0.25rem' }}>
                              {loc.stockBags} bags
                            </div>
                          </div>
                        </InfoTableValue>
                      </InfoTableRow>
                    ))}
                  </>
                )}
              </InfoTableBody>
            </InfoTable>
          )}

          {/* Show variety allocations for purchase mode */}
          {movementType === 'purchase' && variety && (
            <InfoTable>
              <InfoTableHeader>
                Variety Allocation
              </InfoTableHeader>
              <InfoTableBody>
                <InfoTableRow>
                  <InfoTableLabel>Variety:</InfoTableLabel>
                  <InfoTableValue>{variety}</InfoTableValue>
                </InfoTableRow>
                {varietyAllocations.length === 0 && (
                  <InfoTableRow>
                    <InfoTableValue style={{ textAlign: 'center', color: '#ef4444', padding: '1rem' }}>
                      ⚠️ No kunchinittu allocated for this variety
                    </InfoTableValue>
                  </InfoTableRow>
                )}
                {varietyAllocations.length > 0 && (
                  <>
                    <InfoTableRow>
                      <InfoTableValue style={{ color: '#10b981', fontWeight: 'bold', padding: '0.5rem' }}>
                        ✓ {varietyAllocations.length} {varietyAllocations.length === 1 ? 'option' : 'options'} available
                      </InfoTableValue>
                    </InfoTableRow>
                    {varietyAllocations.map((allocation, idx) => (
                      <InfoTableRow key={idx} style={{ background: idx % 2 === 0 ? '#f8fafc' : 'white' }}>
                        <InfoTableLabel>Option {idx + 1}:</InfoTableLabel>
                        <InfoTableValue>
                          <div style={{ fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 'bold', color: '#667eea' }}>{allocation.kunchinintuCode}</div>
                            <div style={{ color: '#6b7280' }}>{allocation.warehouseName}</div>
                          </div>
                        </InfoTableValue>
                      </InfoTableRow>
                    ))}
                  </>
                )}
              </InfoTableBody>
            </InfoTable>
          )}

          {/* Cutting Calculation table hidden as per user request */}

          {netWeight !== '0.00' && (
            <InfoTable>
              <InfoTableHeader style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                Net Weight
              </InfoTableHeader>
              <InfoTableBody>
                <InfoTableRow>
                  <InfoTableLabel>Gross Weight:</InfoTableLabel>
                  <InfoTableValue>{grossWeight} kg</InfoTableValue>
                </InfoTableRow>
                <InfoTableRow>
                  <InfoTableLabel>Tare Weight:</InfoTableLabel>
                  <InfoTableValue>{tareWeight} kg</InfoTableValue>
                </InfoTableRow>
                <InfoTableRow>
                  <InfoTableLabel>Net Weight:</InfoTableLabel>
                  <InfoTableValue style={{ color: '#f59e0b', fontSize: '1.2rem', fontWeight: 700 }}>
                    {netWeight} kg
                  </InfoTableValue>
                </InfoTableRow>
              </InfoTableBody>
            </InfoTable>
          )}
        </InfoPanel>
      </MainGrid>
    </Container>
  );
};

export default Arrivals;
