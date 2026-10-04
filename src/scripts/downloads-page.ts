/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

import {
  catalogClient,
  downloadConfiguration,
  type ProductIndex,
  type ReleaseManifest,
  type VersionEntry,
} from '~/utils/catalog';
import {
  artifactLabel,
  platformLabel,
  channels,
  downloadHash,
  formatFileSize,
  parseDownloadHash,
  resolveDownloads,
  selectArtifact,
  type Channel,
  type Device,
} from '~/utils/downloads.mjs';
import { getDevice } from '~/utils/device';
import type { Dictionary } from '~/i18n';

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
};

class DownloadsPage extends HTMLElement {
  private initialized = false;
  private product = '';
  private channel: Channel = 'stable';
  private index: ProductIndex | undefined;
  private device: Device = { platform: 'unknown' };
  private epoch = 0;
  private routing = 0;
  private strings!: Pick<Dictionary, 'ui' | 'downloads'>;
  private cards = new Map<string, HTMLDetailsElement>();
  private loadingCards = new WeakSet<HTMLDetailsElement>();
  private loadedCards = new WeakSet<HTMLDetailsElement>();
  private latestManifests = new Map<Channel, ReleaseManifest>();
  private hashListener = () => void this.route();
  connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;
    this.strings = JSON.parse(this.dataset.strings!);
    this.querySelectorAll<HTMLInputElement>('input[name="download-product"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) location.hash = downloadHash(input.value);
      });
    });
    this.querySelectorAll<HTMLButtonElement>('[data-release-channel]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const channel = tab.dataset.releaseChannel as Channel;
        this.routing++;
        this.renderChannel(channel);
        this.setHash();
      });
      tab.addEventListener('keydown', (event) => {
        const tabs = [...this.querySelectorAll<HTMLButtonElement>('[data-release-channel]:not(:disabled)')];
        let position = tabs.indexOf(tab);
        if (event.key === 'ArrowRight') position = (position + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') position = (position - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') position = 0;
        else if (event.key === 'End') position = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[position]?.focus();
        tabs[position]?.click();
      });
    });
    window.addEventListener('hashchange', this.hashListener);
    void this.route();
  }
  disconnectedCallback() {
    window.removeEventListener('hashchange', this.hashListener);
  }
  private get list() {
    return this.querySelector<HTMLElement>('#release-list')!;
  }
  private get state() {
    return this.querySelector<HTMLElement>('[data-page-state]')!;
  }
  private setHash(version?: string) {
    const hash = downloadHash(this.product, version);
    if (location.hash !== hash) history.pushState(null, '', hash);
  }
  private status(message: string, loading = false, retry?: () => void) {
    this.state.replaceChildren();
    this.state.hidden = !message;
    if (loading) this.state.append(element('span', 'loading-spinner'));
    this.state.append(element('span', '', message));
    if (retry) {
      const button = element('button', 'release-retry', this.strings.downloads.retry);
      button.type = 'button';
      button.onclick = retry;
      this.state.append(button);
    }
    this.list.setAttribute('aria-busy', String(loading));
  }
  private async route() {
    const routing = ++this.routing;
    const route = parseDownloadHash(
      location.hash,
      downloadConfiguration.products.map(({ id }) => id),
      downloadConfiguration.defaultProduct
    );
    const routeWarning = this.querySelector<HTMLElement>('[data-route-warning]')!;
    routeWarning.hidden = !route.invalid;
    routeWarning.textContent = this.strings.downloads.invalidRoute;
    if (this.product !== route.product || !this.index) {
      this.product = route.product;
      this.index = undefined;
      const epoch = ++this.epoch;
      this.list.replaceChildren();
      this.cards.clear();
      this.latestManifests.clear();
      this.querySelectorAll<HTMLInputElement>('input[name="download-product"]').forEach(
        (input) => (input.checked = input.value === this.product)
      );
      this.querySelectorAll<HTMLButtonElement>('[data-release-channel]').forEach((tab) => (tab.disabled = true));
      this.querySelector<HTMLElement>('[data-platform-warning]')!.hidden = true;
      this.status(this.strings.downloads.loading, true);
      try {
        const [index, releases, device] = await Promise.all([
          catalogClient.getIndex(this.product),
          catalogClient.getLatest(this.product),
          getDevice(),
        ]);
        if (epoch !== this.epoch || !this.isConnected) return;
        this.index = index;
        this.device = device;
        channels.forEach((channel) => {
          if (releases[channel]) this.latestManifests.set(channel, releases[channel]);
        });
        const selected = resolveDownloads(releases, device).preferred?.channel ?? 'stable';
        this.renderChannel(selected);
      } catch {
        if (epoch !== this.epoch || !this.isConnected) return;
        this.status(this.strings.downloads.loadError, false, () => {
          this.index = undefined;
          void this.route();
        });
        return;
      }
    }
    if (routing !== this.routing) return;
    if (route.version) {
      const channel = channels.find((channel) => this.index![channel].some(({ version }) => version === route.version));
      if (!channel) {
        routeWarning.hidden = false;
        return;
      }
      if (this.channel !== channel) this.renderChannel(channel);
      const card = this.cards.get(route.version);
      if (card) {
        card.open = true;
        void this.loadCard(
          card,
          this.index![channel].find(({ version }) => version === route.version)!,
          channel
        );
      }
    } else {
      this.cards.forEach((card) => {
        card.open = false;
      });
    }
  }
  private renderChannel(channel: Channel) {
    this.channel = channel;
    this.list.replaceChildren();
    this.cards.clear();
    this.list.setAttribute('aria-labelledby', `tab-${channel}`);
    this.querySelectorAll<HTMLButtonElement>('[data-release-channel]').forEach((tab) => {
      const value = tab.dataset.releaseChannel as Channel;
      tab.disabled = !this.index?.[value].length;
      tab.setAttribute('aria-selected', String(value === channel));
      tab.tabIndex = value === channel ? 0 : -1;
    });
    const manifest = this.latestManifests.get(channel);
    this.querySelector<HTMLElement>('[data-platform-warning]')!.hidden =
      !manifest || !!selectArtifact(manifest.artifacts, this.device);
    const versions = this.index?.[channel] ?? [];
    this.status(versions.length ? '' : this.strings.downloads.noReleases);
    versions.forEach((entry) => {
      const card = element('details', 'release-card');
      card.dataset.version = entry.version;
      const summary = element('summary', 'release-summary');
      summary.append(element('h2', '', `v${entry.version.replace(/^v/, '')}`));
      summary.append(this.querySelector<HTMLTemplateElement>('[data-chevron-icon]')!.content.cloneNode(true));
      const body = element('div', 'release-body');
      card.append(summary, body);
      card.addEventListener('toggle', () => {
        if (!card.isConnected) return;
        if (card.open) {
          this.setHash(entry.version);
          void this.loadCard(card, entry, channel);
        } else if (parseDownloadHash(location.hash, [this.product], this.product).version === entry.version)
          this.setHash();
      });
      this.cards.set(entry.version, card);
      this.list.append(card);
    });
  }
  private async loadCard(card: HTMLDetailsElement, entry: VersionEntry, channel: Channel) {
    if (this.loadingCards.has(card) || this.loadedCards.has(card)) return;
    this.loadingCards.add(card);
    const body = card.querySelector<HTMLElement>('.release-body')!;
    const loading = element('div', 'release-loading');
    loading.setAttribute('role', 'status');
    loading.append(element('span', 'loading-spinner'), element('span', '', this.strings.downloads.loadingVersion));
    body.replaceChildren(loading);
    body.setAttribute('aria-busy', 'true');
    try {
      const manifest = await catalogClient.getManifest(entry, channel);
      if (!card.isConnected) return;
      body.replaceChildren();
      const metadata = element('div', 'release-meta');
      const date = element(
        'time',
        '',
        new Intl.DateTimeFormat(this.dataset.locale, { dateStyle: 'medium', timeStyle: 'medium' }).format(
          new Date(manifest.date)
        )
      );
      date.dateTime = manifest.date;
      const notesGroup = element('span', 'release-notes-group');
      const separator = element('span', '', '·');
      separator.setAttribute('aria-hidden', 'true');
      notesGroup.append(separator);
      if (manifest.releaseNotes) {
        const notes = element('a', 'release-notes-link', this.strings.downloads.releaseNotes);
        notes.href = manifest.releaseNotes;
        notes.target = '_blank';
        notes.rel = 'noopener noreferrer';
        notes.append(this.querySelector<HTMLTemplateElement>('[data-external-link-icon]')!.content.cloneNode(true));
        notesGroup.append(notes);
      } else notesGroup.append(element('span', 'release-notes-unavailable', this.strings.downloads.noReleaseNotes));
      metadata.append(date, notesGroup);
      body.append(metadata);
      const groups = new Map<string, typeof manifest.artifacts>();
      manifest.artifacts.forEach((artifact) =>
        groups.set(artifact.platform, [...(groups.get(artifact.platform) ?? []), artifact])
      );
      groups.forEach((artifacts, platform) => {
        const section = element('section', 'artifact-platform');
        section.append(element('h3', '', platformLabel(platform, this.strings.downloads.platforms)));
        const list = element('ul', 'artifact-list');
        artifacts.forEach((artifact) => {
          const item = element('li', 'artifact-entry');
          const content = element('div', 'artifact-content');
          const name = artifactLabel(artifact, this.strings.downloads.variants, this.strings.downloads.platforms);
          content.append(element('p', 'artifact-name', name));
          const size = formatFileSize(artifact.size, this.dataset.locale!);
          content.append(
            element(
              'p',
              'artifact-details',
              this.strings.downloads.fileDetails.replace('{size}', size).replace('{checksum}', artifact.sha256)
            )
          );
          const link = element('a', 'artifact-download');
          link.href = artifact.url;
          link.setAttribute('aria-label', this.strings.downloads.downloadFile.replace('{name}', name));
          link.append(this.querySelector<HTMLTemplateElement>('[data-download-icon]')!.content.cloneNode(true));
          item.append(content, link);
          list.append(item);
        });
        section.append(list);
        body.append(section);
      });
      this.loadedCards.add(card);
    } catch {
      if (!card.isConnected) return;
      body.replaceChildren(element('p', 'release-error', this.strings.downloads.versionError));
      const retry = element('button', 'release-retry', this.strings.downloads.retry);
      retry.type = 'button';
      retry.onclick = () => void this.loadCard(card, entry, channel);
      body.append(retry);
    } finally {
      this.loadingCards.delete(card);
      body.setAttribute('aria-busy', 'false');
    }
  }
}
if (!customElements.get('ds-downloads-page')) customElements.define('ds-downloads-page', DownloadsPage);
