import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { checkedWithin, childSpeedRows, classSpeed, levelMoves, levelParts, weeklySpeeds } from '../../core/insights';
import { PACK_LIMIT_BYTES, daysSince, formatBytes, levelIndex, plural } from '../../core/models';
import { CHART } from '../../shared/charts/chart-kit';
import { DonutChart } from '../../shared/charts/donut';
import { LineChart } from '../../shared/charts/line-chart';
import { RingMeter } from '../../shared/charts/ring';
import { SparkList } from '../../shared/charts/spark-list';
import { UpDownChart } from '../../shared/charts/updown-chart';

/** Teacher dashboard (WEB-01): reading progress at a glance, then what needs doing today. */
@Component({
  selector: 'pl-overview',
  imports: [RouterLink, DatePipe, LineChart, RingMeter, UpDownChart, DonutChart, SparkList],
  template: `
    <div class="hello">
      <div>
        <h1>{{ greeting() }}, {{ firstName() }}</h1>
        <p class="meta">{{ today | date: 'EEEE, d MMMM' }} · Here is how your learners are reading, and what needs you today.</p>
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
      <a class="kpi" routerLink="/app/assess" [class.warn]="data.needsCheck().length > 0">
        <span class="k-label">Need a reading check</span>
        <strong>{{ data.needsCheck().length }}</strong>
        <span class="k-sub">no check in 30 days</span>
      </a>
    </div>

    <div class="grid wide">
      <section class="card">
        <pl-line-chart
          title="Reading speed"
          [caption]="speedCaption()"
          [points]="speed().points"
          unit="wcpm"
          valueName="Words correct per minute"
          empty="No timed readings in the last 12 weeks. A one-minute timed reading starts this line."
        >
          @if (speed().change !== null) {
            <span aside class="delta" [class.up]="speed().change! > 0" [class.down]="speed().change! < 0">
              @if (speed().change! > 0) {
                <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 11 9.5H1z" fill="currentColor" /></svg>
              } @else if (speed().change! < 0) {
                <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10.5 1 2.5h10z" fill="currentColor" /></svg>
              }
              {{ speed().change! > 0 ? '+' : '' }}{{ speed().change }} wcpm in 4 weeks
            </span>
          }
        </pl-line-chart>
      </section>
      <section class="card">
        <pl-ring
          title="Checked in the last 30 days"
          caption="A check every month keeps each child's level right."
          [value]="checked()"
          [total]="data.learners().length"
          what="learners checked in the last 30 days"
        >
          <p><strong>{{ data.learners().length - checked() }}</strong> {{ data.learners().length - checked() === 1 ? 'learner still needs' : 'learners still need' }} a check this month.</p>
          <a class="btn btn-ghost btn-sm" routerLink="/app/assess">Check a child's reading</a>
        </pl-ring>
      </section>
    </div>

    <div class="grid half">
      <section class="card">
        <pl-updown-chart title="Level moves" caption="Reading-level checks that moved a child up or down, week by week." [weeks]="moves()" />
      </section>
      <section class="card">
        <pl-donut title="Reading levels" caption="Where your learners read today, from Beginner to Story." [parts]="levels()" unit="learners" one="learner" empty="Add learners to see their reading levels." />
      </section>
    </div>

    <div class="grid wide">
      <section class="card">
        <pl-spark-list
          title="Each child's reading speed"
          caption="Twelve weeks of timed readings. Children who slowed down come first, so you can help them sooner."
          [rows]="children()"
        />
      </section>
      <section class="card">
        <div class="sec-head">
          <h2>Needs a reading check</h2>
          <span class="pill pill-red">{{ data.needsCheck().length }}</span>
        </div>
        @if (data.needsCheck().length) {
          <ul class="people">
            @for (r of data.needsCheck().slice(0, 6); track r.learner.id) {
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

    <div class="grid wide">
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
                  <td><span class="lvl" [attr.data-level]="a.level">{{ a.level }}</span></td>
                  <td class="small">@if (a.type === 'fluency') { {{ a.wcpm }} wcpm · {{ a.accuracy }}% } @else { — }</td>
                  <td class="small muted nowrap">{{ a.date | date: 'd MMM' }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="empty">No checks yet.</div>
        }
      </section>
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
                    <span class="small muted">{{ l.level }} · {{ plural(l.pages.length, 'page') }} · {{ recorded(l) }} recorded</span>
                    <div class="meter" role="img" [attr.aria-label]="'Pack size ' + fmt(data.packBytes(l)) + ' of 2 MB'"><span [style.width.%]="pct(l)"></span></div>
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
        <p class="tip">Keep lessons 5 to 10 minutes and record every page. The pack check tells you when a lesson is ready to publish.</p>
      </section>

    </div>
  `,
  styles: `
    .hello { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; }
    h1 { font-family: var(--serif); font-size: 32px; margin: 0 0 6px; }
    .meta { color: var(--muted); }
    .quick { display: flex; gap: 10px; flex-wrap: wrap; }
    .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
    .kpi {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 16px 18px;
      display: grid; gap: 2px; text-decoration: none; color: var(--ink); box-shadow: var(--shadow);
      transition: border-color .15s, box-shadow .15s;
      strong { font: 600 30px/1.15 var(--font); color: var(--ink); }
    }
    .kpi:hover { border-color: var(--accent-tint-2); box-shadow: var(--shadow-raise); }
    .k-label { font-size: 13px; font-weight: 700; color: var(--muted); }
    .k-sub { font-size: 13px; color: var(--muted); }
    .kpi.warn strong { color: var(--bad); }
    .grid { display: grid; gap: 18px; margin-bottom: 18px; align-items: stretch; }
    .grid.wide { grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr); }
    .grid.half { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    .delta { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; font-size: 12.5px; font-weight: 700; background: #eef1ee; color: var(--muted); white-space: nowrap; }
    .delta.up { background: var(--good-bg); color: var(--good); }
    .delta.down { background: var(--bad-bg); color: var(--bad); }
    .sec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .sec-head a { font-weight: 700; text-decoration: none; font-size: 14px; }
    h2 { font-family: var(--serif); font-size: 19px; }
    .lessons { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
    .lessons a { display: flex; gap: 14px; justify-content: space-between; align-items: center; padding: 12px; border-radius: var(--r-md); border: 1px solid var(--line); text-decoration: none; color: var(--ink); transition: border-color .15s, background .15s; }
    .lessons a:hover { border-color: var(--accent-tint-2); background: var(--surface-2); }
    .l-main { display: grid; gap: 4px; flex: 1; min-width: 0; }
    .l-side { display: grid; justify-items: end; gap: 4px; }
    .meter { height: 5px; border-radius: 999px; background: ${CHART.track}; overflow: hidden; max-width: 260px; }
    .meter span { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
    .tip { margin-top: 14px; font-size: 13px; color: var(--muted); padding: 10px 12px; border-radius: var(--r-md); background: var(--surface-2); border: 1px solid var(--line); }
    .people { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .people li { display: flex; align-items: center; gap: 12px; }
    .p-main { display: grid; flex: 1; min-width: 0; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--accent-tint); border: 1px solid var(--accent-tint-2); color: var(--title); display: grid; place-items: center; font-weight: 700; flex: none; }
    .recent { overflow-x: auto; }
    .recent td a { font-weight: 700; text-decoration: none; }
    .recent td.nowrap, .recent th { white-space: nowrap; }
    @media (max-width: 1180px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .grid.wide, .grid.half { grid-template-columns: 1fr; } }
    @media (max-width: 560px) { .kpis { grid-template-columns: 1fr 1fr; gap: 10px; } .kpi strong { font-size: 26px; } h1 { font-size: 27px; } }
  `,
})
export class Overview {
  readonly data = inject(DataService);
  readonly auth = inject(AuthService);
  readonly today = new Date();
  readonly fmt = formatBytes;
  readonly plural = plural;
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
        .filter((a) => daysSince(a.date) <= 30 && a.previousLevel && levelIndex(a.level) > levelIndex(a.previousLevel)).length,
  );

  // Charts
  private readonly speeds = computed(() => weeklySpeeds(this.data.assessments()));
  readonly speed = computed(() => classSpeed(this.speeds()));
  readonly speedCaption = computed(() => {
    const s = this.speed();
    return s.sameChildren
      ? `Average words correct per minute, each week, for the ${s.children} children timed almost every week.`
      : 'Average words correct per minute in each week’s timed readings.';
  });
  readonly checked = computed(() => checkedWithin(this.data.learners(), this.data.assessments(), 30));
  readonly moves = computed(() => levelMoves(this.data.assessments()));
  readonly levels = computed(() => levelParts(this.data.learners()));
  readonly children = computed(() => childSpeedRows(this.data.learners(), this.speeds()));

  recorded(l: { pages: { audioId?: string }[] }): number {
    return l.pages.filter((p) => p.audioId).length;
  }

  pct(l: Parameters<DataService['packBytes']>[0]): number {
    return Math.min(100, (this.data.packBytes(l) / PACK_LIMIT_BYTES) * 100);
  }
}
