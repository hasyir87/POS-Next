import { cn } from "@/lib/utils";

export const MPerfumeAmalLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    className={cn("fill-current", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M50,10 C70,10 80,25 80,45 C80,65 50,100 50,100 C50,100 20,65 20,45 C20,25 30,10 50,10 Z M50,30 C45,30 40,35 40,40 C40,45 45,50 50,50 C55,50 60,45 60,40 C60,35 55,30 50,30 Z"
      stroke="currentColor"
      strokeWidth="4"
      fill="none"
    />
  </svg>
);
