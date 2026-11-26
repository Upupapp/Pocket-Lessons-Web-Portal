import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { CHECK_LABELS, CheckKey, Issue } from '../../core/lesson-checks';

/** One lesson of a story unit, for the "Whole unit" tab. */
export interface UnitRow {
  id: string;
  title: string;
  label: string;
  published: boolean;
  current: boolean;
  issues: Issue[];
}

/** Where the lesson stands: everything done, can be published anyway, or something needed is still missing. */
export type PublishState = 'ready' | 'anyway' | 'blocked' | 'published';

const OPEN_KEY = 'pl-missing-open';

/**
 * The lesson editor's "What's missing" button and panel.
 * A floating button with the number of missing parts opens a panel (a bottom sheet on phones) listing each one:
 * "Show me" jumps to the exact part, "Fix it" fixes what can be fixed in one tap, and the panel ends with
 * Publish, or Publish anyway when only parts that can be finished later remain.
 * It lives in the browser's top layer (a manual popover), so the portal's header and footer never cover it.
 */
@Component({
  selector: 'pl-missing-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #layer popover="manual" class="layer">
      @if (open()) {
        <section class="panel" role="dialog" aria-labelledby="mp-title" (keydown.escape)="toggle(false)">
          <header class="head">
            <div>
              <h2 id="mp-title">{{ issues().length ? 'What’s missing' : 'Nothing is missing' }}</h2>
              <p class="sub">
                @if (issues().length) {
                  {{ requiredCount() ? requiredCount() + ' needed before publishing · ' : '' }}{{ laterCount() }} can be finished later
                } @else {
                  This lesson is complete.
                }
              </p>
            </div>
            <button type="button" class="x" (click)="toggle(false)" aria-label="Close the list">✕</button>
          </header>

          @if (unit().length) {
            <div class="tabs" role="tablist">
              <button type="button" role="tab" [attr.aria-selected]="tab() === 'lesson'" [class.on]="tab() === 'lesson'" (click)="tab.set('lesson')">This lesson</button>
              <button type="button" role="tab" [attr.aria-selected]="tab() === 'unit'" [class.on]="tab() === 'unit'" (click)="tab.set('unit')">Whole unit</button>
            </div>
          }

          <div class="body">
            @if (undoText()) {
              <div class="undo" role="status">{{ undoText() }} <button type="button" class="link" (click)="undo.emit()">Undo</button></div>
            }

            @if (tab() === 'lesson') {
              @for (g of groups(); track g.required) {
                <h3 class="group" [class.need]="g.required">{{ g.required ? 'Needed before publishing' : 'Can be finished later' }}</h3>
                @for (c of g.checks; track c.key) {
                  <div class="check">
                    <div class="check-head">
                      <strong>{{ c.label }}</strong>
                      <span class="count">{{ c.items.length }}</span>
                    </div>
                    @if (c.key === 'voice') {
                      <div class="group-actions">
                        <button type="button" class="btn btn-primary btn-sm" (click)="fix.emit(c.items[0])">Record all pages ({{ c.items.length }})</button>
                        @if (computerVoice()) {
                          <button type="button" class="btn btn-ghost btn-sm" (click)="fixAll.emit('computer-voice')">Computer voice for these pages</button>
                        }
                      </div>
                    }
                    <ul>
                      @for (i of c.items; track i.id) {
                        <li>
                          <span class="where"><strong>{{ i.where }}</strong><em>{{ i.what }}</em></span>
                          <span class="acts">
                            <button type="button" class="btn btn-ghost btn-xs" (click)="go(i)">Show me</button>
                            @if (fixLabel(i); as f) {
                              <button type="button" class="btn btn-soft btn-xs" [disabled]="f.disabled" (click)="fix.emit(i)">{{ f.text }}</button>
                            }
                            @if (i.check === 'voice' && computerVoice()) {
                              <button type="button" class="btn btn-soft btn-xs" (click)="fixOne.emit({ issue: i, kind: 'computer-voice' })">Computer voice</button>
                            }
                          </span>
                        </li>
                      }
                    </ul>
                  </div>
                }
              } @empty {
                <p class="done"><span aria-hidden="true">✓</span> Every check has passed.</p>
              }
            } @else {
              @for (r of unit(); track r.id) {
                <div class="check unit-row" [class.here]="r.current">
                  <div class="check-head">
                    <strong>{{ r.label }}</strong>
                    @if (r.issues.length) {
                      <span class="count" [class.need]="hasRequired(r.issues)">{{ r.issues.length }}</span>
                    } @else {
                      <span class="ok">{{ r.published ? 'Published' : 'Ready' }}</span>
                    }
                  </div>
                  @if (r.issues.length) {
                    <ul>
                      @for (i of r.issues.slice(0, 4); track i.id) {
                        <li>
                          <span class="where"><strong>{{ i.where }}</strong><em>{{ i.what }}</em></span>
                          <span class="acts"><button type="button" class="btn btn-ghost btn-xs" (click)="goUnit(r, i)">Show me</button></span>
                        </li>
                      }
                      @if (r.issues.length > 4) { <li class="more">and {{ r.issues.length - 4 }} more</li> }
                    </ul>
                  }
                </div>
              }
            }
          </div>

          <footer class="foot">
            @if (tab() === 'unit') {
              <button type="button" class="btn btn-primary full" (click)="publishUnit.emit()">Publish whole unit</button>
              <p class="hint">Publishes every part that has nothing needed missing, in order. Parts still missing something needed are listed.</p>
            } @else {
              @switch (state()) {
                @case ('ready') { <button type="button" class="btn btn-primary full" (click)="publish.emit()">Publish lesson</button> }
                @case ('anyway') {
                  <button type="button" class="btn btn-primary full" (click)="publishAnyway.emit()">Publish anyway ({{ issues().length }} missing)</button>
                  <p class="hint">You can finish the rest later and publish again.</p>
                }
                @case ('blocked') { <p class="blocked">Fix the {{ requiredCount() }} needed {{ requiredCount() === 1 ? 'part' : 'parts' }} first.</p> }
                @default { <p class="hint center">Published. Edit anything to start the next version.</p> }
              }
            }
          </footer>
        </section>
      }

      <button
        type="button"
        class="fab"
        [class.clear]="!issues().length"
        [class.need]="requiredCount() > 0"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="issues().length ? 'What’s missing, ' + issues().length + (issues().length === 1 ? ' item' : ' items') : 'Nothing is missing'"
        (click)="toggle()"
      >
        @if (issues().length) {
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /><circle cx="4.5" cy="6" r="1.6" fill="currentColor" /><circle cx="4.5" cy="12" r="1.6" fill="currentColor" /><circle cx="4.5" cy="18" r="1.6" fill="currentColor" /></svg>
          <span class="badge">{{ issues().length > 99 ? '99+' : issues().length }}</span>
        } @else {
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        }
        <span class="fab-text">{{ issues().length ? 'What’s missing' : 'All done' }}</span>
      </button>
    </div>
  `,
  styles: `
    .layer {
      /* A manual popover sits in the top layer; it is placed by hand at the bottom right. */
      position: fixed; inset: auto 20px 20px auto; margin: 0; padding: 0; border: 0; background: transparent; overflow: visible;
      display: flex; flex-direction: column; align-items: flex-end; gap: 12px; max-height: calc(100vh - 40px); pointer-events: none;
    }
    .layer > * { pointer-events: auto; }
    .fab {
      display: inline-flex; align-items: center; gap: 10px; height: 54px; padding: 0 20px 0 16px; border: 0; border-radius: 999px; cursor: pointer;
      background: #b4473a; color: #fff; font: 700 15px var(--font); position: relative;
      box-shadow: 0 10px 28px -10px rgba(20, 27, 24, .55), 0 2px 6px rgba(20, 27, 24, .18); transition: transform .15s, background .2s;
    }
    .fab:not(.need) { background: #8a5a00; }
    .fab.clear { background: var(--accent, #146b60); }
    .fab:hover { transform: translateY(-1px); }
    .fab:focus-visible { outline: 3px solid #f6cc59; outline-offset: 3px; }
    .badge {
      position: absolute; top: -6px; left: 30px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px;
      background: #fff; color: #b4473a; font-size: 12px; display: grid; place-items: center; box-shadow: 0 1px 3px rgba(0, 0, 0, .25);
    }
    .fab:not(.need) .badge { color: #8a5a00; }
    .panel {
      width: 400px; max-height: calc(100vh - 120px); display: flex; flex-direction: column; background: #fff; color: var(--ink, #141b18);
      border: 1px solid var(--line, #e3e7e2); border-radius: 18px; box-shadow: 0 24px 60px -20px rgba(20, 27, 24, .45);
      animation: rise .18s ease-out both; overflow: hidden;
    }
    @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    .head { display: flex; justify-content: space-between; gap: 12px; padding: 16px 18px 10px; border-bottom: 1px solid var(--line, #e3e7e2); }
    .head h2 { font-family: var(--serif); font-size: 20px; margin: 0; color: var(--title, #0e3f36); }
    .sub { margin: 2px 0 0; font-size: 13px; color: var(--muted, #5d6964); }
    .x { border: 0; background: var(--surface-2, #f9faf8); width: 34px; height: 34px; border-radius: 50%; cursor: pointer; flex: none; }
    .tabs { display: flex; gap: 6px; padding: 10px 18px 0; }
    .tabs button { border: 1px solid var(--line, #e3e7e2); background: #fff; border-radius: 999px; padding: 6px 12px; font: 700 13px var(--font); cursor: pointer; color: var(--muted, #5d6964); }
    .tabs button.on { background: var(--accent-tint, #edf5f0); border-color: var(--accent-tint-2, #d6e7dd); color: var(--title, #0e3f36); }
    .body { overflow: auto; padding: 6px 18px 12px; overscroll-behavior: contain; }
    .group { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; margin: 14px 0 6px; color: #8a5a00; }
    .group.need { color: #a3352b; }
    .check { border: 1px solid var(--line, #e3e7e2); border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; }
    .check-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 14px; }
    .count { min-width: 24px; height: 22px; padding: 0 7px; border-radius: 999px; background: #fbf3dc; color: #7a5200; font-size: 12px; font-weight: 700; display: grid; place-items: center; }
    .count.need { background: #fbebe8; color: #a3352b; }
    .ok { font-size: 12px; font-weight: 700; color: var(--good, #1e6b45); }
    .group-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 2px; }
    ul { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 2px; }
    li { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; border-top: 1px dashed var(--line, #e3e7e2); }
    li:first-child { border-top: 0; }
    li.more { font-size: 12.5px; color: var(--muted, #5d6964); }
    .where { display: grid; min-width: 0; font-size: 13px; }
    .where strong { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .where em { font-style: normal; color: var(--muted, #5d6964); font-size: 12.5px; }
    .acts { display: flex; gap: 4px; flex: none; }
    :host ::ng-deep .btn-xs, .btn-xs { padding: 4px 9px; font-size: 12px; min-height: 28px; border-radius: 8px; }
    .btn-soft { background: var(--accent-tint, #edf5f0); color: var(--title, #0e3f36); border: 1px solid var(--accent-tint-2, #d6e7dd); font-weight: 700; cursor: pointer; }
    .btn-soft:disabled { opacity: .6; cursor: default; }
    .unit-row.here { border-color: var(--accent, #146b60); }
    .undo { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 8px 0; padding: 8px 12px; border-radius: 10px; background: #141b18; color: #fff; font-size: 13px; }
    .undo .link { background: none; border: 0; color: #f6cc59; font-weight: 700; cursor: pointer; }
    .done { margin: 18px 0; color: var(--good, #1e6b45); font-weight: 700; }
    .foot { padding: 12px 18px 16px; border-top: 1px solid var(--line, #e3e7e2); }
    .full { width: 100%; }
    .hint { margin: 6px 0 0; font-size: 12.5px; color: var(--muted, #5d6964); }
    .center { text-align: center; }
    .blocked { margin: 0; font-weight: 700; color: #a3352b; text-align: center; }
    /* Phones: a bottom sheet across the screen, the button above it. */
    @media (max-width: 760px) {
      .layer { inset: auto 12px 12px 12px; align-items: stretch; }
      .fab { align-self: flex-end; }
      .fab-text { display: none; }
      .fab { width: 56px; height: 56px; padding: 0; justify-content: center; }
      .badge { left: auto; right: -4px; }
      .panel { width: auto; max-height: 70vh; border-radius: 18px 18px 14px 14px; }
    }
    @media (prefers-reduced-motion: reduce) { .panel { animation: none; } .fab { transition: none; } }
  `,
})
export class MissingPanel {
  readonly issues = input.required<Issue[]>();
  readonly unit = input<UnitRow[]>([]);
  readonly state = input.required<PublishState>();
  readonly computerVoice = input(false);
  readonly classRequestedAt = input<string | undefined>(undefined);
  readonly titleSuggestion = input('');
  readonly subjectSuggestion = input('');
  readonly undoText = input('');

  readonly show = output<Issue>();
  readonly fix = output<Issue>();
  readonly fixOne = output<{ issue: Issue; kind: 'computer-voice' }>();
  readonly fixAll = output<'computer-voice'>();
  readonly openLesson = output<{ lessonId: string; issue: Issue }>();
  readonly publish = output<void>();
  readonly publishAnyway = output<void>();
  readonly publishUnit = output<void>();
  readonly undo = output<void>();
  /** The panel opened or closed (the editor makes room for it on wide screens). */
  readonly openChange = output<boolean>();

  readonly open = signal(readOpen());
  readonly tab = signal<'lesson' | 'unit'>('lesson');
  private readonly layer = viewChild.required<ElementRef<HTMLElement>>('layer');

  readonly requiredCount = computed(() => this.issues().filter((i) => i.required).length);
  readonly laterCount = computed(() => this.issues().length - this.requiredCount());
  readonly groups = computed(() => {
    const out: { required: boolean; checks: { key: CheckKey; label: string; items: Issue[] }[] }[] = [];
    for (const required of [true, false]) {
      const items = this.issues().filter((i) => i.required === required);
      if (!items.length) continue;
      const keys = [...new Set(items.map((i) => i.check))];
      out.push({ required, checks: keys.map((key) => ({ key, label: CHECK_LABELS[key], items: items.filter((i) => i.check === key) })) });
    }
    return out;
  });

  constructor() {
    afterNextRender(() => {
      this.layer().nativeElement.showPopover?.();
      this.openChange.emit(this.open());
    });
    inject(DestroyRef).onDestroy(() => {
      const el = this.layer().nativeElement;
      if (el.matches(':popover-open')) el.hidePopover();
    });
  }

  toggle(force?: boolean): void {
    const next = force ?? !this.open();
    this.open.set(next);
    this.openChange.emit(next);
    try {
      sessionStorage.setItem(OPEN_KEY, next ? '1' : '0');
    } catch {
      /* private window: the panel just starts closed next time */
    }
  }

  hasRequired(list: Issue[]): boolean {
    return list.some((i) => i.required);
  }

  /** "Show me": on a phone the sheet closes first, so the part is not hidden under it. */
  go(i: Issue): void {
    if (matchMedia('(max-width: 760px)').matches) {
      this.toggle(false);
      setTimeout(() => this.show.emit(i), 180);
    } else this.show.emit(i);
  }

  goUnit(r: UnitRow, i: Issue): void {
    if (r.current) this.go(i);
    else this.openLesson.emit({ lessonId: r.id, issue: i });
  }

  fixLabel(i: Issue): { text: string; disabled?: boolean } | null {
    switch (i.fix) {
      case 'title':
        return { text: this.titleSuggestion() ? `Use “${this.titleSuggestion()}”` : 'Add a title' };
      case 'subject':
        return { text: `Use ${this.subjectSuggestion() || 'a suggested subject'}` };
      case 'remove-page':
        return { text: 'Remove page' };
      case 'remove-question':
        return { text: 'Remove' };
      case 'accept-question':
        return { text: 'Looks right' };
      case 'suggest':
        return { text: 'Suggest questions' };
      case 'lighter':
        return { text: 'Make it lighter' };
      case 'ask-admin': {
        const at = this.classRequestedAt();
        return at ? { text: `Asked on ${new Date(at).toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })}`, disabled: true } : { text: 'Ask your administrator' };
      }
      default:
        return null; // voice: "Record all pages" sits on the group
    }
  }
}

function readOpen(): boolean {
  try {
    return sessionStorage.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
}
