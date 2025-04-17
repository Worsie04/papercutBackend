"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_1 = require("./config");
const startServer = async () => {
    try {
        await (0, app_1.initializeApp)();
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
