/*
 * SPDX-FileCopyrightText: Team OpenVPI
 * SPDX-License-Identifier: MIT
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const resourceDirectory = new URL('../public/i18n/', import.meta.url);
const load = (file) => JSON.parse(readFileSync(new URL(file, resourceDirectory), 'utf8'));
const schema = (value, key = '') =>
  value && typeof value === 'object'
    ? Object.entries(value)
        .flatMap(([name, child]) => schema(child, `${key}/${name}`))
        .sort()
    : [`${key}:${typeof value}`];

test('every locale supplies the same content keys and value types', () => {
  const reference = schema(load('en.json'));
  for (const file of readdirSync(resourceDirectory).filter((name) => name.endsWith('.json'))) {
    assert.deepEqual(schema(load(file)), reference, `${file} must match the English resource schema`);
  }
});
