/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

import en from '../../public/i18n/en.json';
import zh from '../../public/i18n/zh-Hans.json';

export type Dictionary = typeof en;
export const locales = ['en', 'zh-Hans'] as const;
export type Locale = (typeof locales)[number];
export const dictionaries: Record<Locale, Dictionary> = { en, 'zh-Hans': zh };
export const localeNames: Record<Locale, string> = Object.fromEntries(
  locales.map((locale) => [locale, dictionaries[locale].languageName])
) as Record<Locale, string>;
export const localizePath = (path: string, locale: Locale) =>
  `${locale === 'en' ? '' : `/${locale}`}${path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}/`}`;
