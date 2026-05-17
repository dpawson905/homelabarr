import { type SVGProps } from "react";

export function DeltaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Starfleet delta: angled triangle with curved swoop at the bottom */}
      <path d="M12 3 L21 19 C18 17 15 16 12 16 C9 16 6 17 3 19 Z" />
    </svg>
  );
}
