import { describe, expect, it } from 'vitest';
import { SUBJECTS, SUBJECT_KEYS, detectLanguage, subjectOf, suggestSubject, themeVars } from './subjects';

const FIL = 'Isang araw, naglakad si Lito sa bukid. Nakita niya ang mga ibon at ang malaking puno. Masaya siya at umuwi sa kanilang bahay.';
const EN = 'One day, Ollie the owl woke up in the big tree. He looked at the sun and the birds. It was a happy day for him and his friends.';

describe('subject worlds', () => {
  it('has the same ten worlds as the mobile app and the server', () => {
    expect(SUBJECT_KEYS).toEqual(['english', 'pagbasa', 'alpabasa', 'math', 'science', 'gmrc', 'makabansa', 'arts', 'digital', 'general']);
    expect(SUBJECTS.map((s) => s.key)).toEqual([...SUBJECT_KEYS]);
    expect(subjectOf('pagbasa').hero).toBe('hut');
    expect(subjectOf('math').on).toBe('#3D2A00'); // dark text on the gold
  });

  it('shows lessons with no subject in General, today’s look', () => {
    expect(subjectOf(undefined).key).toBe('general');
    expect(subjectOf('cooking').key).toBe('general');
  });

  it('gives the child preview the world’s colours and title font', () => {
    const v = themeVars(subjectOf('english'));
    expect(v['--c-teal']).toBe('#2B5FC1');
    expect(v['--c-tint']).toBe('#EAF1FD');
    expect(v['--c-title']).toContain('Fraunces');
    expect(themeVars(subjectOf('pagbasa'))['--c-title']).toContain('Baloo 2');
  });
});

describe('suggesting a subject for an uploaded file', () => {
  it('tells Filipino and English stories apart', () => {
    expect(detectLanguage(FIL)).toBe('Filipino');
    expect(detectLanguage(EN)).toBe('English');
    expect(detectLanguage('Mimi')).toBeNull();
  });

  it('puts a reading story in the reading world of its language', () => {
    expect(suggestSubject({ title: 'Hating Kapatid', text: FIL }).key).toBe('pagbasa');
    expect(suggestSubject({ title: 'Ollie Wakes Up', text: EN }).key).toBe('english');
    expect(suggestSubject({ title: 'Ang Pista', text: 'x', language: 'Cebuano' }).reason).toBe('The story is in Cebuano.');
  });

  it('follows a subject named in the file’s heading or label', () => {
    const math = suggestSubject({ title: 'Barya-barya', label: 'Matematika 1 · Aralin 3', text: FIL });
    expect(math).toEqual({ key: 'math', reason: 'The file says “Matematika”.' });
    expect(suggestSubject({ title: 'Ang Halaman', label: 'Science and Health · Grade 2', text: FIL }).key).toBe('science');
    expect(suggestSubject({ title: 'Po at Opo', label: 'GMRC 1', text: FIL }).key).toBe('gmrc');
    expect(suggestSubject({ title: 'Kulay at Indak', label: 'MAPEH', text: FIL }).key).toBe('arts');
  });

  it('falls back to General when nothing is known', () => {
    expect(suggestSubject({ title: 'Untitled', text: 'Mimi' }).key).toBe('general');
  });
});
