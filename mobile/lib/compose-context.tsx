import React, { createContext, useContext, useState, useCallback } from "react";

interface ComposeContextType {
  visible: boolean;
  open: () => void;
  close: () => void;
}

const ComposeContext = createContext<ComposeContextType>({
  visible: false,
  open: () => {},
  close: () => {},
});

export function ComposeProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  return (
    <ComposeContext.Provider value={{ visible, open, close }}>
      {children}
    </ComposeContext.Provider>
  );
}

export function useCompose() {
  return useContext(ComposeContext);
}
