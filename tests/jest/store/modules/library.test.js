/*!
 * WikiLambda unit test suite for the library Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const libraryModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/library.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	mockApiResponseFor = require( '../../fixtures/mocks.js' ).mockApiResponseFor,
	mockApiZids = require( '../../fixtures/mocks.js' ).mockApiZids,
	mockLabels = {
		Z1: { zid: 'Z1', label: 'Object', lang: 'Z1002' },
		Z6: { zid: 'Z6', label: 'String', lang: 'Z1002' }
	};

let state,
	context,
	getMock,
	getResolveMock;

describe( 'library module', function () {
	beforeEach( function () {
		getResolveMock = jest.fn( function ( thenFunction ) {
			return thenFunction( mockApiResponseFor( [ 'Z1', 'Z2', 'Z6' ] ) );
		} );
		getMock = jest.fn( function () {
			return {
				then: getResolveMock
			};
		} );
		state = JSON.parse( JSON.stringify( libraryModule.state ) );
		context = $.extend( {}, {
			commit: jest.fn( function ( mutationType, payload ) {
				if ( mutationType in libraryModule.mutations ) {
					return libraryModule.mutations[ mutationType ]( state, payload );
				}
			} ),
			getters: {},
			state: state,
			rootGetters: [ 'en' ]
		} );

		mw.Api = jest.fn( function () {
			return {
				get: getMock
			};
		} );
	} );

	describe( 'Getters', function () {

		describe( 'getLabel', function () {
			beforeEach( function () {
				context.getters.getLabelData = libraryModule.getters.getLabelData( state );
			} );

			it( 'Returns the zid or key if label is not available in the state', function () {
				expect( libraryModule.getters.getLabel( state, context.getters )( 'Z10000' ) ).toEqual( 'Z10000' );
			} );

			it( 'Returns the label if available in the state', function () {
				state.labels = mockLabels;
				expect( libraryModule.getters.getLabel( state, context.getters )( 'Z6' ) ).toEqual( 'String' );
			} );
		} );

		describe( 'getLabelData', function () {
			it( 'Returns undefined if label is not available in the state', function () {
				expect( libraryModule.getters.getLabelData( state, context.getters )( 'Z10000' ) ).toEqual( undefined );
			} );

			it( 'Returns the label data if available in the state', function () {
				state.labels = mockLabels;
				expect( libraryModule.getters.getLabelData( state, context.getters )( 'Z6' ) ).toEqual( { zid: 'Z6', label: 'String', lang: 'Z1002' } );
			} );
		} );

		describe( 'getStoredObject', function () {
			it( 'Returns if the zid is not available in the state', function () {
				expect( libraryModule.getters.getStoredObject( state )( 'Z10000' ) ).toEqual( undefined );
			} );

			it( 'Returns the whole object if available in the state', function () {
				state.objects = mockApiZids;
				expect( libraryModule.getters.getStoredObject( state )( 'Z6' ) ).toEqual( mockApiZids.Z6 );
			} );
		} );

		describe( 'getExpectedTypeOfKey', function () {
			beforeEach( function () {
				state.objects = mockApiZids;
			} );

			it( 'Returns Z_PERSISTENTOBJECT if the key is undefined', function () {
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( undefined ) )
					.toEqual( Constants.Z_PERSISTENTOBJECT );
			} );

			it( 'Returns Z_OBJECT is the key is local', function () {
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( 'K1' ) ).toEqual( Constants.Z_OBJECT );
			} );

			it( 'Returns Z_OBJECT is the key is not found', function () {
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( 'Z10000K1' ) ).toEqual( Constants.Z_OBJECT );
			} );

			it( 'Returns the terminal type of a global key', function () {
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( 'Z6K1' ) ).toEqual( Constants.Z_STRING );
			} );

			it( 'Returns the generic type of a global key', function () {
				const expected = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_LIST,
					Z881K1: Constants.Z_STRING
				};
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( 'Z31K2' ) ).toEqual( expected );
			} );

			it( 'Returns the argument type of a key if the zid is that of a function', function () {
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( 'Z881K1' ) ).toEqual( Constants.Z_TYPE );
			} );

			it( 'Returns Z_OBJECT if the key is not from a type or a function', function () {
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( 'Z10001K1' ) ).toEqual( Constants.Z_OBJECT );
			} );
		} );

		describe( 'getLanguageIsoCodeOfZLang', function () {
			beforeEach( function () {
				state.objects = mockApiZids;
			} );

			it( 'Returns the language zid if the object hasn not been fetched', function () {
				expect( libraryModule.getters.getLanguageIsoCodeOfZLang( state )( 'Z1002' ) ).toEqual( 'Z1002' );
			} );

			it( 'Returns the zid if it is of the wrong type', function () {
				expect( libraryModule.getters.getLanguageIsoCodeOfZLang( state )( 'Z6' ) ).toEqual( 'Z6' );
			} );

			it( 'Returns the language ISO code if available', function () {
				expect( libraryModule.getters.getLanguageIsoCodeOfZLang( state )( 'Z1003' ) ).toEqual( 'es' );
			} );
		} );

		describe( 'getConnectedObjects', function () {
			it( 'Returns empty array if the zid is not available in the state', function () {
				expect(
					libraryModule.getters.getConnectedObjects( state )( 'Z802', Constants.Z_FUNCTION_IMPLEMENTATIONS )
				).toEqual( [] );
			} );

			it( 'Returns empty array if the zid is not of a function', function () {
				state.objects = mockApiZids;
				expect(
					libraryModule.getters.getConnectedObjects( state )( 'Z6', Constants.Z_FUNCTION_IMPLEMENTATIONS )
				).toEqual( [] );
			} );

			it( 'Returns array with the implementations of a given function', function () {
				state.objects = mockApiZids;
				expect(
					libraryModule.getters.getConnectedObjects( state )( 'Z802', Constants.Z_FUNCTION_IMPLEMENTATIONS )
				).toEqual( [ 'Z902' ] );
			} );

			it( 'Returns array with the tests of a given function', function () {
				state.objects = mockApiZids;
				expect(
					libraryModule.getters.getConnectedObjects( state )( 'Z802', Constants.Z_FUNCTION_TESTERS )
				).toEqual( [ 'Z8020', 'Z8021' ] );
			} );

			it( 'Returns empty array if key not valid', function () {
				state.objects = mockApiZids;
				expect(
					libraryModule.getters.getConnectedObjects( state )( 'Z802' )
				).toEqual( [] );
			} );
		} );

		describe( 'getInputsOfFunctionZid', function () {
			beforeEach( function () {
				state.objects = mockApiZids;
			} );

			it( 'Returns empty array when the zid has not been fetched ', function () {
				expect( libraryModule.getters.getInputsOfFunctionZid( state )( 'Z999999' ) ).toHaveLength( 0 );
			} );

			it( 'Returns empty array when the zid is not a function', function () {
				expect( libraryModule.getters.getInputsOfFunctionZid( state )( 'Z32' ) ).toHaveLength( 0 );
			} );

			it( 'Returns one argument with a one-argument function', function () {
				const args = libraryModule.getters.getInputsOfFunctionZid( state )( 'Z881' );
				expect( args ).toHaveLength( 1 );
				expect( args[ 0 ].Z17K2 ).toEqual( 'Z881K1' );
			} );

			it( 'Returns all arguments with a three-argument function', function () {
				const args = libraryModule.getters.getInputsOfFunctionZid( state )( 'Z802' );
				expect( args ).toHaveLength( 3 );
				expect( args[ 0 ].Z17K2 ).toEqual( 'Z802K1' );
				expect( args[ 1 ].Z17K2 ).toEqual( 'Z802K2' );
				expect( args[ 2 ].Z17K2 ).toEqual( 'Z802K3' );
			} );
		} );

		describe( 'getLanguageOfImplementation', function () {
			beforeEach( function () {
				state.objects = mockApiZids;
			} );

			it( 'gets language of a code implementation with a referenced programming language', function () {
				const zid = 'Z20005';
				const expected = 'Z600';
				const actual = libraryModule.getters.getLanguageOfImplementation( state )( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'gets language of a code implementation with a literal programming language', function () {
				const zid = 'Z20006';
				const expected = 'javascript';
				const actual = libraryModule.getters.getLanguageOfImplementation( state )( zid );
				expect( actual ).toBe( expected );
			} );
		} );
	} );

	describe( 'Actions', function () {
		describe( 'fetchZids', function () {
			beforeEach( function () {
				context.dispatch = jest.fn( function ( key, payload ) {
					// Run performFetchZids action
					if ( key === 'performFetchZids' ) {
						return new Promise( function ( resolve ) {
							libraryModule.actions.performFetchZids( context, payload );
							resolve( payload.zids );
						} );
					}
				} );
			} );

			it( 'Call api.get if the zId is not already in the state', function () {
				const zids = [ 'Z1' ];
				context.state.objects = {};

				return libraryModule.actions.fetchZids( context, { zids } ).then( function () {
					expect( mw.Api ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						wikilambdaload_zids: 'Z1',
						wikilambdaload_language: context.rootGetters.zLang,
						wikilambdaload_get_dependencies: 'true'
					} );
				} );
			} );

			it( 'Call api.get with multiple Zids as a string separated by | ', function () {
				const zids = [ 'Z1', 'Z6' ];
				const expectedWikiLambdaloadZids = 'Z1|Z6';
				context.state.objects = {};

				return libraryModule.actions.fetchZids( context, { zids } ).then( function () {
					expect( mw.Api ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						wikilambdaload_zids: expectedWikiLambdaloadZids,
						wikilambdaload_language: context.rootGetters.zLang,
						wikilambdaload_get_dependencies: 'true'
					} );
				} );
			} );

			it( 'Will NOT call the APi if the Zids are already fetched', function () {
				const zids = [ 'Z1', 'Z6' ];
				context.state.objects = mockApiZids;

				return libraryModule.actions.fetchZids( context, { zids } ).then( function () {
					expect( mw.Api ).toHaveBeenCalledTimes( 0 );
					expect( getMock ).toHaveBeenCalledTimes( 0 );
				} );
			} );

			it( 'Will call the APi only with the Zids that are not yet fetched', function () {
				const zids = [ 'Z1', 'Z2', 'Z6' ];
				const expectedWikiLambdaloadZids = 'Z2|Z6';
				context.state.objects = {
					Z1: mockApiZids.Z1
				};

				return libraryModule.actions.fetchZids( context, { zids } ).then( function () {
					expect( mw.Api ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						wikilambdaload_zids: expectedWikiLambdaloadZids,
						wikilambdaload_language: context.rootGetters.zLang,
						wikilambdaload_get_dependencies: 'true'
					} );
				} );
			} );

			it( 'Will Update the stored collection with the objects in the API response', function () {
				const zids = [ 'Z1', 'Z2', 'Z6' ];
				const expectedAddZ1 = expect.objectContaining( {
					zid: 'Z1',
					info: expect.any( Object )
				} );
				const expectedAddZ2 = expect.objectContaining( {
					zid: 'Z2',
					info: expect.any( Object )
				} );
				const expectedAddZ6 = expect.objectContaining( {
					zid: 'Z6',
					info: expect.any( Object )
				} );
				context.state.objects = {};

				return libraryModule.actions.fetchZids( context, { zids } ).then( function () {
					expect( mw.Api ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledTimes( 1 );
					expect( getResolveMock ).toHaveBeenCalledTimes( 1 );
					expect( context.commit ).toHaveBeenCalledTimes( 11 );
					expect( context.commit ).toHaveBeenCalledWith( 'setStoredObject', expectedAddZ1 );
					expect( context.commit ).toHaveBeenCalledWith( 'setStoredObject', expectedAddZ2 );
					expect( context.commit ).toHaveBeenCalledWith( 'setStoredObject', expectedAddZ6 );
				} );
			} );

			describe( 'Fetch dependencies', () => {
				it( 'requests the language Zids of the returned labels', function () {
					const zids = [ 'Z20001' ];
					context.state.objects = {};
					getResolveMock = jest.fn( function ( thenFunction ) {
						return thenFunction( mockApiResponseFor( zids ) );
					} );

					return libraryModule.actions.fetchZids( context, { zids } ).then( function () {
						expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: [ 'Z1003', 'Z1002' ] } );
					} );
				} );

				it( 'requests the renderer/parser Zids of the returned type', function () {
					const zids = [ 'Z20002' ];
					context.state.objects = {};
					getResolveMock = jest.fn( function ( thenFunction ) {
						return thenFunction( mockApiResponseFor( zids ) );
					} );

					return libraryModule.actions.fetchZids( context, { zids } ).then( function () {
						expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: [ 'Z1002', 'Z20020', 'Z20030' ] } );
						expect( context.commit ).toHaveBeenCalledWith( 'setRenderer', { type: 'Z20002', renderer: 'Z20020' } );
						expect( context.commit ).toHaveBeenCalledWith( 'setParser', { type: 'Z20002', parser: 'Z20030' } );
					} );
				} );
			} );
		} );
	} );
} );
