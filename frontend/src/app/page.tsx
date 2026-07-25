import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { LiveVisitors } from "@/components/landing/LiveVisitors";
import { AuroraBackground } from "@/components/animations/AuroraBackground";

export default function HomePage() {
  return (
    <AuroraBackground className="relative w-full">
      <div className="relative z-10 w-full main-container">
        <Header />
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <CTA />
        <Footer />
        <LiveVisitors />
      </div>
    </AuroraBackground>
  );
}
