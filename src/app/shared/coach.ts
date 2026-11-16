import { Component, input } from '@angular/core';

export type CoachMood = 'happy' | 'cheer' | 'think';

/**
 * The lesson coach: a friendly open book with a sun-yellow bookmark.
 * Children hear scripted lines in the teacher's voice; the coach only reacts.
 */
@Component({
  selector: 'pl-coach',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 120 120" aria-hidden="true" [class]="mood()">
      <ellipse cx="60" cy="112" rx="34" ry="5" fill="#163C3B" opacity=".12" />
      <!-- arms -->
      @if (mood() === 'cheer') {
        <path d="M22 62 L8 38" stroke="#0F544B" stroke-width="8" stroke-linecap="round" />
        <path d="M98 62 L112 38" stroke="#0F544B" stroke-width="8" stroke-linecap="round" />
        <circle cx="8" cy="36" r="6" fill="#F6CC59" /><circle cx="112" cy="36" r="6" fill="#F6CC59" />
      } @else {
        <path d="M22 70 Q10 78 14 90" stroke="#0F544B" stroke-width="8" fill="none" stroke-linecap="round" />
        <path d="M98 70 Q110 78 106 90" stroke="#0F544B" stroke-width="8" fill="none" stroke-linecap="round" />
      }
      <!-- feet -->
      <ellipse cx="44" cy="106" rx="11" ry="6" fill="#0F544B" />
      <ellipse cx="76" cy="106" rx="11" ry="6" fill="#0F544B" />
      <!-- cover -->
      <rect x="16" y="24" width="88" height="82" rx="20" fill="#146B60" />
      <!-- pages -->
      <path d="M24 34 Q42 28 59 34 V98 Q42 92 24 98 Z" fill="#FFF9ED" />
      <path d="M96 34 Q78 28 61 34 V98 Q78 92 96 98 Z" fill="#FFFDF8" />
      <path d="M60 33 V99" stroke="#E8E1D1" stroke-width="3" />
      <!-- bookmark -->
      <path d="M72 18 h12 v26 l-6 -5 l-6 5 z" fill="#F6CC59" />
      <!-- eyes -->
      @if (mood() === 'think') {
        <ellipse cx="42" cy="56" rx="6" ry="7" fill="#163C3B" /><circle cx="44" cy="52" r="2.2" fill="#fff" />
        <ellipse cx="78" cy="56" rx="6" ry="7" fill="#163C3B" /><circle cx="80" cy="52" r="2.2" fill="#fff" />
      } @else if (mood() === 'cheer') {
        <path d="M35 58 Q42 49 49 58" stroke="#163C3B" stroke-width="5" fill="none" stroke-linecap="round" />
        <path d="M71 58 Q78 49 85 58" stroke="#163C3B" stroke-width="5" fill="none" stroke-linecap="round" />
      } @else {
        <ellipse cx="42" cy="57" rx="6" ry="7.5" fill="#163C3B" /><circle cx="44" cy="54" r="2.4" fill="#fff" />
        <ellipse cx="78" cy="57" rx="6" ry="7.5" fill="#163C3B" /><circle cx="80" cy="54" r="2.4" fill="#fff" />
      }
      <!-- cheeks -->
      <ellipse cx="33" cy="70" rx="5" ry="3.5" fill="#F6CC59" opacity=".55" />
      <ellipse cx="87" cy="70" rx="5" ry="3.5" fill="#F6CC59" opacity=".55" />
      <!-- mouth -->
      @if (mood() === 'think') {
        <ellipse cx="60" cy="76" rx="5" ry="4" fill="#163C3B" />
      } @else if (mood() === 'cheer') {
        <path d="M47 70 Q60 88 73 70 Z" fill="#163C3B" /><path d="M53 78 Q60 84 67 78 Q60 80 53 78" fill="#E9806F" />
      } @else {
        <path d="M49 72 Q60 82 71 72" stroke="#163C3B" stroke-width="4.5" fill="none" stroke-linecap="round" />
      }
    </svg>
  `,
  styles: `
    :host { display: inline-block; line-height: 0; }
    svg.cheer { animation: hop .7s ease-in-out 2; transform-origin: 50% 100%; }
    @keyframes hop { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-8px) scale(1.03, .97); } }
  `,
})
export class Coach {
  readonly mood = input<CoachMood>('happy');
  readonly size = input(96);
}
