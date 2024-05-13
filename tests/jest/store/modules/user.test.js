/*!
 * WikiLambda unit test suite for the user Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const userModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/user.js' );
let context,
	state,
	getters;

describe( 'User rights Vuex module', () => {
	beforeEach( () => {
		// Initialize state
		state = {
			userRights: null
		};
	} );

	describe( 'Actions', () => {
		const userRights = [
			'wikilambda-execute',
			'wikilambda-execute-unsaved-code'
		];

		beforeEach( () => {
			// Mock context
			context = Object.assign( {}, {
				commit: jest.fn( () => {
					return;
				} )
			} );
			// Mock mw.user.getRights
			const getRightsResolveMock = jest.fn( ( then ) => then( userRights ) );
			const getRightsMock = jest.fn( () => {
				return {
					then: getRightsResolveMock
				};
			} );
			mw.user = {
				getRights: getRightsMock
			};
		} );

		describe( 'fetchUserRights', () => {
			it( 'fetches and sets rights', () => {
				userModule.actions.fetchUserRights( context );
				expect( mw.user.getRights ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setUserRights', userRights );
			} );
		} );
	} );

	describe( 'Mutations', () => {
		describe( 'setUserRights', () => {
			it( 'sets user rights', () => {
				const userRights = [
					'wikilambda-execute',
					'wikilambda-execute-unsaved-code'
				];
				userModule.mutations.setUserRights( state, userRights );
				expect( state.userRights ).toEqual( userRights );
			} );
		} );
	} );

	describe( 'Getters', () => {
		describe( 'isUserLoggedIn', () => {
			it( 'returns false if logged out', () => {
				mw.config.values.wgUserName = null;
				expect( userModule.getters.isUserLoggedIn() ).toBe( false );
			} );

			it( 'returns true if logged in', () => {
				mw.config.values.wgUserName = 'Username';
				expect( userModule.getters.isUserLoggedIn() ).toBe( true );
			} );
		} );

		describe( 'userHasRight', () => {
			it( 'returns undefined if rights not initialized', () => {
				expect( userModule.getters.userHasRight( state )( 'wikilambda-execute' ) ).toBe( undefined );
			} );

			it( 'returns false if right is not found', () => {
				state.userRights = [];
				expect( userModule.getters.userHasRight( state )( 'wikilambda-execute' ) ).toBe( false );
			} );

			it( 'returns true if right is found', () => {
				state.userRights = [ 'wikilambda-execute' ];
				expect( userModule.getters.userHasRight( state )( 'wikilambda-execute' ) ).toBe( true );
			} );
		} );

		describe( 'userCanRunFunction', () => {
			beforeEach( () => {
				getters = {
					userHasRight: userModule.getters.userHasRight( state )
				};
			} );

			it( 'returns undefined if rights not initialized', () => {
				expect( userModule.getters.userCanRunFunction( state, getters ) ).toBe( undefined );
			} );

			it( 'returns false if right is not found', () => {
				state.userRights = [];
				expect( userModule.getters.userCanRunFunction( state, getters ) ).toBe( false );
			} );

			it( 'returns true if right is found', () => {
				state.userRights = [ 'wikilambda-execute' ];
				expect( userModule.getters.userCanRunFunction( state, getters ) ).toBe( true );
			} );
		} );

		describe( 'userCanRunUnsavedCode', () => {
			beforeEach( () => {
				getters = {
					userHasRight: userModule.getters.userHasRight( state )
				};
			} );

			it( 'returns undefined if rights not initialized', () => {
				expect( userModule.getters.userCanRunUnsavedCode( state, getters ) ).toBe( undefined );
			} );

			it( 'returns false if right is not found', () => {
				state.userRights = [ 'wikilambda-execute' ];
				expect( userModule.getters.userCanRunUnsavedCode( state, getters ) ).toBe( false );
			} );

			it( 'returns true if right is found', () => {
				state.userRights = [ 'wikilambda-execute-unsaved-code' ];
				expect( userModule.getters.userCanRunUnsavedCode( state, getters ) ).toBe( true );
			} );
		} );
	} );
} );
