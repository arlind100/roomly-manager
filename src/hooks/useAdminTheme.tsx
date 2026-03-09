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

  const setTheme = (t: AdminTheme) => {
    setThemeState(t);
    localStorage.setItem('admin_theme', t);
  };

  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return { theme, setTheme, toggle };
}

/**
 * No-op hook kept for backward compatibility on public pages.
 * Admin theming is now fully scoped to the AdminLayout wrapper div,
 * so no cleanup on <html> is needed.
 */
export function usePublicTheme() {
  // Nothing to do — admin styles are scoped to wrapper, not :root
}
