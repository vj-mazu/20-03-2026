import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';

interface AddLooseBagsModalProps {
  kunchinintuId: number;
  kunchinintuCode: string;
  warehouseName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AddLooseBagsModal: React.FC<AddLooseBagsModalProps> = ({
  kunchinintuId,
  kunchinintuCode,
  warehouseName,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bags: ''
  });

  const [errors, setErrors] = useState({
    date: '',
    bags: ''
  });

  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {
      date: '',
      bags: ''
    };

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.bags) {
      newErrors.bags = 'Number of bags is required';
    } else if (parseInt(formData.bags) <= 0) {
      newErrors.bags = 'Bags must be a positive number';
    }

    setErrors(newErrors);
    return !newErrors.date && !newErrors.bags;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await axios.post('/arrivals/loose', {
        kunchinintuId,
        date: formData.date,
        bags: parseInt(formData.bags)
      });

      toast.success('Loose bags entry created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating loose bags entry:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create loose bags entry';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <h2>Add Loose Bags</h2>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </Header>

        <Form onSubmit={handleSubmit}>
          <InfoSection>
            <InfoRow>
              <InfoLabel>Kunchinittu:</InfoLabel>
              <InfoValue>{kunchinintuCode}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Warehouse:</InfoLabel>
              <InfoValue>{warehouseName}</InfoValue>
            </InfoRow>
          </InfoSection>

          <FormGroup>
            <Label>Date *</Label>
            <Input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
            {errors.date && <ErrorMessage>{errors.date}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label>Number of Bags *</Label>
            <Input
              type="number"
              name="bags"
              value={formData.bags}
              onChange={handleChange}
              placeholder="Enter number of loose bags"
              min="1"
              required
            />
            {errors.bags && <ErrorMessage>{errors.bags}</ErrorMessage>}
          </FormGroup>

          <ButtonRow>
            <CancelButton type="button" onClick={onClose}>
              Cancel
            </CancelButton>
            <SaveButton type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
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
  max-width: 500px;
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

const InfoSection = styled.div`
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
`;

const InfoRow = styled.div`
  display: flex;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.span`
  font-weight: 600;
  color: #666;
  min-width: 120px;
`;

const InfoValue = styled.span`
  color: #333;
  font-weight: 500;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
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

const ErrorMessage = styled.span`
  color: #f44336;
  font-size: 12px;
  margin-top: 4px;
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

export default AddLooseBagsModal;
