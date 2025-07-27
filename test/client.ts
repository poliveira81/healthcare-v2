/**
 * MCP Test Client (stdio version)
 * Spawns the MCP server and communicates over stdio to run a full test.
 */
import { createMessageConnection, ResponseError } from 'vscode-jsonrpc/node';
import { spawn, ChildProcess } from 'child_process';
import { OS_HOSTNAME } from '../src/config'; // Import for constructing the final URL

// Define the shape of expected server responses
type StartResult = { key?: string; error?: string };
type StatusResult = { status?: string; error?: string; appSpec?: { appKey?: string } };
type GenerateResult = { status?: string; error?: string; appSpec?: { appKey?: string } };

async function main() {
    const prompt = process.argv[2];
    if (!prompt) {
        console.error('Usage: npx ts-node test/client.ts "Your app prompt"');
        process.exit(1);
    }
    
    console.log(`🚀 Starting app generation for prompt: "${prompt}"\n`);
    let serverProcess: ChildProcess | undefined;

    try {
        const serverPath = require.resolve('../dist/src/mcpServer.js');
        console.log(`Spawning server from: ${serverPath}`);
        serverProcess = spawn('node', [serverPath]);

        // Log server errors for debugging
        serverProcess.stderr?.on('data', (data) => {
            console.error(`[SERVER LOG]: ${data.toString().trim()}`);
        });

        const connection = createMessageConnection(
            serverProcess.stdout!,
            serverProcess.stdin!
        );
        connection.listen();
        console.log('✅ Client connected to server process.\n');
        
        // 1. Start the job
        console.log('1️⃣  Requesting to start the application generation job...');
        const startResult: StartResult = await connection.sendRequest('tool/startOutsystemsAppGeneration', { prompt });
        
        if (startResult.error || !startResult.key) {
            throw new Error(`Failed to start job. Server response: ${JSON.stringify(startResult)}`);
        }
        const key = startResult.key;
        console.log(`   ✅ Job started successfully. Key: ${key}\n`);

        // 2. Poll for status until it's ready
        console.log('2️⃣  Polling for job status...');
        let currentStatus = '';
        let finalAppKey: string | undefined;

        while (currentStatus !== 'Done') { // FIX: Poll for 'Done' status
            const statusResult: StatusResult = await connection.sendRequest('tool/getOutsystemsJobStatus', { key });
            
            if (statusResult.error) throw new Error(`Failed to get job status: ${statusResult.error}`);
            
            currentStatus = statusResult.status || '';
            finalAppKey = statusResult.appSpec?.appKey;
            console.log(`   - Current status: ${currentStatus}`);
            
            if (currentStatus === 'ReadyToGenerate') {
                console.log('   ✅ Job processing is Done!\n');
                break;
            }
            if (currentStatus === 'Failed') {
                throw new Error(`Job failed with status: ${currentStatus}`);
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // 3. Trigger final generation
        console.log('3️⃣  Triggering final application generation...');
        const generateResult: GenerateResult = await connection.sendRequest('tool/generateOutsystemsApp', { key });

        if (generateResult.error) {
             throw new Error(`Failed to trigger generation: ${generateResult.error}`);
        }
        finalAppKey = generateResult.appSpec?.appKey || finalAppKey;
        console.log('   ✅ App generation triggered successfully!\n');
        
        // 4. Output the final URL
        if(finalAppKey) {
            const appUrl = `https://${OS_HOSTNAME}/${finalAppKey}`;
            console.log('🎉 Success! Your application URL is:');
            console.log(`   ${appUrl}`);
        } else {
            console.warn('⚠️ Could not determine the final application URL, but the process completed.');
        }

    } catch (error) {
        if (error instanceof ResponseError) {
             console.error(`❌ An error occurred during the process: ${error.message} (Code: ${error.code})`);
        } else if (error instanceof Error) {
            console.error(`❌ An error occurred during the process: ${error.message}`);
        } else {
            console.error('❌ An unknown error occurred.', error);
        }
    } finally {
        if (serverProcess) {
            console.log('\n🔌 Shutting down server process.');
            serverProcess.kill();
        }
    }
}

main();
