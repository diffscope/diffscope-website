/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

/** @typedef {'windows' | 'macos' | 'linux' | 'unknown'} Platform */
/** @typedef {'stable' | 'beta' | 'nightly'} Channel */
/** @typedef {Partial<Record<Channel, { assets: Partial<Record<Platform, string>> }>>} Catalog */

/** No release directory is connected in this static frontend. @type {Catalog} */
export const catalog = {};
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

/** @param {Catalog} releases @param {Platform} platform */
export function resolveDownloads(releases, platform) {
  const entries = channels.map((channel) => {
    const release = releases[channel];
    const url = release?.assets[platform];
    return { channel, url, status: !release ? 'comingSoon' : url ? 'available' : 'unsupported' };
  });
  const preferred = entries.find((entry) => entry.status === 'available');
  return { entries, preferred, status: channels.some((channel) => releases[channel]) ? 'unsupported' : 'comingSoon' };
}
