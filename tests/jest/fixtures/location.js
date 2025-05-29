/*!
 * WikiLambda unit test suite for mocking window.location
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
const originalPushState = window.history.pushState;
const originalReplaceState = window.history.replaceState;
const originalLocation = window.location;

let mockedHref = '';
/**
 * Mocks window.location with a given URL string.
 *
 * @param {string} urlString - Full URL string to mock.
 */
function mockWindowLocation(urlString) {
	const url = new URL(urlString);
	mockedHref = url.href;

	Object.defineProperty(window, 'location', {
		configurable: true,
		writable: true,
		value: {
			get href() {
				return mockedHref;
			},
			set href(val) {
				mockedHref = val;
			},
			hash: url.hash,
			pathname: url.pathname,
			search: url.search,
			searchParams: url.searchParams,
			protocol: url.protocol,
			toString: () => url.toString(),
			assign: jest.fn(),
			replace: jest.fn(),
			reload: jest.fn(),
		}
	});
	// Mock history methods
	window.history.pushState = jest.fn();
	window.history.replaceState = jest.fn();
}

/**
 * Restores the original window.location object.
 */
function restoreWindowLocation() {
	Object.defineProperty(window, 'location', {
		configurable: true,
		writable: true,
		value: originalLocation
	});

	window.history.pushState = originalPushState;
	window.history.replaceState = originalReplaceState;
}

module.exports = {
	mockWindowLocation,
	restoreWindowLocation
};
