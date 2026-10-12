// OAKLENS Field Console — capture, on the Bridge (K66).
//
// Row 4 of the Bridge: catch what is fleeting, and cite the frames it is
// about. Two parts, one row.
//
//   · THE SPARK (04). A two-line field, mono, that keeps itself as you type:
//     a draft of its own kind ('spark', migration 0003), private, in this
//     device's STATE and the cloud's drafts like any draft, listed under
//     SPARKS in the Field Notes picker and nowhere on the Bridge's "waiting
//     on you". DRAFT (or ⇧↵; it was EXPAND until 2026-10-12, renamed so the
//     key says where the words go) turns it into a note and opens it in the
//     full editor with the cursor after its last word. The owner, 2026-10-06:
//     "you capture the raw thought on the curb or train, and when you're
//     ready, it blooms into an essay with zero copy-pasting."
//     FILE IT (2026-10-12, the owner: words left in the field "just hang
//     there", and emptying the field "feels like I'm deleting it rather than
//     storing it away") files the spark as written and hands back an empty
//     field, so several ideas can be caught without leaving the Bridge. The
//     words still hang until you file them. Its reverse is one chip, BRING
//     BACK, offered while the field is still empty (the console's
//     reversibility rule: one chip, never a history), and the foot counts the
//     filed sparks; the count opens Field Notes on the newest one, where the
//     picker shows the rest under SPARKS.
//   · THE SHELF (05). The newest Buffer frames with their permanent f#: tap
//     one and its citation goes in at the spark's cursor (the spark keeps
//     focus); press and hold, or right-click, to copy it. A frame not yet
//     published shows its number as provisional, because the number of an
//     unpublished frame can still move (the numbering is positional).
//
// It sits above the Bridge in the layer order and registers with it
// (registerBridgeRegion), the way a surface registers with the router. The
// field is static markup, never repainted, so the Bridge's minute tick and
// every save cannot take focus from it mid-word.

import { STATE } from '../console-state.js';
import { showView, copyText, escapeHTML } from './chrome.js';
import { cdnThumb } from './assets.js';
import { uid } from './utils.js';
import { fnUpsertDraft, fnCloudDeleteDraft, getBufferFrameNumbers } from './fn-editor.js';
import { registerBridgeRegion, settleThumbs } from './bridge.js';
import { flare } from './text-light.js';

const $ = (id) => document.getElementById(id);
const SPARK_KEY = 'oaklens_spark_current';   // per device: the spark this field is writing
const SAVE_MS = 800;
const SHELF_MAX = 5;

const _current = () => { try { return localStorage.getItem(SPARK_KEY) || ''; } catch { return ''; } };
const _setCurrent = (id) => { try { if (id) localStorage.setItem(SPARK_KEY, id); else localStorage.removeItem(SPARK_KEY); } catch {} };
const _spark = (id) => (id ? (STATE.posts || []).find((p) => p.id === id && p.kind === 'spark' && p.status === 'draft') : null);

let _timer = 0;
let _lastFiled = '';   // the spark FILE IT just put away, for BRING BACK

/** The sparks filed away: every spark draft but the one the field is writing, newest first. */
export function filedSparks(state = STATE, current = _current()) {
  return (state.posts || [])
    .filter((p) => p && p.kind === 'spark' && p.status === 'draft' && p.id !== current)
    .sort((a, b) => String(b.added_at || '').localeCompare(String(a.added_at || '')));
}

/** Keep what is in the field: a spark when it has words, nothing when it is empty. */
export function sparkSave() {
  clearTimeout(_timer);
  _timer = 0;
  const field = $('br-spark');
  if (!field) return null;
  const body = field.value;
  let id = _current();
  if (!body.trim()) {
    // An empty spark is not kept: there is nothing to come back to.
    if (_spark(id)) {
      STATE.posts = STATE.posts.filter((p) => p.id !== id);
      fnCloudDeleteDraft(id);
    }
    _setCurrent('');
    _said('kept private');
    _paintFoot();
    return null;
  }
  if (!_spark(id)) { id = uid(); _setCurrent(id); }
  const post = fnUpsertDraft(id, { kind: 'spark', status: 'draft', title: '', body });
  _said('kept · private');
  _paintFoot();
  return post;
}

export function sparkInput() {
  clearTimeout(_timer);
  _said('…');
  // Writing again ends the offer to bring the last one back: the chip is
  // resolved against the field as it is now, and the count still reaches it.
  _lastFiled = '';
  _paintFoot();
  _timer = setTimeout(sparkSave, SAVE_MS);
}

/** File the spark as written and hand back an empty field, ready for the next. */
export function sparkFile() {
  const field = $('br-spark');
  if (!field || !field.value.trim()) { field?.focus(); return null; }
  const post = sparkSave();
  if (!post) return null;
  _lastFiled = post.id;
  _setCurrent('');
  field.value = '';
  _said('kept private');
  _paintFoot();
  // The count is what changed, so it is what lights (the way a save lights
  // the status): one readout, never the word "filed" twice.
  const count = $('br-spark-filed');
  if (count && !count.hidden) flare(count);
  field.focus();
  return post;
}

/** The reverse of FILE IT, offered while the field is still empty. */
export function sparkBringBack() {
  const field = $('br-spark');
  const s = _spark(_lastFiled);
  _lastFiled = '';
  if (!field || !s || field.value.trim()) { _paintFoot(); return null; }
  _setCurrent(s.id);
  field.value = s.body || '';
  _said('kept · private');
  _paintFoot();
  field.focus();
  field.setSelectionRange(field.value.length, field.value.length);
  return s;
}

/** Open Field Notes on the newest filed spark; the picker lists the rest under SPARKS. */
export function sparkOpenFiled() {
  const newest = filedSparks()[0];
  if (newest) showView('fn', { load: newest.id, caret: 'end' });
}

// The foot: what the field is (kept, filed), how many are filed, and the two
// keys. FILE IT is there while there are words to file; BRING BACK takes its
// place while the field is empty and the spark it filed still exists.
function _paintFoot() {
  const field = $('br-spark');
  if (!field) return;
  const has = !!field.value.trim();
  const back = !has && !!_spark(_lastFiled);
  const n = filedSparks().length;
  const count = $('br-spark-filed');
  if (count) {
    count.hidden = !n;
    const text = `${n} spark${n === 1 ? '' : 's'} filed →`;
    if (count.textContent !== text) count.textContent = text;
  }
  // An empty field with sparks filed: the count says it, so the status steps
  // aside (and the foot holds one line on a phone).
  const said = $('br-spark-said');
  if (said) said.hidden = !has && n > 0;
  const file = $('br-spark-file');
  if (file) file.hidden = !has;
  const undo = $('br-spark-back');
  if (undo) undo.hidden = !back;
}

/** ⇧↵ (or ⌘↵) expands; a plain ↵ is a new line, as in any note. */
export function sparkKey(e) {
  if (e.key === 'Enter' && (e.shiftKey || e.metaKey || e.ctrlKey)) { e.preventDefault(); sparkExpand(); }
}

/**
 * The spark becomes a note and opens in the full editor, cursor at the end.
 * Everything here is synchronous, inside the tap: the write, then the view
 * seam with a focus seed (which swaps at once, so iOS raises the keyboard).
 */
export function sparkExpand() {
  const field = $('br-spark');
  if (!field || !field.value.trim()) { field?.focus(); return; }
  const post = sparkSave();
  if (!post) return;
  fnUpsertDraft(post.id, { kind: 'note' });
  field.value = '';
  _setCurrent('');
  _lastFiled = '';
  _said('kept private');
  _paintFoot();
  showView('fn', { load: post.id, caret: 'end', focus: true });
}

// The field's status is a live readout, and an update lights it the way any
// live readout lights (2026-10-06, the owner: it "should follow our emissive
// tiers for text and not be flat"): a save that lands flares it.
function _said(text) {
  const el = $('br-spark-said');
  if (!el || el.textContent === text) return;
  el.textContent = text;
  if (text === 'kept · private') flare(el);
}

// The field picks up this device's spark (a reload, or a spark still open
// from before), and never overwrites what is being typed.
function _restore() {
  const field = $('br-spark');
  if (!field || document.activeElement === field || field.value) return;
  const s = _spark(_current());
  if (s) { field.value = s.body || ''; _said('kept · private'); }
  else if (_current()) _setCurrent('');
}

// ---- the shelf ----

/** The newest frames in the Buffer, newest first, with their f#. */
export function shelfFrames(state = STATE, max = SHELF_MAX) {
  const nums = getBufferFrameNumbers();
  const at = (f) => Date.parse(f.added_at || f.captured_at || f.published_at || '') || 0;
  return (state.buffer || [])
    .filter((f) => f && !f.dark && nums.has(f.id))
    .sort((a, b) => at(b) - at(a))
    .slice(0, max)
    .map((f) => ({ f, n: nums.get(f.id), live: !!f._imported }));
}

function _paintShelf() {
  const list = $('br-shelf');
  if (!list) return;
  const frames = shelfFrames();
  const html = frames.length
    ? frames.map(({ f, n, live }) => `<li class="br-cite${live ? '' : ' is-provisional'}">`
      + `<button type="button" class="br-cite-key" data-cite="${n}" onpointerdown="event.preventDefault()" onclick="sparkCite(${n})" oncontextmenu="event.preventDefault(); sparkCopyCite(${n})"`
      + ` title="${live ? `Cite f#${n} in the spark (hold to copy)` : `f#${n} may change until this frame is published`}">`
      + `<img class="br-thumb" src="${escapeHTML(cdnThumb(f, 'archive', 480))}" alt="" loading="lazy" onload="bridgeThumbIn(this)" onerror="bridgeThumbFailed(this)">`
      + `<span class="br-cite-n" data-text="${live ? 'act' : 'info'}">f#${n}</span></button></li>`).join('')
    : `<li class="br-item"><div class="br-meta" data-text="live">No frames yet.</div></li>`;
  if (list.dataset.html !== html) { list.dataset.html = html; list.innerHTML = html; settleThumbs(list); }
}

/** A frame's citation, in at the spark's cursor, with a space either side as needed. */
export function sparkCite(n) {
  const field = $('br-spark');
  if (!field) return;
  const tag = `f#${n}`;
  const { selectionStart: a = field.value.length, selectionEnd: b = field.value.length, value } = field;
  const before = value.slice(0, a), after = value.slice(b);
  const lead = before && !/\s$/.test(before) ? ' ' : '';
  const trail = !after || !/^\s/.test(after) ? ' ' : '';
  field.value = before + lead + tag + trail + after;
  const caret = (before + lead + tag + (after ? '' : trail)).length;
  field.focus();
  field.setSelectionRange(caret, caret);
  sparkInput();
}

export function sparkCopyCite(n) {
  return copyText(`f#${n}`, { ok: `✓ f#${n} copied`, what: 'the citation' });
}

// A press held on a frame copies its citation (a touch screen has no right
// click). Wired once, on the list, so the shelf's repaints never drop it.
function _wireHold() {
  const list = $('br-shelf');
  if (!list || list.dataset.wired) return;
  list.dataset.wired = '1';
  let timer = 0, held = false;
  list.addEventListener('pointerdown', (e) => {
    const key = e.target.closest('[data-cite]');
    if (!key || e.pointerType === 'mouse') return;
    held = false;
    timer = setTimeout(() => { held = true; sparkCopyCite(Number(key.dataset.cite)); }, 550);
  });
  const cancel = () => clearTimeout(timer);
  list.addEventListener('pointerup', cancel);
  list.addEventListener('pointercancel', cancel);
  list.addEventListener('pointerleave', cancel);
  // A hold that copied is not also a tap.
  list.addEventListener('click', (e) => { if (held) { held = false; e.stopPropagation(); e.preventDefault(); } }, true);
}

registerBridgeRegion({
  id: 'capture',
  paint() { _restore(); _paintFoot(); _paintShelf(); _wireHold(); },
  fit: 'br-shelf',
});
