import { useCallback, useEffect, useState } from 'react';
import { clearTimetable, deleteTimetableEntry, generateTimetable, loadTimetableWorkspace, saveManualTimetableEntry } from '../services/timetableApi.js';

export function useTimetable(filters) {
  const [workspace, setWorkspace] = useState({ entries: [], sections: [], subjects: [], faculty: [], rooms: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadTimetableWorkspace(filters)
      .then((result) => { if (active) { setWorkspace(result); setError(''); } })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Could not load the timetable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);
  const saveEntry = useCallback(async (values, id) => {
    const result = await saveManualTimetableEntry(values, id);
    if (result.saved) refresh();
    return result;
  }, [refresh]);
  const generate = useCallback(async (payload) => {
    const result = await generateTimetable(payload);
    refresh();
    return result;
  }, [refresh]);
  const remove = useCallback(async (id) => {
    const result = await deleteTimetableEntry(id);
    refresh();
    return result;
  }, [refresh]);

  const clear = useCallback(async () => {
    const result = await clearTimetable();
    refresh();
    return result;
  }, [refresh]);

  return { ...workspace, loading, error, saveEntry, generate, remove, clear };
}
