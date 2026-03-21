import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { sampleEntryApi } from '../utils/sampleEntryApi';
import styled, { keyframes } from 'styled-components';

/* ═══════════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════════ */
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

/* ═══════════════════════════════════════════════════
   STYLED COMPONENTS — Premium Dark Theme
   ═══════════════════════════════════════════════════ */
const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  padding: 2rem 1.5rem;
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
`;

const Container = styled.div`
  max-width: 960px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  animation: ${fadeIn} 0.5s ease;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #818cf8, #6366f1, #4f46e5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const GlassTable = styled.div`
  overflow-x: auto;
  border-radius: 14px;
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.08);
  animation: ${fadeIn} 0.4s ease;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const Th = styled.th`
  padding: 14px 16px;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.6);
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  white-space: nowrap;
  &:last-child { text-align: right; }
`;

const Td = styled.td<{ highlight?: boolean; center?: boolean }>`
  padding: 14px 16px;
  color: ${(p) => (p.highlight ? '#f1f5f9' : '#cbd5e1')};
  font-weight: ${(p) => (p.highlight ? 600 : 400)};
  border-bottom: 1px solid rgba(148, 163, 184, 0.06);
  white-space: nowrap;
  text-align: ${(p) => (p.center ? 'center' : 'left')};
  &:last-child { text-align: right; }
`;

const TableRow = styled.tr`
  transition: background 0.2s ease;
  cursor: pointer;
  &:hover { background: rgba(99, 102, 241, 0.08); }
`;

const Badge = styled.span<{ variant: 'pending' | 'done' | 'info' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  ${(p) =>
        p.variant === 'done'
            ? 'background: rgba(34,197,94,0.15); color: #4ade80;'
            : p.variant === 'pending'
                ? 'background: rgba(251,191,36,0.15); color: #fbbf24;'
                : 'background: rgba(99,102,241,0.15); color: #818cf8;'}
`;

const Card = styled.div<{ delay?: number }>`
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  animation: ${fadeIn} 0.5s ease ${(p) => (p.delay || 0) * 0.1}s both;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  &:hover {
    border-color: rgba(148, 163, 184, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
`;

const Row = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  @media (max-width: 640px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const Field = styled.div<{ flex?: number }>`
  flex: ${(p) => p.flex || 1};
  min-width: 0;
`;

const Label = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  color: #f1f5f9;
  font-size: 0.9rem;
  font-weight: 500;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }
  &::placeholder { color: #475569; }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  color: #f1f5f9;
  font-size: 0.9rem;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s ease;
  &:focus { border-color: #6366f1; }
  option { background: #1e293b; color: #f1f5f9; }
`;

const Btn = styled.button<{ variant?: 'primary' | 'success' | 'ghost' }>`
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  ${(p) =>
        p.variant === 'success'
            ? `background: linear-gradient(135deg, #059669, #10b981);
         color: white;
         &:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(16,185,129,0.3); }`
            : p.variant === 'ghost'
                ? `background: transparent;
         color: #94a3b8;
         &:hover { color: #f1f5f9; background: rgba(148,163,184,0.08); }`
                : `background: linear-gradient(135deg, #4f46e5, #6366f1);
         color: white;
         &:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(79,70,229,0.3); }`}
`;

const LorryTab = styled.button<{ active: boolean; done: boolean }>`
  padding: 8px 18px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid ${(p) =>
        p.active ? '#6366f1' : p.done ? 'rgba(34,197,94,0.3)' : 'rgba(148,163,184,0.12)'};
  background: ${(p) =>
        p.active ? 'rgba(99,102,241,0.15)' : p.done ? 'rgba(34,197,94,0.08)' : 'rgba(30,41,59,0.6)'};
  color: ${(p) => (p.active ? '#818cf8' : p.done ? '#4ade80' : '#94a3b8')};
  &:hover { transform: translateY(-1px); }
`;

const InfoBar = styled.div`
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  padding: 1rem 1.25rem;
  background: rgba(15, 23, 42, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  margin-bottom: 1rem;
  animation: ${fadeIn} 0.4s ease 0.1s both;
`;

const InfoItem = styled.div`
  font-size: 0.85rem;
  color: #94a3b8;
  span { color: #e2e8f0; font-weight: 600; margin-left: 4px; }
`;

const SectionTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.15), transparent);
  margin: 10px 0;
`;

const PreviewRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 0.85rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #64748b;
  font-size: 0.9rem;
`;

const BackBtn = styled.button`
  background: none;
  border: none;
  color: #818cf8;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  transition: color 0.2s;
  &:hover { color: #a5b4fc; }
`;

const LoadingShimmer = styled.div`
  height: 48px;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(30,41,59,0.5), rgba(51,65,85,0.5), rgba(30,41,59,0.5));
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

/* Owner Summary Grid */
const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 1rem;
`;

const SummaryItem = styled.div<{ accent?: boolean }>`
  padding: 0.75rem;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 10px;
  border: 1px solid ${(p) => p.accent ? 'rgba(251,191,36,0.2)' : 'rgba(148,163,184,0.06)'};
`;

const SummaryLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  margin-bottom: 4px;
`;

const SummaryValue = styled.div<{ accent?: boolean }>`
  font-size: ${(p) => p.accent ? '1.1rem' : '0.95rem'};
  font-weight: ${(p) => p.accent ? 800 : 600};
  color: ${(p) => p.accent ? '#fbbf24' : '#e2e8f0'};
`;

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */
const getAllItems = (entry: any) => {
    const inspections = entry?.lotAllotment?.physicalInspections || [];
    return inspections
        .filter((i: any) => i?.inventoryData)
        .map((i: any, idx: number) => ({
            inspection: i,
            inventory: i.inventoryData,
            financial: i.inventoryData?.financialCalculation || null,
            index: idx,
        }));
};

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */
const ManagerFinancialPage: React.FC = () => {
    const { showNotification } = useNotification();
    const [entries, setEntries] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [activeItem, setActiveItem] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ lfinRate: 0, lfinUnit: 'PER_BAG', hamaliRate: 0, hamaliUnit: 'PER_BAG' });

    useEffect(() => { loadEntries(); }, []);

    const loadEntries = async () => {
        try {
            setLoading(true);
            const [r1, r2] = await Promise.all([
                sampleEntryApi.getSampleEntriesByRole({ status: 'OWNER_FINANCIAL' }),
                sampleEntryApi.getSampleEntriesByRole({ status: 'MANAGER_FINANCIAL' }),
            ]);
            const map = new Map();
            [...(r1.data.entries || []), ...(r2.data.entries || [])].forEach((e: any) => map.set(e.id, e));
            setEntries(Array.from(map.values()));
        } catch {
            showNotification('Failed to load entries', 'error');
        } finally {
            setLoading(false);
        }
    };

    const openEntry = (e: any) => {
        setSelected(e);
        const items = getAllItems(e);
        const first = items.find((i: any) => i.financial) || items[0];
        setActiveItem(first);
        if (first?.financial) {
            setForm({
                lfinRate: first.financial.lfinRate || 0,
                lfinUnit: first.financial.lfinUnit || 'PER_BAG',
                hamaliRate: first.financial.hamaliRate || 0,
                hamaliUnit: first.financial.hamaliUnit || 'PER_BAG',
            });
        }
    };

    const selectItem = (item: any) => {
        setActiveItem(item);
        if (item?.financial) {
            setForm({
                lfinRate: item.financial.lfinRate || 0,
                lfinUnit: item.financial.lfinUnit || 'PER_BAG',
                hamaliRate: item.financial.hamaliRate || 0,
                hamaliUnit: item.financial.hamaliUnit || 'PER_BAG',
            });
        }
    };

    const handleSubmit = async () => {
        try {
            if (!activeItem?.financial) throw new Error('Owner financial not done yet');
            setSaving(true);
            await sampleEntryApi.createManagerFinancialCalculation(selected.id, {
                ...activeItem.financial,
                ...form,
                inventoryDataId: activeItem.inventory.id,
            });
            showNotification('Manager financial submitted successfully!', 'success');

            // Refresh purely this entry instead of closing and reloading everything
            const res = await sampleEntryApi.getSampleEntryById(selected.id);
            const updatedEntry = res.data;

            // If the entry has moved to FINAL_REVIEW, it means all lorries are done
            if (updatedEntry.workflowStatus === 'FINAL_REVIEW') {
                showNotification('All lorry trips completed for this lot!', 'success');
                setSelected(null);
                loadEntries();
                return;
            }

            setSelected(updatedEntry);

            // Keep the same lorry active but refresh its data
            const updatedItems = getAllItems(updatedEntry);
            const refreshedItem = updatedItems.find((i: any) => i.inspection.id === activeItem.inspection.id);
            if (refreshedItem) selectItem(refreshedItem);

        } catch (err: any) {
            showNotification(err.response?.data?.error || err.message || 'Failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const fc = activeItem?.financial;
    const items = selected ? getAllItems(selected) : [];

    /* ─── LISTING VIEW ─── */
    if (!selected) {
        return (
            <Page>
                <Container>
                    <Header>
                        <Title>📊 Manager Financial</Title>
                        <Badge variant="info">{entries.length} entries</Badge>
                    </Header>

                    <GlassTable>
                        <Table>
                            <thead>
                                <tr>
                                    <Th>Date</Th>
                                    <Th>Party</Th>
                                    <Th>Variety</Th>
                                    <Th style={{ textAlign: 'center' }}>Lorries</Th>
                                    <Th>Owner Total</Th>
                                    <Th>Action</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i}>
                                            <Td colSpan={6}><LoadingShimmer /></Td>
                                        </tr>
                                    ))
                                ) : entries.length === 0 ? (
                                    <tr>
                                        <Td colSpan={6}>
                                            <EmptyState>No entries pending manager review</EmptyState>
                                        </Td>
                                    </tr>
                                ) : (
                                    entries.map((e) => {
                                        const items = getAllItems(e);
                                        // ✅ FIXED: Calculate total WITHOUT sute (sute is only a weight deduction)
                                        const total = items.reduce(
                                            (s: number, i: any) => s + Number(i.financial?.totalAmount || 0),
                                            0
                                        );
                                        return (
                                            <TableRow key={e.id} onClick={() => openEntry(e)}>
                                                <Td>{new Date(e.entryDate).toLocaleDateString('en-IN')}</Td>
                                                <Td highlight>{e.partyName}</Td>
                                                <Td>{e.variety}</Td>
                                                <Td center>{items.length}</Td>
                                                <Td highlight style={{ color: '#fbbf24' }}>₹{fmt(total)}</Td>
                                                <Td>
                                                    <Btn variant="primary" style={{ padding: '6px 16px', fontSize: '0.75rem' }}>
                                                        Review
                                                    </Btn>
                                                </Td>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </tbody>
                        </Table>
                    </GlassTable>
                </Container>
            </Page>
        );
    }

    /* ─── DETAIL VIEW ─── */
    return (
        <Page>
            <Container>
                {/* Header */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <BackBtn onClick={() => { setSelected(null); setActiveItem(null); }}>
                        ← Back to list
                    </BackBtn>
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Title style={{ fontSize: '1.4rem' }}>{selected.partyName}</Title>
                        <Badge variant="info">{selected.variety}</Badge>
                    </div>
                </div>

                {/* Lorry tabs */}
                {items.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                        {items.map((item: any, idx: number) => (
                            <LorryTab
                                key={item.inspection.id}
                                active={activeItem?.inspection.id === item.inspection.id}
                                done={!!item.financial?.managerCalculatedBy}
                                onClick={() => selectItem(item)}
                            >
                                🚚 Lorry {idx + 1} {item.financial?.managerCalculatedBy ? '✅' : '⚠️'}
                            </LorryTab>
                        ))}
                    </div>
                )}

                {/* Info bar */}
                {activeItem && (
                    <InfoBar>
                        <InfoItem>Lorry: <span>{activeItem.inspection.lorryNumber || '—'}</span></InfoItem>
                        <InfoItem>Bags: <span>{activeItem.inventory.bags}</span></InfoItem>
                        <InfoItem>Net Weight: <span>{Number(activeItem.inventory.netWeight).toLocaleString()} kg</span></InfoItem>
                    </InfoBar>
                )}

                {!fc ? (
                    <Card>
                        <EmptyState>
                            ⏳ Owner financial not done yet for this lorry.<br />
                            <span style={{ fontSize: '0.8rem', color: '#475569' }}>The owner must submit their financial calculation first.</span>
                        </EmptyState>
                    </Card>
                ) : (
                    <>
                        {/* Owner Summary Card */}
                        <Card delay={1}>
                            <SectionTitle>👤 Owner Submitted Financial</SectionTitle>
                            <SummaryGrid>
                                <SummaryItem>
                                    <SummaryLabel>Sute (deduction)</SummaryLabel>
                                    <SummaryValue style={{ color: '#f87171' }}>−₹{fmt(Number(fc.totalSute || 0))}</SummaryValue>
                                </SummaryItem>
                                <SummaryItem>
                                    <SummaryLabel>Sute Net Wt</SummaryLabel>
                                    <SummaryValue>{fmt(Number(fc.suteNetWeight || 0))} kg</SummaryValue>
                                </SummaryItem>
                                <SummaryItem>
                                    <SummaryLabel>Base Rate</SummaryLabel>
                                    <SummaryValue>₹{fmt(Number(fc.baseRateTotal || 0))}</SummaryValue>
                                </SummaryItem>
                                <SummaryItem>
                                    <SummaryLabel>Brokerage</SummaryLabel>
                                    <SummaryValue>₹{fmt(Number(fc.brokerageTotal || 0))}</SummaryValue>
                                </SummaryItem>
                                <SummaryItem>
                                    <SummaryLabel>EGB</SummaryLabel>
                                    <SummaryValue>₹{fmt(Number(fc.egbTotal || 0))}</SummaryValue>
                                </SummaryItem>
                                <SummaryItem accent>
                                    <SummaryLabel>Owner Total</SummaryLabel>
                                    <SummaryValue accent>₹{fmt(Number(fc.totalAmount || 0))}</SummaryValue>
                                </SummaryItem>
                            </SummaryGrid>
                        </Card>

                        {/* Manager Form: LF & Hamali */}
                        <Card delay={2}>
                            <SectionTitle>📋 Manager: LF & Hamali</SectionTitle>
                            <Row>
                                <Field>
                                    <Label>LF (Freight) Rate (₹)</Label>
                                    <Input type="number" min="0" step="0.01" placeholder="0.00"
                                        value={form.lfinRate || ''}
                                        onChange={(e) => setForm({ ...form, lfinRate: Number(e.target.value) })} />
                                </Field>
                                <Field>
                                    <Label>LF Unit</Label>
                                    <Select value={form.lfinUnit}
                                        onChange={(e) => setForm({ ...form, lfinUnit: e.target.value })}>
                                        <option value="PER_BAG">Per Bag</option>
                                        <option value="PER_QUINTAL">Per Quintal</option>
                                    </Select>
                                </Field>
                            </Row>
                            <Row>
                                <Field>
                                    <Label>Hamali Rate (₹)</Label>
                                    <Input type="number" min="0" step="0.01" placeholder="0.00"
                                        value={form.hamaliRate || ''}
                                        onChange={(e) => setForm({ ...form, hamaliRate: Number(e.target.value) })} />
                                </Field>
                                <Field>
                                    <Label>Hamali Unit</Label>
                                    <Select value={form.hamaliUnit}
                                        onChange={(e) => setForm({ ...form, hamaliUnit: e.target.value })}>
                                        <option value="PER_BAG">Per Bag</option>
                                        <option value="PER_QUINTAL">Per Quintal</option>
                                    </Select>
                                </Field>
                            </Row>

                            {/* ── Live Preview ── */}
                            {(() => {
                                const inv = activeItem.inventory;
                                const lf = form.lfinUnit === 'PER_BAG'
                                    ? form.lfinRate * inv.bags
                                    : (inv.netWeight / 100) * form.lfinRate;
                                const ham = form.hamaliUnit === 'PER_BAG'
                                    ? form.hamaliRate * inv.bags
                                    : (inv.netWeight / 100) * form.hamaliRate;

                                // ✅ FIXED: Owner base does NOT include sute — sute is only a weight deduction
                                // totalAmount from backend already excludes sute (FinancialCalculator.calculateTotalAndAverage)
                                const ownerBase = Number(fc.totalAmount || 0);
                                const total = ownerBase + lf + ham;
                                const avg = Number(fc.suteNetWeight) > 0 ? total / Number(fc.suteNetWeight) : 0;

                                return (
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,41,59,0.8))',
                                        border: '1px solid rgba(99,102,241,0.15)',
                                        padding: '1.25rem',
                                        borderRadius: '12px',
                                        marginTop: '0.5rem'
                                    }}>
                                        <PreviewRow>
                                            <span style={{ color: '#64748b', fontWeight: 500 }}>Owner Total</span>
                                            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>₹{fmt(ownerBase)}</span>
                                        </PreviewRow>
                                        <PreviewRow>
                                            <span style={{ color: '#64748b', fontWeight: 500 }}>LF Total</span>
                                            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>₹{fmt(lf)}</span>
                                        </PreviewRow>
                                        <PreviewRow>
                                            <span style={{ color: '#64748b', fontWeight: 500 }}>Hamali Total</span>
                                            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>₹{fmt(ham)}</span>
                                        </PreviewRow>
                                        <Divider />
                                        <PreviewRow>
                                            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>GRAND TOTAL</span>
                                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#818cf8' }}>₹{fmt(total)}</span>
                                        </PreviewRow>
                                        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                                            Average: ₹{fmt(avg)} per unit
                                        </div>
                                    </div>
                                );
                            })()}

                            <Btn variant="success" onClick={handleSubmit} disabled={saving}
                                style={{ width: '100%', marginTop: '1.25rem', padding: '14px' }}>
                                {saving ? '⏳ Submitting...' : '✓ Submit & Move to Final Review'}
                            </Btn>

                            <button onClick={() => { setSelected(null); setActiveItem(null); }}
                                style={{
                                    display: 'block', width: '100%', textAlign: 'center',
                                    background: 'none', border: 'none', color: '#64748b',
                                    marginTop: '10px', cursor: 'pointer', fontSize: '0.8rem',
                                    transition: 'color 0.2s'
                                }}>
                                Cancel
                            </button>
                        </Card>
                    </>
                )}
            </Container>
        </Page>
    );
};

export default ManagerFinancialPage;
