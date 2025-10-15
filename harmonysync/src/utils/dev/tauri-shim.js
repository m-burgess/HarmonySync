
// ESM shim for @tauri-apps/api so the app can run in a browser dev server.
// Exported variables are live bindings so they can be replaced when running under Tauri.

export let TauriEvent = {
	emit: async () => {},
	listen: async () => ({ unlisten: async () => {} }),
};

export let TauriCore = {
	invoke: async () => { throw new Error('Tauri not available in browser'); },
	convertFileSrc: (p) => p,
};

export let TauriPath = { join: async (...args) => args.join('/') };

export let Window = class {
	constructor() {}
	async isVisible() { return false; }
	async show() {}
	async hide() {}
};

export let dialog = {
	open: async () => null,
};

const isTauriAvailable = typeof window !== 'undefined' && !!window.__TAURI__;
if (isTauriAvailable) {
	(async () => {
		try {
	const evt = await import('@tauri-apps' + '/api/event');
	const core = await import('@tauri-apps' + '/api/core');
	const path = await import('@tauri-apps' + '/api/path');
	const windowMod = await import('@tauri-apps' + '/api/window');
	const dialogMod = await import('@tauri-apps' + '/api/dialog');
	TauriEvent = evt;
	TauriCore = core;
	TauriPath = path;
	Window = windowMod.Window;
	dialog = dialogMod;
		} catch (e) {
			// ignore and keep stubs
			// console.warn('tauri-shim: failed to load @tauri-apps/api dynamically', e);
		}
	})();
}

