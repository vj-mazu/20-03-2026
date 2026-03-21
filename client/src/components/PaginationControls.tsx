import React from 'react';
import styled from 'styled-components';

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  margin-top: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const PageButton = styled.button<{ active?: boolean }>`
  padding: 0.5rem 1rem;
  border: 2px solid ${props => props.active ? '#667eea' : '#e5e7eb'};
  border-radius: 8px;
  background: ${props => props.active ? '#667eea' : 'white'};
  color: ${props => props.active ? 'white' : '#374151'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.active ? '#5a6fd6' : '#f3f4f6'};
    border-color: #667eea;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 500;
`;

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    totalRecords?: number;
    recordsPerPage?: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
    currentPage,
    totalPages,
    totalRecords,
    recordsPerPage = 250,
    onPageChange,
    loading = false
}) => {
    if (totalPages <= 1) return null;

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    // Calculate record range
    const startRecord = (currentPage - 1) * recordsPerPage + 1;
    const endRecord = Math.min(currentPage * recordsPerPage, totalRecords || currentPage * recordsPerPage);

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <PaginationContainer>
            <PageButton
                onClick={handlePrevious}
                disabled={currentPage <= 1 || loading}
            >
                ← Previous
            </PageButton>

            {getPageNumbers().map((pageNum, index) => (
                typeof pageNum === 'number' ? (
                    <PageButton
                        key={index}
                        active={pageNum === currentPage}
                        onClick={() => onPageChange(pageNum)}
                        disabled={loading}
                    >
                        {pageNum}
                    </PageButton>
                ) : (
                    <span key={index} style={{ color: '#9ca3af' }}>...</span>
                )
            ))}

            <PageButton
                onClick={handleNext}
                disabled={currentPage >= totalPages || loading}
            >
                Next →
            </PageButton>

            {totalRecords && (
                <PageInfo>
                    Showing {startRecord.toLocaleString()}-{endRecord.toLocaleString()} of {totalRecords.toLocaleString()} records
                </PageInfo>
            )}
        </PaginationContainer>
    );
};

export default PaginationControls;
