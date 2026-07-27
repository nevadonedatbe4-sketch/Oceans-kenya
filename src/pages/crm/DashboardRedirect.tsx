import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardRedirect() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const welcome = searchParams.get('welcome');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/crm/login" replace />;
  }

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  const target = isAdmin ? '/admin-dashboard' : '/agent-dashboard';
  const targetWithParam = welcome === '1' ? `${target}?welcome=1` : target;
  return <Navigate to={targetWithParam} replace />;
}