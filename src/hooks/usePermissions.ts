import { useAuth } from '../providers/AuthProvider';

export function usePermissions() {
  const { user } = useAuth();
  
  // Extract permissions list from user session details
  const permissions: string[] = user?.permissions || [];

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAllPermissions = (perms: string[]): boolean => {
    return perms.every((p) => permissions.includes(p));
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some((p) => permissions.includes(p));
  };

  return {
    permissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
  };
}
