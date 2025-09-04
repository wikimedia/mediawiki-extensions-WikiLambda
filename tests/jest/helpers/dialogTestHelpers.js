/*!
 * WikiLambda unit test helper utilities for testing dialog components.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

/**
 * Stub configuration for testing dialog components that use teleportation.
 * This configuration prevents teleportation and renders dialog content inline,
 * making it accessible for testing within the component wrapper.
 *
 * This is needed because Codex 2.3.0+ uses teleportation for dialog components,
 * which moves the dialog content outside the component wrapper and makes it
 * inaccessible for testing with standard Vue Test Utils methods.
 *
 * Usage: global: { stubs: dialogGlobalStubs }
 */
const dialogGlobalStubs = {
	CdxDialog: false,
	// Stub teleport to render content inline instead of teleporting to document body
	teleport: {
		template: '<div><slot /></div>'
	}
};

module.exports = {
	dialogGlobalStubs
};
