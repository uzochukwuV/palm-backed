'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Code, Palette, GraduationCap, Music, Wrench, BookOpen, Utensils, Camera, Grid } from 'lucide-react'

const categories = [
  { name: 'All', value: '', icon: Grid },
  { name: 'Software', value: 'software', icon: Code },
  { name: 'Design', value: 'design', icon: Palette },
  { name: 'Education', value: 'education', icon: GraduationCap },
  { name: 'Music', value: 'music', icon: Music },
  { name: 'Hardware', value: 'hardware', icon: Wrench },
  { name: 'Writing', value: 'writing', icon: BookOpen },
  { name: 'Food', value: 'food', icon: Utensils },
  { name: 'Film', value: 'film', icon: Camera },
]

export function CategoryFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category') || ''

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (category) {
      params.set('category', category)
    } else {
      params.delete('category')
    }
    router.push(`/discover?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <button
          key={category.value}
          onClick={() => handleCategoryChange(category.value)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0',
            currentCategory === category.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          )}
        >
          <category.icon className="h-4 w-4" />
          {category.name}
        </button>
      ))}
    </div>
  )
}
