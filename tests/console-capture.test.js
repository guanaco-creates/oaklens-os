// @vitest-environment happy-dom
//
// Capture on the Bridge (js/console/capture.js, K66): the spark, a quick
// draft that keeps itself privately and EXPANDs into the full editor, and the
// shelf of frames to cite. The owner, 2026-10-06: capture "the raw thought on
// the curb or train, and when you're ready, it blooms into an essay with zero
// copy-pasting."

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const html = readFileSync(join(ROOT, 'dev/field-console.html'), 'utf8');
globalThis.refreshStageIndicators = () => {};
globalThis.renderTrash = () => {};
globalThis.fetch = async () => new Response('[]', { status: 200 });

let C, S;
beforeAll(async () => {
  document.body.innerHTML = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');
  S = await import('../js/console-state.js');
  C = await import('../js/console/capture.js');
});

const field = () => document.getElementById('br-spark');

describe('the spark', () => {
  it('keeps what is typed as a private draft of its own kind', () => {
    field().value = 'the light on the water';
    const post = C.sparkSave();
    expect(post).toMatchObject({ kind: 'spark', status: 'draft', body: 'the light on the water' });
    expect(localStorage.getItem('oaklens_spark_current')).toBe(post.id);
    // Typed again, the same spark, not a second one.
    field().value = 'the light on the water at six';
    expect(C.sparkSave().id).toBe(post.id);
    expect(S.STATE.posts.filter((p) => p.kind === 'spark')).toHaveLength(1);
  });

  it('an emptied spark is not kept', () => {
    field().value = 'gone soon';
    const id = C.sparkSave().id;
    field().value = '   ';
    expect(C.sparkSave()).toBeNull();
    expect(S.STATE.posts.some((p) => p.id === id)).toBe(false);
    expect(localStorage.getItem('oaklens_spark_current')).toBeNull();
  });

  it('EXPAND makes it a note, empties the field and opens the editor on it, cursor at the end', async () => {
    const chrome = await import('../js/console/chrome.js');
    const seen = [];
    chrome.registerView('fn', { render() {}, onEnter: (seed) => seen.push(seed) });
    field().value = 'it blooms';
    C.sparkExpand();
    const note = S.STATE.posts.find((p) => p.body === 'it blooms');
    expect(note.kind).toBe('note');
    expect(field().value).toBe('');
    expect(seen.at(-1)).toEqual({ load: note.id, caret: 'end', focus: true });
  });

  it('⇧↵ expands; a plain ↵ is a new line', () => {
    const spy = vi.fn();
    const e = (shiftKey) => ({ key: 'Enter', shiftKey, preventDefault: spy });
    field().value = '';
    C.sparkKey(e(false));
    expect(spy).not.toHaveBeenCalled();
    C.sparkKey(e(true));
    expect(spy).toHaveBeenCalled();
  });

  it('is static markup, so the Bridge\'s repaints never take focus from it', () => {
    expect(html).toMatch(/<textarea id="br-spark" class="br-spark-input"/);
    const bridge = readFileSync(join(ROOT, 'js/console/bridge.js'), 'utf8');
    expect(bridge).not.toMatch(/br-spark-input|paintHTML\(\$\('br-spark'\)/);
  });

  it('sparks stay out of "waiting on you" and get their own group in the editor\'s picker', () => {
    const bridge = readFileSync(join(ROOT, 'js/console/bridge.js'), 'utf8');
    expect(bridge).toMatch(/p\.kind !== 'spark'/);
    const fn = readFileSync(join(ROOT, 'js/console/fn-editor.js'), 'utf8');
    expect(fn).toMatch(/group\(`SPARKS \(\$\{sparks\.length\}\)`/);
  });
});

// FILE IT (2026-10-12, the owner: words in the field "just hang there", and
// emptying the field "feels like I'm deleting it rather than storing it
// away"). Several ideas, caught one after another, without leaving the Bridge.
describe('filing sparks away', () => {
  const $ = (id) => document.getElementById(id);
  const sparks = () => S.STATE.posts.filter((p) => p.kind === 'spark' && p.status === 'draft');

  it('files the spark as written and hands back an empty field', () => {
    field().value = 'a song about the ferry bell';
    const filed = C.sparkFile();
    expect(filed).toMatchObject({ kind: 'spark', status: 'draft', body: 'a song about the ferry bell' });
    expect(field().value).toBe('');
    expect(localStorage.getItem('oaklens_spark_current')).toBeNull();
    expect(sparks().some((p) => p.id === filed.id)).toBe(true);
    expect(C.filedSparks()[0].id).toBe(filed.id);
  });

  it('the next words start a new spark; the filed one is untouched', () => {
    field().value = 'second idea';
    const second = C.sparkSave();
    const first = C.filedSparks().find((p) => p.body === 'a song about the ferry bell');
    expect(second.id).not.toBe(first.id);
    expect(first.body).toBe('a song about the ferry bell');
    C.sparkFile();
  });

  it('counts the filed sparks in the foot, and the count opens the newest in Field Notes', async () => {
    const n = C.filedSparks().length;
    expect($('br-spark-filed').hidden).toBe(false);
    expect($('br-spark-filed').textContent).toBe(`${n} spark${n === 1 ? '' : 's'} filed →`);
    const chrome = await import('../js/console/chrome.js');
    const seen = [];
    chrome.registerView('fn', { render() {}, onEnter: (seed) => seen.push(seed) });
    C.sparkOpenFiled();
    expect(seen.at(-1)).toEqual({ load: C.filedSparks()[0].id, caret: 'end' });
  });

  it('BRING BACK is the one way back, offered while the field is empty', () => {
    field().value = 'bring me back';
    const filed = C.sparkFile();
    expect($('br-spark-back').hidden).toBe(false);
    expect($('br-spark-file').hidden).toBe(true);
    const back = C.sparkBringBack();
    expect(back.id).toBe(filed.id);
    expect(field().value).toBe('bring me back');
    expect(localStorage.getItem('oaklens_spark_current')).toBe(filed.id);
    expect($('br-spark-back').hidden).toBe(true);
    expect($('br-spark-file').hidden).toBe(false);
    C.sparkFile();
  });

  it('writing again withdraws the offer (the chip is never a dead button)', () => {
    field().value = 'withdrawn';
    C.sparkFile();
    field().value = 'n';
    C.sparkInput();
    expect($('br-spark-back').hidden).toBe(true);
    expect(C.sparkBringBack()).toBeNull();
    field().value = '';
    C.sparkSave();
  });

  it('an empty field files nothing', () => {
    field().value = '  ';
    const before = sparks().length;
    expect(C.sparkFile()).toBeNull();
    expect(sparks().length).toBe(before);
  });

  it('the keys say where the words go: File it, and Draft (it was Expand)', () => {
    expect($('br-spark-file').textContent).toMatch(/^File it/);
    expect($('br-spark-expand').textContent).toMatch(/^Draft/);
    expect(html).not.toMatch(/id="br-spark-expand"[^>]*>Expand/);
  });
});

describe('the frames to cite', () => {
  it('the newest frames, newest first, with their f#; dark frames never', () => {
    S.STATE.buffer = [
      { id: 'a', filename: 'a.jpg', captured_at: '2026-10-01T10:00:00Z', added_at: '2026-10-01T10:00:00Z', _imported: true },
      { id: 'b', filename: 'b.jpg', captured_at: '2026-10-02T10:00:00Z', added_at: '2026-10-05T10:00:00Z' },
      { id: 'c', filename: 'c.jpg', captured_at: '2026-10-03T10:00:00Z', added_at: '2026-10-03T10:00:00Z', dark: true },
    ];
    const shelf = C.shelfFrames();
    expect(shelf.map((x) => x.f.id)).toEqual(['b', 'a']);
    expect(shelf.map((x) => x.n)).toEqual([2, 1]);
    expect(shelf.map((x) => x.live)).toEqual([false, true]);
  });

  it('a tap cites at the cursor, spaced, and the spark keeps focus', () => {
    field().value = 'the light';
    field().setSelectionRange(9, 9);
    C.sparkCite(389);
    expect(field().value).toBe('the light f#389 ');
    field().value = 'see and then';
    field().setSelectionRange(3, 3);
    C.sparkCite(12);
    expect(field().value).toBe('see f#12 and then');
  });

  it('a frame not yet published wears its number provisionally', () => {
    const src = readFileSync(join(ROOT, 'js/console/capture.js'), 'utf8');
    expect(src).toMatch(/is-provisional/);
    expect(src).toMatch(/may change until this frame is published/);
    expect(src).toMatch(/onpointerdown="event\.preventDefault\(\)"/);
  });
});
