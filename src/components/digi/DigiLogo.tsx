import Image from "next/image";
import Link from "next/link";

export function DigiLogo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      aria-label="Parkgogogo home"
      className="digi-logo group inline-flex items-center gap-2.5"
    >
      <span className="digi-logo__badge">
        <Image
          src="/digimon/dot/impmon-color.png"
          alt=""
          width={128}
          height={128}
          className="h-7 w-7 [image-rendering:pixelated]"
        />
      </span>
      <span className="digi-logo__word font-display-anime">Parkgogogo</span>
    </Link>
  );
}
