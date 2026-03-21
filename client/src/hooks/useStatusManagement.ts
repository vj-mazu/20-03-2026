import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

export type HamaliStatus = 'saved' | 'pending' | 'error' | 'editing';
export type HamaliEntryType = 'paddy_hamali' | 'rice_hamali' | 'other_hamali';

interface StatusRecord {
    id: number;
    entry_id: string;
    entry_type: HamaliEntryType;
    status: HamaliStatus;
    last_modified: string;
    modified_by: number | null;
    metadata: any;
    created_at: string;
    updated_at: string;
}

// API Response Types
interface StatusApiResponse {
    success: boolean;
    data: StatusRecord;
    error?: string;
    errorCode?: string;
}

interface BulkStatusApiResponse {
    success: boolean;
    data: StatusRecord[];
    error?: string;
    errorCode?: string;
}

interface UseStatusManagementOptions {
    entryId?: string;
    entryType?: HamaliEntryType;
    autoFetch?: boolean;
}

interface UseStatusManagementReturn {
    status: HamaliStatus | null;
    loading: boolean;
    error: string | null;
    statusRecord: StatusRecord | null;
    updateStatus: (newStatus: HamaliStatus, metadata?: any) => Promise<void>;
    fetchStatus: () => Promise<void>;
    markAsSaved: (metadata?: any) => Promise<void>;
    markAsPending: (metadata?: any) => Promise<void>;
    markAsError: (errorMessage: string, metadata?: any) => Promise<void>;
    markAsEditing: (metadata?: any) => Promise<void>;
    deleteStatus: () => Promise<void>;
}

/**
 * Hook for managing hamali entry status
 * Provides real-time status tracking and updates
 */
export const useStatusManagement = (
    options: UseStatusManagementOptions = {}
): UseStatusManagementReturn => {
    const { entryId, entryType, autoFetch = false } = options;

    const [status, setStatus] = useState<HamaliStatus | null>(null);
    const [statusRecord, setStatusRecord] = useState<StatusRecord | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch current status for the entry
     */
    const fetchStatus = useCallback(async () => {
        if (!entryId || !entryType) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/status/${entryType}/${entryId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const apiResponse = response.data as StatusApiResponse;
            if (apiResponse.success && apiResponse.data) {
                setStatusRecord(apiResponse.data);
                setStatus(apiResponse.data.status);
            } else {
                // No status found, default to pending
                setStatus('pending');
                setStatusRecord(null);
            }
        } catch (err: any) {
            console.error('Error fetching status:', err);
            if (err.response?.status === 404) {
                // No status found, default to pending
                setStatus('pending');
                setStatusRecord(null);
            } else {
                setError(err.response?.data?.error || 'Failed to fetch status');
            }
        } finally {
            setLoading(false);
        }
    }, [entryId, entryType]);

    /**
     * Update status for the entry
     */
    const updateStatus = useCallback(async (newStatus: HamaliStatus, metadata: any = {}) => {
        if (!entryId || !entryType) {
            throw new Error('Entry ID and entry type are required');
        }

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(
                `/api/status/${entryType}/${entryId}`,
                {
                    status: newStatus,
                    metadata
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            const apiResponse = response.data as StatusApiResponse;
            if (apiResponse.success && apiResponse.data) {
                setStatusRecord(apiResponse.data);
                setStatus(apiResponse.data.status);
            }
        } catch (err: any) {
            console.error('Error updating status:', err);
            setError(err.response?.data?.error || 'Failed to update status');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [entryId, entryType]);

    /**
     * Mark entry as saved
     */
    const markAsSaved = useCallback(async (metadata: any = {}) => {
        await updateStatus('saved', {
            ...metadata,
            savedAt: new Date().toISOString()
        });
    }, [updateStatus]);

    /**
     * Mark entry as pending
     */
    const markAsPending = useCallback(async (metadata: any = {}) => {
        await updateStatus('pending', {
            ...metadata,
            pendingSince: new Date().toISOString()
        });
    }, [updateStatus]);

    /**
     * Mark entry as error
     */
    const markAsError = useCallback(async (errorMessage: string, metadata: any = {}) => {
        await updateStatus('error', {
            ...metadata,
            errorMessage,
            errorAt: new Date().toISOString()
        });
    }, [updateStatus]);

    /**
     * Mark entry as editing
     */
    const markAsEditing = useCallback(async (metadata: any = {}) => {
        await updateStatus('editing', {
            ...metadata,
            editingStarted: new Date().toISOString()
        });
    }, [updateStatus]);

    /**
     * Delete status record
     */
    const deleteStatus = useCallback(async () => {
        if (!entryId || !entryType) {
            throw new Error('Entry ID and entry type are required');
        }

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/status/${entryType}/${entryId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStatus(null);
            setStatusRecord(null);
        } catch (err: any) {
            console.error('Error deleting status:', err);
            setError(err.response?.data?.error || 'Failed to delete status');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [entryId, entryType]);

    // Auto-fetch status on mount if enabled
    useEffect(() => {
        if (autoFetch && entryId && entryType) {
            fetchStatus();
        }
    }, [autoFetch, entryId, entryType, fetchStatus]);

    return {
        status,
        loading,
        error,
        statusRecord,
        updateStatus,
        fetchStatus,
        markAsSaved,
        markAsPending,
        markAsError,
        markAsEditing,
        deleteStatus
    };
};

/**
 * Hook for managing multiple statuses at once
 */
export const useBulkStatusManagement = () => {
    const [statuses, setStatuses] = useState<Map<string, HamaliStatus>>(new Map());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch statuses for multiple entries
     */
    const fetchBulkStatuses = useCallback(async (entries: Array<{ entryId: string; entryType: HamaliEntryType }>) => {
        if (entries.length === 0) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                '/api/status/bulk',
                { entries },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            const apiResponse = response.data as BulkStatusApiResponse;
            if (apiResponse.success && apiResponse.data) {
                const statusMap = new Map<string, HamaliStatus>();
                apiResponse.data.forEach((record: StatusRecord) => {
                    const key = `${record.entry_type}:${record.entry_id}`;
                    statusMap.set(key, record.status);
                });
                setStatuses(statusMap);
            }
        } catch (err: any) {
            console.error('Error fetching bulk statuses:', err);
            setError(err.response?.data?.error || 'Failed to fetch statuses');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Get status for a specific entry
     */
    const getStatus = useCallback((entryId: string, entryType: HamaliEntryType): HamaliStatus => {
        const key = `${entryType}:${entryId}`;
        return statuses.get(key) || 'pending';
    }, [statuses]);

    return {
        statuses,
        loading,
        error,
        fetchBulkStatuses,
        getStatus
    };
};