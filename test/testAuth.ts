import { getOutsystemsToken } from '../src/getOutsystemsToken';

async function runTest() {
    console.log('Attempting to get token...');
    try {
        const token = await getOutsystemsToken();
        console.log('SUCCESS! Token received:', token);
    } catch (error) {
        console.error('FAILED to get token:', error);
    }
}

runTest();
