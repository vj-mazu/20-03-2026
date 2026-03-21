import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { sampleEntryApi } from '../utils/sampleEntryApi';
import styled from 'styled-components';

const Container = styled.div`
  padding: 2rem;
  background-color: #f4f7f6;
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: #2c3e50;
  margin: 0;
  font-weight: 700;
  letter-spacing: -0.5px;
`;

const TableCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Th = styled.th`
  background-color: #f8fafc;
  color: #64748b;
  font-weight: 600;
  padding: 1rem;
  text-align: center;
  border-bottom: 2px solid #e2e8f0;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
`;

const Td = styled.td`
  padding: 1rem;
  text-align: center;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
`;

const ActionButton = styled.button`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #475569;
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
`;

const SummaryBox = styled.div`
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 4px solid #10b981;
`;

const InventoryEntry: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<any>(null);
    const [kunchinittus, setKunchinittus] = useState<any[]>([]);
    const [outturns, setOutturns] = useState<any[]>([]);
    const [selectedKunchinittuId, setSelectedKunchinittuId] = useState<number | null>(null);
    const [selectedOutturnId, setSelectedOutturnId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        variety: '',
        bags: 0,
        moisture: 0,
        wbNumber: '',
        grossWeight: 0,
        tareWeight: 0,
        location: 'WAREHOUSE' as string
    });

    useEffect(() => {
        loadEntries();
        fetchKunchinittus();
        fetchOutturns();
    }, []);

    const fetchKunchinittus = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get<{ kunchinittus: any[] }>('/locations/kunchinittus', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setKunchinittus(response.data.kunchinittus || []);
        } catch (error) {
            console.error('Error fetching kunchinittus:', error);
        }
    };

    const fetchOutturns = async () => {
        try {
            const response = await axios.get<any[]>('/outturns', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setOutturns(response.data || []);
        } catch (error) {
            console.error('Error fetching outturns:', error);
        }
    };

    const loadEntries = async () => {
        try {
            setLoading(true);
            // Fetch from all statuses to show entries that need additional inventory
            const [physicalResponse, inventoryResponse, ownerFinResponse, managerFinResponse, finalReviewResponse] = await Promise.all([
                sampleEntryApi.getSampleEntriesByRole({ status: 'PHYSICAL_INSPECTION' }),
                sampleEntryApi.getSampleEntriesByRole({ status: 'INVENTORY_ENTRY' }),
                sampleEntryApi.getSampleEntriesByRole({ status: 'OWNER_FINANCIAL' }),
                sampleEntryApi.getSampleEntriesByRole({ status: 'MANAGER_FINANCIAL' }),
                sampleEntryApi.getSampleEntriesByRole({ status: 'FINAL_REVIEW' })
            ]);
            
            const physicalEntries = physicalResponse.data.entries || [];
            const inventoryEntries = inventoryResponse.data.entries || [];
            const ownerFinEntries = ownerFinResponse.data.entries || [];
            const managerFinEntries = managerFinResponse.data.entries || [];
            const finalReviewEntries = finalReviewResponse.data.entries || [];
            
            // Combine entries from all statuses
            const allMap = new Map();
            [...physicalEntries, ...inventoryEntries, ...ownerFinEntries, ...managerFinEntries, ...finalReviewEntries].forEach((entry: any) => {
                allMap.set(entry.id, entry);
            });
            
            // FILTER: Only show entries that have lorries WITHOUT inventory
            const filteredEntries = Array.from(allMap.values()).filter((entry: any) => {
                const inspections = entry.lotAllotment?.physicalInspections || [];
                if (!inspections || inspections.length === 0) return true;
                
                const lorriesWithInventory = inspections.filter((i: any) => i.inventoryData);
                const lorriesWithInventoryNumbers = new Set(lorriesWithInventory.map((i: any) => i.lorryNumber).filter(Boolean));
                
                // Check if there are lorries WITHOUT inventory
                const lorriesWithoutInventory = inspections.filter((i: any) => !lorriesWithInventoryNumbers.has(i.lorryNumber));
                
                return lorriesWithoutInventory.length > 0;
            });
            
            setEntries(filteredEntries);
        } catch (error) {
            showNotification('Failed to load pending lots', 'error');
        } finally {
            setLoading(false);
        }
    };

    const matchingKunchinittus = kunchinittus.filter((k: any) => {
        if (!selectedEntry?.variety) return true;
        const entryVariety = selectedEntry.variety.toLowerCase().trim();
        const kVariety = (k.variety?.name || '').toLowerCase().trim();
        return kVariety && (entryVariety.includes(kVariety) || kVariety.includes(entryVariety));
    });
    const otherKunchinittus = kunchinittus.filter((k: any) => {
        if (!selectedEntry?.variety) return false;
        const entryVariety = selectedEntry.variety.toLowerCase().trim();
        const kVariety = (k.variety?.name || '').toLowerCase().trim();
        return !kVariety || (!entryVariety.includes(kVariety) && !kVariety.includes(entryVariety));
    });

    const matchingOutturns = outturns.filter((o: any) => {
        if (!selectedEntry?.variety) return true;
        const entryVariety = selectedEntry.variety.toLowerCase().trim();
        const oVariety = (o.allottedVariety || '').toLowerCase().trim();
        return !oVariety || entryVariety.includes(oVariety) || oVariety.includes(entryVariety);
    });
    const otherOutturns = outturns.filter((o: any) => {
        if (!selectedEntry?.variety) return false;
        const entryVariety = selectedEntry.variety.toLowerCase().trim();
        const oVariety = (o.allottedVariety || '').toLowerCase().trim();
        return oVariety && !entryVariety.includes(oVariety) && !oVariety.includes(entryVariety);
    });

    const handleOpenModal = (entry: any) => {
        setSelectedEntry(entry);
        setSelectedKunchinittuId(null);
        setSelectedOutturnId(null);
        const inspections = entry.lotAllotment?.physicalInspections || [];
        
        const lorriesWithInventory = inspections.filter((i: any) => i.inventoryData);
        const lorriesWithInventoryNumbers = new Set(lorriesWithInventory.map((i: any) => i.lorryNumber).filter(Boolean));
        
        const bagsWithoutInventory = inspections
            .filter((i: any) => !lorriesWithInventoryNumbers.has(i.lorryNumber))
            .reduce((sum: number, i: any) => sum + (i.bags || 0), 0);

        setFormData({
            date: new Date().toISOString().split('T')[0],
            variety: entry.variety,
            bags: bagsWithoutInventory,
            moisture: entry.qualityParameters?.moisture || 0,
            wbNumber: '',
            grossWeight: 0,
            tareWeight: 0,
            location: 'WAREHOUSE'
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formData.location === 'DIRECT_KUNCHINITTU' && !selectedKunchinittuId) {
                showNotification('Please select a Kunchinittu', 'error');
                return;
            }
            if (formData.location === 'DIRECT_OUTTURN_PRODUCTION' && !selectedOutturnId) {
                showNotification('Please select an Outturn', 'error');
                return;
            }
            
            const inspections = selectedEntry?.lotAllotment?.physicalInspections || [];
            const lorriesWithInventory = inspections.filter((i: any) => i.inventoryData);
            const lorriesWithInventoryNumbers = new Set(lorriesWithInventory.map((i: any) => i.lorryNumber).filter(Boolean));
            const lorriesWithoutInventory = inspections.filter((i: any) => !lorriesWithInventoryNumbers.has(i.lorryNumber));
            
            const physicalInspectionId = lorriesWithoutInventory[0]?.id;
            
            if (!physicalInspectionId) {
                showNotification('No lorries without inventory data found', 'error');
                return;
            }
            
            await sampleEntryApi.createInventoryData(selectedEntry.id, {
                ...formData,
                entryDate: formData.date,
                physicalInspectionId,
                kunchinittuId: formData.location === 'DIRECT_KUNCHINITTU' ? selectedKunchinittuId : null,
                outturnId: formData.location === 'DIRECT_OUTTURN_PRODUCTION' ? selectedOutturnId : null
            });
            showNotification('Inventory data recorded successfully', 'success');
            setSelectedEntry(null);
            loadEntries();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to save inventory data', 'error');
        }
    };

    const netWeight = (formData.grossWeight - formData.tareWeight).toFixed(2);

    return (
        <Container>
            <Header>
                <Title>📦 Inventory Data Entry</Title>
            </Header>

            <TableCard>
                <Table>
                    <thead>
                        <tr>
                            <Th>Date</Th>
                            <Th>Broker</Th>
                            <Th>Variety</Th>
                            <Th>Party</Th>
                            <Th>Location</Th>
                            <Th>Bags</Th>
                            <Th>Lorry No</Th>
                            <Th>Action</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><Td colSpan={8}>Loading...</Td></tr>
                        ) : entries.length === 0 ? (
                            <tr><Td colSpan={8}>No lots pending inventory entry</Td></tr>
                        ) : (
                            entries.map((entry) => (
                                <tr key={entry.id}>
                                    <Td>{new Date(entry.entryDate).toLocaleDateString()}</Td>
                                    <Td>{entry.brokerName}</Td>
                                    <Td>{entry.variety}</Td>
                                    <Td>{entry.partyName}</Td>
                                    <Td>{entry.location}</Td>
                                    <Td>
                                        {(() => {
                                            const inspections = entry.lotAllotment?.physicalInspections || [];
                                            const lotAllotment = entry.lotAllotment as any;
                                            if (lotAllotment?.closedAt) {
                                                return <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                                                    {lotAllotment.inspectedBags} (CLOSED)
                                                </span>;
                                            }
                                            
                                            const lorriesWithInventory = inspections.filter((i: any) => i.inventoryData);
                                            const lorriesWithInventoryNumbers = new Set(lorriesWithInventory.map((i: any) => i.lorryNumber).filter(Boolean));
                                            
                                            const bagsWithoutInventory = inspections
                                                .filter((i: any) => !lorriesWithInventoryNumbers.has(i.lorryNumber))
                                                .reduce((sum: number, i: any) => sum + (i.bags || 0), 0);
                                            
                                            return bagsWithoutInventory > 0 ? bagsWithoutInventory : '-';
                                        })()}
                                    </Td>
                                    <Td>
                                        {(() => {
                                            const inspections = entry.lotAllotment?.physicalInspections || [];
                                            const lorriesWithInventory = entry.lotAllotment?.physicalInspections?.filter((i: any) => i.inventoryData) || [];
                                            const lorriesWithInventoryNumbers = new Set(lorriesWithInventory.map((i: any) => i.lorryNumber).filter(Boolean));
                                            
                                            const lorriesWithoutInventory = inspections.filter((i: any) => !lorriesWithInventoryNumbers.has(i.lorryNumber));
                                            
                                            const lorryNumbers = lorriesWithoutInventory
                                                .map((i: any) => i.lorryNumber)
                                                .filter(Boolean);
                                            
                                            if (lorryNumbers.length > 0) {
                                                return lorryNumbers.join(', ');
                                            }
                                            return '-';
                                        })()}
                                    </Td>
                                    <Td>
                                        <ActionButton onClick={() => handleOpenModal(entry)}>
                                            Record Weight
                                        </ActionButton>
                                    </Td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </TableCard>

            {selectedEntry && (
                <ModalOverlay onClick={() => setSelectedEntry(null)}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <Title style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>
                            Record Inventory: {selectedEntry.variety} ({selectedEntry.partyName})
                        </Title>

                        <form onSubmit={handleSubmit}>
                            <Grid>
                                <FormGroup>
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
                                </FormGroup>
                                <FormGroup>
                                    <Label>WB Number</Label>
                                    <Input
                                        type="text"
                                        placeholder="Enter WB Number"
                                        value={formData.wbNumber}
                                        onChange={e => setFormData({ ...formData, wbNumber: e.target.value })}
                                        required
                                    />
                                </FormGroup>
                            </Grid>

                            <Grid>
                                <FormGroup>
                                    <Label>Bags</Label>
                                    <Input
                                        type="number"
                                        value={formData.bags}
                                        onChange={e => setFormData({ ...formData, bags: Number(e.target.value) })}
                                        required
                                    />
                                </FormGroup>
                                <FormGroup>
                                    <Label>Moisture (%)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.moisture}
                                        onChange={e => setFormData({ ...formData, moisture: Number(e.target.value) })}
                                        required
                                    />
                                </FormGroup>
                            </Grid>

                            <Grid>
                                <FormGroup>
                                    <Label>Gross Weight (kg)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.grossWeight}
                                        onChange={e => setFormData({ ...formData, grossWeight: Number(e.target.value) })}
                                        required
                                    />
                                </FormGroup>
                                <FormGroup>
                                    <Label>Tare Weight (kg)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.tareWeight}
                                        onChange={e => setFormData({ ...formData, tareWeight: Number(e.target.value) })}
                                        required
                                    />
                                </FormGroup>
                            </Grid>

                            <SummaryBox>
                                <div>
                                    <span style={{ color: '#64748b', fontSize: '14px' }}>Calculated Net Weight: </span>
                                    <span style={{ color: '#10b981', fontSize: '18px', fontWeight: '800' }}>{netWeight} kg</span>
                                </div>
                            </SummaryBox>

                            <FormGroup>
                                <Label>Storage Location</Label>
                                <Select
                                    value={formData.location}
                                    onChange={e => {
                                        setFormData({ ...formData, location: e.target.value });
                                        setSelectedKunchinittuId(null);
                                        setSelectedOutturnId(null);
                                    }}
                                >
                                    <option value="WAREHOUSE">Warehouse</option>
                                    <option value="DIRECT_KUNCHINITTU">Direct Kunchinittu</option>
                                    <option value="DIRECT_OUTTURN_PRODUCTION">Direct Outturn/Production</option>
                                </Select>
                            </FormGroup>

                            {formData.location === 'DIRECT_KUNCHINITTU' && (
                                <FormGroup>
                                    <Label>Select Kunchinittu {selectedEntry?.variety ? <span style={{ color: '#10b981', fontSize: '12px' }}>(Variety: {selectedEntry.variety})</span> : ''}</Label>
                                    <Select
                                        value={selectedKunchinittuId || ''}
                                        onChange={e => setSelectedKunchinittuId(Number(e.target.value) || null)}
                                        required
                                    >
                                        <option value="">-- Select Kunchinittu --</option>
                                        {matchingKunchinittus.length > 0 && (
                                            <optgroup label={`✅ Matching variety (${selectedEntry?.variety || ''})`}>
                                                {matchingKunchinittus.map((k: any) => (
                                                    <option key={k.id} value={k.id}>
                                                        {k.name} | {k.variety?.name || 'No variety'} {k.warehouse?.name ? `| WH: ${k.warehouse.name}` : ''}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                        {otherKunchinittus.length > 0 && (
                                            <optgroup label="⚠️ Other varieties (will be rejected)">
                                                {otherKunchinittus.map((k: any) => (
                                                    <option key={k.id} value={k.id} style={{ color: '#999' }}>
                                                        {k.name} | {k.variety?.name || 'No variety'} {k.warehouse?.name ? `| WH: ${k.warehouse.name}` : ''}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </Select>
                                    {matchingKunchinittus.length === 0 && (
                                        <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>⚠️ No kunchinittus match variety "{selectedEntry?.variety}".</div>
                                    )}
                                </FormGroup>
                            )}

                            {formData.location === 'DIRECT_OUTTURN_PRODUCTION' && (
                                <FormGroup>
                                    <Label>Select Outturn {selectedEntry?.variety ? <span style={{ color: '#10b981', fontSize: '12px' }}>(Variety: {selectedEntry.variety})</span> : ''}</Label>
                                    <Select
                                        value={selectedOutturnId || ''}
                                        onChange={e => setSelectedOutturnId(Number(e.target.value) || null)}
                                        required
                                    >
                                        <option value="">-- Select Outturn --</option>
                                        {matchingOutturns.length > 0 && (
                                            <optgroup label={`✅ Matching variety (${selectedEntry?.variety || ''})`}>
                                                {matchingOutturns.map((o: any) => (
                                                    <option key={o.id} value={o.id}>
                                                        {o.outturnNumber || o.code} - {o.allottedVariety || o.variety || 'No variety'}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                        {otherOutturns.length > 0 && (
                                            <optgroup label="⚠️ Other varieties (will be rejected)">
                                                {otherOutturns.map((o: any) => (
                                                    <option key={o.id} value={o.id} style={{ color: '#999' }}>
                                                        {o.outturnNumber || o.code} - {o.allottedVariety || o.variety || 'No variety'}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </Select>
                                </FormGroup>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <ActionButton type="submit" style={{ flex: 2 }}>
                                    Save Inventory Record
                                </ActionButton>
                                <ActionButton
                                    type="button"
                                    onClick={() => setSelectedEntry(null)}
                                    style={{ flex: 1, background: '#e2e8f0', color: '#475569' }}
                                >
                                    Cancel
                                </ActionButton>
                            </div>
                        </form>
                    </ModalContent>
                </ModalOverlay>
            )}
        </Container>
    );
};

export default InventoryEntry;
