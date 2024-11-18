'use client';
import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { signInWithGoogle, handleSignOut } from '@/app/auth';
import { app } from '@/app/firebase-config';

export const AuthComponent = () => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        avatarRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        !avatarRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setError('');
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      setError('');
      setIsOpen(false);
    } catch (err) {
      // Explicitly use error state
      setError('Only admin can login to this application');
    }
  };

  return (
    <div className="absolute top-10 right-10">
      <div 
        ref={avatarRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
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
        <div 
          ref={menuRef}
          className="absolute right-0 mt-2 w-52 bg-white z-50"
        >
          {user ? (
            <button
              onClick={() => {
                handleSignOut();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <>
              <button
                onClick={handleLogin}
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50"
              >
                Login
              </button>
              {/* Error message is used here */}
              {error && (
                <div className="px-4 py-2 text-red-500 text-sm">
                  {error}
                </div>
              )}
            </>
          )}
          <button
            onClick={handleLogin}
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