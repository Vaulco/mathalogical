import React, { useRef, useEffect, useMemo } from 'react';
import katex from 'katex';

interface ContentFormatterProps {
  content: string;
  inlineMathSize?: string;
  displayMathSize?: string;
  mathTextSize?: string;
}

const ContentFormatter: React.FC<ContentFormatterProps> = ({
  content,
  inlineMathSize = 'text-[15px]',
  displayMathSize = 'text-base',
  mathTextSize = 'text-[15px]'
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  let equationCounter = 0;

  const macros = useMemo(() => ({ 
    '\\normaltext': `\\htmlClass{${mathTextSize}}{\\text{#1}}` 
  }), [mathTextSize]);

  const renderMath = (latex: string, displayMode: boolean) => 
    katex.renderToString(
      latex.replace(/\\text\{([^}]*)\}/g, '\\normaltext{$1}').trim(),
      { displayMode, macros, trust: true }
    )

  const processLatex = (text: string) => text
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
      const isNumbered = latex.includes('\\begin{equation}') && latex.includes('\\end{equation}');
      return `<div class="${displayMathSize}"${isNumbered ? ` data-equation-number="${++equationCounter}"` : ''}>${renderMath(latex, true)}</div>`;
    })
    .replace(/\$([^\$]+?)\$/g, (_, latex) => 
      `<span class="${inlineMathSize}">${renderMath(latex, false)}</span>`
    )
    .replace(/\{(\d+)\}/g, (_, num) => 
      parseInt(num) <= equationCounter ? 
        `<span class="equation-ref cursor-pointer" data-ref="${num}">(${num})</span>` : num
    );

  useEffect(() => {
    const currentRef = contentRef.current;
    if (!currentRef) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('equation-ref')) return;
      
      e.preventDefault();
      const refNumber = target.getAttribute('data-ref');
      const equation = currentRef.querySelector(`[data-equation-number="${refNumber}"]`);
      equation?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    currentRef.addEventListener('click', handleClick);
    return () => currentRef.removeEventListener('click', handleClick);
  }, []);

  return (
    <div ref={contentRef}>
      <div dangerouslySetInnerHTML={{ __html: content ? processLatex(content) : '' }} />
    </div>
  );
};

export default ContentFormatter;