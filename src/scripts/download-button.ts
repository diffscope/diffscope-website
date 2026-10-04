/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

import { catalogClient, downloadConfiguration } from '~/utils/catalog';
import { artifactLabel, channels, downloadHash, resolveDownloads } from '~/utils/downloads.mjs';
import { getDevice } from '~/utils/device';
import type { Dictionary } from '~/i18n';

class DownloadControl extends HTMLElement {
  private initialized = false;
  private loading = false;
  private mainAction: (() => void) | undefined;
  connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;
    const main = this.querySelector<HTMLButtonElement>('[data-download-main]');
    main?.addEventListener('click', () => this.mainAction?.());
    this.mainAction = () =>
      location.assign(`${this.dataset.page}${downloadHash(downloadConfiguration.defaultProduct)}`);
    this.querySelector<HTMLDetailsElement>('[data-download-details]')?.addEventListener('toggle', (event) => {
      if ((event.target as HTMLDetailsElement).open) void this.load();
    });
    if (this.dataset.lazy !== 'true') void this.load();
  }
  private loaded = false;
  private async load() {
    if (this.loaded || this.loading) return;
    this.loading = true;
    const t: Pick<Dictionary, 'ui' | 'downloads'> = JSON.parse(this.dataset.strings!);
    const main = this.querySelector<HTMLButtonElement>('[data-download-main]')!;
    const label = this.querySelector<HTMLElement>('[data-download-label]')!;
    const subtitle = this.querySelector<HTMLElement>('[data-download-subtitle]')!;
    const compact = this.dataset.compact === 'true';
    main.disabled = true;
    main.setAttribute('aria-busy', 'true');
    main.removeAttribute('title');
    label.textContent = compact ? t.ui.download : t.downloads.loading;
    subtitle.textContent = '';
    try {
      const [releases, device] = await Promise.all([
        catalogClient.getLatest(downloadConfiguration.defaultProduct),
        getDevice(),
      ]);
      if (!this.isConnected) return;
      const result = resolveDownloads(releases, device);
      const visit = (entry: (typeof result.entries)[number]) => {
        if (entry.artifact) location.assign(entry.artifact.url);
        else
          location.assign(
            `${this.dataset.page}${downloadHash(downloadConfiguration.defaultProduct, entry.release?.version)}`
          );
      };
      const preferred = result.preferred;
      label.textContent = preferred?.release
        ? compact
          ? t.ui.download
          : t.downloads.downloadVersion
              .replace('{version}', preferred.release.version.replace(/^v/, ''))
              .replace('{channel}', t.downloads.channelSuffix[preferred.channel])
        : t.ui.comingSoon;
      subtitle.textContent = preferred?.artifact
        ? artifactLabel(preferred.artifact, t.downloads.variants, t.downloads.platforms)
        : preferred
          ? t.downloads.unsupportedHint
          : '';
      main.disabled = !preferred;
      this.mainAction = preferred ? () => visit(preferred) : undefined;
      result.entries.forEach((entry) => {
        const button = this.querySelector<HTMLButtonElement>(`[data-channel="${entry.channel}"]`)!;
        button.disabled = !entry.release;
        button.querySelector('.channel-status')!.textContent = entry.release
          ? `v${entry.release.version.replace(/^v/, '')}`
          : t.ui.comingSoon;
        button.onclick = () => visit(entry);
      });
      this.loaded = true;
    } catch {
      if (!this.isConnected) return;
      label.textContent = compact ? t.ui.download : t.downloads.retry;
      main.title = t.downloads.loadError;
      subtitle.textContent = t.downloads.loadError;
      main.disabled = false;
      this.mainAction = () => void this.load();
      channels.forEach((channel) => {
        const status = this.querySelector(`[data-channel="${channel}"] .channel-status`);
        if (status) status.textContent = t.downloads.loadError;
      });
    } finally {
      this.loading = false;
      main.setAttribute('aria-busy', 'false');
    }
  }
}
if (!customElements.get('ds-download')) customElements.define('ds-download', DownloadControl);
document.addEventListener('click', (event) => {
  document.querySelectorAll<HTMLDetailsElement>('[data-download-details][open]').forEach((details) => {
    if (!details.contains(event.target as Node)) details.open = false;
  });
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  document.querySelectorAll<HTMLDetailsElement>('[data-download-details][open]').forEach((details) => {
    if (details.contains(document.activeElement)) details.querySelector('summary')?.focus();
    details.open = false;
  });
});
