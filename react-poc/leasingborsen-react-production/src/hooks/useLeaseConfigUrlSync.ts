import { useSearchParams } from 'react-router-dom'
import { useMemo, useCallback } from 'react'

interface ConfigState {
  km: number
  mdr: number
  udb: number
}

export function useLeaseConfigUrlSync(): [ConfigState, (key: keyof ConfigState, value: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  
  const config = useMemo(() => ({
    km: Number(searchParams.get('km')) || 15000,
    mdr: Number(searchParams.get('mdr')) || 36,
    udb: Number(searchParams.get('udb')) || 0
  }), [searchParams])
  
  const updateConfig = useCallback((key: keyof ConfigState, value: number) => {
    const params = new URLSearchParams(searchParams)
    params.set(key, String(value))
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])
  
  return [config, updateConfig]
}