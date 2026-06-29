import Navbar from './components/sections/Navbar';
import Hero from './components/sections/Hero';
import SocialProof from './components/sections/SocialProof';
import HowItWorks from './components/sections/HowItWorks';
import Features from './components/sections/Features';
import PublicLink from './components/sections/PublicLink';
import Benefits from './components/sections/Benefits';
import Testimonials from './components/sections/Testimonials';
import About from './components/sections/About';
import FAQ from './components/sections/FAQ';
import FinalCTA from './components/sections/FinalCTA';
import Footer from './components/sections/Footer';
import FloatingWhatsApp from './components/FloatingWhatsApp';

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <HowItWorks />
        <Features />
        <PublicLink />
        <Benefits />
        <Testimonials />
        <About />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}

export default App;
