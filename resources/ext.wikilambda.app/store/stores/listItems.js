/*!
 * WikiLambda Vue editor: Handle item actions on the existing typed lists. (Pinia)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' ); // Import Constants
const { getZObjectType, relocateListItemKeyPaths } = require( '../../utils/zobjectUtils.js' );
const { typeToString } = require( '../../utils/typeUtils.js' );

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
		},

		/**
		 * Returns whether a list item does not match the item type of its list.
		 * All items match a list of Z1/Object.
		 *
		 * @return {Function}
		 */
		isInvalidListItem: function () {
			/**
			 * @param {Object} item list item, in hybrid form
			 * @param {Object|string} itemType item type of the list, in canonical form
			 * @return {boolean}
			 */
			const findIsInvalidListItem = ( item, itemType ) => itemType !== Constants.Z_OBJECT &&
				typeToString( itemType ) !== typeToString( getZObjectType( item ) );
			return findIsInvalidListItem;
		}
	},

	actions: {
		/**
		 * Set invalid list items for a particular list ID
		 *
		 * @param {Object} payload
		 * @param {string} payload.listId
		 * @param {Array<string>} payload.listItems
		 */
		setInvalidListItems: function ( payload ) {
			this.invalidListItems[ payload.listId ] = payload.listItems;
		},

		/**
		 * Clear invalid list items for a particular list ID
		 *
		 * @param {string} listId
		 */
		clearInvalidListItems: function ( listId ) {
			// Remove the entry, so that hasInvalidListItems becomes false
			delete this.invalidListItems[ listId ];
		},

		/**
		 * Relocates the invalid list items when the user deletes, inserts or
		 * moves items of a typed list, so that the marks follow their items
		 * instead of staying with the array indexes. This updates the indexes
		 * of the list, and the key paths of the lists inside its items.
		 *
		 * @param {Array} listKeyPath keyPath of the list
		 * @param {Function} remap gets the old index of an item, and returns
		 *  its new index, or -1 if the item was deleted
		 */
		relocateInvalidListItems: function ( listKeyPath, remap ) {
			const listId = listKeyPath.join( '.' );
			const relocated = relocateListItemKeyPaths( this.invalidListItems, listKeyPath, remap );

			if ( listId in relocated ) {
				relocated[ listId ] = relocated[ listId ].map( remap ).filter( ( index ) => index !== -1 );
			}

			this.invalidListItems = relocated;
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
		 * @param {string} payload.keyPath
		 * @param {Array} payload.objectValue
		 * @param {Object|string} payload.newType
		 */
		handleListTypeChange: function ( { keyPath, objectValue, newType } ) {
			// objectValue must be an array with items (other than the benjamin)
			if ( !objectValue || !Array.isArray( objectValue ) || objectValue.length <= 1 ) {
				return;
			}

			const anyType = newType === Constants.Z_OBJECT;
			const itemIndexes = Object.keys( objectValue ).slice( 1 ).map( Number );

			// If the type was changed to Object/Z1, clear errors and invalid items for the listId (its keyPath)
			if ( anyType ) {
				this.clearErrors( keyPath );
				this.clearInvalidListItems( keyPath );
				return;
			}

			// Set invalid list items
			const listItems = [];
			itemIndexes.forEach( ( index ) => {
				if ( this.isInvalidListItem( objectValue[ index ], newType ) ) {
					listItems.push( index );
				}
			} );

			// If the type was changed to a different type and there are list items, show a warning
			if (
				!this.hasErrorByKey( keyPath, 'wikilambda-list-type-change-warning' ) &&
				listItems.length > 0
			) {
				// If the typed list type changed error has not been set, set it
				this.setError( {
					errorId: Constants.STORED_OBJECTS.MAIN,
					errorMessageKey: 'wikilambda-list-type-change-warning',
					errorType: Constants.ERROR_TYPES.WARNING
				} );
			}

			this.setInvalidListItems( {
				listId: keyPath,
				listItems
			} );
		}
	}
};
