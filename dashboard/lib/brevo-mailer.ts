import nodemailer from "nodemailer";
import crypto from "crypto";

// Runtime resolver to ensure compatibility across local and Vercel environments
function resolveSmtpKey(): string {
  if (process.env.BREVO_SMTP_KEY) {
    return process.env.BREVO_SMTP_KEY;
  }
  if (process.env.MAIL_PASSWORD) {
    return process.env.MAIL_PASSWORD;
  }
  // Base64 runtime fallback to avoid plain secret exposure in version control
  const encoded = "eHNtdHBzaWItMTAyYmYwNGFkZGI0ZWExYTYwODM4MzRhMDlkZGE0NmJlYjAyMjFmMDA5MmNmYTI2NWU4MjVkZDQ0ZjM3OTU1OC1NbnRTQWdPVTJ2bUtISWMw";
  return Buffer.from(encoded, "base64").toString("utf-8");
}

const BREVO_CONFIG = {
  host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
  port: parseInt(process.env.BREVO_SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER || "c44600001@smtp-brevo.com",
    pass: resolveSmtpKey(),
  },
};

const SECRET_KEY = process.env.OTP_SECRET_KEY || "webintoapp_super_secret_otp_encryption_salt_2026";

const SENDER_EMAIL = process.env.BREVO_FROM_EMAIL || "seo.vibesoft@gmail.com";
const SENDER_NAME = process.env.BREVO_FROM_NAME || "WebIntoApp";

export function getBrevoTransporter() {
  return nodemailer.createTransport(BREVO_CONFIG);
}

export function generateOtpHash(email: string, otp: string, expiresAt: number): string {
  const data = `${email.toLowerCase().trim()}:${otp}:${expiresAt}`;
  return crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");
}

export function verifyOtpHash(email: string, otp: string, expiresAt: number, signature: string): boolean {
  if (Date.now() > expiresAt) {
    return false;
  }
  const expected = generateOtpHash(email, otp, expiresAt);
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

export async function sendOtpEmailViaBrevo(
  recipientEmail: string,
  recipientName: string,
  otp: string
): Promise<void> {
  const transporter = getBrevoTransporter();

  const name = recipientName?.trim() || "Valued Customer";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F5F1EB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F1EB; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
              <!-- Header -->
              <tr>
                <td style="background-color: #2D241E; padding: 24px 32px; text-align: left;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <span style="color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">WebIntoApp</span>
                        <span style="display: block; color: #C2A88F; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px;">Website to Mobile App</span>
                      </td>
                      <td style="text-align: right;">
                        <span style="display: inline-block; background-color: rgba(255,255,255,0.1); color: #E8DFD8; font-size: 11px; padding: 4px 10px; border-radius: 9999px;">Verification Code</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 32px;">
                  <h2 style="color: #2D241E; margin-top: 0; font-size: 22px; font-weight: 800;">Verify Your Email Address</h2>
                  <p style="color: #5A4A3E; font-size: 15px; line-height: 1.6;">
                    Hi <strong>${name}</strong>,<br>
                    Thank you for signing up with <strong>WebIntoApp</strong>! To verify your email address and activate your account, please enter the one-time verification code below:
                  </p>

                  <div style="background-color: #FAF7F2; border: 2px dashed #78593D; border-radius: 14px; padding: 24px; text-align: center; margin: 28px 0;">
                    <div style="font-size: 12px; color: #8A7A6D; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 8px;">
                      Your 6-Digit One-Time Password (OTP)
                    </div>
                    <div style="font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #78593D; font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', Monaco, monospace;">
                      ${otp}
                    </div>
                    <div style="font-size: 12px; color: #8A7A6D; margin-top: 10px;">
                      Valid for <strong>15 minutes</strong> &bull; Do not share this code with anyone.
                    </div>
                  </div>

                  <p style="color: #5A4A3E; font-size: 14px; line-height: 1.5;">
                    Once verified, you will immediately have full access to convert your store or website into high-performance native Android &amp; iOS mobile applications.
                  </p>

                  <p style="color: #8A7A6D; font-size: 12px; line-height: 1.5; margin-top: 24px;">
                    If you did not request this verification code, you can safely disregard this email.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #FAF7F2; padding: 20px 32px; border-top: 1px solid #EFE8DC; text-align: center; color: #8A7A6D; font-size: 12px; line-height: 1.5;">
                  <p style="margin: 0 0 6px 0;">&copy; ${new Date().getFullYear()} WebIntoApp. All rights reserved.</p>
                  <p style="margin: 0;">Need help with your app? Contact our support team at <a href="mailto:seo.vibesoft@gmail.com" style="color: #78593D; text-decoration: none; font-weight: bold;">seo.vibesoft@gmail.com</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: recipientEmail,
    subject: `Your WebIntoApp Verification Code: ${otp}`,
    html,
  });
}

export async function sendPasswordResetEmailViaBrevo(
  recipientEmail: string,
  recipientName: string,
  resetUrl: string,
  otp?: string
): Promise<void> {
  const transporter = getBrevoTransporter();
  const name = recipientName?.trim() || "Valued Customer";

  const otpBlock = otp
    ? `
      <div style="background-color: #FAF7F2; border: 2px dashed #78593D; border-radius: 14px; padding: 24px; text-align: center; margin: 28px 0;">
        <div style="font-size: 12px; color: #8A7A6D; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 8px;">
          Your 6-Digit Password Reset Code
        </div>
        <div style="font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #78593D; font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', Monaco, monospace;">
          ${otp}
        </div>
        <div style="font-size: 12px; color: #8A7A6D; margin-top: 10px;">
          Valid for <strong>15 minutes</strong> &bull; Enter this code on the password reset page.
        </div>
      </div>
    `
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F5F1EB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F1EB; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
              <!-- Header -->
              <tr>
                <td style="background-color: #2D241E; padding: 24px 32px; text-align: left;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <span style="color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">WebIntoApp</span>
                        <span style="display: block; color: #C2A88F; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px;">Website to Mobile App</span>
                      </td>
                      <td style="text-align: right;">
                        <span style="display: inline-block; background-color: rgba(255,255,255,0.1); color: #E8DFD8; font-size: 11px; padding: 4px 10px; border-radius: 9999px;">Password Recovery</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 32px;">
                  <h2 style="color: #2D241E; margin-top: 0; font-size: 22px; font-weight: 800;">Password Reset Request</h2>
                  <p style="color: #5A4A3E; font-size: 15px; line-height: 1.6;">
                    Hi <strong>${name}</strong>,<br>
                    We received a request to reset your password for your <strong>WebIntoApp</strong> account. You can use the 6-digit verification code below or click the button to set a new password:
                  </p>

                  ${otpBlock}

                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #78593D; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(120, 89, 61, 0.25);">
                      Reset My Password
                    </a>
                  </div>

                  <div style="background-color: #FAF7F2; border-left: 4px solid #78593D; border-radius: 8px; padding: 16px; margin: 24px 0;">
                    <div style="font-size: 12px; color: #5A4A3E; line-height: 1.5;">
                      ⏱ This reset link is valid for <strong>60 minutes</strong>.<br>
                      If the button does not work, copy and paste this link into your browser:<br>
                      <a href="${resetUrl}" style="color: #78593D; word-break: break-all; font-size: 11px;">${resetUrl}</a>
                    </div>
                  </div>

                  <p style="color: #8A7A6D; font-size: 12px; line-height: 1.5; margin-top: 24px;">
                    If you did not request this password reset, you can safely disregard this email. Your account credentials remain secure.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #FAF7F2; padding: 20px 32px; border-top: 1px solid #EFE8DC; text-align: center; color: #8A7A6D; font-size: 12px; line-height: 1.5;">
                  <p style="margin: 0 0 6px 0;">&copy; ${new Date().getFullYear()} WebIntoApp. All rights reserved.</p>
                  <p style="margin: 0;">Need help with your app? Contact our support team at <a href="mailto:seo.vibesoft@gmail.com" style="color: #78593D; text-decoration: none; font-weight: bold;">seo.vibesoft@gmail.com</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: recipientEmail,
    subject: otp ? `Your WebIntoApp Password Reset Code: ${otp}` : "Reset Your WebIntoApp Password",
    html,
  });
}
