import { Layout } from '@/Layout';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export default function Library() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = useQuery(api.users.viewer);
  const posts = useQuery(api.posts.list);

  useEffect(() => {
    if (user !== undefined) {
      setLoading(false);
    }
  }, [user]);

  const handlePostClick = (postId: string) => {
    navigate(`/post/${postId}`);
  };

  return (
    <Layout>
      <div className="flex flex-col h-screen w-full p-6">
        <h1 className="text-2xl font-bold mb-6">My Library</h1>
        {loading ? (
          <div className="flex justify-center items-center">
            <p>Loading posts...</p>
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <div
                key={post.postId}
                onClick={() => handlePostClick(post.postId)}
                className="border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-400">
                    Created: {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-400">
                    Updated: {new Date(post.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center">
            <p className="text-gray-500">No posts available</p>
          </div>
        )}
      </div>
    </Layout>
  );
}