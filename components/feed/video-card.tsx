'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Share2, DollarSign, Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FeedUpdate {
  id: string
  title: string | null
  description: string | null
  media_type: string
  media_url: string
  thumbnail_url: string | null
  like_count: number
  view_count: number
  project: {
    id: string
    title: string
    category: string
  }
  creator: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

interface VideoCardProps {
  update: FeedUpdate
  isActive: boolean
}

export function VideoCard({ update, isActive }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Auto-play/pause based on visibility
  useEffect(() => {
    if (videoRef.current) {
      if (isActive && update.media_type === 'video') {
        videoRef.current.play().catch(() => {
          // Autoplay was prevented
        })
        setIsPlaying(true)
      } else {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    }
  }, [isActive, update.media_type])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
  }

  return (
    <div className="relative h-full w-full bg-black flex items-center justify-center">
      {/* Media Content */}
      {update.media_type === 'video' ? (
        <video
          ref={videoRef}
          src={update.media_url}
          poster={update.thumbnail_url || undefined}
          className="h-full w-full object-cover"
          loop
          muted={isMuted}
          playsInline
          onClick={togglePlay}
        />
      ) : (
        <img
          src={update.media_url}
          alt={update.title || 'Update'}
          className="h-full w-full object-cover"
        />
      )}

      {/* Play/Pause Overlay */}
      {update.media_type === 'video' && !isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
          onClick={togglePlay}
        >
          <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="h-10 w-10 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
        <Link 
          href={`/project/${update.project.id}`}
          className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5"
        >
          <span className="text-xs font-medium text-white">{update.project.category}</span>
        </Link>
        
        {update.media_type === 'video' && (
          <button 
            onClick={toggleMute}
            className="h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5 text-white" />
            ) : (
              <Volume2 className="h-5 w-5 text-white" />
            )}
          </button>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
        {/* Creator Avatar */}
        <Link href={`/creator/${update.creator.username}`} className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-white bg-muted overflow-hidden">
            {update.creator.avatar_url ? (
              <img 
                src={update.creator.avatar_url} 
                alt={update.creator.display_name || update.creator.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-foreground">
                {(update.creator.display_name || update.creator.username)[0]}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary-foreground">+</span>
          </div>
        </Link>

        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center transition-colors",
            isLiked ? "bg-red-500" : "bg-white/10 backdrop-blur-sm"
          )}>
            <Heart className={cn(
              "h-6 w-6 transition-colors",
              isLiked ? "text-white fill-white" : "text-white"
            )} />
          </div>
          <span className="text-xs text-white font-medium">
            {update.like_count + (isLiked ? 1 : 0)}
          </span>
        </button>

        {/* Comment */}
        <button className="flex flex-col items-center gap-1">
          <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <span className="text-xs text-white font-medium">0</span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-1">
          <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-xs text-white font-medium">Share</span>
        </button>

        {/* Fund */}
        <Link href={`/project/${update.project.id}`} className="flex flex-col items-center gap-1">
          <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xs text-white font-medium">Fund</span>
        </Link>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-20 p-4">
        <Link href={`/creator/${update.creator.username}`}>
          <p className="text-white font-bold text-base">
            @{update.creator.username}
          </p>
        </Link>
        <Link href={`/project/${update.project.id}`}>
          <p className="text-white/90 text-sm font-medium mt-1">
            {update.project.title}
          </p>
        </Link>
        {update.description && (
          <p className="text-white/80 text-sm mt-2 line-clamp-2">
            {update.description}
          </p>
        )}
        
        {/* Progress bar placeholder */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-primary rounded-full" />
          </div>
          <span className="text-xs text-white/60">50% funded</span>
        </div>
      </div>
    </div>
  )
}
