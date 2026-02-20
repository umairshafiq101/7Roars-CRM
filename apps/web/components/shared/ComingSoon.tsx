import type { LucideIcon } from "lucide-react";
import { Rocket } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function ComingSoon({ title, description, icon: Icon }: ComingSoonProps) {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <div className="w-full max-w-md text-center">
        {/* Icon with gradient background */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#7C3AED] shadow-lg shadow-[var(--primary)]/20">
          <Icon className="h-10 w-10 text-white" />
        </div>

        {/* Coming Soon badge */}
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-orange-light)] px-4 py-1.5">
          <Rocket className="h-3.5 w-3.5 text-[var(--accent-orange)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-orange)]">
            Coming Soon
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-3 text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {title}
        </h1>

        {/* Description */}
        <p className="mb-8 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {description}
        </p>

        {/* Decorative element */}
        <div className="mx-auto flex items-center justify-center gap-2">
          <div className="h-1 w-8 rounded-full bg-[var(--primary)]" />
          <div className="h-1 w-4 rounded-full bg-[var(--accent-orange)]" />
          <div className="h-1 w-2 rounded-full bg-[var(--primary-light)]" />
        </div>
      </div>
    </div>
  );
}
