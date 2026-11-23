import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ApiError, OFFLINE_MESSAGE } from './api';
import { plural } from './models';
import { ProcessError, ProcessOptions, Processing, ProcessingHost, describeError, doneOf, runPlain, sourceElement, textOf } from './processing';

// The loader runs what people do, step by step, and says what went wrong in words for a teacher.
describe('processing', () => {
  it('runs the steps in order, then the one-step work', async () => {
    const seen: string[] = [];
    const r = await runPlain({
      title: 'Creating your lessons',
      steps: [{ label: 'a', run: () => void seen.push('a') }, { label: 'b', run: async () => void seen.push('b') }, { label: 'c' }],
      run: () => void seen.push('last'),
    });
    expect(r).toEqual({ ok: true });
    expect(seen).toEqual(['a', 'b', 'last']);
  });

  it('stops at a failed step and hands back a readable message', async () => {
    let after = false;
    const r = await runPlain({
      title: 'Signing you in',
      steps: [{ label: 'check', run: () => Promise.reject(new ProcessError('That email and password do not match.')) }, { label: 'open', run: () => (after = true) }],
    });
    expect(r).toEqual({ ok: false, error: 'That email and password do not match.' });
    expect(after).toBe(false);
    const custom = await runPlain({ title: 'x', run: () => Promise.reject(new Error('raw')), errorText: () => 'Friendly words' });
    expect(custom).toEqual({ ok: false, error: 'Friendly words' });
  });

  it('turns server and connection errors into words for the teacher', () => {
    expect(describeError(new ProcessError('Choose a subject.'))).toBe('Choose a subject.');
    expect(describeError(new ApiError(409, 'That email is already used.'))).toBe('That email is already used.');
    expect(describeError(new TypeError('Failed to fetch'))).toBe(OFFLINE_MESSAGE);
    expect(describeError('?')).toBe('This could not be finished. Try again.');
  });

  it('grows out of the pressed button: the submit button, the clicked button, or the element given', () => {
    const form = document.createElement('form');
    const submit = document.createElement('button');
    form.appendChild(submit);
    const ev = new Event('submit') as SubmitEvent;
    Object.defineProperty(ev, 'submitter', { value: submit });
    expect(sourceElement(ev)).toBe(submit);

    const button = document.createElement('button');
    const icon = document.createElement('span');
    button.appendChild(icon);
    const click = new MouseEvent('click');
    Object.defineProperty(click, 'target', { value: icon });
    expect(sourceElement(click)).toBe(button);

    const drop = document.createElement('label');
    expect(sourceElement(drop)).toBe(drop);
    expect(sourceElement(null)).toBeNull();
  });

  it('reads the finishing words and step details when they are needed', () => {
    let name = '';
    const o: ProcessOptions = { title: 'x', done: () => ({ title: `Welcome back, ${name}` }) };
    name = 'Ana';
    expect(doneOf(o)?.title).toBe('Welcome back, Ana');
    expect(textOf(() => 'Better World Tondo')).toBe('Better World Tondo');
    expect(textOf(undefined)).toBe('');
  });

  it('hands actions to the loader on screen one at a time', async () => {
    const order: string[] = [];
    const host: ProcessingHost = {
      run: async (o, from) => {
        order.push(`start ${o.title}${from ? ' from button' : ''}`);
        await new Promise((r) => setTimeout(r, 10));
        order.push(`end ${o.title}`);
        return { ok: true };
      },
    };
    const processing = TestBed.inject(Processing);
    const detach = processing.attach(host);
    const button = document.createElement('button');
    await Promise.all([processing.run({ title: 'one', from: button }), processing.run({ title: 'two' })]);
    expect(order).toEqual(['start one from button', 'end one', 'start two', 'end two']);
    detach();
    // Without the loader (e.g. in tests) the work still runs.
    expect(await processing.run({ title: 'three', run: () => undefined })).toEqual({ ok: true });
  });

  it('writes counts the way people say them', () => {
    expect(plural(1, 'lesson')).toBe('1 lesson');
    expect(plural(3, 'lesson')).toBe('3 lessons');
    expect(plural(1, 'activity')).toBe('1 activity');
    expect(plural(2, 'activity')).toBe('2 activities');
    expect(plural(2, 'child', 'children')).toBe('2 children');
  });
});
