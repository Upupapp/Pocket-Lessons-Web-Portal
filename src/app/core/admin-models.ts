/** What the administrator screens show. The API (`/api/v1/admin/*`) and the browser-only preview return the same shapes. */

export type StaffRoleKey = 'TEACHER' | 'FACILITATOR' | 'PROGRAM_STAFF';
export const STAFF_ROLES: { key: StaffRoleKey; label: string }[] = [
  { key: 'TEACHER', label: 'Teacher' },
  { key: 'FACILITATOR', label: 'Facilitator' },
  { key: 'PROGRAM_STAFF', label: 'Program staff' },
];

/** Avatars a child can pick on the phone (the same set as the mobile app). Children never have photos. */
export const AVATARS = ['butterfly', 'owl', 'fish', 'bird', 'carabao', 'rooster', 'teddy-bear', 'hibiscus', 'robot', 'rocket', 'kite', 'sun-face'] as const;

export interface AdminCenter {
  id: string;
  name: string;
  invitationCode: string;
  invitationActive: boolean;
  /** A labelled computer voice may stand in for pages a teacher has not recorded yet. */
  computerVoice?: boolean;
  staff: number;
  classes: number;
  families: number;
  children: number;
}

export interface AdminStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  roleKey: StaffRoleKey;
  centerId: string;
  center: string;
  active: boolean;
  classes: string[];
  /** Invited by the administrator and has not used the setup link yet. */
  setupPending: boolean;
  createdAt: string;
}

export interface SetupLinkInfo {
  token: string;
  url: string;
  expiresAt: string;
}

export interface AdminClass {
  id: string;
  centerId: string;
  center: string;
  name: string;
  program: string;
  level: string;
  schedule: string;
  teacherId: string | null;
  teacher: string | null;
  children: number;
}

export interface FamilyChild {
  id: string;
  name: string;
  grade: number;
  avatar: string | null;
  classId: string | null;
  addedBy: string;
  left: boolean;
}

export interface AdminFamily {
  id: string;
  centerId: string;
  center: string;
  parentName: string;
  phone: string;
  activated: boolean;
  activatedAt: string | null;
  codeWaiting: boolean;
  codeExpiresAt: string | null;
  pinSet: boolean;
  pinResetAt: string | null;
  children: FamilyChild[];
}

export interface ActivationCodeInfo {
  code: string;
  expiresAt: string;
}

export interface AdminStudent {
  id: string;
  name: string;
  grade: number;
  level: string;
  avatar: string | null;
  centerId: string;
  center: string;
  classId: string | null;
  className: string | null;
  familyId: string | null;
  parentName: string | null;
  addedBy: string;
  reviewed: boolean;
  left: boolean;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  user: string;
  center: string;
  action: string;
  entity: string;
  entityId: string;
}

/** A teacher who asked for a class ("Ask your administrator") and has none yet. */
export interface WaitingTeacher {
  id: string;
  name: string;
  centerId: string;
  center: string;
  requestedAt: string;
  lessonsWaiting: number;
}

export interface AdminOverview {
  counts: { centers: number; staff: number; families: number; children: number; classes: number; parentAddedToReview: number };
  recent: AuditEntry[];
  waitingForClass?: WaitingTeacher[];
}

export interface StaffInput {
  name: string;
  email: string;
  centerId: string;
  role: StaffRoleKey;
}

export interface ClassInput {
  centerId: string;
  name: string;
  program: string;
  level: string;
  schedule: string;
  teacherId: string | null;
}

export interface FamilyInput {
  centerId: string;
  parentName: string;
  phone: string;
  children: { name: string; grade: number; classId: string | null; avatar: string | null }[];
}

/** Plain-language wording for audit entries, for example "invite" + "user" → "Invited a teacher". */
export function describeAudit(e: Pick<AuditEntry, 'action' | 'entity'>): string {
  const thing: Record<string, string> = {
    user: 'a staff member',
    center: 'a center',
    class: 'a class',
    family: 'a family',
    learner: 'a child',
    lesson: 'a lesson',
    unit: 'a story unit',
    assessment: 'a reading check',
    media: 'a recording or picture',
  };
  const what = thing[e.entity] ?? e.entity;
  switch (e.action) {
    case 'invite':
      return 'Invited a teacher with a setup link';
    case 'new-setup-link':
      return 'Made a new setup link';
    case 'deactivate':
      return 'Turned off a staff account';
    case 'reactivate':
      return 'Turned a staff account back on';
    case 'new-invitation-code':
      return "Made a new teacher invitation code";
    case 'invitation-on':
      return 'Turned the invitation code on';
    case 'invitation-off':
      return 'Turned the invitation code off';
    case 'new-activation-code':
      return 'Made a new activation code';
    case 'reset-pin':
      return "Reset a parent's PIN";
    case 'activate':
      return "A family's phone was linked with its code";
    case 'review':
      return 'Marked a child added by a parent as seen';
    case 'left':
      return 'Marked a child as left';
    case 'create':
      return `Added ${what}`;
    case 'update':
      return `Changed ${what}`;
    case 'delete':
      return `Removed ${what}`;
    case 'publish':
      return `Published ${what}`;
    default:
      return `${e.action} ${what}`;
  }
}

/** The child's avatar shown as an emoji in the portal (the phone shows the 3D picture). */
export const AVATAR_EMOJI: Record<string, string> = {
  butterfly: '🦋',
  owl: '🦉',
  fish: '🐟',
  bird: '🐦',
  carabao: '🐃',
  rooster: '🐓',
  'teddy-bear': '🧸',
  hibiscus: '🌺',
  robot: '🤖',
  rocket: '🚀',
  kite: '🪁',
  'sun-face': '🌞',
};
export const avatarEmoji = (a: string | null | undefined) => (a && AVATAR_EMOJI[a]) || '🙂';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "21 Nov 2026" */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
/** "21 Nov 2026, 3:05 PM" */
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  return `${fmtDate(iso)}, ${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}
/** "just now", "5 min ago", "3 hours ago", "2 days ago" */
export function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} hour${s < 7200 ? '' : 's'} ago`;
  const d = Math.floor(s / 86_400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

/** What the administrator can change about a teacher or staff member. */
export interface StaffPatch {
  name?: string;
  email?: string;
  role?: StaffRoleKey;
  active?: boolean;
  centerId?: string;
}

/** What the administrator can change about a child. The reading level changes only with reading checks. */
export interface StudentPatch {
  name?: string;
  grade?: number;
  avatar?: string | null;
  classId?: string | null;
  left?: boolean;
}
