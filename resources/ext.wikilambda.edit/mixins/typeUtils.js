/**
 * WikiLambda Vue editor: typeUtils mixin
 * Mixin with util functions to handle types and initial values.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Constants = require( '../Constants.js' ),
	typeUtils = {
		methods: {
			/**
			 * Gets the key type given its initial value.
			 *
			 * @param {Object|Array|string} value
			 * @return {string}
			 */
			getZObjectType: function ( value ) {
				if ( !value ) {
					return Constants.Z_STRING;
				} else if ( typeof ( value ) === 'object' ) {
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
			 * Find a specific Key within an array of object
			 *
			 * @param {string} key
			 * @param {Array} array
			 * @return {Object}
			 */
			findKeyInArray: function ( key, array ) {

				if ( Array.isArray( key ) ) {
					return key.map( function ( k ) {
						return typeUtils.methods.findKeyInArray( k, array );
					} )
						.filter( function ( result ) {
							return !!result;
						} )[ 0 ] || false;
				} else {
					var result = array.filter( function ( item ) {
						return item.key === key;
					} );

					if ( result.length === 0 ) {
						return false;
					} else {
						return result[ 0 ];
					}
				}
			},
			/**
			 * Validate if a string is a valid Zid
			 *
			 * @param {string} zid
			 * @return {boolean}
			 */
			isValidZidFormat: function ( zid ) {
				return /^Z\d+$/.test( zid );
			}
		}
	};

module.exports = typeUtils;
