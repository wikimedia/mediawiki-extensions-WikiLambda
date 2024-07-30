/**
 * WikiLambda Vue editor: Error utils mixin
 * Mixin with util functions to handle component errors
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../Constants.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = {
	data: function () {
		return {
			localErrors: []
		};
	},
	methods: Object.assign( {}, mapActions( [
		'clearErrors'
	] ), {
		/**
		 * Set a local error for the component.
		 *
		 * @param {Object} payload
		 */
		setLocalError: function ( payload ) {
			const error = {
				type: payload.type || Constants.errorTypes.ERROR,
				code: payload.code || undefined,
				message: payload.message || undefined
			};
			this.localErrors.push( error );
		},

		/**
		 * Clear local errors.
		 * If this.rowId is associated to a field (is defined
		 * and not zero), clear the errors associated to this
		 * component.
		 */
		clearFieldErrors: function () {
			this.localErrors = [];
			if ( this.rowId && ( this.rowId > 0 ) ) {
				this.clearErrors( this.rowId );
			}
		},

		/**
		 * Returns the translated message for a given error code.
		 * Error messages can have html tags.
		 *
		 * @param {Object} error
		 * @return {string}
		 */
		getErrorMessage: function ( error ) {
			// eslint-disable-next-line mediawiki/msg-doc
			return error.message || this.$i18n( error.code ).text();
		}
	} ),
	computed: Object.assign( {}, mapGetters( [
		'getErrors'
	] ), {
		/**
		 * Returns the errors of the component rowId. This is
		 * used for field errors, not for page errors. For that
		 * reason, if rowId is 0 or not passed, it will return
		 * an empty array.
		 *
		 * @return {Array}
		 */
		fieldErrors: function () {
			const globalErrors = ( this.rowId && ( this.rowId > 0 ) ) ? this.getErrors( this.rowId ) : [];
			return globalErrors.concat( this.localErrors );
		},

		/**
		 * Returns whether the component is in an error state.
		 *
		 * @return {boolean}
		 */
		hasFieldErrors: function () {
			return ( this.fieldErrors.length > 0 );
		}
	} )
};
