require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'latest_worsie',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    define: {
      timestamps: true,
      underscored: true,
    },
    pool: {
      max: 20,
      min: 0,
      idle: 10000,
      acquire: 30000,
    },
    dialectOptions: {
      statement_timeout: 10000,
      idle_in_transaction_session_timeout: 10000,
    },
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.TEST_DB_NAME || 'latest_worsie_test_db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    define: {
      timestamps: true,
      underscored: true,
    },
    pool: {
      max: 20,
      min: 0,
      idle: 10000,
      acquire: 30000,
    },
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    define: {
      timestamps: true,
      underscored: true,
    },
    pool: {
      max: 20,
      min: 0,
      idle: 10000,
      acquire: 30000,
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      statement_timeout: 10000,
      idle_in_transaction_session_timeout: 10000,
    },
  },
}; 