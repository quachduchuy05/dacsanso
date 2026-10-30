import type { CoopApplication } from '../domain/coopApplication';
// Private application details stay in memory and are populated only after server OTP verification.
export const applicationCache = new Map<string, CoopApplication>();
