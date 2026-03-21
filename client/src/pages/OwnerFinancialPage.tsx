import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { sampleEntryApi } from '../utils/sampleEntryApi';
import { SuteType, BaseRateType, CalculationUnit } from '../types/sampleEntry';
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

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
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
  background: linear-gradient(135deg, #fbbf24, #f59e0b, #d97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  &:hover { background: rgba(59, 130, 246, 0.08); }
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
                : 'background: rgba(59,130,246,0.15); color: #60a5fa;'}
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

const Label = styled.label`
  display: block;
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
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
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
  &:focus { border-color: #3b82f6; }
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
                : `background: linear-gradient(135deg, #2563eb, #3b82f6);
         color: white;
         &:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.3); }`}
`;

const LorryTab = styled.button<{ active: boolean; done: boolean }>`
  padding: 8px 18px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid ${(p) =>
        p.active ? '#3b82f6' : p.done ? 'rgba(34,197,94,0.3)' : 'rgba(148,163,184,0.12)'};
  background: ${(p) =>
        p.active ? 'rgba(59,130,246,0.15)' : p.done ? 'rgba(34,197,94,0.08)' : 'rgba(30,41,59,0.6)'};
  color: ${(p) => (p.active ? '#60a5fa' : p.done ? '#4ade80' : '#94a3b8')};
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

const PreviewCard = styled(Card)`
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9));
  border: 1px solid rgba(251, 191, 36, 0.15);
  animation: ${fadeIn} 0.5s ease 0.2s both;
`;

const PreviewRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 0.85rem;
`;

const PreviewLabel = styled.span`
  color: #64748b;
  font-weight: 500;
`;

const PreviewValue = styled.span<{ accent?: boolean }>`
  color: ${(p) => (p.accent ? '#fbbf24' : '#e2e8f0')};
  font-weight: ${(p) => (p.accent ? 800 : 600)};
  font-size: ${(p) => (p.accent ? '1.25rem' : '0.85rem')};
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.15), transparent);
  margin: 10px 0;
`;

const DoneCard = styled(Card)`
  border: 1px solid rgba(34, 197, 94, 0.2);
  background: rgba(34, 197, 94, 0.05);
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
  color: #60a5fa;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  transition: color 0.2s;
  &:hover { color: #93c5fd; }
`;

const LoadingShimmer = styled.div`
  height: 48px;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(30,41,59,0.5), rgba(51,65,85,0.5), rgba(30,41,59,0.5));
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
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
const OwnerFinancialPage: React.FC = () => {
    const { showNotification } = useNotification();
    const [entries, setEntries] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [activeItem, setActiveItem] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        suteRate: 0,
        suteType: 'PER_BAG' as SuteType,
        baseRateType: 'PD_LOOSE' as BaseRateType,
        baseRateUnit: 'PER_BAG' as CalculationUnit,
        baseRateValue: 0,
        customDivisor: 100,
        brokerageRate: 0,
        brokerageUnit: 'PER_BAG' as CalculationUnit,
        egbRate: 0,
    });

    const resetForm = () =>
        setForm({
            suteRate: 0, suteType: 'PER_BAG', baseRateType: 'PD_LOOSE',
            baseRateUnit: 'PER_BAG', baseRateValue: 0, customDivisor: 100,
            brokerageRate: 0, brokerageUnit: 'PER_BAG', egbRate: 0,
        });

    useEffect(() => { loadEntries(); }, []);

    const loadEntries = async () => {
        try {
            setLoading(true);
            const [r1, r2] = await Promise.all([
                sampleEntryApi.getSampleEntriesByRole({ status: 'INVENTORY_ENTRY' }),
                sampleEntryApi.getSampleEntriesByRole({ status: 'OWNER_FINANCIAL' }),
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
        const pending = items.find((i: any) => !i.financial);
        setActiveItem(pending || items[0] || null);
        resetForm();
    };

    const handleSave = async () => {
        try {
            if (!activeItem?.inventory) throw new Error('No inventory selected');
            setSaving(true);
            await sampleEntryApi.createFinancialCalculation(selected.id, {
                ...form,
                baseRate: form.baseRateValue,
                inventoryDataId: activeItem.inventory.id,
                lfinRate: 0, lfinUnit: 'PER_BAG', hamaliRate: 0, hamaliUnit: 'PER_BAG',
            });
            showNotification('Financial calculation saved successfully!', 'success');

            // Refresh purely this entry instead of closing and reloading everything
            const res = await sampleEntryApi.getSampleEntryById(selected.id);
            const updatedEntry = res.data;
            setSelected(updatedEntry);

            // Move to next pending lorry if any, or stay on current
            const updatedItems = getAllItems(updatedEntry);
            const nextPending = updatedItems.find((i: any) => !i.financial);
            if (nextPending) {
                setActiveItem(nextPending);
                resetForm();
            } else {
                // If all done, stay on the last one
                const current = updatedItems.find((i: any) => i.inspection.id === activeItem.inspection.id);
                if (current) setActiveItem(current);
            }

        } catch (err: any) {
            showNotification(err.response?.data?.error || err.message || 'Save failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    /**
     * CALCULATION — SUTE IS NOT ADDED TO TOTAL
     * Sute only reduces net weight → sute net weight (SNW)
     * Total = Base Rate + Brokerage + EGB (sute NOT included)
     */
    const calc = () => {
        if (!activeItem?.inventory) return null;
        const { bags, netWeight } = activeItem.inventory;
        const totalSute = form.suteType === 'PER_BAG'
            ? form.suteRate * bags
            : (netWeight / 1000) * form.suteRate;
        const snw = netWeight - totalSute;

        let div = 100;
        if (form.baseRateType === 'MD_LOOSE') div = form.customDivisor;
        else if (form.baseRateUnit === 'PER_BAG') div = 75;

        const base = (snw / div) * form.baseRateValue;

        const brDiv = form.baseRateType === 'MD_LOOSE' ? form.customDivisor : 100;
        const brok = form.brokerageUnit === 'PER_BAG'
            ? form.brokerageRate * bags
            : (netWeight / brDiv) * form.brokerageRate;

        const isLoose = form.baseRateType === 'PD_LOOSE' || form.baseRateType === 'MD_LOOSE';
        const egb = isLoose ? form.egbRate * bags : 0;

        // ✅ FIXED: sute is NOT added to total — it only deducts from net weight
        const total = base + brok + egb;
        const avg = snw > 0 ? total / snw : 0;

        return { totalSute, snw, base, brok, egb, total, avg };
    };

    const totals = calc();
    const items = selected ? getAllItems(selected) : [];

    /* ─── LISTING VIEW ─── */
    if (!selected) {
        return (
            <Page>
                <Container>
                    <Header>
                        <Title>💰 Owner Financial</Title>
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
                                    <Th style={{ textAlign: 'center' }}>Status</Th>
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
                                            <EmptyState>No entries pending financial calculation</EmptyState>
                                        </Td>
                                    </tr>
                                ) : (
                                    entries.map((e, idx) => {
                                        const items = getAllItems(e);
                                        const pending = items.filter((i: any) => !i.financial).length;
                                        return (
                                            <TableRow key={e.id} onClick={() => openEntry(e)}>
                                                <Td>{new Date(e.entryDate).toLocaleDateString('en-IN')}</Td>
                                                <Td highlight>{e.partyName}</Td>
                                                <Td>{e.variety}</Td>
                                                <Td center>{items.length}</Td>
                                                <Td center>
                                                    {pending > 0
                                                        ? <Badge variant="pending">{pending} pending</Badge>
                                                        : <Badge variant="done">✓ Done</Badge>}
                                                </Td>
                                                <Td>
                                                    <Btn variant={pending > 0 ? 'primary' : 'ghost'}
                                                        style={{ padding: '6px 16px', fontSize: '0.75rem' }}>
                                                        {pending > 0 ? '→ Calculate' : 'View'}
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
                {/* Header with back */}
                <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
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
                                done={!!item.financial}
                                onClick={() => { setActiveItem(item); if (!item.financial) resetForm(); }}
                            >
                                🚚 Lorry {idx + 1} {item.financial ? '✅' : ''}
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
                        <InfoItem>Gross Wt: <span>{Number(activeItem.inventory.grossWeight).toLocaleString()} kg</span></InfoItem>
                        <InfoItem>Broker: <span>{selected.brokerName || '—'}</span></InfoItem>
                    </InfoBar>
                )}

                {/* Already done */}
                {activeItem?.financial ? (
                    <DoneCard delay={2}>
                        <SectionTitle><span style={{ fontSize: '1.1rem' }}>✅</span> Financial Calculation Complete</SectionTitle>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                            <div>
                                <Label>Sute (deduction)</Label>
                                <div style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: 600 }}>
                                    ₹{fmt(Number(activeItem.financial.totalSute || 0))}
                                </div>
                            </div>
                            <div>
                                <Label>Base Rate</Label>
                                <div style={{ color: '#e2e8f0', fontSize: '1rem', fontWeight: 600 }}>
                                    ₹{fmt(Number(activeItem.financial.baseRateTotal || 0))}
                                </div>
                            </div>
                            <div>
                                <Label>Brokerage</Label>
                                <div style={{ color: '#e2e8f0', fontSize: '1rem', fontWeight: 600 }}>
                                    ₹{fmt(Number(activeItem.financial.brokerageTotal || 0))}
                                </div>
                            </div>
                            <div>
                                <Label>Total Amount</Label>
                                <div style={{ color: '#fbbf24', fontSize: '1.15rem', fontWeight: 800 }}>
                                    ₹{fmt(Number(activeItem.financial.totalAmount || 0))}
                                </div>
                            </div>
                        </div>
                    </DoneCard>
                ) : (
                    <>
                        {/* ── Sute & Base Rate Card ── */}
                        <Card delay={2}>
                            <SectionTitle>⚖️ Sute & Base Rate</SectionTitle>
                            <Row>
                                <Field>
                                    <Label>Sute Rate</Label>
                                    <Input type="number" min="0" step="0.01" placeholder="0.00"
                                        value={form.suteRate || ''}
                                        onChange={(e) => setForm({ ...form, suteRate: Number(e.target.value) })} />
                                </Field>
                                <Field>
                                    <Label>Sute Type</Label>
                                    <Select value={form.suteType}
                                        onChange={(e) => setForm({ ...form, suteType: e.target.value as any })}>
                                        <option value="PER_BAG">Per Bag</option>
                                        <option value="PER_TON">Per Ton</option>
                                    </Select>
                                </Field>
                            </Row>
                            <Row>
                                <Field flex={2}>
                                    <Label>Base Rate Type</Label>
                                    <Select value={form.baseRateType}
                                        onChange={(e) => setForm({ ...form, baseRateType: e.target.value as any })}>
                                        <option value="PD_LOOSE">PD Loose</option>
                                        <option value="PD_WB">PD WB</option>
                                        <option value="MD_WB">MD WB</option>
                                        <option value="MD_LOOSE">MD Loose</option>
                                    </Select>
                                </Field>
                                {form.baseRateType === 'MD_LOOSE' && (
                                    <Field>
                                        <Label>Custom Divisor</Label>
                                        <Input type="number" min="1"
                                            value={form.customDivisor}
                                            onChange={(e) => setForm({ ...form, customDivisor: Number(e.target.value) })} />
                                    </Field>
                                )}
                            </Row>
                            <Row>
                                <Field>
                                    <Label>Rate Value (₹)</Label>
                                    <Input type="number" min="0" step="0.01" placeholder="0.00"
                                        value={form.baseRateValue || ''}
                                        onChange={(e) => setForm({ ...form, baseRateValue: Number(e.target.value) })} />
                                </Field>
                                <Field>
                                    <Label>Rate Unit</Label>
                                    <Select value={form.baseRateUnit}
                                        onChange={(e) => setForm({ ...form, baseRateUnit: e.target.value as any })}>
                                        <option value="PER_BAG">Per Bag (÷75)</option>
                                        <option value="PER_QUINTAL">Per Quintal (÷100)</option>
                                    </Select>
                                </Field>
                            </Row>
                        </Card>

                        {/* ── Brokerage & EGB Card ── */}
                        <Card delay={3}>
                            <SectionTitle>🤝 Brokerage & EGB</SectionTitle>
                            <Row>
                                <Field>
                                    <Label>Brokerage Rate (₹)</Label>
                                    <Input type="number" min="0" step="0.01" placeholder="0.00"
                                        value={form.brokerageRate || ''}
                                        onChange={(e) => setForm({ ...form, brokerageRate: Number(e.target.value) })} />
                                </Field>
                                <Field>
                                    <Label>Brokerage Unit</Label>
                                    <Select value={form.brokerageUnit}
                                        onChange={(e) => setForm({ ...form, brokerageUnit: e.target.value as any })}>
                                        <option value="PER_BAG">Per Bag</option>
                                        <option value="PER_QUINTAL">Per Quintal</option>
                                    </Select>
                                </Field>
                            </Row>
                            {(form.baseRateType === 'PD_LOOSE' || form.baseRateType === 'MD_LOOSE') && (
                                <Row>
                                    <Field>
                                        <Label>EGB Rate (₹ per bag)</Label>
                                        <Input type="number" min="0" step="0.01" placeholder="0.00"
                                            value={form.egbRate || ''}
                                            onChange={(e) => setForm({ ...form, egbRate: Number(e.target.value) })} />
                                    </Field>
                                    <Field />
                                </Row>
                            )}
                        </Card>

                        {/* ── LIVE PREVIEW ── */}
                        {totals && (
                            <PreviewCard delay={4}>
                                <SectionTitle>📊 Calculation Preview</SectionTitle>

                                <PreviewRow>
                                    <PreviewLabel>Sute Deduction (not in total)</PreviewLabel>
                                    <PreviewValue style={{ color: '#f87171' }}>−₹{fmt(totals.totalSute)}</PreviewValue>
                                </PreviewRow>
                                <PreviewRow>
                                    <PreviewLabel>Sute Net Weight</PreviewLabel>
                                    <PreviewValue>{fmt(totals.snw)} kg</PreviewValue>
                                </PreviewRow>

                                <Divider />

                                <PreviewRow>
                                    <PreviewLabel>Base Rate Total</PreviewLabel>
                                    <PreviewValue>₹{fmt(totals.base)}</PreviewValue>
                                </PreviewRow>
                                <PreviewRow>
                                    <PreviewLabel>Brokerage Total</PreviewLabel>
                                    <PreviewValue>₹{fmt(totals.brok)}</PreviewValue>
                                </PreviewRow>
                                <PreviewRow>
                                    <PreviewLabel>EGB Total</PreviewLabel>
                                    <PreviewValue>₹{fmt(totals.egb)}</PreviewValue>
                                </PreviewRow>

                                <Divider />

                                <PreviewRow style={{ paddingTop: '4px' }}>
                                    <PreviewLabel style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>TOTAL AMOUNT</PreviewLabel>
                                    <PreviewValue accent>₹{fmt(totals.total)}</PreviewValue>
                                </PreviewRow>

                                <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.75rem', color: '#64748b' }}>
                                    Average: ₹{fmt(totals.avg)} per unit · LF & Hamali added by Manager
                                </div>

                                <Btn variant="success" onClick={handleSave} disabled={saving}
                                    style={{ width: '100%', marginTop: '1rem', padding: '14px' }}>
                                    {saving ? '⏳ Saving...' : '✓ Submit Owner Financial'}
                                </Btn>
                            </PreviewCard>
                        )}
                    </>
                )}
            </Container>
        </Page>
    );
};

export default OwnerFinancialPage;
