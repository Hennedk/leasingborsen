import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useCallback } from 'react'

interface ConfigState {
  km: number
  mdr: number
  udb: number
}

export function useLeaseConfigUrlSync(): [ConfigState, (key: keyof ConfigState, value: number) => void] {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) // Allow usage from any route
  
  const config = useMemo(() => ({
    km: Number(search.km) || 15000,
    mdr: Number(search.mdr) || 36,
    udb: Number(search.udb) || 0
  }), [search])
  
  const updateConfig = useCallback((key: keyof ConfigState, value: number) => {
    const newSearch = { ...search, [key]: value }
    navigate({ 
      search: newSearch,
      replace: true 
    })
  }, [search, navigate])
  
  return [config, updateConfig]
}