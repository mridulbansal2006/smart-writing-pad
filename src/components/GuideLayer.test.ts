import { describe, expect, it } from 'vitest';

import { distance } from '../lib/geometry';
import { ALL_CHARACTERS, glyphFor } from '../lib/glyphs';
import { placeMarkers } from './GuideLayer';

const RADIUS = 9;

describe('placeMarkers', () => {
  it('keeps the numbered dots far enough apart to read', () => {
    // A is the worst case: two strokes starting at exactly the same apex.
    const markers = placeMarkers(glyphFor('A')!.strokes, RADIUS);
    expect(markers).toHaveLength(3);
    expect(distance(markers[0]!.at, markers[1]!.at)).toBeGreaterThanOrEqual(RADIUS * 2.1);
  });

  it('separates the dots on every character the app can draw', () => {
    for (const char of ALL_CHARACTERS) {
      const markers = placeMarkers(glyphFor(char)!.strokes, RADIUS);
      for (let i = 0; i < markers.length; i++) {
        for (let j = i + 1; j < markers.length; j++) {
          expect(
            distance(markers[i]!.at, markers[j]!.at),
            `markers ${i + 1} and ${j + 1} overlap on "${char}"`,
          ).toBeGreaterThanOrEqual(RADIUS * 2.1);
        }
      }
    }
  });

  it('puts each dot just before its stroke, pointing the way it travels', () => {
    const strokes = glyphFor('L')!.strokes;
    const [marker] = placeMarkers(strokes, RADIUS);
    const start = strokes[0]![0]!;
    // L starts at the top and goes down, so the dot sits above the start.
    expect(marker!.at.y).toBeLessThan(start.y);
    expect(marker!.heading.y).toBeGreaterThan(0.9);
    expect(distance(marker!.at, start)).toBeLessThan(RADIUS * 2);
  });

  it('ignores empty strokes', () => {
    expect(placeMarkers([[], glyphFor('l')!.strokes[0]!], RADIUS)).toHaveLength(1);
  });
});
