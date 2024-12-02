import React, { useRef, useEffect, useState } from 'react';
import katex from 'katex';

interface WysiwygMathEditorProps {
  initialContent?: string;
  inlineMathSize?: string;
  displayMathSize?: string;
}

const WysiwygMathEditor: React.FC<WysiwygMathEditorProps> = ({ 
  initialContent = '',
  inlineMathSize = 'text-[15px]',
  displayMathSize = 'text-base'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mathPopupRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(500);
  const [editingMath, setEditingMath] = useState<{
    node: HTMLElement | null,
    originalMath: string,
    previewMath: string,
    type: string,
    position: { top: number, left: number }
  } | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.contentEditable = 'true';
    
    const adjustEditorHeight = () => {
      if (editor) {
        const newHeight = editor.scrollHeight;
        setContainerHeight(Math.max(newHeight, 400) + 30);
      }
    };

    const observer = new MutationObserver(adjustEditorHeight);
    observer.observe(editor, { 
      childList: true, 
      subtree: true, 
      characterData: true 
    });

    // Handle clicks outside the popup to close it
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        editingMath && 
        mathPopupRef.current && 
        !mathPopupRef.current.contains(e.target as Node)
      ) {
        // Revert to original math when clicking outside
        if (editingMath.node) {
          editingMath.node.innerHTML = katex.renderToString(editingMath.originalMath, {
            displayMode: editingMath.type !== 'inline',
            throwOnError: false
          });
        }
        setEditingMath(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const selectedText = range.toString().trim();
      if (!selectedText) return;

      e.preventDefault();

      const mathSpan = document.createElement('span');
      mathSpan.className = 'math-node';
      mathSpan.contentEditable = 'false'; // Prevent direct editing
      
      try {
        switch (e.key.toLowerCase()) {
          case 'e': // Inline math
            mathSpan.innerHTML = katex.renderToString(selectedText, {
              displayMode: false,
              throwOnError: false
            });
            mathSpan.setAttribute('data-math', selectedText);
            mathSpan.setAttribute('data-type', 'inline');
            mathSpan.className = `${inlineMathSize} math-node`;
            break;
            
          case 'd': // Display math
            mathSpan.innerHTML = katex.renderToString(selectedText, {
              displayMode: true,
              throwOnError: false
            });
            mathSpan.setAttribute('data-math', selectedText);
            mathSpan.setAttribute('data-type', 'display');
            mathSpan.className = `${displayMathSize} block my-4 math-node`;
            
            
  // Wrap the display math in a block container
  const wrapper = document.createElement('div');
  wrapper.className = `${displayMathSize} block my-4`;

  // Render math inside the wrapper
  const mathNode = document.createElement('span');
  mathNode.innerHTML = katex.renderToString(selectedText, {
    displayMode: true,
    throwOnError: false
  });
  mathNode.setAttribute('data-math', selectedText);
  mathNode.setAttribute('data-type', 'display');
  mathNode.className = 'math-node';

  wrapper.appendChild(mathNode);

  // Insert the wrapper into the editor
  range.deleteContents();
  range.insertNode(wrapper);

const nextSibling = wrapper.nextSibling;

if (!nextSibling || (nextSibling && nextSibling.textContent?.trim() === '')) {
  const spacer = document.createElement('div');
  spacer.innerHTML = '&nbsp;';
  wrapper.after(spacer);
}

  adjustEditorHeight();
  break;

            
          default:
            return;
        }

        range.deleteContents();
        range.insertNode(mathSpan);
        adjustEditorHeight();

        // Make math node editable only by clicking to open popup
        mathSpan.addEventListener('click', (e) => {
          e.stopPropagation();
        
        
          
        });

      } catch (error) {
        console.error('LaTeX rendering error:', error);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    adjustEditorHeight();
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleOutsideClick);
      observer.disconnect();
    };
  }, [inlineMathSize, displayMathSize, editingMath]);

  const handleMathEdit = (newMath: string, save: boolean = false) => {
    if (!editingMath?.node) return;

    try {
      if (save && (!newMath || newMath.trim() === '')) {
        const parentNode = editingMath.node.closest('.math-node') || editingMath.node.parentElement;
        parentNode?.remove();
        setEditingMath(null);
        return;
      }
      // Always update the preview in the node
      editingMath.node.innerHTML = katex.renderToString(newMath, {
        displayMode: editingMath.type !== 'inline',
        throwOnError: false
      });

      // Update state for live preview
      setEditingMath(prev => prev ? {
        ...prev,
        previewMath: newMath
      } : null);

      // Only update the data-math attribute if saving
      if (save) {
        editingMath.node.setAttribute('data-math', newMath);
        setEditingMath(null);
      }
    } catch (error) {
      console.error('Invalid LaTeX:', error);
    }
  };

  return (
    <div className="absolute top-0 w-[650px] mx-auto mt-8 mb-32">
      <div
        ref={containerRef}
        className="relative w-full rounded-t-lg z-10"
        style={{
          minHeight: `${containerHeight}px`,
        }}
      >
        <div
          ref={editorRef}
          className="w-full h-full p-12 bg-transparent outline-none transition-all duration-300 text-[15px] empty:before:text-[#9b9a97] empty:before:content-[attr(placeholder)] focus:empty:before:text-[#9b9a97]"
          data-text="Enter text here"
          style={{
            minHeight: '400px',
            caretColor: 'black',
            lineHeight: '1.6',
          }}
          dangerouslySetInnerHTML={{ __html: initialContent }}
        />
        
        {editingMath && (
          <div 
            ref={mathPopupRef}
            className=" bg-white border rounded shadow-lg p-4 z-50 "
            style={{
              
              width: '400px'
            }}
          >
            <MathEditPopup 
              initialMath={editingMath.originalMath}
              type={editingMath.type}
              onEdit={handleMathEdit}
              onClose={() => {
                // Revert to original math
                if (editingMath.node) {
                  editingMath.node.innerHTML = katex.renderToString(editingMath.originalMath, {
                    displayMode: editingMath.type !== 'inline',
                    throwOnError: false
                  });
                }
                setEditingMath(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface MathEditPopupProps {
  initialMath: string;
  type: string;
  onEdit: (math: string, save?: boolean) => void;
  onClose: () => void;
}

const MathEditPopup: React.FC<MathEditPopupProps> = ({ 
  initialMath, 
   
  onEdit, 
  onClose 
}) => {
  const [rawMath, setRawMath] = useState(initialMath);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMath = e.target.value;
    setRawMath(newMath);
    // Live preview without saving
    onEdit(newMath);
  };

  const handleSave = () => {
    // Save with true flag
    onEdit(rawMath, true);
  };

  return (
    <div className="space-y-4">
      <textarea 
        value={rawMath}
        onChange={handleChange}
        className="w-full p-2 border rounded text-sm"
        rows={4}
        placeholder="Enter LaTeX"
      />
      <div className="flex justify-end space-x-2 mt-2">
        <button 
          onClick={onClose} 
          className="px-3 py-1 border rounded"
        >
          Cancel
        </button>
        <button 
          onClick={handleSave}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default WysiwygMathEditor;