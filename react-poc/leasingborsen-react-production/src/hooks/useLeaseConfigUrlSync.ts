import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useCallback } from 'react'

interface ConfigState {
  km: number
  mdr: number
  udb: number
}

export function useLeaseConfigUrlSync(): [ConfigState, (key: keyof ConfigState, value: number) => void] {
  const navigate = useNavigate({ from: '/listings' })
  const search = useSearch({ from: '/listings' })
  
  const config = useMemo(() => ({
    km: Number(search.km) || 15000,
    mdr: Number(search.mdr) || 36,
    udb: Number(search.udb) || 0
  }), [search])
  
  const updateConfig = useCallback((key: keyof ConfigState, value: number) => {
    navigate({ 
      search: { ...search, [key]: value },
      replace: true 
    })
  }, [navigate, search])
  
  return [config, updateConfig]
}