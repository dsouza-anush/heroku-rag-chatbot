/**
 * Polling configuration constants
 * Centralized to avoid magic numbers scattered across components
 */

/** Polling interval when actively indexing (ms) */
export const POLL_INTERVAL_INDEXING_MS = 2000;

/** Polling interval when idle (ms) */
export const POLL_INTERVAL_IDLE_MS = 5000;

/** Maximum polling interval with exponential backoff (ms) */
export const POLL_MAX_INTERVAL_MS = 60000;

/** Maximum consecutive poll errors before stopping */
export const MAX_POLL_ERRORS = 5;

/** Maximum retries when progress returns "not found" */
export const MAX_NOT_FOUND_RETRIES = 5;

/** Delay before clearing progress UI after completion (ms) */
export const PROGRESS_CLEAR_DELAY_MS = 2000;

/** Delay before clearing error UI (ms) */
export const ERROR_CLEAR_DELAY_MS = 3000;
