import { db } from './db';

interface ProjectStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
}

interface StageStats {
  total: number;
  completed: number;
  inProgress: number;
}

interface MemberStats {
  total: number;
  active: number;
  inactive: number;
  byRole: {
    admin: number;
    manager: number;
    member: number;
  };
}

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

export async function generateProjectReport(projectId?: string): Promise<string> {
  try {
    let whereClause = '';
    let params: any[] = [];

    if (projectId) {
      whereClause = 'WHERE p.id = $1';
      params = [projectId];
    }

    const query = `
      SELECT 
        p.id,
        p.title as project_title,
        p.created_at as project_created,
        p.status as project_status,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
        COUNT(DISTINCT CASE WHEN t.due_date < NOW() AND t.status != 'completed' THEN t.id END) as overdue_tasks,
        COUNT(DISTINCT s.id) as total_stages,
        COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_stages,
        COUNT(DISTINCT ta.user_id) as team_members
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN stages s ON p.id = s.project_id  
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      ${whereClause}
      GROUP BY p.id, p.title, p.created_at, p.status
      ORDER BY p.created_at DESC
    `;

    const { rows } = await db.query(query, params);

    if (rows.length === 0) {
      return 'Aucun projet trouvé pour générer un rapport.';
    }

    let report = '📊 **RAPPORT DE PROJETS**\n\n';
    report += `Généré le: ${new Date().toLocaleDateString('fr-FR')}\n\n`;

    for (const project of rows) {
      report += `🏗️ **${project.project_title}**\n`;
      report += `📅 Créé le: ${new Date(project.project_created).toLocaleDateString('fr-FR')}\n`;
      report += `📊 Statut: ${project.project_status || 'Actif'}\n`;
      report += `👥 Équipe: ${project.team_members} membre(s)\n\n`;

      report += `📋 **Tâches:**\n`;
      report += `• Total: ${project.total_tasks}\n`;
      report += `• Terminées: ${project.completed_tasks}\n`;
      report += `• En cours: ${project.in_progress_tasks}\n`;
      report += `• En retard: ${project.overdue_tasks}\n\n`;

      report += `🎯 **Étapes:**\n`;
      report += `• Total: ${project.total_stages}\n`;
      report += `• Terminées: ${project.completed_stages}\n\n`;

      const completionRate = project.total_tasks > 0
        ? Math.round((project.completed_tasks / project.total_tasks) * 100)
        : 0;

      report += `📈 **Taux de complétion:** ${completionRate}%\n`;
      report += '---\n\n';
    }

    return report;
  } catch (error) {
    console.error('Error generating project report:', error);
    return 'Erreur lors de la génération du rapport de projets.';
  }
}

export async function generateTeamReport(): Promise<string> {
  try {
    const query = `
      SELECT 
        u.role,
        u.is_active,
        COUNT(*) as count,
        COUNT(DISTINCT ta.task_id) as assigned_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN ta.task_id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.due_date < NOW() AND t.status != 'completed' THEN ta.task_id END) as overdue_tasks
      FROM users u
      LEFT JOIN task_assignees ta ON u.id = ta.user_id
      LEFT JOIN tasks t ON ta.task_id = t.id
      GROUP BY u.id, u.role, u.is_active
      ORDER BY u.role, u.is_active DESC
    `;

    const { rows } = await db.query(query);

    let report = '👥 **RAPPORT D\'ÉQUIPE**\n\n';
    report += `Généré le: ${new Date().toLocaleDateString('fr-FR')}\n\n`;

    const stats = {
      admin: { total: 0, active: 0, tasks: 0, completed: 0 },
      manager: { total: 0, active: 0, tasks: 0, completed: 0 },
      member: { total: 0, active: 0, tasks: 0, completed: 0 }
    };

    for (const member of rows) {
      const role = member.role as keyof typeof stats;
      if (stats[role]) {
        stats[role].total++;
        if (member.is_active) stats[role].active++;
        stats[role].tasks += member.assigned_tasks || 0;
        stats[role].completed += member.completed_tasks || 0;
      }
    }

    // Résumé par rôle
    report += '📊 **Effectif par rôle:**\n';
    for (const [role, data] of Object.entries(stats)) {
      const roleLabel = role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : 'Membre';
      report += `• ${roleLabel}: ${data.active}/${data.total} actifs\n`;
    }
    report += '\n';

    // Performance par rôle
    report += '📈 **Performance par rôle:**\n';
    for (const [role, data] of Object.entries(stats)) {
      const roleLabel = role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : 'Membre';
      const completionRate = data.tasks > 0 ? Math.round((data.completed / data.tasks) * 100) : 0;
      report += `• ${roleLabel}: ${completionRate}% de tâches complétées (${data.completed}/${data.tasks})\n`;
    }
    report += '\n';

    // Détails des membres actifs
    report += '👤 **Membres actifs:**\n';
    for (const member of rows.filter(r => r.is_active)) {
      const roleLabel = member.role === 'admin' ? 'Admin' : member.role === 'manager' ? 'Manager' : 'Membre';
      const completionRate = member.assigned_tasks > 0
        ? Math.round((member.completed_tasks / member.assigned_tasks) * 100)
        : 0;

      report += `• ${member.email} (${roleLabel})\n`;
      report += `  - Tâches: ${member.completed_tasks}/${member.assigned_tasks} (${completionRate}%)\n`;
      report += `  - En retard: ${member.overdue_tasks || 0}\n`;
    }

    return report;
  } catch (error) {
    console.error('Error generating team report:', error);
    return 'Erreur lors de la génération du rapport d\'équipe.';
  }
}

export async function generateTasksReport(): Promise<string> {
  try {
    const query = `
      SELECT 
        t.title,
        t.status,
        t.priority,
        t.due_date,
        t.created_at,
        p.title as project_title,
        u.email as assigned_to,
        CASE 
          WHEN t.due_date < NOW() AND t.status != 'completed' THEN 'En retard'
          WHEN t.due_date::date = CURRENT_DATE THEN 'Aujourd\'hui'
          WHEN t.due_date::date = CURRENT_DATE + INTERVAL '1 day' THEN 'Demain'
          ELSE 'À venir'
        END as urgency
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE t.status != 'completed'
      ORDER BY 
        CASE 
          WHEN t.due_date < NOW() THEN 1
          WHEN t.due_date::date = CURRENT_DATE THEN 2
          WHEN t.due_date::date = CURRENT_DATE + INTERVAL '1 day' THEN 3
          ELSE 4
        END,
        t.priority DESC,
        t.due_date ASC
      LIMIT 50
    `;

    const { rows } = await db.query(query);

    let report = '📋 **RAPPORT DES TÂCHES**\n\n';
    report += `Généré le: ${new Date().toLocaleDateString('fr-FR')}\n\n`;

    // Statistiques
    const stats = {
      total: rows.length,
      overdue: rows.filter(r => r.urgency === 'En retard').length,
      today: rows.filter(r => r.urgency === 'Aujourd\'hui').length,
      tomorrow: rows.filter(r => r.urgency === 'Demain').length,
      byPriority: {
        high: rows.filter(r => r.priority === 'HIGH').length,
        medium: rows.filter(r => r.priority === 'MEDIUM').length,
        low: rows.filter(r => r.priority === 'LOW').length
      }
    };

    report += '📊 **Statistiques:**\n';
    report += `• Total des tâches actives: ${stats.total}\n`;
    report += `• En retard: ${stats.overdue}\n`;
    report += `• Pour aujourd'hui: ${stats.today}\n`;
    report += `• Pour demain: ${stats.tomorrow}\n\n`;

    report += '🎯 **Par priorité:**\n';
    report += `• Haute: ${stats.byPriority.high}\n`;
    report += `• Moyenne: ${stats.byPriority.medium}\n`;
    report += `• Basse: ${stats.byPriority.low}\n\n`;

    // Liste détaillée
    report += '📝 **Liste des tâches:**\n';
    for (const task of rows) {
      const priorityEmoji = task.priority === 'HIGH' ? '🔴' : task.priority === 'MEDIUM' ? '🟡' : '🟢';
      const urgencyEmoji = task.urgency === 'En retard' ? '⚠️' : task.urgency === 'Aujourd\'hui' ? '📅' : '⏰';

      report += `${priorityEmoji} ${urgencyEmoji} **${task.title}**\n`;
      report += `   📂 Projet: ${task.project_title || 'Non assigné'}\n`;
      report += `   👤 Assigné à: ${task.assigned_to || 'Personne'}\n`;
      report += `   📅 Échéance: ${new Date(task.due_date).toLocaleDateString('fr-FR')}\n`;
      report += `   📊 Statut: ${task.status}\n\n`;
    }

    return report;
  } catch (error) {
    console.error('Error generating tasks report:', error);
    return 'Erreur lors de la génération du rapport des tâches.';
  }
}

export async function generateActivityReport(days: number = 7): Promise<string> {
  try {
    const query = `
      SELECT 
        a.type,
        a.description,
        a.created_at,
        u.email as user_email,
        u.role as user_role,
        CASE 
          WHEN a.type = 'task_created' THEN 'Tâche créée'
          WHEN a.type = 'task_updated' THEN 'Tâche mise à jour'
          WHEN a.type = 'task_completed' THEN 'Tâche terminée'
          WHEN a.type = 'project_created' THEN 'Projet créé'
          WHEN a.type = 'user_created' THEN 'Utilisateur créé'
          ELSE a.type
        END as activity_label
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY a.created_at DESC
      LIMIT 100
    `;

    const { rows } = await db.query(query);

    let report = `📈 **RAPPORT D'ACTIVITÉ (${days} derniers jours)**\n\n`;
    report += `Généré le: ${new Date().toLocaleDateString('fr-FR')}\n\n`;

    // Statistiques par type
    const stats = rows.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    report += '📊 **Activités par type:**\n';
    for (const [type, count] of Object.entries(stats)) {
      const label = rows.find(r => r.type === type)?.activity_label || type;
      report += `• ${label}: ${count}\n`;
    }
    report += '\n';

    // Activités récentes
    report += '📝 **Activités récentes:**\n';
    for (const activity of rows) {
      const roleLabel = activity.user_role === 'admin' ? 'Admin' : activity.user_role === 'manager' ? 'Manager' : 'Membre';
      report += `📅 ${new Date(activity.created_at).toLocaleDateString('fr-FR')} ${new Date(activity.created_at).toLocaleTimeString('fr-FR')}\n`;
      report += `   👤 ${activity.user_email} (${roleLabel})\n`;
      report += `   🏷️ ${activity.activity_label}\n`;
      report += `   📝 ${activity.description}\n\n`;
    }

    return report;
  } catch (error) {
    console.error('Error generating activity report:', error);
    return 'Erreur lors de la génération du rapport d\'activité.';
  }
}
