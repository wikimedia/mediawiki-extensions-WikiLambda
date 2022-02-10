/*!
 * WikiLambda Vue editor: ZOBject Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ).methods,
	zobjectTreeUtils = require( '../../mixins/zobjectTreeUtils.js' ).methods,
	canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject,
	getParameterByName = require( '../../mixins/urlUtils.js' ).methods.getParameterByName,
	addZObjects = require( './zobject/addZObjects.js' ),
	currentZObject = require( './zobject/currentZObject.js' ),
	saveZObject = require( '../../mixins/api.js' ).methods.saveZObject,
	updateZObjectPageTitle = require( '../../mixins/domUtils.js' ).methods.updateZObjectPageTitle,
	debounceZObjectLookup = null,
	DEBOUNCE_ZOBJECT_LOOKUP_TIMEOUT = 300;

function isObjectTypeDeclaration( object, parentObject ) {
	var isReference = object.value === Constants.Z_REFERENCE;
	var isObjectType = parentObject.key === Constants.Z_OBJECT_TYPE;

	return isReference && isObjectType;
}

function isTypedObjectWithCustomComponent( functionCallId ) {
	var istypedObject = Constants.Z_TYPED_OBEJECTS_LIST.indexOf( functionCallId.value ) !== -1;

	return istypedObject;
}

function isFunctionToType( objectDeclaration ) {
	if ( objectDeclaration ) {
		var isTypeFunction = objectDeclaration[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] === Constants.Z_FUNCTION;
		var returnsAType = objectDeclaration[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_RETURN_TYPE ] === Constants.Z_TYPE;

		return isTypeFunction && returnsAType;
	}
}

function isNotObjectOrArrayRoot( object ) {
	return [ 'array', 'object' ].indexOf( object.value ) === -1;
}

function retriveFunctionCallId( getZObjectChildrenById, object ) {
	var functionCall = typeUtils.findKeyInArray( Constants.Z_FUNCTION_CALL_FUNCTION, object );

	if ( functionCall && functionCall.value === 'object' ) {
		var functionCallObject = getZObjectChildrenById( functionCall.id );
		functionCall = typeUtils.findKeyInArray( Constants.Z_REFERENCE_ID, functionCallObject );
	}

	return functionCall;
}

function generateZIDListFromObjectTree( objectTree ) {
	var arrayOfKeys = objectTree.map( function ( key ) {
		return key.value;
	} );

	return arrayOfKeys.filter( function ( key ) {
		return key.match( /Z[1-9]\d*$/ );
	} );
}

module.exports = {
	modules: {
		addZObjects: addZObjects,
		currentZObject: currentZObject
	},
	state: {
		zobject: [],
		createNewPage: true,
		zobjectMessage: {
			type: 'error',
			text: null
		},
		isSavingZObject: false,
		ZObjectInitialized: false
	},
	getters: {
		getZObjectLabels: function ( state, getters ) {
			return getters.getZObjectChildrenById( getters.getNestedZObjectById( 0, [
				Constants.Z_PERSISTENTOBJECT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			] ).id );
		},
		getZObjectLabel: function ( state, getters ) {
			var labelObject,
				label = false;

			for ( var index in getters.getZObjectLabels ) {
				var maybeLabel = getters.getZObjectLabels[ index ],
					language = getters.getNestedZObjectById( maybeLabel.id, [
						Constants.Z_MONOLINGUALSTRING_LANGUAGE,
						Constants.Z_REFERENCE_ID
					] );

				if ( language.value === getters.getCurrentZLanguage ) {
					labelObject = maybeLabel;
				}
			}

			if ( labelObject ) {
				label = getters.getNestedZObjectById( labelObject.id, [
					Constants.Z_MONOLINGUALSTRING_VALUE,
					Constants.Z_STRING_VALUE
				] );
			}

			return label;
		},
		getIsSavingObject: function ( state ) {
			return state.isSavingZObject;
		},
		isCreateNewPage: function ( state ) {
			return state.createNewPage;
		},
		getZObjectMessage: function ( state ) {
			return state.zobjectMessage;
		},
		getZObjectById: function ( state ) {
			/**
			 * Return a specific zObject given its ID.
			 *
			 * @param {number} id
			 * @return {Object} zObjectItem
			 */
			return function ( id ) {
				return state.zobject.filter( function ( item ) {
					return item.id === id;
				} )[ 0 ];
			};
		},
		getNestedZObjectById: function ( state, getters ) {
			/**
			 * Return a specific zObject given a series of keys.
			 *
			 * @param {number} id
			 * @param {Array} keys
			 * @return {Object} zObjectItem
			 */
			return function ( id, keys ) {
				var list = getters.getZObjectChildrenById( id ),
					res;

				for ( var k = 0; k < keys.length; k++ ) {
					var key = keys[ k ];
					res = typeUtils.findKeyInArray( key, list );

					if ( res && k !== keys.length ) {
						list = getters.getZObjectChildrenById( res.id );
					} else {
						break;
					}
				}

				return res;
			};
		},
		getZObjectIndexById: function ( state ) {
			/**
			 * Return the index of a zObject by its ID. This is mainly used by actions.
			 *
			 * @param {number} id
			 * @return {number} index
			 */
			return function ( id ) {
				var objectIndex = 0;
				state.zobject.forEach( function ( item, index ) {
					if ( item.id === id ) {
						objectIndex = index;
					}
				} );

				return objectIndex;
			};
		},
		getZObjectChildrenById: function ( state ) {
			/**
			 * Return the children of a specific zObject by its ID. The return is in zObjectTree array form.
			 * This method is desinged to return just ONE level of Depth.
			 * This will support development of small reusable components
			 *
			 * @param {number} parentId
			 * @return {Array} zObjectTree
			 */
			return function ( parentId ) {
				if ( parentId === undefined ) {
					return [];
				}

				return state.zobject.filter( function ( object ) {
					return object.parent === parentId;
				} );
			};
		},
		getZObjectChildrenByIdRecursively: function ( state ) {
			/**
			 * Return the children of a specific zObject by its ID. The return is in zObjectTree array form.
			 * This method is desinged to return just ONE level of Depth.
			 * This will support development of small reusable components
			 *
			 * @param {number} parentId
			 * @return {Array} zObjectTree
			 */
			return function ( parentId ) {
				if ( parentId === undefined ) {
					return [];
				}

				function filterObjectByParentId( items, id ) {
					var result = items.filter( function ( item ) {
						return item.parent === id;
					} );

					result.forEach( function ( child ) {
						if ( isNotObjectOrArrayRoot( child ) ) {
							return;
						}

						var nestedResut = filterObjectByParentId( items, child.id );
						result = result.concat( nestedResut );
					} );

					return result;
				}
				return filterObjectByParentId( state.zobject, parentId );
			};
		},
		getZObjectTypeById: function ( state, getters ) {
			/**
			 * Return the type of a specific zObject by its ID. If the type cannot be found it will return undefined
			 *
			 * @param {number} id
			 * @return {string | undefined} type
			 */
			function findZObjectTypeById( id ) {
				var type,
					currentObject = getters.getZObjectById( id ),
					childrenObject = [];
				if ( !currentObject || currentObject.id === currentObject.parent ) {
					return type;
				}
				if ( currentObject.value === '' ) {
					return Constants.Z_STRING;
				}
				switch ( currentObject.value ) {
					case 'array':
						type = Constants.Z_LIST;
						break;
					case 'object':
						childrenObject = getters.getZObjectChildrenById( id );
						var objectType = typeUtils.findKeyInArray( Constants.Z_OBJECT_TYPE, childrenObject ),
							referenceId = typeUtils.findKeyInArray( Constants.Z_REFERENCE_ID, childrenObject ),
							functionCallId = retriveFunctionCallId( getters.getZObjectChildrenById, childrenObject );
						if ( isObjectTypeDeclaration( objectType, currentObject ) ) {
							type = referenceId.value;
						} else if ( isTypedObjectWithCustomComponent( functionCallId ) ) {
							type = functionCallId.value;
						} else if ( functionCallId && isFunctionToType( getters.getZkeys[ functionCallId.value ] ) ) {
							type = Constants.Z_FUNCTION_CALL_TO_TYPE;
						} else if ( isNotObjectOrArrayRoot( objectType ) ) {
							type = objectType.value;
						} else {
							type = findZObjectTypeById( objectType.id );
						}
						break;
					default:
						type = undefined;
						break;
				}
				return type;
			}

			return findZObjectTypeById;
		},
		getZObjectAsJsonById: function ( state ) {
			/**
			 * Return the JSON representation of a specific zObject and its children
			 * using the zObject id value within the zObject array
			 *
			 * @param {number} id
			 * @param {boolean} isArray
			 * @return {Array} zObjectJson
			 */
			return function ( id, isArray ) {
				return zobjectTreeUtils.convertZObjectTreetoJson( state.zobject, id, isArray );
			};
		},
		/**
		 * Return the next key of the root ZObject. So if the current object is a Z1008
		 * and there are currently 2 keys, it will return Z1008K3
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {string} nextKey
		 */
		getNextKey: function ( state, getters ) {
			var zid = getters.getCurrentZObjectId,
				nextKey = zobjectTreeUtils.findLatestKey( state.zobject, zid ) + 1;

			return zid + 'K' + nextKey;
		},
		/**
		 * Return the nextId within the Zobjkect tree. This is required when adding
		 * complex (nested) object withint he tree
		 *
		 * @param {Object} state
		 * @return {string} nextId
		 */
		getNextObjectId: function ( state ) {
			return zobjectTreeUtils.getNextObjectId( state.zobject );
		},
		getZObjectInitialized: function ( state ) {
			return state.ZObjectInitialized;
		}
	},
	mutations: {
		setZObject: function ( state, payload ) {
			state.zobject = payload;
		},
		setZObjectValue: function ( state, payload ) {
			var item = state.zobject[ payload.index ];
			item.value = payload.value;

			state.zobject.splice( payload.index, 1, item );
		},
		setZObjectKey: function ( state, payload ) {
			var item = state.zobject[ payload.index ];
			item.key = payload.key;

			state.zobject.splice( payload.index, 1, item );
		},
		setZObjectParent: function ( state, payload ) {
			var item = state.zobject[ payload.index ];
			item.parent = payload.parent;

			state.zobject.splice( payload.index, 1, item );
		},
		removeZObject: function ( state, index ) {
			state.zobject.splice( index, 1 );
		},
		addZObject: function ( state, payload ) {
			state.zobject.push( payload );
		},
		setCreateNewPage: function ( state, payload ) {
			state.createNewPage = payload;
		},
		setMessage: function ( state, payload ) {
			if ( !payload ) {
				payload = {};
			}

			state.zobjectMessage = {
				type: payload.type || 'notice',
				text: payload.text || null
			};
		},
		setZObjectInitialized: function ( state, value ) {
			state.ZObjectInitialized = value;
		},
		setIsSavingZObject: function ( state, payload ) {
			state.isSavingZObject = payload;
		}
	},
	actions: {
		/**
		 * Handles the conversion and initization of a zObject.
		 * The Object received by the server is in JSON format, so we convert it
		 * to our Tree structure.
		 *
		 * @param {Object} context
		 */
		initializeZObject: function ( context ) {
			var editingData = mw.config.get( 'wgWikiLambda' ),
				createNewPage = editingData.createNewPage,
				zobject = {},
				zobjectTree = [],
				zId = editingData.zId,
				rootObject;

			context.commit( 'setCreateNewPage', createNewPage );

			// if create new page Z2 of Z0
			if ( createNewPage ) {
				rootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };
				context.commit( 'addZObject', rootObject );

				context.dispatch( 'changeType', {
					id: 0,
					type: Constants.Z_PERSISTENTOBJECT
				} ).then( function () {
					var defaultZid = getParameterByName( 'zid' ),
						defaultKeys;

					if ( !defaultZid || !defaultZid.match( /Z[1-9]\d*$/ ) ) {
						return Promise.resolve();
					}

					return context.dispatch( 'fetchZKeys', [ defaultZid ] )
						.then( function () {
							var Z2K2 =
								typeUtils.findKeyInArray( Constants.Z_PERSISTENTOBJECT_VALUE, context.state.zobject );
							defaultKeys = context.rootGetters.getZkeys[ defaultZid ];

							if ( !defaultKeys ||
								defaultKeys[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] !==
								Constants.Z_TYPE
							) {
								return Promise.resolve();
							}

							return context.dispatch( 'changeType', {
								id: Z2K2.id,
								type: defaultZid
							} );
						} );
				} );

				context.commit( 'setZObjectInitialized', true );
			// if Zid is set
			} else if ( zId ) {
				context.dispatch( 'fetchZKeys', [ zId ] )
					.then( function () {
						zobject = context.getters.getZkeys[ zId ];
						if ( !zobject[ Constants.Z_PERSISTENTOBJECT_ALIASES ] ) {
							zobject[ Constants.Z_PERSISTENTOBJECT_ALIASES ] = {
								Z1K1: Constants.Z_MULTILINGUALSTRINGSET,
								Z32K1: []
							};
						}

						zobjectTree = zobjectTreeUtils.convertZObjectToTree( zobject );

						// Get all zIds within the object
						var listOfZIdWithinObject = generateZIDListFromObjectTree( zobjectTree );

						context.dispatch( 'fetchZKeys', listOfZIdWithinObject );
						context.commit( 'setZObject', zobjectTree );
						context.commit( 'setZObjectInitialized', true );
					} );

			// TODO: improve, this is too weak
			} else {
				rootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };
				context.commit( 'addZObject', rootObject );

				context.dispatch( 'changeType', {
					id: 0,
					type: Constants.Z_FUNCTION_CALL
				} );
				context.commit( 'setZObjectInitialized', true );
			}

		},
		/**
		 * Submit a zObject to the api.
		 * The request is handled differently if new or existing object
		 *
		 * @param {Object} context
		 * @param {Object} summary
		 * @return {Promise}
		 */
		submitZObject: function ( context, summary ) {
			context.commit( 'setIsSavingZObject', true );
			var zobject = canonicalize( zobjectTreeUtils.convertZObjectTreetoJson( context.state.zobject ) );

			return saveZObject(
				zobject,
				context.getters.isCreateNewPage ? undefined : context.getters.getCurrentZObjectId,
				summary
			).then( function ( result ) {

				context.commit( 'setIsSavingZObject', false );
				return result.page;

			} ).catch( function ( error ) {

				context.commit( 'setIsSavingZObject', false );

				context.commit( 'setMessage', {
					type: 'error',
					text: error && error.error ? error.error.info : ''
				} );

				return false;
			} );
		},
		/**
		 * Set the value of the page zObject. This updates the title and set the ZObject value
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		setPageZObjectValue: function ( context, payload ) {

			if ( payload.id === undefined || payload.value === undefined ) {
				return;
			}

			// Update page title
			if ( payload.isMainZObject ) {
				updateZObjectPageTitle( payload.value );
			}

			// Update ZObject value
			context.dispatch( 'setZObjectValue', {
				id: payload.id,
				value: payload.value
			} );
		},
		/**
		 * Set the value of a specific Zobject. This method is called multiple times when adding a nested object.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		setZObjectValue: function ( context, payload ) {
			var objectIndex;

			if ( payload.id === undefined || payload.value === undefined ) {
				return;
			}

			objectIndex = context.getters.getZObjectIndexById( payload.id );
			payload.index = objectIndex;

			context.commit( 'setZObjectValue', payload );
		},
		/**
		 * Set the parent of a specific Zobject.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		setZObjectParent: function ( context, payload ) {
			var objectIndex;
			if ( payload.id === undefined || payload.parent === undefined ) {
				return;
			}
			objectIndex = context.getters.getZObjectIndexById( payload.id );
			payload.index = objectIndex;
			context.commit( 'setZObjectParent', payload );
		},
		/**
		 * Handles the conversion and initization of a zObject.
		 * The Object received by the server is in JSON format, so we convert it
		 * to our Tree structure.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @return {Promise} type
		 */
		injectZObject: function ( context, payload ) {
			var zobjectTree = zobjectTreeUtils.convertZObjectToTree(
					payload.zobject,
					payload.key,
					payload.id,
					payload.parent
				),
				zobjectRoot = zobjectTree.shift();

			context.dispatch( 'removeZObjectChildren', payload.id );
			context.dispatch( 'setZObjectValue', zobjectRoot );
			zobjectTree.forEach( function ( zobject ) {
				var nextId = zobjectTreeUtils.getNextObjectId( context.state.zobject );
				zobjectTree.forEach( function ( childZObject ) {
					if ( !childZObject.matched && childZObject.parent === zobject.id ) {
						childZObject.parent = nextId;
						childZObject.matched = true;
					}
				} );
				zobject.id = nextId;
				context.dispatch( 'addZObject', zobject );
			} );
			// We use native Promises with a polyfill, so this should work even in IE11
			// eslint-disable-next-line compat/compat
			return Promise.resolve( context.getters.getZObjectTypeById( zobjectRoot.id ) );

		},
		/**
		 * Recalculate the keys of a ZList
		 * This should be used when an item is removed from a ZList
		 *
		 * @param {Object} context
		 * @param {number} zListId
		 */
		recalculateZListIndex: function ( context, zListId ) {
			var zList = context.getters.getZObjectChildrenById( zListId );

			zList.forEach( function ( zObject, index ) {
				context.commit( 'setZObjectKey', {
					index: context.getters.getZObjectIndexById( zObject.id ),
					key: index
				} );
			} );
		},
		/**
		 * Set the programing language for a specific zCode object.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z61, Z61K1: payload.value }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		setZCodeLanguage: function ( context, payload ) {
			var zobject = context.getters.getZObjectById( payload.id );

			context.dispatch( 'injectZObject', {
				zobject: {
					Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
					Z61K1: payload.value
				},
				key: Constants.Z_CODE_LANGUAGE,
				id: payload.id,
				parent: zobject.parent
			} );
		},
		setZImplementationType: function ( context, payload ) {
			var zobject = context.getters.getZObjectById( payload.zobjectId ),
				zobjectParent = context.getters.getZObjectById( zobject.parent ),
				json = context.getters.getZObjectAsJsonById( payload.zobjectId );

			switch ( payload.mode ) {
				case 'code':
					json[ Constants.Z_IMPLEMENTATION_CODE ] = {
						Z1K1: Constants.Z_CODE,
						Z16K1: {
							Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
							Z61K1: ''
						},
						Z16K2: ''
					};
					json[ Constants.Z_IMPLEMENTATION_COMPOSITION ] = undefined;
					break;
				case 'composition':
					json[ Constants.Z_IMPLEMENTATION_CODE ] = undefined;
					json[ Constants.Z_IMPLEMENTATION_COMPOSITION ] = {
						Z1K1: Constants.Z_FUNCTION_CALL,
						Z7K1: ''
					};
			}

			context.dispatch( 'injectZObject', {
				zobject: json,
				key: zobjectParent.key,
				id: payload.zobjectId,
				parent: zobjectParent.id
			} );
		},
		/**
		 * Remove a specific zobject. This method does NOT remove its children.
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		removeZObject: function ( context, objectId ) {
			var objectIndex = context.getters.getZObjectIndexById( objectId );
			context.commit( 'removeZObject', objectIndex );
		},
		/**
		 * Remove all the children of a specific zObject. Useful to clean up existing data.
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		removeZObjectChildren: function ( context, objectId ) {
			var children = [],
				childrensId = [];

			if ( [ undefined, null ].indexOf( objectId ) !== -1 ) {
				return;
			}

			children = context.getters.getZObjectChildrenById( objectId );
			childrensId = children.map( function ( child ) {
				if ( child.value === 'object' ) {
					context.dispatch( 'removeZObjectChildren', child.id );
				}
				return child.id;
			} );

			childrensId.forEach( function ( id ) {
				context.dispatch( 'removeZObject', id );
			} );
		},
		/**
		 * Add a single entry in the zObject tree.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @return {number} newObjectId
		 */
		addZObject: function ( context, payload ) {
			if ( payload.key === undefined || isNaN( payload.parent ) ) {
				return;
			}
			// we add the value property if not passed in the payload
			if ( !payload.value ) {
				payload.value = undefined;
			}

			payload.id = zobjectTreeUtils.getNextObjectId( context.state.zobject );
			context.commit( 'addZObject', payload );
			return payload.id;
		},
		/**
		 * Add a multiple entry in the zObject tree.
		 *
		 * @param {Object} context
		 * @param {Array} zObjectItems
		 * @return {Array} newObjectIds
		 */
		addZObjects: function ( context, zObjectItems ) {
			var newObjectIds = [];
			zObjectItems.forEach( function ( item ) {
				item.id = zobjectTreeUtils.getNextObjectId( context.state.zobject );
				context.commit( 'addZObject', item );
				newObjectIds.push( item.id );
			} );

			return newObjectIds;
		},
		/**
		 * Reset an object to its initial state
		 *
		 * @param {Object} context Vuex context object
		 * @param {number} zObjectId ZObject ID
		 * @return {Promise}
		 */
		resetZObject: function ( context, zObjectId ) {
			var objectReferenceId = context.getters.getZObjectChildrenById( zObjectId )
					.filter( function ( child ) {
						return child.key === Constants.Z_REFERENCE_ID;
					} )[ 0 ],
				objectType = typeUtils
					.findKeyInArray(
						Constants.Z_OBJECT_TYPE,
						context.getters.getZObjectChildrenById( zObjectId )
					);
			return context.dispatch( 'changeType', {
				id: zObjectId,
				type: ( objectReferenceId || objectType ).value
			} );
		},
		/**
		 * Lookup a ZObject
		 *
		 * @param {Object} context Vuex context object
		 * @param {number} payload Object containing input(string) and type
		 * @return {Promise}
		 */
		lookupZObject: function ( context, payload ) {
			var api = new mw.Api(),
				queryType = 'wikilambdasearch_labels';
			// eslint-disable-next-line compat/compat
			return new Promise( function ( resolve ) {
				clearTimeout( debounceZObjectLookup );
				debounceZObjectLookup = setTimeout( function () {
					return api.get( {
						action: 'query',
						list: queryType,
						// eslint-disable-next-line camelcase
						wikilambdasearch_search: payload.input,
						// eslint-disable-next-line camelcase
						wikilambdasearch_type: payload.type,
						// eslint-disable-next-line camelcase
						wikilambdasearch_return_type: payload.returnType,
						// eslint-disable-next-line camelcase
						wikilambdasearch_language: context.getters.getZLang
					} ).then( function ( data ) {
						var lookupResults = [];
						if ( ( 'query' in data ) && ( queryType in data.query ) ) {
							lookupResults = data.query[ queryType ];
						}
						return resolve( lookupResults );
					} );
				}, DEBOUNCE_ZOBJECT_LOOKUP_TIMEOUT );
			} );
		}
	}
};
