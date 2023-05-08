/**
 * WikiLambda Vue editor: Validator mixin
 * Mixin with util functions to handle validation of input field
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = exports = {

	data: function () {
		return {
			validatorErrorMessages: [],
			validatorIsInvalid: false,
			validatorCurrentError: ''
		};
	},
	methods: {
		/**
		 * Set an error message and change valid state to invalid
		 *
		 * @param {string} error
		 */
		validatorSetError: function ( error ) {

			if ( this.validatorErrorMessages.indexOf( error ) === -1 ) {
				return;
			}

			this.validatorCurrentError = error;
			this.validatorIsInvalid = true;
		},

		/**
		 * Reset the error message and error state
		 */
		validatorResetError: function () {
			this.validatorCurrentError = '';
			this.validatorIsInvalid = false;
		}
	},

	computed: {
		validatorErrorMessage: function () {
			if ( !this.validatorCurrentError ) {
				return '';
			}

			if ( this.validatorErrorMessages.indexOf( this.validatorCurrentError ) === -1 ) {
				return '';
			}
			// eslint-disable-next-line mediawiki/msg-doc
			return this.$i18n( this.validatorCurrentError ).text();
		}
	}
};
