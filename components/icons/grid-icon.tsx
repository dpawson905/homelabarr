import { type SVGProps } from "react";

export function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Tron Classic vector grid: perspective lines converging */}
      <path d="M2 20 L12 6 L22 20 M2 20 L22 20 M5 18 L19 18 M8 15 L16 15 M10 12 L14 12" />
    </svg>
  );
}
