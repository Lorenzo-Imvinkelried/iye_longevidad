"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2 } from "lucide-react";

interface LoadingTask {
  id: number;
  title: string;
  detail?: string;
}

interface LoadingContextValue {
  isLoading: boolean;
  currentTask: LoadingTask | null;
  startTask: (title: string, detail?: string) => () => void;
  withLoading: <T>(
    title: string,
    detail: string | undefined,
    fn: () => Promise<T>
  ) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function useGlobalLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    return {
      isLoading: false,
      currentTask: null,
      startTask: () => () => {},
      withLoading: (_title, _detail, fn) => fn(),
    };
  }
  return ctx;
}

function ModalCargandoOverlay({ task }: { task: LoadingTask }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, [task.id]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={task.title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="fixed inset-0 z-[9999] bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4 cursor-wait select-none outline-none"
    >
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#eaeced] flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[#fdf9fb] border border-[#edcddd] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#a70355]" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-bold text-[#363f48]">{task.title}</div>
          {task.detail && (
            <p className="text-xs text-[#52606d] leading-relaxed">
              {task.detail}
            </p>
          )}
        </div>
        <div className="text-[11px] font-medium text-[#a70355] bg-[#faf0f5] border border-[#f4e1eb] px-3 py-1 rounded-full">
          Aguarda un instante mientras se procesa...
        </div>
      </div>
    </div>
  );
}

export function GlobalLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tasks, setTasks] = useState<LoadingTask[]>([]);
  const nextIdRef = useRef(1);

  const startTask = useCallback((title: string, detail?: string) => {
    const id = nextIdRef.current++;
    setTasks((prev) => [...prev, { id, title, detail }]);

    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      setTasks((prev) => prev.filter((t) => t.id !== id));
    };
  }, []);

  const withLoading = useCallback(
    async <T,>(
      title: string,
      detail: string | undefined,
      fn: () => Promise<T>
    ): Promise<T> => {
      const stop = startTask(title, detail);
      try {
        return await fn();
      } finally {
        stop();
      }
    },
    [startTask]
  );

  const currentTask = tasks.length > 0 ? tasks[tasks.length - 1] : null;

  const value = useMemo<LoadingContextValue>(
    () => ({
      isLoading: tasks.length > 0,
      currentTask,
      startTask,
      withLoading,
    }),
    [tasks.length, currentTask, startTask, withLoading]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {currentTask && <ModalCargandoOverlay task={currentTask} />}
    </LoadingContext.Provider>
  );
}
