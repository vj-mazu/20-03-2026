import React, { ReactNode } from 'react';
import styled from 'styled-components';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

const LayoutContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 1rem;
  width: 100%;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 0.5rem;
  }

  @media (max-width: 480px) {
    padding: 0.25rem;
  }
`;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <LayoutContainer>
      <Navbar />
      <MainContent>
        {children}
      </MainContent>
    </LayoutContainer>
  );
};

export default Layout;