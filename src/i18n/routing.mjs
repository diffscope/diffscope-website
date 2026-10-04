/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

/** @type {readonly ['en', 'zh-Hans', 'zh-Hant', 'ja']} */
export const locales = ['en', 'zh-Hans', 'zh-Hant', 'ja'];
export const defaultLocale = 'en';
export const pages = ['', 'downloads', 'features', 'contribute', 'community'];
export const localePreferenceKey = 'diffscope-locale';

/** @param {string} locale */
export function toOpenGraphLocale(locale) {
  const { language, region } = new Intl.Locale(locale).maximize();
  return region ? `${language}_${region}` : language;
}

/**
 * @param {string} path
 * @param {typeof locales[number]} locale
 */
export const localizePath = (path, locale) =>
  `${locale === defaultLocale ? '' : `/${locale}`}${path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}/`}`;

/** @param {readonly string[]} languages */
export function matchBrowserLocale(languages) {
  for (const language of languages) {
    const normalized = language.toLowerCase().replaceAll('_', '-');
    const exact = locales.find((locale) => locale.toLowerCase() === normalized);
    if (exact) return exact;
    try {
      const preferred = new Intl.Locale(normalized).maximize();
      const scriptMatch = locales.find((locale) => {
        const supported = new Intl.Locale(locale).maximize();
        return supported.language === preferred.language && supported.script === preferred.script;
      });
      if (scriptMatch) return scriptMatch;
      const baseMatches = locales.filter((locale) => locale.toLowerCase().split('-')[0] === preferred.language);
      if (baseMatches.length) return baseMatches[0];
    } catch {
      const base = normalized.split('-')[0];
      const related = locales.find((locale) => locale.toLowerCase().split('-')[0] === base);
      if (related) return related;
    }
  }
  return defaultLocale;
}

/**
 * Only negotiate unprefixed page URLs; explicit locale URLs remain authoritative.
 * @param {string} pathname
 * @param {readonly string[]} languages
 * @param {string | null} preference
 */
export function getLanguageRedirect(pathname, languages, preference) {
  const page = pathname.replace(/^\//, '').replace(/\/$/, '');
  if (!pages.includes(page)) return null;
  const locale = locales.find((locale) => locale === preference) ?? matchBrowserLocale(languages);
  return locale === defaultLocale ? null : localizePath(page || '/', locale);
}
