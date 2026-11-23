export const THEMES = [
  ['woodland', 'Woodland'],
  ['midnight', 'Midnight'],
  ['ember', 'Ember'],
  ['amethyst', 'Amethyst'],
  ['daylight', 'Daylight'],
  ['desert', 'Desert parchment'],
  ['contrast', 'High contrast'],
] as const;

export type ThemeId = typeof THEMES[number][0];
const KEY = 'slayer-target-planner-theme';

export function themeId(value: unknown): ThemeId {
  return THEMES.some(([id]) => id === value) ? value as ThemeId : 'woodland';
}

export function loadTheme(): ThemeId {
  try { return themeId(localStorage.getItem(KEY)); }
  catch { return 'woodland'; }
}

export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
  const colour = getComputedStyle(document.documentElement).getPropertyValue('--header').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colour);
}

export function saveTheme(id: ThemeId): boolean {
  try { localStorage.setItem(KEY, id); return true; }
  catch { return false; }
}
