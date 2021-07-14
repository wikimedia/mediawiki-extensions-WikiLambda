/*!
 * WikiLambda Vue editor: ZOBject Vuex module
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ).methods,
	normalize = require( '../../mixins/schemata.js' ).methods.normalizeZObject,
	canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject;

function convertZObjectToTree( zObject, startingKey, startingId, startingParentId ) {

	var zObjectTree = [];

	function tranverseJson( value, key, parentId ) {
		var valueType = typeUtils.getZObjectType( value ),
			currentId = zObjectTree.length,
			type,
			objectKey;

		if ( typeof value === 'string' ) {
			zObjectTree.push( { id: currentId, key: key, value: value, parent: parentId } );
			return;
		}

		switch ( valueType ) {
			case Constants.Z_REFERENCE:
			case Constants.Z_STRING:
				zObjectTree.push( {
					id: currentId,
					key: key,
					value: 'object',
					parent: parentId
				} );
				for ( objectKey in value ) {
					tranverseJson( value[ objectKey ], objectKey, currentId );
				}
				break;
			default:
				type = valueType === Constants.Z_LIST ? 'array' : 'object';
				zObjectTree.push( { id: currentId, key: key, value: type, parent: parentId } );
				for ( objectKey in value ) {
					// We make sure that the current Key does not expect a raw string

					tranverseJson( value[ objectKey ], objectKey, currentId );
				}
				break;
		}
	}

	if ( startingId !== undefined ) {
		zObjectTree.length = startingId;
	}
	tranverseJson( normalize( zObject ), startingKey, startingParentId );

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
		if ( item.value && item.value.match( /^Z([0-9])+K([0-9])+$/g ) ) {
			potentialKey = item.value.replace( zid + 'K', '' );
			if ( potentialKey > nextKey ) {
				nextKey = potentialKey;
			}
		}
	} );
	return parseInt( nextKey, 10 );
}
function getParameterByName( name ) {
	name = name.replace( /[[]]/g, '\\$&' );
	var regex = new RegExp( '[?&]' + name + '(=([^&#]*)|&|#|$)' ),
		results = regex.exec( window.location.href );
	if ( !results ) {
		return null;
	}

	if ( !results[ 2 ] ) {
		return '';
	}

	return decodeURIComponent( results[ 2 ].replace( /\+/g, ' ' ) );
}

module.exports = {
	state: {
		zobject: [],
		createNewPage: true,
		zobjectMessage: {
			type: 'error',
			text: null
		},
		ZObjectInitialized: false
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
					res,
					last = keys[ keys.length - 1 ];

				for ( var k = 0; k < keys.length; k++ ) {
					var key = keys[ k ];
					res = typeUtils.findKeyInArray( key, list );

					if ( res && key !== last ) {
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
			function findZObjectTypeById( id ) {
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
								if ( object.value === Constants.Z_REFERENCE &&
									currentObject.key === Constants.Z_OBJECT_TYPE
								) {
									type = typeUtils.findKeyInArray( Constants.Z_REFERENCE_ID, childrenObject ).value;
								} else if ( [ 'array', 'object' ].indexOf( object.value ) === -1 ) {
									type = object.value;
								} else {
									type = findZObjectTypeById( object.id );
								}
							}
						} );
						break;
					default:
						type = undefined;
						break;
				}
				return type;
			}

			return findZObjectTypeById;
		},
		getZObjectAsJson: function ( state ) {
			/**
			 * Return the complete zObject as a JSON
			 *
			 * @return {Array} zObjectJson
			 */
			return convertZObjectTreetoJson( state.zobject, 0, state.zobject[ 0 ].value === 'array' );
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
							defaultKeys = context.rootGetters.getZkeys[ defaultZid ];

							if ( !defaultKeys ||
								defaultKeys[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] !==
								Constants.Z_TYPE
							) {
								return Promise.resolve();
							}

							return context.dispatch( 'changeType', {
								id: 3,
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

						zobjectTree = convertZObjectToTree( zobject );
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
		 */
		submitZObject: function ( context, summary ) {
			var api = new mw.Api(),
				action = 'wikilambda_edit',
				zobject = canonicalize( convertZObjectTreetoJson( context.state.zobject ) );

			api.postWithEditToken( {
				action: action,
				summary: summary,
				zid: context.getters.isCreateNewPage ? undefined : context.getters.getCurrentZObjectId,
				zobject: JSON.stringify( zobject )
			} ).then( function ( result ) {
				window.location.href = new mw.Title( result[ action ].page ).getUrl();
			} ).catch( function ( errorCode, result ) {
				context.commit( 'setMessage', {
					type: 'error',
					text: result.error.info
				} );
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
		 * Handles the conversion and initization of a zObject.
		 * The Object received by the server is in JSON format, so we convert it
		 * to our Tree structure.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @return {Promise} type
		 */
		injectZObject: function ( context, payload ) {
			var zobjectTree = convertZObjectToTree(
					payload.zobject,
					payload.key,
					payload.id,
					payload.parent
				),
				zobjectRoot = zobjectTree.shift();

			context.dispatch( 'removeZObjectChildren', payload.id );
			context.dispatch( 'setZObjectValue', zobjectRoot );
			zobjectTree.forEach( function ( zobject ) {
				var nextId = context.getters.getNextObjectId;
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
					Z1K1: 'Z61',
					Z61K1: payload.value
				},
				key: 'Z16K1',
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
						Z1K1: 'Z16',
						Z16K1: {
							Z1K1: 'Z61',
							Z61K1: ''
						},
						Z16K2: ''
					};
					json[ Constants.Z_IMPLEMENTATION_COMPOSITION ] = undefined;
					break;
				case 'composition':
					json[ Constants.Z_IMPLEMENTATION_CODE ] = undefined;
					json[ Constants.Z_IMPLEMENTATION_COMPOSITION ] = {
						Z1K1: 'Z7',
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
		 * Create the required entry in the zobject array for a zPersistenObject.
		 * The entry will result in a json representation equal to:
		 * { Z1K1: 'Z2', Z2K1: { Z1K1: 'Z9', Z9K1: 'Z0' }, Z2K2: undefined, Z2K3: { Z1K1: 'Z12', Z12K1: [] } }
		 *
		 * @param {Object} context
		 * @param {number} ObjectId
		 */
		addZPersistentObject: function ( context, ObjectId ) {
			var nextId,
				zObjectItems = [];

			zObjectItems = [
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_PERSISTENTOBJECT, parent: ObjectId }
			];
			context.dispatch( 'addZObjects', zObjectItems );

			// Reference to Z0
			nextId = getNextObjectId( context.state.zobject );
			zObjectItems = [
				{ key: Constants.Z_PERSISTENTOBJECT_ID, value: 'object', parent: ObjectId },
				{ key: Constants.Z_PERSISTENTOBJECT_VALUE, value: 'object', parent: ObjectId }
			];
			context.dispatch( 'addZObjects', zObjectItems );
			context.dispatch( 'addZReference', { id: nextId, value: Constants.NEW_ZID_PLACEHOLDER } );

			// Empty Multil;ingual string
			nextId = getNextObjectId( context.state.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_PERSISTENTOBJECT_LABEL, value: 'object', parent: ObjectId } );
			context.dispatch( 'addZMultilingualString', nextId );
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
			var parentId = getNextObjectId( context.state.zobject ),
				nextId,
				numberOfLanguageInArray = context.getters.getZObjectChildrenById( payload.parentId ).length,
				zObjectItems = [];
			if ( !payload.lang || !payload.parentId ) {
				return;
			}

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
			context.dispatch( 'addZString', { id: nextId, value: '' } );
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
			var nextId;
			context.dispatch( 'setZObjectValue', {
				id: objectId,
				value: 'object'
			} );

			context.dispatch( 'addZObject', { key: Constants.Z_OBJECT_TYPE, value: Constants.Z_MULTILINGUALSTRING, parent: objectId } );

			nextId = getNextObjectId( context.state.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_MULTILINGUALSTRING_VALUE, value: 'array', parent: objectId } );

			context.dispatch( 'addZMonolingualString', {
				parentId: nextId,
				lang: context.getters.getUserZlangZID
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

			nextId = getNextObjectId( context.state.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_ARGUMENT_TYPE, value: 'object', parent: objectId } );
			context.dispatch( 'addZReference', { id: nextId, value: '' } );

			// We calculate the id again, and set the key
			nextId = getNextObjectId( context.state.zobject );
			// we create the base object that will be used to scaffold the ZString
			context.dispatch( 'addZObject', { key: Constants.Z_ARGUMENT_KEY, value: 'object', parent: objectId } );
			context.dispatch( 'addZString', { id: nextId, value: context.getters.getNextKey } );

			// We calculate the next id, and create the argument label
			nextId = getNextObjectId( context.state.zobject );
			// we create the base object that will be used to scaffold the ZString
			context.dispatch( 'addZObject', { key: Constants.Z_ARGUMENT_LABEL, value: 'object', parent: objectId } );
			context.dispatch( 'addZMultilingualString', nextId );
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
									context.state.zobject
								).id
							)
						).id
					)
				),
				defaultFunctionValue = isPersistentImplementation ?
					getParameterByName( Constants.Z_IMPLEMENTATION_FUNCTION ) || '' :
					context.getters.getCurrentZObjectId;

			function setDefaultFunctionReference( id ) {
				if ( !defaultFunctionValue || defaultFunctionValue === 'Z0' ) {
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
			nextId = getNextObjectId( context.state.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_IMPLEMENTATION_FUNCTION, value: 'object', parent: objectId } );
			setDefaultFunctionReference( nextId );

			// Add Composition
			context.dispatch( 'addZObject', { key: Constants.Z_IMPLEMENTATION_COMPOSITION, value: 'object', parent: objectId } );

			// Add ZCode
			nextId = getNextObjectId( context.state.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_IMPLEMENTATION_CODE, value: 'object', parent: objectId } );
			context.dispatch( 'changeType', { id: nextId, type: Constants.Z_CODE } );
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
			nextId = getNextObjectId( context.state.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_FUNCTION_ARGUMENTS, value: 'array', parent: objectId } );
			context.dispatch( 'addZObject', { key: 0, value: 'object', parent: nextId } );
			context.dispatch( 'addZArgument', nextId + 1 );

			// Add return type
			nextId = getNextObjectId( context.state.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_FUNCTION_RETURN_TYPE, value: 'object', parent: objectId } );
			context.dispatch( 'addZReference', { id: nextId, value: '' } );

			context.dispatch( 'addZObjects', [
				{ key: Constants.Z_FUNCTION_TESTERS, value: 'array', parent: objectId },
				{ key: Constants.Z_FUNCTION_IMPLEMENTATIONS, value: 'array', parent: objectId }
			] );

			// Set identity
			nextId = getNextObjectId( context.state.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_FUNCTION_IDENTITY, value: 'object', parent: objectId } );
			context.dispatch( 'addZObjects', [
				{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: nextId },
				{ key: Constants.Z_REFERENCE_ID, value: context.getters.getCurrentZObjectId, parent: nextId }
			] );
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
					nextId = getNextObjectId( context.state.zobject );
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
		 * { "Z1K1": "Z4", "Z4K1": { "Z1K1": "Z9", "Z9K1": "Z0" }, "Z4K2": [], "Z4K3": { "Z1K1": "Z1" } }
		 *
		 * @param {Object} context
		 * @param {number} objectId
		 */
		addZType: function ( context, objectId ) {
			var identity;
			// This action only runs after `addGenericObject` is complete,
			// otherwise it has a race condition with setting the reference
			// value.
			context.dispatch( 'addGenericObject', { id: objectId, type: Constants.Z_TYPE } )
				.then( function () {
					identity = typeUtils.findKeyInArray(
						Constants.Z_TYPE_IDENTITY,
						context.getters.getZObjectChildrenById( objectId )
					);

					context.dispatch( 'removeZObjectChildren', identity.id );
					context.dispatch( 'addZObjects', [
						{
							key: Constants.Z_OBJECT_TYPE,
							value: Constants.Z_REFERENCE,
							parent: identity.id
						},
						{
							key: Constants.Z_REFERENCE_ID,
							value: context.getters.getCurrentZObjectId,
							parent: identity.id
						}
					] );
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

			payload.id = getNextObjectId( context.state.zobject );
			context.commit( 'addZObject', payload );
			return payload.id;
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
							return context.dispatch( 'addZMultilingualString', payload.id );
						case Constants.Z_ARGUMENT:
							return context.dispatch( 'addZArgument', payload.id );
						case Constants.Z_FUNCTION_CALL:
							return context.dispatch( 'addZFunctionCall', payload.id );
						case Constants.Z_FUNCTION:
							return context.dispatch( 'addZFunction', payload.id );
						case Constants.Z_PERSISTENTOBJECT:
							return context.dispatch( 'addZPersistentObject', payload.id );
						case Constants.Z_TYPE:
							return context.dispatch( 'addZType', payload.id );
						case Constants.Z_IMPLEMENTATION:
							return context.dispatch( 'addZImplementation', payload.id );
						default:
							return context.dispatch( 'addGenericObject', payload );
					}
				} );
		}
	}
};
