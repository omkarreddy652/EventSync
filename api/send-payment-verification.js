import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

// Helper function to format the email body with QR code
const createHtmlBody = (name, eventName, eventId, qrCodeDataUrl) => `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #5cb85c; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Payment Verified!</h1>
  </div>
  <div style="padding: 20px;">
    <p>Hello ${name},</p>
    <p>Great news! Your payment for the event "<b>${eventName}</b>" has been successfully verified by the organizer.</p>
    <p>You can now access your unique QR code for check-in. Please have it ready when you arrive at the event.</p>
    <div style="text-align: center; margin: 30px 0;">
      <img src="${qrCodeDataUrl}" alt="QR Code" style="width:180px;height:180px;border-radius:8px;border:1px solid #e0e0e0;" />
      <br/>
      <a href="http://localhost:5173/events/${eventId}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display:inline-block; margin-top:16px;">
        Get Your QR Code
      </a>
    </div>
    <p>See you there!</p>
  </div>
  <div style="background-color: #f7f7f7; color: #777; padding: 15px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">EventSync Event Management</p>
  </div>
</div>
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, name, eventName, eventId, userId } = req.body;

  if (!email || !name || !eventName || !eventId || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const transporter = nodemailer.createTransport({
    service:'gmail',
    auth: {
      user: 'eventsync77@gmail.com',
      pass: 'vxnu aknq nzts xxdp',
    },
  });

  // Generate QR code for { eventId, userId }
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({ eventId, userId }));
  } catch (err) {
    console.error('Error generating QR code:', err);
    return res.status(500).json({ error: 'Error generating QR code', details: err.message });
  }

  const mailOptions = {
    from: '"EventSync" <eventsync77@gmail.com>',
    to: email,
    subject: `✅ Payment Verified for ${eventName}`,
    html: createHtmlBody(name, eventName, eventId, qrCodeDataUrl),
    text: `Hello ${name},\n\nYour payment for "${eventName}" has been verified. You can now get your QR code from the event page: http://localhost:5173/events/${eventId}\n\nSee you there!`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Verification email sent.' });
  } catch (err) {
    console.error('Error sending verification email:', err);
    res.status(500).json({ error: 'Error sending email', details: err.message });
  }
}