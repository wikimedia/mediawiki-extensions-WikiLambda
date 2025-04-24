/*!
 * WikiLambda Vue editor: Handle item actions on the existing typed lists. (Pinia)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' ); // Import Constants

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
		},

		/**
		 * Handles the logic for when the type of a list changes.
		 * Warns the user that this will delete list items that are incompatible with the new type.
		 * - If the new type is Z1/Object, clears all errors and invalid items.
		 * - If the new type is different and there are existing list items:
		 *   - Sets a warning error to notify the user about the type change.
		 *   - Marks list items with incompatible types as invalid.
		 *
		 * @param {Object} payload
		 * @param {number} payload.parentRowId - The parent row ID of the list.
		 * @param {string} payload.newListItemType - The new type of the list items.
		 */
		handleListTypeChange: function ( { parentRowId, newListItemType } ) {
			const isZObject = newListItemType === Constants.Z_OBJECT;
			const listItemsRowIds = this.getTypedListItemsRowIds( parentRowId );
			const hasListItems = listItemsRowIds.length > 0;

			// If the type was changed to Object/Z1, clear errors and invalid items
			if ( isZObject ) {
				this.clearErrors( 0 );
				this.clearInvalidListItems();
				return;
			}

			// If the type was changed to a different type and there are list items, show a warning
			if ( hasListItems ) {
				// If the typed list type changed error has not been set, set it
				if ( !this.hasErrorByCode( 0, Constants.ERROR_CODES.TYPED_LIST_TYPE_CHANGED ) ) {
					this.setError( {
						rowId: 0,
						errorCode: Constants.ERROR_CODES.TYPED_LIST_TYPE_CHANGED,
						errorType: Constants.ERROR_TYPES.WARNING
					} );
				}

				// Set invalid list items
				this.setInvalidListItems( {
					parentRowId,
					listItems: listItemsRowIds.filter(
						( rowId ) => this.getZObjectTypeByRowId( rowId ) !== newListItemType
					)
				} );
			}
		}
	}
};
