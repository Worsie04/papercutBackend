#!/bin/bash

# Start the server with minimal logging
echo "Starting server in quiet mode..."
npm start | grep -E "Database connection|Database models|Server is running" 