import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface OrcaAIContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

const OrcaAIContext = createContext<OrcaAIContextValue>({
  open: false,
  setOpen: () => {},
  toggle: () => {},
});

export function OrcaAIProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);
  return (
    <OrcaAIContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </OrcaAIContext.Provider>
  );
}

export function useOrcaAI() {
  return useContext(OrcaAIContext);
}
