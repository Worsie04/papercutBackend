import { app, initializeApp } from './app';
import { config } from './config';

const startServer = async () => {
  try {
    await initializeApp();

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