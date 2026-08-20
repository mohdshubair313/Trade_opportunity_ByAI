import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { LiveVisitors } from "@/components/landing/LiveVisitors";
import { WebThreads } from "@/components/animations";

export default function HomePage() {
  return (
    <div className="relative w-full min-h-screen bg-black">
      {/* Animated thread background — kept as the hero of the page */}
      <div className="fixed inset-0 z-0">
        <WebThreads
          color1="#5227FF"
          color2="#FF9FFC"
          color3="#FFFFFF"
          speed={0.2}
          threadCount={6}
          frequency={5.0}
          spread={0.18}
          taper={1.0}
          position={0.5}
          fanMode="center"
          glow={0.02}
          falloff={0.6}
          thickness={1.1}
          brightness={0.6}
          opacity={1.0}
          mirror={true}
          shimmer={false}
          grain={true}
          grainIntensity={0.05}
          mouseInteraction={true}
          mouseStrength={0.3}
        />
      </div>

      {/* Contrast scrims — dim the threads behind text so every word is readable */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        {/* Base dim */}
        <div className="absolute inset-0 bg-black/40" />
        {/* Deep vignette for a cinematic focus */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_25%,rgba(0,0,0,0.55)_100%)]" />
        {/* Top fade so the fixed header is always legible */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
        {/* Bottom fade into the footer */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      <div className="relative z-10 w-full main-container">
        <Header />
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <CTA />
        <Footer />
      </div>

      <LiveVisitors />
    </div>
  );
}