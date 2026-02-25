import React, { createContext, useContext, useState, useCallback } from "react";

export type ComposeMode = "text" | "voice" | "image" | null;

interface ComposeContextType {
  visible: boolean;
  mode: ComposeMode;
  open: (mode?: ComposeMode) => void;
  close: () => void;
}

const ComposeContext = createContext<ComposeContextType>({
  visible: false,
  mode: null,
  open: () => {},
  close: () => {},
});

export function ComposeProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<ComposeMode>(null);

  const open = useCallback((m: ComposeMode = "text") => {
    setMode(m);
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setMode(null);
  }, []);

  return (
    <ComposeContext.Provider value={{ visible, mode, open, close }}>
      {children}
    </ComposeContext.Provider>
  );
}

export function useCompose() {
  return useContext(ComposeContext);
}
