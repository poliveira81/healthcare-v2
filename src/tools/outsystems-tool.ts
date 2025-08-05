import { z } from 'zod';
import { createAndDeployApp } from '../services/outsystems-api';

const inputSchema = z.object({
  description: z.string().describe("A detailed description of the application..."),
});

export const createOutSystemsAppTool = {
  name: 'createOutSystemsApp',
  description: 'Creates and deploys a complete OutSystems application...',
  input_schema: inputSchema,
  
  // The handler is now an async generator (`async function*`)
  // It uses `yield*` to pass through all the updates from our service.
  handler: async function* (input: z.infer<typeof inputSchema>) {
    const { description } = input;
    yield* createAndDeployApp(description);
  },
};