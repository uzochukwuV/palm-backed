import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppNavbar } from '@/components/app/app-navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  PlusCircle, 
  DollarSign, 
  Users, 
  Play, 
  TrendingUp, 
  Eye,
  ArrowRight,
  Settings
} from 'lucide-react'

async function getDashboardData(userId: string) {
  const supabase = await createClient()

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  // Get user's projects
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      project_updates (count)
    `)
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })

  // Get recent contributions to user's projects
  const { data: recentContributions } = await supabase
    .from('contributions')
    .select(`
      *,
      project:projects!contributions_project_id_fkey (title),
      backer:profiles!contributions_backer_id_fkey (username, display_name)
    `)
    .in('project_id', (projects || []).map(p => p.id))
    .order('created_at', { ascending: false })
    .limit(5)

  // Calculate totals
  const totalFunded = (projects || []).reduce((sum, p) => sum + (p.current_funding || 0), 0)
  const totalBackers = (projects || []).reduce((sum, p) => sum + (p.backer_count || 0), 0)
  const totalUpdates = (projects || []).reduce((sum, p) => sum + (p.project_updates?.[0]?.count || 0), 0)

  return {
    profile,
    projects: projects || [],
    recentContributions: recentContributions || [],
    stats: {
      totalFunded,
      totalBackers,
      totalUpdates,
      projectCount: (projects || []).length,
    }
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { profile, projects, recentContributions, stats } = await getDashboardData(user.id)

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar user={{ id: user.id, email: user.email, username: profile?.username }} />
      
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, {profile?.display_name || profile?.username || 'Creator'}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {"Here's what's happening with your projects"}
              </p>
            </div>
            <Button asChild className="rounded-full">
              <Link href="/creator/new">
                <PlusCircle className="h-4 w-4 mr-2" />
                New Project
              </Link>
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      ${stats.totalFunded.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Raised</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalBackers}</p>
                    <p className="text-sm text-muted-foreground">Total Backers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Play className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalUpdates}</p>
                    <p className="text-sm text-muted-foreground">Updates Posted</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.projectCount}</p>
                    <p className="text-sm text-muted-foreground">Active Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Projects List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Your Projects</CardTitle>
                    <CardDescription>Manage and track your active projects</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/creator/projects">
                      View all
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {projects.length > 0 ? (
                    <div className="space-y-4">
                      {projects.slice(0, 5).map((project) => {
                        const progress = project.funding_goal 
                          ? (project.current_funding / project.funding_goal) * 100 
                          : 0

                        return (
                          <Link
                            key={project.id}
                            href={`/creator/project/${project.id}`}
                            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                          >
                            <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                              {project.cover_image_url ? (
                                <img 
                                  src={project.cover_image_url} 
                                  alt={project.title}
                                  className="w-full h-full object-cover rounded-xl"
                                />
                              ) : (
                                <span className="text-lg font-bold text-muted-foreground">
                                  {project.title[0]}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground truncate">
                                  {project.title}
                                </h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  project.status === 'active' 
                                    ? 'bg-green-500/10 text-green-600' 
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {project.status}
                                </span>
                              </div>
                              {project.funding_goal && (
                                <div className="mt-2">
                                  <Progress value={Math.min(progress, 100)} className="h-1.5" />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    ${project.current_funding?.toLocaleString() || 0} of ${project.funding_goal.toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{project.backer_count || 0}</span>
                              </div>
                              <Settings className="h-4 w-4" />
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <PlusCircle className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-foreground">No projects yet</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create your first project to start building in public
                      </p>
                      <Button asChild className="mt-4 rounded-full">
                        <Link href="/creator/new">Create Project</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest contributions and interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentContributions.length > 0 ? (
                    <div className="space-y-4">
                      {recentContributions.map((contribution: any) => (
                        <div key={contribution.id} className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <DollarSign className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-foreground">
                              <span className="font-medium">
                                {contribution.is_anonymous 
                                  ? 'Anonymous' 
                                  : contribution.backer?.display_name || contribution.backer?.username}
                              </span>
                              {' backed '}
                              <span className="font-medium text-primary">
                                ${contribution.amount}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {contribution.project?.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No activity yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
