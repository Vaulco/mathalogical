import React, { useState, useRef, useEffect } from 'react';
import katex from 'katex';
import { Clipboard, Check } from 'lucide-react';

type HeadingLevel = 1 | 2 | 3;

interface StyleVariants {
  pre: string;
  inlineCode: string;
  blockquote: string;
  copyButton: string;
  copyButtonHover: string;
  copyButtonSuccess: string;
}

interface ContentFormatterProps {
  content: string;
  inlineMathSize?: string;
  displayMathSize?: string;
  mathTextSize?: string;
  variant?: 'post' | 'document';
}

const styleVariants: Record<'post' | 'document', StyleVariants> = {
  post: {
    pre: "text-[15px] bg-gray-100 relative rounded-lg font-[var(--font-cmu-serif-roman)] min-h-[40px] flex items-center my-3",
    inlineCode: "bg-gray-100 p-1 rounded",
    blockquote: "border-l-4 border-gray-300 pl-4 my-4",
    copyButton: "copy-button p-2 rounded-md transition-all duration-200 absolute right-[7px] flex justify-center items-center text-sm",
    copyButtonHover: "hover:bg-white hover:border-gray-300",
    copyButtonSuccess: "bg-gray-100 text-green-600"
  },
  document: {
    pre: "text-[15px] bg-white relative rounded-lg font-[var(--font-cmu-serif-roman)] min-h-[40px] flex items-center my-3",
    inlineCode: "p-1 rounded bg-white text-gray-500",
    blockquote: "border-l-4 pl-4 my-4",
    copyButton: "copy-button p-2 rounded-md transition-all duration-200 absolute right-[7px] flex justify-center items-center text-sm",
    copyButtonHover: "hover:bg-gray-100 hover:border-gray-300",
    copyButtonSuccess: "bg-gray-100 text-green-600"
  }
};

const ContentFormatter: React.FC<ContentFormatterProps> = ({ 
  content, 
  inlineMathSize = 'text-[15px]',
  displayMathSize = 'text-base',
  mathTextSize = 'text-[15px]',
  variant = 'post'
}) => {
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const styles = styleVariants[variant];

  const sizeClasses: Record<HeadingLevel, string> = {
    1: 'text-[25px] mt-0 mb-0 ',
    2: 'text-[20px] my-2 ',
    3: 'text-[18px] my-2',
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setCopyStates(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      }), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const scrollToEquation = (number: string) => {
    if (!contentRef.current) return;
    
    const equation = contentRef.current.querySelector(`[data-equation-number="${number}"]`);
    if (equation) {
      equation.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  let equationCounter = 0;

  const processLatex = (text: string) => {
    // Custom macros for different text sizes
    const macros = {
      '\\normaltext': `\\htmlClass{${mathTextSize}}{\\text{#1}}`,
    };

    // First handle display math ($$...$$)
    const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
    text = text.replace(displayMathRegex, (match, latex) => {
      try {
        const isNumbered = latex.includes('\\begin{equation}') && latex.includes('\\end{equation}');
        const processedLatex = latex.replace(/\\text\{([^}]*)\}/g, '\\normaltext{$1}');
        const rendered = katex.renderToString(processedLatex.trim(), { 
          displayMode: true,
          macros,
          trust: true
        });
        
        return `<div class="equation-block relative ${displayMathSize}"${
          isNumbered ? ` data-equation-number="${++equationCounter}"` : ''
        }><div class="equation-content">${rendered}</div></div>`;
      } catch (error) {
        console.error('KaTeX error:', error);
        return match;
      }
    });

    // Then handle inline math ($...$)
    const inlineMathRegex = /\$([^\$]+?)\$/g;
    return text.replace(inlineMathRegex, (match, latex) => {
      try {
        const processedLatex = latex.replace(/\\text\{([^}]*)\}/g, '\\normaltext{$1}');
        const rendered = katex.renderToString(processedLatex.trim(), { 
          displayMode: false,
          macros,
          trust: true
        });
        return `<span class="${inlineMathSize}">${rendered}</span>`;
      } catch (error) {
        console.error('KaTeX error:', error);
        return match;
      }
    });
  };

  const createEquationLink = (number: string) => {
    return `<span class="equation-ref cursor-pointer hover:underline" data-ref="${number}">(${number})</span>`;
  };

  const processEquationReferences = (text: string) => {
    return text.replace(/\{r(\d+)\}/g, (match, number) => {
      if (parseInt(number) <= equationCounter) {
        return createEquationLink(number);
      }
      return match;
    });
  };

  useEffect(() => {
    const handleReferenceClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('equation-ref')) {
        event.preventDefault();
        const refNumber = target.getAttribute('data-ref');
        if (refNumber) {
          scrollToEquation(refNumber);
        }
      }
    };

    contentRef.current?.addEventListener('click', handleReferenceClick);
    return () => {
      contentRef.current?.removeEventListener('click', handleReferenceClick);
    };
  }, []);

  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const formatText = (text: string) => {
    const replacements = {
      '/s': '<div class="mb-3"></div>',
      '/t': '<div class="mb-10"></div>',
      '/n': '<br>',
      '\\*\\*(.+?)\\*\\*': '<strong>$1</strong>',
      '\\*(.+?)\\*': '<em>$1</em>',
      '^-\\s(.+)$': '<div style="text-indent: -0.9em; padding-left: 1.9em;">• &nbsp;$1</div>',
      '^(\\d+)\\.\\s(.+)$': '<li value="$1" class="pl-1">$2</li>',
      '((?:<li.*>.*</li>\\n?)+)': '<ol class="list-decimal ml-4 my-0">$1</ol>',
      '^>\\s(.+)$': `<blockquote class="${styles.blockquote}">$1</blockquote>`,
      '`(.+?)`': `<code class="${styles.inlineCode}">$1</code>`,
      '__(.+?)__': '<u>$1</u>',
      '\\{c\\}([\\s\\S]*?)\\{c\\}': '<div class="text-center">$1</div>',
      '\\{\\/r\\}([\\s\\S]*?)\\{\\/r\\}': '<div class="text-right">$1</div>',
      '\\{\\/l\\}([\\s\\S]*?)\\{\\/l\\}': '<div class="text-left">$1</div>',
      '\\{b\\}([\\s\\S]*?)\\{b\\}': '<div class="border border-gray-700 p-2 my-2">$1</div>'
    };
  
    let formatted = text.replace(/^(#{1,3})\s(.+)$/gm, (_, hashes, content) => {
      const level = hashes.length as HeadingLevel;
      return `<h${level} class="my-4 ${sizeClasses[level] || ''}">${content}</h${level}>`;
    });
  
    formatted = Object.entries(replacements).reduce(
      (text, [pattern, replacement]) => text.replace(new RegExp(pattern, 'gm'), replacement),
      formatted
    );

    formatted = formatted
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (_, text, url) => `<a href="${escapeHtml(url)}" class="text-[#4b7faf] hover:underline" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`
      )
      .replace(
        /(?<![\(\[]|href="|">)https?:\/\/(?:www\.)?([^\s<]+?)(?=\s|$|<)/g,
        match => `<a href="${escapeHtml(match)}" class="text-[#4b7faf] hover:underline" target="_blank" rel="noopener noreferrer">${escapeHtml(match.replace(/^https?:\/\/(www\.)?/, ''))}</a>`
      );
  
    return processEquationReferences(processLatex(formatted));
  };

  const renderContent = () => {
    if (!content) return null;
  
    const blocks: JSX.Element[] = [];
    const regex = /```([\s\S]*?)```/g;
    let lastIndex = 0;
    let blockIndex = 0;
    let match;
  
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textContent = formatText(content.slice(lastIndex, match.index));
        blocks.push(
          <div key={`text-${blockIndex}`} dangerouslySetInnerHTML={{ __html: textContent }} />
        );
      }
  
      const code = match[1].trim();
      const id = `code-${blockIndex}`;
      const buttonClass = `${styles.copyButton} ${
        hoveredButton === id ? styles.copyButtonHover : ''
      } ${copyStates[id] ? styles.copyButtonSuccess : ''}`;
  
      blocks.push(
        <pre key={id} className={styles.pre}>
          <button
            onClick={() => handleCopy(code, id)}
            onMouseEnter={() => setHoveredButton(id)}
            onMouseLeave={() => setHoveredButton(null)}
            className={buttonClass}
          >
            {copyStates[id] ? <Check size={14} /> : <Clipboard size={14} />}
          </button>
          <p className="m-3 pr-16 overflow-x-auto w-full">{code}</p>
        </pre>
      );
  
      lastIndex = match.index + match[0].length;
      blockIndex++;
    }
  
    if (lastIndex < content.length) {
      const textContent = formatText(content.slice(lastIndex));
      blocks.push(
        <div key={`text-${blockIndex}`} dangerouslySetInnerHTML={{ __html: textContent }} />
      );
    }
  
    return blocks;
  };
  
  return (
    <div ref={contentRef}>
      {renderContent()}
    </div>
  );
};

export default ContentFormatter;