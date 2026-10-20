'use strict';
const SETTINGS_KEY = 'kanji-game-settings-v1';
const settings = { language: 'kanji', speed: 1, bgm: true, volume: 20 };
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  if (['kanji', 'kana'].includes(saved.language)) settings.language = saved.language;
  if (Number.isFinite(saved.speed)) settings.speed = Math.min(1.6, Math.max(.4, saved.speed));
  if (typeof saved.bgm === 'boolean') settings.bgm = saved.bgm;
  if (Number.isFinite(saved.volume)) settings.volume = Math.min(100, Math.max(0, saved.volume));
} catch { /* 保存できない場合も、この画面を開いている間は使える。 */ }
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  catch { document.getElementById('settings-status').textContent = 'このブラウザでは保存できません。開いている間は設定を使えます。'; }
}
const KANA_LABELS = {
  '見る':'みる','遊ぶ':'あそぶ','遊べる':'あそべる','見ながら':'みながら','書こう':'かこう','やり直す':'やりなおす','一度':'いちど','中で':'なかで','決まる':'きまる','似かた':'にかた','場合':'ばあい','はみ出した':'はみだした','書き終わった':'かきおわった','書き':'かき','緑':'みどり','今':'いま','項目':'こうもく','問目':'もんめ','思い出して':'おもいだして','注意':'ちゅうい','記録':'きろく','曲':'きょく','答え':'こたえ','習う':'ならう','速め':'はやめ','枚':'まい','準備':'じゅんび','学ぶ':'まなぶ','今日':'きょう','何':'なに','後ろ':'うしろ','木を':'きを','付く':'つく','元':'もと','止':'と','約':'やく','台':'だい','通る':'とおる','片方':'かたほう','終了':'しゅうりょう','消しゴム':'けしごむ','鳴ります':'なります','音の':'おとの','部屋':'へや','料理':'りょうり','家':'いえ','手':'て','読む':'よむ',
  '今日は':'きょうは','何を':'なにを','学び':'まなび','速め':'はやめ','倍':'ばい','調べる':'しらべる','調べられる':'しらべられる','調べたい':'しらべたい','調べ':'しらべ','詳しく':'くわしく','流す':'ながす','流れ':'ながれ','増えて':'ふえて','後ろ':'うしろ','送り仮名':'おくりがな','載せています':'のせています','一覧':'いちらん','習う':'ならう','かず':'かず',
  '漢字図鑑':'かんじずかん','漢字練習':'かんじれんしゅう','漢字':'かんじ','図鑑':'ずかん',
  '学年別':'がくねんべつ','学年':'がくねん','小学':'しょうがく','小学校':'しょうがっこう','年生':'ねんせい',
  '何年生':'なんねんせい','何回':'なんかい','回ごと':'かいごと','全回完了':'ぜんかいかんりょう','完了':'かんりょう',
  '書き順':'かきじゅん','書く順番':'かくじゅんばん','書いて':'かいて','書けた':'かけた','書いた':'かいた','書く':'かく','書き直す':'かきなおす',
  '覚えて':'おぼえて','組み立てよう':'くみたてよう','組み立て':'くみたて','練習':'れんしゅう','お手本':'おてほん',
  '福笑い':'ふくわらい','部品':'ぶひん','位置':'いち','置いた':'おいた','置き直し':'おきなおし','置こう':'おこう','置く':'おく','置かれる':'おかれる','置ける':'おける','置きたい':'おきたい',
  '今は':'いまは','今のお題':'いまのおだい','お題':'おだい','作って':'つくって','作ろう':'つくろう',
  '一時停止中':'いちじていしちゅう','一時停止':'いちじていし','再開':'さいかい','最初から':'さいしょから','最初に':'さいしょに','最初':'さいしょ',
  '再読み込み':'さいよみこみ','再読み':'さいよみ','読み込めませんでした':'よみこめませんでした','読み込んでいます':'よみこんでいます',
  '説明文':'せつめいぶん','説明':'せつめい','音読み':'おんよみ','訓読み':'くんよみ','読み方':'よみかた','読み':'よみ',
  '成り立ち':'なりたち','使う言葉':'つかうことば','言葉':'ことば','使い方':'つかいかた','使えます':'つかえます','使います':'つかいます','使った':'つかった','使う':'つかう','使え':'つかえ',
  '確認':'かくにん','出典':'しゅってん','資料':'しりょう','辞書':'じしょ','収録':'しゅうろく','表示':'ひょうじ',
  '画数':'かくすう','前の画':'まえのかく','次の画':'つぎのかく','最後まで':'さいごまで','最後':'さいご','順番':'じゅんばん',
  '一画ずつ':'いっかくずつ','自動再生':'じどうさいせい','再生':'さいせい','停止':'ていし','戻る':'もどる','戻ります':'もどります','戻す':'もどす',
  '設定':'せってい','保存しました':'ほぞんしました','保存':'ほぞん','速度':'そくど','音量':'おんりょう','調整':'ちょうせい','標準':'ひょうじゅん',
  '画面':'がめん','選ぶ':'えらぶ','選んで':'えらんで','選ぼう':'えらぼう','選んだ':'えらんだ','選択':'せんたく',
  '丁寧':'ていねい','影響':'えいきょう','確かめよう':'たしかめよう','確かめた':'たしかめた','確かめ':'たしかめ',
  '大きく':'おおきく','大きさ':'おおきさ','少しずつ':'すこしずつ','残った':'のこった','残り':'のこり','途中':'とちゅう',
  '手書き':'てがき','左ボタン':'ひだりぼたん','押した':'おした','押す':'おす','押し':'おし','動かす':'うごかす','動かして':'うごかして','動かせない':'うごかせない','動かせる':'うごかせる',
  '緑の枠':'みどりのわく','枠':'わく','上下左右':'じょうげさゆう','斜め':'ななめ','右':'みぎ','左':'ひだり','上':'うえ','下':'した',
  '違う':'ちがう','違い':'ちがい','同じ':'おなじ','全部':'ぜんぶ','終え':'おえ','終わった':'おわった','終える':'おえる','終わる':'おわる',
  '見分け':'みわけ','見て':'みて','見よう':'みよう','見られ':'みられ','見せ':'みせ','形':'かたち','線':'せん','止めた':'とめた','止まる':'とまる',
  '分けて':'わけて','分ける':'わける','次は':'つぎは','次の':'つぎの','次へ':'つぎへ','次':'つぎ','結果':'けっか','点数':'てんすう',
  '合計':'ごうけい','満点':'まんてん','正誤':'せいご','判定':'はんてい','簡易採点':'かんいさいてん','比べる':'くらべる','対応':'たいおう','登録':'とうろく',
  '文字目':'もじめ','文字':'もじ','以前':'いぜん','開いて':'ひらいて','開ける':'ひらける','開く':'ひらく','開放':'かいほう','数える':'かぞえる','数え':'かぞえ','数です':'かずです',
  '重ねて':'かさねて','元の':'もとの','両方':'りょうほう','当てはまる':'あてはまる','確定':'かくてい','部分':'ぶぶん','音が':'おとが','音の':'おとの','音を':'おとを',
  '情報':'じょうほう','詳しく':'くわしく','載せ':'のせ','ために':'ために','続き':'つづき','続け':'つづけ','進め':'すすめ','付く':'つく','付け':'つけ','付いた':'ついた',
  '毎回':'まいかい','表示中':'ひょうじちゅう','準備中':'じゅんびちゅう','日':'にち','間':'あいだ','第':'だい','全':'ぜん','回':'かい','問':'もん','点':'てん','個':'こ','字':'じ','画':'かく'
};
const kanaPattern = new RegExp(Object.keys(KANA_LABELS).sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
function kanaText(text) {
  return text.replace(kanaPattern, word=>KANA_LABELS[word]).replace(/[ァ-ヶ]/g,char=>String.fromCharCode(char.charCodeAt(0)-96));
}
const originalTexts = new WeakMap();
function applyDisplayMode() {
  document.documentElement.dataset.language = settings.language;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node=walker.nextNode())) {
    if (!node.parentElement || node.parentElement.closest('script,style,svg,[data-literal],#prompt,#parts-prompt,.dictionary-reading,.dictionary-vocabulary')) continue;
    const value=node.nodeValue;
    let record=originalTexts.get(node);
    if(!record || record.rendered!==value) record={original:value,rendered:value};
    const translated=settings.language==='kana'?kanaText(record.original):record.original;
    record.rendered=translated;originalTexts.set(node,record);
    if(value!==translated) node.nodeValue=translated;
  }
}
let translatePending=false;
new MutationObserver(()=>{
  if(translatePending)return;translatePending=true;
  queueMicrotask(()=>{translatePending=false;applyDisplayMode();});
}).observe(document.body,{subtree:true,childList:true,characterData:true});

// ゆっくりしたオリジナルのループ曲。外部音源・ネット接続は使わない。
const music = { context:null, master:null, timer:null, step:0, next:0, voices:new Set(), paused:false, started:false };
function stopMusic() {
  clearInterval(music.timer);music.timer=null;
  for(const voice of music.voices){try{voice.stop();}catch{}}
  music.voices.clear();
}
function playTone(midi,start,duration,amplitude,type='sine') {
  const ctx=music.context,osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=type;osc.frequency.value=440*Math.pow(2,(midi-69)/12);
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(amplitude,start+.06);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(music.master);music.voices.add(osc);
  osc.start(start);osc.stop(start+duration+.03);
  osc.onended=()=>{music.voices.delete(osc);osc.disconnect();gain.disconnect();};
}
function scheduleMusic() {
  if(!settings.bgm||music.paused||document.hidden)return;
  const ctx=music.context;
  while(music.next<ctx.currentTime+.45){
    const melody=[72,76,79,76,74,72,67,69,72,76,81,79,76,74,72,67];
    const chordProgression=[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,60]];
    if(music.step%4===0) for(const note of chordProgression[Math.floor(music.step/4)%4])playTone(note,music.next,3.7,.11,'triangle');
    playTone(melody[music.step%melody.length],music.next,1.8,.26);
    music.next+=60/68;music.step++;
  }
}
async function ensureMusic() {
  if(!settings.bgm||music.paused||document.hidden)return;
  try {
    if(!music.context){
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
      music.context=new Context();music.master=music.context.createGain();music.master.connect(music.context.destination);
    }
    music.master.gain.cancelScheduledValues(music.context.currentTime);
    music.master.gain.value=settings.volume/100*.22;
    music.master.gain.setValueAtTime(settings.volume/100*.22,music.context.currentTime);
    await music.context.resume();
    if(!settings.bgm||music.paused||document.hidden)return;
    if(!music.timer){music.started=true;music.next=music.context.currentTime+.05;scheduleMusic();music.timer=setInterval(scheduleMusic,150);}
  } catch { document.getElementById('music-status').textContent='BGMを再生できません。もう一度オンにしてみてください。'; }
}
function setMusicPaused(value){music.paused=value;if(value)stopMusic();else if(music.started)ensureMusic();}
document.addEventListener('pointerdown',()=>{if(settings.bgm)ensureMusic();});
document.addEventListener('keydown',()=>{if(settings.bgm)ensureMusic();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic();else if(music.started)ensureMusic();});
window.addEventListener('pagehide',stopMusic);
function syncSettingsControls(){
  document.getElementById('display-language').value=settings.language;
  document.getElementById('parts-speed').value=settings.speed;
  document.getElementById('speed-value').textContent=`${settings.speed.toFixed(1)}倍`;
  document.getElementById('music-enabled').checked=settings.bgm;
  document.getElementById('music-volume').value=settings.volume;
  document.getElementById('volume-value').textContent=`${settings.volume}%`;
}
document.getElementById('display-language').addEventListener('change',event=>{
  settings.language=event.target.value;saveSettings();applyDisplayMode();
  window.dispatchEvent(new CustomEvent('game-language-change'));
});
document.getElementById('parts-speed').addEventListener('input',event=>{
  settings.speed=Number(event.target.value);document.getElementById('speed-value').textContent=`${settings.speed.toFixed(1)}倍`;saveSettings();
});
document.getElementById('music-enabled').addEventListener('change',event=>{
  settings.bgm=event.target.checked;document.getElementById('music-status').textContent='';saveSettings();
  if(settings.bgm)ensureMusic();else stopMusic();
});
document.getElementById('music-volume').addEventListener('input',event=>{
  settings.volume=Number(event.target.value);document.getElementById('volume-value').textContent=`${settings.volume}%`;saveSettings();
  if(music.master){
    music.master.gain.cancelScheduledValues(music.context.currentTime);
    if(settings.volume===0){music.master.gain.value=0;music.master.gain.setValueAtTime(0,music.context.currentTime);}
    else music.master.gain.setTargetAtTime(settings.volume/100*.22,music.context.currentTime,.05);
  }
});
syncSettingsControls();
