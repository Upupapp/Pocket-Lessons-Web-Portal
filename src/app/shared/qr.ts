import { Component, computed, input } from '@angular/core';
import qrcode from 'qrcode-generator';

/** A QR code drawn as SVG squares, so a phone camera can open a link (for example a teacher's setup link). */
@Component({
  selector: 'pl-qr',
  template: `
    <svg [attr.viewBox]="'0 0 ' + view() + ' ' + view()" [attr.width]="size()" [attr.height]="size()" role="img" [attr.aria-label]="label()" shape-rendering="crispEdges">
      <rect [attr.width]="view()" [attr.height]="view()" fill="#fff" />
      @for (c of cells(); track $index) {
        <rect [attr.x]="c[0]" [attr.y]="c[1]" width="1" height="1" fill="#163C3B" />
      }
    </svg>
  `,
  styles: `:host { display: inline-block; line-height: 0; } svg { border-radius: 8px; }`,
})
export class Qr {
  readonly text = input.required<string>();
  readonly size = input(168);
  readonly label = input('QR code');

  private readonly code = computed(() => {
    const qr = qrcode(0, 'M');
    qr.addData(this.text());
    qr.make();
    return qr;
  });

  /** Module count plus a 2-module quiet zone on each side. */
  readonly view = computed(() => this.code().getModuleCount() + 4);

  readonly cells = computed(() => {
    const qr = this.code();
    const n = qr.getModuleCount();
    const out: [number, number][] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) out.push([c + 2, r + 2]);
    return out;
  });
}
