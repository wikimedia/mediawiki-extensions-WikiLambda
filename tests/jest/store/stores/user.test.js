/*!
 * WikiLambda unit test suite for the user Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { setActivePinia, createPinia } = require( 'pinia' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'User rights Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.userRights = null;
	} );

	describe( 'Actions', () => {
		const userRights = [
			'wikilambda-execute',
			'wikilambda-execute-unsaved-code'
		];

		beforeEach( () => {
			// Mock mw.user.getRights
			const getRightsResolveMock = jest.fn( ( then ) => then( userRights ) );
			const getRightsMock = jest.fn( () => ( {
				then: getRightsResolveMock
			} ) );
			mw.user = {
				getRights: getRightsMock
			};
		} );

		describe( 'fetchUserRights', () => {
			it( 'fetches and sets rights', async () => {
				await store.fetchUserRights();
				expect( mw.user.getRights ).toHaveBeenCalledTimes( 1 );
				expect( store.userRights ).toEqual( userRights );
			} );
		} );
	} );

	describe( 'Getters', () => {
		describe( 'isUserLoggedIn', () => {
			it( 'returns false if logged out', () => {
				mw.config.values.wgUserName = null;
				expect( store.isUserLoggedIn ).toBe( false );
			} );

			it( 'returns true if logged in', () => {
				mw.config.values.wgUserName = 'Username';
				expect( store.isUserLoggedIn ).toBe( true );
			} );
		} );

		describe( 'userHasRight', () => {
			it( 'returns undefined if rights not initialized', () => {
				expect( store.userHasRight( 'wikilambda-execute' ) ).toBe( undefined );
			} );

			it( 'returns false if right is not found', () => {
				store.userRights = [];
				expect( store.userHasRight( 'wikilambda-execute' ) ).toBe( false );
			} );

			it( 'returns true if right is found', () => {
				store.userRights = [ 'wikilambda-execute' ];
				expect( store.userHasRight( 'wikilambda-execute' ) ).toBe( true );
			} );
		} );

		describe( 'userCanRunFunction', () => {
			it( 'returns undefined if rights not initialized', () => {
				expect( store.userCanRunFunction ).toBe( undefined );
			} );

			it( 'returns false if right is not found', () => {
				store.userRights = [];
				expect( store.userCanRunFunction ).toBe( false );
			} );

			it( 'returns true if right is found', () => {
				store.userRights = [ 'wikilambda-execute' ];
				expect( store.userCanRunFunction ).toBe( true );
			} );
		} );

		describe( 'userCanRunUnsavedCode', () => {
			it( 'returns undefined if rights not initialized', () => {
				expect( store.userCanRunUnsavedCode ).toBe( undefined );
			} );

			it( 'returns false if right is not found', () => {
				store.userRights = [ 'wikilambda-execute' ];
				expect( store.userCanRunUnsavedCode ).toBe( false );
			} );

			it( 'returns true if right is found', () => {
				store.userRights = [ 'wikilambda-execute-unsaved-code' ];
				expect( store.userCanRunUnsavedCode ).toBe( true );
			} );
		} );

		describe( 'userCanEditTypes', () => {
			it( 'returns undefined if rights not initialized', () => {
				expect( store.userCanEditTypes ).toBe( undefined );
			} );

			it( 'returns false if right is not found', () => {
				store.userRights = [ 'wikilambda-edit' ];
				expect( store.userCanEditTypes ).toBe( false );
			} );

			it( 'returns true if right is found', () => {
				store.userRights = [ 'wikilambda-edit', 'wikilambda-edit-type' ];
				expect( store.userCanEditTypes ).toBe( true );
			} );
		} );
	} );
} );
