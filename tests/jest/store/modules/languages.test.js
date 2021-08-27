/* eslint-disable camelcase */
var languagesModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/languages.js' );

describe( 'Languages Vuex module', function () {
	var state,
		context,
		postMock,
		initialState = {
			allLangs: {
				Z1001: 'Arabic',
				Z1002: 'English'
			},
			zLangs: [ 'Z1002' ]
		};

	beforeAll( function () {
		mw.Api = jest.fn( function () {
			return {
				get: jest.fn( function () {
					return postMock;
				} )
			};
		} );
	} );

	beforeEach( function () {
		state = $.extend(
			JSON.parse( JSON.stringify( languagesModule.state ) ),
			JSON.parse( JSON.stringify( initialState ) ) );
		context = $.extend( {},
			{
				commit: jest.fn( function ( mutationType, payload ) {
					return languagesModule.mutations[ mutationType ]( state, payload );
				} ),
				dispatch: jest.fn( function ( actionType, payload ) {
					return languagesModule.actions[ actionType ]( state, payload );
				} ),
				getters: {},
				state: state
			}
		);
	} );

	describe( 'Getters', function () {
		it( 'should return the user language ZID when defined in state', function () {
			expect( languagesModule.getters.getZLang( context.state ) ).toBe( 'en' );
		} );

		it( 'should return the ZID 1002 (english) when not defined in state', function () {
			context.state.zLangs = [];

			expect( languagesModule.getters.getZLang( context.state ) ).toBe( 'en' );
		} );

		it( 'should return all langs', function () {
			expect( languagesModule.getters.getAllLangs( context.state ) ).toEqual( context.state.allLangs );
		} );

		it( 'should return the MW-defined user language ZID', function () {
			expect( languagesModule.getters.getUserZlangZID() ).toBe( 'Z1002' );
		} );
	} );

	describe( 'Mutations', function () {
		beforeEach( function () {
			state = JSON.parse( JSON.stringify( languagesModule.state ) );
			context = $.extend( {},
				{
					commit: jest.fn( function ( mutationType, payload ) {
						return languagesModule.mutations[ mutationType ]( state, payload );
					} ),
					dispatch: jest.fn( function ( actionType, payload ) {
						return languagesModule.actions[ actionType ]( state, payload );
					} ),
					getters: {},
					state: state
				}
			);
		} );

		it( 'should set all langs', function () {
			languagesModule.mutations.setAllLangs( context.state, initialState.allLangs );

			expect( context.state.allLangs ).toEqual( initialState.allLangs );
		} );

		it( 'should allow to set fetchingAllLangs to true or false', function () {
			// Test setting to true
			languagesModule.mutations.setFetchingAllLangs( context.state, true );
			expect( context.state.fetchingAllLangs ).toBe( true );

			// Test setting to false
			languagesModule.mutations.setFetchingAllLangs( context.state, false );
			expect( context.state.fetchingAllLangs ).toBe( false );
		} );
	} );

	describe( 'Actions', function () {
		beforeEach( function () {
			state = JSON.parse( JSON.stringify( languagesModule.state ) );
			context = $.extend( {},
				{
					commit: jest.fn( function ( mutationType, payload ) {
						return languagesModule.mutations[ mutationType ]( state, payload );
					} ),
					dispatch: jest.fn( function ( actionType, payload ) {
						return languagesModule.actions[ actionType ]( state, payload );
					} ),
					getters: {},
					state: state
				}
			);
		} );

		it( 'should fetch all langs', function () {
			var result = {
					batchcomplete: '',
					warnings: {
						wikilambdasearch_labels: {
							'*': 'The value "5000" for parameter \'wikilambdasearch_limit\' must be between 1 and 500.'
						}
					},
					query: {
						wikilambdasearch_labels: [
							{
								page_namespace: 0,
								page_title: 'Z1002',
								page_type: 'Z60',
								label: 'English',
								page_id: 0,
								page_content_model: 'zobject',
								page_lang: 'Z1002'
							},
							{
								page_namespace: 0,
								page_title: 'Z1022',
								page_type: 'Z60',
								label: 'Samburu',
								page_id: 0,
								page_content_model: 'zobject',
								page_lang: 'Z1002'
							}
						]
					}
				},
				commitData = {
					Z1002: 'English',
					Z1022: 'Samburu'
				};

			postMock = {
				then: jest.fn( function ( fn ) {
					return fn( result );
				} )
			};

			languagesModule.actions.fetchAllLangs( context );

			expect( context.commit ).toHaveBeenCalledWith( 'setFetchingAllLangs', true );
			expect( context.commit ).toHaveBeenCalledWith( 'setAllLangs', commitData );
			expect( context.state.allLangs ).toEqual( commitData );
		} );
	} );
} );
