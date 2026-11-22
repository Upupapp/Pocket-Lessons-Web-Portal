import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminCenter } from '../../core/admin-models';
import { AdminService, adminError } from '../../core/admin.service';
import { CopyButton } from '../../shared/copy-button';

/** A-03/A-04 Centers and each center's teacher invitation code (copy, new code, turn on or off). */
@Component({
  selector: 'pl-admin-centers',
  imports: [FormsModule, RouterLink, CopyButton],
  template: `
    <div class="page-head">
      <div>
        <p class="eyebrow">Centers</p>
        <h1>Centers and invitation codes</h1>
        <p>Teachers join a center with its invitation code. Turn a code off to allow setup links only.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="adding.set(!adding())">{{ adding() ? 'Close' : '+ Add a center' }}</button>
    </div>

    @if (error()) { <p class="adm-msg" role="alert">{{ error() }}</p> }

    @if (adding()) {
      <form class="card adm-gap" (ngSubmit)="add()">
        <h2 class="adm-card-title">Add a center</h2>
        <div class="row">
          <label class="field grow"><span>Center name</span><input class="input" name="n" [(ngModel)]="newName" placeholder="e.g. Better World Navotas" maxlength="120" /></label>
          <button class="btn btn-primary" type="submit" [disabled]="busy()">Add center</button>
        </div>
        <p class="hint">The center gets its own teacher invitation code straight away.</p>
      </form>
    }

    <div class="cards">
      @for (c of centers(); track c.id) {
        <article class="card center">
          <h2>{{ c.name }}</h2>
          <div class="counts">
            <a [routerLink]="['/admin/staff']" [queryParams]="{ center: c.id }"><strong>{{ c.staff }}</strong> staff</a>
            <a [routerLink]="['/admin/classes']" [queryParams]="{ center: c.id }"><strong>{{ c.classes }}</strong> classes</a>
            <a [routerLink]="['/admin/families']" [queryParams]="{ center: c.id }"><strong>{{ c.families }}</strong> families</a>
            <a [routerLink]="['/admin/students']" [queryParams]="{ center: c.id }"><strong>{{ c.children }}</strong> children</a>
          </div>
          <div class="invite" [class.off]="!c.invitationActive">
            <div class="invite-head">
              <span class="label">Teacher invitation code</span>
              @if (c.invitationActive) { <span class="pill pill-teal">On</span> } @else { <span class="pill pill-grey">Off</span> }
            </div>
            <p class="code" [attr.aria-label]="'Invitation code ' + c.invitationCode">{{ c.invitationCode }}</p>
            <p class="hint">{{ c.invitationActive ? 'Share it with new teachers at this center.' : 'Joining with this code is turned off. Send teachers a setup link instead.' }}</p>
            <div class="actions">
              <pl-copy [text]="c.invitationCode" what="invitation code" />
              <button type="button" class="btn btn-ghost btn-sm" (click)="invitation(c, 'new')" [disabled]="busy()">New code</button>
              @if (c.invitationActive) {
                <button type="button" class="btn btn-danger btn-sm" (click)="invitation(c, 'off')" [disabled]="busy()">Turn off</button>
              } @else {
                <button type="button" class="btn btn-primary btn-sm" (click)="invitation(c, 'on')" [disabled]="busy()">Turn on</button>
              }
            </div>
          </div>
        </article>
      } @empty {
        @if (!error()) { <p class="muted" role="status">Loading…</p> }
      }
    </div>
  `,
  styles: `
    .row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
    .grow { flex: 1 1 280px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; }
    .center h2 { font-family: var(--serif); font-size: 21px; }
    .counts { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 8px 0 16px; font-size: 14px; }
    .counts a { text-decoration: none; color: var(--muted); }
    .counts strong { color: var(--ink); }
    .invite { background: var(--mint); border-radius: var(--r-md); padding: 14px; display: grid; gap: 6px; }
    .invite.off { background: var(--cream-2); }
    .invite-head { display: flex; align-items: center; justify-content: space-between; }
    .label { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--teal-dark); }
    .code { font: 700 26px var(--font); letter-spacing: .06em; }
    .off .code { color: var(--muted); text-decoration: line-through; }
    .actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
  `,
})
export class AdminCentersPage {
  private readonly admin = inject(AdminService);
  readonly centers = signal<AdminCenter[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly adding = signal(false);
  newName = '';

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.centers.set(await this.admin.centers());
    } catch (e) {
      this.error.set(adminError(e));
    }
  }

  async add(): Promise<void> {
    this.error.set('');
    if (this.newName.trim().length < 2) return this.error.set('Enter the center name.');
    this.busy.set(true);
    try {
      await this.admin.createCenter(this.newName.trim());
      this.newName = '';
      this.adding.set(false);
      await this.load();
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.busy.set(false);
    }
  }

  async invitation(c: AdminCenter, action: 'new' | 'on' | 'off'): Promise<void> {
    if (action === 'new' && !confirm(`Make a new invitation code for ${c.name}? The old code ${c.invitationCode} will stop working.`)) return;
    if (action === 'off' && !confirm(`Turn off joining with the code at ${c.name}? New teachers will need a setup link from you.`)) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const updated = await this.admin.setInvitation(c.id, action);
      this.centers.update((list) => list.map((x) => (x.id === c.id ? updated : x)));
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
