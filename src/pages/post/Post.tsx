import { useState, useEffect, useCallback } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Authenticated, useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Layout } from '@/Layout';
import TimeAgo from '@/components/TimeAgo';
import Share from '@/components/Share';
import WysiwygMathEditor from '@/components/WritingEditor';

interface Document {
  content: string;
  title: string;
}

export default function Post() {
  const { postId } = useParams<{ postId: string }>();
  const user = useQuery(api.users.viewer);
  const updatePost = useMutation(api.posts.update);
  const postData = useQuery(api.posts.getDocumentInfo, postId ? { postId } : 'skip');
  const [document, setDocument] = useState<Document>({ content: '', title: 'Untitled Document' });
  const [initialContent, setInitialContent] = useState<Document>({ content: '', title: 'Untitled Document' });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (postData && isInitialLoad) {
      const newDoc = { content: postData.content || '', title: postData.title || 'Untitled Document' };
      setDocument(newDoc);
      setInitialContent(newDoc);
      setIsInitialLoad(false);
    }
  }, [postData, isInitialLoad]);

  const hasContentChanged = useCallback(() => {
    const contentChanged = document.content.trim() !== initialContent.content.trim();
    const titleChanged = document.title !== initialContent.title && document.title !== 'Untitled Document';    
    return (contentChanged && document.content.trim().length > 0) || titleChanged;
  }, [document, initialContent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (postId && hasContentChanged()) {
        updatePost({ postId, title: document.title, content: document.content });
      }
    });
    return () => clearTimeout(timer);
  }, [document, postId, updatePost, hasContentChanged]);

  if (!postId?.length || postId.length !== 12) return <Navigate to="/" />;
  if (user === undefined) return <Layout><div className="w-full h-full flex justify-center items-center">Loading...</div></Layout>;
  if (!user || user.email !== import.meta.env.VITE_ALLOWED_EMAIL) return <Navigate to="/" replace />;

  return (
    <Layout>
      <Authenticated>
      <div className="w-full h-[calc(100%-44px)] bottom-0 border-gray-300 bg-[#f9f9f9] bg-opacity-0 fixed editor-container overflow-x-auto flex justify-center items-center">
      <div className="px-10 w-full flex justify-center items-center">
        <WysiwygMathEditor initialContent="" 
       
        />
      </div>
    </div>
        <div className="absolute top-0 w-full h-[44px] flex items-center justify-end">
      <input 
        type="text" 
        value={document.title}
        onChange={e => setDocument(d => ({ ...d, title: e.target.value }))}
        onFocus={e => e.target.select()}
        onBlur={e => setDocument(d => ({ ...d, title: e.target.value.trim() || 'Untitled Document' }))}
        className="absolute left-4 max-w-[165px] text-[15px] bg-transparent outline-none"
      />
      <div className="flex items-center gap-1 mr-3">
        <TimeAgo timestamp={postData?.updatedAt} />
        <Share/>
      </div>
    </div>
      </Authenticated>
    </Layout>
  );
}