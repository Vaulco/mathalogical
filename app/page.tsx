import React from 'react';
import { AuthComponent } from '@/components/Authmenu';

export default function Home() {
  return (
    <>
      <div className=" flex flex-col items-center justify-center w-full max-w-[600px] top-1/4 absolute">
        <h1 className="text-5xl mb-10 text-gray-800">
          Mathalogical
        </h1>
        <div className="text-lg leading-relaxed ml-10 mr-10">
          A new and inovative way to write mathalogicaly...
          With the help of LaTeX, you can write with efficiently and
          spread your work on the internet in the matter of hours.
        </div>
      </div>
      <AuthComponent settings newPost profile />
    </>
  );
}