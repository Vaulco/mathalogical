'use client'
import React, { useEffect, useState } from 'react'
import { getFirestore, collection, query, getDocs, orderBy } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/lib/firebase-config'
import { useRouter } from 'next/navigation'
import ContentFormatter from '@/components/Format'
import { AuthComponent } from '@/components/Authmenu'

interface DocumentPart {
  content: string;
  text_allocation: number;
  title: string;
  userId: string;
}

interface PageParams {
  id: string;
}

export default function DocumentPage({ params: paramsPromise }: { params: Promise<PageParams> }) {
  const router = useRouter()
  const [document, setDocument] = useState<{ title: string; content: string; userId: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const params = React.use(paramsPromise)

  useEffect(() => {
    const auth = getAuth(app)
    
    return onAuthStateChanged(auth, (user) => {
      setAuthChecked(true)
      if (!user) {
        router.push('/')
        return
      }
      
      setCurrentUserId(user.uid)

      const fetchDocument = async () => {
        try {
          const db = getFirestore(app)
          
          const q = query(
            collection(db, params.id),
            orderBy('text_allocation')
          )

          const querySnapshot = await getDocs(q)
          
          if (querySnapshot.empty) {
            setError('Document not found')
            setLoading(false)
            return
          }

          const firstDoc = querySnapshot.docs[0].data() as DocumentPart
          let fullContent = ''
          
          querySnapshot.forEach((doc) => {
            const data = doc.data() as DocumentPart
            fullContent += (fullContent ? '\n\n' : '') + data.content
          })

          setDocument({
            title: firstDoc.title,
            content: fullContent.trim(),
            userId: firstDoc.userId // Store the document owner's ID
          })
        } catch (err) {
          console.error('Error fetching document:', err)
          setError('Failed to load document')
        } finally {
          setLoading(false)
        }
      }

      fetchDocument()
    })
  }, [params.id, router])

  if (!authChecked || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Document not found</div>
      </div>
    )
  }

  return (
    <>
     
        
     <h1 className="top-[15px] left-4 absolute text-[19px] text-gray-600 mb-2 max-w-[300px] truncate">Mathalogical</h1>
      <AuthComponent 
        settings 
        profile 
        documentId={currentUserId === document.userId ? params.id : undefined} // Only show edit option for document owner
      />
      
      <div className="w-full h-[calc(100%-57px)] bottom-0 border-t border-gray-300 bg-white bg-opacity-0 fixed editor-container overflow-x-auto flex justify-center items-center">
        <div className="px-10 w-full flex justify-center items-center">
        <div className="absolute top-0 w-[650px] mx-auto mt-8 mb-32 px-10">
        <h1 className=" text-[23px] text-gray-600 bg-transparent border-b border-gray-300 mb-2">{document.title}</h1>
        <ContentFormatter
          content={document.content}
          inlineMathSize="text-sm"
          displayMathSize="text-base"
variant="document"
        />
        </div>
        </div>
        </div>
      
      </>
    
  )
}