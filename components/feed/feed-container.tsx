'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { VideoCard, type FeedUpdate } from './video-card'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface FeedContainerProps {
  updates: FeedUpdate[]
}

export function FeedContainer({ updates }: FeedContainerProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)

  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current && !isScrollingRef.current) {
      isScrollingRef.current = true
      const container = containerRef.current
      const targetScroll = index * container.clientHeight
      
      container.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      })

      setTimeout(() => {
        isScrollingRef.current = false
      }, 500)
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (containerRef.current && !isScrollingRef.current) {
      const container = containerRef.current
      const scrollPosition = container.scrollTop
      const itemHeight = container.clientHeight
      const newIndex = Math.round(scrollPosition / itemHeight)
      
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < updates.length) {
        setActiveIndex(newIndex)
      }
    }
  }, [activeIndex, updates.length])

  const goToPrevious = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1)
      scrollToIndex(activeIndex - 1)
    }
  }

  const goToNext = () => {
    if (activeIndex < updates.length - 1) {
      setActiveIndex(activeIndex + 1)
      scrollToIndex(activeIndex + 1)
    }
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        goToPrevious()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, updates.length])

  // Handle wheel events for snap scrolling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let wheelTimeout: NodeJS.Timeout
    let accumulatedDelta = 0

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      
      accumulatedDelta += e.deltaY

      clearTimeout(wheelTimeout)
      wheelTimeout = setTimeout(() => {
        if (Math.abs(accumulatedDelta) > 50) {
          if (accumulatedDelta > 0) {
            goToNext()
          } else {
            goToPrevious()
          }
        }
        accumulatedDelta = 0
      }, 50)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [activeIndex, updates.length])

  if (updates.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <div className="text-center p-8">
          <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <ChevronDown className="h-10 w-10 text-white/50" />
          </div>
          <h3 className="text-xl font-semibold text-white">No updates yet</h3>
          <p className="text-white/60 mt-2">Be the first to share your progress!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {/* Feed Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-auto snap-mandatory snap-y scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {updates.map((update, index) => (
          <div 
            key={update.id} 
            className="h-full w-full snap-start snap-always"
            style={{ scrollSnapAlign: 'start' }}
          >
            <VideoCard update={update} isActive={index === activeIndex} />
          </div>
        ))}
      </div>

      {/* Navigation Buttons - Desktop */}
      <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2">
        <button
          onClick={goToPrevious}
          disabled={activeIndex === 0}
          className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center disabled:opacity-30 hover:bg-white/20 transition-colors"
        >
          <ChevronUp className="h-5 w-5 text-white" />
        </button>
        <button
          onClick={goToNext}
          disabled={activeIndex === updates.length - 1}
          className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center disabled:opacity-30 hover:bg-white/20 transition-colors"
        >
          <ChevronDown className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-1">
        {updates.map((_, index) => (
          <div
            key={index}
            className={`w-1 h-8 rounded-full transition-colors ${
              index === activeIndex ? 'bg-primary' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
