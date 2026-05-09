import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FeedContainer } from '@/components/feed/feed-container'
import type { FeedUpdate } from '@/components/feed/video-card'
import { Home, Compass, User } from 'lucide-react'

async function getUpdates(): Promise<FeedUpdate[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('project_updates')
    .select(`
      id,
      title,
      description,
      media_type,
      media_url,
      thumbnail_url,
      like_count,
      view_count,
      project:projects!project_updates_project_id_fkey (
        id,
        title,
        category
      ),
      creator:profiles!project_updates_creator_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.log('[v0] Error fetching updates:', error)
    return []
  }

  return (data || []).map((u) => ({
    ...u,
    project: Array.isArray(u.project) ? u.project[0] : u.project,
    creator: Array.isArray(u.creator) ? u.creator[0] : u.creator,
  })) as FeedUpdate[]
}

async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export default async function FeedPage() {
  const [user, updates] = await Promise.all([
    getCurrentUser(),
    getUpdates(),
  ])

  return (
    <div className="h-svh w-full bg-black overflow-hidden">
      {/* Feed */}
      <FeedContainer updates={updates} />

      {/* Navigation Bar - Mobile Style */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-white/10 z-50 md:hidden">
        <div className="flex items-center justify-around h-16">
          <Link href="/" className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
            <Home className="h-6 w-6" />
            <span className="text-[10px]">Home</span>
          </Link>
          <Link href="/discover" className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
            <Compass className="h-6 w-6" />
            <span className="text-[10px]">Discover</span>
          </Link>
          <Link 
            href="/feed" 
            className="flex flex-col items-center gap-1 text-white transition-colors"
          >
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center -mt-4">
              <span className="text-primary-foreground font-bold">+</span>
            </div>
          </Link>
          <Link href="/discover" className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-[10px]">Activity</span>
          </Link>
          <Link 
            href={user ? '/dashboard' : '/auth/login'} 
            className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors"
          >
            <User className="h-6 w-6" />
            <span className="text-[10px]">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Desktop Header */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-b border-white/10 z-50 h-16 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-primary-foreground text-sm font-bold">B</span>
          </div>
          <span className="text-xl font-bold text-white">Backed</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link href="/discover" className="text-sm text-white/60 hover:text-white transition-colors">
            Discover
          </Link>
          {user ? (
            <Link href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">
              Dashboard
            </Link>
          ) : (
            <Link href="/auth/login" className="text-sm text-white hover:text-primary transition-colors">
              Login
            </Link>
          )}
        </div>
      </header>
    </div>
  )
}
