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

    console.log('SMS sent successfully to:', options.to);
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
}

export async function sendWhatsApp(options: WhatsAppOptions): Promise<void> {
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          From: TWILIO_WHATSAPP_NUMBER,
          To: `whatsapp:${options.to}`,
          Body: options.message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Twilio WhatsApp error: ${response.statusText}`);
    }

    console.log('WhatsApp message sent successfully to:', options.to);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

export async function sendTaskReminder(
  taskId: string,
  userId: string,
  channels: string[] = ['email']
): Promise<void> {
  try {
    // Get task details
    const taskResult = await db.query(
      'SELECT title, description, due_date FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      throw new Error('Task not found');
    }

    const task = taskResult.rows[0];

    // Get user details
    const userResult = await db.query(
      'SELECT name, email, phone FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    const message = `Rappel: La tâche "${task.title}" arrive à échéance le ${new Date(task.due_date).toLocaleDateString()}. Veuillez la compléter à temps.`;

    // Send via selected channels
    const promises = [];

    if (channels.includes('email')) {
      promises.push(
        sendEmail({
          to: user.email,
          subject: `Rappel de tâche: ${task.title}`,
          html: `
            <h2>Rappel de tâche</h2>
            <p>Bonjour ${user.name},</p>
            <p>${message}</p>
            <h3>${task.title}</h3>
            <p>${task.description || ''}</p>
            <p><strong>Date limite:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
          `,
          text: message,
        })
      );
    }

    if (channels.includes('sms') && user.phone) {
      promises.push(sendSMS({ to: user.phone, message }));
    }

    if (channels.includes('whatsapp') && user.phone) {
      promises.push(sendWhatsApp({ to: user.phone, message }));
    }

    await Promise.all(promises);
  } catch (error) {
    console.error('Error sending task reminder:', error);
    throw error;
  }
}

export async function sendTaskUpdateEmail(options: {
  to: string;
  recipientId: string;
  recipientName: string;
  taskTitle: string;
  taskId: string;
  projectName: string;
  updatedBy: string;
  changes: string;
}): Promise<void> {
  try {
    const subject = `Mise à jour de la tâche: ${options.taskTitle}`;
    const message = `La tâche "${options.taskTitle}" a été mise à jour.`;

    await sendEmail({
      to: options.to,
      subject: subject,
      html: `
        <h2>Mise à jour de la tâche</h2>
        <p>Bonjour ${options.recipientName},</p>
        <p>${options.changes} par ${options.updatedBy}.</p>
        <h3>${options.taskTitle}</h3>
        <p>Projet: ${options.projectName}</p>
        <p>ID de la tâche: ${options.taskId}</p>
      `,
      text: message,
    });
  } catch (error) {
    console.error('Error sending task update email:', error);
    throw error;
  }
}

export async function sendTaskAssignmentEmail(options: {
  to: string;
  recipientId: string;
  recipientName: string;
  taskTitle: string;
  taskId: string;
  projectName: string;
  assignedBy: string;
  confirmationToken: string;
}): Promise<void> {
  try {
    const subject = `Nouvelle tâche assignée: ${options.taskTitle}`;
    const message = `Une nouvelle tâche, "${options.taskTitle}", vous a été assignée par ${options.assignedBy}.`;

    await sendEmail({
      to: options.to,
      subject: subject,
      html: `
        <h2>Nouvelle tâche assignée</h2>
        <p>Bonjour ${options.recipientName},</p>
        <p>${message}</p>
        <h3>${options.taskTitle}</h3>
        <p>Projet: ${options.projectName}</p>
        <p>ID de la tâche: ${options.taskId}</p>
        <p>Token de confirmation: ${options.confirmationToken}</p>
      `,
      text: message,
    });
  } catch (error) {
    console.error('Error sending task assignment email:', error);
    throw error;
  }
}

export async function createConfirmationToken(params: {
  type: string;
  userId: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await db.query(
    `INSERT INTO email_confirmations (token, type, user_id, entity_type, entity_id, metadata, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [token, params.type, params.userId, params.entityType, params.entityId, JSON.stringify(params.metadata || {}), expiresAt]
  );

  return token;
}
