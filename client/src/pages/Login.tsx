import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';

const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
`;

const LoginCard = styled.div`
  background: white;
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 450px;
  animation: slideInUp 0.6s ease-out;
`;

const Logo = styled.h1`
  text-align: center;
  color: #667eea;
  margin-bottom: 0.5rem;
  font-size: 2rem;
`;

const Subtitle = styled.p`
  text-align: center;
  color: #6b7280;
  margin-bottom: 2rem;
  font-size: 0.95rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 0.875rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const Button = styled.button`
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const HelpText = styled.div`
  margin-top: 2rem;
  padding: 1rem;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #6b7280;
`;

const HelpTitle = styled.div`
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
`;

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>🏭 Mother India</Logo>
        <Subtitle>Stock Management System</Subtitle>
        
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Username</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
            />
          </FormGroup>

          <FormGroup>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
            />
          </FormGroup>

          <Button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </Form>

        <HelpText>
          <HelpTitle>Default Credentials:</HelpTitle>
          <div>Staff: <strong>staff</strong> / <strong>staff123</strong></div>
          <div>Manager: <strong>rohit</strong> / <strong>rohit456</strong></div>
          <div>Admin: <strong>ashish</strong> / <strong>ashish789</strong></div>
        </HelpText>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;