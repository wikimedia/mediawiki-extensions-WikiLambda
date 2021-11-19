/*!
 * WikiLambda Vue editor: zLists Vuex module
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

var Constants = require( '../../Constants.js' ),
	zobjectTreeUtils = require( '../../mixins/zobjectTreeUtils.js' ).methods;

function getNewItemParentId( nestedChildren, rootId ) {
	var items = nestedChildren.filter( function ( child ) {
		return child.key === Constants.Z_TYPED_LIST_NESTED_LIST;
	} );

	if ( items.length === 0 ) {
		return rootId;
	} else {
		return items[ items.length - 1 ].id;
	}
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
		 * Add a new item in a generic list. This will create the following format:
		 * {
		 * K1: { ... structure of the current list item type},
			K2: {
				Z1K1: {
					"Z1K1": "Z7",
					"Z7K1": "Z881",
					"Z881K1": "current list item type"
				}
			}
		 * }
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.id
		 * @param {Array} payload.zObjectChildren
		 */
		addTypedListItem: function ( context, payload ) {
			var currentListType = context.getters.getNestedZObjectById( payload.id,
					[ Constants.Z_OBJECT_TYPE, Constants.Z_TYPED_LIST_TYPE ] ),
				newItemParentId = getNewItemParentId( payload.zObjectChildren, payload.id );

			var nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );

			context.dispatch( 'addZObject', { key: Constants.Z_TYPED_LIST_ELEMENT, value: 'object', parent: newItemParentId } );
			context.dispatch( 'changeType', { id: nextId, type: currentListType.value } );

			nextId = zobjectTreeUtils.getNextObjectId( context.rootState.zobjectModule.zobject );
			context.dispatch( 'addZObject', { key: Constants.Z_TYPED_LIST_NESTED_LIST, value: 'object', parent: newItemParentId } );
			context.dispatch( 'addZTypedList', {
				id: nextId,
				value: currentListType.value
			} );

		},
		/**
		 * Select a type for a generic list.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.objectId
		 * @param {string} payload.type
		 */
		setTypeOfTypedList: function ( context, payload ) {
			var listGenericValue,
				genericNestedInObjectType = context.getters.getNestedZObjectById( payload.objectId,
					[ Constants.Z_OBJECT_TYPE, Constants.Z_TYPED_LIST_TYPE ] );

			// generic Lists can either be nested in a Z_OBJECT_TYPE or not
			if ( genericNestedInObjectType ) {
				genericNestedInObjectType.value = payload.type;
				listGenericValue = genericNestedInObjectType;
			} else {
				var directObject = context.getters.getNestedZObjectById( payload.objectId,
					[ Constants.Z_TYPED_LIST_TYPE ] );
				directObject.value = payload.type;
				listGenericValue = directObject;
			}

			context.dispatch( 'setZObjectValue', listGenericValue );
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
				[ Constants.Z_TYPED_LIST_NESTED_LIST ] );
			var currentItemNestedElement = context.getters.getNestedZObjectById( item.parent,
				[ Constants.Z_TYPED_LIST_NESTED_LIST, Constants.Z_TYPED_LIST_ELEMENT ] );

			// If nested values are available, shift them one level up by changing its parent
			if ( currentItemNestedElement ) {
				var nestedItemNestedList = context.getters.getNestedZObjectById( item.parent,
					[ Constants.Z_TYPED_LIST_NESTED_LIST, Constants.Z_TYPED_LIST_NESTED_LIST ] );

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
