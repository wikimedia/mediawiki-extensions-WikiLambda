/*!
 * WikiLambda Pinia store to interact with the store to create new ZObjects by their type.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../Constants.js' );
const extractZIDs = require( '../../../mixins/schemata.js' ).methods.extractZIDs;
const typeUtils = require( '../../../mixins/typeUtils.js' ).methods;
const url = require( '../../../mixins/urlUtils.js' ).methods;

module.exports = {
	state: {},

	getters: {
		/**
		 * Return a blank object for a given type, and initialize its
		 * values if the payload contains the required initialization data.
		 *
		 * @return {Function}
		 */
		createObjectByType: function () {
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
			const generateObjectByType = ( payload, keyList = [] ) => {
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
                    this.isCustomEnum( payload.type )
				) ) ) {
					return this.createZReference( payload );
				}

				// Unset payload.literal for recursive calls
				delete payload.literal;

				keyList.push( payload.type );

				// If payload.type is an object, we are looking at a generic type,
				// so a type returned by a function call. Transform the payload for
				// the special cases: List, Pair and Map
				if ( typeUtils.isGenericType( payload.type ) ) {
					if ( payload.type[ Constants.Z_FUNCTION_CALL_FUNCTION ] === Constants.Z_TYPED_LIST ) {
						const newPayload = JSON.parse( JSON.stringify( payload ) );
						newPayload.type = Constants.Z_TYPED_LIST;
						newPayload.value = payload.type[ Constants.Z_TYPED_LIST_TYPE ];
						return this.createObjectByType( newPayload, keyList );
					}
				}

				switch ( payload.type ) {
					case Constants.Z_REFERENCE:
						return this.createZReference( payload );
					case Constants.Z_STRING:
						return this.createZString( payload );
					case Constants.Z_BOOLEAN:
						return this.createZBoolean( payload );
					case Constants.Z_MULTILINGUALSTRING:
						return this.createZMultilingualString( payload );
					case Constants.Z_MONOLINGUALSTRING:
						return this.createZMonolingualString( payload );
					case Constants.Z_MONOLINGUALSTRINGSET:
						return this.createZMonolingualStringSet( payload );
					case Constants.Z_ARGUMENT:
						return this.createZArgument( payload );
					case Constants.Z_FUNCTION_CALL:
						return this.createZFunctionCall( payload );
					case Constants.Z_FUNCTION:
						return this.createZFunction( payload );
					case Constants.Z_PERSISTENTOBJECT:
						return this.createZPersistentObject( payload );
					case Constants.Z_TYPE:
						return this.createZType( payload );
					case Constants.Z_IMPLEMENTATION:
						return this.createZImplementation( payload );
					case Constants.Z_CODE:
						return this.createZCode( payload );
					case Constants.Z_TESTER:
						return this.createZTester( payload );
					case Constants.Z_TYPED_LIST:
						return this.createZTypedList( payload );
					case Constants.Z_TYPED_PAIR:
						return this.createZTypedPair( payload );
					case Constants.Z_TYPED_MAP:
						return this.createZTypedMap( payload );
					case Constants.Z_WIKIDATA_ITEM:
					case Constants.Z_WIKIDATA_LEXEME:
					case Constants.Z_WIKIDATA_LEXEME_FORM:
					case Constants.Z_WIKIDATA_PROPERTY:
						return this.createWikidataEntity( payload );
					default:
						// Explore and create new ZObject keys
						return this.createGenericObject( payload, keyList );
				}
			};
			return generateObjectByType;
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
		 * @return {Function}
		 */
		createGenericObject: function () {
			/**
			 * @param {Object} payload
			 * @param {string} payload.type
			 * @param {Array} keyList a list of types that have been seen so far
			 * @return {Object}
			 */
			const generateGenericObject = ( payload, keyList = [] ) => {
				const persisted = this.getStoredObject( payload.type );
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
								{ type: Constants.Z_REFERENCE, value: this.getCurrentZObjectId } :
								typeUtils.initializePayloadForType( key[ Constants.Z_KEY_TYPE ] );

							// We must pass keyList array by value in here, so that the types found in an argument
							// branch don't affect another branch, it should only restrict repetition in depth.
							const blankValue = this.createObjectByType( keyPayload, keyList.slice() );
							value[ key[ Constants.Z_KEY_ID ] ] = blankValue;
						}
					}
				}
				return value;
			};
			return generateGenericObject;
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
		 * @return {Function}
		 */
		createZPersistentObject: function () {
			/**
			 * @return {Object}
			 */
			const generateZPersistentObject = () => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_PERSISTENTOBJECT );
				// Initialize persistent zid and blank label
				const zid = this.getCurrentZObjectId || Constants.NEW_ZID_PLACEHOLDER;
				value[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ] = zid;
				if ( this.getUserLangZid ) {
					const mono = typeUtils.getScaffolding( Constants.Z_MONOLINGUALSTRING );
					mono[ Constants.Z_MONOLINGUALSTRING_VALUE ] = '';
					mono[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][
						Constants.Z_REFERENCE_ID ] = this.getUserLangZid;
					value[ Constants.Z_PERSISTENTOBJECT_LABEL ][
						Constants.Z_MULTILINGUALSTRING_VALUE ].push( mono );
				}
				return value;
			};
			return generateZPersistentObject;
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
		 * @return {Function}
		 */
		createZMonolingualString: function () {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value string value of the monolingual string
			 * @param {string} payload.lang zid of the language for the monolingual string
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			const generateZMonolingualString = ( payload ) => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_MONOLINGUALSTRING );
				// Initialize monolingual string
				const lang = payload.lang || '';
				value[ Constants.Z_MONOLINGUALSTRING_VALUE ] = payload.value || '';
				value[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_REFERENCE_ID ] = lang;
				return value;
			};
			return generateZMonolingualString;
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
		 * @return {Function}
		 */
		createZMonolingualStringSet: function () {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {Array} payload.value Array list of strings for the list
			 * @param {string} payload.lang zid of the language for the first monolingual string
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			const generateZMonolingualStringSet = ( payload ) => {
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
			};
			return generateZMonolingualStringSet;
		},

		/**
		 * Return a blank and initialized zMultilingualString.
		 * The value will result in a json representation equal to:
		 * {
		 *  Z1K1: Z12,
		 *  Z12K1: [
		 *   Z11,
		 *   { Z1K1: Z11, Z11K1: '', Z11K2: '' }
		 *  ]
		 * }
		 *
		 * @return {Function}
		 */
		createZMultilingualString: function () {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value string value of the first monolingual string
			 * @param {string} payload.lang zid of the language for the first monolingual string
			 * @param {number} payload.append
			 * @return {Object}
			 */
			const generateZMultilingualString = ( payload ) => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_MULTILINGUALSTRING );
				// Initialize first monolingual string if there's any lang or value
				if ( ( 'lang' in payload ) || ( 'value' in payload ) ) {
					const mono = typeUtils.getScaffolding( Constants.Z_MONOLINGUALSTRING );
					const lang = payload.lang || this.getUserLangZid;
					mono[ Constants.Z_MONOLINGUALSTRING_VALUE ] = payload.value || '';
					mono[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_REFERENCE_ID ] = lang;
					value[ Constants.Z_MULTILINGUALSTRING_VALUE ].push( mono );
				}
				return value;
			};
			return generateZMultilingualString;
		},

		/**
		 * Return a blank and initialized zString
		 * The value will result in a json representation equal to:
		 * { Z1K1: Z6, Z6K1: payload.value }
		 *
		 * @return {Function}
		 */
		createZString: function () {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			// No need to get scaffolding, the value is a canonical string, so
			// either it's a blank string or a string with a value.
			const generateZString = ( payload ) => payload.value || '';

			return generateZString;
		},

		/**
		 * Return a blank and initialized zReference.
		 * The value will result in a json representation equal to:
		 * { Z1K1: Z9, Z9K1: payload.value }
		 *
		 * @return {Function}
		 */
		createZReference: function () {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			const generateZReference = ( payload ) => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_REFERENCE );
				// Initialize values, if any
				value[ Constants.Z_REFERENCE_ID ] = payload.value || '';
				return value;
			};
			return generateZReference;
		},

		/**
		 * Return a blank and initialized zBoolean.
		 * The value will result in a json representation equal to:
		 * {
		 *   Z1K1: Z40,
		 *   Z40K1: { Z1K1: Z9, Z9K1: payload.value }
		 * }
		 *
		 * @return {Function}
		 */
		createZBoolean: function () {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			const generateZBoolean = ( payload ) => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_BOOLEAN );
				// Initialize value with the boolean Zid, if any
				value[ Constants.Z_BOOLEAN_IDENTITY ][ Constants.Z_REFERENCE_ID ] = payload.value || '';
				return value;
			};
			return generateZBoolean;
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
		 * @return {Function}
		 */
		createZType: function () {
			/**
			 * @return {Object}
			 */
			const generateZType = () => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_TYPE );
				// Initialize validator function
				value[ Constants.Z_TYPE_VALIDATOR ][ Constants.Z_REFERENCE_ID ] = Constants.Z_VALIDATE_OBJECT;
				return value;
			};
			return generateZType;
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
		 * @return {Function}
		 */
		createZArgument: function () {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			const generateZArgument = ( payload ) => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_ARGUMENT );
				// Initialize argument key
				value[ Constants.Z_ARGUMENT_KEY ] = payload.value || this.getNextKey;
				return value;
			};
			return generateZArgument;
		},

		/**
		 * Return a blank and initialized zFunctionCall.
		 * The value will result in a json representation equal to:
		 * { Z1K1: Z7, Z7K1: '' }
		 *
		 * @return {Function}
		 */
		createZFunctionCall: function () {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value Zid of the function to call
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			const generateZFunctionCall = ( payload ) => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_FUNCTION_CALL );
				// Initialize function zid
				value[ Constants.Z_FUNCTION_CALL_FUNCTION ][ Constants.Z_REFERENCE_ID ] = payload.value || '';
				return value;
			};
			return generateZFunctionCall;
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
		 * @return {Function}
		 */
		createZImplementation: function () {
			/**
			 * @return {Object}
			 */
			const generateZImplementation = () => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_IMPLEMENTATION );
				// Initialize function zid from the url parameters
				const functionZid = url.getParameterByName( Constants.Z_IMPLEMENTATION_FUNCTION ) || '';
				value[ Constants.Z_IMPLEMENTATION_FUNCTION ][ Constants.Z_REFERENCE_ID ] = functionZid;
				return value;
			};
			return generateZImplementation;
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
		 * @return {Function}
		 */
		createZCode: function () {
			/**
			 * @return {Object}
			 */
			const generateZCode = () => typeUtils.getScaffolding( Constants.Z_CODE );
			return generateZCode;
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
		 * @return {Function}
		 */
		createZFunction: function () {
			/**
			 * @return {Object}
			 */
			const generateZFunction = () => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_FUNCTION );
				const arg = typeUtils.getScaffolding( Constants.Z_ARGUMENT );
				// Initialize function identity and one empty argument
				const functionZid = this.getCurrentZObjectId || Constants.NEW_ZID_PLACEHOLDER;
				value[ Constants.Z_FUNCTION_IDENTITY ][ Constants.Z_REFERENCE_ID ] = functionZid;
				arg[ Constants.Z_ARGUMENT_KEY ] = `${ functionZid }K1`;
				value[ Constants.Z_FUNCTION_ARGUMENTS ].push( arg );
				return value;
			};
			return generateZFunction;
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
		 * @return {Function}
		 */
		createZTester: function () {
			/**
			 * @return {Object}
			 */
			const generateZTester = () => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_TESTER );

				// Initialize function zid from the url parameters
				const functionZid = url.getParameterByName( Constants.Z_TESTER_FUNCTION ) || '';
				value[ Constants.Z_TESTER_FUNCTION ][ Constants.Z_REFERENCE_ID ] = functionZid;
				return value;
			};
			return generateZTester;
		},

		/**
		 * Return a blank and initialized zTypedList.
		 * The value will result in a json representation equal to:
		 * [ 'Z1' ]
		 *
		 * @return {Function}
		 */
		createZTypedList: function () {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {string} payload.value
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			const generateZTypedList = ( payload ) => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_TYPED_LIST );
				// Initialize function zid from the url parameters
				value[ 0 ][ Constants.Z_REFERENCE_ID ] = payload.value || Constants.Z_OBJECT;
				return value;
			};
			return generateZTypedList;
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
		 * @return {Function}
		 */
		createZTypedPair: function () {
			/**
			 * @param {Object} payload
			 * @param {number} payload.id
			 * @param {Object} payload.values
			 * @param {boolean} payload.isDeclaration This is used know if the values need to be initialized or not
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			const generateZTypedPair = ( payload ) => {
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
			};
			return generateZTypedPair;
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
		 * @return {Function}
		 */
		createZTypedMap: function () {
			/**
			 * @param {Object} payload
			 * @param {string} payload.values
			 * @param {number} payload.id
			 * @param {boolean} payload.append
			 * @return {Object}
			 */
			const generateZTypedMap = ( payload ) => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_TYPED_MAP );

				// Initialize typed pair types
				const type1 = payload.values ? payload.values[ 0 ] : '';
				const type2 = payload.values ? payload.values[ 1 ] : '';
				value[ Constants.Z_OBJECT_TYPE ][ Constants.Z_TYPED_MAP_TYPE1 ][ Constants.Z_REFERENCE_ID ] = type1;
				value[ Constants.Z_OBJECT_TYPE ][ Constants.Z_TYPED_MAP_TYPE2 ][ Constants.Z_REFERENCE_ID ] = type2;
				return value;
			};
			return generateZTypedMap;
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
		 * @return {Function}
		 */
		createWikidataEntity: function () {
			/**
			 * @param {Object} payload
			 * @param {string} payload.type
			 * @return {Object}
			 */
			const generateWikidataEntity = ( payload ) => {
				// Get scaffolding
				const value = typeUtils.getScaffolding( Constants.Z_FUNCTION_CALL );
				let wdRef, wdFetch, wdFetchId;

				// Set to Wikidata Entity fetch function call:
				switch ( payload.type ) {
					// Wikidata Lexeme Form:
					case Constants.Z_WIKIDATA_LEXEME_FORM:
						wdRef = this.createObjectByType( { type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM } );
						wdFetch = Constants.Z_WIKIDATA_FETCH_LEXEME_FORM;
						wdFetchId = Constants.Z_WIKIDATA_FETCH_LEXEME_FORM_ID;

						value[ Constants.Z_FUNCTION_CALL_FUNCTION ] = wdFetch;
						value[ wdFetchId ] = wdRef;
						return value;

					// Wikidata Lexeme
					case Constants.Z_WIKIDATA_LEXEME:
						wdRef = this.createObjectByType( { type: Constants.Z_WIKIDATA_REFERENCE_LEXEME } );
						wdFetch = Constants.Z_WIKIDATA_FETCH_LEXEME;
						wdFetchId = Constants.Z_WIKIDATA_FETCH_LEXEME_ID;

						value[ Constants.Z_FUNCTION_CALL_FUNCTION ] = wdFetch;
						value[ wdFetchId ] = wdRef;
						return value;

					// Wikidata Item
					case Constants.Z_WIKIDATA_ITEM:
						wdRef = this.createObjectByType( { type: Constants.Z_WIKIDATA_REFERENCE_ITEM } );
						wdFetch = Constants.Z_WIKIDATA_FETCH_ITEM;
						wdFetchId = Constants.Z_WIKIDATA_FETCH_ITEM_ID;

						value[ Constants.Z_FUNCTION_CALL_FUNCTION ] = wdFetch;
						value[ wdFetchId ] = wdRef;
						return value;

					// Wikidata Property
					case Constants.Z_WIKIDATA_PROPERTY:
						wdRef = this.createObjectByType( { type: Constants.Z_WIKIDATA_REFERENCE_PROPERTY } );
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
			};
			return generateWikidataEntity;
		}
	},

	actions: {
		/**
		 * Changes the type, inserts or append a specific zObject given its type.
		 *
		 * @param {Object} payload
		 * @param {string} payload.type the type of the new object to add
		 * @param {number} payload.id the parent rowId for the new object
		 * @param {boolean} payload.append whether to append the new zobject to a list
		 * @param {boolean} payload.literal force create a literal object: on root initialization and
		 * mode selector explicit request
		 * @param {Object} payload.value initialization values
		 * @return {Promise}
		 */
		changeType: function ( payload ) {
			const rootRowId = this.getZPersistentContentRowId();

			// Set isRoot flag if we are changing the direct child of Z2K2
			// Adds a new object so spyOn can be used to test the function
			const object = Object.assign( {}, payload, { isRoot: rootRowId === payload.id } );
			// Build the expected value to assign
			const value = this.createObjectByType( object );

			// Asynchronously fetch the necessary zids. We don't need to wait
			// to the fetch call because these will only be needed for labels.
			const zids = extractZIDs( value );
			this.fetchZids( { zids } );

			// Inject (replace or append) the value from a given row ID
			return this.injectZObjectFromRowId( {
				rowId: object.id,
				value,
				append: object.append || false
			} );
		},

		/**
		 * Clears the type, keeping the key Z1K1 and removing all other keys
		 * given a parent rowId
		 *
		 * @param {number} rowId
		 */
		clearType: function ( rowId ) {
			// Get children
			const children = this.getChildrenByParentRowId( rowId );
			// Exclude type key
			const keys = children.filter( ( row ) => row.key !== Constants.Z_OBJECT_TYPE );
			for ( const row of keys ) {
				this.removeRowChildren( { rowId: row.id, removeParent: true } );
			}
		}
	}
};
