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
const { extractErrorData, cleanUpForHTML } = require( '../utils/errorUtils.js' );
const { getValueFromCanonicalZMap } = require( '../utils/schemata.js' );

module.exports = exports = {
	methods: Object.assign( {}, mapActions( useMainStore, [
		'clearErrors',
		'fetchZids'
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
		 * Raw error messages cannot have HTML tags, as they are escaped.
		 *
		 * @memberof module:ext.wikilambda.app.mixins.errorMixin
		 * @param {Object} error
		 * @return {string}
		 */
		getErrorMessage: function ( error ) {
			if ( error.message ) {
				return cleanUpForHTML( error.message );
			}
			// eslint-disable-next-line mediawiki/msg-doc
			return this.$i18n( error.code ).parse();
		},

		/**
		 * Extracts the error data from metadata, builds the error message and
		 * runs the callback function to set the error with the available error
		 * message or the fallback message if metadata error wasn't found.
		 *
		 * @memberof module:ext.wikilambda.app.mixins.errorMixin
		 * @param {Object|null} metadata - ZMap with metadata which may contain an errors key
		 * @param {string} fallbackMsg - fallback error message to set if no errors key is found
		 * @param {Function} setErrorCallback - function to set the error message when found
		 */
		setErrorMessageCallback: function ( metadata, fallbackMsg, setErrorCallback ) {
			// If metadata is null, apply fallback error and exit
			if ( !metadata ) {
				setErrorCallback( fallbackMsg );
				return;
			}

			const error = getValueFromCanonicalZMap( metadata, 'errors' );
			const errorData = extractErrorData( error );

			// If metadata doesn't have error information, apply fallback error and exit
			if ( !errorData ) {
				setErrorCallback( fallbackMsg );
				return;
			}

			// If error is Z500/generic and has a string (Z500)K1, show that as error message
			if ( errorData.errorType === Constants.Z_GENERIC_ERROR && errorData.stringArgs.length ) {
				setErrorCallback( errorData.stringArgs[ 0 ].value );
				return;
			}

			// Finally, asynchronously fetch errorType and, if fetched, set its label as error message
			this.fetchZids( { zids: [ errorData.errorType ] } ).then( () => {
				const errorMsg = this.getStoredObject( errorData.errorType ) ?
					this.getLabelData( errorData.errorType ).label :
					fallbackMsg;
				setErrorCallback( errorMsg );
			} );
		}
	} ),
	computed: Object.assign( {}, mapState( useMainStore, [
		'getStoredObject',
		'getLabelData',
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
