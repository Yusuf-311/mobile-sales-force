'use strict';

const express = require('express');
const cors = require('cors');
const { authenticate } = require('./middleware/auth');

const mclRouter        = require('./routes/mcl');
const callListRouter   = require('./routes/callList');
const callPlanRouter   = require('./routes/callPlan');
const callActualRouter = require('./routes/callActual');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Health check (no auth required)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Auth middleware for all /api/* routes
app.use('/api', authenticate);

// Route mounting
app.use('/api', mclRouter);              // serves GET /api/mcl and GET /api/products
app.use('/api/call-lists', callListRouter);
app.use('/api/call-plans', callPlanRouter);
app.use('/api/call-actuals', callActualRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

module.exports = app;
