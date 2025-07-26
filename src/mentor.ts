import axios from 'axios';
import { getOutsystemsToken } from './getOutsystemsToken';
import { OS_HOSTNAME, OS_USERNAME, OS_PASSWORD } from './config';
import { Router } from 'express';

const mentorRouter = Router();
const username = OS_USERNAME!;
const password = OS_PASSWORD!;

// Utility to get the Authorization header
async function getAuthHeader(): Promise<{ Authorization: string }> {
  const access = await getOutsystemsToken();
  return { Authorization: `Bearer ${access}` };
}

/**
 * Create an app generation job.
 * @param prompt Text description of the app to generate
 * @param files Optional array of file objects
 * @returns Job details
 */
export async function createAppGenerationJob(prompt: string, files: any[] = [], ignoreTenantContext = true) {
  const url = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs`;
  const headers = {
    ...(await getAuthHeader()),
    'Content-Type': 'application/json',
  };

  const data = {
    prompt,
    files,
    ignoreTenantContext,
  };

  const response = await axios.post(url, data, { headers });
  return response.data;
}

/**
 * Get status of an app generation job.
 * @param jobId Job UUID string
 * @returns Job status details
 */
export async function getJobStatus(jobId: string) {
  const url = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs/${jobId}`;
  const headers = await getAuthHeader();

  const response = await axios.get(url, { headers });
  return response.data;
}

/**
 * Start the app generation.
 * @param jobId Job UUID string
 * @returns Generation result or confirmation
 */
export async function startAppGeneration(jobId: string) {
  const url = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs/${jobId}/generation`;
  const headers = await getAuthHeader();

  const response = await axios.post(url, undefined, { headers });
  return response.data;
}

// Create a new app generation job
mentorRouter.post('/jobs', async (req, res) => {
  try {
    const { prompt, files, ignoreTenantContext } = req.body;
    const job = await createAppGenerationJob(prompt, files, ignoreTenantContext);
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: (error as any).message || 'Failed to create job' });
  }
});

// Get the status of an existing job
mentorRouter.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await getJobStatus(jobId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: (error as any).message || 'Failed to get job status' });
  }
});

// Start the app generation for a job
mentorRouter.post('/jobs/:jobId/generation', async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await startAppGeneration(jobId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as any).message || 'Failed to start app generation' });
  }
});

export default mentorRouter;