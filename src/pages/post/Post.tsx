import { useState, useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Authenticated, useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import WritingEditor from '@/components/WritingEditor';
import { Layout } from '@/Layout';
import UserMenu from '@/components/UserMenu';

interface Document {
  content: string;
  title: string;
}

export default function post() {
  const { postId } = useParams<{ postId: string }>();
  const user = useQuery(api.users.viewer);
  const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL;
  const updatePost = useMutation(api.posts.update);
  
  const postData = useQuery(api.posts.get, postId ? { postId } : "skip");
  
  const [document, setDocument] = useState<Document>({
    content: '',
    title: 'Untitled Document'
  });
  
  // Update local state when post data is fetched
  useEffect(() => {
    if (postData) {
      setDocument({
        content: postData.content || document.content,
        title: postData.title || document.title,
      });
    }
  }, [postData]);
  
  // Debounced save function
  useEffect(() => {
    if (!postId) return;
    
    const timer = setTimeout(() => {
      // Only update if we have actual content to save
      if (document.content || document.title !== 'Untitled Document') {
        updatePost({
          postId,
          title: document.title,
          content: document.content,
        });
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [document.content, document.title, postId, updatePost]);

  if (!postId || postId.length !== 12) return <Navigate to="/" />;
  if (user === undefined) return <Layout><div className="w-full h-full flex justify-center items-center">Loading...</div></Layout>;
  if (!user || user.email !== ALLOWED_EMAIL) return <Navigate to="/" replace />;

  return (
    <Layout>
      <Authenticated>
        <div className="w-[calc(100%-20px)] h-[calc(100%-67px)] bottom-[10px] border-[1px] border-gray-300 bg-[#f9f9f9] bg-opacity-0 fixed rounded-lg editor-container overflow-x-auto flex justify-center items-center">
          <div className="px-10 w-full flex justify-center items-center">
            <WritingEditor
              content={document.content}
              onContentChange={(content) => setDocument(d => ({ ...d, content }))}
            />
          </div>
        </div>
        <UserMenu settings help/>
        <input
          type="text"
          value={document.title}
          onChange={e => setDocument(d => ({ ...d, title: e.target.value }))}
          onFocus={e => e.target.select()}
          onBlur={e => {
            const title = e.target.value.trim() || 'Untitled Document';
            setDocument(d => ({ ...d, title }));
          }}
          className="absolute left-3 top-[17px] leading-[1px] text-[19px] text-gray-600 bg-transparent outline-none"
        />
      </Authenticated>
    </Layout>
  );
}