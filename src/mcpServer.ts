/**
 * MCP Server for OutSystems App Generation
 * Communicates via stdio for integration with Perplexity.
 */
// src/mcpserver.ts

import {
    createMessageConnection,
    StreamMessageReader,
    StreamMessageWriter
} from 'vscode-jsonrpc/node';
import { getOutsystemsToken } from './getOutsystemsToken';
import { v4 as uuidv4 } from 'uuid';
import { OS_HOSTNAME } from './config';

// --- Caching and State Management ---
let tokenCache = {
    token: null as string | null,
    expiration: 0
};

const sessions = new Map<string, string>(); // sessionId -> jobId

/**
 * A utility to fetch with a timeout.
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

/**
 * Decodes the expiration time from a JWT.
 */
function getExpirationFromJwt(token: string): number {
    try {
        const payloadBase64 = token.split('.')[1];
        const decodedJson = Buffer.from(payloadBase64, 'base64').toString();
        const decoded = JSON.parse(decodedJson);
        return decoded.exp * 1000; // Convert to milliseconds
    } catch (e) {
        return Date.now() + (60 * 1000); // Expire in 60 seconds as a fallback
    }
}

/**
 * Retrieves a valid authentication token.
 */
async function getValidToken(): Promise<string> {
    const now = Date.now();
    if (tokenCache.token && now < tokenCache.expiration) {
        return tokenCache.token;
    }
    try {
        const jwtString = await getOutsystemsToken() as string;
        if (typeof jwtString !== 'string' || jwtString.split('.').length !== 3) {
            throw new Error(`Received value from getOutsystemsToken is not a valid JWT string.`);
        }
        tokenCache = {
            token: jwtString,
            expiration: getExpirationFromJwt(jwtString) - 60000
        };
        return tokenCache.token!;
    } catch (error) {
        const originalMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to retrieve and process authentication token. Original error: ${originalMessage}`);
    }
}

/**
 * Main function to initialize the RPC server.
 */
async function main() {
    console.error('[SERVER] Initializing MCP Server over stdio...');
    const connection = createMessageConnection(
        new StreamMessageReader(process.stdin),
        new StreamMessageWriter(process.stdout)
    );

    // --- HANDLER: Start Application Generation ---
    // Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/appgeneration.service.openapi.v1alpha3/definition#/
    connection.onRequest('tool/startGeneration', async (params: { prompt: string }) => {
        try {
            const token = await getValidToken();
            const apiUrl = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs`;
            const response = await fetchWithTimeout(apiUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: params.prompt, files: [], ignoreTenantContext: true })
            });
            if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
            const jobData = await response.json();
            const realJobId = jobData.key;
            if (!realJobId) throw new Error("Failed to get a valid Job ID from the API.");
            const sessionId = uuidv4();
            sessions.set(sessionId, realJobId);
            console.error(`[SERVER] Started job. SessionID: ${sessionId} -> JobID: ${realJobId}`);
            return { sessionId, status: jobData.status };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[SERVER] Error in startGeneration: ${msg}`);
            return { error: `Failed to start job: ${msg}` };
        }
    });

    // --- HANDLER: Get Job Status ---
    // Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/appgeneration.service.openapi.v1alpha3/definition#/
    connection.onRequest('tool/getStatus', async (params: { sessionId: string }) => {
        try {
            const realJobId = sessions.get(params.sessionId);
            if (!realJobId) return { error: `Invalid or expired session ID: ${params.sessionId}` };
            const token = await getValidToken();
            const apiUrl = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs/${realJobId}`;
            const response = await fetchWithTimeout(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
            return await response.json();
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[SERVER] Error in getStatus: ${msg}`);
            return { error: `Failed to get job status: ${msg}` };
        }
    });

    // --- HANDLER: Trigger Final Generation ---
    // Documenetation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/appgeneration.service.openapi.v1alpha3/definition#/
    connection.onRequest('tool/triggerGeneration', async (params: { sessionId: string }) => {
        try {
            const realJobId = sessions.get(params.sessionId);
            if (!realJobId) return { error: `Invalid or expired session ID: ${params.sessionId}` };
            const token = await getValidToken();
            const apiUrl = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs/${realJobId}/generation`;
            const response = await fetchWithTimeout(apiUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
            return await response.json();
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[SERVER] Error in triggerGeneration: ${msg}`);
            return { error: `Failed to trigger generation: ${msg}` };
        }
    });

    // --- HANDLER: Start Publication ---
    // Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/publish.service.openapi.v1/definition#/
    connection.onRequest('tool/startPublication', async (params: { applicationKey: string }) => {
        try {
            const token = await getValidToken();
            const apiUrl = `https://${OS_HOSTNAME}/api/v1/publications`;
            const response = await fetchWithTimeout(apiUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    applicationKey: params.applicationKey,
                    applicationRevision: 1, 
                    downloadUrl: null
                })
            });
            if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
            return await response.json();
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[SERVER] Error in startPublication: ${msg}`);
            return { error: `Failed to start publication: ${msg}` };
        }
    });

    // --- HANDLER: Get Publication Status ---
    // Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/publish.service.openapi.v1/definition#/
    connection.onRequest('tool/getPublicationStatus', async (params: { publicationKey: string }) => {
        try {
            const token = await getValidToken();
            const apiUrl = `https://${OS_HOSTNAME}/api/v1/publications/${params.publicationKey}`;
            const response = await fetchWithTimeout(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
            return await response.json();
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[SERVER] Error in getPublicationStatus: ${msg}`);
            return { error: `Failed to get publication status: ${msg}` };
        }
    });

    // --- HANDLER: Get Application Details (URL) ---
    // Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/applicationversioning.service.openapi.v1/definition#/private/Applications_GetApplication
    connection.onRequest('tool/getApplicationDetails', async (params: { applicationKey: string }) => {
        try {
            const token = await getValidToken();
            const apiUrl = `https://${OS_HOSTNAME}/api/v1/applications/${params.applicationKey}`;
            const response = await fetchWithTimeout(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
            return await response.json();
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[SERVER] Error in getApplicationDetails: ${msg}`);
            return { error: `Failed to get application details: ${msg}` };
        }
    });

    // Pre-warm cache in the background
    getValidToken().catch(err => console.error(`[SERVER] Failed to pre-warm token cache: ${err.message}`));

    connection.listen();
    console.error('[SERVER] MCP Server is running and listening on stdio.');
}

// Run the server
main();
