const { Sequelize } = require('sequelize');

// Database configuration with performance optimizations
const sanitizeDatabaseUrl = (value) => {
  if (!value) return '';
  const trimmed = String(value).trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const maskDatabaseUrl = (value) => {
  if (!value) return 'N/A';
  try {
    const url = new URL(String(value));
    if (url.password) url.password = '****';
    return url.toString();
  } catch (error) {
    // If URL parsing fails (e.g., due to unencoded special characters in password),
    // use a safer regex-based mask that preserves the host and port
    const str = String(value);
    const masked = str.replace(/(:\/\/[^:]+:)([^@/]+)(@)/, '$1****$3');
    if (masked !== str) return masked;
    // Fallback if password pattern not found
    return str.replace(/:([^:@]+)@/, ':****@');
  }
};

let dbUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);
if (dbUrl) {
  // CRITICAL FIX: Do NOT use `new URL(dbUrl).toString()` as it can mangle
  // passwords containing unencoded special characters (like '#').
  // We only use the masked version for logging.
  console.log('Attempting to connect with DATABASE_URL (masked):', maskDatabaseUrl(dbUrl));
} else {
  console.log('No DATABASE_URL found, using individual environment variables.');
}

const sequelize = dbUrl
  ? new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    minifyAliases: true,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      keepAlive: true,
      statement_timeout: 30000,
      query_timeout: 25000,
      application_name: 'mother_india_stock_mgmt'
    },
    pool: {
      max: 20,  // Supabase Pro allows ~60 connections, keep headroom
      min: 5,   // Keep 5 warm connections
      acquire: 30000,
      idle: 10000,
      evict: 1000,
      maxUses: 5000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    }
  })
  : new Sequelize({
    database: process.env.DB_NAME || 'mother_india',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgresql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    minifyAliases: true,

    // Connection pool — tuned for PostgreSQL
    pool: {
      max: 15,   // Optimal for PostgreSQL (CPU cores * 2 + spindle count)
      min: 5,    // Keep 5 warm connections
      acquire: 30000,
      idle: 10000,
      evict: 1000,
      maxUses: 5000
    },

    // Query optimization settings
    dialectOptions: {
      statement_timeout: 30000,
      query_timeout: 25000,
      idle_in_transaction_session_timeout: 60000,
      application_name: 'mother_india_stock_mgmt'
    },

    // Model defaults
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    },

    // Performance settings — log slow queries (>500ms)
    benchmark: true,
    logging: (msg, timing) => {
      if (process.env.NODE_ENV === 'development') {
        if (timing > 500) console.warn(`\x1b[33m⚠ SLOW QUERY (${timing}ms):\x1b[0m`, msg);
      } else if (timing > 1000) {
        console.warn(`SLOW QUERY (${timing}ms):`, msg);
      }
    },
    logQueryParameters: process.env.NODE_ENV === 'development',

    // Retry configuration
    retry: {
      max: 3,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/
      ]
    }
  });

module.exports = { sequelize };
