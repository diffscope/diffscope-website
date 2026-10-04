/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */
export const artifact = (platform = 'windows', arch = 'amd64', variant = 'installer') => ({
  platform,
  arch,
  variant,
  format: variant === 'installer' ? 'exe' : 'zip',
  url: `https://downloads.example.test/${platform}/${arch}/${variant || 'package'}`,
  size: 123456789,
  sha256: 'a'.repeat(64),
});
export const manifest = (channel, version, artifacts = [artifact()]) => ({
  channel,
  version,
  date: '2026-10-04T12:00:00Z',
  source: { commit: 'b'.repeat(40) },
  releaseNotes: `https://releases.example.test/${version}`,
  artifacts,
});
export function releaseFixture() {
  return {
    'index.json': {
      stable: {
        versions: [
          { version: '2.0.0', manifest: 'stable/2.0.0.json' },
          { version: '1.0.0', manifest: 'stable/1.0.0.json' },
        ],
      },
      beta: {
        versions: [
          { version: '2.1.0-beta.1', manifest: 'beta/2.1.0-beta.1.json' },
          { version: '1.9.0-beta.4', manifest: 'beta/1.9.0-beta.4.json' },
        ],
      },
    },
    'nightly.json': {
      nightly: {
        versions: [{ version: '2.2.0-nightly.20261004.1', manifest: 'nightly/2.2.0-nightly.20261004.1.json' }],
      },
    },
    'stable/2.0.0.json': manifest('stable', '2.0.0', [artifact('linux', 'amd64', 'portable')]),
    'stable/1.0.0.json': manifest('stable', '1.0.0'),
    'beta/2.1.0-beta.1.json': manifest('beta', '2.1.0-beta.1', [
      artifact(),
      artifact('windows', 'amd64', 'portable'),
      artifact('windows', 'amd64', 'debug_symbols'),
      { ...artifact('macos', 'arm64', ''), format: 'dmg' },
      artifact('linux', 'arm64', 'experimental'),
    ]),
    'beta/1.9.0-beta.4.json': manifest('beta', '1.9.0-beta.4'),
    'nightly/2.2.0-nightly.20261004.1.json': manifest('nightly', '2.2.0-nightly.20261004.1'),
  };
}
