/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

import { detectPlatform, normalizeArch, type Device } from './downloads.mjs';

interface Hints {
  architecture?: string;
  bitness?: string;
  wow64?: boolean;
}
type NavigatorWithHints = Navigator & {
  userAgentData?: { mobile?: boolean; getHighEntropyValues: (keys: string[]) => Promise<Hints> };
};
let pending: Promise<Device> | undefined;
export function getDevice(): Promise<Device> {
  return (pending ??= detectDevice());
}
async function detectDevice(): Promise<Device> {
  const nav = navigator as NavigatorWithHints;
  const platform =
    nav.userAgentData?.mobile || (/Macintosh/i.test(nav.userAgent) && nav.maxTouchPoints > 1)
      ? 'unknown'
      : detectPlatform(nav.userAgent);
  let arch: string | undefined;
  if (/aarch64|arm64/i.test(nav.userAgent)) arch = 'arm64';
  else if (/x86_64|x64|Win64|WOW64|amd64/i.test(nav.userAgent)) arch = 'amd64';
  else if (/i[3-6]86/i.test(nav.userAgent)) arch = '386';
  try {
    if (nav.userAgentData) {
      const hints = await Promise.race([
        nav.userAgentData.getHighEntropyValues(['architecture', 'bitness', 'wow64']),
        new Promise<Hints>((resolve) => setTimeout(() => resolve({}), 1000)),
      ]);
      if (hints.architecture === 'x86')
        arch = hints.bitness === '64' || hints.wow64 ? 'amd64' : hints.bitness === '32' ? '386' : arch;
      else if (hints.architecture === 'arm')
        arch = hints.bitness === '64' ? 'arm64' : hints.bitness === '32' ? 'arm' : arch;
      else if (hints.architecture) arch = normalizeArch(hints.architecture);
    }
  } catch {
    /* Retain conservative UA detection when client hints are unavailable. */
  }
  return { platform, arch };
}
