import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Activity, Lesson, LessonPage, PASS_MARK, SetBlock } from '../../core/models';
import { media } from '../../core/storage';
import { ChildPage, ChildSet } from '../../shared/child-page';
import { Coach, CoachMood } from '../../shared/coach';
import { MediaImage } from '../../shared/media-image';
import { lessonTextSize, subjectIcon, subjectOf, themeVars } from '../../core/subjects';

type Screen = 'start' | 'step' | 'finish';
type Feedback = 'good' | 'retry' | 'reveal' | null;
type Step = { kind: 'page'; page: LessonPage; n: number } | { kind: 'activity'; activity: Activity; n: number };

interface Result {
  firstTry: boolean;
  correct: boolean;
}

/**
 * Child-view preview (WEB-11): the lesson as it plays on the family phone, offline.
 * Start → read-along pages → tap questions with a second try → finish with practice words and the learning-day sun.
 * Words light up evenly across the recording; exact word timing comes with the read-along editor (WEB-09).
 */
@Component({
  selector: 'pl-lesson-preview',
  imports: [MediaImage, Coach, ChildPage, ChildSet],
  templateUrl: './lesson-preview.html',
  styleUrl: './lesson-preview.scss',
})
export class LessonPreview {
  readonly lesson = input.required<Lesson>();
  /** The unit's lessons in order, when the lesson is part of a unit. */
  readonly path = input<Lesson[]>([]);
  readonly unitTitle = input('');
  readonly closed = output<void>();

  readonly letters = 'ABCD';
  readonly icon = subjectIcon;
  /** The lesson's subject world: its colours, title font and pictures, as the phone shows them. */
  readonly theme = computed(() => subjectOf(this.lesson().subject));
  readonly vars = computed(() => themeVars(this.theme()));
  readonly screen = signal<Screen>('start');
  readonly index = signal(0);
  readonly picked = signal<number | null>(null);
  readonly feedback = signal<Feedback>(null);
  readonly tries = signal(0);
  readonly results = signal<Record<string, Result>>({});
  readonly playing = signal<'page' | 'question' | null>(null);
  readonly litWord = signal(-1);

  readonly isCheckpoint = computed(() => this.lesson().kind === 'checkpoint');
  readonly steps = computed<Step[]>(() => [
    ...this.lesson().pages.map((page, n) => ({ kind: 'page' as const, page, n })),
    ...this.lesson().activities.map((activity, n) => ({ kind: 'activity' as const, activity, n })),
  ]);
  readonly step = computed(() => this.steps()[this.index()]);
  /** Beside the phone: "Page 2 of 7" or "Question 1 of 2", in the same words as the steps above it. */
  readonly counter = computed(() => {
    const s = this.step();
    if (!s) return '';
    const l = this.lesson();
    return s.kind === 'page' ? `Page ${s.n + 1} of ${l.pages.length}` : `Question ${s.n + 1} of ${l.activities.length}`;
  });
  readonly onPage = computed(() => {
    const s = this.step();
    return s?.kind === 'page' ? s.page : null;
  });
  readonly onActivity = computed(() => {
    const s = this.step();
    return s?.kind === 'activity' ? s.activity : null;
  });
  readonly progress = computed(() => {
    const total = this.steps().length || 1;
    const done = this.screen() === 'finish' ? total : this.index() + (this.feedback() === 'good' || this.feedback() === 'reveal' ? 1 : 0);
    return Math.round((done / total) * 100);
  });
  readonly words = computed(() => (this.onPage()?.text ?? '').split(/\s+/).filter(Boolean));
  /** Numbered-activity questions inside the pages (AHA Math lessons). */
  readonly setQuestions = computed(() => this.lesson().pages.reduce((n, p) => n + (p.blocks ?? []).reduce((m, b) => m + (b.type === 'set' ? b.items.length : 0), 0), 0));
  /** Story text size on the phone for this lesson's level (fixed; long pages get more rows, never smaller text). */
  readonly textSize = computed(() => lessonTextSize(this.lesson().level));
  readonly wideChoices = computed(() => (this.onActivity()?.choices ?? []).some((c) => c.length > 14));

  readonly position = computed(() => this.path().findIndex((l) => l.id === this.lesson().id));
  readonly pathNodes = computed(() => {
    const list = this.path().length ? this.path() : [this.lesson()];
    return list.map((l, i) => ({
      label: l.kind === 'checkpoint' ? '★' : String(i + 1),
      cp: l.kind === 'checkpoint',
      state: l.id === this.lesson().id ? 'here' : i < Math.max(0, this.position()) ? 'done' : 'locked',
    }));
  });

  readonly answered = computed(() => Object.values(this.results()));
  readonly firstTryRight = computed(() => this.answered().filter((r) => r.firstTry).length);
  readonly rightInTheEnd = computed(() => this.answered().filter((r) => r.correct).length);
  readonly questionCount = computed(() => this.lesson().activities.length);
  readonly score = computed(() => (this.questionCount() ? this.rightInTheEnd() / this.questionCount() : 1));
  readonly passed = computed(() => this.score() >= PASS_MARK);
  readonly passNeeded = computed(() => Math.ceil(this.questionCount() * PASS_MARK));
  /** Practice words the child missed; these come back in tomorrow's review. */
  readonly missedWords = computed(() => {
    const words = new Set((this.lesson().reviewWords ?? []).map((w) => w.toLowerCase()));
    const res = this.results();
    return this.lesson()
      .activities.filter((a) => res[a.id] && !res[a.id].firstTry)
      .map((a) => a.choices[a.answer]?.toLowerCase())
      .filter((w): w is string => !!w && words.has(w));
  });

  readonly coachMood = computed<CoachMood>(() => {
    if (this.screen() === 'finish') return this.isCheckpoint() && !this.passed() ? 'happy' : 'cheer';
    if (this.feedback() === 'good') return 'cheer';
    if (this.feedback() === 'retry' || this.feedback() === 'reveal') return 'think';
    return 'happy';
  });

  /** What the teacher sees beside the phone: what this screen does and why. */
  readonly explain = computed(() => {
    if (this.screen() === 'start')
      return {
        tag: 'Start',
        title: 'The child opens the next circle on the path',
        body: this.path().length
          ? 'Only this circle is open. Circles before it are done; circles after it stay locked until this one is finished.'
          : 'One lesson, one tap to start. No menus, no typing.',
      };
    if (this.screen() === 'finish')
      return this.isCheckpoint()
        ? {
            tag: 'Checkpoint result',
            title: this.passed() ? 'Passed: the teacher is told the child may be ready' : 'Not yet: more practice first',
            body: `Pass mark is ${this.passNeeded()} of ${this.questionCount()} right (80%, proposed). Passing adds the child to "Ready to move up" in the portal. Only your in-person reading check changes the level.`,
          }
        : {
            tag: 'Finish',
            title: 'Celebrate, then save what to review',
            body: 'The learning-day sun fills (missed days never take it away). Missed practice words come back after 1, 3 and 7 days. Results wait on the phone until the next hotspot visit.',
          };
    const page = this.onPage();
    const set = page ? this.setOf(page) : null;
    if (set)
      return {
        tag: set.title,
        title: set.answer === 'number' ? 'The child taps the number on the number pad' : set.answer === 'words' ? 'The child builds the words by tapping tiles' : 'The child picks one of three answers',
        body: `${set.items.length} numbered items, one at a time, numbered like the paper worksheet. The phone checks each answer against your key (capitals, spaces around hyphens and "and" don't count). A wrong first try gets a second try; then the answer is shown kindly. At the end the child sees the checked paper.`,
      };
    if (page?.blocks?.length)
      return {
        tag: page.section || 'Lesson page',
        title: 'Lists and steps, one clear part at a time',
        body: 'Word cards, bullet points, number cards and the step path are drawn by the app in the lesson font, on pad-paper lines. Your recorded voice is optional on these pages.',
      };
    if (this.onPage())
      return {
        tag: this.isCheckpoint() ? 'Opening' : 'Read along',
        title: 'The child listens to you and follows the words',
        body: 'Your recorded voice plays and each word lights up. The child can replay as often as they like. Replays are counted as a sign the page was hard.',
      };
    const fb = this.feedback();
    return {
      tag: this.isCheckpoint() ? 'Checkpoint question' : 'Practice',
      title:
        fb === 'good'
          ? 'Right answer: praise straight away'
          : fb === 'retry'
            ? 'Wrong first try: a hint and a second chance'
            : fb === 'reveal'
              ? 'Second miss: show the answer kindly'
              : 'The child hears the question and taps an answer',
      body: this.isCheckpoint()
        ? 'One try per question here, so the score shows what the child understood. A wrong answer shows the right one kindly and the checkpoint carries on.'
        : fb === 'retry'
          ? 'No red marks and no lost lives. The coach gives a hint and the child tries again.'
          : fb === 'reveal'
            ? 'The right answer is shown and the item is saved for review. The lesson carries on.'
            : 'Right on the first try counts toward opening the next lesson (about 80%, proposed). Every answer is saved offline for your dashboard.',
    };
  });

  private audio?: HTMLAudioElement;
  private url = '';

  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    afterNextRender(() => this.dlg().nativeElement.showModal());
    inject(DestroyRef).onDestroy(() => this.stopAudio());
  }

  /** The numbered activity on a page, if it has one. */
  setOf(page: LessonPage): SetBlock | null {
    return (page.blocks ?? []).find((b): b is SetBlock => b.type === 'set') ?? null;
  }

  /** A click on the dimmed area around the panel closes the preview (Esc does too). */
  outside(e: MouseEvent): void {
    if (e.target === this.dlg().nativeElement) this.closed.emit();
  }

  begin(): void {
    this.index.set(0);
    this.results.set({});
    this.resetStep();
    this.screen.set(this.steps().length ? 'step' : 'finish');
  }

  restart(): void {
    this.stopAudio();
    this.screen.set('start');
    this.index.set(0);
    this.results.set({});
    this.resetStep();
  }

  next(): void {
    this.stopAudio();
    if (this.index() >= this.steps().length - 1) {
      this.screen.set('finish');
      return;
    }
    this.index.update((i) => i + 1);
    this.resetStep();
  }

  back(): void {
    if (this.index() === 0) {
      this.restart();
      return;
    }
    this.stopAudio();
    this.index.update((i) => i - 1);
    this.resetStep();
  }

  pick(i: number): void {
    if (this.feedback() === 'good' || this.feedback() === 'reveal') return;
    this.feedback.set(null);
    this.picked.set(i);
  }

  check(): void {
    const a = this.onActivity();
    const p = this.picked();
    if (!a || p === null) return;
    const tries = this.tries() + 1;
    this.tries.set(tries);
    const right = p === a.answer;
    // Practice allows a second try; the checkpoint gives one try so the score shows real understanding.
    const last = tries >= (this.isCheckpoint() ? 1 : 2);
    if (right || last) this.results.update((r) => ({ ...r, [a.id]: { firstTry: right && tries === 1, correct: right } }));
    this.feedback.set(right ? 'good' : last ? 'reveal' : 'retry');
  }

  tryAgain(): void {
    this.feedback.set(null);
    this.picked.set(null);
  }

  async playPage(): Promise<void> {
    const p = this.onPage();
    if (p?.audioId) await this.play(p.audioId, p.audioSeconds, 'page', this.words().length);
  }

  async playQuestion(): Promise<void> {
    const a = this.onActivity();
    if (a?.audioId) await this.play(a.audioId, a.audioSeconds, 'question', 0);
  }

  choiceState(i: number): string {
    const a = this.onActivity();
    const fb = this.feedback();
    if (!a) return '';
    if (fb === 'good' && i === a.answer) return 'good';
    if (fb === 'reveal') return i === a.answer ? 'good' : i === this.picked() ? 'bad' : 'dim';
    if (fb === 'retry' && i === this.picked()) return 'bad';
    return i === this.picked() ? 'picked' : '';
  }

  private resetStep(): void {
    this.picked.set(null);
    this.feedback.set(null);
    this.tries.set(0);
    this.litWord.set(-1);
  }

  private async play(id: string, seconds: number | undefined, kind: 'page' | 'question', total: number): Promise<void> {
    this.stopAudio();
    const blob = await media.get(id);
    if (!blob) return;
    this.url = URL.createObjectURL(blob);
    const audio = new Audio(this.url);
    this.audio = audio;
    if (total) {
      audio.ontimeupdate = () => {
        const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : seconds || 1;
        this.litWord.set(Math.min(total - 1, Math.floor((audio.currentTime / d) * total)));
      };
    }
    audio.onended = () => {
      this.playing.set(null);
      if (total) this.litWord.set(total);
    };
    this.playing.set(kind);
    await audio.play().catch(() => this.playing.set(null));
  }

  private stopAudio(): void {
    this.audio?.pause();
    this.audio = undefined;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = '';
    this.playing.set(null);
  }
}
