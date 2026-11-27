import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ImportDraft, ImportDraftData } from '../../core/import-draft';
import { ImportDialog } from '../../shared/import-dialog';
import { DataService } from '../../core/data.service';
import {
  ParsedLesson,
  WORDS_PER_LESSON,
  countWords,
  planUnit,
  suggestedLessonCount,
} from '../../core/lesson-import';
import { AnswerType, BlockType, LANGUAGES, LEVELS, LEVEL_HINT, LessonPage, Level, PASS_MARK, Unit, plural } from '../../core/models';
import { ANSWER_TYPES, MathLesson, setsOf } from '../../core/math-import';
import { apiMode } from '../../core/api';
import { Processing } from '../../core/processing';
import { Coach } from '../../shared/coach';
import { SubjectPicker } from '../../shared/subject-picker';
import { SubjectKey, detectLanguage, subjectOf, suggestSubject } from '../../core/subjects';

/**
 * Import a lesson file (WEB-06 extension): the portal reads the story, questions and answer key,
 * and sets them up as a unit of short lessons plus a checkpoint. The file never leaves this browser.
 */
@Component({
  selector: 'pl-lesson-import',
  imports: [FormsModule, RouterLink, Coach, SubjectPicker, ImportDialog],
  templateUrl: './lesson-import.html',
  styleUrl: './lesson-import.scss',
})
export class LessonImport {
  private readonly data = inject(DataService);
  private readonly router = inject(Router);
  private readonly processing = inject(Processing);

  readonly levels = LEVELS;
  readonly levelHint = LEVEL_HINT;
  readonly languages = LANGUAGES;
  readonly perLesson = WORDS_PER_LESSON;
  readonly passMark = PASS_MARK;
  readonly letters = 'ABCD';

  readonly fileName = signal('');
  /** The subject and file pop-ups: open until a file is read. */
  readonly dialogOpen = signal(false);
  readonly dialogSubject = signal<SubjectKey | null>(null);
  /** Shows the ten worlds again on the review page. */
  readonly changing = signal(false);

  readonly parsed = signal<ParsedLesson | null>(null);
  /** An AHA Math lesson (the section table with its keys), read instead of a story. */
  readonly math = signal<MathLesson | null>(null);
  readonly mathSets = computed(() => {
    const m = this.math();
    return m ? setsOf(m) : [];
  });
  readonly answerTypes = ANSWER_TYPES;
  readonly title = signal('');
  readonly level = signal<Level>('Story');
  readonly language = signal<string>('Filipino');
  readonly count = signal(1);
  readonly suggested = signal(1);
  /** The subject world the teacher confirmed. Lessons can't be created until there is one. */
  readonly subject = signal<SubjectKey | null>(null);
  readonly suggestion = computed(() => {
    const p = this.parsed();
    return p ? suggestSubject({ title: this.title() || p.title, label: p.label, text: p.paragraphs.join(' '), language: this.language() }) : null;
  });
  /** The chosen world, or the suggested one until the teacher chooses. */
  readonly theme = computed(() => subjectOf(this.subject() ?? this.suggestion()?.key));

  readonly totalWords = computed(() => this.parsed()?.paragraphs.reduce((s, p) => s + countWords(p), 0) ?? 0);
  readonly maxCount = computed(() => Math.min(6, this.parsed()?.paragraphs.length ?? 1));
  readonly counts = computed(() => Array.from({ length: this.maxCount() }, (_, i) => i + 1));
  readonly keyed = computed(() => this.parsed()?.questions.filter((q) => q.answer >= 0).length ?? 0);
  readonly plan = computed(() => {
    const p = this.parsed();
    return p ? planUnit(p, this.count(), this.title().trim() || p.title) : null;
  });
  readonly passNeeded = computed(() => Math.ceil((this.parsed()?.questions.length ?? 0) * PASS_MARK));
  readonly canCreate = computed(() => (!!this.parsed()?.paragraphs.length || !!this.math()?.parts.length) && !!this.title().trim() && !!this.subject());

  private readonly drafts = inject(ImportDraft);

  constructor() {
    // The pop-ups on the Lessons page hand over the subject and the file; opened directly, the pop-ups open here.
    const d = this.drafts.take();
    if (d) this.use(d);
    else this.dialogOpen.set(true);
  }

  /** The file the pop-ups read, with the subject chosen first. */
  use(d: ImportDraftData): void {
    this.dialogOpen.set(false);
    this.fileName.set(d.fileName);
    if (d.math) {
      // AHA Math lesson: no splitting to choose; the parts follow the lesson routine.
      this.parsed.set(null);
      this.math.set(d.math);
      this.title.set(d.math.title);
      this.subject.set(d.subject);
      this.changing.set(false);
      this.level.set('Paragraph');
      this.language.set('Filipino');
      return;
    }
    const parsed = d.parsed;
    this.math.set(null);
    this.parsed.set(parsed);
    this.title.set(parsed.title);
    this.subject.set(d.subject);
    this.changing.set(false);
    const lang = detectLanguage(parsed.paragraphs.join(' '));
    if (lang) this.language.set(lang);
    const n = suggestedLessonCount(parsed.paragraphs);
    this.suggested.set(n);
    this.count.set(n);
  }

  /** The file names a different subject than the one chosen (e.g. it says "Matematika"). */
  readonly mismatch = computed(() => {
    const s = this.suggestion();
    return s && s.reason.startsWith('The file says') && s.key !== this.subject() ? s : null;
  });

  /** Closing the pop-ups without a file goes back to the lessons. */
  dialogClosed(): void {
    this.dialogOpen.set(false);
    if (!this.parsed() && !this.math()) void this.router.navigateByUrl('/app/lessons');
  }

  /** Creates the Math unit: one draft lesson per part of the routine, with every activity and its key. */
  async createMath(event?: Event): Promise<void> {
    const math = this.math();
    const subject = this.subject();
    if (!math || !subject || !this.canCreate()) return;
    const title = this.title().trim();
    const world = subjectOf(subject);
    const n = math.parts.length;
    let unit: Unit | undefined;
    await this.processing.run({
      title: 'Creating your lessons',
      detail: `${title} · from ${this.fileName() || 'your file'}`,
      from: event,
      steps: [
        { label: 'Setting up the lesson parts', detail: math.parts.map((p) => p.name).join(' · ') },
        {
          label: `Adding ${plural(math.questions, 'question')} with your answer keys`,
          detail: `${math.answered} answers · ${math.verified} checked by the portal`,
          run: () => {
            unit ??= this.data.createMathUnit(
              { title, level: this.level(), language: this.language(), sourceFile: this.fileName() || undefined, sourceLabel: math.label || undefined, subject },
              { ...math, parts: math.parts.map((p) => ({ ...p, title: p.title.replace(/^[^·]+·/, `${title} ·`) })) },
            );
          },
        },
        {
          label: apiMode ? 'Saving to the Pocket Lessons server' : 'Saving in this browser',
          detail: apiMode ? `Sending ${n} lessons · keep this page open` : 'Kept on this computer for the preview',
          run: () => this.data.flush(),
        },
        {
          label: `Getting the ${world.childEn} world ready`,
          detail: `${world.world} · colours and pictures`,
          run: async () => {
            await this.router.navigate(['/app/lessons'], { queryParams: { unit: unit!.id } });
          },
        },
      ],
      done: { title: `${n} lessons created`, detail: `${title} · ${world.childEn}` },
    });
  }

  /** What a page of the Math lesson is made of, in the teacher's words. */
  pageParts(page: LessonPage): string {
    const names: Record<BlockType, string> = {
      text: 'Text',
      route: 'Lesson route',
      terms: 'Word cards',
      bullets: 'Bullet points',
      steps: 'Step path',
      numbers: 'Number cards',
      examples: 'Worked examples',
      set: 'Activity',
    };
    return [...new Set((page.blocks ?? []).map((b) => (b.type === 'set' ? `${b.title} · ${plural(b.items.length, 'question')}` : names[b.type])))].join(' + ');
  }

  answerLabel(key: AnswerType): string {
    return ANSWER_TYPES.find((a) => a.key === key)?.label ?? key;
  }

  /** "Choose another file": the file pop-up again, keeping the subject. */
  reset(): void {
    this.dialogSubject.set(this.subject());
    this.dialogOpen.set(true);
  }

  /** Creates the unit behind the loader: split, save, get the subject world ready, then open the Lessons page. */
  async create(event?: Event): Promise<void> {
    const parsed = this.parsed();
    const plan = this.plan();
    const subject = this.subject();
    if (!parsed || !plan || !subject || !this.canCreate()) return;
    const title = this.title().trim();
    const world = subjectOf(subject);
    const n = plan.lessons.length;
    const q = parsed.questions.length;
    const p = parsed.paragraphs.length;
    const lessons = `${n} short lesson${n === 1 ? '' : 's'}`;
    let unit: Unit | undefined;
    await this.processing.run({
      title: 'Creating your lessons',
      detail: `${title} · from ${this.fileName() || 'your file'}`,
      from: event,
      steps: [
        { label: 'Reading the story and questions', detail: `${p} paragraph${p === 1 ? '' : 's'} and ${q} question${q === 1 ? '' : 's'} found` },
        {
          label: `Splitting it into ${lessons}`,
          detail: `${plan.lessons.map((_, i) => `Part ${i + 1}`).join(', ')} and a checkpoint`,
          run: () => {
            unit ??= this.data.createUnit(
              {
                title,
                author: parsed.author || undefined,
                level: this.level(),
                language: this.language(),
                sourceFile: this.fileName() || undefined,
                sourceLabel: parsed.label || undefined,
                subject,
              },
              plan,
            );
          },
        },
        {
          label: apiMode ? 'Saving to the Pocket Lessons server' : 'Saving in this browser',
          detail: apiMode ? `Sending ${n + 1} lessons · keep this page open` : 'Kept on this computer for the preview',
          run: () => this.data.flush(),
        },
        {
          label: `Getting the ${world.childEn} world ready`,
          detail: `${world.world} · colours and pictures`,
          run: async () => {
            await this.router.navigate(['/app/lessons'], { queryParams: { unit: unit!.id } });
          },
        },
      ],
      done: { title: `${n} lesson${n === 1 ? '' : 's'} created`, detail: `${title} · ${world.childEn}` },
    });
  }

  subjectName(key: SubjectKey): string {
    return subjectOf(key).childEn;
  }

  excerpt(text: string, words = 14): string {
    const w = text.split(/\s+/);
    return w.length <= words ? text : `${w.slice(0, words).join(' ')}…`;
  }
}
