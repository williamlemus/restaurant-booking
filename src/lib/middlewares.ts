import { NextFunction, Request, Response } from "express"
import { AnyZodObject, ZodError } from "zod"
import { CustomError } from "./customError"

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request<unknown>, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      })
      return next()
    } catch (error) {
      if (error instanceof ZodError) {
        const invalids = error.issues.map(issue => issue.path.pop())
        next(
          new CustomError(
            400,
            `Invalid or missing input${
              invalids.length > 1 ? 's' : ''
            } provided for: ${invalids.join(', ')}`
          )
        )
      } else {
        next(new CustomError(400, 'Invalid input'))
      }
      return;
    }
  }