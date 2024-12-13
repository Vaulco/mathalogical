import { useState, useRef, useEffect } from 'react';
import { api } from '../../convex/_generated/api';
import { useQuery, useMutation } from "convex/react";
import { ChevronLeft, ArrowUpLeft, Globe, X} from 'lucide-react';
import { Id } from "../../convex/_generated/dataModel";

type User = { _id: Id<"users">; _creationTime: number; name?: string; email?: string; image?: string; };
type ShareMode = 'overview' | 'invite';

const isUserMatchingSearch = (user: User, search: string): boolean => 
  search === '' || 
  (user.name !== undefined && user.name.toLowerCase().includes(search.toLowerCase())) || 
  (user.email !== undefined && user.email.toLowerCase().includes(search.toLowerCase()));

export default function Share({ postId }: { postId: string }) {
  const [state, setState] = useState({
    mode: 'overview' as ShareMode, searchTerm: '', 
    selectedUsers: [] as User[], error: null as string | null, 
    isPopupOpen: false
  });

  const popupRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLDivElement>(null);

  const currentUser = useQuery(api.users.viewer);
  const allUsers = useQuery(api.users.listUsers);
  const updateDocumentAccess = useMutation(api.posts.updateDocumentAccess);
  const documentWithAccess = useQuery(api.posts.get, { postId });
  const usersWithAccess = useQuery(api.posts.getUsersWithDocumentAccess, { postId });

  const setState$ = (u: Partial<typeof state>) => setState(p => ({ ...p, ...u }));
  const resetShareState = () => setState$({ 
    isPopupOpen: true, searchTerm: '', selectedUsers: [], mode: 'overview' 
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const isOutside = 
        (popupRef.current && !popupRef.current.contains(e.target as Node)) && 
        (shareButtonRef.current && !shareButtonRef.current.contains(e.target as Node));
      
      if (isOutside) setState$({ isPopupOpen: false });
    };

    if (state.isPopupOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [state.isPopupOpen]);

  const availableUsers = allUsers?.filter((u): u is User => 
    u && 
    !usersWithAccess?.some(a => a?._id === u._id) &&
    !state.selectedUsers.some(s => s._id === u._id) &&
    isUserMatchingSearch(u, state.searchTerm)
  ) || [];

  const handleAddUser = (u: User) => setState$({ 
    selectedUsers: [...state.selectedUsers, u], mode: 'invite' 
  });
  const handleRemoveUser = (r: User) => 
    setState$({ selectedUsers: state.selectedUsers.filter(u => u._id !== r._id) });

  const handleInvite = async () => {
    try {
      await updateDocumentAccess({
        postId,
        accessType: documentWithAccess?.accessType || 'private',
        users: state.selectedUsers.map(u => u._id)
      });
      resetShareState();
    } catch (error) {
      setState$({ error: (error as Error).message });
    }
  };

  const toggleSharingMode = async () => {
    try {
      const newMode = documentWithAccess?.accessType === 'public' ? 'private' : 'public';
      await updateDocumentAccess({ postId, accessType: newMode, users: [] });
    } catch (error) {
      setState$({ error: (error as Error).message });
    }
  };
  
  const allowedEmail = useQuery(api.users.getAllowedEmail);
  const isAllowedUser = currentUser && allowedEmail && currentUser.email === allowedEmail;

  if (!isAllowedUser) return null;
  const renderUserListItem = (u: User, showControls = true) => (
    <div className="flex items-center hover:bg-[#f3f3f3] px-3 py-1 rounded-xl cursor-pointer">
      <img src={u.image} alt={u.name || 'User'} className="w-8 border rounded-full mr-3" />
      <div className="flex-grow">
        <div className="font-medium">
          {u.name || 'Unnamed User'}
          {u.email === currentUser?.email && <span className="text-sm text-[#9b9a97] ml-2">(You)</span>}
        </div>
        <div className="text-[13px] text-[#797874]">{u.email}</div>
      </div>
      {showControls && <ArrowUpLeft size={17} className="text-[#9b9a97]" />}
    </div>
  );

  const isPublic = documentWithAccess?.accessType === 'public';

  return (
    <div className="relative">
      <div ref={shareButtonRef} onClick={() => setState$({ isPopupOpen: !state.isPopupOpen })} 
        className="cursor-pointer text-[15px] pr-2 flex items-center gap-2">
        Share
      </div>
      
      {state.isPopupOpen && (
        <div ref={popupRef} className="absolute top-full right-0 mt-2 z-10 min-w-[380px] bg-white rounded-xl border shadow-lg">
          <div className="p-2 pl-4 flex items-center border-b">
            {state.mode === 'invite' && (
              <button onClick={() => setState$({ mode: 'overview', searchTerm: '', selectedUsers: [] })} 
                className="text-[#9f9e9b] hover:bg-gray-100 p-[2px] relative right-1 rounded mr-1">
                <ChevronLeft size={18} />
              </button>
            )}
            <h3>{state.mode === 'overview' ? 'Share' : 'Invite'}</h3>
          </div>

          <div className="relative px-4 pt-3 pb-2 w-full gap-2 flex">
            <input type="text" placeholder="Email or name..." 
              value={state.searchTerm}
              onChange={(e) => setState$({ searchTerm: e.target.value })}
              onFocus={() => setState$({ mode: 'invite' })}
              className="w-[calc(100%-60px)] h-[32px] pl-[7px] hover:bg-[#f7f7f7] rounded-md bg-transparent outline-none"
            />
            <button
              onClick={state.mode === 'overview' ? () => setState$({ mode: 'invite' }) : handleInvite}
              disabled={state.mode === 'invite' && state.selectedUsers.length === 0}
              className="w-[60px] h-[32px] rounded-md">
              Invite
            </button>
          </div>
          
          {state.mode === 'overview' ? (
            <>
              <p className="text-[13px] text-[#7d7c78] pl-4 pb-2">Has access</p>
              <div>
                {usersWithAccess?.length ? (
                  <div className="max-h-[280px] overflow-y-auto">
                    <div className="p-2 pt-0">
                      {usersWithAccess.filter((user): user is User => user !== null).map(user => renderUserListItem(user, false))}
                    </div>
                  </div>
                ) : (
                  <span className="text-[#7d7c78] w-full flex justify-center p-6">No users have access</span>
                )}
              </div>

              <p className="text-[13px] text-[#7d7c78] pl-4">General access</p>

              <div className="flex items-center ml-4 mb-4 mt-2">
                <span className="mr-3 flex items-center gap-2 ">
                  {isPublic ? (
                    <>
                    <div className="w-8 h-8 rounded-lg bg-[#f3f3f3] flex items-center justify-center">
                    <svg role="graphics-symbol" viewBox="0 0 16 16" className="link w-[18px] h-[18px] block fill-[#37352F73] flex-shrink-0"><path d="M7.69922 10.8945L8.73828 9.84863C7.91797 9.77344 7.34375 9.51367 6.91992 9.08984C5.76465 7.93457 5.76465 6.29395 6.91309 5.14551L9.18262 2.87598C10.3379 1.7207 11.9717 1.7207 13.127 2.87598C14.2891 4.04492 14.2822 5.67188 13.1338 6.82031L11.958 7.99609C12.1768 8.49512 12.2451 9.10352 12.1289 9.62988L14.0908 7.6748C15.7725 6 15.7793 3.62109 14.084 1.92578C12.3887 0.223633 10.0098 0.237305 8.33496 1.91211L5.95605 4.29785C4.28125 5.97266 4.26758 8.35156 5.96289 10.0469C6.36621 10.4434 6.90625 10.7441 7.69922 10.8945ZM8.30078 5.13184L7.26855 6.17773C8.08203 6.25293 8.66309 6.51953 9.08008 6.93652C10.2422 8.09863 10.2422 9.73242 9.08691 10.8809L6.81738 13.1504C5.66211 14.3057 4.03516 14.3057 2.87305 13.1504C1.71094 11.9883 1.71777 10.3545 2.87305 9.20605L4.04199 8.03027C3.83008 7.53125 3.75488 6.92969 3.87109 6.39648L1.91602 8.35156C0.234375 10.0264 0.227539 12.4121 1.92285 14.1074C3.61816 15.8027 5.99707 15.7891 7.67188 14.1143L10.0439 11.7354C11.7256 10.0537 11.7324 7.6748 10.0371 5.98633C9.64062 5.58301 9.10059 5.28223 8.30078 5.13184Z"></path></svg>
                      </div>
                      Anyone with the link
                    </>
                  ) : (
                    <>
                    <div className="w-8 h-8 rounded-lg bg-[#f3f3f3] flex items-center justify-center">
                    <svg role="graphics-symbol" viewBox="0 0 16 16" className="lockedFilled w-[18px] h-[18px] block fill-[#37352F73] flex-shrink-0"><path d="M4.69141 14.6338H11.3018C12.2178 14.6338 12.6689 14.1826 12.6689 13.1914V8.08496C12.6689 7.18945 12.293 6.72461 11.541 6.64941V4.96094C11.541 2.36328 9.81152 1.1123 7.99316 1.1123C6.18164 1.1123 4.45215 2.36328 4.45215 4.96094V6.67676C3.74805 6.78613 3.32422 7.2373 3.32422 8.08496V13.1914C3.32422 14.1826 3.77539 14.6338 4.69141 14.6338ZM5.75098 4.83105C5.75098 3.22461 6.76953 2.35645 7.99316 2.35645C9.2168 2.35645 10.2422 3.22461 10.2422 4.83105V6.64258L5.75098 6.64941V4.83105Z"></path></svg>
                      </div>
                      Only people invited
                    </>
                  )}
                </span>
                <label className="absolute right-5 inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={isPublic}
                    onChange={toggleSharingMode}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#37352F73]"></div>
                </label>
              </div>
            </>
          ) : (
            <>
              {state.selectedUsers.length > 0 && (
                <div className="px-3 pb-2">
                  <div className="flex flex-wrap gap-2">
                    {state.selectedUsers.map(user => (
                      <div key={user._id} className="flex items-center text-[13px] text-[#402c1b] bg-[#fbf3db] h-[23px] px-2 rounded">
                        <Globe size={13} className="mr-2 text-[#cb912f]" />
                        <span>{user.email}</span>
                        <X size={13} className="cursor-pointer text-[#91918e] ml-2" onClick={() => handleRemoveUser(user)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[13px] text-[#7d7c78] pl-4 pb-2">Available users</p>
              <div className="max-h-[300px] overflow-y-auto pb-2">
                {availableUsers.length ? (
                  availableUsers.map(user => (
                    <div 
                      key={user._id} 
                      onClick={() => handleAddUser(user)}
                      className={`p-2 pb-0 pt-0${state.selectedUsers.some(selected => selected._id === user._id) ? ' bg-blue-50' : ''}`}
                    >
                      {renderUserListItem(user)}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 p-6">
                    {state.searchTerm ? "No users found matching your search" : "No users available"}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}