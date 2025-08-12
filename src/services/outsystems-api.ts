import { getValidOutSystemsToken } from './token-manager';

// --- Configuration ---
const OS_HOSTNAME = process.env.OS_HOSTNAME;

// --- Utility Functions ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- API Helper Functions (Copied exactly from your working example) ---

// Step 1: Start the initial job
async function startGenerationJob(token: string, prompt: string): Promise<string> {
  //API Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/appgeneration.service.openapi.v1alpha3/definition#/Jobs/Jobs_CreateJob
  const apiUrl = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, files: [], ignoreTenantContext: true })
  });
  if (!response.ok) throw new Error(`API Error (startGenerationJob): ${response.status} ${await response.text()}`);
  const jobData = await response.json();
  if (!jobData.key) throw new Error("API did not return a valid Job Key.");
  return jobData.key;
}

// Step 2 & 4: Poll the job's status
async function getJobStatus(token: string, jobId: string): Promise<any> {
  //API Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/appgeneration.service.openapi.v1alpha3/definition#/Jobs/Jobs_GetJob
  const apiUrl = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs/${jobId}`;
  const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) throw new Error(`API Error (getJobStatus): ${response.status} ${await response.text()}`);
  return await response.json();
}

// Step 3: Trigger the generation phase
async function triggerGeneration(token: string, jobId: string): Promise<void> {
  //API Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/appgeneration.service.openapi.v1alpha3/definition#/Jobs/Jobs_TriggerJobGeneration
  const apiUrl = `https://${OS_HOSTNAME}/api/app-generation/v1alpha3/jobs/${jobId}/generation`;
  const response = await fetch(apiUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) throw new Error(`API Error (triggerGeneration): ${response.status} ${await response.text()}`);
}

// Step 5: Start the publication process
async function startPublication(token: string, applicationKey: string): Promise<string> {
  //API Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/publish.service.openapi.v1/definition#/Publications/Publications_Post
    const apiUrl = `https://${OS_HOSTNAME}/api/v1/publications`;
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationKey, applicationRevision: 1, downloadUrl: null })
    });
    if (!response.ok) throw new Error(`API Error (startPublication): ${response.status} ${await response.text()}`);
    const pubData = await response.json();
    if (!pubData.key) throw new Error("API did not return a valid Publication Key.");
    return pubData.key;
}

// Step 6: Poll the publication status
async function getPublicationStatus(token: string, publicationKey: string): Promise<any> {
  //API Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/publish.service.openapi.v1/definition#/Publications/Publications_Get
    const apiUrl = `https://${OS_HOSTNAME}/api/v1/publications/${publicationKey}`;
    const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error(`API Error (getPublicationStatus): ${response.status} ${await response.text()}`);
    return await response.json();
}

// Step 7: Get the final application details
async function getApplicationDetails(token: string, applicationKey: string): Promise<any> {
  //API Documentation: https://backstage.arch.outsystemscloudrd.net/catalog/odc/api/applicationversioning.service.openapi.v1/definition#/private/Applications_GetApplication
    const apiUrl = `https://${OS_HOSTNAME}/api/v1/applications/${applicationKey}`;
    const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error(`API Error (getApplicationDetails): ${response.status} ${await response.text()}`);
    return await response.json();
}


// --- Main Orchestration Generator (With the corrected polling logic) ---
export async function* createAndDeployApp(prompt: string): AsyncGenerator<string> {
  if (!OS_HOSTNAME) {
    throw new Error("Missing required environment variable: OS_HOSTNAME");
  }

  try {
    yield "Fetching API token...";
    const token = await getValidOutSystemsToken();
    
    // --- App Generation Phase ---
    yield "Step 1/7: Creating generation job...";
    const jobId = await startGenerationJob(token, prompt);
    yield `  -> Job created with ID: ${jobId}`;

    yield "Step 2/7: Polling for 'ReadyToGenerate' status...";
    let jobStatus;
    while (true) {
        jobStatus = await getJobStatus(token, jobId);
        yield `  -> Current status: ${jobStatus.status}`;
        if (jobStatus.status === 'ReadyToGenerate') {
            yield `  -> Status is ReadyToGenerate. Proceeding to next step.`;
            break;
        }
        if (jobStatus.status === "Failed") throw new Error("Job failed before generation could be triggered.");
        await delay(5000);
    }

    yield "Step 3/7: Triggering OML generation...";
    await triggerGeneration(token, jobId);
    yield "  -> Generation triggered.";
    
    yield "Step 4/7: Polling for generation completion status Done...";
    let applicationKey;
    while (true) {
        jobStatus = await getJobStatus(token, jobId);
        yield `  -> Current status: ${jobStatus.status}`;
        if (jobStatus.status === "Done") {
            applicationKey = jobStatus.appSpec?.appKey;
            if (!applicationKey) throw new Error("Generation Succeeded, but no Application Key was provided.");
            yield `  -> Generation Succeeded. Acquired Application Key: ${applicationKey}`;
            break;
        }
        if (jobStatus.status === "Failed") throw new Error("OML Generation Failed.");
        await delay(10000);
    }
    
    // --- Publication Phase ---
    yield "Step 5/7: Starting application publication...";
    const publicationKey = await startPublication(token, applicationKey);
    yield `  -> Publication started with Key: ${publicationKey}`;

    yield "Step 6/7: Polling for publication completion status Finished...";
    let pubStatus;
    while (true) {
        pubStatus = await getPublicationStatus(token, publicationKey);
        yield `  -> Current status: ${pubStatus.status}`;
        if (pubStatus.status === "Finished") {
            yield `  -> Publication Succeeded.`;
            break;
        }
        if (pubStatus.status === "Failed") throw new Error("Application Publication Failed.");
        await delay(10000);
    }

    yield "Step 7/7: Retrieving final application URL...";
    const appDetails = await getApplicationDetails(token, applicationKey);
    const appUrl = appDetails?.urlPath;
    if (!appUrl) throw new Error("Could not retrieve final application URL.");

    const appHostname = OS_HOSTNAME.replace('.outsystems.dev', '-dev.outsystems.app');
    const finalUrl = `https://${appHostname}/${appDetails.urlPath}`;
    
    yield `🎉 Application is Live! URL: ${finalUrl}`;

  } catch (error: any) {
    const errorMessage = `Error during app creation: ${error.message}`;
    yield errorMessage;
    throw new Error(errorMessage);
  }
}