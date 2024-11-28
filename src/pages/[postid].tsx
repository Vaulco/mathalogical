import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format } from "date-fns";
import { Layout } from "@/Layout";
import UserMenu from "@/components/UserMenu";
import ContentFormatter from '@/components/Format';


export default function DocumentViewer() {
  const { postId } = useParams<{ postId: string }>();
  const documentInfo = useQuery(api.posts.getDocumentInfo, postId ? { postId } : "skip");

  if (!postId) return <Navigate to="/" />;
  if (!documentInfo) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500 text-lg">loading...</div>
        </div>
        <UserMenu newpost settings help />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full h-[calc(100%-57px)] bottom-0 border-t border-gray-300 bg-white bg-opacity-0 fixed editor-container overflow-x-auto flex justify-center items-center">
        <div className="px-10 w-full flex justify-center items-center">
        <div className="absolute top-0 max-w-[650px] mx-auto mt-8 mb-32 px-10">
        <div className="">
          <h1 className=" text-[23px] text-gray-600 bg-transparent  ">{documentInfo.title}</h1>
          <div className="flex gap-4 text-sm text-gray-500 pb-2 mb-2 border-b border-gray-300">
            <div>
              Created: {format(new Date(documentInfo.createdAt), 'PPP')}
            </div>
            <div>
              Updated: {format(new Date(documentInfo.updatedAt), 'PPP')}
            </div>
          </div>
        </div>
        <ContentFormatter
          content={documentInfo.content}
          inlineMathSize="text-sm"
          displayMathSize="text-base"
          variant="document"
        />
      </div>
      </div>
      </div>
      <UserMenu settings help />
      <h1 className="top-[15px] left-4 absolute text-[19px] text-gray-600 mb-2 max-w-[300px] truncate">Mathalogical</h1>
    </Layout>
  );
}