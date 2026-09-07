require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(express.json());

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

app.post('/send-sms', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const smsBody = `New contact from ${name} (${email}): ${message}`;
  try {
    await client.messages.create({
      body: smsBody,
      from: process.env.TWILIO_FROM_NUMBER,
      to: process.env.TO_PHONE,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Twilio error:', err);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SMS server listening on port ${PORT}`));
