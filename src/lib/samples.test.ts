import { beforeEach, describe, expect, it } from 'vitest';

import {
  MAX_SAMPLES,
  clearSamples,
  deleteSample,
  getSample,
  listSamples,
  putSample,
} from './samples';
import type { WritingSample } from './types';

function sample(id: string, createdAt: number): WritingSample {
  return {
    id,
    createdAt,
    target: 'A',
    mode: 'tracing',
    dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    width: 600,
    height: 420,
  };
}

beforeEach(async () => {
  await clearSamples();
});

describe('sample storage', () => {
  it('stores and reads back a sample', async () => {
    expect(await putSample(sample('s1', 1000))).toBe(true);
    const loaded = await getSample('s1');
    expect(loaded?.dataUrl).toBe('data:image/png;base64,iVBORw0KGgo=');
  });

  it('lists samples newest first', async () => {
    await putSample(sample('old', 1000));
    await putSample(sample('new', 5000));
    expect((await listSamples()).map((s) => s.id)).toEqual(['new', 'old']);
  });

  it('returns null for an id that is not there', async () => {
    expect(await getSample('missing')).toBeNull();
  });

  it('deletes a sample', async () => {
    await putSample(sample('s1', 1000));
    await deleteSample('s1');
    expect(await getSample('s1')).toBeNull();
    expect(await listSamples()).toEqual([]);
  });

  it('keeps only the newest samples once the cap is reached', async () => {
    for (let i = 0; i < MAX_SAMPLES + 5; i++) await putSample(sample(`s${i}`, i + 1));
    const all = await listSamples();
    expect(all).toHaveLength(MAX_SAMPLES);
    // The five oldest were pruned.
    expect(await getSample('s0')).toBeNull();
    expect(await getSample(`s${MAX_SAMPLES + 4}`)).not.toBeNull();
  });

  it('replaces a sample stored under the same id', async () => {
    await putSample(sample('s1', 1000));
    await putSample({ ...sample('s1', 2000), target: 'B' });
    expect(await listSamples()).toHaveLength(1);
    expect((await getSample('s1'))?.target).toBe('B');
  });
});
