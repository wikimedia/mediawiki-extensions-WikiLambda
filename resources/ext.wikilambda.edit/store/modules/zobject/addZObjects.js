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

function setDefaultFunctionReference( context, id, functionValue ) {
	if ( !functionValue || functionValue === Constants.NEW_ZID_PLACEHOLDER ) {
		context.dispatch( 'addZReference', { id: id, value: functionValue } );
	}
	// fetch zkeys for the zid, then check whether Z2K2.Z1K1 is equal to Constants.Z_FUNCTION
	return context.dispatch( 'fetchZKeys', { zids: [ functionValue ] } ).then( function () {
		var keys = context.getters.getZkeys[ functionValue ];

		if ( keys &&
			keys[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] ===
			Constants.Z_FUNCTION
		) {
			context.dispatch( 'addZReference', { id: id, value: functionValue } );
		}
	} );
}

module.exports = exports = {
	actions: {
		/**
		 * This method is used to generate a zObjectType (Z1K1) for a given object.
		 * This can either be a simple string with a zId or a complex function call for functionToType
		 * { Z1K1: Z123 }
		 * or
		 * {
		 *   Z1K1: {
		 *     "Z1K1":"Z7",
		 *     "Z7K1":"Z123",
		 *     "Z123K1":"Z13456",
		 *   }
		 * }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.objectId
		 * @param {string} payload.type
		 */
		addZObjectType: function ( context, payload ) {
			var type,
				isPersistentObject = context
					.rootGetters
					.getZkeys[ payload.type ][ Constants.Z_OBJECT_TYPE ] === Constants.Z_PERSISTENTOBJECT,
				object = context.getters.getZObjectById( payload.objectId );

			if ( isPersistentObject ) {
				type = context
					.rootGetters
					.getZkeys[ payload.type ][ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
				context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: type, parent: payload.objectId } );
			} else {
				type = context
					.rootGetters
					.getZkeys[ payload.type ][ Constants.Z_TYPE_IDENTITY ];

				// we need to wrap the object in Z1K1 (Z_OBJECT_TYPE)
				var Z_OBJECT_TYPE = {};
				Z_OBJECT_TYPE[ Constants.Z_OBJECT_TYPE ] = type;

				context.dispatch( 'injectZObject', {
					zobject: Z_OBJECT_TYPE,
					key: Constants.Z_OBJECT_TYPE,
					id: payload.objectId,
					parent: object.parentId
				} );
			}
		},
		/**
		 * Create the required entry in the zobject array for a zPersistenObject.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: { Z1K1: 'Z9', Z9K1: 'Z2' },
		 *      Z2K1: { Z1K1: 'Z9', Z9K1: 'Z0' },
		 *      Z2K2: undefined,
		 *      Z2K3: { Z1K1: {
		 *        Z1K1: 'Z9', Z9K1: 'Z12'
		 *      }, Z12K1: [ Z11 ] },
		 *      Z2K4: { Z1K1: {
		 *        Z1K1: 'Z9', Z9K1: 'Z32'
		 *      }, Z32K1: [ Z31 ] }
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
						Z12K1: context.getters.getUserZlangZID ? [
							Constants.Z_MONOLINGUALSTRING,
							{
								Z1K1: Constants.Z_MONOLINGUALSTRING,
								Z11K1: context.getters.getUserZlangZID,
								Z11K2: ''
							}
						] : [ Constants.Z_MONOLINGUALSTRING ]
					},
					Z2K4: {
						Z1K1: Constants.Z_MULTILINGUALSTRINGSET,
						Z32K1: context.getters.getUserZlangZID ? [
							Constants.Z_MONOLINGUALSTRINGSET,
							{
								Z1K1: Constants.Z_MONOLINGUALSTRINGSET,
								Z31K1: context.getters.getUserZlangZID,
								Z31K2: [
									Constants.Z_STRING
								]
							}
						] : [ Constants.Z_MONOLINGUALSTRINGSET ]
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

			context.dispatch( 'fetchZKeys', { zids: [ payload.lang ] } );

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
		 * { Z1K1: Z12, Z12K1: [ Z11 ] }
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

			context.dispatch( 'addZObject', {
				key: Constants.Z_OBJECT_TYPE,
				value: Constants.Z_MULTILINGUALSTRING,
				parent: payload.id
			} );

			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', {
				key: Constants.Z_MULTILINGUALSTRING_VALUE,
				value: 'array',
				parent: payload.id
			} );

			// Add ZMonolingualString
			// Add ZMonolingualString type
			var monolingualStringParentId = nextId + 1;
			var zObjectItems = [
				{ key: 0, value: 'object', parent: nextId },
				{
					key: Constants.Z_OBJECT_TYPE,
					value: Constants.Z_REFERENCE,
					parent: monolingualStringParentId
				},
				{
					key: Constants.Z_REFERENCE_ID,
					value: Constants.Z_MONOLINGUALSTRING,
					parent: monolingualStringParentId
				}
			];
			context.dispatch( 'addZObjects', zObjectItems );

			// Add ZMonolingualString items
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
		 * @param {Object} payload
		 */
		addTypetoList: function ( context, payload ) {
			var listType = context.getters.getListTypeById( payload.objectId );
			var zListTypeChildren;

			if ( !listType.id ) {
				var nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
				var zObjectItems = [
					{ key: 0, value: 'object', parent: payload.objectId },
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: nextId },
					{ key: Constants.Z_REFERENCE_ID, value: payload.type, parent: nextId }
				];
				context.dispatch( 'addZObjects', zObjectItems );
			} else {
				zListTypeChildren = typeUtils.findKeyInArray(
					Constants.Z_REFERENCE_ID,
					context.getters.getZObjectChildrenById( listType.id ) );

				context.dispatch( 'setZObjectValue', {
					id: zListTypeChildren.id,
					value: payload.type
				} );
			}
		},
		/**
		 * Create the required entry in the object for a list of generics.
		 * The entry will result in a json representation equal to:
		 * [ 'Z1' ]
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.value
		 * @param {number} payload.id
		 */
		addZTypedList: function ( context, payload ) {
			context.dispatch( 'setZObjectValue', {
				id: payload.id,
				value: 'array'
			} );
			context.dispatch( 'addTypetoList', {
				objectId: payload.id,
				type: payload.value || Constants.Z_OBJECT
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
		 * @param {boolean} payload.isDeclaration This is used know if the values need to be initialized or not
		 */
		addZTypedPair: function ( context, payload ) {
			var values = payload.values || [],
				isDeclaration = payload.isDeclaration || false,
				functionCallId;

			if ( isDeclaration ) {
				// the following creates:
				// {
				//  "Z1K1": "Z7",
				//  "Z7K1": "Z882",
				//  "Z882K1": values[ 0 ],
				//  "Z882K2": values[ 1 ]
				// }
				functionCallId = payload.id;
				context.dispatch( 'changeType', { id: functionCallId, type: Constants.Z_FUNCTION_CALL, value: Constants.Z_TYPED_PAIR } )
					.then( function () {
						context.dispatch( 'addZObject', { key: Constants.Z_TYPED_PAIR_TYPE1, value: values[ 0 ] || '', parent: functionCallId } );
						context.dispatch( 'addZObject', { key: Constants.Z_TYPED_PAIR_TYPE2, value: values[ 1 ] || '', parent: functionCallId } );
					} );
			} else {
				// the following creates:
				// "Z1K1": {
				//  "Z1K1": "Z7",
				//  "Z7K1": "Z882",
				//  "Z882K1": values[ 0 ],
				//  "Z882K2": values[ 1 ]
				// },
				// "K1": initialization for value[ 0 ]
				// "K2": initialization for values[ 1 ]
				functionCallId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
				context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: 'object', parent: payload.id } );
				context.dispatch( 'changeType', { id: functionCallId, type: Constants.Z_FUNCTION_CALL, value: Constants.Z_TYPED_PAIR } )
					.then( function () {
						context.dispatch( 'addZObject', { key: Constants.Z_TYPED_PAIR_TYPE1, value: values[ 0 ] || '', parent: functionCallId } );
						context.dispatch( 'addZObject', { key: Constants.Z_TYPED_PAIR_TYPE2, value: values[ 1 ] || '', parent: functionCallId } );
					} );
				// when the object is not a declaration we also initialize its key/value pairs
				var nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
				context.dispatch( 'addZObject', { key: Constants.Z_TYPED_OBJECT_ELEMENT_1, value: 'object', parent: payload.id } );
				context.dispatch( 'changeType', { id: nextId, type: values[ 0 ] } );
				nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
				context.dispatch( 'addZObject', { key: Constants.Z_TYPED_OBJECT_ELEMENT_2, value: 'object', parent: payload.id } );
				context.dispatch( 'changeType', { id: nextId, type: values[ 1 ] } );
			}

		},
		/**
		 * Create the required entry in the object for a map list of typed pair.
		 * The entry will result in a json representation equal to file stored in
		 * function orchestrator test/features/v1/test_data/Z88303.json
		 * Overall it is going to be a TypedMap, including a typedList including a typedPair.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.value
		 * @param {number} payload.id
		 */
		addZTypedMap: function ( context, payload ) {
			var values = payload.values || [],
				nextId;

			// Set the root of the object to be a Z1K1 (Object_type)
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: 'object', parent: payload.id } );

			// Set the Z1K1 to a ZtypedMap:
			// { Z1K1: Z7, Z7K1: Z883, Z883K1: values[ 0 ], Z883K2: values[ 0 ] }
			context.dispatch( 'changeType', { id: nextId, type: Constants.Z_FUNCTION_CALL, value: Constants.Z_TYPED_MAP } )
				.then( function () {
					context.dispatch( 'addZObject', { key: Constants.Z_TYPED_MAP_TYPE1, value: values[ 0 ] || '', parent: nextId } );
					context.dispatch( 'addZObject', { key: Constants.Z_TYPED_MAP_TYPE2, value: values[ 1 ] || '', parent: nextId } );
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
		 * Z17K3: { Z1K1: 'Z12', Z12K1: [ Z11 ] }
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

			context.dispatch( 'setZObjectValue', {
				id: objectId,
				value: 'object'
			} );
			context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: Constants.Z_IMPLEMENTATION, parent: objectId } );

			// Add function
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_IMPLEMENTATION_FUNCTION, value: 'object', parent: objectId } );
			setDefaultFunctionReference( context, nextId, defaultFunctionValue );

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
			// Add ZArgument Type to array
			var argumentTypeParentId = nextId + 1;
			var zObjectItems = [
				{ key: 0, value: 'object', parent: nextId },
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: argumentTypeParentId },
				{ key: Constants.Z_REFERENCE_ID, value: Constants.Z_ARGUMENT, parent: argumentTypeParentId }
			];
			context.dispatch( 'addZObjects', zObjectItems );
			// Add ZArgument to array
			var argumentsNextId = nextId + 4;
			context.dispatch( 'addZObject', { key: 1, value: 'object', parent: nextId } );
			context.dispatch( 'addZArgument', argumentsNextId );

			// Add return type
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_FUNCTION_RETURN_TYPE, value: 'object', parent: objectId } );
			context.dispatch( 'addZReference', { id: nextId, value: '' } );

			// Add tester
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_FUNCTION_TESTERS, value: 'array', parent: objectId } );
			var testersNextId = nextId + 1;
			// Add tester type
			context.dispatch( 'addZObjects', [
				{ key: 0, value: 'object', parent: nextId },
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: testersNextId },
				{ key: Constants.Z_REFERENCE_ID, value: Constants.Z_TESTER, parent: testersNextId }
			] );

			// Add implementation
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_FUNCTION_IMPLEMENTATIONS, value: 'array', parent: objectId } );
			var implementationsNextId = nextId + 1;
			// Add implementation type
			context.dispatch( 'addZObjects', [
				{ key: 0, value: 'object', parent: nextId },
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: implementationsNextId },
				{ key: Constants.Z_REFERENCE_ID, value: Constants.Z_IMPLEMENTATION, parent: implementationsNextId }
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
			var nextId,
				defaultFunctionValue = getParameterByName( Constants.Z_TESTER_FUNCTION ) || '';

			context.dispatch( 'setZObjectValue', {
				id: objectId,
				value: 'object'
			} );

			// Set type
			context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: Constants.Z_TESTER, parent: objectId } );

			// Set function and add default reference.
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_TESTER_FUNCTION, value: 'object', parent: objectId } );
			setDefaultFunctionReference( context, nextId, defaultFunctionValue );

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
		 * @param {string} payload.type
		 * @param {string} payload.id
		 */
		addGenericObject: function ( context, payload ) {
			var object = {},
				keys = [],
				objectKey,
				objectKeyType,
				nextId;
			context.dispatch( 'setZObjectValue', {
				id: payload.id,
				value: 'object'
			} );

			// we fetch a list of keys within this generic object
			if ( payload.type !== Constants.Z_OBJECT && context.rootGetters.getZkeys[ payload.type ] ) {

				// Normal types are nested in a persisten object value,
				// dynamically generated types from functionToType are not
				object = context
					.rootGetters
					.getZkeys[ payload.type ][ Constants.Z_PERSISTENTOBJECT_VALUE ] || context
					.rootGetters
					.getZkeys[ payload.type ];

				// the generic is either a straight type or a function that returns a type
				if ( object[ Constants.Z_OBJECT_TYPE ] === Constants.Z_TYPE ) {
					context.dispatch( 'addZObjectType', {
						type: payload.type,
						objectId: payload.id
					} );

					// we add each key in the tree and also set its type
					keys = object[ Constants.Z_TYPE_KEYS ];

					keys.forEach( function ( key ) {
						objectKey = key[ Constants.Z_KEY_ID ];
						objectKeyType = key[ Constants.Z_KEY_TYPE ];
						nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
						if ( !objectKeyType ) {
							return;
						}

						if ( objectKey !== Constants.Z_OBJECT_TYPE ) {
							context.dispatch( 'addZObject', { key: objectKey, value: 'object', parent: payload.id } );
						}
						// We need to stop recursiveness.
						if ( objectKeyType !== payload.type && typeof objectKeyType !== 'object' ) {
							context.dispatch( 'changeType', { id: nextId, type: objectKeyType } );
						// If Z_OBJECT_TYPE is a function call, we infer the type and use it to create the object
						} else if ( typeof objectKeyType === 'object' &&
							objectKeyType[ Constants.Z_OBJECT_TYPE ] === Constants.Z_FUNCTION_CALL &&
							objectKeyType[ Constants.Z_FUNCTION_CALL_FUNCTION ] === Constants.Z_TYPED_LIST
						) {
							context.dispatch( 'addZTypedList', {
								id: nextId,
								value: objectKeyType[ Constants.Z_TYPED_LIST_TYPE ]
							} );
							// Sometimes the Type can be an object. In those instances
							// We will inject the complete object into the zobject tree
						} else if ( typeof objectKeyType === 'object' ) {
							context.dispatch( 'injectZObject', {
								zobject: objectKeyType,
								key: objectKey,
								id: nextId,
								parent: payload.id
							} );
						} else {
							context.dispatch( 'changeType', { id: nextId, type: Constants.Z_REFERENCE } );
						}
					} );
				} else if ( object[ Constants.Z_OBJECT_TYPE ] === Constants.Z_FUNCTION ) {
					var functionCallObjectType = zobjectTreeUtils.getNextObjectId(
						context.rootState.zobjectModule.zobject
					);
					context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: 'object', parent: payload.id } );
					context.dispatch( 'addZFunctionCall', { id: functionCallObjectType, value: object[ Constants.Z_FUNCTION_IDENTITY ] } );
					keys = object[ Constants.Z_FUNCTION_ARGUMENTS ];
					keys.forEach( function ( key ) {
						objectKey = key[ Constants.Z_ARGUMENT_KEY ];
						objectKeyType = key[ Constants.Z_ARGUMENT_TYPE ];
						nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
						if ( objectKey !== Constants.Z_OBJECT_TYPE ) {
							context.dispatch( 'addZObject', { key: objectKey, value: 'object', parent: functionCallObjectType } );
						}
						// We need to stop recursiveness.
						if ( objectKeyType !== payload.type && objectKeyType !== Constants.Z_TYPE ) {
							context.dispatch(
								'changeType',
								{ id: nextId, type: objectKeyType }
							);
						// When the type is a Z4
						// we prefix it to an empty string to force the object selector to be shown
						} else if ( objectKeyType === Constants.Z_TYPE ) {
							context.dispatch( 'setZObjectValue', { id: nextId, value: '' } );
						} else {
							context.dispatch( 'changeType', { id: nextId, type: Constants.Z_REFERENCE } );
						}
					} );

				}
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
		 * Changes the type of a specific zObject.
		 * This is the central point for handling the object scaffolding
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @return {Promise}
		 */
		changeType: function ( context, payload ) {
			context.dispatch( 'removeZObjectChildren', payload.id );
			return context.dispatch( 'fetchZKeys', { zids: [ payload.type ] } )
				.then( function () {
					switch ( payload.type ) {
						case Constants.Z_REFERENCE:
							return context.dispatch( 'addZReference', payload );
						case Constants.Z_STRING:
							return context.dispatch( 'addZString', payload );
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
						case Constants.Z_TYPED_MAP:
							return context.dispatch( 'addZTypedMap', payload );
						default:
							return context.dispatch( 'addGenericObject', payload );
					}
				} );
		}
	}
};
