import React, { useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent } from 'react';

type TextBlock = { id: string; content: string };

export const Editor: React.FC<{ content: string; onContentChange: (content: string) => void }> = 
  ({ content, onContentChange }) => {
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [isEditingBlock, setIsEditingBlock] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const editableRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const isInitialLoad = useRef(true);

  const updateBlocks = useCallback((updater: (blocks: TextBlock[]) => TextBlock[]) => {
    setTextBlocks(blocks => {
      const newBlocks = updater(blocks);
      onContentChange(newBlocks.map(b => b.content).join('\n'));
      return newBlocks;
    });
  }, [onContentChange]);

  const focusBlock = useCallback((blockId: string, atPosition?: number) => {
    queueMicrotask(() => {
      const blockDiv = editableRefs.current[blockId];
      if (!blockDiv) return;
      blockDiv.focus();
      const range = document.createRange();
      const lastChild = blockDiv.lastChild || blockDiv;
      const position = atPosition !== undefined ? atPosition : (lastChild.textContent?.length || 0);
      range.setStart(lastChild, position);
      range.collapse(true);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    });
  }, []);

  useEffect(() => {
    if (content && isInitialLoad.current) {
      const blocks = content.split('\n').filter(Boolean).map((block, index) => 
        ({ id: `block-${index}`, content: block.trim() }));
      const initialBlocks = blocks.length ? blocks : [{ id: 'block-0', content: '' }];
      setTextBlocks(initialBlocks);
      setIsEditingBlock(initialBlocks[0].id);
      isInitialLoad.current = false;
    }
  }, [content]);

  const handleBlockAction = useCallback((e: KeyboardEvent<HTMLDivElement>, blockId: string) => {
    const currentIndex = textBlocks.findIndex(block => block.id === blockId);
    const currentBlock = textBlocks[currentIndex];
    const sel = window.getSelection();
    const range = sel?.getRangeAt(0);
    const editableDiv = e.currentTarget;
    const isAtStart = !range?.startOffset;
    const isAtEnd = range?.startOffset === editableDiv.textContent?.length;

    const actions = {
      ArrowUp: () => isAtStart && navigate('up'),
      ArrowDown: () => isAtEnd && navigate('down'),
      Enter: () => !e.shiftKey && splitBlock(),
      Backspace: () => isAtStart && mergeBlocks()
    };

    const navigate = (direction: 'up' | 'down') => {
      e.preventDefault();
      const targetIndex = direction === 'up' ? Math.max(0, currentIndex - 1) 
        : Math.min(textBlocks.length - 1, currentIndex + 1);
      setIsEditingBlock(textBlocks[targetIndex].id);
      focusBlock(textBlocks[targetIndex].id);
    };

    const splitBlock = () => {
      e.preventDefault();
      const [beforeCursor, afterCursor] = [
        editableDiv.textContent?.slice(0, range?.startOffset) || '',
        editableDiv.textContent?.slice(range?.startOffset) || ''
      ];
      const newBlockId = `block-${Date.now()}`;
      updateBlocks(blocks => [
        ...blocks.slice(0, currentIndex),
        { ...currentBlock, content: beforeCursor },
        { id: newBlockId, content: afterCursor },
        ...blocks.slice(currentIndex + 1)
      ]);
      setIsEditingBlock(newBlockId);
      focusBlock(newBlockId, 0);
    };

    const mergeBlocks = () => {
      if (!sel?.isCollapsed || currentIndex === 0) return;
      e.preventDefault();
      const prevBlock = textBlocks[currentIndex - 1];
      const cursorPosition = prevBlock.content.length;
      updateBlocks(blocks => {
        const updatedBlocks = [...blocks];
        updatedBlocks[currentIndex - 1] = { 
          ...prevBlock, 
          content: prevBlock.content + currentBlock.content 
        };
        updatedBlocks.splice(currentIndex, 1);
        return updatedBlocks;
      });
      setIsEditingBlock(prevBlock.id);
      focusBlock(prevBlock.id, cursorPosition);
    };

    actions[e.key as keyof typeof actions]?.();
  }, [textBlocks, updateBlocks, focusBlock]);

  const renderBlock = useCallback((block: TextBlock) => {
    const isCurrentBlock = isEditingBlock === block.id;
    return (
      <div
        key={block.id}
        ref={(el) => editableRefs.current[block.id] = el}
        contentEditable={isCurrentBlock}
        data-placeholder="Write something, or press '/' for commands..."
        spellCheck="true"
        suppressContentEditableWarning
        onInput={(e) => {
          if (isCurrentBlock) {
            const editableDiv = e.currentTarget;
            const selection = window.getSelection();
            const currentOffset = selection?.getRangeAt(0).startOffset;
            const updatedContent = editableDiv.innerText.trim();
            
            updateBlocks(blocks => 
              blocks.map(b => b.id === block.id ? { ...b, content: updatedContent } : b)
            );

            queueMicrotask(() => {
              const blockDiv = editableRefs.current[block.id];
              if (blockDiv && currentOffset !== undefined) {
                const range = document.createRange();
                const sel = window.getSelection();
                const textNode = blockDiv.firstChild || blockDiv;
                const safeOffset = Math.min(currentOffset, textNode.textContent?.length || 0);
                
                range.setStart(textNode, safeOffset);
                range.collapse(true);
                sel?.removeAllRanges();
                sel?.addRange(range);
              }
            });
          }
        }}
        onKeyDown={e => isEditingBlock === block.id && handleBlockAction(e, block.id)}
        onClick={() => setIsEditingBlock(block.id)}
        className={`w-full focus:outline-none text-[15px] leading-[1.5] py-0 whitespace-pre-wrap break-words ${
          !block.content ? 'empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400' : ''
        }`}
      >
        {isCurrentBlock ? block.content : block.content || '\u200B'}
      </div>
    );
  }, [isEditingBlock, updateBlocks, handleBlockAction]);

  return (
    <div className="absolute top-0 w-[650px] mx-auto mt-8 mb-32">
      <div
        ref={previewRef}
        className="relative w-full rounded-t-lg z-10 p-12"
        onClick={e => {
          if (e.target === previewRef.current && (!textBlocks.length || textBlocks[textBlocks.length - 1].content.trim())) {
            const newBlock = { id: `block-${Date.now()}`, content: '' };
            updateBlocks(blocks => [...blocks, newBlock]);
            setIsEditingBlock(newBlock.id);
            focusBlock(newBlock.id);
          }
        }}
      >
        {useMemo(() => textBlocks.map(renderBlock), [textBlocks, renderBlock])}
      </div>
    </div>
  );
};

export default Editor;