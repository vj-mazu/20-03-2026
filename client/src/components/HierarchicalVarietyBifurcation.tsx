import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';

const Container = styled.div`
  background: white;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  overflow: hidden;
`;

const Header = styled.div`
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  padding: 1rem 1.5rem;
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Content = styled.div`
  padding: 1.5rem;
`;

const SourceVarietyCard = styled.div`
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SourceVarietyHeader = styled.div<{ expanded: boolean }>`
  background: #f8fafc;
  padding: 1rem 1.5rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: ${props => props.expanded ? '1px solid #e5e7eb' : 'none'};
  transition: all 0.3s ease;

  &:hover {
    background: #f3f4f6;
  }
`;

const SourceVarietyInfo = styled.div`
  flex: 1;
`;

const SourceVarietyTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: #1f2937;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SourceVarietyDetails = styled.div`
  color: #6b7280;
  font-size: 0.9rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SourceVarietySummary = styled.div`
  text-align: right;
  color: #374151;
`;

const StockBadge = styled.span<{ type: 'remaining' | 'converted' }>`
  background: ${props => props.type === 'remaining' ? '#d1fae5' : '#fef3c7'};
  color: ${props => props.type === 'remaining' ? '#065f46' : '#92400e'};
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-left: 0.5rem;
`;

const ExpandIcon = styled.span<{ expanded: boolean }>`
  transform: ${props => props.expanded ? 'rotate(90deg)' : 'rotate(0deg)'};
  transition: transform 0.3s ease;
  font-size: 1.2rem;
  color: #6b7280;
`;

const PaltiConversionsContainer = styled.div`
  padding: 1rem 1.5rem;
  background: #fafafa;
`;

const PaltiConversionItem = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ConversionInfo = styled.div`
  flex: 1;
`;

const ConversionTitle = styled.div`
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ConversionDetails = styled.div`
  color: #6b7280;
  font-size: 0.85rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const ConversionStats = styled.div`
  text-align: right;
  color: #374151;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #6b7280;
`;

const FilterSection = styled.div`
  background: #f8fafc;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FilterLabel = styled.label`
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
`;

const FilterSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }
`;

const FilterInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }
`;

const RefreshButton = styled.button`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

interface SourceVariety {
  type: 'source_variety';
  variety: string;
  productType: string;
  packagingName: string;
  bagSizeKg: string;
  groupingKey: string;
  currentStock: Array<{
    locationCode: string;
    availableBags: number;
    availableQtls: number;
  }>;
  paltiConversions: Array<{
    type: 'palti_conversion';
    targetVariety: string;
    sourceLocation: string;
    targetLocation: string;
    targetPackagingName: string;
    targetBagSizeKg: string;
    convertedBags: number;
    convertedQtls: number;
    shortageKg: number;
    shortageBags: number;
    conversionCount: number;
    lastConversionDate: string;
    groupingKey: string;
  }>;
  totals: {
    remainingBags: number;
    remainingQtls: number;
    totalConvertedBags: number;
    totalConvertedQtls: number;
    totalShortageKg: number;
    totalConversions: number;
  };
}

interface HierarchicalData {
  productType: string;
  date: string;
  hierarchicalBifurcation: SourceVariety[];
  summary: {
    totalSourceVarieties: number;
    totalPaltiConversions: number;
    totalRemainingBags: number;
    totalConvertedBags: number;
  };
}

interface HierarchicalVarietyBifurcationProps {
  date?: string;
  onDateChange?: (date: string) => void;
  refreshTrigger?: number; // Add refresh trigger prop
}

const HierarchicalVarietyBifurcation: React.FC<HierarchicalVarietyBifurcationProps> = ({ 
  date: externalDate, 
  onDateChange,
  refreshTrigger 
}) => {
  const [data, setData] = useState<HierarchicalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedVarieties, setExpandedVarieties] = useState<Set<string>>(new Set());
  const [productType, setProductType] = useState('Rice');
  const [date, setDate] = useState(externalDate || new Date().toISOString().split('T')[0]); // Use current date as default

  // Update internal date when external date changes
  useEffect(() => {
    if (externalDate && externalDate !== date) {
      setDate(externalDate);
    }
  }, [externalDate]);

  // Notify parent when date changes
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  const fetchHierarchicalData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required. Please login again.');
        return;
      }

      console.log('🏗️ Fetching hierarchical data for:', { productType, date, refreshTrigger });

      const response = await axios.get<{ success: boolean; data: HierarchicalData }>(
        '/rice-stock-management/hierarchical-variety-bifurcation',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { productType, date }
        }
      );

      console.log('📊 Hierarchical API Response:', response.data);

      if (response.data.success) {
        setData(response.data.data);
        console.log('✅ Hierarchical data loaded:', {
          summary: response.data.data.summary,
          sourceVarieties: response.data.data.hierarchicalBifurcation.length,
          totalConversions: response.data.data.hierarchicalBifurcation.reduce((sum, sv) => sum + sv.paltiConversions.length, 0)
        });
      } else {
        toast.error('Failed to fetch hierarchical variety bifurcation');
      }
    } catch (error: any) {
      console.error('❌ Error fetching hierarchical variety bifurcation:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch hierarchical variety bifurcation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      console.log('🔄 Hierarchical component refresh triggered:', refreshTrigger);
      toast.info('Refreshing hierarchical view...');
    }
    fetchHierarchicalData();
  }, [productType, date, refreshTrigger]); // Add refreshTrigger to dependencies

  const toggleVarietyExpansion = (groupingKey: string) => {
    const newExpanded = new Set(expandedVarieties);
    if (newExpanded.has(groupingKey)) {
      newExpanded.delete(groupingKey);
    } else {
      newExpanded.add(groupingKey);
    }
    setExpandedVarieties(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Container>
      <Header>
        <div>
          🏗️ Hierarchical Variety Bifurcation
          {loading && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>⏳ Loading...</span>}
          {data && (
            <div style={{ fontSize: '0.9rem', fontWeight: 'normal', marginTop: '0.25rem' }}>
              {data.summary.totalSourceVarieties} source varieties • {data.summary.totalPaltiConversions} palti conversions
            </div>
          )}
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>
          {data && formatDate(data.date)}
          {refreshTrigger !== undefined && refreshTrigger > 0 && (
            <div style={{ fontSize: '0.7rem', color: '#fbbf24', marginTop: '0.25rem' }}>
              Refresh #{refreshTrigger}
            </div>
          )}
        </div>
      </Header>

      <FilterSection>
        <FilterGroup>
          <FilterLabel>Product Type</FilterLabel>
          <FilterSelect
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
          >
            <option value="Rice">Rice</option>
            <option value="Bran">Bran</option>
            <option value="Broken">Broken</option>
            <option value="Faram">Faram</option>
            <option value="Unpolish">Unpolish</option>
            <option value="RJ Rice 1">RJ Rice 1</option>
            <option value="RJ Rice (2)">RJ Rice (2)</option>
            <option value="RJ Broken">RJ Broken</option>
            <option value="0 Broken">0 Broken</option>
            <option value="Sizer Broken">Sizer Broken</option>
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Date</FilterLabel>
          <FilterInput
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </FilterGroup>

        <RefreshButton
          onClick={() => {
            console.log('🔄 Manual refresh triggered');
            fetchHierarchicalData();
          }}
          disabled={loading}
        >
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </RefreshButton>

        <button
          type="button"
          onClick={() => {
            console.log('📊 Current hierarchical state:', {
              date,
              productType,
              refreshTrigger,
              dataLoaded: !!data,
              sourceVarieties: data?.hierarchicalBifurcation?.length || 0,
              totalConversions: data?.summary?.totalPaltiConversions || 0
            });
            toast.info(`Debug: ${data?.summary?.totalPaltiConversions || 0} conversions found for ${productType} on ${date}`);
          }}
          style={{
            background: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}
        >
          🐛 Debug Info
        </button>
      </FilterSection>

      <Content>
        {loading ? (
          <LoadingState>
            <p>Loading hierarchical variety bifurcation...</p>
          </LoadingState>
        ) : !data || data.hierarchicalBifurcation.length === 0 ? (
          <EmptyState>
            <h3>No source varieties found</h3>
            <p>No varieties have been used as palti sources for the selected criteria.</p>
          </EmptyState>
        ) : (
          <>
            {data.hierarchicalBifurcation.map((sourceVariety) => {
              const isExpanded = expandedVarieties.has(sourceVariety.groupingKey);
              
              return (
                <SourceVarietyCard key={sourceVariety.groupingKey}>
                  <SourceVarietyHeader
                    expanded={isExpanded}
                    onClick={() => toggleVarietyExpansion(sourceVariety.groupingKey)}
                  >
                    <SourceVarietyInfo>
                      <SourceVarietyTitle>
                        📦 {sourceVariety.variety}
                        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          ({sourceVariety.packagingName} • {sourceVariety.bagSizeKg}kg)
                        </span>
                      </SourceVarietyTitle>
                      <SourceVarietyDetails>
                        <span>Product: {sourceVariety.productType}</span>
                        <span>Locations: {sourceVariety.currentStock.length}</span>
                        <span>Conversions: {sourceVariety.totals.totalConversions}</span>
                      </SourceVarietyDetails>
                    </SourceVarietyInfo>
                    
                    <SourceVarietySummary>
                      <div>
                        <StockBadge type="remaining">
                          {sourceVariety.totals.remainingBags} bags ({sourceVariety.totals.remainingQtls.toFixed(2)} QTL)
                        </StockBadge>
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <StockBadge type="converted">
                          {sourceVariety.totals.totalConvertedBags} converted ({sourceVariety.totals.totalConvertedQtls.toFixed(2)} QTL)
                        </StockBadge>
                      </div>
                      <ExpandIcon expanded={isExpanded}>▶</ExpandIcon>
                    </SourceVarietySummary>
                  </SourceVarietyHeader>

                  {isExpanded && (
                    <PaltiConversionsContainer>
                      {/* Current Stock Section */}
                      {sourceVariety.currentStock.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', color: '#059669', fontSize: '1rem' }}>
                            📍 Current Remaining Stock
                          </h4>
                          {sourceVariety.currentStock.map((stock, index) => (
                            <div
                              key={index}
                              style={{
                                background: '#d1fae5',
                                border: '1px solid #10b981',
                                borderRadius: '4px',
                                padding: '0.75rem',
                                marginBottom: '0.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div>
                                <strong>{stock.locationCode}</strong>
                              </div>
                              <div style={{ color: '#065f46', fontWeight: 'bold' }}>
                                {stock.availableBags} bags • {stock.availableQtls.toFixed(2)} QTL
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Palti Conversions Section */}
                      {sourceVariety.paltiConversions.length > 0 && (
                        <div>
                          <h4 style={{ margin: '0 0 0.75rem 0', color: '#7c3aed', fontSize: '1rem' }}>
                            🔄 Palti Conversions ({sourceVariety.paltiConversions.length})
                          </h4>
                          {sourceVariety.paltiConversions.map((conversion, index) => (
                            <PaltiConversionItem key={index}>
                              <ConversionInfo>
                                <ConversionTitle>
                                  {conversion.sourceLocation} → {conversion.targetLocation}
                                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                    ({conversion.targetPackagingName} • {conversion.targetBagSizeKg}kg)
                                  </span>
                                </ConversionTitle>
                                <ConversionDetails>
                                  <span>Target: {conversion.targetVariety}</span>
                                  <span>Date: {formatDate(conversion.lastConversionDate)}</span>
                                  <span>Operations: {conversion.conversionCount}</span>
                                  {conversion.shortageKg > 0 && (
                                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                                      Shortage: {conversion.shortageKg.toFixed(2)}kg ({conversion.shortageBags.toFixed(3)} bags)
                                    </span>
                                  )}
                                </ConversionDetails>
                              </ConversionInfo>
                              
                              <ConversionStats>
                                <div style={{ fontWeight: 'bold', color: '#7c3aed' }}>
                                  {conversion.convertedBags} bags
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                  {conversion.convertedQtls.toFixed(2)} QTL
                                </div>
                              </ConversionStats>
                            </PaltiConversionItem>
                          ))}
                        </div>
                      )}

                      {sourceVariety.currentStock.length === 0 && sourceVariety.paltiConversions.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                          No current stock or palti conversions found for this source variety.
                        </div>
                      )}
                    </PaltiConversionsContainer>
                  )}
                </SourceVarietyCard>
              );
            })}
          </>
        )}
      </Content>
    </Container>
  );
};

export default HierarchicalVarietyBifurcation;