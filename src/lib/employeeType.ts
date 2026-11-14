import { z } from 'zod';
import type { EmployeeType } from './types';

/** Intern / Employee / Other: one of the three must be chosen; "Other" needs the person's own words. */
export const EMPLOYEE_TYPE_OPTIONS: { value: EmployeeType; label: string }[] = [
  { value: 'intern', label: 'Intern' },
  { value: 'employee', label: 'Employee' },
  { value: 'other', label: 'Other' },
];

export const EMPLOYEE_TYPE_OTHER_MAX = 60;

/** Form fields shared by the public sign-up and the admin "Add a user" form. */
export const employeeTypeFields = {
  employee_type: z.enum(['intern', 'employee', 'other'], {
    message: 'Choose Intern, Employee or Other.',
  }),
  employee_type_other: z.string().trim().max(EMPLOYEE_TYPE_OTHER_MAX).optional(),
};

/** "Other" must come with a text (checked on the server too). */
export function requireOtherText(
  v: { employee_type?: string; employee_type_other?: string },
  ctx: z.RefinementCtx,
  message: string,
): void {
  if (v.employee_type === 'other' && !v.employee_type_other?.trim())
    ctx.addIssue({ code: 'custom', path: ['employee_type_other'], message });
}

/** What is sent to the API: the free text only travels with "other". */
export function employeeTypePayload<
  T extends { employee_type: string; employee_type_other?: string },
>(v: T): T {
  return {
    ...v,
    employee_type_other: v.employee_type === 'other' ? v.employee_type_other?.trim() : undefined,
  };
}

const LABEL: Record<string, string> = { intern: 'Intern', employee: 'Employee', other: 'Other' };

/** Label shown for a person's type: their own words when they chose "Other". */
export function employeeTypeLabel(u: {
  employee_type?: string | null;
  employee_type_other?: string | null;
}): string | null {
  if (!u.employee_type) return null;
  if (u.employee_type === 'other') return u.employee_type_other?.trim() || 'Other';
  return LABEL[u.employee_type] ?? u.employee_type;
}
