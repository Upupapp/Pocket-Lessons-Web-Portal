import { Component, ElementRef, inject, input, output } from '@angular/core';
import { SUBJECTS, SubjectKey, subjectIcon } from '../core/subjects';

/** Ten world cards to choose a lesson's subject from, each in its own colours with its 3D picture. */
@Component({
  selector: 'pl-subject-picker',
  template: `
    <div class="grid" role="radiogroup" [attr.aria-label]="label()" (keydown)="key($event)">
      @for (s of subjects; track s.key) {
        <button
          type="button"
          role="radio"
          class="world"
          [class.on]="value() === s.key"
          [attr.aria-checked]="value() === s.key"
          [attr.aria-label]="s.childEn + ', ' + s.world + (suggested() === s.key ? ' (suggested)' : '')"
          [attr.tabindex]="tabStop() === s.key ? 0 : -1"
          [style.--main]="s.main"
          [style.--tint]="s.tint"
          [style.--deep]="s.deep"
          (click)="picked.emit(s.key)"
        >
          @if (suggested() === s.key && value() !== s.key) { <span class="badge">Suggested</span> }
          @if (value() === s.key) {
            <span class="tick" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
          }
          <img [src]="icon(s.hero)" alt="" width="44" height="44" />
          <strong>{{ s.childEn }}</strong>
          <span class="world-name">{{ s.world }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 10px; }
    .world {
      position: relative; display: grid; justify-items: center; gap: 4px; padding: 14px 8px 12px; text-align: center; cursor: pointer;
      border-radius: 14px; border: 2px solid transparent; background: var(--tint); color: var(--deep); font: inherit;
      transition: border-color .15s, box-shadow .15s, transform .15s;
    }
    .world:hover { transform: translateY(-1px); box-shadow: 0 6px 16px -10px var(--main); }
    .world.on { border-color: var(--main); box-shadow: 0 0 0 3px color-mix(in srgb, var(--main) 22%, transparent); }
    .world:focus-visible { outline: 3px solid var(--deep); outline-offset: 2px; }
    img { width: 44px; height: 44px; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0, 0, 0, .12)); }
    strong { font-size: 14px; line-height: 1.2; }
    .world-name { font-size: 11.5px; opacity: .8; line-height: 1.25; }
    .badge {
      position: absolute; top: 6px; left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 10.5px; font-weight: 700;
      background: #fff; color: var(--deep); border: 1px solid color-mix(in srgb, var(--main) 45%, white);
    }
    .tick { position: absolute; top: 6px; right: 6px; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--main); color: #fff; }
  `,
})
export class SubjectPicker {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly value = input<SubjectKey | null>(null);
  readonly suggested = input<SubjectKey | null>(null);
  readonly label = input('Subject');
  readonly picked = output<SubjectKey>();
  readonly subjects = SUBJECTS;
  readonly icon = subjectIcon;

  /** One card takes Tab: the chosen one, else the suggested one, else the first. */
  tabStop(): SubjectKey {
    return this.value() ?? this.suggested() ?? SUBJECTS[0].key;
  }

  /** Arrow keys move between the cards like any radio group. */
  key(e: KeyboardEvent): void {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const at = SUBJECTS.findIndex((s) => s.key === this.tabStop());
    const next = SUBJECTS[(at + step + SUBJECTS.length) % SUBJECTS.length].key;
    this.picked.emit(next);
    queueMicrotask(() => (this.host.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus());
  }
}
