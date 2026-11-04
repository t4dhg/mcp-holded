import { z } from 'zod';

/** Bound client collections before Zod validates or allocates errors for their elements. */
export const inputArray = <T extends z.ZodType>(element: T) => z.array(element).max(1000);
