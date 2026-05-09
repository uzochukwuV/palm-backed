'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AppNavbar } from '@/components/app/app-navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Plus, 
  Video, 
  Image as ImageIcon, 
  FileText, 
  Link as LinkIcon,
  Trash2,
  ExternalLink,
  Eye,
  Play,
  Settings,
  Upload
} from 'lucide-react'

const categories = [
  'Software',
  'Design',
  'Education',
  'Music',
  'Hardware',
  'Writing',
  'Food',
  'Film',
  'Art',
  'Games',
  'Other',
]

interface Project {
  id: string
  title: string
  tagline: string | null
  description: string | null
  category: string
  cover_image_url: string | null
  funding_goal: number | null
  current_funding: number
  backer_count: number
  status: string
  created_at: string
}

interface ProjectUpdate {
  id: string
  title: string | null
  description: string | null
  media_type: 'video' | 'image'
  media_url: string
  thumbnail_url: string | null
  view_count: number
  like_count: number
  created_at: string
}

interface ProjectResource {
  id: string
  title: string
  resource_type: 'pdf' | 'link' | 'document' | 'other'
  url: string
  description: string | null
  created_at: string
}

export default function ProjectManagePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [updates, setUpdates] = useState<ProjectUpdate[]>([])
  const [resources, setResources] = useState<ProjectResource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; email?: string; username?: string } | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    tagline: '',
    description: '',
    category: '',
    funding_goal: '',
    cover_image_url: '',
    status: 'active',
  })

  // New update form
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [updateForm, setUpdateForm] = useState({
    title: '',
    description: '',
    media_type: 'video' as 'video' | 'image',
    media_url: '',
    thumbnail_url: '',
  })
  const [isAddingUpdate, setIsAddingUpdate] = useState(false)

  // New resource form
  const [showResourceForm, setShowResourceForm] = useState(false)
  const [resourceForm, setResourceForm] = useState({
    title: '',
    resource_type: 'link' as 'pdf' | 'link' | 'document' | 'other',
    url: '',
    description: '',
  })
  const [isAddingResource, setIsAddingResource] = useState(false)

  const fetchProject = useCallback(async (id: string) => {
    const supabase = createClient()
    
    // Get current user
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      router.push('/auth/login')
      return
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', authUser.id)
      .single()

    setUser({ id: authUser.id, email: authUser.email, username: profile?.username })

    // Get project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (projectError || !projectData) {
      setError('Project not found')
      setIsLoading(false)
      return
    }

    // Check if user owns this project
    if (projectData.creator_id !== authUser.id) {
      setError('You do not have permission to edit this project')
      setIsLoading(false)
      return
    }

    setProject(projectData)
    setFormData({
      title: projectData.title,
      tagline: projectData.tagline || '',
      description: projectData.description || '',
      category: projectData.category,
      funding_goal: projectData.funding_goal?.toString() || '',
      cover_image_url: projectData.cover_image_url || '',
      status: projectData.status,
    })

    // Get updates
    const { data: updatesData } = await supabase
      .from('project_updates')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    setUpdates(updatesData || [])

    // Get resources
    const { data: resourcesData } = await supabase
      .from('project_resources')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    setResources(resourcesData || [])
    setIsLoading(false)
  }, [router])

  useEffect(() => {
    params.then(({ id }) => {
      setProjectId(id)
      fetchProject(id)
    })
  }, [params, fetchProject])

  const handleSaveProject = async () => {
    if (!projectId) return
    
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        title: formData.title,
        tagline: formData.tagline || null,
        description: formData.description || null,
        category: formData.category,
        funding_goal: formData.funding_goal ? parseFloat(formData.funding_goal) : null,
        cover_image_url: formData.cover_image_url || null,
        status: formData.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccessMessage('Project saved successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    }

    setIsSaving(false)
  }

  const handleAddUpdate = async () => {
    if (!projectId || !user) return
    
    setIsAddingUpdate(true)
    setError(null)

    const supabase = createClient()

    const { data, error: insertError } = await supabase
      .from('project_updates')
      .insert({
        project_id: projectId,
        creator_id: user.id,
        title: updateForm.title || null,
        description: updateForm.description || null,
        media_type: updateForm.media_type,
        media_url: updateForm.media_url,
        thumbnail_url: updateForm.thumbnail_url || null,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
    } else {
      setUpdates([data, ...updates])
      setUpdateForm({
        title: '',
        description: '',
        media_type: 'video',
        media_url: '',
        thumbnail_url: '',
      })
      setShowUpdateForm(false)
      setSuccessMessage('Update added successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    }

    setIsAddingUpdate(false)
  }

  const handleDeleteUpdate = async (updateId: string) => {
    if (!confirm('Are you sure you want to delete this update?')) return

    const supabase = createClient()

    const { error: deleteError } = await supabase
      .from('project_updates')
      .delete()
      .eq('id', updateId)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setUpdates(updates.filter(u => u.id !== updateId))
    }
  }

  const handleAddResource = async () => {
    if (!projectId) return
    
    setIsAddingResource(true)
    setError(null)

    const supabase = createClient()

    const { data, error: insertError } = await supabase
      .from('project_resources')
      .insert({
        project_id: projectId,
        title: resourceForm.title,
        resource_type: resourceForm.resource_type,
        url: resourceForm.url,
        description: resourceForm.description || null,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
    } else {
      setResources([data, ...resources])
      setResourceForm({
        title: '',
        resource_type: 'link',
        url: '',
        description: '',
      })
      setShowResourceForm(false)
      setSuccessMessage('Resource added successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    }

    setIsAddingResource(false)
  }

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return

    const supabase = createClient()

    const { error: deleteError } = await supabase
      .from('project_resources')
      .delete()
      .eq('id', resourceId)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setResources(resources.filter(r => r.id !== resourceId))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar user={user} />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar user={user} />
        <div className="pt-24 px-4 text-center">
          <p className="text-destructive">{error}</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar user={user} />
      
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-xl font-bold text-foreground">{project?.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/project/${projectId}`} target="_blank">
                  <Eye className="h-4 w-4 mr-2" />
                  View Public Page
                </Link>
              </Button>
            </div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 text-green-600 text-sm">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="settings" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="updates" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Updates ({updates.length})
              </TabsTrigger>
              <TabsTrigger value="resources" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Resources ({resources.length})
              </TabsTrigger>
            </TabsList>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Project Settings</CardTitle>
                  <CardDescription>
                    Update your project details and configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Project Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  {/* Tagline */}
                  <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      placeholder="A short description of your project"
                      value={formData.tagline}
                      onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    />
                  </div>

                  {/* Cover Image URL */}
                  <div className="space-y-2">
                    <Label htmlFor="cover_image_url">Cover Image URL</Label>
                    <Input
                      id="cover_image_url"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={formData.cover_image_url}
                      onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                    />
                    {formData.cover_image_url && (
                      <div className="mt-2 relative aspect-video w-full max-w-sm rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={formData.cover_image_url} 
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Category */}
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category.toLowerCase()}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Funding Goal */}
                  <div className="space-y-2">
                    <Label htmlFor="funding_goal">Funding Goal (USD)</Label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="funding_goal"
                        type="number"
                        min="0"
                        step="100"
                        className="pl-8"
                        value={formData.funding_goal}
                        onChange={(e) => setFormData({ ...formData, funding_goal: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Tell people about your project..."
                      rows={8}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveProject} 
                      disabled={isSaving || !formData.title || !formData.category}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Updates Tab */}
            <TabsContent value="updates">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Progress Updates</CardTitle>
                    <CardDescription>
                      Share video or image updates about your progress
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowUpdateForm(true)} disabled={showUpdateForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Update
                  </Button>
                </CardHeader>
                <CardContent>
                  {/* Add Update Form */}
                  {showUpdateForm && (
                    <div className="mb-6 p-6 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                      <h3 className="font-semibold text-foreground">New Update</h3>
                      
                      <div className="space-y-2">
                        <Label>Title (optional)</Label>
                        <Input
                          placeholder="e.g., Week 3 Progress"
                          value={updateForm.title}
                          onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Media Type *</Label>
                        <Select
                          value={updateForm.media_type}
                          onValueChange={(value: 'video' | 'image') => setUpdateForm({ ...updateForm, media_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video">
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4" />
                                Video
                              </div>
                            </SelectItem>
                            <SelectItem value="image">
                              <div className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                Image
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Media URL *</Label>
                        <Input
                          type="url"
                          placeholder="https://example.com/video.mp4 or https://youtube.com/..."
                          value={updateForm.media_url}
                          onChange={(e) => setUpdateForm({ ...updateForm, media_url: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Paste a direct link to your video (MP4) or image file, or a YouTube/Vimeo URL
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Thumbnail URL (optional)</Label>
                        <Input
                          type="url"
                          placeholder="https://example.com/thumbnail.jpg"
                          value={updateForm.thumbnail_url}
                          onChange={(e) => setUpdateForm({ ...updateForm, thumbnail_url: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description (optional)</Label>
                        <Textarea
                          placeholder="What did you work on?"
                          rows={3}
                          value={updateForm.description}
                          onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowUpdateForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddUpdate}
                          disabled={isAddingUpdate || !updateForm.media_url}
                        >
                          {isAddingUpdate ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Add Update
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Updates List */}
                  {updates.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {updates.map((update) => (
                        <div
                          key={update.id}
                          className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-muted border border-border"
                        >
                          {update.thumbnail_url ? (
                            <img 
                              src={update.thumbnail_url} 
                              alt={update.title || 'Update'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                              {update.media_type === 'video' ? (
                                <Video className="h-8 w-8 text-primary/50" />
                              ) : (
                                <ImageIcon className="h-8 w-8 text-primary/50" />
                              )}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          
                          {/* Play button */}
                          {update.media_type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                <Play className="h-4 w-4 text-white ml-0.5" />
                              </div>
                            </div>
                          )}
                          
                          {/* Content */}
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-sm font-medium text-white line-clamp-2">
                              {update.title || 'Progress Update'}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-white/70">
                              <span>{update.view_count} views</span>
                              <span>{update.like_count} likes</span>
                            </div>
                          </div>
                          
                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteUpdate(update.id)}
                            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold text-foreground">No updates yet</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Share your first progress update with your backers
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Resources</CardTitle>
                    <CardDescription>
                      Share documents, links, and other materials
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowResourceForm(true)} disabled={showResourceForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Resource
                  </Button>
                </CardHeader>
                <CardContent>
                  {/* Add Resource Form */}
                  {showResourceForm && (
                    <div className="mb-6 p-6 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                      <h3 className="font-semibold text-foreground">New Resource</h3>
                      
                      <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input
                          placeholder="e.g., Product Roadmap"
                          value={resourceForm.title}
                          onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Resource Type *</Label>
                        <Select
                          value={resourceForm.resource_type}
                          onValueChange={(value: 'pdf' | 'link' | 'document' | 'other') => 
                            setResourceForm({ ...resourceForm, resource_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="link">
                              <div className="flex items-center gap-2">
                                <LinkIcon className="h-4 w-4" />
                                Link
                              </div>
                            </SelectItem>
                            <SelectItem value="pdf">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                PDF
                              </div>
                            </SelectItem>
                            <SelectItem value="document">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Document
                              </div>
                            </SelectItem>
                            <SelectItem value="other">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Other
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>URL *</Label>
                        <Input
                          type="url"
                          placeholder="https://example.com/document.pdf"
                          value={resourceForm.url}
                          onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description (optional)</Label>
                        <Textarea
                          placeholder="Brief description of this resource"
                          rows={2}
                          value={resourceForm.description}
                          onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowResourceForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddResource}
                          disabled={isAddingResource || !resourceForm.title || !resourceForm.url}
                        >
                          {isAddingResource ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Resource
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Resources List */}
                  {resources.length > 0 ? (
                    <div className="space-y-3">
                      {resources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 transition-colors group"
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
                            <p className="text-xs text-muted-foreground mt-1">
                              {resource.resource_type.toUpperCase()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteResource(resource.id)}
                              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold text-foreground">No resources yet</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Share documents, links, and other materials with your backers
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
