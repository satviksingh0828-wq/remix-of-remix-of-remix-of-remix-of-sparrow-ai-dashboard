import React from "react";
import { OrcaLogo } from "./OrcaLogo";
import { cn } from "@/lib/utils";

interface PoweredByProps {
  className?: string;
  logoClassName?: string;
  isFullUppercase?: boolean;
}

export const PoweredBy: React.FC<PoweredByProps> = ({ 
  className, 
  logoClassName,
  isFullUppercase = false 
}) => {
  return (
    <a
      href="https://orca.devs.surf"
      target="_blank"
      rel="noreferrer"
      className={cn("flex items-center justify-center gap-1.5", className)}
    >
      <span className="opacity-70">POWERED BY</span>
      <OrcaLogo className={cn("size-3.5", logoClassName)} />
      <span className="font-semibold">ORCA DEVS SURF</span>
    </a>
  );
};
