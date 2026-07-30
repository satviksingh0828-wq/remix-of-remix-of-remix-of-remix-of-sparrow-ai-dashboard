import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface SparrowAIContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

const SparrowAIContext = createContext<SparrowAIContextValue>({
  open: false,
  setOpen: () => {},
  toggle: () => {},
});

export function SparrowAIProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);
  return (
    <SparrowAIContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </SparrowAIContext.Provider>
  );
}

export function useSparrowAI() {
  return useContext(SparrowAIContext);
}
