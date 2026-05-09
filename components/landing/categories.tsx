import Link from 'next/link'
import { Code, Palette, GraduationCap, Music, Wrench, BookOpen, Utensils, Camera } from 'lucide-react'

const categories = [
  { name: 'Software', icon: Code, count: 245, color: 'bg-blue-500/10 text-blue-600' },
  { name: 'Design', icon: Palette, count: 128, color: 'bg-pink-500/10 text-pink-600' },
  { name: 'Education', icon: GraduationCap, count: 89, color: 'bg-purple-500/10 text-purple-600' },
  { name: 'Music', icon: Music, count: 67, color: 'bg-orange-500/10 text-orange-600' },
  { name: 'Hardware', icon: Wrench, count: 54, color: 'bg-slate-500/10 text-slate-600' },
  { name: 'Writing', icon: BookOpen, count: 112, color: 'bg-emerald-500/10 text-emerald-600' },
  { name: 'Food & Drink', icon: Utensils, count: 43, color: 'bg-red-500/10 text-red-600' },
  { name: 'Film & Video', icon: Camera, count: 78, color: 'bg-indigo-500/10 text-indigo-600' },
]

export function Categories() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Explore Categories
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Find projects that match your interests
            </p>
          </div>
          <Link
            href="/discover"
            className="mt-4 sm:mt-0 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all categories
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/discover?category=${category.name.toLowerCase()}`}
              className="group flex items-center gap-4 rounded-2xl bg-card border border-border p-4 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
            >
              <div className={`h-12 w-12 rounded-xl ${category.color} flex items-center justify-center shrink-0`}>
                <category.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">{category.name}</h3>
                <p className="text-sm text-muted-foreground">{category.count} projects</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
