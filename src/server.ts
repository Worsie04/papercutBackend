import { app } from './app';
import { config } from './config';
import { sequelize } from './infrastructure/database/sequelize';

const startServer = async () => {
  try {
    // Database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync database models (in development)
    if (config.nodeEnv === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database synced successfully');
    }

    // Start server
    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer(); 