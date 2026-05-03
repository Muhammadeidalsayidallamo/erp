import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') ref(node)
      else if (ref && 'current' in ref) (ref as React.MutableRefObject<T>).current = node
    })
  }
}

import React from 'react'
