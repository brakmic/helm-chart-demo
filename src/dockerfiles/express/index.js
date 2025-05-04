const express = require('express');
const app = express();

// Defaults for environment variables
const PORT = parseInt(process.env.PORT, 10) || 3000;
const BASE_PATH = process.env.BASE_PATH || '/';
const MESSAGE = process.env.MESSAGE || 'Hello from Express!';

// Middleware to parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get(`${BASE_PATH}healthz`, (req, res) => {
  res.status(200).send('OK');
});

// Main API endpoint
app.get(BASE_PATH, (req, res) => {
  res.json({ message: MESSAGE });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
app.listen(PORT, (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  console.log(`API listening on port ${PORT} at path '${BASE_PATH}'`);
});
