import UploadBox from "@/app/chat/UploadBox";
import Navbar from "@/app/components/Navbar";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden bg-background text-foreground selection:bg-primary/20">
      <Navbar />

      {/* Decorative Editorial Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
         {/* Subtle organic shape - Top Right */}
         <div className="absolute top-[-10%] right-[-5%] w-[60vw] h-[60vw] rounded-full border border-primary/5 opacity-50 blur-[80px]"></div>
         <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-secondary/30 blur-[100px]"></div>
         
         {/* Grid lines or architectural lines */}
         <div className="absolute left-[10%] top-0 h-full w-[1px] bg-border/40 hidden lg:block"></div>
         <div className="absolute right-[10%] top-0 h-full w-[1px] bg-border/40 hidden lg:block"></div>
      </div>

      <main className="flex-1 flex flex-col pt-32 lg:pt-48 pb-20 px-6 relative z-10 w-full max-w-[1400px] mx-auto">

        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-32">

          {/* Left Content - Typography Focused */}
          <div className="flex-1 text-center lg:text-left space-y-12 animate-fade-in pl-0 lg:pl-[5%]">
            
            {/* Editorial Tag */}
            <div className="inline-flex items-center gap-3 px-3 py-1 border-b border-primary/30 mx-auto lg:mx-0 w-fit">
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-primary">Intelligence Suite</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-display font-medium text-foreground tracking-tight leading-[1]">
              Refining Talent.<br />
              <span className="text-muted-foreground">Redefining Careers.</span>
            </h1>

            {/* Subtitle - Clean & Serif touch potentially or keep simple */}
            <p className="text-lg md:text-xl text-foreground/70 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light">
              Elevate your professional narrative with precision AI tools. <br className="hidden md:block"/>
              Resume analysis, strategic matching, and interview preparation.
            </p>

            {/* Buttons - Pill shaped, solid */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 pt-4">
              <a href="/match" className="luxury-button bg-foreground text-background hover:bg-foreground/90 hover:scale-105 shadow-xl">
                Start Analysis
              </a>
              
               <a href="/interview" className="luxury-button bg-transparent border border-border text-foreground hover:bg-secondary transition-all">
                Practice Session
              </a>
            </div>
            
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-8 opacity-60">
               <div className="text-xs uppercase tracking-widest text-muted-foreground border-t border-border pt-4 w-32 text-center lg:text-left">Trusted By</div>
               <div className="flex gap-6 grayscale opacity-50">
                   {/* Minimal Placeholders for Logos */}
                   <div className="w-6 h-6 rounded-full bg-foreground/20"></div>
                   <div className="w-6 h-6 rounded-full bg-foreground/20"></div>
                   <div className="w-6 h-6 rounded-full bg-foreground/20"></div>
               </div>
            </div>
          </div>

          {/* Right Content - Abstract / Modern */}
          <div id="upload" className="flex-1 w-full max-w-lg relative animate-fade-in animation-delay-200">
             {/* Asymmetrical backdrop */}
            <div className="absolute -top-10 -right-10 w-full h-full bg-secondary rounded-[3rem] -z-10 transform rotate-3"></div>
            
            <div className="relative bg-card rounded-[2.5rem] p-2 shadow-2xl shadow-black/5 border border-border/50">
                <div className="bg-background rounded-[2rem] overflow-hidden">
                    <div className="flex items-center justify-between px-8 py-6 border-b border-border/30 bg-secondary/20">
                       <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">System.Upload</span>
                       <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    </div>
                     <div className="p-8">
                         <UploadBox />
                     </div>
                </div>
           </div>
          </div>

        </div>

      </main>
    </div>
  );
}

          
