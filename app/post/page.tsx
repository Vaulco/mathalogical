'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/lib/firebase-config'
import { AuthComponent } from '@/components/Authmenu'
import { WritingEditor } from '@/components/writingEditor'
import { getFirestore, doc, setDoc, getDoc, collection } from 'firebase/firestore'
import { nanoid } from 'nanoid'

// Constants
const MAX_DOCUMENT_SIZE = 1000000 // 1MB in bytes
const db = getFirestore(app)

interface DocumentPart {
  content: string;
  text_allocation: number;
  title: string;
  documentId: string;
  parentId?: string;
}

export default function NewPage() {
  const router = useRouter()
  const [title, setTitle] = useState("Untitled Document")
  const [content, setContent] = useState("")
  const [lastValidTitle, setLastValidTitle] = useState("Untitled Document")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const auth = getAuth(app)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/')
    })
    return () => unsubscribe()
  }, [router])

  const handleTitleInput = {
    focus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
    change: (e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value),
    blur: (e: React.FocusEvent<HTMLInputElement>) => {
      const trimmedValue = e.target.value.trim()
      setTitle(trimmedValue === '' ? lastValidTitle : trimmedValue)
      if (trimmedValue !== '') setLastValidTitle(trimmedValue)
    }
  }

  const splitTextIntoChunks = (text: string): string[] => {
    const chunks: string[] = []
    let remainingText = text
    
    while (remainingText.length > 0) {
      const chunkSize = Math.min(remainingText.length, MAX_DOCUMENT_SIZE)
      // Find the last complete word within the chunk size
      let actualSize = chunkSize
      if (chunkSize < remainingText.length) {
        actualSize = remainingText.lastIndexOf(' ', chunkSize)
        if (actualSize === -1) actualSize = chunkSize
      }
      
      chunks.push(remainingText.substring(0, actualSize))
      remainingText = remainingText.substring(actualSize).trim()
    }
    
    return chunks
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const auth = getAuth(app)
      const user = auth.currentUser
      
      if (!user) {
        alert('Please sign in to save your document')
        return
      }
  
      const collectionId = nanoid() // This will be our collection name
      const textChunks = splitTextIntoChunks(content)
      
      // Save each chunk as a document in the randomly named collection
      const savePromises = textChunks.map(async (chunk, index) => {
        const docData = {
          content: chunk,
          text_allocation: index,
          title: title,
          userId: user.uid,
          createdAt: new Date().toISOString()
        }
        
        // Create a document with ID based on text_allocation in our random collection
        const docRef = doc(collection(db, collectionId), `part_${index}`)
        await setDoc(docRef, docData)
      })
      
      await Promise.all(savePromises)
      router.push(`/document/${collectionId}`)
    } catch (error) {
      console.error('Error saving document:', error)
      alert('Failed to save document')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="w-[calc(100%-20px)] h-[calc(100%-67px)] bottom-[10px] border-[1px] px-10 border-gray-300 bg-white bg-opacity-0 absolute rounded-lg editor-container overflow-y-auto flex justify-center items-center">
        <WritingEditor
          content={content}
          onContentChange={setContent}
        />
      </div>

      <div className="relative w-full h-full max-h-screen max-w-[770px] flex flex-col items-center justify-center p-3">
        <AuthComponent settings profile />
        <input
          type="text"
          value={title}
          onChange={handleTitleInput.change}
          onFocus={handleTitleInput.focus}
          onBlur={handleTitleInput.blur}
          className="absolute left-3 top-[17px] leading-[1px] text-[19px] text-gray-600 bg-transparent outline-none"
        />
        
      </div>
    </>
  )
}