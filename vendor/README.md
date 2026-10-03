# Configuration integration

`integration/` loads `src/config.yaml` and exposes its normalized values to Astro through the `astrowind:config` virtual module. It also applies the configured site URL, base path, and trailing slash policy.

Keep configuration loading and normalization in this directory. Page layouts, translated content, and application behavior belong in `src/` and `public/i18n/`.
