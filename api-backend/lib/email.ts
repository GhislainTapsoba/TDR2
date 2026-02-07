import Mailjet from 'node-mailjet';
import { db } from './db';

let mailjet: Mailjet | null = null;

function getMailjet() {
  if (!mailjet) {
    const apiKey = process.env.MAILJET_API_KEY;
    const apiSecret = process.env.MAILJET_SECRET_KEY;
    if (!apiKey || !apiSecret) {
      throw new Error('Mailjet API_KEY and SECRET_KEY are required');
    }
    mailjet = new Mailjet({
      apiKey,
      apiSecret,
    });
  }
  return mailjet;
}

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || '';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SMSOptions {
  to: string;
  message: string;
}

interface WhatsAppOptions {
  to: string;
  message: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    // En mode développement/test, simuler l'envoi d'email
    if (process.env.NODE_ENV !== 'production' || process.env.MAILJET_API_KEY === 'f1e2b7e5c4b0a0b5f8e4e3e5f8e4e3e5') {
      console.log('📧 EMAIL SIMULÉ (Mode Test):');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('HTML:', options.html);
      
      // Log email dans la base de données
      await db.query(
        `INSERT INTO email_logs (recipient, subject, body, sent_at, status)
         VALUES ($1, $2, $3, NOW(), 'sent')`,
        [options.to, options.subject, options.html]
      );
      
      return;
    }

    // En production, utiliser Mailjet
    const request = getMailjet().post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: process.env.MAIL_FROM_EMAIL || 'noreply@example.com',
            Name: process.env.MAIL_FROM_NAME || 'TDR Projects',
          },
          To: [
            {
              Email: options.to,
            },
          ],
          Subject: options.subject,
          TextPart: options.text || '',
          HTMLPart: options.html,
        },
      ],
    });

    await request;

    // Log email
    await db.query(
      `INSERT INTO email_logs (recipient, subject, body, sent_at, status)
       VALUES ($1, $2, $3, NOW(), 'sent')`,
      [options.to, options.subject, options.html]
    );
  } catch (error) {
    console.error('Error sending email:', error);

    // Log failed email
    await db.query(
      `INSERT INTO email_logs (recipient, subject, body, sent_at, status, error_message)
       VALUES ($1, $2, $3, NOW(), 'failed', $4)`,
      [options.to, options.subject, options.html, (error as Error).message]
    );

    throw error;
  }
}

export async function sendSMS(options: SMSOptions): Promise<void> {
  try {
    // En mode développement/test, simuler l'envoi SMS
    if (process.env.NODE_ENV !== 'production' || TWILIO_ACCOUNT_SID === 'your_twilio_account_sid') {
      console.log('📱 SMS SIMULÉ (Mode Test):');
      console.log('To:', options.to);
      console.log('Message:', options.message);
      
      // Log SMS dans la base de données
      await db.query(
        `INSERT INTO sms_logs (recipient, message, sent_at, status)
         VALUES ($1, $2, NOW(), 'sent')`,
        [options.to, options.message]
      );
      
      return;
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: options.to,
          Body: options.message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Twilio SMS error: ${response.statusText}`);
    }

    // Log SMS dans la base de données
    await db.query(
      `INSERT INTO sms_logs (recipient, message, sent_at, status)
         VALUES ($1, $2, NOW(), 'sent')`,
      [options.to, options.message]
    );

    console.log('SMS sent successfully to:', options.to);
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // Log failed SMS
    await db.query(
      `INSERT INTO sms_logs (recipient, message, sent_at, status, error_message)
         VALUES ($1, $2, NOW(), 'failed', $3)`,
      [options.to, options.message, (error as Error).message]
    );
    
    throw error;
  }
}

export async function sendWhatsApp(options: WhatsAppOptions): Promise<void> {
  try {
    // En mode développement/test, simuler l'envoi WhatsApp
    if (process.env.NODE_ENV !== 'production' || WHATSAPP_API_TOKEN === 'your_whatsapp_api_token') {
      console.log('💬 WHATSAPP SIMULÉ (Mode Test):');
      console.log('To:', options.to);
      console.log('Message:', options.message);
      
      // Log WhatsApp dans la base de données
      await db.query(
        `INSERT INTO whatsapp_logs (recipient, message, sent_at, status)
         VALUES ($1, $2, NOW(), 'sent')`,
        [options.to, options.message]
      );
      
      return;
    }

    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: options.to.replace('+', ''), // Remove + if present
        type: 'template',
        template: {
          name: 'reminder_template',
          language: {
            policy: 'deterministic',
            code: 'fr'
          },
          components: [
            {
              type: 'body',
              text: options.message
            }
          ]
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp error: ${response.statusText}`);
    }

    // Log WhatsApp dans la base de données
    await db.query(
      `INSERT INTO whatsapp_logs (recipient, message, sent_at, status)
         VALUES ($1, $2, NOW(), 'sent')`,
      [options.to, options.message]
    );

    console.log('WhatsApp sent successfully to:', options.to);
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    
    // Log failed WhatsApp
    await db.query(
      `INSERT INTO whatsapp_logs (recipient, message, sent_at, status, error_message)
         VALUES ($1, $2, NOW(), 'failed', $3)`,
      [options.to, options.message, (error as Error).message]
    );
    
    throw error;
  }
}
