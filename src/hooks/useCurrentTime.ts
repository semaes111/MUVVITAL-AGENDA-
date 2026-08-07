import { useEffect, useState } from 'react'

export function useCurrentTime(refreshMilliseconds = 60_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), refreshMilliseconds)
    return () => window.clearInterval(timer)
  }, [refreshMilliseconds])

  return now
}
