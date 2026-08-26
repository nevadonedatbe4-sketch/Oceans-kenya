import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import PageLoader from '@/components/feature/PageLoader';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  admin: ['dashboard', 'listings', 'leads', 'deals', 'contacts', 'agents', 'media', 'neighbourhoods', 'insights', 'activities', 'blog', 'home-sections', 'site-settings', 'users', 'management', 'testimonials', 'joint-ventures', 'nav-links', 'contact-sections', 'menu', 'sync', 'profile'],
  editor: ['dashboard', 'listings', 'leads', 'deals', 'contacts', 'agents', 'media', 'neighbourhoods', 'blog', 'home-sections', 'testimonials', 'joint-ventures', 'insights', 'activities', 'profile'],
  agent: ['dashboard', 'listings', 'leads', 'deals', 'contacts', 'agents', 'media', 'neighbourhoods', 'insights', 'activities', 'blog', 'testimonials', 'joint-ventures', 'profile'],
};

function getRouteModule(pathname: string): string {
  if (pathname.includes('/crm/management')) return 'management';
  if (pathname.includes('/crm/users')) return 'users';
  if (pathname.includes('/crm/site-settings')) return 'site-settings';
  if (pathname.includes('/crm/blog')) return 'blog';
  if (pathname.includes('/crm/home-sections')) return 'home-sections';
  if (pathname.includes('/crm/testimonials')) return 'testimonials';
  if (pathname.includes('/crm/joint-ventures')) return 'joint-ventures';
  if (pathname.includes('/crm/nav-links')) return 'nav-links';
  if (pathname.includes('/crm/contact-sections')) return 'contact-sections';
  if (pathname.includes('/crm/menu')) return 'menu';
  if (pathname.includes('/crm/sync')) return 'sync';
  if (pathname.includes('/crm/profile')) return 'profile';
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

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const module = getRouteModule(location.pathname);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <PageLoader size={48} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/crm/login" replace />;
  }

  // Role-based access check
  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(user.role)) {
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';
      return <Navigate to={isAdmin ? '/admin-dashboard' : '/agent-dashboard'} replace />;
    }
  }

  // Module-based permission check (for /crm/* routes)
  if (!hasPermission(user.role, module)) {
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    return <Navigate to={isAdmin ? '/admin-dashboard' : '/agent-dashboard'} replace />;
  }

  return <>{children}</>;
}