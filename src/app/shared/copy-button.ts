import { Component, input, signal } from '@angular/core';

/** Copies a code or link to the clipboard and says so for two seconds. */
@Component({
  selector: 'pl-copy',
  template: `
    <button type="button" class="btn btn-ghost btn-sm" (click)="copy()" [attr.aria-label]="(done() ? 'Copied ' : 'Copy ') + what()">
      {{ done() ? 'Copied ✓' : label() }}
    </button>
  `,
})
export class CopyButton {
  readonly text = input.required<string>();
  readonly label = input('Copy');
  readonly what = input('');
  readonly done = signal(false);

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text());
    } catch {
      // Older browsers: select-and-copy fallback.
      const t = document.createElement('textarea');
      t.value = this.text();
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    this.done.set(true);
    setTimeout(() => this.done.set(false), 2000);
  }
}
