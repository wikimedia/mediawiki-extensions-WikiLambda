/*!
 * WikiLambda Vue editor: zTypedLists Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

module.exports = exports = {
	state: {
		invalidListItems: {}
	},
	getters: {
		getInvalidListItems: function ( state ) {
			return state.invalidListItems;
		},
		hasInvalidListItems: function ( state ) {
			return ( Object.keys( state.invalidListItems ).length > 0 );
		}
	},
	mutations: {
		setInvalidListItems: function ( state, payload ) {
			state.invalidListItems[ payload.parentRowId ] = payload.listItems;
		},
		clearInvalidListItems: function ( state ) {
			state.invalidListItems = {};
		}
	},
	actions: {
		/**
		 * Set items to remove for a particular list ID
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {boolean} payload.parentRowId
		 * @param {boolean} payload.listItems
		 */
		setListItemsForRemoval: function ( context, payload ) {
			context.commit( 'setInvalidListItems', payload );
		},
		/**
		 * Clear the collection of list items to remove
		 *
		 * @param {Object} context
		 */
		clearListItemsForRemoval: function ( context ) {
			context.commit( 'clearInvalidListItems' );
		}
	}
};
