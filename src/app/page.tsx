import { FadeInSection } from "@/components/FadeInSection";
import { Logo } from "@/components/Logo";
import { Github } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="flex justify-between items-center px-8 py-4">
        <Logo />
        {/* <div className="text-2xl font-bold font-display tracking-wider">
        </div> */}
        <nav className="flex items-center space-x-6">
          <Link href="/blog">
            <div className="text-muted-foreground hover:text-foreground">
              Blog
            </div>
          </Link>
          {/* <a href="#" className="text-muted-foreground hover:text-foreground">
            Contact
          </a> */}
          <div className="flex items-center space-x-4">
            {/* <a
              href="https://x.com/parkgogogo"
              className="text-muted-foreground hover:text-foreground"
            >
              <Twitter size={20} />
            </a> */}
            <a
              href="https://github.com/parkgogogo"
              className="text-muted-foreground hover:text-foreground"
            >
              <Github size={20} />
            </a>
          </div>
        </nav>
      </header>
      <main className="flex-grow flex items-center justify-center">
        <div className="max-w-2xl w-full px-8 space-y-12 lg:-translate-y-1/4">
          <FadeInSection>
            <h1 className="text-5xl font-bold font-display">
              Hey, I&apos;m <span className="text-accent-warm">Park</span>!
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              A self-proclaimed script kiddie who fell in love with the art of
              coding! When I&apos;m not busy turning coffee into code,
              you&apos;ll find me crafting delightful frontend experiences and
              occasionally breaking things in the most creative ways possible.
              🚀
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full border border-blue-200 dark:border-blue-800">
                React
              </span>
              <span className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full border border-blue-200 dark:border-blue-800">
                TypeScript
              </span>
              <span className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200 rounded-full border border-gray-200 dark:border-gray-800">
                Next.js
              </span>
              <span className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full border border-green-200 dark:border-green-800">
                Frontend Magic
              </span>
            </div>
            <div className="mt-6">
              <svg
                width="80"
                height="10"
                viewBox="0 0 80 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 5C10.1667 9.16667 19.8 0.5 27 5C34.2 9.5 42.1667 1.83333 50.5 5C58.8333 8.16667 67.8 1.5 78 5"
                  stroke="var(--accent-warm)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </FadeInSection>
          {/* <section
            className="animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <h2 className="text-lg font-semibold">Find me on</h2>
            <div className="mt-4 flex items-center space-x-6">
              <a
                href="https://x.com/parkgogogo"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
              >
                <Twitter size={20} />
                <span>Twitter</span>
              </a>
              <a
                href="https://github.com/parkgogogo"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
              >
                <Github size={20} />
                <span>GitHub</span>
              </a>
              <a
                href="#"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
              >
                <Linkedin size={20} />
                <span>LinkedIn</span>
              </a>
            </div>
          </section> */}
          <FadeInSection delay="0.4s">
            <h2 className="text-lg font-semibold">Contact</h2>
            <p className="mt-2 text-muted-foreground">
              You can reach me out anytime at{" "}
              <a
                href="mailto:g.park@family.park"
                className="text-accent-warm underline"
              >
                gyuannn1100@gmail.com
              </a>
            </p>
          </FadeInSection>
        </div>
      </main>
    </div>
  );
}
