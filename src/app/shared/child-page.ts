import { Component, computed, input, output, signal } from '@angular/core';
import { isRightAnswer, tilesFor } from '../core/math-import';
import { Block, LessonPage, SetBlock } from '../core/models';

type Of<T extends Block['type']> = Extract<Block, { type: T }>;

/**
 * The child-view of a lesson page built from blocks (AHA Math lessons), drawn as on the phone: text on pad-paper
 * lines, the lesson route, word cards, point cards, a step path, number cards and worked examples. Lives inside
 * the preview phone and reads its colours (--c-teal, --c-sun, --c-deep, --c-tint, --c-soft) and size (--h).
 */
@Component({
  selector: 'pl-child-steps',
  template: `
    @let b = block();
    @if (b.title) { <p class="ttl">{{ b.title }}</p> }
    <div class="path" aria-hidden="true">
      @for (s of b.items; track $index; let i = $index) {
        @if (i > 0) { <i [class.d]="i <= at()"></i> }
        <b [class.d]="i < at()" [class.o]="i === at()">{{ i < at() ? '✓' : i + 1 }}</b>
      }
    </div>
    @if (b.items[at()]; as s) {
      <div class="step">
        <p class="h"><em>{{ at() + 1 }}</em>{{ s.text }}</p>
        @if (s.note) { <p class="note">{{ s.note }}</p> }
        @if (s.chips?.length) {
          <div class="chips">@for (c of s.chips; track $index) { <span>{{ c }}</span> }</div>
        }
      </div>
    }
    <div class="nav">
      <button type="button" (click)="at.set(at() - 1)" [disabled]="at() === 0">◀ Balik</button>
      <span>Hakbang {{ at() + 1 }} ng {{ b.items.length }}</span>
      <button type="button" (click)="at.set(at() + 1)" [disabled]="at() >= b.items.length - 1">Susunod ▶</button>
    </div>
  `,
  styles: `
    :host { display: grid; gap: calc(var(--u) * 10); }
    .ttl { font: 700 calc(var(--u) * 20) / 1.2 var(--c-title); color: var(--c-deep); }
    .path { display: flex; align-items: center; justify-content: center; }
    .path i { width: calc(var(--u) * 26); height: calc(var(--u) * 5); background: color-mix(in srgb, var(--c-teal) 30%, #fff); }
    .path i.d { background: var(--c-teal); }
    .path b { width: calc(var(--u) * 34); height: calc(var(--u) * 34); border-radius: 50%; display: grid; place-items: center; font: 700 calc(var(--u) * 17) var(--c-title); background: #fff; color: #9c8f78; border: 3px solid color-mix(in srgb, var(--c-teal) 30%, #fff); }
    .path b.d { background: var(--c-teal); border-color: var(--c-teal); color: var(--c-on, #fff); }
    .path b.o { width: calc(var(--u) * 44); height: calc(var(--u) * 44); background: var(--c-sun); border-color: var(--c-teal); color: var(--c-deep); }
    .step { display: grid; gap: calc(var(--u) * 8); padding: calc(var(--u) * 14); border-radius: calc(var(--u) * 20); background: #fff; border: 2px solid var(--c-teal); }
    .h { display: flex; gap: calc(var(--u) * 10); align-items: flex-start; font: 700 calc(var(--u) * 21) / 1.3 var(--c-title); color: var(--c-deep); }
    .h em { font-style: normal; flex: none; width: calc(var(--u) * 32); height: calc(var(--u) * 32); border-radius: 50%; background: var(--c-teal); color: var(--c-on, #fff); display: grid; place-items: center; font-size: calc(var(--u) * 18); }
    .note { font: 400 calc(var(--u) * 18) / 1.4 var(--c-title); color: var(--ink); }
    .chips { display: flex; flex-wrap: wrap; gap: calc(var(--u) * 6); }
    .chips span { padding: calc(var(--u) * 4) calc(var(--u) * 10); border-radius: calc(var(--u) * 10); background: var(--c-tint, #fff9ed); font: 700 calc(var(--u) * 18) var(--c-title); color: var(--c-deep); }
    .nav { display: flex; justify-content: space-between; align-items: center; font: 700 calc(var(--u) * 13) var(--font); color: var(--c-deep); }
    .nav button { border: 2px solid color-mix(in srgb, var(--c-teal) 30%, #fff); background: #fff; color: var(--c-deep); border-radius: 999px; padding: calc(var(--u) * 6) calc(var(--u) * 12); font: inherit; cursor: pointer; }
    .nav button:disabled { opacity: .4; cursor: default; }
  `,
})
export class ChildSteps {
  readonly block = input.required<Of<'steps'>>();
  readonly at = signal(0);
}

@Component({
  selector: 'pl-child-page',
  imports: [ChildSteps],
  template: `
    @for (b of page().blocks ?? []; track $index) {
      @switch (b.type) {
        @case ('text') {
          <div class="paper"><p class="pad" [style.--fs]="size()">{{ b.text }}</p></div>
        }
        @case ('route') {
          <ul class="route">
            @for (r of b.items; track $index) { <li><i></i>{{ r }}</li> }
          </ul>
        }
        @case ('terms') {
          @for (t of b.items; track $index; let i = $index) {
            <div class="card term" [class.on]="i === 0">
              <i class="dot"></i>
              <div><b>{{ t.term }}</b><p>{{ t.meaning }}</p>@if (t.example) { <span class="ex">{{ t.example }}</span> }</div>
            </div>
          }
        }
        @case ('bullets') {
          @if (b.title; as ttl) { <p class="ttl">{{ ttl }}</p> }
          @for (t of b.items; track $index; let i = $index) {
            <div class="card point" [class.on]="i === 0"><i class="dot"></i><p>{{ t }}</p></div>
          }
        }
        @case ('steps') {
          <pl-child-steps [block]="b" />
        }
        @case ('numbers') {
          @if (b.title; as ttl) { <p class="ttl">{{ ttl }}</p> }
          <div class="grid">
            @for (n of b.items; track $index; let i = $index) {
              <div class="nc" [class.on]="i === 0"><b>{{ n.n }}</b><span>{{ n.word }}</span></div>
            }
          </div>
        }
        @case ('examples') {
          @if (b.title; as ttl) { <p class="ttl">{{ ttl }}</p> }
          <div class="paper exm">
            @for (n of b.items; track $index) {
              <p class="pad" [style.--fs]="22"><b>{{ n.n }}</b> → {{ n.word }}</p>
            }
          </div>
        }
      }
    }
  `,
  styles: `
    :host { display: grid; gap: calc(var(--u) * 10); }
    .ttl { font: 700 calc(var(--u) * 20) / 1.2 var(--c-title); color: var(--c-deep); }
    .paper { padding: calc(var(--u) * 12) calc(var(--u) * 14); border-radius: calc(var(--u) * 20); background: #fff; border: 2px solid var(--c-soft, var(--line)); }
    .pad {
      --row: 1.55em; position: relative; margin: 0; color: var(--ink);
      font: 400 calc(var(--u) * var(--fs, 30)) / var(--row) var(--c-title); word-spacing: .12em;
    }
    .pad::before {
      content: ""; position: absolute; inset: 0; pointer-events: none; background: color-mix(in srgb, var(--c-teal) 40%, #fff);
      mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='155' viewBox='0 0 18 155' preserveAspectRatio='none'%3E%3Cg stroke='%23000' stroke-width='1.2'%3E%3Cline x1='0' x2='18' y1='42.6' y2='42.6' vector-effect='non-scaling-stroke'/%3E%3Cline x1='0' x2='8' y1='65' y2='65' vector-effect='non-scaling-stroke' stroke-opacity='.8'/%3E%3Cline x1='0' x2='18' y1='119' y2='119' vector-effect='non-scaling-stroke'/%3E%3C/g%3E%3C/svg%3E") 0 0 / 18px var(--row) repeat;
    }
    .exm .pad b { font-weight: 700; }
    .route { list-style: none; margin: 0; padding: 0; display: grid; gap: calc(var(--u) * 6); }
    .route li { display: flex; align-items: center; gap: calc(var(--u) * 10); padding: calc(var(--u) * 8) calc(var(--u) * 12); border-radius: calc(var(--u) * 14); background: #fff; font: 700 calc(var(--u) * 17) var(--c-title); color: var(--c-deep); }
    .route i { width: calc(var(--u) * 20); height: calc(var(--u) * 20); border-radius: calc(var(--u) * 6); border: 2px solid var(--c-teal); flex: none; }
    .card { display: grid; grid-template-columns: calc(var(--u) * 12) 1fr; gap: calc(var(--u) * 10); padding: calc(var(--u) * 12); border-radius: calc(var(--u) * 20); background: #fff; border: 2px solid var(--c-soft, var(--line)); }
    .card.on { border-color: var(--c-teal); box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-sun) 60%, transparent); }
    .card .dot { width: calc(var(--u) * 12); height: calc(var(--u) * 12); border-radius: 50%; background: var(--c-teal); margin-top: calc(var(--u) * 9); }
    .term b { display: block; font: 700 calc(var(--u) * 23) / 1.25 var(--c-title); color: var(--c-deep); }
    .term p, .point p { font: 400 calc(var(--u) * 19) / 1.35 var(--c-title); color: var(--ink); }
    .ex { display: inline-block; margin-top: calc(var(--u) * 6); padding: 0 calc(var(--u) * 10); border-radius: calc(var(--u) * 10); background: var(--c-tint, #fff9ed); border: 2px dashed var(--c-teal); font: 700 calc(var(--u) * 19) var(--c-title); }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(var(--u) * 8); }
    .nc { display: grid; place-content: center; text-align: center; min-height: calc(var(--u) * 82); border-radius: calc(var(--u) * 18); background: #fff; border: 2px solid var(--c-soft, var(--line)); box-shadow: 0 4px 0 var(--c-soft, var(--line)); }
    .nc.on { border-color: var(--c-teal); background: var(--c-sun); }
    .nc b { font: 700 calc(var(--u) * 28) / 1 var(--c-title); color: var(--c-deep); }
    .nc span { font: 400 calc(var(--u) * 16) / 1.2 var(--c-title); color: var(--ink); }
  `,
})
export class ChildPage {
  readonly page = input.required<LessonPage>();
  /** The story-text size for the lesson's level, in phone points. */
  readonly size = input(30);

}

type Feedback = 'good' | 'retry' | 'reveal' | null;

/**
 * A numbered activity as the child does it on the phone: numbered bubbles (the paper worksheet's numbers), one item
 * at a time, answered with the number pad, word tiles or choices, checked against the key with a second try,
 * then a "checked paper" summary.
 */
@Component({
  selector: 'pl-child-set',
  template: `
    @let s = block();
    @if (s.cheer && !started()) {
      <div class="body">
        <div><p class="kicker">{{ s.title }}</p><p class="instr">{{ s.instruction }}</p></div>
        <div class="intro">
          @if (hero(); as h) { <img class="pic" [src]="h" alt="" /> } @else { <span class="hero" aria-hidden="true">★</span> }
          <p>{{ s.cheer }}</p>
        </div>
        <p class="count">{{ s.items.length }} tanong</p>
        <div class="bub center" aria-hidden="true">
          @for (it of s.items; track $index; let i = $index) { <span [class.o]="i === 0">{{ it.n }}</span> }
        </div>
      </div>
      <div class="foot"><button type="button" class="cta" (click)="started.set(true)">SIMULAN</button></div>
    } @else if (!summary()) {
      <div class="body">
        <div><p class="kicker">{{ s.title }}</p><p class="instr">{{ s.instruction }}</p></div>
        <div class="bub" aria-hidden="true">
          @for (it of s.items; track $index; let i = $index) {
            <span [class.d]="i < at()" [class.miss]="i < at() && !results()[i]?.right" [class.o]="i === at()">{{ i < at() && results()[i]?.right ? '✓' : it.n }}</span>
          }
        </div>
        <div class="item"><span class="n">{{ item().n }}.</span><span class="q" [class.long]="item().prompt.length > 8">{{ item().prompt }}</span></div>
        @if (s.answer === 'number') {
          <div class="disp" [class.bad]="feedback() === 'retry'">{{ typed() }}<i></i></div>
          <div class="keys">
            @for (k of keys; track k) {
              <button type="button" (click)="press(k)" [disabled]="locked()" [attr.aria-label]="k === '⌫' ? 'Erase' : k">{{ k }}</button>
            }
          </div>
        } @else if (s.answer === 'words') {
          <div class="slot" [class.bad]="feedback() === 'retry'">
            <span class="lab">Sagot mo:</span>
            @for (t of chosenWords(); track $index; let i = $index) { <button type="button" class="tile in" (click)="unpick(i)" [disabled]="locked()">{{ t }}</button> }
          </div>
          <div class="bank">
            @for (t of tiles(); track $index; let i = $index) {
              <button type="button" class="tile" [class.used]="chosen().includes(i)" (click)="pick(i)" [disabled]="locked() || chosen().includes(i)">{{ t }}</button>
            }
          </div>
        } @else {
          <div class="opts">
            @for (o of options(); track $index; let i = $index) {
              <button type="button" class="opt" [class.sel]="picked() === i" (click)="picked.set(i)" [disabled]="locked()"><b>{{ 'ABC'[i] }}</b>{{ o }}</button>
            }
          </div>
        }
      </div>
      @if (feedback(); as fb) {
        <div class="sheet" [class]="fb" role="status">
          @if (fb === 'good') {
            <strong>✓ {{ s.praise || 'Magaling!' }}</strong><span>Tama ang sagot mo.</span>
            <button type="button" class="cta" (click)="next()">TULOY</button>
          } @else if (fb === 'retry') {
            <strong>Halos na! Subukan ulit.</strong><span>Tingnan muli ang numero, saka sumagot.</span>
            <button type="button" class="cta" (click)="again()">SUBUKAN ULIT</button>
          } @else {
            <strong>Ang tamang sagot:</strong><span>{{ item().answer }}</span>
            <button type="button" class="cta" (click)="next()">TULOY</button>
          }
        </div>
      } @else {
        <div class="foot" [class.two]="s.answer === 'words'">
          @if (s.answer === 'words') {
            <button type="button" class="cta ghost" (click)="unpick(chosen().length - 1)" [disabled]="!chosen().length">⌫ BURA</button>
          }
          <button type="button" class="cta" (click)="check()" [disabled]="!hasAnswer()">SURIIN</button>
        </div>
      }
    } @else {
      <div class="body">
        <p class="kicker">{{ s.title }}</p>
        <p class="score">{{ rightCount() }} sa {{ s.items.length }} tama!@if (rightCount() >= s.items.length * 0.8) { {{ s.praise || 'Magaling!' }} }</p>
        <div class="sheetlist">
          @for (it of s.items; track $index; let i = $index) {
            <div class="ln">
              <span class="no">{{ it.n }}.</span><span class="p">{{ it.prompt }}</span>
              <span class="a">{{ it.answer }}@if (results()[i]?.given; as g) { <small>Sagot mo: {{ g }}</small> }</span>
              <span [class]="results()[i]?.right ? 'ok' : 'ret'">{{ results()[i]?.right ? '✓' : '' }}</span>
            </div>
          }
        </div>
      </div>
      <div class="foot"><button type="button" class="cta" (click)="finished.emit()">TULOY</button></div>
    }
  `,
  styles: `
    :host { flex: 1; min-height: 0; display: flex; flex-direction: column; position: relative; }
    .body { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: calc(var(--u) * 10); padding: calc(var(--u) * 6) calc(var(--u) * 16) 0; }
    .foot { padding: calc(var(--u) * 10) calc(var(--u) * 16) calc(var(--u) * 24); }
    .foot.two { display: grid; grid-template-columns: 2fr 3fr; gap: calc(var(--u) * 10); }
    .cta.ghost { background: #fff; color: var(--c-deep); border: 2px solid var(--c-deep); box-shadow: none; }
    .cta.ghost:disabled { opacity: .45; background: #fff; color: var(--c-deep); box-shadow: none; }
    .intro { display: grid; justify-items: center; gap: calc(var(--u) * 10); padding: calc(var(--u) * 16); border-radius: calc(var(--u) * 22); background: #fff; border: 2px solid var(--c-soft, var(--line)); text-align: center; }
    .intro .hero { display: grid; place-items: center; width: calc(var(--u) * 64); height: calc(var(--u) * 64); border-radius: 50%; background: var(--c-sun); color: var(--c-deep); font-size: calc(var(--u) * 32); }
    .intro .pic { width: calc(var(--u) * 72); height: calc(var(--u) * 72); object-fit: contain; }
    .intro p { font: 400 calc(var(--u) * 20) / 1.4 var(--c-title); color: var(--ink); }
    .count { text-align: center; font: 700 calc(var(--u) * 14) var(--font); color: var(--c-deep); }
    .bub.center { justify-content: center; }
    .kicker { font: 700 calc(var(--u) * 12) var(--font); letter-spacing: .07em; text-transform: uppercase; color: var(--c-deep); }
    .instr { font: 700 calc(var(--u) * 15) / 1.3 var(--font); color: var(--c-deep); opacity: .9; }
    .cheer { font: 400 calc(var(--u) * 16) / 1.35 var(--c-title); color: var(--ink); background: #fff; border-radius: calc(var(--u) * 14); padding: calc(var(--u) * 8) calc(var(--u) * 12); }
    .bub { display: flex; flex-wrap: wrap; gap: calc(var(--u) * 4); }
    .bub span { width: calc(var(--u) * 26); height: calc(var(--u) * 26); border-radius: 50%; display: grid; place-items: center; font: 700 calc(var(--u) * 12) var(--font); background: #fff; color: #9c8f78; border: 2px solid color-mix(in srgb, var(--c-teal) 30%, #fff); }
    .bub span.d { background: var(--c-teal); border-color: var(--c-teal); color: var(--c-on, #fff); }
    .bub span.miss { background: #fff; border-color: #d9a92c; color: #8a5a00; }
    .bub span.o { width: calc(var(--u) * 32); height: calc(var(--u) * 32); background: var(--c-sun); border: 3px solid var(--c-deep); color: var(--c-deep); }
    .item { display: flex; align-items: center; gap: calc(var(--u) * 10); padding: calc(var(--u) * 10) calc(var(--u) * 14); border-radius: calc(var(--u) * 20); background: #fff; border: 2px solid var(--c-soft, var(--line)); }
    .item .n { font: 700 calc(var(--u) * 22) var(--c-title); color: var(--c-deep); }
    .item .q { flex: 1; text-align: center; font: 700 calc(var(--u) * 46) / 1.1 var(--c-title); color: var(--ink); }
    .item .q.long { font-size: calc(var(--u) * 24); line-height: 1.25; }
    .disp { height: calc(var(--u) * 62); border-radius: calc(var(--u) * 16); background: #fff; border: 3px solid var(--c-teal); display: grid; place-items: center; font: 700 calc(var(--u) * 40) var(--c-title); color: var(--ink); letter-spacing: .06em; }
    .disp i { display: inline-block; width: 3px; height: calc(var(--u) * 34); background: var(--c-deep); margin-left: 4px; vertical-align: middle; }
    .disp.bad, .slot.bad { border-color: #e9a99d; background: #fdf0ec; }
    .keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(var(--u) * 7); }
    .keys button { height: calc(var(--u) * 46); border-radius: calc(var(--u) * 14); border: 2px solid var(--c-soft, var(--line)); background: #fff; box-shadow: 0 4px 0 var(--c-soft, var(--line)); font: 700 calc(var(--u) * 24) var(--c-title); color: var(--ink); cursor: pointer; }
    .slot { min-height: calc(var(--u) * 58); display: flex; flex-wrap: wrap; gap: calc(var(--u) * 6); align-items: center; padding: calc(var(--u) * 8) calc(var(--u) * 10); border-radius: calc(var(--u) * 16); border: 2px dashed var(--c-teal); background: #fff; }
    .slot .lab { width: 100%; font: 700 calc(var(--u) * 12) var(--font); color: var(--c-deep); }
    .bank { display: flex; flex-wrap: wrap; justify-content: center; gap: calc(var(--u) * 8); }
    .tile { padding: calc(var(--u) * 4) calc(var(--u) * 12); border-radius: calc(var(--u) * 12); border: 2px solid var(--c-soft, var(--line)); background: #fff; box-shadow: 0 3px 0 var(--c-soft, var(--line)); font: 700 calc(var(--u) * 21) var(--c-title); color: var(--ink); cursor: pointer; }
    .tile.in { background: var(--c-sun); border-color: var(--c-teal); }
    .tile.used { opacity: .3; }
    .opts { display: grid; gap: calc(var(--u) * 8); }
    .opt { display: flex; gap: calc(var(--u) * 10); align-items: center; text-align: left; padding: calc(var(--u) * 10) calc(var(--u) * 12); border-radius: calc(var(--u) * 16); border: 2px solid var(--c-soft, var(--line)); background: #fff; font: 700 calc(var(--u) * 20) / 1.25 var(--c-title); color: var(--ink); cursor: pointer; }
    .opt b { flex: none; width: calc(var(--u) * 28); height: calc(var(--u) * 28); border-radius: calc(var(--u) * 8); border: 2px solid var(--c-soft, var(--line)); display: grid; place-items: center; font: 700 calc(var(--u) * 13) var(--font); }
    .opt.sel { border-color: var(--c-teal); background: var(--c-sun); }
    .cta { width: 100%; min-height: calc(var(--u) * 54); border: 0; border-radius: calc(var(--u) * 16); background: var(--c-teal); color: var(--c-on, #fff); font: 700 calc(var(--u) * 17) var(--font); letter-spacing: .08em; box-shadow: 0 5px 0 var(--c-teal-d); cursor: pointer; }
    .cta:disabled { background: #e3dccb; color: #a59d8a; box-shadow: 0 5px 0 #cfc7b4; cursor: not-allowed; }
    .sheet { display: grid; gap: calc(var(--u) * 6); padding: calc(var(--u) * 14) calc(var(--u) * 16) calc(var(--u) * 24); border-radius: calc(var(--u) * 22) calc(var(--u) * 22) 0 0; }
    .sheet strong { font: 700 calc(var(--u) * 18) var(--font); }
    .sheet span { font: 700 calc(var(--u) * 15) var(--c-title); }
    .sheet.good { background: #d9efd3; color: #0d4d45; }
    .sheet.retry { background: #fcefc7; color: #6b4b00; }
    .sheet.reveal { background: #fde3dc; color: #8f3326; }
    .score { font: 700 calc(var(--u) * 22) / 1.2 var(--c-title); color: var(--c-deep); }
    .sheetlist { background: linear-gradient(90deg, transparent calc(var(--u) * 34), #e9a99d calc(var(--u) * 34) calc(var(--u) * 36), transparent calc(var(--u) * 36)), #fff; border-radius: calc(var(--u) * 18); border: 2px solid var(--c-soft, var(--line)); padding: calc(var(--u) * 4) calc(var(--u) * 10) calc(var(--u) * 4) 0; }
    .ln { display: grid; grid-template-columns: calc(var(--u) * 36) auto 1fr calc(var(--u) * 22); gap: calc(var(--u) * 6); align-items: center; min-height: calc(var(--u) * 32); border-bottom: 1px solid color-mix(in srgb, var(--c-teal) 30%, #fff); font: 400 calc(var(--u) * 15) / 1.2 var(--c-title); }
    .ln:last-child { border-bottom: 0; }
    .ln .no { text-align: center; font-weight: 700; color: var(--c-deep); }
    .ln .p { font-weight: 700; }
    .ln .a small { display: block; font-size: calc(var(--u) * 12); color: #8f3326; }
    .ok { width: calc(var(--u) * 20); height: calc(var(--u) * 20); border-radius: 50%; background: #2f8f5b; color: #fff; display: grid; place-items: center; font-size: calc(var(--u) * 12); }
    .ret { width: calc(var(--u) * 20); height: calc(var(--u) * 20); border-radius: 50%; border: 2px solid #d9a92c; }
  `,
})
export class ChildSet {
  readonly block = input.required<SetBlock>();
  /** The subject's 3D picture, shown on the start card. */
  readonly hero = input<string>('');
  readonly finished = output<void>();

  readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'];
  readonly at = signal(0);
  readonly typed = signal('');
  readonly chosen = signal<number[]>([]);
  readonly picked = signal<number | null>(null);
  readonly feedback = signal<Feedback>(null);
  readonly tries = signal(0);
  /** Per item: right or not, and (for a missed item) what the child gave on the last try. */
  readonly results = signal<{ right: boolean; firstTry: boolean; given?: string }[]>([]);
  readonly summary = signal(false);
  /** An activity with a word of encouragement opens on it (as on the phone). */
  readonly started = signal(false);

  readonly item = computed(() => this.block().items[this.at()]);
  readonly tiles = computed(() => tilesFor(this.block().items, this.at()));
  readonly chosenWords = computed(() => this.chosen().map((i) => this.tiles()[i]));
  /** Choices: the right answer and two others from the same activity. */
  readonly options = computed(() => {
    const items = this.block().items;
    const i = this.at();
    const others = items.filter((_, k) => k !== i).map((it) => it.answer);
    const list = [items[i].answer, others[i % Math.max(1, others.length)], others[(i + 1) % Math.max(1, others.length)]].filter((x, k, a) => x && a.indexOf(x) === k);
    return list.map((x, k) => ({ x, k: (k * 7 + i * 3) % 5 })).sort((a, b) => a.k - b.k).map((o) => o.x);
  });
  readonly locked = computed(() => this.feedback() === 'good' || this.feedback() === 'reveal');
  readonly hasAnswer = computed(() => (this.block().answer === 'number' ? !!this.typed() : this.block().answer === 'words' ? this.chosen().length > 0 : this.picked() !== null));
  readonly rightCount = computed(() => this.results().filter((r) => r.right).length);

  press(k: string): void {
    if (k === '⌫') this.typed.update((t) => t.slice(0, -1));
    else if (this.typed().length < 6) this.typed.update((t) => t + k);
    if (this.feedback() === 'retry') this.feedback.set(null);
  }

  pick(i: number): void {
    this.chosen.update((c) => [...c, i]);
    if (this.feedback() === 'retry') this.feedback.set(null);
  }

  unpick(at: number): void {
    this.chosen.update((c) => c.filter((_, k) => k !== at));
  }

  check(): void {
    const s = this.block();
    const given = s.answer === 'number' ? this.typed() : s.answer === 'words' ? this.chosenWords().join(' ') : this.options()[this.picked() ?? -1] ?? '';
    const right = isRightAnswer(s.answer, this.item(), given);
    const tries = this.tries() + 1;
    this.tries.set(tries);
    if (right || tries >= 2) {
      this.results.update((r) => {
        const out = [...r];
        out[this.at()] = { right, firstTry: right && tries === 1, ...(right ? {} : { given }) };
        return out;
      });
    }
    this.feedback.set(right ? 'good' : tries >= 2 ? 'reveal' : 'retry');
  }

  again(): void {
    this.feedback.set(null);
    this.typed.set('');
    this.chosen.set([]);
    this.picked.set(null);
  }

  next(): void {
    this.again();
    this.tries.set(0);
    if (this.at() >= this.block().items.length - 1) this.summary.set(true);
    else this.at.update((a) => a + 1);
  }
}
