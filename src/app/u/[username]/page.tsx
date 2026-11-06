'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function PublicProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const userId = params.username as string

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setCurrentUser(me)
      }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (!prof) return router.push('/dashboard')
      setProfile(prof)

      const { data: p } = await supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      setPosts(p || [])

      if (user && user.id !== userId) {
        const { data: f } = await supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', userId).single()
        setIsFollowing(!!f)
      }

      setLoading(false)
    }
    load()
  }, [userId, router, supabase])

  const handleFollow = async () => {
    if (!currentUser) return router.push('/login')
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId)
      setIsFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: userId })
      setIsFollowing(true)
    }
  }

  const handleShare = async () => {
    const shareUrl = `https://getagriculture.store/u/${userId}`
    if (navigator.share) {
      await navigator.share({ title: profile?.full_name, text: `Découvre le profil de ${profile?.full_name} sur XAFEARN`, url: shareUrl })
    } else {
      await navigator.clipboard.writeText(shareUrl)
      alert('Lien copié !')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
    </div>
  )

  const levelColor = profile?.level === 3 ? 'from-amber-400 to-amber-600' : profile?.level === 2 ? 'from-slate-400 to-slate-600' : 'from-orange-400 to-orange-600'

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-black text-slate-900 flex-1">Profil</h1>
        <button onClick={handleShare} className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
        </button>
      </header>

      <div className="max-w-lg mx-auto">
        
        {/* Carte profil */}
        <div className="bg-white border-b border-slate-200 p-6 text-center relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-20 bg-gradient-to-r ${levelColor}`}></div>
          
          <div className="relative z-10 mt-6">
            <div className="w-24 h-24 bg-white p-1 rounded-full shadow-lg mx-auto">
              <div className="w-full h-full bg-gradient-to-br from-sky-100 to-blue-100 rounded-full flex items-center justify-center text-4xl font-black text-sky-600">
                {profile?.full_name?.charAt(0) || '?'}
              </div>
            </div>
          </div>

          <h2 className="text-xl font-black text-slate-900 mt-3">{profile?.full_name}</h2>
          <p className="text-sm text-slate-500">{profile?.city || 'Ville non définie'}</p>
          
          <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100 text-xs font-bold">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            Niveau {profile?.level || 1}
          </div>

          <div className="flex justify-center gap-6 mt-5 pt-4 border-t border-slate-100">
            <div className="text-center">
              <p className="text-lg font-black text-slate-900">{posts.length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Publications</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-amber-500">{profile?.coins_balance || 0}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Jetons</p>
            </div>
          </div>

          {currentUser && currentUser.id !== userId && (
            <button 
              onClick={handleFollow} 
              className={`mt-4 w-full py-3 rounded-xl font-bold transition active:scale-95 ${
                isFollowing 
                  ? 'bg-slate-100 text-slate-700' 
                  : 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
              }`}
            >
              {isFollowing ? 'Se désabonner' : 'Suivre'}
            </button>
          )}
        </div>

        {/* Posts */}
        <div className="p-4 space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Publications</h3>
          {posts.length === 0 ? (
            <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500 text-sm">
              Aucune publication.
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {post.content_type === 'image' && post.image_url && (
                  <img src={post.image_url} className="w-full h-auto max-h-80 object-cover" alt="Post" />
                )}
                <div className="p-4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{post.text_content}</p>
                  <p className="text-[10px] text-slate-400 mt-2">{new Date(post.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
