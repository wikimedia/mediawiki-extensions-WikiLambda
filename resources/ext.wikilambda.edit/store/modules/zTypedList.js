/*!
 * WikiLambda Vue editor: zTypedLists Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var Constants = require( '../../Constants.js' ),
	zobjectTreeUtils = require( '../../mixins/zobjectTreeUtils.js' ).methods;

function getNewItemParentId( nestedChildren, rootId ) {
	var items = nestedChildren.filter( function ( child ) {
		return child.key === Constants.Z_TYPED_OBJECT_ELEMENT_2;
	} );

	if ( items.length === 0 ) {
		return rootId;
	} else {
		return items[ items.length - 1 ].id;
	}
}

/**
 * Set one or multiple types for the specificed typed Object
 *
 * @param {Object} context
 * @param {Object} payload
 * @param {number} payload.objectId
 * @param {Array} payload.types
 * @param {string} payload.types.value
 * @param {string} payload.types.argumentZObjectId
 */
function setTypeOfTypedObject( context, payload ) {

	payload.types.forEach( function ( type ) {
		var genericValue,
			genericObjectType = // the object can either be nested in a Z_OBJECT_TYPE or directly set.
			context.getters.getNestedZObjectById( payload.objectId, [ Constants.Z_OBJECT_TYPE, type.argumentZObjectId ] ) ||
			context.getters.getNestedZObjectById( payload.objectId, [ type.argumentZObjectId ] );

		genericObjectType.value = type.value;
		genericValue = genericObjectType;

		context.dispatch( 'setZObjectValue', genericValue );
	} );

}
module.exports = {
	state: {
	},
	getters: {
	},
	mutations: {
	},
	actions: {
		/**
		 * Add a new item in a typed list. This will create the following format:
		 * {
		 *   "K1": { … structure of the current list item type },
		 *   "K2": {
		 *     "Z1K1": {
		 *       "Z1K1": "Z7",
		 *       "Z7K1": "Z881",
		 *       "Z881K1": "current list item type"
		 *     }
		 *   }
		 * }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.id
		 * @param {string | Object} payload.value
		 */
		addTypedListItem: function ( context, payload ) {

			var nestedChildren = context.getters.getZObjectChildrenByIdRecursively( payload.id ),
				newItemParentId = getNewItemParentId( nestedChildren, payload.id ),
				nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );

			// Create a K1 with the correct type
			context.dispatch( 'addZObject', { key: Constants.Z_TYPED_OBJECT_ELEMENT_1, value: 'object', parent: newItemParentId } );
			if ( payload.value instanceof Object && payload.value.type && payload.value.values ) {
				context.dispatch( 'changeType', { id: nextId, type: payload.value.type, values: payload.value.values, isDeclaration: false } );
			} else {
				context.dispatch( 'changeType', { id: nextId, type: payload.value } );
			}

			// Create a K2 and set its type to the current list type
			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_TYPED_OBJECT_ELEMENT_2, value: 'object', parent: newItemParentId } );
			context.dispatch( 'addZTypedList', {
				id: nextId,
				value: payload.value
			} );

		},
		/**
		 * Add a new item in a typed pair. This will create the following format:
		 * {
		 * K1: { scaffolding for pair type 1 },
		 * K2: { scaffolding for pair type 2 }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.objectId
		 */
		addTypedPairItem: function ( context, payload ) {
			var key1Id = context.getters.getNestedZObjectById( payload.objectId, [ Constants.Z_TYPED_OBJECT_ELEMENT_1 ] ).id;
			context.dispatch( 'changeType', { id: key1Id, type: payload.types[ 0 ].value } );

			var key2Id = context.getters.getNestedZObjectById( payload.objectId, [ Constants.Z_TYPED_OBJECT_ELEMENT_2 ] ).id;
			context.dispatch( 'changeType', { id: key2Id, type: payload.types[ 1 ].value } );

		},
		/**
		 * Select a type for a typed list
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.objectId
		 * @param {string} payload.type
		 */
		setTypeOfTypedList: function ( context, payload ) {
			var type = {
				objectId: payload.objectId,
				types: [ {
					argumentZObjectId: Constants.Z_TYPED_LIST_TYPE,
					value: payload.type
				} ]
			};
			setTypeOfTypedObject( context, type );
		},
		/**
		 * Select types for a typed pair
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.objectId
		 * @param {Array} payload.types
		 */
		setTypeOfTypedPair: function ( context, payload ) {
			if ( payload.types.length < 2 ) {
				return;
			}

			// We set the scaffolding to defien the pair type
			var types = {
				objectId: payload.objectId,
				types: [ {
					argumentZObjectId: Constants.Z_TYPED_PAIR_TYPE1,
					value: payload.types[ 0 ]
				}, {
					argumentZObjectId: Constants.Z_TYPED_PAIR_TYPE2,
					value: payload.types[ 1 ]
				} ]
			};
			setTypeOfTypedObject( context, types );

			// When both types are set, we initialize the newly created pair creating instance of its "types"
			if ( payload.types[ 0 ] && payload.types[ 1 ] ) {
				context.dispatch( 'addTypedPairItem', types );
			}

		},
		/**
		 * Select types for a typed map. This will complete the following action:
		 * - Set the types in the Map declaration
		 * - Create a Pair declaration with the following types
		 * - initialize a typed list with a type of pair
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.objectId
		 * @param {Array} payload.types
		 */
		setTypeOfTypedMap: function ( context, payload ) {
			if ( payload.types.length < 2 ) {
				return;
			}

			// We assign the types to the Map declaration
			var mapObjectElementId = null,
				types = {
					objectId: payload.objectId,
					types: [ {
						argumentZObjectId: Constants.Z_TYPED_MAP_TYPE1,
						value: payload.types[ 0 ]
					}, {
						argumentZObjectId: Constants.Z_TYPED_MAP_TYPE2,
						value: payload.types[ 1 ]
					} ]
				};
			setTypeOfTypedObject( context, types );

			// We return unless both types are defined
			if ( !payload.types[ 0 ] || !payload.types[ 1 ] ) {
				return;
			}
			// We create a K1 (Z_TYPED_OBJECT_ELEMENT_1) in the MAP object
			mapObjectElementId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_TYPED_OBJECT_ELEMENT_1, value: 'object', parent: payload.objectId } );

			// We create list of type pair
			var createTypedListPayload = {
				id: mapObjectElementId,
				type: Constants.Z_TYPED_LIST,
				value: {
					type: Constants.Z_TYPED_PAIR,
					values: payload.types
				}
			};
			context.dispatch( 'changeType', createTypedListPayload );

			context.dispatch( 'addTypedListItem', createTypedListPayload );

		},
		/**
		 * Remove an item from the generic List. Due to the structure of the list.
		 * this required object to be shift accross.
		 *
		 * @param {Object} context
		 * @param {Object} item
		 * @param {number} item.id
		 * @param {number} item.parent
		 */
		removeTypedListItem: function ( context, item ) {
			var currentListItemParentId = context.getters.getZObjectById( item.parent ).id;
			var currentItemK2 = context.getters.getNestedZObjectById( item.parent,
				[ Constants.Z_TYPED_OBJECT_ELEMENT_2 ] );
			var currentItemNestedElement = context.getters.getNestedZObjectById( item.parent,
				[ Constants.Z_TYPED_OBJECT_ELEMENT_2, Constants.Z_TYPED_OBJECT_ELEMENT_1 ] );

			// If nested values are available, shift them one level up by changing its parent
			if ( currentItemNestedElement ) {
				var nestedItemNestedList = context.getters.getNestedZObjectById( item.parent,
					[ Constants.Z_TYPED_OBJECT_ELEMENT_2, Constants.Z_TYPED_OBJECT_ELEMENT_2 ] );

				context.dispatch( 'setZObjectParent', { id: currentItemNestedElement.id, parent: currentListItemParentId } );
				context.dispatch( 'setZObjectParent', { id: nestedItemNestedList.id, parent: currentListItemParentId } );
			}

			// remove the K1 and K2 values and its children
			context.dispatch( 'removeZObjectChildren', item.id );
			context.dispatch( 'removeZObject', item.id );
			context.dispatch( 'removeZObjectChildren', currentItemK2.id );
			context.dispatch( 'removeZObject', currentItemK2.id );
		}
	}
};
