/*!
 * WikiLambda unit test suite for the useMenuAction composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const useMenuAction = require( '../../../resources/ext.wikilambda.app/composables/useMenuAction.js' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'useMenuAction', () => {
	let store;
	let menuAction;

	beforeEach( () => {
		store = useMainStore();
		store.setDirty = jest.fn();
		store.setDirtyFragment = jest.fn();

		const [ result ] = loadComposable( () => useMenuAction() );
		menuAction = result;
	} );

	describe( 'isAbstractFragment', () => {
		it( 'returns true if keyPath points at an abstract fragment', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.3';
			expect( menuAction.isAbstractFragment( keyPath ) ).toBe( true );
		} );

		it( 'returns false if keyPath is of a main zobject', () => {
			const keyPath = 'main.Z2K2.Z4K1.2.Z3K1';
			expect( menuAction.isAbstractFragment( keyPath ) ).toBe( false );
		} );

		it( 'returns false if keyPath is a child inside an abstract fragment', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.3.Z444K1.4';
			expect( menuAction.isAbstractFragment( keyPath ) ).toBe( false );
		} );
	} );

	describe( 'setDirtyKeyPath', () => {
		it( 'sets page-level dirty flag when keyPath points to main object', () => {
			const keyPath = 'main.Z2K2.Z4K1.2.Z3K1';

			menuAction.setDirtyKeyPath( keyPath );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();
		} );

		it( 'sets page-level dirty flag when keyPath points to an abstract fragment root', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.3';

			menuAction.setDirtyKeyPath( keyPath );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();
		} );

		it( 'sets page-level and fragment-level dirty flags when keyPath is inside an abstract fragment', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.3.Z444K1.4';

			menuAction.setDirtyKeyPath( keyPath );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).toHaveBeenCalledWith( keyPath );
		} );

		it( 'does nothing for other namespaces', () => {
			const keyPath = 'call.Z7K1.Z9K1';

			menuAction.setDirtyKeyPath( keyPath );

			expect( store.setDirty ).not.toHaveBeenCalled();
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();
		} );
	} );

	describe( 'addBefore', () => {
		const payload = { type: 'Z7' };
		const createdValue = { Z1K1: 'Z7', Z7K1: '' };

		beforeEach( () => {
			store.createObjectByType = jest.fn().mockReturnValue( createdValue );
		} );

		it( 'creates a new object and inserts it before a main object item', () => {
			const keyPath = 'main.Z2K2.Z4K1.2';

			menuAction.addBefore( payload, keyPath );

			expect( store.shiftFragmentPreviews ).not.toHaveBeenCalled();

			expect( store.insertListItemAtKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.insertListItemAtKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				value: createdValue
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();
		} );

		it( 'shifts fragment previews when adding a new fragment', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.3';

			menuAction.addBefore( payload, keyPath );

			expect( store.shiftFragmentPreviews ).toHaveBeenCalledTimes( 1 );
			expect( store.shiftFragmentPreviews ).toHaveBeenCalledWith( keyPath, 1 );

			expect( store.insertListItemAtKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.insertListItemAtKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				value: createdValue
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();
		} );

		it( 'marks fragment dirty when adding items inside an abstract fragment', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.3.Z444K1.4';

			menuAction.addBefore( payload, keyPath );

			expect( store.shiftFragmentPreviews ).not.toHaveBeenCalled();

			expect( store.insertListItemAtKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.insertListItemAtKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				value: createdValue
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).toHaveBeenCalledWith( keyPath );
		} );
	} );

	describe( 'addAfter', () => {
		const payload = { type: 'Z7' };
		const createdValue = { Z1K1: 'Z7', Z7K1: '' };

		beforeEach( () => {
			store.createObjectByType = jest.fn().mockReturnValue( createdValue );
		} );

		it( 'creates a new object and inserts it after a main object item', () => {
			const keyPath = 'main.Z2K2.Z4K1.2';
			const nextKeyPath = 'main.Z2K2.Z4K1.3';

			menuAction.addAfter( payload, keyPath );

			expect( store.shiftFragmentPreviews ).not.toHaveBeenCalled();

			expect( store.insertListItemAtKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.insertListItemAtKeyPath ).toHaveBeenCalledWith( {
				keyPath: nextKeyPath.split( '.' ),
				value: createdValue
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();
		} );

		it( 'shifts fragment previews when adding a new fragment', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.3';
			const nextKeyPath = 'abstractwiki.sections.Q8776414.fragments.4';

			menuAction.addAfter( payload, keyPath );

			expect( store.shiftFragmentPreviews ).toHaveBeenCalledTimes( 1 );
			expect( store.shiftFragmentPreviews ).toHaveBeenCalledWith( nextKeyPath, 1 );

			expect( store.insertListItemAtKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.insertListItemAtKeyPath ).toHaveBeenCalledWith( {
				keyPath: nextKeyPath.split( '.' ),
				value: createdValue
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();
		} );

		it( 'marks fragment dirty when adding items inside an abstract fragment', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.3.Z444K1.4';
			const nextKeyPath = 'abstractwiki.sections.Q8776414.fragments.3.Z444K1.5';

			menuAction.addAfter( payload, keyPath );

			expect( store.shiftFragmentPreviews ).not.toHaveBeenCalled();

			expect( store.insertListItemAtKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.insertListItemAtKeyPath ).toHaveBeenCalledWith( {
				keyPath: nextKeyPath.split( '.' ),
				value: createdValue
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).toHaveBeenCalledWith( keyPath );
		} );
	} );

	describe( 'addListItem', () => {
		const payload = { type: 'Z7' };
		const canonicalValue = { Z1K1: 'Z7', Z7K1: 'Z444' };
		const hybridValue = {
			Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
			Z7K1: { Z1K1: 'Z9', Z9K1: 'Z444' }
		};

		beforeEach( () => {
			store.createObjectByType = jest.fn().mockReturnValue( canonicalValue );
		} );

		it( 'inserts an item at the bottom of the list and marks page as dirty', () => {
			const keyPath = 'main.Z2K2.Z4K1';

			menuAction.addListItem( payload, keyPath, 2 );

			expect( store.pushItemsByKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.pushItemsByKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				values: [ hybridValue ]
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();
		} );

		it( 'inserts an item at the bottom of the list and marks page and fragment as dirty', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.3.Z444K1';

			menuAction.addListItem( payload, keyPath, 2 );

			expect( store.pushItemsByKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.pushItemsByKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				values: [ hybridValue ]
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).toHaveBeenCalledTimes( 1 );
		} );
	} );

	describe( 'deleteListItem', () => {
		it( 'deletes an item of a list and sets page as dirty', () => {
			const keyPath = 'main.Z2K2.Z4K1';
			const itemKeyPath = `${ keyPath }.2`;

			menuAction.deleteListItem( itemKeyPath );

			expect( store.deleteListItemsByKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.deleteListItemsByKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				indexes: [ '2' ]
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();
		} );

		it( 'deletes an item of a list inside an abstract fragment and sets page and fragment as dirty', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.3.Z444K1';
			const itemKeyPath = `${ keyPath }.2`;

			menuAction.deleteListItem( itemKeyPath );

			expect( store.deleteListItemsByKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.deleteListItemsByKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				indexes: [ '2' ]
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'deletes an abstract fragment and shifts fragment previews', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments';
			const itemKeyPath = `${ keyPath }.2`;
			const nextKeyPath = `${ keyPath }.3`;

			menuAction.deleteListItem( itemKeyPath );

			expect( store.deleteListItemsByKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.deleteListItemsByKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				indexes: [ '2' ]
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();

			expect( store.shiftFragmentPreviews ).toHaveBeenCalledTimes( 1 );
			expect( store.shiftFragmentPreviews ).toHaveBeenCalledWith( nextKeyPath, -1 );
		} );
	} );

	describe( 'moveBefore', () => {
		it( 'moves list item one position before and sets page as dirty', () => {
			const keyPath = 'main.Z2K2.Z4K1.3';

			menuAction.moveBefore( keyPath );

			expect( store.moveListItemByKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.moveListItemByKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				offset: -1
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();

			expect( store.swapFragmentPreviews ).not.toHaveBeenCalled();
		} );

		it( 'moves list item inside fragment one position before and sets page and fragment as dirty', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.2.Z444K1.3';

			menuAction.moveBefore( keyPath );

			expect( store.moveListItemByKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.moveListItemByKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				offset: -1
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).toHaveBeenCalledTimes( 1 );

			expect( store.swapFragmentPreviews ).not.toHaveBeenCalled();
		} );

		it( 'moves fragment one position before and swaps fragment previews', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.3';
			const previousKeyPath = 'abstractwiki.sections.Q8776414.fragments.2';

			menuAction.moveBefore( keyPath );

			expect( store.moveListItemByKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.moveListItemByKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				offset: -1
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();

			expect( store.swapFragmentPreviews ).toHaveBeenCalledTimes( 1 );
			expect( store.swapFragmentPreviews ).toHaveBeenCalledWith( keyPath, previousKeyPath );
		} );
	} );

	describe( 'moveAfter', () => {
		it( 'moves list item one position after and sets page as dirty', () => {
			const keyPath = 'main.Z2K2.Z4K1.3';

			menuAction.moveAfter( keyPath );

			expect( store.moveListItemByKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.moveListItemByKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				offset: 1
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();

			expect( store.swapFragmentPreviews ).not.toHaveBeenCalled();
		} );

		it( 'moves list item inside fragment one position after and sets page and fragment as dirty', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.2.Z444K1.3';

			menuAction.moveAfter( keyPath );

			expect( store.moveListItemByKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.moveListItemByKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				offset: 1
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).toHaveBeenCalledTimes( 1 );

			expect( store.swapFragmentPreviews ).not.toHaveBeenCalled();
		} );

		it( 'moves fragment one position after and swaps fragment previews', () => {
			const keyPath = 'abstractwiki.sections.Q8776414.fragments.3';
			const nextKeyPath = 'abstractwiki.sections.Q8776414.fragments.4';

			menuAction.moveAfter( keyPath );

			expect( store.moveListItemByKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.moveListItemByKeyPath ).toHaveBeenCalledWith( {
				keyPath: keyPath.split( '.' ),
				offset: 1
			} );

			expect( store.setDirty ).toHaveBeenCalledTimes( 1 );
			expect( store.setDirtyFragment ).not.toHaveBeenCalled();

			expect( store.swapFragmentPreviews ).toHaveBeenCalledTimes( 1 );
			expect( store.swapFragmentPreviews ).toHaveBeenCalledWith( keyPath, nextKeyPath );
		} );
	} );
} );
