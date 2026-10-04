/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

import configuration from '../data/downloads.json' with { type: 'json' };
import { channels, type Channel } from './downloads.mjs';

export interface Artifact {
  platform: string;
  arch: string;
  format: string;
  variant?: string;
  url: string;
  size: number;
  sha256: string;
}
export interface ReleaseManifest {
  channel: Channel;
  version: string;
  date: string;
  source: { commit: string; tag?: string };
  releaseNotes?: string;
  artifacts: Artifact[];
}
export interface VersionEntry {
  version: string;
  manifest: string;
}
export type ProductIndex = Record<Channel, VersionEntry[]>;
export type LatestReleases = Partial<Record<Channel, ReleaseManifest>>;
export const downloadConfiguration = configuration;

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid catalog object');
  return value as Record<string, unknown>;
};
const text = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid catalog string');
  return value;
};
export const httpUrl = (value: string, base?: string): string => {
  const url = new URL(value, base);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid catalog URL');
  return url.href;
};

export function parseVersionEntries(value: unknown, baseUrl: string): VersionEntry[] {
  const entries = object(value).versions;
  if (!Array.isArray(entries)) throw new Error('Invalid version list');
  const versions = new Set<string>();
  return entries.map((raw) => {
    const entry = object(raw);
    const version = text(entry.version);
    if (versions.has(version)) throw new Error('Duplicate version');
    versions.add(version);
    return { version, manifest: httpUrl(text(entry.manifest), baseUrl) };
  });
}

export function parseManifest(value: unknown, entry: VersionEntry, channel: Channel): ReleaseManifest {
  const manifest = object(value);
  if (manifest.version !== entry.version || manifest.channel !== channel) throw new Error('Manifest identity mismatch');
  const date = text(manifest.date);
  if (!Number.isFinite(Date.parse(date))) throw new Error('Invalid release date');
  const source = object(manifest.source);
  const commit = text(source.commit);
  if (!Array.isArray(manifest.artifacts) || !manifest.artifacts.length) throw new Error('Invalid release artifacts');
  const artifacts = manifest.artifacts.map((raw): Artifact => {
    const artifact = object(raw);
    if (!Number.isSafeInteger(artifact.size) || (artifact.size as number) < 0) throw new Error('Invalid file size');
    const sha256 = text(artifact.sha256);
    if (!/^[a-f\d]{64}$/i.test(sha256)) throw new Error('Invalid SHA-256');
    if (artifact.variant !== undefined && typeof artifact.variant !== 'string') throw new Error('Invalid variant');
    return {
      platform: text(artifact.platform),
      arch: text(artifact.arch),
      format: text(artifact.format),
      variant: artifact.variant as string | undefined,
      url: httpUrl(text(artifact.url)),
      size: artifact.size as number,
      sha256,
    };
  });
  return {
    version: entry.version,
    channel,
    date,
    source: { commit, tag: source.tag === undefined ? undefined : text(source.tag) },
    releaseNotes: manifest.releaseNotes === undefined ? undefined : httpUrl(text(manifest.releaseNotes)),
    artifacts,
  };
}

export function createCatalogClient(config = configuration, fetcher: typeof fetch = fetch) {
  const indexes = new Map<string, Promise<ProductIndex>>();
  const manifests = new Map<string, Promise<ReleaseManifest>>();
  async function json(url: string, optional = false) {
    const response = await fetcher(url, { signal: AbortSignal.timeout(15000), cache: 'no-cache' });
    if (optional && response.status === 404) return null;
    if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
    return response.json() as Promise<unknown>;
  }
  function getIndex(product: string): Promise<ProductIndex> {
    if (!config.products.some(({ id }) => id === product)) return Promise.reject(new Error('Product is not enabled'));
    const cached = indexes.get(product);
    if (cached) return cached;
    const base = `${config.catalogBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(product)}/`;
    const indexUrl = new URL('index.json', base).href;
    const nightlyUrl = new URL('nightly.json', base).href;
    const pending = Promise.all([json(indexUrl, true), json(nightlyUrl, true)]).then(([index, nightly]) => ({
      stable: index === null ? [] : parseVersionEntries(object(index).stable, indexUrl),
      beta: index === null ? [] : parseVersionEntries(object(index).beta, indexUrl),
      nightly: nightly === null ? [] : parseVersionEntries(object(nightly).nightly, nightlyUrl),
    }));
    indexes.set(product, pending);
    void pending.catch(() => indexes.delete(product));
    return pending;
  }
  function getManifest(entry: VersionEntry, channel: Channel): Promise<ReleaseManifest> {
    const key = `${channel}:${entry.version}:${entry.manifest}`;
    const cached = manifests.get(key);
    if (cached) return cached;
    const pending = json(entry.manifest).then((raw) => parseManifest(raw, entry, channel));
    manifests.set(key, pending);
    void pending.catch(() => manifests.delete(key));
    return pending;
  }
  async function getLatest(product: string): Promise<LatestReleases> {
    const index = await getIndex(product);
    const results = await Promise.all(
      channels.map(async (channel) => {
        const entry = index[channel][0];
        return entry ? ([channel, await getManifest(entry, channel)] as const) : null;
      })
    );
    return Object.fromEntries(results.filter((result) => result !== null));
  }
  return { getIndex, getManifest, getLatest };
}

export const catalogClient = createCatalogClient();
