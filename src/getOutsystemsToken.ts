import axios from 'axios';
//import pkceChallenge from 'pkce-challenge';
import { URL, URLSearchParams } from 'url';
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import { OS_HOSTNAME, OS_USERNAME, OS_PASSWORD } from './config';


const pkceChallenge = require('pkce-challenge');
const hostname = OS_HOSTNAME;
const username = OS_USERNAME;
const password = OS_PASSWORD;
const redirectUrl = `https://${hostname}/authentication/redirect`;

async function getOpenIdConfig() {
  const url = `https://${hostname}/identity/.well-known/openid-configuration`;
  const res = await axios.get(url);
  return {
    authorizationEndpoint: res.data.authorization_endpoint,
    tokenEndpoint: res.data.token_endpoint,
  };
}

async function getAuthPage(authorizationEndpoint: string, codeChallenge: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'unified_experience',
    redirect_uri: redirectUrl,
    kc_idp_hint: 'cognito',
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  const response = await axios.get(`${authorizationEndpoint}?${params.toString()}`, { maxRedirects: 0, validateStatus: () => true });
  const urlObj = new URL(response.request.res.responseUrl);
  const query = urlObj.searchParams;
  return {
    state: query.get('state') || '',
    kcUri: query.get('redirect_uri') || '',
    clientPoolId: query.get('client_id') || '',
  };
}

async function cognitoLogin(username: string, password: string) {
  // Fetch necessary Cognito pool configuration
  const res = await axios.get(`https://${hostname}/authentication/rest/api/v1/tenant-config`);
  const region = res.data.cognitoConfig.region;
  const clientId = res.data.cognitoConfig.amplifyClientId;
  const poolId = res.data.cognitoConfig.poolId;

  // Create Cognito user pool instance
  const userPool = new CognitoUserPool({
    UserPoolId: poolId,
    ClientId: clientId,
  });

  const cognitoUser = new CognitoUser({
    Username: username,
    Pool: userPool,
  });

  const authDetails = new AuthenticationDetails({
    Username: username,
    Password: password,
  });

  return new Promise<{ cognitoAccessToken: string; cognitoRefreshToken: string; cognitoIdToken: string }>((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (result) => {
        resolve({
          cognitoAccessToken: result.getAccessToken().getJwtToken(),
          cognitoRefreshToken: result.getRefreshToken().getToken(),
          cognitoIdToken: result.getIdToken().getJwtToken(),
        });
      },
      onFailure: (err) => {
        reject(err);
      },
      newPasswordRequired: () => {
        reject(new Error('New password required'));
      }
    });
  });
}

async function getIdentityCoreCode(cognitoAccessToken: string, cognitoRefreshToken: string, cognitoIdToken: string, clientId: string) {
  const url = `https://${hostname}/identityapi/v1alpha1/oidc/store-token`;
  const data = {
    ClientId: clientId,
    IdToken: cognitoIdToken,
    AccessToken: cognitoAccessToken,
    RefreshToken: cognitoRefreshToken,
  };
  const res = await axios.post(url, data);
  return res.data.authCode;
}

async function getCodeFromKeycloak(state: string, kcUri: string, codeFromIdentity: string) {
  const url = `${kcUri}?code=${codeFromIdentity}&state=${state}`;
  const response = await axios.get(url, { maxRedirects: 0, validateStatus: () => true });
  const urlObj = new URL(response.request.res.responseUrl);
  return urlObj.searchParams.get('code') || '';
}

async function getAccessToken(tokenEndpoint: string, credentialsToken: string, codeVerifier: string) {
  const authHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };
  const authData = new URLSearchParams({
    grant_type: 'authorization_code',
    code: credentialsToken,
    code_verifier: codeVerifier,
    redirect_uri: redirectUrl,
    client_id: 'unified_experience',
  });
  const res = await axios.post(tokenEndpoint, authData.toString(), { headers: authHeaders });
  return res.data.access_token;
}

export async function getAuthToken(username: string, password: string): Promise<string> {
  const { authorizationEndpoint, tokenEndpoint } = await getOpenIdConfig();
  const pkce = pkceChallenge();
  const { state, kcUri, clientPoolId } = await getAuthPage(authorizationEndpoint, pkce.code_challenge);
  // Cognito login (SRP) not implemented in Node.js here
  const { cognitoAccessToken, cognitoRefreshToken, cognitoIdToken } = await cognitoLogin(username, password);
  const codeFromIdentity = await getIdentityCoreCode(cognitoAccessToken, cognitoRefreshToken, cognitoIdToken, clientPoolId);
  const code = await getCodeFromKeycloak(state, kcUri, codeFromIdentity);
  return await getAccessToken(tokenEndpoint, code, pkce.code_verifier);
}

// Example usage:
// getAuthToken(username, password).then(token => console.log(token));
