import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resendApiKey = process.env.RESEND_API_KEY;
export const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

// SMTP configuration variables
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpSecure = process.env.SMTP_SECURE === 'true'; // true for port 465, false for 587/other ports
const smtpFrom = process.env.SMTP_FROM || 'IGHub Forms <noreply@ighub.ng>';

export async function sendEmail({
    to,
    subject,
    html
}: {
    to: string;
    subject: string;
    html: string;
}) {
    // 1. Try SMTP sending first if SMTP details are defined
    if (smtpHost && smtpUser && smtpPass) {
        try {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                auth: {
                    user: smtpUser,
                    pass: smtpPass
                }
            });

            const info = await transporter.sendMail({
                from: smtpFrom,
                to,
                subject,
                html
            });

            console.log('Email sent successfully via SMTP:', info.messageId);
            return { success: true, provider: 'smtp', messageId: info.messageId };
        } catch (error) {
            console.error('SMTP Email sending failed, attempting fallback if available. Error:', error);
            if (!resendClient) {
                return { success: false, error: String(error) };
            }
        }
    }

    // 2. Try Resend if configured
    if (resendClient) {
        try {
            const fromEmail = process.env.RESEND_FROM || 'IGHub Forms <noreply@ighub.ng>';
            const { data, error } = await resendClient.emails.send({
                from: fromEmail,
                to: [to],
                subject,
                html
            });

            if (error) {
                console.error('Resend Email sending failed:', error);
                return { success: false, provider: 'resend', error: error.message || String(error) };
            }

            console.log('Email sent successfully via Resend:', data?.id);
            return { success: true, provider: 'resend', id: data?.id };
        } catch (error) {
            console.error('Resend exception:', error);
            return { success: false, error: String(error) };
        }
    }

    console.warn(`No email provider configured. E-mail to "${to}" was not sent. Provide SMTP credentials or a RESEND_API_KEY in .env.`);
    return { success: false, error: 'Email service not configured. Check your .env file.' };
}
