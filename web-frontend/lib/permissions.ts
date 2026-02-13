export type UserRole = 'admin' | 'manager' | 'employee';

export interface PagePermission {
  path: string;
  requiredRole: UserRole[];
  description: string;
}

/**
 * Définition des permissions d'accès aux pages
 */
export const pagePermissions: PagePermission[] = [
  // Pages accessibles à tous les rôles
  {
    path: '/dashboard',
    requiredRole: ['admin', 'manager', 'employee'],
    description: 'Tableau de bord'
  },
  {
    path: '/projects',
    requiredRole: ['admin', 'manager'],
    description: 'Projets (création, modification, suppression)'
  },
  {
    path: '/projects/[id]',
    requiredRole: ['admin', 'manager', 'employee'],
    description: 'Détail du projet (lecture seule pour employee)'
  },
  {
    path: '/tasks',
    requiredRole: ['admin', 'manager', 'employee'],
    description: 'Tâches (gestion des tâches assignées pour employee)'
  },
  {
    path: '/tasks/[id]',
    requiredRole: ['admin', 'manager', 'employee'],
    description: 'Détail de la tâche (lecture seule pour employee)'
  },
  {
    path: '/profile',
    requiredRole: ['admin', 'manager', 'employee'],
    description: 'Profil'
  },

  // Pages accessibles seulement à admin et manager
  {
    path: '/settings',
    requiredRole: ['admin', 'manager'],
    description: 'Paramètres'
  },
  {
    path: '/stages',
    requiredRole: ['admin', 'manager'],
    description: 'Étapes'
  },
  {
    path: '/activity',
    requiredRole: ['admin', 'manager'],
    description: 'Activité'
  },

  // Pages accessibles seulement à l'admin
  {
    path: '/users',
    requiredRole: ['admin'],
    description: 'Utilisateurs (Équipe)'
  },
];

/**
 * Vérifie si un utilisateur a accès à une page
 */
export function canAccessPage(userRole: UserRole | null, path: string): boolean {
  if (!userRole) return false;

  // Chercher une correspondance exacte ou avec pattern [id]
  const permission = pagePermissions.find(p => {
    // Correspondance exacte
    if (p.path === path) return true;

    // Correspondance avec pattern [id], [slug], etc.
    // Remplace [id] par une regex qui match n'importe quel segment
    const pattern = p.path.replace(/\[.*?\]/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });

  // Si aucune permission définie, autoriser par défaut pour admin
  if (!permission) {
    return userRole === 'admin';
  }

  return permission.requiredRole.includes(userRole);
}

/**
 * Obtient les pages accessibles pour un rôle donné
 */
export function getAccessiblePages(userRole: UserRole | null): PagePermission[] {
  if (!userRole) return [];

  return pagePermissions.filter(permission =>
    permission.requiredRole.includes(userRole)
  );
}

/**
 * Vérifie si l'utilisateur a le rôle requis
 */
export function hasRequiredRole(userRole: UserRole | null, requiredRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

/**
 * Redirige vers la page appropriée selon le rôle
 */
export function getRedirectPath(userRole: UserRole): string {
  switch (userRole) {
    case 'admin':
    case 'manager':
      return '/dashboard';
    case 'employee':
      return '/dashboard';
    default:
      return '/login';
  }
}