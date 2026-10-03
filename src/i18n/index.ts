/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

import en from '../../public/i18n/en.json';
import zh from '../../public/i18n/zh-Hans.json';
import { locales } from './routing.mjs';
export { locales, localizePath } from './routing.mjs';

export type Dictionary = typeof en;
export type Locale = (typeof locales)[number];
export const dictionaries: Record<Locale, Dictionary> = { en, 'zh-Hans': zh };
export const localeNames: Record<Locale, string> = Object.fromEntries(
  locales.map((locale) => [locale, dictionaries[locale].languageName])
) as Record<Locale, string>;
