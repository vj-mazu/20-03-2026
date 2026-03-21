import React, { useState, useEffect, useMemo } from 'react';
import LotSelection from './LotSelection';
import CookingReport from './CookingReport';
import FinalPassLots from './FinalPassLots';
import LoadingLots from './LoadingLots';
import CompletedLots from './CompletedLots';
import AdminSampleBook2 from './AdminSampleBook2';
import SampleEntryPage from './SampleEntry';
import { useAuth } from '../contexts/AuthContext';
type TabKey = 'paddy-samples' | 'staff-cooking-report' | 'pending-lots' | 'cooking-report' | 'lots-passed' | 'loading-lots' | 'completed-lots' | 'sample-book-2';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: string;
  color: string;
}

const baseTabs: TabConfig[] = [
  { key: 'paddy-samples', label: 'Paddy Sample Records', icon: '🌾', color: '#2e7d32' },
  { key: 'sample-book-2', label: 'Paddy Sample Book', icon: '📗', color: '#1565c0' },
  { key: 'pending-lots', label: 'Pending (Sample Selection)', icon: '📋', color: '#3498db' },
  { key: 'cooking-report', label: 'Cooking Book', icon: '🍚', color: '#e67e22' },
  { key: 'lots-passed', label: 'Final Pass Lots', icon: '✅', color: '#27ae60' },
  { key: 'loading-lots', label: 'Loading Lots', icon: '🚚', color: '#f39c12' },
  { key: 'completed-lots', label: 'Completed Lots', icon: '📦', color: '#e74c3c' },
];

const OwnerSampleReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('paddy-samples');
  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const tabs = useMemo<TabConfig[]>(() => {
    if (!isManager) {
      return baseTabs;
    }
    const staffTab: TabConfig = { key: 'staff-cooking-report', label: 'Staff Cooking Book', icon: '\u{1F373}', color: '#ef6c00' };
    const insertionIndex = baseTabs.findIndex((tab) => tab.key === 'pending-lots');
    if (insertionIndex === -1) {
      return [...baseTabs, staffTab];
    }
    return [
      ...baseTabs.slice(0, insertionIndex + 1),
      staffTab,
      ...baseTabs.slice(insertionIndex + 1)
    ];
  }, [isManager]);

  useEffect(() => {
    document.title = 'Sample Reports - Kushi Agro Foods';
  }, []);

  return (
    <div style={{
      padding: '0',
      backgroundColor: '#f0f2f5',
      minHeight: '100vh',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '16px 20px',
        color: 'white',
        marginBottom: '0'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: '700',
          letterSpacing: '0.5px'
        }}>
          📊 PADDY SAMPLE RECORDS
        </h2>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0',
        backgroundColor: 'white',
        borderBottom: '2px solid #e0e0e0',
        overflowX: 'visible',
        padding: '0 8px',
        whiteSpace: 'normal',
        flexWrap: 'wrap',
        rowGap: '4px'
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '500',
                border: 'none',
                borderBottom: isActive ? `3px solid ${tab.color}` : '3px solid transparent',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: isActive ? tab.color : '#666',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{
        padding: '16px 0',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {activeTab === 'paddy-samples' && <SampleEntryPage excludeEntryType="RICE_SAMPLE" showGps={true} />}
        {activeTab === 'staff-cooking-report' && <CookingReport excludeEntryType="RICE_SAMPLE" forceStaffMode />}
        {activeTab === 'pending-lots' && <LotSelection excludeEntryType="RICE_SAMPLE" />}
        {activeTab === 'cooking-report' && <CookingReport excludeEntryType="RICE_SAMPLE" />}
        {activeTab === 'lots-passed' && <FinalPassLots excludeEntryType="RICE_SAMPLE" />}
        {activeTab === 'loading-lots' && <LoadingLots excludeEntryType="RICE_SAMPLE" />}
        {activeTab === 'completed-lots' && <CompletedLots excludeEntryType="RICE_SAMPLE" />}
        {activeTab === 'sample-book-2' && <AdminSampleBook2 excludeEntryType="RICE_SAMPLE" />}
      </div>
    </div>
  );
};

export default OwnerSampleReports;
