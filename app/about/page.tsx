import Link from "next/link";
import Navbar from "../components/Navbar";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background text-foreground flex flex-col pt-32 pb-24 px-6 lg:px-24">
        
        {/* Editorial Header */}
        <div className="max-w-4xl mx-auto w-full text-center space-y-6 mb-24 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <span className="text-xs font-bold tracking-[0.25em] uppercase text-primary">
            Our Philosophy
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground leading-[0.9]">
            Bridging Potential <br/><span className="italic font-normal text-muted-foreground">&</span> Opportunity.
          </h1>
          <p className="max-w-xl mx-auto text-lg text-muted-foreground mt-8 leading-relaxed font-light">
            We believe that recruitment shouldn't be a black box. Our mission is to illuminate the path for candidates and clear the fog for recruiters, creating a seamless connection defined by clarity.
          </p>
        </div>

        {/* Content Grid */}
        <div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-16 md:gap-24 border-t border-border/40 pt-16">
          
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            <div className="text-4xl text-primary mb-4 opacity-50">01.</div>
            <h2 className="text-2xl font-semibold tracking-wide">The Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              We aim to simplify the recruitment process by providing intelligent tools that help candidates prepare better and recruiters find the right talent faster. It's about data-driven insights meeting human potential.
            </p>
          </div>

          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <div className="text-4xl text-primary mb-4 opacity-50">02.</div>
            <h2 className="text-2xl font-semibold tracking-wide">Who We Are</h2>
            <p className="text-muted-foreground leading-relaxed">
              A collective of designers, engineers, and career strategists. We are obsessed with the details—the nuance of a resume, the tone of an interview, and the subtle cues that signal a perfect match.
            </p>
          </div>

          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-450">
            <div className="text-4xl text-primary mb-4 opacity-50">03.</div>
            <h2 className="text-2xl font-semibold tracking-wide">Technology</h2>
            <p className="text-muted-foreground leading-relaxed">
              Leveraging state-of-the-art AI, we offer comprehensive resume analysis, interview simulation, and real-time feedback. But technology is just the tool; your career growth is the masterpiece.
            </p>
          </div>

          <div className="flex flex-col justify-center space-y-6 bg-secondary/30 p-8 rounded-xl border border-border/50 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-600">
            <h3 className="text-2xl font-serif italic text-foreground">
              "Excellence is not a skill. It is an attitude."
            </h3>
            <div className="space-y-4">
              <p className="text-sm font-bold tracking-widest uppercase text-muted-foreground">
                Join the Movement
              </p>
              <Link href="/signup" className="inline-block text-primary hover:text-foreground font-semibold border-b border-primary hover:border-foreground transition-all pb-1">
                Start your journey &rarr;
              </Link>
            </div>
          </div>
          
        </div>

      </div>
    </>
  );
}
