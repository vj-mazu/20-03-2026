/**
 * Hamali Status Manager - Centralized utility for managing hamali status display
 * Handles both paddy and rice hamali status indicators consistently
 */

import axios from 'axios';

interface HamaliStatusOptions {
  useCache?: boolean;
  date?: string;
  forceRefresh?: boolean;
}

interface HamaliData {
  paddyEntries?: { [key: number]: any[] };
  otherEntries: { [key: number]: any[] } | { [key: string]: any[] };
  riceEntries?: { [key: string]: any[] };
}

interface StatusIndicator {
  type: string;
  count: number;
  color: string;
  background: string;
  label: string;
}

// API Response Types
interface PaddyHamaliApiResponse {
  success: boolean;
  entries: any[];
}

interface RiceHamaliApiResponse {
  success: boolean;
  data: {
    entries: { [key: string]: any[] };
  };
}

class HamaliStatusManager {
  private cache = new Map();
  private loadingStates = new Map();

  /**
   * Get cache key for hamali status
   */
  private getCacheKey(type: string, date: string, ids: (number | string)[]): string {
    return `${type}-${date}-${ids.sort().join(',')}`;
  }

  /**
   * Check if hamali status is cached
   */
  private isCached(type: string, date: string, ids: (number | string)[]): boolean {
    const key = this.getCacheKey(type, date, ids);
    return this.cache.has(key);
  }

  /**
   * Get cached hamali status
   */
  private getCached(type: string, date: string, ids: (number | string)[]): any {
    const key = this.getCacheKey(type, date, ids);
    return this.cache.get(key);
  }

  /**
   * Set hamali status in cache
   */
  private setCache(type: string, date: string, ids: (number | string)[], data: any): void {
    const key = this.getCacheKey(type, date, ids);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
    });
  }

  /**
   * Refresh hamali status immediately after saving (Task 2.1)
   * Provides immediate cache invalidation and status update
   */
  async refreshStatusImmediate(type: 'paddy' | 'rice', entityId: number | string, options: HamaliStatusOptions = {}): Promise<void> {
    const { date } = options;
    
    console.log(`🔄 Immediate refresh for ${type} entity ${entityId}`);
    
    if (type === 'paddy') {
      // Clear cache for this specific arrival
      if (date) {
        this.clearSpecificCache('paddy', date, [entityId as number]);
      }
      
      // Force refresh the status
      await this.getPaddyHamaliStatus([entityId as number], {
        useCache: false,
        date,
        forceRefresh: true
      });
    } else if (type === 'rice') {
      // Handle both production and stock movement IDs
      const isMovement = typeof entityId === 'string' && entityId.startsWith('movement-');
      const productionIds = isMovement ? [] : [entityId as number];
      const stockMovementIds = isMovement ? [parseInt(entityId.toString().replace('movement-', ''))] : [];
      
      // Clear cache for this specific entity
      if (date) {
        this.clearSpecificCache('rice', date, [entityId]);
      }
      
      // Force refresh the status
      await this.getRiceHamaliStatus(productionIds, stockMovementIds, {
        useCache: false,
        date,
        forceRefresh: true
      });
    }
    
    console.log(`✅ Immediate refresh completed for ${type} entity ${entityId}`);
  }

  /**
   * Clear cache for specific entities (Task 2.1)
   * Allows targeted cache invalidation
   */
  clearSpecificCache(type: string, date: string, ids: (number | string)[]): void {
    const key = this.getCacheKey(type, date, ids);
    this.cache.delete(key);
    console.log(`🗑️ Cleared cache for ${type} on ${date} with IDs: ${ids.join(', ')}`);
  }

  /**
   * Clear all cache entries
   */
  clearAllCache(): void {
    this.cache.clear();
    console.log('🗑️ Cleared all hamali status cache');
  }

  /**
   * Clear expired cache entries
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, value] of entries) {
      if (value.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get hamali status for paddy entries
   */
  async getPaddyHamaliStatus(arrivalIds: number[], options: HamaliStatusOptions = {}): Promise<HamaliData> {
    const { useCache = true, date, forceRefresh = false } = options;
    
    console.log('🔍 getPaddyHamaliStatus called with:', { arrivalIds, options });
    
    if (arrivalIds.length === 0) {
      console.log('⚠️ No arrival IDs provided');
      return { paddyEntries: {}, otherEntries: {}, riceEntries: {} };
    }

    // Check cache first (skip if forceRefresh is true)
    if (useCache && date && !forceRefresh && this.isCached('paddy', date, arrivalIds)) {
      const cached = this.getCached('paddy', date, arrivalIds);
      if (cached && cached.expiresAt > Date.now()) {
        console.log('✅ Using cached paddy hamali data');
        return cached.data;
      }
    }

    // Check if already loading (skip if forceRefresh is true)
    const loadingKey = `paddy-${arrivalIds.join(',')}`;
    if (!forceRefresh && this.loadingStates.has(loadingKey)) {
      console.log('⏳ Already loading paddy hamali data');
      return this.loadingStates.get(loadingKey);
    }

    // Start loading
    console.log('🚀 Starting fresh paddy hamali data fetch');
    const loadingPromise = this._fetchPaddyHamaliStatus(arrivalIds);
    this.loadingStates.set(loadingKey, loadingPromise);

    try {
      const result = await loadingPromise;
      
      console.log('📊 Paddy hamali fetch result:', {
        paddyEntries: Object.keys(result.paddyEntries || {}).length,
        otherEntries: Object.keys(result.otherEntries || {}).length,
        totalPaddy: Object.values(result.paddyEntries || {}).flat().length,
        totalOther: Object.values(result.otherEntries || {}).flat().length
      });
      
      // Cache the result (always cache, even with forceRefresh)
      if (useCache && date) {
        this.setCache('paddy', date, arrivalIds, result);
      }
      
      return result;
    } finally {
      this.loadingStates.delete(loadingKey);
    }
  }

  /**
   * Get hamali status for rice entries
   */
  async getRiceHamaliStatus(riceProductionIds: number[] = [], stockMovementIds: number[] = [], options: HamaliStatusOptions = {}): Promise<HamaliData> {
    const { useCache = true, date, forceRefresh = false } = options;
    
    console.log('🔍 getRiceHamaliStatus called with:', { riceProductionIds, stockMovementIds, options });
    
    if (riceProductionIds.length === 0 && stockMovementIds.length === 0) {
      console.log('⚠️ No rice production or stock movement IDs provided');
      return { riceEntries: {}, otherEntries: {}, paddyEntries: {} };
    }

    const allIds = [...riceProductionIds, ...stockMovementIds.map(id => `movement-${id}`)];
    
    // Check cache first (skip if forceRefresh is true)
    if (useCache && date && !forceRefresh && this.isCached('rice', date, allIds)) {
      const cached = this.getCached('rice', date, allIds);
      if (cached && cached.expiresAt > Date.now()) {
        console.log('✅ Using cached rice hamali data');
        return cached.data;
      }
    }

    // Check if already loading (skip if forceRefresh is true)
    const loadingKey = `rice-${allIds.join(',')}`;
    if (!forceRefresh && this.loadingStates.has(loadingKey)) {
      console.log('⏳ Already loading rice hamali data');
      return this.loadingStates.get(loadingKey);
    }

    // Start loading
    console.log('🚀 Starting fresh rice hamali data fetch');
    const loadingPromise = this._fetchRiceHamaliStatus(riceProductionIds, stockMovementIds);
    this.loadingStates.set(loadingKey, loadingPromise);

    try {
      const result = await loadingPromise;
      
      console.log('📊 Rice hamali fetch result:', {
        riceEntries: Object.keys(result.riceEntries || {}).length,
        otherEntries: Object.keys(result.otherEntries || {}).length,
        totalRice: Object.values(result.riceEntries || {}).flat().length,
        totalOther: Object.values(result.otherEntries || {}).flat().length
      });
      
      // Cache the result (always cache, even with forceRefresh)
      if (useCache && date) {
        this.setCache('rice', date, allIds, result);
      }
      
      return result;
    } finally {
      this.loadingStates.delete(loadingKey);
    }
  }

  /**
   * Internal method to fetch paddy hamali status
   */
  private async _fetchPaddyHamaliStatus(arrivalIds: number[]): Promise<HamaliData> {
    console.log('🌾 Fetching paddy hamali entries for IDs:', arrivalIds);
    
    const token = localStorage.getItem('token');
    
    try {
      // FIXED: Use the correct batch endpoint that exists
      const response = await axios.get(`/paddy-hamali-entries/batch`, {
        params: { arrivalIds: arrivalIds.join(',') },
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📥 Paddy hamali API response:', response.data);

      // Type assertion for response data
      const responseData = response.data as PaddyHamaliApiResponse;

      if (!responseData.success || !responseData.entries) {
        console.warn('⚠️ Unexpected paddy hamali API response format:', responseData);
        return { paddyEntries: {}, otherEntries: {}, riceEntries: {} };
      }

      // The API returns entries grouped by arrival ID already
      const paddyEntries: { [key: number]: any[] } = {};
      const otherEntries: { [key: number]: any[] } = {};

      // Convert the API response format to our expected format
      responseData.entries.forEach((entry: any) => {
        const arrivalId = entry.arrivalId;
        if (!paddyEntries[arrivalId]) {
          paddyEntries[arrivalId] = [];
        }
        paddyEntries[arrivalId].push(entry);
      });

      console.log('📊 Processed paddy hamali entries:', {
        paddyEntries: Object.keys(paddyEntries).length,
        totalEntries: responseData.entries.length
      });

      return { paddyEntries, otherEntries, riceEntries: {} };
    } catch (error: any) {
      console.error('❌ Error fetching paddy hamali entries:', error.message);
      console.error('❌ Error details:', error.response?.data);
      return { paddyEntries: {}, otherEntries: {}, riceEntries: {} };
    }
  }

  /**
   * Internal method to fetch rice hamali status
   */
  private async _fetchRiceHamaliStatus(riceProductionIds: number[], stockMovementIds: number[]): Promise<HamaliData> {
    console.log('🍚 Fetching rice hamali entries for:', { riceProductionIds, stockMovementIds });
    
    const token = localStorage.getItem('token');
    
    try {
      // FIXED: Use the correct batch endpoint that exists
      console.log('🔍 Calling rice hamali batch API...');
      
      const response = await axios.post('/rice-hamali-entries/batch', {
        riceProductionIds,
        stockMovementIds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📥 Rice hamali API response:', response.data);
      
      // Type assertion for response data
      const responseData = response.data as RiceHamaliApiResponse;
      
      if (!responseData?.success || !responseData.data?.entries) {
        console.warn('⚠️ Rice hamali API returned unexpected format:', responseData);
        return { riceEntries: {}, otherEntries: {}, paddyEntries: {} };
      }

      const riceEntries = responseData.data.entries;
      console.log('✅ Rice hamali entries loaded:', Object.keys(riceEntries).length, 'keys');
      
      // Enhanced debugging
      Object.keys(riceEntries).forEach(key => {
        console.log(`   📊 ${key}: ${riceEntries[key].length} entries`);
        riceEntries[key].forEach((entry: any, idx: number) => {
          console.log(`      ${idx + 1}. ${entry.work_type} - ${entry.work_detail} (${entry.bags} bags)`);
        });
      });

      // For now, we don't have separate other hamali for rice, so return empty
      const otherEntries: { [key: string]: any[] } = {};

      console.log('📊 Final rice hamali grouped entries:', {
        riceEntries: Object.keys(riceEntries).length,
        otherEntries: Object.keys(otherEntries).length
      });

      return { riceEntries, otherEntries, paddyEntries: {} };
    } catch (error: any) {
      console.error('❌ Error fetching rice hamali entries:', error.message);
      console.error('❌ Error details:', error.response?.data);
      return { riceEntries: {}, otherEntries: {}, paddyEntries: {} };
    }
  }

  /**
   * Get hamali status indicators for display
   */
  getStatusIndicators(type: string, entryId: number | string, hamaliData: HamaliData): StatusIndicator[] {
    const indicators: StatusIndicator[] = [];
    
    if (type === 'paddy') {
      const { paddyEntries, otherEntries } = hamaliData;
      
      if (paddyEntries && paddyEntries[entryId as number] && paddyEntries[entryId as number].length > 0) {
        indicators.push({
          type: 'paddy',
          count: paddyEntries[entryId as number].length,
          color: '#059669',
          background: '#d1fae5',
          label: 'PADDY'
        });
      }
      
      if (otherEntries && (otherEntries as { [key: number]: any[] })[entryId as number] && (otherEntries as { [key: number]: any[] })[entryId as number].length > 0) {
        indicators.push({
          type: 'other',
          count: (otherEntries as { [key: number]: any[] })[entryId as number].length,
          color: '#7c3aed',
          background: '#ddd6fe',
          label: 'OTHER'
        });
      }
    } else if (type === 'rice') {
      const { riceEntries, otherEntries } = hamaliData;
      
      if (riceEntries && riceEntries[entryId as string] && riceEntries[entryId as string].length > 0) {
        indicators.push({
          type: 'rice',
          count: riceEntries[entryId as string].length,
          color: '#059669',
          background: '#d1fae5',
          label: 'RICE'
        });
      }
      
      if (otherEntries && (otherEntries as { [key: string]: any[] })[entryId as string] && (otherEntries as { [key: string]: any[] })[entryId as string].length > 0) {
        indicators.push({
          type: 'other',
          count: (otherEntries as { [key: string]: any[] })[entryId as string].length,
          color: '#7c3aed',
          background: '#ddd6fe',
          label: 'OTHER'
        });
      }
    }
    
    // Add "NO HAMALI" indicator if no entries found
    if (indicators.length === 0) {
      indicators.push({
        type: 'none',
        count: 0,
        color: '#dc2626',
        background: '#fee2e2',
        label: 'NO HAMALI'
      });
    }
    
    return indicators;
  }

  /**
   * Check if entry has any hamali
   */
  hasHamali(type: string, entryId: number | string, hamaliData: HamaliData): boolean {
    if (type === 'paddy') {
      const { paddyEntries, otherEntries } = hamaliData;
      return (paddyEntries && paddyEntries[entryId as number] && paddyEntries[entryId as number].length > 0) ||
             (otherEntries && (otherEntries as { [key: number]: any[] })[entryId as number] && (otherEntries as { [key: number]: any[] })[entryId as number].length > 0);
    } else if (type === 'rice') {
      const { riceEntries, otherEntries } = hamaliData;
      return (riceEntries && riceEntries[entryId as string] && riceEntries[entryId as string].length > 0) ||
             (otherEntries && (otherEntries as { [key: string]: any[] })[entryId as string] && (otherEntries as { [key: string]: any[] })[entryId as string].length > 0);
    }
    return false;
  }

  /**
   * Get total hamali count for entry
   */
  getTotalCount(type: string, entryId: number | string, hamaliData: HamaliData): number {
    if (type === 'paddy') {
      const { paddyEntries, otherEntries } = hamaliData;
      const paddyCount = paddyEntries && paddyEntries[entryId as number] ? paddyEntries[entryId as number].length : 0;
      const otherCount = otherEntries && (otherEntries as { [key: number]: any[] })[entryId as number] ? (otherEntries as { [key: number]: any[] })[entryId as number].length : 0;
      return paddyCount + otherCount;
    } else if (type === 'rice') {
      const { riceEntries, otherEntries } = hamaliData;
      const riceCount = riceEntries && riceEntries[entryId as string] ? riceEntries[entryId as string].length : 0;
      const otherCount = otherEntries && (otherEntries as { [key: string]: any[] })[entryId as string] ? (otherEntries as { [key: string]: any[] })[entryId as string].length : 0;
      return riceCount + otherCount;
    }
    return 0;
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    console.log('🧹 Clearing hamali status manager cache...');
    this.cache.clear();
    this.loadingStates.clear();
    console.log('✅ Cache cleared successfully');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalEntries: number; loadingOperations: number; memoryUsage: number } {
    this.clearExpiredCache();
    const cacheArray = Array.from(this.cache.entries());
    return {
      totalEntries: this.cache.size,
      loadingOperations: this.loadingStates.size,
      memoryUsage: JSON.stringify(cacheArray).length
    };
  }
}

// Export singleton instance
const hamaliStatusManager = new HamaliStatusManager();
export default hamaliStatusManager;