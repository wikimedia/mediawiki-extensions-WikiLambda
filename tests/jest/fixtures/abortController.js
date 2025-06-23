/*!
 * WikiLambda unit test suite for mocking AbortController
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
/**
 * Mocks the global AbortController object to provide a spy for the abort method.
 *
 * @param {string} urlString - Full URL string to mock.
 */
function mockAbortController() {
	global.abortSpy = jest.fn();
	global.AbortController = function () {
		this.abort = global.abortSpy;
		this.signal = {};
	};
}

/**
 * Restores  the original AbortController object.
 */
function restoreAbortController() {
	delete global.AbortController;
	delete global.abortSpy;
}

module.exports = {
	mockAbortController,
	restoreAbortController
};
