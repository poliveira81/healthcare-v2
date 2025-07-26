import { getOutsystemsToken } from './getOutsystemsToken';
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';

// --- Token Caching Logic ---

let cachedAccessToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

/**
 * A helper function to manage the cached token.
 * It fetches a new token only if one isn't already stored,
 * and handles concurrent requests for a token while one is being fetched.
 */
function getCachedAccessToken(): Promise<string> {
    if (cachedAccessToken) {
        console.error('[CACHE] Reusing existing access token.');
        return Promise.resolve(cachedAccessToken);
    }

    if (tokenPromise) {
        console.error('[CACHE] A token is already being fetched, awaiting result...');
        return tokenPromise;
    }

    console.error('[CACHE] No token in cache, fetching a new one...');
    tokenPromise = getOutsystemsToken()
        .then(newAccessToken => {
            console.error('[CACHE] Successfully fetched and cached new token.');
            cachedAccessToken = newAccessToken;
            tokenPromise = null; // Clear the promise once resolved
            return newAccessToken;
        })
        .catch(err => {
            console.error('[CACHE] Failed to fetch token:', err);
            tokenPromise = null; // Clear the promise on failure
            throw err; // Re-throw the error so callers can handle it
        });

    return tokenPromise;
}

// --- JSON-RPC Server Setup ---

console.error('[SERVER] Initializing MCP Server...');
const connection = createMessageConnection(
    new StreamMessageReader(process.stdin),
    new StreamMessageWriter(process.stdout)
);

// --- Register Request Handlers ---

connection.onRequest('tool/startOutsystemsAppGeneration', async (params: any) => {
    try {
        console.error(`[HANDLER] Received 'startOutsystemsAppGeneration' with params:`, params);
        const token = await getCachedAccessToken();
        const response = await fetch(`https://${params.hostname}/api/app-generation/v1alpha3/jobs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: params.prompt,
                files: [],
                ignoreTenantContext: true
            }),
        });
        return await response.json();
    } catch (error: any) {
        console.error(`[ERROR] in 'startOutsystemsAppGeneration':`, error.message);
        return { error: { code: -32000, message: `Server error: ${error.message}` } };
    }
});

connection.onRequest('tool/getOutsystemsJobStatus', async (params: any) => {
    try {
        console.error(`[HANDLER] Received 'getOutsystemsJobStatus' with params:`, params);
        const token = await getCachedAccessToken();
        const response = await fetch(`https://${params.hostname}/api/app-generation/v1alpha3/jobs/${params.jobId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    } catch (error: any) {
        console.error(`[ERROR] in 'getOutsystemsJobStatus':`, error.message);
        return { error: { code: -32000, message: `Server error: ${error.message}` } };
    }
});

connection.onRequest('tool/generateOutsystemsApp', async (params: any) => {
    try {
        console.error(`[HANDLER] Received 'generateOutsystemsApp' with params:`, params);
        const token = await getCachedAccessToken();
        const response = await fetch(`https://${params.hostname}/api/app-generation/v1alpha3/jobs/${params.jobId}/generation`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    } catch (error: any) {
        console.error(`[ERROR] in 'generateOutsystemsApp':`, error.message);
        return { error: { code: -32000, message: `Server error: ${error.message}` } };
    }
});


// --- Start Server and Pre-warm Cache ---

// 1. Start listening for JSON-RPC messages IMMEDIATELY.
connection.listen();
console.error('[SERVER] MCP connection listener is now active. Ready for handshake.');

// 2. Begin pre-warming the token cache in the background.
getCachedAccessToken()
    .then(() => {
        console.error('[SERVER] Token cache pre-warmed successfully.');
    })
    .catch(error => {
        console.error('[SERVER] FATAL: Failed to pre-warm token cache on startup. The server may not function correctly.', error);
    });
