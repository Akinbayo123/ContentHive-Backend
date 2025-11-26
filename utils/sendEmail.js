import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, text, html }) => {
  // 1. Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // 2. Send email
  const info = await transporter.sendMail({
    from: `"ContentHive" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html
  });

  console.log('Message sent: %s', info.messageId);
  return info;
};

export default sendEmail;
