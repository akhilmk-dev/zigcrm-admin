import { useMemo } from 'react';

export function usePermission() {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch (e) {
      return null;
    }
  }, []);

  const hasPermission = (permission) => {
    if (!user) return false;
    
    // Super Admin bypass
    if (user.isSuperAdmin || user.permissions?.includes('*')) return true;

    if (!user.permissions) return false;

    return user.permissions.includes(permission);
  };

  return { hasPermission, user };
}
