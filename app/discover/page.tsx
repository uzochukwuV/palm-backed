import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AppNavbar } from '@/components/app/app-navbar'
import { CategoryFilter } from '@/components/app/category-filter'
import { ProjectCard, type Project } from '@/components/app/project-card'
import { Footer } from '@/components/landing/footer'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

async function getProjects(category?: string): Promise<Project[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('projects')
    .select(`
      id,
      title,
      tagline,
      category,
      cover_image_url,
      funding_goal,
      current_funding,
      backer_count,
      creator:profiles!projects_creator_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (category) {
    query = query.ilike('category', category)
  }

  const { data, error } = await query.limit(20)

  if (error) {
    console.log('[v0] Error fetching projects:', error)
    return []
  }

  return (data || []).map((p) => ({
    ...p,
    creator: Array.isArray(p.creator) ? p.creator[0] : p.creator,
  })) as Project[]
}

async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email,
    username: profile?.username,
  }
}

interface DiscoverPageProps {
  searchParams: Promise<{ category?: string; q?: string }>
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const params = await searchParams
  const [user, projects] = await Promise.all([
    getCurrentUser(),
    getProjects(params.category),
  ])

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar user={user} />
      
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Discover Projects
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Find and support creators building amazing things
            </p>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="pl-10 rounded-full"
                defaultValue={params.q}
              />
            </div>
            <Button variant="outline" className="rounded-full shrink-0">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Category Filter */}
          <Suspense fallback={<div className="h-10 bg-muted rounded-full animate-pulse" />}>
            <CategoryFilter />
          </Suspense>

          {/* Projects Grid */}
          <div className="mt-8">
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No projects found</h3>
                <p className="text-muted-foreground mt-1">
                  {params.category 
                    ? `No projects in the "${params.category}" category yet.` 
                    : 'Be the first to create a project!'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
