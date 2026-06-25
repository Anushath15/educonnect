"use client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ComponentProps } from "react"
 
// Derive children type from QueryClientProvider itself so both sides
// of the prop assignment reference the exact same ReactNode version.
type ProvidersProps = Pick<ComponentProps<typeof QueryClientProvider>, "children">
 
export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: false },
        },
      })
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}