# DiffScope website

The bilingual DiffScope website at [diffscope.org](https://diffscope.org), built with Astro, AstroWind, Tailwind CSS, and Tabler icons. It is generated as a static site and deployed to GitHub Pages.

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

English uses the root path; Simplified Chinese uses `/zh-Hans/`. Each locale has home, downloads, features, contribute, and community routes. The downloads page has no body content, and the other secondary pages display a title and a placeholder until their content is published. Documentation is hosted separately at [docs.diffscope.org](https://docs.diffscope.org/).

## Content and localization

Edit `public/i18n/en.json` and `public/i18n/zh-Hans.json` to update copy. Keep the same keys and section structure in every locale. These resources contain data only; components handle presentation and behavior.

To add a language, create its JSON resource, register it in `src/i18n/index.ts`, and update the locale and sitemap settings in `astro.config.ts`. Add the localized text for every existing key, including accessibility labels and metadata. Language names come from each resource's `languageName` field.

## Announcements

Set `enabled` in `public/announcement.json` to control the banner. Set `announcement.text` in each locale resource to supply its message. An empty message hides the banner for that locale.

Announcements are rendered during the build. The browser also fetches the announcement configuration and the current locale resource to refresh the banner. Commit and deploy configuration or content changes to publish them on GitHub Pages.

## Downloads

The release catalog in `src/utils/downloads.mjs` is currently empty. Populate it when releases become available. The download controls distinguish unavailable channels from channels that do not support the visitor's system.

For a supported system, the primary button selects Stable, then Beta, then Nightly. Platform detection supports Windows, macOS, and Linux. Mobile and unknown systems are treated as unsupported. Keep release selection independent of the interface and update its tests when changing this behavior.

## Deployment

`.github/workflows/deploy.yml` installs locked dependencies, runs checks and tests, builds the website, and deploys `dist/` on pushes to `main` or manual dispatch.

In repository settings, select **GitHub Actions** as the Pages source. Set the custom domain to `diffscope.org`, configure its DNS for GitHub Pages, and enable HTTPS after domain verification. The site URL is configured in `astro.config.ts` and `src/config.yaml`; `public/CNAME` supplies the custom domain. Keep these values aligned when changing domains. The site uses the domain root rather than a repository subpath.

## Licensing

Copyright holder: **Team OpenVPI**.

- Website source code and implementation configuration are licensed under the **MIT License**.
- Website content, including translation resources and visual assets, and repository documentation are licensed under **CC BY-SA 4.0**.

Full license texts are in `LICENSES/MIT.txt` and `LICENSES/CC-BY-SA-4.0.txt`. Source files carry SPDX comment headers; other files are covered individually by `REUSE.toml`. Keep licensing declarations current when adding or moving files. With the REUSE tool installed, run `reuse lint` from the repository root to validate them.
