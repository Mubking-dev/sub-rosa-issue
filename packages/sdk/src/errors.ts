// SPDX-License-Identifier: MIT
import { StatusApiError, StatusJsonParseError } from "./status-client.js";

export class SubRosaClientConfigError extends Error {
  readonly name = "SubRosaClientConfigError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export interface NetworkMismatchErrorParams {
  contractId: string;
  configuredPassphrase: string;
  rpcPassphrase: string;
  rpcUrl: string;
  reason: "passphrase" | "contract_not_found";
}

/** Raised before contract simulation/signing when network configuration conflicts. */
export class SubRosaNetworkMismatchError extends Error {
  readonly name = "SubRosaNetworkMismatchError";
  readonly contractId: string;
  readonly configuredPassphrase: string;
  readonly rpcPassphrase: string;
  readonly rpcUrl: string;
  readonly reason: NetworkMismatchErrorParams["reason"];

  constructor(params: NetworkMismatchErrorParams) {
    const message =
      params.reason === "passphrase"
        ? `networkPassphrase ${JSON.stringify(params.configuredPassphrase)} does not match RPC network ${JSON.stringify(params.rpcPassphrase)} at ${params.rpcUrl}; use the passphrase and contract ID from the same deployment`
        : `contract ${params.contractId} was not found on RPC network ${JSON.stringify(params.rpcPassphrase)} at ${params.rpcUrl}; check that contractId and networkPassphrase refer to the same deployment`;
    super(message);
    this.contractId = params.contractId;
    this.configuredPassphrase = params.configuredPassphrase;
    this.rpcPassphrase = params.rpcPassphrase;
    this.rpcUrl = params.rpcUrl;
    this.reason = params.reason;
  }
}

export class SubRosaSubmitError extends Error {
  readonly name = "SubRosaSubmitError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class SubRosaTransactionError extends Error {
  readonly name = "SubRosaTransactionError";
  readonly hash: string;
  readonly status: string;

  constructor(hash: string, status: string, options?: ErrorOptions) {
    super(`transaction ${hash} ended with status ${status}`, options);
    this.hash = hash;
    this.status = status;
  }
}

export class SubRosaMissingReturnValueError extends Error {
  readonly name = "SubRosaMissingReturnValueError";
  readonly hash: string;

  constructor(hash: string) {
    super(`transaction ${hash} succeeded without a return value`);
    this.hash = hash;
  }
}

export interface TimeoutErrorParams {
  hash: string;
  submitter: string;
  lastStatus: string;
  timeoutMs: number;
  pollIntervalMs: number;
}

export type PreflightFailureKind =
  | "rpc_error"
  | "simulation_error"
  | "expired_state"
  | "contract_error"
  | "malformed_response";

export interface SubRosaPreflightErrorParams {
  kind: PreflightFailureKind;
  operation: string;
  message: string;
  simulationError?: string;
  contractErrorCode?: number;
  contractErrorMessage?: string;
  restoreMinResourceFee?: bigint;
  cause?: unknown;
}

/** Typed error for preflight/simulation failures before transaction submission. */
export class SubRosaPreflightError extends Error {
  readonly name = "SubRosaPreflightError";
  readonly kind: PreflightFailureKind;
  readonly operation: string;
  readonly simulationError?: string;
  readonly contractErrorCode?: number;
  readonly contractErrorMessage?: string;
  readonly restoreMinResourceFee?: bigint;

  constructor(params: SubRosaPreflightErrorParams) {
    super(params.message, params.cause ? { cause: params.cause } : undefined);
    this.kind = params.kind;
    this.operation = params.operation;
    this.simulationError = params.simulationError;
    this.contractErrorCode = params.contractErrorCode;
    this.contractErrorMessage = params.contractErrorMessage;
    this.restoreMinResourceFee = params.restoreMinResourceFee;
  }
}

export class SubRosaTimeoutError extends Error {
  readonly name = "SubRosaTimeoutError";
  readonly hash: string;
  readonly submitter: string;
  readonly lastStatus: string;
  readonly timeoutMs: number;
  readonly pollIntervalMs: number;

  constructor(params: TimeoutErrorParams) {
    super(
      `${params.submitter} submitted ${params.hash}, but RPC did not finalize it in time (last=${params.lastStatus})`,
    );
    this.hash = params.hash;
    this.submitter = params.submitter;
    this.lastStatus = params.lastStatus;
    this.timeoutMs = params.timeoutMs;
    this.pollIntervalMs = params.pollIntervalMs;
  }
}

/**
 * Stable, machine-readable codes for SDK failures. The set is closed, so a
 * code is safe to render at a UI boundary: it never carries a message, a
 * round payload, or any bid data.
 */
export const SDK_ERROR_CODES = [
  "CLIENT_CONFIG",
  "NETWORK_MISMATCH",
  "SUBMIT_FAILED",
  "TRANSACTION_FAILED",
  "MISSING_RETURN_VALUE",
  "PREFLIGHT_FAILED",
  "TRANSACTION_TIMEOUT",
  "STATUS_API_ERROR",
  "STATUS_INVALID_RESPONSE",
  "UNKNOWN",
] as const;

export type SdkErrorCode = (typeof SDK_ERROR_CODES)[number];

/**
 * Map a thrown value to its SDK error code. Classification is by error class
 * only -- properties on the value (including any `code` it carries) are never
 * read, so untrusted errors cannot choose what gets displayed. Anything the
 * SDK did not raise maps to "UNKNOWN".
 */
export function sdkErrorCode(error: unknown): SdkErrorCode {
  if (error instanceof SubRosaClientConfigError) return "CLIENT_CONFIG";
  if (error instanceof SubRosaNetworkMismatchError) return "NETWORK_MISMATCH";
  if (error instanceof SubRosaSubmitError) return "SUBMIT_FAILED";
  if (error instanceof SubRosaTransactionError) return "TRANSACTION_FAILED";
  if (error instanceof SubRosaMissingReturnValueError) return "MISSING_RETURN_VALUE";
  if (error instanceof SubRosaPreflightError) return "PREFLIGHT_FAILED";
  if (error instanceof SubRosaTimeoutError) return "TRANSACTION_TIMEOUT";
  if (error instanceof StatusApiError) return "STATUS_API_ERROR";
  if (error instanceof StatusJsonParseError) return "STATUS_INVALID_RESPONSE";
  return "UNKNOWN";
}
