import React from 'react';
import styled from 'styled-components';
import { useResponsive } from '../hooks/useResponsive';

// Responsive container that adapts to screen size
const Container = styled.div<{ isMobile: boolean; isTablet: boolean }>`
  width: 100%;
  max-width: ${props => props.isMobile ? '100%' : props.isTablet ? '1200px' : '1400px'};
  margin: 0 auto;
  padding: ${props => props.isMobile ? '0 16px' : props.isTablet ? '0 24px' : '0 32px'};
  
  /* Ensure content doesn't overflow on mobile */
  overflow-x: hidden;
  
  /* Add bottom padding on mobile for bottom navigation */
  ${props => props.isMobile && `
    padding-bottom: 80px;
  `}
`;

// Responsive grid that adapts columns based on screen size
const ResponsiveGrid = styled.div<{ 
  columns?: { mobile: number; tablet: number; desktop: number };
  gap?: { mobile: string; tablet: string; desktop: string };
  isMobile: boolean;
  isTablet: boolean;
}>`
  display: grid;
  grid-template-columns: repeat(
    ${props => 
      props.isMobile 
        ? props.columns?.mobile || 1
        : props.isTablet 
        ? props.columns?.tablet || 2
        : props.columns?.desktop || 3
    }, 
    1fr
  );
  gap: ${props => 
    props.isMobile 
      ? props.gap?.mobile || '16px'
      : props.isTablet 
      ? props.gap?.tablet || '24px'
      : props.gap?.desktop || '32px'
  };
  
  /* Stack on mobile if needed */
  ${props => props.isMobile && `
    grid-template-columns: 1fr;
  `}
`;

// Responsive table wrapper
const ResponsiveTableWrapper = styled.div<{ isMobile: boolean }>`
  width: 100%;
  
  ${props => props.isMobile ? `
    /* Mobile: horizontal scroll */
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin: 0 -16px;
    padding: 0 16px;
    
    table {
      min-width: 600px;
      font-size: 12px;
    }
    
    th, td {
      padding: 6px 4px;
      font-size: 11px;
      white-space: nowrap;
    }
    
    .hide-mobile {
      display: none;
    }
  ` : `
    /* Desktop: normal table */
    overflow-x: visible;
    
    table {
      width: 100%;
      font-size: 14px;
    }
    
    th, td {
      padding: 12px 16px;
    }
  `}
`;

// Props interfaces
interface ResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: { mobile: number; tablet: number; desktop: number };
  gap?: { mobile: string; tablet: string; desktop: string };
  className?: string;
}

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

// Main responsive wrapper component
export const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({ 
  children, 
  className 
}) => {
  const { isMobile, isTablet } = useResponsive();
  
  return (
    <Container 
      isMobile={isMobile} 
      isTablet={isTablet} 
      className={className}
    >
      {children}
    </Container>
  );
};

// Responsive grid component
export const ResponsiveGridComponent: React.FC<ResponsiveGridProps> = ({ 
  children, 
  columns,
  gap,
  className 
}) => {
  const { isMobile, isTablet } = useResponsive();
  
  return (
    <ResponsiveGrid 
      columns={columns}
      gap={gap}
      isMobile={isMobile} 
      isTablet={isTablet} 
      className={className}
    >
      {children}
    </ResponsiveGrid>
  );
};

// Responsive table component
export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ 
  children, 
  className 
}) => {
  const { isMobile } = useResponsive();
  
  return (
    <ResponsiveTableWrapper 
      isMobile={isMobile} 
      className={className}
    >
      {children}
    </ResponsiveTableWrapper>
  );
};

// Mobile-specific components
export const MobileOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isMobile } = useResponsive();
  return isMobile ? <>{children}</> : null;
};

export const TabletOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isTablet } = useResponsive();
  return isTablet ? <>{children}</> : null;
};

export const DesktopOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDesktop } = useResponsive();
  return isDesktop ? <>{children}</> : null;
};

export const MobileAndTablet: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isMobile, isTablet } = useResponsive();
  return (isMobile || isTablet) ? <>{children}</> : null;
};

// Responsive text component
export const ResponsiveText = styled.span<{ isMobile: boolean; isTablet: boolean }>`
  font-size: ${props => 
    props.isMobile ? '14px' : props.isTablet ? '16px' : '16px'
  };
  line-height: 1.5;
`;

// Usage example component
export const ResponsiveExample: React.FC = () => {
  const responsive = useResponsive();
  
  return (
    <ResponsiveWrapper>
      <h1>Device Info</h1>
      <p>Screen: {responsive.screenWidth} x {responsive.screenHeight}</p>
      <p>Device: {responsive.isMobile ? 'Mobile' : responsive.isTablet ? 'Tablet' : 'Desktop'}</p>
      <p>Orientation: {responsive.orientation}</p>
      <p>Touch: {responsive.touchDevice ? 'Yes' : 'No'}</p>
      
      <MobileOnly>
        <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px' }}>
          📱 This only shows on mobile devices
        </div>
      </MobileOnly>
      
      <TabletOnly>
        <div style={{ background: '#dbeafe', padding: '16px', borderRadius: '8px' }}>
          📟 This only shows on tablets
        </div>
      </TabletOnly>
      
      <DesktopOnly>
        <div style={{ background: '#d1fae5', padding: '16px', borderRadius: '8px' }}>
          💻 This only shows on desktop
        </div>
      </DesktopOnly>
      
      <ResponsiveGridComponent 
        columns={{ mobile: 1, tablet: 2, desktop: 3 }}
        gap={{ mobile: '16px', tablet: '24px', desktop: '32px' }}
      >
        <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px' }}>
          Card 1
        </div>
        <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px' }}>
          Card 2
        </div>
        <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px' }}>
          Card 3
        </div>
      </ResponsiveGridComponent>
    </ResponsiveWrapper>
  );
};