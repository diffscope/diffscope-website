/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPlatform, resolveDownloads } from '../src/utils/downloads.mjs';

test('an empty directory makes every channel coming soon', () => {
  const result = resolveDownloads({}, 'windows');
  assert.equal(result.preferred, undefined);
  assert.equal(result.status, 'comingSoon');
  assert.ok(result.entries.every((entry) => entry.status === 'comingSoon'));
});

test('stable is preferred, then beta, then nightly among supported channels', () => {
  const releases = {
    stable: { assets: { windows: '/stable.exe' } },
    beta: { assets: { windows: '/beta.exe', linux: '/beta.AppImage' } },
    nightly: { assets: { windows: '/nightly.exe', linux: '/nightly.AppImage', macos: '/nightly.dmg' } },
  };
  assert.equal(resolveDownloads(releases, 'windows').preferred.channel, 'stable');
  assert.equal(resolveDownloads(releases, 'linux').preferred.channel, 'beta');
  assert.equal(resolveDownloads(releases, 'macos').preferred.channel, 'nightly');
});

test('missing channels and unsupported operating systems have distinct states', () => {
  const result = resolveDownloads({ beta: { assets: { windows: '/beta.exe' } } }, 'macos');
  assert.equal(result.status, 'unsupported');
  assert.deepEqual(
    result.entries.map((entry) => entry.status),
    ['comingSoon', 'unsupported', 'comingSoon']
  );
});

test('desktop detection excludes mobile platforms and unknown clients', () => {
  assert.equal(detectPlatform('Windows NT 10.0'), 'windows');
  assert.equal(detectPlatform('Macintosh; Intel Mac OS X'), 'macos');
  assert.equal(detectPlatform('X11; Linux x86_64'), 'linux');
  for (const ua of ['Linux; Android', 'iPhone; CPU iPhone OS like Mac OS X', 'iPad', '']) {
    assert.equal(detectPlatform(ua), 'unknown');
  }
});
