import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [roleChecked, setRoleChecked] = useState(false);
  const [hasAdminRole, setHasAdminRole] = useState(false);

  useEffect(() => {
    if (!user) {
      setRoleChecked(true);
      return;
    }

    const checkRole = async () => {
      // Check for admin or manager role
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (isAdmin) {
        setHasAdminRole(true);
        setRoleChecked(true);
        return;
      }
      const { data: isManager } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'manager' });
      setHasAdminRole(!!isManager);
      setRoleChecked(true);
    };

    checkRole();
  }, [user]);

  if (loading || !roleChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!hasAdminRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to access the admin panel.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
