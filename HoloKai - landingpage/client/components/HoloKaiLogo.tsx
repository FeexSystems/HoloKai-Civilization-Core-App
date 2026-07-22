import { cn } from "@/lib/utils";

export const LOGO_PATHS = {
  horizontal: "/logos/holokai-logo-horizontal.png",
  vertical: "/logos/holokai-logo-vertical.png",
  icon: "/logos/holokai-favicon.ico",
} as const;

export type HoloKaiLogoVariant = keyof typeof LOGO_PATHS;

type HoloKaiLogoProps = {
  variant?: HoloKaiLogoVariant;
  className?: string;
  alt?: string;
};

/**
 * Branded HoloKai logo — horizontal for nav, vertical for stacked layouts, icon for compact UI.
 */
export function HoloKaiLogo({
  variant = "horizontal",
  className,
  alt = "HoloKai",
}: HoloKaiLogoProps) {
  return (
    <img
      src={LOGO_PATHS[variant]}
      alt={alt}
      className={cn("select-none object-contain", className)}
      decoding="async"
      loading="eager"
    />
  );
}