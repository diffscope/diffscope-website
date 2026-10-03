/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

const themeButton = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const media = window.matchMedia('(prefers-color-scheme: dark)');
const syncThemeButton = () =>
  themeButton?.setAttribute('aria-pressed', String(document.documentElement.classList.contains('dark')));
syncThemeButton();
themeButton?.addEventListener('click', () => {
  const dark = !document.documentElement.classList.contains('dark');
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem('diffscope-theme', dark ? 'dark' : 'light');
  } catch {
    /* Storage may be disabled. */
  }
  syncThemeButton();
});
media.addEventListener('change', (event) => {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem('diffscope-theme');
  } catch {
    /* Use system preference. */
  }
  if (saved !== 'light' && saved !== 'dark') {
    document.documentElement.classList.toggle('dark', event.matches);
    syncThemeButton();
  }
});

const menuButton = document.querySelector<HTMLButtonElement>('[data-mobile-toggle]');
const menu = document.querySelector<HTMLElement>('#mobile-navigation');
const closeMenu = () => {
  if (menu) menu.hidden = true;
  menuButton?.setAttribute('aria-expanded', 'false');
};
menuButton?.addEventListener('click', () => {
  if (!menu) return;
  menu.hidden = !menu.hidden;
  menuButton.setAttribute('aria-expanded', String(!menu.hidden));
});
window.matchMedia('(min-width: 1120px)').addEventListener('change', closeMenu);
document.addEventListener('click', (event) => {
  if (!(event.target as Element).closest('.language-picker')) {
    document.querySelector<HTMLDetailsElement>('.language-picker')?.removeAttribute('open');
  }
  if (!(event.target as Element).closest('.site-header')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (menu && !menu.hidden) {
    closeMenu();
    menuButton?.focus();
  }
  const languages = document.querySelector<HTMLDetailsElement>('.language-picker[open]');
  if (languages) {
    languages.open = false;
    languages.querySelector('summary')?.focus();
  }
});
