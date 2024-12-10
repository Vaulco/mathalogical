import { useState, useRef, useEffect } from 'react';
import { api } from '../../convex/_generated/api';
import { useQuery, useMutation } from "convex/react";
import { ChevronLeft, ArrowUpLeft, Globe, X } from 'lucide-react';
import { Id } from "../../convex/_generated/dataModel";

type User = { 
  _id: Id<"users">; 
  _creationTime: number;
  name?: string; 
  email?: string; 
  image?: string; 
};
type ShareMode = 'overview' | 'invite';

const isUserMatchingSearch = (user: User, search: string): boolean => 
  search === '' || 
  (user.name !== undefined && user.name.toLowerCase().includes(search.toLowerCase())) || 
  (user.email !== undefined && user.email.toLowerCase().includes(search.toLowerCase()));


export default function Share({ postId }: { postId: string }) {
  const [state, setState] = useState({
    mode: 'overview' as ShareMode,
    searchTerm: '',
    selectedUsers: [] as User[],
    error: null as string | null,
    isPopupOpen: false
  });

  const popupRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLDivElement>(null);

  const currentUser = useQuery(api.users.viewer);
  const allUsers = useQuery(api.users.listUsers);
  const updateDocumentAccess = useMutation(api.posts.updateDocumentAccess);
  const documentWithAccess = useQuery(api.posts.get, { postId });
  const usersWithAccess = useQuery(api.posts.getUsersWithDocumentAccess, { postId });

  const setState$ = (updates: Partial<typeof state>) => setState(prev => ({ ...prev, ...updates }));
  const resetShareState = () => setState$({ isPopupOpen: false, searchTerm: '', selectedUsers: [], mode: 'overview' });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const isOutside = 
        (popupRef.current && !popupRef.current.contains(e.target as Node)) && 
        (shareButtonRef.current && !shareButtonRef.current.contains(e.target as Node));
      
      if (isOutside) resetShareState();
    };

    if (state.isPopupOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [state.isPopupOpen]);

  const availableUsers = allUsers?.filter((user): user is User => 
    user != null && 
    !usersWithAccess?.some(accessUser => accessUser?._id === user._id) &&
    !state.selectedUsers.some(selectedUser => selectedUser._id === user._id) &&
    isUserMatchingSearch(user, state.searchTerm)
  ) || [];

  const handleAddUser = (user: User) => setState$({ selectedUsers: [...state.selectedUsers, user], mode: 'invite' });
  const handleRemoveUser = (userToRemove: User) => 
    setState$({ selectedUsers: state.selectedUsers.filter(user => user._id !== userToRemove._id) });

  const handleInvite = async () => {
    try {
      await updateDocumentAccess({
        postId,
        accessType: documentWithAccess?.accessType || 'private',
        users: state.selectedUsers.map(user => user._id)
      });
      setState$({ mode: 'overview', searchTerm: '', selectedUsers: [] })
      
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

  if (!currentUser || currentUser.email !== useQuery(api.users.getAllowedEmail)) return null;

  const renderUserListItem = (user: User, showControls = true) => (
    <div className="flex items-center hover:bg-[#f3f3f3] px-3 py-1 rounded-xl cursor-pointer">
      <img src={user.image} alt={user.name || 'User'} className="w-8 border rounded-full mr-3" />
      <div className="flex-grow">
        <div className="font-medium">
          {user.name || 'Unnamed User'}
          {user.email === currentUser?.email && <span className="text-sm text-[#9b9a97] ml-2">(You)</span>}
        </div>
        <div className="text-[13px] text-[#797874]">{user.email}</div>
      </div>
      {showControls && <ArrowUpLeft size={17} className="text-[#9b9a97]" />}
    </div>
  );

  return (
    <div className="relative">
      <div ref={shareButtonRef} onClick={() => setState$({ isPopupOpen: !state.isPopupOpen })} className="cursor-pointer text-[15px] pr-2 flex items-center hover:bg-gray-100 rounded">
        Share
      </div>
      
      {state.isPopupOpen && (
        <div ref={popupRef} className="absolute top-full right-0 mt-2 z-10 min-w-[380px] bg-white rounded-xl border shadow-lg">
          <div className="p-2 pl-4 flex items-center border-b">
            {state.mode === 'invite' && (
              <button 
                onClick={() => setState$({ mode: 'overview', searchTerm: '', selectedUsers: [] })} 
                className="text-[#9f9e9b] hover:bg-gray-100 p-[2px] relative right-1 rounded mr-1"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <h3>{state.mode === 'overview' ? 'Share' : 'Invite'}</h3>
          </div>

          <div className="relative px-4 pt-3 pb-2 w-full gap-2 flex">
            <input 
              type="text" 
              placeholder="Email or name..." 
              value={state.searchTerm}
              onChange={(e) => setState$({ searchTerm: e.target.value })}
              onFocus={() => setState$({ mode: 'invite' })}
              className="w-[calc(100%-60px)] h-[32px] pl-[7px] hover:bg-[#f7f7f7] rounded-md bg-transparent outline-none"
            />
            <button
              onClick={state.mode === 'overview' ? () => setState$({ mode: 'invite' }) : handleInvite}
              disabled={state.mode === 'invite' && state.selectedUsers.length === 0}
              className="w-[60px] h-[32px] rounded-md"
            >
              Invite
            </button>
          </div>
          
          {state.mode === 'overview' ? (
            <>
            <p className="text-[13px] text-[#7d7c78] pl-3 pb-2">Has access</p>
              <div>
                {usersWithAccess && usersWithAccess.length > 0 ? (
                  <div className="max-h-[280px] overflow-y-auto">
                    <div className="p-2 pt-0">
                      {usersWithAccess.filter((user): user is User => user !== null).map(user => renderUserListItem(user, false))}
                    </div>
                  </div>
                ) : (
                  <span className=" text-[#7d7c78] w-full flex justify-center p-6">No users have access</span>
                )}
              </div>

              <p className="text-[13px] text-[#7d7c78] pl-3">General access</p>

              <div className="flex items-center justify-center mb-4">
                <span className="mr-3 text-sm text-gray-600">
                  {documentWithAccess?.accessType === 'public' ? 'Public' : 'Private'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={documentWithAccess?.accessType === 'public'}
                    onChange={toggleSharingMode}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
<p className="text-[13px] text-[#7d7c78] pl-3 pb-2">Available users</p>
              <div className="max-h-[300px] overflow-y-auto">
                {availableUsers.length > 0 ? (
                  availableUsers.map(user => (
                    <div 
                      key={user._id} 
                      onClick={() => handleAddUser(user)}
                      className={`p-2  pt-0${state.selectedUsers.some(selected => selected._id === user._id) ? ' bg-blue-50' : ''}`}
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