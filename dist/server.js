"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_1 = require("./config");
const sequelize_1 = require("./infrastructure/database/sequelize");
const startServer = async () => {
    try {
        // Database connection
        await sequelize_1.sequelize.authenticate();
        console.log('Database connection has been established successfully.');
        // Sync database models (in development)
        if (config_1.config.nodeEnv === 'development') {
            await sequelize_1.sequelize.sync({ alter: true });
            console.log('Database synced successfully');
        }
        // Start server
        app_1.app.listen(config_1.config.port, () => {
            console.log(`Server is running on port ${config_1.config.port}`);
        });
    }
    catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
};
startServer();
