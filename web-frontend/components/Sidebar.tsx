'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarItem {
  href: string;
  label: string;
  icon: string;
  roles?: string[];
  badge?: string;
}

const sidebarItems: SidebarItem[] = [
  { href: '/dashboard', label: 'Tableau de bord', icon: '📊' },
  { href: '/projects', label: 'Projets', icon: '📁' },
  { href: '/tasks', label: 'Mes tâches', icon: '✅' },
  { href: '/users', label: 'Équipe', icon: '👥', roles: ['admin', 'manager'] },
  { href: '/activity', label: 'Activité', icon: '📈' },
  { href: '/profile', label: 'Mon profil', icon: '👤' },
  { href: '/settings', label: 'Paramètres', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredItems = sidebarItems.filter(item => {
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  });

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">T2</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">TDR2</h1>
            <p className="text-xs text-gray-500">Gestion de projet</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info & logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Utilisateur'}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          <p className="text-xs text-gray-400 capitalize mt-1">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
