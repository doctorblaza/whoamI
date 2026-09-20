/* whoamI — minimal visual novel engine (linear story).
   Script format (js/story.js, const STORY):
     {bg:'key'}                 crossfade background
     {music:'key'}              switch BGM (title/train/home/reveal/finale)
     {chapter:'一、那对夫妻'}    full-screen chapter card
     {n:'...'}                  narration (verbatim original text)
     {say:['Name','...']}       dialogue
     {choice:[{t, r}]}          cosmetic choice: shows reaction r, story continues
                                linearly no matter what is picked. No branching.
     {end:true}
*/
const BG = {
  title:      'assets/bg-cover.jpg',
  train:      'assets/bg-train.jpg',
  station:    'assets/bg-station.jpg',
  livingroom: 'assets/bg-livingroom.jpg',
  girlroom:   'assets/bg-girlroom.jpg',
  rain:       'assets/bg-rain.jpg',
  cafe:       'assets/bg-cafe.jpg',
  courtyard:  'assets/bg-courtyard.jpg',
  hospital:   'assets/bg-hospital.jpg',
  examday:    'assets/bg-examday.jpg',
  attic:      'assets/bg-attic.jpg',
  oldhouse:   'assets/bg-oldhouse.jpg',
};

const S = {
  label: 'start', index: 0, queue: [],
  typing: false, fullText: '', shown: 0, timer: null,
  bg: 'title', mode: 'idle', // idle | play | choice | chapter | end
};

const $ = (id) => document.getElementById(id);
let bgFlip = false;

/* ---------- background ---------- */
function setBG(key, instant) {
  const url = BG[key];
  if (!url) return;
  S.bg = key;
  const showEl = bgFlip ? $('bg-a') : $('bg-b');
  const hideEl = bgFlip ? $('bg-b') : $('bg-a');
  if (instant) {
    showEl.style.transition = 'none'; hideEl.style.transition = 'none';
    showEl.style.backgroundImage = `url('${url}')`;
    showEl.style.opacity = '1'; hideEl.style.opacity = '0';
    void showEl.offsetWidth;
    showEl.style.transition = ''; hideEl.style.transition = '';
  } else {
    showEl.style.backgroundImage = `url('${url}')`;
    showEl.style.opacity = '1'; hideEl.style.opacity = '0';
  }
  bgFlip = !bgFlip;
}
function preloadBG() {
  Object.values(BG).forEach((u) => { const im = new Image(); im.src = u; });
}

/* ---------- text ---------- */
function showText(name, text) {
  S.mode = 'play';
  $('dialogue').classList.remove('hidden');
  $('speaker').textContent = name || '';
  S.typing = true; S.fullText = text; S.shown = 0;
  $('text').textContent = '';
  $('next-indicator').style.opacity = '0';
  clearInterval(S.timer);
  S.timer = setInterval(() => {
    S.shown++;
    $('text').textContent = S.fullText.slice(0, S.shown);
    if (S.shown >= S.fullText.length) {
      S.typing = false; clearInterval(S.timer);
      $('next-indicator').style.opacity = '1';
    }
  }, 34);
  autoSave();
}

function advance() {
  if (S.mode !== 'play') return;
  if (S.typing) {
    clearInterval(S.timer); S.typing = false;
    $('text').textContent = S.fullText;
    $('next-indicator').style.opacity = '1';
    return;
  }
  next();
}

function next() {
  $('next-indicator').style.opacity = '0';
  let cmd;
  if (S.queue.length) cmd = S.queue.shift();
  else {
    const arr = STORY[S.label];
    if (!arr || S.index >= arr.length) return;
    cmd = arr[S.index++];
  }
  runCmd(cmd);
}

function runCmd(cmd) {
  if (cmd.bg) setBG(cmd.bg);
  if (cmd.music) Music.play(cmd.music);
  if (cmd.chapter) { showChapter(cmd.chapter); return; }
  if (cmd.n !== undefined) { showText('', cmd.n); return; }
  if (cmd.say) { showText(cmd.say[0], cmd.say[1]); return; }
  if (cmd.choice) { showChoices(cmd.choice); return; }
  if (cmd.end) { showEnd(); return; }
  next(); // pure bg/music command
}

/* ---------- choices (cosmetic only: no branching, story stays linear) ---------- */
function showChoices(options) {
  S.mode = 'choice';
  const box = $('choices');
  box.innerHTML = '';
  options.forEach((opt) => {
    const b = document.createElement('button');
    b.textContent = opt.t;
    b.onclick = (e) => {
      e.stopPropagation();
      box.classList.add('hidden');
      if (opt.r) S.queue.unshift({ n: opt.r });
      next();
    };
    box.appendChild(b);
  });
  box.classList.remove('hidden');
  autoSave();
}

/* ---------- chapter card ---------- */
function showChapter(text) {
  S.mode = 'chapter';
  $('dialogue').classList.add('hidden');
  $('chapter-text').textContent = text;
  const card = $('chapter-card');
  card.classList.remove('hidden');
  requestAnimationFrame(() => card.classList.add('show'));
  setTimeout(() => {
    card.classList.remove('show');
    setTimeout(() => { card.classList.add('hidden'); next(); }, 850);
  }, 2100);
  autoSave();
}

/* ---------- end ---------- */
function showEnd() {
  S.mode = 'end';
  $('dialogue').classList.add('hidden');
  $('toolbar').classList.add('hidden');
  $('end-screen').classList.remove('hidden');
  localStorage.removeItem('whoami_auto');
}

/* ---------- save / load ---------- */
function getSlots() {
  try { return JSON.parse(localStorage.getItem('whoami_slots')) || [null, null, null]; }
  catch (e) { return [null, null, null]; }
}
function setSlots(s) { localStorage.setItem('whoami_slots', JSON.stringify(s)); }
function snapshot() {
  // S.index always points at the NEXT command to run; the passage currently
  // on screen is S.index - 1, so a load must re-display exactly that one.
  const idx = S.index - 1;
  return { label: S.label, index: idx, bg: S.bg,
           preview: (S.fullText || '').slice(0, 26), time: Date.now() };
}
function autoSave() {
  if (S.mode !== 'play' && S.mode !== 'choice') return;
  try { localStorage.setItem('whoami_auto', JSON.stringify(snapshot())); } catch (e) {}
}
function applySnapshot(snap) {
  if (!snap) return;
  S.label = snap.label; S.index = snap.index; S.queue = [];
  S.typing = false; clearInterval(S.timer);
  $('end-screen').classList.add('hidden');
  $('choices').classList.add('hidden');
  $('title-screen').classList.add('hidden');
  $('dialogue').classList.remove('hidden');
  $('toolbar').classList.remove('hidden');
  setBG(snap.bg || 'title', true);
  S.mode = 'play';
  next();
}

let slotMode = 'save';
function openSlots(mode) {
  slotMode = mode;
  $('slot-title').textContent = mode === 'save' ? '存档' : '读档';
  renderSlots();
  $('slot-modal').classList.remove('hidden');
}
function renderSlots() {
  const slots = getSlots();
  const box = $('slots');
  box.innerHTML = '';
  const auto = (() => { try { return JSON.parse(localStorage.getItem('whoami_auto')); } catch (e) { return null; } })();
  const rows = [{ no: 'AUTO', data: auto }, ...slots.map((s, i) => ({ no: 'SLOT ' + (i + 1), data: s }))];
  rows.forEach((row) => {
    const d = document.createElement('div');
    d.className = 'slot' + (row.data ? '' : ' empty');
    const time = row.data ? new Date(row.data.time).toLocaleString('zh-CN', { hour12: false }) : '';
    d.innerHTML = `<div class="slot-no">${row.no}</div>` +
      `<div class="slot-preview">${row.data ? escapeHtml(row.data.preview) || '（无文字）' : '—— 空 ——'}</div>` +
      `<div class="slot-time">${time}</div>`;
    d.onclick = (e) => {
      e.stopPropagation();
      if (slotMode === 'save') {
        if (row.no === 'AUTO') return;
        const i = parseInt(row.no.split(' ')[1], 10) - 1;
        const s = getSlots(); s[i] = snapshot(); setSlots(s);
        renderSlots();
      } else if (row.data) {
        $('slot-modal').classList.add('hidden');
        applySnapshot(row.data);
      }
    };
    box.appendChild(d);
  });
}
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------- flow ---------- */
function startGame() {
  $('title-screen').classList.add('hidden');
  $('choices').classList.add('hidden');
  $('toolbar').classList.remove('hidden');
  S.label = 'start'; S.index = 0; S.queue = [];
  setBG('title', true);
  next();
}
function backToTitle() {
  clearInterval(S.timer);
  S.mode = 'idle'; S.typing = false;
  $('dialogue').classList.add('hidden');
  $('toolbar').classList.add('hidden');
  $('choices').classList.add('hidden');
  $('end-screen').classList.add('hidden');
  $('slot-modal').classList.add('hidden');
  setBG('title');
  Music.play('title');
  const has = getSlots().some(Boolean);
  $('btn-continue').style.display = has ? '' : 'none';
  $('title-screen').classList.remove('hidden');
}

/* ---------- events ---------- */
$('stage').addEventListener('click', (e) => {
  if (e.target.closest('button') || e.target.closest('#choices') ||
      e.target.closest('#slot-modal') || e.target.closest('#toolbar')) return;
  advance();
});
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    if (!$('slot-modal').classList.contains('hidden')) return;
    e.preventDefault(); advance();
  }
});
$('btn-start').onclick = (e) => { e.stopPropagation(); startGame(); };
$('btn-continue').onclick = (e) => { e.stopPropagation(); openSlots('load'); };
$('btn-save').onclick = (e) => { e.stopPropagation(); openSlots('save'); };
$('btn-load').onclick = (e) => { e.stopPropagation(); openSlots('load'); };
$('btn-title').onclick = (e) => { e.stopPropagation(); autoSave(); backToTitle(); };
$('btn-music').onclick = (e) => {
  e.stopPropagation();
  $('btn-music').textContent = Music.toggle() ? '音乐:开' : '音乐:关';
};
$('slot-close').onclick = (e) => { e.stopPropagation(); $('slot-modal').classList.add('hidden'); };
$('btn-back-title').onclick = (e) => { e.stopPropagation(); backToTitle(); };

/* ---------- init ---------- */
setBG('title', true);
preloadBG();
backToTitle();
const firstGestureMusic = () => { if (S.mode === 'idle') Music.play('title'); };
document.addEventListener('pointerdown', firstGestureMusic, { once: true });
document.addEventListener('keydown', firstGestureMusic, { once: true });
