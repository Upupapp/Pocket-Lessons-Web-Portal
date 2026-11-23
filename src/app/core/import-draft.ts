import { Injectable, signal } from '@angular/core';
import type { ParsedLesson } from './lesson-import';
import type { SubjectKey } from './subjects';

/** What the import pop-ups collected: the subject chosen first, then the file that was read. */
export interface ImportDraftData {
  subject: SubjectKey;
  parsed: ParsedLesson;
  fileName: string;
}

/** Hands the import pop-ups' result to the review page (nothing is saved until the teacher creates the lessons). */
@Injectable({ providedIn: 'root' })
export class ImportDraft {
  readonly draft = signal<ImportDraftData | null>(null);

  take(): ImportDraftData | null {
    const d = this.draft();
    this.draft.set(null);
    return d;
  }
}
