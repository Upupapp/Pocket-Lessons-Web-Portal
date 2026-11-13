import { Component, input } from '@angular/core';

@Component({
  selector: 'pl-logo',
  template: `
    <span class="logo" [class.light]="light()">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <rect width="34" height="34" rx="10" [attr.fill]="light() ? '#F6CC59' : '#146B60'" />
        <rect x="9" y="7" width="16" height="20" rx="4" [attr.fill]="light() ? '#0B3B37' : '#FFF9ED'" />
        <rect x="18" y="7" width="7" height="5" rx="2" [attr.fill]="light() ? '#FFF9ED' : '#F6CC59'" />
        <rect x="12.5" y="15" width="7" height="2.4" rx="1.2" [attr.fill]="light() ? '#F6CC59' : '#146B60'" />
        <rect x="12.5" y="19.5" width="9" height="2.4" rx="1.2" [attr.fill]="light() ? '#F6CC59' : '#146B60'" opacity=".6" />
      </svg>
      <span class="word">Pocket Lessons</span>
    </span>
  `,
  styles: `
    .logo { display: inline-flex; align-items: center; gap: 10px; }
    .word { font-family: var(--serif); font-weight: 700; font-size: 19px; color: var(--ink); letter-spacing: -.01em; }
    .light .word { color: #FFF9ED; }
  `,
})
export class Logo {
  readonly light = input(false);
}
