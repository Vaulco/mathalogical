import { useState, useEffect, useCallback } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Authenticated, useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import WritingEditor from '@/components/WritingEditor';
import { Layout } from '@/Layout';
import UserMenu from '@/components/UserMenu';
import TimeAgo from '@/components/TimeAgo';

interface Document {
  content: string;
  title: string;
}

export default function Post() {
  const { postId } = useParams<{ postId: string }>();
  const user = useQuery(api.users.viewer);
  const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL;
  const updatePost = useMutation(api.posts.update);

  const postData = useQuery(api.posts.getDocumentInfo, postId ? { postId } : "skip");

  const [document, setDocument] = useState<Document>({
    content: '',
    title: 'Untitled Document'
  });

  const [initialContent, setInitialContent] = useState<Document>({
    content: '',
    title: 'Untitled Document'
  });

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Update local state and set initial content when post data is first fetched
  useEffect(() => {
    if (postData && isInitialLoad) {
      const newDoc = {
        content: postData.content || '',
        title: postData.title || 'Untitled Document',
      };
      setDocument(newDoc);
      setInitialContent(newDoc);
      setIsInitialLoad(false);
    }
  }, [postData, isInitialLoad]);

  // Check if content has actually changed from initial state
  const hasContentChanged = useCallback(() => {
    const contentChanged = document.content.trim() !== initialContent.content.trim();
    const titleChanged = document.title !== initialContent.title &&
                        document.title !== 'Untitled Document';
    
    // Only return true if there's actual content or title changes
    return (contentChanged && document.content.trim().length > 0) || titleChanged;
  }, [document.content, document.title, initialContent.content, initialContent.title]);

  // Debounced save function with content change check
  const saveDocument = useCallback(() => {
    if (!postId) return;

    // Only save if content has meaningfully changed
    if (hasContentChanged()) {
      updatePost({
        postId,
        title: document.title,
        content: document.content,
      });
    }
  }, [document.content, document.title, postId, updatePost, hasContentChanged]);

  // Debounced save with timeout
  useEffect(() => {
    const timer = setTimeout(saveDocument);
    return () => clearTimeout(timer);
  }, [document.content, document.title, saveDocument]);

  // Validation and access control
  if (!postId || postId.length !== 12) return <Navigate to="/" />;
  if (user === undefined) return <Layout><div className="w-full h-full flex justify-center items-center">Loading...</div></Layout>;
  if (!user || user.email !== ALLOWED_EMAIL) return <Navigate to="/" replace />;

  return (
    <Layout>
      <Authenticated>
        <div className="w-full h-[calc(100%-44px)] bottom-0 border-gray-300 bg-[#f9f9f9] bg-opacity-0 fixed editor-container overflow-x-auto flex justify-center items-center">
          <div className="px-10 w-full flex justify-center items-center">
            <WritingEditor
              content={document.content}
              onContentChange={(content) => setDocument(d => ({ ...d, content }))}
            />
          </div>
        </div>
        <div className='absolute top-0 w-full h-[44px] flex items-center justify-end'>
  <input
    type="text"
    value={document.title}
    onChange={e => setDocument(d => ({ ...d, title: e.target.value }))}
    onFocus={e => e.target.select()}
    onBlur={e => {
      const title = e.target.value.trim() || 'Untitled Document';
      setDocument(d => ({ ...d, title }));
    }}
    className="absolute left-3 max-w-[165px] text-[14px] bg-transparent outline-none font-sans"
  />
  <div className="flex items-center gap-1 mr-3">
  <UserMenu settings help/>
    <TimeAgo timestamp={postData?.updatedAt} />
    <div className='hover:bg-[#f3f3f3] px-[7px] py-1 pt-[3px] rounded-md transition-colors duration-[20ms]'>
    <div className='font-sans cursor-pointer text-[14px] '>Share</div>
    </div>
    <div className='hover:bg-[#f3f3f3] px-[6px] py-1 rounded-md transition-colors duration-[20ms]'>
    <svg role="graphics-symbol" viewBox="0 0 20 20" className="topbarStar" style={{width: 20,height: 20,display: 'block',fill: 'rgba(55, 53, 47, 0.85)',flexShrink: 0}}><path d="M4.77321 18.0645C5.14821 18.3457 5.60915 18.252 6.1404 17.8691L10.2029 14.8848L14.2576 17.8691C14.7888 18.252 15.2498 18.3457 15.6248 18.0645C15.992 17.7832 16.0701 17.3223 15.8591 16.7051L14.2576 11.9395L18.3513 9.00195C18.8826 8.62695 19.1013 8.20508 18.9529 7.76758C18.8045 7.33008 18.3904 7.11133 17.7341 7.11914L12.7185 7.1582L11.1873 2.36133C10.9841 1.73633 10.6638 1.40039 10.2029 1.40039C9.73415 1.40039 9.41383 1.73633 9.21071 2.36133L7.68727 7.1582L2.66383 7.11914C2.00758 7.11133 1.59352 7.33008 1.44508 7.75977C1.29665 8.20508 1.52321 8.62695 2.04665 9.00195L6.1404 11.9395L4.53883 16.7051C4.3279 17.3223 4.40602 17.7832 4.77321 18.0645ZM6.17165 16.1504C6.15602 16.1348 6.15602 16.127 6.17165 16.0801L7.64821 11.916C7.78102 11.5254 7.74196 11.291 7.37477 11.0488L3.72633 8.54883C3.69508 8.52539 3.67946 8.50977 3.69508 8.49414C3.7029 8.4707 3.71852 8.4707 3.75758 8.4707L8.17946 8.57227C8.58571 8.58789 8.79665 8.45508 8.91383 8.05664L10.156 3.82227C10.1716 3.77539 10.1795 3.75977 10.2029 3.75977C10.2185 3.75977 10.2341 3.77539 10.242 3.82227L11.4841 8.05664C11.6013 8.45508 11.8123 8.58789 12.2263 8.57227L16.6404 8.4707C16.6873 8.4707 16.7029 8.4707 16.7107 8.49414C16.7185 8.50977 16.7029 8.52539 16.6716 8.54883L13.0232 11.0488C12.6638 11.291 12.617 11.5254 12.7576 11.916L14.2263 16.0801C14.242 16.127 14.242 16.1348 14.2263 16.1504C14.2185 16.166 14.1951 16.1582 14.1638 16.1348L10.6638 13.4316C10.3357 13.1816 10.0623 13.1816 9.73415 13.4316L6.23415 16.1348C6.2029 16.1582 6.18727 16.166 6.17165 16.1504Z"></path></svg>
    </div>
    <div className='hover:bg-[#f3f3f3] px-[6px] py-1 rounded-md transition-colors duration-[20ms]'>
    <svg role="graphics-symbol" viewBox="0 0 13 3" className="dots" style={{width: 18,height: 18,display: 'block',fill: 'rgba(55, 53, 47, 0.85)',flexShrink: 0}}><g><path d="M3,1.5A1.5,1.5,0,1,1,1.5,0,1.5,1.5,0,0,1,3,1.5Z"></path><path d="M8,1.5A1.5,1.5,0,1,1,6.5,0,1.5,1.5,0,0,1,8,1.5Z"></path><path d="M13,1.5A1.5,1.5,0,1,1,11.5,0,1.5,1.5,0,0,1,13,1.5Z"></path></g></svg>
    </div>
  </div>

</div>
      </Authenticated>
    </Layout>
  );
}