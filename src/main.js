import { createIcons, icons } from 'lucide';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/noto-sans-jp';
import { kana, rows, basicIds, getPool, createQuiz, shuffle, isCorrect } from './kana.js';
import './style.css';

const storageKey = 'kana-studio-v1';
const defaults = { selected: basicIds, script: 'hiragana', count: 10, mode: 'choice', sound: false, history: [] };
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved || typeof saved !== 'object') return { ...defaults };
    return {
      ...defaults,
      selected: Array.isArray(saved.selected) ? saved.selected.filter((id) => kana.some((item) => item.id === id)) : basicIds,
      script: ['hiragana', 'katakana', 'both'].includes(saved.script) ? saved.script : 'hiragana',
      count: [10, 20, 30].includes(saved.count) ? saved.count : 10,
      mode: ['choice', 'type'].includes(saved.mode) ? saved.mode : 'choice',
      sound: saved.sound === true,
      history: Array.isArray(saved.history) ? saved.history.filter((entry) => Number.isFinite(entry.correct) && Number.isFinite(entry.total) && entry.total > 0 && typeof entry.date === 'string').slice(-100) : [],
    };
  } catch { return { ...defaults }; }
}

let settings = loadSettings();
let view = 'practice';
let group = 'basic';
let session;
let studyIndex = 0;
let revealed = false;
let modalGroup = 'basic';
let draftSelection = [];
let draftScript = 'hiragana';
let storageUnavailable = false;
let studyPool = [];
let installPrompt = null;
let offlineReady = false;
let updateAvailable = false;
const app = document.querySelector('#app');
const icon = (name, className = '') => `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
const scriptLabel = (script = settings.script) => ({ hiragana: 'Hiragana', katakana: 'Katakana', both: 'Mixed kana' })[script];
const selectedPool = () => getPool(settings.selected, settings.script);
const updateSW = registerSW({
  onOfflineReady() {
    offlineReady = true;
    updatePwaStatus();
  },
  onNeedRefresh() {
    updateAvailable = true;
    updatePwaStatus();
  },
});

function updatePwaStatus() {
  const note = document.querySelector('.local-note span');
  if (note && offlineReady) note.textContent = 'Available offline on this device';
  const installButton = document.querySelector('[data-action="install-app"]');
  const updateButton = document.querySelector('[data-action="update-app"]');
  if (installButton) installButton.hidden = !installPrompt;
  if (updateButton) updateButton.hidden = !updateAvailable;
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  updatePwaStatus();
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  updatePwaStatus();
});

async function installApp() {
  if (!installPrompt) return;
  const prompt = installPrompt;
  installPrompt = null;
  updatePwaStatus();
  await prompt.prompt();
  await prompt.userChoice;
}

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { storageUnavailable = true; }
}
function startSession() {
  session = { questions: createQuiz(selectedPool(), settings.count), index: 0, answers: [], answer: null, complete: false, startedAt: Date.now() };
}
startSession();

function stats() {
  const total = settings.history.reduce((sum, entry) => sum + entry.total, 0);
  const correct = settings.history.reduce((sum, entry) => sum + entry.correct, 0);
  const dates = new Set(settings.history.map((entry) => new Date(entry.date).toLocaleDateString('en-CA')));
  let streak = 0;
  const current = new Date();
  if (!dates.has(current.toLocaleDateString('en-CA'))) current.setDate(current.getDate() - 1);
  while (dates.has(current.toLocaleDateString('en-CA'))) {
    streak++;
    current.setDate(current.getDate() - 1);
  }
  return { total, correct, accuracy: total ? Math.round(correct / total * 100) : 0, streak };
}

function render() {
  const metrics = stats();
  app.innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="Kana Studio home"><span class="brand-mark">か</span><span>Kana<span class="brand-light">studio</span><span class="brand-dot">.</span></span></a>
      <div class="sidebar-caption">YOUR DAILY PRACTICE</div>
      <nav class="navigation" aria-label="Main navigation">
        ${[['study', 'book-open', 'Study'], ['practice', 'shapes', 'Practice'], ['progress', 'chart-no-axes-combined', 'My progress']].map(([id, symbol, label]) => `<button class="nav-item ${view === id ? 'active' : ''}" data-view="${id}" aria-label="${label}" ${view === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span>${id === 'practice' ? '<span class="nav-dot"></span>' : ''}</button>`).join('')}
      </nav>
      <div class="sidebar-bottom">
        <div class="daily-note"><div class="photo"><img src="${import.meta.env.BASE_URL}kyoto.jpg" alt="Traditional Kyoto street and Yasaka Pagoda in Japan" /></div><span class="note-label">ONE DAY AT A TIME</span><p>Small steps.<br>A whole new language.</p><span class="note-japanese" lang="ja">継続は力なり</span></div>
        <div class="local-note" role="status">${icon('hard-drive')}<span>${offlineReady ? 'Available offline on this device' : 'Progress saved on this device'}</span></div>
      </div>
    </aside>
    <main class="main">
      <header class="topbar"><div class="breadcrumb">Your learning space <span>/</span> <strong>${view === 'progress' ? 'My progress' : view[0].toUpperCase() + view.slice(1)}</strong></div><div class="topbar-actions"><button class="pwa-action" data-action="install-app" ${installPrompt ? '' : 'hidden'} title="Install Kana Studio" aria-label="Install Kana Studio">${icon('download')}<span>Install</span></button><button class="pwa-action" data-action="update-app" ${updateAvailable ? '' : 'hidden'} title="Update Kana Studio" aria-label="Update Kana Studio">${icon('refresh-cw')}<span>Update</span></button><div class="streak-pill">${icon('flame')}<strong>${metrics.streak}</strong> day streak</div></div></header>
      <div class="workspace">
        <section class="page-heading"><div><div class="eyebrow">A LITTLE PRACTICE, A LITTLE PROGRESS</div><h1>${view === 'practice' ? 'Make kana second nature.' : view === 'study' ? 'Meet your next characters.' : 'Look how far you’ve come.'}</h1><p>${view === 'practice' ? 'Find your rhythm, one character at a time.' : view === 'study' ? 'A little familiarity goes a long way.' : 'Every session is another step forward.'}</p></div><div class="heading-stamp" lang="ja">${view === 'study' ? '学' : view === 'progress' ? '進' : '練'}<span>${view === 'study' ? 'LEARN' : view === 'progress' ? 'GROW' : 'PRACTICE'}</span></div></section>
        ${storageUnavailable ? '<p class="storage-warning" role="status">Browser storage is unavailable. Your progress will last for this visit only.</p>' : ''}
        ${view === 'progress' ? renderProgress(metrics) : `
          <div class="practice-layout">
            <section class="exercise-area" aria-label="${view === 'study' ? 'Study flashcards' : 'Kana quiz'}">${view === 'study' ? renderStudy() : renderQuiz()}</section>
            ${renderSettings()}
          </div>
          ${renderCollection()}
        `}
        <footer><span>Kana studio <span class="footer-dot">·</span> A little better, every day.</span><span lang="ja">一歩ずつ。</span></footer>
      </div>
    </main>
    <dialog id="selection-dialog" aria-labelledby="selection-title"></dialog>
  `;
  createIcons({ icons });
}

function renderQuiz() {
  if (!session.questions.length) return `<div class="quiz-card empty-state">${icon('mouse-pointer-2')}<h2>A fresh start.</h2><p>Choose some kana for your next practice.</p><button class="primary" data-action="select">${icon('plus')} Choose kana</button></div>`;
  if (session.complete) return renderResults();
  const question = session.questions[session.index];
  const answered = session.answer !== null;
  const correct = answered && isCorrect(session.answer, question);
  const successes = session.answers.filter((answer) => answer.correct).length;
  return `<div class="quiz-card">
    <div class="quiz-top"><span class="tag">${icon('sparkles')} ${scriptLabel(question.script)} practice</span><span class="question-count"><strong>${session.index + 1}</strong> / ${session.questions.length}</span></div>
    <div class="progress-track"><span style="width:${session.index / session.questions.length * 100}%"></span></div>
    <div class="question-prompt">What sound does this kana make?</div>
    <div class="kana-stage"><span class="main-kana ${question.symbol.length > 1 ? 'compound' : ''}" lang="ja">${question.symbol}</span><button class="audio-button" data-action="speak" aria-label="Listen to this kana" title="Listen to this kana">${icon('volume-2')}</button></div>
    <div class="alphabet-label">${scriptLabel(question.script).toUpperCase()}</div>
    ${settings.mode === 'choice' ? `<div class="answer-grid">${question.options.map((option, index) => `<button class="answer ${answered ? (option === question.romaji ? 'correct' : option === session.answer ? 'incorrect' : 'muted') : ''}" data-answer="${option}" ${answered ? 'disabled' : ''}><span class="answer-key">${index + 1}</span><span>${option}</span>${answered && option === question.romaji ? icon('check') : answered && option === session.answer ? icon('x') : '<span class="answer-end"></span>'}</button>`).join('')}</div>` : `<form id="answer-form" class="type-answer"><label class="sr-only" for="typed-answer">Kana pronunciation in romaji</label><input id="typed-answer" name="answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type the romaji…" ${answered ? 'disabled' : ''} /><button class="primary" type="submit" ${answered ? 'disabled' : ''}>Check ${icon('arrow-right')}</button></form>`}
    <div class="quiz-feedback ${answered ? (correct ? 'is-correct' : 'is-incorrect') : ''}" aria-live="polite">${answered ? `<span>${icon(correct ? 'circle-check' : 'circle-x')} ${correct ? 'That’s right. Nicely done!' : `Almost! ${question.symbol} is ${question.romaji}.`}</span><button data-action="next" class="next-button">${session.index === session.questions.length - 1 ? 'See results' : 'Next kana'} ${icon('arrow-right')}</button>` : `<span>${icon('circle-help')} Take your time. You’ve got this.</span><span class="quiet-dots">···</span>`}</div>
  </div>
  <div class="session-strip"><div>${icon('target')}<span><strong>${successes}</strong> correct</span></div><span class="strip-divider"></span><div>${icon('layers')}<span><strong>${selectedPool().length}</strong> kana in this set</span></div><button data-action="restart" title="Restart this quiz">${icon('rotate-ccw')} Restart</button></div>`;
}

function renderResults() {
  const correct = session.answers.filter((answer) => answer.correct).length;
  const accuracy = Math.round(correct / session.questions.length * 100);
  const mistakes = session.answers.filter((answer) => !answer.correct);
  return `<div class="quiz-card result-card"><span class="tag">${icon('flag')} SESSION COMPLETE</span><div class="result-symbol" lang="ja">よくできました</div><h2>A little better than before.</h2><p>You showed up. That’s what counts.</p><div class="result-score">${accuracy}<span>%</span></div><p>${correct} of ${session.questions.length} correct</p>${mistakes.length ? `<div class="review-mistakes"><h3>Worth another look</h3><div>${mistakes.map((answer) => `<span><b lang="ja">${answer.question.symbol}</b> ${answer.question.romaji}</span>`).join('')}</div></div>` : '<div class="perfect-note">A perfect round. Keep that rhythm going.</div>'}<div class="result-actions"><button class="primary" data-action="restart">${icon('rotate-ccw')} Practice again</button><button class="secondary" data-view="progress">View progress ${icon('arrow-right')}</button></div></div>`;
}

function renderStudy() {
  if (!studyPool.length) studyPool = selectedPool();
  if (!studyPool.length) return `<div class="quiz-card empty-state">${icon('book-open')}<h2>Your first kana awaits.</h2><p>Choose a set of characters to study.</p><button class="primary" data-action="select">Choose kana</button></div>`;
  studyIndex = studyIndex % studyPool.length;
  const item = studyPool[studyIndex];
  return `<div class="quiz-card study-card"><div class="quiz-top"><span class="tag">${icon('book-open')} ${scriptLabel(item.script)} flashcards</span><span class="question-count"><strong>${studyIndex + 1}</strong> / ${studyPool.length}</span></div><div class="question-prompt">A new character. A familiar sound.</div><div class="kana-stage"><span class="main-kana ${item.symbol.length > 1 ? 'compound' : ''}" lang="ja">${item.symbol}</span><button class="audio-button" data-action="speak" aria-label="Listen to this kana" title="Listen to this kana">${icon('volume-2')}</button></div><div class="alphabet-label">${scriptLabel(item.script).toUpperCase()}</div><div class="study-reveal">${revealed ? `<strong>${item.romaji}</strong><span lang="ja">${item.hiragana} &nbsp; / &nbsp; ${item.katakana}</span>` : `<button class="secondary" data-action="reveal">${icon('eye')} Reveal pronunciation</button>`}</div><div class="flashcard-controls"><button class="secondary" data-action="study-prev" aria-label="Previous flashcard">${icon('arrow-left')}</button><button class="text-button" data-action="shuffle">${icon('shuffle')} Shuffle</button><button class="primary" data-action="study-next">Next character ${icon('arrow-right')}</button></div></div><div class="session-strip"><div>${icon('layers')} ${studyPool.length} characters in your study set</div><button data-view="practice">Practice this set ${icon('arrow-right')}</button></div>`;
}

function renderSettings() {
  return `<aside class="settings-panel" aria-label="Session settings"><div class="panel-heading"><h2>Your practice, your pace</h2>${icon('sliders-horizontal')}</div><label class="field-label">ALPHABET</label><div class="script-tabs" role="group" aria-label="Choose alphabet">${[['hiragana', 'あ', 'Hiragana'], ['katakana', 'ア', 'Katakana'], ['both', 'あア', 'Mixed']].map(([value, symbol, label]) => `<button data-script="${value}" class="${settings.script === value ? 'selected' : ''}" aria-pressed="${settings.script === value}"><span lang="ja">${symbol}</span>${label}</button>`).join('')}</div><div class="field-label label-row"><span>YOUR KANA</span><span class="selection-count">${selectedPool().length} selected</span></div><button class="selection-button" data-action="select"><span class="selection-icon" lang="ja">かな</span><span><strong>Choose your characters</strong><small>${settings.selected.length === 46 && settings.selected.every((id) => basicIds.includes(id)) ? 'All basic kana' : settings.selected.length === 0 ? 'No characters selected' : 'Your custom selection'}</small></span>${icon('chevron-right')}</button><label class="field-label" for="question-count">SESSION LENGTH</label><div class="select-wrap">${icon('list-ordered')}<select id="question-count">${[10, 20, 30].map((count) => `<option value="${count}" ${settings.count === count ? 'selected' : ''}>${count} questions</option>`).join('')}</select>${icon('chevron-down')}</div><label class="field-label" for="answer-mode">ANSWER STYLE</label><div class="select-wrap">${icon(settings.mode === 'choice' ? 'layout-grid' : 'keyboard')}<select id="answer-mode"><option value="choice" ${settings.mode === 'choice' ? 'selected' : ''}>Multiple choice</option><option value="type" ${settings.mode === 'type' ? 'selected' : ''}>Type your answer</option></select>${icon('chevron-down')}</div><div class="sound-setting"><span>${icon('volume-2')} Sound on answer</span><label class="switch"><input type="checkbox" id="sound-toggle" ${settings.sound ? 'checked' : ''} aria-label="Sound on answer" /><span></span></label></div><div class="settings-note">${icon('leaf')}<p>No rush. No pressure.<br>Just a little progress.</p></div></aside>`;
}

function renderCollection() {
  const visibleRows = rows.filter((row) => row.group === group);
  const alphabet = settings.script === 'katakana' ? 'katakana' : 'hiragana';
  return `<section class="collection"><div class="collection-header"><div><div class="eyebrow">BUILD YOUR FOUNDATION</div><h2>Your kana collection <span>${selectedPool().length}</span></h2><p>A familiar face starts with a little practice.</p></div><button class="text-button" data-action="select">Customize set ${icon('arrow-up-right')}</button></div><div class="collection-toolbar"><div class="group-tabs" role="group" aria-label="Kana categories">${[['basic', 'Basic', '46'], ['voiced', 'Dakuten', '25'], ['combination', 'Combinations', '33']].map(([id, label, count]) => `<button data-group="${id}" class="${group === id ? 'active' : ''}" aria-pressed="${group === id}">${label} <span>${count}</span></button>`).join('')}</div><div class="collection-legend"><span></span> In your practice set</div></div><div class="collection-grid">${visibleRows.map((row) => `<div class="collection-row">${row.items.map((item, index) => item ? `<button class="kana-tile ${settings.selected.includes(item.id) ? 'included' : ''}" style="grid-column: ${row.group === 'combination' ? index * 2 + 1 : index + 1}" data-kana="${item.id}" aria-pressed="${settings.selected.includes(item.id)}" aria-label="${settings.selected.includes(item.id) ? 'Deselect' : 'Select'} ${item.romaji}"><span class="tile-check">${icon('check')}</span><span lang="ja">${item[alphabet]}</span><small>${item.romaji}</small></button>` : '').join('')}</div>`).join('')}</div></section>`;
}

function renderProgress(metrics) {
  return `<section class="progress-page"><div class="stats-grid"><div>${icon('target')}<span>Overall accuracy</span><strong>${metrics.accuracy}<small>%</small></strong></div><div>${icon('check-check')}<span>Kana practiced</span><strong>${metrics.total}</strong></div><div>${icon('flag')}<span>Sessions completed</span><strong>${settings.history.length}</strong></div><div>${icon('flame')}<span>Current streak</span><strong>${metrics.streak}<small> days</small></strong></div></div><div class="history-header"><h2>Your practice journal</h2><span>Saved on this device</span></div>${settings.history.length ? `<div class="history-table"><div class="history-row table-heading"><span>SESSION</span><span>ALPHABET</span><span>CORRECT</span><span>ACCURACY</span></div>${[...settings.history].reverse().map((entry) => `<div class="history-row"><span>${new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}<small>${new Date(entry.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</small></span><span>${scriptLabel(['hiragana', 'katakana', 'both'].includes(entry.script) ? entry.script : 'hiragana')}</span><span>${entry.correct} / ${entry.total}</span><span class="accuracy-value">${Math.round(entry.correct / entry.total * 100)}%</span></div>`).join('')}</div>` : `<div class="progress-empty">${icon('sprout')}<h2>Your story starts here.</h2><p>Finish your first quiz to add a little progress to your journal.</p><button class="primary" data-view="practice">Start practicing ${icon('arrow-right')}</button></div>`}</section>`;
}

function resetExercise() {
  save();
  startSession();
  studyPool = selectedPool();
  studyIndex = 0;
  revealed = false;
  render();
}

function openSelection() {
  draftSelection = [...settings.selected];
  draftScript = settings.script;
  modalGroup = group;
  renderSelection();
  document.querySelector('#selection-dialog').showModal();
}

function renderSelection() {
  const dialog = document.querySelector('#selection-dialog');
  const visibleRows = rows.filter((row) => row.group === modalGroup);
  const alphabet = draftScript === 'katakana' ? 'katakana' : 'hiragana';
  dialog.innerHTML = `<div class="dialog-heading"><div><div class="eyebrow">MAKE IT YOURS</div><h2 id="selection-title">Choose your kana</h2><p>A small set or the whole alphabet. Your call.</p></div><button class="icon-button" data-action="close-modal" aria-label="Close character selection" title="Close">${icon('x')}</button></div><div class="dialog-script script-tabs" role="group" aria-label="Selection alphabet">${[['hiragana', 'あ', 'Hiragana'], ['katakana', 'ア', 'Katakana'], ['both', 'あア', 'Mixed']].map(([value, symbol, label]) => `<button data-draft-script="${value}" class="${draftScript === value ? 'selected' : ''}" aria-pressed="${draftScript === value}"><span lang="ja">${symbol}</span>${label}</button>`).join('')}</div><div class="dialog-toolbar"><div class="group-tabs" role="group" aria-label="Selection categories">${[['basic', 'Basic'], ['voiced', 'Dakuten'], ['combination', 'Combinations']].map(([id, label]) => `<button data-modal-group="${id}" class="${modalGroup === id ? 'active' : ''}" aria-pressed="${modalGroup === id}">${label}</button>`).join('')}</div><div class="bulk-actions"><button data-action="select-all">Select all</button><span>·</span><button data-action="clear-all">Clear</button></div></div><div class="selection-grid">${visibleRows.map((row) => `<div class="selection-row"><label class="row-checkbox"><input type="checkbox" data-row="${row.label}" ${row.items.filter(Boolean).every((item) => draftSelection.includes(item.id)) ? 'checked' : ''} aria-label="Select ${row.label} row" /><span>${row.label === 'N (final)' ? 'N' : row.label}</span></label>${row.items.map((item) => item ? `<label class="select-kana ${draftSelection.includes(item.id) ? 'included' : ''}"><input type="checkbox" data-draft-kana="${item.id}" ${draftSelection.includes(item.id) ? 'checked' : ''} aria-label="${item.romaji} ${item[alphabet]}" /><span lang="ja">${item[alphabet]}</span><small>${item.romaji}</small>${icon('check')}</label>` : '<span class="blank-kana"></span>').join('')}</div>`).join('')}</div><div class="dialog-footer"><span><strong>${getPool(draftSelection, draftScript).length}</strong> kana selected</span><button class="primary" data-action="apply-selection" ${draftSelection.length ? '' : 'disabled'}>Apply selection ${icon('check')}</button></div>`;
  createIcons({ icons });
  dialog.querySelectorAll('[data-row]').forEach((input) => {
    const rowItems = visibleRows.find((row) => row.label === input.dataset.row).items.filter(Boolean);
    const count = rowItems.filter((item) => draftSelection.includes(item.id)).length;
    input.indeterminate = count > 0 && count < rowItems.length;
  });
}

function speak() {
  const question = view === 'study' ? studyPool[studyIndex] : session.questions[session.index];
  if (!question || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(question.symbol);
  const localVoice = speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('ja') && voice.localService);
  if (localVoice) utterance.voice = localVoice;
  utterance.lang = 'ja-JP';
  utterance.rate = 0.7;
  speechSynthesis.speak(utterance);
}

function answer(value) {
  if (view !== 'practice' || session.answer !== null || session.complete || !session.questions.length || !value.trim()) return;
  const question = session.questions[session.index];
  session.answer = value;
  const correct = isCorrect(value, question);
  session.answers.push({ question, correct });
  if (settings.sound) {
    try {
      const audio = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.frequency.value = correct ? 660 : 220;
      gain.gain.setValueAtTime(0.08, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.2);
      oscillator.onended = () => audio.close();
    } catch {}
  }
  render();
  document.querySelector('[data-action="next"]')?.focus({ preventScroll: true });
}

function nextQuestion() {
  if (session.answer === null || session.complete) return;
  if (session.index === session.questions.length - 1) {
    session.complete = true;
    settings.history.push({ date: new Date().toISOString(), correct: session.answers.filter((entry) => entry.correct).length, total: session.questions.length, script: settings.script });
    settings.history = settings.history.slice(-100);
    save();
  } else {
    session.index++;
    session.answer = null;
  }
  render();
  document.querySelector('#typed-answer')?.focus({ preventScroll: true });
}

app.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (event.target.closest('.brand')) { event.preventDefault(); view = 'practice'; render(); return; }
  if (!button || button.disabled) return;
  if (button.dataset.view) { view = button.dataset.view; render(); return; }
  if (button.dataset.answer) { answer(button.dataset.answer); return; }
  if (button.dataset.script) { settings.script = button.dataset.script; resetExercise(); return; }
  if (button.dataset.group) { group = button.dataset.group; render(); return; }
  if (button.dataset.kana) {
    const id = button.dataset.kana;
    settings.selected = settings.selected.includes(id) ? settings.selected.filter((value) => value !== id) : [...settings.selected, id];
    resetExercise();
    return;
  }
  if (button.dataset.draftScript) { draftScript = button.dataset.draftScript; renderSelection(); return; }
  if (button.dataset.modalGroup) { modalGroup = button.dataset.modalGroup; renderSelection(); return; }
  const action = button.dataset.action;
  if (action === 'install-app') installApp();
  if (action === 'update-app') updateSW(true);
  if (action === 'select') openSelection();
  if (action === 'close-modal') document.querySelector('#selection-dialog').close();
  if (action === 'apply-selection') { settings.selected = [...draftSelection]; settings.script = draftScript; resetExercise(); }
  if (action === 'select-all' || action === 'clear-all') {
    const groupIds = kana.filter((item) => item.group === modalGroup).map((item) => item.id);
    draftSelection = action === 'select-all' ? [...new Set([...draftSelection, ...groupIds])] : draftSelection.filter((id) => !groupIds.includes(id));
    renderSelection();
  }
  if (action === 'next') nextQuestion();
  if (action === 'restart') { startSession(); render(); }
  if (action === 'speak') speak();
  if (action === 'reveal') { revealed = !revealed; render(); }
  if (action === 'study-next' || action === 'study-prev') { studyIndex = (studyIndex + (action === 'study-next' ? 1 : -1) + studyPool.length) % studyPool.length; revealed = true; render(); speak(); }
  if (action === 'shuffle') { studyPool = shuffle(studyPool); studyIndex = 0; revealed = true; render(); speak(); }
});

app.addEventListener('change', (event) => {
  const target = event.target;
  if (target.id === 'question-count') { settings.count = Number(target.value); resetExercise(); }
  if (target.id === 'answer-mode') { settings.mode = target.value; resetExercise(); }
  if (target.id === 'sound-toggle') { settings.sound = target.checked; save(); }
  if (target.dataset.draftKana) {
    const id = target.dataset.draftKana;
    draftSelection = target.checked ? [...draftSelection, id] : draftSelection.filter((value) => value !== id);
    renderSelection();
  }
  if (target.dataset.row) {
    const ids = rows.find((row) => row.group === modalGroup && row.label === target.dataset.row).items.filter(Boolean).map((item) => item.id);
    draftSelection = target.checked ? [...new Set([...draftSelection, ...ids])] : draftSelection.filter((id) => !ids.includes(id));
    renderSelection();
  }
});

app.addEventListener('submit', (event) => {
  if (event.target.id !== 'answer-form') return;
  event.preventDefault();
  answer(new FormData(event.target).get('answer') || '');
});

document.addEventListener('keydown', (event) => {
  if (document.querySelector('#selection-dialog')?.open || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName) || view !== 'practice' || session.complete) return;
  if (settings.mode === 'choice' && /^[1-4]$/.test(event.key)) answer(session.questions[session.index]?.options[Number(event.key) - 1] || '');
  if (event.key === 'Enter' && session.answer !== null) nextQuestion();
});

render();