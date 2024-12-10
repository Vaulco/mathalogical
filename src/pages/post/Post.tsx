import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate, useParams} from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Layout } from '@/Layout';
import TimeAgo from '@/components/TimeAgo';
import Share from '@/components/Share';
import WritingEditor from '@/components/WritingEditor';
import { useNavigate } from 'react-router-dom';

type Document = { content: string; title: string };
const DEFAULT_DOC = { content: '', title: 'Untitled Document' };

export default function Post() {
  const { postId } = useParams<{ postId: string }>();
const navigate = useNavigate();
  // Combine all queries to ensure consistent hook order
  const user = useQuery(api.users.viewer);
  const postData = useQuery(api.posts.get, postId ? { postId } : 'skip');
  const allowedEmail = useQuery(api.users.getAllowedEmail);
  const documentWithAccess = useQuery(api.posts.get, { postId: postId ?? '' });
  const usersWithAccess = useQuery(api.posts.getUsersWithDocumentAccess, { postId: postId ?? '' });
  const currentUser = useQuery(api.users.viewer);
useEffect(() => {
    if (!currentUser && documentWithAccess?.accessType === 'private') {
      navigate('/');
    }
  }, [currentUser, documentWithAccess, navigate]);
  // Memoize derived values
  const isAllowedEmail = useMemo(() => 
    user?.email && allowedEmail?.includes(user.email), 
    [user, allowedEmail]
  );

  // Initial document state
  const [doc, setDoc] = useState<Document>(DEFAULT_DOC);
  const [initialContent, setInitialContent] = useState<Document>(DEFAULT_DOC);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Mutations
  const updatePost = useMutation(api.posts.update);
  const createPost = useMutation(api.posts.create);

  // Combined effect for initial data loading and document creation
  useEffect(() => {
    if (!postId || !user || !isInitialLoad) return;

    const initializeDocument = async () => {
      if (postData) {
        const newDoc = { 
          content: postData.content || '', 
          title: postData.title || DEFAULT_DOC.title 
        };
        setDoc(newDoc);
        setInitialContent(newDoc);
      } else if (isAllowedEmail) {
        await createPost({ 
          postId,
          ...DEFAULT_DOC
        });
      }
      setIsInitialLoad(false);
    };

    initializeDocument();
  }, [postId, postData, user, isAllowedEmail, createPost, isInitialLoad]);

  // Memoized change detection
  const hasChanges = useCallback(() => 
    doc.content.trim() !== initialContent.content.trim() || 
    (doc.title !== initialContent.title && doc.title !== DEFAULT_DOC.title),
    [doc, initialContent]
  );

  // Autosave effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (postId && hasChanges()) {
        updatePost({ postId, ...doc });
      }
    });
    return () => clearTimeout(timer);
  }, [doc, postId, updatePost, hasChanges]);

  // Access control effect
  

  // Early return guards
  if (!postId?.length || postId.length !== 12) return <Navigate to="/" />;
  if (user === undefined) return <Layout><div className="w-full h-full flex justify-center items-center">Loading...</div></Layout>;
  if (!postData && !isAllowedEmail) return <Navigate to="/" />;
  if (user && documentWithAccess && usersWithAccess !== undefined) {
    if (documentWithAccess.accessType === 'private') {
      const userHasAccess = usersWithAccess.some(
        accessUser => accessUser?._id === user._id
      );
  
      if (!userHasAccess) {
        return <Navigate to="/" />;
      }
    }
  }
  return (
    <Layout>
      {/* Existing render logic remains the same */}
      <div className="w-full h-[calc(100%-44px)] bottom-0 border-gray-300 bg-[#f9f9f9] bg-opacity-0 fixed editor-container overflow-x-auto flex justify-center items-center">
        <div className="px-10 w-full flex justify-center items-center">
          <WritingEditor 
            content={doc.content} 
            onContentChange={content => setDoc(d => ({ ...d, content }))} 
          />
        </div>
      </div>
      <div className="absolute top-0 w-full h-[44px] flex items-center justify-end">
        <input 
          type="text" 
          value={doc.title}
          onChange={e => setDoc(d => ({ ...d, title: e.target.value }))}
          onFocus={e => e.target.select()}
          onBlur={e => setDoc(d => ({ ...d, title: e.target.value.trim() || DEFAULT_DOC.title }))}
          className="absolute left-4 max-w-[165px] text-[15px] bg-transparent outline-none"
        />
        <div className="flex items-center gap-1 mr-3">
          <TimeAgo timestamp={postData?.updatedAt} />
          <Share postId={postId} />
        </div>
      </div>
    </Layout>
  );
}