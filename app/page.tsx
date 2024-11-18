'use client';
import React from 'react';
import { AuthComponent } from '@/components/auth';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="relative w-full h-full max-h-screen max-w-[1200px] font-[family-name:var(--font-cmu-serif-roman)] pl-10 pr-10 flex flex-col items-center justify-center">
      <AuthComponent />
      
        
        
        
        
        <div className=" flex flex-col items-center justify-center w-full max-w-[600px] bottom-1/4 relative">
        
          <h1 className="text-5xl mb-10 text-gray-800">
            Mathalogical
          </h1>
          <div className="text-lg leading-relaxed text-gray-700 text">
            A new and inovative way to write mathalogicaly...
            With the help of LaTeX, you can write with efficiently and
            spread your work on the internet in the matter of hours.
          </div>
          
        </div>

        
      </div>
  );
}