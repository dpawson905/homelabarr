import { type SVGProps } from "react";

export function BatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Simplified bat silhouette — pointed wings, small body. Public-domain shape. */}
      <path d="M12 6c-1 0-1.5 1-1.5 1.5L9 6 6 7l1 2c-1.5.5-3 1.5-4 3l1 1c1-.5 2-.5 3 0l-1 2 2-.5L9 14c.5 0 1 .5 1 1l1-1h2l1 1c0-.5.5-1 1-1l1 .5L17 14l-1-2c1-.5 2-.5 3 0l1-1c-1-1.5-2.5-2.5-4-3l1-2-3-1-1.5 1.5C13.5 7 13 6 12 6z" />
    </svg>
  );
}
