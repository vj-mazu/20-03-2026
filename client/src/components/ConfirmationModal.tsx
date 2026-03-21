import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalCard = styled.div`
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: ${slideUp} 0.3s ease-out;
`;

const ModalHeader = styled.div<{ $type: 'approve' | 'reject' | 'confirm' }>`
  padding: 1.5rem;
  background: ${props => {
        if (props.$type === 'approve') return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        if (props.$type === 'reject') return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }};
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  color: #374151;

  p {
    margin: 0 0 1rem 0;
    font-size: 1.05rem;
    line-height: 1.5;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const ModalFooter = styled.div`
  padding: 1.25rem 1.5rem;
  background: #f9fafb;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  border-top: 1px solid #e5e7eb;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' | 'success' }>`
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.95rem;

  ${props => {
        switch (props.$variant) {
            case 'success':
                return `background: #10b981; color: white; &:hover { background: #059669; }`;
            case 'danger':
                return `background: #ef4444; color: white; &:hover { background: #dc2626; }`;
            case 'primary':
                return `background: #667eea; color: white; &:hover { background: #5a67d8; }`;
            default:
                return `background: #e5e7eb; color: #374151; &:hover { background: #d1d5db; }`;
        }
    }}
`;

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'approve' | 'reject' | 'confirm';
    showInput?: boolean;
    inputPlaceholder?: string;
    onConfirm: (data?: string) => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    type,
    showInput = false,
    inputPlaceholder = 'Enter reason...',
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}) => {
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (isOpen) {
            setInputValue('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getVariant = () => {
        if (type === 'approve') return 'success';
        if (type === 'reject') return 'danger';
        return 'primary';
    };

    const getIcon = () => {
        if (type === 'approve') return '✓';
        if (type === 'reject') return '✕';
        return 'ℹ';
    };

    return (
        <Overlay onClick={onCancel}>
            <ModalCard onClick={e => e.stopPropagation()}>
                <ModalHeader $type={type}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{getIcon()}</span>
                    <h3>{title}</h3>
                </ModalHeader>
                <ModalBody>
                    <p>{message}</p>
                    {showInput && (
                        <TextArea
                            placeholder={inputPlaceholder}
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            autoFocus
                        />
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button onClick={onCancel}>{cancelText}</Button>
                    <Button
                        $variant={getVariant()}
                        onClick={() => onConfirm(showInput ? inputValue : undefined)}
                    >
                        {confirmText}
                    </Button>
                </ModalFooter>
            </ModalCard>
        </Overlay>
    );
};

export default ConfirmationModal;
