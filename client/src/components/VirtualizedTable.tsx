import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * VirtualizedTable - Renders only visible rows for large datasets
 * 
 * Replaces regular <table> when dataset > 100 rows.
 * Uses @tanstack/react-virtual for O(1) rendering regardless of row count.
 * 
 * Usage:
 *   <VirtualizedTable
 *     data={entries}
 *     columns={[
 *       { key: 'date', header: 'Date', width: 100, render: (row) => row.date },
 *       { key: 'name', header: 'Name', width: 200, render: (row) => row.name },
 *     ]}
 *     rowHeight={40}
 *     maxHeight={600}
 *   />
 */

interface Column<T> {
    key: string;
    header: string;
    width?: number;
    render: (row: T, index: number) => React.ReactNode;
    align?: 'left' | 'center' | 'right';
}

interface VirtualizedTableProps<T> {
    data: T[];
    columns: Column<T>[];
    rowHeight?: number;
    maxHeight?: number;
    headerBg?: string;
    headerColor?: string;
    onRowClick?: (row: T, index: number) => void;
    emptyMessage?: string;
}

function VirtualizedTable<T>({
    data,
    columns,
    rowHeight = 36,
    maxHeight = 600,
    headerBg = '#4a90e2',
    headerColor = 'white',
    onRowClick,
    emptyMessage = 'No data found'
}: VirtualizedTableProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan: 10, // Render 10 extra rows above/below viewport
    });

    if (data.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999', fontSize: '14px' }}>
                {emptyMessage}
            </div>
        );
    }

    // For small datasets (< 100 rows), render normally without virtualization
    if (data.length < 100) {
        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ backgroundColor: headerBg, color: headerColor }}>
                            {columns.map(col => (
                                <th key={col.key} style={{
                                    padding: '8px 6px',
                                    fontWeight: '600',
                                    fontSize: '11px',
                                    textAlign: col.align || 'left',
                                    whiteSpace: 'nowrap',
                                    width: col.width ? `${col.width}px` : 'auto',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => (
                            <tr
                                key={idx}
                                onClick={() => onRowClick?.(row, idx)}
                                style={{
                                    backgroundColor: idx % 2 === 0 ? 'white' : '#f8f9fa',
                                    cursor: onRowClick ? 'pointer' : 'default',
                                }}
                            >
                                {columns.map(col => (
                                    <td key={col.key} style={{
                                        padding: '6px',
                                        border: '1px solid #e9ecef',
                                        textAlign: col.align || 'left',
                                        fontSize: '11px',
                                    }}>
                                        {col.render(row, idx)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    // For large datasets (100+ rows), use virtualization
    return (
        <div style={{ overflowX: 'auto' }}>
            {/* Fixed header */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
                <thead>
                    <tr style={{ backgroundColor: headerBg, color: headerColor }}>
                        {columns.map(col => (
                            <th key={col.key} style={{
                                padding: '8px 6px',
                                fontWeight: '600',
                                fontSize: '11px',
                                textAlign: col.align || 'left',
                                whiteSpace: 'nowrap',
                                width: col.width ? `${col.width}px` : 'auto',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
            </table>

            {/* Virtualized body */}
            <div
                ref={parentRef}
                style={{ maxHeight: `${maxHeight}px`, overflow: 'auto' }}
            >
                <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                    {virtualizer.getVirtualItems().map(virtualRow => {
                        const row = data[virtualRow.index];
                        const idx = virtualRow.index;
                        return (
                            <div
                                key={virtualRow.key}
                                onClick={() => onRowClick?.(row, idx)}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: idx % 2 === 0 ? 'white' : '#f8f9fa',
                                    cursor: onRowClick ? 'pointer' : 'default',
                                    borderBottom: '1px solid #e9ecef',
                                }}
                            >
                                {columns.map(col => (
                                    <div key={col.key} style={{
                                        padding: '4px 6px',
                                        fontSize: '11px',
                                        textAlign: col.align || 'left',
                                        width: col.width ? `${col.width}px` : `${100 / columns.length}%`,
                                        flexShrink: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {col.render(row, idx)}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default VirtualizedTable;
