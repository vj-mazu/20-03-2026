import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';

// Slide in animation from right
const slideIn = keyframes`
  from {
    transform: translateX(120%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

// Fade out animation
const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(120%);
  }
`;

// Container that STAYS FIXED at top-right corner
// Always visible even when user scrolls - no need to scroll up to see notifications
const NotificationContainer = styled.div`
  position: fixed !important;
  top: 20px !important;
  right: 20px !important;
  z-index: 999999 !important;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
  max-width: 420px;
  min-width: 320px;

  @media (max-width: 768px) {
    right: 16px !important;
    top: 16px !important;
    max-width: calc(100vw - 32px);
    min-width: 280px;
  }
`;

// Helper function to get gradient background
const getGradient = (type: 'success' | 'error' | 'warning' | 'info'): string => {
  switch (type) {
    case 'success':
      return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    case 'error':
      return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    case 'warning':
      return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    case 'info':
      return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    default:
      return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
  }
};

// Individual notification card with gradient background
const NotificationCard = styled.div<{ $type: 'success' | 'error' | 'warning' | 'info'; $isClosing: boolean }>`
  background: ${props => getGradient(props.$type)};
  border-radius: 12px;
  padding: 18px 22px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  pointer-events: auto;
  cursor: pointer;
  animation: ${props => props.$isClosing ? fadeOut : slideIn} 0.3s ease-out;
  position: relative;
  min-height: 60px;
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;

  &:hover {
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
    transition: all 0.2s ease;
  }
`;

const IconWrapper = styled.div<{ $type: 'success' | 'error' | 'warning' | 'info' }>`
  font-size: 24px;
  font-weight: bold;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: white;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
`;

const MessageText = styled.div<{ $type: 'success' | 'error' | 'warning' | 'info' }>`
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.6;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  word-wrap: break-word;
  white-space: pre-wrap;
  padding-right: 24px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
`;

const ProgressBar = styled.div<{ $type: 'success' | 'error' | 'warning' | 'info'; $duration: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 0 0 0 12px;
  animation: shrink ${props => props.$duration}ms linear;

  @keyframes shrink {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
`;

export interface NotificationProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ id, message, type, duration = 4000, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, isPaused]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match animation duration
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };

  return (
    <NotificationCard
      $type={type}
      $isClosing={isClosing}
      onClick={handleClose}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <IconWrapper $type={type}>{getIcon()}</IconWrapper>
      <MessageText $type={type}>{message}</MessageText>
      <CloseButton onClick={(e) => { e.stopPropagation(); handleClose(); }}>
        ×
      </CloseButton>
      {!isPaused && <ProgressBar $type={type} $duration={duration} />}
    </NotificationCard>
  );
};

interface NotificationManagerProps {
  notifications: NotificationProps[];
  onClose: (id: string) => void;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({ notifications, onClose }) => {
  useEffect(() => {
    // When a new notification appears, scroll to top smoothly
    if (notifications.length > 0) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [notifications.length]);

  if (notifications.length === 0) return null;

  return (
    <NotificationContainer>
      {notifications.map((notification) => (
        <Notification key={notification.id} {...notification} onClose={onClose} />
      ))}
    </NotificationContainer>
  );
};

export default Notification;
