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

const Title = styled.h2`
  color: #1f2937;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
`;

const Th = styled.th`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #059669;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  color: #374151;
`;

const WorkTypeHeader = styled.tr`
  background: #f8fafc;
  
  td {
    font-weight: 700;
    color: #1f2937;
    background: #f1f5f9;
    border-top: 2px solid #e2e8f0;
  }
`;

const RateCell = styled(Td)`
  text-align: center;
  font-weight: 600;
  color: #059669;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: #6b7280;
`;

const ErrorContainer = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
`;

const AddButton = styled.button`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
`;

const FormContainer = styled.div`
  background: #f8fafc;
  border: 2px solid #10b981;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
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
  border-radius: 6px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 1rem;
  background: white;

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

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          &:hover { transform: translateY(-1px); }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover { background: #dc2626; }
        `;
      default:
        return `
          background: #6b7280;
          color: white;
          &:hover { background: #4b5563; }
        `;
    }
  }}
`;

interface RiceHamaliRate {
  id: number;
  work_type: string;
  work_detail: string;
  rate_18_21: number;
  rate_21_24: number;
  rate_24_27: number;
  is_active: boolean;
  display_order: number;
}

interface GroupedRates {
  [workType: string]: RiceHamaliRate[];
}

const RiceHamaliRatesTable: React.FC = () => {
  const [rates, setRates] = useState<GroupedRates>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRate, setEditingRate] = useState<RiceHamaliRate | null>(null);
  const [formData, setFormData] = useState({
    work_type: '',
    work_detail: '',
    rate_24_27: '',
    display_order: ''
  });

  const workTypes = [
    'Nitt/Shifting',
    'Loading',
    'Machine Loading',
    'Chaki',
    'Rashi',
    'Palti',
    'Stiching',
    'Bag filling 50 Kg without Kata',
    'Bag filling 30 Kg without Kata',
    'Bag filling 25 Kg without Kata',
    'Bag filling 100 Kg without Kata',
    'Only Kata/Re Kata',
    'Kata 75 kg Packing with stiching',
    'Kata 50 kg Packing with stiching',
    'Kata 30 Kg',
    'Kata 25/26 Kg',
    'Kata 10 Kg with 50 Kg bag packing',
    'Polish Kata 50/55 Kg with stich',
    'Frem kata with Nitt from rashi'
  ];

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      console.log('Fetching rice hamali rates...');
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await axios.get<{ success: boolean; data: { rates: GroupedRates } }>(`/rice-hamali-rates?t=${timestamp}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      console.log('Rice hamali rates response:', response.data);
      
      if (response.data.success && response.data.data && response.data.data.rates) {
        setRates(response.data.data.rates);
        console.log('Rice hamali rates loaded successfully:', Object.keys(response.data.data.rates).length, 'work types');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error('Error fetching rice hamali rates:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to fetch rice hamali rates';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
        // Redirect to login
        window.location.href = '/login';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      setRates({});
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to perform this action');
        return;
      }

      const data = {
        ...formData,
        rate_18_21: 0, // Always 0
        rate_21_24: 0, // Always 0
        rate_24_27: parseFloat(formData.rate_24_27) || 0,
        display_order: parseInt(formData.display_order) || 0,
        is_active: true // Always set to true for new/updated rates
      };

      console.log('Submitting rice hamali rate:', data);

      if (editingRate) {
        console.log('Updating rate with ID:', editingRate.id);
        const response = await axios.put(`/rice-hamali-rates/${editingRate.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Update response:', response.data);
        toast.success('Rice hamali rate updated successfully');
      } else {
        console.log('Creating new rate');
        const response = await axios.post('/rice-hamali-rates', data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Create response:', response.data);
        toast.success('Rice hamali rate added successfully');
      }

      // Reset form first
      resetForm();
      
      // Wait a moment for database to commit, then refresh
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchRates();
    } catch (error: any) {
      console.error('Error saving rice hamali rate:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to save rice hamali rate';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
        // Redirect to login
        window.location.href = '/login';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleEdit = (rate: RiceHamaliRate) => {
    setEditingRate(rate);
    setFormData({
      work_type: rate.work_type,
      work_detail: rate.work_detail,
      rate_24_27: rate.rate_24_27 ? Number(rate.rate_24_27).toString() : '0',
      display_order: rate.display_order ? rate.display_order.toString() : '0'
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this rice hamali rate?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to perform this action');
        return;
      }

      await axios.delete(`/rice-hamali-rates/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Rice hamali rate deleted successfully');
      fetchRates();
    } catch (error: any) {
      console.error('Error deleting rice hamali rate:', error);
      
      let errorMessage = 'Failed to delete rice hamali rate';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
        window.location.href = '/login';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      work_type: '',
      work_detail: '',
      rate_24_27: '',
      display_order: ''
    });
    setEditingRate(null);
    setShowAddForm(false);
  };

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <div>Loading rice hamali rates...</div>
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorContainer>{error}</ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Title>
        🌾 Rice Hamali Rates & Types
      </Title>

      <AddButton onClick={() => setShowAddForm(!showAddForm)}>
        {showAddForm ? '✕ Cancel' : '+ Add New Rate'}
      </AddButton>

      {showAddForm && (
        <FormContainer>
          <h3>{editingRate ? 'Edit Rice Hamali Rate' : 'Add New Rice Hamali Rate'}</h3>
          <form onSubmit={handleSubmit}>
            <FormGrid>
              <FormGroup>
                <Label>Work Type</Label>
                <Select
                  value={formData.work_type}
                  onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                  required
                >
                  <option value="">Select Work Type</option>
                  {workTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>Work Detail</Label>
                <Input
                  type="text"
                  value={formData.work_detail}
                  onChange={(e) => setFormData({ ...formData, work_detail: e.target.value })}
                  placeholder="e.g., 50 Kg, Above 10 Kg"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label>Rate (Above 24 feet)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.rate_24_27}
                  onChange={(e) => setFormData({ ...formData, rate_24_27: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                  placeholder="0"
                />
              </FormGroup>
            </FormGrid>

            <ButtonGroup>
              <Button type="button" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {editingRate ? 'Update Rate' : 'Add Rate'}
              </Button>
            </ButtonGroup>
          </form>
        </FormContainer>
      )}

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <Th>S.No</Th>
              <Th>Work</Th>
              <Th>Details</Th>
              <Th>Rate (Above 24 feet)</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(rates).map(([workType, workRates]) => (
              <React.Fragment key={workType}>
                <WorkTypeHeader>
                  <td colSpan={5}>
                    <strong>{workType}</strong>
                  </td>
                </WorkTypeHeader>
                {workRates.map((rate, index) => (
                  <tr key={rate.id}>
                    <Td>{rate.display_order || index + 1}</Td>
                    <Td>{rate.work_type}</Td>
                    <Td>{rate.work_detail}</Td>
                    <RateCell>{rate.rate_24_27 ? Number(rate.rate_24_27).toFixed(2) : '0.00'}</RateCell>
                    <Td>
                      <ButtonGroup>
                        <Button 
                          type="button" 
                          onClick={() => handleEdit(rate)}
                          style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                        >
                          Edit
                        </Button>
                        <Button 
                          type="button" 
                          variant="danger"
                          onClick={() => handleDelete(rate.id)}
                          style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                        >
                          Delete
                        </Button>
                      </ButtonGroup>
                    </Td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default RiceHamaliRatesTable;