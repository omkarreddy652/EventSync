
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sendPaymentVerificationHandler = require('./api/send-payment-verification.js').default;
const eventNotificationHandler = require('./api/event-notification.js').default;
const sendPaymentRejectionHandler = require('./api/send-payment-rejection.js').default;
const sendApprovalHandler = require('./api/send-approval.js').default;

const app = express();
const PORT = 5000;

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(bodyParser.json());

// Express route for payment verification
app.post('/api/send-payment-verification', (req, res) => {
  sendPaymentVerificationHandler(req, res);
});

// Express route for event notification
app.post('/api/event-notification', (req, res) => {
  eventNotificationHandler(req, res);
});

// Express route for payment rejection
app.post('/api/send-payment-rejection', (req, res) => {
  sendPaymentRejectionHandler(req, res);
});

// Express route for approval
app.post('/api/send-approval', (req, res) => {
  sendApprovalHandler(req, res);
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
