import Mailjet from 'node-mailjet';
import twilio from 'twilio';
import { db } from './db';
import { createEmailLog } from './activity-logger';

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

// Client Twilio pour WhatsApp
let twilioClient: twilio.Twilio | null = null;

function getTwilioClient() {
  if (!twilioClient) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required for WhatsApp');
    }
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

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
      console.log('📧 Email simulé:', options.subject, '->', options.to);
      return;
    }

    const client = getMailjet();

    // CORRECTION: Utiliser la bonne syntaxe Mailjet v3.1
    const request = client
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [{
          From: {
            Email: process.env.MAIL_FROM_EMAIL || 'teamproject@deep-technologies.com',
            Name: process.env.MAIL_FROM_NAME || 'Team Project'
          },
          To: [{
            Email: options.to
          }],
          Subject: options.subject,
          TextPart: options.text || '',
          HTMLPart: options.html,
        }]
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
    if (process.env.NODE_ENV !== 'production' || TWILIO_ACCOUNT_SID === 'your_twilio_account_sid') {
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

    // Utiliser Twilio pour WhatsApp
    const client = getTwilioClient();
    if (!client) {
      throw new Error('Failed to initialize Twilio client');
    }

    const message = await client.messages.create({
      from: TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:+${options.to.replace(/^\+/, '')}`, // S'assurer du format whatsapp:+...
      body: options.message
    });

    console.log('WhatsApp message SID:', message.sid);

    // Log WhatsApp dans la base de données
    await db.query(
      `INSERT INTO whatsapp_logs (recipient, message, sent_at, status, message_sid)
         VALUES ($1, $2, NOW(), 'sent', $3)`,
      [options.to, options.message, message.sid]
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

export async function createConfirmationToken(data: string | { type: string; userId: any; entityType: string; entityId: string; metadata?: any }): Promise<string> {
  // Handle both string (email) and object formats
  let email: string;
  let metadata: any = null;

  if (typeof data === 'string') {
    email = data;
  } else {
    // Get user email from userId
    const { rows } = await db.query('SELECT email FROM users WHERE id = $1', [data.userId]);
    if (rows.length === 0) {
      throw new Error('User not found');
    }
    email = rows[0].email;
    metadata = data;
  }

  // Generate a simple token (in production, use a more secure method)
  const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

  // Store token in database
  await db.query(
    `INSERT INTO email_confirmations (email, token, type, created_at, expires_at, metadata)
     VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '24 hours', $4)`,
    [email, token, metadata ? metadata.type : null, metadata ? JSON.stringify(metadata) : null]
  );

  return token;
}

export async function sendTaskUpdateEmail(data: {
  to: string;
  recipientId: string;
  recipientName: string;
  taskTitle: string;
  taskId: string;
  projectName?: string;
  updatedBy?: string;
  updatedById?: string;
  changes?: string;
}): Promise<void> {
  try {
    // Si nous avons l'ID de l'utilisateur qui met à jour, récupérons son nom complet
    let updatedByName = data.updatedBy;
    if (!updatedByName && data.updatedById) {
      try {
        const { rows } = await db.query(
          'SELECT name, email FROM users WHERE id = $1',
          [data.updatedById]
        );
        if (rows.length > 0) {
          const user = rows[0];
          updatedByName = user.name || user.email || 'Un utilisateur';
        }
      } catch (error) {
        console.error('Error fetching updater name:', error);
        updatedByName = 'Un utilisateur';
      }
    }

    const subject = `Mise à jour de la tâche: ${data.taskTitle}`;
    const html = `
      <h2>🔄 Mise à jour de la tâche</h2>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <p><strong>📂 Projet:</strong> ${data.projectName || 'N/A'}</p>
        <p><strong>📋 Tâche:</strong> ${data.taskTitle}</p>
        <p><strong>🆔 ID:</strong> ${data.taskId}</p>
        <p><strong>👤 Mis à jour par:</strong> ${updatedByName || 'N/A'}</p>
        <p><strong>📝 Modifications:</strong> ${data.changes || 'N/A'}</p>
      </div>
      <p>Bonjour ${data.recipientName},</p>
      <p>Cette tâche a été mise à jour par <strong>${updatedByName || 'un utilisateur'}</strong>. Veuillez consulter le tableau de bord pour plus de détails.</p>
    `;

    await sendEmail({
      to: data.to,
      subject,
      html
    });
  } catch (error) {
    console.error('Error sending task update email:', error);
    throw error;
  }
}

export async function sendTaskAssignmentEmail(data: {
  to: string;
  recipientId: string;
  recipientName: string;
  taskTitle: string;
  taskId: string;
  projectName?: string;
  assignedBy?: string;
  assignedById?: string;
  confirmationToken?: string;
}): Promise<void> {
  try {
    // Si nous avons l'ID de l'utilisateur qui assigne, récupérons son nom complet
    let assignedByName = data.assignedBy;
    if (!assignedByName && data.assignedById) {
      try {
        const { rows } = await db.query(
          'SELECT name, email FROM users WHERE id = $1',
          [data.assignedById]
        );
        if (rows.length > 0) {
          const user = rows[0];
          assignedByName = user.name || user.email || 'Un utilisateur';
        }
      } catch (error) {
        console.error('Error fetching assigner name:', error);
        assignedByName = 'Un utilisateur';
      }
    }

    const subject = `Nouvelle tâche assignée: ${data.taskTitle}`;
    const acceptUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001'}/tasks/${data.taskId}/accept?token=${data.confirmationToken}`;
    const rejectUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001'}/tasks/${data.taskId}/reject?token=${data.confirmationToken}`;

    const html = `
      <h2>🎯 Nouvelle tâche assignée</h2>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <p><strong>📂 Projet:</strong> ${data.projectName || 'N/A'}</p>
        <p><strong>📋 Tâche:</strong> ${data.taskTitle}</p>
        <p><strong>🆔 ID:</strong> ${data.taskId}</p>
        <p><strong>👤 Assignée par:</strong> ${assignedByName || 'Un utilisateur'}</p>
      </div>
      <p>Bonjour ${data.recipientName},</p>
      <p>Vous avez été assigné(e) à cette tâche par <strong>${assignedByName || 'un utilisateur'}</strong>. Veuillez consulter le tableau de bord pour plus de détails.</p>
      
      <div style="background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p style="margin: 0 0 10px 0;"><strong>� Actions requises:</strong></p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <a href="${acceptUrl}" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
             ✅ Accepter la tâche
          </a>
          <a href="${rejectUrl}" 
             style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
             ❌ Refuser la tâche
          </a>
        </div>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
          ⚠️ Une fois que vous acceptez ou refusez cette tâche, vous ne pourrez plus changer votre décision.
        </p>
      </div>
      
      <p style="margin-top: 20px;">
        <a href="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/tasks/${data.taskId}" 
           style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
           Voir les détails de la tâche
        </a>
      </p>
    `;

    await sendEmail({
      to: data.to,
      subject,
      html
    });
  } catch (error) {
    console.error('Error sending task assignment email:', error);
    throw error;
  }
}