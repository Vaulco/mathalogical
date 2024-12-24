import { useState } from 'react';
import { api } from '../../convex/_generated/api';
import { useQuery, useMutation } from "convex/react";
import { ChevronLeft, ArrowUpLeft, Globe, X } from 'lucide-react';
import { Id } from "../../convex/_generated/dataModel";

type User = { _id: Id<"users">; _creationTime: number; name?: string; email?: string; image?: string; };
type ShareMode = 'overview' | 'invite';

type ShareProps = {
  postId: string;
  isOpen: boolean;
  onToggle: () => void;
  sidebarWidth: number;
};

export default function Share({ postId, isOpen, onToggle, sidebarWidth }: ShareProps) {
  const [state, setState] = useState({
    mode: 'overview' as ShareMode,
    searchTerm: '',
    selectedUsers: [] as User[],
    error: null as string | null
  });

  const currentUser = useQuery(api.users.viewer);
  const allUsers = useQuery(api.users.listUsers);
  const updateDocumentAccess = useMutation(api.posts.updateDocumentAccess);
  const usersWithAccess = useQuery(api.posts.getUsersWithDocumentAccess, { postId });
  const allowedEmail = useQuery(api.users.getAllowedEmail);

  const setState$ = (u: Partial<typeof state>) => setState(p => ({ ...p, ...u }));
  const resetShareState = () => setState$({ searchTerm: '', selectedUsers: [], mode: 'overview' });

  const isUserMatchingSearch = (user: User, search: string): boolean =>
    search === '' ||
    (user.name !== undefined && user.name.toLowerCase().includes(search.toLowerCase())) ||
    (user.email !== undefined && user.email.toLowerCase().includes(search.toLowerCase()));

  const availableUsers = allUsers?.filter((u): u is User =>
    u &&
    !usersWithAccess?.some(a => a?._id === u._id) &&
    !state.selectedUsers.some(s => s._id === u._id) &&
    isUserMatchingSearch(u, state.searchTerm)
  ) || [];

  const handleAddUser = (u: User) => setState$({
    selectedUsers: [...state.selectedUsers, u],
    mode: 'invite'
  });

  const handleRemoveUser = (r: User) =>
    setState$({ selectedUsers: state.selectedUsers.filter(u => u._id !== r._id) });

  const handleInvite = async () => {
    try {
      await updateDocumentAccess({
        postId,
        users: state.selectedUsers.map(u => u._id)
      });
      resetShareState();
    } catch (error) {
      setState$({ error: (error as Error).message });
    }
  };

  const renderUserListItem = (u: User, showControls = true, key?: string) => (
    <div key={key} className="flex items-center hover:bg-[#f3f3f3] transition-colors px-3 py-1 rounded-lg cursor-pointer">
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
  const handleMainButtonClick = () => {
    if (state.mode === 'invite' && state.selectedUsers.length > 0) {
      handleInvite();
    } else {
      onToggle();
    }
  };
  if (!(currentUser && allowedEmail && currentUser.email === allowedEmail)) return null;
  const handleChevronClick = () => {
    if (state.mode === 'invite') {
      setState$({ mode: 'overview', searchTerm: '', selectedUsers: [] });
    } else {
      onToggle();
    }
  };
  return (
    <>
     <button 
        onClick={handleMainButtonClick}
        className="cursor-pointer text-[15px] flex items-center gap-2 absolute right-1 z-10"
      >
        Share
      </button>

      {/* Sidebar */}
      <div 
        className={`fixed right-0 top-0 h-full bg-white border-l transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: sidebarWidth }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="relative px-4 w-full gap-2 flex items-center h-[45px]">
            <button
                onClick={handleChevronClick}
                className="text-[#9f9e9b] hover:text-[#7a7a77] relative rounded mr-1"
              >
               
                  <ChevronLeft size={18} />
               
              </button>
              <input
                type="text"
                placeholder="Email or name..."
                value={state.searchTerm}
                onChange={(e) => setState$({ searchTerm: e.target.value })}
                onFocus={() => setState$({ mode: 'invite' })}
                className="w-[calc(100%-60px)] rounded-md bg-transparent outline-none placeholder:text-[#9b9a97]"
              />
            </div>

            {state.mode === 'overview' ? (
              <>
                <p className="text-[13px] text-[#7d7c78] pl-4 pb-2">Has access</p>
                <div>
                  {usersWithAccess?.length ? (
                    <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                      <div className="p-2 pt-0">
                        {usersWithAccess
                          .filter((user): user is User => user !== null)
                          .map(user => (
                            <div key={user._id}>
                              {renderUserListItem(user, false, user._id)}
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[#7d7c78] w-full flex justify-center p-6">No users have access</span>
                  )}
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
                          <X
                            size={13}
                            className="cursor-pointer text-[#91918e] ml-2 hover:text-[#6b6b69]"
                            onClick={() => handleRemoveUser(user)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[13px] text-[#7d7c78] pl-4 pb-2">Available users</p>
                <div className="max-h-[calc(100vh-250px)] overflow-y-auto pb-2">
                  {availableUsers.length ? (
                    availableUsers.map(user => (
                      <div
                        key={user._id}
                        onClick={() => handleAddUser(user)}
                        className={`p-2 pb-0 pt-0${
                          state.selectedUsers.some(selected => selected._id === user._id) ? ' bg-blue-50' : ''
                        }`}
                      >
                        {renderUserListItem(user, true, user._id)}
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

          {state.error && (
            <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">
              {state.error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}