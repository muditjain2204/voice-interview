import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

// Create email transporter
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!config.smtp.host) {
    logger.warn('SMTP not configured, skipping email');
    return false;
  }

  try {
    await transporter.sendMail({
      from: config.smtp.user,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info(`Email sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    logger.error('Email send error:', error);
    return false;
  }
}

export async function sendVerificationEmail(
  email: string,
  name: string
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4F46E5;">Welcome to VoiceInterview AI!</h2>
      <p>Hi ${name},</p>
      <p>Thank you for signing up. Your account has been created successfully.</p>
      <p>You can now schedule and practice interviews with our AI-powered voice interview platform.</p>
      <p>Best regards,<br>VoiceInterview AI Team</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to VoiceInterview AI',
    html,
  });
}

export async function sendInterviewScheduledEmail(
  email: string,
  name: string,
  role: string,
  scheduledAt: string
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4F46E5;">Interview Scheduled</h2>
      <p>Hi ${name},</p>
      <p>Your interview has been scheduled successfully.</p>
      <p><strong>Role:</strong> ${role}</p>
      <p><strong>Scheduled At:</strong> ${new Date(scheduledAt).toLocaleString()}</p>
      <p>Click the button below to join your interview:</p>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/interview"
         style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px;">
        Join Interview
      </a>
      <p>Best regards,<br>VoiceInterview AI Team</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Interview Scheduled - VoiceInterview AI',
    html,
  });
}

export async function sendInterviewCompletedEmail(
  email: string,
  name: string,
  role: string,
  score: number
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4F46E5;">Interview Completed</h2>
      <p>Hi ${name},</p>
      <p>Your interview for <strong>${role}</strong> has been completed.</p>
      <p><strong>Overall Score:</strong> ${score}/100</p>
      <p>Check your dashboard for detailed feedback and analysis.</p>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard"
         style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px;">
        View Results
      </a>
      <p>Best regards,<br>VoiceInterview AI Team</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Interview Completed - VoiceInterview AI',
    html,
  });
}