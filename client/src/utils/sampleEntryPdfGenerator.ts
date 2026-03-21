/**
 * Professional PDF Generator for Staff Sample Entry Book
 * Enhanced for exact frontend design matching with anti-overlap optimization
 * Handles large datasets with high performance using chunked processing
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// A4 dimensions in mm (Portrait as requested)
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 8;

// Font sizes
const HEADING_SIZE = 12;
const SUBHEADING_SIZE = 10;
const CONTENT_SIZE = 7; 
const SMALL_SIZE = 6;

// Colors
const PADDY_HEADER_BG: [number, number, number] = [26, 35, 126]; // #1a237e
const RICE_HEADER_BG: [number, number, number] = [74, 20, 140];  // #4a148c
const HEADER_TEXT: [number, number, number] = [255, 255, 255];
const ALTERNATE_ROW: [number, number, number] = [248, 249, 250];

// Chunk size for large dataset processing
const CHUNK_SIZE = 5000;

interface PDFOptions {
    title: string;
    subtitle?: string;
    dateRange?: string;
    entryType: 'PADDY' | 'RICE';
    companyName?: string;
}

/**
 * Cross-browser PDF download helper
 */
function savePDFWithFallback(doc: jsPDF, filename: string): void {
    try {
        doc.save(filename);
    } catch (saveError) {
        console.warn('Native PDF save failed, trying blob fallback...', saveError);
        try {
            const blob = doc.output('blob');
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } catch (blobError) {
            console.error('PDF download failed:', blobError);
        }
    }
}

/**
 * Helper to match frontend filtering logic for quality status
 */
const hasAlphaOrPositiveValue = (val: any) => {
  if (val === null || val === undefined || val === '') return false;
  const raw = String(val).trim();
  if (!raw) return false;
  if (/[a-zA-Z]/.test(raw)) return true;
  const num = parseFloat(raw);
  return Number.isFinite(num);
};

/**
 * To Title Case Helper
 */
const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

/**
 * Main export for Sample Entry PDF Generation (Portrait Mode)
 */
export const generateSampleEntryPDF = (
    records: any[],
    options: PDFOptions
): void => {
    const isRice = options.entryType === 'RICE';
    const headerBg = isRice ? RICE_HEADER_BG : PADDY_HEADER_BG;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Header logic
    doc.setFontSize(HEADING_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(options.companyName || 'KUF', MARGIN, 15);
    
    doc.setFontSize(SUBHEADING_SIZE);
    doc.text(options.title, MARGIN, 22);

    if (options.dateRange) {
        doc.setFontSize(SMALL_SIZE);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Period: ${options.dateRange}`, MARGIN, 27);
    }

    doc.setFontSize(SMALL_SIZE);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, PAGE_WIDTH - MARGIN - 40, 15);
    doc.text(`Total Records: ${records.length}`, PAGE_WIDTH - MARGIN - 40, 20);

    // Sorting logic (Initial sort by date descending)
    // Avoid large spreads [...] to save memory
    records.sort((a, b) => {
        return new Date(b.entryDate || 0).getTime() - new Date(a.entryDate || 0).getTime();
    });

    // Grouping logic (Matches frontend) - Using Map for better performance with millions of records
    const grouped = new Map<string, Map<string, any[]>>();
    
    for (const entry of records) {
        const d = new Date(entry.entryDate);
        const dateKey = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        const brokerKey = entry.brokerName || 'Unknown';
        
        let dateMap = grouped.get(dateKey);
        if (!dateMap) {
            dateMap = new Map<string, any[]>();
            grouped.set(dateKey, dateMap);
        }
        
        let brokerGroup = dateMap.get(brokerKey);
        if (!brokerGroup) {
            brokerGroup = [];
            dateMap.set(brokerKey, brokerGroup);
        }
        brokerGroup.push(entry);
    }

    const columns = [
        { header: 'SL No', dataKey: 'slNo' },
        { header: 'Type', dataKey: 'type' },
        { header: 'Bags', dataKey: 'bags' },
        { header: 'Pkg', dataKey: 'pkg' },
        { header: 'Party Name', dataKey: 'partyName' },
        { header: isRice ? 'Rice Location' : 'Paddy Location', dataKey: 'location' },
        { header: 'Variety', dataKey: 'variety' },
        { header: 'Sample Reports', dataKey: 'reports' },
        { header: 'Sample Collected By', dataKey: 'collectedBy' }
    ];

    let currentY = 32;

    // Sorting dates (Keys from Map)
    const sortedDateKeys = Array.from(grouped.keys()).sort((a, b) => {
        const [da, ma, ya] = a.split('-').map(Number);
        const [db, mb, yb] = b.split('-').map(Number);
        return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
    });

    for (const dateKey of sortedDateKeys) {
        const dateMap = grouped.get(dateKey)!;
        const sortedBrokers = Array.from(dateMap.keys()).sort((a, b) => a.localeCompare(b));

        // Check for page overflow before Date Header
        if (currentY > PAGE_HEIGHT - 35) {
            doc.addPage();
            currentY = MARGIN;
        }

        // Date Header (Dark Bar)
        doc.setFillColor(26, 26, 46);
        doc.rect(MARGIN, currentY, PAGE_WIDTH - 2 * MARGIN, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${dateKey} ${isRice ? 'Rice Sample' : 'Paddy Sample'}`, PAGE_WIDTH / 2, currentY + 5.5, { align: 'center' });
        currentY += 8;

        for (const brokerName of sortedBrokers) {
            const brokerEntries = dateMap.get(brokerName)!;

            // Check for page overflow before Broker Header
            if (currentY > PAGE_HEIGHT - 25) {
                doc.addPage();
                currentY = MARGIN;
            }

            // Broker Bar (Light Grey Bar)
            doc.setFillColor(232, 234, 246);
            doc.rect(MARGIN, currentY, PAGE_WIDTH - 2 * MARGIN, 7, 'F');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(`${toTitleCase(brokerName)}`, MARGIN + 2, currentY + 5);
            currentY += 7;

            // Sort entries within broker group
            brokerEntries.sort((a, b) => {
                const serialA = Number(a.serialNo) || 0;
                const serialB = Number(b.serialNo) || 0;
                if (serialA !== serialB) return serialA - serialB;
                return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            });

            const tableData = brokerEntries.map((entry, index) => {
                const pkg = String(entry.packaging || '75');
                const pkgDisplay = pkg.toLowerCase() === 'loose' ? 'Loose' : `${pkg} Kg`;
                
                const qp = entry.qualityParameters;
                const hasQuality = qp && qp.moisture != null && (
                  (qp.cutting1 && Number(qp.cutting1) !== 0) ||
                  (qp.bend1 && Number(qp.bend1) !== 0) ||
                  hasAlphaOrPositiveValue(qp.mix)
                );
                const has100Grams = entry.entryType !== 'RICE_SAMPLE' && qp && qp.moisture != null && qp.grainsCount != null && !hasQuality;

                let statusText = '-';
                if (has100Grams) {
                    statusText = '100-Gms Completed';
                } else if (hasQuality) {
                    statusText = 'Quality Completed';
                } else if (qp && qp.moisture != null) {
                    statusText = `M: ${qp.moisture}%`;
                }

                const party = toTitleCase((entry.partyName || '').trim());
                const lorry = (entry.lorryNumber ? String(entry.lorryNumber).toUpperCase() : '');
                let partyDisplay = party;
                if (entry.entryType === 'DIRECT_LOADED_VEHICLE') {
                    partyDisplay = lorry ? (party ? `${party} (${lorry})` : lorry) : party || '-';
                } else {
                    partyDisplay = party || lorry || '-';
                }

                return {
                    slNo: index + 1,
                    type: entry.entryType === 'DIRECT_LOADED_VEHICLE' ? 'RL' : entry.entryType === 'LOCATION_SAMPLE' ? 'LS' : entry.entryType === 'RICE_SAMPLE' ? 'RS' : 'MS',
                    bags: entry.bags?.toLocaleString('en-IN') || '0',
                    pkg: pkgDisplay,
                    partyName: partyDisplay,
                    location: toTitleCase(entry.location || ''),
                    variety: toTitleCase(entry.variety || ''),
                    reports: statusText,
                    collectedBy: toTitleCase(entry.sampleCollectedBy || '-')
                };
            });

            // Draw Table
            autoTable(doc, {
                startY: currentY,
                head: [columns.map(c => c.header)],
                body: tableData.map(row => columns.map(c => (row as any)[c.dataKey])),
                theme: 'grid',
                styles: {
                    fontSize: CONTENT_SIZE,
                    cellPadding: 1,
                    overflow: 'linebreak',
                    valign: 'middle',
                    halign: 'left'
                },
                headStyles: {
                    fillColor: headerBg,
                    textColor: HEADER_TEXT,
                    fontStyle: 'bold',
                    halign: 'left'
                },
                columnStyles: {
                    0: { cellWidth: 8, halign: 'center' },  // SL No
                    1: { cellWidth: 8, halign: 'center' },  // Type
                    2: { cellWidth: 12, halign: 'center' }, // Bags
                    3: { cellWidth: 12, halign: 'center' }, // Pkg
                    4: { cellWidth: 35, halign: 'left' },   // Party Name
                    5: { cellWidth: 25, halign: 'left' },   // Location
                    6: { cellWidth: 25, halign: 'left' },   // Variety
                    7: { cellWidth: 45, halign: 'left' },   // Reports
                    8: { cellWidth: 24, halign: 'left' }    // Collected By
                },
                margin: { left: MARGIN, right: MARGIN },
                didParseCell: (data) => {
                    // Center align specific Headers as requested
                    if (data.section === 'head' && (data.column.index === 0 || data.column.index === 1 || data.column.index === 2 || data.column.index === 3)) {
                        data.cell.styles.halign = 'center';
                    }
                    
                    // Add padding for status icons in Sample Reports column
                    if (data.section === 'body' && data.column.index === 7) {
                        const cellText = (data.cell.text[0] || '').trim();
                        if (cellText === 'Quality Completed' || cellText === '100-Gms Completed') {
                            data.cell.text[0] = '      ' + cellText;
                        }
                    }
                },
                didDrawCell: (data) => {
                    if (data.section === 'body' && data.column.index === 7) {
                        const cellText = (data.cell.text[0] || '').trim();
                        if (cellText === 'Quality Completed' || cellText === '100-Gms Completed') {
                            const pdf = data.doc;
                            const cellX = data.cell.x;
                            const cellY = data.cell.y;
                            const h = data.cell.height;
                            
                            // Vector checkmark/icon logic
                            pdf.setLineWidth(0.3);
                            if (cellText === 'Quality Completed') {
                                pdf.setDrawColor(0, 150, 0); // Green
                                // Draw more to the left to avoid text overlap
                                pdf.line(cellX + 1.2, cellY + h / 2, cellX + 2.4, cellY + h / 2 + 1.2);
                                pdf.line(cellX + 2.4, cellY + h / 2 + 1.2, cellX + 4.4, cellY + h / 2 - 1.8);
                            } else if (cellText === '100-Gms Completed') {
                                pdf.setDrawColor(255, 140, 0); // Orange
                                pdf.line(cellX + 2.5, cellY + h / 2 - 2, cellX + 1.5, cellY + h / 2);
                                pdf.line(cellX + 1.5, cellY + h / 2, cellX + 3.5, cellY + h / 2);
                                pdf.line(cellX + 3.5, cellY + h / 2, cellX + 2.5, cellY + h / 2 + 2);
                            }
                        }
                    }
                },
                didDrawPage: (data) => {
                    const pageCount = doc.getNumberOfPages();
                    doc.setFontSize(SMALL_SIZE);
                    doc.setTextColor(150, 150, 150);
                    doc.text(`Page ${pageCount}`, PAGE_WIDTH - MARGIN - 15, PAGE_HEIGHT - 5);
                }
            });

            currentY = (doc as any).lastAutoTable.finalY + 5;
        }
    }

    const filenameBase = options.entryType === 'PADDY' ? 'Paddy_SampleBook' : 'Rice_SampleBook';
    const dateStr = new Date().toISOString().split('T')[0].split('-').join('');
    const filename = `${filenameBase}_${dateStr}.pdf`;
    savePDFWithFallback(doc, filename);
};
