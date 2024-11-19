'use client';
import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase-config';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

interface AuthComponentProps {
  settings?: boolean;
  newPost?: boolean;
  profile?: boolean;
}

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

export const AuthComponent: React.FC<AuthComponentProps> = ({ 
  settings = false, 
  newPost = false, 
  profile = false 
}) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !avatarRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
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

  // Predefined menu items
  const availableMenuItems = {
    profile: {
      label: 'Profile',
      onClick: () => {
        router.push('/profile');
        setIsOpen(false);
      },
      className: 'font-medium text-gray-800 hover:bg-gray-50'
    },
    newPost: {
      label: 'New Post',
      onClick: () => {
        router.push('/post');
        setIsOpen(false);
      },
      className: 'font-medium text-gray-700 hover:bg-gray-50'
    },
    settings: {
      label: 'Settings',
      onClick: () => {
        router.push('/settings');
        setIsOpen(false);
      },
      className: 'text-gray-700 hover:bg-gray-50'
    }
  };

  // Get active menu items based on props and login state
  const getMenuItems = () => {
    if (user) {
      const items = [];
      
      if (profile) items.push(availableMenuItems.profile);
      if (newPost) items.push(availableMenuItems.newPost);
      if (settings) items.push(availableMenuItems.settings);
      
      // Always add logout at the end
      items.push({
        label: 'Sign Out',
        onClick: handleLogout,
        className: 'text-gray-500 hover:bg-gray-50 border-t'
      });
      
      return items;
    } else {
      const items = [];
      
      // Always add login first
      items.push({
        label: 'Login',
        onClick: handleLogin,
        className: 'font-medium text-gray-800 hover:bg-gray-50'
      });
      
      // Only add settings when logged out if enabled
      if (settings) items.push(availableMenuItems.settings);
      
      return items;
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
        <div 
          ref={menuRef} 
          className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg overflow-hidden z-50 border border-gray-200"
        >
          {getMenuItems().map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className={`w-full px-4 py-2 text-left transition-colors ${item.className}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuthComponent;