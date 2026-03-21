import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';

const Container = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  margin-bottom: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
`;

const Title = styled.h2`
  color: #1f2937;
  font-size: 1.5rem;
  margin: 0;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
`;

const Th = styled.th`
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color: white;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  border: 1px solid #357abd;
  
  &:last-child {
    text-align: center;
    width: 150px;
  }
`;

const Td = styled.td`
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  
  &.indent {
    padding-left: 2rem;
    color: #6b7280;
  }
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  width: 100px;
  text-align: right;
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
  
  &.success {
    background: #10b981;
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

interface PaddyHamaliRate {
  id: number;
  workType: string;
  workDetail: string;
  rate: number;
  isPerLorry: boolean;
  hasMultipleOptions: boolean;
  parentWorkType: string | null;
  displayOrder: number;
}

interface Props {
  canEdit: boolean;
}

const PaddyHamaliRatesTable: React.FC<Props> = ({ canEdit }) => {
  const [rates, setRates] = useState<PaddyHamaliRate[]>([]);
  const [editedRates, setEditedRates] = useState<{ [key: number]: string }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const response = await axios.get<{ rates: PaddyHamaliRate[] }>('/paddy-hamali-rates');
      setRates(response.data.rates);
    } catch (error) {
      console.error('Error fetching paddy hamali rates:', error);
      toast.error('Failed to fetch hamali rates');
    }
  };

  const handleRateChange = (id: number, value: string) => {
    setEditedRates(prev => ({ ...prev, [id]: value }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    // Initialize edited rates with current values
    const initial: { [key: number]: string } = {};
    rates.forEach(rate => {
      initial[rate.id] = rate.rate.toString();
    });
    setEditedRates(initial);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedRates({});
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save all edited rates
      const promises = Object.entries(editedRates).map(([id, rate]) => {
        return axios.put(`/paddy-hamali-rates/${id}`, { rate: parseFloat(rate) });
      });
      
      await Promise.all(promises);
      
      toast.success('Hamali rates updated successfully');
      setIsEditing(false);
      setEditedRates({});
      fetchRates();
    } catch (error) {
      console.error('Error updating hamali rates:', error);
      toast.error('Failed to update hamali rates');
    } finally {
      setLoading(false);
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

  return (
    <Container>
      <Header>
        <Title>🌾 Paddy Hamali Rates</Title>
        {!isEditing && canEdit && (
          <Button className="primary" onClick={handleEdit}>
            Edit Rates
          </Button>
        )}
        {isEditing && (
          <ButtonGroup>
            <Button className="secondary" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button className="success" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </ButtonGroup>
        )}
      </Header>

      <Table>
        <thead>
          <tr>
            <Th>Paddy Work</Th>
            <Th>Details / bag</Th>
            <Th>Rate</Th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedRates).map(([workType, workRates]) => (
            <React.Fragment key={workType}>
              {workRates.map((rate, index) => (
                <tr key={rate.id}>
                  <Td>{index === 0 ? rate.workType : ''}</Td>
                  <Td className={rate.parentWorkType ? 'indent' : ''}>
                    {rate.workDetail}
                  </Td>
                  <Td style={{ textAlign: 'center' }}>
                    <Input
                      type="number"
                      step="0.01"
                      value={isEditing ? (editedRates[rate.id] || rate.rate) : rate.rate}
                      onChange={(e) => handleRateChange(rate.id, e.target.value)}
                      disabled={!isEditing}
                    />
                  </Td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </Table>

      {!canEdit && (
        <p style={{ marginTop: '1rem', color: '#6b7280', textAlign: 'center' }}>
          Only Admins can edit hamali rates
        </p>
      )}
    </Container>
  );
};

export default PaddyHamaliRatesTable;
