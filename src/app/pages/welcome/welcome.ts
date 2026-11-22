import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { local } from '../../core/storage';
import { Logo } from '../../shared/logo';

interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
}

const SLIDES: Slide[] = [
  {
    id: 'WEB-W1',
    eyebrow: 'Welcome, teacher',
    title: 'Keep learning connected',
    body: 'When classes close, your voice can still reach a child at home on the family phone, even with no signal.',
    points: ['Made for Grade 1 to 4 learners who are still learning to read', 'Lessons follow each child’s reading level, not their grade', 'No child goes seven days without a learning contact'],
  },
  {
    id: 'WEB-W2',
    eyebrow: 'Create',
    title: 'Create with your voice',
    body: 'Type a short story page by page, add a picture, and read each page aloud. Children hear a voice they know.',
    points: ['Most lessons take 15 minutes or less to make', 'Tap-only activities for children who cannot read yet', 'A pack check keeps every lesson light for older phones'],
  },
  {
    id: 'WEB-W3',
    eyebrow: 'Reach and review',
    title: 'Reach learners offline',
    body: 'Lessons travel by the center hotspot box, phone to phone, or online. Each child’s reading comes back to you.',
    points: ['Families collect a month of lessons in one visit', 'Listen to reading recordings and check accuracy', 'Track reading levels from baseline to endline'],
  },
];

@Component({
  selector: 'pl-welcome',
  imports: [RouterLink, Logo],
  template: `
    <main class="wrap">
      <section class="art" aria-hidden="true">
        <pl-logo [light]="true" variant="full" [height]="76" />
        <div class="stage">
          @switch (index()) {
            @case (0) {
              <svg viewBox="0 0 320 260">
                <circle cx="160" cy="130" r="112" fill="#0F4A44" />
                <circle cx="160" cy="130" r="78" fill="none" stroke="#5FC7B5" stroke-width="2" stroke-dasharray="2 8" class="spin" />
                <rect x="112" y="72" width="96" height="120" rx="16" fill="#FFF9ED" />
                <rect x="176" y="72" width="32" height="20" rx="7" fill="#F6CC59" />
                <rect x="128" y="104" width="44" height="8" rx="4" fill="#146B60" />
                <rect x="128" y="122" width="64" height="8" rx="4" fill="#146B60" opacity=".5" />
                <g class="bars" fill="#146B60">
                  <rect x="128" y="146" width="7" height="26" rx="3.5" /><rect x="140" y="146" width="7" height="26" rx="3.5" />
                  <rect x="152" y="146" width="7" height="26" rx="3.5" /><rect x="164" y="146" width="7" height="26" rx="3.5" />
                  <rect x="176" y="146" width="7" height="26" rx="3.5" />
                </g>
                <circle cx="222" cy="196" r="24" fill="#F6CC59" />
                <rect x="215" y="183" width="14" height="20" rx="7" fill="#163C3B" />
                <path d="M210 197a12 12 0 0 0 24 0M222 209v6" stroke="#163C3B" stroke-width="3" fill="none" stroke-linecap="round" />
              </svg>
            }
            @case (1) {
              <svg viewBox="0 0 320 260">
                <rect x="40" y="40" width="240" height="180" rx="22" fill="#0F4A44" />
                <rect x="62" y="62" width="196" height="96" rx="14" fill="#FFF9ED" />
                <circle cx="104" cy="110" r="26" fill="#F6CC59" />
                <path d="M92 104 l6 -14 6 10 6 -10 6 14z" fill="#163C3B" opacity=".85" />
                <text x="146" y="104" font-family="Fraunces, serif" font-size="20" font-weight="700" fill="#163C3B">Si Mimi</text>
                <text x="146" y="128" font-family="Atkinson Hyperlegible, sans-serif" font-size="15" fill="#146B60">
                  <tspan class="w w1">ay</tspan> <tspan class="w w2">pusa.</tspan>
                </text>
                <g class="bars" fill="#5FC7B5">
                  @for (x of wave; track $index) {
                    <rect [attr.x]="70 + $index * 12" y="176" width="7" height="28" rx="3.5" />
                  }
                </g>
                <circle cx="252" cy="190" r="18" fill="#F6CC59" />
                <circle cx="252" cy="190" r="7" fill="#B4473A" class="rec" />
              </svg>
            }
            @default {
              <svg viewBox="0 0 320 260">
                <rect x="20" y="96" width="70" height="70" rx="18" fill="#0F4A44" />
                <rect x="38" y="108" width="34" height="44" rx="7" fill="#FFF9ED" />
                <rect x="58" y="108" width="14" height="10" rx="3" fill="#F6CC59" />
                <g fill="none" stroke="#5FC7B5" stroke-width="2.4" stroke-dasharray="1 8" stroke-linecap="round" class="flow">
                  <path d="M92 131 C 150 60, 190 60, 242 131" /><path d="M92 131 L 242 131" /><path d="M92 131 C 150 202, 190 202, 242 131" />
                </g>
                <rect x="244" y="74" width="62" height="114" rx="16" fill="#0B2F2C" stroke="#F3E9D2" stroke-width="4" />
                <rect x="252" y="84" width="46" height="94" rx="10" fill="#146B60" />
                <circle cx="275" cy="131" r="13" fill="#F6CC59" />
                <path d="M269 131 l4 4 l8 -9" stroke="#163C3B" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                <g font-family="Atkinson Hyperlegible, sans-serif" font-size="12" font-weight="700" fill="#D2E6DF" text-anchor="middle">
                  <text x="167" y="70">Hotspot</text><text x="167" y="124">Phone to phone</text><text x="167" y="206">Online</text>
                </g>
              </svg>
            }
          }
        </div>
        <p class="tag">Baong aral, kahit walang signal.</p>
      </section>

      <section class="content">
        <div class="top">
          <span class="count">{{ index() + 1 }} of {{ slides.length }}</span>
          <a class="skip" routerLink="/sign-in" (click)="markSeen()">Skip</a>
        </div>

        <div class="body">
          <p class="eyebrow">{{ slide().eyebrow }}</p>
          <h1>{{ slide().title }}</h1>
          <p class="lead">{{ slide().body }}</p>
          <ul>
            @for (p of slide().points; track p) {
              <li>
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#E1F1DD" /><path d="M6 10.2l2.6 2.6L14 7.4" stroke="#146B60" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>
                {{ p }}
              </li>
            }
          </ul>
        </div>

        <div class="foot">
          <div class="dots" role="tablist" aria-label="Welcome pages">
            @for (s of slides; track s.id; let i = $index) {
              <a [routerLink]="['/welcome', i + 1]" role="tab" [attr.aria-selected]="i === index()" [attr.aria-label]="'Page ' + (i + 1)" [class.on]="i === index()"></a>
            }
          </div>
          <div class="actions">
            @if (index() > 0) {
              <a class="btn btn-ghost" [routerLink]="['/welcome', index()]">Back</a>
            }
            @if (index() < slides.length - 1) {
              <a class="btn btn-primary" [routerLink]="['/welcome', index() + 2]">Next</a>
            } @else {
              <a class="btn btn-primary" routerLink="/sign-in" (click)="markSeen()">Get started</a>
            }
          </div>
        </div>
      </section>
    </main>
  `,
  styles: `
    .wrap { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    .art {
      background: radial-gradient(110% 90% at 30% 10%, #0E4943, #0B3B37 55%, #072B27);
      color: #FFF9ED; display: flex; flex-direction: column; padding: 32px 40px; gap: 24px;
    }
    .stage { flex: 1; display: grid; place-items: center; }
    .stage svg { width: min(420px, 100%); height: auto; animation: in .5s ease-out both; }
    .tag { color: #F6CC59; font-weight: 700; font-size: 17px; }
    .content { display: flex; flex-direction: column; padding: 32px clamp(24px, 6vw, 88px); }
    .top { display: flex; justify-content: space-between; align-items: center; }
    .count { font-size: 13px; color: var(--muted); font-weight: 700; }
    .skip { font-weight: 700; text-decoration: none; }
    .body { flex: 1; display: flex; flex-direction: column; justify-content: center; max-width: 520px; animation: in .45s ease-out both; }
    h1 { font-family: var(--serif); font-size: clamp(34px, 4vw, 48px); margin: 10px 0 14px; }
    .lead { font-size: 18px; color: var(--ink-2); }
    ul { list-style: none; padding: 0; margin: 28px 0 0; display: grid; gap: 14px; }
    li { display: flex; gap: 12px; align-items: flex-start; font-size: 16px; }
    li svg { flex: none; margin-top: 2px; }
    .foot { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    .dots { display: flex; gap: 8px; }
    .dots a { width: 10px; height: 10px; border-radius: 999px; background: #D8D0BD; transition: width .2s, background .2s; }
    .dots a.on { width: 28px; background: var(--teal); }
    .actions { display: flex; gap: 10px; }
    .spin { transform-origin: 160px 130px; animation: spin 14s linear infinite; }
    .bars rect { transform-box: fill-box; transform-origin: center; animation: talk 1s ease-in-out infinite; }
    .bars rect:nth-child(2n) { animation-delay: -.3s; } .bars rect:nth-child(3n) { animation-delay: -.6s; }
    .w { animation: hl 2.4s ease-in-out infinite; } .w2 { animation-delay: .8s; }
    .rec { animation: blink 1.2s ease-in-out infinite; }
    .flow { animation: flow 1.4s linear infinite; }
    @keyframes in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes talk { 0%, 100% { transform: scaleY(.4); } 50% { transform: scaleY(1); } }
    @keyframes hl { 0%, 30% { fill: #146B60; } 40%, 60% { fill: #B98900; } 70%, 100% { fill: #146B60; } }
    @keyframes blink { 50% { opacity: .35; } }
    @keyframes flow { to { stroke-dashoffset: -36; } }
    @media (max-width: 860px) {
      .wrap { grid-template-columns: 1fr; }
      .art { padding: 20px; min-height: 300px; }
      .stage svg { width: min(300px, 80%); }
      .content { padding: 24px 20px; }
      .body { padding: 24px 0; }
    }
  `,
})
export class Welcome {
  private readonly router = inject(Router);
  readonly step = input<string>('1');
  readonly slides = SLIDES;
  readonly wave = Array.from({ length: 14 });
  readonly index = computed(() => {
    const n = Number(this.step());
    return Number.isInteger(n) && n >= 1 && n <= SLIDES.length ? n - 1 : 0;
  });
  readonly slide = computed(() => SLIDES[this.index()]);

  markSeen(): void {
    local.set('welcomeSeen', true);
  }
}
