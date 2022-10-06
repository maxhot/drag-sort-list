import { useCallback, useState } from "react"

export default function useToggle(initialValue: boolean): [boolean, () => void] {
   const [val, setVal] = useState<boolean>(initialValue)
   const toggleFn = useCallback(() => setVal((val: boolean) => !val), [])
   return [val, toggleFn]
}

export function useForceReRender() {
   const [_, toggleFn] = useToggle(false)
   return toggleFn
}