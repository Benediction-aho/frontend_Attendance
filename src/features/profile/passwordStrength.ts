/** Live guidance only. The server enforces the real password rules. */
export type Strength = { level: 0 | 1 | 2 | 3; label: string };

export function passwordStrength(pw: string): Strength {
  if (!pw) return { level: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) score++;
  if (pw.length < 8 || score <= 1)
    return { level: 1, label: 'Weak: use at least 8 characters with letters and digits.' };
  if (score <= 3) return { level: 2, label: 'Fair: a longer password is safer.' };
  return { level: 3, label: 'Strong password.' };
}
