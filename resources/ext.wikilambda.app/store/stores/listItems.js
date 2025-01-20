/*!
 * WikiLambda Vue editor: Handle item actions on the existing typed lists. (Pinia)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = {
	state: {
		invalidListItems: {}
	},

	getters: {
		/**
		 * Get the invalid list items
		 *
		 * @param {Object} state
		 * @return {Object}
		 */
		getInvalidListItems: function ( state ) {
			return state.invalidListItems;
		},

		/**
		 * Check if there are any invalid list items
		 *
		 * @param {Object} state
		 * @return {boolean}
		 */
		hasInvalidListItems: function ( state ) {
			return Object.keys( state.invalidListItems ).length > 0;
		}
	},

	actions: {
		/**
		 * Set invalid list items for a particular list ID
		 *
		 * @param {Object} payload
		 * @param {boolean} payload.parentRowId
		 * @param {boolean} payload.listItems
		 */
		setInvalidListItems: function ( payload ) {
			this.invalidListItems[ payload.parentRowId ] = payload.listItems;
		},

		/**
		 * Clear invalid list items
		 */
		clearInvalidListItems: function () {
			this.invalidListItems = {};
		}
	}
};
