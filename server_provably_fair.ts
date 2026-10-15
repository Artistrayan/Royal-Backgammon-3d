/**
 * Cryptographic Provably Fair Dice Engine (Node.js / TypeScript)
 *
 * Implements HMAC-SHA256 Deterministic Dice Rolling for Online Multiplayer Backgammon:
 * 1. Server generates CSPRNG `serverSeed` (32 bytes hex) and commits `serverSeedHash = SHA256(serverSeed)`.
 * 2. Client provides `clientSeed`.
 * 3. Each roll combines `serverSeed`, `clientSeed`, and `nonce` (counter 1, 2, 3...) via HMAC-SHA256.
 * 4. Extracts unbiased dice faces 1..6 using rejection sampling (zero modulo bias).
 * 5. Provides end-of-game `serverSeed` reveal and mathematical audit verification.
 */

import crypto from 'crypto';

export interface ProvablyFairSession {
  sessionId: string;
  serverSeed: string; // Secret until match ends
  serverSeedHash: string; // SHA-256 commitment shared with client upfront
  clientSeed: string; // User-controlled seed
  currentNonce: number; // Incrementing roll counter
  revealed: boolean;
  createdAt: number;
}

export interface ProvablyFairRoll {
  dice: [number, number];
  isDoubles: boolean;
  nonce: number;
  serverSeedHash: string;
  clientSeed: string;
  hmacSignature: string;
  timestamp: number;
}

export interface AuditVerificationResult {
  isValid: boolean;
  serverSeedValid: boolean;
  expectedServerSeedHash: string;
  actualServerSeedHash: string;
  calculatedDice: [number, number];
  matchesReportedDice: boolean;
  hmacSignature: string;
  details: string;
}

/**
 * Rejection sampling upper bound for 32-bit unsigned integers (2^32 = 4294967296).
 * Largest multiple of 6 is 4294967292 (6 * 715827882).
 * Values >= 4294967292 are discarded to prevent modulo bias.
 */
const REJECTION_LIMIT_32BIT = 4294967292;

/**
 * Deterministically derives 2 unbiased dice (1..6) from a serverSeed, clientSeed, and nonce.
 */
export function generateDeterministicDice(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): { dice: [number, number]; hmacSignature: string } {
  const message = `${clientSeed}:${nonce}`;
  const hmac = crypto.createHmac('sha256', serverSeed).update(message).digest('hex');

  const dice: number[] = [];
  let byteOffset = 0;

  // Extract 2 dice using 8 hex characters (4 bytes = 32-bit unsigned integer) per die
  while (dice.length < 2) {
    if (byteOffset + 8 > hmac.length) {
      // In the astronomically rare case we run out of hex digits due to rejections, chain HMAC
      const chainedHmac = crypto
        .createHmac('sha256', serverSeed)
        .update(`${message}:extended:${byteOffset}`)
        .digest('hex');
      return generateDeterministicDice(serverSeed, `${clientSeed}:ext`, nonce);
    }

    const hexChunk = hmac.substring(byteOffset, byteOffset + 8);
    byteOffset += 8;

    const intVal = parseInt(hexChunk, 16);
    if (intVal < REJECTION_LIMIT_32BIT) {
      const dieFace = (intVal % 6) + 1;
      dice.push(dieFace);
    }
  }

  return {
    dice: [dice[0], dice[1]],
    hmacSignature: hmac,
  };
}

/**
 * Verifies a historical roll after the serverSeed has been revealed.
 */
export function verifyProvablyFairRoll(
  serverSeed: string,
  serverSeedHash: string,
  clientSeed: string,
  nonce: number,
  reportedDice?: [number, number]
): AuditVerificationResult {
  // 1. Verify SHA-256 commitment
  const actualHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  const serverSeedValid = actualHash.toLowerCase() === serverSeedHash.toLowerCase();

  // 2. Re-compute deterministic roll
  const { dice, hmacSignature } = generateDeterministicDice(serverSeed, clientSeed, nonce);

  let matchesReported = true;
  if (reportedDice) {
    matchesReported = dice[0] === reportedDice[0] && dice[1] === reportedDice[1];
  }

  const isValid = serverSeedValid && matchesReported;

  return {
    isValid,
    serverSeedValid,
    expectedServerSeedHash: serverSeedHash,
    actualServerSeedHash: actualHash,
    calculatedDice: dice,
    matchesReportedDice: matchesReported,
    hmacSignature,
    details: isValid
      ? `PROVABLY FAIR VERIFIED: SHA-256 commitment matches. Deterministic HMAC-SHA256 produces [${dice[0]}, ${dice[1]}]. Zero modulo bias.`
      : !serverSeedValid
      ? `VERIFICATION FAILED: Revealed serverSeed does not match upfront SHA-256 commitment hash!`
      : `VERIFICATION FAILED: Calculated dice [${dice[0]}, ${dice[1]}] do not match reported dice [${reportedDice?.join(', ')}]!`,
  };
}

/**
 * Session Manager for active online matches
 */
export class ProvablyFairServerEngine {
  private activeSessions = new Map<string, ProvablyFairSession>();

  /**
   * Initializes a new session with cryptographically secure serverSeed and SHA-256 commitment.
   */
  public createSession(sessionId: string, initialClientSeed?: string): ProvablyFairSession {
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const clientSeed = initialClientSeed || crypto.randomBytes(16).toString('hex');

    const session: ProvablyFairSession = {
      sessionId,
      serverSeed,
      serverSeedHash,
      clientSeed,
      currentNonce: 0,
      revealed: false,
      createdAt: Date.now(),
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Updates clientSeed upon user request (before rolls)
   */
  public updateClientSeed(sessionId: string, newClientSeed: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    session.clientSeed = newClientSeed.trim() || session.clientSeed;
    return true;
  }

  /**
   * Executes next provably fair roll for an active session
   */
  public roll(sessionId: string): ProvablyFairRoll | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    session.currentNonce += 1;
    const { dice, hmacSignature } = generateDeterministicDice(
      session.serverSeed,
      session.clientSeed,
      session.currentNonce
    );

    return {
      dice,
      isDoubles: dice[0] === dice[1],
      nonce: session.currentNonce,
      serverSeedHash: session.serverSeedHash,
      clientSeed: session.clientSeed,
      hmacSignature,
      timestamp: Date.now(),
    };
  }

  /**
   * Reveals serverSeed at match completion for auditing
   */
  public revealServerSeed(
    sessionId: string
  ): { serverSeed: string; serverSeedHash: string; clientSeed: string; totalRolls: number } | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    session.revealed = true;
    return {
      serverSeed: session.serverSeed,
      serverSeedHash: session.serverSeedHash,
      clientSeed: session.clientSeed,
      totalRolls: session.currentNonce,
    };
  }

  public getSession(sessionId: string): ProvablyFairSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  public removeSession(sessionId: string) {
    this.activeSessions.delete(sessionId);
  }
}

export const provablyFairEngine = new ProvablyFairServerEngine();
