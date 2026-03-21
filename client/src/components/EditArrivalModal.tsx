import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import SearchableSelect from './SearchableSelect';

interface EditArrivalModalProps {
  arrival: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditArrivalModal: React.FC<EditArrivalModalProps> = ({ arrival, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    date: '',
    movementType: '',
    broker: '',
    fromLocation: '',
    toKunchinintuId: '',
    toWarehouseId: '',
    fromKunchinintuId: '',
    fromWarehouseId: '',
    toWarehouseShiftId: '',
    variety: '',
    bags: '',
    moisture: '',
    cutting: '',
    wbNo: '',
    grossWeight: '',
    tareWeight: '',
    netWeight: '',
    lorryNumber: '',
    byProducts: []
  });

  const [kunchinittus, setKunchinittus] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (arrival) {
      setFormData({
        date: arrival.date || '',
        movementType: arrival.movementType || '',
        broker: arrival.broker || '',
        fromLocation: arrival.fromLocation || '',
        toKunchinintuId: arrival.toKunchinintuId || '',
        toWarehouseId: arrival.toWarehouseId || '',
        fromKunchinintuId: arrival.fromKunchinintuId || '',
        fromWarehouseId: arrival.fromWarehouseId || '',
        toWarehouseShiftId: arrival.toWarehouseShiftId || '',
        variety: arrival.variety || '',
        bags: arrival.bags || '',
        moisture: arrival.moisture || '',
        cutting: arrival.cutting || '',
        wbNo: arrival.wbNo || '',
        grossWeight: arrival.grossWeight || '',
        tareWeight: arrival.tareWeight || '',
        netWeight: arrival.netWeight || '',
        lorryNumber: arrival.lorryNumber || '',
        byProducts: arrival.byProducts || []
      });
    }
    fetchLocations();
  }, [arrival]);

  const fetchLocations = async () => {
    try {
      const [kunchRes, warehRes] = await Promise.all([
        axios.get('/locations/kunchinittus'),
        axios.get('/locations/warehouses')
      ]);
      
      // Extract data from response
      const kunchData = (kunchRes.data as any)?.kunchinittus || (kunchRes.data as any) || [];
      const warehData = (warehRes.data as any)?.warehouses || (warehRes.data as any) || [];
      
      setKunchinittus(kunchData);
      setWarehouses(warehData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to load locations');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-calculate net weight when gross or tare weight changes
      if (name === 'grossWeight' || name === 'tareWeight') {
        const gross = parseFloat(name === 'grossWeight' ? value : updated.grossWeight) || 0;
        const tare = parseFloat(name === 'tareWeight' ? value : updated.tareWeight) || 0;
        updated.netWeight = (gross - tare).toFixed(2);
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation for purchase type
    if (formData.movementType === 'purchase') {
      if (!formData.broker || !formData.broker.trim()) {
        toast.error('Broker name is required for purchase records');
        setLoading(false);
        return;
      }
    }
    
    setLoading(true);

    try {
      // Convert string values to proper types before sending
      const payload = {
        date: formData.date,
        movementType: formData.movementType,
        broker: formData.broker ? formData.broker.trim() : null,
        fromLocation: formData.fromLocation || null,
        toKunchinintuId: formData.toKunchinintuId ? parseInt(formData.toKunchinintuId as string) : null,
        toWarehouseId: formData.toWarehouseId ? parseInt(formData.toWarehouseId as string) : null,
        fromKunchinintuId: formData.fromKunchinintuId ? parseInt(formData.fromKunchinintuId as string) : null,
        fromWarehouseId: formData.fromWarehouseId ? parseInt(formData.fromWarehouseId as string) : null,
        toWarehouseShiftId: formData.toWarehouseShiftId ? parseInt(formData.toWarehouseShiftId as string) : null,
        variety: formData.variety || null,
        bags: formData.bags ? parseInt(formData.bags as string) : null,
        moisture: formData.moisture ? parseFloat(formData.moisture as string) : null,
        cutting: formData.cutting || null,
        wbNo: formData.wbNo,
        grossWeight: parseFloat(formData.grossWeight as string),
        tareWeight: parseFloat(formData.tareWeight as string),
        netWeight: parseFloat(formData.netWeight as string),
        lorryNumber: formData.lorryNumber,
        byProducts: formData.byProducts
      };

      await axios.put(`/arrivals/${arrival.id}`, payload);
      toast.success('Arrival updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating arrival:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Failed to update arrival';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const kunchOptions = kunchinittus.map(k => ({
    value: k.id,
    label: `${k.code} - ${k.name}`
  }));

  const warehouseOptions = warehouses.map(w => ({
    value: w.id,
    label: `${w.code} - ${w.name}`
  }));

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <h2>Edit Arrival - {arrival.slNo}</h2>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>
        
        <Form onSubmit={handleSubmit}>
          <FormRow>
            <FormGroup>
              <Label>Date *</Label>
              <Input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Movement Type *</Label>
              <Select
                name="movementType"
                value={formData.movementType}
                onChange={handleChange}
                disabled
                required
              >
                <option value="">Select Type</option>
                <option value="purchase">Purchase</option>
                <option value="shifting">Shifting</option>
              </Select>
            </FormGroup>
          </FormRow>

          {formData.movementType === 'purchase' && (
            <>
              <FormRow>
                <FormGroup>
                  <Label>Broker *</Label>
                  <Input
                    type="text"
                    name="broker"
                    value={formData.broker}
                    onChange={handleChange}
                    placeholder="Enter broker name"
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>From Location</Label>
                  <Input
                    type="text"
                    name="fromLocation"
                    value={formData.fromLocation}
                    onChange={handleChange}
                  />
                </FormGroup>
              </FormRow>

              <FormRow>
                <FormGroup>
                  <Label>To Kunchinittu *</Label>
                  <SearchableSelect
                    options={kunchOptions}
                    value={formData.toKunchinintuId}
                    onChange={(value) => setFormData(prev => ({ ...prev, toKunchinintuId: value as string }))}
                    placeholder="Select Kunchinittu"
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>To Warehouse *</Label>
                  <SearchableSelect
                    options={warehouseOptions}
                    value={formData.toWarehouseId}
                    onChange={(value) => setFormData(prev => ({ ...prev, toWarehouseId: value as string }))}
                    placeholder="Select Warehouse"
                    required
                  />
                </FormGroup>
              </FormRow>
            </>
          )}

          {formData.movementType === 'shifting' && (
            <>
              <FormRow>
                <FormGroup>
                  <Label>From Kunchinittu *</Label>
                  <SearchableSelect
                    options={kunchOptions}
                    value={formData.fromKunchinintuId}
                    onChange={(value) => setFormData(prev => ({ ...prev, fromKunchinintuId: value as string }))}
                    placeholder="Select Kunchinittu"
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>From Warehouse *</Label>
                  <SearchableSelect
                    options={warehouseOptions}
                    value={formData.fromWarehouseId}
                    onChange={(value) => setFormData(prev => ({ ...prev, fromWarehouseId: value as string }))}
                    placeholder="Select Warehouse"
                    required
                  />
                </FormGroup>
              </FormRow>

              <FormRow>
                <FormGroup>
                  <Label>To Kunchinittu *</Label>
                  <SearchableSelect
                    options={kunchOptions}
                    value={formData.toKunchinintuId}
                    onChange={(value) => setFormData(prev => ({ ...prev, toKunchinintuId: value as string }))}
                    placeholder="Select Kunchinittu"
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>To Warehouse *</Label>
                  <SearchableSelect
                    options={warehouseOptions}
                    value={formData.toWarehouseShiftId}
                    onChange={(value) => setFormData(prev => ({ ...prev, toWarehouseShiftId: value as string }))}
                    placeholder="Select Warehouse"
                    required
                  />
                </FormGroup>
              </FormRow>
            </>
          )}

          <FormRow>
            <FormGroup>
              <Label>Variety</Label>
              <Input
                type="text"
                name="variety"
                value={formData.variety}
                onChange={handleChange}
              />
            </FormGroup>

            <FormGroup>
              <Label>Bags</Label>
              <Input
                type="number"
                name="bags"
                value={formData.bags}
                onChange={handleChange}
              />
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <Label>Moisture</Label>
              <Input
                type="number"
                step="0.01"
                name="moisture"
                value={formData.moisture}
                onChange={handleChange}
              />
            </FormGroup>

            <FormGroup>
              <Label>Cutting</Label>
              <Input
                type="text"
                name="cutting"
                value={formData.cutting}
                onChange={handleChange}
                placeholder="e.g. 3x2"
              />
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <Label>WB No *</Label>
              <Input
                type="text"
                name="wbNo"
                value={formData.wbNo}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Lorry Number *</Label>
              <Input
                type="text"
                name="lorryNumber"
                value={formData.lorryNumber}
                onChange={handleChange}
                required
              />
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <Label>Gross Weight *</Label>
              <Input
                type="number"
                step="0.01"
                name="grossWeight"
                value={formData.grossWeight}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Tare Weight *</Label>
              <Input
                type="number"
                step="0.01"
                name="tareWeight"
                value={formData.tareWeight}
                onChange={handleChange}
                required
              />
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <Label>Net Weight</Label>
              <Input
                type="number"
                step="0.01"
                name="netWeight"
                value={formData.netWeight}
                onChange={handleChange}
                readOnly
                disabled
              />
            </FormGroup>
          </FormRow>

          <ButtonRow>
            <CancelButton type="button" onClick={onClose}>
              Cancel
            </CancelButton>
            <SaveButton type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Arrival'}
            </SaveButton>
          </ButtonRow>
        </Form>
      </Modal>
    </Overlay>
  );
};

const Overlay = styled.div`
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

const Modal = styled.div`
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 2px solid #e0e0e0;

  h2 {
    margin: 0;
    color: #333;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 32px;
  cursor: pointer;
  color: #666;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;

  &:hover {
    color: #333;
  }
`;

const Form = styled.form`
  padding: 20px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
  font-size: 14px;
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #2196F3;
  }

  &:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
  background-color: white;

  &:focus {
    outline: none;
    border-color: #2196F3;
  }

  &:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid #e0e0e0;
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  background-color: #f5f5f5;
  color: #333;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #e0e0e0;
  }
`;

const SaveButton = styled.button`
  padding: 12px 24px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background-color: #45a049;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

export default EditArrivalModal;
