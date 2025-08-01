// src/outsystems-service.ts

import { OS_HOSTNAME } from './config';
import { getOutsystemsToken } from './getOutsystemsToken';
import { v4 as uuidv4 } from 'uuid';

// --- Caching and State Management ---
let tokenCache = {
    token: null as string | null,
    expiration: 0
};
// Maps a temporary session ID to the real OutSystems Job ID
const sessions = new Map<string, string>(); 

// --- Utility Functions ---

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${await response.text()}`);
    }
    return response;
}

function getExpirationFromJwt(token: string): number {
    try {
        const payloadBase64 = token.split('.')[1];
        const decodedJson = Buffer.from(payloadBase64, 'base64').toString();
        const decoded = JSON.parse(decodedJson);
        return decoded.exp * 1000; // Convert to milliseconds
    } catch (e) {
        // Fallback: expire in 60 seconds if JWT parsing fails
        return Date.now() + 60000;
    }
}

// --- Exported Service Class ---

export class OutSystemsService {
    async getValidToken(): Promise<string> {
        if (tokenCache.token && Date.now() < tokenCache.expiration) {
            return tokenCache.token;
        }
        try {
            const jwtString = await getOutsystemsToken() as string;
            if (typeof jwtString !== 'string' || jwtString.split('.').length !== 3) {
                throw new Error(`Received value from getOutsystemsToken is not a valid JWT.`);
            }
            tokenCache = {
                token: jwtString,
                expiration: getExpirationFromJwt(jwtString) - 60000 // Buffer of 60s
            };
            return tokenCache.token!;
        } catch (error) {
            const originalMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to retrieve and process authentication token. Original error: ${originalMessage}`);
        }
    }

    async startGeneration(prompt: string): Promise<any> {
        const token = await this.getValidToken();
        //API Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/appgeneration.service.openapi.v1alpha3/definition#/
        const apiUrl = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs`;
        const response = await fetchWithTimeout(apiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, files: [], ignoreTenantContext: true })
        });
        const jobData = await response.json();
        const realJobId = jobData.key;
        if (!realJobId) throw new Error("API did not return a valid Job ID.");
        
        const sessionId = uuidv4();
        sessions.set(sessionId, realJobId);
        console.error(`[SERVICE] Started job. SessionID: ${sessionId} -> JobID: ${realJobId}`);
        return { sessionId, status: jobData.status };
    }

    async getJobStatus(sessionId: string): Promise<any> {
        const realJobId = sessions.get(sessionId);
        if (!realJobId) throw new Error(`Invalid or expired session ID: ${sessionId}`);
        const token = await this.getValidToken();
        //API Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/appgeneration.service.openapi.v1alpha3/definition#/
        const apiUrl = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs/${realJobId}`;
        const response = await fetchWithTimeout(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        return await response.json();
    }
    
    async triggerGeneration(sessionId: string): Promise<any> {
        const realJobId = sessions.get(sessionId);
        if (!realJobId) throw new Error(`Invalid or expired session ID: ${sessionId}`);
        const token = await this.getValidToken();
        //API Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/appgeneration.service.openapi.v1alpha3/definition#/
        const apiUrl = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs/${realJobId}/generation`;
        const response = await fetchWithTimeout(apiUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
        return await response.json();
    }

    async startPublication(applicationKey: string): Promise<any> {
        const token = await this.getValidToken();
        //API Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/publish.service.openapi.v1/definition#/
        const apiUrl = `https://${OS_HOSTNAME}/api/v1/publications`;
        const response = await fetchWithTimeout(apiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                applicationKey: applicationKey,
                applicationRevision: 1, // Assuming revision 1 for simplicity
                downloadUrl: null
            })
        });
        return await response.json();
    }

    async getPublicationStatus(publicationKey: string): Promise<any> {
        const token = await this.getValidToken();
        //API Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/publish.service.openapi.v1/definition#/
        const apiUrl = `https://${OS_HOSTNAME}/api/v1/publications/${publicationKey}`;
        const response = await fetchWithTimeout(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        return await response.json();
    }

    async getApplicationDetails(applicationKey: string): Promise<any> {
        const token = await this.getValidToken();
        //API Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/applicationversioning.service.openapi.v1/definition#/private/Applications_GetApplication
        //method marked as deprecated, but still works, don't know which new method to use
        const apiUrl = `https://${OS_HOSTNAME}/api/v1/applications/${applicationKey}`;
        const response = await fetchWithTimeout(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        return await response.json();
    }
}
