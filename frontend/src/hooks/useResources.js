import { useCallback, useEffect, useState } from 'react';
import { deleteResource, listResources, saveResource } from '../services/resourceApi.js';

export function useResources(resource, filters) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listResources(resource, filters)
      .then((result) => { if (active) { setRecords(result.data); setError(''); } })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Could not load resources.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [resource, filters, refreshIndex]);

  const refresh = useCallback(() => setRefreshIndex((value) => value + 1), []);
  const save = useCallback(async (values, id) => {
    const record = await saveResource(resource, values, id);
    refresh();
    return record;
  }, [resource, refresh]);
  const remove = useCallback(async (id) => {
    const record = await deleteResource(resource, id);
    refresh();
    return record;
  }, [resource, refresh]);

  return { records, loading, error, save, remove };
}
