import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format } from "date-fns";
import { Layout } from "@/Layout";
import UserMenu from "@/components/UserMenu";

export default function DocumentViewer() {
  const { postId } = useParams<{ postId: string }>();
  const documentInfo = useQuery(api.posts.getDocumentInfo, postId ? { postId } : "skip");

  if (!postId) return <Navigate to="/" />;
  if (!documentInfo) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Document not found</div>
        </div>
        <UserMenu newpost settings help />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{documentInfo.title}</h1>
          <div className="flex gap-4 text-sm text-gray-500">
            <div>
              Created: {format(new Date(documentInfo.createdAt), 'PPP')}
            </div>
            <div>
              Last updated: {format(new Date(documentInfo.updatedAt), 'PPP')}
            </div>
          </div>
        </div>
        <div className="prose prose-lg max-w-none">
          {documentInfo.content}
        </div>
      </div>
      <UserMenu newpost settings help />
    </Layout>
  );
}