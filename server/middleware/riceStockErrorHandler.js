/**
 * Rice Stock Error Handling and Logging Middleware
 * 
 * Provides comprehensive error handling and logging for rice stock operations.
 * Creates detailed audit logs for rice stock variety operations only.
 * 
 * This middleware ONLY affects rice stock operations (Purchase, Sale, Palti).
 * It does NOT modify error handling for arrivals or other systems.
 * 
 * Requirements: 8.4, 8.5
 */

const { sequelize } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class RiceStockErrorHandler {
  
  /**
   * Enhanced error handling middleware for rice stock operations
   */
  static handleRiceStockErrors() {
    return async (error, req, res, next) => {
      try {
        // Only handle rice stock related errors
        if (!this.isRiceStockRequest(req)) {
          return next(error);
        }

        console.error(`🚨 Rice Stock Error: ${req.method} ${req.path}`, error);

        // Log error to audit trail
        await this.logRiceStockError(error, req);

        // Generate user-friendly error response
        const errorResponse = this.generateUserFriendlyError(error, req);

        // Send appropriate HTTP response
        res.status(errorResponse.statusCode).json(errorResponse);

      } catch (loggingError) {
        console.error('❌ Error in rice stock error handler:', loggingError);
        // Fallback to basic error response
        res.status(500).json({
          error: 'Internal server error in rice stock operation',
          message: 'An unexpected error occurred. Please try again.',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId()
        });
      }
    };
  }

  /**
   * Check if request is rice stock related
   */
  static isRiceStockRequest(req) {
    const riceStockPaths = [
      '/api/rice-stock',
      '/api/rice-stock/',
      '/api/rice-stock/varieties',
      '/api/rice-stock/movements',
      '/api/rice-stock/purchase',
      '/api/rice-stock/sale',
      '/api/rice-stock/palti'
    ];

    return riceStockPaths.some(stockPath => req.path.startsWith(stockPath));
  }

  /**
   * Log rice stock error to audit trail
   */
  static async logRiceStockError(error, req) {
    try {
      const errorLog = {
        timestamp: new Date(),
        requestId: this.generateRequestId(),
        method: req.method,
        path: req.path,
        query: req.query,
        body: this.sanitizeRequestBody(req.body),
        user: req.user ? { id: req.user.id, username: req.user.username } : null,
        errorType: error.name || 'UnknownError',
        errorMessage: error.message,
        errorStack: error.stack,
        statusCode: this.getErrorStatusCode(error),
        category: this.categorizeError(error),
        severity: this.getErrorSeverity(error)
      };

      // Log to database
      await this.logToDatabase(errorLog);

      // Log to file system
      await this.logToFile(errorLog);

      console.log(`📝 Rice stock error logged: ${errorLog.requestId}`);

    } catch (loggingError) {
      console.error('❌ Failed to log rice stock error:', loggingError);
    }
  }

  /**
   * Log error to database
   */
  static async logToDatabase(errorLog) {
    try {
      await sequelize.query(`
        INSERT INTO rice_stock_error_log (
          request_id, timestamp, method, path, query_params, request_body,
          user_id, error_type, error_message, error_stack, status_code,
          category, severity, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
      `, {
        replacements: [
          errorLog.requestId,
          errorLog.timestamp,
          errorLog.method,
          errorLog.path,
          JSON.stringify(errorLog.query),
          JSON.stringify(errorLog.body),
          errorLog.user?.id || null,
          errorLog.errorType,
          errorLog.errorMessage,
          errorLog.errorStack,
          errorLog.statusCode,
          errorLog.category,
          errorLog.severity,
          JSON.stringify({
            userAgent: errorLog.userAgent,
            ip: errorLog.ip,
            timestamp: errorLog.timestamp
          })
        ]
      });
    } catch (dbError) {
      console.error('❌ Failed to log to database:', dbError);
      // Continue with file logging even if database fails
    }
  }

  /**
   * Log error to file system
   */
  static async logToFile(errorLog) {
    try {
      const logDir = path.join(__dirname, '../logs/rice-stock-errors');
      await fs.mkdir(logDir, { recursive: true });

      const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`);
      const logEntry = `${JSON.stringify(errorLog)}\n`;

      await fs.appendFile(logFile, logEntry);
    } catch (fileError) {
      console.error('❌ Failed to log to file:', fileError);
    }
  }

  /**
   * Generate user-friendly error response
   */
  static generateUserFriendlyError(error, req) {
    const category = this.categorizeError(error);
    const statusCode = this.getErrorStatusCode(error);
    const requestId = this.generateRequestId();

    const baseResponse = {
      error: true,
      requestId,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };

    switch (category) {
      case 'VARIETY_VALIDATION':
        return {
          ...baseResponse,
          statusCode: 400,
          type: 'VARIETY_VALIDATION_ERROR',
          message: 'Invalid rice variety specified',
          details: this.getVarietyValidationDetails(error),
          suggestions: this.getVarietySuggestions(error, req)
        };

      case 'OUTTURN_NOT_FOUND':
        return {
          ...baseResponse,
          statusCode: 404,
          type: 'OUTTURN_NOT_FOUND',
          message: 'Specified outturn not found',
          details: 'The outturn ID provided does not exist in the system',
          suggestions: ['Verify the outturn ID', 'Use the varieties endpoint to get valid outturns']
        };

      case 'STOCK_INSUFFICIENT':
        return {
          ...baseResponse,
          statusCode: 400,
          type: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock for this operation',
          details: this.getStockDetails(error),
          suggestions: ['Check available stock', 'Reduce quantity', 'Verify location and variety']
        };

      case 'MIGRATION_ERROR':
        return {
          ...baseResponse,
          statusCode: 500,
          type: 'MIGRATION_ERROR',
          message: 'Error during variety migration process',
          details: 'There was an issue with the variety standardization process',
          suggestions: ['Contact system administrator', 'Try again later']
        };

      case 'DATABASE_ERROR':
        return {
          ...baseResponse,
          statusCode: 503,
          type: 'DATABASE_ERROR',
          message: 'Database connection issue',
          details: 'Unable to connect to the database',
          suggestions: ['Try again in a few moments', 'Contact support if problem persists']
        };

      case 'VALIDATION_ERROR':
        return {
          ...baseResponse,
          statusCode: 400,
          type: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: this.getValidationDetails(error),
          suggestions: this.getValidationSuggestions(error)
        };

      default:
        return {
          ...baseResponse,
          statusCode: statusCode || 500,
          type: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred',
          details: 'Please try again or contact support',
          suggestions: ['Refresh the page', 'Try the operation again', 'Contact support']
        };
    }
  }

  /**
   * Categorize error type
   */
  static categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';

    if (message.includes('variety') && (message.includes('invalid') || message.includes('not found'))) {
      return 'VARIETY_VALIDATION';
    }

    if (message.includes('outturn') && message.includes('not found')) {
      return 'OUTTURN_NOT_FOUND';
    }

    if (message.includes('insufficient') || message.includes('stock')) {
      return 'STOCK_INSUFFICIENT';
    }

    if (message.includes('migration') || message.includes('standardization')) {
      return 'MIGRATION_ERROR';
    }

    if (name.includes('sequelize') || message.includes('database') || message.includes('connection')) {
      return 'DATABASE_ERROR';
    }

    if (name.includes('validation') || message.includes('validation')) {
      return 'VALIDATION_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Get error status code
   */
  static getErrorStatusCode(error) {
    if (error.statusCode) return error.statusCode;
    if (error.status) return error.status;

    const category = this.categorizeError(error);
    const statusCodes = {
      'VARIETY_VALIDATION': 400,
      'OUTTURN_NOT_FOUND': 404,
      'STOCK_INSUFFICIENT': 400,
      'MIGRATION_ERROR': 500,
      'DATABASE_ERROR': 503,
      'VALIDATION_ERROR': 400,
      'UNKNOWN_ERROR': 500
    };

    return statusCodes[category] || 500;
  }

  /**
   * Get error severity level
   */
  static getErrorSeverity(error) {
    const category = this.categorizeError(error);
    const severityMap = {
      'VARIETY_VALIDATION': 'low',
      'OUTTURN_NOT_FOUND': 'low',
      'STOCK_INSUFFICIENT': 'medium',
      'MIGRATION_ERROR': 'high',
      'DATABASE_ERROR': 'high',
      'VALIDATION_ERROR': 'low',
      'UNKNOWN_ERROR': 'medium'
    };

    return severityMap[category] || 'medium';
  }

  /**
   * Get variety validation details
   */
  static getVarietyValidationDetails(error) {
    const message = error.message || '';
    
    if (message.includes('empty') || message.includes('null')) {
      return 'Variety field cannot be empty';
    }
    
    if (message.includes('format')) {
      return 'Variety format is invalid. Use format like "BPT RAW" or "SONA STEAM"';
    }
    
    return 'The specified variety is not valid';
  }

  /**
   * Get variety suggestions
   */
  static getVarietySuggestions(error, req) {
    const suggestions = [
      'Use the /api/rice-stock/varieties endpoint to get valid varieties',
      'Ensure variety follows the format: "VARIETY_NAME PROCESSING_TYPE"',
      'Check if the variety exists in the outturn system'
    ];

    // Add specific suggestions based on request data
    if (req.body?.variety) {
      suggestions.push(`Verify spelling of "${req.body.variety}"`);
    }

    return suggestions;
  }

  /**
   * Get stock details from error
   */
  static getStockDetails(error) {
    const message = error.message || '';
    
    // Extract quantities from error message if available
    const availableMatch = message.match(/available\s+(\d+\.?\d*)/i);
    const requestedMatch = message.match(/requested\s+(\d+\.?\d*)/i);
    
    if (availableMatch && requestedMatch) {
      return `Available: ${availableMatch[1]} QTL, Requested: ${requestedMatch[1]} QTL`;
    }
    
    return 'Stock quantity is insufficient for this operation';
  }

  /**
   * Get validation details
   */
  static getValidationDetails(error) {
    if (error.errors && Array.isArray(error.errors)) {
      return error.errors.map(err => err.message).join(', ');
    }
    
    return error.message || 'Request data validation failed';
  }

  /**
   * Get validation suggestions
   */
  static getValidationSuggestions(error) {
    const suggestions = ['Check required fields', 'Verify data types', 'Ensure all constraints are met'];
    
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach(err => {
        if (err.path) {
          suggestions.push(`Check field: ${err.path}`);
        }
      });
    }
    
    return suggestions;
  }

  /**
   * Sanitize request body for logging
   */
  static sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Generate unique request ID
   */
  static generateRequestId() {
    return `rice-stock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error statistics for monitoring
   */
  static async getErrorStatistics(timeframe = '24h') {
    try {
      const timeCondition = this.getTimeCondition(timeframe);
      
      const [stats] = await sequelize.query(`
        SELECT 
          category,
          severity,
          COUNT(*) as error_count,
          COUNT(DISTINCT user_id) as affected_users,
          MIN(timestamp) as first_occurrence,
          MAX(timestamp) as last_occurrence
        FROM rice_stock_error_log 
        WHERE timestamp >= ${timeCondition}
        GROUP BY category, severity
        ORDER BY error_count DESC
      `);

      return {
        timeframe,
        statistics: stats,
        totalErrors: stats.reduce((sum, stat) => sum + parseInt(stat.error_count), 0),
        uniqueUsers: new Set(stats.map(stat => stat.affected_users)).size
      };

    } catch (error) {
      console.error('❌ Error getting error statistics:', error);
      return { error: error.message };
    }
  }

  /**
   * Get time condition for SQL query
   */
  static getTimeCondition(timeframe) {
    const timeframes = {
      '1h': "NOW() - INTERVAL '1 hour'",
      '24h': "NOW() - INTERVAL '24 hours'",
      '7d': "NOW() - INTERVAL '7 days'",
      '30d': "NOW() - INTERVAL '30 days'"
    };

    return timeframes[timeframe] || timeframes['24h'];
  }

  /**
   * Create error log table if it doesn't exist
   */
  static async initializeErrorLogging() {
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS rice_stock_error_log (
          id SERIAL PRIMARY KEY,
          request_id VARCHAR(255) UNIQUE NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          method VARCHAR(10) NOT NULL,
          path VARCHAR(255) NOT NULL,
          query_params JSONB,
          request_body JSONB,
          user_id INTEGER,
          error_type VARCHAR(100) NOT NULL,
          error_message TEXT NOT NULL,
          error_stack TEXT,
          status_code INTEGER NOT NULL,
          category VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create indexes for performance
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_rice_stock_error_log_timestamp 
        ON rice_stock_error_log(timestamp)
      `);
      
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_rice_stock_error_log_category 
        ON rice_stock_error_log(category)
      `);
      
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_rice_stock_error_log_severity 
        ON rice_stock_error_log(severity)
      `);

      console.log('✅ Rice stock error logging initialized');

    } catch (error) {
      console.error('❌ Failed to initialize error logging:', error);
    }
  }
}

module.exports = RiceStockErrorHandler;