import React, { useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent } from 'react';

type TextBlock = { id: string; content: string };

export const Editor: React.FC<{ content: string; onContentChange: (content: string) => void; isAuthenticated?: boolean }> = 
  ({ content, onContentChange, isAuthenticated = false }) => {
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [isEditingBlock, setIsEditingBlock] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const editableRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const isInitialLoad = useRef(true);
  const contentRef = useRef(content);

  useEffect(() => { contentRef.current = content; }, [content]);

  useEffect(() => {
    if (contentRef.current && isInitialLoad.current) {
      const blocks = contentRef.current.split('\n').filter(Boolean).map((block, index) => ({ id: `block-${index}`, content: block.trim() }));
      const initialBlocks = blocks.length ? blocks : [{ id: 'block-0', content: '' }];
      setTextBlocks(initialBlocks);
      isAuthenticated && setIsEditingBlock(initialBlocks[0].id);
      isInitialLoad.current = false;
    }
  }, [isAuthenticated]);

  const updateBlocks = useCallback((updater: (blocks: TextBlock[]) => TextBlock[]) => {
    if (!isAuthenticated) return;
    setTextBlocks(prevBlocks => {
      const newBlocks = updater(prevBlocks);
      setTimeout(() => onContentChange(newBlocks.map(b => b.content).join('\n')), 0);
      return newBlocks;
    });
  }, [onContentChange, isAuthenticated]);

  const focusBlock = useCallback((blockId: string, atPosition?: number) => {
    if (!isAuthenticated) return;
    queueMicrotask(() => {
      const blockDiv = editableRefs.current[blockId];
      if (!blockDiv) return;
      blockDiv.focus();
      const range = document.createRange();
      const lastChild = blockDiv.lastChild || blockDiv;
      range.setStart(lastChild, atPosition !== undefined ? atPosition : (lastChild.textContent?.length || 0));
      range.collapse(true);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    });
  }, [isAuthenticated]);

  const preserveCursorPosition = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAuthenticated || !e.currentTarget) return;
    const selection = window.getSelection();
    const range = document.createRange();
    let [closestNode, closestOffset, minDistance] = [null as Node | null, 0, Infinity];

    const walkTextNodes = (node: Node | null) => {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        range.selectNodeContents(node);
        Array.from(range.getClientRects()).forEach(rect => {
          if (rect.left <= e.clientX && e.clientX <= rect.right && rect.top <= e.clientY && e.clientY <= rect.bottom) {
            const testRange = document.createRange();
            testRange.setStart(node, 0);
            for (let j = 0; j <= (node.textContent?.length || 0); j++) {
              testRange.setEnd(node, j);
              const distance = Math.abs(testRange.getBoundingClientRect().left - e.clientX);
              if (distance < minDistance) [closestNode, closestOffset, minDistance] = [node, j, distance];
            }
          }
        });
      } else node.hasChildNodes() && node.childNodes?.forEach(child => walkTextNodes(child));
    };

    walkTextNodes(e.currentTarget);
    if (closestNode) {
      range.setStart(closestNode, closestOffset);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isAuthenticated]);

  const handleBlockAction = useCallback((e: KeyboardEvent<HTMLDivElement>, blockId: string) => {
    if (!isAuthenticated) return;
    const currentIndex = textBlocks.findIndex(block => block.id === blockId);
    const currentBlock = textBlocks[currentIndex];
    const sel = window.getSelection();
    const range = sel?.getRangeAt(0);
    const editableDiv = e.currentTarget;
    const [isAtStart, isAtEnd] = [!range?.startOffset, range?.startOffset === editableDiv.textContent?.length];

    const actions: Record<string, () => void> = {
      ArrowUp: () => isAtStart && navigate('up'),
      ArrowDown: () => isAtEnd && navigate('down'),
      Enter: () => !e.shiftKey && splitBlock(),
      Backspace: () => isAtStart && mergeBlocks()
    };

    const navigate = (direction: 'up' | 'down') => {
      e.preventDefault();
      const targetIndex = direction === 'up' ? Math.max(0, currentIndex - 1) : Math.min(textBlocks.length - 1, currentIndex + 1);
      setIsEditingBlock(textBlocks[targetIndex].id);
      focusBlock(textBlocks[targetIndex].id);
    };

    const splitBlock = () => {
      e.preventDefault();
      const [beforeCursor, afterCursor] = [editableDiv.textContent?.slice(0, range?.startOffset) || '', editableDiv.textContent?.slice(range?.startOffset) || ''];
      const newBlockId = `block-${Date.now()}`;
      updateBlocks(blocks => [...blocks.slice(0, currentIndex), { ...currentBlock, content: beforeCursor }, { id: newBlockId, content: afterCursor }, ...blocks.slice(currentIndex + 1)]);
      setIsEditingBlock(newBlockId);
      focusBlock(newBlockId, 0);
    };

    const mergeBlocks = () => {
      if (!sel?.isCollapsed || currentIndex === 0) return;
      e.preventDefault();
      const prevBlock = textBlocks[currentIndex - 1];
      updateBlocks(blocks => {
        const updatedBlocks = [...blocks];
        updatedBlocks[currentIndex - 1] = { ...prevBlock, content: prevBlock.content + currentBlock.content };
        updatedBlocks.splice(currentIndex, 1);
        return updatedBlocks;
      });
      setIsEditingBlock(prevBlock.id);
      focusBlock(prevBlock.id, prevBlock.content.length);
    };

    actions[e.key]?.();
  }, [textBlocks, updateBlocks, focusBlock, isAuthenticated]);

  const trimLeadingSpace = (text: string) => {
    return text.replace(/^\s+/, '');  // Only removes leading whitespace
  };

  const renderBlock = useCallback((block: TextBlock) => {
    const isCurrentBlock = isAuthenticated && isEditingBlock === block.id;
    return (
      <div key={block.id} 
        ref={el => editableRefs.current[block.id] = el} 
        contentEditable={isCurrentBlock}
        data-placeholder={isAuthenticated ? "Write something, or press '/' for commands..." : ""} 
        spellCheck="true"
        suppressContentEditableWarning 
        onInput={e => {
          if (isCurrentBlock && isAuthenticated) {
            const editableDiv = e.currentTarget;
            const selection = window.getSelection();
            const currentOffset = selection?.getRangeAt(0).startOffset;
            
            updateBlocks(blocks => blocks.map(b => b.id === block.id ? 
              { ...b, content: trimLeadingSpace(editableDiv.innerText) } : b
            ));

            queueMicrotask(() => {
              const blockDiv = editableRefs.current[block.id];
              if (blockDiv && currentOffset !== undefined) {
                const range = document.createRange();
                const textNode = blockDiv.firstChild || blockDiv;
                range.setStart(textNode, Math.min(currentOffset, textNode.textContent?.length || 0));
                range.collapse(true);
                selection?.removeAllRanges();
                selection?.addRange(range);
              }
            });
          }
        }}
        onKeyDown={e => isAuthenticated && isEditingBlock === block.id && handleBlockAction(e, block.id)}
        onClick={() => isAuthenticated && setIsEditingBlock(block.id)}
        onMouseDown={e => { if (isAuthenticated) { setIsEditingBlock(block.id); queueMicrotask(() => preserveCursorPosition(e)); }}}
        className={`w-full focus:outline-none text-[15px] leading-[1.5] py-0 whitespace-pre-wrap break-words ${
          !block.content && isAuthenticated ? 'empty:before:content-[attr(data-placeholder)] empty:before:text-[#9b9a97]' : ''
        }`}
      >{isCurrentBlock ? block.content : block.content || '\u200B'}</div>
    );
  }, [isEditingBlock, updateBlocks, handleBlockAction, isAuthenticated, preserveCursorPosition]);

  return (
      <div ref={previewRef} className="relative w-full rounded-t-lg pb-12" onClick={e => {
        if (isAuthenticated && e.target === previewRef.current && (!textBlocks.length || textBlocks[textBlocks.length - 1].content.trim())) {
          const newBlock = { id: `block-${Date.now()}`, content: '' };
          updateBlocks(blocks => [...blocks, newBlock]);
          setIsEditingBlock(newBlock.id);
          focusBlock(newBlock.id);
        }
      }}>
        {useMemo(() => textBlocks.map(renderBlock), [textBlocks, renderBlock])}
      </div>
  );
};

export default Editor;