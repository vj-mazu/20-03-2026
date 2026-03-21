import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import SampleEntryLedger from './SampleEntryLedger';
import AllottingSupervisors from './AllottingSupervisors';
import InventoryEntry from './InventoryEntry';
import OwnerFinancialPage from './OwnerFinancialPage';
import ManagerFinancialPage from './ManagerFinancialPage';
import FinalReviewPage from './FinalReviewPage';

type WorkflowTab = 'ledger' | 'allot' | 'inventory' | 'owner-financial' | 'manager-financial' | 'final-review';

interface TabConfig {
    key: WorkflowTab;
    label: string;
    icon: string;
    roles: string[];
}

const TABS: TabConfig[] = [
    { key: 'ledger', label: 'Ledger', icon: '📊', roles: ['admin', 'manager'] },
    { key: 'allot', label: 'Allot Supervisor', icon: '👤', roles: ['admin', 'manager'] },
    { key: 'inventory', label: 'Inventory Entry', icon: '📦', roles: ['admin', 'inventory_staff'] },
    { key: 'owner-financial', label: 'Owner Financial', icon: '💰', roles: ['admin'] },
    { key: 'manager-financial', label: 'Manager Financial', icon: '📈', roles: ['admin', 'manager'] },
    { key: 'final-review', label: 'Final Review', icon: '✅', roles: ['admin', 'manager'] },
];

const PageContainer = styled.div`
  min-height: 100vh;
  background: #f3f4f6;
`;

const TabBar = styled.div`
  display: flex;
  gap: 0;
  background: white;
  border-bottom: 2px solid #e5e7eb;
  padding: 0 1rem;
  overflow-x: auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);

  &::-webkit-scrollbar {
    height: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1.25rem;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-bottom: 3px solid ${props => props.$active ? '#4a90e2' : 'transparent'};
  background: ${props => props.$active ? '#f0f7ff' : 'transparent'};
  color: ${props => props.$active ? '#1a56db' : '#6b7280'};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

const TabContent = styled.div`
  /* Remove min-height to let content flow naturally */
`;

const SampleWorkflow: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<WorkflowTab>('ledger');

    // Filter tabs based on user role
    const visibleTabs = TABS.filter(tab => user && tab.roles.includes(user.role));

    const renderTabContent = () => {
        switch (activeTab) {
            case 'ledger':
                return <SampleEntryLedger />;
            case 'allot':
                return <AllottingSupervisors />;
            case 'inventory':
                return <InventoryEntry />;
            case 'owner-financial':
                return <OwnerFinancialPage />;
            case 'manager-financial':
                return <ManagerFinancialPage />;
            case 'final-review':
                return <FinalReviewPage />;
            default:
                return <SampleEntryLedger />;
        }
    };

    return (
        <PageContainer>
            <TabBar>
                {visibleTabs.map(tab => (
                    <Tab
                        key={tab.key}
                        $active={activeTab === tab.key}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </Tab>
                ))}
            </TabBar>
            <TabContent>
                {renderTabContent()}
            </TabContent>
        </PageContainer>
    );
};

export default SampleWorkflow;
