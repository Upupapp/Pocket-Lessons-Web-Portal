import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminStudent, ago, avatarEmoji, fmtDate } from '../../core/admin-models';
import { AdminService, adminError } from '../../core/admin.service';

/** A-15 Children added by parents on the phone. Approved automatically; the administrator marks them as seen. */
@Component({
  selector: 'pl-admin-parent-added',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div>
        <p class="eyebrow">Added by parents</p>
        <h1>Children added by parents</h1>
        <p>Parents can add a child on the phone, even without signal. The child can learn at once; no approval is needed.</p>
      </div>
    </div>

    <p class="adm-info">
      The center receives a new child at the phone's next sync (the teacher's hub or the internet).
      Look through the list, put each child in a class, then mark them as seen.
    </p>

    @if (error()) { <p class="adm-msg" role="alert">{{ error() }}</p> }

    <div class="tabs" role="tablist" aria-label="Filter">
      <button type="button" role="tab" [class.on]="filter() === 'new'" [attr.aria-selected]="filter() === 'new'" (click)="filter.set('new')">New ({{ newCount() }})</button>
      <button type="button" role="tab" [class.on]="filter() === 'all'" [attr.aria-selected]="filter() === 'all'" (click)="filter.set('all')">All ({{ list().length }})</button>
    </div>

    <div class="cards">
      @for (s of rows(); track s.id) {
        <article class="card kid" [class.seen]="s.reviewed">
          <div class="who">
            <span class="big-avatar" aria-hidden="true">{{ emoji(s.avatar) }}</span>
            <div>
              <h2>{{ s.name }}</h2>
              <p class="small muted">Grade {{ s.grade }} · {{ s.center }}</p>
            </div>
          </div>
          <dl>
            <div><dt>Parent</dt><dd>{{ s.parentName || '—' }}</dd></div>
            <div><dt>Added</dt><dd>{{ fmt(s.createdAt) }} · {{ ago(s.createdAt) }}</dd></div>
            <div><dt>Class</dt><dd>{{ s.className || 'No class yet' }}</dd></div>
          </dl>
          <div class="status">
            <span class="pill pill-teal">Approved automatically</span>
            @if (s.reviewed) { <span class="pill pill-grey">Seen</span> } @else { <span class="pill pill-sun">New</span> }
          </div>
          <div class="adm-actions start">
            @if (!s.reviewed) {
              <button type="button" class="btn btn-primary btn-sm" (click)="seen(s)" [disabled]="busy()">Mark as seen</button>
            }
            <a class="btn btn-ghost btn-sm" routerLink="/admin/students" [queryParams]="{ center: s.centerId }">Put in a class</a>
          </div>
        </article>
      } @empty {
        <div class="empty wide">{{ loaded() ? (filter() === 'new' ? 'Nothing new. Every child added by a parent has been seen.' : 'No parent has added a child yet.') : 'Loading…' }}</div>
      }
    </div>
  `,
  styles: `
    .tabs { display: inline-flex; background: var(--cream-2); border-radius: 999px; padding: 4px; margin-bottom: 16px; }
    .tabs button { border: 0; background: transparent; border-radius: 999px; min-height: 36px; padding: 0 16px; font: 700 14px var(--font); color: var(--muted); cursor: pointer; }
    .tabs button.on { background: var(--white); color: var(--ink); box-shadow: 0 1px 4px rgba(22, 60, 59, .15); }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .kid { display: grid; gap: 12px; }
    .kid.seen { opacity: .75; }
    .who { display: flex; gap: 12px; align-items: center; }
    .big-avatar { font-size: 34px; width: 56px; height: 56px; display: grid; place-items: center; background: var(--sun-soft); border-radius: 50%; }
    h2 { font-family: var(--serif); font-size: 20px; }
    dl { margin: 0; display: grid; gap: 4px; font-size: 14px; }
    dl div { display: flex; gap: 8px; }
    dt { color: var(--muted); min-width: 56px; }
    dd { margin: 0; font-weight: 700; }
    .status { display: flex; gap: 6px; flex-wrap: wrap; }
    .start { justify-content: flex-start; }
    .wide { grid-column: 1 / -1; }
  `,
})
export class AdminParentAddedPage {
  private readonly admin = inject(AdminService);
  readonly emoji = avatarEmoji;
  readonly fmt = fmtDate;
  readonly ago = ago;
  readonly list = signal<AdminStudent[]>([]);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly filter = signal<'new' | 'all'>('new');
  readonly newCount = computed(() => this.list().filter((s) => !s.reviewed).length);
  /** Children marked as seen on this visit stay on the "New" list (with a "Seen" pill) until the page is left. */
  private readonly justSeen = signal<ReadonlySet<string>>(new Set());
  readonly rows = computed(() =>
    this.filter() === 'new' ? this.list().filter((s) => !s.reviewed || this.justSeen().has(s.id)) : this.list(),
  );

  constructor() {
    this.admin.parentAdded().then(
      (l) => {
        this.list.set(l);
        if (!l.some((s) => !s.reviewed)) this.filter.set('all');
        this.loaded.set(true);
      },
      (e) => {
        this.error.set(adminError(e));
        this.loaded.set(true);
      },
    );
  }

  async seen(s: AdminStudent): Promise<void> {
    this.busy.set(true);
    try {
      const updated = await this.admin.markReviewed(s.id);
      this.justSeen.update((set) => new Set(set).add(s.id));
      this.list.update((l) => l.map((x) => (x.id === s.id ? updated : x)));
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
