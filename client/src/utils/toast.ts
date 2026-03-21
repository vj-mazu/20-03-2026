// Custom toast implementation to replace react-toastify
// This ensures notifications ALWAYS appear at top-right

let notificationCallback: {
  success: (message: string, options?: any) => void;
  error: (message: string, options?: any) => void;
  warning: (message: string, options?: any) => void;
  info: (message: string, options?: any) => void;
} | null = null;

export const setNotificationCallback = (callback: typeof notificationCallback) => {
  notificationCallback = callback;
};

export const toast = {
  success: (message: string, options?: any) => {
    if (notificationCallback) {
      const duration = options?.autoClose || 4000;
      notificationCallback.success(message, duration);
    } else {
      console.log('✅ SUCCESS:', message);
    }
  },
  error: (message: string, options?: any) => {
    if (notificationCallback) {
      const duration = options?.autoClose || 8000;
      notificationCallback.error(message, duration);
    } else {
      console.error('❌ ERROR:', message);
    }
  },
  warning: (message: string, options?: any) => {
    if (notificationCallback) {
      const duration = options?.autoClose || 4000;
      notificationCallback.warning(message, duration);
    } else {
      console.warn('⚠️ WARNING:', message);
    }
  },
  info: (message: string, options?: any) => {
    if (notificationCallback) {
      const duration = options?.autoClose || 4000;
      notificationCallback.info(message, duration);
    } else {
      console.info('ℹ️ INFO:', message);
    }
  }
};
