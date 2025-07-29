// test/client.ts
// This is a test client for the MCP RPC server.
// It spawns the server as a child process, communicates over stdio,
// and runs a full generation flow: start -> poll status -> complete.
//
// Usage: npx ts-node test/client.ts "Your application prompt here"
// test/client.ts

import {
    createMessageConnection,
    StreamMessageReader,
    StreamMessageWriter
} from 'vscode-jsonrpc/node';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { OS_HOSTNAME } from '../src/config';

// --- Type Definitions for RPC Responses ---
type StartGenerationResponse = { sessionId?: string; status?: string; error?: string; };
type GetStatusResponse = { status?: string; appSpec?: { appKey?: string; }; error?: string; };
type TriggerGenerationResponse = { status?: string; error?: string; };
type StartPublicationResponse = { key?: string; status?: string; error?: string; };
type GetPublicationStatusResponse = { status?: string; applicationRevision?: number; buildKey?: string; error?: string; };
type GetApplicationDetailsResponse = { urlPath?: string; error?: string; };

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    console.log('--- Starting MCP Server RPC Client Test ---\n');

    const prompt = process.argv[2];
    if (!prompt) {
        console.error('Usage: npx ts-node test/client.ts "Your application prompt"');
        process.exit(1);
    }
    
    const serverScriptPath = path.join(__dirname, '../src/mcpserver.ts');
    console.log(`Spawning server from: ${serverScriptPath}`);

    const serverProcess: ChildProcess = spawn('npx', ['ts-node', serverScriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    serverProcess.stderr?.on('data', (data) => {
        console.error(`[SERVER STDERR]: ${data.toString().trim()}`);
    });

    const connection = createMessageConnection(
        new StreamMessageReader(serverProcess.stdout!),
        new StreamMessageWriter(serverProcess.stdin!)
    );
    connection.listen();
    console.log('✅ Client connected to server process.\n');

    try {
        // --- Step 1: Start App Generation ---
        console.log('1️⃣  Calling tool/startGeneration');
        console.log(`   Prompt: "${prompt}"`);
        const startResponse = await connection.sendRequest<StartGenerationResponse>('tool/startGeneration', { prompt });
        if (startResponse.error || !startResponse.sessionId) throw new Error(`Server error on start: ${startResponse.error || 'Missing sessionId'}`);
        const { sessionId } = startResponse;
        console.log(`   ✔️ Job started successfully. Session ID: ${sessionId}\n`);

        // --- Step 2: Poll until ReadyToGenerate ---
        console.log(`2️⃣  Polling status for Session ID: ${sessionId} (until ReadyToGenerate)`);
        while (true) {
            const statusResponse = await connection.sendRequest<GetStatusResponse>('tool/getStatus', { sessionId });
            if (statusResponse.error) throw new Error(`Server error getting status: ${statusResponse.error}`);
            const status = statusResponse.status;
            console.log(`   - Current status: ${status}`);
            if (status === 'ReadyToGenerate') {
                console.log('   ✔️ Job is ready for final generation!');
                break;
            }
            if (status === 'Failed' || status === 'COMPLETED_WITH_ERROR') throw new Error(`Job entered a failed state: ${status}`);
            await delay(10000);
        }

        // --- Step 3: Trigger Final Generation ---
        console.log('\n3️⃣  Calling tool/triggerGeneration');
        const triggerResponse = await connection.sendRequest<TriggerGenerationResponse>('tool/triggerGeneration', { sessionId });
        if (triggerResponse.error) throw new Error(`Server error on trigger: ${triggerResponse.error}`);
        console.log(`   ✔️ Generation triggered. New status: ${triggerResponse.status}`);

        // --- Step 4: Poll until Generation is Done ---
        console.log(`\n4️⃣  Polling status for Session ID: ${sessionId} (until Done)`);
        let applicationKey: string | undefined;
        while (!applicationKey) {
            const statusResponse = await connection.sendRequest<GetStatusResponse>('tool/getStatus', { sessionId });
            if (statusResponse.error) throw new Error(`Server error getting status: ${statusResponse.error}`);
            const status = statusResponse.status;
            console.log(`   - Current status: ${status}`);
            if (status === 'Done') {
                applicationKey = statusResponse.appSpec?.appKey;
                if (!applicationKey) throw new Error("Job is Done but the appKey is missing from the response.");
                console.log(`   ✔️ Job is Done! Application Key: ${applicationKey}`);
                break;
            }
            if (status === 'Failed' || status === 'COMPLETED_WITH_ERROR') throw new Error(`Job entered a failed state: ${status}`);
            await delay(10000);
        }

        // --- Step 5: Start the Publication ---
        console.log('\n5️⃣  Calling tool/startPublication');
        const pubResponse = await connection.sendRequest<StartPublicationResponse>('tool/startPublication', { applicationKey });
        if (pubResponse.error || !pubResponse.key) throw new Error(`Server error starting publication: ${pubResponse.error || 'Missing publication key'}`);
        const publicationKey = pubResponse.key;
        console.log(`   ✔️ Publication started successfully. Publication Key: ${publicationKey}`);

        // --- Step 6: Poll Publication Status ---
        console.log(`\n6️⃣  Polling publication status for Key: ${publicationKey} (until Finished)`);
        while (true) {
            const pubStatusResponse = await connection.sendRequest<GetPublicationStatusResponse>('tool/getPublicationStatus', { publicationKey });
            if (pubStatusResponse.error) throw new Error(`Server error getting publication status: ${pubStatusResponse.error}`);
            const status = pubStatusResponse.status;
            console.log(`   - Current publication status: ${status}`);
            if (status === 'Finished') {
                console.log(`   ✔️ Publication Finished!`);
                break;
            }
            if (status === 'FinishedWithError') throw new Error(`Publication finished with an error.`);
            await delay(10000);
        }

        // --- Step 7: Get Application Details (URL) ---
        console.log('\n7️⃣  Calling tool/getApplicationDetails');
        const appDetails = await connection.sendRequest<GetApplicationDetailsResponse>('tool/getApplicationDetails', { applicationKey });
        if (appDetails.error || !appDetails.urlPath) throw new Error(`Server error getting app details: ${appDetails.error || 'Missing urlPath'}`);
        
        // Transform the hostname to get the correct application URL format.
        const appHostname = OS_HOSTNAME.replace('.outsystems.dev', '-dev.outsystems.app');
        const appUrl = `https://${appHostname}/${appDetails.urlPath}`;
        
        console.log('\n🎉 Application is Live! URL:');
        console.log(appUrl);

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`\n--- AN ERROR OCCURRED ---\n${msg}\n`);
    } finally {
        console.log('\n--- Test Complete. Shutting down. ---');
        connection.dispose();
        serverProcess.kill();
    }
}

runTest();
