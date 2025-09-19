// Single-device judge scorecard (table view)
const roundsSelect = document.getElementById('rounds');
const startBtn = document.getElementById('start');
const scorecardEl = document.getElementById('scorecard');
const roundsTableBody = document.getElementById('roundsTableBody');
const redNameInput = document.getElementById('redName');
const blueNameInput = document.getElementById('blueName');
const roundHeader = document.getElementById('roundHeader');
const leftHeader = document.getElementById('leftHeader');
const rightHeader = document.getElementById('rightHeader');
const saveRoundBtn = document.getElementById('saveRound');
const nextRoundBtn = document.getElementById('nextRound');
const finishBtn = document.getElementById('finishScoring');
const lockPreviousCheckbox = document.getElementById('lockPrevious');
const resetBtn = document.getElementById('reset');
const exportBtn = document.getElementById('export');
const exportArea = document.getElementById('exportArea');
const videoContainer = document.getElementById('videoContainer');
const videoWrap = document.querySelector('.video-wrap');
const removeVideoBtn = document.getElementById('removeVideo');
const videoUrlInput = document.getElementById('videoUrlInput');
// sidebar totals removed from UI

let state = {
  roundsCount: 12,
  redName: '',
  blueName: '',
  // rounds: [{ red: number|null, blue: number|null }]
  rounds: [],
  currentRound: 0,
  lockPrevious: true,
  finished: false,
  totals: null,
};

function init() {
  // If rounds is a range input, wire its value display; otherwise previous logic handled select
  const isRange = roundsSelect && roundsSelect.type === 'range';
  if (isRange){
    const roundsValue = document.getElementById('roundsValue');
    roundsSelect.min = 3; roundsSelect.max = 12;
    roundsSelect.value = state.roundsCount || 12;
    if (roundsValue) roundsValue.textContent = String(roundsSelect.value);
    roundsSelect.addEventListener('input', (e)=>{ if (roundsValue) roundsValue.textContent = String(e.target.value); });
  } else {
    // legacy: populate select options if present
    const isMwcSelect = roundsSelect && roundsSelect.tagName && roundsSelect.tagName.toLowerCase() === 'md-filled-select';
    for (let r = 3; r <= 12; r++) {
      if (isMwcSelect) {
        const opt = document.createElement('md-option');
        opt.setAttribute('value', String(r));
        opt.textContent = String(r);
        if (r === Number(state.roundsCount || 12)) opt.setAttribute('selected', '');
        roundsSelect.appendChild(opt);
      } else {
        const opt = document.createElement('option');
        opt.value = String(r);
        opt.textContent = r;
        if (r === Number(state.roundsCount || 12)) opt.selected = true;
        roundsSelect.appendChild(opt);
      }
    }
    try { roundsSelect.value = String(state.roundsCount || 12); } catch (e) { /* ignore */ }
  }

  const saved = localStorage.getItem('boxing_scorecard_v1');
  if (saved) {
    try { Object.assign(state, JSON.parse(saved)); } catch (e) { console.warn('failed to parse saved', e); }
  }

  // wire events
  startBtn.addEventListener('click', startFight);
  // video input is now inline below the controls; no button needed
  saveRoundBtn.addEventListener('click', saveRound);
  nextRoundBtn.addEventListener('click', nextRound);
  lockPreviousCheckbox.addEventListener('change', ()=>{ state.lockPrevious = lockPreviousCheckbox.checked; persist(); renderTable(); renderCurrentRound(); });
  resetBtn.addEventListener('click', resetAll);
  exportBtn.addEventListener('click', ()=>{ exportArea.textContent = JSON.stringify(state, null, 2); exportArea.classList.remove('hidden'); });
  finishBtn.addEventListener('click', finishScoring);
  if (removeVideoBtn) removeVideoBtn.addEventListener('click', removeVideo);

  roundsSelect.value = state.roundsCount;
  lockPreviousCheckbox.checked = state.lockPrevious;
  redNameInput.value = state.redName || '';
  blueNameInput.value = state.blueName || '';

  // set header labels if names available
  if (state.redName) leftHeader.textContent = state.redName; 
  if (state.blueName) rightHeader.textContent = state.blueName;

  if (state.rounds && state.rounds.length) {
    showScorecard(); renderTable(); renderCurrentRound();
  }

  // If a video URL is saved, fill the input (but DO NOT render iframe until Start Fight clicked)
  if (state.videoEmbedUrl) {
    const m = state.videoEmbedUrl.match(/embed\/([\w-]{11})/);
    if (m && videoUrlInput) videoUrlInput.value = m[1];
  }
}

function startFight() {
  const count = Number((roundsSelect && roundsSelect.value) || 12);
  state.roundsCount = count;
  state.redName = (redNameInput.value || '').trim();
  state.blueName = (blueNameInput.value || '').trim();
  state.rounds = Array.from({ length: count }, ()=>({ red: null, blue: null }));
  state.currentRound = 0;
  // update header labels to boxer names
  leftHeader.textContent = state.redName || 'Red Corner';
  rightHeader.textContent = state.blueName || 'Blue Corner';
  persist(); showScorecard(); renderTable(); renderCurrentRound(); updateTotals();

  // Read video input value (if any) and save+render the video iframe now
  if (videoUrlInput && videoUrlInput.value && videoUrlInput.value.trim()){
    const id = extractYouTubeId(videoUrlInput.value.trim());
    if (id){ state.videoEmbedUrl = buildEmbedUrl(id); persist(); renderVideo(state.videoEmbedUrl); }
  } else if (state.videoEmbedUrl){
    // if no new input but a saved embed exists, render it
    renderVideo(state.videoEmbedUrl);
  }
}

// Video helpers
function extractYouTubeId(url){
  if (!url) return null;
  // common YouTube URL patterns
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([\w-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([\w-]{11})/
  ];
  for (const p of patterns){ const m = url.match(p); if (m && m[1]) return m[1]; }
  // fallback: maybe the url is just an id
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

function buildEmbedUrl(videoId){ return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`; }

function onAddVideo(){
  // deprecated: inline input is always available below controls
}
// inline input is used directly on Start Fight; previous save/cancel flow removed

function renderVideo(embedUrl){
  if (!embedUrl){ videoContainer.hidden = true; videoWrap.innerHTML = ''; return; }
  if (videoWrap) videoWrap.innerHTML = `<iframe src="${embedUrl}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  if (videoContainer) videoContainer.hidden = false;
}

function removeVideo(){ if (!confirm('Remove the fight video?')) return; state.videoEmbedUrl = null; persist(); renderVideo(null); }

function showScorecard(){ scorecardEl.classList.remove('hidden'); }

function renderTable(){
  roundsTableBody.innerHTML = '';
  for (let i=0;i<state.roundsCount;i++){
    const row = document.createElement('tr');
    // RED control cell: - label +
    const redTd = document.createElement('td');
    const redControl = document.createElement('div'); redControl.className = 'score-control';
    const redMinus = document.createElement('button'); redMinus.className = 'score-btn minus'; redMinus.type = 'button'; redMinus.textContent = '−';
    const redLabel = document.createElement('button'); redLabel.className = 'score-label'; redLabel.type = 'button';
    redLabel.dataset.round = i; redLabel.dataset.side = 'red';
    redLabel.textContent = (state.rounds[i] && state.rounds[i].red != null) ? String(state.rounds[i].red) : '';
    const redPlus = document.createElement('button'); redPlus.className = 'score-btn plus'; redPlus.type = 'button'; redPlus.textContent = '+';
    redControl.appendChild(redMinus); redControl.appendChild(redLabel); redControl.appendChild(redPlus);
    redTd.appendChild(redControl);

    const midTd = document.createElement('td'); midTd.className='round-label'; midTd.textContent = `Round ${i+1}`;

    // BLUE control cell
    const blueTd = document.createElement('td');
    const blueControl = document.createElement('div'); blueControl.className = 'score-control';
    const blueMinus = document.createElement('button'); blueMinus.className = 'score-btn minus'; blueMinus.type = 'button'; blueMinus.textContent = '−';
    const blueLabel = document.createElement('button'); blueLabel.className = 'score-label'; blueLabel.type = 'button';
    blueLabel.dataset.round = i; blueLabel.dataset.side = 'blue';
    blueLabel.textContent = (state.rounds[i] && state.rounds[i].blue != null) ? String(state.rounds[i].blue) : '';
    const bluePlus = document.createElement('button'); bluePlus.className = 'score-btn plus'; bluePlus.type = 'button'; bluePlus.textContent = '+';
    blueControl.appendChild(blueMinus); blueControl.appendChild(blueLabel); blueControl.appendChild(bluePlus);
    blueTd.appendChild(blueControl);

    row.appendChild(redTd); row.appendChild(midTd); row.appendChild(blueTd);
    roundsTableBody.appendChild(row);

    // If finished, disable controls
    const canEdit = !state.finished && (i <= state.currentRound) && (!state.lockPrevious || i === state.currentRound);
    redMinus.disabled = redPlus.disabled = redLabel.disabled = !canEdit;
    blueMinus.disabled = bluePlus.disabled = blueLabel.disabled = !canEdit;

    // helper to ensure row exists
    function autoFillRound(index, side){
      ensureRow(index);
      const rr = state.rounds[index];
      const redEmpty = rr.red == null || rr.red === '';
      const blueEmpty = rr.blue == null || rr.blue === '';
      if (!redEmpty || !blueEmpty) return; // only when both empty
      if (side === 'red') { rr.red = 10; rr.blue = 9; }
      else { rr.blue = 10; rr.red = 9; }
      persist(); renderTable();
    }

    // click label to auto-fill when empty
    redLabel.addEventListener('click', ()=> autoFillRound(i, 'red'));
    blueLabel.addEventListener('click', ()=> autoFillRound(i, 'blue'));

    // plus/minus adjust values; if both empty, auto-fill first
    redPlus.addEventListener('click', ()=>{
      ensureRow(i); const rr = state.rounds[i]; if ((rr.red == null || rr.red === '') && (rr.blue == null || rr.blue === '')){ autoFillRound(i,'red'); return; }
      rr.red = Math.min(10, (rr.red == null ? 10 : Number(rr.red)) + 1); persist(); renderTable();
    });
    redMinus.addEventListener('click', ()=>{
      ensureRow(i); const rr = state.rounds[i]; if ((rr.red == null || rr.red === '') && (rr.blue == null || rr.blue === '')){ autoFillRound(i,'red'); return; }
      rr.red = Math.max(6, (rr.red == null ? 10 : Number(rr.red)) - 1); persist(); renderTable();
    });

    bluePlus.addEventListener('click', ()=>{
      ensureRow(i); const rr = state.rounds[i]; if ((rr.blue == null || rr.blue === '') && (rr.red == null || rr.red === '')){ autoFillRound(i,'blue'); return; }
      rr.blue = Math.min(10, (rr.blue == null ? 10 : Number(rr.blue)) + 1); persist(); renderTable();
    });
    blueMinus.addEventListener('click', ()=>{
      ensureRow(i); const rr = state.rounds[i]; if ((rr.blue == null || rr.blue === '') && (rr.red == null || rr.red === '')){ autoFillRound(i,'blue'); return; }
      rr.blue = Math.max(6, (rr.blue == null ? 10 : Number(rr.blue)) - 1); persist(); renderTable();
    });

    row.addEventListener('click', ()=>{ if ((i <= state.currentRound) && (!state.lockPrevious || i === state.currentRound)){ state.currentRound = i; persist(); renderTable(); renderCurrentRound(); } });
  }

  // compute totals from state
  let sumR = 0, sumB = 0;
  for (let i=0;i<state.roundsCount;i++){
    const rr = state.rounds[i];
    if (rr){ if (rr.red != null) sumR += rr.red; if (rr.blue != null) sumB += rr.blue; }
  }

  const allFilled = state.rounds.length === state.roundsCount && state.rounds.every(r => r && r.red != null && r.blue != null);
  // show Finish button only when all rounds have numeric values and not yet finished
  if (allFilled && !state.finished) {
    finishBtn.classList.remove('hidden');
    finishBtn.classList.add('finish-btn');
  } else {
    finishBtn.classList.add('hidden');
  }

  // if finished, render totals row and highlight winner
  if (state.finished && state.totals) {
    const totalsRow = document.createElement('tr');
    const left = document.createElement('td'); left.textContent = String(state.totals.red);
    const mid = document.createElement('td'); mid.className = 'round-label'; mid.textContent = 'Totals';
    const right = document.createElement('td'); right.textContent = String(state.totals.blue);
    if (state.totals.red > state.totals.blue) left.classList.add('total-winner');
    else if (state.totals.blue > state.totals.red) right.classList.add('total-winner');
    totalsRow.appendChild(left); totalsRow.appendChild(mid); totalsRow.appendChild(right);
    roundsTableBody.appendChild(totalsRow);
    // disable finish button once finished
    finishBtn.classList.add('hidden');
  }

  // After rendering table rows, attempt to enforce inner styles for MWC fields (shadow DOM)
  applyMWCInnerOverrides();
}

// Attempt to set inline styles on inner inputs of MWC fields (works around shadow DOM/css part differences)
function applyMWCInnerOverrides(){
  const fields = document.querySelectorAll('md-outlined-text-field, md-filled-text-field');

  function styleInner(el){
    try{
      el.style.color = '#ffffff';
      el.style.caretColor = '#ffffff';
      el.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
      // also set common MD variables on host
      if (el.host) {
        el.host.style.setProperty('--md-sys-color-on-surface', '#ffffff');
      }
    }catch(e){ /* ignore */ }
  }

  function findAndStyle(field){
    // style host first
    try{ field.style.color = '#ffffff'; field.style.caretColor = '#ffffff'; field.style.setProperty('--md-sys-color-on-surface', '#ffffff'); }catch(e){}

    const sr = field.shadowRoot;
    if (!sr) return;

    // 1) direct input/textarea
    let inner = sr.querySelector('input, textarea');
    if (inner){ styleInner(inner); return; }

    // 2) elements with part names commonly used
    inner = sr.querySelector('[part="input"], [part="textfield"], [part="control"], [part="native-input"], [part="inputElement"]');
    if (inner){ styleInner(inner); return; }

    // 3) slotted content
    const slot = sr.querySelector('slot');
    if (slot){
      const assigned = slot.assignedElements ? slot.assignedElements() : [];
      for (const a of assigned){
        if (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') { styleInner(a); return; }
        // if the assigned element has shadowRoot, try inside
        if (a.shadowRoot){ const nested = a.shadowRoot.querySelector('input, textarea'); if (nested){ styleInner(nested); return; } }
      }
    }

    // 4) try querying many possible internal selectors used across versions
    const candidates = ['input.md-text-field__input','input.mdc-text-field__input','input[role="textbox"]','div.input','div.textfield input'];
    for (const sel of candidates){ const c = sr.querySelector(sel); if (c){ styleInner(c); return; } }

    // If nothing found, observe the shadowRoot for additions and style when an input appears
    try{
      const obs = new MutationObserver((mutations)=>{
        for (const m of mutations){
          for (const node of m.addedNodes){
            if (!(node instanceof Element)) continue;
            if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') { styleInner(node); obs.disconnect(); return; }
            const maybe = node.querySelector ? node.querySelector('input, textarea, [part="input"], [part="textfield"]') : null;
            if (maybe){ styleInner(maybe); obs.disconnect(); return; }
          }
        }
      });
      obs.observe(sr, { childList: true, subtree: true });
      // schedule a disconnect in case nothing appears
      setTimeout(()=>obs.disconnect(), 2000);
    }catch(e){ /* ignore */ }
  }

  fields.forEach(findAndStyle);

  // Also observe the document for newly added MWC fields (in case rows are re-rendered later)
  if (!window.__mwcFieldObserver){
    try{
      window.__mwcFieldObserver = new MutationObserver((mutations)=>{
        for (const m of mutations){
          for (const node of m.addedNodes){
            if (!(node instanceof Element)) continue;
            if (node.matches && (node.matches('md-outlined-text-field') || node.matches('md-filled-text-field'))){ findAndStyle(node); }
            else if (node.querySelector){
              const nested = node.querySelector('md-outlined-text-field, md-filled-text-field'); if (nested) nested.forEach ? nested.forEach(findAndStyle) : findAndStyle(nested);
            }
          }
        }
      });
      window.__mwcFieldObserver.observe(document.body, { childList: true, subtree: true });
    }catch(e){ /* ignore */ }
  }
}

function renderCurrentRound(){
  const i = state.currentRound; roundHeader.textContent = `Round ${i+1}`;
  const canEdit = (i <= state.currentRound) && (!state.lockPrevious || i === state.currentRound);
}

function ensureRoundExists(index){ if (!state.rounds[index]) state.rounds[index] = { red:null, blue:null }; }
function ensureRow(index){ ensureRoundExists(index); }

function saveRound(){ const i = state.currentRound; ensureRow(i); persist(); renderTable(); updateTotals(); }

function nextRound(){ saveRound(); if (state.currentRound < state.roundsCount - 1){ state.currentRound += 1; persist(); renderTable(); renderCurrentRound(); } else { alert('Fight complete'); } }

function finishScoring(){
  // compute totals
  let sumR = 0, sumB = 0;
  for (let i=0;i<state.roundsCount;i++){ const rr = state.rounds[i]; if (rr){ if (rr.red != null) sumR += rr.red; if (rr.blue != null) sumB += rr.blue; } }
  state.totals = { red: sumR, blue: sumB };
  state.finished = true;
  persist();
  renderTable();
  // disable all inputs
}

function updateTotals(){
  let r=0,b=0; for (let i=0;i<state.roundsCount;i++){ const rr = state.rounds[i]; if (rr){ if (rr.red != null) r += rr.red; if (rr.blue != null) b += rr.blue; } }
  // update hidden totals (kept for export) but do not render on UI unless finished
  state.totals = state.finished ? { red: r, blue: b } : state.totals;
  return { red: r, blue: b };
}

function resetAll(){ if (!confirm('Reset all scores?')) return; localStorage.removeItem('boxing_scorecard_v1'); state = { roundsCount: 12, redName:'', blueName:'', rounds: [], currentRound:0, lockPrevious:true }; location.reload(); }

function persist(){ localStorage.setItem('boxing_scorecard_v1', JSON.stringify(state)); }

init();
