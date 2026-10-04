/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import en from '../public/i18n/en.json' with { type: 'json' };
import zh from '../public/i18n/zh-Hans.json' with { type: 'json' };
import { artifact, manifest } from './fixtures/releases.mjs';
import {
  artifactLabel,
  detectPlatform,
  downloadHash,
  formatFileSize,
  parseDownloadHash,
  platformLabel,
  resolveDownloads,
  selectArtifact,
} from '../src/utils/downloads.mjs';

test('empty catalogs produce Coming Soon', () => {
  const result = resolveDownloads({}, { platform: 'windows', arch: 'amd64' });
  assert.equal(result.preferred, undefined);
  assert.equal(result.status, 'comingSoon');
});
test('compatible latest releases follow stable, beta, nightly priority', () => {
  const releases = {
    stable: manifest('stable', '1.0.0', [artifact('windows')]),
    beta: manifest('beta', '1.1.0-beta.1', [artifact('linux')]),
    nightly: manifest('nightly', '1.2.0-nightly', [artifact('macos', 'arm64')]),
  };
  for (const [platform, arch, channel] of [
    ['windows', 'amd64', 'stable'],
    ['linux', 'amd64', 'beta'],
    ['macos', 'arm64', 'nightly'],
  ])
    assert.equal(resolveDownloads(releases, { platform, arch }).preferred.channel, channel);
});
test('unsupported systems retain the first release to navigate to the downloads page', () => {
  const result = resolveDownloads({ beta: manifest('beta', '1.0.0-beta.1') }, { platform: 'unknown' });
  assert.equal(result.preferred.release.version, '1.0.0-beta.1');
  assert.equal(result.preferred.artifact, undefined);
  assert.equal(result.status, 'unsupported');
});
test('artifact matching handles aliases, prefers installers, and excludes symbols', () => {
  const installer = artifact('Windows', 'x86_64'),
    portable = artifact('windows', 'amd64', 'portable'),
    debug = artifact('windows', 'amd64', 'debug_symbols');
  assert.equal(selectArtifact([debug, portable, installer], { platform: 'windows', arch: 'amd64' }), installer);
  assert.equal(selectArtifact([installer], { platform: 'windows', arch: 'arm64' }), undefined);
  assert.equal(selectArtifact([debug], { platform: 'windows', arch: 'amd64' }), undefined);
  assert.equal(selectArtifact([installer, artifact('windows', 'arm64')], { platform: 'windows' }), undefined);
  assert.equal(selectArtifact([installer], { platform: 'windows' }), installer);
});
test('labels translate known platforms and variants while preserving architectures and unknown names', () => {
  for (const dictionary of [en, zh]) {
    const { variants, platforms } = dictionary.downloads;
    assert.equal(platformLabel('windows', platforms), 'Windows');
    assert.equal(platformLabel('macos', platforms), 'macOS');
    assert.equal(platformLabel('linux', platforms), 'Linux');
    assert.equal(platformLabel('FreeBSD', platforms), 'FreeBSD');
    assert.equal(
      artifactLabel(artifact('windows', 'x86_64'), variants, platforms),
      `Windows x86_64 ${variants.installer}`
    );
    assert.equal(
      artifactLabel(artifact('linux', 'arm64', 'experimental'), variants, platforms),
      'Linux arm64 experimental'
    );
    assert.equal(
      artifactLabel({ ...artifact('macos', 'arm64', ''), format: 'dmg' }, variants, platforms),
      'macOS arm64'
    );
    assert.equal(
      artifactLabel({ ...artifact('macos', 'arm64'), variant: undefined, format: 'dmg' }, variants, platforms),
      'macOS arm64'
    );
    assert.equal(
      artifactLabel(artifact('windows', 'amd64', 'debug_symbols'), variants, platforms),
      `Windows amd64 ${variants.debug_symbols}`
    );
  }
  assert.equal(en.downloads.variants.debug_symbols, 'Debug Symbols');
  assert.equal(formatFileSize(0, 'en'), '0 B');
  assert.equal(formatFileSize(1024 ** 2, 'en'), '1 MiB');
});
test('hashes round-trip encoded versions and never enable unconfigured products', () => {
  assert.deepEqual(parseDownloadHash(downloadHash('diffscope', '1.0.0+test/1'), ['diffscope'], 'diffscope'), {
    product: 'diffscope',
    version: '1.0.0+test/1',
    invalid: false,
  });
  assert.equal(parseDownloadHash('', ['diffscope'], 'diffscope').product, 'diffscope');
  for (const hash of ['#hidden/1.0.0', '#diffscope/1/extra', '#%invalid'])
    assert.equal(parseDownloadHash(hash, ['diffscope'], 'diffscope').invalid, true);
});
test('mobile operating systems are not detected as desktop platforms', () => {
  assert.equal(detectPlatform('Windows NT 10.0'), 'windows');
  assert.equal(detectPlatform('Macintosh; Intel Mac OS X'), 'macos');
  assert.equal(detectPlatform('X11; Linux x86_64'), 'linux');
  for (const ua of ['Linux; Android', 'iPhone; CPU iPhone OS like Mac OS X', 'iPad', ''])
    assert.equal(detectPlatform(ua), 'unknown');
});
