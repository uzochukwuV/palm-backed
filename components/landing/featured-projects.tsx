import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowRight, Users } from 'lucide-react'

const featuredProjects = [
  {
    id: '1',
    title: 'AI-Powered Code Editor',
    creator: 'Sarah Chen',
    category: 'Software',
    tagline: 'An intelligent IDE that learns your coding style',
    coverColor: 'from-blue-500/20 to-purple-500/20',
    funded: 45000,
    goal: 60000,
    backers: 234,
  },
  {
    id: '2',
    title: 'Handcrafted Leather Goods',
    creator: 'Marcus Webb',
    category: 'Crafts',
    tagline: 'Traditional techniques meet modern design',
    coverColor: 'from-amber-500/20 to-orange-500/20',
    funded: 12500,
    goal: 15000,
    backers: 89,
  },
  {
    id: '3',
    title: 'Learn Jazz Piano',
    creator: 'Nina Rosewood',
    category: 'Education',
    tagline: 'Master jazz improvisation from your living room',
    coverColor: 'from-emerald-500/20 to-teal-500/20',
    funded: 8200,
    goal: 25000,
    backers: 156,
  },
]

export function FeaturedProjects() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Featured Projects
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Hand-picked projects making waves right now
            </p>
          </div>
          <Button asChild variant="ghost" className="mt-4 sm:mt-0">
            <Link href="/discover">
              View all projects
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/project/${project.id}`}
              className="group rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/50 hover:shadow-xl transition-all duration-300"
            >
              {/* Cover Image Area */}
              <div className={`aspect-video bg-gradient-to-br ${project.coverColor} flex items-center justify-center`}>
                <div className="h-16 w-16 rounded-2xl bg-card/80 backdrop-blur flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{project.title[0]}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                    {project.category}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {project.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {project.tagline}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  by <span className="text-foreground font-medium">{project.creator}</span>
                </p>

                {/* Progress */}
                <div className="mt-4">
                  <Progress value={(project.funded / project.goal) * 100} className="h-2" />
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="font-semibold text-foreground">
                      ${project.funded.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">
                      of ${project.goal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Backers */}
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{project.backers} backers</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
