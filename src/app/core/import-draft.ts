import { Injectable, signal } from '@angular/core';
import type { ParsedLesson } from './lesson-import';
import type { MathLesson } from './math-import';
import type { SubjectKey } from './subjects';

/**
 * What the import pop-ups collected: the subject chosen first, then the file that was read. A reading lesson
 * (story, questions, key) comes as `parsed`; an AHA Math lesson (the section table with its keys) as `math`.
 */
export type ImportDraftData =
  | { subject: SubjectKey; fileName: string; parsed: ParsedLesson; math?: undefined }
  | { subject: SubjectKey; fileName: string; math: MathLesson; parsed?: undefined };

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
