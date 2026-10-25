// services/zkpAnonymityEngine.js
const crypto = require('crypto');

// In a production environment, this must be stored securely in a .env file.
// It acts as the "Trusted Setup" authority for the system.
const SYSTEM_SECRET_KEY = process.env.ZKP_SECRET || 'finbuddy-institutional-secret-key-2026';

/**
 * Step 1: Obfuscate Identity & Generate Zero-Knowledge Token
 * @param {Object} student - The student's private data (Name, Matric Number)
 * @param {Object} academicData - Verified institutional data
 * @param {Object} financialData - The deficit calculated by the ILP Optimization Engine
 * @returns {string} A cryptographically signed ZKP token
 */
function generateZKPToken(student, academicData, financialData) {
  // 1. Generate a random salt to ensure identical inputs produce different hashes (prevents Sybil tracking)
  const salt = crypto.randomBytes(16).toString('hex');

  // 2. Hash the Personal Identifiable Information (PII) so it cannot be reversed
  const identityPayload = `${student.matricNumber}:${student.realName}:${salt}`;
  const decentralizedId = crypto
    .createHash('sha256')
    .update(identityPayload)
    .digest('hex')
    .substring(0, 16); // Shortened for UI display purposes

  // 3. Create the "Proof" - the data the sponsor is allowed to see
  const verifiableClaims = {
    anonymousId: `ZKP-STUDENT-${decentralizedId}`,
    isEnrolled: academicData.isEnrolled,
    level: academicData.level,
    department: academicData.department,
    verifiedDeficitAmount: financialData.deficitAmount,
    deficitCategory: financialData.category,
    timestamp: Date.now()
  };

  // 4. Sign the claims using HMAC so sponsors know the backend verified it, preventing fraud
  const claimsString = JSON.stringify(verifiableClaims);
  const signature = crypto
    .createHmac('sha256', SYSTEM_SECRET_KEY)
    .update(claimsString)
    .digest('hex');

  // 5. Encode the final token (Base64) to be stored in the database and sent to the frontend
  const finalTokenPayload = {
    proof: verifiableClaims,
    signature: signature
  };

  return Buffer.from(JSON.stringify(finalTokenPayload)).toString('base64');
}

/**
 * Step 2: Verify the ZKP Token when a Sponsor views the request
 * @param {string} tokenBase64 - The token retrieved from the database
 * @returns {Object} The decoded, verified claims OR throws an error if tampered with
 */
function verifyZKPToken(tokenBase64) {
  try {
    const decodedString = Buffer.from(tokenBase64, 'base64').toString('utf-8');
    const tokenData = JSON.parse(decodedString);

    const claimsString = JSON.stringify(tokenData.proof);
    
    // Re-calculate the signature to ensure the data hasn't been altered
    const expectedSignature = crypto
      .createHmac('sha256', SYSTEM_SECRET_KEY)
      .update(claimsString)
      .digest('hex');

    if (expectedSignature !== tokenData.signature) {
      throw new Error('Cryptographic signature mismatch. Token has been tampered with.');
    }

    if (!tokenData.proof.isEnrolled) {
      throw new Error('Verification failed: Academic enrollment status is false.');
    }

    return {
      isValid: true,
      verifiedData: tokenData.proof
    };

  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
}

module.exports = { generateZKPToken, verifyZKPToken };