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
  const [document, setDocument] = useState<{ title: string; content: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const params = React.use(paramsPromise)

  useEffect(() => {
    const auth = getAuth(app)
    
    return onAuthStateChanged(auth, (user) => {
      setAuthChecked(true)
      if (!user) {
        router.push('/')
        return
      }

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
          
          if (firstDoc.userId !== user.uid) {
            setError('Access denied')
            setLoading(false)
            return
          }

          let fullContent = ''
          let documentTitle = ''
          
          querySnapshot.forEach((doc) => {
            const data = doc.data() as DocumentPart
            // Add a newline between parts to maintain proper formatting
            fullContent += (fullContent ? '\n\n' : '') + data.content
            if (!documentTitle) documentTitle = data.title
          })

          setDocument({
            title: documentTitle,
            content: fullContent.trim()
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
    <div className="relative w-full h-full max-h-screen max-w-[1200px] pl-10 pr-10 flex flex-col items-center justify-center">
      
      <div className='w-[calc(100%-77px)] h-[90px] bg-[#f4f4f4] absolute top-0 border-b-gray-600 border-b-[1px] flex items-center'>
        <h1 className="text-[19px] absolute">{document.title}</h1>
        
      </div>
      <AuthComponent settings profile  />
      <div className="max-w-4xl mx-auto p-8 absolute">
        <ContentFormatter 
          content={document.content}
          inlineMathSize="text-sm"
          displayMathSize="text-base"
        />
      </div>
    </div>
  )
}