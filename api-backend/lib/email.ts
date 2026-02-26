import Mailjet from 'node-mailjet';
import twilio from 'twilio';
import { db } from './db';

let mailjet: Mailjet | null = null;

function getMailjet() {
  if (!mailjet) {
    const apiKey = process.env.MAILJET_API_KEY;
    const apiSecret = process.env.MAILJET_SECRET_KEY;
    if (!apiKey || !apiSecret) {
      throw new Error('Mailjet API_KEY and SECRET_KEY are required');
    }
    mailjet = new Mailjet({ apiKey, apiSecret });
  }
  return mailjet;
}

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

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
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
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
    if (process.env.NODE_ENV !== 'production' || process.env.MAILJET_API_KEY === 'f1e2b7e5c4b0a0b5f8e4e3e5f8e4e3e5') {
      console.log('📧 Email simulé:', options.subject, '->', options.to);
      return;
    }

    const client = getMailjet();
    const message: any = {
      From: {
        Email: process.env.MAIL_FROM_EMAIL || 'teamproject@deep-technologies.com',
        Name: process.env.MAIL_FROM_NAME || 'Team Project',
      },
      To: [{ Email: options.to }],
      Subject: options.subject,
      TextPart: options.text || '',
      HTMLPart: options.html,
    };

    // Ajouter les pièces jointes si elles existent
    if (options.attachments && options.attachments.length > 0) {
      message.Attachments = options.attachments.map(attachment => ({
        ContentType: attachment.contentType || 'text/csv',
        Filename: attachment.filename,
        Base64Content: Buffer.from(attachment.content).toString('base64')
      }));
    }

    const request = client.post('send', { version: 'v3.1' }).request({
      Messages: [message],
    });

    await request;

    await db.query(
      `INSERT INTO email_logs (recipient, subject, body, sent_at, status) VALUES ($1, $2, $3, NOW(), 'sent')`,
      [options.to, options.subject, options.html]
    );
  } catch (error) {
    console.error('Error sending email:', error);
    await db.query(
      `INSERT INTO email_logs (recipient, subject, body, sent_at, status, error_message) VALUES ($1, $2, $3, NOW(), 'failed', $4)`,
      [options.to, options.subject, options.html, (error as Error).message]
    );
    throw error;
  }
}

export async function sendSMS(options: SMSOptions): Promise<void> {
  // Rediriger les SMS vers WhatsApp pour maintenir la cohérence
  console.log('📱 Redirection SMS vers WhatsApp:', options.to);
  await sendWhatsApp({
    to: options.to,
    message: options.message
  });
}

export async function sendWhatsApp(options: WhatsAppOptions): Promise<void> {
  try {
    const whatsappApiUrl = process.env.WHATSAPP_API_URL || 'http://127.0.0.1:3002';

    // En mode test ou si l'API n'est pas disponible, simuler l'envoi
    if (process.env.NODE_ENV !== 'production' || whatsappApiUrl.includes('localhost')) {
      console.log('💬 WHATSAPP SIMULÉ (Mode Test):');
      console.log('To:', options.to);
      console.log('Message:', options.message);
      await db.query(
        `INSERT INTO whatsapp_logs (recipient, message, sent_at, status) VALUES ($1, $2, NOW(), 'sent')`,
        [options.to, options.message]
      );
      return;
    }

    // Vérifier si le service WhatsApp est connecté
    const statusResponse = await fetch(`${whatsappApiUrl}/status`);
    const statusData = await statusResponse.json();

    if (!statusData.connected) {
      throw new Error('WhatsApp service is not connected');
    }

    // Envoyer le message via l'API WhatsApp bot
    const response = await fetch(`${whatsappApiUrl}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: options.to,
        message: options.message
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send WhatsApp message');
    }

    const result = await response.json();
    console.log('WhatsApp message sent successfully to:', options.to);

    await db.query(
      `INSERT INTO whatsapp_logs (recipient, message, sent_at, status, message_sid) VALUES ($1, $2, NOW(), 'sent', $3)`,
      [options.to, options.message, result.messageId || 'sent']
    );
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    await db.query(
      `INSERT INTO whatsapp_logs (recipient, message, sent_at, status, error_message) VALUES ($1, $2, NOW(), 'failed', $3)`,
      [options.to, options.message, (error as Error).message]
    );
    throw error;
  }
}

export async function createConfirmationToken(
  data: string | { type: string; userId: any; entityType: string; entityId: string; metadata?: any }
): Promise<string> {
  let email: string;
  let metadata: any = null;

  if (typeof data === 'string') {
    email = data;
  } else {
    const { rows } = await db.query('SELECT email FROM users WHERE id = $1', [data.userId]);
    if (rows.length === 0) {
      throw new Error('User not found');
    }
    email = rows[0].email;
    metadata = data;
  }

  const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

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
    let updatedByName = data.updatedBy;
    if (!updatedByName && data.updatedById) {
      try {
        const { rows } = await db.query('SELECT name, email FROM users WHERE id = $1', [data.updatedById]);
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
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #007bff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">🔄 Mise à jour de Tâche</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${data.recipientName}</strong>,</p>
          <p style="font-size: 16px; margin: 0 0 20px 0;">
            La tâche "<strong>${data.taskTitle}</strong>" a été mise à jour par ${updatedByName}.
          </p>
          <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0;">📋 Détails de la tâche</h3>
            <div style="line-height: 1.6;">
              <p style="margin: 8px 0;">📂 Projet: ${data.projectName || 'Non spécifié'}</p>
              <p style="margin: 8px 0;">📝 Tâche: ${data.taskTitle}</p>
              <p style="margin: 8px 0;">🆔 ID: ${data.taskId}</p>
              <p style="margin: 8px 0;">👤 Mis à jour par: ${updatedByName}</p>
              <p style="margin: 8px 0;">📅 Date de mise à jour: ${new Date().toLocaleDateString('fr-FR')}</p>
              ${data.changes ? `<p style="margin: 8px 0;">📝 Modifications: ${data.changes}</p>` : ''}
            </div>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${frontendUrl}/tasks/${data.taskId}"
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              📋 Voir la tâche
            </a>
          </div>
          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 12px;">
              Cet email a été envoyé automatiquement par le système de gestion de tâches TDR2.
            </p>
          </div>
        </div>
      </div>
    `;

    await sendEmail({ to: data.to, subject, html });
  } catch (error) {
    console.error('Error sending task update email:', error);
    throw error;
  }
}

export async function getManagersAndAdmins(): Promise<{ id: string; name: string; email: string; role: string }[]> {
  const { rows } = await db.query(`
    SELECT id, name, email, role
    FROM users
    WHERE role IN ('admin', 'manager') AND is_active = true
  `);
  return rows;
}

export async function sendTaskReminderEmail(data: {
  to: string;
  recipientId: string;
  recipientName: string;
  taskTitle: string;
  taskId: string;
  projectName?: string;
  dueDate: string;
}): Promise<void> {
  try {
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
    const daysRemaining = Math.ceil(
      (new Date(data.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const dueDateFormatted = new Date(data.dueDate).toLocaleDateString('fr-FR');
    const todayFormatted = new Date().toLocaleDateString('fr-FR');

    const employeeHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ffc107; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: #212529; margin: 0;">⏰ Rappel de Tâche</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${data.recipientName}</strong>,</p>
          <p style="font-size: 16px; margin: 0 0 20px 0;">
            C'est un rappel pour votre tâche "<strong>${data.taskTitle}</strong>" qui arrive à échéance le ${dueDateFormatted}.
          </p>
          <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0;">📋 Détails de votre tâche</h3>
            <div style="line-height: 1.6;">
              <p style="margin: 8px 0;">📂 Projet: ${data.projectName || 'Non spécifié'}</p>
              <p style="margin: 8px 0;">📝 Tâche: ${data.taskTitle}</p>
              <p style="margin: 8px 0;">🆔 ID: ${data.taskId}</p>
              <p style="margin: 8px 0;">📅 Date d'échéance: ${dueDateFormatted}</p>
              <p style="margin: 8px 0;">📅 Date actuelle: ${todayFormatted}</p>
              <p style="margin: 8px 0;">⏳ Temps restant: ${daysRemaining} jours</p>
            </div>
          </div>
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>⚠️ Action requise:</strong>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #856404;">
              Veuillez compléter cette tâche avant la date d'échéance. Si vous avez besoin d'aide, contactez votre manager.
            </p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${frontendUrl}/tasks/${data.taskId}"
               style="background-color: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              📋 Accéder à ma tâche
            </a>
          </div>
          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 12px;">
              Cet email a été envoyé automatiquement par le système de gestion de tâches TDR2.
            </p>
          </div>
        </div>
      </div>
    `;

    await sendEmail({
      to: data.to,
      subject: `Rappel de votre tâche: ${data.taskTitle}`,
      html: employeeHtml,
    });

    const managersAndAdmins = await getManagersAndAdmins();
    for (const manager of managersAndAdmins) {
      const managerHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ffc107; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #212529; margin: 0;">⏰ Rappel de Tâche</h1>
          </div>
          <div style="background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-radius: 0 0 8px 8px;">
            <p>Bonjour <strong>${manager.name}</strong>,</p>
            <p style="font-size: 16px; margin: 0 0 20px 0;">
              <strong>${data.recipientName}</strong> est en retard sur la tâche "<strong>${data.taskTitle}</strong>".
            </p>
            <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0;">📋 Détails du rappel</h3>
              <div style="line-height: 1.6;">
                <p style="margin: 8px 0;">📂 Projet: ${data.projectName || 'Non spécifié'}</p>
                <p style="margin: 8px 0;">📝 Tâche: ${data.taskTitle}</p>
                <p style="margin: 8px 0;">🆔 ID: ${data.taskId}</p>
                <p style="margin: 8px 0;">👤 Assignée à: ${data.recipientName}</p>
                <p style="margin: 8px 0;">📅 Date d'échéance: ${dueDateFormatted}</p>
                <p style="margin: 8px 0;">📅 Date actuelle: ${todayFormatted}</p>
                <p style="margin: 8px 0;">⏳ Temps restant: ${daysRemaining} jours</p>
              </div>
            </div>
            <div style="background-color: #f8d7da; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <strong>⚠️ Action requise:</strong>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #721c24;">
                Veuillez contacter <strong>${data.recipientName}</strong> pour connaître l'avancement de cette tâche et l'aider à la compléter si nécessaire.
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${frontendUrl}/tasks/${data.taskId}"
                 style="background-color: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                📋 Voir la tâche
              </a>
            </div>
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 12px;">
                Cet email a été envoyé automatiquement par le système de gestion de tâches TDR2.
              </p>
            </div>
          </div>
        </div>
      `;

      await sendEmail({
        to: manager.email,
        subject: `Rappel de tâche: ${data.taskTitle}`,
        html: managerHtml,
      });
    }
  } catch (error) {
    console.error('Error sending task reminder email:', error);
    throw error;
  }
}

export async function sendTaskAssignmentWhatsApp(data: {
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
    let assignedByName = data.assignedBy;
    if (!assignedByName && data.assignedById) {
      try {
        const { rows } = await db.query('SELECT name, email FROM users WHERE id = $1', [data.assignedById]);
        if (rows.length > 0) {
          const user = rows[0];
          assignedByName = user.name || user.email || 'Un utilisateur';
        }
      } catch (error) {
        console.error('Error fetching assigner name:', error);
        assignedByName = 'Un utilisateur';
      }
    }

    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
    const acceptUrl = `${frontendUrl}/tasks/${data.taskId}/accept?token=${data.confirmationToken}`;
    const rejectUrl = `${frontendUrl}/tasks/${data.taskId}/reject?token=${data.confirmationToken}`;
    const taskUrl = `${frontendUrl}/tasks/${data.taskId}`;
    const todayFormatted = new Date().toLocaleDateString('fr-FR');

    const whatsappMessage = `🎯 *Nouvelle Tâche Assignée*

Bonjour *${data.recipientName}*,

Vous avez été assigné(e) à la tâche "*${data.taskTitle}*" par ${assignedByName}.

📋 *Détails de la tâche:*
📂 Projet: ${data.projectName || 'Non spécifié'}
📝 Tâche: ${data.taskTitle}
🆔 ID: ${data.taskId}
👤 Assignée par: ${assignedByName}
📅 Date d'assignation: ${todayFormatted}

⚠️ *Action requise:*
Veuillez consulter votre email ou l'application Team Project pour accepter ou refuser cette tâche.

_Cette notification a été envoyée automatiquement par Team Project_`;

    await sendWhatsApp({
      to: data.to,
      message: whatsappMessage
    });

    console.log(`💬 WhatsApp d'assignation envoyé à ${data.to} pour la tâche ${data.taskTitle}`);
  } catch (error) {
    console.error('Error sending task assignment WhatsApp:', error);
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
  rejectionToken?: string;
}): Promise<void> {
  try {
    let assignedByName = data.assignedBy;
    if (!assignedByName && data.assignedById) {
      try {
        const { rows } = await db.query('SELECT name, email FROM users WHERE id = $1', [data.assignedById]);
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
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
    const acceptUrl = `${frontendUrl}/tasks/${data.taskId}/accept?token=${data.confirmationToken}`;
    const rejectUrl = `${frontendUrl}/tasks/${data.taskId}/reject?token=${data.confirmationToken}`; // Utiliser le confirmationToken pour le lien de refus temporairement
    const todayFormatted = new Date().toLocaleDateString('fr-FR');

    const employeeHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #28a745; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">🎯 Nouvelle Tâche Assignée</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${data.recipientName}</strong>,</p>
          <p style="font-size: 16px; margin: 0 0 20px 0;">
            Vous avez été assigné(e) à la tâche "<strong>${data.taskTitle}</strong>" par ${assignedByName}.
          </p>
          <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0;">📋 Détails de la tâche</h3>
            <div style="line-height: 1.6;">
              <p style="margin: 8px 0;">📂 Projet: ${data.projectName || 'Non spécifié'}</p>
              <p style="margin: 8px 0;">📝 Tâche: ${data.taskTitle}</p>
              <p style="margin: 8px 0;">🆔 ID: ${data.taskId}</p>
              <p style="margin: 8px 0;">👤 Assignée par: ${assignedByName}</p>
              <p style="margin: 8px 0;">📅 Date d'assignation: ${todayFormatted}</p>
            </div>
          </div>
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>⚠️ Actions requises:</strong>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${acceptUrl}"
               style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px; display: inline-block;">
              ✅ Accepter la tâche
            </a>
            <a href="${rejectUrl}"
               style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              ❌ Refuser la tâche
            </a>
          </div>
          <p style="text-align: center; color: #6c757d; font-size: 13px;">
            ⚠️ Une fois que vous acceptez ou refusez cette tâche, vous ne pourrez plus changer votre décision.
          </p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${frontendUrl}/tasks/${data.taskId}"
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              📋 Voir la tâche
            </a>
          </div>
          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 12px;">
              Cet email a été envoyé automatiquement par le système de gestion de tâches TDR2.
            </p>
          </div>
        </div>
      </div>
    `;

    await sendEmail({ to: data.to, subject, html: employeeHtml });

    const managersAndAdmins = await getManagersAndAdmins();
    for (const manager of managersAndAdmins) {
      if (manager.id !== data.assignedById) {
        const managerHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #007bff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">📋 Assignation de Tâche</h1>
            </div>
            <div style="background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-radius: 0 0 8px 8px;">
              <p>Bonjour <strong>${manager.name}</strong>,</p>
              <p style="font-size: 16px; margin: 0 0 20px 0;">
                <strong>${assignedByName}</strong> a assigné la tâche "<strong>${data.taskTitle}</strong>" à <strong>${data.recipientName}</strong>.
              </p>
              <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0;">📋 Détails de la tâche</h3>
                <div style="line-height: 1.6;">
                  <p style="margin: 8px 0;">📂 Projet: ${data.projectName || 'Non spécifié'}</p>
                  <p style="margin: 8px 0;">📝 Tâche: ${data.taskTitle}</p>
                  <p style="margin: 8px 0;">🆔 ID: ${data.taskId}</p>
                  <p style="margin: 8px 0;">👤 Assignée par: ${assignedByName}</p>
                  <p style="margin: 8px 0;">👤 Assignée à: ${data.recipientName}</p>
                  <p style="margin: 8px 0;">📅 Date d'assignation: ${todayFormatted}</p>
                </div>
              </div>
              <div style="background-color: #d1ecf1; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong>⚠️ Action requise:</strong>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #0c5460;">
                  Veuillez vérifier cette assignation et vous assurer que <strong>${data.recipientName}</strong> dispose des ressources nécessaires pour accomplir cette tâche.
                </p>
              </div>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${frontendUrl}/tasks/${data.taskId}"
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  📋 Voir la tâche
                </a>
              </div>
              <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <p style="color: #6c757d; font-size: 12px;">
                  Cet email a été envoyé automatiquement par le système de gestion de tâches TDR2.
                </p>
              </div>
            </div>
          </div>
        `;

        await sendEmail({
          to: manager.email,
          subject: `Assignation de tâche: ${data.taskTitle}`,
          html: managerHtml,
        });
      }
    }
  } catch (error) {
    console.error('Error sending task assignment email:', error);
    throw error;
  }
}