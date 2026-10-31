import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCredential, signOut, reload, sendEmailVerification, updateProfile, GoogleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({ webClientId: '147172603019-e7gs3dblefj5kq5ccbg9hij4bl88tf8p.apps.googleusercontent.com' });

export async function createAccount(name: string, email: string, password: string) {
  const result = await createUserWithEmailAndPassword(getAuth(), email, password);
  try {
    await updateProfile(result.user, { displayName: name });
    await sendEmailVerification(result.user);
  } finally {
    await signOut(getAuth());
  }
}
export async function emailLogin(email: string, password: string) {
  const result = await signInWithEmailAndPassword(getAuth(), email, password);
  await reload(result.user);
  if (!getAuth().currentUser?.emailVerified) {
    try { await sendEmailVerification(result.user); } catch { /* The previous link may still be valid or Firebase may rate limit resends. */ }
    await signOut(getAuth());
    throw new Error('Please verify your email using the link we sent, then sign in.');
  }
  return result.user;
}
export async function googleLogin() {
  await GoogleSignin.hasPlayServices();
  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result) || !result.data.idToken) throw new Error('Google sign-in was cancelled.');
  const credential = GoogleAuthProvider.credential(result.data.idToken);
  const signedIn = await signInWithCredential(getAuth(), credential);
  if (!signedIn.user.emailVerified) {
    await signOut(getAuth());
    throw new Error('Your Google email must be verified.');
  }
  return signedIn.user;
}
export async function signOutFirebase() { await signOut(getAuth()); }
