import { beforeEach, describe, expect, it } from 'vitest';
import { AdminDemoError, AdminDemoState, AdminDemoStore, sampleState } from './admin-demo';

// The browser-only administrator must follow the same rules as the API.
let saved: AdminDemoState | null;
let store: AdminDemoStore;

beforeEach(() => {
  saved = null;
  store = new AdminDemoStore(sampleState(), (s) => (saved = s), 'https://portal.example');
});

describe('administrator preview store', () => {
  it('starts with the same sample records as the API seed', () => {
    const o = store.overview();
    expect(o.counts.centers).toBe(4);
    expect(o.counts.families).toBe(2);
    expect(o.counts.classes).toBe(3);
    expect(o.counts.parentAddedToReview).toBe(1);
    expect(store.centers().map((c) => c.name)).not.toContain('AHA Head Office');
  });

  it('turns an invitation code off, and a new code replaces the old one', () => {
    expect(store.setInvitation('ctr_tondo', 'off').invitationActive).toBe(false);
    expect(store.centerForCode('TONDO-2027')?.invitationActive).toBe(false);
    const renewed = store.setInvitation('ctr_tondo', 'new');
    expect(renewed.invitationActive).toBe(true);
    expect(renewed.invitationCode).not.toBe('TONDO-2027');
    expect(store.centerForCode('TONDO-2027')).toBeUndefined();
    expect(saved).not.toBeNull();
  });

  it('adds a teacher with a one-time setup link', () => {
    const { staff, setupLink } = store.createStaff({ name: 'Nora Lim', email: 'Nora@Example.org', centerId: 'ctr_tondo', role: 'TEACHER' });
    expect(staff.setupPending).toBe(true);
    expect(staff.email).toBe('nora@example.org');
    expect(setupLink.url).toBe(`https://portal.example/setup/${setupLink.token}`);
    expect(store.setupInfo(setupLink.token).center).toBe('Better World Tondo');
    store.completeSetup(setupLink.token);
    expect(() => store.setupInfo(setupLink.token)).toThrow(AdminDemoError);
    expect(store.staff().find((s) => s.id === staff.id)?.setupPending).toBe(false);
  });

  it('a new setup link makes the old one stop working', () => {
    const { staff, setupLink } = store.createStaff({ name: 'Leo Tan', email: 'leo@example.org', centerId: 'ctr_sunrise', role: 'TEACHER' });
    const again = store.newSetupLink(staff.id).setupLink;
    expect(() => store.setupInfo(setupLink.token)).toThrow(AdminDemoError);
    expect(store.setupInfo(again.token).name).toBe('Leo Tan');
  });

  it('refuses duplicate emails and turns accounts off', () => {
    expect(() => store.createStaff({ name: 'Ana', email: 'ana.reyes@aha.example', centerId: 'ctr_tondo', role: 'TEACHER' })).toThrow(/already exists/);
    expect(store.isActive('ana.reyes@aha.example')).toBe(true);
    store.updateStaff('usr_demo_ana', { active: false });
    expect(store.isActive('ana.reyes@aha.example')).toBe(false);
  });

  it('adds a family with a 6-digit activation code; a new code replaces it', () => {
    const { family, code } = store.createFamily({
      centerId: 'ctr_tondo',
      parentName: 'Rosa Cruz',
      phone: '',
      children: [
        { name: 'Ana', grade: 1, classId: 'cls_seed_a', avatar: 'kite' },
        { name: '', grade: 2, classId: null, avatar: null },
      ],
    });
    expect(code.code).toMatch(/^\d{6}$/);
    expect(family.children.map((c) => c.name)).toEqual(['Ana']);
    expect(family.codeWaiting).toBe(true);
    const next = store.newCode(family.id).code;
    expect(next.code).toMatch(/^\d{6}$/);
    expect(store.families().find((f) => f.id === family.id)?.codeWaiting).toBe(true);
  });

  it('checks that classes and teachers belong to the same center', () => {
    expect(() =>
      store.saveClass('cls_x', { centerId: 'ctr_sunrise', name: 'Group X', program: 'TaRL', level: 'Word', schedule: '', teacherId: 'usr_demo_ana' }),
    ).toThrow(/same center/);
    const made = store.saveClass('cls_y', { centerId: 'ctr_tondo', name: 'Group Y', program: 'TaRL', level: 'Word', schedule: '', teacherId: 'usr_demo_ana' });
    expect(made.teacher).toBe('Ana Reyes');
    store.deleteClass('cls_y');
    expect(store.classes().some((c) => c.id === 'cls_y')).toBe(false);
  });

  it("resets a parent's PIN and records it", () => {
    const f = store.resetPin('fam_seed_reyes');
    expect(f.pinSet).toBe(false);
    expect(f.pinResetAt).toBeTruthy();
    expect(store.audit()[0].action).toBe('reset-pin');
  });

  it('lists children added by parents and marks them as seen', () => {
    const [lia] = store.parentAdded();
    expect(lia.name).toBe('Lia Santos');
    expect(lia.reviewed).toBe(false);
    expect(store.markReviewed(lia.id).reviewed).toBe(true);
    expect(store.overview().counts.parentAddedToReview).toBe(0);
  });

  it('moves a child to another class and marks them as left', () => {
    expect(store.updateStudent('lrn_seed_kiko', { classId: 'cls_seed_b' }).className).toBe('Group B');
    expect(store.updateStudent('lrn_seed_kiko', { left: true }).left).toBe(true);
    expect(store.students().some((s) => s.id === 'lrn_seed_kiko')).toBe(false);
    expect(store.students({ includeLeft: true }).some((s) => s.id === 'lrn_seed_kiko')).toBe(true);
  });
});
