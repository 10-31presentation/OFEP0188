'use strict';
const LEARNED_KEY='kanji-game-learned-characters-v1';
const learnedCharacters=new Set();
const characterGrades=new Map(Object.entries(GRADE_WORDS).flatMap(([grade,bank])=>bank.map(word=>[word.char,Number(grade)])));
let selectedLibraryCharacter=null,strokeStep=0,strokeTimer=null;
try{
  const stored=JSON.parse(localStorage.getItem(LEARNED_KEY)||'[]');
  if(Array.isArray(stored))for(const char of stored)if(characterGrades.has(char))learnedCharacters.add(char);
}catch{ /* 開いている間の図鑑は利用できる。 */ }
function saveLearned(){try{localStorage.setItem(LEARNED_KEY,JSON.stringify([...learnedCharacters]));}catch{}}
function unlockKanji(char){if(characterGrades.has(char)){learnedCharacters.add(char);saveLearned();}}
function restoreLearnedFromCompletions(completions){
  for(const key of completions){
    const[grade,lesson]=key.split(':').map(Number);
    for(const word of GRADE_WORDS[grade]?.slice(lesson*10,lesson*10+10)||[])learnedCharacters.add(word.char);
  }
  saveLearned();
}
function stopStrokeAnimation(){clearInterval(strokeTimer);strokeTimer=null;document.getElementById('stroke-play').textContent='自動再生';}
function showLibrary(){
  closePause();cancelAnimationFrame(animation);stopDrawing();stopStrokeAnimation();phase='library';hideGameScreens();
  document.getElementById('pause-help').hidden=true;document.getElementById('library-screen').hidden=false;
  document.getElementById('main-eyebrow').textContent='漢字図鑑';document.getElementById('phase').textContent='練習した漢字の書き順や読みを、ゆっくり確かめよう。';
  showLibraryList();window.scrollTo(0,0);
}
function showLibraryList(){
  stopStrokeAnimation();selectedLibraryCharacter=null;
  document.getElementById('library-detail').hidden=true;document.getElementById('library-list-panel').hidden=false;renderLibraryList();
}
function renderLibraryList(){
  const filter=document.getElementById('library-grade').value;
  const entries=[...characterGrades].filter(([char,grade])=>learnedCharacters.has(char)&&(filter==='all'||grade===Number(filter)));
  const total=filter==='all'?1026:GRADE_WORDS[filter].length;
  document.getElementById('library-count').textContent=`${entries.length} / ${total}文字`;
  document.getElementById('library-empty').textContent=entries.length?'調べたい漢字を選んでね。':'練習で「書けた」として終えた漢字が、ここに増えていくよ。';
  const grid=document.getElementById('library-grid');grid.replaceChildren();
  for(const[char,grade]of entries){
    const button=document.createElement('button');button.className='library-tile';button.dataset.char=char;
    const title=document.createElement('strong');title.dataset.literal='';title.textContent=char;
    const label=document.createElement('span');label.textContent=`${grade}年生`;
    button.append(title,label);button.addEventListener('click',()=>openLibraryEntry(char));grid.append(button);
  }
}
function openLibraryEntry(char){
  if(!learnedCharacters.has(char)||!KANJI_LIBRARY[char])return;
  stopStrokeAnimation();selectedLibraryCharacter=char;strokeStep=0;
  document.getElementById('library-list-panel').hidden=true;document.getElementById('library-detail').hidden=false;
  const entry=KANJI_LIBRARY[char];
  document.getElementById('entry-character').textContent=char;
  document.getElementById('entry-meta').textContent=`${characterGrades.get(char)}年生の漢字 · ${entry.strokes.length}画`;
  const toKatakana=reading=>reading.replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96));
  document.getElementById('entry-on').textContent=entry.on.length?entry.on.map(toKatakana).join(' ／ '):'—';
  document.getElementById('entry-kun').textContent=entry.kun.length?entry.kun.map(s=>s.replace(/^-|-$/g,'').replaceAll('.','・')).join(' ／ '):'—';
  const list=document.getElementById('entry-examples');list.replaceChildren();
  for(const[word,reading]of entry.examples){
    const li=document.createElement('li');const term=document.createElement('strong');term.textContent=word;
    const kana=document.createElement('span');kana.textContent=`（${reading}）`;li.append(term,kana);list.append(li);
  }
  document.getElementById('entry-origin-section').hidden=!entry.origin;
  document.getElementById('entry-usage').hidden=!entry.usage;
  if(entry.origin){document.getElementById('entry-origin-source').href=entry.origin[2];}
  updateEntryDescriptions();
  document.getElementById('entry-stroke-source').href=`https://github.com/KanjiVG/kanjivg/blob/r20260714/kanji/${char.codePointAt(0).toString(16).padStart(5,'0')}.svg`;
  renderStrokeStep();window.scrollTo(0,0);
}
function updateEntryDescriptions(){
  if(!selectedLibraryCharacter)return;
  const entry=KANJI_LIBRARY[selectedLibraryCharacter],language=settings.language==='kana'?1:0;
  document.getElementById('entry-origin').textContent=entry.origin?.[language]||'';
  document.getElementById('entry-usage').textContent=entry.usage?.[language]||'';
}
function renderStrokeStep(){
  if(!selectedLibraryCharacter)return;
  const paths=KANJI_LIBRARY[selectedLibraryCharacter].strokes,svg=document.getElementById('stroke-diagram'),ns='http://www.w3.org/2000/svg';
  svg.replaceChildren();svg.setAttribute('aria-label',`${selectedLibraryCharacter}の書き順`);
  paths.forEach((d,i)=>{
    const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke',i+1===strokeStep?'#28745f':i<strokeStep?'#263e45':'#dce5df');path.setAttribute('stroke-width','3');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');
    svg.append(path);
    if(i+1===strokeStep && path.animate){
      const length=path.getTotalLength();path.style.strokeDasharray=String(length);
      path.animate([{strokeDashoffset:String(length)},{strokeDashoffset:'0'}],{duration:650,fill:'forwards'});
    }
    if(i<strokeStep){
      const coordinates=d.match(/[-+]?\d*\.?\d+/g);
      if(coordinates?.length>=2){const label=document.createElementNS(ns,'text');label.setAttribute('x',Math.max(3,Number(coordinates[0])-5));label.setAttribute('y',Math.max(7,Number(coordinates[1])-4));label.setAttribute('font-size','5');label.setAttribute('fill','#28745f');label.textContent=i+1;svg.append(label);}
    }
  });
  document.getElementById('stroke-step').textContent=`${strokeStep} / ${paths.length}画`;
  document.getElementById('stroke-prev').disabled=strokeStep===0;document.getElementById('stroke-next').disabled=strokeStep===paths.length;
}
document.getElementById('library-grade').addEventListener('change',renderLibraryList);
document.getElementById('back-library-list').addEventListener('click',showLibraryList);
document.getElementById('stroke-prev').addEventListener('click',()=>{stopStrokeAnimation();strokeStep=Math.max(0,strokeStep-1);renderStrokeStep();});
document.getElementById('stroke-next').addEventListener('click',()=>{stopStrokeAnimation();strokeStep=Math.min(KANJI_LIBRARY[selectedLibraryCharacter].strokes.length,strokeStep+1);renderStrokeStep();});
document.getElementById('stroke-play').addEventListener('click',()=>{
  if(strokeTimer){stopStrokeAnimation();return;}
  strokeStep=0;renderStrokeStep();document.getElementById('stroke-play').textContent='停止';
  strokeTimer=setInterval(()=>{
    if(phase!=='library'||!selectedLibraryCharacter){stopStrokeAnimation();return;}
    strokeStep++;renderStrokeStep();if(strokeStep>=KANJI_LIBRARY[selectedLibraryCharacter].strokes.length)stopStrokeAnimation();
  },800);
});
window.addEventListener('game-language-change',updateEntryDescriptions);
