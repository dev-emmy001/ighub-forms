const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpSecure = process.env.SMTP_SECURE === 'true';

async function testSMTP() {
    console.log("Testing SMTP Connection...");
    console.log("Host:", smtpHost);
    console.log("Port:", smtpPort);
    console.log("User:", smtpUser);
    console.log("Secure:", smtpSecure);
    console.log("Pass defined:", !!smtpPass);

    if (!smtpHost || !smtpUser || !smtpPass) {
        console.error("Missing SMTP credentials in .env file.");
        return;
    }

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

        // verify connection configuration
        await transporter.verify();
        console.log("✅ SMTP Server is ready to take our messages!");
    } catch (error) {
        console.error("❌ SMTP Verification Failed!");
        console.error(error);
    }
}

testSMTP();
