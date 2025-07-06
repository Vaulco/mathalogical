import { useState, useRef, useEffect } from 'react';
import { api } from "../../convex/_generated/api";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';

interface UserMenuProps {
  newpost?: boolean;
}

export function UserMenu({ newpost}: UserMenuProps) {
  const navigate = useNavigate();
  const user = useQuery(api.users.viewer);
  const { signIn, signOut } = useAuthActions();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const allowedEmail = useQuery(api.users.getAllowedEmail);
  const isAllowedToCreatePost = user?.email === allowedEmail;

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

  interface MenuItemProps {
    onClick?: () => void; 
    children: React.ReactNode; 
    className?: string;
    defaultClassName?: string;
  }

  const MenuItem = ({ 
    onClick, 
    children, 
    className = "", 
    defaultClassName = "w-full px-3 py-[7px] text-left transition-colors hover:bg-gray-50 text-[15px] text-gray-700"
  }: MenuItemProps) => (
    <button 
      onClick={onClick} 
      className={`${defaultClassName} ${className}`.trim()}
    >
      {children}
    </button>
  );

  return (
    <div className=" right-4 z-10">
      <div ref={avatarRef} onClick={() => setIsOpen(!isOpen)} className="cursor-pointer rounded-full overflow-hidden">
        <Authenticated>
          <img src={user?.image ?? `/api/placeholder/32/32`} alt={user?.name ?? "Profile"} width={28} height={30} className="object-cover" />
        </Authenticated>
        <Unauthenticated>
          <img src="/avatar.png" alt="Default profile" width={33} height={33} className="object-cover" />
        </Unauthenticated>
      </div>
     
      {isOpen && (
        <div ref={menuRef} className="absolute right-0 mt-2 w-44 bg-[#ffffff]  rounded-md  shady overflow-hidden z-50">
          <Unauthenticated>
            <MenuItem onClick={() => { signIn("google"); setIsOpen(false); }}>Login</MenuItem>
          </Unauthenticated>
          
          <Authenticated>
            {newpost && isAllowedToCreatePost && <MenuItem onClick={handleNewPost}>New Post</MenuItem>}
          </Authenticated>
          
          
          <Authenticated>
            <MenuItem 
              onClick={() => { signOut(); setIsOpen(false); }}
              className="!text-gray-500 border-t"
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
