import React, { createContext, useContext, useState, useCallback } from 'react';
import { NotificationManager, NotificationProps } from '../components/CustomNotification';

interface NotificationContextType {
  showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  const showNotification = useCallback((
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    duration: number = 4000
  ) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const newNotification: NotificationProps = {
      id,
      message,
      type,
      duration,
      onClose: (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    };

    setNotifications(prev => {
      // Limit to 5 notifications
      const updated = [...prev, newNotification];
      return updated.slice(-5);
    });
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showNotification(message, 'success', duration || 4000);
  }, [showNotification]);

  const error = useCallback((message: string, duration?: number) => {
    showNotification(message, 'error', duration || 6000); // Longer for errors
  }, [showNotification]);

  const warning = useCallback((message: string, duration?: number) => {
    showNotification(message, 'warning', duration || 5000);
  }, [showNotification]);

  const info = useCallback((message: string, duration?: number) => {
    showNotification(message, 'info', duration || 4000);
  }, [showNotification]);

  const handleClose = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, success, error, warning, info }}>
      {children}
      <NotificationManager notifications={notifications} onClose={handleClose} />
    </NotificationContext.Provider>
  );
};
