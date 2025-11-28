import { Navbar, Hero, Features, Testimonials, Pricing, Footer } from '@/components/landing'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Features />
      <Testimonials />
      <Pricing />
      <Footer />
    </main>
  )
}
