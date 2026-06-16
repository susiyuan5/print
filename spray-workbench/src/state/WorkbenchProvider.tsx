import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { loadData, saveData, type DataSource } from "../data/storage";
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

  useEffect(() => {
    saveData(data);
    setSource("localStorage");
  }, [data]);

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
