import { Component, input, output } from '@angular/core';
import { ANSWER_TYPES } from '../../core/math-import';
import { Block } from '../../core/models';

type Loose = Record<string, unknown> & { items?: Record<string, unknown>[] };

/**
 * Editing a page built from blocks (AHA Math lessons): each block in its own box, labelled with how the phone
 * shows it. Lists get one field per item; a numbered activity gets a table with the answer key.
 */
@Component({
  selector: 'pl-block-editor',
  template: `
    @for (b of blocks(); track $index; let k = $index) {
      <div class="block">
        @switch (b.type) {
          @case ('text') {
            <div class="bh"><i>¶</i>Text<span class="hint">On pad-paper lines</span></div>
            <textarea class="textarea" rows="2" [value]="b.text" (input)="set(k, 'text', val($event))" aria-label="Text"></textarea>
          }
          @case ('route') {
            <div class="bh"><i>☑</i>Lesson route<span class="hint">The parts of the lesson, in order</span></div>
            @for (r of b.items; track $index; let i = $index) {
              <div class="row one"><input class="input" [value]="r" (input)="setItem(k, i, null, val($event))" [attr.aria-label]="'Route step ' + (i + 1)" /><button type="button" class="icon" (click)="remove(k, i)" aria-label="Remove">✕</button></div>
            }
            <button type="button" class="add" (click)="add(k, '')">+ Add a part</button>
          }
          @case ('terms') {
            <div class="bh"><i>Aa</i>Term + meaning<span class="hint">Shown as word cards</span></div>
            @for (t of b.items; track $index; let i = $index) {
              <div class="row two">
                <input class="input b" [value]="t.term" (input)="setItem(k, i, 'term', val($event))" aria-label="Term" />
                <input class="input" [value]="t.meaning" (input)="setItem(k, i, 'meaning', val($event))" aria-label="Meaning" />
                <button type="button" class="icon" (click)="remove(k, i)" aria-label="Remove term">✕</button>
              </div>
            }
            <button type="button" class="add" (click)="add(k, { term: '', meaning: '' })">+ Add term</button>
          }
          @case ('bullets') {
            <div class="bh"><i>•</i>Bullet list<span class="hint">Shown as point cards</span></div>
            <input class="input ttl" [value]="b.title ?? ''" (input)="set(k, 'title', val($event) || undefined)" placeholder="Heading (optional)" aria-label="Heading" />
            @for (t of b.items; track $index; let i = $index) {
              <div class="row one"><b class="mark">•</b><input class="input" [value]="t" (input)="setItem(k, i, null, val($event))" aria-label="Bullet" /><button type="button" class="icon" (click)="remove(k, i)" aria-label="Remove bullet">✕</button></div>
            }
            <button type="button" class="add" (click)="add(k, '')">+ Add bullet</button>
          }
          @case ('steps') {
            <div class="bh"><i>1.</i>Numbered steps<span class="hint">Shown as a step path · one step at a time</span></div>
            <input class="input ttl" [value]="b.title ?? ''" (input)="set(k, 'title', val($event) || undefined)" placeholder="Heading (optional)" aria-label="Heading" />
            @for (s of b.items; track $index; let i = $index) {
              <div class="step">
                <b class="num">{{ i + 1 }}</b>
                <div class="fields">
                  <input class="input" [value]="s.text" (input)="setItem(k, i, 'text', val($event))" aria-label="Step" />
                  <input class="input" [value]="s.note ?? ''" (input)="setItem(k, i, 'note', val($event) || undefined)" placeholder="Filipino line (optional)" aria-label="Filipino line" />
                  <input class="input" [value]="(s.chips ?? []).join(', ')" (input)="setChips(k, i, val($event))" placeholder="Numbers to show, e.g. 10, 20, 30 (optional)" aria-label="Numbers" />
                </div>
                <button type="button" class="icon" (click)="remove(k, i)" aria-label="Remove step">✕</button>
              </div>
            }
            <button type="button" class="add" (click)="add(k, { text: '' })">+ Add step</button>
          }
          @case ('numbers') {
            <div class="bh"><i>12</i>Number list<span class="hint">Shown as number cards</span></div>
            <input class="input ttl" [value]="b.title ?? ''" (input)="set(k, 'title', val($event) || undefined)" placeholder="Heading (optional)" aria-label="Heading" />
            <div class="pairs">
              @for (p of b.items; track $index; let i = $index) {
                <span class="pair"><input class="input n" [value]="p.n" (input)="setItem(k, i, 'n', val($event))" aria-label="Number" /><input class="input" [value]="p.word" (input)="setItem(k, i, 'word', val($event))" aria-label="Word" /><button type="button" class="icon" (click)="remove(k, i)" aria-label="Remove">✕</button></span>
              }
            </div>
            <button type="button" class="add" (click)="add(k, { n: '', word: '' })">+ Add number</button>
          }
          @case ('examples') {
            <div class="bh"><i>→</i>Worked examples<span class="hint">Number → word form</span></div>
            <input class="input ttl" [value]="b.title ?? ''" (input)="set(k, 'title', val($event) || undefined)" placeholder="Heading (optional)" aria-label="Heading" />
            <div class="pairs">
              @for (p of b.items; track $index; let i = $index) {
                <span class="pair"><input class="input n" [value]="p.n" (input)="setItem(k, i, 'n', val($event))" aria-label="Number" /><input class="input" [value]="p.word" (input)="setItem(k, i, 'word', val($event))" aria-label="Word form" /><button type="button" class="icon" (click)="remove(k, i)" aria-label="Remove">✕</button></span>
              }
            </div>
            <button type="button" class="add" (click)="add(k, { n: '', word: '' })">+ Add example</button>
          }
          @case ('set') {
            @let s = b;
            <div class="bh"><i>✎</i>Numbered activity<span class="hint">Checked on the phone against your key</span></div>
            <div class="set-head">
              <input class="input b" [value]="s.title" (input)="set(k, 'title', val($event))" aria-label="Activity name" />
              <label class="ans">Child answers with
                <select class="select" [value]="s.answer" (change)="set(k, 'answer', val($event))">
                  @for (a of answerTypes; track a.key) { <option [value]="a.key">{{ a.label }}</option> }
                </select>
              </label>
            </div>
            <input class="input" [value]="s.instruction" (input)="set(k, 'instruction', val($event))" placeholder="Instruction, e.g. Write the word form of the numbers:" aria-label="Instruction" />
            <input class="input" [value]="s.cheer ?? ''" (input)="set(k, 'cheer', val($event) || undefined)" placeholder="Encouragement shown at the start (optional)" aria-label="Encouragement" />
            <table class="keys">
              <thead><tr><th>No.</th><th>Shown to the child</th><th>Correct answer</th><th>Also accept (separate with ;)</th><th></th></tr></thead>
              <tbody>
                @for (it of s.items; track $index; let i = $index) {
                  <tr [class.empty]="!it.answer.trim()">
                    <td class="n">{{ it.n }}.</td>
                    <td><input class="input b" [value]="it.prompt" (input)="setItem(k, i, 'prompt', val($event))" [attr.aria-label]="'Item ' + it.n" /></td>
                    <td><input class="input" [value]="it.answer" (input)="setItem(k, i, 'answer', val($event))" [attr.aria-label]="'Answer to item ' + it.n" placeholder="Answer" /></td>
                    <td><input class="input" [value]="(it.accept ?? []).join('; ')" (input)="setAccept(k, i, val($event))" [attr.aria-label]="'Other answers for item ' + it.n" placeholder="—" /></td>
                    <td><button type="button" class="icon" (click)="remove(k, i)" [attr.aria-label]="'Remove item ' + it.n">✕</button></td>
                  </tr>
                }
              </tbody>
            </table>
            <button type="button" class="add" (click)="addItem(k)">+ Add item</button>
          }
        }
      </div>
    }
  `,
  styles: `
    :host { display: grid; gap: 10px; }
    .block { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; background: var(--surface-2); display: grid; gap: 7px; }
    .bh { display: flex; align-items: center; gap: 8px; font: 700 11.5px var(--font); letter-spacing: .07em; text-transform: uppercase; color: var(--icon); }
    .bh i { font-style: normal; text-transform: none; letter-spacing: 0; color: var(--accent); font-size: 13px; min-width: 18px; }
    .bh .hint { margin-left: auto; text-transform: none; letter-spacing: 0; font-weight: 400; color: var(--muted); font-size: 12px; }
    .input { min-height: 36px; padding: 6px 10px; font-size: 14px; }
    .input.b { font-weight: 700; }
    .ttl { font-weight: 700; }
    .textarea { min-height: 64px; }
    .row { display: grid; gap: 8px; align-items: center; }
    .row.one { grid-template-columns: auto 1fr 32px; }
    .row.one:not(:has(.mark)) { grid-template-columns: 1fr 32px; }
    .row.two { grid-template-columns: 200px 1fr 32px; }
    .mark { color: var(--accent); width: 14px; text-align: center; }
    .step { display: grid; grid-template-columns: 26px 1fr 32px; gap: 8px; align-items: start; }
    .step .num { width: 24px; height: 24px; margin-top: 6px; border-radius: 50%; background: var(--accent); color: #fff; font-size: 12.5px; display: grid; place-items: center; }
    .fields { display: grid; gap: 6px; }
    .pairs { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 6px; }
    .pair { display: grid; grid-template-columns: 70px 1fr 30px; gap: 6px; align-items: center; }
    .input.n { font-weight: 700; text-align: center; }
    .icon { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--line); background: #fff; color: var(--muted); cursor: pointer; }
    .icon:hover { color: var(--bad); border-color: var(--bad); }
    .add { justify-self: start; border: 0; background: none; padding: 2px 0; font: 700 13px var(--font); color: var(--accent); cursor: pointer; }
    .set-head { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .set-head .input { flex: 1 1 220px; }
    .ans { display: flex; gap: 8px; align-items: center; font-size: 13px; font-weight: 700; }
    .ans .select { min-height: 36px; padding: 4px 10px; width: auto; }
    .keys { width: 100%; border-collapse: collapse; font-size: 14px; }
    .keys th { text-align: left; font-size: 12px; color: var(--muted); padding: 4px 6px; }
    .keys td { padding: 3px 6px; }
    .keys td.n { width: 36px; font-weight: 700; color: var(--title); }
    .keys tr.empty .input:not(.b) { border-color: #e0b04d; background: var(--warn-bg); }
  `,
})
export class BlockEditor {
  readonly blocks = input.required<Block[]>();
  readonly changed = output<Block[]>();
  readonly answerTypes = ANSWER_TYPES;

  val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  private update(k: number, change: (b: Loose) => void): void {
    const next = this.blocks().map((b, i) => {
      if (i !== k) return b;
      const copy = structuredClone(b) as unknown as Loose;
      change(copy);
      return copy as unknown as Block;
    });
    this.changed.emit(next);
  }

  set(k: number, field: string, value: unknown): void {
    this.update(k, (b) => {
      if (value === undefined) delete b[field];
      else b[field] = value;
    });
  }

  /** field null: the item itself is a string (bullets, route). */
  setItem(k: number, i: number, field: string | null, value: unknown): void {
    this.update(k, (b) => {
      const items = b.items as unknown[];
      if (field === null) items[i] = value;
      else if (value === undefined) delete (items[i] as Record<string, unknown>)[field];
      else (items[i] as Record<string, unknown>)[field] = value;
    });
  }

  setChips(k: number, i: number, text: string): void {
    const chips = text.split(',').map((c) => c.trim()).filter(Boolean);
    this.setItem(k, i, 'chips', chips.length ? chips : undefined);
  }

  setAccept(k: number, i: number, text: string): void {
    const accept = text.split(';').map((c) => c.trim()).filter(Boolean);
    this.setItem(k, i, 'accept', accept.length ? accept : undefined);
  }

  add(k: number, item: unknown): void {
    this.update(k, (b) => (b.items as unknown[]).push(item));
  }

  /** A new numbered item continues the numbering. */
  addItem(k: number): void {
    this.update(k, (b) => {
      const items = b.items as { n: number }[];
      items.push({ n: (items[items.length - 1]?.n ?? 0) + 1, prompt: '', answer: '' } as { n: number });
    });
  }

  remove(k: number, i: number): void {
    this.update(k, (b) => (b.items as unknown[]).splice(i, 1));
  }
}
