/**
 * WikiLambda Vue editor: typeUtils mixin
 * Mixin with util functions to handle types and initial values.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = {
	methods: {
		/**
		 * Find a specific Key within an array of object
		 *
		 * @param {string} key
		 * @param {Array} array
		 * @return {Object}
		 */
		findKeyInArray: function ( key, array ) {

			var result = array.filter( function ( item ) {
				return item.key === key;
			} );

			if ( result.length === 0 ) {
				return false;
			} else {
				return result[ 0 ];
			}
		}
	}
};
