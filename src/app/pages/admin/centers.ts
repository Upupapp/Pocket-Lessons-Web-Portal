import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminCenter } from '../../core/admin-models';
import { AdminService, adminError } from '../../core/admin.service';
import { Processing } from '../../core/processing';
import { CopyButton } from '../../shared/copy-button';
import { FormDialog } from '../../shared/form-dialog';

/** A-03/A-04 Centers and each center's teacher invitation code (copy, new code, turn on or off). */
@Component({
  selector: 'pl-admin-centers',
  imports: [FormsModule, RouterLink, CopyButton, FormDialog],
  template: `
    <div class="page-head">
      <div>
        <h1>Centers and invitation codes</h1>
        <p>Teachers join a center with its invitation code. Turn a code off to allow setup links only.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="openAdd()">+ Add a center</button>
    </div>

    @if (error()) { <p class="adm-msg" role="alert">{{ error() }}</p> }

    @if (adding()) {
      <pl-form-dialog #fd title="Add a center" lead="The center gets its own teacher invitation code straight away." (closed)="adding.set(false)">
        <form (ngSubmit)="add($event)" novalidate>
          <label class="field"><span>Center name</span><input class="input" name="n" [(ngModel)]="newName" placeholder="e.g. Better World Navotas" maxlength="120" /></label>
          @if (formError()) { <p class="dlg-error" role="alert">{{ formError() }}</p> }
          <div class="dlg-actions">
            <button type="button" class="btn btn-ghost" (click)="fd.close()">Cancel</button>
            <button class="btn btn-primary" type="submit" [disabled]="busy()">Add center</button>
          </div>
        </form>
      </pl-form-dialog>
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
              <button type="button" class="btn btn-ghost btn-sm" (click)="invitation(c, 'new', $event)" [disabled]="busy()">New code</button>
              @if (c.invitationActive) {
                <button type="button" class="btn btn-danger btn-sm" (click)="invitation(c, 'off', $event)" [disabled]="busy()">Turn off</button>
              } @else {
                <button type="button" class="btn btn-primary btn-sm" (click)="invitation(c, 'on', $event)" [disabled]="busy()">Turn on</button>
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
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(330px, 100%), 1fr)); gap: 16px; }
    .center h2 { font-family: var(--serif); font-size: 21px; }
    .counts { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 8px 0 16px; font-size: 14px; }
    .counts a { text-decoration: none; color: var(--muted); }
    .counts strong { color: var(--ink); }
    .invite { background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-md); padding: 14px; display: grid; gap: 6px; }
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
  private readonly processing = inject(Processing);
  readonly centers = signal<AdminCenter[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly adding = signal(false);
  readonly formError = signal('');
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

  openAdd(): void {
    this.newName = '';
    this.formError.set('');
    this.adding.set(true);
  }

  async add(event?: Event): Promise<void> {
    this.formError.set('');
    const name = this.newName.trim();
    if (name.length < 2) return this.formError.set('Enter the center name.');
    this.busy.set(true);
    let made = false;
    const r = await this.processing.run({
      title: `Adding ${name}`,
      detail: 'And making its teacher invitation code',
      from: event,
      errorText: adminError,
      run: async () => {
        if (!made) await this.admin.createCenter(name);
        made = true;
        await this.load();
        this.adding.set(false);
      },
      done: () => ({ title: 'Center added', detail: `${name} · invitation code ${this.centers().find((c) => c.name === name)?.invitationCode ?? 'ready'}` }),
    });
    this.busy.set(false);
    if (!r.ok) this.formError.set(r.error);
  }

  async invitation(c: AdminCenter, action: 'new' | 'on' | 'off', event?: Event): Promise<void> {
    if (action === 'new' && !confirm(`Make a new invitation code for ${c.name}? The old code ${c.invitationCode} will stop working.`)) return;
    if (action === 'off' && !confirm(`Turn off joining with the code at ${c.name}? New teachers will need a setup link from you.`)) return;
    this.busy.set(true);
    this.error.set('');
    let updated: AdminCenter | undefined;
    const r = await this.processing.run({
      title: action === 'new' ? 'Making a new invitation code' : action === 'on' ? 'Turning joining on' : 'Turning joining off',
      detail: c.name,
      from: event,
      // Turning the code on or off is a small change; a new code is worth showing.
      quick: action !== 'new',
      errorText: adminError,
      run: async () => {
        updated = await this.admin.setInvitation(c.id, action);
        this.centers.update((list) => list.map((x) => (x.id === c.id ? updated! : x)));
      },
      done: () =>
        action === 'new'
          ? { title: 'New invitation code', detail: `${c.name}: ${updated?.invitationCode ?? ''}` }
          : { title: action === 'on' ? 'Joining turned on' : 'Joining turned off', detail: c.name },
    });
    this.busy.set(false);
    if (!r.ok) this.error.set(r.error);
  }
}
