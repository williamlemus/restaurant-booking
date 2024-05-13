import { z } from 'zod'

// Search Schema & Type
export const SearchSchema = z.object({
  query: z.object({
    user_ids: z.string().array(),
    time: z.date()
  })
})
export type SearchSchema = z.infer<typeof SearchSchema>['query']
