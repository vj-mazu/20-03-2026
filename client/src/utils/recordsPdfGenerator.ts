/**
 * Professional PDF Generator for Records Section
 * Enhanced for exact frontend design matching with anti-overlap optimization
 * Handles large datasets (10 lakh+ records) with high performance
 * Uses jsPDF with autoTable for perfect A4 landscape layout
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// A4 dimensions in mm (landscape for more columns)
const PAGE_WIDTH_LANDSCAPE = 297;
const PAGE_HEIGHT_LANDSCAPE = 210;
const PAGE_WIDTH_PORTRAIT = 210;
const PAGE_HEIGHT_PORTRAIT = 297;
const MARGIN = 8;

// Font sizes - smaller for dense data to prevent overlap
const HEADING_SIZE = 12;
const SUBHEADING_SIZE = 10;
const CONTENT_SIZE = 6.5; // Reduced from 7 to prevent overlap
const SMALL_SIZE = 5.5;   // Reduced from 6 for 15-column support

// Colors - typed as RGB tuples
const HEADER_BG: [number, number, number] = [68, 114, 196]; // #4472C4
const HEADER_TEXT: [number, number, number] = [255, 255, 255];
const ALTERNATE_ROW: [number, number, number] = [248, 249, 250];
const GREEN_BG: [number, number, number] = [209, 250, 229]; // #d1fae5 - Purchase
const RED_BG: [number, number, number] = [254, 226, 226];   // #fee2e2 - Sale
const YELLOW_BG: [number, number, number] = [254, 243, 199]; // #fef3c7 - Palti
const PURPLE_BG: [number, number, number] = [235, 225, 255]; // Shifting row (lighter)
const BLUE_BG: [number, number, number] = [219, 234, 254];   // Production

// Chunk size for large dataset processing
const CHUNK_SIZE = 5000;

/**
 * Cross-browser PDF download helper with fallback mechanisms
 * Handles various browser environments and provides fallback for production
 */
function savePDFWithFallback(doc: jsPDF, filename: string): void {
    console.log(`📥 Attempting to download PDF: ${filename}`);

    try {
        // Method 1: Try native jsPDF save (works in most browsers)
        doc.save(filename);
        console.log(`✅ PDF saved successfully via native method`);
    } catch (saveError) {
        console.warn('⚠️ Native PDF save failed, trying fallback methods...', saveError);

        try {
            // Method 2: Create blob and download via link element
            const blob = doc.output('blob');
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);

            // Trigger click
            link.click();

            // Cleanup after short delay
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);

            console.log(`✅ PDF saved successfully via blob download`);
        } catch (blobError) {
            console.warn('⚠️ Blob download failed, trying data URL fallback...', blobError);

            try {
                // Method 3: Open PDF in new tab using data URL (last resort)
                const pdfDataUrl = doc.output('dataurlstring');
                const newWindow = window.open(pdfDataUrl, '_blank');

                if (newWindow) {
                    console.log(`✅ PDF opened in new tab (please save manually)`);
                } else {
                    // Pop-up was blocked, provide direct download link
                    console.error('❌ Pop-up blocked. Creating download link...');
                    const downloadLink = document.createElement('a');
                    downloadLink.href = pdfDataUrl;
                    downloadLink.download = filename;
                    downloadLink.click();
                }
            } catch (fallbackError) {
                console.error('❌ All PDF download methods failed:', fallbackError);
                throw new Error('PDF download failed. Please try again or use a different browser.');
            }
        }
    }
}

interface PDFOptions {
    title: string;
    subtitle?: string;
    dateRange?: string;
    filterType?: 'all' | 'day' | 'week' | 'month';
    targetDate?: string;  // For single-date filtering (YYYY-MM-DD format)
    companyName?: string;
    reportDate?: string;
}

interface ColumnDef {
    header: string;
    dataKey: string;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    halign?: 'left' | 'center' | 'right';
}

// Common table styles to prevent overlap
const getBaseTableStyles = () => ({
    fontSize: CONTENT_SIZE,
    cellPadding: 1.5,
    overflow: 'linebreak' as const,
    cellWidth: 'wrap' as const,
    minCellHeight: 5,
    valign: 'middle' as const,
    halign: 'left' as const
});

// Enhanced header styles
const getHeaderStyles = () => ({
    fillColor: HEADER_BG,
    textColor: HEADER_TEXT,
    fontStyle: 'bold' as const,
    fontSize: CONTENT_SIZE,
    cellPadding: 1.5,
    halign: 'center' as const,
    valign: 'middle' as const,
    lineWidth: 0.1,
    lineColor: [200, 200, 200] as [number, number, number]
});

/**
 * Process large dataset in chunks to prevent memory issues
 */
function processInChunks<T, R>(data: T[], processor: (item: T, index: number) => R): R[] {
    const results: R[] = [];
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        chunk.forEach((item, idx) => {
            results.push(processor(item, i + idx));
        });
        if (i > 0 && i % 10000 === 0) {
            console.log(`📊 PDF: Processed ${i} of ${data.length} records`);
        }
    }
    return results;
}

/**
 * Generate PDF for All Arrivals tab - PORTRAIT MODE - Exact frontend column match
 */
export const generateArrivalsPDF = (
    records: any[],
    options: PDFOptions
): void => {
    console.log(`📊 PDF Export: Processing ${records.length} Arrivals records (PORTRAIT)`);

    // PORTRAIT orientation
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, options, records.length, 'portrait');

    // Columns optimized for portrait mode
    const columns: ColumnDef[] = [
        { header: 'Sl', dataKey: 'slNo', width: 7 },
        { header: 'Date', dataKey: 'date', width: 12 },
        { header: 'Type', dataKey: 'movementType', width: 14 },
        { header: 'Broker', dataKey: 'broker', width: 14 },
        { header: 'From', dataKey: 'from', width: 16 },
        { header: 'ToKN', dataKey: 'toKn', width: 12 },
        { header: 'ToWH', dataKey: 'toWh', width: 12 },
        { header: 'OUT', dataKey: 'outturn', width: 10 },
        { header: 'Variety', dataKey: 'variety', width: 18 },
        { header: 'Bags', dataKey: 'bags', width: 10 },
        { header: 'M%', dataKey: 'moisture', width: 8 },
        { header: 'Cut', dataKey: 'cutting', width: 8 },
        { header: 'WB', dataKey: 'wbNo', width: 10 },
        { header: 'Gross', dataKey: 'grossWeight', width: 12 },
        { header: 'Tare', dataKey: 'tareWeight', width: 10 },
        { header: 'Net', dataKey: 'netWeight', width: 12 },
        { header: 'Lorry', dataKey: 'lorryNumber', width: 12 }
    ];

    const tableData = processInChunks(records, (record, index) => ({
        slNo: index + 1,
        date: formatDate(record.date),
        movementType: formatMovementType(record.movementType),
        broker: truncateText(record.broker || '-', 12),
        from: truncateText(getFromLocation(record), 14),
        toKn: record.toKunchinittu?.code || '-',
        toWh: record.toWarehouse?.code || record.toWarehouseShift?.code || '-',
        outturn: record.outturn?.code || '-',
        variety: truncateText(record.variety || '-', 16),
        bags: record.bags || 0,
        moisture: record.moisture ? `${record.moisture}%` : '-',
        cutting: record.cutting || '-',
        wbNo: record.wbNo || '-',
        grossWeight: formatNumber(record.grossWeight),
        tareWeight: formatNumber(record.tareWeight),
        netWeight: formatNumber(record.netWeight),
        lorryNumber: (record.lorryNumber || '-').toUpperCase()
    }));

    generateOptimizedTable(doc, columns, tableData, 35, records, 'portrait');

    // Add totals summary
    const totalBags = records.reduce((sum, r) => sum + (r.bags || 0), 0);
    const totalWeight = records.reduce((sum, r) => sum + (parseFloat(r.netWeight) || 0), 0);

    addSummary(doc, [
        { label: 'Total Records', value: records.length.toString() },
        { label: 'Total Bags', value: totalBags.toLocaleString() },
        { label: 'Total Weight', value: `${formatNumber(totalWeight)} kg` }
    ], 'portrait');

    addFooter(doc, options, 'portrait');

    const filename = `Arrivals_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename} with ${records.length} records across ${doc.getNumberOfPages()} pages`);
};

/**
 * Generate PDF for Purchase tab - PORTRAIT MODE with very small font
 * 18 columns optimized for portrait A4 with no word-wrapping
 */
export const generatePurchasePDF = (
    records: any[],
    options: PDFOptions
): void => {
    console.log(`📊 PDF Export: Processing ${records.length} Purchase records (PORTRAIT-COMPACT)`);

    // PORTRAIT orientation with minimal margins
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, { ...options, title: options.title || 'Purchase Records Report' }, records.length, 'portrait');

    // 18 columns for portrait A4 (210mm - 10mm margins = 200mm usable)
    // Prioritize last 3 columns (Amount, Total, Rate) with more width
    const columns: ColumnDef[] = [
        { header: 'Sl', dataKey: 'slNo', width: 5, halign: 'center' },
        { header: 'Date', dataKey: 'date', width: 11, halign: 'center' },
        { header: 'Type', dataKey: 'type', width: 8, halign: 'center' },
        { header: 'Broker', dataKey: 'broker', width: 12, halign: 'center' },
        { header: 'From', dataKey: 'from', width: 8, halign: 'center' },
        { header: 'To', dataKey: 'to', width: 10, halign: 'center' },
        { header: 'Variety', dataKey: 'variety', width: 10, halign: 'center' },
        { header: 'Bags', dataKey: 'bags', width: 7, halign: 'center' },
        { header: 'M%', dataKey: 'moisture', width: 7, halign: 'center' },
        { header: 'Cut', dataKey: 'cutting', width: 7, halign: 'center' },
        { header: 'WB', dataKey: 'wbNo', width: 8, halign: 'center' },
        { header: 'Gross', dataKey: 'grossWeight', width: 11, halign: 'center' },
        { header: 'Tare', dataKey: 'tareWeight', width: 9, halign: 'center' },
        { header: 'Net', dataKey: 'netWeight', width: 11, halign: 'center' },
        { header: 'Lorry', dataKey: 'lorryNumber', width: 11, halign: 'center' },
        { header: 'Amount', dataKey: 'amountFormula', width: 20, halign: 'center' },
        { header: 'Total', dataKey: 'totalAmount', width: 18, halign: 'center' },
        { header: 'Rate', dataKey: 'avgRate', width: 13, halign: 'center' }
    ];

    const tableData = processInChunks(records, (record, index) => {
        const purchaseRate = record.purchaseRate || {};
        const totalAmount = purchaseRate.totalAmount || record.totalAmount || 0;
        const avgRate = purchaseRate.averageRate || record.averageRate || 0;
        const amountFormula = purchaseRate.amountFormula || record.amountFormula || '';

        // Compact destination display
        const destination = record.outturnId
            ? `P(${record.outturn?.code || 'OUT'})`
            : record.toKunchinittu?.code && record.toWarehouse?.code
                ? `${record.toKunchinittu.code}-${record.toWarehouse.code}`
                : record.toKunchinittu?.code || record.toWarehouse?.code || '-';

        return {
            slNo: index + 1,
            date: formatDate(record.date),
            type: 'Purchase',
            broker: record.broker || '-',
            from: record.fromLocation || '-',
            to: destination,
            variety: record.variety || '-',
            bags: record.bags || 0,
            moisture: record.moisture ? `${record.moisture}%` : '-',
            cutting: record.cutting || '-',
            wbNo: record.wbNo || '-',
            grossWeight: formatNumber(record.grossWeight),
            tareWeight: formatNumber(record.tareWeight),
            netWeight: formatNumber(record.netWeight),
            lorryNumber: (record.lorryNumber || '-').toUpperCase(),
            amountFormula: amountFormula || '-',
            totalAmount: totalAmount > 0 ? `₹${Number(totalAmount).toLocaleString('en-IN')}` : '-',
            avgRate: avgRate > 0 ? `₹${Number(avgRate).toFixed(0)}` : '-'
        };
    });

    // Generate table with AUTO column sizing - columns adjust to content
    autoTable(doc, {
        startY: 35,
        head: [columns.map(c => c.header)],
        body: tableData.map((row) => columns.map(c => (row as any)[c.dataKey])),
        theme: 'grid',
        styles: {
            fontSize: 5, // Small font for 18 columns
            cellPadding: 1.5,
            lineWidth: 0.1,
            lineColor: [200, 200, 200],
            overflow: 'linebreak', // Wrap text so no data is lost
            halign: 'center', // Center all data
            valign: 'middle'
        },
        headStyles: {
            fillColor: HEADER_BG,
            textColor: HEADER_TEXT,
            fontSize: 5.5,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            cellPadding: 2
        },
        alternateRowStyles: {
            fillColor: ALTERNATE_ROW
        },
        columnStyles: {
            // Very compact fixed columns (total: ~115mm) to leave ~75mm for last 3 auto columns
            0: { cellWidth: 5, halign: 'center' },   // Sl
            1: { cellWidth: 10, halign: 'center' },  // Date
            2: { cellWidth: 8, halign: 'center' },   // Type
            3: { cellWidth: 11, halign: 'center' },  // Broker
            4: { cellWidth: 8, halign: 'center' },   // From
            5: { cellWidth: 9, halign: 'center' },   // To
            6: { cellWidth: 10, halign: 'center' },  // Variety
            7: { cellWidth: 6, halign: 'center' },   // Bags
            8: { cellWidth: 6, halign: 'center' },   // M%
            9: { cellWidth: 6, halign: 'center' },   // Cut
            10: { cellWidth: 8, halign: 'center' },  // WB
            11: { cellWidth: 10, halign: 'center' }, // Gross
            12: { cellWidth: 8, halign: 'center' },  // Tare
            13: { cellWidth: 10, halign: 'center' }, // Net
            14: { cellWidth: 10, halign: 'center' }, // Lorry
            15: { cellWidth: 25, halign: 'center' }, // Amount - FIXED big
            16: { cellWidth: 18, halign: 'center' }, // Total - FIXED big
            17: { cellWidth: 12, halign: 'center' }  // Rate - FIXED big
        },
        margin: { left: 5, right: 5 },
        tableWidth: 'wrap', // Wrap to fit page
        didDrawCell: (cellData: any) => {
            // Color code rows based on movement type
            if (records && cellData.section === 'body') {
                const record = records[cellData.row.index];
                if (record) {
                    const mvmtType = (record.movementType || record.movement_type || '').toLowerCase();
                    if (mvmtType === 'purchase') {
                        cellData.cell.styles.fillColor = GREEN_BG;
                    }
                }
            }
        }
    });

    // Add totals
    const totalBags = records.reduce((sum, r) => sum + (r.bags || 0), 0);
    const totalWeight = records.reduce((sum, r) => sum + (parseFloat(r.netWeight) || 0), 0);
    const totalAmount = records.reduce((sum, r) => {
        const rate = r.purchaseRate || {};
        return sum + (parseFloat(rate.totalAmount || r.totalAmount) || 0);
    }, 0);

    addSummary(doc, [
        { label: 'Total Records', value: records.length.toString() },
        { label: 'Total Bags', value: totalBags.toLocaleString() },
        { label: 'Total Weight', value: `${formatNumber(totalWeight)} kg` },
        { label: 'Total Amount', value: `₹${Number(totalAmount).toLocaleString('en-IN')}` }
    ], 'portrait');

    addFooter(doc, options, 'portrait');

    const filename = `Purchase_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename} with ${records.length} records across ${doc.getNumberOfPages()} pages`);
};

/**
 * Generate PDF for Shifting tab - PORTRAIT MODE - Pixel perfect match
 * Includes: Sl No, Date, Type, From KN, From WH, To KN/Outturn, To WH, Variety, Bags, M%, Cut, WB, Net, Lorry
 */
export const generateShiftingPDF = (
    records: any[],
    options: PDFOptions
): void => {
    console.log(`📊 PDF Export: Processing ${records.length} Shifting records (PORTRAIT-OPTIMIZED)`);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, { ...options, title: options.title || 'Shifting Records' }, records.length, 'portrait');

    // Exactly match frontend columns (14 columns for portrait A4)
    const columns: ColumnDef[] = [
        { header: 'Sl', dataKey: 'slNo', width: 7, halign: 'center' },
        { header: 'Date', dataKey: 'date', width: 14, halign: 'center' },
        { header: 'Type', dataKey: 'type', width: 12, halign: 'center' },
        { header: 'From KN', dataKey: 'fromKn', width: 14 },
        { header: 'From WH', dataKey: 'fromWh', width: 14 },
        { header: 'To/Outturn', dataKey: 'toKn', width: 16 },
        { header: 'To WH', dataKey: 'toWh', width: 14 },
        { header: 'Variety', dataKey: 'variety', width: 18 },
        { header: 'Bags', dataKey: 'bags', width: 10, halign: 'center' },
        { header: 'M%', dataKey: 'moisture', width: 8, halign: 'center' },
        { header: 'Cut', dataKey: 'cutting', width: 8, halign: 'center' },
        { header: 'WB', dataKey: 'wbNo', width: 10, halign: 'center' },
        { header: 'Net Wt', dataKey: 'netWeight', width: 14, halign: 'center' },
        { header: 'Lorry No', dataKey: 'lorryNumber', width: 16 }
    ];

    const tableData = processInChunks(records, (record, index) => {
        const isProductionShifting = record.movementType === 'production-shifting';
        const isForProduction = record.movementType === 'for-production';

        return {
            slNo: index + 1,
            date: formatDate(record.date),
            type: isProductionShifting ? 'Prod-Shift' : isForProduction ? 'For-Prod' : 'Shifting',
            fromKn: truncateText(record.fromKunchinittu?.code || '-', 12),
            fromWh: truncateText(record.fromWarehouse?.code || record.fromWarehouse?.name || '-', 12),
            toKn: isProductionShifting
                ? `OUT: ${record.outturn?.code || '-'}`
                : truncateText(record.toKunchinittu?.code || '-', 14),
            toWh: isProductionShifting
                ? truncateText(record.toWarehouse?.code || '-', 12)
                : truncateText(record.toWarehouseShift?.code || record.toWarehouseShift?.name || '-', 12),
            variety: truncateText(record.variety || '-', 16),
            bags: record.bags || 0,
            moisture: record.moisture ? `${record.moisture}%` : '-',
            cutting: record.cutting || '-',
            wbNo: record.wbNo || '-',
            netWeight: formatNumber(record.netWeight),
            lorryNumber: truncateText((record.lorryNumber || '-').toUpperCase(), 12)
        };
    });

    generateOptimizedTable(doc, columns, tableData, 35, records, 'portrait');

    // Add totals
    const totalBags = records.reduce((sum, r) => sum + (r.bags || 0), 0);
    const totalWeight = records.reduce((sum, r) => sum + (parseFloat(r.netWeight) || 0), 0);

    addSummary(doc, [
        { label: 'Total Records', value: records.length.toString() },
        { label: 'Total Bags', value: totalBags.toLocaleString() },
        { label: 'Total Weight', value: `${formatNumber(totalWeight)} kg` }
    ], 'portrait');

    addFooter(doc, options, 'portrait');

    const filename = `Shifting_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename} with ${records.length} records across ${doc.getNumberOfPages()} pages`);
};

/**
 * Generate PDF for Paddy Stock tab - PORTRAIT MODE - EXACT frontend design match
 * Layout: Two-column - Left (Kunchinittu bifurcation) + Right (Working + Variety-wise summary)
 * Colors: #4472C4 blue for date headers, color-coded movements
 * ENHANCED: Matches frontend exactly with robust large dataset handling
 * FIXED: Now includes rice production deductions and closed kunchinittu entries
 */
export const generatePaddyStockPDF = (
    stockData: any[],
    options: PDFOptions,
    riceProductions: any[] = [],  // Optional rice productions for deductions
    closedKunchinittus: any[] = []  // NEW: Closed kunchinittus with remaining bags
): void => {
    console.log(`📊 PDF Export: Processing ${stockData?.length || 0} Paddy Stock records, ${riceProductions?.length || 0} rice productions, ${closedKunchinittus?.length || 0} closed kunchinittus (PORTRAIT)`);

    // Safety check
    if (!stockData || stockData.length === 0) {
        console.error('❌ No paddy stock data provided');
        return;
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = PAGE_WIDTH_PORTRAIT;
    const pageHeight = PAGE_HEIGHT_PORTRAIT;
    const contentWidth = pageWidth - (MARGIN * 2);
    const leftColWidth = contentWidth * 0.55;     // 55% for bifurcation
    const rightColWidth = contentWidth * 0.43;   // 43% for Working + Summary
    const colGap = contentWidth * 0.02;          // 2% gap

    addHeader(doc, { ...options, title: options.title || 'Paddy Stock Report' }, stockData.length, 'portrait');

    // Group by date
    const groupedByDate: { [date: string]: any[] } = {};
    stockData.forEach(item => {
        const date = item.date ? formatDate(item.date) : 'Unknown';
        if (!groupedByDate[date]) groupedByDate[date] = [];
        groupedByDate[date].push(item);
    });

    // Also add dates from riceProductions (for dates with only rice entries like cleared outturns)
    riceProductions.forEach(rp => {
        const date = rp.date ? formatDate(rp.date) : 'Unknown';
        if (date !== 'Unknown' && !groupedByDate[date]) {
            groupedByDate[date] = [];  // Empty array - no arrival records for this date
        }
    });

    // Sort dates newest first for display
    let dates = Object.keys(groupedByDate).sort((a, b) => {
        const dateA = a.split('/').reverse().join('');
        const dateB = b.split('/').reverse().join('');
        return dateB.localeCompare(dateA);
    });

    // If targetDate is provided, filter to only show that date
    // Format: targetDate is YYYY-MM-DD, need to convert to DD/MM/YYYY for comparison
    if (options.targetDate) {
        const [year, month, day] = options.targetDate.split('-');
        const targetDateFormatted = `${day}/${month}/${year}`;
        dates = dates.filter(d => d === targetDateFormatted);
        console.log(`📊 PDF: Filtering to targetDate ${options.targetDate} -> ${targetDateFormatted}, found ${dates.length} dates`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRE-COMPUTE RUNNING STOCK BALANCES FOR ALL DATES (like frontend)
    // ═══════════════════════════════════════════════════════════════════════
    interface StockItem { bags: number; variety: string;[key: string]: any; }
    const preComputedStock = new Map<string, {
        openingWarehouse: { [key: string]: StockItem };
        openingProduction: { [key: string]: StockItem };
        closingWarehouse: { [key: string]: StockItem };
        closingProduction: { [key: string]: StockItem };
    }>();

    // Get ALL dates sorted chronologically (oldest first for running calculation)
    const allDates = Object.keys(groupedByDate).sort((a, b) => {
        const dateA = a.split('/').reverse().join('');
        const dateB = b.split('/').reverse().join('');
        return dateA.localeCompare(dateB);  // Oldest first
    });

    // Helper to safely update stock
    const safeUpdateStock = (stock: { [key: string]: StockItem }, key: string, delta: number, defaultData: StockItem) => {
        if (!stock[key]) stock[key] = { ...defaultData, bags: 0 };
        stock[key].bags += delta;
    };

    // Helper to deep copy stock object
    const deepCopy = (obj: { [key: string]: StockItem }): { [key: string]: StockItem } => {
        return JSON.parse(JSON.stringify(obj));
    };

    // Helper to find outturn key
    const findOutturnKey = (stock: { [key: string]: StockItem }, outturnCode: string): string | null => {
        return Object.keys(stock).find(k => k.includes(`|${outturnCode}`)) || null;
    };

    let runningWarehouse: { [key: string]: StockItem } = {};
    let runningProduction: { [key: string]: StockItem } = {};

    // Process each date in chronological order
    allDates.forEach(d => {
        const dayRecords = groupedByDate[d] || [];
        const normalizedDate = d.split('/').reverse().join('-'); // DD/MM/YYYY -> YYYY-MM-DD

        // Get rice productions for this date - ROBUST CHECK
        const dayRiceProds = riceProductions.filter((rp: any) => {
            if (!rp.date) return false;
            // Handle both string and Date objects, and various formats
            const rpDateISO = typeof rp.date === 'string' ? rp.date.split('T')[0] : new Date(rp.date).toISOString().split('T')[0];
            const targetDateISO = d.split('/').reverse().join('-');
            return rpDateISO === targetDateISO;
        });

        // Opening = previous day's closing
        const openingWarehouse = deepCopy(runningWarehouse);
        const openingProduction = deepCopy(runningProduction);
        const closingWarehouse = deepCopy(runningWarehouse);
        const closingProduction = deepCopy(runningProduction);

        // Process day's transactions
        dayRecords.forEach((rec: any) => {
            const variety = (rec.variety || 'Unknown').trim();
            const bags = rec.bags || 0;

            if (rec.movementType === 'purchase' && !rec.outturnId) {
                // Normal purchase → warehouse
                const location = `${rec.toKunchinittu?.code || ''} - ${rec.toWarehouse?.name || ''}`;
                const key = `${variety}|${location}`;
                safeUpdateStock(closingWarehouse, key, bags, { bags: 0, variety, location });
            } else if (rec.movementType === 'purchase' && rec.outturnId) {
                // For-production purchase → directly to outturn
                const outturn = rec.outturn?.code || `OUT${rec.outturnId}`;
                const key = `${variety}|${outturn}`;
                safeUpdateStock(closingProduction, key, bags, { bags: 0, variety, outturn, kunchinittu: rec.toKunchinittu?.code || '' });
            } else if (rec.movementType === 'production-shifting') {
                // Production shifting: warehouse → production
                const fromLoc = `${rec.fromKunchinittu?.code || ''} - ${rec.fromWarehouse?.name || ''}`;
                const fromKey = `${variety}|${fromLoc}`;
                const outturn = rec.outturn?.code || '';
                const prodKey = `${variety}|${outturn}`;
                safeUpdateStock(closingWarehouse, fromKey, -bags, { bags: 0, variety, location: fromLoc });
                safeUpdateStock(closingProduction, prodKey, bags, { bags: 0, variety, outturn, kunchinittu: rec.fromKunchinittu?.code || '' });
            } else if (rec.movementType === 'shifting') {
                // Shifting between warehouses
                const fromLoc = `${rec.fromKunchinittu?.code || ''} - ${rec.fromWarehouse?.name || ''}`;
                const toLoc = `${rec.toKunchinittu?.code || ''} - ${rec.toWarehouseShift?.name || ''}`;
                const fromKey = `${variety}|${fromLoc}`;
                const toKey = `${variety}|${toLoc}`;
                safeUpdateStock(closingWarehouse, fromKey, -bags, { bags: 0, variety, location: fromLoc });
                safeUpdateStock(closingWarehouse, toKey, bags, { bags: 0, variety, location: toLoc });
            } else if (rec.movementType === 'loose') {
                // Loose entry → warehouse
                const location = `${rec.toKunchinittu?.code || ''} - ${rec.toWarehouse?.name || ''}`;
                const key = `${variety}|${location}`;
                safeUpdateStock(closingWarehouse, key, bags, { bags: 0, variety, location });
            }
        });

        // Subtract rice production from production stock
        dayRiceProds.forEach((rp: any) => {
            const outturnCode = rp.outturn?.code || '';
            if (!outturnCode) return;

            const productType = rp.productType || '';
            const isNonPaddyProduct = ['Bran', 'Farm Bran', 'Faram', 'Farm'].includes(productType);
            if (isNonPaddyProduct) return;

            const matchedKey = findOutturnKey(closingProduction, outturnCode);
            if (matchedKey && closingProduction[matchedKey]) {
                const deducted = rp.paddyBagsDeducted || calculatePaddyBagsDeducted(rp.quantityQuintals || 0, productType);
                closingProduction[matchedKey].bags -= deducted;
            }
        });

        // Handle cleared outturns (set production to 0 or remove)
        Object.keys(closingProduction).forEach(key => {
            const item = closingProduction[key];
            const clearingEntry = riceProductions.find((rp: any) =>
                rp.outturn?.code === item.outturn && rp.locationCode === 'CLEARING'
            );
            if (clearingEntry) {
                const clearDate = formatDate(clearingEntry.date);
                if (clearDate <= d) {
                    closingProduction[key].bags = 0;  // Cleared
                }
            }
        });

        // Handle Kunchinittu closures on this date
        (closedKunchinittus || []).forEach((ck: any) => {
            const ckDate = ck.closedAt ? ck.closedAt.split('T')[0] : '';
            if (ckDate === normalizedDate) {
                // Find matching kunchinittu in warehouse stock and clear it
                Object.keys(closingWarehouse).forEach(key => {
                    const parts = key.split('|');
                    const locationStr = parts[1] || '';
                    const kCode = locationStr.split(' - ')[0];
                    if (kCode === ck.code) {
                        closingWarehouse[key].bags = 0; // Clear stock on closure
                    }
                });
            }
        });

        // Store pre-computed data
        preComputedStock.set(d, { openingWarehouse, openingProduction, closingWarehouse, closingProduction });

        // Update running stock for NEXT day
        runningWarehouse = deepCopy(closingWarehouse);
        runningProduction = deepCopy(closingProduction);
    });

    console.log(`📊 PDF: Pre-computed stock for ${allDates.length} dates`);

    let yPos = 35;
    let totalRecordsProcessed = 0;

    dates.forEach((date) => {
        const dayRecords = groupedByDate[date];
        totalRecordsProcessed += dayRecords.length;

        // Check for page break - need at least 80mm for a complete date section
        if (yPos > pageHeight - 80) {
            doc.addPage();
            yPos = MARGIN + 8;
        }

        // Pre-calculate today's activity to determine mill status
        const targetDateISO = date.split('/').reverse().join('-');

        // Get today's rice productions for deduction display and activity check
        const todayRiceProds = (riceProductions || []).filter((rp: any) => {
            if (!rp.date) return false;
            const rpDateISO = typeof rp.date === 'string' ? rp.date.split('T')[0] : new Date(rp.date).toISOString().split('T')[0];
            return rpDateISO === targetDateISO;
        });

        // Get today's closed kunchinittus for activity check
        const todayClosedKns = (closedKunchinittus || []).filter((kn: any) => {
            const knDate = kn.closedAt?.split('T')[0];
            return knDate === targetDateISO;
        });

        // Determine if it's a working day (has transactions, production, or closures)
        const hasTransactions = dayRecords.length > 0 || todayRiceProds.length > 0 || todayClosedKns.length > 0;

        // ═══════════════════════════════════════════════════════════════════════
        // DATE HEADER - Blue #4472C4 like frontend
        // ═══════════════════════════════════════════════════════════════════════
        doc.setFillColor(hasTransactions ? 68 : 156, hasTransactions ? 114 : 163, hasTransactions ? 196 : 175);
        doc.rect(MARGIN, yPos - 4, contentWidth, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);

        // Format date nicely: "11 Jan '26"
        const displayDate = formatDateDisplay(date);
        doc.text(displayDate, MARGIN + 3, yPos);

        // Mill Closed badge for non-working days
        if (!hasTransactions) {
            doc.setFillColor(107, 114, 128);
            doc.rect(MARGIN + contentWidth - 25, yPos - 3, 22, 5, 'F');
            doc.setFontSize(6);
            doc.text('Mill Closed', MARGIN + contentWidth - 23, yPos);
        }
        yPos += 7;

        // ═══════════════════════════════════════════════════════════════════════
        // TWO COLUMN LAYOUT: Left (Kunchinittu Bifurcation) + Right (Summary)
        // ═══════════════════════════════════════════════════════════════════════
        const startYForColumns = yPos;
        const startingPageNumber = doc.getNumberOfPages(); // Track starting page for right column

        // Get pre-computed stock for this date (includes opening from previous days)
        const dateStock = preComputedStock.get(date);
        const openingWarehouseData = dateStock?.openingWarehouse || {};
        const openingProductionData = dateStock?.openingProduction || {};
        const closingWarehouseData = dateStock?.closingWarehouse || {};
        const closingProductionData = dateStock?.closingProduction || {};

        // Build display entries from opening production stock (shown first)
        const productionStock: { [key: string]: { bags: number; variety: string; outturn: string } } = {};
        Object.entries(openingProductionData).forEach(([key, item]) => {
            if ((item as any).bags > 0) {
                const outturn = (item as any).outturn || key.split('|')[1] || '';
                const variety = (item as any).variety || key.split('|')[0] || 'Unknown';
                productionStock[key] = { bags: (item as any).bags, variety, outturn };
            }
        });

        // Build display entries from opening warehouse stock
        const kunchinintuStock: { [key: string]: { bags: number; variety: string; kunchinittu: string; warehouse: string } } = {};
        Object.entries(openingWarehouseData).forEach(([key, item]) => {
            if ((item as any).bags > 0) {
                const variety = (item as any).variety || key.split('|')[0] || 'Unknown';
                const location = (item as any).location || key.split('|')[1] || '';
                const [kn, wh] = location.split(' - ');
                kunchinintuStock[key] = { bags: (item as any).bags, variety, kunchinittu: kn || '', warehouse: wh || '' };
            }
        });

        // Group by variety for summary (REMAINING ONLY AS OPENING)
        const varietyOpeningTotals: { [variety: string]: number } = {};
        Object.entries(openingProductionData).forEach(([key, item]) => {
            const variety = (item as any).variety || key.split('|')[0] || 'Unknown';
            if (!varietyOpeningTotals[variety]) varietyOpeningTotals[variety] = 0;
            varietyOpeningTotals[variety] += (item as any).bags || 0;
        });
        Object.entries(openingWarehouseData).forEach(([key, item]) => {
            const variety = (item as any).variety || key.split('|')[0] || 'Unknown';
            if (!varietyOpeningTotals[variety]) varietyOpeningTotals[variety] = 0;
            varietyOpeningTotals[variety] += (item as any).bags || 0;
        });

        // Track today's additions/deductions separately
        const additions: any[] = [];
        const shifts: any[] = [];
        const productions: any[] = [];

        dayRecords.forEach((item: any) => {
            if (item.movementType === 'purchase' || item.movementType === 'loose') {
                additions.push(item);
            } else if (item.movementType === 'shifting') {
                shifts.push(item);
            } else if (item.movementType === 'production-shifting') {
                productions.push(item);
            }
        });

        // ═══════════════════════════════════════════════════════════════════════
        // LEFT COLUMN: Kunchinittu-wise Bifurcation
        // ═══════════════════════════════════════════════════════════════════════
        let leftY = startYForColumns;

        // Track page breaks for proper right column placement
        let pageBreakOccurred = false;
        let lastPageBreakY = MARGIN + 12; // Y position after a page break

        // Helper function to check if we need a page break and handle it
        // Returns the new Y position after page break if needed
        const checkPageBreak = (currentY: number, neededHeight: number): number => {
            if (currentY + neededHeight > pageHeight - MARGIN - 10) {
                doc.addPage();
                pageBreakOccurred = true;
                // Add continuation header on new page
                doc.setFillColor(68, 114, 196);
                doc.rect(MARGIN, MARGIN, contentWidth, 6, 'F');
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text(`${displayDate} (continued)`, MARGIN + 3, MARGIN + 4);
                lastPageBreakY = MARGIN + 12;
                return MARGIN + 12;
            }
            return currentY;
        };

        // 1. ACTUAL OPENING STOCK ROWS
        const kunchinintuEntries = Object.values(kunchinintuStock).filter(e => e.bags > 0);
        const productionEntries = Object.values(productionStock).filter(e => e.bags > 0);
        const totalOpeningBags = kunchinintuEntries.reduce((sum, e) => sum + e.bags, 0) +
            productionEntries.reduce((sum, e) => sum + e.bags, 0);

        // Show individual opening entries
        [...kunchinintuEntries, ...productionEntries].forEach((entry, idx) => {
            // Check for page break before each entry
            leftY = checkPageBreak(leftY, 6);

            doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 250);
            doc.rect(MARGIN, leftY - 2, leftColWidth, 5, 'F');

            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);

            doc.text(entry.bags.toString(), MARGIN + 2, leftY + 1);
            doc.text(truncateText(entry.variety, 18), MARGIN + 18, leftY + 1);

            const isProd = 'outturn' in entry;
            const location = isProd ? (entry as any).outturn : `${(entry as any).kunchinittu} - ${(entry as any).warehouse}`;
            doc.setTextColor(isProd ? 124 : 37, isProd ? 58 : 99, isProd ? 237 : 235); // Purple for prod, Blue for wh
            doc.text(truncateText(location, 35), MARGIN + 55, leftY + 1);

            leftY += 5;
        });

        // Check for page break before Opening Stock Total
        leftY = checkPageBreak(leftY, 10);

        // Opening Stock Total Row
        doc.setFillColor(209, 250, 229); // Green-100
        doc.rect(MARGIN, leftY - 2, leftColWidth, 6, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105); // Green-600
        doc.text(`${totalOpeningBags}`, MARGIN + 2, leftY + 2);
        doc.text('Opening Stock', MARGIN + 18, leftY + 2);
        doc.setTextColor(0, 0, 0);
        leftY += 8;

        // 2. ADDITIONS (Purchases - #d4edda)
        let totalAdditions = 0;
        additions.forEach((rec: any) => {
            // Check for page break before each addition
            leftY = checkPageBreak(leftY, 8);

            const bags = rec.bags || 0;
            totalAdditions += bags;
            // Only left border colored (not full row) - matching frontend
            doc.setFillColor(5, 150, 105); // Green-600 left border
            doc.rect(MARGIN, leftY - 2.5, 4, 6, 'F');

            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(5, 150, 105);
            doc.text(`+${bags}`, MARGIN + 6, leftY + 1.5);
            doc.setTextColor(0, 0, 0);
            doc.text(truncateText(rec.variety || 'Unknown', 18), MARGIN + 22, leftY + 1.5);

            const to = rec.outturn?.code || `${rec.toKunchinittu?.code || ''} - ${rec.toWarehouse?.name || ''}`;
            doc.setFont('helvetica', 'normal');
            doc.text('to', MARGIN + 55, leftY + 1.5);
            doc.setFont('helvetica', 'bold');
            doc.text(truncateText(to, 35), MARGIN + 62, leftY + 1.5);
            leftY += 6;
        });

        // ══════════════════════════════════════════
        // LOOSE ENTRIES (Amber - #fef3c7)
        // ══════════════════════════════════════════
        // Filtering from additions done earlier, but let's separate them if they are loose
        const looseEntries = additions.filter(r => r.movementType === 'loose');
        const purchaseEntriesOnly = additions.filter(r => r.movementType === 'purchase');
        // Actually the additions loop above handles both, but let's re-run for loose with amber if needed
        // For now, let's keep it simple and just use the same loop but check type

        // 3. SHIFTING (+/-)
        shifts.forEach((rec: any) => {
            // Check for page break before each shift
            leftY = checkPageBreak(leftY, 7);

            const bags = rec.bags || 0;
            // Only left border colored (not full row) - matching frontend
            doc.setFillColor(168, 85, 247); // Purple-500 left border
            doc.rect(MARGIN, leftY - 3, 4, 6, 'F');

            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            doc.text(`+-${bags}`, MARGIN + 6, leftY + 1);
            doc.text(truncateText(rec.variety || 'Unknown', 15), MARGIN + 22, leftY + 1);

            const from = `${rec.fromKunchinittu?.code || ''} - ${rec.fromWarehouse?.name || ''}`;
            const to = `${rec.toKunchinittu?.code || ''} - ${rec.toWarehouseShift?.name || ''}`;
            doc.text(truncateText(from, 20), MARGIN + 45, leftY + 1);
            doc.text('to', MARGIN + 68, leftY + 1);
            doc.text(truncateText(to, 20), MARGIN + 72, leftY + 1);
            leftY += 5;
        });

        // 4. DEDUCTIONS (Prod Shifting - Orange)
        let totalProdShift = 0;
        productions.forEach((rec: any) => {
            // Check for page break before each production
            leftY = checkPageBreak(leftY, 7);

            const bags = rec.bags || 0;
            totalProdShift += bags;
            // Only left border colored (not full row) - matching frontend
            doc.setFillColor(255, 152, 0); // Orange left border
            doc.rect(MARGIN, leftY - 3, 4, 6, 'F');

            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            doc.text(`(-) ${bags}`, MARGIN + 6, leftY + 1);
            doc.text(truncateText(rec.variety || 'Unknown', 15), MARGIN + 22, leftY + 1);

            const from = `${rec.fromKunchinittu?.code || ''} - ${rec.fromWarehouse?.name || ''}`;
            const outturn = rec.outturn?.code || '';
            doc.text(truncateText(from, 20), MARGIN + 45, leftY + 1);
            doc.text(`to ${outturn}`, MARGIN + 70, leftY + 1);
            leftY += 5;
        });

        // 5. CONSUMPTION (Rice Prod / Cleared Outturn / Closed Kns)
        let totalConsumption = 0;

        // Rice Productions / Clearing
        todayRiceProds.forEach((rp: any) => {
            const productType = rp.productType || '';
            const isClearing = rp.locationCode === 'CLEARING';
            const isNonPaddy = ['Bran', 'Farm Bran', 'Faram', 'Farm'].includes(productType);
            if (isNonPaddy && !isClearing) return;

            const deducted = rp.paddyBagsDeducted || calculatePaddyBagsDeducted(rp.quantityQuintals || 0, productType);
            if (deducted <= 0 && !isClearing) return;

            // Check for page break before each rice production entry
            leftY = checkPageBreak(leftY, 8);

            totalConsumption += deducted;
            const bgColor = isClearing ? [254, 202, 202] : [255, 153, 153]; // #fecaca : #ff9999
            const borderColor = isClearing ? [153, 27, 27] : [153, 31, 31]; // #991b1b : #991f1f

            // Only left border colored (not full row) - matching frontend
            doc.setFillColor(borderColor[0], borderColor[1], borderColor[2]);
            doc.rect(MARGIN, leftY - 2.5, 4, 6, 'F');

            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(borderColor[0], borderColor[1], borderColor[2]);
            doc.text(`(-) ${deducted}`, MARGIN + 5, leftY + 1.5);

            doc.setTextColor(borderColor[0], borderColor[1], borderColor[2]);
            let variety = rp.outturn?.allottedVariety || rp.variety || 'Unknown';
            doc.text(truncateText(variety, 18), MARGIN + 22, leftY + 1.5);

            const outturn = rp.outturn?.code || '';
            // Shorter status text to fit column
            const statusText = isClearing ? 'Cleared (Waste)' : 'Rice Prod.';
            doc.text(truncateText(`${outturn} ! ${statusText}`, 32), MARGIN + 55, leftY + 1.5);
            leftY += 6;
        });

        // Closed Kunchinittus
        todayClosedKns.forEach((kn: any) => {
            const bags = kn.closedRemainingBags || 0;
            if (bags <= 0) return;

            // Check for page break before each closed kunchinittu entry
            leftY = checkPageBreak(leftY, 8);

            totalConsumption += bags;

            // Only left border colored (not full row) - matching frontend
            // Draw light border around the row
            doc.setDrawColor(229, 231, 235); // #e5e7eb border
            doc.setLineWidth(0.3);
            doc.rect(MARGIN, leftY - 2, leftColWidth, 5);
            // Red left border
            doc.setFillColor(239, 68, 68);
            doc.rect(MARGIN, leftY - 2.5, 4, 6, 'F');

            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(239, 68, 68);
            doc.text(`(-) ${bags}`, MARGIN + 5, leftY + 1.5);
            doc.text(truncateText(kn.variety || 'KUNCHINITTU', 18), MARGIN + 22, leftY + 1.5);
            const whName = typeof kn.warehouse === 'object' ? kn.warehouse?.name : (kn.warehouse || kn.warehouseName);
            // Shortened text to fit column
            doc.text(truncateText(`${kn.code} - ${whName || ''} (KN CLOSED)`, 35), MARGIN + 55, leftY + 1.5);
            leftY += 6;
        });

        // 6. CLOSING STOCK ROW - CRITICAL: Check for page break to ensure closing stock is never cut off
        // Need at least 15mm for the closing stock row + some margin
        leftY = checkPageBreak(leftY, 15);

        // NOTE: Production shifting is an INTERNAL move (warehouse -> outturn), so it does NOT affect total stock
        const finalClosing = totalOpeningBags + totalAdditions - totalConsumption;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, leftY - 1, MARGIN + leftColWidth, leftY - 1);

        doc.setFillColor(254, 243, 199); // Amber-100
        doc.rect(MARGIN, leftY - 2, leftColWidth, 6, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(146, 64, 14); // Amber-800
        doc.text(`${finalClosing}`, MARGIN + 2, leftY + 2);
        doc.text('Closing Stock', MARGIN + 18, leftY + 2);
        doc.setTextColor(0, 0, 0);
        leftY += 10;

        // ═══════════════════════════════════════════════════════════════════════
        // RIGHT COLUMN: Working Panel + Variety-wise Opening Stock Summary
        // ALWAYS render on the FIRST PAGE of this date section (where date header is)
        // Go back to starting page to render right column, then return to current page
        // ═══════════════════════════════════════════════════════════════════════
        const currentPageAfterLeftCol = doc.getNumberOfPages();

        // Go back to the starting page to render right column
        doc.setPage(startingPageNumber);

        let rightY = startYForColumns;  // Always at same position as left column started
        const rightX = MARGIN + leftColWidth + colGap;

        // Calculate rice production deductions (using todayRiceProds from earlier)
        let riceDeductionBags = 0;
        todayRiceProds.forEach((rp: any) => {
            const productType = rp.productType || '';
            const isNonPaddyProduct = ['Bran', 'Farm Bran', 'Faram', 'Farm'].includes(productType);
            if (!isNonPaddyProduct) {
                // Calculate paddy bags deducted (26 bags per quintal for most products)
                const deducted = rp.paddyBagsDeducted || Math.round((Number(rp.quantityQuintals) || 0) * 100 / 75); // ~75kg per bag
                riceDeductionBags += deducted;
            }
        });

        // ══════════════════════════════════════════
        // WORKING PANEL (Red header like frontend)
        // ══════════════════════════════════════════
        // ══════════════════════════════════════════
        // WORKING PANEL (MTD Cumulative style)
        // ══════════════════════════════════════════
        // 1. Calculate month's cumulative up to yesterday
        const currentDate = new Date(date.split('/').reverse().join('-') + 'T12:00:00');
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const yesterdayDate = new Date(currentDate);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);

        const cumulativeUpToYesterday = (riceProductions || []).reduce((sum: number, rp: any) => {
            if (!rp.date) return sum;
            const rpDate = new Date(typeof rp.date === 'string' ? rp.date.split('T')[0] : rp.date);
            if (rpDate >= firstDayOfMonth && rpDate < new Date(currentDate.toISOString().split('T')[0])) {
                // Use paddyBagsDeducted if available, otherwise calculate
                return sum + (rp.paddyBagsDeducted || calculatePaddyBagsDeducted(rp.quantityQuintals || 0, rp.productType || ''));
            }
            return sum;
        }, 0);

        // 2. Today's total (from previously filtered todayRiceProds)
        const todayTotalDeductions = todayRiceProds.reduce((sum: number, rp: any) => {
            return sum + (rp.paddyBagsDeducted || calculatePaddyBagsDeducted(rp.quantityQuintals || 0, rp.productType || ''));
        }, 0);

        const monthTotal = cumulativeUpToYesterday + todayTotalDeductions;

        // Working panel - render without page break to keep both columns together
        const workingHeight = 48;

        // Draw Panel - Increased height to prevent overlap
        doc.setFillColor(255, 255, 255);
        doc.rect(rightX, rightY - 4, rightColWidth, workingHeight, 'F');
        doc.setDrawColor(220, 38, 38);
        doc.setLineWidth(0.3);
        doc.rect(rightX, rightY - 4, rightColWidth, workingHeight);

        doc.setFillColor(239, 68, 68); // Red-500
        doc.rect(rightX, rightY - 4, rightColWidth, 6, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Working', rightX + rightColWidth / 2, rightY, { align: 'center' });

        // Show MTD Cumulative Data with better spacing
        rightY += 10;
        doc.setFontSize(7);
        doc.setTextColor(220, 38, 38);
        doc.text(new Date(currentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), rightX + 4, rightY);

        // Yesterday's cumulative - right aligned with more spacing
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);
        doc.setFont('helvetica', 'normal');
        doc.text(cumulativeUpToYesterday.toString(), rightX + rightColWidth - 5, rightY + 6, { align: 'right' });

        // Today's deductions - red + value
        doc.setTextColor(220, 38, 38);
        doc.text(`+ ${todayTotalDeductions}`, rightX + rightColWidth - 5, rightY + 14, { align: 'right' });

        // Underline before total
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(rightX + rightColWidth - 20, rightY + 17, rightX + rightColWidth - 5, rightY + 17);

        // Month total - bold
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        doc.text(monthTotal.toString(), rightX + rightColWidth - 5, rightY + 24, { align: 'right' });

        rightY += workingHeight - 4;

        // ══════════════════════════════════════════
        // VARIETY-WISE OPENING STOCK PANEL
        // Calculate needed height for variety panel (header + rows + total)
        // ══════════════════════════════════════════
        const varietyEntries = Object.entries(varietyOpeningTotals).filter(([_, bags]) => bags > 0);

        doc.setFillColor(37, 99, 235); // Blue-600
        doc.rect(rightX, rightY - 4, rightColWidth, 5, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Variety-wise Opening Stock', rightX + 3, rightY - 1);

        doc.setFillColor(243, 244, 246);
        doc.rect(rightX, rightY + 1, rightColWidth, 4, 'F');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(5);
        doc.text('Variety', rightX + 2, rightY + 4);
        doc.text('Bags', rightX + rightColWidth - 2, rightY + 4, { align: 'right' });

        rightY += 8;
        doc.setTextColor(0, 0, 0);
        varietyEntries
            .sort((a, b) => b[1] - a[1])
            .forEach(([variety, bags]) => {
                doc.text(truncateText(variety, 28), rightX + 2, rightY);
                doc.text(bags.toString(), rightX + rightColWidth - 2, rightY, { align: 'right' });
                rightY += 4;
            });

        doc.setFillColor(37, 99, 235);
        doc.rect(rightX, rightY - 2, rightColWidth, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL', rightX + 2, rightY + 1.5);
        const grandTotal = Object.values(varietyOpeningTotals).reduce((s, b) => s + (b as number), 0);
        doc.text(grandTotal.toString(), rightX + rightColWidth - 2, rightY + 1.5, { align: 'right' });

        // Track final right column position (after variety total)
        const finalRightY = rightY + 8;

        // Return to the current page (where left column ended) for next date
        doc.setPage(currentPageAfterLeftCol);

        // Calculate yPos based on whether columns are on the same page or different pages
        if (startingPageNumber === currentPageAfterLeftCol) {
            // Same page - use the maximum of leftY and rightY to prevent overlap
            yPos = Math.max(leftY, finalRightY) + 5;
        } else {
            // Different pages - use leftY since we're on the page where left column ended
            yPos = leftY + 5;
        }
    });

    addFooter(doc, options, 'portrait');

    const filename = `PaddyStock_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename} with ${stockData.length} records across ${doc.getNumberOfPages()} pages`);
};

/**
 * Generate PDF for Rice Stock tab - A3 LANDSCAPE - 101% Perfect Frontend Match
 * Includes: Variety-wise Stock Register → Detailed Movements (grouped by Variety) → Grouped Palti
 */
export const generateRiceStockPDF = (
    stockData: any[],
    options: PDFOptions
): void => {
    console.log(`📊 PDF Export: Processing ${stockData?.length || 0} Rice Stock records (A3 LANDSCAPE - 101% FRONTEND MATCH)`);

    if (!stockData || stockData.length === 0) {
        console.error('❌ No rice stock data provided');
        return;
    }

    // A3 LANDSCAPE for more space - exact frontend design match
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'  // A3 size: 420mm x 297mm landscape
    });

    // A3 landscape dimensions
    const pageWidth = 420;  // A3 landscape width
    const pageHeight = 297; // A3 landscape height
    const contentWidth = pageWidth - (MARGIN * 2);

    // Grouping helper
    const groupDataByProductType = (data: any[]) => {
        const groups: { [key: string]: any[] } = {
            'Rice': [], 'Bran': [], 'RJ Rice (2)': [], 'RJ Broken': [], 'Unpolish': [],
            'Faram': [], '0 Broken': [], 'Sizer Broken': [], 'RJ Rice 1': [], 'Broken': [], 'Other': []
        };

        data.forEach(item => {
            // Integrate palti operations into their actual product types
            if (item.movementType === 'palti' || item.isPalti) {
                let actualProductType = item.productType || 'Rice';
                if (actualProductType === 'Palti') actualProductType = 'Rice';
                if (groups[actualProductType]) {
                    groups[actualProductType].push(item);
                    return;
                }
            }

            const product = (item.product || item.productType || '').toLowerCase();
            if (product.includes('unpolish')) groups['Unpolish'].push(item);
            else if (product.includes('faram')) groups['Faram'].push(item);
            else if (product.includes('zero broken') || product.includes('0 broken')) groups['0 Broken'].push(item);
            else if (product.includes('sizer broken')) groups['Sizer Broken'].push(item);
            else if (product.includes('rj broken') || product.includes('rejection broken')) groups['RJ Broken'].push(item);
            else if (product.includes('rj rice 1')) groups['RJ Rice 1'].push(item);
            else if (product.includes('rj rice 2') || product.includes('rj rice (2)')) groups['RJ Rice (2)'].push(item);
            else if (product.includes('broken')) groups['Broken'].push(item);
            else if (product.includes('rice') || product.includes('rj rice')) groups['Rice'].push(item);
            else if (product.includes('bran')) groups['Bran'].push(item);
            else groups['Other'].push(item);
        });
        return groups;
    };

    // Calculate group totals helper - robust for all possible data keys
    // FIXED: Must match frontend logic for DIRECT_LOAD and Palti
    const calculateGroupTotals = (group: any[]) => {
        const normalize = (val: any) => String(val || '').toLowerCase().replace(/[_\s-]/g, ' ').trim();

        return {
            qtls: group.reduce((sum, item) => {
                const movementType = (item.movementType || item.movement_type || '').toLowerCase();

                if (movementType === 'palti') {
                    let paltiChange = 0;
                    const fromLoc = item.fromLocation || item.locationCode || '';
                    const toLoc = item.toLocation || item.location || '';
                    const targetQtls = Math.abs(Number(item.qtls || item.actualQtls || item.quantityQuintals || item.quantity_quintals || 0));
                    const shortageKg = Number(item.shortageKg || item.conversionShortageKg || item.conversion_shortage_kg || 0);
                    const shortageQtls = shortageKg / 100;
                    const sourceQtls = targetQtls + shortageQtls;

                    if (normalize(fromLoc) !== 'direct load') {
                        paltiChange -= sourceQtls;
                    }
                    if (normalize(toLoc) !== 'direct load') {
                        paltiChange += targetQtls;
                    }
                    return sum + paltiChange;
                }

                // Regular movement
                const location = item.locationCode || item.location || item.to || '';
                if (normalize(location) === 'direct load') return sum;

                const qty = Math.abs(Number(item.qtls || item.quantityQuintals || item.quantity_quintals || 0));
                return movementType === 'sale' ? sum - qty : sum + qty;
            }, 0),
            bags: group.reduce((sum, item) => {
                const movementType = (item.movementType || item.movement_type || '').toLowerCase();

                if (movementType === 'palti') {
                    let bagsChange = 0;
                    const fromLoc = item.fromLocation || item.locationCode || '';
                    const toLoc = item.toLocation || item.location || '';
                    const targetBags = Number(item.bags || item.opening_stock_bags || 0);
                    const shortageBags = Number(item.shortageBags || item.conversionShortageBags || item.conversion_shortage_bags || 0);
                    const sourceBags = targetBags + shortageBags;

                    if (normalize(fromLoc) !== 'direct load') {
                        bagsChange -= sourceBags;
                    }
                    if (normalize(toLoc) !== 'direct load') {
                        bagsChange += targetBags;
                    }
                    return sum + bagsChange;
                }

                // Regular movement
                const location = item.locationCode || item.location || item.to || '';
                if (normalize(location) === 'direct load') return sum;

                const bags = Math.abs(Number(item.bags || item.opening_stock_bags || 0));
                return movementType === 'sale' ? sum - bags : sum + bags;
            }, 0)
        };
    };

    // Group by date
    const groupedByDate: { [date: string]: any[] } = {};
    stockData.forEach(item => {
        const date = item.date ? formatDate(item.date) : 'Unknown';
        if (!groupedByDate[date]) groupedByDate[date] = [];
        groupedByDate[date].push(item);
    });

    const dates = Object.keys(groupedByDate).sort((a, b) => {
        const dateA = a.split('/').reverse().join('');
        const dateB = b.split('/').reverse().join('');
        return dateB.localeCompare(dateA);
    });

    dates.forEach((date, dateIdx) => {
        if (dateIdx > 0) doc.addPage();

        const dayMovements = groupedByDate[date];

        // Header - use custom A3 sizing
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(68, 114, 196);
        doc.text(options.title || 'Rice Stock Report', pageWidth / 2, 15, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Total Records: ${stockData.length} | Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, 22, { align: 'center' });

        let yPos = 32;
        const displayDate = formatDateDisplay(date);

        // DATE RIBBON (BLUE) - larger for A3
        doc.setFillColor(68, 114, 196); // #4472C4
        doc.rect(MARGIN, yPos - 5, contentWidth, 10, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`DATE: ${displayDate}`, MARGIN + 6, yPos + 1);
        yPos += 12;

        // Process data for the day
        const openingStock: any[] = [];
        const productions: any[] = [];
        const bifurcation: any[] = [];

        dayMovements.forEach(day => {
            if (day.openingStock) openingStock.push(...day.openingStock);
            if (day.productions) productions.push(...day.productions);
            if (day.bifurcation) bifurcation.push(...day.bifurcation);
            // Include items from dayMovements if they are NOT the dayData object themselves 
            // (in case records were passed differently)
            if (day.movementType || day.isOpeningStock) productions.push(day);
        });

        const openingGroups = groupDataByProductType(openingStock);
        const productionGroups = groupDataByProductType(productions);
        const bifurcationGroups = groupDataByProductType(bifurcation);

        // Helper to render product card with exact frontend design
        const renderPDFProductCard = (title: string, x: number, y: number, width: number, isRice: boolean = false) => {
            let currentY = y;

            // CARD CONTAINER (Simulate card with background and border)
            doc.setFillColor(248, 249, 250); // #f8f9fa
            // Note: We don't know final height yet, so we draw it as we go or use a large enough rect
            // Instead, we'll draw individual elements with their backgrounds

            const openingForType = openingGroups[title] || [];
            const prodsForType = productionGroups[title] || [];
            const biforType = bifurcationGroups[title] || [];
            const hasData = openingForType.length > 0 || prodsForType.length > 0 || biforType.length > 0;

            // Product Header
            doc.setFillColor(233, 236, 239); // #e9ecef
            doc.rect(x, currentY, width, 10, 'F');
            doc.setFontSize(14); // Increased for A3
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(73, 80, 87); // #495057
            doc.text(title, x + width / 2, currentY + 7, { align: 'center' });
            currentY += 10;

            // Column Headers - EXACT colors and spacing
            doc.setFillColor(241, 243, 244); // #f1f3f4
            doc.rect(x, currentY, width, 8, 'F');
            doc.setFontSize(9);
            doc.setTextColor(95, 99, 104); // #5f6368

            // Scaled widths for A3
            const colWidths = isRice
                ? [22, 28, 55, 45, 35, 20] // Adjusted for wider A3
                : [20, 25, 45, 45, 35, 18];
            const totalUnits = colWidths.reduce((a, b) => a + b, 0);
            const unitWidth = width / totalUnits;

            let colX = x;
            const colLabels = ['Qtls', 'Bags', 'Product', 'Variety', 'Packaging', 'L'];
            colLabels.forEach((label, i) => {
                const w = colWidths[i] * unitWidth;
                doc.text(label, colX + w / 2, currentY + 5.5, { align: 'center' });
                colX += w;
            });
            currentY += 8;

            if (!hasData) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(150, 150, 150);
                doc.text('No rice stock data found for this category', x + width / 2, currentY + 10, { align: 'center' });
                return currentY + 20;
            }

            const cardPadding = 4;
            currentY += cardPadding;

            // 1. PALTI SECTION (If Rice)
            if (isRice) {
                // Get Palti from conversions AND today's productions
                const dayConversions = dayMovements.filter(m => (m.movementType || m.movement_type) === 'palti-shortage' || m.isPalti);
                const paltiMoves = prodsForType.filter(p => (p.movementType || p.movement_type || '').toLowerCase() === 'palti');

                const allPalti = [...dayConversions.filter(m => m.category === 'Rice'), ...paltiMoves];

                if (allPalti.length > 0) {
                    const boxX = x + 2;
                    const boxWidth = width - 4;
                    const boxStartY = currentY;

                    // Palti Box Header - Purple Gradient style
                    doc.setFillColor(124, 58, 237); // #7c3aed
                    doc.rect(boxX, currentY, boxWidth, 9, 'F');
                    doc.setFontSize(11);
                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`🔄 Palti Entries (${allPalti.length})`, boxX + 4, currentY + 6);
                    currentY += 9;

                    // Group by Source
                    const bySource: { [pkg: string]: any[] } = {};
                    allPalti.forEach(pi => {
                        const s = pi.source_packaging_brand || pi.sourcePackaging?.brandName || pi.sourcePackaging || 'White Packet';
                        if (!bySource[s]) bySource[s] = [];
                        bySource[s].push(pi);
                    });

                    Object.entries(bySource).forEach(([source, items], sIdx) => {
                        // Source sub-header
                        doc.setFillColor(245, 243, 255); // #f5f3ff
                        doc.rect(boxX, currentY, boxWidth, 7, 'F');
                        doc.setFontSize(9);
                        doc.setTextColor(124, 58, 237);
                        doc.text(`Source: ${source}`, boxX + 4, currentY + 5);
                        currentY += 7;

                        // Palti Table Grid Headers
                        doc.setFillColor(243, 232, 255); // #f3e8ff
                        doc.rect(boxX, currentY, boxWidth, 7, 'F');
                        doc.setFontSize(8);
                        doc.setTextColor(100, 100, 100);
                        doc.text('Qtls', boxX + 5, currentY + 5);
                        doc.text('Bags', boxX + 25, currentY + 5);
                        doc.text('Variety', boxX + 55, currentY + 5);
                        doc.text('Target Packaging', boxX + 105, currentY + 5);
                        doc.text('To Loc', boxX + boxWidth - 15, currentY + 5, { align: 'right' });
                        currentY += 7;

                        items.forEach((item, idx) => {
                            doc.setFontSize(9);
                            doc.setTextColor(0, 0, 0);
                            doc.setFont('helvetica', 'bold');

                            // Robust qtls extraction
                            const qtlsVal = Math.abs(Number(item.qtls || item.quantityQuintals || item.quantity_quintals || 0));
                            doc.text(qtlsVal.toFixed(2), boxX + 5, currentY + 5);

                            doc.setFont('helvetica', 'normal');
                            const bagsVal = item.bags || item.opening_stock_bags || 0;
                            const bagSize = item.bagSizeKg || item.bag_size_kg || (item.packaging?.allottedKg) || 26;
                            doc.text(`${bagsVal}/${bagSize}KG`, boxX + 25, currentY + 5);
                            doc.text(truncateText(item.variety || '-', 25), boxX + 55, currentY + 5);

                            // Handling target packaging as object or string
                            const targetPkg = item.target_packaging_brand ||
                                (item.targetPackaging?.brandName) ||
                                (item.packaging?.brandName) ||
                                (typeof item.packaging === 'string' ? item.packaging : 'A1');

                            doc.setFont('helvetica', 'bold');
                            doc.text(truncateText(targetPkg, 25), boxX + 105, currentY + 5);

                            doc.setFont('helvetica', 'normal');
                            const fromLoc = item.fromLocation || item.locationCode || item.from || 'A1';
                            const toLoc = item.toLocation || item.location || item.to || 'A1';
                            const loc = `${fromLoc} -> ${toLoc}`.toUpperCase();
                            doc.text(truncateText(loc, 15), boxX + boxWidth - 5, currentY + 5, { align: 'right' });

                            currentY += 6;
                        });

                        // Separator line between sources
                        if (sIdx < Object.keys(bySource).length - 1) {
                            doc.setDrawColor(196, 181, 253); // #c4b5fd
                            doc.setLineWidth(0.1);
                            doc.line(boxX, currentY, boxX + boxWidth, currentY);
                        }
                    });

                    // Palti Footer/Border
                    doc.setDrawColor(124, 58, 237);
                    doc.setLineWidth(0.5);
                    doc.rect(boxX, boxStartY, boxWidth, currentY - boxStartY, 'S');
                    currentY += 5;
                }
            }

            // 2. VARIETY-WISE OPENING STOCK (Bifurcation) - Filter to only show positive "present" stock
            const filteredBiforType = biforType.filter(item => {
                const q = Number(item.qtls || item.quantityQuintals || item.quantity_quintals || 0);
                return q > 0.01; // "only how much present now" - hide deducted/0 values
            });

            if (filteredBiforType.length > 0) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(75, 85, 99); // #4b5563
                doc.text('VARIETY-WISE OPENING STOCK (PRESENT)', x + 2, currentY + 6);
                currentY += 8;

                filteredBiforType.forEach((item, bIdx) => {
                    const rowBg = bIdx % 2 === 0 ? [248, 249, 250] : [255, 255, 255];
                    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
                    doc.rect(x, currentY, width, 7, 'F');

                    doc.setFontSize(9);
                    doc.setTextColor(0, 0, 0);
                    let rowX = x;

                    const pkgDisplay = item.packagingBrand ||
                        item.packaging_brand ||
                        (item.packaging && typeof item.packaging === 'object' ? item.packaging.brandName : item.packaging) ||
                        '-';

                    const qtlsVal = Number(item.qtls || item.quantityQuintals || item.quantity_quintals || 0);
                    const bagsVal = item.bags || item.opening_stock_bags || 0;
                    const bagSize = item.bagSizeKg || item.bag_size_kg || (item.packaging?.allottedKg) || 26;

                    const rowVals = [
                        qtlsVal.toFixed(2),
                        `${bagsVal}/${bagSize}kg`,
                        title,
                        truncateText(item.variety || '-', 25),
                        truncateText(pkgDisplay, 25),
                        item.location || item.locationCode || item.to || '-'
                    ];

                    rowVals.forEach((v, i) => {
                        const w = colWidths[i] * unitWidth;
                        // Handle object values if they somehow end up here
                        const displayVal = (typeof v === 'object' && v !== null) ? (v.brandName || v.name || JSON.stringify(v)) : v;
                        doc.text(String(displayVal), rowX + w / 2, currentY + 5, { align: 'center' });
                        rowX += w;
                    });
                    currentY += 7;
                });

                // Opening Total Row
                const opTot = calculateGroupTotals(openingForType);
                if (opTot.qtls > 0) {
                    doc.setFillColor(255, 255, 255);
                    doc.rect(x, currentY, width, 8, 'F');
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(0, 0, 0);
                    let rx = x;
                    doc.text(opTot.qtls.toFixed(2), rx + colWidths[0] * unitWidth / 2, currentY + 6, { align: 'center' });
                    rx += colWidths[0] * unitWidth;
                    doc.text(opTot.bags.toString(), rx + colWidths[1] * unitWidth / 2, currentY + 6, { align: 'center' });
                    rx += colWidths[1] * unitWidth;
                    doc.text('OPENING STOCK', rx + (colWidths[2] + colWidths[3]) * unitWidth / 2, currentY + 6, { align: 'center' });
                    currentY += 10;
                }
            }

            // 3. DAILY MOVEMENTS (Regular productions, sales, purchases)
            const filteredProds = prodsForType.filter(p => (p.movementType || p.movement_type || '').toLowerCase() !== 'palti' || !isRice);

            filteredProds.forEach(prod => {
                const mType = (prod.movementType || prod.movement_type || '').toLowerCase();
                let bg: [number, number, number] = [255, 255, 255];
                if (mType === 'production') bg = [212, 237, 218]; // Greenish
                else if (mType === 'purchase') bg = [204, 229, 255]; // Bluish
                else if (mType === 'sale') bg = [255, 229, 204];    // Orangelish

                doc.setFillColor(bg[0], bg[1], bg[2]);
                doc.rect(x, currentY, width, 8, 'F');
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);

                let rx = x;
                const sign = (mType === 'sale') ? '-' : '';

                const qtlsVal = Number(prod.qtls || prod.quantityQuintals || prod.quantity_quintals || 0);
                const bagsVal = prod.bags || prod.opening_stock_bags || 0;
                const pkgDisplay = (prod.packaging_brand ||
                    (prod.packaging?.brandName) ||
                    (typeof prod.packaging === 'string' ? prod.packaging : '-')).toUpperCase();
                const locDisplay = prod.locationCode || prod.location || prod.to || '-';

                doc.text(`${sign}${qtlsVal.toFixed(2)}`, rx + colWidths[0] * unitWidth / 2, currentY + 6, { align: 'center' });
                rx += colWidths[0] * unitWidth;
                doc.text(`${sign}${bagsVal}${prod.bagSizeKg ? '/' + prod.bagSizeKg + 'KG' : ''}`, rx + colWidths[1] * unitWidth / 2, currentY + 6, { align: 'center' });
                rx += colWidths[1] * unitWidth;
                doc.text(truncateText(prod.product || title, 20), rx + colWidths[2] * unitWidth / 2, currentY + 6, { align: 'center' });
                rx += colWidths[2] * unitWidth;
                doc.text(truncateText(prod.variety || '-', 25), rx + colWidths[3] * unitWidth / 2, currentY + 6, { align: 'center' });
                rx += colWidths[3] * unitWidth;
                doc.text(truncateText(pkgDisplay, 25), rx + colWidths[4] * unitWidth / 2, currentY + 6, { align: 'center' });
                rx += colWidths[4] * unitWidth;
                doc.text(locDisplay, rx + colWidths[5] * unitWidth / 2, currentY + 6, { align: 'center' });

                currentY += 8;
            });

            // 4. CLOSING STOCK ROW
            const opTot = calculateGroupTotals(openingForType);
            const clTotQtls = opTot.qtls + calculateGroupTotals(prodsForType).qtls;
            const clTotBags = opTot.bags + calculateGroupTotals(prodsForType).bags;

            doc.setFillColor(233, 236, 239); // #e9ecef
            doc.rect(x, currentY, width, 10, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);

            let cx = x;
            doc.text(clTotQtls.toFixed(2), cx + colWidths[0] * unitWidth / 2, currentY + 7, { align: 'center' });
            cx += colWidths[0] * unitWidth;
            doc.text(clTotBags.toString(), cx + colWidths[1] * unitWidth / 2, currentY + 7, { align: 'center' });
            cx += colWidths[1] * unitWidth;
            doc.text('CLOSING STOCK', cx + (colWidths[2] + colWidths[3]) * unitWidth / 2, currentY + 7, { align: 'center' });

            return currentY + 15;
        };

        // RENDER LAYOUT - A3 Optimized (3 Columns or 2 large columns)
        // We'll follow the frontend: Rice on Left, Vertical stack on Right
        const colGap = 10; // Wider for A3
        const riceColWidth = (contentWidth - colGap) * 0.48;
        const otherColWidth = (contentWidth - colGap) * 0.48;
        const col1X = MARGIN;
        const col2X = col1X + riceColWidth + colGap;

        // COLUMN 1: Rice (Main column)
        let leftY = renderPDFProductCard('Rice', col1X, yPos, riceColWidth, true);

        // COLUMN 2: Stacked Products
        let rightY = yPos;
        ['Broken', 'RJ Broken', 'RJ Rice 1', '0 Broken', 'Unpolish', 'Faram'].forEach(pt => {
            if (rightY > pageHeight - 50) {
                // Should probably handle page breaks better, but for now just stacking
            }
            rightY = renderPDFProductCard(pt, col2X, rightY, otherColWidth);
        });

        // BOTTOM ROW: Remaining products in 3-column layout
        yPos = Math.max(leftY, rightY) + 10;
        const bcolWidth = (contentWidth - colGap * 3) / 4;
        ['Bran', 'RJ Rice (2)', 'Sizer Broken', 'Other'].forEach((pt, i) => {
            renderPDFProductCard(pt, col1X + i * (bcolWidth + colGap), yPos, bcolWidth);
        });

    });

    // Custom A3 Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - MARGIN, pageHeight - 8, { align: 'right' });
        doc.text(`Generated by Mill Stock Management - ${options.companyName || 'Mother India'}`, MARGIN, pageHeight - 8);
    }

    const filename = `RiceStock_A3_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename} with ${stockData.length} records across ${doc.getNumberOfPages()} pages (A3 Format)`);
};


/**
 * HELPER: Render a frontend-exact product card with orange accent and autoTable
 */
function renderProductCard(doc: jsPDF, title: string, movements: any[], x: number, y: number, width: number) {
    // Card Header with Orange Accent
    doc.setFillColor(237, 137, 54); // Orange #ED8936
    doc.rect(x, y - 4, 3, 7, 'F');

    doc.setFillColor(243, 244, 246); // Lighter gray #F3F4F6
    doc.rect(x + 3, y - 4, width - 3, 7, 'F');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81); // Dark gray text
    doc.text(title.toUpperCase(), x + 6, y + 1);

    // Prepare Table Data
    const openingQtls = parseFloat(movements[0]?.openingStockQtls || 0);
    const openingBags = parseInt(movements[0]?.openingStockBags || 0);

    let curQtls = openingQtls;
    let curBags = openingBags;

    const body: any[] = [];

    // 1. Opening Stock row
    body.push([openingQtls.toFixed(2), openingBags.toString(), '', 'OPENING STOCK', '', '', 'OPENING']);

    // 2. Movement rows
    movements.forEach(m => {
        const type = (m.movementType || 'production').toLowerCase();
        const q = Math.abs(parseFloat(m.quantityQuintals || 0));
        const b = Math.abs(m.bags || 0);
        const sz = m.bagSizeKg || 26;
        const isOut = type === 'sale' || type === 'palti';

        const qDisp = isOut ? `-${q.toFixed(2)}` : q.toFixed(2);
        const bDisp = `${isOut ? '-' : ''}${b}/${sz}kg`;
        const variety = m.variety || m.outturn?.allottedVariety || '-';
        const pkg = m.packaging?.brandName || m.packaging_brand || '-';
        const loc = m.locationCode || m.to || '-';

        body.push([qDisp, bDisp, title, variety, pkg, loc, type]);

        if (isOut) { curQtls -= q; curBags -= b; }
        else { curQtls += q; curBags += b; }
    });

    // 3. Closing Stock row
    body.push([curQtls.toFixed(2), curBags.toString(), '', 'CLOSING STOCK', '', '', 'CLOSING']);

    autoTable(doc, {
        startY: y + 5,
        margin: { left: x },
        tableWidth: width,
        head: [['Qtls', 'Bags', 'Product', 'Variety', 'Packaging', 'L']],
        body: body,
        theme: 'plain',
        styles: {
            fontSize: 6.5,
            cellPadding: 2,
            halign: 'center',
            valign: 'middle',
            textColor: [0, 0, 0],
            lineColor: [229, 231, 235],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [248, 249, 250],
            textColor: [100, 100, 100],
            fontSize: 6,
            fontStyle: 'bold'
        },
        didParseCell: function (data) {
            const rowIndex = data.row.index;
            const content = data.row.raw as any[];
            const type = content[6]; // Type is at index 6

            if (type === 'OPENING') {
                data.cell.styles.fillColor = [254, 243, 199]; // Yellow #FEF3C7
                data.cell.styles.textColor = [146, 64, 14];
                data.cell.styles.fontStyle = 'bold';
            } else if (type === 'CLOSING') {
                data.cell.styles.fillColor = [220, 252, 231]; // Green #DCFCE7
                data.cell.styles.textColor = [22, 101, 52];
                data.cell.styles.fontStyle = 'bold';
            } else {
                // Movement Colors
                if (type === 'production') data.cell.styles.fillColor = [212, 237, 218]; // Green
                else if (type === 'purchase') data.cell.styles.fillColor = [204, 229, 255]; // Blue
                else if (type === 'sale') {
                    data.cell.styles.fillColor = [255, 229, 204]; // Orange #FFE5CC
                    if (data.column.index <= 1) data.cell.styles.textColor = [220, 38, 38]; // Red for out quantities
                }
                else if (type === 'palti') data.cell.styles.fillColor = [253, 244, 255]; // Purple #FDF4FF
            }
        }
    });

    // Resolve the lint error by using any cast for the undocumented property if needed,
    // or just rely on the fact that autoTable updates the doc state.
    // For autoTable Y tracking:
    const finalY = (doc as any).lastAutoTable.finalY || y;
    return finalY;
}

// Helper function for product type colors
function getProductTypeColor(productType: string): [number, number, number] {
    const colors: { [key: string]: [number, number, number] } = {
        'Rice': [59, 130, 246],      // Blue
        'Broken': [107, 114, 128],   // Gray
        'RJ Rice 1': [16, 185, 129], // Green
        '0 Broken': [156, 163, 175], // Light gray
        'Unpolish': [245, 158, 11],  // Amber
        'Faram': [139, 92, 246],     // Purple
        'Bran': [236, 72, 153],      // Pink
        'RJ Rice (2)': [20, 184, 166], // Teal
        'Sizer Broken': [99, 102, 241] // Indigo
    };
    return colors[productType] || [68, 114, 196];
}

/**
 * Generate PDF for Rice Stock Movement report - PORTRAIT MODE - Exact frontend match
 */
export const generateRiceMovementsPDF = (
    movements: any[],
    options: PDFOptions
): void => {
    console.log(`📊 PDF Export: Processing ${movements.length} Rice Movement records (PORTRAIT)`);

    // PORTRAIT orientation as requested
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, { ...options, title: options.title || 'Rice Stock Movement Report' }, movements.length, 'portrait');

    // Optimized columns for Portrait (Total ~194mm width)
    const columns: ColumnDef[] = [
        { header: 'Sl', dataKey: 'slNo', width: 6, halign: 'center' },
        { header: 'Date', dataKey: 'date', width: 14, halign: 'center' },
        { header: 'Type', dataKey: 'mvmtType', width: 16 },
        { header: 'Bill', dataKey: 'billNumber', width: 14, halign: 'center' },
        { header: 'Variety', dataKey: 'variety', width: 22 },
        { header: 'Product', dataKey: 'productType', width: 16 },
        { header: 'Bags', dataKey: 'bags', width: 10, halign: 'center' },
        { header: 'Kg', dataKey: 'bagSize', width: 8, halign: 'center' },
        { header: 'Qtls', dataKey: 'qtls', width: 10, halign: 'center' },
        { header: 'Packaging', dataKey: 'packaging', width: 22 },
        { header: 'From', dataKey: 'from', width: 16 },
        { header: 'To', dataKey: 'to', width: 16 },
        { header: 'Lorry', dataKey: 'lorryNumber', width: 16 },
        { header: 'Status', dataKey: 'status', width: 8, halign: 'center' }
    ];

    // Grouping Logic: Sales (by date + bill + lorry) and Palti (by bill)
    const groupedMovements: any[] = [];
    const paltiGroups: { [billNo: string]: any[] } = {};
    const saleGroups: { [groupKey: string]: any[] } = {};

    movements.forEach((item) => {
        const mvmtType = (item.movementType || item.movement_type || 'production').toLowerCase();
        const billNo = item.billNumber || item.bill_number || '';
        const lorryNo = item.lorryNumber || item.lorry_number || '';
        const date = item.date;

        if (mvmtType === 'palti' && billNo) {
            if (!paltiGroups[billNo]) paltiGroups[billNo] = [];
            paltiGroups[billNo].push(item);
        } else if (mvmtType === 'sale' && billNo) {
            const groupKey = `${date}_${billNo}_${lorryNo}`;
            if (!saleGroups[groupKey]) saleGroups[groupKey] = [];
            saleGroups[groupKey].push(item);
        } else {
            // Non-grouped entries (production, purchase, ungrouped shifting)
            groupedMovements.push({ type: 'single', item });
        }
    });

    // Add grouped palti entries
    Object.entries(paltiGroups).forEach(([billNo, items]) => {
        groupedMovements.push({ type: 'palti-group', billNo, items });
    });

    // Add grouped sale entries
    Object.entries(saleGroups).forEach(([key, items]) => {
        groupedMovements.push({ type: 'sale-group', key, items });
    });

    // Sort by date DESC (Newest First matching frontend)
    groupedMovements.sort((a, b) => {
        const dateA = a.type === 'single' ? a.item.date : a.items[0].date;
        const dateB = b.type === 'single' ? b.item.date : b.items[0].date;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    const tableData: any[] = [];
    let slNo = 0;

    groupedMovements.forEach((entry) => {
        slNo++;

        if (entry.type === 'single') {
            const item = entry.item;
            const mvmtType = item.movementType || item.movement_type || 'production';
            let packagingDisplay = item.packaging_brand || item.packaging?.brandName || (typeof item.packaging === 'string' ? item.packaging : '-');

            // Handle Direct Load display
            const toLoc = item.to || item.locationCode || item.location_code || '-';
            const fromLoc = item.from || item.outturn?.code || (item.movementType === 'production' ? 'Production' : '-');

            tableData.push({
                slNo: slNo,
                date: formatDate(item.date),
                mvmtType: formatMovementType(mvmtType),
                billNumber: item.billNumber || item.bill_number || '-',
                variety: truncateText(item.variety || '-', 30),
                productType: truncateText(item.product_type || item.productType || 'Rice', 20),
                bags: item.bags || 0,
                bagSize: item.bagSizeKg || item.bag_size_kg || item.packaging?.allottedKg || 26,
                qtls: formatNumber(item.quantityQuintals || item.quantity_quintals || 0),
                packaging: truncateText(packagingDisplay, 25),
                from: truncateText(fromLoc, 20),
                to: truncateText(toLoc, 20),
                lorryNumber: (item.lorryNumber || item.lorry_number || '-').toUpperCase(),
                status: (item.status || 'PEND').substring(0, 4).toUpperCase()
            });
        } else if (entry.type === 'sale-group') {
            const items = entry.items;
            const firstItem = items[0];
            const totalBags = items.reduce((sum: number, i: any) => sum + (i.bags || 0), 0);
            const totalQtls = items.reduce((sum: number, i: any) => sum + parseFloat(i.quantityQuintals || i.quantity_quintals || 0), 0);

            // Sale Header Row
            tableData.push({
                slNo: slNo,
                date: formatDate(firstItem.date),
                mvmtType: 'SALE GROUP',
                billNumber: firstItem.billNumber || firstItem.bill_number,
                variety: 'CONSOLIDATED',
                productType: '-',
                bags: totalBags,
                bagSize: '-',
                qtls: formatNumber(totalQtls),
                packaging: `${items.length} ITEMS`,
                from: '-',
                to: items[0].to || items[0].partyName || '-',
                lorryNumber: (firstItem.lorryNumber || firstItem.lorry_number || '-').toUpperCase(),
                status: (firstItem.status || 'APPR').substring(0, 4).toUpperCase(),
                _isSaleGroup: true
            });

            // Sale Sub-Rows
            items.forEach((item: any) => {
                tableData.push({
                    slNo: '',
                    date: '',
                    mvmtType: '↳',
                    billNumber: '',
                    variety: truncateText(item.variety || '-', 25),
                    productType: truncateText(item.product_type || item.productType || 'Rice', 15),
                    bags: item.bags || 0,
                    bagSize: item.bagSizeKg || item.bag_size_kg || 26,
                    qtls: formatNumber(item.quantityQuintals || item.quantity_quintals || 0),
                    packaging: truncateText(item.packaging_brand || item.packaging?.brandName || '-', 25),
                    from: truncateText(item.from || '-', 15),
                    to: truncateText(item.to || '-', 15),
                    lorryNumber: '',
                    status: '',
                    _isSaleSubRow: true
                });
            });
        } else if (entry.type === 'palti-group') {
            const items = entry.items;
            const firstItem = items[0];
            const totalBags = items.reduce((sum: number, i: any) => sum + (i.bags || 0), 0);
            const totalQtls = items.reduce((sum: number, i: any) => sum + parseFloat(i.quantityQuintals || i.quantity_quintals || 0), 0);
            const totalShortage = items.reduce((sum: number, i: any) => sum + Number(i.shortageKg || i.conversion_shortage_kg || 0), 0);

            // Palti Header Row
            tableData.push({
                slNo: slNo,
                date: formatDate(firstItem.date),
                mvmtType: totalShortage > 0 ? `PALTI (-${totalShortage.toFixed(0)}KG)` : 'PALTI',
                billNumber: '-',
                variety: truncateText(firstItem.variety || '-', 30),
                productType: '-',
                bags: totalBags,
                bagSize: '-',
                qtls: formatNumber(totalQtls),
                packaging: `${items.length} CONVERSIONS`,
                from: truncateText(firstItem.from || firstItem.locationCode || '-', 20),
                to: truncateText(firstItem.to || '-', 20),
                lorryNumber: '-',
                status: (firstItem.status || 'APPR').substring(0, 4).toUpperCase(),
                _isPaltiGroup: true
            });

            // Palti Sub-Rows
            items.forEach((item: any) => {
                const sourcePkg = item.source_packaging_brand || item.sourcePackaging?.brandName || 'A1';
                const targetPkg = item.target_packaging_brand || item.targetPackaging?.brandName || 'A1';

                tableData.push({
                    slNo: '',
                    date: '',
                    mvmtType: '↳',
                    billNumber: '',
                    variety: truncateText(item.variety || '-', 25),
                    productType: truncateText(item.product_type || item.productType || 'RICE', 15),
                    bags: item.bags || 0,
                    bagSize: item.bagSizeKg || item.bag_size_kg || 26 + 'KG',
                    qtls: formatNumber(item.quantityQuintals || item.quantity_quintals || 0),
                    packaging: `${sourcePkg} -> ${targetPkg}`.toUpperCase(),
                    from: truncateText(item.from || item.locationCode || '-', 20),
                    to: truncateText(item.to || '-', 20),
                    lorryNumber: '',
                    status: '',
                    _isPaltiSubRow: true
                });
            });
        }
    });

    // Generate the table with Portrait orientation
    generateOptimizedTable(doc, columns, tableData, 35, movements, 'portrait');

    // Totals Summary
    const totalBags = movements.reduce((sum, m) => sum + (m.bags || 0), 0);
    const totalQtls = movements.reduce((sum, m) => sum + (parseFloat(m.quantityQuintals || m.quantity_quintals || 0) || 0), 0);

    addSummary(doc, [
        { label: 'Total Records', value: movements.length.toString() },
        { label: 'Total Bags', value: totalBags.toLocaleString() },
        { label: 'Total Quintals', value: formatNumber(totalQtls) }
    ], 'portrait');

    addFooter(doc, options, 'portrait');

    const filename = `RiceMovements_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename} (PORTRAIT) with ${movements.length} records`);
};

/**
 * Generate PDF for Outturn Report tab - EXACT frontend match
 * Layout: By-Products Record (with right-side summary) -> Production Shifting Records
 * LANDSCAPE mode for better column fit
 */
export const generateOutturnReportPDF = (
    outturnData: any,
    productionRecords: any[],
    byProducts: any[],
    options: PDFOptions
): void => {
    console.log(`📊 PDF Export: Generating Outturn Report for ${outturnData?.code}`);

    if (!outturnData) {
        console.error('❌ No outturn data provided');
        return;
    }

    // LANDSCAPE mode for better column fit
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = PAGE_WIDTH_LANDSCAPE;
    const pageHeight = PAGE_HEIGHT_LANDSCAPE;
    const contentWidth = pageWidth - (MARGIN * 2);

    // Calculate totals upfront for summary panel
    const totals = {
        rice: byProducts?.reduce((sum, bp: any) => sum + Number(bp.rice || 0), 0) || 0,
        sizerBroken: byProducts?.reduce((sum, bp: any) => sum + Number(bp.rejectionRice || 0), 0) || 0,
        rjRice1: byProducts?.reduce((sum, bp: any) => sum + Number(bp.rjRice1 || 0), 0) || 0,
        rjRice2: byProducts?.reduce((sum, bp: any) => sum + Number(bp.rjRice2 || 0), 0) || 0,
        broken: byProducts?.reduce((sum, bp: any) => sum + Number(bp.broken || 0), 0) || 0,
        rjBroken: byProducts?.reduce((sum, bp: any) => sum + Number(bp.rejectionBroken || 0), 0) || 0,
        zeroBroken: byProducts?.reduce((sum, bp: any) => sum + Number(bp.zeroBroken || 0), 0) || 0,
        faram: byProducts?.reduce((sum, bp: any) => sum + Number(bp.faram || 0), 0) || 0,
        bran: byProducts?.reduce((sum, bp: any) => sum + Number(bp.bran || 0), 0) || 0,
        unpolished: byProducts?.reduce((sum, bp: any) => sum + Number(bp.unpolished || 0), 0) || 0
    };
    const totalByProductsQ = Object.values(totals).reduce((sum, val) => sum + val, 0);
    const totalPaddyKg = productionRecords?.reduce((sum, r) => sum + Number(r.netWeight || 0), 0) || 0;
    const totalPaddyQ = totalPaddyKg / 100;
    const yieldPercent = totalPaddyQ > 0 ? ((totalByProductsQ / totalPaddyQ) * 100) : 0;

    const title = `Outturn Report - ${outturnData?.code || 'N/A'}`;
    addHeader(doc, { ...options, title }, (productionRecords?.length || 0) + (byProducts?.length || 0), 'landscape');

    let yPos = 30;

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 1: By-Products Record - with RIGHT-SIDE SUMMARY PANEL
    // ═══════════════════════════════════════════════════════════════════════

    // Section Title - Centered
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('BY-PRODUCTS RECORD', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Layout: Left side = Table (70%), Right side = Summary Panel (30%)
    const leftTableWidth = contentWidth * 0.72;
    const rightPanelWidth = contentWidth * 0.25;
    const rightPanelX = MARGIN + leftTableWidth + 5;
    const tableStartY = yPos;

    // ---- LEFT: By-Products Table ----
    const bpColumns = ['Rice', 'Sizer Broken', 'RJ Rice 1', 'RJ Rice 2', 'Broken', 'RJ Broken', 'Zero Broken', 'Faram', 'Bran', 'Unpolished', 'Date'];
    const bpColWidth = leftTableWidth / bpColumns.length;

    // Header row - Blue #2E75B6
    doc.setFillColor(46, 117, 182);
    doc.rect(MARGIN, yPos, leftTableWidth, 7, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    bpColumns.forEach((col, idx) => {
        doc.text(col, MARGIN + (idx * bpColWidth) + 2, yPos + 5);
    });
    yPos += 7;

    // Data rows - alternating #BDD7EE / white
    (byProducts || []).forEach((bp: any, rowIdx: number) => {
        const rowColor: [number, number, number] = rowIdx % 2 === 0 ? [189, 215, 238] : [255, 255, 255];
        doc.setFillColor(rowColor[0], rowColor[1], rowColor[2]);
        doc.rect(MARGIN, yPos, leftTableWidth, 6, 'F');
        doc.setDrawColor(155, 194, 230);
        doc.setLineWidth(0.1);
        doc.rect(MARGIN, yPos, leftTableWidth, 6);

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        const values = [
            bp.rice > 0 ? Number(bp.rice).toFixed(2) : '-',
            bp.rejectionRice > 0 ? Number(bp.rejectionRice).toFixed(2) : '-',
            bp.rjRice1 > 0 ? Number(bp.rjRice1).toFixed(2) : '-',
            bp.rjRice2 > 0 ? Number(bp.rjRice2).toFixed(2) : '-',
            bp.broken > 0 ? Number(bp.broken).toFixed(2) : '-',
            bp.rejectionBroken > 0 ? Number(bp.rejectionBroken).toFixed(2) : '-',
            bp.zeroBroken > 0 ? Number(bp.zeroBroken).toFixed(2) : '-',
            bp.faram > 0 ? Number(bp.faram).toFixed(2) : '-',
            bp.bran > 0 ? Number(bp.bran).toFixed(2) : '-',
            bp.unpolished > 0 ? Number(bp.unpolished).toFixed(2) : '-',
            formatDate(bp.date)
        ];
        values.forEach((val, idx) => {
            doc.text(String(val), MARGIN + (idx * bpColWidth) + 2, yPos + 4);
        });
        yPos += 6;
    });

    // Totals row - Green #70AD47
    doc.setFillColor(112, 173, 71);
    doc.rect(MARGIN, yPos, leftTableWidth, 7, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    const totalValues = [
        totals.rice.toFixed(2), totals.sizerBroken.toFixed(2), totals.rjRice1.toFixed(2),
        totals.rjRice2.toFixed(2), totals.broken.toFixed(2), totals.rjBroken.toFixed(2),
        totals.zeroBroken.toFixed(2), totals.faram.toFixed(2), totals.bran.toFixed(2),
        totals.unpolished.toFixed(2), 'TOTAL'
    ];
    totalValues.forEach((val, idx) => {
        doc.text(val, MARGIN + (idx * bpColWidth) + 2, yPos + 5);
    });
    yPos += 7;

    // ---- RIGHT: Summary Panel ----
    let rightY = tableStartY;
    const summaryItems = [
        { value: totals.rice.toFixed(2), label: 'Rice', pct: totalPaddyQ > 0 ? ((totals.rice / totalPaddyQ) * 100).toFixed(2) : '0.00' },
        { value: '-', label: 'Sizer Broken', pct: '0.00' },
        { value: '-', label: 'RJ Rice 1', pct: '0.00' },
        { value: '-', label: 'RJ Rice 2', pct: '0.00' },
        { value: '-', label: 'Broken', pct: '0.00' },
        { value: '-', label: 'RJ Broken', pct: '0.00' },
        { value: '-', label: 'Zero broken', pct: '0.00' },
        { value: '-', label: 'Faram', pct: '0.00' },
        { value: '-', label: 'Bran', pct: '0.00' },
        { value: '-', label: 'Unpolished', pct: '0.00' }
    ];

    // Update with actual values
    summaryItems[0].value = totals.rice.toFixed(2);
    summaryItems[1].value = totals.sizerBroken > 0 ? totals.sizerBroken.toFixed(2) : '-';
    summaryItems[2].value = totals.rjRice1 > 0 ? totals.rjRice1.toFixed(2) : '-';
    summaryItems[3].value = totals.rjRice2 > 0 ? totals.rjRice2.toFixed(2) : '-';
    summaryItems[4].value = totals.broken > 0 ? totals.broken.toFixed(2) : '-';
    summaryItems[5].value = totals.rjBroken > 0 ? totals.rjBroken.toFixed(2) : '-';
    summaryItems[6].value = totals.zeroBroken > 0 ? totals.zeroBroken.toFixed(2) : '-';
    summaryItems[7].value = totals.faram > 0 ? totals.faram.toFixed(2) : '-';
    summaryItems[8].value = totals.bran > 0 ? totals.bran.toFixed(2) : '-';
    summaryItems[9].value = totals.unpolished > 0 ? totals.unpolished.toFixed(2) : '-';

    // Draw summary panel with orange border
    doc.setDrawColor(237, 137, 54);
    doc.setLineWidth(0.5);
    doc.rect(rightPanelX, rightY, rightPanelWidth, 75);

    doc.setFontSize(5.5);
    summaryItems.forEach((item, idx) => {
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(item.value, rightPanelX + 3, rightY + 6 + (idx * 6));
        doc.setTextColor(200, 80, 50);
        doc.text(item.label, rightPanelX + 18, rightY + 6 + (idx * 6));
        doc.setTextColor(0, 0, 0);
        doc.text(item.pct, rightPanelX + rightPanelWidth - 8, rightY + 6 + (idx * 6));
    });

    // Total BY Products row at bottom of summary - Green background
    const totalRowY = rightY + 66;
    doc.setFillColor(112, 173, 71);
    doc.rect(rightPanelX, totalRowY, rightPanelWidth, 9, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${totalByProductsQ.toFixed(2)} Q`, rightPanelX + 3, totalRowY + 6);
    doc.text('TOTAL BY PRODUCTS', rightPanelX + 22, totalRowY + 6);
    doc.text(`${yieldPercent.toFixed(2)} %`, rightPanelX + rightPanelWidth - 12, totalRowY + 6);

    yPos = Math.max(yPos, tableStartY + 80) + 10;

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 2: Production Shifting Records
    // ═══════════════════════════════════════════════════════════════════════
    if (productionRecords && productionRecords.length > 0) {
        // Section Title
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('PRODUCTION SHIFTING RECORDS', MARGIN, yPos);
        yPos += 6;

        // Columns matching frontend exactly
        const prodColumns: ColumnDef[] = [
            { header: 'Sl No', dataKey: 'slNo', width: 10, halign: 'center' },
            { header: 'Date', dataKey: 'date', width: 18, halign: 'center' },
            { header: 'Type of Movement', dataKey: 'type', width: 24, halign: 'center' },
            { header: 'Broker', dataKey: 'broker', width: 20, halign: 'center' },
            { header: 'From', dataKey: 'from', width: 16, halign: 'center' },
            { header: 'To', dataKey: 'to', width: 14, halign: 'center' },
            { header: 'Variety', dataKey: 'variety', width: 18, halign: 'center' },
            { header: 'Bags', dataKey: 'bags', width: 10, halign: 'center' },
            { header: 'Moisture', dataKey: 'moisture', width: 14, halign: 'center' },
            { header: 'Cutting', dataKey: 'cutting', width: 12, halign: 'center' },
            { header: 'Wb No', dataKey: 'wbNo', width: 14, halign: 'center' },
            { header: 'Net Weight', dataKey: 'netWeight', width: 18, halign: 'center' },
            { header: 'Lorry No', dataKey: 'lorry', width: 20, halign: 'center' },
            { header: 'Rate/Q', dataKey: 'ratePerQ', width: 18, halign: 'center' },
            { header: 'Total Amount', dataKey: 'totalAmount', width: 24, halign: 'center' }
        ];

        const prodData = productionRecords.map((r, idx) => {
            const isForProduction = r.movementType === 'purchase' && r.outturnId;
            const isProdShifting = r.movementType === 'production-shifting';
            let fromLoc = r.fromLocation || (r.fromKunchinittu?.code ? `${r.fromKunchinittu.code}` : '-');
            let toLoc = isProdShifting && r.outturn?.code ? r.outturn.code : '-';

            return {
                slNo: idx + 1,
                date: formatDate(r.date),
                type: isForProduction ? 'For Production' : (isProdShifting ? 'Prod-Shift' : 'Shifting'),
                broker: r.broker || '-',
                from: fromLoc,
                to: toLoc,
                variety: r.variety || '-',
                bags: r.bags || 0,
                moisture: r.moisture ? `${r.moisture}` : '-',
                cutting: r.cutting || '-',
                wbNo: r.wbNo || '-',
                netWeight: r.netWeight ? formatNumber(r.netWeight) : '-',
                lorry: (r.lorryNumber || '-').toUpperCase(),
                // Rate/Q - EXACT same logic as frontend (Records.tsx lines 6366-6372)
                // For Production purchases: purchaseRate.averageRate
                // Production-shifting: snapshotRate (or outturn.averageRate as fallback)
                ratePerQ: (() => {
                    if (r.purchaseRate?.averageRate) {
                        return `₹${parseFloat(r.purchaseRate.averageRate).toFixed(2)}`;
                    } else if (r.snapshotRate) {
                        return `₹${parseFloat(r.snapshotRate).toFixed(2)}`;
                    } else if (r.outturn?.averageRate) {
                        return `₹${parseFloat(r.outturn.averageRate).toFixed(2)}`;
                    }
                    return '-';
                })(),
                // Total Amount - EXACT same logic as frontend (Records.tsx lines 6377-6379)
                // Only show for "For Production" purchases with purchaseRate.totalAmount
                totalAmount: (() => {
                    if (r.purchaseRate?.totalAmount) {
                        return `₹${parseFloat(r.purchaseRate.totalAmount).toFixed(2)}`;
                    }
                    return '-';
                })()
            };
        });

        autoTable(doc, {
            startY: yPos,
            head: [prodColumns.map(c => c.header)],
            body: prodData.map((row: any) => prodColumns.map(c => row[c.dataKey])),
            theme: 'grid',
            styles: {
                fontSize: 6,
                cellPadding: 2,
                lineWidth: 0.1,
                lineColor: [91, 155, 213],
                overflow: 'linebreak',
                halign: 'left',
                valign: 'middle'
            },
            headStyles: {
                fillColor: [46, 117, 182] as [number, number, number],
                textColor: [255, 255, 255] as [number, number, number],
                fontSize: 6,
                fontStyle: 'bold',
                halign: 'center',
                cellPadding: 2
            },
            alternateRowStyles: {
                fillColor: [189, 215, 238] as [number, number, number]
            },
            columnStyles: prodColumns.reduce((acc, col, idx) => {
                acc[idx] = { cellWidth: col.width, halign: col.halign || 'left' };
                return acc;
            }, {} as any),
            margin: { left: MARGIN, right: MARGIN }
        });

        // Green Totals Row
        const totalNetWeight = productionRecords.reduce((sum, r) => sum + (parseFloat(r.netWeight) || 0), 0);
        // Calculate grand total - EXACT same logic as frontend (only purchaseRate.totalAmount)
        const grandTotalAmount = productionRecords.reduce((sum, r) => {
            if (r.purchaseRate?.totalAmount) {
                return sum + parseFloat(r.purchaseRate.totalAmount);
            }
            return sum;
        }, 0);

        yPos = (doc as any).lastAutoTable.finalY + 1;
        doc.setFillColor(16, 185, 129); // Green
        doc.rect(MARGIN, yPos, contentWidth, 8, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('TOTAL:', MARGIN + contentWidth * 0.6, yPos + 5);
        doc.text(`${formatNumber(totalNetWeight)} kg`, MARGIN + contentWidth * 0.7, yPos + 5);
        doc.text(`₹${formatNumber(grandTotalAmount)}`, MARGIN + contentWidth - 30, yPos + 5);
    }

    addFooter(doc, options, 'landscape');

    const filename = `OutturnReport_${outturnData?.code || 'report'}_${formatFilename()}.pdf`;
    savePDFWithFallback(doc, filename);
    console.log(`✅ PDF Generated: ${filename}`);
};

// ============ HELPER FUNCTIONS ============

function addHeader(doc: jsPDF, options: PDFOptions, totalRecords: number, orientation: 'landscape' | 'portrait'): void {
    const pageWidth = orientation === 'landscape' ? PAGE_WIDTH_LANDSCAPE : PAGE_WIDTH_PORTRAIT;

    // Title background
    doc.setFillColor(68, 114, 196);
    doc.rect(0, 0, pageWidth, 20, 'F');

    // Title
    doc.setFontSize(HEADING_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(options.title.toUpperCase(), pageWidth / 2, 10, { align: 'center' });

    // Subtitle and record count
    doc.setFontSize(SMALL_SIZE + 1);
    doc.setFont('helvetica', 'normal');
    const subtitleText = options.subtitle || options.dateRange || '';
    if (subtitleText) {
        doc.text(subtitleText.toUpperCase(), pageWidth / 2, 16, { align: 'center' });
    }

    // Record count on right
    doc.text(`Total: ${totalRecords.toLocaleString()} records`, pageWidth - MARGIN, 16, { align: 'right' });

    // Generated timestamp
    doc.setFontSize(SMALL_SIZE);
    doc.setTextColor(100, 100, 100);
    const now = new Date();
    doc.text(`Generated: ${now.toLocaleString('en-GB')}`, MARGIN, 26);

    // Divider line
    doc.setDrawColor(68, 114, 196);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 30, pageWidth - MARGIN, 30);
}

function addFooter(doc: jsPDF, options: PDFOptions, orientation: 'landscape' | 'portrait'): void {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = orientation === 'landscape' ? PAGE_WIDTH_LANDSCAPE : PAGE_WIDTH_PORTRAIT;
    const pageHeight = orientation === 'landscape' ? PAGE_HEIGHT_LANDSCAPE : PAGE_HEIGHT_PORTRAIT;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, pageHeight - 12, pageWidth - MARGIN, pageHeight - 12);

        // Page number
        doc.setFontSize(SMALL_SIZE);
        doc.setTextColor(100, 100, 100);
        doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 6,
            { align: 'center' }
        );

        // Filter type badge
        if (options.filterType && options.filterType !== 'all') {
            doc.text(
                `Filter: ${options.filterType.toUpperCase()}`,
                pageWidth - MARGIN,
                pageHeight - 6,
                { align: 'right' }
            );
        }
    }
}

function addSummary(doc: jsPDF, items: { label: string; value: string }[], orientation: 'landscape' | 'portrait'): void {
    const yPos = (doc as any).lastAutoTable?.finalY + 8 || (orientation === 'landscape' ? PAGE_HEIGHT_LANDSCAPE : PAGE_HEIGHT_PORTRAIT) - 40;
    const pageWidth = orientation === 'landscape' ? PAGE_WIDTH_LANDSCAPE : PAGE_WIDTH_PORTRAIT;

    // Summary box
    doc.setFillColor(248, 249, 250);
    doc.rect(MARGIN, yPos - 2, pageWidth - (MARGIN * 2), 12, 'F');
    doc.setDrawColor(68, 114, 196);
    doc.rect(MARGIN, yPos - 2, pageWidth - (MARGIN * 2), 12);

    doc.setFontSize(CONTENT_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(68, 114, 196);

    let xPos = MARGIN + 5;
    const spacing = (pageWidth - (MARGIN * 2) - 10) / items.length;

    items.forEach((item) => {
        doc.text(`${item.label}: ${item.value}`, xPos, yPos + 5);
        xPos += spacing;
    });
}

function generateOptimizedTable(
    doc: jsPDF,
    columns: ColumnDef[],
    data: any[],
    startY: number,
    originalRecords?: any[],
    orientation: 'landscape' | 'portrait' = 'landscape'
): void {
    autoTable(doc, {
        startY,
        head: [columns.map(c => c.header)],
        body: data.map((row) => columns.map(c => row[c.dataKey])),
        theme: 'grid',
        styles: {
            ...getBaseTableStyles(),
            fontSize: SMALL_SIZE
        },
        headStyles: getHeaderStyles(),
        alternateRowStyles: {
            fillColor: ALTERNATE_ROW
        },
        columnStyles: columns.reduce((acc, col, index) => {
            acc[index] = {
                cellWidth: col.width || 'auto',
                halign: col.halign || 'left',
                overflow: 'linebreak'
            };
            return acc;
        }, {} as any),
        margin: { left: MARGIN, right: MARGIN },
        didParseCell: (cellData: any) => {
            // Check if this is grouped data with _isPaltiGroup, _isPaltiSubRow, _isSaleGroup, or _isSaleSubRow
            const rowData = data[cellData.row.index];
            if (rowData) {
                if (rowData._isPaltiGroup) {
                    // Palti group header - purple background, bold
                    cellData.cell.styles.fillColor = [139, 92, 246]; // Purple #8B5CF6
                    cellData.cell.styles.textColor = [255, 255, 255];
                    cellData.cell.styles.fontStyle = 'bold';
                    cellData.cell.styles.fontSize = SMALL_SIZE + 0.5;
                } else if (rowData._isPaltiSubRow) {
                    // Palti sub-row - light purple background
                    cellData.cell.styles.fillColor = [253, 244, 255]; // Light purple #FDF4FF
                    cellData.cell.styles.textColor = [88, 28, 135]; // Dark purple text
                    cellData.cell.styles.fontSize = SMALL_SIZE - 0.5;
                } else if (rowData._isSaleGroup) {
                    // Sale group header - red-ish background (like RED_BG but bolder for header)
                    cellData.cell.styles.fillColor = [252, 165, 165]; // Red #FCA5A5
                    cellData.cell.styles.textColor = [0, 0, 0];
                    cellData.cell.styles.fontStyle = 'bold';
                    cellData.cell.styles.fontSize = SMALL_SIZE + 0.5;
                } else if (rowData._isSaleSubRow) {
                    // Sale sub-row - very light red background
                    cellData.cell.styles.fillColor = [254, 242, 242]; // Light red #FEF2F2
                    cellData.cell.styles.textColor = [153, 27, 27]; // Dark red text
                    cellData.cell.styles.fontSize = SMALL_SIZE - 0.5;
                }
            }
        },
        didDrawCell: (cellData: any) => {
            // Color code rows based on movement type for non-grouped data
            const rowData = data[cellData.row.index];
            if (rowData && !rowData._isPaltiGroup && !rowData._isPaltiSubRow && originalRecords && cellData.section === 'body') {
                const record = originalRecords[cellData.row.index];
                if (record) {
                    const mvmtType = (record.movementType || record.movement_type || '').toLowerCase();
                    if (mvmtType === 'purchase') {
                        cellData.cell.styles.fillColor = GREEN_BG;
                    } else if (mvmtType === 'sale') {
                        cellData.cell.styles.fillColor = RED_BG;
                    } else if (mvmtType === 'shifting' || mvmtType === 'production-shifting') {
                        cellData.cell.styles.fillColor = PURPLE_BG;
                    }
                }
            }
        },
        willDrawPage: (data: any) => {
            // Add continuation header on new pages
            if (data.pageNumber > 1) {
                doc.setFontSize(SMALL_SIZE);
                doc.setTextColor(100, 100, 100);
                doc.text('(continued)', MARGIN, 12);
            }
        }
    });
}

function formatDate(date: string | Date): string {
    if (!date) return '-';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return '-';
    }
}

function calculatePaddyBagsDeducted(quintals: number, productType: string): number {
    const noDeductionProducts = ['Bran', 'Farm Bran', 'Faram', 'Farm'];
    if (noDeductionProducts.includes(productType)) return 0;
    // Matching frontend logic: quintals / 0.47 rounded
    return Math.round(quintals / 0.47);
}

function formatDateDisplay(date: string): string {
    if (!date || date === '-') return date;
    try {
        // Parse DD/MM/YYYY format
        const parts = date.split('/');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            return d.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: '2-digit'
            });
        }
        return date;
    } catch {
        return date;
    }
}

function formatNumber(value: any): string {
    if (value === null || value === undefined || value === '') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return num.toFixed(2);
}

function formatMovementType(type: string): string {
    if (!type) return '-';
    const typeMap: { [key: string]: string } = {
        'purchase': 'Purchase',
        'shifting': 'Shifting',
        'production-shifting': 'Prod-Shift',
        'for-production': 'For-Prod',
        'loose': 'Loose',
        'production': 'Production',
        'sale': 'Sale',
        'palti': 'Palti'
    };
    return (typeMap[type.toLowerCase()] || type).toUpperCase();
}

function formatAmountFormula(formula: string): string {
    if (!formula) return '-';
    return formula
        .replace(/\n/g, ',')
        .replace(/\\n/g, ',')
        .replace(/\s+/g, '')
        .replace(/,+/g, ',')
        .substring(0, 35) + (formula.length > 35 ? '...' : '');
}

function truncateText(text: any, maxLength: number): string {
    if (text === null || text === undefined || text === '' || text === '-') return '-';
    let str = String(text);
    // FORCE UPPERCASE for all truncated text (Variety, Product, Packaging, etc.)
    str = str.toUpperCase();
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 2) + '..';
}

function formatFilename(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

function getFromLocation(record: any): string {
    if (record.movementType === 'purchase') {
        return record.fromLocation || '-';
    }
    if (record.fromKunchinittu?.code) {
        return `${record.fromKunchinittu.code}(${record.fromWarehouse?.code || '-'})`;
    }
    return '-';
}

function getToLocation(record: any): string {
    if (record.toKunchinittu?.code) {
        const warehouse = record.toWarehouse?.code || record.toWarehouseShift?.code || '-';
        return `${record.toKunchinittu.code}(${warehouse})`;
    }
    if (record.outturn?.code) {
        return record.outturn.code;
    }
    return '-';
}

export default {
    generateArrivalsPDF,
    generatePurchasePDF,
    generateShiftingPDF,
    generatePaddyStockPDF,
    generateRiceStockPDF,
    generateRiceMovementsPDF,
    generateOutturnReportPDF
};
