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
			/**
			 * Validate if a string is a valid global Key
			 *
			 * @param {string} key
			 * @return {boolean}
			 */
			isGlobalKey: function ( key ) {
				return /^Z\d+K\d+$/.test( key );
			},
			/**
			 * Get the Zid part of a global Key
			 *
			 * @param {string} key
			 * @return {string}
			 */
			getZidOfGlobalKey: function ( key ) {
				return key.split( 'K' )[ 0 ];
			},
			/**
			 * Get the Z3/Key object given a key string
			 * from a list of Z3/Key items
			 *
			 * @param {string} key
			 * @param {Array} list
			 * @return {Object}
			 */
			getKeyFromKeyList: function ( key, list ) {
				return list.find( function ( item ) {
					return ( item[ Constants.Z_KEY_ID ] === key );
				} );
			},
			/**
			 * Get the Z17/Argument object given a key string
			 * from a list of Z17/Argument items
			 *
			 * @param {string} key
			 * @param {Array} list
			 * @return {Object}
			 */
			getArgFromArgList: function ( key, list ) {
				return list.find( function ( item ) {
					return ( item[ Constants.Z_ARGUMENT_KEY ] === key );
				} );
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

			/**
			 * Determine if a key indicates a typed list type.
			 *
			 * @param {string} key
			 * @return {boolean}
			 */
			isKeyTypedListType: function ( key ) {
				return key === '0';
			},

			/**
			 * Determines if a key indicates a typed list item. This will be true when a key
			 * is a stringified number greater than 0 (0 indicates the type of a typed list)
			 *
			 * @param {string} key
			 * @return {boolean}
			 */
			isKeyTypedListItem: function ( key ) {
				const numericalKey = Number( key );
				return Number.isInteger( numericalKey ) && numericalKey > 0;
			},

			isFunctionItemAttached( item, attachedItems ) {
				return attachedItems.indexOf( item ) > -1;
			},

			/**
			 * Transform the value of a Z1K1 key (object type) to a string.
			 * When the type is a reference, return the Zid of the referred type.
			 * When the type is a literal, return the stringified value of Z4K1.
			 * When the type is a function call, return the function ID and the arguments in
			 * brackets.
			 *
			 * TODO (T328639): Write tests
			 *
			 * @param {Object|string} type
			 * @return {string}
			 */
			typeToString: function ( type ) {
				if ( typeof type === 'string' ) {
					return type;
				} else {
					const mode = typeUtils.methods.typeToString( type[ Constants.Z_OBJECT_TYPE ] );
					let typeString,
						typeStringParam1, // used for typed lists and typed pairs
						typeStringParam2; // used for typed pairs

					switch ( mode ) {
						case Constants.Z_REFERENCE:
							typeString = type[ Constants.Z_REFERENCE_ID ];
							break;

						case Constants.Z_FUNCTION_CALL:
							if ( type[ Constants.Z_FUNCTION_CALL_FUNCTION ] === Constants.Z_TYPED_LIST ) {
								// if function is a typed list
								typeStringParam1 = type[ Constants.Z_TYPED_LIST_TYPE ];
								typeString = typeStringParam1 ?
									`${type[ Constants.Z_FUNCTION_CALL_FUNCTION ]}(${typeStringParam1})` :
									type[ Constants.Z_FUNCTION_CALL_FUNCTION ];
							} else if ( type[ Constants.Z_FUNCTION_CALL_FUNCTION ] === Constants.Z_TYPED_PAIR ) {
								// if function is a typed pair
								typeStringParam1 = type[ Constants.Z_TYPED_PAIR_TYPE1 ];
								typeStringParam2 = type[ Constants.Z_TYPED_PAIR_TYPE2 ];
								typeString = typeStringParam1 && typeStringParam2 ?
									`${type[ Constants.Z_FUNCTION_CALL_FUNCTION ]}(${typeStringParam1},${typeStringParam2})` :
									type[ Constants.Z_FUNCTION_CALL_FUNCTION ];
							} else {
								typeString = type[ Constants.Z_FUNCTION_CALL_FUNCTION ];
							}
							break;

						case Constants.Z_TYPE:
							typeString = type[ Constants.Z_TYPE_IDENTITY ];
							break;

						case Constants.Z_ARGUMENT_REFERENCE:
							typeString = type[ Constants.Z_ARGUMENT_REFERENCE_KEY ];
							break;

						default:
							typeString = undefined;
					}

					return ( typeof typeString === 'object' ) ?
						typeUtils.methods.typeToString( typeString ) :
						typeString;
				}
			},

			/**
			 * Parse the type from a typed list string
			 * Ex: 'Z881(Z11)' will return 'Z11'
			 *
			 *
			 * @param {string} typeString
			 * @return {string}
			 */
			typedListStringToType: function ( typeString ) {
				// not guaranteed to be defined as a Z881
				if ( typeString.indexOf( Constants.Z_TYPED_LIST ) > -1 ) {
					const regExp = /\(([^)]+)\)/;
					return regExp.exec( typeString )[ 1 ];
				}
				return typeString;
			},

			/**
			 * Return the empty structure of builtin types that we will
			 * create when creating these types in the interface.
			 *
			 * The way these scaffoldings are created also determines whether
			 * certain sub-types are initiated as literals or as references
			 * (E.g. Z11K1, monolingual language, is preferred as a reference
			 * to a Z60 than as a literal, so when creating the scaffolding
			 * we give the structure of an empty reference)
			 *
			 * FIXME: Once we deprecate the old code from changeType, getScaffolding
			 * should not return undefined, but have the Empty object (Z1) return as
			 * default case.
			 *
			 * @param {string} type
			 * @return {Object|Array}
			 */
			getScaffolding: function ( type ) {
				switch ( type ) {
					case Constants.Z_OBJECT:
						// Empty object:
						// {
						//  Z1K1: { Z1K1: Z9, Z9K1: '' }
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							}
						};
					case Constants.Z_STRING:
						// Empty object:
						// {
						//  Z1K1: { Z1K1: Z6, Z6K1: '' }
						// }
						return '';

					case Constants.Z_MONOLINGUALSTRING:
						// Empty monolingual string:
						// {
						//  Z1K1: Z11
						//  Z11K1: { Z1K1: Z9, Z9K1: '' }
						//  Z11K2: { Z1K1: Z6, Z6K1: '' }
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
							[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							},
							[ Constants.Z_MONOLINGUALSTRING_VALUE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
								[ Constants.Z_STRING_VALUE ]: ''
							}
						};

					default:
						return undefined;
				}
			}
		}
	};

module.exports = typeUtils;
