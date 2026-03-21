import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const DashboardContainer = styled.div`
  animation: fadeIn 0.5s ease-in;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #ffffff;
  font-size: 2rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
`;

const Subtitle = styled.p`
  color: #6b7280;
  font-size: 1.1rem;
  text-align: center;
  margin-top: 1rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  transition: all 0.3s ease;
  border-left: 4px solid #10b981;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  }
`;

const StatLabel = styled.div`
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
`;

const StatValue = styled.div`
  color: #1f2937;
  font-size: 2rem;
  font-weight: 700;
`;

const QuickActions = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
`;

const SectionTitle = styled.h2`
  color: #1f2937;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const ActionButton = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  text-decoration: none;
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
  }
`;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayArrivals: 0,
    pendingApprovals: 0,
    totalStock: 0,
    activeWarehouses: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        
        // Fetch from new dashboard stats endpoint
        const response = await axios.get('/dashboard/stats');
        const data = response.data as any;
        
        if (data.success) {
          setStats({
            todayArrivals: data.stats.todayArrivals,
            pendingApprovals: data.stats.pendingApprovals,
            totalStock: data.stats.totalStock,
            activeWarehouses: data.stats.activeWarehouses
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Set to 0 if error
        setStats({
          todayArrivals: 0,
          pendingApprovals: 0,
          totalStock: 0,
          activeWarehouses: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchDashboardStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardContainer>
      <Header>
        <Title>Welcome back, {user?.username}!</Title>
        <Subtitle>Mother India Stock Management Dashboard</Subtitle>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatLabel>Today's Arrivals</StatLabel>
          <StatValue>{loading ? '...' : stats.todayArrivals}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Pending Approvals</StatLabel>
          <StatValue>{loading ? '...' : stats.pendingApprovals}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Total Stock (kg)</StatLabel>
          <StatValue>{loading ? '...' : stats.totalStock.toLocaleString()}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Active Warehouses</StatLabel>
          <StatValue>{loading ? '...' : stats.activeWarehouses}</StatValue>
        </StatCard>
      </StatsGrid>

      <QuickActions>
        <SectionTitle>Quick Actions</SectionTitle>
        <ActionGrid>
          <ActionButton href="/arrivals">
            📝 New Arrival Entry
          </ActionButton>
          <ActionButton href="/records">
            📊 View Records
          </ActionButton>
          {(user?.role === 'manager' || user?.role === 'admin') && (
            <ActionButton href="/locations">
              📍 Manage Locations
            </ActionButton>
          )}
        </ActionGrid>
      </QuickActions>
    </DashboardContainer>
  );
};

export default Dashboard;