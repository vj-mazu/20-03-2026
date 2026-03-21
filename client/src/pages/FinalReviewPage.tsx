import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { sampleEntryApi } from '../utils/sampleEntryApi';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  padding: 2rem;
  background: #f1f5f9;
  min-height: 100vh;
  color: #1e293b;
  font-family: 'Inter', -apple-system, sans-serif;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  animation: ${fadeIn} 0.5s ease-out;
`;

const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const PageHeader = styled.div`
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 2px solid #cbd5e1;
  padding-bottom: 1rem;
`;

const TitleGroup = styled.div`
  h1 {
    font-size: 1.8rem;
    font-weight: 800;
    margin: 0;
    color: #0f172a;
  }
  p {
    color: #64748b;
    margin: 0.3rem 0 0;
    font-size: 0.9rem;
  }
`;

const Section = styled.div`
  margin-bottom: 2.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid #e2e8f0;
`;

const SectionHeader = styled.div<{ $color: string }>`
  background: ${props => props.$color};
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h2 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const TableWrapper = styled.div`
  padding: 1rem;
  overflow-x: auto;
`;

const ModernTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;

  th {
    background: #f8fafc;
    color: #64748b;
    text-align: left;
    padding: 0.75rem 1rem;
    font-weight: 600;
    border: 1px solid #e2e8f0;
    text-transform: uppercase;
    font-size: 0.75rem;
  }

  td {
    padding: 0.75rem 1rem;
    border: 1px solid #e2e8f0;
    color: #1e293b;
  }
`;

const LorryBlock = styled.div`
  margin: 1.5rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
`;

const LorryHeader = styled.div`
  background: #1e293b;
  color: white;
  padding: 0.75rem 1.25rem;
  font-weight: 700;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
`;

const SubSectionTitle = styled.h4`
  font-size: 0.8rem;
  background: #f1f5f9;
  padding: 0.5rem 1rem;
  margin: 0;
  color: #475569;
  font-weight: 700;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
`;

const GrandSummary = styled.div`
  margin-top: 3rem;
  padding: 2rem;
  background: #0f172a;
  color: white;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatItem = styled.div`
  .stat-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.4rem;
  }
  .stat-value {
    font-size: 1.75rem;
    font-weight: 800;
  }
  .stat-highlight {
    color: #10b981;
  }
`;

const PrimaryButton = styled.button`
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: #1d4ed8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BackButton = styled.button`
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  &:hover {
    background: #f8fafc;
    color: #0f172a;
  }
`;

const FinalReviewPage: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [entries, setEntries] = useState<any[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [readOnly, setReadOnly] = useState(false);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const id = queryParams.get('id');
        if (id) loadSingleEntry(id);
        else loadEntries();
    }, []);

    const loadSingleEntry = async (id: string) => {
        try {
            setLoading(true);
            const response = await sampleEntryApi.getSampleEntryById(id as any);
            setSelectedEntry(response.data);
            if (response.data.workflowStatus !== 'FINAL_REVIEW') setReadOnly(true);
        } catch (error) {
            showNotification('Failed to load entry', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadEntries = async () => {
        try {
            setLoading(true);
            const response = await sampleEntryApi.getSampleEntriesByRole({ status: 'FINAL_REVIEW' });
            setEntries(response.data.entries || []);
            setReadOnly(false);
        } catch (error) {
            showNotification('Failed to load records', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        try {
            setSubmitting(true);
            await sampleEntryApi.completeSampleEntry(selectedEntry.id);
            showNotification('Finalized successfully!', 'success');
            setSelectedEntry(null);
            loadEntries();
        } catch (error: any) {
            showNotification('Failed to finalize', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Container><ContentWrapper>Loading details...</ContentWrapper></Container>;

    if (!selectedEntry) {
        return (
            <Container>
                <ContentWrapper>
                    <PageHeader>
                        <TitleGroup>
                            <h1>Review & Final Approval</h1>
                            <p>Select record to audit complete workflow sequence</p>
                        </TitleGroup>
                    </PageHeader>
                    <Section>
                        <div style={{ background: '#334155', padding: '0.75rem 1.5rem', color: 'white', fontWeight: 600 }}>
                            PENDING AUDITS ({entries.length})
                        </div>
                        <TableWrapper>
                            <ModernTable>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Party / Variety</th>
                                        <th>Broker</th>
                                        <th>Estimated Bags</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.length === 0 ? (
                                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No pending records</td></tr>
                                    ) : (
                                        entries.map(e => (
                                            <tr key={e.id}>
                                                <td>{new Date(e.entryDate).toLocaleDateString()}</td>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: '#1565c0' }}>{toTitleCase(e.partyName) || (e.entryType === 'DIRECT_LOADED_VEHICLE' ? e.lorryNumber?.toUpperCase() : '')}</div>
                                                    {e.entryType === 'DIRECT_LOADED_VEHICLE' && e.lorryNumber && e.partyName && <div style={{ fontSize: '10px', color: '#1565c0', fontWeight: '600' }}>{e.lorryNumber.toUpperCase()}</div>}
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{e.variety}</div>
                                                </td>
                                                <td>{e.brokerName}</td>
                                                <td>{e.bags?.toLocaleString('en-IN')}</td>
                                                <td><PrimaryButton style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => setSelectedEntry(e)}>Review Audit</PrimaryButton></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </ModernTable>
                        </TableWrapper>
                    </Section>
                </ContentWrapper>
            </Container>
        );
    }

    const qp = selectedEntry.qualityParameters;
    const allot = selectedEntry.lotAllotment;
    const inspections = allot?.physicalInspections || [];

    // Aggregate totals for the grand summary
    const lorryFlows = inspections.map((i: any) => ({
        inspection: i,
        inventory: i.inventoryData,
        financial: i.inventoryData?.financialCalculation
    }));

    const totalActualBags = inspections.reduce((sum: number, i: any) => sum + (i.bags || 0), 0).toLocaleString('en-IN');
    const totalNetWeight = lorryFlows.reduce((sum: number, f: any) => sum + Number(f.inventory?.netWeight || 0), 0);
    const totalAmount = lorryFlows.reduce((sum: number, f: any) => sum + Number(f.financial?.totalAmount || 0), 0);
    const avgRate = totalNetWeight > 0 ? (totalAmount / totalNetWeight * 100) : 0;

    return (
        <Container>
            <ContentWrapper>
                <PageHeader>
                    <TitleGroup>
                        <h1>Comprehensive Workflow Audit</h1>
                        <p>Complete role-by-role sequence for {toTitleCase(selectedEntry.partyName) || selectedEntry.lorryNumber?.toUpperCase()} - {selectedEntry.variety}</p>
                    </TitleGroup>
                    <BackButton onClick={() => setSelectedEntry(null)}><span>←</span> BACK TO SELECTION</BackButton>
                </PageHeader>

                {/* 1. STAFF ENTRY DETAILS */}
                <Section>
                    <SectionHeader $color="#3b82f6">
                        <h2>1. STAFF: INITIAL SAMPLE ENTRY</h2>
                        <span>BY: {selectedEntry.creator?.username || 'System'}</span>
                    </SectionHeader>
                    <TableWrapper>
                        <ModernTable>
                            <thead>
                                <tr>
                                    <th>Entry Date</th>
                                    <th>Broker Name</th>
                                    <th>Variety</th>
                                    <th>Party Name</th>
                                    <th>Location (Initial)</th>
                                    <th>Est. Bags</th>
                                    <th>Lorry Number</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{new Date(selectedEntry.entryDate).toLocaleDateString()}</td>
                                    <td>{selectedEntry.brokerName}</td>
                                    <td style={{ fontWeight: 700 }}>{selectedEntry.variety}</td>
                                    <td style={{ fontWeight: 700 }}>{toTitleCase(selectedEntry.partyName) || selectedEntry.lorryNumber?.toUpperCase()}</td>
                                    <td>{selectedEntry.location}</td>
                                    <td>{selectedEntry.bags?.toLocaleString('en-IN')}</td>
                                    <td>{selectedEntry.lorryNumber || '-'}</td>
                                </tr>
                            </tbody>
                        </ModernTable>
                    </TableWrapper>
                </Section>

                {/* 2. QUALITY SUPERVISOR DETAILS */}
                <Section>
                    <SectionHeader $color="#8b5cf6">
                        <h2>2. QUALITY SUPERVISOR: LAB PARAMETERS</h2>
                        <span>BY: {qp?.reportedByUser?.username || 'N/A'}</span>
                    </SectionHeader>
                    <TableWrapper>
                        <ModernTable>
                            <thead>
                                <tr>
                                    <th>Moisture%</th>
                                    <th>Cutting (merged)</th>
                                    <th>Bend</th>
                                    <th>Mix S/L</th>
                                    <th>Mix %</th>
                                    <th>Kandu %</th>
                                    <th>Oil %</th>
                                    <th>SK %</th>
                                    <th>Grains Count</th>
                                    <th>WB (R/Bk/T)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ fontWeight: 700 }}>{qp?.moisture}%</td>
                                    <td style={{ fontWeight: 700 }}>{qp?.cutting1 && qp?.cutting2 ? `${qp.cutting1} x ${qp.cutting2}` : (qp?.cutting1 || '-')}</td>
                                    <td>{qp?.bend || 0}</td>
                                    <td>{qp?.mixS || 0} / {qp?.mixL || 0}</td>
                                    <td>{qp?.mix || 0}</td>
                                    <td>{qp?.kandu || 0}</td>
                                    <td>{qp?.oil || 0}</td>
                                    <td>{qp?.sk || 0}</td>
                                    <td>{qp?.grainsCount ? `(${qp.grainsCount})` : '-'}</td>
                                    <td>{qp?.wbR || 0} / {qp?.wbBk || 0} / {qp?.wbT || 0}</td>
                                </tr>
                            </tbody>
                        </ModernTable>
                    </TableWrapper>
                </Section>

                {/* 3. ADMIN: LOT SELECTION & FINAL REPORT */}
                <Section>
                    <SectionHeader $color="#f59e0b">
                        <h2>3. ADMIN: SELECTION & PRICING DECISION</h2>
                        <span>BY: {selectedEntry.lotSelectionByUser?.username || 'N/A'}</span>
                    </SectionHeader>
                    <TableWrapper>
                        <ModernTable>
                            <thead>
                                <tr>
                                    <th>Lot Decision</th>
                                    <th>Offering Price</th>
                                    <th>Final Price</th>
                                    <th>Price Type</th>
                                    <th>Decided At</th>
                                    <th>Cooking Stat (if any)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ fontWeight: 700 }}>
                                        {selectedEntry.lotSelectionDecision === 'PASS_WITHOUT_COOKING' ? '✅ PASS (DIRECT)' :
                                            selectedEntry.lotSelectionDecision === 'PASS_WITH_COOKING' ? '🍚 PASS (AFTER COOKING)' :
                                                selectedEntry.lotSelectionDecision === 'FAIL' ? '❌ FAILED' : 'PENDING'}
                                    </td>
                                    <td>₹{selectedEntry.offeringPrice || '-'}</td>
                                    <td style={{ fontWeight: 700, color: '#10b981' }}>₹{selectedEntry.finalPrice || '-'}</td>
                                    <td>{selectedEntry.priceType || '-'}</td>
                                    <td>{selectedEntry.lotSelectionAt ? new Date(selectedEntry.lotSelectionAt).toLocaleString() : '-'}</td>
                                    <td style={{ fontWeight: 600 }}>{selectedEntry.cookingReport ? `${selectedEntry.cookingReport.status} (${selectedEntry.cookingReport.remarks || ''})` : 'NO COOKING'}</td>
                                </tr>
                            </tbody>
                        </ModernTable>
                    </TableWrapper>
                </Section>

                {/* 4. MANAGER: LOT ALLOTMENT */}
                <Section>
                    <SectionHeader $color="#06b6d4">
                        <h2>4. MANAGER: SUPERVISOR ALLOTMENT</h2>
                        <span>BY: {allot?.allottedByUser?.username || allot?.allottedBy || 'N/A'}</span>
                    </SectionHeader>
                    <TableWrapper>
                        <ModernTable>
                            <thead>
                                <tr>
                                    <th>Physical Supervisor</th>
                                    <th>Allotted Bags</th>
                                    <th>Allotment Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ fontWeight: 700 }}>{allot?.supervisor?.username || 'N/A'}</td>
                                    <td>{allot?.allottedBags || selectedEntry.bags}</td>
                                    <td>{allot?.createdAt ? new Date(allot.createdAt).toLocaleString() : '-'}</td>
                                    <td>{allot ? 'ALLOTTED' : 'PENDING'}</td>
                                </tr>
                            </tbody>
                        </ModernTable>
                    </TableWrapper>
                </Section>

                {/* REPEATED LORRY SEQUENCES (INSPECTION -> INVENTORY -> FINANCIAL) */}
                <Section>
                    <SectionHeader $color="#10b981">
                        <h2>5. DETAILED ARRIVAL FLOW (REPEATED PER LORRY)</h2>
                        <span>{lorryFlows.length} TRIP(S) COMPLETED</span>
                    </SectionHeader>

                    {lorryFlows.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No physical arrival data recorded.</div>
                    ) : (
                        lorryFlows.map((flow: any, index: number) => (
                            <LorryBlock key={flow.inspection.id}>
                                <LorryHeader>
                                    <span>LORRY #{index + 1}: {flow.inspection.lorryNumber || 'N/A'}</span>
                                    <span>DATE: {new Date(flow.inspection.inspectionDate).toLocaleDateString()}</span>
                                </LorryHeader>

                                <SubSectionTitle>A. PHYSICAL SUPERVISOR INSPECTION</SubSectionTitle>
                                <TableWrapper>
                                    <ModernTable>
                                        <thead>
                                            <tr>
                                                <th>Bags</th>
                                                <th>Cutting 1/2</th>
                                                <th>Bend</th>
                                                <th>Remarks</th>
                                                <th>Reported By</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ fontWeight: 700 }}>{flow.inspection.bags}</td>
                                                <td>{flow.inspection.cutting1} / {flow.inspection.cutting2 || '-'}</td>
                                                <td>{flow.inspection.bend}</td>
                                                <td>{flow.inspection.remarks || 'No remarks'}</td>
                                                <td>{flow.inspection.reportedBy?.username || '-'}</td>
                                            </tr>
                                        </tbody>
                                    </ModernTable>
                                </TableWrapper>

                                <SubSectionTitle>B. INVENTORY DATA (WEIGHT BRIDGE)</SubSectionTitle>
                                <TableWrapper>
                                    <ModernTable>
                                        <thead>
                                            <tr>
                                                <th>WB Number</th>
                                                <th>Gross Wt (Kg)</th>
                                                <th>Tare Wt (Kg)</th>
                                                <th>Net Wt (Kg)</th>
                                                <th>Storage Location</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>{flow.inventory?.wbNumber || '-'}</td>
                                                <td>{flow.inventory?.grossWeight || 0}</td>
                                                <td>{flow.inventory?.tareWeight || 0}</td>
                                                <td style={{ fontWeight: 700 }}>{flow.inventory?.netWeight || 0}</td>
                                                <td style={{ color: '#2563eb', fontWeight: 600 }}>
                                                    {flow.inventory?.location === 'DIRECT_KUNCHINITTU' ? `DIRECT KUNCHINITTU (${flow.inventory.kunchinittu?.name || ''})` :
                                                        flow.inventory?.location === 'DIRECT_OUTTURN_PRODUCTION' ? `DIRECT OUTTURN (${flow.inventory.outturn?.outturnNumber || ''})` :
                                                            flow.inventory?.location === 'WAREHOUSE' ? 'WAREHOUSE' : '-'}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </ModernTable>
                                </TableWrapper>

                                <SubSectionTitle>C. FINANCIAL CALCULATION (DETAILED BREAKDOWN)</SubSectionTitle>
                                <TableWrapper>
                                    <ModernTable>
                                        <thead>
                                            <tr>
                                                <th>Sute (Rt/Tot)</th>
                                                <th>LF (Rt/Tot)</th>
                                                <th>Hamali (Rt/Tot)</th>
                                                <th>Brokerage (Rt/Tot)</th>
                                                <th>EGB Tot</th>
                                                <th>Base Rate</th>
                                                <th>Base Total</th>
                                                <th>Avg Rate</th>
                                                <th>Grand Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ fontSize: '0.75rem' }}>
                                                    {flow.financial?.suteRate ? `${flow.financial.suteRate}${flow.financial.suteType === 'PER_BAG' ? '/b' : '/t'}` : '0'}
                                                    <div style={{ fontWeight: 700, color: '#64748b' }}>₹{Number(flow.financial?.totalSute || 0).toLocaleString()}</div>
                                                </td>
                                                <td style={{ fontSize: '0.75rem' }}>
                                                    {flow.financial?.lfinRate || '0'}
                                                    <div style={{ fontWeight: 700, color: '#64748b' }}>₹{Number(flow.financial?.lfinTotal || 0).toLocaleString()}</div>
                                                </td>
                                                <td style={{ fontSize: '0.75rem' }}>
                                                    {flow.financial?.hamaliRate || '0'}
                                                    <div style={{ fontWeight: 700, color: '#64748b' }}>₹{Number(flow.financial?.hamaliTotal || 0).toLocaleString()}</div>
                                                </td>
                                                <td style={{ fontSize: '0.75rem' }}>
                                                    {flow.financial?.brokerageRate || '0'}
                                                    <div style={{ fontWeight: 700, color: '#64748b' }}>₹{Number(flow.financial?.brokerageTotal || 0).toLocaleString()}</div>
                                                </td>
                                                <td style={{ fontWeight: 700 }}>₹{Number(flow.financial?.egbTotal || 0).toLocaleString()}</td>
                                                <td style={{ fontSize: '0.75rem' }}>
                                                    <div style={{ fontWeight: 700 }}>₹{flow.financial?.baseRateValue || 0}</div>
                                                    <div style={{ color: '#64748b', fontSize: '0.65rem' }}>{flow.financial?.baseRateType} ({flow.financial?.baseRateUnit === 'PER_BAG' ? 'Bag' : 'Q'})</div>
                                                </td>
                                                <td style={{ fontWeight: 700 }}>₹{Number(flow.financial?.baseRateTotal || 0).toLocaleString()}</td>
                                                <td style={{ fontWeight: 700, color: '#10b981' }}>₹{flow.financial?.average ? Number(flow.financial.average).toFixed(2) : '-'}</td>
                                                <td style={{ fontWeight: 800, fontSize: '0.95rem', background: '#f0fdf4' }}>₹{flow.financial?.totalAmount ? Number(flow.financial.totalAmount).toLocaleString() : '-'}</td>
                                            </tr>
                                        </tbody>
                                    </ModernTable>
                                </TableWrapper>
                            </LorryBlock>
                        ))
                    )}
                </Section>

                {/* GRAND SUMMARY */}
                <GrandSummary>
                    <div style={{ display: 'flex', gap: '3rem' }}>
                        <StatItem>
                            <div className="stat-label">TOTAL ACTUAL BAGS</div>
                            <div className="stat-value">{totalActualBags} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ {allot?.allottedBags || selectedEntry.bags}</span></div>
                        </StatItem>
                        <StatItem>
                            <div className="stat-label">TOTAL NET WEIGHT</div>
                            <div className="stat-value">{totalNetWeight.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>KG</span></div>
                        </StatItem>
                        <StatItem>
                            <div className="stat-label">NET AVERAGE RATE</div>
                            <div className="stat-value stat-highlight">₹{avgRate.toFixed(2)}</div>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.2rem', fontWeight: 600 }}>
                                (Total Amt / Total Wt) × 100 [Per Q]
                            </div>
                        </StatItem>
                        <StatItem>
                            <div className="stat-label">GRAND TOTAL AMOUNT</div>
                            <div className="stat-value" style={{ color: '#fbbf24' }}>₹{totalAmount.toLocaleString()}</div>
                        </StatItem>
                    </div>

                    {!readOnly && (
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <PrimaryButton onClick={handleComplete} disabled={submitting || totalAmount === 0}>
                                {submitting ? 'Finalizing...' : 'APPROVE & CLOSE RECORD'}
                            </PrimaryButton>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>* approval will lock all entries and update warehouse stock</span>
                        </div>
                    )}
                    {readOnly && (
                        <div style={{ background: '#10b981', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 800 }}>
                            WORKFLOW COMPLETED ✅
                        </div>
                    )}
                </GrandSummary>

                <div style={{ height: '4rem' }} />
            </ContentWrapper>
        </Container>
    );
};

export default FinalReviewPage;
