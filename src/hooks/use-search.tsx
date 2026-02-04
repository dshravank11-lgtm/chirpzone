
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const [users, usersLoading] = useCollection(
    searchQuery.trim() ? query(collection(db, 'users'), where('displayName', '>=', searchQuery), where('displayName', '<=', searchQuery + '\uf8ff')) : null
  );

  const [posts, postsLoading] = useCollection(
    searchQuery.trim() ? query(collection(db, 'posts'), where('content', '>=', searchQuery), where('content', '<=', searchQuery + '\uf8ff')) : null
  );

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    handleSearch,
    users,
    posts,
    loading: usersLoading || postsLoading,
  };
}
