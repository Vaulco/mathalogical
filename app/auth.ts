// auth.ts
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { app } from './firebase-config';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    if (result.user.email !== 'dniemtsov@gmail.com') {
      await signOut(auth);
      throw new Error('Unauthorized user');
    }
    return result.user;
  } catch (error) {
    throw error;
  }
};

export const handleSignOut = () => signOut(auth);