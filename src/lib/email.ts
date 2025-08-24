import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<void> {
  // For development, we'll just log the email instead of sending it
  if (process.env.NODE_ENV === 'development') {
    console.log('=== EMAIL SIMULATION (Development Mode) ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML Content:');
    console.log(html);
    console.log('==========================================');
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
}

export function generatePasswordResetEmail(resetToken: string, userName: string): EmailOptions {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Password Reset Request</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { 
                display: inline-block; 
                background-color: #4F46E5; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0; 
            }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Auto Service Management System</h1>
            </div>
            <div class="content">
                <h2>Password Reset Request</h2>
                <p>Hello ${userName},</p>
                <p>We received a request to reset your password. If you made this request, please click the button below to reset your password:</p>
                <a href="${resetUrl}" class="button">Reset Password</a>
                <p>This link will expire in 1 hour for security reasons.</p>
                <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
                <p>For security reasons, please do not share this email with anyone.</p>
            </div>
            <div class="footer">
                <p>This is an automated email from Auto Service Management System.</p>
                <p>If you have any questions, please contact support.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return {
    to: '',
    subject: 'Password Reset Request - Auto Service Management System',
    html,
  };
}