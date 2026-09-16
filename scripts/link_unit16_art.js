'use strict';
// Bind only reviewed exports; rerunning also picks up the next completed batch.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const queue = JSON.parse(fs.readFileSync(path.join(root, 'docs/unit-art-redesign.json'), 'utf8'));
const entries = queue.entries.filter(e => e.unit === 16 && e.reviewed && e.status === 'shipped');
const byWord = new Map(entries.filter(e => e.ko).map(e => [e.ko, e.folder + '/' + e.slug + '.png']));
const bySlug = new Map(entries.map(e => [e.slug, e.folder + '/' + e.slug + '.png']));
const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const save = (rel, data) => fs.writeFileSync(path.join(root, rel), JSON.stringify(data, null, 2) + '\n');
const quiz = read('worlds/unit16-desk-quiz.json');
const quizWords = {3:'떡국',8:'설날',9:'명절',10:'차례를 지내다',11:'어른들께 세배를 하다',12:'추석'};
for (const q of quiz.questions) {
  const art = byWord.get(quizWords[q.id]);
  if (art) q.art = art;
  if (q.id === 13 && bySlug.has('unit16_yut_mo')) q.art = bySlug.get('unit16_yut_mo');
}
quiz.artNote = 'Reviewed original Hangeul Valley illustrations clarify the holiday context. All thirteen questions keep their original wording and answer keys. The yut-throw pictures have been checked for four sticks and the correct flat-face counts.';
save('worlds/unit16-desk-quiz.json',quiz);
const mappings = {
  'u16-vocab-1':['한복을 입다','윷놀이(를) 하다','어른들께 세배를 하다','차례를 지내다','고향에 가다'],
  'u16-vocab-2':['식혜','한과','떡국','빈대떡','송편'],
  'u16-vocab-3':['청소기를 돌리다',null,'세탁기를 돌리다','방을 닦다'],
  'u16-grammar-1-1':['예매하다','청소를 하다','종이에 쓰다','장을 미리 보다','돈을 찾다'],
  'u16-grammar-1-2':['창문을 열다',null,null,null,null,'냉장고에 넣다'],
  'u16sgk-vocab-1':['차례를 지내다','어른들께 세배를 하다','성묘(를) 하다','명절','음력'],
  'u16sgk-gram-1':['예매하다','미리 사다','창문을 열다'],
  'u16sgk-speak-1':['고향에 내려가다','예매하다','서두르다','떡국','끓이다'],
  'u16sgk-speak-2':['초대하다','송편','가르쳐 주다','도와주다','재료를 미리 사다'],
  'u16sgk-listen-1':['서울역','추석','도와 드리다'],
  'u16sgk-listen-2':[null,null,'고양이를 맡기다','잘 봐 주다'],
  'u16sgk-read-1':['농사','소원을 빌다','추수하다','나눠 먹다'],
  'u16sgk-culture-1':['전통','강강술래','전통 놀이나 노래'],
  'u16sgk-pron-1':['유음화','설날','일 년','사물놀이 공연']
};
for (const kind of ['workbook','textbook']) {
  const rel = 'worlds/unit16-'+kind+'.json';
  const bank = read(rel);
  const localeRel = 'locales/vi/' + rel;
  const locale = read(localeRel);
  const note = (ex, english, vietnamese) => {
    delete locale.entries['noteEn|' + ex.noteEn];
    ex.noteEn = english;
    locale.entries['noteEn|' + english] = vietnamese;
  };
  for (const ex of bank.exercises) ex.items.forEach((item,i) => {
    const art = byWord.get(mappings[ex.id]?.[i]);
    if (art) item.art = art;
    if (ex.id === 'u16sgk-task-1' && (i===3 || i===4)) {
      const yut = bySlug.get(i===3?'unit16_yut_gae':'unit16_yut_mo');
      if(yut) item.art=yut;
    }
  });
  if (kind === 'textbook') {
    const vocab = bank.exercises.find(e => e.id === 'u16sgk-vocab-1');
    const guideWords = ['한복을 입다','고향에 가다','세배(를) 하다','성묘(를) 하다','차례를 지내다','윷놀이(를) 하다','떡국','빈대떡','송편','한과','식혜'];
    vocab.visualGuide = guideWords.filter(ko => byWord.has(ko)).map(ko => ({ko,art:byWord.get(ko)}));
    note(vocab,
      'Review the eleven original illustrations of holiday activities and foods, then complete sentences drawn from the textbook speaking and reading sections. The sentence practice preserves the existing answer keys.',
      'Ôn mười một hình minh hoạ hoạt động và món ăn ngày lễ, sau đó hoàn thành các câu từ phần nói và đọc trong giáo trình. Phần luyện câu giữ nguyên đáp án hiện có.');
    const task = bank.exercises.find(e => e.id === 'u16sgk-task-1');
    const throws = [['do','도 · 1칸'],['gae','개 · 2칸'],['geol','걸 · 3칸'],['yut','윷 · 4칸'],['mo','모 · 5칸']];
    task.visualGuide = throws.filter(([slug]) => bySlug.has('unit16_yut_'+slug)).map(([slug,ko]) => ({ko,art:bySlug.get('unit16_yut_'+slug)}));
    if (task.visualGuide.length === 5) note(task,
      'Review the five illustrated throws, then complete the rules and name the throws that move two and five spaces. Each picture shows four sticks; pale faces are flat and darker faces are rounded. These original illustrations accompany the textbook rules on p.174.',
      'Xem năm kết quả tung gậy minh hoạ, sau đó hoàn thành luật chơi và gọi tên kết quả đi hai và năm ô. Mỗi hình có bốn gậy; mặt sáng phẳng, mặt sẫm cong. Bộ hình mới minh hoạ luật chơi ở trang 174 của giáo trình.');
    const listen = bank.exercises.find(e => e.id === 'u16sgk-listen-2');
    const choiceArt = {hand:byWord.get('고양이를 맡기다'),call:byWord.get('연락(을) 하다'),vet:bySlug.get('unit16_cat_vet')};
    listen.items[1].choices.forEach(c => { if(choiceArt[c.id]) c.art=choiceArt[c.id]; });
    if (Object.values(choiceArt).every(Boolean)) note(listen,
      'Listen and choose what Nana will do tomorrow. Question 2 pairs each Korean option with an original illustration: handing the cat over, calling, or visiting a vet. The textbook answer keys are preserved. Rows 3 and 4 practise the lines that explain the answers; row 4 plays its own clip.',
      'Nghe và chọn việc Nana sẽ làm ngày mai. Câu 2 có ba lựa chọn tiếng Hàn kèm hình minh hoạ: giao mèo, gọi điện hoặc đến bác sĩ thú y. Giữ nguyên đáp án giáo trình. Câu 3 và 4 luyện các lời thoại giải thích đáp án; câu 4 phát đoạn âm thanh riêng.');
  }
  bank.artNote = 'Reviewed original Hangeul Valley illustrations are linked to the matching vocabulary and exercise rows. Original answer keys and audio are preserved. Vocabulary illustration coverage: '+byWord.size+'/133.';
  bank.artNote += kind === 'workbook' ? ' The floor-cleaning row keeps 닦았어요 from the printed answer key on p.207.' : ' Illustrated reference pages: 어휘 (holiday activities and food), 과제 (five yut throws), and 듣기 2 (three cat-care choices).';
  save(rel,bank);
  save(localeRel,locale);
}
console.log(byWord.size+'/133 vocabulary illustrations linked.');
