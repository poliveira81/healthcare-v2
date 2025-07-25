import { getAuthToken } from './getOutsystemsToken';
import { OS_HOSTNAME, OS_USERNAME, OS_PASSWORD } from './config';
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';

/**
 * Creates a JSON-RPC connection that reads messages from standard input (stdin)
 * and writes responses to standard output (stdout). This is the standard
 * communication method for Perplexity Copilot MCP servers.
 */
const connection = createMessageConnection(
    new StreamMessageReader(process.stdin),
    new StreamMessageWriter(process.stdout)
);

const username = OS_USERNAME!;
const password = OS_PASSWORD!;
/**
 * Use console.error for all logging.
 * Sending logs to stdout will corrupt the JSON-RPC message stream and cause errors.
 * stderr is the correct channel for logs and debug messages.
 */
console.error('MCP Server process started. Initializing request handlers...');

/**
 * Request handler for 'tool/startOutsystemsAppGeneration'.
 * This handler creates a new app generation job.
 */
connection.onRequest('tool/startOutsystemsAppGeneration', async (params: any) => {
    console.error(`[${new Date().toISOString()}] Received 'tool/startOutsystemsAppGeneration' with prompt:`, params.prompt);
    try {
        const accessToken = await getAuthToken(username, password);
        // Corresponds to: # create app
        const response = await fetch(`${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: params.prompt,
                files: [],
                ignoreTenantContext: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error! status: ${response.status}, message: ${errorText}`);
        }
        const result = await response.json();
        console.error('Successfully created job:', JSON.stringify(result));
        return { success: true, ...result };
    } catch (error) {
        console.error('Error in tool/startOutsystemsAppGeneration:', error);
        return { success: false, error: (error as Error).message };
    }
});

/**
 * Request handler for 'tool/getOutsystemsJobStatus'.
 * This handler fetches the status of a specific job.
 */
connection.onRequest('tool/getOutsystemsJobStatus', async (params: any) => {
    console.error(`[${new Date().toISOString()}] Received 'tool/getOutsystemsJobStatus' for job:`, params.jobId);
    if (!params.jobId) {
        return { success: false, error: 'jobId parameter is required.' };
    }
    try {
        const accessToken = await getAuthToken(username, password);
        // Corresponds to: # get status
        const response = await fetch(`${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs/${params.jobId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error! status: ${response.status}, message: ${errorText}`);
        }
        const result = await response.json();
        console.error('Successfully fetched job status:', JSON.stringify(result));
        return { success: true, ...result };
    } catch (error) {
        console.error('Error in tool/getOutsystemsJobStatus:', error);
        return { success: false, error: (error as Error).message };
    }
});

/**
 * Request handler for 'tool/generateOutsystemsApp'.
 * This handler starts the app generation process for an existing job.
 */
connection.onRequest('tool/generateOutsystemsApp', async (params: any) => {
    console.error(`[${new Date().toISOString()}] Received 'tool/generateOutsystemsApp' for job:`, params.jobId);
    if (!params.jobId) {
        return { success: false, error: 'jobId parameter is required.' };
    }
    try {
        const accessToken = await getAuthToken(username, password);
        // Corresponds to: # generate
        const response = await fetch(`${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs/${params.jobId}/generation`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error! status: ${response.status}, message: ${errorText}`);
        }
        const result = await response.json();
        console.error('Successfully triggered generation:', JSON.stringify(result));
        return { success: true, ...result };
    } catch (error) {
        console.error('Error in tool/generateOutsystemsApp:', error);
        return { success: false, error: (error as Error).message };
    }
});


/**
 * This starts the connection and begins listening for incoming JSON-RPC messages
 * from the Perplexity client.
 */
connection.listen();

console.error('MCP Server is now listening on stdio for JSON-RPC messages.');
