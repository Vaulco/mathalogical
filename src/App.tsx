// App.tsx
import { Layout } from "@/Layout";
import { UserMenu } from "@/components/UserMenu";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Post from './pages/post/Post';

function HomePage() {
  return (
    <Layout>
      <UserMenu newpost settings help/>
      
      
    </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/post/:postId" element={<Post  />} />
      </Routes>
    </Router>
  );
}