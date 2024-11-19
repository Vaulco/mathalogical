'use client'
import React from 'react'
import { useEffect, useState, ChangeEvent, FocusEvent, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/lib/firebase-config'
import { AuthComponent } from '@/components/Authmenu'

function useAuthProtection() {
  const router = useRouter()
  
  useEffect(() => {
    const auth = getAuth(app)
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router])
}

export default function NewPage() {
  useAuthProtection()
  const [title, setTitle] = useState("Untitled")
  const [content, setContent] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
  }

  const handleContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    adjustTextareaHeight()
  }

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }

  return (
    <>
      <div className='w-[calc(100%-20px)] h-[calc(100%-140px)] bottom-[10px] border-[1px] px-10 border-gray-300 bg-white bg-opacity-0 absolute rounded-lg editor-container overflow-y-auto'>
        <div className="relative w-[770px] mx-auto mt-8 mb-32">
          {/* Paper container with natural shadow */}
          <div className="relative w-full min-h-[calc(100vh-300px)] bg-white rounded-t-lg shadow-[0_0_15px_rgba(0,0,0,0.05)] z-10">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              className="w-full h-full p-12 resize-none bg-transparent outline-none font-[family-name:var(--font-cmu-serif-roman)] transition-all duration-300"
              style={{
                minHeight: '100px',
              }}
              placeholder="Start writing..."
            />
            {/* Enhanced fade effect */}
            <div 
              className="absolute -bottom-32 left-0 right-0 pointer-events-none"
              style={{
                height: '150px',
                background: `linear-gradient(to bottom, 
                  rgba(255,255,255,1) 0%,
                  rgba(255,255,255,0.9) 20%,
                  rgba(255,255,255,0.8) 40%,
                  rgba(255,255,255,0.4) 60%,
                  rgba(255,255,255,0.1) 80%,
                  rgba(255,255,255,0) 100%
                )`
              }}
            />
            {/* Side fade effects for depth */}
            <div className="absolute top-0 right-0 w-4 h-full bg-gradient-to-l from-white/20 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 w-4 h-full bg-gradient-to-r from-white/20 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="relative w-full h-full max-h-screen max-w-[1200px] font-[family-name:var(--font-cmu-serif-roman)] pl-10 pr-10 flex flex-col items-center justify-center">
        <div className='w-full max-w-[calc(100%-80px)] h-[35px] top-[85px] bg-white absolute rounded-lg' />
        <AuthComponent settings profile />
        <input
          type="text"
          value={title}
          onChange={handleChange}
          onFocus={handleFocus}
          className="absolute left-10 top-[46px] leading-[1px] text-[18px] text-gray-600 bg-transparent outline-none"
        />
      </div>
    </>
  )
}