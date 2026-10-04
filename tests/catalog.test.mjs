/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createCatalogClient, parseManifest, parseVersionEntries } from '../src/utils/catalog.ts';
import { manifest, releaseFixture } from './fixtures/releases.mjs';
const config = {
  catalogBaseUrl: 'https://catalog.test/v1',
  defaultProduct: 'diffscope',
  products: [{ id: 'diffscope', name: 'DiffScope', icon: '/icon.png' }],
};

test('manifest paths resolve relative to their index', () => {
  assert.equal(
    parseVersionEntries(
      { versions: [{ version: '1', manifest: 'stable/1.json' }] },
      'https://catalog.test/v1/diffscope/index.json'
    )[0].manifest,
    'https://catalog.test/v1/diffscope/stable/1.json'
  );
  assert.throws(() =>
    parseVersionEntries(
      { versions: [{ version: '1', manifest: 'javascript:alert(1)' }] },
      'https://catalog.test/index.json'
    )
  );
});
test('parallel consumers share requests and older manifests remain lazy', async () => {
  const fixture = releaseFixture(),
    requests = [];
  const client = createCatalogClient(config, async (url) => {
    requests.push(url);
    const value = fixture[String(url).replace('https://catalog.test/v1/diffscope/', '')];
    return new Response(value ? JSON.stringify(value) : null, { status: value ? 200 : 404 });
  });
  await Promise.all([client.getLatest('diffscope'), client.getLatest('diffscope'), client.getIndex('diffscope')]);
  assert.equal(requests.length, 5);
  assert.ok(!requests.some((url) => url.endsWith('/1.0.0.json')));
  const index = await client.getIndex('diffscope');
  await client.getManifest(index.stable[1], 'stable');
  await client.getManifest(index.stable[1], 'stable');
  assert.equal(requests.length, 6);
  await assert.rejects(client.getIndex('hidden-product'));
  assert.equal(requests.length, 6);
});
test('404 represents an absent catalog and failed requests can be retried', async () => {
  assert.deepEqual(
    await createCatalogClient(config, async () => new Response(null, { status: 404 })).getLatest('diffscope'),
    {}
  );
  let failed = false;
  const client = createCatalogClient(config, async (url) => {
    if (String(url).endsWith('/index.json') && !failed) {
      failed = true;
      return new Response(null, { status: 503 });
    }
    return new Response(
      JSON.stringify(
        String(url).endsWith('/nightly.json')
          ? { nightly: { versions: [] } }
          : { stable: { versions: [] }, beta: { versions: [] } }
      )
    );
  });
  await assert.rejects(client.getIndex('diffscope'));
  assert.deepEqual(await client.getLatest('diffscope'), {});
});
test('manifest validation rejects identity mismatches and invalid download metadata', () => {
  const entry = { version: '1.0.0', manifest: 'https://catalog.test/1.0.0.json' },
    valid = manifest('stable', '1.0.0');
  assert.equal(parseManifest(valid, entry, 'stable').version, '1.0.0');
  assert.throws(() => parseManifest({ ...valid, version: '2.0.0' }, entry, 'stable'));
  assert.throws(() => parseManifest({ ...valid, channel: 'beta' }, entry, 'stable'));
  for (const patch of [{ url: 'javascript:alert(1)' }, { sha256: 'bad' }, { size: -1 }, { size: 1.5 }])
    assert.throws(() => parseManifest({ ...valid, artifacts: [{ ...valid.artifacts[0], ...patch }] }, entry, 'stable'));
});
