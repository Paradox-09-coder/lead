import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { FlowAnimation } from "@/components/landing/FlowAnimation";
import { LogoCarousel } from "@/components/landing/LogoCarousel";
import { ServicesGrid } from "@/components/landing/ServicesGrid";
import { PricingSection } from "@/components/landing/PricingSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <FlowAnimation />
        <LogoCarousel />
        <ServicesGrid />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
