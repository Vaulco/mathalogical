import { Layout } from "@/Layout";
import { UserMenu } from "@/components/UserMenu";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Post from './pages/post/Post';
import Library from "./pages/post/library";

function HomePage() {
  return (
    <Layout>
      <UserMenu newpost/>
    </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage/>} />
        <Route path="/post/:postId" element={<Post/>} />
        <Route path="/post/" element={<Library/>} />
      </Routes>
    </Router>
  );
}