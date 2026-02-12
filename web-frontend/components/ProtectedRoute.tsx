'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessPage, getRedirectPath } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPath: string;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, requiredPath, fallback }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!canAccessPage(user.role as any, requiredPath)) {
      // Rediriger vers la page appropriée selon le rôle
      const redirectPath = getRedirectPath(user.role as any);
      router.push(redirectPath);
      return;
    }
  }, [user, isLoading, requiredPath, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !canAccessPage(user.role as any, requiredPath)) {
    return fallback || null;
  }

  return <>{children}</>;
}
