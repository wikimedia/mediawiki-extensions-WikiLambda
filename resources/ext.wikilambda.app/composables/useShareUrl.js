/*!
 * WikiLambda Vue editor: Share URL composable
 * Provides helpers to parse shareable function call URLs.
 *
 * @copyright
 */
'use strict';

const { inject, ref } = require( 'vue' );
const Constants = require( '../Constants.js' );
const { getZFunctionCallFunctionId } = require( '../utils/zobjectUtils.js' );

/**
 * Share URL composable
 *
 * @return {Object}
 */
module.exports = function useShareUrl() {
	const i18n = inject( 'i18n' );
	const sharedFunctionCall = ref( null );
	const shareUrlError = ref( null );

	/**
	 * Loads a function call from the current window location.
	 *
	 * @param {string|null} expectedFunctionZid ZID to validate against
	 */
	function loadFunctionCallFromUrl( expectedFunctionZid = null ) {
		if ( typeof window === 'undefined' ) {
			return;
		}

		const searchParams = new URLSearchParams( window.location.search );
		const callParam = searchParams.get( 'call' );

		if ( !callParam ) {
			return;
		}

		try {
			const decodedJson = decodeURIComponent( callParam );
			const zobject = JSON.parse( decodedJson );

			if ( !zobject || zobject[ Constants.Z_OBJECT_TYPE ] !== Constants.Z_FUNCTION_CALL ) {
				shareUrlError.value = i18n(
					'wikilambda-function-evaluator-share-error-invalid-structure'
				).text();
				sharedFunctionCall.value = null;
				return;
			}

			const functionZid = getZFunctionCallFunctionId( zobject );
			if ( !functionZid || ( expectedFunctionZid && functionZid !== expectedFunctionZid ) ) {
				shareUrlError.value = i18n(
					'wikilambda-function-evaluator-share-error-invalid-structure'
				).text();
				sharedFunctionCall.value = null;
				return;
			}

			sharedFunctionCall.value = zobject;
			shareUrlError.value = null;
		} catch ( error ) {
			sharedFunctionCall.value = null;
			shareUrlError.value = i18n(
				'wikilambda-function-evaluator-share-error-invalid-json'
			).text();
		}
	}

	return {
		sharedFunctionCall,
		shareUrlError,
		loadFunctionCallFromUrl
	};
};
