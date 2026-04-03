export function normalizeTheme(theme: unknown): 'light' | 'dark' {
  return theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: unknown): 'light' | 'dark' {
  const resolvedTheme = normalizeTheme(theme);
  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  document.documentElement.style.colorScheme = resolvedTheme;
  return resolvedTheme;
}
