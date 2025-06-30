const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const sendEmail = async (options) => {
  // For development, we use an Ethereal test account.
  // In production, you would replace this with your actual SMTP provider (e.g., SendGrid, Mailgun, AWS SES).
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: process.env.EMAIL_PORT || 587,
    auth: {
      user: process.env.EMAIL_USERNAME || 'arianna.baumbach@ethereal.email',
      pass: process.env.EMAIL_PASSWORD || 'u4yQ52hQWMRxAnYqgT'
    }
  });

  // Define the email options
  const mailOptions = {
    from: '"Aegis Chat Support" <support@aegis-chat.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: can be added for styled emails
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    // Log the preview URL for Ethereal so you can view the sent email
    logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    logger.error('Error sending email:', { error: error.message });
    // In a real app, you might have a more robust error handling/retry mechanism
    throw new Error('Email could not be sent.');
  }
};

module.exports = sendEmail;