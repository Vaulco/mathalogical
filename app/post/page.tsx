'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/lib/firebase-config'
import { AuthComponent } from '@/components/Authmenu'
import { WritingEditor } from '@/components/writingEditor'

export default function NewPage() {
  const router = useRouter()
  const [title, setTitle] = useState("Untitled")
  const [content, setContent] = useState("")
  const [lastValidTitle, setLastValidTitle] = useState("Untitled")

  useEffect(() => {
    const auth = getAuth(app)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/')
    })
    return () => unsubscribe()
  }, [router])

  const handleTitleInput = {
    focus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
    change: (e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value),
    blur: (e: React.FocusEvent<HTMLInputElement>) => {
      const trimmedValue = e.target.value.trim()
      setTitle(trimmedValue === '' ? lastValidTitle : trimmedValue)
      if (trimmedValue !== '') setLastValidTitle(trimmedValue)
    }
  }

  return (
    <>
      <div className="w-[calc(100%-20px)] h-[calc(100%-95px)] bottom-[10px] border-[1px] px-10 border-gray-300 bg-white bg-opacity-0 absolute rounded-lg editor-container overflow-y-auto">
        <WritingEditor
          content={content}
          onContentChange={setContent}
        />
      </div>

      <div className="relative w-full h-full max-h-screen max-w-[1200px] pl-10 pr-10 flex flex-col items-center justify-center">
        <AuthComponent settings profile />
        <input
          type="text"
          value={title}
          onChange={handleTitleInput.change}
          onFocus={handleTitleInput.focus}
          onBlur={handleTitleInput.blur}
          className="absolute left-10 top-[46px] leading-[1px] text-[19px] text-gray-600 bg-transparent outline-none"
        />
      </div>
    </>
  )
}