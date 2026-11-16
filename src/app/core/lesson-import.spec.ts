import { describe, expect, it } from 'vitest';
import { parseLessonText, planUnit, splitParagraphs, suggestedLessonCount } from './lesson-import';

// A made-up lesson in the AHA template layout (not a real AHA story).
const SAMPLE = `READING FOR GRADES 1-2
Aralin 3

Story

ANG PUSANG SI MIMING
(Sample Author)

Si Miming ay pusang puti. Gusto niya ang isda at ang
mainit na araw sa bintana.

Isang umaga, nawala ang isda sa mesa. Hinanap ito ni
Miming sa kusina.

Nakita niya ang isda sa ilalim ng upuan. Masaya si Miming.

Comprehension Questions

1. Anong kulay ang pusang si Miming?
A) Itim
B) Puti
C) Dilaw

2. Saan nakita ni Miming ang isda?
A) Sa mesa
B) Sa bintana
C) Sa ilalim ng
upuan
D) Sa kusina

---

Key to Correction
1. B (Puti)
2. C (Sa ilalim ng upuan)
`;

describe('parseLessonText', () => {
  const parsed = parseLessonText(SAMPLE);

  it('reads the title, author and label', () => {
    expect(parsed.title).toBe('Ang Pusang Si Miming');
    expect(parsed.author).toBe('Sample Author');
    expect(parsed.label).toBe('Reading for Grades 1-2 · Aralin 3');
  });

  it('joins wrapped lines into paragraphs', () => {
    expect(parsed.paragraphs).toHaveLength(3);
    expect(parsed.paragraphs[0]).toBe('Si Miming ay pusang puti. Gusto niya ang isda at ang mainit na araw sa bintana.');
  });

  it('reads questions, wrapped choices and the answer key', () => {
    expect(parsed.questions).toHaveLength(2);
    expect(parsed.questions[0].choices).toEqual(['Itim', 'Puti', 'Dilaw']);
    expect(parsed.questions[0].answer).toBe(1);
    expect(parsed.questions[1].choices[2]).toBe('Sa ilalim ng upuan');
    expect(parsed.questions[1].answer).toBe(2);
    expect(parsed.warnings).toEqual([]);
  });

  it('warns when the key is missing', () => {
    const noKey = parseLessonText(SAMPLE.split('Key to Correction')[0]);
    expect(noKey.questions.every((q) => q.answer === -1)).toBe(true);
    expect(noKey.warnings.join(' ')).toContain('No answer in the key');
  });

  it('handles pasted text without a "Story" heading', () => {
    const p = parseLessonText('Ang Bola\n\nMay bola si Ana. Pula ang bola.\n\nNilaro nila ang bola.');
    expect(p.title).toBe('Ang Bola');
    expect(p.paragraphs).toHaveLength(2);
  });
});

describe('splitting into short lessons', () => {
  it('keeps story order and evens out the word counts', () => {
    const paras = ['a '.repeat(50), 'b '.repeat(50), 'c '.repeat(50), 'd '.repeat(50)].map((s) => s.trim());
    const groups = splitParagraphs(paras, 2);
    expect(groups.map((g) => g.length)).toEqual([2, 2]);
    expect(groups.flat()).toEqual(paras);
  });

  it('never makes more lessons than paragraphs', () => {
    expect(splitParagraphs(['one', 'two'], 5)).toHaveLength(2);
    expect(suggestedLessonCount(['short'])).toBe(1);
  });

  it('plans lessons plus a checkpoint with the questions', () => {
    const plan = planUnit(parseLessonText(SAMPLE), 2);
    expect(plan.lessons).toHaveLength(2);
    expect(plan.lessons[0].title).toBe('Ang Pusang Si Miming · Part 1');
    expect(plan.checkpoint.questions).toHaveLength(2);
    for (const l of plan.lessons) for (const a of l.practice) expect(a.choices[a.answer]).toBeTruthy();
  });
});
