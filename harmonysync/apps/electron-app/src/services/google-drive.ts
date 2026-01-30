/**
 * This implementation was moved to: `apps/electron-app/services/google-drive.ts`
 *
 * The file here is a small compatibility forwarder so existing imports
 * that reference `electron/services/google-drive` continue to work
 * until all import paths are updated.
 */

export * from '../../apps/electron-app/services/google-drive';
export { default } from '../../apps/electron-app/services/google-drive';
