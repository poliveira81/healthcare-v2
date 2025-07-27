/**
 * MCP Server for OutSystems App Generation
 * Communicates via stdio for integration with Perplexity.
 */
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import { getOutsystemsToken } from './getOutsystemsToken';
import { OS_HOSTNAME } from './config';

// --- Token Caching ---
let accessToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

async function getCachedAccessToken(): Promise<string> {
    if (accessToken) { return accessToken; }
    if (tokenPromise) { return tokenPromise; }

    tokenPromise = getOutsystemsToken();
    try {
        const newAccessToken = await tokenPromise;
        accessToken = newAccessToken;
        return newAccessToken;
    } catch (error) {
        accessToken = null; // Clear on failure
        throw error;
    } finally {
        tokenPromise = null;
    }
}

// --- Fetch Utility ---
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 20000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    options.signal = controller.signal;

    try {
        return await fetch(url, options);
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeout / 1000} seconds`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

// --- Main Server Logic ---
async function main() {
    console.error('[SERVER] Initializing MCP Server...');
    const connection = createMessageConnection(
        new StreamMessageReader(process.stdin),
        new StreamMessageWriter(process.stdout)
    );

    // --- HANDLER: Start Job ---
    connection.onRequest('tool/startOutsystemsAppGeneration', async (params: { prompt: string }) => {
        try {
            const token = await getCachedAccessToken();
            const apiUrl = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs`;
            const response = await fetchWithTimeout(apiUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: params.prompt, files: [], ignoreTenantContext: true })
            });
            if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
            return await response.json();
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return { error: `Failed to start job: ${msg}` };
        }
    });

    // --- HANDLER: Get Status ---
    connection.onRequest('tool/getOutsystemsJobStatus', async (params: { key: string }) => {
        try {
            const token = await getCachedAccessToken();
            const apiUrl = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs/${params.key}`;
            const response = await fetchWithTimeout(apiUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
            return await response.json();
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return { error: `Failed to get job status: ${msg}` };
        }
    });

    // --- HANDLER: Trigger Generation ---
    connection.onRequest('tool/generateOutsystemsApp', async (params: { key: string }) => {
        try {
            const token = await getCachedAccessToken();
            const apiUrl = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs/${params.key}/generation`;
            const response = await fetchWithTimeout(apiUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
            return await response.json();
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return { error: `Failed to trigger generation: ${msg}` };
        }
    });

    // Pre-warm cache in the background
    getCachedAccessToken().catch(err => console.error(`[SERVER] Failed to pre-warm token cache: ${err.message}`));

    connection.listen();
    console.error('[SERVER] MCP Server is running and listening on stdio.');
}

main();
