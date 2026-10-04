/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

/** @typedef {'windows' | 'macos' | 'linux' | 'unknown'} Platform */
/** @typedef {'stable' | 'beta' | 'nightly'} Channel */
/** @typedef {{ platform: Platform, arch?: string }} Device */
/** @typedef {import('./catalog.ts').Artifact} Artifact */
/** @typedef {import('./catalog.ts').LatestReleases} LatestReleases */
/** @type {Channel[]} */
export const channels = ['stable', 'beta', 'nightly'];

/** @param {string} userAgent @returns {Platform} */
export function detectPlatform(userAgent) {
  // Mobile operating systems must not be mistaken for their desktop relatives.
  if (/Android|iPhone|iPad|iPod/i.test(userAgent)) return 'unknown';
  if (/Windows/i.test(userAgent)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'macos';
  if (/Linux/i.test(userAgent)) return 'linux';
  return 'unknown';
}

/** @param {string} value */
export function normalizePlatform(value) {
  const name = value.toLowerCase();
  if (['windows', 'win32', 'win64'].includes(name)) return 'windows';
  if (['macos', 'mac', 'darwin', 'osx'].includes(name)) return 'macos';
  return name;
}

/** @param {string} value */
export function normalizeArch(value) {
  const name = value.toLowerCase();
  if (['amd64', 'x86_64', 'x64'].includes(name)) return 'amd64';
  if (['arm64', 'aarch64'].includes(name)) return 'arm64';
  if (['x86', 'i386', 'i686', '386', 'ia32'].includes(name)) return '386';
  return name;
}

/** @param {Artifact[]} artifacts @param {Device} device */
export function selectArtifact(artifacts, device) {
  if (device.platform === 'unknown') return undefined;
  const candidates = artifacts.filter(
    (artifact) =>
      normalizePlatform(artifact.platform) === device.platform &&
      !['debug_symbols', 'symbols', 'source'].includes(artifact.variant ?? '')
  );
  const architecture = device.arch ? normalizeArch(device.arch) : undefined;
  const universal = (/** @type {Artifact} */ artifact) =>
    ['universal', 'universal2', 'any'].includes(artifact.arch.toLowerCase());
  const matching = architecture
    ? candidates.filter((artifact) => normalizeArch(artifact.arch) === architecture || universal(artifact))
    : new Set(candidates.map((artifact) => normalizeArch(artifact.arch))).size <= 1
      ? candidates
      : candidates.filter(universal);
  const rank = (/** @type {Artifact} */ artifact) => {
    if (artifact.variant === 'installer') return 0;
    if (!artifact.variant) return 1;
    if (artifact.variant === 'portable') return 2;
    return 3;
  };
  return [...matching].sort((a, b) => rank(a) - rank(b))[0];
}

/** @param {LatestReleases} releases @param {Device} device */
export function resolveDownloads(releases, device) {
  const entries = channels.map((channel) => {
    const release = releases[channel];
    const artifact = release ? selectArtifact(release.artifacts, device) : undefined;
    return { channel, release, artifact, status: !release ? 'comingSoon' : artifact ? 'available' : 'unsupported' };
  });
  const preferred = entries.find((entry) => entry.artifact) ?? entries.find((entry) => entry.release);
  return { entries, preferred, status: preferred?.status ?? 'comingSoon' };
}

/** @param {string} platform @param {Record<string, string>} platforms */
export function platformLabel(platform, platforms) {
  const key = normalizePlatform(platform);
  return Object.hasOwn(platforms, key) ? platforms[key] : platform;
}

/** @param {Artifact} artifact @param {Record<string, string>} variants @param {Record<string,string>} [platforms] */
export function artifactLabel(artifact, variants, platforms = {}) {
  const variant = artifact.variant
    ? Object.hasOwn(variants, artifact.variant)
      ? variants[artifact.variant]
      : artifact.variant
    : '';
  return [platformLabel(artifact.platform, platforms), artifact.arch, variant].filter(Boolean).join(' ');
}

/** @param {number} bytes @param {string} locale */
export function formatFileSize(bytes, locale) {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const unit = bytes > 0 ? Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1) : 0;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024 ** unit)} ${units[unit]}`;
}

/** @param {string} product @param {string | undefined} [version] */
export const downloadHash = (product, version) =>
  `#${encodeURIComponent(product)}${version ? `/${encodeURIComponent(version)}` : ''}`;

/** @param {string} hash @param {string[]} products @param {string} defaultProduct */
export function parseDownloadHash(hash, products, defaultProduct) {
  try {
    const parts = hash.replace(/^#/, '').split('/').map(decodeURIComponent);
    const product = parts[0] || defaultProduct;
    if (parts.length > 2 || !products.includes(product))
      return { product: defaultProduct, version: undefined, invalid: true };
    return { product, version: parts[1] || undefined, invalid: false };
  } catch {
    return { product: defaultProduct, version: undefined, invalid: true };
  }
}
