import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Listen to profile changes
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({
              uid: data.uid || firebaseUser.uid,
              name: data.name || firebaseUser.displayName || 'Usuário',
              email: data.email || firebaseUser.email || '',
              role: data.role || 'patient',
              createdAt: data.createdAt || new Date().toISOString(),
              ...data
            } as UserProfile);
            setLoading(false);
          } else {
            // If profile doesn't exist, we create a default one
            // This handles cases where registration might have been interrupted
            // or for first-time Google sign-ins
            const isAdminEmail = firebaseUser.email === 'varilsonsilva64@gmail.com';
            const defaultProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuário',
              email: firebaseUser.email || '',
              role: isAdminEmail ? 'admin' : 'patient',
              createdAt: new Date().toISOString(),
            };
            
            try {
              await setDoc(userDocRef, defaultProfile);
              // The snapshot listener will fire again once the doc is created
            } catch (error) {
              console.error("Error creating default profile:", error);
              setLoading(false);
            }
          }
        }, (error) => {
          console.error("Profile snapshot error:", error);
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, profile, loading };
}
