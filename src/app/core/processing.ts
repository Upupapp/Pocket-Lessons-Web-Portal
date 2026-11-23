import { Injectable } from '@angular/core';
import { ApiError, OFFLINE_MESSAGE } from './api';

/** One visible step of a longer action. */
export interface ProcessStep {
  label: string;
  /** A short line under the step while it runs. A function is read when the step starts (e.g. once a name is known). */
  detail?: string | (() => string);
  /** This step's work. Throw (ideally a ProcessError) to stop with a message. */
  run?: () => unknown;
}

export interface ProcessDone {
  /** What happened: the panel's title at the end, then the message at the top of the page. */
  title: string;
  detail?: string;
  /** Close without the message at the top (the next screen already shows the result). */
  quiet?: boolean;
}

export interface ProcessOptions {
  /** What is happening, e.g. "Creating your lessons". */
  title: string;
  detail?: string;
  /** Longer actions show their steps; each step's work runs in order. */
  steps?: ProcessStep[];
  /** The work of a one-step action. */
  run?: () => unknown;
  /** The button (or its click or submit event) the loader grows out of. */
  from?: Event | Element | null;
  /** Read when the work is finished, so it can name what was made. */
  done?: ProcessDone | (() => ProcessDone);
  /** A small save: the loader only appears when it takes longer than 400 ms, then closes without the success moment. */
  quick?: boolean;
  /** 'inline': close at once on a failure and hand the message back (sign-in shows it under the form). */
  errors?: 'panel' | 'inline';
  /** Turns a failure into words for the teacher (the default reads server and connection errors). */
  errorText?: (err: unknown) => string;
}

export type ProcessResult = { ok: true } | { ok: false; error: string };

/** A failure whose message is written for the teacher. */
export class ProcessError extends Error {}

export function describeError(err: unknown): string {
  if (err instanceof ProcessError || err instanceof ApiError) return err.message;
  if (err instanceof TypeError) return OFFLINE_MESSAGE;
  if (err instanceof Error && err.message) return err.message;
  return 'This could not be finished. Try again.';
}

/** The button (or link) an event came from, read at once: after an await the event no longer knows. */
export function sourceElement(from: Event | Element | null | undefined): Element | null {
  if (!from) return null;
  if (from instanceof Element) return from;
  const submitter = (from as SubmitEvent).submitter;
  if (submitter) return submitter;
  if (from.currentTarget instanceof Element) return from.currentTarget;
  return from.target instanceof Element ? from.target.closest('button, a, [role="button"]') : null;
}

/** The loader on screen (shared/processing-overlay.ts). */
export interface ProcessingHost {
  run(options: ProcessOptions, from: Element | null): Promise<ProcessResult>;
}

/**
 * Runs what teachers and administrators do (signing in, saving, publishing, deleting, importing) behind a
 * loader that says what is happening, step by step, and closes into a short message when it is done.
 */
@Injectable({ providedIn: 'root' })
export class Processing {
  private host: ProcessingHost | null = null;
  private chain: Promise<unknown> = Promise.resolve();

  attach(host: ProcessingHost): () => void {
    this.host = host;
    return () => {
      if (this.host === host) this.host = null;
    };
  }

  /** Actions wait their turn, so two never share the screen. */
  run(options: ProcessOptions): Promise<ProcessResult> {
    const from = sourceElement(options.from);
    const next = this.chain.then(() => (this.host ? this.host.run(options, from) : runPlain(options)));
    this.chain = next.catch(() => undefined);
    return next;
  }
}

/** Without the loader on screen (unit tests): the same work and results, nothing drawn. */
export async function runPlain(o: ProcessOptions): Promise<ProcessResult> {
  try {
    for (const s of o.steps ?? []) await s.run?.();
    await o.run?.();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (o.errorText ?? describeError)(err) };
  }
}

export const doneOf = (o: ProcessOptions): ProcessDone | undefined => (typeof o.done === 'function' ? o.done() : o.done);
export const textOf = (d: string | (() => string) | undefined): string => (typeof d === 'function' ? d() : (d ?? ''));
