import { z } from 'zod'

// Search Schema & Type
export const SearchSchema = z.object({
  query: z.object({
    user_ids: z.string().array(),
    time: z.string().transform(value => new Date(value))
  })
})
export type SearchSchema = z.infer<typeof SearchSchema>['query']
