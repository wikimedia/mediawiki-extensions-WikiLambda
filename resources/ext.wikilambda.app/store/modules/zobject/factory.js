/*!
 * WikiLambda Vuex code to interact with the store to create new ZObjects by their type.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
const Constants = require( '../../../Constants.js' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ).methods,
	extractZIDs = require( '../../../mixins/schemata.js' ).methods.extractZIDs,
	url = require( '../../../mixins/urlUtils.js' ).methods;

/* eslint-disable no-unused-vars */
module.exports = exports = {
	getters: {
		/**
		 * Return a blank object for a given type, and initialize its
		 * values if the payload contains the required initialization data.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		createObjectByType: function ( _state, getters ) {
			/**
			 * @param {Object} payload
			 * @param {string} payload.type the type of the new object to add
			 * @param {number} payload.id the parent rowId for the new object
			 * @param {Object} payload.value initialization values
			 * @param {boolean} payload.append whether to append the new zobject to a list
			 * @param {boolean} payload.literal force create a literal object: on root initialization and
			 * mode selector explicit request
			 * @param {Array} keyList a list of types that have been seen so far
			 * @return {Object}
			 */
			function newObjectByType( payload, keyList = [] ) {
				// If payload.literal is true, we are forcing creating a literal
				// object for those types that are generally persisted and linked.
				// We force literal when:
				// * initializing a new root ZObject
				// * the mode selector explicitly requests literal
				// * it has a builtin component even if it's an enum
				// We default to references for LINKED_TYPES and Enums when:
				// * initializing function arguments
				// * initializing key values
				// * adding new items to a list
				if ( keyList.includes( payload.type ) || ( !payload.literal && (
					Constants.LINKED_TYPES.includes( payload.type ) ||
					getters.isCustomEnum( payload.type )
				) ) ) {
					return getters.createZReference( payload );
				}

				// Unset payload.literal for recursive calls
				delete payload.literal;

				keyList.push( payload.type );

				// If payload.type is an object, we are looking at a generic type,
				// so a type returned by a function call. Transform the payload for
				// the spacail cases: List, Pair and Map
				if ( typeUtils.isGenericType( payload.type ) ) {
					if ( payload.type[ Constants.Z_FUNCTION_CALL_FUNCTION ] === Constants.Z_TYPED_LIST ) {
						const newPayload = JSON.parse( JSON.stringify( payload ) );
						newPayload.type = Constants.Z_TYPED_LIST;
						newPayload.value = payload.type[ Constants.Z_TYPED_LIST_TYPE ];
						return getters.createObjectByType( newPayload, keyList );
					}
				}

				switch ( payload.type ) {
					case Constants.Z_REFERENCE:
						return getters.createZReference( payload );
					case Constants.Z_STRING:
						return getters.createZString( payload );
					case Constants.Z_BOOLEAN:
						return getters.createZBoolean( payload );
					case Constants.Z_MULTILINGUALSTRING:
						return getters.createZMultilingualString( payload );
					case Constants.Z_MONOLINGUALSTRING:
						return getters.createZMonolingualString( payload );
					case Constants.Z_MONOLINGUALSTRINGSET:
						return getters.createZMonolingualStringSet( payload );
					case Constants.Z_ARGUMENT:
						return getters.createZArgument( payload );
					case Constants.Z_FUNCTION_CALL:
						return getters.createZFunctionCall( payload );
					case Constants.Z_FUNCTION:
						return getters.createZFunction( payload );
					case Constants.Z_PERSISTENTOBJECT:
						return getters.createZPersistentObject( payload );
					case Constants.Z_TYPE:
						return getters.createZType( payload );
					case Constants.Z_IMPLEMENTATION:
						return getters.createZImplementation( payload );
					case Constants.Z_CODE:
						return getters.createZCode( payload );
					case Constants.Z_TESTER:
						return getters.createZTester( payload );
					case Constants.Z_TYPED_LIST:
						return getters.createZTypedList( payload );
					case Constants.Z_TYPED_PAIR:
						return getters.createZTypedPair( payload );
					case Constants.Z_TYPED_MAP:
						return getters.createZTypedMap( payload );
					case Constants.Z_WIKIDATA_ITEM:
					case Constants.Z_WIKIDATA_LEXEME:
					case Constants.Z_WIKIDATA_LEXEME_FORM:
					case Constants.Z_WIKIDATA_PROPERTY:
						return getters.createWikidataEntity( payload );
					default:
						// Explore and create new ZObject keys
						return getters.createGenericObject( payload, keyList );
				}
			}
			return newObjectByType;
		},

		/**
		 * Return a blank generic object for a given type. If the
		 * type is a reference and the persisted object is known,
		 * initialize all its keys. Else simply return the type field.
		 * The entry will result in a json representation equal to:
		 * {
		 *  Z1K1: 'Zx'
		 *  ZxK1: ''
		 * }
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		createGenericObject: function ( _state, getters ) {
			/**
			 * @param {Object} payload
			 * @param {string} payload.type
			 * @param {Array} keyList a list of types that have been seen so far
			 * @return {Object}
			 */
			function newGenericObject( payload, keyList = [] ) {
				const persisted = getters.getStoredObject( payload.type );
				const value = {
					[ Constants.Z_OBJECT_TYPE ]: payload.type
				};
				keyList.push( payload.type );
				if ( persisted ) {
					const zobject = persisted[ Constants.Z_PERSISTENTOBJECT_VALUE ];
					if ( zobject[ Constants.Z_OBJECT_TYPE ] === Constants.Z_TYPE ) {
						const keys = zobject[ Constants.Z_TYPE_KEYS ];
						for ( let i = 1; i < keys.length; i++ ) {
							const key = keys[ i ];

							// Create a reference to self it the key is the identity key of the root object
							const isIdentityKey = !payload.isRoot ? false : (
								typeUtils.isTruthyOrEqual( key, [
									Constants.Z_KEY_IS_IDENTITY
								], Constants.Z_BOOLEAN_TRUE ) ||
								typeUtils.isTruthyOrEqual( key, [
									Constants.Z_KEY_IS_IDENTITY,
									Constants.Z_BOOLEAN_IDENTITY
								], Constants.Z_BOOLEAN_TRUE )
							);
							const keyPayload = isIdentityKey ?
								{ type: Constants.Z_REFERENCE, value: getters.getCurrentZObjectId } :
								typeUtils.initializePayloadForType( key[ Constants.Z_KEY_TYPE ] );

							// We must pass keyList array by value in here, so that the types found in an argument
							// branch don't affect another branch, it should only restrict repetition in depth.
							const blankValue = getters.createObjectByType( keyPayload, keyList.slice() );
							value[ key[ Constants.Z_KEY_ID ] ] = blankValue;
						}
					}
				}
				return value;
			}
			return newGenericObject;
		},

		/**
		 * Return a blank and initialized zPersistentObject.
		 * The value will result in a json representation equal to:
		 * {
		 *  Z1K1: { Z1K1: 'Z9', Z9K1: 'Z2' },
		 *  Z2K1: { Z1K1: 'Z9', Z9K1: 'Z0' },
		 *  Z2K2: {
		 *   Z1K1: { Z1K1: 'Z9', Z9K1: '' }
		 *  },
		 *  Z2K3: {
		 *   Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' }
		 *   Z12K1: [ Z11 ]
		 *  },
		 *  Z2K4: {
		 *   Z1K1: { Z1K1: 'Z9', Z9K1: 'Z32' }
		 *   Z32K1: [ Z31 ]
		 *  }
		 * }
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		createZPersistentObject: function ( _state, getters ) {
			/**
			 * @param {Object} _payload
			 * @param {number} _payload.id
			 * @param {boolean} _payload.append
			 * @return {Object}
			 */
			function newZPersistentObject( _payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_PERSISTENTOBJECT );
				// Initialize persistent zid and blank label
				const zid = getters.getCurrentZObjectId || Constants.NEW_ZID_PLACEHOLDER;
				value[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ] = zid;
				if ( getters.getUserLangZid ) {
					const mono = typeUtils.getScaffolding( Constants.Z_MONOLINGUALSTRING );
					mono[ Constants.Z_MONOLINGUALSTRING_VALUE ] = '';
					mono[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][
						Constants.Z_REFERENCE_ID ] = getters.getUserLangZid;
					value[ Constants.Z_PERSISTENTOBJECT_LABEL ][
						Constants.Z_MULTILINGUALSTRING_VALUE ].push( mono );
				}
				return value;
			}
			return newZPersistentObject;
		},

		/**
		 * Return a blank and initialized zMonolingualString.
		 * The value will result in a json representation equal to:
		 * {
		 *  Z1K1: Z11,
		 *  Z11K1: { Z1K1: Z9, Z9K1: payload.lang },
		 *  Z11K2: { Z1K1: Z6, Z6K1: '' }
		 * }
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		createZMonolingualString: function ( _state, getters ) {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value string value of the monolingual string
			 * @param {string} payload.lang zid of the language for the monolingual string
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			function newZMonolingualString( payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_MONOLINGUALSTRING );
				// Initialize monolingual string
				const lang = payload.lang || '';
				value[ Constants.Z_MONOLINGUALSTRING_VALUE ] = payload.value || '';
				value[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_REFERENCE_ID ] = lang;
				return value;
			}
			return newZMonolingualString;
		},

		/**
		 * Return a blank and initialized zMonolingualStringSet.
		 * The value will result in a json representation equal to:
		 * {
		 *  Z1K1: Z31,
		 *  Z31K1: { Z1K1: Z9, Z9K1: payload.lang },
		 *  Z31K2: [ 'Z6', { Z1K1: Z6, Z6K1: payload.value } ]
		 * }
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		createZMonolingualStringSet: function ( _state, getters ) {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {Array} payload.value Array list of strings for the list
			 * @param {string} payload.lang zid of the language for the first monolingual string
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			function newZMonolingualStringSet( payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_MONOLINGUALSTRINGSET );
				// Initialize language and first string
				const lang = payload.lang || '';
				value[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ][ Constants.Z_REFERENCE_ID ] = lang;
				if ( payload.value ) {
					payload.value.forEach( ( stringValue ) => {
						value[ Constants.Z_MONOLINGUALSTRINGSET_VALUE ].push( stringValue );
					} );
				}
				return value;
			}
			return newZMonolingualStringSet;
		},

		/**
		 * Return a blank and initialized zMulilingualString.
		 * The value will result in a json representation equal to:
		 * {
		 *  Z1K1: Z12,
		 *  Z12K1: [
		 *   Z11,
		 *   { Z1K1: Z11, Z11K1: '', Z11K2: '' }
		 *  ]
		 * }
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		createZMultilingualString: function ( _state, getters ) {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value string value of the first monolingual string
			 * @param {string} payload.lang zid of the language for the first monolingual string
			 * @param {number} payload.append
			 * @return {Object}
			 */
			function newZMultilingualString( payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_MULTILINGUALSTRING );
				// Initialize first monolingual string if there's any lang or value
				if ( ( 'lang' in payload ) || ( 'value' in payload ) ) {
					const mono = typeUtils.getScaffolding( Constants.Z_MONOLINGUALSTRING );
					const lang = payload.lang || getters.getUserLangZid;
					mono[ Constants.Z_MONOLINGUALSTRING_VALUE ] = payload.value || '';
					mono[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_REFERENCE_ID ] = lang;
					value[ Constants.Z_MULTILINGUALSTRING_VALUE ].push( mono );
				}
				return value;
			}
			return newZMultilingualString;
		},

		/**
		 * Return a blank and initialized zString
		 * The value will result in a json representation equal to:
		 * { Z1K1: Z6, Z6K1: payload.value }
		 *
		 * @param {Object} _state
		 * @return {Function}
		 */
		createZString: function ( _state ) {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			function newZString( payload ) {
				// No need to get scaffolding, the value is a canonical string, so
				// either it's a blank string or a string with a value.
				return payload.value || '';
			}
			return newZString;
		},

		/**
		 * Return a blank and initialized zReference.
		 * The value will result in a json representation equal to:
		 * { Z1K1: Z9, Z9K1: payload.value }
		 *
		 * @param {Object} _state
		 * @return {Function}
		 */
		createZReference: function ( _state ) {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			function newZReference( payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_REFERENCE );
				// Initialize values, if any
				value[ Constants.Z_REFERENCE_ID ] = payload.value || '';
				return value;
			}
			return newZReference;
		},

		/**
		 * Return a blank and initialized zBoolean.
		 * The value will result in a json representation equal to:
		 * {
		 *   Z1K1: Z40,
		 *   Z40K1: { Z1K1: Z9, Z9K1: payload.value }
		 * }
		 *
		 * @param {Object} _state
		 * @return {Function}
		 */
		createZBoolean: function ( _state ) {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			function newZBoolean( payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_BOOLEAN );
				// Initialize value with the boolean Zid, if any
				value[ Constants.Z_BOOLEAN_IDENTITY ][ Constants.Z_REFERENCE_ID ] = payload.value || '';
				return value;
			}
			return newZBoolean;
		},

		/**
		 * Return a blank and initialized zType.
		 * The value will result in a json representation equal to:
		 * {
		 *  Z1K1: 'Z4',
		 *  Z4K1: { Z1K1: 'Z9', Z9K1: 'Z0' },
		 *  Z4K2: [ 'Z3' ]
		 *  Z4K3: { Z1K1: 'Z9', Z9K1: 'Z101' }
		 * }
		 *
		 * @param {Object} _state
		 * @return {Function}
		 */
		createZType: function ( _state ) {
			/**
			 * @param {Object} _payload
			 * @param {number} _payload.id
			 * @param {number} _payload.append
			 * @return {Object}
			 */
			function newZType( _payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_TYPE );
				// Initialize validator function
				value[ Constants.Z_TYPE_VALIDATOR ][ Constants.Z_REFERENCE_ID ] = Constants.Z_VALIDATE_OBJECT;
				return value;
			}
			return newZType;
		},

		/**
		 * Return a blank and initialized zArgument.
		 * The value will result in a json representation equal to:
		 * {
		 *  Z1K1: 'Z17',
		 *  Z17K1: { Z1K1: 'Z9', Z9K1: '' },
		 *  Z17K2: { Z1K1: 'Z6', Z6K1: 'Z0K1' },
		 *  Z17K3: { Z1K1: 'Z12', Z12K1: [ Z11 ] }
		 * }
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		createZArgument: function ( _state, getters ) {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			function newZArgument( payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_ARGUMENT );
				// Initialize argument key
				value[ Constants.Z_ARGUMENT_KEY ] = payload.value || getters.getNextKey;
				return value;
			}
			return newZArgument;
		},

		/**
		 * Return a blank and initialized zFunctionCall.
		 * The value will result in a json representation equal to:
		 * { Z1K1: Z7, Z7K1: '' }
		 *
		 * @param {Object} _state
		 * @return {Function}
		 */
		createZFunctionCall: function ( _state ) {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value Zid of the function to call
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			function newZFunctionCall( payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_FUNCTION_CALL );
				// Initialize function zid
				value[ Constants.Z_FUNCTION_CALL_FUNCTION ][ Constants.Z_REFERENCE_ID ] = payload.value || '';
				return value;
			}
			return newZFunctionCall;
		},

		/**
		 * Return a blank and initialized zImplementation.
		 * The value will result in a json representation equal to:
		 * {
		 *  Z1K1: 'Z14',
		 *  Z14K1: { Z1K1: 'Z9', Z9K1: '' },
		 *  Z14K2: { Z1K1: 'Z7', Z7K1: '' },
		 * }
		 *
		 * @param {Object} _state
		 * @return {Function}
		 */
		createZImplementation: function ( _state ) {
			/**
			 * @param {Object} _payload
			 * @param {number} _payload.id
			 * @param {boolean} _payload.append
			 * @return {Object}
			 */
			function newZImplementation( _payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_IMPLEMENTATION );
				// Initialize function zid from the url parameters
				const functionZid = url.getParameterByName( Constants.Z_IMPLEMENTATION_FUNCTION ) || '';
				value[ Constants.Z_IMPLEMENTATION_FUNCTION ][ Constants.Z_REFERENCE_ID ] = functionZid;
				return value;
			}
			return newZImplementation;
		},

		/**
		 * Return a blank and initialized zCode.
		 * The value will result in a json representation equal to:
		 *
		 * {
		 *  Z1K1: 'Z16'
		 *  Z16K1: { Z1K1: 'Z9', Z9K1: '' },
		 *  Z16K2: ''
		 * }
		 *
		 * @param {Object} _state
		 * @return {Function}
		 */
		createZCode: function ( _state ) {
			/**
			 * @param {Object} _payload
			 * @param {number} _payload.id
			 * @param {boolean} _payload.append
			 * @return {Object}
			 */
			function newZCode( _payload ) {
				// Get scaffolding
				return typeUtils.getScaffolding( Constants.Z_CODE );
			}
			return newZCode;
		},

		/**
		 * Return a blank and initialized zFunction.
		 * The value will result in a json representation equal to:
		 * {
		 *  Z1K1: 'Z8',
		 *  Z8K1: [ 'Z17' ],
		 *  Z8K2: { Z1K1: 'Z9', Z9K1: '' },
		 *  Z8K3: [ 'Z20' ],
		 *  Z8K4: [ 'Z14' ],
		 *  Z8K5: { Z1K1: 'Z9', Z9K1: '' },
		 * }
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		createZFunction: function ( _state, getters ) {
			/**
			 * @param {Object} _payload
			 * @param {number} _payload.id
			 * @param {boolean} _payload.append
			 * @return {Object}
			 */
			function newZFunction( _payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_FUNCTION );
				const arg = typeUtils.getScaffolding( Constants.Z_ARGUMENT );
				// Initialize function identity and one empty argument
				const functionZid = getters.getCurrentZObjectId || Constants.NEW_ZID_PLACEHOLDER;
				value[ Constants.Z_FUNCTION_IDENTITY ][ Constants.Z_REFERENCE_ID ] = functionZid;
				arg[ Constants.Z_ARGUMENT_KEY ] = `${ functionZid }K1`;
				value[ Constants.Z_FUNCTION_ARGUMENTS ].push( arg );
				return value;
			}
			return newZFunction;
		},

		/**
		 * Return a blank and initialized zTester.
		 * The value will result in a json representation equal to:
		 * {
		 *  Z1K1: 'Z20',
		 *  Z20K1: { Z1K1: 'Z9', Z9K1: '' }
		 *  Z20K2: {
		 *   Z1K1: 'Z7',
		 *   Z7K1: { Z1K1: 'Z9', Z9K1: '' }
		 *  },
		 *  Z20K3: {
		 *   Z1K1: 'Z7',
		 *   Z7K1: { Z1K1: 'Z9', Z9K1: '' }
		 *  }
		 * }
		 *
		 * @param {Object} _state
		 * @return {Function}
		 */
		createZTester: function ( _state ) {
			/**
			 * @param {Object} _payload
			 * @param {number} _payload.id
			 * @param {boolean} _payload.append
			 * @return {Object}
			 */
			function newZTester( _payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_TESTER );

				// Initialize function zid from the url parameters
				const functionZid = url.getParameterByName( Constants.Z_TESTER_FUNCTION ) || '';
				value[ Constants.Z_TESTER_FUNCTION ][ Constants.Z_REFERENCE_ID ] = functionZid;
				return value;
			}
			return newZTester;
		},

		/**
		 * Return a blank and initialized zTypedList.
		 * The value will result in a json representation equal to:
		 * [ 'Z1' ]
		 *
		 * @param {Object} _state
		 * @return {Function}
		 */
		createZTypedList: function ( _state ) {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			function newZTypedList( payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_TYPED_LIST );
				// Initialize function zid from the url parameters
				value[ 0 ][ Constants.Z_REFERENCE_ID ] = payload.value || Constants.Z_OBJECT;
				return value;
			}
			return newZTypedList;
		},

		/**
		 * Return a blank and initialized zTypedPair.
		 * The value will result in a json representation equal to:
		 * {
		 *  Z1K1: {
		 *   Z1K1: Z7,
		 *   Z7K1: Z882,
		 *   Z882K1: { Z1K1: Z9, Z9K1: '' }
		 *   Z882K2: { Z1K1: Z9, Z9K1: '' }
		 *  },
		 *  K1: {}
		 *  K2: {}
		 * }
		 *
		 * @param {Object} _state
		 * @return {Function}
		 */
		createZTypedPair: function ( _state ) {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {Object} payload.values
			 * @param {boolean} payload.isDeclaration This is used know if the values need to be initialized or not
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			function newZTypedPair( payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_TYPED_PAIR );
				// Initialize typed pair types
				const type1 = payload.values ? payload.values[ 0 ] : '';
				const type2 = payload.values ? payload.values[ 1 ] : '';
				const value1 = type1 ? typeUtils.getScaffolding( type1 ) : {};
				const value2 = type2 ? typeUtils.getScaffolding( type2 ) : {};
				value[ Constants.Z_OBJECT_TYPE ][ Constants.Z_TYPED_PAIR_TYPE1 ][ Constants.Z_REFERENCE_ID ] = type1;
				value[ Constants.Z_OBJECT_TYPE ][ Constants.Z_TYPED_PAIR_TYPE2 ][ Constants.Z_REFERENCE_ID ] = type2;
				value[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ] = value1;
				value[ Constants.Z_TYPED_OBJECT_ELEMENT_2 ] = value2;
				return value;
			}
			return newZTypedPair;
		},

		/**
		 * Return a blank and initialized zTypedMap.
		 * The value will result in a json representation equal to:
		 * {
		 *  Z1K1: {
		 *   Z1K1: Z7,
		 *   Z7K1: Z883,
		 *   Z883K1: { Z1K1: Z9, Z9K1: '' }
		 *   Z883K2: { Z1K1: Z9, Z9K1: '' }
		 *  }
		 * }
		 *
		 * @param {Object} _state
		 * @return {Function}
		 */
		createZTypedMap: function ( _state ) {
			/**
			 * @param {Object} payload
			 * @param {string} payload.values
			 * @param {number} payload.id
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			function newZTypedMap( payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_TYPED_MAP );

				// Initialize typed pair types
				const type1 = payload.values ? payload.values[ 0 ] : '';
				const type2 = payload.values ? payload.values[ 1 ] : '';
				value[ Constants.Z_OBJECT_TYPE ][ Constants.Z_TYPED_MAP_TYPE1 ][ Constants.Z_REFERENCE_ID ] = type1;
				value[ Constants.Z_OBJECT_TYPE ][ Constants.Z_TYPED_MAP_TYPE2 ][ Constants.Z_REFERENCE_ID ] = type2;
				return value;
			}
			return newZTypedMap;
		},

		/**
		 * Return a blank and initialized Wikidata Entity Fetch function call.
		 * The value will result in a json representation equal to:
		 * {
		 *  Z1K1: {
		 *   Z1K1: Z7,
		 *   Z7K1: <Wikidata Fetch Function>,
		 *   <Wikidata Fetch Function Id>: {
		 *     Z1K1: <Wikidata Reference Type>,
		 *     <Wikidata Reference Type Id>: { Z1K1: Z6, Z6K1: '' }
		 *    }
		 *  }
		 * }
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		createWikidataEntity: function ( _state, getters ) {
			/**
			 * @param {Object} payload
			 * @param {string} payload.type
			 * @return {Object}
			 */
			function newWikidataEntity( payload ) {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_FUNCTION_CALL );
				let wdRef, wdFetch, wdFetchId;

				// Set to Wikidata Entity fetch function call:
				switch ( payload.type ) {
					// Wikidata Lexeme Form:
					case Constants.Z_WIKIDATA_LEXEME_FORM:
						wdRef = getters.createObjectByType( { type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM } );
						wdFetch = Constants.Z_WIKIDATA_FETCH_LEXEME_FORM;
						wdFetchId = Constants.Z_WIKIDATA_FETCH_LEXEME_FORM_ID;

						value[ Constants.Z_FUNCTION_CALL_FUNCTION ] = wdFetch;
						value[ wdFetchId ] = wdRef;
						return value;

					// Wikidata Lexeme
					case Constants.Z_WIKIDATA_LEXEME:
						wdRef = getters.createObjectByType( { type: Constants.Z_WIKIDATA_REFERENCE_LEXEME } );
						wdFetch = Constants.Z_WIKIDATA_FETCH_LEXEME;
						wdFetchId = Constants.Z_WIKIDATA_FETCH_LEXEME_ID;

						value[ Constants.Z_FUNCTION_CALL_FUNCTION ] = wdFetch;
						value[ wdFetchId ] = wdRef;
						return value;

					// Wikidata Item
					case Constants.Z_WIKIDATA_ITEM:
						wdRef = getters.createObjectByType( { type: Constants.Z_WIKIDATA_REFERENCE_ITEM } );
						wdFetch = Constants.Z_WIKIDATA_FETCH_ITEM;
						wdFetchId = Constants.Z_WIKIDATA_FETCH_ITEM_ID;

						value[ Constants.Z_FUNCTION_CALL_FUNCTION ] = wdFetch;
						value[ wdFetchId ] = wdRef;
						return value;

					// Wikidata Property
					case Constants.Z_WIKIDATA_PROPERTY:
						wdRef = getters.createObjectByType( { type: Constants.Z_WIKIDATA_REFERENCE_PROPERTY } );
						wdFetch = Constants.Z_WIKIDATA_FETCH_PROPERTY;
						wdFetchId = Constants.Z_WIKIDATA_FETCH_PROPERTY_ID;

						value[ Constants.Z_FUNCTION_CALL_FUNCTION ] = wdFetch;
						value[ wdFetchId ] = wdRef;
						return value;

					// TODO: Future Wikidata integrations
					// case Constants.Z_WIKIDATA_STATEMENT:
					// case Constants.Z_WIKIDATA_LEXEME_SENSE:
					default:
						return value;
				}
			}
			return newWikidataEntity;
		}
	},
	actions: {
		/**
		 * Changes the type, inserts or append a specific zObject given its type.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.type the type of the new object to add
		 * @param {number} payload.id the parent rowId for the new object
		 * @param {boolean} payload.append whether to append the new zobject to a list
		 * @param {Object} payload.value initialization values
		 * @return {Promise}
		 */
		changeType: function ( context, payload ) {
			// Set isRoot flag if we are changing the direct child of Z2K2
			const rootRowId = context.getters.getZPersistentContentRowId();
			payload.isRoot = ( rootRowId === payload.id );

			// Build the expected value to assign
			const value = context.getters.createObjectByType( payload );

			// Asynchronously fetch the necessary zids. We don't need to wait
			// to the fetch call because these will only be needed for labels.
			const zids = extractZIDs( value );
			context.dispatch( 'fetchZids', { zids } );

			// Inject (replace or append) the value from a given row ID
			return context.dispatch( 'injectZObjectFromRowId', {
				rowId: payload.id,
				value,
				append: payload.append || false
			} );
		},

		/**
		 * Clears the type, keeping the key Z1K1 and removing all other keys
		 * given a parent rowId
		 *
		 * @param {Object} context
		 * @param {number} rowId
		 */
		clearType: function ( context, rowId ) {
			// Get children
			const children = context.getters.getChildrenByParentRowId( rowId );
			// Exclude type key
			const keys = children.filter( ( row ) => row.key !== Constants.Z_OBJECT_TYPE );
			for ( const row of keys ) {
				context.dispatch( 'removeRowChildren', { rowId: row.id, removeParent: true } );
			}
		}
	}
};
