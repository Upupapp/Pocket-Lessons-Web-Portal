import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { PACK_LIMIT_BYTES, daysSince, formatBytes } from '../../core/models';

/** Teacher dashboard (WEB-01), focused on making lessons and checking reading. */
@Component({
  selector: 'pl-overview',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="hello">
      <div>
        <p class="eyebrow">{{ today | date: 'EEEE, d MMMM' }} · {{ auth.user()?.center }}</p>
        <h1>{{ greeting() }}, {{ firstName() }}</h1>
        <p class="muted">Here is what needs you today.</p>
      </div>
      <div class="quick">
        <a class="btn btn-primary" routerLink="/app/lessons/new">+ New lesson</a>
        <a class="btn btn-sun" routerLink="/app/assess">Check a child's reading</a>
        <a class="btn btn-ghost" routerLink="/app/learners">Add learner</a>
      </div>
    </div>

    <div class="kpis">
      <a class="kpi" routerLink="/app/learners">
        <span class="k-label">Learners</span>
        <strong>{{ data.learners().length }}</strong>
        <span class="k-sub">in {{ groupsInUse() }} reading groups</span>
      </a>
      <a class="kpi" routerLink="/app/lessons">
        <span class="k-label">Published lessons</span>
        <strong>{{ published().length }}</strong>
        <span class="k-sub">{{ drafts().length }} draft{{ drafts().length === 1 ? '' : 's' }} in progress</span>
      </a>
      <a class="kpi" routerLink="/app/assess">
        <span class="k-label">Reading checks, last 30 days</span>
        <strong>{{ recentChecks() }}</strong>
        <span class="k-sub">{{ movedUp() }} moved up a level</span>
      </a>
      <a class="kpi warn" routerLink="/app/assess" [class.ok]="!data.needsCheck().length">
        <span class="k-label">Need a reading check</span>
        <strong>{{ data.needsCheck().length }}</strong>
        <span class="k-sub">no check in 30 days</span>
      </a>
    </div>

    <div class="cols">
      <section class="card">
        <div class="sec-head">
          <h2>Your lessons</h2>
          <a routerLink="/app/lessons">See all</a>
        </div>
        @if (recentLessons().length) {
          <ul class="lessons">
            @for (l of recentLessons(); track l.id) {
              <li>
                <a [routerLink]="['/app/lessons', l.id]">
                  <div class="l-main">
                    <strong>{{ l.title || 'Untitled lesson' }}</strong>
                    <span class="small muted">{{ l.level }} · {{ l.pages.length }} pages · {{ recorded(l) }} recorded</span>
                    <div class="meter"><span [style.width.%]="pct(l)"></span></div>
                  </div>
                  <div class="l-side">
                    <span class="pill" [class.pill-teal]="l.status === 'published'" [class.pill-grey]="l.status === 'draft'">{{ l.status === 'published' ? 'Published' : 'Draft' }}</span>
                    <span class="small muted">{{ fmt(data.packBytes(l)) }}</span>
                  </div>
                </a>
              </li>
            }
          </ul>
        } @else {
          <div class="empty">No lessons yet. <a routerLink="/app/lessons/new">Create your first lesson</a></div>
        }
        <div class="tip">
          <strong>Tip:</strong> keep lessons 5 to 10 minutes and record every page. The pack check tells you when it is ready to publish.
        </div>
      </section>

      <div class="stack">
        <section class="card">
          <div class="sec-head">
            <h2>Reading levels</h2>
            <a routerLink="/app/learners">Groups</a>
          </div>
          <ul class="levels">
            @for (g of data.levelCounts(); track g.level) {
              <li>
                <span class="lv">{{ g.level }}</span>
                <div class="bar"><span [style.width.%]="share(g.count)"></span></div>
                <span class="n">{{ g.count }}</span>
              </li>
            }
          </ul>
        </section>

        <section class="card">
          <div class="sec-head">
            <h2>Needs a reading check</h2>
            <span class="pill pill-red">{{ data.needsCheck().length }}</span>
          </div>
          @if (data.needsCheck().length) {
            <ul class="people">
              @for (r of data.needsCheck().slice(0, 5); track r.learner.id) {
                <li>
                  <span class="avatar" aria-hidden="true">{{ r.learner.name.charAt(0) }}</span>
                  <div class="p-main">
                    <strong>{{ r.learner.name }}</strong>
                    <span class="small muted">{{ r.learner.level }} · {{ r.last ? daysSince(r.last.date) + ' days since last check' : 'Never checked' }}</span>
                  </div>
                  <a class="btn btn-ghost btn-sm" routerLink="/app/assess" [queryParams]="{ learner: r.learner.id }">Check</a>
                </li>
              }
            </ul>
          } @else {
            <p class="muted">Everyone has a check in the last 30 days.</p>
          }
        </section>
      </div>
    </div>

    <section class="card recent">
      <div class="sec-head">
        <h2>Recent checks</h2>
        <a routerLink="/app/assess">New check</a>
      </div>
      @if (latest().length) {
        <table class="table">
          <thead><tr><th>Learner</th><th>Check</th><th>Level</th><th>Result</th><th>When</th></tr></thead>
          <tbody>
            @for (a of latest(); track a.id) {
              <tr>
                <td><a [routerLink]="['/app/learners', a.learnerId]">{{ data.learner(a.learnerId)?.name }}</a></td>
                <td>{{ a.type === 'placement' ? 'Reading level' : 'Timed reading' }}</td>
                <td><span class="pill pill-sun">{{ a.level }}</span></td>
                <td class="small">@if (a.type === 'fluency') { {{ a.accuracy }}% · {{ a.wcpm }} wcpm } @else { — }</td>
                <td class="small muted">{{ a.date | date: 'd MMM' }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div class="empty">No checks yet.</div>
      }
    </section>
  `,
  styles: `
    .hello { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; }
    h1 { font-family: var(--serif); font-size: 34px; margin: 6px 0 4px; }
    .quick { display: flex; gap: 10px; flex-wrap: wrap; }
    .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi {
      background: var(--white); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 16px 18px;
      display: grid; gap: 2px; text-decoration: none; color: var(--ink); box-shadow: var(--shadow); transition: transform .12s;
      &:hover { transform: translateY(-2px); }
      strong { font: 700 34px/1.1 var(--serif); }
    }
    .k-label { font-size: 13px; font-weight: 700; color: var(--muted); }
    .k-sub { font-size: 13px; color: var(--muted); }
    .kpi.warn { background: #fff6f3; border-color: #f0d3cb; strong { color: var(--red); } }
    .kpi.warn.ok { background: var(--white); border-color: var(--line); strong { color: var(--teal); } }
    .cols { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 20px; margin-bottom: 20px; align-items: start; }
    .stack { display: grid; gap: 20px; }
    .sec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .sec-head a { font-weight: 700; text-decoration: none; font-size: 14px; }
    h2 { font-family: var(--serif); font-size: 20px; }
    .lessons { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
    .lessons a { display: flex; gap: 14px; justify-content: space-between; align-items: center; padding: 12px; border-radius: var(--r-md); border: 1px solid var(--line); text-decoration: none; color: var(--ink); }
    .lessons a:hover { border-color: var(--teal); background: #f9fdf8; }
    .l-main { display: grid; gap: 4px; flex: 1; min-width: 0; }
    .l-side { display: grid; justify-items: end; gap: 4px; }
    .meter { height: 5px; border-radius: 999px; background: var(--cream-2); overflow: hidden; max-width: 260px; }
    .meter span { display: block; height: 100%; background: var(--teal); }
    .tip { margin-top: 14px; font-size: 13.5px; background: var(--sun-soft); padding: 10px 14px; border-radius: var(--r-md); }
    .levels { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .levels li { display: grid; grid-template-columns: 84px 1fr 28px; gap: 10px; align-items: center; }
    .lv { font-weight: 700; font-size: 14px; }
    .bar { height: 12px; border-radius: 999px; background: var(--cream-2); overflow: hidden; }
    .bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #5fc7b5, var(--teal)); }
    .n { text-align: right; font-weight: 700; }
    .people { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .people li { display: flex; align-items: center; gap: 12px; }
    .p-main { display: grid; flex: 1; min-width: 0; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--sun); color: #3d2e00; display: grid; place-items: center; font-weight: 700; flex: none; }
    .recent { overflow-x: auto; }
    .recent td a { font-weight: 700; text-decoration: none; }
    @media (max-width: 1100px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .cols { grid-template-columns: 1fr; } }
    @media (max-width: 560px) { .kpis { grid-template-columns: 1fr; } }
  `,
})
export class Overview {
  readonly data = inject(DataService);
  readonly auth = inject(AuthService);
  readonly today = new Date();
  readonly fmt = formatBytes;
  readonly daysSince = daysSince;

  readonly firstName = computed(() => (this.auth.user()?.name ?? '').split(' ')[0]);
  readonly greeting = computed(() => {
    const h = this.today.getHours();
    return h < 12 ? 'Magandang umaga' : h < 18 ? 'Magandang hapon' : 'Magandang gabi';
  });
  readonly published = computed(() => this.data.lessons().filter((l) => l.status === 'published'));
  readonly drafts = computed(() => this.data.lessons().filter((l) => l.status === 'draft'));
  readonly groupsInUse = computed(() => this.data.levelCounts().filter((g) => g.count > 0).length);
  readonly recentLessons = computed(() => [...this.data.lessons()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4));
  readonly latest = computed(() => [...this.data.assessments()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6));
  readonly recentChecks = computed(() => this.data.assessments().filter((a) => daysSince(a.date) <= 30).length);
  readonly movedUp = computed(
    () =>
      this.data
        .assessments()
        .filter((a) => daysSince(a.date) <= 30 && a.previousLevel && a.previousLevel !== a.level)
        .filter((a) => ['Beginner', 'Letter', 'Word', 'Paragraph', 'Story'].indexOf(a.level) > ['Beginner', 'Letter', 'Word', 'Paragraph', 'Story'].indexOf(a.previousLevel!)).length,
  );

  share(count: number): number {
    const total = this.data.learners().length || 1;
    return (count / total) * 100;
  }

  recorded(l: { pages: { audioId?: string }[] }): number {
    return l.pages.filter((p) => p.audioId).length;
  }

  pct(l: Parameters<DataService['packBytes']>[0]): number {
    return Math.min(100, (this.data.packBytes(l) / PACK_LIMIT_BYTES) * 100);
  }
}
