# DiffScope website

The multilingual DiffScope website at [diffscope.org](https://diffscope.org), built with Astro, AstroWind, Tailwind CSS, and Tabler icons. It is generated as a static site and deployed to GitHub Pages.

## Development

Use Node.js 22.22.3 or later. CI uses Node.js 24.

```sh
npm ci
npm run dev
```

The development server runs at `http://localhost:4321`.

```sh
npm run check
npm test
npm run build
npm run preview
```

`check` runs Astro type checking, ESLint, and Prettier. Tests cover release selection, platform detection, and locale resource consistency. The production build is written to `dist/`.

## Project structure

| Location                            | Purpose                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `public/i18n/`                      | JSON resources for all translated page content, interface labels, metadata, and announcements |
| `src/i18n/index.ts`                 | Locale registration, resource loading, and localized URL helpers                              |
| `src/components/widgets/`           | Shared header, footer, and home page sections                                                 |
| `src/layouts/PageLayout.astro`      | Shared page layout and metadata                                                               |
| `src/pages/`                        | Static routes and the error page                                                              |
| `src/data/links.json`               | External links                                                                                |
| `src/data/site.ts`                  | Feature icon configuration                                                                    |
| `src/components/CustomStyles.astro` | Theme colors                                                                                  |
| `src/assets/`                       | Styles and source images                                                                      |
| `vendor/integration/`               | Site configuration integration                                                                |

Each locale has home, downloads, features, contribute, and community routes. Features, contribute, and community display a title and a placeholder until their content is published. Documentation is hosted separately at [docs.diffscope.org](https://docs.diffscope.org/).

## Content and localization

### Supported languages

| Language                     | Locale    | URL         |
| ---------------------------- | --------- | ----------- |
| English                      | `en`      | `/`         |
| Simplified Chinese           | `zh-Hans` | `/zh-Hans/` |
| Traditional Chinese (Taiwan) | `zh-Hant` | `/zh-Hant/` |
| Japanese                     | `ja`      | `/ja/`      |

Edit the locale resources in `public/i18n/` to update copy. Keep the same keys and section structure in every locale. These resources contain data only; components handle presentation and behavior.

Visitors to unprefixed URLs are directed to a supported language based on their browser preferences. Explicit locale-prefixed URLs retain their language. A manual selection in the language menu is saved and takes priority over browser preferences on subsequent visits. Language changes preserve query parameters and section anchors. If local storage is unavailable, manual selections use a `lang` query parameter instead.

To add a language, create its JSON resource, register it in `src/i18n/index.ts`, and add its identifier to `src/i18n/routing.mjs`. Astro and sitemap configuration share this locale list. Add the localized text for every existing key, including accessibility labels and metadata. Language names come from each resource's `languageName` field.

## Announcements

Set `enabled` in `public/announcement.json` to control the banner. Set `announcement.text` in each locale resource to supply its message. An empty message hides the banner for that locale.

Announcements are rendered during the build. The browser also fetches the announcement configuration and the current locale resource to refresh the banner. Commit and deploy configuration or content changes to publish them on GitHub Pages.

## Downloads

Configure the catalog URL, enabled products, their display names and icons, and the default product in `src/data/downloads.json`. Products not in this list are never fetched or displayed. The production catalog is `https://catalogs.diffscope.org/v1`.

Each product provides `index.json` for Stable and Beta and `nightly.json` for Nightly. Each channel's first version entry is its latest release. Manifest paths are resolved relative to their index URL. Manifests supply release notes and download URLs, platforms, architectures, variants, sizes, and SHA-256 checksums.

The home page awaits both indexes and their latest manifests before displaying download details. All download controls share request caches. The primary button prefers a compatible latest release in Stable, then Beta, then Nightly. If none supports the visitor's system, it offers the first available release and links to the downloads page instead of downloading a file. No releases results in a disabled Coming Soon button; request failures offer a retry.

On the downloads page, selecting a product loads its indexes and latest manifests to choose a compatible default tab and display platform warnings. Other manifests load only when their version cards are opened. The header download menu on this page loads only when opened. A hash of `#diffscope` selects the product; `#diffscope/1.0.0` also selects its channel and opens that version. Product and version identifiers are URL-encoded. Explicit version routes take priority over automatic channel selection.

Windows, macOS, and Linux use their standard display names from locale resources; other platform labels and all architecture labels preserve manifest values. The `installer`, `portable`, and `debug_symbols` variants are translated; unknown variants are displayed unchanged. Automatic download selection uses browser platform and architecture hints where available, prefers installers, and excludes source archives and debug symbols. When the architecture cannot be determined unambiguously, visitors choose a file on the downloads page. Keep release selection independent of the interface and update its tests when changing this behavior.

## Deployment

`.github/workflows/deploy.yml` installs locked dependencies, runs checks and tests, builds the website, and deploys `dist/` on pushes to `main` or manual dispatch.

In repository settings, select **GitHub Actions** as the Pages source. Set the custom domain to `diffscope.org`, configure its DNS for GitHub Pages, and enable HTTPS after domain verification. The site URL is configured in `astro.config.ts` and `src/config.yaml`; `public/CNAME` supplies the custom domain. Keep these values aligned when changing domains. The site uses the domain root rather than a repository subpath.

## Licensing

Copyright holder: **Team OpenVPI**.

- Website source code and implementation configuration are licensed under the **MIT License**.
- Website content, including translation resources and visual assets, and repository documentation are licensed under **CC BY-SA 4.0**.

Full license texts are in `LICENSES/MIT.txt` and `LICENSES/CC-BY-SA-4.0.txt`. Source files carry SPDX comment headers; other files are covered individually by `REUSE.toml`. Keep licensing declarations current when adding or moving files. With the REUSE tool installed, run `reuse lint` from the repository root to validate them.
