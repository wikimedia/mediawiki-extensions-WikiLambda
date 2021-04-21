/*!
 * WikiLambda Vue editor: ZOBject Vuex module
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ).methods;

function convertZObjectToTree( zObject, startingKey, startingId, startingParentId ) {

	var zObjectTree = [];

	function tranverseJson( value, key, parentId ) {
		var valueType = typeof value,
			currentId = zObjectTree.length,
			type = Array.isArray( value ) ? 'array' : 'object',
			objectKey;

		if ( valueType === 'object' ) {
			zObjectTree.push( { id: currentId, key: key, value: type, parent: parentId } );
			for ( objectKey in value ) {
				tranverseJson( value[ objectKey ], objectKey, currentId );
			}
		} else {
			zObjectTree.push( { id: zObjectTree.length, key: key, value: value, parent: parentId } );
		}
	}

	if ( startingId !== undefined ) {
		zObjectTree.length = startingId;
	}
	tranverseJson( zObject, startingKey, startingParentId );

	if ( startingId !== undefined ) {
		zObjectTree.splice( 0, startingId );
	}
	return zObjectTree;
}
function convertZObjectTreetoJson( zObjectTree, parentId, rootIsArray ) {
	function reconstructJson( object, layer, isArrayChild ) {
		var json = {},
			value,
			currentElements = object.filter( function ( item ) {
				return item.parent === layer;
			} );

		if ( currentElements.length === 0 && !isArrayChild ) {
			return;
		}

		// if array children, we need to return an array not an object
		if ( isArrayChild ) {
			json = [];
		}

		currentElements.forEach( function ( currentElement ) {
			switch ( currentElement.value ) {
				case 'array':
					value = reconstructJson( object, currentElement.id, true );
					json[ currentElement.key ] = value;
					break;
				case 'object':
					if ( isArrayChild ) {
						json[ currentElement.key ] = reconstructJson( object, currentElement.id );
					} else if ( !currentElement.key ) {
						json = reconstructJson( object, currentElement.id );
					} else {
						json[ currentElement.key ] = reconstructJson( object, currentElement.id );
					}
					break;

				default:
					json[ currentElement.key ] = currentElement.value;
					break;
			}
		} );

		return json;
	}
	return reconstructJson( zObjectTree, parentId, rootIsArray );
}
function getNextObjectId( zObject ) {
	var higherstObejectId = 0;

	if ( !zObject || zObject.length === 0 ) {
		return higherstObejectId;
	}

	zObject.forEach( function ( item ) {
		if ( item.id > higherstObejectId ) {
			higherstObejectId = item.id;
		}
	} );
	return higherstObejectId + 1;
}
function findLatestKey( zObject, zid ) {
	var nextKey = 0,
		potentialKey = null;
	zObject.forEach( function ( item ) {
		if ( item.value && item.value.match( /Z([0-9])+K([0-9])+/g ) ) {
			potentialKey = item.value.replace( zid + 'K', '' );
			if ( potentialKey > nextKey ) {
				nextKey = potentialKey;
			}
		}
	} );
	return parseInt( nextKey, 10 );
}

module.exports = {
	state: {
		zobject: [],
		createNewPage: true,
		zobjectMessage: {
			type: 'error',
			text: null
		}
	},
	getters: {
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
				return state.zobject.filter( function ( object ) {
					return object.parent === parentId;
				} );
			};
		},
		getZObjectTypeById: function ( state, getters ) {
			/**
			 * Return the type of a specific zObject by its ID. If the type cannot be found it will return undefined
			 *
			 * @param {number} id
			 * @return {string | undefined} type
			 */
			return function ( id ) {
				var type,
					currentObject = getters.getZObjectById( id ),
					childrenObject = [];
				if ( !currentObject ) {
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
						childrenObject.forEach( function ( object ) {
							if ( object.key === Constants.Z_OBJECT_TYPE ) {
								type = object.value;
							}
						} );
						break;
					default:
						type = undefined;
						break;
				}

				return type;
			};
		},
		getZObjectAsJson: function ( state ) {
			/**
			 * Return the complete zObject as a JSON
			 *
			 * @return {Array} zObjectJson
			 */
			return convertZObjectTreetoJson( state.zobject );
		},
		getZObjectAsJsonById: function ( state ) {
			/**
			 * Return the JSON representation of a specific zObject and its children
			 *
			 * @param {number} id
			 * @param {boolean} isArray
			 * @return {Array} zObjectJson
			 */
			return function ( id, isArray ) {
				return convertZObjectTreetoJson( state.zobject, id, isArray );
			};
		},
		/**
		 * Return the root ZObjectId, equivalend to the Z_REFERENCE_ID of Z_PERSISTENTOBJECT_ID
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {string} currentZObjectId
		 */
		getCurrentZObjectId: function ( state, getters ) {
			var persistentObjectId = typeUtils.findKeyInArray( Constants.Z_PERSISTENTOBJECT_ID, state.zobject ).id,
				persistenObjectChildren = getters.getZObjectChildrenById( persistentObjectId ),
				zReferenceId = typeUtils.findKeyInArray( Constants.Z_REFERENCE_ID, persistenObjectChildren );

			return zReferenceId.value || Constants.NEW_ZID_PLACEHOLDER;
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
				nextKey = findLatestKey( state.zobject, zid ) + 1;

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
			return getNextObjectId( state.zobject );
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
				zobject = JSON.parse( JSON.stringify( editingData.zobject ) ),
				zobjectTree = [],
				innerZobject = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
			if ( innerZobject !== null && createNewPage ) {
				zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ] = null;
			}

			zobjectTree = convertZObjectToTree( zobject );
			context.commit( 'setZObject', zobjectTree );
			context.commit( 'setCreateNewPage', createNewPage );
		},
		/**
		 * Submit a zObject to the api.
		 * The request is handled differently if new or existing object
		 *
		 * @param {Object} context
		 * @param {Object} summary
		 */
		submitZObject: function ( context, summary ) {
			var api = new mw.Api(),
				action = 'wikilambda_edit',
				createNewPage = context.getters.isCreateNewPage,
				zobject = convertZObjectTreetoJson( context.state.zobject );

			if ( createNewPage ) {
				// TODO: If the page already exists, increment the counter until we get a free one.
				api.post( {
					action: action,
					summary: summary,
					zobject: JSON.stringify( zobject )
				} ).then( function ( result ) {
					window.location.href = new mw.Title( result[ action ].page ).getUrl();
				} ).catch( function ( errorCode, result ) {
					context.commit( 'setMessage', {
						type: 'error',
						text: result.error.info
					} );
				} );
			} else {
				api.post( {
					action: action,
					summary: summary,
					zid: context.getters.getCurrentZObjectId,
					zobject: JSON.stringify( zobject )
				} ).then( function ( result ) {
					window.location.href = new mw.Title( result[ action ].page ).getUrl();
				} ).catch( function ( errorCode, result ) {
					context.commit( 'setMessage', {
						type: 'error',
						text: result.error.info
					} );
				} );
			}
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
		 * Set the programing language for a specific zCode object.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z61, Z61K1: payload.value }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		setZCodeLanguage: function ( context, payload ) {
			var zObjectItems = [];
			context.dispatch( 'removeZObjectChildren', payload.id );
			context.dispatch( 'setZObjectValue', {
				id: payload.id,
				value: 'object'
			} );

			zObjectItems = [
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_PROGRAMMING_LANGUAGE, parent: payload.id },
				{ key: Constants.Z_PROGRAMMING_LANGUAGE_CODE, value: payload.value, parent: payload.id }
			];
			context.dispatch( 'addZObjects', zObjectItems );

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

			children = context.getters.getZObjectChildrenById( objectId );
			childrensId = children.map( function ( child ) {
				return child.id;
			} );

			childrensId.forEach( function ( id ) {
				context.dispatch( 'removeZObject', id );
			} );
		},
		/**
		 * Create the required entry in the zobject array for a zMonolingualString.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z11, Z11K1: payload.lang, Z11k2: '' }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		addZMonolingualString: function ( context, payload ) {
			var nextId = getNextObjectId( context.state.zobject ),
				numberOfLanguageInArray = context.getters.getZObjectChildrenById( payload.parentId ).length,
				zObjectItems = [];
			if ( !payload.lang || !payload.parentId ) {
				return;
			}

			zObjectItems = [
				{ key: numberOfLanguageInArray, value: 'object', parent: payload.parentId },
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_MONOLINGUALSTRING, parent: nextId },
				{ key: Constants.Z_MONOLINGUALSTRING_LANGUAGE, value: payload.lang, parent: nextId },
				{ key: Constants.Z_MONOLINGUALSTRING_VALUE, parent: nextId }
			];
			context.dispatch( 'addZObjects', zObjectItems );

		},
		/**
		 * Create the required entry in the zobject array for a zMultilingualString.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z12, Z12K1: [] }
		 *
		 * @param {Object} context
		 * @param {Object} objectId
		 */
		addZMultilingualString: function ( context, objectId ) {
			var zObjectItems = [];
			context.dispatch( 'setZObjectValue', {
				id: objectId,
				value: 'object'
			} );
			zObjectItems = [
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_MULTILINGUALSTRING, parent: objectId },
				{ key: Constants.Z_MULTILINGUALSTRING_VALUE, value: 'array', parent: objectId }
			];
			context.dispatch( 'addZObjects', zObjectItems );
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
		 * Create the required entry in the zobject array for a zReference.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z9, Z9K1: '' }
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		addZReference: function ( context, objectId ) {
			var zObjectItems = [];
			context.dispatch( 'setZObjectValue', {
				id: objectId,
				value: 'object'
			} );
			zObjectItems = [
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: objectId },
				{ key: Constants.Z_REFERENCE_ID, value: '', parent: objectId }
			];
			context.dispatch( 'addZObjects', zObjectItems );
		},
		/**
		 * Create the required entry in the zobject array for a zCode.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z16, Z16K1: {}, Z16K2: '' }
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		addZCode: function ( context, objectId ) {
			var zObjectItems = [];
			context.dispatch( 'setZObjectValue', {
				id: objectId,
				value: 'object'
			} );
			zObjectItems = [
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_CODE, parent: objectId },
				{ key: Constants.Z_CODE_LANGUAGE, value: 'object', parent: objectId },
				{ key: Constants.Z_CODE_CODE, value: '', parent: objectId }
			];
			context.dispatch( 'addZObjects', zObjectItems );
		},
		/**
		 * Create the required entry in the zobject array for a zArgument.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z17, Z17K1: '', Z17K2: { Z1K1: Z6, Z6K1: Z0K1 }, K17K3: { Z1K1: Z12, Z12K1: [] }   }
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		addZArgument: function ( context, objectId ) {
			var zObjectItems = [],
				nextId;
			context.dispatch( 'setZObjectValue', {
				id: objectId,
				value: 'object'
			} );
			zObjectItems = [
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_ARGUMENT, parent: objectId },
				{ key: Constants.Z_ARGUMENT_TYPE, value: '', parent: objectId }
			];
			context.dispatch( 'addZObjects', zObjectItems );

			// We calculate the next id, and create the argument label
			nextId = getNextObjectId( context.state.zobject );
			// we create the base object that will be used to scaffold the ZString
			context.dispatch( 'addZObject', { key: Constants.Z_ARGUMENT_LABEL, value: 'object', parent: objectId } );
			context.dispatch( 'addZMultilingualString', nextId );

			// We calculate the id again, and set the key
			nextId = getNextObjectId( context.state.zobject );
			// we create the base object that will be used to scaffold the ZString
			context.dispatch( 'addZObject', { key: Constants.Z_ARGUMENT_KEY, value: 'object', parent: objectId } );
			context.dispatch( 'addZString', { id: nextId, value: context.getters.getNextKey } );
		},
		/**
		 * Create the required entry in the zobject array for a zArgument.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: Z7, Z7K1: '' }
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		addZFunctionCall: function ( context, objectId ) {
			var zObjectItems = [];
			context.dispatch( 'setZObjectValue', {
				id: objectId,
				value: 'object'
			} );
			zObjectItems = [
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_FUNCTION_CALL, parent: objectId },
				{ key: Constants.Z_FUNCTION_CALL_FUNCTION, value: '', parent: objectId }
			];
			context.dispatch( 'addZObjects', zObjectItems );
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
				objectKey;
			context.dispatch( 'setZObjectValue', {
				id: payload.id,
				value: 'object'
			} );

			zObjectItems = [
				{ key: Constants.Z_OBJECT_TYPE, value: payload.type, parent: payload.id }
			];

			context.dispatch( 'addZObjects', zObjectItems );

			// we fetch a list of keys within this generic object
			if ( payload.type !== Constants.Z_OBJECT && context.rootState.zKeys[ payload.type ] ) {
				keys = context
					.rootState
					.zKeys[ payload.type ][ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];

				// we add each key in the tree and also set its type
				keys.forEach( function ( key ) {
					objectKey = key[ Constants.Z_KEY_ID ][ Constants.Z_STRING_VALUE ];
					context.dispatch( 'addZObject', { key: objectKey, value: 'object', parent: payload.id } );
				} );
			}

		},
		/**
		 * Add a single entry in the zObject tree.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		addZObject: function ( context, payload ) {
			if ( payload.key === undefined || isNaN( payload.parent ) ) {
				return;
			}
			// we add the value property if not passed in the payload
			if ( !payload.value ) {
				payload.value = undefined;
			}

			payload.id = getNextObjectId( context.state.zobject );
			context.commit( 'addZObject', payload );
		},
		/**
		 * Add a multiple entry in the zObject tree.
		 *
		 * @param {Object} context
		 * @param {Array} zObjectItems
		 */
		addZObjects: function ( context, zObjectItems ) {
			zObjectItems.forEach( function ( item ) {
				item.id = getNextObjectId( context.state.zobject );
				context.commit( 'addZObject', item );
			} );
		},
		/**
		 * Reset an object to its initial state
		 *
		 * @param {Object} context Vuex context object
		 * @param {number} zObjectId ZObject ID
		 */
		resetZObject: function ( context, zObjectId ) {
			context.dispatch( 'changeType', {
				id: zObjectId,
				type: typeUtils
					.findKeyInArray(
						Constants.Z_OBJECT_TYPE,
						context.getters.getZObjectChildrenById( zObjectId )
					)
					.value
			} );
		},
		/**
		 * Changes the type of a specific zObject.
		 * This is the central point for handling the object scaffolding
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 */
		changeType: function ( context, payload ) {
			context.dispatch( 'removeZObjectChildren', payload.id );
			switch ( payload.type ) {
				case Constants.Z_LIST:
					context.dispatch( 'addZList', payload.id );
					break;
				case Constants.Z_REFERENCE:
					context.dispatch( 'addZReference', payload.id );
					break;
				case Constants.Z_CODE:
					context.dispatch( 'addZCode', payload.id );
					break;
				case Constants.Z_STRING:
					context.dispatch( 'addZString', { id: payload.id } );
					break;
				case Constants.Z_MULTILINGUALSTRING:
					context.dispatch( 'addZMultilingualString', payload.id );
					break;
				case Constants.Z_ARGUMENT:
					context.dispatch( 'addZArgument', payload.id );
					break;
				case Constants.Z_FUNCTION_CALL:
					context.dispatch( 'addZFunctionCall', payload.id );
					break;
				default:
					context.dispatch( 'addGenericObject', payload );
					break;
			}
		}
	}
};
