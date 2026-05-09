import { Video, DollarSign, Users, TrendingUp, Smartphone, Heart } from 'lucide-react'

const features = [
  {
    icon: Video,
    title: 'Build in Public',
    description: 'Share your journey through short-form video updates. Let supporters see every milestone.',
  },
  {
    icon: DollarSign,
    title: 'Get Funded',
    description: 'Receive backing from people who believe in your vision. No gatekeepers, just authentic support.',
  },
  {
    icon: Users,
    title: 'Build Community',
    description: 'Connect with supporters who become invested in your success. Turn viewers into advocates.',
  },
  {
    icon: TrendingUp,
    title: 'Track Progress',
    description: 'Transparent funding goals and progress tracking. Backers see exactly where their support goes.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-First Feed',
    description: 'Discover projects through a TikTok-style feed. Swipe through updates and find your next favorite creator.',
  },
  {
    icon: Heart,
    title: 'Support Creators',
    description: 'Back projects with any amount. Every contribution helps bring ideas to life.',
  },
]

export function Features() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            How Backed Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A new way to fund ideas. Watch creators build, support their journey, and be part of something from the start.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group rounded-2xl bg-card border border-border p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
