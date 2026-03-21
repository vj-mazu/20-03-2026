// UnifiedVarietyDropdown.tsx - New component for consistent variety selection
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  width: 100%;

  &:focus {
    outline: none;
    border-color: #dc2626;
  }
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
  display: block;
  margin-bottom: 0.5rem;
`;

interface UnifiedVarietyDropdownProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

const UnifiedVarietyDropdown: React.FC<UnifiedVarietyDropdownProps> = ({
  value,
  onChange,
  label = "Variety",
  placeholder = "-- Select Variety --",
  required = false
}) => {
  const [varieties, setVarieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVarieties = async () => {
      try {
        const response = await axios.get<{ varieties: any[] }>('/api/unified-varieties/unified-varieties');
        setVarieties(response.data.varieties || []);
      } catch (error) {
        console.error('Error fetching varieties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVarieties();
  }, []);

  return (
    <>
      {label && <Label>{label} {required && '*'}</Label>}
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={loading}
      >
        <option value="">{placeholder}</option>
        {varieties.map((variety) => (
          <option key={variety.variety} value={variety.variety}>
            {variety.variety}
          </option>
        ))}
      </Select>
    </>
  );
};

export default UnifiedVarietyDropdown;