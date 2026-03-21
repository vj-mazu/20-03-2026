import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const DetailsBox = styled.div`
  background: #f8fafc;
  padding: 2rem;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
`;

const Title = styled.h3`
  margin-bottom: 1.5rem;
  color: #1f2937;
  font-size: 1.2rem;
  text-align: center;
`;

const RateRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
  font-size: 1rem;
`;

const SubLabel = styled(Label)`
  font-weight: 500;
  color: #6b7280;
  font-size: 0.9rem;
  padding-left: 1.5rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  width: 150px;
  text-align: right;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const UnloadingGroup = styled.div`
  padding-left: 1rem;
  border-left: 3px solid #d1d5db;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
  justify-content: center;
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

  &.success {
    background: #10b981;
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

const Note = styled.p`
  margin-top: 1rem;
  color: #6b7280;
  font-size: 0.9rem;
  text-align: center;
`;

interface PaddyHamaliSectionProps {
  loadingRate: string;
  unloadingSadaRate: string;
  unloadingKnRate: string;
  looseTumbidduRate: string;
  editingHamaliRates: boolean;
  canEdit: boolean;
  onLoadingRateChange: (value: string) => void;
  onUnloadingSadaRateChange: (value: string) => void;
  onUnloadingKnRateChange: (value: string) => void;
  onLooseTumbidduRateChange: (value: string) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}

const PaddyHamaliSection: React.FC<PaddyHamaliSectionProps> = ({
  loadingRate,
  unloadingSadaRate,
  unloadingKnRate,
  looseTumbidduRate,
  editingHamaliRates,
  canEdit,
  onLoadingRateChange,
  onUnloadingSadaRateChange,
  onUnloadingKnRateChange,
  onLooseTumbidduRateChange,
  onEdit,
  onCancel,
  onSave
}) => {
  return (
    <Container>
      <DetailsBox>
        <Title>Details</Title>

        <RateRow>
          <Label>Loading Hamali</Label>
          <Input
            type="number"
            step="0.01"
            value={loadingRate}
            onChange={(e) => onLoadingRateChange(e.target.value)}
            placeholder="Rate"
            disabled={!editingHamaliRates || !canEdit}
          />
        </RateRow>

        <UnloadingGroup>
          <Label style={{ display: 'block', marginBottom: '1rem' }}>Unloading Hamali</Label>
          
          <RateRow>
            <SubLabel>Sada</SubLabel>
            <Input
              type="number"
              step="0.01"
              value={unloadingSadaRate}
              onChange={(e) => onUnloadingSadaRateChange(e.target.value)}
              placeholder="Rate"
              disabled={!editingHamaliRates || !canEdit}
            />
          </RateRow>

          <RateRow>
            <SubLabel>KN</SubLabel>
            <Input
              type="number"
              step="0.01"
              value={unloadingKnRate}
              onChange={(e) => onUnloadingKnRateChange(e.target.value)}
              placeholder="Rate"
              disabled={!editingHamaliRates || !canEdit}
            />
          </RateRow>
        </UnloadingGroup>

        <RateRow>
          <Label>Loose Tumbiddu</Label>
          <Input
            type="number"
            step="0.01"
            value={looseTumbidduRate}
            onChange={(e) => onLooseTumbidduRateChange(e.target.value)}
            placeholder="Rate"
            disabled={!editingHamaliRates || !canEdit}
          />
        </RateRow>

        {!editingHamaliRates && canEdit && (
          <ButtonGroup>
            <Button className="primary" onClick={onEdit}>
              Edit Rates
            </Button>
          </ButtonGroup>
        )}

        {editingHamaliRates && (
          <ButtonGroup>
            <Button className="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button className="success" onClick={onSave}>
              Save Rates
            </Button>
          </ButtonGroup>
        )}

        {!canEdit && (
          <Note>Only Managers and Admins can edit hamali rates</Note>
        )}
      </DetailsBox>
    </Container>
  );
};

export default PaddyHamaliSection;
