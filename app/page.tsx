import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { TechStack } from '@/components/landing/tech-stack'
import { Categories } from '@/components/landing/categories'
import { FeaturedProjects } from '@/components/landing/featured-projects'
import { CTA } from '@/components/landing/cta'
import { Footer } from '@/components/landing/footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <TechStack />
      <FeaturedProjects />
      <Categories />
      <CTA />
      <Footer />
    </main>
  )
}
