/**
 * WikiLambda Vue editor: typeUtils mixin
 * Mixin with util functions to handle types and initial values.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Constants = require( '../Constants.js' );

module.exports = {
	methods: {

		/**
		 * Gets the key type given its initial value.
		 *
		 * @param {Object|Array|string} value
		 * @return {string}
		 */
		getZObjectType: function ( value ) {
			if ( typeof ( value ) === 'object' ) {
				if ( Array.isArray( value ) ) {
					return Constants.Z_LIST;
				} else if ( Constants.Z_OBJECT_TYPE in value ) {
					return value[ Constants.Z_OBJECT_TYPE ];
				} else {
					return Constants.Z_OBJECT;
				}
			} else {
				if ( value.match( /^Z\d+$/ ) ) {
					return Constants.Z_REFERENCE;
				} else {
					return Constants.Z_STRING;
				}
			}
		},

		/**
		 * Returns the initial value for a given ZType.
		 *
		 * @param {string} type
		 * @return {Object|Array|string}
		 */
		getInitialValue: function ( type ) {
			var initialValue;
			if ( type === Constants.Z_LIST ) {
				initialValue = [];
			} else {
				initialValue = {};
				initialValue[ Constants.Z_OBJECT_TYPE ] = type;
			}
			return initialValue;
		},

		/**
		 * Returns the normalized form of a canonical ZString or a ZReference
		 * depending on the string value.
		 *
		 * @param {string} value
		 * @return {Object}
		 */
		normalizeZStringZReference: function ( value ) {
			var normalized = {};
			// If it matches ZID, normalize as a Z9 (ZReference)
			// Else, normalize as a Z6 (ZString)
			if ( value.match( /^Z\d+$/ ) ) {
				normalized[ Constants.Z_OBJECT_TYPE ] = Constants.Z_REFERENCE;
				normalized[ Constants.Z_REFERENCE_ID ] = value;
			} else {
				normalized[ Constants.Z_OBJECT_TYPE ] = Constants.Z_STRING;
				normalized[ Constants.Z_STRING_VALUE ] = value;
			}
			return normalized;
		}
	}
};
