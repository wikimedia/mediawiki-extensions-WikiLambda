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
