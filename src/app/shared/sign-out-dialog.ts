import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import { FormDialog } from './form-dialog';

/**
 * "Sign out?" before signing out of the portal (teacher and administrator). Cancel keeps the person where
 * they are; Continue closes the pop-up and the portal signs out behind its usual loader.
 */
@Component({
  selector: 'pl-sign-out-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormDialog],
  template: `
    <pl-form-dialog #dlg title="Sign out?" eyebrow="Pocket Lessons" [lead]="lead()" (closed)="onClosed()">
      @if (saving()) {
        <p class="note" role="status">Some changes are still being saved. They are finished first, so nothing is lost.</p>
      }
      <div class="dlg-actions">
        <button type="button" class="btn btn-ghost" (click)="dlg.close()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="go()">Continue</button>
      </div>
    </pl-form-dialog>
  `,
  styles: `
    .note { margin: 0 0 4px; padding: 10px 14px; border-radius: 10px; background: var(--warn-bg, #fbf3dc); color: var(--warn, #7a5200); font-size: 14px; }
  `,
})
export class SignOutDialog {
  /** Who is signing out, for the line under the title. */
  readonly name = input('');
  /** Changes are still on their way to the server. */
  readonly saving = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly dlg = viewChild.required<FormDialog>('dlg');
  private going = false;

  lead(): string {
    const who = this.name() ? `You are signed in as ${this.name()}. ` : '';
    return `${who}To come back, you sign in again with your email and password.`;
  }

  go(): void {
    this.going = true;
    this.dlg().close();
  }

  /** The pop-up has closed: Continue signs out, anything else (Cancel, ✕, Esc, outside click) cancels. */
  onClosed(): void {
    if (this.going) this.confirmed.emit();
    else this.cancelled.emit();
  }
}
