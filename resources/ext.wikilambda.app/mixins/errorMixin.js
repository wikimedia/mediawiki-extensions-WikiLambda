/**
 * WikiLambda Vue editor: Error Mixin
 * Mixin with functions to handle component errors
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../Constants.js' );
const useMainStore = require( '../store/index.js' );

module.exports = exports = {
	methods: Object.assign( {}, mapActions( useMainStore, [
		'clearErrors'
	] ), {
		/**
		 * If this.keyPath is associated to a field (is defined and
		 * not at the root level), clear the errors associated to this
		 * component.
		 *
		 * @memberof module:ext.wikilambda.app.mixins.errorMixin
		 */
		clearFieldErrors: function () {
			if ( this.keyPath && ( this.keyPath !== Constants.STORED_OBJECTS.MAIN ) ) {
				this.clearErrors( this.keyPath );
			}
		},

		/**
		 * Returns the translated message for a given error code.
		 * Error messages can have html tags.
		 *
		 * @memberof module:ext.wikilambda.app.mixins.errorMixin
		 * @param {Object} error
		 * @return {string}
		 */
		getErrorMessage: function ( error ) {
			// eslint-disable-next-line mediawiki/msg-doc
			return error.message || this.$i18n( error.code ).parse();
		},

		/**
		 * Given an error response of a failed call to the API,
		 * extract the error message per type of error.
		 *
		 * @memberof module:ext.wikilambda.app.mixins.errorMixin
		 * @param {Object} error
		 * @return {string | undefined}
		 */
		extractErrorMessage: function ( error ) {
			if ( !error.zerror ) {
				return undefined;
			}

			const errorMessage = error.zerror[ Constants.Z_ERROR_VALUE ][ Constants.Z_TYPED_OBJECT_ELEMENT_1 ];
			const errorType = error.zerror[ Constants.Z_ERROR_TYPE ];
			if ( !errorMessage || typeof errorMessage !== 'string' || errorType !== Constants.Z_GENERIC_ERROR ) {
				return;
			}

			return errorMessage;
		}
	} ),
	computed: Object.assign( {}, mapState( useMainStore, [
		'getChildErrorKeys',
		'getErrors',
		'getErrorPaths'
	] ), {
		/**
		 * Returns the errors of the component keyPath.
		 *
		 * @memberof module:ext.wikilambda.app.mixins.errorMixin
		 * @return {Array}
		 */
		fieldErrors: function () {
			return ( this.keyPath && ( this.keyPath !== Constants.STORED_OBJECTS.MAIN ) ) ?
				this.getErrors( this.keyPath ) :
				[];
		},

		/**
		 * Returns whether the component is in an error state.
		 *
		 * @memberof module:ext.wikilambda.app.mixins.errorMixin
		 * @return {boolean}
		 */
		hasFieldErrors: function () {
			return ( this.fieldErrors.length > 0 );
		},

		/**
		 * Returns whether there are any errors stored
		 * for any child fields of this field.
		 *
		 * @memberof module:ext.wikilambda.app.mixins.errorMixin
		 * @return {boolean}
		 */
		hasChildErrors: function () {
			return this.keyPath ?
				this.getChildErrorKeys( this.keyPath ).length > 0 :
				false;
		}
	} )
};
