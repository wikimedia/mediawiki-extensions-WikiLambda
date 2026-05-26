/*!
 * Test results composable for Vue 3 Composition API.
 * Provides utility functions related to the fetching and
 * interpretation of test test results.
 *
 * @module ext.wikilambda.app.composables.useTestResults
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { computed, inject } = require( 'vue' );
const Constants = require( '../Constants.js' );
const useMainStore = require( '../store/index.js' );
const { hasPendingMetadata } = require( '../utils/zobjectUtils.js' );

/**
 * Composable for test result status logic shared between the Function Report
 * widget in the implementation or test page, and the Tests table in the Function page
 *
 * @param {Object}
 * @param {string} params.functionZid
 * @param {string} params.testerZid
 * @param {string} params.implementationZid
 * @param {boolean} params.fetching
 * @param {Object} params.icons
 * @return {Object}
 */

module.exports = function useTestResults( {
	functionZid,
	testerZid,
	implementationZid,
	fetching = false,
	icons
} ) {
	const i18n = inject( 'i18n' );
	const store = useMainStore();

	/**
	 * Returns whether the tester passed
	 *
	 * @return {boolean|undefined}
	 */
	const testResult = computed( () => store.getZTesterResult(
		functionZid.value,
		testerZid.value,
		implementationZid.value
	) );

	/**
	 * Returns the tester metadata if stored, else returns undefined
	 *
	 * @return {Object|undefined}
	 */
	const testMetadata = computed( () => store.getZTesterMetadata(
		functionZid.value,
		testerZid.value,
		implementationZid.value
	) );

	/**
	 * Returns whether the test result is in a pending state.
	 * i.e. the metadata map contains a 'pending' key with a Z41/True value.
	 *
	 * @return {boolean}
	 */
	const isPending = computed( () => hasPendingMetadata( testMetadata.value ) );

	/**
	 * It has relevant metadata to show in the dialog only if the test
	 * was executed and returned a final response, not a pending state.
	 */
	const hasMetadata = computed( () => ( testResult.value !== undefined && !isPending.value ) );

	/**
	 * Whether the perform test API returned an error.
	 */
	const hasApiErrors = computed( () => store.getErrors( Constants.ERROR_IDS.TEST_RESULTS ).length > 0 );

	/**
	 * Returns the status of the test
	 *
	 * @return {string}
	 */
	const statusFlag = computed( () => {
		// If the fetching flag is true, means there's
		// an inflight call. Running flag takes priority:
		if ( fetching.value === true ) {
			return Constants.TESTER_STATUS.RUNNING;
		}
		if ( hasApiErrors.value ) {
			return Constants.TESTER_STATUS.API_ERROR;
		}
		// If no results and not in flight, it hasn't been started:
		if ( testResult.value === undefined ) {
			return Constants.TESTER_STATUS.READY;
		}
		// The execution returned a pending state.
		// This means there is a program job to
		// execute and cache the result.
		if ( isPending.value ) {
			return Constants.TESTER_STATUS.PENDING;
		}
		if ( testResult.value === true ) {
			return Constants.TESTER_STATUS.PASSED;
		}
		if ( testResult.value === false ) {
			return Constants.TESTER_STATUS.FAILED;
		}
		return Constants.TESTER_STATUS.READY;
	} );

	/**
	 * Returns the status message
	 *
	 * @return {string}
	 */
	const statusMessage = computed( () => {
		switch ( statusFlag.value ) {
			case Constants.TESTER_STATUS.READY:
				return i18n( 'wikilambda-tester-status-ready' ).text();
			case Constants.TESTER_STATUS.PASSED:
				return i18n( 'wikilambda-tester-status-passed' ).text();
			case Constants.TESTER_STATUS.FAILED:
				return i18n( 'wikilambda-tester-status-failed' ).text();
			case Constants.TESTER_STATUS.PENDING:
				return i18n( 'wikilambda-tester-status-pending' ).text();
			case Constants.TESTER_STATUS.API_ERROR:
				return i18n( 'wikilambda-tester-status-apierror' ).text();
			default:
				return i18n( 'wikilambda-tester-status-running' ).text();
		}
	} );

	/**
	 * Returns the icon depending on the status
	 *
	 * @return {Object}
	 */
	const statusIcon = computed( () => {
		if ( statusFlag.value === Constants.TESTER_STATUS.PASSED ) {
			return icons.passed;
		}
		if ( statusFlag.value === Constants.TESTER_STATUS.FAILED ) {
			return icons.failed;
		}
		// Show error icon or failed one if error is not different
		if ( statusFlag.value === Constants.TESTER_STATUS.API_ERROR ) {
			return icons.error || icons.failed;
		}
		// This will be used both for ready, running and pending states
		return icons.pending;
	} );

	return {
		testResult,
		testMetadata,
		hasApiErrors,
		hasMetadata,
		isPending,
		statusFlag,
		statusMessage,
		statusIcon
	};
};
