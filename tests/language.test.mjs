/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { getLanguageRedirect, matchBrowserLocale } from '../src/i18n/routing.mjs';

test('browser preferences match supported languages in priority order', () => {
  for (const tag of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans-CN', 'zh-TW', 'ZH-cn']) {
    assert.equal(matchBrowserLocale([tag]), 'zh-Hans', tag);
  }
  assert.equal(matchBrowserLocale(['en-US', 'zh-CN']), 'en');
  assert.equal(matchBrowserLocale(['de-DE', 'zh-CN', 'en']), 'zh-Hans');
  assert.equal(matchBrowserLocale(['fr-FR']), 'en');
  assert.equal(matchBrowserLocale([]), 'en');
});

test('language detection retains the requested page', () => {
  assert.equal(getLanguageRedirect('/', ['zh-CN'], null), '/zh-Hans/');
  assert.equal(getLanguageRedirect('/features/', ['zh-CN'], null), '/zh-Hans/features/');
  assert.equal(getLanguageRedirect('/downloads', ['zh-CN'], null), '/zh-Hans/downloads/');
});

test('manual preferences take priority and invalid preferences fall back to the browser', () => {
  assert.equal(getLanguageRedirect('/', ['zh-CN'], 'en'), null);
  assert.equal(getLanguageRedirect('/community/', ['en-US'], 'zh-Hans'), '/zh-Hans/community/');
  assert.equal(getLanguageRedirect('/', ['zh-CN'], 'invalid'), '/zh-Hans/');
});

test('explicit localized routes and unknown URLs are never redirected', () => {
  for (const path of ['/zh-Hans/', '/zh-Hans/features/', '/404.html', '/missing/', '/i18n/en.json']) {
    assert.equal(getLanguageRedirect(path, ['zh-CN'], 'en'), null, path);
  }
  assert.equal(getLanguageRedirect('/features/', ['en-US'], null), null);
});
