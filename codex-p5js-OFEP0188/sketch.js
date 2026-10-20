'use strict';
const $ = (id) => document.getElementById(id);
function splitLessons(bank) {
  const lessons = [];
  for (let offset = 0; offset < bank.length; offset += 10) lessons.push(bank.slice(offset, offset + 10));
  return lessons;
}
const GRADE_LESSONS = Object.fromEntries(Object.entries(GRADE_WORDS).map(([grade, bank]) => [grade, splitLessons(bank)]));
let selectedGrade = null, selectedLesson = 0;
let words = [], playCues = [];
let pendingScore = null;
const canvas = $('writing');
const context = canvas.getContext('2d', { willReadFrequently: true });
const model = $('model');
const modelContext = model.getContext('2d');
const font = '"KanjiHandwriting", sans-serif';
let phase = 'landing', order = [], index = 0;
let paused = false;
let tool = 'pen';
let previousPoint = null, activePointer = null, hasInk = false, confirming = false;
const records = { practice: [] };
context.strokeStyle = '#263e45'; context.lineWidth = 14; context.lineCap = 'round'; context.lineJoin = 'round';

function drawModel(target, char) {
  target.clearRect(0, 0, 1000, 1000);
  target.fillStyle = '#263e45'; target.font = `800px ${font}`;
  target.textAlign = 'center'; target.textBaseline = 'middle'; target.fillText(char, 500, 530);
}
function stopDrawing() { previousPoint = null; activePointer = null; }
function resetWriting() {
  pendingScore = null;
  stopDrawing(); context.clearRect(0, 0, 1000, 1000); hasInk = confirming = false;
  $('done').disabled = true; $('done').hidden = false; $('confirmation').hidden = true; $('feedback').textContent = '';
}
function showQuestion() {
  resetWriting();
  const word = words[order[index]];
  $('phase').textContent = `お手本を見ながら、${words.length}文字を1回ずつ書こう。そのあとは部品をキャッチ！`;
  $('progress').textContent = `練習 ${index + 1} / ${words.length}`;
  $('prompt').textContent = settings.language === 'kana' ? kanaText(word.playCue) : word.cue;
  drawModel(modelContext, word.char);
  selectTool('pen');
}
function pointFrom(event) {
  const bounds = canvas.getBoundingClientRect();
  return { x: (event.clientX - bounds.left) * 1000 / bounds.width, y: (event.clientY - bounds.top) * 1000 / bounds.height };
}
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  if (paused || phase !== 'practice' || e.pointerType !== 'mouse' || e.button !== 0 || confirming) return;
  e.preventDefault(); activePointer = e.pointerId; previousPoint = pointFrom(e);
});
canvas.addEventListener('pointermove', (e) => {
  if (paused || phase !== 'practice' || confirming || e.pointerType !== 'mouse' || !(e.buttons & 1)) { stopDrawing(); return; }
  const point = pointFrom(e);
  if (activePointer === e.pointerId && previousPoint) {
    context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    context.lineWidth = tool === 'eraser' ? 65 : 14;
    context.beginPath(); context.moveTo(previousPoint.x, previousPoint.y); context.lineTo(point.x, point.y); context.stroke();
    hasInk = tool === 'pen' || context.getImageData(0, 0, 1000, 1000).data.some((value, i) => i % 4 === 3 && value > 0);
    $('done').disabled = !hasInk;
  }
  activePointer = e.pointerId; previousPoint = point;
});
canvas.addEventListener('pointerleave', stopDrawing); canvas.addEventListener('pointercancel', stopDrawing);
window.addEventListener('pointerup', stopDrawing); window.addEventListener('blur', stopDrawing);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopDrawing(); });
function selectTool(nextTool) {
  pendingScore = null;
  stopDrawing(); tool = nextTool;
  context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  canvas.classList.toggle('erasing', tool === 'eraser');
  $('pen').setAttribute('aria-pressed', String(tool === 'pen'));
  $('eraser').setAttribute('aria-pressed', String(tool === 'eraser'));
  $('tool-hint').textContent = tool === 'eraser' ? '消しゴム：左ボタンを押しながら、消したい線をなぞろう。' : 'ペン：左ボタンを押したまま動かして書こう。はなすと線が止まるよ。';
  // 確認画面からもペン・消しゴムに戻って直せる。
  confirming = false; $('confirmation').hidden = true; $('done').hidden = false;
}
$('pen').addEventListener('click', () => selectTool('pen'));
$('eraser').addEventListener('click', () => selectTool('eraser'));
$('clear').addEventListener('click', resetWriting);
$('done').addEventListener('click', () => {
  if (paused || phase !== 'practice' || !hasInk) return;
  pendingScore = scoreWriting(canvas, words[order[index]].char);
  if (pendingScore > 5) { finishWriting(pendingScore); return; }
  confirming = true; stopDrawing(); $('done').hidden = true; $('confirmation').hidden = false; $('confirm').focus();
});

// 128角の画像で線の近さを双方向に比較。塗りつぶしや点だけでは高得点にならない。
function mask(source) {
  const small = document.createElement('canvas'); small.width = small.height = 128;
  const ctx = small.getContext('2d'); ctx.drawImage(source, 0, 0, 128, 128);
  const data = ctx.getImageData(0, 0, 128, 128).data;
  return Array.from({ length: 128 * 128 }, (_, i) => data[i * 4 + 3] > 30 ? 1 : 0);
}
function proximity(a, b) {
  let total = 0, matched = 0;
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    total++;
    const x = i % 128, y = Math.floor(i / 128);
    let best = 0;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      if (x + dx < 0 || x + dx >= 128 || y + dy < 0 || y + dy >= 128) continue;
      if (b[(y + dy) * 128 + x + dx]) best = Math.max(best, Math.max(0, 1 - Math.hypot(dx, dy) / 5));
    }
    matched += best;
  }
  return total ? matched / total : 0;
}
function scoreWriting(source, char) {
  const reference = document.createElement('canvas'); reference.width = reference.height = 1000;
  drawModel(reference.getContext('2d'), char);
  const a = mask(source), b = mask(reference), precision = proximity(a, b), recall = proximity(b, a);
  const inkRatio = a.reduce((sum, value) => sum + value, 0) / Math.max(1, b.reduce((sum, value) => sum + value, 0));
  const overfillPenalty = Math.min(1, 2 / Math.max(1, inkRatio));
  return precision + recall ? Math.round(10 * 2 * precision * recall / (precision + recall) * overfillPenalty) : 0;
}
$('confirm').addEventListener('click', () => {
  if (paused || phase !== 'practice' || !confirming || !hasInk) return;
  finishWriting(pendingScore);
});
function finishWriting(score) {
  const saved = document.createElement('canvas'); saved.width = saved.height = 1000; saved.getContext('2d').drawImage(canvas, 0, 0);
  const wordId = order[index];
  records[phase][wordId] = { image: saved, score };
  unlockKanji(words[wordId].char);
  index++;
  if (index === words.length) {
    startParts(); return;
  }
  showQuestion();
}

let pieces = [], lastFrame = 0, animation;
let partQueue = [], assembledWords = [], caughtCount = 0, totalParts = 0;
let placements = [];
let currentWordIndex = 0;
function startParts() {
  phase = 'parts'; $('practice').hidden = true; $('parts').hidden = false;
  $('phase').textContent = '漢字の福笑い！ 部品をクリックした位置に置くよ。一度置いたら動かせないよ。';
  $('main-heading').textContent = '書いて、覚えて、組み立てよう。';
  $('main-eyebrow').textContent = `小学${selectedGrade}年生 · 第${selectedLesson + 1}回 · ${words.length}文字`;
  partQueue = words.flatMap((word, id) => word.regions.map((region) => ({ id, region })));
  // この回の文字の部品を混ぜ、最大3個のうち最低1個は今のお題の部品にする。
  for (let i = partQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [partQueue[i], partQueue[j]] = [partQueue[j], partQueue[i]];
  }
  totalParts = partQueue.length; caughtCount = 0; pieces = []; placements = []; currentWordIndex = 0;
  assembledWords = words.map(() => {
    const image = document.createElement('canvas'); image.width = image.height = 1000; return image;
  });
  showPartsPrompt();
  $('parts-feedback').textContent = '右・左・上・下、どこに置く？ クリックした位置で決まるよ。';
  for (let n = 0; n < 3; n++) spawnPiece(-.5 * n);
  lastFrame = 0; animation = requestAnimationFrame(tick);
}
function spawnPiece(position = -.2 - Math.random() * .4) {
  if (!partQueue.length) return;
  const currentId = order[currentWordIndex];
  const hasCurrent = pieces.some((p) => !p.caught && p.id === currentId);
  const matchingIndex = hasCurrent ? -1 : partQueue.findIndex((p) => p.id === currentId);
  const { id, region } = partQueue.splice(matchingIndex >= 0 ? matchingIndex : 0, 1)[0];
  const [x, y, w, h] = region, button = document.createElement('button'), image = document.createElement('canvas');
  image.width = image.height = 160;
  const scale = 144 / Math.max(w, h);
  image.getContext('2d').drawImage(records.practice[id].image, x, y, w, h, (160 - w * scale) / 2, (160 - h * scale) / 2, w * scale, h * scale);
  button.className = 'piece'; button.setAttribute('aria-label', `${playCues[id]}の部品。緑の枠でクリック`);
  button.style.transform = 'translate(-100px, -100px)';
  button.append(image); $('lane').append(button);
  const piece = { id, button, region, position, angle: Math.random() * Math.PI * 2, caught: false, ready: false };
  button.addEventListener('click', (event) => catchPiece(piece, event)); pieces.push(piece);
}
function showPartsPrompt() {
  const wordId = order[currentWordIndex];
  $('parts-prompt').textContent = settings.language === 'kana' ? kanaText(playCues[wordId]) : playCues[wordId];
  const placed = placements.filter((p) => p.id === wordId).length;
  $('parts-progress').textContent = `今のお題 ${currentWordIndex + 1} / ${words.length} · 置いた部品 ${placed} / ${words[wordId].regions.length}`;
  for (const id of ['assembled', 'target-assembly']) {
    const preview = $(id).getContext('2d');
    preview.clearRect(0, 0, 1000, 1000); preview.drawImage(assembledWords[wordId], 0, 0);
  }
}

function catchPiece(piece, event) {
  if (paused || phase !== 'parts' || piece.caught) return;
  const frame = $('target').getBoundingClientRect();
  const partBounds = piece.button.getBoundingClientRect();
  // マウスでは実際に押した位置を使う。キーボードでは部品の中央に置く。
  const clientX = event?.detail > 0 ? event.clientX : partBounds.left + partBounds.width / 2;
  const clientY = event?.detail > 0 ? event.clientY : partBounds.top + partBounds.height / 2;
  if (clientX < frame.left || clientX > frame.right || clientY < frame.top || clientY > frame.bottom) {
    $('parts-feedback').textContent = '緑の枠の中で、置きたい位置に来た部品をクリックしよう。'; return;
  }
  const targetId = order[currentWordIndex];
  const centerX = (clientX - frame.left) / frame.width * 1000;
  const centerY = (clientY - frame.top) / frame.height * 1000;
  const [x, y, w, h] = piece.region;
  const dropX = centerX - w / 2, dropY = centerY - h / 2;
  // 元の位置へ補正しない。置いた座標をそのまま保存し、再操作は受け付けない。
  piece.caught = true; piece.button.remove(); caughtCount++;
  const wrongPart = piece.id !== targetId || placements.some((p) => p.id === targetId && p.sourceId === piece.id && p.region === piece.region);
  const positionMiss = Math.abs(dropX - x) > 120 || Math.abs(dropY - y) > 120;
  placements.push({ id: targetId, sourceId: piece.id, region: piece.region, x: dropX, y: dropY,
    wrongPart, positionMiss, miss: wrongPart || positionMiss });
  // 別のお題に使った部品も、元のお題で選べるよう候補に戻す。置いたものは動かさない。
  if (piece.id !== targetId) partQueue.push({ id: piece.id, region: piece.region });
  const assembled = assembledWords[targetId];
  assembled.getContext('2d').drawImage(records.practice[piece.id].image, x, y, w, h, dropX, dropY, w, h);
  for (const id of ['assembled', 'target-assembly']) {
    const preview = $(id).getContext('2d');
    preview.clearRect(0, 0, 1000, 1000); preview.drawImage(assembled, 0, 0);
  }
  $('parts-feedback').textContent = 'その位置に置いたよ！ 置き直しはできないよ。結果は最後に見よう。';
  const complete = placements.filter((p) => p.id === targetId).length === words[targetId].regions.length;
  if (complete) {
    currentWordIndex++;
    if (currentWordIndex === order.length) { cancelAnimationFrame(animation); showResults(); return; }
    $('parts-feedback').textContent = '部品を全部置いたよ！ 次は上のお題の漢字を作ろう。';
  }
  showPartsPrompt();
  spawnPiece();
}
function distanceToEdge(x, y, dx, dy, width, height) {
  const horizontal = Math.abs(dx) < .00001 ? Infinity : (dx > 0 ? width + 80 - x : x + 80) / Math.abs(dx);
  const vertical = Math.abs(dy) < .00001 ? Infinity : (dy > 0 ? height + 80 - y : y + 80) / Math.abs(dy);
  return Math.min(horizontal, vertical);
}
function tick(time) {
  if (paused || phase !== 'parts') return;
  const delta = lastFrame ? Math.min((time - lastFrame) / 1000, .05) : 0; lastFrame = time;
  const width = $('lane').clientWidth, height = $('lane').clientHeight;
  const targetX = width / 2, targetY = height / 2;
  const target = $('target');
  const frame = target.getBoundingClientRect(), lane = $('lane').getBoundingClientRect();
  const frameLeft = frame.left - lane.left - $('lane').clientLeft;
  const frameTop = frame.top - lane.top - $('lane').clientTop;
  for (const piece of [...pieces]) {
    if (piece.caught) continue;
    const dx = Math.cos(piece.angle), dy = Math.sin(piece.angle);
    // 枠の中央ではなく、この部品を正しく置ける位置を必ず通る。
    const [rx, ry, rw, rh] = piece.region;
    const waypointX = frameLeft + (rx + rw / 2) / 1000 * frame.width;
    const waypointY = frameTop + (ry + rh / 2) / 1000 * frame.height;
    const distance = distanceToEdge(waypointX, waypointY, dx, dy, width, height);
    const exitDistance = distanceToEdge(waypointX, waypointY, -dx, -dy, width, height);
    piece.position += delta * 90 * settings.speed / distance;
    if ((piece.position - 1) * distance > exitDistance) {
      // 枠を通り過ぎたら次の部品へ交代し、お題の部品が必ず巡ってくるようにする。
      partQueue.push({ id: piece.id, region: piece.region });
      piece.button.remove(); pieces = pieces.filter((p) => p !== piece);
      spawnPiece();
      continue;
    }
    const offset = (1 - piece.position) * distance;
    const x = waypointX + dx * offset - 40, y = waypointY + dy * offset - 40;
    // 枠と重なっている部品を選べる。置く位置の正誤は最後に判定する。
    piece.ready = Math.abs(x + 40 - targetX) <= target.clientWidth / 2 + 40 && Math.abs(y + 40 - targetY) <= target.clientHeight / 2 + 40;
    piece.button.style.transform = `translate(${x}px, ${y}px)`;
    piece.button.classList.toggle('ready', piece.ready);
  }
  animation = requestAnimationFrame(tick);
}
function showResults() {
  $('pause-help').hidden = true;
  completedSessions.add(sessionKey(selectedGrade, selectedLesson));
  saveCompletion();
  $('result-completion').textContent = `✓ ${selectedGrade}年生 第${selectedLesson + 1}回 完了！`;
  $('score-list').replaceChildren();
  phase = 'results'; $('parts').hidden = true; $('results').hidden = false;
  $('phase').textContent = `${words.length}文字の練習と、部品の組み立てが終わったよ。`;
  $('results-title').textContent = `${words.length}文字、よくがんばったね！`;
  const heading = document.createElement('div'); heading.className = 'score-row';
  for (const text of ['漢字', '書いた点数', '福笑いの結果']) { const span = document.createElement('strong'); span.textContent = text; heading.append(span); }
  $('score-list').append(heading);
  words.forEach((word, i) => {
    const row = document.createElement('div'); row.className = 'score-row';
    for (const text of [word.char, `${records.practice[i].score} / 10`]) { const span = document.createElement('span'); if(text===word.char)span.dataset.literal=''; span.textContent = text; row.append(span); }
    const result = document.createElement('div');
    const image = document.createElement('canvas'); image.width = image.height = 1000;
    image.getContext('2d').drawImage(assembledWords[i], 0, 0);
    image.setAttribute('aria-label', `${word.char}の福笑いの完成形`);
    const positionLabel = document.createElement('p');
    const partLabel = document.createElement('p');
    const wordPlacements = placements.filter((p) => p.id === i);
    positionLabel.textContent = `位置ミス ${wordPlacements.filter((p) => p.positionMiss).length}個`;
    partLabel.textContent = `部品ミス ${wordPlacements.filter((p) => p.wrongPart).length}個`;
    result.append(image, positionLabel, partLabel); row.append(result);
    $('score-list').append(row);
  });
  const total = (round) => records[round].reduce((sum, r) => sum + r.score, 0);
  $('total').textContent = `書いた点数 ${total('practice')} / ${words.length * 10}点 · 位置ミス ${placements.filter((p) => p.positionMiss).length}個 · 部品ミス ${placements.filter((p) => p.wrongPart).length}個`;
}
const COMPLETION_KEY = 'kanji-fukuwarai-lessons-2020-v1';
const completedSessions = new Set();
const legacyCompletedGrades = new Set();
let storageAvailable = true, fontLoaded = false;
function sessionKey(grade, lesson) { return `${grade}:${lesson}`; }
function completedCount(grade) {
  return GRADE_LESSONS[grade].filter((_, i) => completedSessions.has(sessionKey(grade, i))).length;
}
function loadCompletion() {
  try {
    const saved = JSON.parse(localStorage.getItem(COMPLETION_KEY) || '[]');
    if (Array.isArray(saved)) for (const key of saved) {
      if (typeof key !== 'string' || !/^[1-6]:[0-9]+$/.test(key)) continue;
      const [grade, lesson] = key.split(':').map(Number);
      if (lesson < GRADE_LESSONS[grade].length) completedSessions.add(key);
    }
    // 旧10文字コースの完了履歴は、全漢字コースとは分けて残す。
    const legacy = JSON.parse(localStorage.getItem('kanji-fukuwarai-completed-grades-v1') || '[]');
    if (Array.isArray(legacy)) for (const grade of legacy) if (Number.isInteger(grade) && grade >= 1 && grade <= 6) legacyCompletedGrades.add(grade);
  } catch { storageAvailable = false; }
}
function saveCompletion() {
  try { localStorage.setItem(COMPLETION_KEY, JSON.stringify([...completedSessions])); }
  catch { storageAvailable = false; }
}
function hideGameScreens() {
  stopStrokeAnimation();
  for (const id of ['landing', 'settings-screen', 'library-screen', 'home', 'lesson-menu', 'practice', 'parts', 'results']) $(id).hidden = true;
}
function showHome() {
  closePause(); $('pause-help').hidden = true;
  cancelAnimationFrame(animation); stopDrawing(); phase = 'home'; hideGameScreens();
  $('home').hidden = false;
  $('main-eyebrow').textContent = '漢字のれんしゅう · 全1,026字';
  $('phase').textContent = '学年と回を選ぼう。1回は10問まで、少しずつ進められるよ。';
  $('grade-list').replaceChildren();
  for (let grade = 1; grade <= 6; grade++) {
    const button = document.createElement('button'); button.className = 'grade-card';
    button.disabled = !fontLoaded;
    const title = document.createElement('strong'); title.textContent = `${grade}年生`;
    const lessons = GRADE_LESSONS[grade], count = completedCount(grade);
    const description = document.createElement('span'); description.textContent = `${GRADE_WORDS[grade].length}文字 · 全${lessons.length}回`;
    const badge = document.createElement('span'); badge.className = count === lessons.length ? 'completion complete' : 'completion';
    badge.textContent = count === lessons.length ? '✓ 全回完了' : `${count} / ${lessons.length}回 完了`;
    button.dataset.grade = grade; button.append(title, description, badge);
    if (legacyCompletedGrades.has(grade)) {
      const legacy = document.createElement('small'); legacy.textContent = '以前の10文字コース ✓'; button.append(legacy);
    }
    button.addEventListener('click', () => showLessons(grade)); $('grade-list').append(button);
  }
  $('save-message').textContent = storageAvailable ? '回ごとの完了マークは、このブラウザに保存されます。' : 'このブラウザでは保存できません。開いている間は完了マークを表示します。';
}
function showLessons(grade) {
  if (!fontLoaded || !GRADE_LESSONS[grade]) return;
  closePause(); cancelAnimationFrame(animation); stopDrawing(); phase = 'lessons'; selectedGrade = grade;
  $('pause-help').hidden = true; hideGameScreens(); $('lesson-menu').hidden = false;
  $('main-eyebrow').textContent = `小学${grade}年生の漢字`;
  $('phase').textContent = `全${GRADE_WORDS[grade].length}文字を、10問ずつに分けて練習しよう。`;
  $('lesson-heading').textContent = `${grade}年生 · どの回であそぶ？`;
  $('lesson-list').replaceChildren();
  GRADE_LESSONS[grade].forEach((lesson, i) => {
    const button = document.createElement('button'); button.className = 'grade-card'; button.dataset.lesson = i;
    const title = document.createElement('strong'); title.textContent = `第${i + 1}回`;
    const description = document.createElement('span'); description.textContent = `${lesson.length}問 · ${i * 10 + 1}〜${i * 10 + lesson.length}文字目`;
    const badge = document.createElement('span'); const complete = completedSessions.has(sessionKey(grade, i));
    badge.className = complete ? 'completion complete' : 'completion'; badge.textContent = complete ? '✓ 完了' : 'これから';
    button.append(title, description, badge); button.addEventListener('click', () => startLesson(grade, i)); $('lesson-list').append(button);
  });
  window.scrollTo(0, 0);
}
function startLesson(grade, lessonIndex) {
  if (!fontLoaded || !GRADE_LESSONS[grade]?.[lessonIndex]) return;
  closePause(); $('pause-help').hidden = false;
  cancelAnimationFrame(animation); stopDrawing();
  selectedGrade = grade; selectedLesson = lessonIndex; words = GRADE_LESSONS[grade][lessonIndex]; playCues = words.map((word) => word.playCue);
  order = [...words.keys()]; index = 0; phase = 'practice'; records.practice = [];
  pieces = []; placements = []; partQueue = []; assembledWords = []; caughtCount = currentWordIndex = 0;
  $('lane').querySelectorAll('.piece').forEach((piece) => piece.remove());
  for (const id of ['assembled', 'target-assembly']) $(id).getContext('2d').clearRect(0, 0, 1000, 1000);
  hideGameScreens(); $('practice').hidden = false;
  $('main-eyebrow').textContent = `小学${grade}年生 · 第${lessonIndex + 1}回 · ${words.length}文字`;
  showQuestion(); window.scrollTo(0, 0);
}
$('back-grades').addEventListener('click', () => { showHome(); window.scrollTo(0, 0); });
$('back-lessons').addEventListener('click', () => showLessons(selectedGrade));
function pauseGame() {
  if (paused || !['practice', 'parts'].includes(phase)) return;
  paused = true; setMusicPaused(true); stopDrawing(); cancelAnimationFrame(animation);
  $('pause-menu').showModal(); $('resume').focus();
}
function closePause() {
  paused = false; setMusicPaused(false);
  if ($('pause-menu').open) $('pause-menu').close();
}
function resumeGame() {
  if (!paused) return;
  closePause(); stopDrawing();
  // 停止中の時間を移動距離に含めない。
  if (phase === 'parts') { lastFrame = 0; animation = requestAnimationFrame(tick); }
}
window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !['practice', 'parts'].includes(phase)) return;
  event.preventDefault();
  if (event.repeat) return;
  if (paused) resumeGame(); else pauseGame();
});
$('pause-menu').addEventListener('cancel', (event) => { event.preventDefault(); resumeGame(); });
$('resume').addEventListener('click', resumeGame);
$('restart').addEventListener('click', () => startLesson(selectedGrade, selectedLesson));
$('pause-home').addEventListener('click', () => { showLanding(); window.scrollTo(0, 0); });
$('back-home').addEventListener('click', () => { showLanding(); window.scrollTo(0, 0); });
function showLanding() {
  closePause();cancelAnimationFrame(animation);stopDrawing();phase='landing';hideGameScreens();
  $('pause-help').hidden=true;$('landing').hidden=false;
  $('main-eyebrow').textContent='漢字のれんしゅう · 全1,026字';
  $('phase').textContent='図鑑・練習・設定から、やりたいことを選ぼう。';
  $('menu-practice').disabled=!fontLoaded;
  $('landing-status').textContent=fontLoaded?'':'お手本の文字を読み込んでいます…';
  window.scrollTo(0,0);
}
function showSettings() {
  closePause();cancelAnimationFrame(animation);stopDrawing();phase='settings';hideGameScreens();
  $('pause-help').hidden=true;$('settings-screen').hidden=false;
  $('main-eyebrow').textContent='設定';$('phase').textContent='文字の表示や、福笑いの速度、音を調整しよう。';
  syncSettingsControls();window.scrollTo(0,0);
}
$('menu-practice').addEventListener('click',showHome);
$('menu-library').addEventListener('click',showLibrary);
$('menu-settings').addEventListener('click',showSettings);
document.querySelectorAll('.to-main').forEach(button=>button.addEventListener('click',showLanding));
loadCompletion();
restoreLearnedFromCompletions(completedSessions);
const legacyBanks={1:'林休花草校村町森男音',2:'明時晴海池語話理地妹',3:'部詩仕住持指洋注味湖',4:'松梅機械読試説続給結',5:'河情性銅経織確破授技',6:'紅私砂訪訳誤諸樹棒腹'};
for(const grade of legacyCompletedGrades)for(const char of legacyBanks[grade])learnedCharacters.add(char);
saveLearned();
showLanding();
applyDisplayMode();
$('font-status').textContent = 'お手本の文字を読み込んでいます…';
const fontReady = document.fonts.load('800px "KanjiHandwriting"', Object.values(GRADE_WORDS).flat().map((word) => word.char).join(''))
  .then((loaded) => {
    if (!loaded.length) throw new Error('Font unavailable');
    fontLoaded = true; $('font-status').textContent = ''; $('landing-status').textContent=''; $('menu-practice').disabled=false; if(phase==='home')showHome();
  })
  .catch(() => { $('font-status').textContent = $('landing-status').textContent = 'お手本の文字を読み込めませんでした。画面を再読み込みしてください。'; });
