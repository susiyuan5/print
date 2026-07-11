import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { loadData, loadIndexedData, saveData, saveIndexedData, type DataSource } from "../data/storage";
import type { WorkbenchData } from "../types/workbench";
import { workbenchReducer, type WorkbenchAction } from "./workbenchReducer";

interface WorkbenchContextValue {
  data: WorkbenchData;
  dispatch: React.Dispatch<WorkbenchAction>;
  source: DataSource;
  notice?: string;
  setNotice: (value?: string) => void;
}

const WorkbenchContext = createContext<WorkbenchContextValue | undefined>(undefined);

export function WorkbenchProvider({ children }: { children: React.ReactNode }) {
  const loaded = useMemo(() => loadData(), []);
  const [data, dispatch] = useReducer(workbenchReducer, loaded.data);
  const [source, setSource] = useState<DataSource>(loaded.source);
  const [notice, setNotice] = useState<string | undefined>(loaded.warning);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    saveData(data);
    void saveIndexedData(data);
    setSource("localStorage");
  }, [data, hydrated]);

  useEffect(() => {
    let active = true;
    void loadIndexedData().then((indexed) => {
      if (!active) return;
      if (indexed && indexed.updatedAt > data.updatedAt) dispatch({ type: "replace", data: indexed });
      setHydrated(true);
    }).catch(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  // Load once: this also migrates the old localStorage record on the next save.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ data, dispatch, source, notice, setNotice }),
    [data, source, notice],
  );

  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
}

export function useWorkbench() {
  const context = useContext(WorkbenchContext);
  if (!context) throw new Error("useWorkbench 必须在 WorkbenchProvider 内使用");
  return context;
}
