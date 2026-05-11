import { Video, DollarSign, Users, TrendingUp, Smartphone, Heart, Zap } from 'lucide-react'

const features = [
  {
    icon: Video,
    title: 'Share Your Journey',
    description: 'Post short-form video updates showing your progress. Whether you&apos;re building a business, learning a skill, or chasing a dream—share it transparently.',
  },
  {
    icon: DollarSign,
    title: 'Multiple Payment Options',
    description: 'Fund any goal with USDC, PUSD, or USDT. Secure, transparent transactions on Solana.',
  },
  {
    icon: Users,
    title: 'Build Your Supporters',
    description: 'Connect with people who genuinely believe in what you&apos;re doing. Turn viewers into a community that grows with you.',
  },
  {
    icon: TrendingUp,
    title: 'Transparent Funding',
    description: 'Set clear goals and track progress together. Backers see exactly how their support is helping you move forward.',
  },
  {
    icon: Smartphone,
    title: 'Discover Everything',
    description: 'Browse a TikTok-style feed of dreamers pursuing goals—startups, side hustles, creative projects, fitness journeys, and more.',
  },
  {
    icon: Zap,
    title: 'Powered by Solana',
    description: 'Lightning-fast, low-cost transactions with no gatekeepers. Pure peer-to-peer support on the blockchain.',
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
            A new way to fund any goal. Watch dreamers, makers, and builders pursue their vision, support what matters to you, and be part of their journey from day one.
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
