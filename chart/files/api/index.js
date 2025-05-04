const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
// default to '/api' if not provided
let BASE_PATH = process.env.BASE_PATH || '/api';
// remove trailing slash (but leave root '/')
if (BASE_PATH.length > 1 && BASE_PATH.endsWith('/')) {
  BASE_PATH = BASE_PATH.slice(0, -1);
}
const MESSAGE = process.env.MESSAGE || 'Hello from Express!';
const VERSION = process.env.APP_VERSION || '1.0.0';

app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

// 1) Health check
app.get(`${BASE_PATH}/healthz`, (req, res) => res.sendStatus(200));

// 2) Version
app.get(`${BASE_PATH}/version`, (req, res) =>
  res.json({ version: VERSION })
);

// 3) Uptime / timestamp
app.get(`${BASE_PATH}/time`, (req, res) =>
  res.json({ now: new Date().toISOString(), uptime: process.uptime() })
);

// 4) Echo POST
app.post(`${BASE_PATH}/echo`, (req, res) =>
  res.json({ you_sent: req.body })
);

// 5) Main message endpoint
app.get(BASE_PATH, (req, res) =>
  res.json({ message: MESSAGE })
);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, err => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  console.log(`Listening on ${BASE_PATH} at port ${PORT}`);
});