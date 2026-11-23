import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A laptop in 3D, drawn with CSS transforms only: silver deck with keyboard and trackpad, black glass bezel,
 * a lid that opens on its hinge (no maker's notch or logo; the lid's back carries the Pocket Lessons mark).
 * Whatever is placed inside shows on its screen (504 × 315, 16:10).
 *
 * The hinge's middle is at this element's top-left corner: the deck lies flat towards the viewer, the lid stands
 * up behind it. Put it inside an element with `transform-style: preserve-3d` and a perspective above it.
 * The lid stands open at 14°; set `.lid`'s transform (rotateX) to open or close it, and `.spill`'s opacity
 * for the screen's light on the keys.
 */
@Component({
  selector: 'pl-laptop-3d',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <div class="f base-top"><div class="spill"></div><div class="keys"></div><div class="pad"></div></div>
    <div class="f base-front"></div>
    <div class="f base-l"></div>
    <div class="f base-r"></div>
    <div class="p3 lid">
      <div class="f lid-front">
        <span class="cam-dot"></span>
        <div class="screen"><ng-content /></div>
      </div>
      <div class="f lid-back"><img src="brand/logo-icon.svg" alt="" draggable="false" /></div>
      <div class="f lid-top"></div>
      <div class="f lid-l"></div>
      <div class="f lid-r"></div>
    </div>
  `,
  styles: `
    :host { position: absolute; left: 0; top: 0; width: 0; height: 0; display: block; transform-style: preserve-3d; pointer-events: none; }
    .p3 { position: absolute; transform-style: preserve-3d; }
    .f { position: absolute; backface-visibility: hidden; }
    .base-top {
      left: -275px; top: 0; width: 550px; height: 360px; transform-origin: 50% 0; transform: rotateX(90deg); border-radius: 4px 4px 22px 22px;
      background: linear-gradient(180deg, #D9DDE1 0%, #E9ECEE 40%, #DDE1E4 100%); overflow: hidden;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .55), inset 0 -2px 0 rgba(0, 0, 0, .06);
    }
    .spill { position: absolute; inset: 0; background: radial-gradient(70% 55% at 50% 0%, rgba(255, 255, 255, .55), transparent 70%); }
    .keys {
      position: absolute; left: 44px; top: 30px; width: 462px; height: 158px; border-radius: 9px; background-color: #23282C;
      background-image: repeating-linear-gradient(90deg, transparent 0 30px, #3A4046 30px 33px), repeating-linear-gradient(0deg, transparent 0 23px, #3A4046 23px 26.4px);
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, .55), 0 1px 0 rgba(255, 255, 255, .7);
    }
    .keys::after { content: ''; position: absolute; left: 132px; right: 132px; bottom: 6px; height: 21px; border-radius: 3px; background: #23282C; box-shadow: 0 0 0 1px #3A4046; }
    .pad { position: absolute; left: 192px; top: 214px; width: 166px; height: 112px; border-radius: 11px; background: linear-gradient(180deg, #D3D7DB, #DCE0E3); box-shadow: inset 0 1px 2px rgba(0, 0, 0, .18), 0 1px 0 rgba(255, 255, 255, .8); }
    .base-front { left: -275px; top: 0; width: 550px; height: 13px; transform: translateZ(360px); border-radius: 0 0 14px 14px; background: linear-gradient(180deg, #C9CED2, #A9AFB5); }
    .base-front::after { content: ''; position: absolute; left: 50%; top: 0; width: 96px; height: 5px; margin-left: -48px; border-radius: 0 0 6px 6px; background: rgba(0, 0, 0, .14); }
    .base-l { left: -275px; top: 0; width: 360px; height: 13px; transform-origin: 0 0; transform: rotateY(-90deg); background: linear-gradient(90deg, #B5BBC0, #C7CCD0); }
    .base-r { left: 275px; top: 0; width: 360px; height: 13px; transform-origin: 0 0; transform: translateZ(360px) rotateY(90deg); background: linear-gradient(90deg, #C7CCD0, #ADB3B9); }
    .lid { left: -265px; top: -344px; width: 530px; height: 344px; transform-origin: 50% 100%; transform: rotateX(14deg); }
    .lid-front { inset: 0; border-radius: 16px 16px 5px 5px; background: #0E1416; box-shadow: inset 0 0 0 1.5px #2A3134; }
    .cam-dot { position: absolute; left: 50%; top: 6px; width: 5px; height: 5px; margin-left: -2.5px; border-radius: 50%; background: #1E2629; }
    .screen { position: absolute; left: 13px; top: 14px; width: 504px; height: 315px; border-radius: 4px; overflow: hidden; background: #0B1012; }
    .lid-back {
      inset: 0; transform: translateZ(-7px) rotateY(180deg); border-radius: 16px 16px 5px 5px; display: grid; place-items: center;
      background: linear-gradient(160deg, #E4E7EA, #CBD0D4 70%, #C2C7CC); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .6);
    }
    .lid-back img { width: 74px; height: 74px; filter: grayscale(1) brightness(1.25) contrast(.75); opacity: .55; }
    .lid-top { left: 0; top: 0; width: 530px; height: 7px; transform-origin: 50% 0; transform: translateZ(-7px) rotateX(90deg); border-radius: 4px; background: linear-gradient(90deg, #C2C7CC, #DDE1E4, #C2C7CC); }
    .lid-l { left: 0; top: 0; width: 7px; height: 344px; transform-origin: 0 0; transform: translateZ(-7px) rotateY(-90deg); background: #B9BFC4; }
    .lid-r { left: 530px; top: 0; width: 7px; height: 344px; transform-origin: 0 0; transform: rotateY(90deg); background: #AEB4BA; }
  `,
})
export class Laptop3d {}
