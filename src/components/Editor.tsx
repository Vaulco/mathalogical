import React, { useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent } from 'react';

type TextBlock = { id: string; content: string };

export const Editor: React.FC<{ content: string; onContentChange: (content: string) => void }> = 
  ({ content, onContentChange }) => {
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [isEditingBlock, setIsEditingBlock] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(500);

  const previewRef = useRef<HTMLDivElement>(null);
  const editableRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const isInitialLoad = useRef(true);

  const splitTextIntoBlocks = useCallback((text: string) => 
    text.split('\n').filter(Boolean).map((block, index) => 
      ({ id: `block-${index}`, content: block.trim() })), []);

  const updateBlocks = useCallback((updater: (blocks: TextBlock[]) => TextBlock[]) => {
    const newBlocks = updater(textBlocks);
    setTextBlocks(newBlocks);
    onContentChange(newBlocks.map(b => b.content).join('\n'));
  }, [textBlocks, onContentChange]);

  const focusBlock = useCallback((blockId: string, atStart = false) => {
    queueMicrotask(() => {
      const blockDiv = editableRefs.current[blockId];
      if (!blockDiv) return;

      blockDiv.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      const lastChild = blockDiv.lastChild || blockDiv;
      range.setStart(lastChild, atStart ? 0 : (lastChild.textContent?.length || 0));
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }, []);

  useEffect(() => {
    if (content && isInitialLoad.current) {
      const initialBlocks = splitTextIntoBlocks(content);
      const blocksToSet = initialBlocks.length ? initialBlocks : [{ id: 'block-0', content: '' }];
      
      setTextBlocks(blocksToSet);
      setIsEditingBlock(blocksToSet[0].id);
      isInitialLoad.current = false;
    }
  }, [content, splitTextIntoBlocks]);

  useEffect(() => {
    if (previewRef.current) {
      setContainerHeight(Math.max(previewRef.current.scrollHeight, 400) + 30);
    }
  }, [content]);

  const createNewBlock = useCallback(() => {
    const newBlock: TextBlock = { id: `block-${Date.now()}`, content: '' };
    updateBlocks(blocks => blocks.length ? [...blocks, newBlock] : [newBlock]);
    setIsEditingBlock(newBlock.id);
    focusBlock(newBlock.id);
  }, [updateBlocks, focusBlock]);

  const handleContainerClick = useCallback((event: React.MouseEvent) => {
    if (event.target !== previewRef.current) return;
    const lastBlock = textBlocks[textBlocks.length - 1];
    if (!lastBlock || lastBlock.content.trim()) createNewBlock();
  }, [textBlocks, createNewBlock]);

  const handleBlockClick = useCallback((e: React.MouseEvent, block: TextBlock) => {
    setIsEditingBlock(block.id);
    queueMicrotask(() => {
      const blockDiv = editableRefs.current[block.id];
      if (blockDiv) {
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (range) {
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>, blockId: string) => {
    const currentBlockIndex = textBlocks.findIndex(block => block.id === blockId);
    const currentBlock = textBlocks[currentBlockIndex];
    const editableDiv = e.currentTarget;
    const sel = window.getSelection();
    const range = sel?.getRangeAt(0);

    const navigate = (direction: 'up' | 'down') => {
      e.preventDefault();
      const targetIndex = direction === 'up' 
        ? Math.max(0, currentBlockIndex - 1) 
        : Math.min(textBlocks.length - 1, currentBlockIndex + 1);
      const targetBlock = textBlocks[targetIndex];
      setIsEditingBlock(targetBlock.id);
      focusBlock(targetBlock.id);
    };

    const splitBlock = () => {
      e.preventDefault();
      const beforeCursor = editableDiv.textContent?.slice(0, range?.startOffset) || '';
      const afterCursor = editableDiv.textContent?.slice(range?.startOffset) || '';
      const newBlockId = `block-${Date.now()}`;

      updateBlocks(blocks => [
        ...blocks.slice(0, currentBlockIndex),
        { ...currentBlock, content: beforeCursor },
        { id: newBlockId, content: afterCursor },
        ...blocks.slice(currentBlockIndex + 1)
      ]);
      
      setIsEditingBlock(newBlockId);
      focusBlock(newBlockId, true);
    };

    const mergeBlocks = () => {
      if (textBlocks.length <= 1 || !range) return;
    
      const currentBlockIndex = textBlocks.findIndex(block => block.id === blockId);
      const currentBlock = textBlocks[currentBlockIndex];
      const previousBlockIndex = currentBlockIndex > 0 ? currentBlockIndex - 1 : 0;
      const previousBlock = textBlocks[previousBlockIndex];
      const isAtStart = range.startOffset === 0;
    
      if (isAtStart && previousBlock) {
        e.preventDefault();
        const combinedContent = `${previousBlock.content}${currentBlock.content}`;
    
        updateBlocks(blocks => {
          const updatedBlocks = [...blocks];
          updatedBlocks[previousBlockIndex] = { 
            ...previousBlock, 
            content: combinedContent 
          };
          updatedBlocks.splice(currentBlockIndex, 1);
          return updatedBlocks;
        });

        setIsEditingBlock(previousBlock.id);
        queueMicrotask(() => {
          const previousBlockDiv = editableRefs.current[previousBlock.id];
          if (previousBlockDiv) {
            const sel = window.getSelection();
            const range = document.createRange();
            const textNode = previousBlockDiv.firstChild || previousBlockDiv;
            const cursorPosition = previousBlock.content.length;
            
            range.setStart(textNode, cursorPosition);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
            previousBlockDiv.focus();
          }
        });
      }
    };

    const isAtStart = !range || range.startOffset === 0 || editableDiv.textContent?.trim() === '';
    const isAtEnd = !range || range.startOffset === editableDiv.textContent?.length || editableDiv.textContent?.trim() === '';

    if (e.key === 'ArrowUp' && isAtStart) navigate('up');
    else if (e.key === 'ArrowDown' && isAtEnd) navigate('down');
    else if (e.key === 'Enter' && !e.shiftKey) splitBlock();
    else if (e.key === 'Backspace') mergeBlocks();
  }, [textBlocks, updateBlocks, focusBlock]);

  const renderBlock = useCallback((block: TextBlock) => {
    const isCurrentBlock = isEditingBlock === block.id;
    return (
      <div
        key={block.id}
        ref={(el) => editableRefs.current[block.id] = el}
        contentEditable={isCurrentBlock}
        data-content-editable-leaf="true"
        spellCheck="true"
        data-placeholder="Write something, or press '/' for commands..."
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
        onBlur={(e) => updateBlocks(blocks => 
          blocks.map(b => b.id === block.id ? { ...b, content: e.currentTarget.innerText } : b)
        )}
        onKeyDown={(e) => isCurrentBlock && handleKeyDown(e, block.id)}
        onClick={(e) => handleBlockClick(e, block)}
        className={`w-full focus:outline-none text-[15px] leading-[1.5] py-0 whitespace-pre-wrap break-words ${
          !block.content ? 'empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400' : ''
        }`}
        
      >
        {isCurrentBlock ? block.content : block.content || '\u200B'}
      </div>
    );
  }, [isEditingBlock, updateBlocks, handleKeyDown, handleBlockClick]);

  const renderedBlocks = useMemo(() => textBlocks.map(renderBlock), [textBlocks, renderBlock]);

  return (
    <div className="absolute top-0 w-[650px] mx-auto mt-8 mb-32">
      <div
        ref={previewRef}
        className="relative w-full rounded-t-lg z-10 bg-white shadow-sm p-12"
        style={{ minHeight: `${containerHeight}px` }}
        onClick={handleContainerClick}
      >
        {renderedBlocks}
      </div>
    </div>
  );
};

export default Editor;