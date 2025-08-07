import { z } from 'zod';
import { createAndDeployApp } from '../services/outsystems-api';

export const inputSchema = z.object({
  prompt: z.string().describe("A prompt with a detailed description of the application..."),
});

export const createOutSystemsAppTool = {
  name: 'createOutSystemsApp',
  description: 'Creates and deploys a complete OutSystems application from a text prompt.',
  input_schema: inputSchema,
  
  // The handler is now an async generator (`async function*`)
  // It uses `yield*` to pass through all the updates from our service.
  handler: async function* (input: z.infer<typeof inputSchema>) {
    const { prompt } = input;
    yield* createAndDeployApp(prompt);
  },
};