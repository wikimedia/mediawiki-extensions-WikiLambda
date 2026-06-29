/*!
 * Menu action composable for Vue 3 Composition API.
 * Provides functions to handle actions from the Mode Selector
 * and Fragment Menus
 *
 * @module ext.wikilambda.app.composables.useMenuActions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../Constants.js' );
const useMainStore = require( '../store/index.js' );
const { canonicalToHybrid } = require( '../utils/schemata.js' );

/**
 * Menu action composable
 *
 * @param {Object} options - Options object
 * @param {Object} options.keyPath - The keyPath ref from the component
 * @return {Object} Error composable API
 */
module.exports = function useMenuAction() {
	const mainStore = useMainStore();

	/**
	 * Whether the given keypath belongs to the main or the abstractwiki namespaces
	 *
	 * @param {string} keyPath
	 * @return {boolean}
	 */
	function isAbstractFragment( keyPath ) {
		const parts = keyPath.split( '.' );
		return parts[ 0 ] === Constants.STORED_OBJECTS.ABSTRACT && parts.length === 5;
	}

	/**
	 * Set dirty flag for a given keyPath:
	 * * If the changed object is the main object, set page-level dirty flag to true.
	 * * If the changed object is inside an abstract fragment, set page-level dirty
	 *   flag to true and set fragment-level dirty flag to true.
	 *
	 * @param {string} keyPath
	 */
	function setDirtyKeyPath( keyPath ) {
		const parts = keyPath.split( '.' );
		// For main, set dirty page
		if ( parts[ 0 ] === Constants.STORED_OBJECTS.MAIN ) {
			mainStore.setDirty();
			return;
		}
		// For fragments, set dirty page
		if ( parts[ 0 ] === Constants.STORED_OBJECTS.ABSTRACT ) {
			mainStore.setDirty();
		}
	}

	/**
	 * Adds an empty item at the given keyPath
	 *
	 * @param {Object} payload - payload for object creation action
	 * @param {string} payload.type
	 * @param {string} keyPath
	 */
	function addBefore( payload, keyPath ) {
		const value = mainStore.createObjectByType( payload );

		// Shift fragment previews before inserting the item
		if ( isAbstractFragment( keyPath ) ) {
			mainStore.insertHashAtKeyPath( keyPath );
		}

		mainStore.insertListItemAtKeyPath( {
			keyPath: keyPath.split( '.' ),
			value
		} );

		setDirtyKeyPath( keyPath );
	}

	/**
	 * Adds an empty item after the given keyPath
	 *
	 * @param {Object} payload - payload for object creation action
	 * @param {string} payload.type
	 * @param {string} keyPath
	 */
	function addAfter( payload, keyPath ) {
		const value = mainStore.createObjectByType( payload );

		const next = keyPath.split( '.' );
		next[ next.length - 1 ] = String( Number( next[ next.length - 1 ] ) + 1 );

		// Shift fragment previews before inserting the item
		if ( isAbstractFragment( keyPath ) ) {
			mainStore.insertHashAtKeyPath( next.join( '.' ) );
		}

		mainStore.insertListItemAtKeyPath( {
			keyPath: next,
			value
		} );

		setDirtyKeyPath( keyPath );
	}

	/**
	 * Handles the modification of the ZObject when the changed key-value
	 * is a typed list and the user adds a new item.
	 *
	 * @param {Object} payload - payload for object creation action
	 * @param {string} payload.type
	 * @param {string} keyPath - keyPath of the list
	 * @param {number} nextKey - current size of the list (and next key)
	 */
	function addListItem( payload, keyPath, nextKey ) {
		const value = mainStore.createObjectByType( payload );
		const newItemPath = `${ keyPath }.${ nextKey }`;
		mainStore.pushItemsByKeyPath( {
			keyPath: keyPath.split( '.' ),
			values: [ canonicalToHybrid( value ) ]
		} );

		setDirtyKeyPath( newItemPath );
	}

	/**
	 * Handles the modification of the ZObject when the changed key-value
	 * is a typed list item and the user deletes it.
	 * TODO (T331132): Create a 'revert delete' workflow.
	 *
	 * @param {string} keyPath
	 */
	function deleteListItem( keyPath ) {
		const listKeyPath = keyPath.split( '.' ).slice( 0, -1 );
		const lastItem = keyPath.split( '.' ).slice( -1 );
		mainStore.deleteListItemsByKeyPath( {
			keyPath: listKeyPath,
			indexes: lastItem
		} );

		setDirtyKeyPath( keyPath );

		// If list item is deleted, we need to shift all next items to a previous position
		if ( isAbstractFragment( keyPath ) ) {
			mainStore.deleteHashAtKeyPath( keyPath );
		}
	}

	/**
	 * Handles the modification of the ZObject when the changed key-value
	 * is a typed list item and the user moves it before the previous item.
	 *
	 * @param {string} keyPath
	 */
	function moveBefore( keyPath ) {
		moveByOffset( keyPath, -1 );
	}

	/**
	 * Handles the modification of the ZObject when the changed key-value
	 * is a typed list item and the user moves it after the next item.
	 *
	 * @param {string} keyPath
	 */
	function moveAfter( keyPath ) {
		moveByOffset( keyPath, 1 );
	}

	/**
	 * Generic moveByOffset for moveBefore (offset=-1) and moveAfter (offset=1)
	 *
	 * @param {string} keyPath
	 * @param {number} offset -1 or 1
	 */
	function moveByOffset( keyPath, offset ) {
		mainStore.moveListItemByKeyPath( {
			keyPath: keyPath.split( '.' ),
			offset
		} );

		setDirtyKeyPath( keyPath );

		// If fragments are moved, swap the fragment keys for reflecting the change
		// immediately in the preview; otherwise a change will be detected causing
		// delayed re-hasing and update, but will come a couple seconds later.
		if ( isAbstractFragment( keyPath ) ) {
			mainStore.swapHashAtKeyPath( keyPath, offset );
		}
	}

	return {
		isAbstractFragment,
		addAfter,
		addBefore,
		addListItem,
		deleteListItem,
		moveBefore,
		moveAfter,
		setDirtyKeyPath
	};
};
