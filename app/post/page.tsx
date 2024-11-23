'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/lib/firebase-config'
import { AuthComponent } from '@/components/Authmenu'
import { WritingEditor } from '@/components/writingEditor'
import { getFirestore, doc as firestoreDoc, setDoc, collection, query, getDocs, orderBy, deleteDoc } from 'firebase/firestore'
import { nanoid } from 'nanoid'

const db = getFirestore(app)
const STORAGE_PREFIX = 'unsaved_edit_'
const NEW_DOC_KEY = 'unsaved_new_document'
const MAX_DOC_SIZE = 1000000
const AUTOSAVE_DELAY = 500

interface Document {
  content: string;
  title: string;
  lastModified?: number;
  documentId?: string;
}

interface DocumentStatus {
  saving: boolean;
  message: string;
  loaded: boolean;
  authInit: boolean;
}

export default function DocumentEditor() {
  const router = useRouter()
  const editDocumentId = useSearchParams().get('edit')
  
  const [document, setDocument] = useState<Document>({ content: '', title: 'Untitled Document' })
  const [originalDoc, setOriginalDoc] = useState<Document | null>(null)
  const [user, setUser] = useState<any>(null)
  const [status, setStatus] = useState<DocumentStatus>({ 
    saving: false, 
    message: '', 
    loaded: false, 
    authInit: false 
  })
  
  // Get storage key based on document state
  const storageKey = editDocumentId ? `${STORAGE_PREFIX}${editDocumentId}` : NEW_DOC_KEY
  
  // Show save button if there's any content
  const showSave = Boolean(document.content.trim())
  
  // Check for actual changes against original document (for localStorage)
  const hasChanges = Boolean(originalDoc && status.loaded && (
    document.content !== originalDoc.content || document.title !== originalDoc.title
  ))

  // Handle auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(app), (currentUser) => {
      setUser(currentUser)
      setStatus(s => ({ ...s, authInit: true }))
      if (!currentUser) router.push('/')
    })
    return unsubscribe
  }, [router])

  // Load document content
  useEffect(() => {
    if (!status.authInit || !user) return

    const loadDocument = async () => {
      // Check localStorage first
      const saved = localStorage.getItem(storageKey)
      const savedDoc = saved ? JSON.parse(saved) : null
      
      if (editDocumentId) {
        try {
          const snapshot = await getDocs(
            query(collection(db, editDocumentId), orderBy('text_allocation'))
          )
          
          if (!snapshot.empty) {
            const firstDoc = snapshot.docs[0].data()
            if (firstDoc.userId !== user?.uid) {
              router.push('/')
              return
            }

            const content = snapshot.docs
              .map(doc => doc.data().content)
              .join('\n\n')
              .trim()
            
            const original = { content, title: firstDoc.title }
            setOriginalDoc(original)

            // Use saved changes if valid, otherwise use original
            if (savedDoc?.documentId === editDocumentId) {
              setDocument(savedDoc)
            } else {
              setDocument(original)
            }
          }
        } catch (error) {
          console.error('Error loading document:', error)
        }
      } else if (savedDoc) {
        setDocument(savedDoc)
      }
      
      setStatus(s => ({ ...s, loaded: true }))
    }

    loadDocument()
  }, [status.authInit, user, editDocumentId, router, storageKey])

  // Autosave to localStorage
  useEffect(() => {
    if (!status.loaded) return
    
    const timeoutId = setTimeout(() => {
      if (hasChanges || (!editDocumentId && document.content.trim())) {
        localStorage.setItem(storageKey, JSON.stringify({
          ...document,
          lastModified: Date.now(),
          documentId: editDocumentId
        }))
      }
    }, AUTOSAVE_DELAY)
    
    return () => clearTimeout(timeoutId)
  }, [document, editDocumentId, status.loaded, hasChanges, storageKey])

  // Handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  const handleSave = async () => {
    if (!user || !document.content.trim()) return
    
    try {
      setStatus(s => ({ ...s, saving: true }))
      const documentId = editDocumentId || nanoid()
      
      // First, clear existing chunks if this is an edit
      if (editDocumentId) {
        const existingDocs = await getDocs(collection(db, documentId))
        await Promise.all(existingDocs.docs.map(doc => 
          deleteDoc(doc.ref)
        ))
      }
      
      // Split content into chunks, preserving original spacing
      const chunkSize = MAX_DOC_SIZE
      const content = document.content
      const chunks = []
      
      for (let i = 0; i < content.length; i += chunkSize) {
        let chunk = content.slice(i, i + chunkSize)
        
        // If we're not at the end and the chunk ends mid-word,
        // find the last space and adjust the chunk
        if (i + chunkSize < content.length && 
            content[i + chunkSize] !== ' ' && 
            chunk.slice(-1) !== ' ') {
          const lastSpace = chunk.lastIndexOf(' ')
          if (lastSpace !== -1) {
            chunk = chunk.slice(0, lastSpace)
            i -= (chunk.length - lastSpace) // Adjust i to account for the shortened chunk
          }
        }
        
        chunks.push(chunk)
      }
      
      // Save chunks without adding extra spacing
      await Promise.all(chunks.map(async (chunk, index) => {
        const docRef = firestoreDoc(collection(db, documentId), `part_${index}`)
        await setDoc(docRef, {
          content: chunk,  // Don't trim() here to preserve spacing
          text_allocation: index,
          title: document.title,
          userId: user.uid,
          documentId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }))
  
      // Update the loading function to preserve spacing
      const loadDocument = async () => {
        const snapshot = await getDocs(
          query(collection(db, documentId), orderBy('text_allocation'))
        )
        
        if (!snapshot.empty) {
          const content = snapshot.docs
            .map(doc => doc.data().content)
            .join('')  // Join without adding newlines
          
          setDocument(prev => ({
            ...prev,
            content,
            title: snapshot.docs[0].data().title
          }))
        }
      }
  
      await loadDocument()
      localStorage.removeItem(storageKey)
      setOriginalDoc(document)
      setStatus(s => ({ ...s, message: 'Saved successfully' }))
      router.push(`/document/${documentId}`)
    } catch (error) {
      console.error('Error saving document:', error)
      setStatus(s => ({ ...s, message: 'Error saving document' }))
    } finally {
      setStatus(s => ({ ...s, saving: false }))
    }
  }
  if (!status.authInit || (!status.loaded && user)) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="text-xl">Loading{!status.loaded ? ' document' : ''}...</div>
    </div>
  }

  if (!user) return null

  return (
    <>
      <div className="w-[calc(100%-20px)] h-[calc(100%-67px)] bottom-[10px] border-[1px] border-gray-300 bg-white bg-opacity-0 fixed rounded-lg editor-container overflow-x-auto flex justify-center items-center">
        <div className="px-10 w-full flex justify-center items-center">
          <WritingEditor
            content={document.content}
            onContentChange={content => setDocument(d => ({ ...d, content }))}
          />
        </div>
      </div>

      {status.message && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg">
          {status.message}
        </div>
      )}

      <AuthComponent 
        settings 
        profile 
        onSave={handleSave} 
        showSave={showSave}
        isEditing={Boolean(editDocumentId)}
      />
      
      <input
        type="text"
        value={document.title}
        onChange={e => setDocument(d => ({ ...d, title: e.target.value }))}
        onFocus={e => e.target.select()}
        onBlur={e => {
          const title = e.target.value.trim() || 'Untitled Document'
          setDocument(d => ({ ...d, title }))
        }}
        className="absolute left-3 top-[17px] leading-[1px] text-[19px] text-gray-600 bg-transparent outline-none"
      />
    </>
  )
}