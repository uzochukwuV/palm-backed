import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppNavbar } from '@/components/app/app-navbar'
import { Footer } from '@/components/landing/footer'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  Play, 
  Heart, 
  Share2, 
  ExternalLink, 
  FileText, 
  Link as LinkIcon,
  Twitter,
  Github,
  Globe
} from 'lucide-react'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

async function getProject(id: string) {
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      creator:profiles!projects_creator_id_fkey (
        id,
        username,
        display_name,
        bio,
        avatar_url,
        website_url,
        twitter_url,
        github_url
      )
    `)
    .eq('id', id)
    .single()

  if (error || !project) {
    return null
  }

  // Get project updates
  const { data: updates } = await supabase
    .from('project_updates')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get project resources
  const { data: resources } = await supabase
    .from('project_resources')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  // Get recent backers
  const { data: contributions } = await supabase
    .from('contributions')
    .select(`
      id,
      amount,
      message,
      is_anonymous,
      created_at,
      backer:profiles!contributions_backer_id_fkey (
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return {
    ...project,
    creator: Array.isArray(project.creator) ? project.creator[0] : project.creator,
    updates: updates || [],
    resources: resources || [],
    contributions: contributions || [],
  }
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

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const [user, project] = await Promise.all([
    getCurrentUser(),
    getProject(id),
  ])

  if (!project) {
    notFound()
  }

  const progress = project.funding_goal 
    ? (project.current_funding / project.funding_goal) * 100 
    : 0

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar user={user} />
      
      <main className="pt-20 pb-12">
        {/* Hero Section */}
        <div className="relative h-64 sm:h-80 bg-muted">
          {project.cover_image_url ? (
            <img 
              src={project.cover_image_url} 
              alt={project.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <div className="h-24 w-24 rounded-3xl bg-card/80 backdrop-blur flex items-center justify-center">
                <span className="text-4xl font-bold text-foreground">{project.title[0]}</span>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Project Header */}
              <div className="bg-card rounded-2xl border border-border p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {project.category}
                  </span>
                  {project.is_featured && (
                    <span className="text-sm font-medium text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                      Featured
                    </span>
                  )}
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {project.title}
                </h1>
                
                {project.tagline && (
                  <p className="text-lg text-muted-foreground mt-2">
                    {project.tagline}
                  </p>
                )}

                {/* Creator Info */}
                <Link 
                  href={`/creator/${project.creator.username}`}
                  className="flex items-center gap-3 mt-6 group"
                >
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium">
                    {project.creator.avatar_url ? (
                      <img 
                        src={project.creator.avatar_url} 
                        alt={project.creator.display_name || project.creator.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      project.creator.display_name?.[0] || project.creator.username[0]
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {project.creator.display_name || project.creator.username}
                    </p>
                    <p className="text-sm text-muted-foreground">@{project.creator.username}</p>
                  </div>
                </Link>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-6">
                  <Button variant="outline" size="icon" className="rounded-full">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="about" className="bg-card rounded-2xl border border-border">
                <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0">
                  <TabsTrigger 
                    value="about" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6"
                  >
                    About
                  </TabsTrigger>
                  <TabsTrigger 
                    value="updates" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6"
                  >
                    Updates ({project.updates.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="resources" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6"
                  >
                    Resources
                  </TabsTrigger>
                  <TabsTrigger 
                    value="backers" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6"
                  >
                    Backers
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="about" className="p-6">
                  <div className="prose prose-sm max-w-none text-foreground">
                    {project.description ? (
                      <p className="whitespace-pre-wrap">{project.description}</p>
                    ) : (
                      <p className="text-muted-foreground italic">No description provided yet.</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="updates" className="p-6">
                  {project.updates.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {project.updates.map((update: any) => (
                        <Link
                          key={update.id}
                          href={`/feed?update=${update.id}`}
                          className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-muted"
                        >
                          {update.thumbnail_url && (
                            <img 
                              src={update.thumbnail_url} 
                              alt={update.title || 'Update'}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="h-12 w-12 rounded-full bg-primary/90 flex items-center justify-center">
                              <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
                            </div>
                          </div>
                          <div className="absolute bottom-3 left-3 right-3">
                            <p className="text-sm font-medium text-white line-clamp-2">
                              {update.title || 'Progress Update'}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No updates yet</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="resources" className="p-6">
                  {project.resources.length > 0 ? (
                    <div className="space-y-3">
                      {project.resources.map((resource: any) => (
                        <a
                          key={resource.id}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                        >
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            {resource.resource_type === 'pdf' ? (
                              <FileText className="h-5 w-5 text-primary" />
                            ) : (
                              <LinkIcon className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{resource.title}</p>
                            {resource.description && (
                              <p className="text-sm text-muted-foreground truncate">{resource.description}</p>
                            )}
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No resources shared yet</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="backers" className="p-6">
                  {project.contributions.length > 0 ? (
                    <div className="space-y-4">
                      {project.contributions.map((contribution: any) => (
                        <div key={contribution.id} className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                            {contribution.is_anonymous 
                              ? '?' 
                              : contribution.backer?.display_name?.[0] || contribution.backer?.username?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">
                                {contribution.is_anonymous 
                                  ? 'Anonymous' 
                                  : contribution.backer?.display_name || contribution.backer?.username}
                              </p>
                              <span className="text-sm text-primary font-semibold">
                                ${contribution.amount}
                              </span>
                            </div>
                            {contribution.message && (
                              <p className="text-sm text-muted-foreground mt-1">{contribution.message}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No backers yet. Be the first!</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Funding Card */}
              <Card className="sticky top-24 border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Support this project</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Funding Progress */}
                  {project.funding_goal && (
                    <div>
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-2xl font-bold text-foreground">
                          ${project.current_funding.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          of ${project.funding_goal.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-3" />
                      <p className="text-sm text-muted-foreground mt-2">
                        {Math.round(progress)}% funded
                      </p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-around py-4 border-y border-border">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{project.backer_count}</p>
                      <p className="text-sm text-muted-foreground">Backers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{project.updates.length}</p>
                      <p className="text-sm text-muted-foreground">Updates</p>
                    </div>
                  </div>

                  {/* Back Button */}
                  <Button className="w-full rounded-full" size="lg">
                    Back this project
                  </Button>

                  {/* Creator Links */}
                  {(project.creator.website_url || project.creator.twitter_url || project.creator.github_url) && (
                    <div className="flex items-center justify-center gap-4 pt-4 border-t border-border">
                      {project.creator.website_url && (
                        <a 
                          href={project.creator.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Globe className="h-5 w-5" />
                        </a>
                      )}
                      {project.creator.twitter_url && (
                        <a 
                          href={project.creator.twitter_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Twitter className="h-5 w-5" />
                        </a>
                      )}
                      {project.creator.github_url && (
                        <a 
                          href={project.creator.github_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Github className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
