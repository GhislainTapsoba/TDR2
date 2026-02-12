'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { canAccessPage } from '@/lib/permissions';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Pages where sidebar should not be shown
  const noSidebarPages = ['/login', '/register'];
  const showSidebar = !noSidebarPages.includes(pathname);

  // Error boundary
  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Une erreur est survenue</h1>
          <p className="text-gray-600 mb-6">Veuillez rafraîchir la page</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Rafraîchir
          </button>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (except for login/register pages)
  if (!isLoading && !user && !noSidebarPages.includes(pathname)) {
    router.push('/login');
    return null;
  }

  // Check page access permissions
  if (!isLoading && user && showSidebar && !canAccessPage(user.role as any, pathname)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600 mb-6">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button - only show if sidebar is enabled */}
      {showSidebar && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Mobile sidebar overlay - only show if sidebar is enabled */}
      {showSidebar && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </div>
      )}

      {/* Sidebar - Desktop always visible, mobile toggle - only show if enabled */}
      {showSidebar && (
        <div className="fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0">
          <div className={`lg:block ${sidebarOpen ? 'block' : 'hidden'}`}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content - adjust padding based on sidebar visibility */}
      <div className={showSidebar ? 'lg:pl-64' : ''}>
        {/* Page content */}
        <main className="p-6">
          <div onError={() => setHasError(true)}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
