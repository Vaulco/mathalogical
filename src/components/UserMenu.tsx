import { useState, useRef, useEffect } from 'react';
import { api } from "../../convex/_generated/api";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';

interface UserMenuProps {
  newpost?: boolean;
  settings?: boolean;
  help?: boolean;
}

export function UserMenu({ newpost, settings, help }: UserMenuProps) {
  const navigate = useNavigate();
  const user = useQuery(api.users.viewer);
  const { signIn, signOut } = useAuthActions();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Get the allowed email from environment variable using import.meta.env for Vite
  const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL;

  // Check if the current user's email matches the allowed email
  const isAllowedToCreatePost = user?.email === ALLOWED_EMAIL;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !avatarRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNewPost = () => {
    const postId = nanoid(12);
    navigate(`/post/${postId}`);
    setIsOpen(false);
  };

  const MenuItem = ({ onClick, children, className = "" }: { onClick?: () => void; children: React.ReactNode; className?: string }) => (
    <button 
      onClick={onClick} 
      className={`w-full px-3 py-[7px] text-left transition-colors hover:bg-gray-50 text-[15px] text-gray-700 ${className}`}
    >
      {children}
    </button>
  );

  return (
    <div className="absolute top-3 right-4">
      <div ref={avatarRef} onClick={() => setIsOpen(!isOpen)} className="cursor-pointer rounded-full overflow-hidden">
        <Authenticated>
          <img src={user?.image ?? `/api/placeholder/32/32`} alt={user?.name ?? "Profile"} width={33} height={33} className="object-cover" />
        </Authenticated>
        <Unauthenticated>
          <img src="/avatar.png" alt="Default profile" width={33} height={33} className="object-cover" />
        </Unauthenticated>
      </div>
     
      {isOpen && (
        <div ref={menuRef} className="absolute right-0 mt-2 w-44 bg-[#fcfcfc] border-gray-200 border-t-gray-300 rounded-md border-[1px] shadow-md overflow-hidden z-50">
          <Unauthenticated>
            <MenuItem onClick={() => { signIn("github"); setIsOpen(false); }}>Login</MenuItem>
          </Unauthenticated>
          
          <Authenticated>
            {newpost && isAllowedToCreatePost && <MenuItem onClick={handleNewPost}>New Post</MenuItem>}
            {settings && <MenuItem>Settings</MenuItem>}
          </Authenticated>
          
          {help && <MenuItem>Help</MenuItem>}
          
          <Authenticated>
            <MenuItem 
              onClick={() => { signOut(); setIsOpen(false); }}
              className="text-gray-500 border-t"
            >
              Sign Out
            </MenuItem>
          </Authenticated>
        </div>
      )}
    </div>
  );
}

export default UserMenu;