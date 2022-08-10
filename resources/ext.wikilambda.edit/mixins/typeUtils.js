/**
 * WikiLambda Vue editor: typeUtils mixin
 * Mixin with util functions to handle types and initial values.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
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
						return Constants.Z_TYPED_LIST;
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
				// Exit early if we got a false, a non-array, or an empty array
				if ( !key || !array || !Array.isArray( array ) || array.length === 0 ) {
					return false;
				}

				if ( Array.isArray( key ) ) {
					return key.map( function ( k ) {
						return typeUtils.methods.findKeyInArray( k, array );
					} )
						.filter( function ( filterResult ) {
							return !!filterResult;
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
			},
			zObjectToString: function ( zObject ) {
				if ( typeof zObject === 'undefined' ) {
					return '';
				}
				if ( typeof zObject === 'string' ) {
					return zObject;
				} else if ( Array.isArray( zObject ) ) {
					return '[ ' + zObject.map( typeUtils.methods.zObjectToString ).join( ', ' ) + ' ]';
				} else {
					switch ( zObject.Z1K1 ) {
						case Constants.Z_BOOLEAN:
							return zObject[ Constants.Z_BOOLEAN_IDENTITY ] === Constants.Z_BOOLEAN_TRUE;
						default:
							return JSON.stringify( zObject );
					}
				}
			},
			typedListToArray( typedList, array ) {
				array = array || [];

				for ( var item in typedList ) {
					if ( item === Constants.Z_TYPED_OBJECT_ELEMENT_1 ) {
						array.push( typedList[ item ] );
					} else if ( item === Constants.Z_TYPED_OBJECT_ELEMENT_2 ) {
						typeUtils.methods.typedListToArray( typedList[ item ], array );
					}
				}

				return array;
			},
			isFunctionItemAttached( item, unattachedItems ) {
				return unattachedItems.indexOf( item ) > -1;
			}
		}
	};

module.exports = typeUtils;
