import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { Logo } from '../../shared/logo';
import { Qr } from '../../shared/qr';
import { WaveBg } from '../../shared/wave-bg';

/** What the local publish step writes next to the app file (public/downloads/app.json, never committed). */
interface AppBuild {
  name: string;
  version: string;
  build: string;
  file: string;
  sizeBytes: number;
  builtAt: string;
  sha256: string;
  /** The computer's Wi-Fi address, so a phone on the same Wi-Fi can open this page. */
  lanHost?: string;
}

/**
 * LOCAL SERVER ONLY (/get-the-app, registered in local-only.routes.development.ts for ng serve).
 * Hands out the Android test build of the mobile app: download it here, or scan the code with a phone
 * on the same Wi-Fi. The app file itself lives in public/downloads/, which git ignores.
 */
@Component({
  selector: 'pl-get-the-app',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Logo, Qr, WaveBg],
  template: `
    <main class="page ws">
      <pl-wave-bg />
      <div class="inner">
        <header class="top">
          <pl-logo />
          <span class="local">Local server only</span>
        </header>

        <section class="card sheet" aria-labelledby="t">
          @if (state() === 'loading') {
            <p class="muted" role="status">Looking for the app file…</p>
          } @else if (state() === 'missing') {
            <h1 id="t">No app file yet</h1>
            <p class="muted">The Android test build has not been placed on this server. Build it from the mobile app folder, then publish it here:</p>
            <pre class="cmd">flutter build apk --release
node publish-apk-locally.mjs</pre>
          } @else if (info(); as a) {
            <div class="main">
              <div class="about">
                <p class="eyebrow">Android test build</p>
                <h1 id="t">Get the {{ a.name }} app</h1>
                <p class="lead">The children’s and parents’ app, for testing on an Android phone. It links to this computer’s server with the family’s 6-digit code.</p>

                <dl class="facts">
                  <div><dt>Version</dt><dd>{{ a.version }} (build {{ a.build }})</dd></div>
                  <div><dt>Size</dt><dd>{{ size() }}</dd></div>
                  <div><dt>Built</dt><dd>{{ built().day }} <span class="nw">{{ built().time }}</span></dd></div>
                  <div><dt>Needs</dt><dd>Android 8 or newer</dd></div>
                </dl>

                <a class="btn btn-primary get" [href]="a.file" [attr.download]="fileName()">
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  Download the app (.apk)
                </a>
                <p class="sum small muted">Check: SHA-256 <code [title]="a.sha256">{{ a.sha256.slice(0, 16) }}…</code></p>
              </div>

              <aside class="scan" aria-label="Open this page on a phone">
                <pl-qr [text]="phoneUrl()" [size]="176" label="QR code that opens this page on a phone" />
                <p class="scan-t">Scan with the phone</p>
                <p class="small muted">The phone must be on the same Wi-Fi as this computer.</p>
                <p class="addr"><code>{{ phoneOrigin() }}</code><code>/get-the-app</code></p>
              </aside>
            </div>

            <h2>Installing on the phone</h2>
            <ol class="steps">
              <li>
                <strong>Download.</strong> If Chrome warns that the file might be harmful, choose <em>Download anyway</em>:
                it is our own test build, not from the Play Store.
              </li>
              <li>
                <strong>Open the file.</strong> The first time, Android asks to let your browser
                <em>install unknown apps</em>. Allow it, then go back.
              </li>
              <li>
                <strong>Install.</strong> If Play Protect says the app is unknown, choose <em>More details › Install anyway</em>.
                A newer test build installs over the old one and keeps its data.
              </li>
            </ol>
          }
        </section>

        <p class="foot small muted">This page exists only on the local server (ng serve). It is not part of the website on Netlify.</p>
      </div>
    </main>
  `,
  styles: `
    .page { position: relative; min-height: 100vh; min-height: 100dvh; }
    .inner { position: relative; z-index: 1; width: min(880px, 100%); margin: 0 auto; padding: 28px 20px 40px; display: grid; gap: 22px; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .local {
      font-size: 12.5px; font-weight: 700; letter-spacing: .02em; color: var(--warn);
      background: var(--warn-bg); border: 1px solid #ecdcae; border-radius: 999px; padding: 5px 11px;
    }
    .sheet { background: var(--surface); padding: 32px; display: grid; gap: 14px; }
    .main { display: grid; grid-template-columns: 1fr auto; gap: 32px; align-items: start; }
    .eyebrow { font-size: 12.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--icon); }
    h1 { font-family: var(--serif); font-size: clamp(26px, 4vw, 34px); line-height: 1.15; margin-top: 4px; }
    h2 { font-family: var(--serif); font-size: 20px; margin-top: 10px; padding-top: 18px; border-top: 1px solid var(--line); }
    .lead { color: var(--ink-2); margin-top: 8px; max-width: 46ch; }
    .facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 20px; margin: 20px 0 22px; }
    .facts div { display: grid; gap: 2px; }
    dt { font-size: 12.5px; color: var(--muted); }
    dd { margin: 0; font-weight: 700; color: var(--ink); }
    .get { display: inline-flex; align-items: center; gap: 10px; padding: 13px 20px; font-size: 16px; text-decoration: none; }
    .sum { margin-top: 10px; }
    code { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-size: 12.5px; }
    .scan {
      display: grid; justify-items: center; gap: 6px; text-align: center; width: 236px;
      padding: 18px 16px; border: 1px solid var(--line); border-radius: var(--r-lg); background: var(--surface-2);
    }
    .scan-t { font-weight: 700; color: var(--title); margin-top: 6px; }
    .addr { margin-top: 4px; }
    .addr code { display: block; color: var(--ink-2); }
    .nw { white-space: nowrap; }
    .steps { display: grid; gap: 12px; padding-left: 22px; margin: 0; color: var(--ink-2); max-width: 70ch; }
    .steps li::marker { color: var(--accent); font-weight: 700; }
    .steps strong { color: var(--ink); }
    .cmd {
      margin: 6px 0 0; padding: 14px 16px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--line);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-size: 13.5px; overflow-x: auto;
    }
    .foot { text-align: center; }
    /* On the phone itself the code is no use: the download comes first. */
    @media (max-width: 720px) {
      .sheet { padding: 22px 18px; }
      .main { grid-template-columns: 1fr; }
      .scan { display: none; }
      .get { width: 100%; justify-content: center; }
    }
  `,
})
export class GetTheApp implements OnInit {
  readonly state = signal<'loading' | 'ready' | 'missing'>('loading');
  readonly info = signal<AppBuild | null>(null);

  readonly fileName = computed(() => this.info()?.file.split('/').pop() ?? 'pocket-lessons.apk');
  readonly size = computed(() => {
    const b = this.info()?.sizeBytes ?? 0;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  });
  readonly built = computed(() => {
    const at = this.info()?.builtAt;
    if (!at) return { day: '', time: '' };
    const d = new Date(at);
    return {
      day: d.toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' }) + ',',
      time: d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }),
    };
  });
  /** On this computer "localhost" means nothing to a phone, so the code carries the Wi-Fi address instead. */
  readonly phoneOrigin = computed(() => {
    const { protocol, hostname, port } = location;
    const local = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
    const host = local && this.info()?.lanHost ? this.info()!.lanHost! : hostname;
    return `${protocol}//${host}${port ? ':' + port : ''}`;
  });
  readonly phoneUrl = computed(() => `${this.phoneOrigin()}/get-the-app`);

  async ngOnInit(): Promise<void> {
    try {
      const res = await fetch('downloads/app.json', { cache: 'no-store' });
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !type.includes('json')) throw new Error('no app file');
      this.info.set((await res.json()) as AppBuild);
      this.state.set('ready');
    } catch {
      this.state.set('missing');
    }
  }
}
