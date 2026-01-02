import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

type RealtimeCallback = (payload: any) => void;

export function useRealtime(table: string, callback: RealtimeCallback, event: '*' | 'INSERT' | 'UPDATE' | 'DELETE' = '*') {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const supabase = createClient();
    const channelName = `${table}_changes_${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table
        },
        callback
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, callback, event]);
}

export function useTasksRealtime(onChange: (payload: any) => void) {
  return useRealtime('tasks', onChange);
}

export function useFichasRealtime(onChange: (payload: any) => void) {
  return useRealtime('fichas', onChange);
}

export function useTimelineRealtime(onChange: (payload: any) => void) {
  return useRealtime('timeline', onChange);
}

export function useKanbanColumnsRealtime(onChange: (payload: any) => void) {
  return useRealtime('columnas_kanban', onChange);
}
