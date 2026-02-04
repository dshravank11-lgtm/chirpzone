'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getPostById } from '@/services/firebase'
import { PostCard, Post } from '@/components/post-card'

const PostPage = () => {
  const { id } = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      getPostById(id as string).then((post) => {
        setPost(post)
        setLoading(false)
      })
    }
  }, [id])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!post) {
    return <div>Post not found</div>
  }

  return (
    <div className="p-4">
      <PostCard post={post} currentUserId={post.authorId} />
    </div>
  )
}

export default PostPage
