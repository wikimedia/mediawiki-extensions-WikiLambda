/*!
 * State of the generated text of an Abstract Content fragment, shared by the
 * generated text column and the generated text under a fragment.
 *
 * @module ext.wikilambda.app.composables.useFragmentPreview
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { computed, inject } = require( 'vue' );

const Constants = require( '../Constants.js' );
const useMainStore = require( '../store/index.js' );
const ErrorData = require( '../store/classes/ErrorData.js' );

/**
 * Composable that reads the stored generated text of a fragment in the
 * preview language, and gives the state to show.
 *
 * @param {Function} getKeyPath - () => string, the keyPath of this fragment
 * @param {Function} getFragmentHash - () => string|null, the hash of this fragment
 * @return {{
 *   status: Object,
 *   fragmentPreview: Object,
 *   missingCanRetry: Object,
 *   missingLabel: Object,
 *   fragmentError: Object
 * }}
 */
module.exports = function useFragmentPreview( getKeyPath, getFragmentHash ) {
	const i18n = inject( 'i18n' );
	const store = useMainStore();

	// Fragment preview as cached by the fragmentHash:languageZid key
	const fragmentPreview = computed( () => {
		const storedPreview = store.getFragmentPreview(
			getFragmentHash(),
			store.getPreviewLanguageZid
		);
		return storedPreview || {
			isLoading: false,
			isBlank: true
		};
	} );

	// The fragment is missing so the editor should see a missing state
	const isMissing = computed( () => {
		if ( fragmentPreview.value.isLoading ) {
			return false;
		}
		return fragmentPreview.value.isBlank || fragmentPreview.value.isPending;
	} );

	// The fragment is missing and can be requested again, show retry button
	const missingCanRetry = computed( () => (
		fragmentPreview.value.isBlank ||
		fragmentPreview.value.isPending
	) );

	// Label of the missing (blank or pending) block
	const missingLabel = computed( () => ( fragmentPreview.value.isPending ?
		i18n( 'wikilambda-abstract-preview-fragment-pending' ).text() :
		i18n( 'wikilambda-abstract-preview-fragment-missing' ).text() ) );

	// Fragment error render information for the preview
	const fragmentError = computed( () => {
		if ( !fragmentPreview.value.hasError ) {
			return null;
		}
		const error = fragmentPreview.value.error;

		// Build best error message, in order of preference
		// 1. parseable error message obtained from Z50K3 and the error arguments
		// 2. if not available, use the error.code with error.params, or else the error type label, as parameter
		// 3. if not available, fall back to error.text
		let errorData;
		const parsedMessage = store.getHtmlErrorMessage( error.zid, error.zerror );
		if ( parsedMessage ) {
			errorData = ErrorData.buildErrorData( { errorMessage: parsedMessage } );
		} else if ( error.code ) {
			errorData = ErrorData.buildErrorData( {
				errorMessageKey: error.code,
				errorParams: error.params || [ store.getLabelData( error.zid ).label ]
			} );
		} else {
			errorData = ErrorData.buildErrorData( { errorMessage: error.text } );
		}

		return Object.assign( {}, error, {
			type: error.type || Constants.ERROR_TYPES.ERROR,
			message: errorData,
			// A busy service is not a problem with the fragment: no link to run it there
			replicateLink: fragmentPreview.value.isUnavailable ? null : store.getFunctionCallLink( getKeyPath() )
		} );
	} );

	// What to show: 'missing', 'loading', 'error', or 'html' for the generated text.
	// A fragment that waits for a busy rendering service keeps its notice while
	// it loads, so that the layout does not move.
	const status = computed( () => {
		if ( isMissing.value ) {
			return 'missing';
		}
		if ( fragmentPreview.value.isLoading && !fragmentPreview.value.isUnavailable ) {
			return 'loading';
		}
		if ( fragmentPreview.value.hasError ) {
			return 'error';
		}
		return 'html';
	} );

	return {
		status,
		fragmentPreview,
		missingCanRetry,
		missingLabel,
		fragmentError
	};
};
