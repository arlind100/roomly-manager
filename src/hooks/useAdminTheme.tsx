import { useEffect, useState } from 'react';

export type AdminTheme = 'light' | 'dark';

export function useAdminTheme() {
  const [theme, setThemeState] = useState<AdminTheme>(
    () => (localStorage.getItem('admin_theme') as AdminTheme) || 'light'
  );

  // Apply theme class to <body> so portals (modals, popovers, selects) inherit admin tokens
  useEffect(() => {
    document.body.classList.remove('admin-light', 'admin-dark');
    document.body.classList.add(`admin-${theme}`);
    return () => {
      document.body.classList.remove('admin-light', 'admin-dark');
    };
  }, [theme]);

  // Sync across multiple hook instances via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AdminTheme>).detail;
      setThemeState(detail);
    };
    window.addEventListener('admin-theme-change', handler);
    return () => window.removeEventListener('admin-theme-change', handler);
  }, []);

  const setTheme = (t: AdminTheme) => {
    setThemeState(t);
    localStorage.setItem('admin_theme', t);
    window.dispatchEvent(new CustomEvent('admin-theme-change', { detail: t }));
  };

  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return { theme, setTheme, toggle };
}
