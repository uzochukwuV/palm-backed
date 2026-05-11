'use client'

import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { Users, Play, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

export interface Project {
  id: string
  title: string
  tagline: string | null
  category: string
  cover_image_url: string | null
  funding_goal: number | null
  current_funding: number
  backer_count: number
  on_chain_deadline_unix_ts?: number | null
  creator: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  latest_update?: {
    id: string
    thumbnail_url: string | null
    media_type: string
  } | null
}

interface ProjectCardProps {
  project: Project
}

function useCountdown(deadlineUnixTs?: number | null) {
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    if (!deadlineUnixTs) return

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000)
      const diff = deadlineUnixTs - now

      if (diff <= 0) {
        setTimeLeft('Ended')
        return
      }

      const days = Math.floor(diff / 86400)
      const hours = Math.floor((diff % 86400) / 3600)
      const minutes = Math.floor((diff % 3600) / 60)

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h left`)
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`)
      } else {
        setTimeLeft(`${minutes}m left`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [deadlineUnixTs])

  return timeLeft
}

export function ProjectCard({ project }: ProjectCardProps) {
  const progress = project.funding_goal
    ? (project.current_funding / project.funding_goal) * 100
    : 0
  
  const countdown = useCountdown(project.on_chain_deadline_unix_ts)

  return (
    <Link
      href={`/project/${project.id}`}
      className="group rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/50 hover:shadow-xl transition-all duration-300"
    >
      {/* Cover Image Area */}
      <div className="relative aspect-video bg-muted">
        {project.cover_image_url ? (
          <img 
            src={project.cover_image_url} 
            alt={project.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="h-16 w-16 rounded-2xl bg-card/80 backdrop-blur flex items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{project.title[0]}</span>
            </div>
          </div>
        )}
        
        {/* Video indicator if has latest update */}
        {project.latest_update && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-foreground/80 backdrop-blur-sm text-background text-xs px-2 py-1 rounded-full">
            <Play className="h-3 w-3" />
            <span>Updates</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
            {project.category}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {project.title}
        </h3>
        
        {project.tagline && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {project.tagline}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-3">
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {project.creator.display_name?.[0] || project.creator.username[0]}
          </div>
          <span className="text-sm text-muted-foreground">
            by <span className="text-foreground font-medium">{project.creator.display_name || project.creator.username}</span>
          </span>
        </div>

        {/* Progress */}
        {project.funding_goal && (
          <div className="mt-4">
            <Progress value={Math.min(progress, 100)} className="h-2" />
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="font-semibold text-foreground">
                ${project.current_funding.toLocaleString()}
              </span>
              <span className="text-muted-foreground">
                {Math.round(progress)}% of ${project.funding_goal.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Backers and Countdown */}
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{project.backer_count} backers</span>
          </div>
          {countdown && (
            <div className="flex items-center gap-1 text-primary">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{countdown}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
