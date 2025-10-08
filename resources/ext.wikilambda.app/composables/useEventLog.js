/*!
 * Event logging composable for Vue 3 Composition API.
 * Provides functions to handle event logging
 *
 * @module ext.wikilambda.app.composables.useEventLog
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const eventLogUtils = require( '../utils/eventLogUtils.js' );

/**
 * Event logging composable
 *
 * @return {Object} Event logging composable API
 */
module.exports = function useEventLog() {
	return {
		submitInteraction: eventLogUtils.submitInteraction
	};
};
