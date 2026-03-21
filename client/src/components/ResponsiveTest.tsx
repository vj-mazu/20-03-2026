import React from 'react';
import { useResponsive } from '../hooks/useResponsive';
import { ResponsiveWrapper, MobileOnly, TabletOnly, DesktopOnly, ResponsiveGridComponent } from './ResponsiveWrapper';

const ResponsiveTest: React.FC = () => {
  const responsive = useResponsive();

  return (
    <ResponsiveWrapper>
      <div style={{ 
        background: '#f8fafc', 
        padding: '20px', 
        borderRadius: '12px', 
        marginBottom: '20px',
        border: '2px solid #e5e7eb'
      }}>
        <h2>📱💻 Responsive Design Test</h2>
        
        <div style={{ 
          background: '#dbeafe', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '2px solid #3b82f6'
        }}>
          <h3>Current Device Info:</h3>
          <p><strong>Screen Size:</strong> {responsive.screenWidth} x {responsive.screenHeight}</p>
          <p><strong>Device Type:</strong> {responsive.isMobile ? '📱 Mobile' : responsive.isTablet ? '📟 Tablet' : '💻 Desktop'}</p>
          <p><strong>Orientation:</strong> {responsive.orientation}</p>
          <p><strong>Touch Support:</strong> {responsive.touchDevice ? 'Yes' : 'No'}</p>
        </div>

        <MobileOnly>
          <div style={{ 
            background: '#fef3c7', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            border: '2px solid #f59e0b'
          }}>
            <h3>📱 Mobile View</h3>
            <p>This content only shows on mobile devices (≤767px)</p>
            <ul>
              <li>Single column layout</li>
              <li>Larger touch targets</li>
              <li>Simplified navigation</li>
              <li>Horizontal scroll tables</li>
            </ul>
          </div>
        </MobileOnly>

        <TabletOnly>
          <div style={{ 
            background: '#dbeafe', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            border: '2px solid #3b82f6'
          }}>
            <h3>📟 Tablet View</h3>
            <p>This content only shows on tablet devices (768px-1023px)</p>
            <ul>
              <li>Two column layout</li>
              <li>Medium-sized elements</li>
              <li>Hybrid touch/mouse support</li>
            </ul>
          </div>
        </TabletOnly>

        <DesktopOnly>
          <div style={{ 
            background: '#d1fae5', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            border: '2px solid #10b981'
          }}>
            <h3>💻 Desktop View</h3>
            <p>This content only shows on desktop devices (≥1024px)</p>
            <ul>
              <li>Multi-column layout</li>
              <li>Full-featured interface</li>
              <li>Hover effects</li>
              <li>Keyboard shortcuts</li>
            </ul>
          </div>
        </DesktopOnly>

        <h3>Responsive Grid Test</h3>
        <ResponsiveGridComponent 
          columns={{ mobile: 1, tablet: 2, desktop: 3 }}
          gap={{ mobile: '16px', tablet: '24px', desktop: '32px' }}
        >
          <div style={{ 
            background: '#f3f4f6', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <h4>Card 1</h4>
            <p>Responsive grid adapts to screen size</p>
          </div>
          <div style={{ 
            background: '#f3f4f6', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <h4>Card 2</h4>
            <p>Mobile: 1 column<br/>Tablet: 2 columns<br/>Desktop: 3 columns</p>
          </div>
          <div style={{ 
            background: '#f3f4f6', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <h4>Card 3</h4>
            <p>Spacing adjusts automatically</p>
          </div>
        </ResponsiveGridComponent>

        <h3>Responsive Table Test</h3>
        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: responsive.isMobile ? '12px' : '14px'
          }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: responsive.isMobile ? '8px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>Date</th>
                <th style={{ padding: responsive.isMobile ? '8px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>Type</th>
                <th style={{ padding: responsive.isMobile ? '8px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>Broker</th>
                <th style={{ 
                  padding: responsive.isMobile ? '8px 4px' : '12px 16px', 
                  border: '1px solid #e5e7eb',
                  display: responsive.isMobile ? 'none' : 'table-cell'
                }}>Variety</th>
                <th style={{ padding: responsive.isMobile ? '8px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>Bags</th>
                <th style={{ 
                  padding: responsive.isMobile ? '8px 4px' : '12px 16px', 
                  border: '1px solid #e5e7eb',
                  display: responsive.isMobile ? 'none' : 'table-cell'
                }}>Weight</th>
                <th style={{ padding: responsive.isMobile ? '8px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: responsive.isMobile ? '6px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>20-11-2025</td>
                <td style={{ padding: responsive.isMobile ? '6px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>Purchase</td>
                <td style={{ padding: responsive.isMobile ? '6px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>John Doe</td>
                <td style={{ 
                  padding: responsive.isMobile ? '6px 4px' : '12px 16px', 
                  border: '1px solid #e5e7eb',
                  display: responsive.isMobile ? 'none' : 'table-cell'
                }}>Basmati</td>
                <td style={{ padding: responsive.isMobile ? '6px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>100</td>
                <td style={{ 
                  padding: responsive.isMobile ? '6px 4px' : '12px 16px', 
                  border: '1px solid #e5e7eb',
                  display: responsive.isMobile ? 'none' : 'table-cell'
                }}>2500kg</td>
                <td style={{ padding: responsive.isMobile ? '6px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>
                  <span style={{ 
                    background: '#d1fae5', 
                    color: '#065f46', 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    Approved
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ padding: responsive.isMobile ? '6px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>19-11-2025</td>
                <td style={{ padding: responsive.isMobile ? '6px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>Shifting</td>
                <td style={{ padding: responsive.isMobile ? '6px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>Jane Smith</td>
                <td style={{ 
                  padding: responsive.isMobile ? '6px 4px' : '12px 16px', 
                  border: '1px solid #e5e7eb',
                  display: responsive.isMobile ? 'none' : 'table-cell'
                }}>Sona</td>
                <td style={{ padding: responsive.isMobile ? '6px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>75</td>
                <td style={{ 
                  padding: responsive.isMobile ? '6px 4px' : '12px 16px', 
                  border: '1px solid #e5e7eb',
                  display: responsive.isMobile ? 'none' : 'table-cell'
                }}>1875kg</td>
                <td style={{ padding: responsive.isMobile ? '6px 4px' : '12px 16px', border: '1px solid #e5e7eb' }}>
                  <span style={{ 
                    background: '#fef3c7', 
                    color: '#92400e', 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    Pending
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Responsive Button Test</h3>
        <div style={{ 
          display: 'flex', 
          flexDirection: responsive.isMobile ? 'column' : 'row',
          gap: responsive.isMobile ? '8px' : '12px',
          marginTop: '16px'
        }}>
          <button style={{
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            padding: responsive.isMobile ? '16px' : '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: responsive.isMobile ? '16px' : '14px',
            width: responsive.isMobile ? '100%' : 'auto',
            minHeight: responsive.touchDevice ? '44px' : 'auto'
          }}>
            Primary Action
          </button>
          <button style={{
            background: '#6b7280',
            color: 'white',
            border: 'none',
            padding: responsive.isMobile ? '16px' : '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: responsive.isMobile ? '16px' : '14px',
            width: responsive.isMobile ? '100%' : 'auto',
            minHeight: responsive.touchDevice ? '44px' : 'auto'
          }}>
            Secondary Action
          </button>
          <button style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: responsive.isMobile ? '16px' : '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: responsive.isMobile ? '16px' : '14px',
            width: responsive.isMobile ? '100%' : 'auto',
            minHeight: responsive.touchDevice ? '44px' : 'auto'
          }}>
            Success Action
          </button>
        </div>

        <div style={{ 
          marginTop: '24px', 
          padding: '16px', 
          background: '#f0fdf4', 
          borderRadius: '8px',
          border: '1px solid #10b981'
        }}>
          <h4>✅ Responsive Features Working:</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>✅ Device detection and adaptive layouts</li>
            <li>✅ Touch-friendly button sizes on mobile</li>
            <li>✅ Responsive grid system</li>
            <li>✅ Adaptive table layouts</li>
            <li>✅ Device-specific content rendering</li>
            <li>✅ Proper viewport scaling</li>
          </ul>
        </div>
      </div>
    </ResponsiveWrapper>
  );
};

export default ResponsiveTest;