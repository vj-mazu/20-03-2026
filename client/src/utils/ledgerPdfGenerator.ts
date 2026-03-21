/**
 * Kunchinittu Ledger PDF Generator
 * Client-side PDF generation for Kunchinittu Ledger reports
 * Matches frontend design exactly with Inward/Outward sections
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// A4 dimensions in mm (portrait)
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 10;

interface LedgerEntry {
    id: number;
    slNo: string;
    date: string;
    movementType: string;
    broker?: string;
    fromLocation?: string;
    toLocation?: string;
    variety?: string;
    bags: number;
    moisture?: number;
    cutting?: string;
    wbNo?: string;
    netWeight: number;
    lorryNumber?: string;
    totalAmount?: number;
    averageRate?: number;
}

interface LedgerData {
    kunchinittu: {
        id: number;
        code: string;
        name?: string;
    };
    warehouse: {
        name: string;
        code?: string;
    };
    variety?: string;
    averageRate?: number;
    summary: {
        inward: { bags: number; netWeight: number };
        outward: { bags: number; netWeight: number };
        remaining: { bags: number; netWeight: number };
    };
    inwardRecords: LedgerEntry[];
    outwardRecords: LedgerEntry[];
}

/**
 * Generate PDF for Kunchinittu Ledger - matches frontend exactly
 */
export const generateKunchinintuLedgerPDF = (
    ledgerData: LedgerData,
    dateRange?: { from?: string; to?: string }
): void => {
    console.log('📊 Generating Kunchinittu Ledger PDF...');

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 297;
    const pageHeight = 210;
    const contentWidth = pageWidth - (MARGIN * 2);

    // Title header
    doc.setFillColor(245, 158, 11); // Amber #f59e0b
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Kunchinittu Ledger - ${ledgerData.kunchinittu.code}`, pageWidth / 2, 12, { align: 'center' });

    let yPos = 28;

    // Kunchinittu Info Box
    doc.setFillColor(248, 249, 250);
    doc.rect(MARGIN, yPos - 4, contentWidth, 18, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(MARGIN, yPos - 4, contentWidth, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Kanchi Nittu Code:`, MARGIN + 5, yPos + 2);
    doc.setFont('helvetica', 'normal');
    doc.text(ledgerData.kunchinittu.code, MARGIN + 45, yPos + 2);

    doc.setFont('helvetica', 'bold');
    doc.text(`Alloted Warehouse:`, MARGIN + 100, yPos + 2);
    doc.setFont('helvetica', 'normal');
    doc.text(ledgerData.warehouse.name || '-', MARGIN + 145, yPos + 2);

    doc.setFont('helvetica', 'bold');
    doc.text(`Alloted Variety:`, MARGIN + 5, yPos + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(ledgerData.variety || 'SUM25 RNR', MARGIN + 40, yPos + 8);

    doc.setFont('helvetica', 'bold');
    doc.text(`Average Rate:`, MARGIN + 100, yPos + 8);
    doc.setFont('helvetica', 'normal');
    const avgRate = ledgerData.averageRate || 0;
    doc.setTextColor(16, 185, 129); // Green for rate
    doc.text(`₹${avgRate.toFixed(2)}/Q`, MARGIN + 135, yPos + 8);
    doc.setTextColor(0, 0, 0);

    yPos += 20;

    // Summary Section
    doc.setFillColor(243, 244, 246);
    doc.rect(MARGIN, yPos, contentWidth, 20, 'F');

    const summaryColWidth = contentWidth / 3;

    // Inward summary
    doc.setFillColor(209, 250, 229); // Light green
    doc.rect(MARGIN, yPos, summaryColWidth, 20, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74); // Green
    doc.text('INWARD', MARGIN + summaryColWidth / 2, yPos + 6, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`${ledgerData.summary.inward.bags} Bags`, MARGIN + summaryColWidth / 2, yPos + 12, { align: 'center' });
    doc.text(`${ledgerData.summary.inward.netWeight.toFixed(2)} kg`, MARGIN + summaryColWidth / 2, yPos + 17, { align: 'center' });

    // Outward summary
    doc.setFillColor(254, 226, 226); // Light red
    doc.rect(MARGIN + summaryColWidth, yPos, summaryColWidth, 20, 'F');
    doc.setTextColor(220, 38, 38); // Red
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('OUTWARD', MARGIN + summaryColWidth + summaryColWidth / 2, yPos + 6, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`${ledgerData.summary.outward.bags} Bags`, MARGIN + summaryColWidth + summaryColWidth / 2, yPos + 12, { align: 'center' });
    doc.text(`${ledgerData.summary.outward.netWeight.toFixed(2)} kg`, MARGIN + summaryColWidth + summaryColWidth / 2, yPos + 17, { align: 'center' });

    // Remaining summary
    doc.setFillColor(254, 243, 199); // Light amber
    doc.rect(MARGIN + summaryColWidth * 2, yPos, summaryColWidth, 20, 'F');
    doc.setTextColor(217, 119, 6); // Amber
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('REMAINING', MARGIN + summaryColWidth * 2 + summaryColWidth / 2, yPos + 6, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`${ledgerData.summary.remaining.bags} Bags`, MARGIN + summaryColWidth * 2 + summaryColWidth / 2, yPos + 12, { align: 'center' });
    doc.text(`${ledgerData.summary.remaining.netWeight.toFixed(2)} kg`, MARGIN + summaryColWidth * 2 + summaryColWidth / 2, yPos + 17, { align: 'center' });

    yPos += 28;

    // Inward Section
    if (ledgerData.inwardRecords && ledgerData.inwardRecords.length > 0) {
        doc.setFillColor(209, 250, 229); // Light green
        doc.rect(MARGIN, yPos - 4, contentWidth, 8, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74);
        doc.text(`Inward (${ledgerData.inwardRecords.length} records)`, MARGIN + 5, yPos + 1);
        yPos += 8;

        // Inward table - matching frontend columns
        const inwardColumns = ['S.No', 'Date', 'Type', 'Broker', 'From', 'To', 'Variety', 'Bags', 'M%', 'Cutting', 'WB No', 'Net Wt', 'Lorry', 'Amount', 'Rate/Q'];

        autoTable(doc, {
            startY: yPos,
            head: [inwardColumns],
            body: ledgerData.inwardRecords.map((r, idx) => [
                (idx + 1).toString(),
                r.date ? new Date(r.date).toLocaleDateString('en-GB') : '-',
                r.movementType || '-',
                r.broker || '-',
                r.fromLocation || '-',
                r.toLocation || '-',
                r.variety || '-',
                r.bags?.toString() || '0',
                r.moisture?.toString() || '-',
                r.cutting || '-',
                r.wbNo || '-',
                r.netWeight?.toFixed(2) || '0.00',
                r.lorryNumber || '-',
                r.totalAmount ? `₹${r.totalAmount.toFixed(0)}` : '-',
                r.averageRate ? `₹${r.averageRate.toFixed(2)}` : '-'
            ]),
            theme: 'grid',
            styles: { fontSize: 6, cellPadding: 1.5 },
            headStyles: { fillColor: [74, 144, 226], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 249, 250] },
            margin: { left: MARGIN, right: MARGIN }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Outward Section
    if (ledgerData.outwardRecords && ledgerData.outwardRecords.length > 0) {
        if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = MARGIN + 10;
        }

        doc.setFillColor(254, 226, 226); // Light red
        doc.rect(MARGIN, yPos - 4, contentWidth, 8, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text(`Outward (${ledgerData.outwardRecords.length} records)`, MARGIN + 5, yPos + 1);
        yPos += 8;

        // Outward table - matching frontend columns
        const outwardColumns = ['S.No', 'Date', 'Type', 'Broker', 'From', 'To', 'Variety', 'Bags', 'M%', 'Cutting', 'WB No', 'Net Wt', 'Lorry', 'Amount', 'Rate/Q'];

        autoTable(doc, {
            startY: yPos,
            head: [outwardColumns],
            body: ledgerData.outwardRecords.map((r, idx) => [
                (idx + 1).toString(),
                r.date ? new Date(r.date).toLocaleDateString('en-GB') : '-',
                r.movementType || '-',
                r.broker || '-',
                r.fromLocation || '-',
                r.toLocation || '-',
                r.variety || '-',
                r.bags?.toString() || '0',
                r.moisture?.toString() || '-',
                r.cutting || '-',
                r.wbNo || '-',
                r.netWeight?.toFixed(2) || '0.00',
                r.lorryNumber || '-',
                r.totalAmount ? `₹${r.totalAmount.toFixed(0)}` : '-',
                r.averageRate ? `₹${r.averageRate.toFixed(2)}` : '-'
            ]),
            theme: 'grid',
            styles: { fontSize: 6, cellPadding: 1.5 },
            headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 249, 250] },
            margin: { left: MARGIN, right: MARGIN }
        });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 5, { align: 'right' });
        doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, MARGIN, pageHeight - 5);
    }

    // Download
    const filename = `Kunchinittu_Ledger_${ledgerData.kunchinittu.code}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    console.log(`✅ PDF Generated: ${filename}`);
};

/**
 * Generate Portrait PDF for Single Kunchinittu - Perfect fit for all columns
 * Small font (5-6pt) to ensure no data overlap
 */
export const generateKunchinintuPortraitPDF = (
    ledgerData: any,
    dateRange?: { from?: string; to?: string }
): void => {
    console.log('📊 Generating Portrait Kunchinittu PDF...');

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = PAGE_WIDTH; // 210mm
    const pageHeight = PAGE_HEIGHT; // 297mm
    const margin = 6; // Smaller margins for portrait
    const contentWidth = pageWidth - (margin * 2);

    // Title header - compact
    doc.setFillColor(74, 144, 226); // Blue #4a90e2
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    const kunchinittuCode = ledgerData.kunchinittu?.code || 'Unknown';
    doc.text(`Kunchinittu Ledger: ${kunchinittuCode}`, pageWidth / 2, 9, { align: 'center' });

    let yPos = 18;

    // Kunchinittu Info - Compact single line
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const warehouseName = ledgerData.warehouse?.name || ledgerData.kunchinittu?.warehouse?.name || '-';
    const varietyName = ledgerData.variety || ledgerData.kunchinittu?.variety?.name || '-';
    const avgRate = ledgerData.averageRate || ledgerData.kunchinittu?.averageRate || 0;

    doc.text(`Warehouse: ${warehouseName}  |  Variety: ${varietyName}  |  Avg Rate: ₹${Number(avgRate).toFixed(2)}/Q`, pageWidth / 2, yPos, { align: 'center' });

    yPos += 6;

    // Summary boxes - ultra compact
    const summaryBoxWidth = contentWidth / 3;
    const summaryBoxHeight = 12;

    // Get summary data
    const summary = ledgerData.summary || ledgerData.totals || {
        inward: { bags: 0, netWeight: 0 },
        outward: { bags: 0, netWeight: 0 },
        remaining: { bags: 0, netWeight: 0 }
    };

    // Inward
    doc.setFillColor(209, 250, 229);
    doc.rect(margin, yPos, summaryBoxWidth, summaryBoxHeight, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('INWARD', margin + summaryBoxWidth / 2, yPos + 4, { align: 'center' });
    doc.setFontSize(7);
    doc.text(`${summary.inward?.bags || 0} Bags | ${(summary.inward?.netWeight || 0).toFixed(0)} kg`, margin + summaryBoxWidth / 2, yPos + 9, { align: 'center' });

    // Outward
    doc.setFillColor(254, 226, 226);
    doc.rect(margin + summaryBoxWidth, yPos, summaryBoxWidth, summaryBoxHeight, 'F');
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('OUTWARD', margin + summaryBoxWidth + summaryBoxWidth / 2, yPos + 4, { align: 'center' });
    doc.setFontSize(7);
    doc.text(`${summary.outward?.bags || 0} Bags | ${(summary.outward?.netWeight || 0).toFixed(0)} kg`, margin + summaryBoxWidth + summaryBoxWidth / 2, yPos + 9, { align: 'center' });

    // Remaining
    doc.setFillColor(254, 243, 199);
    doc.rect(margin + summaryBoxWidth * 2, yPos, summaryBoxWidth, summaryBoxHeight, 'F');
    doc.setTextColor(217, 119, 6);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('REMAINING', margin + summaryBoxWidth * 2 + summaryBoxWidth / 2, yPos + 4, { align: 'center' });
    doc.setFontSize(7);
    doc.text(`${summary.remaining?.bags || 0} Bags | ${(summary.remaining?.netWeight || 0).toFixed(0)} kg`, margin + summaryBoxWidth * 2 + summaryBoxWidth / 2, yPos + 9, { align: 'center' });

    yPos += summaryBoxHeight + 5;

    // Portrait column widths - optimized to fit 198mm (210 - 2*6)
    // Total: 198mm = 8+18+15+22+16+16+18+10+8+12+16+14+25 = 198mm
    const columnWidths = [8, 18, 15, 22, 16, 16, 18, 10, 8, 12, 16, 14, 25];

    const portraitColumns = ['#', 'Date', 'Type', 'Broker', 'From', 'To', 'Variety', 'Bags', 'M%', 'Cut', 'Net Wt', 'WB', 'Lorry'];

    // Inward Section
    const inwardRecords = ledgerData.inwardRecords || ledgerData.transactions?.inward || [];
    if (inwardRecords.length > 0) {
        doc.setFillColor(209, 250, 229);
        doc.rect(margin, yPos - 2, contentWidth, 6, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74);
        doc.text(`▼ INWARD (${inwardRecords.length} records)`, margin + 2, yPos + 2);
        yPos += 6;

        autoTable(doc, {
            startY: yPos,
            head: [portraitColumns],
            body: inwardRecords.map((r: any, idx: number) => [
                (idx + 1).toString(),
                r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-',
                (r.movementType || '-').substring(0, 8),
                (r.broker || '-').substring(0, 12),
                (r.fromLocation || r.fromKunchinittu?.code || '-').substring(0, 10),
                (r.toLocation || r.toKunchinittu?.code || kunchinittuCode).substring(0, 10),
                (r.variety || '-').substring(0, 10),
                r.bags?.toString() || '0',
                r.moisture?.toString() || '-',
                (r.cutting || '-').substring(0, 6),
                r.netWeight != null ? Number(r.netWeight).toFixed(0) : '0',
                (r.wbNo || '-').substring(0, 8),
                (r.lorryNumber || '-').substring(0, 12)
            ]),
            theme: 'grid',
            styles: { fontSize: 5, cellPadding: 1, overflow: 'hidden', halign: 'center' },
            headStyles: { fillColor: [74, 144, 226], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 5 },
            alternateRowStyles: { fillColor: [248, 249, 250] },
            columnStyles: {
                0: { cellWidth: columnWidths[0] },
                1: { cellWidth: columnWidths[1] },
                2: { cellWidth: columnWidths[2] },
                3: { cellWidth: columnWidths[3], halign: 'left' },
                4: { cellWidth: columnWidths[4] },
                5: { cellWidth: columnWidths[5] },
                6: { cellWidth: columnWidths[6] },
                7: { cellWidth: columnWidths[7] },
                8: { cellWidth: columnWidths[8] },
                9: { cellWidth: columnWidths[9] },
                10: { cellWidth: columnWidths[10] },
                11: { cellWidth: columnWidths[11] },
                12: { cellWidth: columnWidths[12], halign: 'left' }
            },
            margin: { left: margin, right: margin }
        });

        yPos = (doc as any).lastAutoTable.finalY + 6;
    }

    // Outward Section
    const outwardRecords = ledgerData.outwardRecords || ledgerData.transactions?.outward || [];
    if (outwardRecords.length > 0) {
        // Check if we need a new page
        if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = 10;
        }

        doc.setFillColor(254, 226, 226);
        doc.rect(margin, yPos - 2, contentWidth, 6, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text(`▼ OUTWARD (${outwardRecords.length} records)`, margin + 2, yPos + 2);
        yPos += 6;

        autoTable(doc, {
            startY: yPos,
            head: [portraitColumns],
            body: outwardRecords.map((r: any, idx: number) => [
                (idx + 1).toString(),
                r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-',
                (r.movementType || '-').substring(0, 8),
                (r.broker || '-').substring(0, 12),
                (r.fromLocation || kunchinittuCode || '-').substring(0, 10),
                (r.toLocation || r.outturn?.code || '-').substring(0, 10),
                (r.variety || '-').substring(0, 10),
                r.bags?.toString() || '0',
                r.moisture?.toString() || '-',
                (r.cutting || '-').substring(0, 6),
                r.netWeight != null ? Number(r.netWeight).toFixed(0) : '0',
                (r.wbNo || '-').substring(0, 8),
                (r.lorryNumber || '-').substring(0, 12)
            ]),
            theme: 'grid',
            styles: { fontSize: 5, cellPadding: 1, overflow: 'hidden', halign: 'center' },
            headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 5 },
            alternateRowStyles: { fillColor: [248, 249, 250] },
            columnStyles: {
                0: { cellWidth: columnWidths[0] },
                1: { cellWidth: columnWidths[1] },
                2: { cellWidth: columnWidths[2] },
                3: { cellWidth: columnWidths[3], halign: 'left' },
                4: { cellWidth: columnWidths[4] },
                5: { cellWidth: columnWidths[5] },
                6: { cellWidth: columnWidths[6] },
                7: { cellWidth: columnWidths[7] },
                8: { cellWidth: columnWidths[8] },
                9: { cellWidth: columnWidths[9] },
                10: { cellWidth: columnWidths[10] },
                11: { cellWidth: columnWidths[11] },
                12: { cellWidth: columnWidths[12], halign: 'left' }
            },
            margin: { left: margin, right: margin }
        });
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(6);
        doc.setTextColor(120, 120, 120);
        doc.text(`Page ${i}/${pageCount}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
        doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, margin, pageHeight - 4);
    }

    // Download
    const filename = `${kunchinittuCode}_Ledger_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    console.log(`✅ Portrait PDF Generated: ${filename}`);
};
