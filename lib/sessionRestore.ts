import type { UserRec } from './types';

// Never restore a session based on local storage alone: Firebase's persisted
// identity must be verified and match the previously signed-in local account.
export function restorableAccount(
  savedSession: string | null,
  users: UserRec[],
  firebaseUser: { email: string | null; emailVerified: boolean } | null,
): UserRec | null {
  if (!savedSession || !firebaseUser?.emailVerified || !firebaseUser.email) return null;
  const email = firebaseUser.email.trim().toLowerCase();
  if (savedSession !== email) return null;
  return users.find(user => user.email === email && user.provider !== 'sample') || null;
}
