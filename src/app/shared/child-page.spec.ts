import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SetBlock } from '../core/models';
import { ChildSet } from './child-page';

// A made-up activity (not from any real worksheet), played in the preview as the child plays it on the phone.
const ootd: SetBlock = {
  type: 'set',
  title: '#OOTD',
  instruction: 'Write the number in words:',
  answer: 'words',
  items: [
    { n: 1, prompt: '560', answer: 'five hundred sixty', accept: ['five hundred and sixty'] },
    { n: 2, prompt: '24', answer: 'twenty-four' },
  ],
  cheer: 'Kaya mo ito!',
  praise: 'Mahusay!',
};

describe('the child activity in the teacher preview', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ChildSet] }));

  function mount(block: SetBlock): ComponentFixture<ChildSet> {
    const f = TestBed.createComponent(ChildSet);
    f.componentRef.setInput('block', block);
    f.detectChanges();
    return f;
  }
  const text = (f: ComponentFixture<ChildSet>) => (f.nativeElement as HTMLElement).textContent ?? '';
  /** Presses the first button with this text that can be pressed. */
  function press(f: ComponentFixture<ChildSet>, label: string): void {
    const b = [...(f.nativeElement as HTMLElement).querySelectorAll('button')].find((x) => x.textContent?.trim() === label && !x.disabled);
    if (!b) throw new Error(`No button "${label}"`);
    b.click();
    f.detectChanges();
  }

  it('opens on the word of encouragement, then shows the questions', () => {
    const f = mount(ootd);
    expect(text(f)).toContain('Kaya mo ito!');
    expect(text(f)).toContain('2 tanong');
    press(f, 'SIMULAN');
    expect(text(f)).not.toContain('Kaya mo ito!');
    expect((f.nativeElement as HTMLElement).querySelector('.item .q')?.textContent).toBe('560');
  });

  it('an activity without one starts on its first question', () => {
    const f = mount({ ...ootd, cheer: undefined });
    expect(text(f)).not.toContain('SIMULAN');
    expect((f.nativeElement as HTMLElement).querySelector('.item .q')?.textContent).toBe('560');
  });

  it('BURA takes back the last word', () => {
    const f = mount(ootd);
    press(f, 'SIMULAN');
    press(f, 'five');
    press(f, 'hundred');
    press(f, '⌫ BURA');
    const slot = [...(f.nativeElement as HTMLElement).querySelectorAll('.slot .tile')].map((b) => b.textContent?.trim());
    expect(slot).toEqual(['five']);
  });

  it('the checked paper shows what the child gave for a missed item', () => {
    const f = mount(ootd);
    press(f, 'SIMULAN');
    for (const w of ['five', 'hundred', 'sixty']) press(f, w);
    press(f, 'SURIIN');
    expect(text(f)).toContain('✓ Mahusay!');
    press(f, 'TULOY');
    press(f, 'five');
    press(f, 'SURIIN');
    expect(text(f)).toContain('Halos na! Subukan ulit.');
    press(f, 'SUBUKAN ULIT');
    press(f, 'sixty');
    press(f, 'SURIIN');
    expect(text(f)).toContain('Ang tamang sagot:');
    press(f, 'TULOY');
    expect(text(f)).toContain('1 sa 2 tama!');
    expect(text(f)).toContain('Sagot mo: sixty');
  });
});
