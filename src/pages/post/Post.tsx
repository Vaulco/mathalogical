import { useState, useEffect, useMemo } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Layout } from '@/Layout';
import Share from '@/components/Share';
import Editor from '@/components/Editor';

interface Doc {
  content: string;
  title: string;
}

interface State {
  isSidebarOpen: boolean;
  doc: Doc;
  isInitialLoad: boolean;
  isSelected: boolean;
  lastClickTime: number;
}

const DEFAULT_DOC: Doc = { content: '', title: 'New page' };
const SIDEBAR_WIDTH = 330;

export default function Post() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [{ isSidebarOpen, doc, isInitialLoad, isSelected, lastClickTime }, setState] = useState<State>({
    isSidebarOpen: false,
    doc: DEFAULT_DOC,
    isInitialLoad: true,
    isSelected: false,
    lastClickTime: 0
  });

  const user = useQuery(api.users.viewer);
  const allowedEmail = useQuery(api.users.getAllowedEmail);
  const usersWithAccess = useQuery(api.posts.getUsersWithDocumentAccess, { postId: postId ?? '' });
  const existingDoc = useQuery(api.posts.get, postId ? { postId } : 'skip');
  const updatePost = useMutation(api.posts.update);
  const createPost = useMutation(api.posts.create);

  const { isAllowedEmail, hasAccess, isLoading } = useMemo(() => ({
    isAllowedEmail: Boolean(user?.email && allowedEmail?.includes(user.email)),
    hasAccess: Boolean(user && usersWithAccess?.some(u => u?._id === user._id)),
    isLoading: user === undefined || 
               allowedEmail === undefined || 
               usersWithAccess === undefined || 
               existingDoc === undefined || 
               isInitialLoad
  }), [user, allowedEmail, usersWithAccess, existingDoc, isInitialLoad]);

  useEffect(() => {
    if (!postId || user === undefined || !isInitialLoad) return;
    
    (async () => {
      if (existingDoc === undefined) return;
      if (existingDoc === null && isAllowedEmail) {
        try {
          await createPost({ postId, ...DEFAULT_DOC });
        } catch (error) {
          console.error('Error creating post:', error);
          navigate('/');
          return;
        }
      } else if (existingDoc) {
        setState(s => ({ ...s, doc: {
          content: existingDoc.content || '',
          title: existingDoc.title || DEFAULT_DOC.title
        }}));
      }
      setState(s => ({ ...s, isInitialLoad: false }));
    })();
  }, [postId, user, existingDoc, isAllowedEmail]);

  const handleDocUpdate = async (updates: Partial<Doc>) => {
    if (!postId || !hasAccess) return;
    const newDoc = { ...doc, ...updates };
    setState(s => ({ ...s, doc: newDoc }));
    try {
      await updatePost({ postId, ...newDoc });
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const handleTitleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const currentTime = Date.now();
    if (!isSelected) {
      e.currentTarget.select();
      setState(s => ({ ...s, isSelected: true }));
    } else if (currentTime - lastClickTime < 300) {
      setState(s => ({ ...s, isSelected: false }));
    }
    setState(s => ({ ...s, lastClickTime: currentTime }));
  };

  if (!postId?.length || postId.length !== 12 || user === null) { return <Navigate to="/" replace />}

  if (isLoading || !hasAccess) { return (<Layout><span className="text-[#9b9a97]">Loading...</span></Layout>)}

  return (
    <Layout>
      <div className="flex h-screen w-full relative">
      <div className="flex-1 relative" 
        style={{ width: isSidebarOpen ? `calc(100% - ${SIDEBAR_WIDTH}px)` : '100%' }}>
          <div className="top-0 left-0 h-[44px] flex items-center px-4 z-10 fixed right-3">
            <input type="text" value={doc.title} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDocUpdate({ title: e.target.value })}
              onClick={handleTitleClick}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                setState(s => ({ ...s, isSelected: false }));
                handleDocUpdate({ title: e.target.value.trim() || DEFAULT_DOC.title });
              }}
              className="max-w-[165px] text-[15px] bg-transparent outline-none"
              disabled={!hasAccess} 
            />
            <Share postId={postId} isOpen={isSidebarOpen} onToggle={() => setState(s => ({ ...s, isSidebarOpen: !s.isSidebarOpen }))} sidebarWidth={SIDEBAR_WIDTH} />
          </div>
          <div className="w-full h-[calc(100%-44px)] mt-[44px] overflow-x-auto flex items-center flex-col">
            <div className="flex justify-center flex-col w-full max-w-[578px] p-1 pt-3">
              <Editor content={doc.content} onContentChange={(content: string) => handleDocUpdate({ content })} isAuthenticated={hasAccess} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}