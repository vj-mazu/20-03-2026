/**
 * ENHANCED Rice Stock PDF Generator - 101% Screen Design Match
 * 
 * Layout: A4 Landscape
 * - Rice on LEFT column
 * - Other types on RIGHT column (stacked vertically)
 * - Bottom row: Bran, RJ Rice (2), Sizer Broken (3 columns)
 * 
 * Exact match to Records.tsx Rice Stock tab rendering
 */

import jsPDF from 'jspdf';

// A4 Landscape dimensions
const PAGE_WIDTH = 297;  // mm
const PAGE_HEIGHT = 210; // mm
const MARGIN = 8;        // mm
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
const CONTENT_HEIGHT = PAGE_HEIGHT - (MARGIN * 2);

// Font sizes (optimized for A4 landscape)
const TITLE_SIZE = 14;
const DATE_HEADER_SIZE = 11;
const PRODUCT_HEADER_SIZE = 9;
const COLUMN_HEADER_SIZE = 7;
const CONTENT_SIZE = 6;
const SMALL_SIZE = 5.5;

// Colors (RGB tuples)
const BLUE_HEADER: [number, number, number] = [68, 114, 196];    // #4472C4
const GRAY_BG: [number, number, number] = [233, 236, 239];       // #e9ecef
const LIGHT_GRAY: [number, number, number] = [241, 243, 244];    // #f1f3f4
const GREEN_BG: [number, number, number] = [209, 250, 229];      // #d1fae5 - Purchase
const RED_BG: [number, number, number] = [254, 226, 226];        // #fee2e2 - Sale
const YELLOW_BG: [number, number, number] = [254, 243, 199];     // #fef3c7 - Palti
const BLUE_BG: [number, number, number] = [219, 234, 254];       // #dbeafe - Production
const OPENING_BG: [number, number, number] = [224, 242, 254];    // #e0f2fe - Opening
const CLOSING_BG: [number, number, number] = [243, 244, 246];    // #f3f4f6 - Closing

interface PDFOptions {
    title: string;
    subtitle?: string;
    dateRange?: string;
    filterType?: string;
}

/**
 * Main PDF generation function - Enhanced Rice Stock PDF with 101% screen design match
 */
export const generateRiceStockPDF = (
    stockData: any[],
    options: PDFOptions
): void => {
    console.log(`📊 Generating Enhanced Rice Stock PDF: ${stockData?.length || 0} records`);

    if (!stockData || stockData.length === 0) {
        console.error('❌ No rice stock data provided');
        alert('No data to export');
        return;
    }

    // Create PDF in landscape mode
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Process data by date
    const groupedByDate = groupDataByDate(stockData);
    const dates = Object.keys(groupedByDate).sort((a, b) => {
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        return dateB.getTime() - dateA.getTime(); // Newest first
    });

    console.log(`📅 Processing ${dates.length} date(s)`);

    // Generate a page for each date
    dates.forEach((date, index) => {
        if (index > 0) {
            doc.addPage();
        }

        const dayData = groupedByDate[date];
        renderDatePage(doc, dayData, date, options, index === 0);
    });

    // Save PDF
    const filename = `Rice_Stock_${new Date().toISOString().split('T')[0]}.pdf`;
    try {
        doc.save(filename);
        console.log(`✅ PDF saved: ${filename}`);
    } catch (error) {
        console.error('❌ PDF save error:', error);
        alert('Failed to download PDF. Please try again.');
    }
};

/**
 * Group stock data by date
 */
function groupDataByDate(data: any[]): { [date: string]: any } {
    const grouped: { [date: string]: any } = {};

    data.forEach(item => {
        const date = item.date ? formatDate(item.date) : 'Unknown';
        if (!grouped[date]) {
            grouped[date] = {
                date,
                openingStock: [],
                productions: [],
                conversions: []
            };
        }

        // Categorize the item
        if (item.isOpeningStock || item.opening_stock) {
            grouped[date].openingStock.push(item);
        } else if (item.movementType === 'palti' || item.isPalti) {
            grouped[date].conversions.push(item);
        } else {
            grouped[date].productions.push(item);
        }
    });

    return grouped;
}

/**
 * Render a complete page for one date
 */
function renderDatePage(
    doc: jsPDF,
    dayData: any,
    date: string,
    options: PDFOptions,
    isFirstPage: boolean
): void {
    let yPos = MARGIN;

    // Page header (only on first page)
    if (isFirstPage) {
        yPos = renderPageHeader(doc, options, yPos);
    }

    // Date header (blue ribbon)
    yPos = renderDateHeader(doc, date, yPos);

    // Group data by product type
    const productGroups = groupDataByProductType(dayData);

    // Calculate layout positions
    const leftX = MARGIN;
    const leftWidth = (CONTENT_WIDTH - 2) / 2;  // Half width minus divider
    const dividerX = leftX + leftWidth;
    const rightX = dividerX + 2;
    const rightWidth = leftWidth;

    const contentStartY = yPos;

    // Render LEFT column (Rice)
    const riceData = productGroups['Rice'] || { opening: [], movements: [], closing: { qtls: 0, bags: 0 } };
    const leftEndY = renderProductSection(doc, 'Rice', riceData, leftX, contentStartY, leftWidth);

    // Render RIGHT column (Other types stacked vertically)
    const rightTypes = ['Broken', 'RJ Rice 1', 'RJ Broken', '0 Broken'];
    let rightY = contentStartY;
    
    rightTypes.forEach(type => {
        const typeData = productGroups[type] || { opening: [], movements: [], closing: { qtls: 0, bags: 0 } };
        if (typeData.opening.length > 0 || typeData.movements.length > 0) {
            rightY = renderProductSection(doc, type, typeData, rightX, rightY, rightWidth);
            rightY += 2; // Small gap between products
        }
    });

    // Render divider line between left and right
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(dividerX + 1, contentStartY, dividerX + 1, Math.max(leftEndY, rightY));

    // Render BOTTOM row (3 columns: Bran, RJ Rice (2), Sizer Broken)
    const bottomY = Math.max(leftEndY, rightY) + 4;
    renderBottomRow(doc, productGroups, bottomY);
}

/**
 * Render page header with title
 */
function renderPageHeader(doc: jsPDF, options: PDFOptions, yPos: number): number {
    doc.setFontSize(TITLE_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(68, 114, 196);
    doc.text(options.title || 'Rice Stock Report', PAGE_WIDTH / 2, yPos + 5, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const subtitle = `Generated: ${new Date().toLocaleDateString('en-GB')}`;
    doc.text(subtitle, PAGE_WIDTH / 2, yPos + 10, { align: 'center' });

    return yPos + 15;
}

/**
 * Render date header (blue ribbon)
 */
function renderDateHeader(doc: jsPDF, date: string, yPos: number): number {
    // Blue background
    doc.setFillColor(...BLUE_HEADER);
    doc.rect(MARGIN, yPos, CONTENT_WIDTH, 8, 'F');

    // Date text
    doc.setFontSize(DATE_HEADER_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const displayDate = formatDateDisplay(date);
    doc.text(displayDate, MARGIN + 3, yPos + 5.5);

    return yPos + 10;
}

/**
 * Render a product section (Rice, Broken, etc.)
 */
function renderProductSection(
    doc: jsPDF,
    productType: string,
    data: any,
    x: number,
    y: number,
    width: number
): number {
    let currentY = y;

    // Product header (gray background)
    doc.setFillColor(...GRAY_BG);
    doc.roundedRect(x, currentY, width, 6, 1, 1, 'F');
    doc.setFontSize(PRODUCT_HEADER_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(73, 80, 87);
    doc.text(productType, x + width / 2, currentY + 4, { align: 'center' });
    currentY += 7;

    // Column headers
    currentY = renderColumnHeaders(doc, x, currentY, width);

    // ALWAYS show opening stock section (even if empty)
    // This ensures yesterday's bifurcation is visible
    currentY = renderOpeningStock(doc, data.opening || [], x, currentY, width);

    // Movements (productions, purchases, sales, palti)
    if (data.movements && data.movements.length > 0) {
        currentY = renderMovements(doc, data.movements, x, currentY, width);
    }

    // Closing stock
    currentY = renderClosingStock(doc, data.closing, x, currentY, width);

    return currentY + 2;
}

/**
 * Render column headers
 */
function renderColumnHeaders(doc: jsPDF, x: number, y: number, width: number): number {
    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(x, y, width, 5, 'F');

    doc.setFontSize(COLUMN_HEADER_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(95, 99, 104);

    const columns = [
        { text: 'Qtls', width: width * 0.12 },
        { text: 'Bags', width: width * 0.12 },
        { text: 'Product', width: width * 0.15 },
        { text: 'Variety', width: width * 0.25 },
        { text: 'Packaging', width: width * 0.18 },
        { text: 'L', width: width * 0.18 }
    ];

    let currentX = x + 2;
    columns.forEach(col => {
        doc.text(col.text, currentX, y + 3.5, { align: 'left' });
        currentX += col.width;
    });

    return y + 6;
}

/**
 * Render opening stock
 */
function renderOpeningStock(doc: jsPDF, openingData: any[], x: number, y: number, width: number): number {
    let currentY = y;

    // Opening stock header (always show, even if empty)
    doc.setFillColor(...OPENING_BG);
    doc.rect(x, currentY, width, 4, 'F');
    doc.setFontSize(CONTENT_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('Variety-wise Opening Stock', x + 2, currentY + 3);
    currentY += 5;

    // Render each opening stock item (if any)
    if (openingData && openingData.length > 0) {
        openingData.forEach(item => {
            currentY = renderMovementRow(doc, item, x, currentY, width, OPENING_BG);
        });
    } else {
        // Show "No opening stock" message if empty
        doc.setFillColor(...OPENING_BG);
        doc.rect(x, currentY, width, 4, 'F');
        doc.setFontSize(CONTENT_SIZE);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('No opening stock', x + width / 2, currentY + 3, { align: 'center' });
        currentY += 5;
    }

    return currentY;
}

/**
 * Render movements (productions, purchases, sales, palti)
 */
function renderMovements(doc: jsPDF, movements: any[], x: number, y: number, width: number): number {
    let currentY = y;

    // Group by movement type
    const grouped = {
        production: movements.filter(m => m.movementType === 'production'),
        purchase: movements.filter(m => m.movementType === 'purchase'),
        sale: movements.filter(m => m.movementType === 'sale'),
        palti: movements.filter(m => m.movementType === 'palti')
    };

    // Render each group
    if (grouped.production.length > 0) {
        currentY = renderMovementGroup(doc, 'Production', grouped.production, x, currentY, width, BLUE_BG);
    }
    if (grouped.purchase.length > 0) {
        currentY = renderMovementGroup(doc, 'Purchase', grouped.purchase, x, currentY, width, GREEN_BG);
    }
    if (grouped.sale.length > 0) {
        currentY = renderMovementGroup(doc, 'Sale', grouped.sale, x, currentY, width, RED_BG);
    }
    if (grouped.palti.length > 0) {
        currentY = renderMovementGroup(doc, 'Palti', grouped.palti, x, currentY, width, YELLOW_BG);
    }

    return currentY;
}

/**
 * Render a group of movements (e.g., all purchases)
 */
function renderMovementGroup(
    doc: jsPDF,
    groupName: string,
    movements: any[],
    x: number,
    y: number,
    width: number,
    bgColor: [number, number, number]
): number {
    let currentY = y;

    // Group header
    doc.setFillColor(...bgColor);
    doc.rect(x, currentY, width, 4, 'F');
    doc.setFontSize(CONTENT_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(groupName, x + 2, currentY + 3);
    currentY += 5;

    // Render each movement
    movements.forEach(movement => {
        currentY = renderMovementRow(doc, movement, x, currentY, width, bgColor);
    });

    return currentY;
}

/**
 * Render a single movement row
 * SPECIAL HANDLING: Palti movements are rendered as 3 rows (source, target, shortage)
 */
function renderMovementRow(
    doc: jsPDF,
    movement: any,
    x: number,
    y: number,
    width: number,
    bgColor: [number, number, number]
): number {
    const isPalti = (movement.movementType || '').toLowerCase() === 'palti';
    
    if (isPalti) {
        // HIERARCHICAL PALTI DISPLAY (3 rows: source, target, shortage)
        return renderPaltiHierarchical(doc, movement, x, y, width);
    }
    
    // REGULAR MOVEMENT DISPLAY (single row)
    // Background
    doc.setFillColor(...bgColor);
    doc.rect(x, y, width, 4, 'F');

    // Text
    doc.setFontSize(CONTENT_SIZE);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    // Safely extract values, handling objects
    const qtls = Math.abs(Number(movement.qtls || movement.actualQtls || movement.quantityQuintals || 0)).toFixed(2);
    const bags = Math.abs(Number(movement.bags || 0));
    
    // Handle product - ensure string
    const product = String(movement.product || movement.productType || 'Rice');
    
    // Handle variety - may be object or string
    let variety = 'Sum25 RNR Raw';
    if (movement.variety) {
        if (typeof movement.variety === 'object' && movement.variety !== null) {
            variety = movement.variety.name || movement.variety.variety || 'Sum25 RNR Raw';
        } else {
            variety = String(movement.variety);
        }
    }
    
    // Handle packaging - may be object or string
    let packaging = 'A1';
    if (movement.packaging) {
        if (typeof movement.packaging === 'object' && movement.packaging !== null) {
            packaging = movement.packaging.brandName || movement.packaging.brand || movement.packaging.name || 'A1';
        } else {
            packaging = String(movement.packaging);
        }
    } else if (movement.packaging_brand) {
        packaging = String(movement.packaging_brand);
    }
    
    // Handle location - ensure string
    const location = String(movement.location || movement.locationCode || 'A1');

    const columns = [
        { text: qtls, width: width * 0.12 },
        { text: String(bags), width: width * 0.12 },
        { text: product, width: width * 0.15 },
        { text: variety, width: width * 0.25 },
        { text: packaging, width: width * 0.18 },
        { text: location, width: width * 0.18 }
    ];

    let currentX = x + 2;
    columns.forEach(col => {
        // Ensure text is always a string
        const textValue = String(col.text || '');
        doc.text(textValue, currentX, y + 3, { align: 'left', maxWidth: col.width - 2 });
        currentX += col.width;
    });

    return y + 4;
}

/**
 * Render Palti in hierarchical format matching frontend exactly
 * Frontend shows: Source row (yellow) + Multiple target rows (orange) + Shortage row (red)
 * 
 * IMPORTANT: Palti movements should be GROUPED by source in the data preparation phase
 * Each Palti group should have: sourceItem + splits[] array
 */
function renderPaltiHierarchical(
    doc: jsPDF,
    movement: any,
    x: number,
    y: number,
    width: number
): number {
    let currentY = y;
    
    // Check if this is a grouped Palti (has splits array) or single Palti
    const hasSplits = Array.isArray(movement.splits) && movement.splits.length > 0;
    
    if (hasSplits) {
        // GROUPED PALTI - Render source + multiple targets + shortage
        return renderGroupedPalti(doc, movement, x, currentY, width);
    } else {
        // SINGLE PALTI - Render as 3 rows (source, target, shortage)
        return renderSinglePalti(doc, movement, x, currentY, width);
    }
}

/**
 * Render a single Palti movement (3 rows: source, target, shortage)
 */
function renderSinglePalti(
    doc: jsPDF,
    movement: any,
    x: number,
    y: number,
    width: number
): number {
    let currentY = y;
    
    // Extract data
    const targetQtls = Math.abs(Number(movement.qtls || movement.actualQtls || movement.quantityQuintals || 0));
    const targetBags = Math.abs(Number(movement.bags || 0));
    const shortageKg = Number(movement.shortageKg || movement.conversionShortageKg || movement.conversion_shortage_kg || 0);
    const shortageQtls = shortageKg / 100;
    const sourceQtls = targetQtls + shortageQtls;
    
    // Extract packaging info
    let sourcePackaging = 'A1';
    if (movement.sourcePackaging) {
        if (typeof movement.sourcePackaging === 'object' && movement.sourcePackaging !== null) {
            sourcePackaging = movement.sourcePackaging.brandName || movement.sourcePackaging.brand || 'A1';
        } else {
            sourcePackaging = String(movement.sourcePackaging);
        }
    } else if (movement.source_packaging_brand) {
        sourcePackaging = String(movement.source_packaging_brand);
    }
    
    let targetPackaging = 'A1';
    if (movement.targetPackaging) {
        if (typeof movement.targetPackaging === 'object' && movement.targetPackaging !== null) {
            targetPackaging = movement.targetPackaging.brandName || movement.targetPackaging.brand || 'A1';
        } else {
            targetPackaging = String(movement.targetPackaging);
        }
    } else if (movement.target_packaging_brand) {
        targetPackaging = String(movement.target_packaging_brand);
    } else if (movement.packaging) {
        if (typeof movement.packaging === 'object' && movement.packaging !== null) {
            targetPackaging = movement.packaging.brandName || movement.packaging.brand || 'A1';
        } else {
            targetPackaging = String(movement.packaging);
        }
    }
    
    // Extract location info
    const fromLoc = String(movement.fromLocation || movement.from || 'Source');
    const toLoc = String(movement.toLocation || movement.to || movement.locationCode || 'Target');
    
    // Extract variety
    let variety = 'Sum25 RNR Raw';
    if (movement.variety) {
        if (typeof movement.variety === 'object' && movement.variety !== null) {
            variety = movement.variety.name || movement.variety.variety || 'Sum25 RNR Raw';
        } else {
            variety = String(movement.variety);
        }
    }
    
    const product = String(movement.product || movement.productType || 'Rice');
    
    // Calculate source bags
    const sourcePackagingKg = Number(movement.sourcePackaging?.allottedKg || 26);
    const sourceBags = movement.sourceBags || Math.ceil((sourceQtls * 100) / sourcePackagingKg);
    
    // ROW 1: SOURCE (Yellow background)
    doc.setFillColor(254, 243, 199); // #fef3c7 - Yellow
    doc.rect(x, currentY, width, 4, 'F');
    doc.setFontSize(CONTENT_SIZE);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    const sourceColumns = [
        { text: sourceQtls.toFixed(2), width: width * 0.12 },
        { text: `${sourceBags}/${sourcePackagingKg}kg`, width: width * 0.12 },
        { text: product, width: width * 0.15 },
        { text: variety, width: width * 0.25 },
        { text: sourcePackaging, width: width * 0.18 },
        { text: fromLoc, width: width * 0.18 }
    ];
    
    let currentX = x + 2;
    sourceColumns.forEach(col => {
        doc.text(String(col.text), currentX, currentY + 3, { align: 'left', maxWidth: col.width - 2 });
        currentX += col.width;
    });
    currentY += 4;
    
    // ROW 2: PALTI TARGET (Orange background)
    doc.setFillColor(255, 237, 213); // #ffedd5 - Light orange
    doc.rect(x, currentY, width, 4, 'F');
    doc.setFontSize(CONTENT_SIZE);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(124, 45, 18); // Dark orange text
    
    const targetBagSizeKg = Number(movement.targetPackaging?.allottedKg || movement.bagSizeKg || 26);
    const targetColumns = [
        { text: targetQtls.toFixed(2), width: width * 0.12 },
        { text: `${targetBags}/${targetBagSizeKg}kg`, width: width * 0.12 },
        { text: '↳ Palti Target', width: width * 0.15 },
        { text: variety, width: width * 0.25 },
        { text: targetPackaging, width: width * 0.18 },
        { text: toLoc, width: width * 0.18 }
    ];
    
    currentX = x + 2;
    targetColumns.forEach(col => {
        doc.text(String(col.text), currentX, currentY + 3, { align: 'left', maxWidth: col.width - 2 });
        currentX += col.width;
    });
    currentY += 4;
    
    // ROW 3: SHORTAGE (Red background) - only if shortage > 0
    if (shortageKg > 0) {
        doc.setFillColor(254, 226, 226); // #fee2e2 - Light red
        doc.rect(x, currentY, width, 4, 'F');
        doc.setFontSize(CONTENT_SIZE);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // Red text
        
        const shortageColumns = [
            { text: shortageQtls.toFixed(2), width: width * 0.12 },
            { text: '-', width: width * 0.12 },
            { text: '⚠️ Shortage', width: width * 0.15 },
            { text: '-', width: width * 0.25 },
            { text: '-', width: width * 0.18 },
            { text: `${shortageKg.toFixed(2)}kg`, width: width * 0.18 }
        ];
        
        currentX = x + 2;
        shortageColumns.forEach(col => {
            doc.text(String(col.text), currentX, currentY + 3, { align: 'left', maxWidth: col.width - 2 });
            currentX += col.width;
        });
        currentY += 4;
    }
    
    return currentY;
}

/**
 * Render grouped Palti (source + multiple targets + total shortage)
 * This matches the frontend display where one source item has multiple Palti targets
 */
function renderGroupedPalti(
    doc: jsPDF,
    movement: any,
    x: number,
    y: number,
    width: number
): number {
    let currentY = y;
    
    // Extract source data
    const sourceQtls = Math.abs(Number(movement.qtls || movement.actualQtls || 0));
    const sourceBags = Math.abs(Number(movement.bags || 0));
    
    // Extract source packaging
    let sourcePackaging = 'A1';
    if (movement.sourcePackaging) {
        if (typeof movement.sourcePackaging === 'object' && movement.sourcePackaging !== null) {
            sourcePackaging = movement.sourcePackaging.brandName || movement.sourcePackaging.brand || 'A1';
        } else {
            sourcePackaging = String(movement.sourcePackaging);
        }
    } else if (movement.packaging) {
        if (typeof movement.packaging === 'object' && movement.packaging !== null) {
            sourcePackaging = movement.packaging.brandName || movement.packaging.brand || 'A1';
        } else {
            sourcePackaging = String(movement.packaging);
        }
    }
    
    const sourceLocation = String(movement.fromLocation || movement.location || 'Source');
    
    // Extract variety
    let variety = 'Sum25 RNR Raw';
    if (movement.variety) {
        if (typeof movement.variety === 'object' && movement.variety !== null) {
            variety = movement.variety.name || movement.variety.variety || 'Sum25 RNR Raw';
        } else {
            variety = String(movement.variety);
        }
    }
    
    const product = String(movement.product || movement.productType || 'Rice');
    const sourcePackagingKg = Number(movement.sourcePackaging?.allottedKg || movement.bagSizeKg || 26);
    
    // ROW 1: SOURCE (Yellow background)
    doc.setFillColor(254, 243, 199); // #fef3c7 - Yellow
    doc.rect(x, currentY, width, 4, 'F');
    doc.setFontSize(CONTENT_SIZE);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    const sourceColumns = [
        { text: sourceQtls.toFixed(2), width: width * 0.12 },
        { text: `${sourceBags}/${sourcePackagingKg}kg`, width: width * 0.12 },
        { text: product, width: width * 0.15 },
        { text: variety, width: width * 0.25 },
        { text: sourcePackaging, width: width * 0.18 },
        { text: sourceLocation, width: width * 0.18 }
    ];
    
    let currentX = x + 2;
    sourceColumns.forEach(col => {
        doc.text(String(col.text), currentX, currentY + 3, { align: 'left', maxWidth: col.width - 2 });
        currentX += col.width;
    });
    currentY += 4;
    
    // ROWS 2+: PALTI TARGETS (Orange background, alternating shades)
    const splits = movement.splits || [];
    splits.forEach((split: any, idx: number) => {
        // Alternate between two orange shades
        const bgColor: [number, number, number] = idx % 2 === 0 ? [255, 247, 237] : [255, 237, 213]; // #fff7ed : #ffedd5
        doc.setFillColor(...bgColor);
        doc.rect(x, currentY, width, 4, 'F');
        doc.setFontSize(CONTENT_SIZE);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(124, 45, 18); // Dark orange text
        
        const targetQtls = Math.abs(Number(split.qtls || 0));
        const targetBags = Math.abs(Number(split.bags || 0));
        const targetBagSizeKg = Number(split.targetBagSizeKg || 26);
        
        // Extract target variety
        let targetVariety = variety; // Default to source variety
        if (split.variety) {
            if (typeof split.variety === 'object' && split.variety !== null) {
                targetVariety = split.variety.name || split.variety.variety || variety;
            } else {
                targetVariety = String(split.variety);
            }
        }
        
        // Extract target packaging
        let targetPackaging = 'A1';
        if (split.targetPackaging) {
            if (typeof split.targetPackaging === 'object' && split.targetPackaging !== null) {
                targetPackaging = split.targetPackaging.brandName || split.targetPackaging.brand || 'A1';
            } else {
                targetPackaging = String(split.targetPackaging);
            }
        }
        
        const targetLocation = String(split.targetLocation || split.to || 'Target');
        
        const targetColumns = [
            { text: targetQtls.toFixed(2), width: width * 0.12 },
            { text: `${targetBags}/${targetBagSizeKg}kg`, width: width * 0.12 },
            { text: '↳ Palti Target', width: width * 0.15 },
            { text: targetVariety, width: width * 0.25 },
            { text: targetPackaging, width: width * 0.18 },
            { text: targetLocation, width: width * 0.18 }
        ];
        
        currentX = x + 2;
        targetColumns.forEach(col => {
            doc.text(String(col.text), currentX, currentY + 3, { align: 'left', maxWidth: col.width - 2 });
            currentX += col.width;
        });
        currentY += 4;
    });
    
    // LAST ROW: TOTAL SHORTAGE (Red background) - only if total shortage > 0
    const totalShortage = splits.reduce((sum: number, s: any) => sum + Number(s.shortageKg || 0), 0);
    if (totalShortage > 0) {
        doc.setFillColor(254, 226, 226); // #fee2e2 - Light red
        doc.rect(x, currentY, width, 4, 'F');
        doc.setFontSize(CONTENT_SIZE);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // Red text
        
        const shortageQtls = totalShortage / 100;
        const shortageColumns = [
            { text: shortageQtls.toFixed(2), width: width * 0.12 },
            { text: '-', width: width * 0.12 },
            { text: '⚠️ Shortage From Palti', width: width * 0.15 },
            { text: '-', width: width * 0.25 },
            { text: '-', width: width * 0.18 },
            { text: `${totalShortage.toFixed(1)}kg`, width: width * 0.18 }
        ];
        
        currentX = x + 2;
        shortageColumns.forEach(col => {
            doc.text(String(col.text), currentX, currentY + 3, { align: 'left', maxWidth: col.width - 2 });
            currentX += col.width;
        });
        currentY += 4;
    }
    
    return currentY;
}

/**
 * Render closing stock
 */
function renderClosingStock(doc: jsPDF, closing: any, x: number, y: number, width: number): number {
    doc.setFillColor(...CLOSING_BG);
    doc.rect(x, y, width, 5, 'F');

    doc.setFontSize(CONTENT_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);

    const qtls = Number(closing.qtls || 0).toFixed(2);
    const bags = Number(closing.bags || 0);

    doc.text(`Closing Stock: ${qtls} Qtls / ${bags} Bags`, x + 2, y + 3.5);

    return y + 6;
}

/**
 * Render bottom row (3 columns: Bran, RJ Rice (2), Sizer Broken)
 */
function renderBottomRow(doc: jsPDF, productGroups: any, y: number): void {
    const bottomTypes = ['Bran', 'RJ Rice (2)', 'Sizer Broken'];
    const columnWidth = (CONTENT_WIDTH - 4) / 3;  // 3 equal columns with gaps

    bottomTypes.forEach((type, index) => {
        const x = MARGIN + (index * (columnWidth + 2));
        const data = productGroups[type] || { opening: [], movements: [], closing: { qtls: 0, bags: 0 } };
        
        if (data.opening.length > 0 || data.movements.length > 0) {
            renderProductSection(doc, type, data, x, y, columnWidth);
        }
    });
}

/**
 * Group data by product type
 */
function groupDataByProductType(dayData: any): any {
    const groups: any = {};

    const productTypes = ['Rice', 'Bran', 'Broken', 'RJ Rice 1', 'RJ Rice (2)', 'RJ Broken', 'Sizer Broken', '0 Broken'];

    productTypes.forEach(type => {
        groups[type] = {
            opening: [],
            movements: [],
            closing: { qtls: 0, bags: 0 }
        };
    });

    // Process opening stock
    if (dayData.openingStock) {
        dayData.openingStock.forEach((item: any) => {
            const type = categorizeProduct(item.product || item.productType || 'Rice');
            groups[type].opening.push(item);
        });
    }

    // Process movements
    if (dayData.productions) {
        dayData.productions.forEach((item: any) => {
            const type = categorizeProduct(item.product || item.productType || 'Rice');
            groups[type].movements.push(item);
        });
    }

    // Process conversions (palti)
    if (dayData.conversions) {
        dayData.conversions.forEach((item: any) => {
            const type = categorizeProduct(item.product || item.productType || 'Rice');
            groups[type].movements.push(item);
        });
    }

    // Calculate closing stock for each type
    productTypes.forEach(type => {
        groups[type].closing = calculateClosingStock(groups[type]);
    });

    return groups;
}

/**
 * Categorize product into standard types
 */
function categorizeProduct(product: string): string {
    const productLower = (product || '').toLowerCase();

    if (productLower.includes('bran')) return 'Bran';
    if (productLower.includes('faram')) return 'Faram';
    if (productLower.includes('unpolish')) return 'Unpolish';
    if (productLower.includes('zero broken') || productLower.includes('0 broken')) return '0 Broken';
    if (productLower.includes('sizer broken')) return 'Sizer Broken';
    if (productLower.includes('rj broken') || productLower.includes('rejection broken')) return 'RJ Broken';
    if (productLower.includes('rj rice 1')) return 'RJ Rice 1';
    if (productLower.includes('rj rice 2') || productLower.includes('rj rice (2)')) return 'RJ Rice (2)';
    if (productLower.includes('broken')) return 'Broken';
    if (productLower.includes('rice')) return 'Rice';

    return 'Rice'; // Default
}

/**
 * Calculate closing stock
 */
function calculateClosingStock(productData: any): { qtls: number; bags: number } {
    let qtls = 0;
    let bags = 0;

    // Add opening stock
    productData.opening.forEach((item: any) => {
        qtls += Number(item.qtls || item.actualQtls || 0);
        bags += Number(item.bags || 0);
    });

    // Add/subtract movements
    productData.movements.forEach((item: any) => {
        const movementType = (item.movementType || '').toLowerCase();
        const itemQtls = Math.abs(Number(item.qtls || item.actualQtls || 0));
        const itemBags = Math.abs(Number(item.bags || 0));

        if (movementType === 'sale') {
            qtls -= itemQtls;
            bags -= itemBags;
        } else {
            qtls += itemQtls;
            bags += itemBags;
        }
    });

    return { qtls, bags };
}

/**
 * Format date from various formats to DD/MM/YYYY
 */
function formatDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return dateStr;
    }
}

/**
 * Format date for display (DD-MMM-YYYY)
 */
function formatDateDisplay(dateStr: string): string {
    try {
        const [day, month, year] = dateStr.split('/');
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day}-${monthNames[date.getMonth()]}-${year}`;
    } catch {
        return dateStr;
    }
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('/');
    return new Date(Number(year), Number(month) - 1, Number(day));
}

export default generateRiceStockPDF;
