require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

app.post('/send-notifications', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const body = `New contact from ${name} (${email}): ${message}`;
  try {
    // SMS
    await client.messages.create({
      body,
      from: process.env.TWILIO_FROM_NUMBER,
      to: process.env.TO_PHONE,
    });

    // WhatsApp (if configured)
    if (process.env.TWILIO_WHATSAPP_FROM && process.env.TO_WHATSAPP) {
      await client.messages.create({
        body,
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: process.env.TO_WHATSAPP,
      });
    }

    // Email via nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Portfolio Contact" <${process.env.SMTP_USER}>`,
      to: process.env.EMAIL_TO,
      subject: 'New Portfolio Contact Message',
      text: body,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Notification error:', err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SMS server listening on port ${PORT}`));
