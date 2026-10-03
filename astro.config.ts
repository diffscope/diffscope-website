/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import astrowind from './vendor/integration';

export default defineConfig({
  site: 'https://diffscope.org',
  output: 'static',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-Hans'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en', 'zh-Hans': 'zh-Hans' } } }),
    icon({ iconDir: 'src/assets/icons', include: { tabler: ['*'] } }),
    astrowind({ config: './src/config.yaml' }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: { alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) } },
  },
});
