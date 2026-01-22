import UploadBox from "@/app/chat/UploadBox";
import Navbar from "@/app/components/Navbar";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden bg-background text-foreground transition-colors duration-300">
      <Navbar />

      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        {/* Top Left Greenish/Yellowish Blob */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-200/40 dark:bg-green-900/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[80px] opacity-70 dark:opacity-30 animate-blob"></div>
        {/* Top Right Pinkish/Reddish Blob */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-200/40 dark:bg-blue-900/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[80px] opacity-70 dark:opacity-30 animate-blob animation-delay-2000"></div>
        {/* Bottom Center */}
        <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-indigo-200/40 dark:bg-indigo-900/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[80px] opacity-70 dark:opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <main className="flex-1 flex flex-col pt-32 pb-12 px-6 relative z-10 w-full max-w-7xl mx-auto">

        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-left-4 duration-1000">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/80 border border-border shadow-sm backdrop-blur-sm mb-4">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              <span className="text-sm font-medium text-muted-foreground">AI-Powered Analysis</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-[800] tracking-tight text-foreground leading-[1.05] drop-shadow-sm">
              Chat simply,<br />
              <span className="text-indigo-600 dark:text-indigo-400">Understand fully.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              The smartest way to prepare for interviews. Upload your resume and get instant feedback, salary insights, and tailored questions.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mt-8 flex-wrap">
              <a href="#upload" className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold text-lg hover:opacity-90 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
                Try for free &rarr;
              </a>
              <a href="/match" className="px-8 py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full font-semibold text-lg hover:opacity-90 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
                Match Job
              </a>
              <a href="/interview" className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold text-lg hover:opacity-90 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
                AI Interview
              </a>
            </div>
          </div>

          {/* Right Upload Box "Hero Image" */}
          <div id="upload" className="flex-1 w-full max-w-xl lg:max-w-2xl relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
            {/* Decorative backing layers */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 transform rotate-6 rounded-[2.5rem] opacity-60 blur-2xl"></div>
            <div className="absolute -inset-4 bg-gradient-to-bl from-blue-50 to-green-50 dark:from-blue-900/10 dark:to-green-900/10 transform -rotate-3 rounded-[3rem] opacity-50 blur-3xl -z-10"></div>

            {/* The Actual Box - Tilted slightly for effect */}
            <div className="relative transform lg:rotate-2 hover:rotate-0 transition-transform duration-500 ease-out">
              <div className="bg-card/80 backdrop-blur-xl border border-border shadow-[0_30px_60px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-4">
                {/* Fake Browser window controls for aesthetic */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                </div>
                <UploadBox />
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
