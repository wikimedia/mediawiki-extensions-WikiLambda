/*!
 * WikiLambda Vuex code to interact with the store to create and update ZObjects.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var Constants = require( '../../../Constants.js' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ).methods,
	zobjectTreeUtils = require( '../../../mixins/zobjectTreeUtils.js' ).methods,
	getParameterByName = require( '../../../mixins/urlUtils.js' ).methods.getParameterByName;

module.exports = {
	actions: {
		/**
		 * Create the required entry in the zobject array for a zPersistenObject.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: { Z1K1: 'Z9', Z9K1: 'Z2' },
		 *      Z2K1: { Z1K1: 'Z9', Z9K1: 'Z0' },
		 *      Z2K2: undefined,
		 *      Z2K3: { Z1K1: {
		 *        Z1K1: 'Z9', Z9K1: 'Z12'
		 *      }, Z12K1: [] },
		 *      Z2K4: { Z1K1: {
		 *        Z1K1: 'Z9', Z9K1: 'Z32'
		 *      }, Z32K1: [] }
		 *  }
		 *
		 * @param {Object} context
		 * @param {number} ObjectId
		 */
		addZPersistentObject: function ( context, ObjectId ) {
			context.dispatch( 'injectZObject', {
				zobject: {
					Z1K1: Constants.Z_PERSISTENTOBJECT,
					Z2K1: Constants.NEW_ZID_PLACEHOLDER,
					Z2K2: {},
					Z2K3: {
						Z1K1: Constants.Z_MULTILINGUALSTRING,
						Z12K1: ( context.getters.getUserZlangZID ? [ {
							Z1K1: Constants.Z_MONOLINGUALSTRING,
							Z11K1: context.getters.getUserZlangZID,
							Z11K2: ''
						} ] : []
						)
					},
					Z2K4: {
						Z1K1: Constants.Z_MULTILINGUALSTRINGSET,
						Z32K1: ( context.getters.getUserZlangZID ? [ {
							Z1K1: Constants.Z_MONOLINGUALSTRINGSET,
							Z31K1: context.getters.getUserZlangZID,
							Z31K2: []
						} ] : []
						)
					}
				},
				key: undefined,
				id: undefined,
				parent: ObjectId
			} );
		},
		/**
		 * Create the required entry in the zobject array for a zMonolingualString.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z11, Z11K1: { Z1K1: Z9, Z9K1: payload.lang }, Z11K2: { Z1K1: Z6, Z6K1: '' } }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		addZMonolingualString: function ( context, payload ) {
			var parentId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject ),
				nextId,
				numberOfLanguageInArray = context.getters.getZObjectChildrenById( payload.parentId ).length,
				zObjectItems = [];
			if ( !payload.lang || !payload.parentId ) {
				return;
			}

			context.dispatch( 'fetchZKeys', [ payload.lang ] );

			// Create root object
			zObjectItems = [
				{ key: numberOfLanguageInArray, value: 'object', parent: payload.parentId },
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_MONOLINGUALSTRING, parent: parentId }
			];
			context.dispatch( 'addZObjects', zObjectItems );

			// Set language reference
			nextId = context.getters.getNextObjectId;
			context.dispatch( 'addZObject', { key: Constants.Z_MONOLINGUALSTRING_LANGUAGE, value: 'object', parent: parentId } );
			context.dispatch( 'addZReference', { id: nextId, value: payload.lang } );

			// Set default string
			nextId = context.getters.getNextObjectId;
			context.dispatch( 'addZObject', { key: Constants.Z_MONOLINGUALSTRING_VALUE, value: 'object', parent: parentId } );
			context.dispatch( 'addZString', { id: nextId, value: payload.value } );
		},
		/**
		 * Create the required entry in the zobject array for a zMultilingualString.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z12, Z12K1: [] }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		addZMultilingualString: function ( context, payload ) {
			var nextId;
			context.dispatch( 'setZObjectValue', {
				id: payload.id,
				value: 'object'
			} );

			context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: Constants.Z_MULTILINGUALSTRING, parent: payload.id } );

			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_MULTILINGUALSTRING_VALUE, value: 'array', parent: payload.id } );

			context.dispatch( 'addZMonolingualString', {
				parentId: nextId,
				lang: context.getters.getUserZlangZID,
				value: payload.value
			} );
		},
		/**
		 * Create the required entry in the zobject array for a zList.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z6, Z6K1: '' }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		addZString: function ( context, payload ) {
			var zObjectItems = [],
				value = payload.value || '';
			context.dispatch( 'setZObjectValue', {
				id: payload.id,
				value: 'object'
			} );
			zObjectItems = [
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: payload.id },
				{ key: Constants.Z_STRING_VALUE, value: value, parent: payload.id }
			];
			context.dispatch( 'addZObjects', zObjectItems );
		},
		/**
		 * Create the required entry in the zobject array for a zList.
		 * The entry will result in a json representation equal to:
		 * []
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		addZList: function ( context, objectId ) {
			context.dispatch( 'setZObjectValue', {
				id: objectId,
				value: 'array'
			} );
		},
		/**
		 * Create the required entry in the object for a list of generics.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z7, Z7K1: Z881, Z881k1: '' }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.value
		 * @param {number} payload.id
		 * @param {boolean} payload.unwrapped //This is used to unwrap it from a Z_OBJECT_TYPE (Z1K1)
		 */
		addZTypedList: function ( context, payload ) {
			var value = payload.value || '',
				unwrapped = payload.unwrapped || false,
				functionCallId;

			if ( unwrapped ) {
				functionCallId = payload.id;
			} else {
				functionCallId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
				context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: 'object', parent: payload.id } );
			}

			context.dispatch( 'changeType', { id: functionCallId, type: Constants.Z_FUNCTION_CALL, value: Constants.Z_TYPED_LIST } )
				.then( function () {
					context.dispatch( 'addZObject', { key: Constants.Z_TYPED_LIST_TYPE, value: value, parent: functionCallId } );
				} );
		},
		/**
		 * Create the required entry in the object for a list of generics.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z7, Z7K1: Z882, Z882K1: '', Z882K2: '' }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.value
		 * @param {number} payload.id
		 * @param {boolean} payload.unwrapped //This is used to unwrap it from a Z_OBJECT_TYPE (Z1K1)
		 */
		addZTypedPair: function ( context, payload ) {
			var value1 = payload.value1 || '',
				value2 = payload.value2 || '',
				unwrapped = payload.unwrapped || false,
				functionCallId;

			if ( unwrapped ) {
				functionCallId = payload.id;
			} else {
				functionCallId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
				context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: 'object', parent: payload.id } );
			}

			context.dispatch( 'changeType', { id: functionCallId, type: Constants.Z_FUNCTION_CALL, value: Constants.Z_TYPED_PAIR } )
				.then( function () {
					context.dispatch( 'addZObject', { key: Constants.Z_TYPED_PAIR_TYPE1, value: value1, parent: functionCallId } );
					context.dispatch( 'addZObject', { key: Constants.Z_TYPED_PAIR_TYPE2, value: value2, parent: functionCallId } );
				} );
		},
		/**
		 * Create the required entry in the zobject array for a zReference.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z9, Z9K1: '' }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		addZReference: function ( context, payload ) {
			var zObjectItems = [],
				value = payload.value || '';
			context.dispatch( 'setZObjectValue', {
				id: payload.id,
				value: 'object'
			} );
			zObjectItems = [
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: payload.id },
				{ key: Constants.Z_REFERENCE_ID, value: value, parent: payload.id }
			];
			context.dispatch( 'addZObjects', zObjectItems );
		},
		/**
		 * Create the required entry in the zobject array for a zArgument.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: 'Z17',
		 * Z17K1: { Z1K1: 'Z9', Z9K1: '' },
		 * Z17K2: { Z1K1: 'Z6', Z6K1: 'Z0K1' },
		 * Z17K3: { Z1K1: 'Z12', Z12K1: [] }
		 * }
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		addZArgument: function ( context, objectId ) {
			var nextId;
			context.dispatch( 'setZObjectValue', {
				id: objectId,
				value: 'object'
			} );
			context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: Constants.Z_ARGUMENT, parent: objectId } );

			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_ARGUMENT_TYPE, value: 'object', parent: objectId } );
			context.dispatch( 'addZReference', { id: nextId, value: '' } );

			// We calculate the id again, and set the key
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			// we create the base object that will be used to scaffold the ZString
			context.dispatch( 'addZObject', { key: Constants.Z_ARGUMENT_KEY, value: 'object', parent: objectId } );
			context.dispatch( 'addZString', { id: nextId, value: context.rootGetters.getNextKey } );

			// We calculate the next id, and create the argument label
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			// we create the base object that will be used to scaffold the ZString
			context.dispatch( 'addZObject', { key: Constants.Z_ARGUMENT_LABEL, value: 'object', parent: objectId } );
			context.dispatch( 'addZMultilingualString', { id: nextId, value: context.rootState.i18n( 'wikilambda-editor-input-default-label' ).toString() } );
		},
		/**
		 * Create the required entry in the zobject array for a zArgument.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z7, Z7K1: '' }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		addZFunctionCall: function ( context, payload ) {
			var zObjectItems = [],
				value = payload.value || '';
			context.dispatch( 'setZObjectValue', {
				id: payload.id,
				value: 'object'
			} );
			zObjectItems = [
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_FUNCTION_CALL, parent: payload.id },
				{ key: Constants.Z_FUNCTION_CALL_FUNCTION, value: value, parent: payload.id }
			];
			context.dispatch( 'addZObjects', zObjectItems );
		},
		/**
		 * Create the required entry in the zobject array for a zImplemnetation.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: 'Z14', Z14K1:
		 * { Z1K1: 'Z9', Z9K1: '' },
		 * Z14K2: undefined,
		 * Z14K3:
		 * { Z1K1: 'Z16', Z16K1: { Z1K1: 'Z61', Z61K1: { Z1K1: 'Z6', Z6K1: '' } }, Z16K2: { Z1K1: 'Z6', Z6K1: '' } } }
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		addZImplementation: function ( context, objectId ) {
			var nextId,
				isPersistentImplementation = !typeUtils.findKeyInArray(
					Constants.Z_REFERENCE_ID,
					context.getters.getZObjectChildrenById(
						typeUtils.findKeyInArray(
							Constants.Z_OBJECT_TYPE,
							context.getters.getZObjectChildrenById(
								typeUtils.findKeyInArray(
									Constants.Z_PERSISTENTOBJECT_VALUE,
									context.rootState.zobjectModule.zobject
								).id
							)
						).id
					)
				),
				defaultFunctionValue = isPersistentImplementation ?
					getParameterByName( Constants.Z_IMPLEMENTATION_FUNCTION ) || '' :
					context.getters.getCurrentZObjectId;

			function setDefaultFunctionReference( id ) {
				if ( !defaultFunctionValue || defaultFunctionValue === Constants.NEW_ZID_PLACEHOLDER ) {
					context.dispatch( 'addZReference', { id: id, value: defaultFunctionValue } );
				}
				// fetch zkeys for the zid, then check whether Z2K2.Z1K1 is equal to Constants.Z_FUNCTION
				return context.dispatch( 'fetchZKeys', [ defaultFunctionValue ] ).then( function () {
					var keys = context.getters.getZkeys[ defaultFunctionValue ];

					if ( keys &&
						keys[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] ===
						Constants.Z_FUNCTION
					) {
						context.dispatch( 'addZReference', { id: id, value: defaultFunctionValue } );
					}
				} );
			}

			context.dispatch( 'setZObjectValue', {
				id: objectId,
				value: 'object'
			} );
			context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: Constants.Z_IMPLEMENTATION, parent: objectId } );

			// Add function
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_IMPLEMENTATION_FUNCTION, value: 'object', parent: objectId } );
			setDefaultFunctionReference( nextId );

			// Add Composition
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_IMPLEMENTATION_COMPOSITION, value: 'object', parent: objectId } );
			context.dispatch( 'changeType', { id: nextId, type: Constants.Z_FUNCTION_CALL } );
		},

		addZFunction: function ( context, objectId ) {
			var nextId;
			context.dispatch( 'setZObjectValue', {
				id: objectId,
				value: 'object'
			} );

			// Set type
			context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: Constants.Z_FUNCTION, parent: objectId } );

			// Add initial ZArgument
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_FUNCTION_ARGUMENTS, value: 'array', parent: objectId } );
			context.dispatch( 'addZObject', { key: 0, value: 'object', parent: nextId } );
			context.dispatch( 'addZArgument', nextId + 1 );

			// Add return type
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_FUNCTION_RETURN_TYPE, value: 'object', parent: objectId } );
			context.dispatch( 'addZReference', { id: nextId, value: '' } );

			context.dispatch( 'addZObjects', [
				{ key: Constants.Z_FUNCTION_TESTERS, value: 'array', parent: objectId },
				{ key: Constants.Z_FUNCTION_IMPLEMENTATIONS, value: 'array', parent: objectId }
			] );

			// Set identity
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_FUNCTION_IDENTITY, value: 'object', parent: objectId } );
			context.dispatch( 'addZObjects', [
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: nextId },
				{ key: Constants.Z_REFERENCE_ID, value: context.getters.getCurrentZObjectId, parent: nextId }
			] );
		},
		/**
		 * Create the required entry for a ZTester
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		addZTester: function ( context, objectId ) {
			var nextId;
			context.dispatch( 'setZObjectValue', {
				id: objectId,
				value: 'object'
			} );

			// Set type
			context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: Constants.Z_TESTER, parent: objectId } );

			// Set call as a function call
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_TESTER_FUNCTION, value: 'object', parent: objectId } );
			context.dispatch( 'addZReference', { id: nextId, value: '' } );

			// Set call as a function call
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_TESTER_CALL, value: 'object', parent: objectId } );
			context.dispatch( 'addZFunctionCall', { id: nextId } );

			// Set validation as a reference
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_TESTER_VALIDATION, value: 'object', parent: objectId } );
			context.dispatch( 'addZFunctionCall', { id: nextId } );
		},
		/**
		 * Create the required entry for a generic object,
		 * but reading the information from the zKeys store .
		 * The entry will result in a json representation equal to the generic object
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		addGenericObject: function ( context, payload ) {
			var zObjectItems = [],
				keys = [],
				objectKey,
				objectKeyType,
				nextId;
			context.dispatch( 'setZObjectValue', {
				id: payload.id,
				value: 'object'
			} );

			zObjectItems = [
				{ key: Constants.Z_OBJECT_TYPE, value: payload.type, parent: payload.id }
			];

			// we fetch a list of keys within this generic object
			if ( payload.type !== Constants.Z_OBJECT && context.rootGetters.getZkeys[ payload.type ] ) {
				context.dispatch( 'addZObjects', zObjectItems );

				keys = context
					.rootGetters
					.getZkeys[ payload.type ][ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];

				// we add each key in the tree and also set its type
				keys.forEach( function ( key ) {
					objectKey = key[ Constants.Z_KEY_ID ];
					objectKeyType = key[ Constants.Z_KEY_TYPE ];
					nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
					if ( objectKey !== Constants.Z_OBJECT_TYPE ) {
						context.dispatch( 'addZObject', { key: objectKey, value: 'object', parent: payload.id } );
					}
					// We need to stop recursiveness.
					if ( objectKeyType !== payload.type ) {
						context.dispatch( 'changeType', { id: nextId, type: objectKeyType } );
					} else {
						context.dispatch( 'changeType', { id: nextId, type: Constants.Z_REFERENCE } );
					}
				} );
			}

		},
		/**
		 * Create the required entry in the zobject array for a zType.
		 * This utilizes the generic object creator, then sets the identity value.
		 * { "Z1K1": "Z4", "Z4K1": { "Z1K1": "Z9", "Z9K1": "Z0" }, "Z4K2": [], "Z4K3": { "Z1K1": "Z101" } }
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		addZType: function ( context, objectId ) {

			var nextId;
			context.dispatch( 'setZObjectValue', { id: objectId, value: 'object' } );

			// Set type
			context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: Constants.Z_TYPE, parent: objectId } );

			// Set identity
			context.dispatch( 'addZObject', { key: Constants.Z_TYPE_IDENTITY, value: Constants.NEW_ZID_PLACEHOLDER, parent: objectId } );

			// Set keys
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_TYPE_KEYS, value: 'object', parent: objectId } );
			context.dispatch( 'changeType', { id: nextId, type: Constants.Z_TYPED_LIST, value: Constants.Z_KEY } );

			// Set validator
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_TYPE_VALIDATOR, value: 'object', parent: objectId } );
			context.dispatch( 'changeType', { id: nextId, type: Constants.Z_REFERENCE, value: Constants.Z_VALIDATE_OBJECT } );
		},
		/**
		 * Sets the ZCode's code string to a default based on provided values.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @return {Object}
		 */
		initializeZCodeFunction: function ( context, payload ) {
			var zCode = context.getters.getZObjectChildrenById( payload.zCodeId ),
				zCodeString = typeUtils.findKeyInArray(
					Constants.Z_STRING_VALUE,
					context.getters.getZObjectChildrenById(
						typeUtils.findKeyInArray( Constants.Z_CODE_CODE, zCode ).id
					)
				),
				args;

			switch ( payload.language ) {
				case 'javascript':
					args = Array.isArray( payload.argumentList ) ?
						payload.argumentList.reduce(
							function ( str, argument, index ) {
								if ( index === 0 ) {
									return argument.zid;
								}
								return str + ', ' + argument.zid;
							}, '' ) : '';
					return context.commit( 'setZObjectValue', {
						index: context.getters.getZObjectIndexById( zCodeString.id ),
						value: 'function ' + payload.functionId + '( ' + args + ' ) {\n\n}'
					} );
				case 'python':
					args = Array.isArray( payload.argumentList ) ?
						payload.argumentList.reduce(
							function ( str, argument, index ) {
								if ( index === 0 ) {
									return argument.zid;
								}
								return str + ', ' + argument.zid;
							}, '' ) : '';
					return context.commit( 'setZObjectValue', {
						index: context.getters.getZObjectIndexById( zCodeString.id ),
						value: 'def ' + payload.functionId + '(' + args + '):\n\t'
					} );
				case 'lua':
					args = Array.isArray( payload.argumentList ) ?
						payload.argumentList.reduce(
							function ( str, argument, index ) {
								if ( index === 0 ) {
									return argument.zid;
								}
								return str + ', ' + argument.zid;
							}, '' ) : '';
					return context.commit( 'setZObjectValue', {
						index: context.getters.getZObjectIndexById( zCodeString.id ),
						value: 'function ' + payload.functionId + '(' + args + ')\n\t\nend'
					} );
				default:
					return context.commit( 'setZObjectValue', {
						index: context.getters.getZObjectIndexById( zCodeString.id ),
						value: ''
					} );
			}
		},
		/**
		 * Changes the type of a specific zObject.
		 * This is the central point for handling the object scaffolding
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @return {Promise}
		 */
		changeType: function ( context, payload ) {
			context.dispatch( 'removeZObjectChildren', payload.id );
			return context.dispatch( 'fetchZKeys', [ payload.type ] )
				.then( function () {
					switch ( payload.type ) {
						case Constants.Z_LIST:
							return context.dispatch( 'addZList', payload.id );
						case Constants.Z_REFERENCE:
							return context.dispatch( 'addZReference', payload );
						case Constants.Z_STRING:
							return context.dispatch( 'addZString', { id: payload.id } );
						case Constants.Z_MULTILINGUALSTRING:
							return context.dispatch( 'addZMultilingualString', payload );
						case Constants.Z_ARGUMENT:
							return context.dispatch( 'addZArgument', payload.id );
						case Constants.Z_FUNCTION_CALL:
							return context.dispatch( 'addZFunctionCall', payload );
						case Constants.Z_FUNCTION:
							return context.dispatch( 'addZFunction', payload.id );
						case Constants.Z_PERSISTENTOBJECT:
							return context.dispatch( 'addZPersistentObject', payload.id );
						case Constants.Z_TYPE:
							return context.dispatch( 'addZType', payload.id );
						case Constants.Z_IMPLEMENTATION:
							return context.dispatch( 'addZImplementation', payload.id );
						case Constants.Z_TESTER:
							return context.dispatch( 'addZTester', payload.id );
						case Constants.Z_TYPED_LIST:
							return context.dispatch( 'addZTypedList', payload );
						case Constants.Z_TYPED_PAIR:
							return context.dispatch( 'addZTypedPair', payload );
						default:
							return context.dispatch( 'addGenericObject', payload );
					}
				} );
		}
	}
};
