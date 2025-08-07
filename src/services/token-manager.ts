import { getOutsystemsToken } from '../utils/getOutsystemsToken';

// A simple in-memory cache for the token
let cachedToken: {
  token: string;
  expiresAt: number; // Store the expiry time as a timestamp
} | null = null;

const TOKEN_EXPIRY_BUFFER_SECONDS = 300; // Refresh token 5 minutes before it expires

/**
 * Gets a valid OutSystems API token, using a cache if available.
 * It will automatically refresh the token if it's expired or about to expire.
 * @returns {Promise<string>} A valid OutSystems API token.
 */
export async function getValidOutSystemsToken(): Promise<string> {
  const nowInSeconds = Math.floor(Date.now() / 1000);

  // Check if we have a cached token and if it's still valid (with a buffer)
  if (cachedToken && cachedToken.expiresAt > nowInSeconds + TOKEN_EXPIRY_BUFFER_SECONDS) {
    console.error('Using cached OutSystems token.');
    return cachedToken.token;
  }

  console.error('Fetching a new OutSystems token...');
  // Your original function returns the token and expiry in seconds
  const accessToken = await getOutsystemsToken();
  
  // Calculate the absolute expiry time
  const expiresAt = nowInSeconds + 3600;

  // Cache the new token and its expiry time
  cachedToken = {
    token: accessToken,
    expiresAt: expiresAt,
  };

  console.error('Successfully fetched and cached a new token.');
  return cachedToken.token;
}