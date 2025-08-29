import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useCallback } from 'react'

interface ConfigState {
  km: number | null
  mdr: number
  udb: number
}

export function useLeaseConfigUrlSync(): [ConfigState, (key: keyof ConfigState, value: number | null) => void] {
  const navigate = useNavigate({ from: '/listings' })
  const search = useSearch({ from: '/listings' })
  
  const config = useMemo(() => ({
    km: search.km ? Number(search.km) : null,
    mdr: Number(search.mdr) || 36,
    udb: Number(search.udb) || 0
  }), [search])
  
  const updateConfig = useCallback((key: keyof ConfigState, value: number | null) => {
    if (value === null) {
      const { [key]: _, ...cleanSearch } = search
      navigate({ 
        search: cleanSearch,
        replace: true 
      })
    } else {
      navigate({ 
        search: { ...search, [key]: value },
        replace: true 
      })
    }
  }, [navigate, search])
  
  return [config, updateConfig]
}