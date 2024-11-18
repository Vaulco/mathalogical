// app/new/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/lib/firebase-config'

const auth = getAuth(app)

export default function NewPage() {
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Create New Post</h1>
      {/* Your new page content here */}
    </div>
  )
}