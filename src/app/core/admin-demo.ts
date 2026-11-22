/**
 * The administrator area in the browser-only pilot preview (no server). It keeps the same records the
 * API keeps, with the same rules: one-time setup links and 6-digit activation codes (7 days), invitation
 * codes that can be turned off or renewed, PIN resets, children added by parents (approved automatically)
 * and an audit log. Sample data only; it matches the API's seed.
 */
import {
  ActivationCodeInfo,
  AdminCenter,
  AdminClass,
  AdminFamily,
  AdminOverview,
  AdminStaff,
  AdminStudent,
  AuditEntry,
  ClassInput,
  FamilyInput,
  SetupLinkInfo,
  STAFF_ROLES,
  StaffInput,
  StaffRoleKey,
} from './admin-models';

interface DCenter {
  id: string;
  name: string;
  invitationCode: string;
  invitationActive: boolean;
}
interface DStaff {
  id: string;
  name: string;
  email: string;
  roleKey: StaffRoleKey;
  centerId: string;
  active: boolean;
  setupPending: boolean;
  createdAt: string;
}
interface DClass {
  id: string;
  centerId: string;
  name: string;
  program: string;
  level: string;
  schedule: string;
  teacherId: string | null;
}
interface DFamily {
  id: string;
  centerId: string;
  parentName: string;
  phone: string;
  activatedAt: string | null;
  pinSet: boolean;
  pinResetAt: string | null;
}
interface DStudent {
  id: string;
  name: string;
  grade: number;
  level: string;
  avatar: string | null;
  centerId: string;
  classId: string | null;
  familyId: string | null;
  caregiver: string;
  addedBy: 'staff' | 'parent';
  reviewedAt: string | null;
  leftAt: string | null;
  createdAt: string;
}
interface DCode {
  code: string;
  familyId: string;
  expiresAt: string;
  usedAt: string | null;
}
interface DLink {
  token: string;
  staffId: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface AdminDemoState {
  version: 1;
  centers: DCenter[];
  staff: DStaff[];
  classes: DClass[];
  families: DFamily[];
  students: DStudent[];
  codes: DCode[];
  links: DLink[];
  audit: AuditEntry[];
}

export class AdminDemoError extends Error {}

const DAY = 86_400_000;
const iso = (offsetDays = 0) => new Date(Date.now() + offsetDays * DAY).toISOString();
const rand = (n: number) => Math.floor(Math.random() * n);
const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const DEMO_ADMIN = { id: 'usr_demo_admin', name: 'Maria Lopez', email: 'admin@aha.example', password: 'pocket2027', center: 'AHA Head Office' };

/** The same sample records the API's seed creates. */
export function sampleState(): AdminDemoState {
  const t = 'ctr_tondo';
  const learners: [string, number, string, string][] = [
    ['Aya Santos', 2, 'Word', 'Lorna Santos (mother)'],
    ['Miguel Cruz', 3, 'Letter', 'Jun Cruz (father)'],
    ['Jasmine dela Rosa', 1, 'Beginner', 'Mila dela Rosa (grandmother)'],
    ['Paolo Ramos', 4, 'Paragraph', 'Grace Ramos (mother)'],
    ['Liza Mendoza', 2, 'Letter', 'Rey Mendoza (uncle)'],
    ['Carlo Bautista', 3, 'Word', 'Tess Bautista (mother)'],
    ['Rica Villanueva', 4, 'Story', 'Ana Villanueva (sister, 16)'],
    ['Joshua Garcia', 1, 'Beginner', 'Rosa Garcia (mother)'],
    ['Nica Flores', 2, 'Word', 'Ben Flores (father)'],
    ['Andrei Torres', 3, 'Paragraph', 'Luz Torres (mother)'],
    ['Bea Navarro', 1, 'Letter', 'Cora Navarro (grandmother)'],
    ['Kian Aquino', 4, 'Word', 'Ellen Aquino (mother)'],
  ];
  const classFor = (lv: string) => (lv === 'Beginner' || lv === 'Letter' ? 'cls_seed_a' : lv === 'Word' ? 'cls_seed_b' : 'cls_seed_c');
  const students: DStudent[] = learners.map(([name, grade, level, caregiver], i) => ({
    id: `lrn_seed_${i + 1}`,
    name,
    grade,
    level,
    avatar: null,
    centerId: t,
    classId: classFor(level),
    familyId: null,
    caregiver,
    addedBy: 'staff',
    reviewedAt: null,
    leftAt: null,
    createdAt: iso(-45),
  }));
  const child = (sid: string, familyId: string, name: string, grade: number, level: string, avatar: string, classId: string | null, addedBy: 'staff' | 'parent'): DStudent => ({
    id: sid,
    name,
    grade,
    level,
    avatar,
    centerId: t,
    classId,
    familyId,
    caregiver: familyId === 'fam_seed_santos' ? 'Mercy Santos (mother)' : 'Joy Reyes (mother)',
    addedBy,
    reviewedAt: null,
    leftAt: null,
    createdAt: addedBy === 'parent' ? iso(-1) : iso(-20),
  });
  students.push(
    child('lrn_seed_bea', 'fam_seed_santos', 'Bea Santos', 2, 'Word', 'butterfly', 'cls_seed_b', 'staff'),
    child('lrn_seed_migo', 'fam_seed_santos', 'Migo Santos', 1, 'Letter', 'owl', 'cls_seed_a', 'staff'),
    child('lrn_seed_kiko', 'fam_seed_reyes', 'Kiko Reyes', 2, 'Letter', 'teddy-bear', 'cls_seed_a', 'staff'),
    child('lrn_seed_lia', 'fam_seed_santos', 'Lia Santos', 1, 'Beginner', 'fish', null, 'parent'),
  );
  return {
    version: 1,
    centers: [
      { id: 'ctr_smokey', name: 'Better World Smokey Mountain', invitationCode: 'SMOKEY-2027', invitationActive: true },
      { id: 'ctr_trias', name: 'Better World General Trias', invitationCode: 'TRIAS-2027', invitationActive: true },
      { id: 'ctr_tondo', name: 'Better World Tondo', invitationCode: 'TONDO-2027', invitationActive: true },
      { id: 'ctr_sunrise', name: 'AHA Sunrise', invitationCode: 'SUNRISE-2027', invitationActive: true },
    ],
    staff: [
      { id: 'usr_demo_ana', name: 'Ana Reyes', email: 'ana.reyes@aha.example', roleKey: 'TEACHER', centerId: t, active: true, setupPending: false, createdAt: iso(-60) },
    ],
    classes: [
      { id: 'cls_seed_a', centerId: t, name: 'Group A', program: 'TaRL English', level: 'Letter', schedule: 'Mon to Fri · 1:00 PM', teacherId: 'usr_demo_ana' },
      { id: 'cls_seed_b', centerId: t, name: 'Group B', program: 'TaRL Filipino', level: 'Word', schedule: 'Mon to Fri · 3:00 PM', teacherId: 'usr_demo_ana' },
      { id: 'cls_seed_c', centerId: t, name: 'Group C', program: 'Pagbasa', level: 'Paragraph', schedule: 'Mon to Fri · 4:30 PM', teacherId: null },
    ],
    families: [
      { id: 'fam_seed_santos', centerId: t, parentName: 'Mercy Santos', phone: '0917 555 0101', activatedAt: null, pinSet: false, pinResetAt: null },
      { id: 'fam_seed_reyes', centerId: t, parentName: 'Joy Reyes', phone: '0918 555 0144', activatedAt: iso(-12), pinSet: true, pinResetAt: null },
    ],
    students,
    codes: [{ code: '482917', familyId: 'fam_seed_santos', expiresAt: iso(7), usedAt: null }],
    links: [],
    audit: [],
  };
}

/** The browser-only administrator. [save] persists the state after every change. */
export class AdminDemoStore {
  constructor(
    private state: AdminDemoState,
    private readonly save: (s: AdminDemoState) => void,
    private readonly origin = 'http://localhost:4200',
  ) {}

  private commit(action: string, entity: string, entityId: string, centerId: string): void {
    this.state.audit.unshift({
      id: id('aud'),
      at: iso(),
      user: DEMO_ADMIN.name,
      center: this.state.centers.find((c) => c.id === centerId)?.name ?? '',
      action,
      entity,
      entityId,
    });
    this.state.audit = this.state.audit.slice(0, 300);
    this.save(this.state);
  }

  private center(centerId: string): DCenter {
    const c = this.state.centers.find((x) => x.id === centerId);
    if (!c) throw new AdminDemoError('That center was not found.');
    return c;
  }

  private inviteCode(name: string): string {
    const word = (name.trim().split(/\s+/).pop() ?? 'CENTER').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 10) || 'CENTER';
    let code = '';
    do code = `${word}-${1000 + rand(9000)}`;
    while (this.state.centers.some((c) => c.invitationCode === code));
    return code;
  }

  private issueCode(familyId: string): ActivationCodeInfo {
    const now = iso();
    for (const c of this.state.codes) if (c.familyId === familyId && !c.usedAt) c.expiresAt = now;
    let code = '';
    do code = String(rand(1_000_000)).padStart(6, '0');
    while (this.state.codes.some((c) => c.code === code && !c.usedAt && c.expiresAt > now));
    const info = { code, expiresAt: iso(7) };
    this.state.codes.push({ ...info, familyId, usedAt: null });
    return info;
  }

  private issueLink(staffId: string): SetupLinkInfo {
    const now = iso();
    for (const l of this.state.links) if (l.staffId === staffId && !l.usedAt) l.expiresAt = now;
    const token = Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join('').slice(0, 32);
    const info = { token, url: `${this.origin}/setup/${token}`, expiresAt: iso(7) };
    this.state.links.push({ token, staffId, expiresAt: info.expiresAt, usedAt: null });
    return info;
  }

  // ------------------------------------------------------------ views
  overview(): AdminOverview {
    const s = this.state;
    return {
      counts: {
        centers: s.centers.length,
        staff: s.staff.filter((x) => x.active).length,
        families: s.families.length,
        children: s.students.filter((x) => !x.leftAt).length,
        classes: s.classes.length,
        parentAddedToReview: s.students.filter((x) => x.addedBy === 'parent' && !x.reviewedAt).length,
      },
      recent: s.audit.slice(0, 8),
    };
  }

  centers(): AdminCenter[] {
    const s = this.state;
    return [...s.centers]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({
        ...c,
        staff: s.staff.filter((x) => x.centerId === c.id && x.active).length,
        classes: s.classes.filter((x) => x.centerId === c.id).length,
        families: s.families.filter((x) => x.centerId === c.id).length,
        children: s.students.filter((x) => x.centerId === c.id && !x.leftAt).length,
      }));
  }

  staff(centerId?: string): AdminStaff[] {
    const s = this.state;
    return s.staff
      .filter((x) => !centerId || x.centerId === centerId)
      .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
      .map((x) => ({
        id: x.id,
        name: x.name,
        email: x.email,
        role: STAFF_ROLES.find((r) => r.key === x.roleKey)?.label ?? 'Teacher',
        roleKey: x.roleKey,
        centerId: x.centerId,
        center: this.center(x.centerId).name,
        active: x.active,
        classes: s.classes.filter((c) => c.teacherId === x.id).map((c) => c.name),
        setupPending: x.setupPending,
        createdAt: x.createdAt,
      }));
  }

  classes(centerId?: string): AdminClass[] {
    const s = this.state;
    return s.classes
      .filter((c) => !centerId || c.centerId === centerId)
      .sort((a, b) => a.centerId.localeCompare(b.centerId) || a.name.localeCompare(b.name))
      .map((c) => ({
        ...c,
        center: this.center(c.centerId).name,
        teacher: s.staff.find((x) => x.id === c.teacherId)?.name ?? null,
        children: s.students.filter((x) => x.classId === c.id && !x.leftAt).length,
      }));
  }

  families(centerId?: string): AdminFamily[] {
    const s = this.state;
    const now = iso();
    return s.families
      .filter((f) => !centerId || f.centerId === centerId)
      .sort((a, b) => a.parentName.localeCompare(b.parentName))
      .map((f) => {
        const code = s.codes.filter((c) => c.familyId === f.id).at(-1);
        const waiting = !!code && !code.usedAt && code.expiresAt > now;
        return {
          id: f.id,
          centerId: f.centerId,
          center: this.center(f.centerId).name,
          parentName: f.parentName,
          phone: f.phone,
          activated: f.activatedAt !== null,
          activatedAt: f.activatedAt,
          codeWaiting: waiting,
          codeExpiresAt: waiting ? code!.expiresAt : null,
          pinSet: f.pinSet,
          pinResetAt: f.pinResetAt,
          children: s.students
            .filter((x) => x.familyId === f.id)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((x) => ({ id: x.id, name: x.name, grade: x.grade, avatar: x.avatar, classId: x.classId, addedBy: x.addedBy, left: !!x.leftAt })),
        };
      });
  }

  students(q: { centerId?: string; classId?: string; includeLeft?: boolean } = {}): AdminStudent[] {
    const s = this.state;
    return s.students
      .filter((x) => (!q.centerId || x.centerId === q.centerId) && (!q.classId || x.classId === q.classId) && (q.includeLeft || !x.leftAt))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((x) => {
        const fam = s.families.find((f) => f.id === x.familyId);
        return {
          id: x.id,
          name: x.name,
          grade: x.grade,
          level: x.level,
          avatar: x.avatar,
          centerId: x.centerId,
          center: this.center(x.centerId).name,
          classId: x.classId,
          className: s.classes.find((c) => c.id === x.classId)?.name ?? null,
          familyId: x.familyId,
          parentName: fam?.parentName ?? (x.caregiver || null),
          addedBy: x.addedBy,
          reviewed: !!x.reviewedAt,
          left: !!x.leftAt,
          createdAt: x.createdAt,
        };
      });
  }

  parentAdded(): AdminStudent[] {
    return this.students({ includeLeft: true })
      .filter((x) => x.addedBy === 'parent')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  audit(centerId?: string, limit = 100): AuditEntry[] {
    const name = centerId ? this.state.centers.find((c) => c.id === centerId)?.name : '';
    return this.state.audit.filter((a) => !centerId || a.center === name).slice(0, limit);
  }

  // ------------------------------------------------------------ changes
  createCenter(name: string): AdminCenter {
    const clean = name.trim();
    if (clean.length < 2) throw new AdminDemoError('Enter the center name.');
    if (this.state.centers.some((c) => c.name.toLowerCase() === clean.toLowerCase())) throw new AdminDemoError('A center with this name already exists.');
    const c: DCenter = { id: id('ctr'), name: clean, invitationCode: this.inviteCode(clean), invitationActive: true };
    this.state.centers.push(c);
    this.commit('create', 'center', c.id, c.id);
    return this.centers().find((x) => x.id === c.id)!;
  }

  setInvitation(centerId: string, action: 'new' | 'on' | 'off'): AdminCenter {
    const c = this.center(centerId);
    if (action === 'new') {
      c.invitationCode = this.inviteCode(c.name);
      c.invitationActive = true;
    } else c.invitationActive = action === 'on';
    this.commit(action === 'new' ? 'new-invitation-code' : `invitation-${action}`, 'center', c.id, c.id);
    return this.centers().find((x) => x.id === c.id)!;
  }

  createStaff(input: StaffInput): { staff: AdminStaff; setupLink: SetupLinkInfo } {
    const email = input.email.trim().toLowerCase();
    if (!input.name.trim()) throw new AdminDemoError("Enter the teacher's full name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AdminDemoError('Enter a valid email address.');
    this.center(input.centerId);
    if (this.state.staff.some((x) => x.email === email) || email === DEMO_ADMIN.email) throw new AdminDemoError('An account with this email already exists.');
    const x: DStaff = { id: id('usr'), name: input.name.trim(), email, roleKey: input.role, centerId: input.centerId, active: true, setupPending: true, createdAt: iso() };
    this.state.staff.push(x);
    const setupLink = this.issueLink(x.id);
    this.commit('invite', 'user', x.id, x.centerId);
    return { staff: this.staff().find((s) => s.id === x.id)!, setupLink };
  }

  newSetupLink(staffId: string): { setupLink: SetupLinkInfo } {
    const x = this.state.staff.find((s) => s.id === staffId);
    if (!x) throw new AdminDemoError('That staff member was not found.');
    const setupLink = this.issueLink(staffId);
    this.commit('new-setup-link', 'user', staffId, x.centerId);
    return { setupLink };
  }

  updateStaff(staffId: string, patch: { role?: StaffRoleKey; active?: boolean; centerId?: string }): AdminStaff {
    const x = this.state.staff.find((s) => s.id === staffId);
    if (!x) throw new AdminDemoError('That staff member was not found.');
    if (patch.centerId) this.center(patch.centerId);
    if (patch.role) x.roleKey = patch.role;
    if (patch.active !== undefined) x.active = patch.active;
    if (patch.centerId) x.centerId = patch.centerId;
    this.commit(patch.active === false ? 'deactivate' : patch.active === true ? 'reactivate' : 'update', 'user', staffId, x.centerId);
    return this.staff().find((s) => s.id === staffId)!;
  }

  saveClass(classId: string, input: ClassInput): AdminClass {
    this.center(input.centerId);
    if (!input.name.trim()) throw new AdminDemoError('Enter the class name, for example "Group B".');
    if (!input.program.trim()) throw new AdminDemoError('Enter the program, for example "TaRL Filipino".');
    if (input.teacherId) {
      const t = this.state.staff.find((s) => s.id === input.teacherId);
      if (!t || t.centerId !== input.centerId || !t.active) throw new AdminDemoError('Choose a teacher from the same center.');
    }
    const existing = this.state.classes.find((c) => c.id === classId);
    const data = { centerId: input.centerId, name: input.name.trim(), program: input.program.trim(), level: input.level, schedule: input.schedule.trim(), teacherId: input.teacherId };
    if (existing) Object.assign(existing, data);
    else this.state.classes.push({ id: classId, ...data });
    this.commit(existing ? 'update' : 'create', 'class', classId, input.centerId);
    return this.classes().find((c) => c.id === classId)!;
  }

  deleteClass(classId: string): void {
    const c = this.state.classes.find((x) => x.id === classId);
    if (!c) return;
    this.state.classes = this.state.classes.filter((x) => x.id !== classId);
    for (const s of this.state.students) if (s.classId === classId) s.classId = null;
    this.commit('delete', 'class', classId, c.centerId);
  }

  createFamily(input: FamilyInput): { family: AdminFamily; code: ActivationCodeInfo } {
    this.center(input.centerId);
    if (!input.parentName.trim()) throw new AdminDemoError("Enter the parent's name.");
    const kids = input.children.filter((c) => c.name.trim());
    if (!kids.length) throw new AdminDemoError('Add at least one child.');
    for (const k of kids) {
      if (k.classId && this.state.classes.find((c) => c.id === k.classId)?.centerId !== input.centerId) throw new AdminDemoError('Choose classes from the same center.');
    }
    const f: DFamily = { id: id('fam'), centerId: input.centerId, parentName: input.parentName.trim(), phone: input.phone.trim(), activatedAt: null, pinSet: false, pinResetAt: null };
    this.state.families.push(f);
    for (const k of kids) {
      const sid = id('lrn');
      this.state.students.push({
        id: sid,
        name: k.name.trim(),
        grade: k.grade,
        level: 'Beginner',
        avatar: k.avatar,
        centerId: input.centerId,
        classId: k.classId,
        familyId: f.id,
        caregiver: f.parentName,
        addedBy: 'staff',
        reviewedAt: null,
        leftAt: null,
        createdAt: iso(),
      });
      this.commit('create', 'learner', sid, input.centerId);
    }
    const code = this.issueCode(f.id);
    this.commit('create', 'family', f.id, input.centerId);
    return { family: this.families().find((x) => x.id === f.id)!, code };
  }

  newCode(familyId: string): { code: ActivationCodeInfo } {
    const f = this.state.families.find((x) => x.id === familyId);
    if (!f) throw new AdminDemoError('That family was not found.');
    const code = this.issueCode(familyId);
    this.commit('new-activation-code', 'family', familyId, f.centerId);
    return { code };
  }

  resetPin(familyId: string): AdminFamily {
    const f = this.state.families.find((x) => x.id === familyId);
    if (!f) throw new AdminDemoError('That family was not found.');
    f.pinSet = false;
    f.pinResetAt = iso();
    this.commit('reset-pin', 'family', familyId, f.centerId);
    return this.families().find((x) => x.id === familyId)!;
  }

  updateStudent(studentId: string, patch: { classId?: string | null; left?: boolean }): AdminStudent {
    const s = this.state.students.find((x) => x.id === studentId);
    if (!s) throw new AdminDemoError('That child was not found.');
    if (patch.classId && this.state.classes.find((c) => c.id === patch.classId)?.centerId !== s.centerId) throw new AdminDemoError('Choose a class from the same center.');
    if (patch.classId !== undefined) s.classId = patch.classId;
    if (patch.left !== undefined) s.leftAt = patch.left ? iso() : null;
    this.commit(patch.left ? 'left' : 'update', 'learner', studentId, s.centerId);
    return this.students({ includeLeft: true }).find((x) => x.id === studentId)!;
  }

  markReviewed(studentId: string): AdminStudent {
    const s = this.state.students.find((x) => x.id === studentId && x.addedBy === 'parent');
    if (!s) throw new AdminDemoError('That child was not found.');
    s.reviewedAt = iso();
    this.commit('review', 'learner', studentId, s.centerId);
    return this.parentAdded().find((x) => x.id === studentId)!;
  }

  // ------------------------------------------------------------ used by sign-in in the preview
  /** The center a teacher joins with an invitation code. */
  centerForCode(code: string): DCenter | undefined {
    return this.state.centers.find((c) => c.invitationCode === code.trim().toUpperCase());
  }

  /** Adds a teacher who joined with the center code, so the administrator sees them. */
  addJoinedStaff(name: string, email: string, centerId: string): void {
    const x: DStaff = { id: id('usr'), name, email: email.toLowerCase(), roleKey: 'TEACHER', centerId, active: true, setupPending: false, createdAt: iso() };
    this.state.staff.push(x);
    this.save(this.state);
  }

  isActive(email: string): boolean {
    const x = this.state.staff.find((s) => s.email === email.trim().toLowerCase());
    return !x || x.active;
  }

  setupInfo(token: string): { name: string; email: string; center: string } {
    const link = this.state.links.find((l) => l.token === token);
    const x = link && this.state.staff.find((s) => s.id === link.staffId);
    if (!link || !x || link.usedAt || link.expiresAt <= iso() || !x.active) {
      throw new AdminDemoError('This setup link has expired or was already used. Ask your administrator for a new one.');
    }
    return { name: x.name, email: x.email, center: this.center(x.centerId).name };
  }

  /** Marks the link used; the caller creates the browser account with the chosen password. */
  completeSetup(token: string): { id: string; name: string; email: string; center: string; role: string } {
    const info = this.setupInfo(token);
    const link = this.state.links.find((l) => l.token === token)!;
    const x = this.state.staff.find((s) => s.id === link.staffId)!;
    link.usedAt = iso();
    x.setupPending = false;
    this.save(this.state);
    return { id: x.id, ...info, role: STAFF_ROLES.find((r) => r.key === x.roleKey)?.label ?? 'Teacher' };
  }
}
