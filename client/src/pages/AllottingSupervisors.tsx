import React, { useState } from 'react';
import AssigningSupervisor from './AssigningSupervisor';
import AllottedSupervisors from './AllottedSupervisors';

const AllottingSupervisors: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'allotted'>('pending');

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '600', color: '#333' }}>
        Allotting Supervisors
      </h2>

      {/* Sub-tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            border: 'none',
            borderBottom: activeTab === 'pending' ? '3px solid #4a90e2' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'pending' ? '#4a90e2' : '#666',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Pending Loading Lots
        </button>
        <button
          onClick={() => setActiveTab('allotted')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            border: 'none',
            borderBottom: activeTab === 'allotted' ? '3px solid #4a90e2' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'allotted' ? '#4a90e2' : '#666',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Assigned Loading Lots
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'pending' && <AssigningSupervisor />}
        {activeTab === 'allotted' && <AllottedSupervisors />}
      </div>
    </div>
  );
};

export default AllottingSupervisors;
