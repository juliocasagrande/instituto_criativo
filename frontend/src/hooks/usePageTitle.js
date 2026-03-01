import { useEffect } from 'react'

export function usePageTitle(titulo) {
  useEffect(() => {
    document.title = titulo
      ? `${titulo} | Instituto Criativo`
      : 'Instituto Criativo'
    return () => { document.title = 'Instituto Criativo' }
  }, [titulo])
}