import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

interface Option {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilteredOptions(
      options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <Container ref={containerRef}>
      <SelectBox
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        isOpen={isOpen}
      >
        <SelectedValue>
          {selectedOption ? selectedOption.label : placeholder}
        </SelectedValue>
        <Arrow isOpen={isOpen}>▼</Arrow>
      </SelectBox>

      {isOpen && (
        <Dropdown>
          <SearchInput
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
          <OptionsList>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <OptionItem
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  isSelected={option.value === value}
                >
                  {option.label}
                </OptionItem>
              ))
            ) : (
              <NoResults>No results found</NoResults>
            )}
          </OptionsList>
        </Dropdown>
      )}
    </Container>
  );
};

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const SelectBox = styled.div<{ disabled: boolean; isOpen: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 2px solid ${props => props.isOpen ? '#2196F3' : '#ddd'};
  border-radius: 4px;
  background-color: ${props => props.disabled ? '#f5f5f5' : 'white'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  min-height: 38px;

  &:hover {
    border-color: ${props => props.disabled ? '#ddd' : '#2196F3'};
  }
`;

const SelectedValue = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
`;

const Arrow = styled.span<{ isOpen: boolean }>`
  margin-left: 8px;
  font-size: 10px;
  transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.2s;
  color: #666;
`;

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 2px solid #2196F3;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 300px;
  display: flex;
  flex-direction: column;
`;

const SearchInput = styled.input`
  padding: 10px 12px;
  border: none;
  border-bottom: 2px solid #e0e0e0;
  outline: none;
  font-size: 14px;

  &:focus {
    border-bottom-color: #2196F3;
  }
`;

const OptionsList = styled.div`
  overflow-y: auto;
  max-height: 250px;
  
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const OptionItem = styled.div<{ isSelected: boolean }>`
  padding: 10px 12px;
  cursor: pointer;
  background-color: ${props => props.isSelected ? '#E3F2FD' : 'white'};
  transition: background-color 0.15s;

  &:hover {
    background-color: ${props => props.isSelected ? '#BBDEFB' : '#f5f5f5'};
  }
`;

const NoResults = styled.div`
  padding: 20px;
  text-align: center;
  color: #999;
  font-style: italic;
`;

export default SearchableSelect;
