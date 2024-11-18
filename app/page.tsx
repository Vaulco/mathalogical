'use client';
import React from 'react';
import { AuthComponent } from '@/components/auth';

export default function Home() {
  return (
    <div className="relative min-h-screen max-w-[1200px] font-[family-name:var(--font-cmu-serif-roman)]">
      

      {/* Split Layout Container */}
      <div className="flex min-h-screen">
        {/* Left Column - Content */}
        <div className="w-4/6 p-16 flex flex-col items-center top-52 relative">
        
          <h1 className="text-5xl mb-16">
            Mathalogical
          </h1>
          
          <div className="text-lg leading-relaxed text-gray-700 max-w-[100%]">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum
          </div>
        </div>

        {/* Right Column - Image */}
        <div className="w-2/6 relative">
        <AuthComponent />
        </div>
      </div>
    </div>
  );
}