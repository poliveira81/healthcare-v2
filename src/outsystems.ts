/**
 * This file contains the logic for interacting with the OutSystems platform.
 * The functions here will encapsulate the entire multi-step, asynchronous
 * process for each major action (e.g., generate, publish).
 */

import { stateMachine } from './state.js';
// This now correctly imports from your existing file.
import { getOutsystemsToken } from './getOutsystemsToken.js';

// Load credentials from environment variables.
const { OS_HOSTNAME, OS_USERNAME, OS_PASSWORD, OS_DEV_ENVID } = process.env;

// Helper function to simulate delays for polling.
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Token Management & Caching ---

interface TokenCache {
  token: string | null;
  expiration: number; // Expiration time in milliseconds
}

const tokenCache: TokenCache = {
  token: null,
  expiration: 0,
};

/**
 * Parses a JWT string to extract its expiration timestamp.
 * @param token The JWT string.
 * @returns The expiration timestamp in milliseconds.
 */
function getExpirationFromJwt(token: string): number {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) {
      throw new Error('Invalid JWT: Missing payload.');
    }
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    // The 'exp' claim is in seconds, so we convert it to milliseconds.
    if (typeof payload.exp !== 'number') {
      throw new Error('Invalid JWT: Missing or invalid "exp" claim.');
    }
    return payload.exp * 1000;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse JWT expiration. Original error: ${message}`);
  }
}

/**
 * Retrieves a valid (non-expired) OutSystems JWT, using a cache to avoid unnecessary API calls.
 * This function calls your existing getOutsystemsToken function.
 * @returns A promise that resolves with the valid JWT string.
 */
async function getValidToken(): Promise<string> {
  if (tokenCache.token && Date.now() < tokenCache.expiration) {
    console.log('Using cached OutSystems auth token.');
    return tokenCache.token;
  }

  try {
    console.log('Auth token is invalid or expired. Fetching a new one...');
    const jwtString = await getOutsystemsToken();
    if (typeof jwtString !== 'string' || jwtString.split('.').length !== 3) {
      throw new Error(`Received value from getOutsystemsToken is not a valid JWT.`);
    }

    // Cache the new token with a 60-second buffer before it expires.
    tokenCache.token = jwtString;
    tokenCache.expiration = getExpirationFromJwt(jwtString) - 60000; // 60s buffer

    console.log('Authentication successful. Token cached.');
    return tokenCache.token!;
  } catch (error) {
    const originalMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve and process authentication token. Original error: ${originalMessage}`);
  }
}

// --- Core Application Logic ---

/**
 * Generates a new OutSystems app from a text prompt.
 * This function handles the entire generation flow, including polling.
 * @param prompt The text prompt describing the app.
 * @returns A promise that resolves with the new app ID.
 */
export async function generateApp(prompt: string): Promise<string> {
  try {
    const token = await getValidToken();
    stateMachine.transition('GENERATION_STARTED');

    // TODO: Step 1: Send the prompt to start the process.
    console.log(`Sending prompt to OutSystems: "${prompt}"`);
    // const initialResponse = await fetch(`https://${OS_HOSTNAME}/...`, { headers: { Authorization: `Bearer ${token}` }});
    // const { someProcessId } = await initialResponse.json();
    const someProcessId = `process_${Date.now()}`; // Mock process ID
    console.log(`Generation process started with ID: ${someProcessId}`);

    // TODO: Step 2: Poll for "ReadyToGenerate" status.
    let isReady = false;
    while (!isReady) {
      console.log('Pinging for "ReadyToGenerate" status...');
      // const statusResponse = await fetch(`https://${OS_HOSTNAME}/status/${someProcessId}`, { headers: { Authorization: `Bearer ${token}` }});
      // const { status } = await statusResponse.json();
      // if (status === 'ReadyToGenerate') {
      //   isReady = true;
      // } else {
      //   await delay(5000); // Wait 5 seconds before polling again
      // }
      await delay(2000); // Mock polling
      isReady = true; // Mock success
    }
    console.log('System is ReadyToGenerate.');

    // TODO: Step 3: Start the actual generation.
    console.log('Sending command to start generation...');
    // await fetch(`https://${OS_HOSTNAME}/generate/${someProcessId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }});
    await delay(1000); // Mock action

    // TODO: Step 4: Poll for "Done" status.
    let isDone = false;
    let generatedAppId = '';
    while (!isDone) {
      console.log('Pinging for "Done" status...');
      // const doneResponse = await fetch(`https://${OS_HOSTNAME}/status/${someProcessId}`, { headers: { Authorization: `Bearer ${token}` }});
      // const { status, appId } = await doneResponse.json();
      // if (status === 'Done') {
      //   isDone = true;
      //   generatedAppId = appId;
      // } else {
      //   await delay(10000); // Wait 10 seconds
      // }
      await delay(3000); // Mock polling
      isDone = true; // Mock success
      generatedAppId = `app_${Date.now()}`; // Mock App ID
    }
    console.log(`Generation is "Done". App ID: ${generatedAppId}`);

    stateMachine.transition('GENERATION_FINISHED');
    return generatedAppId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    stateMachine.setData({ error: errorMessage });
    stateMachine.transition('FAIL');
    throw error;
  }
}

/**
 * Publishes a generated OutSystems app.
 * This function handles the entire publishing flow, including polling.
 * @param appId The ID of the app to publish.
 * @returns A promise that resolves with the final app URL.
 */
export async function publishApp(appId: string): Promise<string> {
  try {
    const token = await getValidToken();
    stateMachine.transition('START_PUBLISHING');

    // TODO: Step 1: Start the publishing process.
    console.log(`Starting publishing for app: ${appId}`);
    // const publishResponse = await fetch(`https://${OS_HOSTNAME}/publish/${appId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }});
    // const { deploymentId } = await publishResponse.json();
    const deploymentId = `dep_${Date.now()}`;
    stateMachine.setData({ deploymentId });
    console.log(`Publishing started with Deployment ID: ${deploymentId}`);

    // TODO: Step 2: Poll for publishing status.
    let isPublished = false;
    let finalAppUrl = '';
    while (!isPublished) {
      console.log(`Pinging for publishing status for deployment: ${deploymentId}`);
      // const statusResponse = await fetch(`https://${OS_HOSTNAME}/publish/status/${deploymentId}`, { headers: { Authorization: `Bearer ${token}` }});
      // const { status, url } = await statusResponse.json();
      // if (status === 'Published') {
      //   isPublished = true;
      //   finalAppUrl = url;
      // } else {
      //   await delay(10000); // Wait 10 seconds
      // }
      await delay(4000); // Mock polling
      isPublished = true; // Mock success
      finalAppUrl = `https://${OS_HOSTNAME}/${appId}`; // Mock URL
    }
    console.log(`App is published! URL: ${finalAppUrl}`);

    stateMachine.transition('PUBLISHING_FINISHED');
    return finalAppUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    stateMachine.setData({ error: errorMessage });
    stateMachine.transition('FAIL');
    throw error;
  }
}
