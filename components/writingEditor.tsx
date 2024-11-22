'use client'
import React, { useState, useRef, useEffect } from 'react'
import ContentFormatter from './Format'

export const WritingEditor: React.FC<{
  content: string
  onContentChange: (content: string) => void
}> = ({ content, onContentChange }) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [containerHeight, setContainerHeight] = useState(500)
  const [cursorPosition, setCursorPosition] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    const container = containerRef.current
    if (textarea && container) {
      textarea.style.height = 'auto'
      const newHeight = textarea.scrollHeight
      textarea.style.height = `${newHeight}px`
      setContainerHeight(Math.max(newHeight, 400) + 30)
    }
  }

  const togglePreviewMode = () => {
    if (isPreviewMode && textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart)
    }
    setIsPreviewMode(!isPreviewMode)
  }

  useEffect(() => {
    if (!isPreviewMode && cursorPosition !== null && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(cursorPosition, cursorPosition)
    }
  }, [isPreviewMode, cursorPosition])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        togglePreviewMode()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPreviewMode])

  useEffect(() => {
    if (!isPreviewMode) {
      adjustTextareaHeight()
    } else if (previewRef.current) {
      const previewHeight = previewRef.current.scrollHeight
      setContainerHeight(Math.max(previewHeight, 400) + 30)
    }
  }, [content, isPreviewMode])

  return (
    <div className="absolute top-0 w-[650px] mx-auto mt-8 mb-32">
      <div 
        ref={containerRef}
        className="relative w-full rounded-t-lg z-10"
        style={{
          minHeight: `${containerHeight}px`,
          backgroundImage: 'linear-gradient(to bottom, white 0%, white calc(100% - 100px), transparent 100%)'
        }}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            onContentChange(e.target.value)
            setCursorPosition(e.target.selectionStart)
          }}
          className="w-full h-full p-12 resize-none bg-transparent outline-none transition-all duration-300 text-[15px]"
          style={{
            minHeight: '100px',
            caretColor: 'black',
            display: isPreviewMode ? 'none' : 'block'
          }}
          placeholder="Start writing... "
        />
        
        <div
          ref={previewRef}
          className="absolute top-0 left-0 w-full p-12"
          style={{
            pointerEvents: isPreviewMode ? 'auto' : 'none',
            display: isPreviewMode ? 'block' : 'none'
          }}
        >
          {isPreviewMode && <ContentFormatter content={content} />}
        </div>
      </div>
    </div>
  )
}

export default WritingEditor