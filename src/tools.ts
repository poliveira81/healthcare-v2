// src/tools.ts

import { OutSystemsService } from './outsystems-service';

// --- Tool Definition Interfaces ---

interface ToolParameter {
    type: 'string' | 'number' | 'boolean';
    description: string;
    required: boolean;
}

export interface Tool {
    name:string;
    description: string;
    parameters: Record<string, ToolParameter>;
    execute: (service: OutSystemsService, params: any) => Promise<any>;
}

// --- Tool Implementations ---

export const outsystemsTools: Record<string, Tool> = {
    startGeneration: {
        name: 'tool/startGeneration',
        description: 'Step 1: Starts the OutSystems application generation process from a text prompt. Returns a session ID to track the job.',
        parameters: {
            prompt: {
                type: 'string',
                description: 'A detailed description of the application to be generated.',
                required: true,
            },
        },
        execute: (service, params) => service.startGeneration(params.prompt),
    },

    getStatus: {
        name: 'tool/getStatus',
        description: "Step 2: Checks the status of an ongoing job using its session ID. Poll this tool until the status is 'Analyzed' before moving to the next step. Once the status is 'Completed', the result will contain the 'applicationKey' needed for publication.",
        parameters: {
            sessionId: {
                type: 'string',
                description: 'The session ID returned from the startGeneration tool.',
                required: true,
            },
        },
        execute: (service, params) => service.getJobStatus(params.sessionId),
    },

    triggerGeneration: {
        name: 'tool/triggerGeneration',
        description: "Step 3: Triggers the final code generation for a job that has the status 'Analyzed'. After calling this, continue to use getStatus to monitor for a 'Completed' status.",
        parameters: {
            sessionId: {
                type: 'string',
                description: 'The session ID for the job that is ready for final generation (i.e., its status is \'Analyzed\').',
                required: true,
            },
        },
        execute: (service, params) => service.triggerGeneration(params.sessionId),
    },

    startPublication: {
        name: 'tool/startPublication',
        description: "Step 4: Begins the publication process for a generated application. You must first obtain the 'applicationKey' from the result of a 'Completed' job status via the getStatus tool.",
        parameters: {
            applicationKey: {
                type: 'string',
                description: 'The unique key of the application version to be published.',
                required: true,
            },
        },
        execute: (service, params) => service.startPublication(params.applicationKey),
    },

    getPublicationStatus: {
        name: 'tool/getPublicationStatus',
        description: "Step 5: Checks the status of an ongoing application publication. Poll this tool until the status is 'Published'.",
        parameters: {
            publicationKey: {
                type: 'string',
                description: 'The unique key for the publication process, returned by the startPublication tool.',
                required: true,
            },
        },
        execute: (service, params) => service.getPublicationStatus(params.publicationKey),
    },

    getApplicationDetails: {
        name: 'tool/getApplicationDetails',
        description: "Step 6: Retrieves the final details of a published application, including its URL. This is the final step after getPublicationStatus returns a 'Published' status.",
        parameters: {
            applicationKey: {
                type: 'string',
                description: 'The unique key of the application.',
                required: true,
            },
        },
        execute: (service, params) => service.getApplicationDetails(params.applicationKey),
    },
};
