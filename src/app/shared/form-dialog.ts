import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';

let next = 0;

/**
 * A form in a centred pop-up: opens when it is rendered, closes with ✕, Esc, Cancel or a click on the
 * dimmed page. The form inside is the page's own; put its buttons in a `.dlg-actions` row (they stay
 * in view at the bottom while a long form scrolls). Wrap it in `@if` and clear the flag on (closed).
 */
@Component({
  selector: 'pl-form-dialog',
  template: `
    <dialog #dlg class="fd" [class.closing]="closing()" [attr.aria-labelledby]="titleId" (cancel)="$event.preventDefault(); close()" (pointerdown)="pressed($event)" (click)="backdrop($event)">
      <div class="panel" [class.wide]="wide()">
        <header class="head">
          @if (eyebrow()) { <p class="eyebrow">{{ eyebrow() }}</p> }
          <h2 [id]="titleId">{{ title() }}</h2>
          @if (lead()) { <p class="lead">{{ lead() }}</p> }
        </header>
        <ng-content />
        <button type="button" class="x" (click)="close()" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
        </button>
      </div>
    </dialog>
  `,
  styles: `
    .fd {
      border: 0; padding: 0; background: transparent; max-width: none; max-height: none; width: 100%; height: 100%;
      display: grid; padding: 24px 0; box-sizing: border-box; overflow: auto; overscroll-behavior: contain;
    }
    .fd:not([open]) { display: none; }
    .fd::backdrop { background: rgba(20, 27, 24, .45); backdrop-filter: blur(2px); animation: fade .2s ease both; }
    .fd.closing::backdrop { animation: fade .18s ease reverse both; }
    .panel {
      position: relative; width: min(560px, calc(100% - 32px)); margin: auto; padding: 26px 26px 0; border-radius: 18px;
      background: #fff; color: var(--ink); box-shadow: 0 24px 60px -20px rgba(0, 0, 0, .45); overflow: clip;
      animation: pop .24s cubic-bezier(.2, .8, .2, 1) both;
    }
    .panel.wide { width: min(780px, calc(100% - 32px)); }
    .closing .panel { animation: drop .18s ease-in both; }
    .head { padding-right: 44px; margin-bottom: 18px; }
    .eyebrow { font-size: 12.5px; font-weight: 700; color: var(--muted); margin-bottom: 4px; }
    h2 { font-family: var(--serif); font-size: 24px; line-height: 1.2; color: var(--title); margin: 0; overflow-wrap: anywhere; }
    .lead { color: var(--muted); font-size: 14.5px; margin-top: 6px; }
    .x {
      position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--line);
      background: #fff; color: var(--muted); display: grid; place-items: center; cursor: pointer;
    }
    .x:hover { color: var(--ink); border-color: var(--line-strong); }
    .x:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    @media (max-width: 560px) {
      .fd { padding: 10px 0; }
      .panel, .panel.wide { width: calc(100% - 20px); padding: 20px 16px 0; border-radius: 16px; }
      .x { top: 12px; right: 12px; }
      h2 { font-size: 21px; }
    }
    @keyframes pop { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
    @keyframes drop { to { opacity: 0; transform: translateY(10px) scale(.98); } }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .panel, .closing .panel, .fd::backdrop { animation: none; } }
  `,
})
export class FormDialog {
  readonly title = input.required<string>();
  readonly lead = input('');
  readonly eyebrow = input('');
  readonly wide = input(false);
  readonly closed = output<void>();

  readonly titleId = `fd-title-${++next}`;
  readonly closing = signal(false);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  private done = false;
  private downOnPage = false;

  constructor() {
    afterNextRender(() => {
      const el = this.dlg().nativeElement;
      el.showModal();
      // Start in the first field rather than on the ✕ button.
      el.querySelector<HTMLElement>('input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])')?.focus();
    });
    inject(DestroyRef).onDestroy(() => {
      const el = this.dlg().nativeElement;
      if (el.open) el.close();
    });
  }

  /** Closes with a short drop; at once when the visitor prefers less motion. */
  close(): void {
    if (this.done) return;
    this.done = true;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.closing.set(true);
    setTimeout(
      () => {
        this.dlg().nativeElement.close();
        this.closed.emit();
      },
      still ? 0 : 170,
    );
  }

  pressed(e: PointerEvent): void {
    this.downOnPage = e.target === this.dlg().nativeElement;
  }

  /** A click on the dimmed page around the panel closes it (not a text selection that ends there). */
  backdrop(e: MouseEvent): void {
    if (this.downOnPage && e.target === this.dlg().nativeElement) this.close();
  }
}
