/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

import { getLanguageRedirect, locales, localePreferenceKey } from '~/i18n/routing.mjs';

const currentUrl = new URL(location.href);
const requestedLocale = currentUrl.searchParams.get('lang');
let preference: string | null = null;
try {
  preference = localStorage.getItem(localePreferenceKey);
} catch {
  /* Browser language detection also works without storage. */
}
if (locales.some((locale) => locale === requestedLocale)) preference = requestedLocale;
const destination = getLanguageRedirect(
  currentUrl.pathname,
  navigator.languages.length ? navigator.languages : [navigator.language],
  preference
);
if (destination) {
  currentUrl.pathname = destination;
  location.replace(currentUrl.href);
} else {
  document.querySelectorAll<HTMLAnchorElement>('[data-language]').forEach((link) => {
    const targetUrl = new URL(link.href);
    targetUrl.search = location.search;
    targetUrl.searchParams.delete('lang');
    targetUrl.hash = location.hash;
    link.href = targetUrl.href;
    link.addEventListener('click', () => {
      const locale = link.dataset.language;
      if (!locale || !locales.some((supported) => supported === locale)) return;
      try {
        localStorage.setItem(localePreferenceKey, locale);
      } catch {
        /* Keep an explicit override in the URL if storage is unavailable. */
        const fallbackUrl = new URL(link.href);
        fallbackUrl.searchParams.set('lang', locale);
        link.href = fallbackUrl.href;
      }
    });
  });
}
