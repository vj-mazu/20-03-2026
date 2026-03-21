/**
 * Query Safety Middleware
 * 
 * Ensures all database queries have reasonable limits to prevent
 * memory overflow when dealing with 10 lakh (1 million) records.
 * 
 * This middleware wraps Sequelize findAll to add default limits.
 */

const MAX_QUERY_LIMIT = 10000; // Maximum records per query
const DEFAULT_QUERY_LIMIT = 1000; // Default if no limit specified

/**
 * Apply default limit to Sequelize query options
 * @param {Object} options - Sequelize query options
 * @returns {Object} - Options with limit applied
 */
function applyQuerySafety(options = {}) {
    // If no limit is set, apply default
    if (!options.limit) {
        options.limit = DEFAULT_QUERY_LIMIT;
    }

    // If limit exceeds maximum, cap it
    if (options.limit > MAX_QUERY_LIMIT) {
        console.warn(`⚠️ Query limit ${options.limit} exceeds maximum ${MAX_QUERY_LIMIT}, capping.`);
        options.limit = MAX_QUERY_LIMIT;
    }

    return options;
}

/**
 * Helper function to safely fetch large datasets with pagination
 * @param {Model} model - Sequelize model
 * @param {Object} baseOptions - Base query options
 * @param {number} maxRecords - Maximum records to fetch
 * @returns {Promise<Array>} - All records
 */
async function fetchWithPagination(model, baseOptions = {}, maxRecords = MAX_QUERY_LIMIT) {
    const pageSize = 1000;
    let allRecords = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && allRecords.length < maxRecords) {
        const options = {
            ...baseOptions,
            limit: Math.min(pageSize, maxRecords - allRecords.length),
            offset
        };

        const records = await model.findAll(options);
        allRecords = allRecords.concat(records);

        if (records.length < pageSize) {
            hasMore = false;
        } else {
            offset += pageSize;
        }
    }

    return allRecords;
}

/**
 * Express middleware to add query timing warnings
 */
function queryTimingMiddleware(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 5000) {
            console.error(`🚨 SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
        } else if (duration > 2000) {
            console.warn(`⚠️ Slow request: ${req.method} ${req.path} took ${duration}ms`);
        }
    });

    next();
}

/**
 * Performance tips for 10 lakh records
 */
const PERFORMANCE_TIPS = {
    ALWAYS_USE_LIMIT: 'Always use limit in findAll queries',
    USE_PAGINATION: 'Use server-side pagination for large result sets',
    USE_INDEXES: 'Ensure database indexes exist for frequently filtered columns',
    USE_DATE_RANGE: 'Always filter by date range to reduce result set',
    AVOID_SELECT_ALL: 'Use attributes to select only needed columns',
    USE_RAW_QUERIES: 'For aggregations, use raw SQL with CTEs for better performance'
};

module.exports = {
    applyQuerySafety,
    fetchWithPagination,
    queryTimingMiddleware,
    MAX_QUERY_LIMIT,
    DEFAULT_QUERY_LIMIT,
    PERFORMANCE_TIPS
};
