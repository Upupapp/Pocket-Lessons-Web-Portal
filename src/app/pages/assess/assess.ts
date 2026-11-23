import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { apiMode } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { Assessment, LEVELS, LEVEL_HINT, Level, daysSince, levelIndex } from '../../core/models';
import { Processing } from '../../core/processing';

type Mode = 'placement' | 'fluency';
type Node = 'paragraph' | 'story' | 'words' | 'letters';

/**
 * Sample TaRL reading tool in Filipino. AHA should swap these for its official assessment cards.
 * Flow follows the usual TaRL order: start at paragraph, go up to story or down to words, then letters.
 */
const TOOL: Record<Node, { title: string; ask: string; show: string; yes: Node | Level; no: Node | Level }> = {
  paragraph: {
    title: 'Paragraph',
    ask: 'Did the child read the paragraph with 3 mistakes or fewer?',
    show: 'Si Ana ay may pusa. Puti ang pusa. Gusto ng pusa ang isda. Masaya si Ana.',
    yes: 'story',
    no: 'words',
  },
  story: {
    title: 'Story',
    ask: 'Did the child read the story with 3 mistakes or fewer?',
    show: 'Maagang gumising si Lito. Nagpunta siya sa palengke kasama ang nanay. Bumili sila ng isda at gulay. Mabigat ang bayong kaya tinulungan ni Lito ang nanay. Pag-uwi, nagluto sila ng masarap na ulam. Masaya ang buong pamilya.',
    yes: 'Story',
    no: 'Paragraph',
  },
  words: {
    title: 'Words',
    ask: 'Did the child read at least 4 of the 5 words?',
    show: 'aso   bola   isda   mata   puno',
    yes: 'Word',
    no: 'letters',
  },
  letters: {
    title: 'Letters',
    ask: 'Did the child name or sound at least 4 of the 5 letters?',
    show: 'm   s   a   b   t',
    yes: 'Letter',
    no: 'Beginner',
  },
};

@Component({
  selector: 'pl-assess',
  imports: [FormsModule, RouterLink],
  templateUrl: './assess.html',
  styleUrl: './assess.scss',
})
export class Assess {
  readonly data = inject(DataService);
  private readonly auth = inject(AuthService);
  private readonly processing = inject(Processing);

  /** Query params: ?learner=<id>&mode=fluency */
  readonly learnerParam = input<string>('', { alias: 'learner' });
  readonly modeParam = input<string>('', { alias: 'mode' });

  readonly levels = LEVELS;
  readonly levelHint = LEVEL_HINT;
  readonly tool = TOOL;

  readonly learnerId = signal('');
  readonly mode = signal<Mode>('placement');
  readonly learner = computed(() => this.data.learner(this.learnerId()));
  readonly lastCheck = computed(() => (this.learner() ? this.data.lastCheck().get(this.learner()!.id) : undefined));

  // Placement
  readonly node = signal<Node>('paragraph');
  readonly path = signal<{ node: Node; yes: boolean }[]>([]);
  readonly placed = signal<Level | null>(null);

  // Fluency
  readonly sources = computed(() =>
    this.data.lessons().map((l) => ({ id: l.id, label: `${l.title || 'Untitled'} (${l.level})`, text: l.pages.map((p) => p.text).join(' ').trim() })),
  );
  readonly sourceId = signal('');
  readonly passage = signal('');
  readonly words = computed(() => this.passage().split(/\s+/).filter(Boolean));
  readonly missed = signal<Set<number>>(new Set());
  readonly phase = signal<'ready' | 'reading' | 'done'>('ready');
  readonly seconds = signal(0);
  readonly correct = computed(() => this.words().length - this.missed().size);
  readonly accuracy = computed(() => (this.words().length ? Math.round((this.correct() / this.words().length) * 100) : 0));
  readonly wcpm = computed(() => (this.seconds() > 0 ? Math.round(this.correct() / (this.seconds() / 60)) : 0));
  readonly fluencyAdvice = computed(() => {
    const a = this.accuracy();
    if (a >= 95) return { tone: 'pill-teal', text: 'Reads this text well. Consider the next level.' };
    if (a >= 80) return { tone: 'pill-sun', text: 'Right level for practice. Keep going at this level.' };
    return { tone: 'pill-red', text: 'Too hard for now. Try an easier lesson or a lower level.' };
  });

  // Saving
  readonly resultLevel = signal<Level>('Word');
  note = '';
  readonly saved = signal<Assessment | null>(null);

  private timer?: ReturnType<typeof setInterval>;
  private startedAt = 0;

  constructor() {
    // React only to the address (?learner=&mode=), never to data changes, so saving does not reset the page.
    effect(() => {
      const id = this.learnerParam();
      const mode = this.modeParam();
      untracked(() => {
        if (id && this.data.learner(id)) this.choose(id);
        if (mode === 'fluency') this.mode.set('fluency');
      });
    });
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  daysSince = daysSince;

  choose(id: string): void {
    this.learnerId.set(id);
    this.resetAll();
    const l = this.data.learner(id);
    if (l) this.resultLevel.set(l.level);
  }

  setMode(m: Mode): void {
    this.mode.set(m);
    this.resetAll();
    if (this.learner()) this.resultLevel.set(this.learner()!.level);
  }

  // ---------- Placement ----------

  answer(yes: boolean): void {
    const step = TOOL[this.node()];
    this.path.update((p) => [...p, { node: this.node(), yes }]);
    const next = yes ? step.yes : step.no;
    if ((LEVELS as readonly string[]).includes(next)) {
      this.placed.set(next as Level);
      this.resultLevel.set(next as Level);
    } else {
      this.node.set(next as Node);
    }
  }

  restartPlacement(): void {
    this.node.set('paragraph');
    this.path.set([]);
    this.placed.set(null);
  }

  // ---------- Fluency ----------

  pickSource(id: string): void {
    this.sourceId.set(id);
    const s = this.sources().find((x) => x.id === id);
    this.passage.set(s?.text ?? '');
    this.missed.set(new Set());
    this.phase.set('ready');
  }

  startReading(): void {
    if (!this.words().length) return;
    this.missed.set(new Set());
    this.seconds.set(0);
    this.phase.set('reading');
    this.startedAt = performance.now();
    this.timer = setInterval(() => this.seconds.set(Math.round((performance.now() - this.startedAt) / 1000)), 250);
  }

  toggleWord(i: number): void {
    if (this.phase() === 'ready') return;
    const next = new Set(this.missed());
    if (next.has(i)) next.delete(i);
    else next.add(i);
    this.missed.set(next);
  }

  stopReading(): void {
    clearInterval(this.timer);
    this.seconds.set(Math.max(1, Math.round((performance.now() - this.startedAt) / 1000)));
    this.phase.set('done');
  }

  // ---------- Save ----------

  canSave = computed(() => {
    if (!this.learner()) return false;
    return this.mode() === 'placement' ? this.placed() !== null : this.phase() === 'done';
  });

  /** Saving the check behind the loader: scored, saved, and the child's reading level updated. */
  async save(event?: Event): Promise<void> {
    const l = this.learner();
    if (!l || !this.canSave()) return;
    const level = this.resultLevel();
    const base = {
      learnerId: l.id,
      date: new Date().toISOString(),
      level,
      previousLevel: l.level,
      note: this.note.trim(),
      by: this.auth.user()?.name ?? 'Teacher',
    };
    const placement = this.mode() === 'placement';
    const moved = levelIndex(level) - levelIndex(l.level);
    const change = moved > 0 ? `moves up to ${level}` : moved < 0 ? `moves back to ${level}` : `stays at ${level}`;
    let saved: Assessment | undefined;
    await this.processing.run({
      title: 'Saving the reading check',
      detail: l.name,
      from: event,
      steps: [
        {
          label: placement ? 'Placing the reading level' : 'Scoring the reading',
          detail: placement ? `${level} level` : `${this.wcpm()} words correct a minute · ${this.accuracy()}% correct`,
        },
        {
          label: apiMode ? 'Saving to the Pocket Lessons server' : 'Saving in this browser',
          run: () => {
            saved ??= placement
              ? this.data.addAssessment({ ...base, type: 'placement' })
              : this.data.addAssessment({
                  ...base,
                  type: 'fluency',
                  passage: this.passage(),
                  wordsTotal: this.words().length,
                  missedIndexes: [...this.missed()].sort((a, b) => a - b),
                  seconds: this.seconds(),
                  accuracy: this.accuracy(),
                  wcpm: this.wcpm(),
                });
            return this.data.flush();
          },
        },
        { label: `Updating ${l.name.split(' ')[0]}'s reading level`, detail: change.charAt(0).toUpperCase() + change.slice(1) },
      ],
      done: { title: 'Reading check saved', detail: `${l.name} ${change}` },
    });
    if (saved) this.saved.set(saved);
  }

  checkAnother(): void {
    this.learnerId.set('');
    this.resetAll();
  }

  direction(a: Assessment): 'up' | 'down' | 'same' {
    if (!a.previousLevel) return 'same';
    const d = levelIndex(a.level) - levelIndex(a.previousLevel);
    return d > 0 ? 'up' : d < 0 ? 'down' : 'same';
  }

  private resetAll(): void {
    clearInterval(this.timer);
    this.restartPlacement();
    this.missed.set(new Set());
    this.phase.set('ready');
    this.seconds.set(0);
    this.note = '';
    this.saved.set(null);
  }
}
