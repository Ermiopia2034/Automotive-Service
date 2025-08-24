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
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates for development
  }
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<void> {
  // Check if email credentials are configured
  const hasEmailConfig = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;
  
  console.log('Email config check:', {
    host: !!process.env.EMAIL_HOST,
    user: !!process.env.EMAIL_USER,
    password: !!process.env.EMAIL_PASSWORD,
    hasConfig: hasEmailConfig
  });
  
  if (!hasEmailConfig) {
    console.log('=== EMAIL SIMULATION (No Credentials Configured) ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML Content:');
    console.log(html);
    console.log('==========================================');
    return;
  }

  try {
    console.log('Sending email to:', to);
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });
    console.log('Email sent successfully:', result.messageId);
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

export function generateApplicationApprovalEmail(
  applicantName: string,
  applicationType: 'GARAGE' | 'MECHANIC',
  garageName: string,
  approved: boolean
): EmailOptions {
  const statusText = approved ? 'approved' : 'rejected';
  const statusColor = approved ? '#10B981' : '#EF4444';
  const actionText = approved ? 'Congratulations!' : 'We\'re sorry';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Application ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .status-badge {
                display: inline-block;
                background-color: ${statusColor};
                color: white;
                padding: 8px 16px;
                border-radius: 5px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .next-steps {
                background-color: #EBF8FF;
                border-left: 4px solid #3B82F6;
                padding: 15px;
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
                <h2>Application Update</h2>
                <p>Hello ${applicantName},</p>
                <p>${actionText} Your ${applicationType.toLowerCase()} application has been <span class="status-badge">${statusText}</span>.</p>
                
                ${applicationType === 'GARAGE' ?
                  `<p><strong>Garage:</strong> ${garageName}</p>` :
                  `<p><strong>Garage:</strong> ${garageName}</p>`
                }
                
                ${approved ?
                  applicationType === 'GARAGE' ?
                    `<div class="next-steps">
                      <h3>🎉 What's Next?</h3>
                      <ul>
                        <li>Your garage is now visible to customers</li>
                        <li>You can now manage mechanics and service requests</li>
                        <li>Log in to your dashboard to start managing your business</li>
                        <li>Update your garage profile and services</li>
                      </ul>
                    </div>` :
                    `<div class="next-steps">
                      <h3>🎉 What's Next?</h3>
                      <ul>
                        <li>You can now work as a mechanic at ${garageName}</li>
                        <li>Log in to your dashboard to view service requests</li>
                        <li>Your user type has been updated to Mechanic</li>
                        <li>Contact your garage admin for further instructions</li>
                      </ul>
                    </div>` :
                  `<div class="next-steps">
                    <h3>Next Steps</h3>
                    <p>If you have any questions about this decision, please contact our support team.</p>
                    <p>You may reapply in the future if circumstances change.</p>
                  </div>`
                }
                
                <p>Thank you for your interest in our Auto Service Management System.</p>
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
    subject: `${applicationType} Application ${approved ? 'Approved' : 'Rejected'} - Auto Service Management System`,
    html,
  };
}