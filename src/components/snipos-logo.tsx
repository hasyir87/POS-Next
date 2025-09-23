import { cn } from "@/lib/utils";

export const SniposLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    className={cn("fill-current", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="100" height="100" rx="20" fill="none" stroke="currentColor" strokeWidth="8"/>
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="50" fontWeight="bold" fill="currentColor">
      SNI
    </text>
  </svg>
);
