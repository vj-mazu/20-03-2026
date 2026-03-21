import React from 'react';
import styled from 'styled-components';

interface StatusIndicatorProps {
    status: 'saved' | 'pending' | 'error' | 'editing';
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
    className?: string;
}

const StatusContainer = styled.div<{ size: string }>`
    display: inline-flex;
    align-items: center;
    gap: ${props => props.size === 'small' ? '0.25rem' : props.size === 'large' ? '0.75rem' : '0.5rem'};
    font-size: ${props => props.size === 'small' ? '0.75rem' : props.size === 'large' ? '1rem' : '0.875rem'};
    font-weight: 600;
`;

const StatusDot = styled.div<{ status: string; size: string }>`
    width: ${props => props.size === 'small' ? '8px' : props.size === 'large' ? '16px' : '12px'};
    height: ${props => props.size === 'small' ? '8px' : props.size === 'large' ? '16px' : '12px'};
    border-radius: 50%;
    background-color: ${props => {
        switch (props.status) {
            case 'saved':
                return '#10b981'; // Green
            case 'pending':
                return '#f59e0b'; // Orange
            case 'error':
                return '#ef4444'; // Red
            case 'editing':
                return '#3b82f6'; // Blue
            default:
                return '#9ca3af'; // Gray
        }
    }};
    box-shadow: 0 0 ${props => props.size === 'small' ? '4px' : props.size === 'large' ? '8px' : '6px'} ${props => {
        switch (props.status) {
            case 'saved':
                return 'rgba(16, 185, 129, 0.4)';
            case 'pending':
                return 'rgba(245, 158, 11, 0.4)';
            case 'error':
                return 'rgba(239, 68, 68, 0.4)';
            case 'editing':
                return 'rgba(59, 130, 246, 0.4)';
            default:
                return 'rgba(156, 163, 175, 0.4)';
        }
    }};
    animation: ${props => props.status === 'editing' ? 'pulse 2s infinite' : 'none'};

    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }
`;

const StatusLabel = styled.span<{ status: string }>`
    color: ${props => {
        switch (props.status) {
            case 'saved':
                return '#059669';
            case 'pending':
                return '#d97706';
            case 'error':
                return '#dc2626';
            case 'editing':
                return '#2563eb';
            default:
                return '#6b7280';
        }
    }};
    text-transform: capitalize;
`;

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    status,
    size = 'medium',
    showLabel = true,
    className
}) => {
    const getStatusLabel = () => {
        switch (status) {
            case 'saved':
                return '✓ Saved';
            case 'pending':
                return '⏳ Pending';
            case 'error':
                return '✗ Error';
            case 'editing':
                return '✎ Editing';
            default:
                return status;
        }
    };

    return (
        <StatusContainer size={size} className={className}>
            <StatusDot status={status} size={size} />
            {showLabel && <StatusLabel status={status}>{getStatusLabel()}</StatusLabel>}
        </StatusContainer>
    );
};

export default StatusIndicator;