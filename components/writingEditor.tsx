'use client'
import React, { useState, ChangeEvent, useRef } from 'react'
import katex from 'katex'
import { Eye, EyeOff, Clipboard, Check } from 'lucide-react'

interface WritingEditorProps {
  content: string
  onContentChange: (content: string) => void
}

interface CodeBlockProps {
  code: string
  id: string
  onCopy: (text: string, id: string) => void
  isCopied: boolean
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, id, onCopy, isCopied }) => {
  return (
    <pre className="text-sm bg-gray-100 relative rounded-lg font-[var(--font-cmu-serif-roman)] min-h-[40px] flex items-center my-4">
      <button
        onClick={() => onCopy(code, id)}
        className="copy-button p-1 w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors absolute right-1 flex justify-center items-center"
      >
        {isCopied ? <Check size={16} /> : <Clipboard size={16} />}
      </button>
      <p className="ml-3 pr-12 overflow-x-auto w-full">{code}</p>
    </pre>
  )
}

const TextBlock: React.FC<{ content: string }> = ({ content }) => {
  return <div dangerouslySetInnerHTML={{ __html: content }} />
}

const fontFamily = "var(--font-cmu-serif-roman)"

export const WritingEditor: React.FC<WritingEditorProps> = ({
  content,
  onContentChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({})

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStates(prev => ({ ...prev, [id]: true }))
      setTimeout(() => {
        setCopyStates(prev => {
          const newState = { ...prev }
          delete newState[id]
          return newState
        })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const processLatex = (text: string) => {
    let result = ''
    let lastIndex = 0
    const regex = /(\$\$.*?\$\$|\$.*?\$)/g
    let match

    while ((match = regex.exec(text)) !== null) {
      result += text.slice(lastIndex, match.index)
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
    result += text.slice(lastIndex)
    return result
  }

  const formatText = (text: string) => {
    let formatted = text
      .replace(/^(#{1,6})\s(.+)$/m, (_, hashes, content) => 
        `<h${hashes.length} class="my-4">${content}</h${hashes.length}>`)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^-\s(.+)$/m, '<li>$1</li>')
      .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="list-disc ml-6 my-2">$1</ul>')
      .replace(/^(\d+)\.\s(.+)$/m, '<li value="$1">$2</li>')
      .replace(/((?:<li.*>.*<\/li>\n?)+)/g, '<ol class="list-decimal ml-6 my-2">$1</ol>')
      .replace(/^>\s(.+)$/m, '<blockquote class="border-l-4 border-gray-300 pl-4 my-4">$1</blockquote>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      .replace(/\n\n/g, '<br><br>')

    return processLatex(formatted)
  }

  const renderContent = () => {
    if (!content) return null

    const blocks: JSX.Element[] = []
    let lastIndex = 0
    let blockIndex = 0

    const regex = /```([\s\S]*?)```/g
    let match

    while ((match = regex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = formatText(content.slice(lastIndex, match.index))
        blocks.push(
          <TextBlock key={`text-${blockIndex}`} content={textContent} />
        )
      }

      // Add code block
      const code = match[1].trim()
      const id = `code-${blockIndex}`
      blocks.push(
        <CodeBlock
          key={id}
          id={id}
          code={code}
          onCopy={handleCopy}
          isCopied={!!copyStates[id]}
        />
      )

      lastIndex = match.index + match[0].length
      blockIndex++
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const textContent = formatText(content.slice(lastIndex))
      blocks.push(
        <TextBlock key={`text-${blockIndex}`} content={textContent} />
      )
    }

    return blocks
  }

  const handleContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(e.target.value)
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
    <div className="relative w-[770px] mx-auto mt-8 mb-32">
      <div className="absolute right-4 top-4 flex gap-2 items-center z-[100]">
        <button
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          {isPreviewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {isPreviewMode ? 'Edit' : 'Preview'}
        </button>
      </div>

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
            fontFamily: fontFamily,
            caretColor: 'black',
            display: isPreviewMode ? 'none' : 'block'
          }}
          placeholder="Start writing... Use $...$ for inline LaTeX and $$...$$ for display mode"
        />
        
        <div
          className="absolute top-0 left-0 w-full h-full p-12 overflow-auto"
          style={{
            fontFamily: fontFamily,
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

export { fontFamily }