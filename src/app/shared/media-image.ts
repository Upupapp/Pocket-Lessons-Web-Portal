import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { media } from '../core/storage';

/** Shows a picture stored in IndexedDB. */
@Component({
  selector: 'pl-media-image',
  template: `@if (url()) { <img [src]="url()" [alt]="alt()" /> }`,
  styles: `:host { display: block; } img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: inherit; }`,
})
export class MediaImage {
  readonly mediaId = input<string | undefined>();
  readonly alt = input('');
  readonly url = signal('');

  constructor() {
    // Track only the media id; swap() reads url(), so run it untracked to avoid a clear-and-reload loop.
    effect(() => {
      const id = this.mediaId();
      untracked(() => this.swap(''));
      if (id) media.get(id).then((b) => b && id === this.mediaId() && this.swap(URL.createObjectURL(b)));
    });
    inject(DestroyRef).onDestroy(() => this.swap(''));
  }

  private swap(url: string): void {
    if (this.url()) URL.revokeObjectURL(this.url());
    this.url.set(url);
  }
}
