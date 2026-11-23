import { Injectable, signal } from '@angular/core';
import { AdminDemoError, AdminDemoState, AdminDemoStore, sampleState, upgradeState } from './admin-demo';
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
  StaffInput,
  StaffPatch,
  StaffRoleKey,
  StudentPatch,
} from './admin-models';
import { ApiError, OFFLINE_MESSAGE, api, apiMode } from './api';
import { local } from './storage';

/** The browser-only administrator store, shared with sign-in (setup links, invitation codes) in the preview. */
let demoStore: AdminDemoStore | null = null;
export function adminDemo(): AdminDemoStore {
  if (!demoStore) {
    const saved = local.get<AdminDemoState | null>('admin', null);
    const origin = typeof location !== 'undefined' ? location.origin : 'http://localhost:4200';
    demoStore = new AdminDemoStore(saved?.version === 1 ? upgradeState(saved) : sampleState(), (s) => local.set('admin', s), origin);
  }
  return demoStore;
}

/** Turns API and preview errors into a message the administrator can read. */
export function adminError(err: unknown): string {
  if (err instanceof ApiError || err instanceof AdminDemoError) return err.message;
  return OFFLINE_MESSAGE;
}

const qs = (params: Record<string, string | boolean | undefined>) => {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== false);
  return p.length ? '?' + p.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : '';
};

/**
 * The AHA-wide administrator's data.
 * - With the API: `/api/v1/admin/*` (ADMIN role only).
 * - Pilot preview: the same records and rules, kept in this browser.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  /** Children added by parents that the administrator has not seen yet (for the menu badge). */
  readonly toReview = signal(0);

  private run<T>(apiCall: () => Promise<T>, demoCall: (d: AdminDemoStore) => T): Promise<T> {
    if (apiMode) return apiCall();
    try {
      return Promise.resolve(demoCall(adminDemo()));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async overview(): Promise<AdminOverview> {
    const o = await this.run(() => api.get<AdminOverview>('/admin/overview'), (d) => d.overview());
    this.toReview.set(o.counts.parentAddedToReview);
    return o;
  }

  async refreshBadge(): Promise<void> {
    await this.overview().catch(() => undefined);
  }

  centers(): Promise<AdminCenter[]> {
    return this.run(() => api.get<AdminCenter[]>('/admin/centers'), (d) => d.centers());
  }

  createCenter(name: string): Promise<AdminCenter> {
    return this.run(() => api.post<AdminCenter>('/admin/centers', { name }), (d) => d.createCenter(name));
  }

  setInvitation(centerId: string, action: 'new' | 'on' | 'off'): Promise<AdminCenter> {
    return this.run(() => api.post<AdminCenter>(`/admin/centers/${centerId}/invitation`, { action }), (d) => d.setInvitation(centerId, action));
  }

  staff(centerId?: string): Promise<AdminStaff[]> {
    return this.run(() => api.get<AdminStaff[]>(`/admin/staff${qs({ centerId })}`), (d) => d.staff(centerId));
  }

  createStaff(input: StaffInput): Promise<{ staff: AdminStaff; setupLink: SetupLinkInfo }> {
    return this.run(() => api.post<{ staff: AdminStaff; setupLink: SetupLinkInfo }>('/admin/staff', input), (d) => d.createStaff(input));
  }

  newSetupLink(staffId: string): Promise<{ setupLink: SetupLinkInfo }> {
    return this.run(() => api.post<{ setupLink: SetupLinkInfo }>(`/admin/staff/${staffId}/setup-link`, {}), (d) => d.newSetupLink(staffId));
  }

  updateStaff(staffId: string, patch: StaffPatch): Promise<AdminStaff> {
    return this.run(() => api.patch<AdminStaff>(`/admin/staff/${staffId}`, patch), (d) => d.updateStaff(staffId, patch));
  }

  classes(centerId?: string): Promise<AdminClass[]> {
    return this.run(() => api.get<AdminClass[]>(`/admin/classes${qs({ centerId })}`), (d) => d.classes(centerId));
  }

  saveClass(classId: string, input: ClassInput): Promise<AdminClass> {
    return this.run(() => api.put<AdminClass>(`/admin/classes/${classId}`, input), (d) => d.saveClass(classId, input));
  }

  deleteClass(classId: string): Promise<void> {
    return this.run(() => api.delete(`/admin/classes/${classId}`), (d) => d.deleteClass(classId));
  }

  families(centerId?: string): Promise<AdminFamily[]> {
    return this.run(() => api.get<AdminFamily[]>(`/admin/families${qs({ centerId })}`), (d) => d.families(centerId));
  }

  createFamily(input: FamilyInput): Promise<{ family: AdminFamily; code: ActivationCodeInfo }> {
    return this.run(() => api.post<{ family: AdminFamily; code: ActivationCodeInfo }>('/admin/families', input), (d) => d.createFamily(input));
  }

  newCode(familyId: string): Promise<{ code: ActivationCodeInfo }> {
    return this.run(() => api.post<{ code: ActivationCodeInfo }>(`/admin/families/${familyId}/code`, {}), (d) => d.newCode(familyId));
  }

  resetPin(familyId: string): Promise<AdminFamily> {
    return this.run(() => api.post<AdminFamily>(`/admin/families/${familyId}/reset-pin`, {}), (d) => d.resetPin(familyId));
  }

  students(q: { centerId?: string; classId?: string; includeLeft?: boolean } = {}): Promise<AdminStudent[]> {
    return this.run(() => api.get<AdminStudent[]>(`/admin/students${qs(q)}`), (d) => d.students(q));
  }

  updateStudent(studentId: string, patch: StudentPatch): Promise<AdminStudent> {
    return this.run(() => api.patch<AdminStudent>(`/admin/students/${studentId}`, patch), (d) => d.updateStudent(studentId, patch));
  }

  parentAdded(): Promise<AdminStudent[]> {
    return this.run(() => api.get<AdminStudent[]>('/admin/parent-added'), (d) => d.parentAdded());
  }

  async markReviewed(studentId: string): Promise<AdminStudent> {
    const s = await this.run(() => api.post<AdminStudent>(`/admin/parent-added/${studentId}/review`, {}), (d) => d.markReviewed(studentId));
    void this.refreshBadge();
    return s;
  }

  audit(centerId?: string, limit = 100): Promise<AuditEntry[]> {
    return this.run(() => api.get<AuditEntry[]>(`/admin/audit${qs({ centerId, limit: String(limit) })}`), (d) => d.audit(centerId, limit));
  }
}
