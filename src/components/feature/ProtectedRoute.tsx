import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  admin: ['dashboard', 'listings', 'leads', 'deals', 'contacts', 'agents', 'media', 'neighbourhoods', 'insights', 'activities', 'blog', 'home-sections', 'site-settings', 'users', 'management'],
  editor: ['dashboard', 'listings', 'leads', 'deals', 'contacts', 'agents', 'media', 'neighbourhoods', 'blog', 'home-sections'],
  agent: ['dashboard', 'listings', 'leads', 'contacts', 'media'],
};

function getRouteModule(pathname: string): string {
  if (pathname.includes('/crm/management')) return 'management';
  if (pathname.includes('/crm/users')) return 'users';
  if (pathname.includes('/crm/site-settings')) return 'site-settings';
  if (pathname.includes('/crm/blog')) return 'blog';
  if (pathname.includes('/crm/home-sections')) return 'home-sections';
  if (pathname.includes('/crm/listings')) return 'listings';
  if (pathname.includes('/crm/leads')) return 'leads';
  if (pathname.includes('/crm/deals')) return 'deals';
  if (pathname.includes('/crm/contacts')) return 'contacts';
  if (pathname.includes('/crm/agents')) return 'agents';
  if (pathname.includes('/crm/media')) return 'media';
  if (pathname.includes('/crm/neighbourhoods')) return 'neighbourhoods';
  if (pathname.includes('/crm/insights')) return 'insights';
  if (pathname.includes('/crm/activities')) return 'activities';
  return 'dashboard';
}

function hasPermission(role: string, module: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  if (perms.includes('*')) return true;
  return perms.includes(module);
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const module = getRouteModule(location.pathname);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f3ee] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/crm/login" replace />;
  }

  if (!hasPermission(user.role, module)) {
    return <Navigate to="/crm/dashboard" replace />;
  }

  return <>{children}</>;
}