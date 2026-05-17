import { type SVGProps } from "react";

export function ArcIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Tron Legacy arc: glowing quarter-circle accent */}
      <path d="M4 20 A 16 16 0 0 1 20 4" />
      <circle cx={12} cy={12} r={1.5} fill="currentColor" />
    </svg>
  );
}
