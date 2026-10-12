// _featuredRawFrames — the homepage RAW-card feed derived from buffer.json.
// Two invariants matter and are pinned here:
//   1. Frame numbers (f#NNN) are POSITIONAL over EVERY buffer entry, dark
//      tombstones included, so retired slots keep their number (frame
//      permanence, manual §5.20) — the number must match the console + the
//      public buffer page or a citation breaks.
//   2. Only featured, non-dark frames with media are returned, newest first,
//      carrying the point data the card needs, honoring the limit.
// The fixture below carries TWO featured entries ON PURPOSE. The console write
// path is exclusive (starring un-stars the previous frame — toggleBufferFeatured,
// pinned by tests/buffer-featured.test.js), but buffer.json published by an
// older console can legitimately carry several flags, and this endpoint must
// keep degrading to "newest wins" rather than erroring or picking arbitrarily.
// Console writes one; server survives many. Do not make the server exclusive.
// localDay pins the day bucket to the project timezone (Intl, machine-TZ
// independent), so these assertions are stable on any CI box.
import { describe, it, expect } from 'vitest';
import { _featuredRawFrames, _latestShowable } from '../src/api/site-meta.js';

// Midday-UTC stamps stay on their calendar date in every zone within 12 hours
// of UTC, so the day buckets below are unambiguous regardless of where the test
// runs AND of what `timezone` the config names — which matters now that it is
// configurable (engine default UTC, this instance Pacific). Move these to
// midnight and the test starts asserting one instance's calendar.
const D1 = '2025-01-01T12:00:00.000Z';
const D2 = '2025-01-02T12:00:00.000Z';
const D3 = '2025-01-03T12:00:00.000Z';

const entries = [
  { id: 'A', captured_at: D1, filename: 'a.webp' },
  { id: 'B', captured_at: D1, filename: 'b.webp', dark: true },          // tombstone: holds slot 2
  { id: 'C', captured_at: D2, filename: 'c.webp', featured: true, focus: '10% 20%' },
  { id: 'D', captured_at: D3, filename: 'd.webp', featured: true, cardFocus: '30% 40%' },
  { id: 'E', captured_at: D3, filename: 'e.webp' },                      // not featured
];

describe('_featuredRawFrames — featured RAW cards + positional numbers', () => {
  it('returns only featured, non-dark frames, newest first', () => {
    const out = _featuredRawFrames(entries);
    expect(out.map((f) => f.id)).toEqual(['D', 'C']);
  });

  it('numbers positionally over ALL entries incl. dark tombstones', () => {
    const out = _featuredRawFrames(entries);
    // sorted by (day, filename): A=1, B(dark)=2, C=3, D=4, E=5
    expect(out.find((f) => f.id === 'C').num).toBe(3); // proves dark B still consumed slot 2
    expect(out.find((f) => f.id === 'D').num).toBe(4);
  });

  it('carries focus + cardFocus, defaulting each to empty string', () => {
    const out = _featuredRawFrames(entries);
    const d = out.find((f) => f.id === 'D');
    const c = out.find((f) => f.id === 'C');
    expect(d.cardFocus).toBe('30% 40%');
    expect(d.focus).toBe('');
    expect(c.focus).toBe('10% 20%');
    expect(c.cardFocus).toBe('');
  });

  it('honors the limit (newest kept)', () => {
    expect(_featuredRawFrames(entries, 1).map((f) => f.id)).toEqual(['D']);
  });

  it('excludes a featured frame with no media', () => {
    const out = _featuredRawFrames([{ id: 'X', captured_at: D3, featured: true }]);
    expect(out).toEqual([]);
  });

  it('empty / non-array in → empty out', () => {
    expect(_featuredRawFrames([])).toEqual([]);
    expect(_featuredRawFrames(null)).toEqual([]);
    expect(_featuredRawFrames(undefined)).toEqual([]);
  });
});

// The archive landing's strip thumbnail. A dark frame keeps its number (it is
// counted) but has no picture: its R2 variants go on the publish that retires
// it. Picking it showed a dead thumbnail on /archive the night a test drop was
// retired a minute after it went live (2026-10-12).
describe('_latestShowable — the newest frame that still has a picture', () => {
  it('skips a retired newest frame', () => {
    const arr = [...entries, { id: 'F', captured_at: '2025-01-04T12:00:00.000Z', filename: 'f.webp', dark: true }];
    expect(_latestShowable(arr).id).toBe('E');
  });
  it('picks by capture time, not list order', () => {
    expect(_latestShowable([{ id: 'new', captured_at: D3, filename: 'n.webp' }, { id: 'old', captured_at: D1, filename: 'o.webp' }]).id).toBe('new');
    expect(_latestShowable([{ id: 'old', captured_at: D1, filename: 'o.webp' }, { id: 'new', captured_at: D3, filename: 'n.webp' }]).id).toBe('new');
  });
  it('null when every frame is dark, or there are none', () => {
    expect(_latestShowable([{ id: 'B', captured_at: D1, filename: 'b.webp', dark: true }])).toBeNull();
    expect(_latestShowable([])).toBeNull();
    expect(_latestShowable(null)).toBeNull();
  });
});
