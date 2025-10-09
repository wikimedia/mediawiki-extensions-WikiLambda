/**
 * WikiLambda Vue editor: Share URL Mixin
 * Mixin with functions to handle shareable function call URLs
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../Constants.js' );
const { getZFunctionCallFunctionId } = require( '../utils/zobjectUtils.js' );

module.exports = exports = {
	data: function () {
		return {
			sharedFunctionCall: null,
			shareUrlError: null
		};
	},
	methods: {
		/**
		 * Loads a function call from URL parameters if present
		 *
		 * @param {string} [expectedFunctionZid] - Optional expected function ZID for validation
		 */
		loadFunctionCallFromUrl: function ( expectedFunctionZid = null ) {
			const urlParams = new URLSearchParams( window.location.search );
			const callParam = urlParams.get( 'call' );

			if ( !callParam ) {
				return;
			}

			try {
				// Decode and parse JSON
				const decodedJson = decodeURIComponent( callParam );
				const zobject = JSON.parse( decodedJson );

				// Validate that it's a function call (Z7)
				if ( !zobject || zobject[ Constants.Z_OBJECT_TYPE ] !== Constants.Z_FUNCTION_CALL ) {
					this.shareUrlError = this.$i18n( 'wikilambda-function-evaluator-share-error-invalid-structure' ).text();
					return;
				}

				// Validate the function ZID exists
				const functionZid = getZFunctionCallFunctionId( zobject );
				if ( !functionZid ) {
					this.shareUrlError = this.$i18n( 'wikilambda-function-evaluator-share-error-invalid-structure' ).text();
					return;
				}

				// If expectedFunctionZid is provided, validate that it matches
				if ( expectedFunctionZid && functionZid !== expectedFunctionZid ) {
					this.shareUrlError = this.$i18n( 'wikilambda-function-evaluator-share-error-invalid-structure' ).text();
					return;
				}

				// Set the parsed data
				this.sharedFunctionCall = zobject;

			} catch ( error ) {
				// Handle JSON parse errors
				this.shareUrlError = this.$i18n( 'wikilambda-function-evaluator-share-error-invalid-json' ).text();
			}
		}
	}
};
