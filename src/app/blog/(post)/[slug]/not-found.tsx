import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-md rounded-[10px] border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-5">
          <h1 className="text-[30px] font-semibold leading-[42px] text-[color:var(--foreground-strong)]">
            Blog Post Not Found
          </h1>
          <p className="mt-2 text-sm leading-5 text-[color:var(--text-muted)]">
            The blog post you&apos;re looking for doesn&apos;t exist or has
            been moved.
          </p>
          <div className="mt-6">
            <Link
              href="/blog"
              className="inline-flex h-9 items-center rounded-full bg-[color:var(--button-primary-background)] px-4 text-sm font-medium text-[color:var(--button-primary-foreground)] transition-colors duration-150 hover:bg-[color:var(--button-primary-background-hover)]"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
