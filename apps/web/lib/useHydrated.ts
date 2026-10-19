"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/**
 * Returns `false` during SSR and hydration, `true` after mount.
 * Drop-in replacement for the `hasMounted` state + effect pattern that
 * avoids setState-in-effect and hydration mismatches.
 */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
