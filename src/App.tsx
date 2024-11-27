// App.tsx
import { Layout } from "@/Layout";
import { UserMenu } from "@/components/UserMenu";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Post from './pages/post/Post';
import DocumentViewer from './pages/[postid]';

function HomePage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center w-full max-w-[600px] top-1/4 absolute">
        <h1 className="text-5xl mb-10 text-gray-800">
          Mathalogical
        </h1>
        <div className="text-lg leading-relaxed ml-10 mr-10">
          A new and innovative way to write mathematically...
          With the help of LaTeX, you can write efficiently and
          spread your work on the internet in the matter of hours.
        </div>
      </div>
      <UserMenu newpost settings help/>
    </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/post/:postId" element={<Post />} />
        <Route path="/:postId" element={<DocumentViewer />} />
      </Routes>
    </Router>
  );
}