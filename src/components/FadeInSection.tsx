import type { CSSProperties, ReactNode } from "react";

type FadeInSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: string;
};

export function FadeInSection({
  children,
  className,
  delay,
}: FadeInSectionProps) {
  const style: CSSProperties = {
    animationFillMode: "both",
  };

  if (delay) {
    style.animationDelay = delay;
  }

  const classes = ["animate-fade-in-up", className].filter(Boolean).join(" ");

  return (
    <section className={classes} style={style}>
      {children}
    </section>
  );
}
