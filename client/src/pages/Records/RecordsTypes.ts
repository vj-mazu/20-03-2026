// ═══════════════════════════════════════════════════════
// Extracted from Records.tsx — shared interfaces
// ═══════════════════════════════════════════════════════

export interface MonthOption {
    month: string; // Format: YYYY-MM
    month_label: string; // Format: "January 2024"
}

export interface PaginationData {
    currentMonth: string | null;
    availableMonths: MonthOption[];
    totalRecords: number;
    recordsReturned?: number;
    totalPages?: number;
    truncated?: boolean;
    limit?: number;
    page?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
}

export interface RecordsResponse {
    records: { [date: string]: Arrival[] };
    pagination: PaginationData;
    closedKunchinittus?: any[];
    performance?: {
        responseTime: string;
        recordsReturned: number;
    };
}

export interface Arrival {
    id: number;
    slNo: string;
    date: string;
    movementType: string;
    broker?: string;
    variety?: string;
    bags?: number;
    fromLocation?: string;
    toKunchinintuId?: number;
    toKunchinittu?: { name: string; code?: string };
    toWarehouse?: { name: string; code?: string };
    fromKunchinittu?: { name: string; code?: string };
    fromWarehouse?: { name: string; code?: string };
    toWarehouseShift?: { name: string; code?: string };
    outturnId?: number;
    outturn?: { code: string; allottedVariety?: string; isCleared?: boolean; clearedAt?: string };
    moisture?: number;
    cutting?: string;
    wbNo: string;
    grossWeight: number;
    tareWeight: number;
    netWeight: number;
    lorryNumber: string;
    status: string;
    creator?: { username: string };
    approver?: { username: string; role: string };
    adminApprover?: { username: string; role: string };
    adminApprovedBy?: number;
    purchaseRate?: {
        amountFormula: string;
        totalAmount: number | string;
        averageRate: number | string;
    };
}

// Helper function to get week range string
export const getWeekRange = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (dt: Date) => {
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yyyy = dt.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    };

    return `Week: ${formatDate(monday)} to ${formatDate(sunday)}`;
};

// Helper function to format cutting string (e.g., "12X5" → "12 x 5")
export const formatCutting = (cutting: string | null | undefined): string => {
    if (!cutting) return '-';
    return cutting.replace(/[Xx]/g, ' x ').replace(/\s+/g, ' ').trim();
};

// Helper function to get week key for grouping
export const getWeekKey = (date: string): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
};
