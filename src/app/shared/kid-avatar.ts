import { Component, computed, input } from '@angular/core';
import { AVATARS } from '../core/admin-models';

/** A child's avatar: the same 3D picture the mobile app shows, or their initial when none was chosen. */
@Component({
  selector: 'pl-kid',
  template: `
    @if (src(); as s) {
      <img [src]="s" alt="" [attr.width]="size()" [attr.height]="size()" loading="lazy" />
    } @else {
      <span class="init" [style.width.px]="size()" [style.height.px]="size()" [style.font-size.px]="size() * 0.46">{{ initial() }}</span>
    }
  `,
  styles: `
    :host { display: inline-flex; flex: none; line-height: 0; }
    img { display: block; object-fit: contain; }
    .init { display: grid; place-items: center; border-radius: 50%; background: var(--accent-tint, #edf5f0); border: 1px solid var(--accent-tint-2, #d6e7dd); color: var(--title, #0e3f36); font-weight: 700; line-height: 1; }
  `,
})
export class KidAvatar {
  readonly avatar = input<string | null | undefined>(null);
  readonly name = input('');
  readonly size = input(26);
  readonly src = computed(() => {
    const a = this.avatar();
    return a && (AVATARS as readonly string[]).includes(a) ? `icons3d/${a}.webp` : null;
  });
  readonly initial = computed(() => (this.name().trim().charAt(0) || '?').toUpperCase());
}

/** "teddy-bear" → "Teddy bear" */
export const avatarLabel = (a: string) => a.charAt(0).toUpperCase() + a.slice(1).replace(/-/g, ' ');
