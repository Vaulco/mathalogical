'use client'
import React, { useState, useRef, useEffect } from 'react'
import katex from 'katex'
import { Eye, EyeOff, Clipboard, Check } from 'lucide-react'

type HeadingLevel = 1 | 2 | 3 | 4

export const WritingEditor: React.FC<{
  content: string
  onContentChange: (content: string) => void
}> = ({ content, onContentChange }) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [containerHeight, setContainerHeight] = useState(500)
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({})
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const sizeClasses: Record<HeadingLevel, string> = {
    1: 'text-[25px] font-medium mt-0',
    2: 'text-[20px] font-bold my-3',
    3: 'text-[20px] font-semibold',
    4: 'text-lg font-medium',
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStates(prev => ({ ...prev, [id]: true }))
      setTimeout(() => setCopyStates(prev => {
        const newState = { ...prev }
        delete newState[id]
        return newState
      }), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const processLatex = (text: string) => {
    const regex = /(\$\$.*?\$\$|\$.*?\$)/g
    return text.replace(regex, match => {
      try {
        return match.startsWith('$$') 
          ? katex.renderToString(match.slice(2, -2), { displayMode: true })
          : katex.renderToString(match.slice(1, -1), { displayMode: false })
      } catch {
        return match
      }
    })
  }

  const formatText = (text: string) => {
    return processLatex(text
      .replace(/\/s/g, '<div class="mb-3"></div>')
      .replace(/\/t/g, '<div class="mb-10"></div>')
      .replace(/\/n/g, '<br>')
      .replace(/^(#{1,4})\s(.+)$/gm, (_, hashes, content) => {
        const headingLevel = hashes.length as HeadingLevel
        return `<h${headingLevel} class="my-4 ${sizeClasses[headingLevel] || ''}">${content}</h${headingLevel}>`
      })
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^-\s(.+)$/gm, '<div style="text-indent: -0.9em; padding-left: 0.9em;">• &nbsp;$1</div>')
      .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="list-disc ml-1 my-1">$1</ul>')
      .replace(/^(\d+)\.\s(.+)$/m, '<li  value="$1">$2</li>')
      .replace(/((?:<li.*>.*<\/li>\n?)+)/g, '<ol class="list-decimal ml-4 my-0">$1</ol>')
      .replace(/^>\s(.+)$/m, '<blockquote class="border-l-4 border-gray-300 pl-4 my-4">$1</blockquote>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      .replace(/\{c\}([\s\S]*?)\{c\}/g, '<div class="text-center">$1</div>')
      .replace(/\{\/r\}([\s\S]*?)\{\/r\}/g, '<div class="text-right">$1</div>')
      .replace(/\{\/l\}([\s\S]*?)\{\/l\}/g, '<div class="text-left">$1</div>')
    )
  }

  const renderContent = () => {
    if (!content) return null

    const blocks: JSX.Element[] = []
    const regex = /```([\s\S]*?)```/g
    let lastIndex = 0
    let blockIndex = 0
    let match

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textContent = formatText(content.slice(lastIndex, match.index))
        blocks.push(
          <div key={`text-${blockIndex}`} dangerouslySetInnerHTML={{ __html: textContent }} />
        )
      }

      const code = match[1].trim()
      const id = `code-${blockIndex}`
      blocks.push(
        <pre key={id} className="text-sm bg-gray-100 relative rounded-lg font-[var(--font-cmu-serif-roman)] min-h-[40px] flex items-center my-3">
          <button
            onClick={() => handleCopy(code, id)}
            className="copy-button p-1 w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors absolute right-[7px] flex justify-center items-center top-[7px]"
          >
            {copyStates[id] ? <Check size={16} /> : <Clipboard size={16} />}
          </button>
          <p className="m-3 pr-12 overflow-x-auto w-full">{code}</p>
        </pre>
      )

      lastIndex = match.index + match[0].length
      blockIndex++
    }

    if (lastIndex < content.length) {
      const textContent = formatText(content.slice(lastIndex))
      blocks.push(
        <div key={`text-${blockIndex}`} dangerouslySetInnerHTML={{ __html: textContent }} />
      )
    }

    return blocks
  }

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

  useEffect(() => {
    if (!isPreviewMode) {
      adjustTextareaHeight()
    } else if (previewRef.current) {
      const previewHeight = previewRef.current.scrollHeight
      setContainerHeight(Math.max(previewHeight, 400) + 30)
    }
  }, [content, isPreviewMode])

  
  return (
    <div className="relative w-[770px] mx-auto mt-8 mb-32">
      <div className="absolute -right-[40px] flex gap-2 items-center z-[10]">
        <button
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className="flex items-center justify-center h-8 w-8 bg-white rounded-lg transition-colors"
        >
          {isPreviewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      
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
          onChange={(e) => onContentChange(e.target.value)}
          className="w-full h-full p-12 px-20 resize-none bg-transparent outline-none transition-all duration-300 text-m"
          style={{
            minHeight: '100px',
            caretColor: 'black',
            display: isPreviewMode ? 'none' : 'block'
          }}
          placeholder="Start writing... Use $...$ for inline LaTeX and $$...$$ for display mode. Use {/center}, {/right}, {/left} for text alignment"
        />
        
        <div
          ref={previewRef}
          className="absolute top-0 left-0 w-full p-12"
          style={{
            pointerEvents: isPreviewMode ? 'auto' : 'none',
            display: isPreviewMode ? 'block' : 'none'
          }}
        >
          {isPreviewMode && renderContent()}
        </div>
      </div>
    </div>
  )
}