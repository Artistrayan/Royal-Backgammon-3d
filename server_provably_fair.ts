import crypto from 'crypto';

export interface ProvablyFairSession {
  sessionId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  currentNonce: number;
  revealed: boolean;
  history: Array<{
    nonce: number;
    clientSeed: string;
    dice: [number, number];
    hash: string;
    timestamp: number;
  }>;
}

export interface ProvablyFairRollResult {
  dice: [number, number];
  isDoubles: boolean;
  nonce: number;
  serverSeedHash: string;
  clientSeed: string;
  hmacSignature: string;
  timestamp: number;
}

class ProvablyFairEngine {
  private sessions = new Map<string, ProvablyFairSession>();

  createSession(sessionId: string, clientSeed = 'royal-lucky-seed'): ProvablyFairSession {
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

    const session: ProvablyFairSession = {
      sessionId,
      serverSeed,
      serverSeedHash,
      clientSeed,
      currentNonce: 0,
      revealed: false,
      history: [],
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): ProvablyFairSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateClientSeed(sessionId: string, newClientSeed: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.revealed) return false;
    session.clientSeed = newClientSeed;
    return true;
  }

  roll(sessionId: string): ProvablyFairRollResult | null {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createSession(sessionId);
    }

    session.currentNonce += 1;
    const message = `${session.clientSeed}:${session.currentNonce}`;
    const hmac = crypto.createHmac('sha256', session.serverSeed).update(message).digest('hex');

    let d1 = 0;
    let d2 = 0;
    let offset = 0;

    while (d1 === 0 && offset + 4 <= hmac.length) {
      const val = parseInt(hmac.substring(offset, offset + 4), 16);
      if (val < 65532) {
        d1 = (val % 6) + 1;
      }
      offset += 4;
    }
    if (d1 === 0) d1 = (parseInt(hmac.substring(0, 2), 16) % 6) + 1;

    while (d2 === 0 && offset + 4 <= hmac.length) {
      const val = parseInt(hmac.substring(offset, offset + 4), 16);
      if (val < 65532) {
        d2 = (val % 6) + 1;
      }
      offset += 4;
    }
    if (d2 === 0) d2 = (parseInt(hmac.substring(4, 6), 16) % 6) + 1;

    const dice: [number, number] = [d1, d2];
    const timestamp = Date.now();
    session.history.push({
      nonce: session.currentNonce,
      clientSeed: session.clientSeed,
      dice,
      hash: hmac,
      timestamp,
    });

    return {
      dice,
      isDoubles: d1 === d2,
      nonce: session.currentNonce,
      serverSeedHash: session.serverSeedHash,
      clientSeed: session.clientSeed,
      hmacSignature: hmac,
      timestamp,
    };
  }

  revealServerSeed(sessionId: string): {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    totalRolls: number;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.revealed = true;
    return {
      serverSeed: session.serverSeed,
      serverSeedHash: session.serverSeedHash,
      clientSeed: session.clientSeed,
      totalRolls: session.currentNonce,
    };
  }
}

export function verifyProvablyFairRoll(
  serverSeed: string,
  serverSeedHash: string,
  clientSeed: string,
  nonce: number,
  reportedDice: [number, number]
): {
  isValidHash: boolean;
  computedHash: string;
  computedDice: [number, number];
  isDiceMatch: boolean;
} {
  const computedSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  const isValidHash = computedSeedHash.toLowerCase() === serverSeedHash.toLowerCase();

  const message = `${clientSeed}:${nonce}`;
  const computedHash = crypto.createHmac('sha256', serverSeed).update(message).digest('hex');

  let d1 = 0;
  let d2 = 0;
  let offset = 0;

  while (d1 === 0 && offset + 4 <= computedHash.length) {
    const val = parseInt(computedHash.substring(offset, offset + 4), 16);
    if (val < 65532) d1 = (val % 6) + 1;
    offset += 4;
  }
  if (d1 === 0) d1 = (parseInt(computedHash.substring(0, 2), 16) % 6) + 1;

  while (d2 === 0 && offset + 4 <= computedHash.length) {
    const val = parseInt(computedHash.substring(offset, offset + 4), 16);
    if (val < 65532) d2 = (val % 6) + 1;
    offset += 4;
  }
  if (d2 === 0) d2 = (parseInt(computedHash.substring(4, 6), 16) % 6) + 1;

  const computedDice: [number, number] = [d1, d2];
  const isDiceMatch =
    computedDice[0] === reportedDice[0] && computedDice[1] === reportedDice[1];

  return {
    isValidHash,
    computedHash,
    computedDice,
    isDiceMatch,
  };
}

export const provablyFairEngine = new ProvablyFairEngine();
