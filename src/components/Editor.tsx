import React, { useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent } from 'react';

type TextBlock = { id: string; content: string };

export const Editor: React.FC<{ 
  content: string; 
  onContentChange: (content: string) => void;
  isAuthenticated?: boolean;
}> = ({ content, onContentChange, isAuthenticated = false }) => {
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [isEditingBlock, setIsEditingBlock] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const editableRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const isInitialLoad = useRef(true);

  const contentRef = useRef(content);

  // Update contentRef when content prop changes
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Handle initial content loading
  useEffect(() => {
    if (contentRef.current && isInitialLoad.current) {
      const blocks = contentRef.current.split('\n')
        .filter(Boolean)
        .map((block, index) => ({ 
          id: `block-${index}`, 
          content: block.trim() 
        }));
      
      const initialBlocks = blocks.length ? blocks : [{ id: 'block-0', content: '' }];
      setTextBlocks(initialBlocks);
      
      if (isAuthenticated) {
        setIsEditingBlock(initialBlocks[0].id);
      }
      isInitialLoad.current = false;
    }
  }, [isAuthenticated]);

  const updateBlocks = useCallback((updater: (blocks: TextBlock[]) => TextBlock[]) => {
    if (!isAuthenticated) return;
    setTextBlocks(prevBlocks => {
      const newBlocks = updater(prevBlocks);
      // Use setTimeout to avoid updating parent state during render
      setTimeout(() => {
        onContentChange(newBlocks.map(b => b.content).join('\n'));
      }, 0);
      return newBlocks;
    });
  }, [onContentChange, isAuthenticated]);

  const focusBlock = useCallback((blockId: string, atPosition?: number) => {
    if (!isAuthenticated) return; // Prevent focus if not authenticated
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
  }, [isAuthenticated]);
  const preserveCursorPosition = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAuthenticated) return;

    const blockElement = e.currentTarget;
    const selection = window.getSelection();
    const range = document.createRange();

    // Get the exact mouse click position within the block
    const clickX = e.clientX;
    const clickY = e.clientY;

    // Find the text node and character position at the click
    let closestNode: Node | null = null;
    let closestOffset = 0;
    let minDistance = Infinity;

    const walkTextNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        range.selectNodeContents(node);
        
        const rects = range.getClientRects();
        for (let i = 0; i < rects.length; i++) {
          const rect = rects[i];
          if (rect.left <= clickX && clickX <= rect.right &&
              rect.top <= clickY && clickY <= rect.bottom) {
            
            // Find closest character position
            const testRange = document.createRange();
            testRange.setStart(node, 0);
            
            for (let j = 0; j <= node.textContent!.length; j++) {
              testRange.setEnd(node, j);
              const testRect = testRange.getBoundingClientRect();
              const distance = Math.abs(testRect.left - clickX);
              
              if (distance < minDistance) {
                closestNode = node;
                closestOffset = j;
                minDistance = distance;
              }
            }
          }
        }
      } else if (node.hasChildNodes()) {
        node.childNodes.forEach(walkTextNodes);
      }
    };

    // Walk through text nodes to find the closest position
    walkTextNodes(blockElement);

    if (closestNode) {
      range.setStart(closestNode, closestOffset);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isAuthenticated]);
  const handleBlockAction = useCallback((e: KeyboardEvent<HTMLDivElement>, blockId: string) => {
    if (!isAuthenticated) return; // Prevent block actions if not authenticated
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
  }, [textBlocks, updateBlocks, focusBlock, isAuthenticated]);

  const renderBlock = useCallback((block: TextBlock) => {
    const isCurrentBlock = isAuthenticated && isEditingBlock === block.id;
    return (
      <div
        key={block.id}
        ref={(el) => editableRefs.current[block.id] = el}
        contentEditable={isCurrentBlock}
        data-placeholder={isAuthenticated ? "Write something, or press '/' for commands..." : ""}
        spellCheck="true"
        suppressContentEditableWarning
        onInput={(e) => {
          if (isCurrentBlock && isAuthenticated) {
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
        onKeyDown={e => isAuthenticated && isEditingBlock === block.id && handleBlockAction(e, block.id)}
        onClick={() => {
          if (isAuthenticated) {
            setIsEditingBlock(block.id);
             // Immediately focus the block when clicked
          }
        }}
        onMouseDown={(e) => {
          if (isAuthenticated) {
            setIsEditingBlock(block.id);
            // Defer the cursor positioning to preserve click position
            queueMicrotask(() => {
              preserveCursorPosition(e);
            });
          }
        }}
        className={`w-full focus:outline-none text-[15px] leading-[1.5] py-0 whitespace-pre-wrap break-words ${
          !block.content && isAuthenticated ? 'empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400' : ''
        }`}
      >
        {isCurrentBlock ? block.content : block.content || '\u200B'}
      </div>
    );
  }, [isEditingBlock, updateBlocks, handleBlockAction, isAuthenticated]);

  return (
    <div className="absolute top-0 w-[650px] mx-auto mt-8 mb-32">
      <div
        ref={previewRef}
        className="relative w-full rounded-t-lg z-10 p-12"
        onClick={e => {
          if (isAuthenticated && 
              e.target === previewRef.current && 
              (!textBlocks.length || textBlocks[textBlocks.length - 1].content.trim())) {
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