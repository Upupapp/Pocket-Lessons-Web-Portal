import { describe, expect, it } from 'vitest';
import { TextItem, isRightAnswer, keyAnswer, normalNumber, normalWords, numberToWords, parseMathLesson, rowsFromPages, tilesFor, wordsToNumber } from './math-import';

// A made-up lesson in the layout of AHA's Math lesson PDFs: section names on the left (x 77), content on the
// right (x 175), list numbers indented, icons as their own pieces, the same footer on every page.
type L = [label: string, text: string, opts?: { x?: number; gap?: number; icon?: string }];

function page(lines: L[], top = 700): TextItem[] {
  const items: TextItem[] = [];
  let y = top;
  for (const [label, text, o] of lines) {
    y -= o?.gap ?? 12;
    if (label) items.push({ str: label, x: 77, y, w: label.length * 5.5, h: 10 });
    let x = o?.x ?? 175;
    if (o?.icon) {
      items.push({ str: o.icon, x, y, w: 12, h: 10 });
      x += 15;
    }
    if (text) items.push({ str: text, x, y, w: text.length * 5, h: 10 });
  }
  items.push({ str: 'Sample Center - Family School', x: 72, y: 40, w: 160, h: 8 });
  items.push({ str: 'Reading for Grades 1-2 - Lesson 3', x: 398, y: 40, w: 130, h: 8 });
  return items;
}

const pages: TextItem[][] = [
  [
    { str: 'MATH FOR KEY STAGE 1 (GRADES 1 - 3)', x: 190, y: 740, w: 230, h: 12 },
    { str: 'Lesson 03: Counting Coins', x: 230, y: 724, w: 150, h: 12 },
    ...page([
      ['Gawain', 'Hello, Achiever! Today we count coins.'],
      ['Checklist', ''],
      ['', 'Here is our list:', { gap: 24 }],
      ['', '\u0000 Magic Word', { gap: 24 }],
      ['', '\u0000 Bata Break'],
      ['', '\u0000 Kwentalakayan'],
      ['', '\u0000 #OOTD: Output of the Day'],
      ['', '\u0000 Pabaong Ensayo'],
      ['', '\u0000 Hugot of the Day'],
      ['Magic Word', 'Teacher has two new words for you.', { gap: 30 }],
      ['', 'Coin - A small round piece of money.', { gap: 24, icon: '💠' }],
      ['', 'Peso - Our money in the Philippines.', { icon: '💠' }],
      ['Bata Break', 'Mia sells pandesal at the corner store.', { gap: 30 }],
      ['', 'Help Mia write the prices:', { gap: 24, icon: '\u{F073C}' }],
      ['', '1. Small bread - Twelve Pesos'],
      ['', '2. Big bread - Twenty Pesos'],
      ['', 'Mayroon kayong 02 minuto para sagutan ito.', { gap: 24, icon: '⏱' }],
      ['', 'Time’s Up!', { gap: 24, icon: '\u{F0697}' }],
    ]),
  ],
  page([
    ['', 'Key to Correction:'],
    ['', 'Mahusay!', { gap: 24, icon: '🌟' }],
    ['', '1. Small bread - Twelve Pesos - P 12.00', { gap: 24 }],
    ['', '2. Big bread - Twenty Pesos - P 20.00'],
    ['', 'Ilan ang nakuha niyong tamang sagot? Ano man ang nakuha niyo,', { gap: 24 }],
    ['', '“GOOD JOB!” Alam kong ginawa niyo ang inyong best effort'],
    ['Kwentalakayan', 'Ito ang ating aralin.', { gap: 30 }],
    ['', 'Remember:', { gap: 24, icon: '❗' }],
    ['', 'A number has a word name.', { gap: 24, icon: '◘' }],
    ['', 'Coins have numbers on them.', { icon: '◘' }],
    ['', 'Word Names for Tens', { gap: 24, icon: '🔰' }],
    ['', '10 - Ten', { gap: 24 }],
    ['', '20 - Twenty'],
    ['', 'Word Names for Tens', { gap: 24, icon: '🔰' }],
    ['', 'Write the tens digit.', { gap: 24, icon: '‣' }],
    ['', 'Isulat ang tens digit.'],
    ['', '10, 20, 30', { gap: 24, icon: '➡' }],
    ['', 'COMBINE. Put a hyphen. Pagsamahin. Maglagay ng hyphen.', { gap: 24, icon: '‣' }],
    ['', 'EXAMPLES:', { gap: 24 }],
    ['', '21 - twenty - one'],
  ]),
  page([
    ['OOTD', 'Let us practise.'],
    ['', 'Write the word form of the ff. numbers:', { gap: 24, icon: '🔰' }],
    ['', '1. 12', { x: 193 }],
    ['', '2. 405', { x: 193 }],
    ['', 'Achiever, kaya mo ito.', { gap: 24 }],
    ['', 'Key to correction', { gap: 24 }],
    ['', '1. twelve', { x: 193 }],
    ['', '2. four hundred and six', { x: 193 }],
    ['Pabaong Ensayo', 'Write the word form of the following numbers:', { gap: 30, icon: '🔰' }],
    ['', '1. 31', { x: 193 }],
    ['', '2. 250', { x: 193 }],
    ['', 'Write the number form of the following numbers:', { gap: 24, icon: '🔰' }],
    ['', '1. Seven', { x: 193 }],
    ['', '2. Sixty-One', { x: 193 }],
    ['', 'KEY TO CORRECTION', { gap: 24 }],
    ['', 'Write the word form of the following numbers:', { gap: 24 }],
    ['', '1. 31 - thirty-one', { x: 193 }],
    ['', '2. 250 - two hundred fifty (or two hundred and', { x: 193 }],
    ['', 'fifty)', { x: 211 }],
    ['', 'Write the number form of the following numbers:', { gap: 24 }],
    ['', '1. Seven - 7', { x: 193 }],
  ]),
  page([['', '2. Sixty-One - 61', { x: 193 }]]),
];

describe('Math lesson PDF reader', () => {
  const lesson = parseMathLesson(pages, (p) => `${p}_x`)!;
  const sets = lesson.parts.flatMap((p) => p.pages.flatMap((pg) => pg.blocks ?? [])).filter((b) => b.type === 'set');

  it('finds the title, lesson number and label, and ignores the running footer', () => {
    expect(lesson.title).toBe('Counting Coins');
    expect(lesson.lessonNo).toBe(3);
    expect(lesson.label).toBe('Math for Key Stage 1 (Grades 1–3)');
    const all = JSON.stringify(lesson.parts);
    expect(all).not.toContain('Family School');
  });

  it('reads the checklist as the lesson route and warns about a missing section', () => {
    expect(lesson.route).toEqual(['Magic Word', 'Bata Break', 'Kwentalakayan', '#OOTD: Output of the Day', 'Pabaong Ensayo', 'Hugot of the Day']);
    expect(lesson.warnings.some((w) => w.includes('"Hugot of the Day" is in the checklist'))).toBe(true);
  });

  it('turns the Magic Word bullets into word cards', () => {
    const terms = lesson.parts[0].pages.flatMap((p) => p.blocks ?? []).find((b) => b.type === 'terms');
    expect(terms).toEqual({ type: 'terms', items: [{ term: 'Coin', meaning: 'A small round piece of money.' }, { term: 'Peso', meaning: 'Our money in the Philippines.' }] });
  });

  it('fills each activity from its key: numbers for prices, words for word forms, "(or …)" as another accepted answer', () => {
    expect(sets.map((s) => (s.type === 'set' ? [s.title, s.answer, s.items.map((i) => i.answer)] : null))).toEqual([
      ['Bata Break', 'number', ['12', '20']],
      ['#OOTD', 'words', ['twelve', 'four hundred and six']],
      ['Pabaong Ensayo · Part A', 'words', ['thirty-one', 'two hundred fifty']],
      ['Pabaong Ensayo · Part B', 'number', ['7', '61']],
    ]);
    const partA = sets[2];
    expect(partA.type === 'set' && partA.items[1].accept).toEqual(['two hundred and fifty']);
    expect(lesson.questions).toBe(8);
    expect(lesson.answered).toBe(8);
  });

  it('checks the key by itself and flags a wrong answer', () => {
    expect(lesson.verified).toBe(7);
    expect(lesson.warnings.some((w) => w.includes('item 2') && w.includes('four hundred and six') && w.includes('405'))).toBe(true);
  });

  it('keeps bullets, number lists, steps with their Filipino line, and examples as their own blocks', () => {
    const blocks = lesson.parts[1].pages.flatMap((p) => p.blocks ?? []);
    expect(blocks.find((b) => b.type === 'bullets')).toEqual({ type: 'bullets', title: undefined, items: ['A number has a word name.', 'Coins have numbers on them.'] });
    expect(blocks.find((b) => b.type === 'numbers')).toEqual({ type: 'numbers', title: 'Word Names for Tens', items: [{ n: '10', word: 'Ten' }, { n: '20', word: 'Twenty' }] });
    const steps = blocks.find((b) => b.type === 'steps');
    expect(steps).toEqual({
      type: 'steps',
      title: undefined,
      items: [
        { text: 'Write the tens digit.', note: 'Isulat ang tens digit.', chips: ['10', '20', '30'] },
        { text: 'COMBINE. Put a hyphen.', note: 'Pagsamahin. Maglagay ng hyphen.' },
      ],
    });
    expect(blocks.find((b) => b.type === 'examples')).toEqual({ type: 'examples', title: 'Examples', items: [{ n: '21', word: 'twenty-one' }] });
  });

  it('leaves out classroom-only lines and keeps the encouragement for the child', () => {
    expect(lesson.leftOut.some((l) => l.includes('minuto'))).toBe(true);
    expect(lesson.leftOut.some((l) => l.startsWith('Ilan ang nakuha'))).toBe(true);
    expect(JSON.stringify(lesson.parts)).not.toContain('minuto');
    const ootd = sets[1];
    expect(ootd.type === 'set' && ootd.cheer).toBe('Achiever, kaya mo ito.');
    expect(sets[0].type === 'set' && sets[0].praise).toBe('Mahusay!');
  });

  it('warns about a footer from another subject', () => {
    expect(lesson.warnings.some((w) => w.includes('The footer says "Reading for Grades 1-2 - Lesson 3"'))).toBe(true);
  });

  it('splits the lesson into short phone lessons in the routine order', () => {
    expect(lesson.parts.map((p) => p.name)).toEqual(['Magic Word at Bata Break', 'Kwentalakayan', '#OOTD: Output of the Day', 'Pabaong Ensayo']);
    expect(lesson.parts[0].title).toBe('Counting Coins · Magic Word at Bata Break');
    for (const p of lesson.parts) for (const pg of p.pages) expect(pg.text.trim()).not.toBe('');
  });

  it('does not take other PDFs for a Math lesson', () => {
    expect(rowsFromPages([[{ str: 'Story', x: 100, y: 700, w: 40, h: 10 }, { str: 'Once upon a time.', x: 100, y: 680, w: 90, h: 10 }]])).toEqual([]);
    expect(parseMathLesson([[{ str: 'Hello', x: 100, y: 700, w: 40, h: 10 }]])).toBeNull();
  });
});

describe('numbers and words', () => {
  it('writes numbers as words, with "and" after the hundreds', () => {
    expect(numberToWords(5)).toBe('five');
    expect(numberToWords(15)).toBe('fifteen');
    expect(numberToWords(80)).toBe('eighty');
    expect(numberToWords(538)).toBe('five hundred and thirty-eight');
    expect(numberToWords(305)).toBe('three hundred and five');
    expect(numberToWords(200)).toBe('two hundred');
  });

  it('reads words as numbers, ignoring words after the number', () => {
    expect(wordsToNumber('Five Hundred and Sixty')).toBe(560);
    expect(wordsToNumber('Thirty-five Pesos')).toBe(35);
    expect(wordsToNumber('One')).toBe(1);
    expect(wordsToNumber('Pesos')).toBeNull();
  });

  it('compares answers the way the phone checks them', () => {
    expect(normalNumber('P 35.00')).toBe('35');
    expect(normalNumber('₱1,200')).toBe('1200');
    expect(normalNumber('thirty')).toBe('');
    expect(normalWords('Twenty - Eight')).toBe(normalWords('twenty-eight'));
    expect(normalWords('five hundred and thirty-eight')).toBe(normalWords('Five Hundred Thirty-Eight'));
  });

  it('checks a child answer against the key and the other accepted answers', () => {
    const item = { n: 6, prompt: '538', answer: 'five hundred thirty-eight', accept: ['five hundred and thirty-eight'] };
    expect(isRightAnswer('words', item, 'Five Hundred and Thirty - Eight')).toBe(true);
    expect(isRightAnswer('words', item, 'five hundred thirty-nine')).toBe(false);
    expect(isRightAnswer('words', item, '')).toBe(false);
    expect(isRightAnswer('number', { n: 1, prompt: 'Thirty-five Pesos', answer: '35' }, '035')).toBe(true);
    expect(isRightAnswer('number', { n: 1, prompt: 'Thirty-five Pesos', answer: '35' }, '53')).toBe(false);
  });

  it('gives word tiles with every word of the answer, the same order every time', () => {
    const items = [
      { n: 1, prompt: '26', answer: 'twenty-six' },
      { n: 2, prompt: '538', answer: 'five hundred and thirty-eight' },
      { n: 3, prompt: '17', answer: 'seventeen' },
    ];
    const tiles = tilesFor(items, 1);
    for (const w of ['five', 'hundred', 'and', 'thirty-eight']) expect(tiles).toContain(w);
    expect(tiles.length).toBeGreaterThan(4);
    expect(tilesFor(items, 1)).toEqual(tiles);
  });

  it('drops the repeated question from a key line', () => {
    expect(keyAnswer('26', '26 - twenty-six')).toEqual({ answer: 'twenty-six', accept: [] });
    expect(keyAnswer('Four', 'Four - 4')).toEqual({ answer: '4', accept: [] });
    expect(keyAnswer('5', 'five')).toEqual({ answer: 'five', accept: [] });
    expect(keyAnswer('108', '108 - one hundred eight (or one hundred and eight)')).toEqual({ answer: 'one hundred eight', accept: ['one hundred and eight'] });
  });
});
