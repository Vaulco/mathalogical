// App.tsx
import { Layout } from "@/Layout";
import { UserMenu } from "@/components/UserMenu";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Post from './pages/post/Post';

function HomePage() {
  return (
    <Layout>
      <UserMenu newpost settings help/>
      <div className="flex flex-col items-center justify-center w-full h-full max-w-[600px] absolute font-sans font-semibold text-[#37352f]">
        <h1 className="text-[30px] mb-10  top-14 absolute">
          Good afternoon
        </h1>
        <div className="text-base text-pretty leading-relaxed ml-10 mr-10 font-normal top-32 absolute ">
        "This page is a memoir of my studies and examinations. I have carefully chosen these through careful reflection, organizing my thoughts and experiences across different subjects - from mathematics to other academic disciplines.
        </div>
      </div>
      
      
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