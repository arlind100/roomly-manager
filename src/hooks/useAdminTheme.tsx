import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export type AdminTheme = 'light' | 'dark';

export function useAdminTheme() {
  const [theme, setThemeState] = useState<AdminTheme>(
    () => (localStorage.getItem('admin_theme') as AdminTheme) || 'light'
  );

  const setTheme = (t: AdminTheme) => {
    setThemeState(t);
    localStorage.setItem('admin_theme', t);
  };

  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');

  useEffect(() => {
    const el = document.documentElement;
    // Remove both admin classes first
    el.classList.remove('admin-light', 'admin-dark');
    // Apply the current admin theme
    el.classList.add(`admin-${theme}`);

    return () => {
      // On unmount, remove admin theme classes so public site gets default :root styles
      el.classList.remove('admin-light', 'admin-dark');
    };
  }, [theme]);

  return { theme, setTheme, toggle };
}

/**
 * Hook to ensure admin theme is cleaned up when navigating to public routes.
 * Use this in public-facing page wrappers.
 */
export function usePublicTheme() {
  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove('admin-light', 'admin-dark');
  }, []);
}
