import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Play, Sparkles } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 mb-8">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Built on Solana • Powered by PUSD</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-foreground max-w-4xl text-balance">
            Fund the Future,{' '}
            <span className="text-primary">One Goal at a Time</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl text-pretty">
            Support dreamers, makers, and builders pursuing their goals through transparent, public updates. 
            Back what you believe in with USDC, PUSD, or USDT on the Solana blockchain—from startups to side hustles, fashion brands to fitness goals.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="rounded-full px-8 text-base">
              <Link href="/auth/sign-up">
                Start Exploring
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 text-base">
              <Link href="/feed">
                <Play className="mr-2 h-4 w-4" />
                Watch the Feed
              </Link>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="mt-16 flex flex-col items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">500+</span> builders pursuing their goals
            </p>
          </div>
        </div>

        {/* Preview Cards - Bento Style */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Video Preview Card */}
          <div className="md:col-span-2 relative aspect-video rounded-2xl bg-card border border-border overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Play className="h-6 w-6 text-primary ml-1" />
                </div>
                <p className="text-sm text-muted-foreground">TikTok-style progress updates</p>
              </div>
            </div>
            {/* Fake video UI elements */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-foreground">@sarahbuilds</span>
                <span className="text-xs text-muted-foreground">Launching her sustainable fashion brand</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <span className="text-xs text-muted-foreground mt-1">2.4k</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex flex-col gap-4">
            <div className="flex-1 rounded-2xl bg-card border border-border p-6 flex flex-col justify-center">
              <p className="text-4xl font-bold text-primary">$2.4M</p>
              <p className="text-sm text-muted-foreground mt-1">Total Funded</p>
            </div>
            <div className="flex-1 rounded-2xl bg-card border border-border p-6 flex flex-col justify-center">
              <p className="text-4xl font-bold text-foreground">12.5k</p>
              <p className="text-sm text-muted-foreground mt-1">Active Backers</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
