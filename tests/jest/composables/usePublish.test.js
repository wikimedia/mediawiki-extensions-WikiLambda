/*!
 * WikiLambda unit test suite for the usePublish composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );

const loadComposable = require( '../helpers/loadComposable.js' );
const usePublish = require( '../../../resources/ext.wikilambda.app/composables/usePublish.js' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'usePublish', () => {
	let store;
	let validate;
	let onPublishStart;

	function loadPublish( options = {} ) {
		const [ result ] = loadComposable( () => usePublish( Object.assign( { validate, onPublishStart }, options ) ) );
		return result;
	}

	beforeEach( () => {
		store = useMainStore();
		store.isCreateNewPage = false;
		store.getQueryParams = {};
		store.getWikilambdaConfig = {};
		store.waitForRunningParsers = Promise.resolve();
		store.getErrorPaths = [];
		store.getErrors = jest.fn().mockReturnValue( [] );
		validate = jest.fn().mockReturnValue( true );
		onPublishStart = jest.fn();
	} );

	describe( 'revertToEdit', () => {
		it( 'is false without oldid or undo', () => {
			expect( loadPublish().revertToEdit.value ).toBe( false );
		} );

		it( 'is true if oldid is in the query', () => {
			store.getQueryParams = { oldid: '12345' };

			expect( loadPublish().revertToEdit.value ).toBe( true );
		} );

		it( 'is false if oldid is empty', () => {
			store.getQueryParams = { oldid: ' ' };

			expect( loadPublish().revertToEdit.value ).toBe( false );
		} );

		it( 'is true if the undo content loaded', () => {
			store.getWikilambdaConfig = { undo: { rev: 12345, after: 12344 } };

			expect( loadPublish().revertToEdit.value ).toBe( true );
		} );

		it( 'is false on a new page', () => {
			store.isCreateNewPage = true;
			store.getQueryParams = { oldid: '12345' };

			expect( loadPublish().revertToEdit.value ).toBe( false );
		} );
	} );

	describe( 'waitAndHandlePublish', () => {
		it( 'opens the publish dialog if the content is valid', async () => {
			const publish = loadPublish();

			publish.waitAndHandlePublish();

			await waitFor( () => expect( publish.showPublishDialog.value ).toBe( true ) );
			expect( validate ).toHaveBeenCalled();
			expect( onPublishStart ).toHaveBeenCalled();
		} );

		it( 'does not open the publish dialog if the content is not valid', async () => {
			validate.mockReturnValue( false );
			const publish = loadPublish();

			publish.waitAndHandlePublish();

			await waitFor( () => expect( validate ).toHaveBeenCalled() );
			expect( publish.showPublishDialog.value ).toBe( false );
			expect( onPublishStart ).not.toHaveBeenCalled();
		} );

		it( 'opens the publish dialog without an onPublishStart callback', async () => {
			const publish = loadPublish( { onPublishStart: undefined } );

			publish.waitAndHandlePublish();

			await waitFor( () => expect( publish.showPublishDialog.value ).toBe( true ) );
		} );

		it( 'adds a warning if there are empty references', async () => {
			store.getErrorPaths = [ 'main.Z2K2' ];
			store.getErrors = jest.fn().mockReturnValue( [
				{ messageKey: 'wikilambda-empty-reference-warning' }
			] );
			const publish = loadPublish();

			publish.waitAndHandlePublish();

			await waitFor( () => expect( store.setError ).toHaveBeenCalledWith( {
				errorId: 'main',
				errorMessageKey: 'wikilambda-empty-references-publish-warning',
				errorType: 'warning'
			} ) );
		} );

		it( 'adds no warning without empty references', async () => {
			const publish = loadPublish();

			publish.waitAndHandlePublish();

			await waitFor( () => expect( publish.showPublishDialog.value ).toBe( true ) );
			expect( store.setError ).not.toHaveBeenCalled();
		} );
	} );

	describe( 'closePublishDialog', () => {
		it( 'closes the publish dialog', async () => {
			const publish = loadPublish();
			publish.waitAndHandlePublish();
			await waitFor( () => expect( publish.showPublishDialog.value ).toBe( true ) );

			publish.closePublishDialog();

			expect( publish.showPublishDialog.value ).toBe( false );
		} );
	} );
} );
