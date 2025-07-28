import { Sequelize } from 'sequelize';
import { config } from '../../config';

// Create Sequelize instance
export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.user,
  password: config.database.password,
  logging: false, // Disable SQL query logging
  define: {
    timestamps: true,
    underscored: true,
  },
  dialectOptions: process.env.DB_SSL === 'true' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {},
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Function to initialize database connection and setup
export const initializeDatabase = async () => {
  try {
    // Test the connection first
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Import and initialize models
    const { initializeModels } = await import('../../models');
    const models = initializeModels(sequelize);

    // Import and setup associations after models are initialized
    const { setupAssociations } = await import('../../models/associations');
    await setupAssociations();

    // Never sync models automatically - use migrations instead
    console.log('Database connection verified successfully.');
    console.log('IMPORTANT: Database schema changes must be done through migrations only.');

    return models;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};
