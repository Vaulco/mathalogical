'use client'
import React from 'react'
import { useEffect, useState, ChangeEvent, FocusEvent, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/lib/firebase-config'
import { AuthComponent } from '@/components/Authmenu'
import katex from 'katex'

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
  const [selectedFont, setSelectedFont] = useState("CMU Serif")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const fontFamilies = {
    "CMU Serif": "var(--font-cmu-serif-roman)",
    "简体中文": "'Noto Sans SC', sans-serif",
    "繁體中文": "'Noto Sans TC', sans-serif",
    "한글": "'Noto Sans KR', sans-serif",
    "日本語": "'Noto Sans JP', sans-serif",
    "Devanagari": "'Noto Sans Devanagari', sans-serif",
    "Arabic": "'Noto Sans Arabic', sans-serif"
  }

  // Modified to only process LaTeX portions
  const processLatex = (text: string) => {
    let result = ''
    let lastIndex = 0
    const regex = /(\$\$.*?\$\$|\$.*?\$)/g
    let match

    while ((match = regex.exec(text)) !== null) {
      // Add spaces for non-LaTeX content
      result += '\u200B'.repeat(match.index - lastIndex)
      
      // Process LaTeX
      const latex = match[0]
      try {
        if (latex.startsWith('$$')) {
          result += katex.renderToString(latex.slice(2, -2), { displayMode: true })
        } else {
          result += katex.renderToString(latex.slice(1, -1), { displayMode: false })
        }
      } catch (e) {
        result += latex
      }
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining spaces
    result += '\u200B'.repeat(text.length - lastIndex)
    return result
  }

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
  }

  const handleContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    adjustTextareaHeight()
    
    if (previewRef.current) {
      previewRef.current.innerHTML = processLatex(e.target.value)
    }
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
      <div className="w-[calc(100%-20px)] h-[calc(100%-95px)] bottom-[10px] border-[1px] px-10 border-gray-300 bg-white bg-opacity-0 absolute rounded-lg editor-container overflow-y-auto">
        <div className="relative w-[770px] mx-auto mt-8 mb-32">
          <select
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value)}
            className="absolute right-4 top-4 bg-white border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {Object.keys(fontFamilies).map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>

          <div 
            className="relative w-full min-h-[500px] bg-gradient-to-b from-white/90 via-white/90 to-transparent rounded-t-lg z-10"
            style={{
              backgroundImage: 'linear-gradient(to bottom, white 0%, white calc(100% - 100px), transparent 100%)'
            }}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              className="w-full h-full p-12 resize-none bg-transparent outline-none transition-all duration-300 text-black"
              style={{
                minHeight: '100px',
                fontFamily: fontFamilies[selectedFont as keyof typeof fontFamilies],
                caretColor: 'black',
              }}
              placeholder="Start writing... Use $...$ for inline LaTeX and $$...$$ for display mode"
            />
            
            <div
              ref={previewRef}
              className="absolute top-0 left-0 w-full h-full p-12 pointer-events-none"
              style={{
                fontFamily: fontFamilies[selectedFont as keyof typeof fontFamilies]
              }}
            />
          </div>
        </div>
      </div>

      <div className="relative w-full h-full max-h-screen max-w-[1200px] pl-10 pr-10 flex flex-col items-center justify-center">
        <AuthComponent settings profile />
        <input
          type="text"
          value={title}
          onChange={handleChange}
          onFocus={handleFocus}
          className="absolute left-10 top-[46px] leading-[1px] text-[19px] text-gray-600 bg-transparent outline-none"
          style={{
            fontFamily: fontFamilies[selectedFont as keyof typeof fontFamilies]
          }}
        />
      </div>
    </>
  )
}