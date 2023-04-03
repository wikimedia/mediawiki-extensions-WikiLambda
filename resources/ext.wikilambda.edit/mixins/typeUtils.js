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
			 * Ex: 'Z11' will return 'Z11'
			 *
			 * TODO (T334117): does not account for Z881(Z881(Z11)) for example
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
			 * @param {string} type
			 * @return {Object|Array}
			 */
			getScaffolding: function ( type ) {
				switch ( type ) {
					case Constants.Z_STRING:
						// Empty string: ''
						return '';

					case Constants.Z_REFERENCE:
						// Empty reference:
						// {
						//  Z1K1: Z9
						//  Z9K1: ''
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
							[ Constants.Z_REFERENCE_ID ]: ''
						};

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

					case Constants.Z_MULTILINGUALSTRING:
						// Empty monolingual string:
						// {
						//  Z1K1: Z12
						//  Z12K1: [ Z11 ]
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
							[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
								Constants.Z_MONOLINGUALSTRING
							]
						};

					case Constants.Z_MONOLINGUALSTRING:
						// Empty monolingual string:
						// {
						//  Z1K1: Z11
						//  Z11K1: { Z1K1: Z9, Z9K1: '' }
						//  Z11K2: ''
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
							[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							},
							[ Constants.Z_MONOLINGUALSTRING_VALUE ]: ''
						};

					case Constants.Z_MONOLINGUALSTRINGSET:
						// Empty monolingual string set:
						// {
						//  Z1K1: Z31,
						//  Z31K1: { Z1K1: Z9, Z9K1: payload.lang },
						//  Z31K2: [ 'Z6', { Z1K1: Z6, Z6K1: payload.value } ]
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRINGSET,
							[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							},
							[ Constants.Z_MONOLINGUALSTRINGSET_VALUE ]: [
								Constants.Z_STRING
							]
						};

					case Constants.Z_FUNCTION_CALL:
						// Empty function call:
						// {
						//  Z1K1: Z7
						//  Z7K1: { Z1K1: Z9, Z9K1: '' }
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
							[ Constants.Z_FUNCTION_CALL_FUNCTION ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							}
						};

					case Constants.Z_FUNCTION:
						// Empty function
						// {
						//  Z1K1: 'Z8',
						//  Z8K1: [ 'Z17' ],
						//  Z8K2: { Z1K1: 'Z9', Z9K1: '' },
						//  Z8K3: [ 'Z20' ],
						//  Z8K4: [ 'Z14' ],
						//  Z8K5: { Z1K1: 'Z9', Z9K1: '' },
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION,
							[ Constants.Z_FUNCTION_ARGUMENTS ]: [ Constants.Z_ARGUMENT ],
							[ Constants.Z_FUNCTION_RETURN_TYPE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							},
							[ Constants.Z_FUNCTION_TESTERS ]: [ Constants.Z_TESTER ],
							[ Constants.Z_FUNCTION_IMPLEMENTATIONS ]: [ Constants.Z_IMPLEMENTATION ],
							[ Constants.Z_FUNCTION_IDENTITY ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							}
						};

					case Constants.Z_ARGUMENT:
						// Empty argument declaration:
						// {
						//  Z1K1: 'Z17',
						//  Z17K1: { Z1K1: 'Z9', Z9K1: '' },
						//  Z17K2: { Z1K1: 'Z6', Z6K1: 'Z0K1' },
						//  Z17K3: { Z1K1: 'Z12', Z12K1: [ Z11 ] }
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_ARGUMENT,
							[ Constants.Z_ARGUMENT_TYPE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							},
							[ Constants.Z_ARGUMENT_KEY ]: '',
							[ Constants.Z_ARGUMENT_LABEL ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
								[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
									Constants.Z_MONOLINGUALSTRING
								]
							}
						};

					case Constants.Z_IMPLEMENTATION:
						// Empty implementation
						// {
						//  Z1K1: 'Z14',
						//  Z14K1: { Z1K1: 'Z9', Z9K1: '' },
						//  Z14K2: { Z1K1: 'Z7', Z7K1: '' }
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_IMPLEMENTATION,
							[ Constants.Z_IMPLEMENTATION_FUNCTION ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							},
							[ Constants.Z_IMPLEMENTATION_COMPOSITION ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
								[ Constants.Z_FUNCTION_CALL_FUNCTION ]: {
									[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
									[ Constants.Z_REFERENCE_ID ]: ''
								}
							}
						};

					case Constants.Z_TESTER:
						// Empty implementation
						// {
						//  Z1K1: 'Z20',
						//  Z20K1: { Z1K1: 'Z9', Z9K1: '' }
						//  Z20K2: {
						//   Z1K1: 'Z7',
						//   Z7K1: { Z1K1: 'Z9', Z9K1: '' }
						//  },
						//  Z20K3: {
						//   Z1K1: 'Z7',
						//   Z7K1: { Z1K1: 'Z9', Z9K1: '' }
						//  }
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_TESTER,
							[ Constants.Z_TESTER_FUNCTION ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							},
							[ Constants.Z_TESTER_CALL ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
								[ Constants.Z_FUNCTION_CALL_FUNCTION ]: {
									[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
									[ Constants.Z_REFERENCE_ID ]: ''
								}
							},
							[ Constants.Z_TESTER_VALIDATION ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
								[ Constants.Z_FUNCTION_CALL_FUNCTION ]: {
									[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
									[ Constants.Z_REFERENCE_ID ]: ''
								}
							}
						};

					case Constants.Z_PERSISTENTOBJECT:
						// Empty persistent object:
						// {
						//  Z1K1: 'Z2',
						//  Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
						//  Z2K2: undefined,
						//  Z2K3: {
						//  Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' }
						//   Z12K1: [ Z11 ]
						//  },
						//  Z2K4: {
						//   Z1K1: { Z1K1: 'Z9', Z9K1: 'Z32' }
						//   Z32K1: [ Z31 ]
						//  }
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_PERSISTENTOBJECT,
							[ Constants.Z_PERSISTENTOBJECT_ID ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
								[ Constants.Z_STRING_VALUE ]: Constants.NEW_ZID_PLACEHOLDER
							},
							[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {},
							[ Constants.Z_PERSISTENTOBJECT_LABEL ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
								[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [ Constants.Z_MONOLINGUALSTRING ]
							},
							[ Constants.Z_PERSISTENTOBJECT_ALIASES ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRINGSET,
								[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ]: [ Constants.Z_MONOLINGUALSTRINGSET ]
							}
						};

					case Constants.Z_TYPE:
						// Empty type:
						// {
						//  Z1K1: 'Z4',
						//  Z4K1: { Z1K1: 'Z9', Z9K1: 'Z0' },
						//  Z4K2: [ 'Z3' ]
						//  Z4K3: { Z1K1: 'Z9', Z9K1: '' }
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_TYPE,
							[ Constants.Z_TYPE_IDENTITY ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: Constants.NEW_ZID_PLACEHOLDER
							},
							[ Constants.Z_TYPE_KEYS ]: [ Constants.Z_KEY ],
							[ Constants.Z_TYPE_VALIDATOR ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							}
						};

					case Constants.Z_KEY:
						// Empty type:
						// {
						//  Z1K1: 'Z3',
						//  Z3K1: { Z1K1: 'Z9', Z9K1: '' },
						//  Z3K2: '',
						//  Z3K3: {
						//   Z1K1: 'Z12',
						//   Z12K1: [ 'Z11' ]
						//  }
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_TYPE,
							[ Constants.Z_KEY_TYPE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							},
							[ Constants.Z_KEY_ID ]: '',
							[ Constants.Z_KEY_LABEL ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
								[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [ Constants.Z_MONOLINGUALSTRING ]
							}
						};

					case Constants.Z_TYPED_LIST:
						// Empty typed list (canonical):
						// [ { Z1K1: 'Z9', Z9K1: '' } ]
						return [
							{
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							}
						];

					case Constants.Z_TYPED_PAIR:
						// Empty typed pair:
						// {
						//  Z1K1: {
						//   Z1K1: Z7,
						//   Z7K1: Z882,
						//   Z882K1: { Z1K1: Z9, Z9K1: '' }
						//   Z882K2: { Z1K1: Z9, Z9K1: '' }
						//  },
						//  K1: {}
						//  K2: {}
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
								[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_PAIR,
								[ Constants.Z_TYPED_PAIR_TYPE1 ]: {
									[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
									[ Constants.Z_REFERENCE_ID ]: ''
								},
								[ Constants.Z_TYPED_PAIR_TYPE2 ]: {
									[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
									[ Constants.Z_REFERENCE_ID ]: ''
								}
							},
							[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ]: {},
							[ Constants.Z_TYPED_OBJECT_ELEMENT_2 ]: {}
						};

					case Constants.Z_TYPED_MAP:
						// Empty typed map:
						// {
						//  Z1K1: {
						//   Z1K1: Z7,
						//   Z7K1: Z883,
						//   Z883K1: { Z1K1: Z9, Z9K1: '' }
						//   Z883K2: { Z1K1: Z9, Z9K1: '' }
						//  }
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
								[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_MAP,
								[ Constants.Z_TYPED_MAP_TYPE1 ]: {
									[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
									[ Constants.Z_REFERENCE_ID ]: ''
								},
								[ Constants.Z_TYPED_MAP_TYPE2 ]: {
									[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
									[ Constants.Z_REFERENCE_ID ]: ''
								}
							}
						};

					case Constants.Z_BOOLEAN:
						// Empty boolean:
						// {
						//  Z1K1: Z40
						//  Z40K1: { Z1K1: Z9, Z9K1: '' }
						// }
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_BOOLEAN,
							[ Constants.Z_BOOLEAN_IDENTITY ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							}
						};

					default:
						return undefined;
				}
			},

			/**
			 * Given the canonical representation of a type,
			 * it generates the payload that will be passed to the
			 * createObjectByType method that will create an initial
			 * scaffolding of an object of that type.
			 *
			 * This accounts for two special cases:
			 * 1) Some types are more commonly persisted and referred to rather
			 * than added literally. When these appear, we instance the
			 * scaffolding of a reference instead of a literal
			 * 2) Typed lists, pairs and maps require some special treatment
			 * to extract the value of their type keys before calling to
			 * createObjectByType
			 *
			 * @param {Object|string} keyType
			 * @return {Object}
			 */
			initializePayloadForType: function ( keyType ) {
				// We detect those types that will be added as references rather than literal objects:
				const type = Constants.LINKED_TYPES.indexOf( keyType ) > -1 ?
					Constants.Z_REFERENCE :
					keyType;
				var payload = { type };
				// We need to hardcode the initialization payload for typed list/pair/map cases:
				if ( type[ Constants.Z_FUNCTION_CALL_FUNCTION ] ) {
					const functionId = type[ Constants.Z_FUNCTION_CALL_FUNCTION ];
					switch ( functionId ) {
						case Constants.Z_TYPED_LIST:
							payload = {
								type: Constants.Z_TYPED_LIST,
								value: type[ Constants.Z_TYPED_LIST_TYPE ]
							};
							break;
						case Constants.Z_TYPED_PAIR:
							payload = {
								type: Constants.Z_TYPED_LIST,
								values: [
									type[ Constants.Z_TYPED_PAIR_TYPE1 ],
									type[ Constants.Z_TYPED_PAIR_TYPE2 ]
								]
							};
							break;
						case Constants.Z_TYPED_MAP:
							payload = {
								type: Constants.Z_TYPED_MAP,
								values: [
									type[ Constants.Z_TYPED_MAP_TYPE1 ],
									type[ Constants.Z_TYPED_MAP_TYPE2 ]
								]
							};
							break;
					}
				}
				return payload;
			}
		}
	};

module.exports = typeUtils;
