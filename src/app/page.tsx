import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { WhoItsFor } from "@/components/landing/WhoItsFor";
import { AIDemo } from "@/components/landing/AIDemo";
import { Templates } from "@/components/landing/Templates";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { Help } from "@/components/landing/Help";
import { About } from "@/components/landing/About";
import { Footer } from "@/components/landing/Footer";

// Nothing on this page is per-request (no auth, no user data) — cache the render
// and revalidate hourly instead of doing full server work on every visit.
export const revalidate = 3600;

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Features />
      <WhoItsFor />
      <AIDemo />
      <Templates />
      <Pricing />
      <FAQ />
      <Help />
      <About />
      <Footer />
    </main>
  );
}
