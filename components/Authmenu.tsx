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
  onSave?: () => void;
  showSave?: boolean;
  documentId?: string;  // New prop for document ID
  isEditing?: boolean;  // New prop to indicate if we're in edit mode
}

export const AuthComponent: React.FC<AuthComponentProps> = ({ 
  settings = false, 
  newPost = false, 
  profile = false,
  onSave,
  showSave = false,
  documentId,
  isEditing = false
}) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
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

  const handleAuth = async (isLogin: boolean) => {
    try {
      if (isLogin) {
        const result = await signInWithPopup(auth, provider);
        if (result.user) {
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: await result.user.getIdToken() }),
          });
        }
      } else {
        await signOut(auth);
        await fetch('/api/auth/session', { method: 'DELETE' });
      }
      setIsOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const defaultStyle = 'w-full px-3 py-[7px] text-left transition-colors hover:bg-gray-50 text-[15px]';
  const getMenuItems = () => {
    const items = [];
    
    if (user) {
      if (showSave && onSave) {
        items.push({ 
          label: 'Save', 
          onClick: onSave,
          className: `${defaultStyle} text-green-900 font-medium border-b`
        });
      }

      // Add Edit button when viewing a document
      if (documentId && !isEditing) {
        items.push({ 
          label: 'Edit', 
          onClick: () => router.push(`/post?edit=${documentId}`),
          className: `${defaultStyle} font-medium text-gray-700 border-b`
        });
      }
      
      if (profile) items.push({ label: 'Profile', onClick: () => router.push('/profile') });
      
      if (newPost && user.email === process.env.NEXT_PUBLIC_ALLOWED_EMAIL) {
        items.push({ label: 'New Post', onClick: () => router.push('/post') });
      }
      
      if (settings) items.push({ label: 'Settings', onClick: () => router.push('/settings') });
      
      items.push({
        label: 'Sign Out',
        onClick: () => handleAuth(false),
        className: `${defaultStyle} text-gray-500 border-t`
      });
    } else {
      items.push({
        label: 'Login',
        onClick: () => handleAuth(true),
        className: `${defaultStyle}`
      });
      if (settings) items.push({ label: 'Settings', onClick: () => router.push('/settings') });
    }

    return items;
  };

  return (
    <div className="absolute top-3 right-4">
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
        <div ref={menuRef} className="absolute right-0 mt-2 w-44 bg-white shadow-md overflow-hidden z-50">
          {getMenuItems().map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={item.className || defaultStyle}
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