import { useState, useEffect } from 'react';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  touchDevice: boolean;
}

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 1920,
    screenHeight: 1080,
    orientation: 'landscape',
    touchDevice: false
  });

  useEffect(() => {
    const updateState = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const isMobile = screenWidth <= 767;
      const isTablet = screenWidth >= 768 && screenWidth <= 1023;
      const isDesktop = screenWidth >= 1024;
      const orientation: 'portrait' | 'landscape' = screenWidth > screenHeight ? 'landscape' : 'portrait';
      const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      setState({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth,
        screenHeight,
        orientation,
        touchDevice
      });
    };

    // Initial check
    updateState();

    // Listen for resize events
    window.addEventListener('resize', updateState);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateState, 100); // Delay to get accurate dimensions
    });

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, []);

  return state;
};

// Utility hook for breakpoint-specific values
export const useBreakpointValue = <T>(values: {
  mobile: T;
  tablet?: T;
  desktop: T;
}): T => {
  const { isMobile, isTablet } = useResponsive();
  
  if (isMobile) return values.mobile;
  if (isTablet && values.tablet) return values.tablet;
  return values.desktop;
};