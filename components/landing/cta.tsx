import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function CTA() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative rounded-3xl bg-foreground overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative px-8 py-16 sm:px-16 sm:py-24 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-background max-w-3xl mx-auto text-balance">
              Ready to pursue your dream?
            </h2>
            <p className="mt-6 text-lg text-background/70 max-w-xl mx-auto">
              Join thousands of dreamers, makers, and builders on Solana. Fund your vision with USDC, PUSD, or USDT and build with people who believe in you.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/auth/sign-up">
                  Start Your Project
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8 bg-transparent border-background/30 text-background hover:bg-background/10">
                <Link href="/discover">
                  Explore Projects
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
