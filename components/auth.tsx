'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { getAuth, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase-config';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Helper functions for session management
const setSession = async (token: string) => {
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });
};

const clearSession = async () => {
  await fetch('/api/auth/session', {
    method: 'DELETE',
  });
};

export const AuthComponent = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => setUser(user));
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !avatarRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const token = await result.user.getIdToken();
        await setSession(token);
        setIsOpen(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await clearSession();
      setIsOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="absolute top-10 right-10">
      <div ref={avatarRef} onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        <div className="rounded-full overflow-hidden">
          <Image 
            src={user?.photoURL || "/avatar.png"}
            alt="Profile picture"
            width={33}
            height={33}
            className="object-cover"
          />
        </div>
      </div>

      {isOpen && (
        <div ref={menuRef} className="absolute right-0 mt-2 w-52 bg-white z-50">
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50"
            >
              Login
            </button>
          )}
          <button
            onClick={() => {/* Add settings handler */}}
            className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50"
          >
            Settings
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthComponent;