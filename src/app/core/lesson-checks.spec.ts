import { describe, expect, it } from 'vitest';
import { failingChecks, lessonIssues, packChecks, suggestQuestions, suggestSubject, suggestTitle } from './lesson-checks';
import { Lesson } from './models';

const base = (over: Partial<Lesson> = {}): Lesson => ({
  id: 'lsn_1',
  title: 'Mga Numero',
  level: 'Letter',
  language: 'Filipino',
  objective: '',
  minutes: 6,
  pages: [
    { id: 'p1', text: 'Isa, dalawa, tatlo.', audioId: 'a1' },
    { id: 'p2', text: 'Apat at lima.', audioId: 'a2' },
  ],
  activities: [{ id: 'q1', prompt: 'Alin ang tatlo?', choices: ['3', '5'], answer: 0 }],
  status: 'draft',
  version: 1,
  assignedLevels: ['Letter'],
  classIds: ['cls_a'],
  subject: 'math',
  createdAt: '2026-11-25T00:00:00Z',
  updatedAt: '2026-11-25T00:00:00Z',
  ...over,
});

describe('what is missing in a lesson', () => {
  it('a complete lesson has nothing missing', () => {
    expect(lessonIssues(base(), 1000, true)).toEqual([]);
    expect(packChecks(base(), 1000).every((c) => c.ok)).toBe(true);
  });

  it('lists every page without a voice, with where it is and how to jump there', () => {
    const l = base({ pages: [{ id: 'p1', text: 'Isa, dalawa, tatlo.' }, { id: 'p2', text: 'Apat at lima.', audioId: 'a2' }, { id: 'p3', text: '' }] });
    const voice = lessonIssues(l, 1000, true).filter((i) => i.check === 'voice');
    expect(voice.map((i) => i.target)).toEqual(['pg-p1', 'pg-p3']);
    expect(voice[0].where).toBe('Page 1 · “Isa, dalawa, tatlo.”');
    expect(voice[0].required).toBe(false);
    expect(voice[0].focus).toBe('pl-voice-recorder button');
    const text = lessonIssues(l, 1000, true).find((i) => i.check === 'text')!;
    expect(text.fix).toBe('remove-page');
  });

  it('a class, complete questions and the 2 MB limit are needed; the rest can wait', () => {
    const l = base({ classIds: [], activities: [{ id: 'q1', prompt: 'Alin?', choices: ['3', ''], answer: 0 }], title: '', subject: undefined });
    const issues = lessonIssues(l, 3 * 1024 * 1024, false);
    expect(issues.filter((i) => i.required).map((i) => i.check)).toEqual(['activities', 'class', 'size']);
    expect(issues.find((i) => i.check === 'class')!.fix).toBe('ask-admin');
    expect(issues.find((i) => i.check === 'activities')!.what).toBe('A choice is empty');
    expect(issues.filter((i) => !i.required).map((i) => i.check)).toEqual(['title', 'subject']);
  });

  it('a checkpoint needs questions the teacher has checked; suggested ones are listed to check', () => {
    const empty = base({ kind: 'checkpoint', activities: [] });
    expect(failingChecks(empty, 1000)).toEqual(['checkpoint']);
    const suggested = base({ kind: 'checkpoint', activities: [{ id: 'q1', prompt: 'Alin ang tatlo?', choices: ['3', '5'], answer: 0, auto: true }] });
    expect(failingChecks(suggested, 1000)).toEqual(['checkpoint', 'review']);
    expect(lessonIssues(suggested, 1000, true).find((i) => i.check === 'review')!.fix).toBe('accept-question');
  });
});

describe('fixes', () => {
  it('suggests a title from the unit, or from page 1', () => {
    expect(suggestTitle(base({ title: '', unitIndex: 1 }), 'Math KS1')).toBe('Math KS1 · Part 2');
    expect(suggestTitle(base({ title: '', kind: 'checkpoint' }), 'Math KS1')).toBe('Math KS1 · Checkpoint');
    expect(suggestTitle(base({ title: '' }))).toBe('Isa, dalawa, tatlo');
  });

  it('suggests a subject from the lesson’s words', () => {
    expect(suggestSubject(base({ subject: undefined }))).toBe('math');
    expect(suggestSubject(base({ subject: undefined, title: 'Ang titik A', pages: [{ id: 'p', text: 'Ang titik A at ang letra B.' }] }))).toBe('alpabasa');
    expect(suggestSubject(base({ subject: undefined, title: 'Si Mimi', pages: [{ id: 'p', text: 'Si Mimi ay pusa.' }] }))).toBe('pagbasa');
  });

  it('suggests checkpoint questions from the story, each with a right answer among its choices', () => {
    const qs = suggestQuestions([
      'Si Lino ay may dilaw na payong. Umulan nang malakas sa bayan.',
      'Ibinahagi niya ang payong kay Nena. Masaya silang naglakad pauwi.',
    ]);
    expect(qs.length).toBeGreaterThanOrEqual(2);
    for (const q of qs) {
      expect(q.auto).toBe(true);
      expect(q.choices.length).toBeGreaterThanOrEqual(2);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.prompt).toContain('____');
      expect(q.prompt.toLowerCase()).not.toContain(q.choices[q.answer].toLowerCase());
    }
  });

  it('makes number questions when the story has numbers', () => {
    const qs = suggestQuestions(['May 3 mangga at 7 saging sa mesa.']);
    expect(qs[0]).toMatchObject({ prompt: 'Alin ang mas malaki?', choices: ['3', '7'], answer: 1 });
    expect(qs[1].prompt).toBe('Anong numero ang kasunod ng 7?');
    expect(qs[1].choices[qs[1].answer]).toBe('8');
  });
});
