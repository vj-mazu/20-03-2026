import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  animation: fadeIn 0.5s ease-in;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  
  @keyframes blink {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const Title = styled.h1`
  color: #ffffff;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #ff0000 0%, #ff6600 100%); /* CHANGED TO RED/ORANGE */
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3); /* RED SHADOW */
  border: 5px solid #00ff00; /* BRIGHT GREEN BORDER TO FORCE CACHE REFRESH */
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
`;

const FilterSection = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
`;

const DateInput = styled.input`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

const SummaryCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 2px solid #e5e7eb;
`;

const SummaryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
`;

const SummaryTitle = styled.h2`
  color: #1f2937;
  margin: 0;
  font-size: 1.5rem;
`;

const DateDisplay = styled.div`
  color: #6b7280;
  font-size: 1.1rem;
  font-weight: 600;
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  color: #374151;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  font-weight: 700;
`;

const EntryRow = styled.div`
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0;
  align-items: baseline;
`;

const Amount = styled.div`
  font-weight: 700;
  color: #000;
  font-size: 1rem;
  min-width: 80px;
  text-align: right;
`;

const Details = styled.div`
  color: #000;
  font-size: 1rem;
  flex: 1;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #9ca3af;
  font-size: 1.1rem;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  font-size: 1.1rem;
`;

// Type interface for hamali summary
interface HamaliSummary {
  // Paddy hamali data
  loadingEntries?: any[];
  unloadingEntries?: any[];
  looseEntries?: any[];
  cuttingEntries?: any[];
  plottingEntries?: any[];
  shiftingEntries?: any[];
  fillingEntries?: any[];
  paddyTotal?: number;
  
  // Rice hamali data (backward compatibility)
  riceHamaliEntries?: any[];
  riceHamaliTotal?: number;
  
  // Categorized rice hamali data
  mainRiceHamaliEntries: any[];
  otherRiceHamaliEntries: any[];
  mainRiceHamaliTotal: number;
  otherRiceHamaliTotal: number;
  
  // Grouped rice hamali data (like paddy hamali)
  mainRiceHamaliGrouped?: any[];
  otherRiceHamaliGrouped?: any[];
  
  // Other hamali data
  otherHamaliEntries?: any;
  otherTotal?: number;
  
  // Overall totals
  grandTotal: number;
  totalEntries: number;
}

const HamaliBook: React.FC = () => {
  // CRITICAL DEBUG: This should appear in browser console immediately
  console.log('🚨 HAMALI BOOK COMPONENT LOADED - FIX VERSION 2025-12-23 🚨');
  console.log('🚨 IF YOU SEE THIS MESSAGE, THE COMPONENT IS UPDATED 🚨');
  console.log('🚨 TIMESTAMP:', new Date().toISOString(), '🚨');
  console.log('🚨 CACHE BUSTER:', Math.random(), '🚨');
  
  // Force immediate alert to user
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      console.log('🔥 RATE FIX IS ACTIVE - CHECK BATCH CALCULATIONS 🔥');
    }, 1000);
  }
  
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [summary, setSummary] = useState<HamaliSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, [selectedDate, user]);

  const fetchSummary = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const dateStr = selectedDate;

      console.log('🔍 HAMALI BOOK: Fetching for date:', dateStr);

      // Use the unified hamali-book endpoint
      const response = await axios.get(`/hamali-book`, { 
        params: { 
          dateFrom: dateStr, 
          dateTo: dateStr,
          _cacheBust: Date.now()
        },
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
        timeout: 15000
      });

      console.log('📥 HAMALI BOOK: API Response:', response.data);

      // Type assertion for the response data
      const apiResponse = response.data as {
        success: boolean;
        data: {
          paddyHamali: any[];
          riceHamali: any[];
          otherHamali: any[];
          riceHamaliCategorized?: {
            main: any[];
            other: any[];
            mainGrouped?: any[];
            otherGrouped?: any[];
          };
          summary: {
            paddyTotal: string;
            riceTotal: string;
            otherTotal: string;
            grandTotal: string;
            totalEntries: string;
          };
        };
      };

      if (apiResponse.success && apiResponse.data) {
        const { paddyHamali, riceHamali, otherHamali, summary, riceHamaliCategorized } = apiResponse.data;
        
        // Process paddy hamali
        const paddySummary = processPaddyHamaliData(paddyHamali);
        
        // Extract categorized rice hamali data
        let mainRiceHamali = riceHamaliCategorized?.main || [];
        let otherRiceHamali = riceHamaliCategorized?.other || [];
        let mainRiceHamaliGrouped = riceHamaliCategorized?.mainGrouped || [];
        let otherRiceHamaliGrouped = riceHamaliCategorized?.otherGrouped || [];
        
        // Fallback logic
        if ((mainRiceHamali.length === 0 && otherRiceHamali.length === 0) && riceHamali.length > 0) {
          mainRiceHamali = riceHamali;
          otherRiceHamali = [];
        }
        
        // Process entries
        const mainRiceHamaliEntries = mainRiceHamali.map((entry: any) => ({
          id: entry.id,
          date: entry.date,
          workType: entry.worktype || entry.workType,
          workDetail: entry.workdetail || entry.workDetail,
          bags: entry.bags,
          ratePerBag: parseFloat(entry.rateperbag || entry.ratePerBag || '0'),
          totalAmount: parseFloat(entry.totalamount || entry.totalAmount || '0'),
          workerName: entry.workername || entry.workerName,
          batchNumber: entry.batchnumber || entry.batchNumber,
          location: entry.location || 'Unknown Location',
          variety: entry.variety || 'Unknown Variety'
        }));
        
        const otherRiceHamaliEntries = otherRiceHamali.map((entry: any) => ({
          id: entry.id,
          date: entry.date,
          workType: entry.worktype || entry.workType,
          workDetail: entry.workdetail || entry.workDetail,
          bags: entry.bags,
          ratePerBag: parseFloat(entry.rateperbag || entry.ratePerBag || '0'),
          totalAmount: parseFloat(entry.totalamount || entry.totalAmount || '0'),
          workerName: entry.workername || entry.workerName,
          batchNumber: entry.batchnumber || entry.batchNumber,
          location: entry.location || 'Unknown Location',
          variety: entry.variety || 'Unknown Variety'
        }));
        
        // Process other hamali
        const otherHamaliSummary = processOtherHamaliData(otherHamali);

        // Calculate totals
        const mainRiceHamaliTotal = mainRiceHamaliEntries.reduce((sum: number, entry: any) => sum + entry.totalAmount, 0);
        const otherRiceHamaliTotal = otherRiceHamaliEntries.reduce((sum: number, entry: any) => sum + entry.totalAmount, 0);

        // Create combined summary
        const combinedSummary = {
          ...paddySummary,
          riceHamaliEntries: [...mainRiceHamaliEntries, ...otherRiceHamaliEntries],
          riceHamaliTotal: parseFloat(summary.riceTotal || '0'),
          mainRiceHamaliEntries: mainRiceHamaliEntries,
          otherRiceHamaliEntries: otherRiceHamaliEntries,
          mainRiceHamaliTotal: mainRiceHamaliTotal,
          otherRiceHamaliTotal: otherRiceHamaliTotal,
          mainRiceHamaliGrouped: mainRiceHamaliGrouped,
          otherRiceHamaliGrouped: otherRiceHamaliGrouped,
          otherHamaliEntries: otherHamaliSummary.entries || {},
          grandTotal: parseFloat(summary.grandTotal || '0'),
          totalEntries: parseInt(summary.totalEntries || '0'),
          paddyTotal: parseFloat(summary.paddyTotal || '0'),
          otherTotal: parseFloat(summary.otherTotal || '0')
        };

        setSummary(combinedSummary);
      } else {
        console.error('❌ HAMALI BOOK: Invalid API response');
        setSummary(null);
      }
      
    } catch (error) {
      console.error('❌ HAMALI BOOK: Fetch error:', error);
      toast.error('Failed to fetch hamali summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to process paddy hamali data
  const processPaddyHamaliData = (paddyHamali: any[]) => {
    const loadingEntries: any[] = [];
    const unloadingEntries: any[] = [];
    const looseEntries: any[] = [];
    const cuttingEntries: any[] = [];
    const plottingEntries: any[] = [];
    const shiftingEntries: any[] = [];
    const fillingEntries: any[] = [];

    // Group by arrival and work type
    const groupedEntries = paddyHamali.reduce((acc: any, entry: any) => {
      // Debug: Log the first few entries to see the data structure
      if (Object.keys(acc).length < 3) {
        console.log('🔍 DEBUG - Paddy hamali entry:', entry);
      }
      
      const key = `${entry.arrivalId || entry.arrivalid}-${entry.workType || entry.worktype}`;
      if (!acc[key]) {
        acc[key] = {
          arrivalId: entry.arrivalId || entry.arrivalid,
          arrivalNumber: entry.arrivalNumber || entry.arrivalnumber,
          workType: entry.workType || entry.worktype,
          workDetail: entry.workDetail || entry.workdetail,
          sourceDestination: entry.arrivalNumber || entry.arrivalnumber || 'N/A',
          totalBags: 0,
          totalAmount: 0,
          splits: []
        };
      }
      acc[key].totalBags += entry.bags || 0;
      acc[key].totalAmount += Number.parseFloat(entry.totalAmount || entry.totalamount || '0');
      
      // CRITICAL FIX: Try multiple field names for rate and ensure it's a number
      const rate = parseFloat(entry.ratePerBag || entry.rateperbag || entry.rate || 
                   (entry.totalAmount && entry.bags ? (Number.parseFloat(entry.totalAmount) / entry.bags) : 0));
      
      // Debug: Log rate calculation for first few entries
      if (Object.keys(acc).length < 3) {
        console.log('🔍 DEBUG - Paddy Hamali Rate calculation:', {
          ratePerBag: entry.ratePerBag,
          rateperbag: entry.rateperbag,
          rate: entry.rate,
          totalAmount: entry.totalAmount,
          bags: entry.bags,
          calculated: entry.totalAmount && entry.bags ? (Number.parseFloat(entry.totalAmount) / entry.bags) : 0,
          finalRate: rate,
          'PADDY_FIX_APPLIED': 'YES_DECEMBER_23_2025'
        });
      }
      
      acc[key].splits.push({
        batchNumber: entry.batchNumber || entry.batchnumber,
        workerName: entry.workerName || entry.workername,
        bags: entry.bags,
        rate: rate,
        amount: entry.totalAmount || entry.totalamount
      });
      return acc;
    }, {});

    // Categorize entries by work type
    Object.values(groupedEntries).forEach((entry: any) => {
      const workType = entry.workType?.toLowerCase();
      switch (workType) {
        case 'loading':
        case 'paddy loading':  // CRITICAL FIX: Add 'paddy loading'
          loadingEntries.push(entry);
          break;
        case 'unloading':
        case 'paddy unloading':  // CRITICAL FIX: Add 'paddy unloading'
          unloadingEntries.push(entry);
          break;
        case 'loose':
        case 'loose tumbiddu':
          looseEntries.push(entry);
          break;
        case 'cutting':
        case 'paddy cutting':  // CRITICAL FIX: Add 'paddy cutting'
          cuttingEntries.push(entry);
          break;
        case 'plotting':
        case 'paddy plotting':  // CRITICAL FIX: Add 'paddy plotting'
          plottingEntries.push(entry);
          break;
        case 'shifting':
        case 'paddy shifting':
          shiftingEntries.push(entry);
          break;
        case 'filling':
        case 'filling with stitching':
        case 'paddy filling with stitching':
          fillingEntries.push(entry);
          break;
      }
    });

    return {
      loadingEntries,
      unloadingEntries,
      looseEntries,
      cuttingEntries,
      plottingEntries,
      shiftingEntries,
      fillingEntries,
      totalEntries: paddyHamali.length
    };
  };

  // Helper function to process other hamali data
  const processOtherHamaliData = (otherHamali: any[]) => {
    const entries = otherHamali.reduce((acc: any, entry: any) => {
      const workName = entry.workname || 'Other Work';
      if (!acc[workName]) {
        acc[workName] = [];
      }
      acc[workName].push({
        id: entry.id,
        date: entry.date,
        workDetail: entry.work_detail,
        quantity: entry.quantity,
        rate: entry.rate,
        totalAmount: parseFloat(entry.totalamount || '0'),
        workerName: entry.workername
      });
      return acc;
    }, {});

    return { entries };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    });
  };

  const renderBatchCalculations = (splits: any[], borderColor: string, textColor: string) => {
    // Debug: Log the splits data to see what we're getting
    console.log('🔍 DEBUG - Batch splits data:', splits);
    
    return (
      <div style={{ 
        background: 'white',
        padding: '0.75rem',
        borderRadius: '6px',
        border: `2px solid ${borderColor}`,
        minWidth: '250px'
      }}>
        <div style={{ 
          fontSize: '0.75rem', 
          fontWeight: '600', 
          marginBottom: '0.5rem',
          textAlign: 'center',
          background: 'red',
          color: 'white',
          padding: '0.5rem',
          animation: 'blink 1s infinite'
        }}>
          🔥 RATE FIX APPLIED - BATCH CALCULATIONS - {new Date().toLocaleTimeString()} 🔥
        </div>
        {splits.map((split: any, splitIndex: number) => {
          // CRITICAL FIX: Enhanced field name mapping for rate with better fallback
          const rate = split.rate || split.ratePerBag || split.rateperbag || 
                       (split.amount && split.bags ? parseFloat(split.amount) / split.bags : 0);
          const bags = split.bags || 0;
          const batchNumber = split.batchNumber || split.batchnumber || (splitIndex + 1);
          const calculatedAmount = bags * parseFloat(rate.toString());
          
          console.log(`🔍 DEBUG - Split ${splitIndex + 1} DETAILED:`, {
            batchNumber: batchNumber,
            bags: bags,
            'split.rate': split.rate,
            'split.ratePerBag': split.ratePerBag,
            'split.rateperbag': split.rateperbag,
            'split.amount': split.amount,
            'calculated rate': rate,
            calculatedAmount: calculatedAmount,
            originalSplit: split,
            'FRONTEND_FIX_APPLIED': 'YES_DECEMBER_23_2025' // Verification marker
          });
          
          return (
            <div key={splitIndex} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.875rem',
              marginBottom: '0.25rem',
              padding: '0.25rem 0'
            }}>
              <span style={{ fontWeight: '600', color: '#1f2937' }}>
                Batch {batchNumber}:
              </span>
              <span style={{ fontWeight: '600', background: 'yellow', color: 'black', padding: '0.25rem' }}>
                🎯 {bags} bags × ₹{parseFloat(rate.toString()).toFixed(2)} = ₹{calculatedAmount.toFixed(0)} 🎯
              </span>
            </div>
          );
        })}
        <div style={{
          borderTop: `1px solid ${borderColor}40`,
          paddingTop: '0.5rem',
          marginTop: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: textColor,
          background: `${borderColor}10`,
          padding: '0.5rem',
          borderRadius: '4px'
        }}>
          <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem', textAlign: 'center' }}>
            BATCH TOTALS
          </div>
          {splits.map((split: any, idx: number) => {
            const rate = split.rate || split.ratePerBag || split.rateperbag || 
                         (split.amount && split.bags ? parseFloat(split.amount) / split.bags : 0);
            const bags = split.bags || 0;
            const batchNumber = split.batchNumber || split.batchnumber || (idx + 1);
            const calculatedAmount = bags * parseFloat(rate.toString());
            
            return (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Batch {batchNumber}:</span>
                <span>₹{calculatedAmount.toFixed(0)}</span>
              </div>
            );
          })}
          <div style={{ 
            borderTop: `2px solid ${borderColor}`, 
            paddingTop: '0.25rem',
            marginTop: '0.25rem',
            display: 'flex', 
            justifyContent: 'space-between',
            fontWeight: 'bold',
            fontSize: '0.875rem'
          }}>
            <span>Total:</span>
            <span>₹{splits.reduce((sum: number, s: any) => {
              const rate = s.rate || s.ratePerBag || s.rateperbag || 
                           (s.amount && s.bags ? parseFloat(s.amount) / s.bags : 0);
              const bags = s.bags || 0;
              return sum + (bags * parseFloat(rate.toString()));
            }, 0).toFixed(0)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Container>
      <Title>🔥 HAMALI BOOK SUMMARY - RATE FIX APPLIED 🔥 - v{Date.now()}</Title>

      <FilterSection>
        <Label>Select Date:</Label>
        <DateInput
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        {summary && summary.totalEntries > 0 && (
          <button
            onClick={() => window.print()}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            📄 Download PDF
          </button>
        )}
      </FilterSection>

      {loading ? (
        <LoadingState>⚡ Loading hamali summary...</LoadingState>
      ) : !summary || summary.totalEntries === 0 ? (
        <EmptyState>
          <p>No approved hamali entries found for {formatDate(selectedDate)}</p>
        </EmptyState>
      ) : (
        <SummaryCard>
          <SummaryHeader>
            <SummaryTitle>Hamali Book Summary</SummaryTitle>
            <DateDisplay>{formatDate(selectedDate)}</DateDisplay>
          </SummaryHeader>

          {/* Enhanced Hamali Features Summary */}
          {summary && (summary.mainRiceHamaliEntries.length > 0 || summary.otherRiceHamaliEntries.length > 0) && (
            <div style={{
              background: '#f0f9ff',
              border: '2px solid #0284c7',
              borderRadius: '8px',
              padding: '1rem',
              margin: '2rem 0 1rem 0',
              fontSize: '0.875rem',
              color: '#0c4a6e'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>🎉 Enhanced Hamali Features Active:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0284c7' }}>
                    {summary.mainRiceHamaliEntries.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#0c4a6e' }}>Main Rice Entries</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0284c7' }}>
                    ₹{summary.mainRiceHamaliTotal.toFixed(0)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#0c4a6e' }}>Main Rice Total</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#7c3aed' }}>
                    {summary.otherRiceHamaliEntries.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#0c4a6e' }}>Other Rice Entries</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#7c3aed' }}>
                    ₹{summary.otherRiceHamaliTotal.toFixed(0)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#0c4a6e' }}>Other Rice Total</div>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#059669' }}>
                ✅ Simplified batch system • ✅ Enhanced calculations • ✅ Rate filtering • ✅ Max 2 batches
              </div>
            </div>
          )}

          {/* Paddy Hamali Sections with Enhanced Batch Calculations */}
          {summary.loadingEntries && summary.loadingEntries.length > 0 && (
            <Section>
              <SectionTitle>Paddy Loading Hamali:</SectionTitle>
              {summary.loadingEntries.map((entry: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline', flex: 1 }}>
                    <Amount>₹{entry.totalAmount.toFixed(0)}</Amount>
                    <Details>
                      <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                        {entry.totalBags} Bags from {entry.sourceDestination}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {entry.workDetail}
                      </div>
                    </Details>
                  </div>
                  
                  {/* Enhanced Batch Calculations */}
                  {entry.splits && entry.splits.length > 0 && renderBatchCalculations(entry.splits, '#10b981', '#059669')}
                </div>
              ))}
            </Section>
          )}

          {summary.unloadingEntries && summary.unloadingEntries.length > 0 && (
            <Section>
              <SectionTitle>Paddy Unloading Hamali:</SectionTitle>
              {summary.unloadingEntries.map((entry: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline', flex: 1 }}>
                    <Amount>₹{entry.totalAmount.toFixed(0)}</Amount>
                    <Details>
                      <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                        {entry.totalBags} Bags from {entry.sourceDestination}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {entry.workDetail}
                      </div>
                    </Details>
                  </div>
                  
                  {/* Enhanced Batch Calculations */}
                  {entry.splits && entry.splits.length > 0 && renderBatchCalculations(entry.splits, '#10b981', '#059669')}
                </div>
              ))}
            </Section>
          )}

          {summary.looseEntries && summary.looseEntries.length > 0 && (
            <Section>
              <SectionTitle>Loose Tumbiddu:</SectionTitle>
              {summary.looseEntries.map((entry: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline', flex: 1 }}>
                    <Amount>₹{entry.totalAmount.toFixed(0)}</Amount>
                    <Details>
                      <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                        {entry.totalBags} Bags from {entry.sourceDestination}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {entry.workDetail}
                      </div>
                    </Details>
                  </div>
                  
                  {/* Enhanced Batch Calculations */}
                  {entry.splits && entry.splits.length > 0 && renderBatchCalculations(entry.splits, '#10b981', '#059669')}
                </div>
              ))}
            </Section>
          )}

          {summary.cuttingEntries && summary.cuttingEntries.length > 0 && (
            <Section>
              <SectionTitle>Paddy Cutting:</SectionTitle>
              {summary.cuttingEntries.map((entry: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline', flex: 1 }}>
                    <Amount>₹{entry.totalAmount.toFixed(0)}</Amount>
                    <Details>
                      <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                        {entry.totalBags} Bags from {entry.sourceDestination}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {entry.workDetail}
                      </div>
                    </Details>
                  </div>
                  
                  {/* Enhanced Batch Calculations */}
                  {entry.splits && entry.splits.length > 0 && renderBatchCalculations(entry.splits, '#10b981', '#059669')}
                </div>
              ))}
            </Section>
          )}

          {summary.plottingEntries && summary.plottingEntries.length > 0 && (
            <Section>
              <SectionTitle>Plotting:</SectionTitle>
              {summary.plottingEntries.map((entry: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline', flex: 1 }}>
                    <Amount>₹{entry.totalAmount.toFixed(0)}</Amount>
                    <Details>
                      <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                        {entry.totalBags} Bags from {entry.sourceDestination}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {entry.workDetail}
                      </div>
                    </Details>
                  </div>
                  
                  {/* Enhanced Batch Calculations */}
                  {entry.splits && entry.splits.length > 0 && renderBatchCalculations(entry.splits, '#10b981', '#059669')}
                </div>
              ))}
            </Section>
          )}

          {summary.shiftingEntries && summary.shiftingEntries.length > 0 && (
            <Section>
              <SectionTitle>Paddy Shifting:</SectionTitle>
              {summary.shiftingEntries.map((entry: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline', flex: 1 }}>
                    <Amount>₹{entry.totalAmount.toFixed(0)}</Amount>
                    <Details>
                      <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                        {entry.totalBags} Bags from {entry.sourceDestination}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {entry.workDetail}
                      </div>
                    </Details>
                  </div>
                  
                  {/* Enhanced Batch Calculations */}
                  {entry.splits && entry.splits.length > 0 && renderBatchCalculations(entry.splits, '#10b981', '#059669')}
                </div>
              ))}
            </Section>
          )}

          {summary.fillingEntries && summary.fillingEntries.length > 0 && (
            <Section>
              <SectionTitle>Paddy Filling with Stitching:</SectionTitle>
              {summary.fillingEntries.map((entry: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline', flex: 1 }}>
                    <Amount>₹{entry.totalAmount.toFixed(0)}</Amount>
                    <Details>
                      <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                        {entry.totalBags} Bags from {entry.sourceDestination}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {entry.workDetail}
                      </div>
                    </Details>
                  </div>
                  
                  {/* Enhanced Batch Calculations */}
                  {entry.splits && entry.splits.length > 0 && renderBatchCalculations(entry.splits, '#10b981', '#059669')}
                </div>
              ))}
            </Section>
          )}

          {/* Main Rice Hamali Section */}
          {summary.mainRiceHamaliGrouped && summary.mainRiceHamaliGrouped.length > 0 && (
            <Section>
              <SectionTitle>🌾 Main Rice Hamali:</SectionTitle>
              {summary.mainRiceHamaliGrouped.map((group: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline', flex: 1 }}>
                    <Amount>₹{group.totalAmount.toFixed(0)}</Amount>
                    <Details>
                      <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                        {group.totalBags} Bags - {group.workDetail}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        Variety: {group.variety || 'Unknown'} | Location: {group.location || 'Unknown'}
                      </div>
                    </Details>
                  </div>
                  
                  {/* Enhanced Batch Calculations */}
                  {group.splits && group.splits.length > 0 && renderBatchCalculations(group.splits, '#3b82f6', '#2563eb')}
                </div>
              ))}
            </Section>
          )}

          {/* Other Rice Hamali Works Section */}
          {summary.otherRiceHamaliGrouped && summary.otherRiceHamaliGrouped.length > 0 && (
            <Section>
              <SectionTitle>🔧 Other Rice Hamali Works:</SectionTitle>
              {summary.otherRiceHamaliGrouped.map((group: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline', flex: 1 }}>
                    <Amount>₹{group.totalAmount.toFixed(0)}</Amount>
                    <Details>
                      <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                        {group.totalBags} Bags - {group.workDetail}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        Other Work: {group.variety || 'Unknown'} | Location: {group.location || 'Unknown'}
                      </div>
                    </Details>
                  </div>
                  
                  {/* Enhanced Batch Calculations */}
                  {group.splits && group.splits.length > 0 && renderBatchCalculations(group.splits, '#d97706', '#d97706')}
                </div>
              ))}
            </Section>
          )}

          {/* Other Hamali Works Section */}
          {summary.otherHamaliEntries && Object.keys(summary.otherHamaliEntries).length > 0 && (
            <Section>
              <SectionTitle>🔧 Other Hamali Works:</SectionTitle>
              {Object.entries(summary.otherHamaliEntries).map(([workName, entries]: [string, any]) => (
                <div key={workName} style={{ marginBottom: '1rem' }}>
                  <h4 style={{ color: '#d97706', marginBottom: '0.5rem' }}>{workName}</h4>
                  {entries.map((entry: any, index: number) => (
                    <EntryRow key={index}>
                      <Amount>₹{entry.totalAmount.toFixed(0)}</Amount>
                      <Details>
                        {entry.workDetail} - {entry.quantity} units × ₹{entry.rate}
                        {entry.workerName && <span style={{ color: '#6b7280' }}> | Worker: {entry.workerName}</span>}
                      </Details>
                    </EntryRow>
                  ))}
                </div>
              ))}
            </Section>
          )}

          {/* Grand Total */}
          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '2px solid #000' }}>
            <EntryRow>
              <Amount style={{ fontSize: '1.3rem' }}>₹{summary.grandTotal.toFixed(0)}</Amount>
              <Details style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                Grand Total (Paddy + Main Rice + Other Rice + Other Hamali)
              </Details>
            </EntryRow>
          </div>
        </SummaryCard>
      )}
    </Container>
  );
};

export default HamaliBook;