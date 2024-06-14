/*!
 * WikiLambda unit test suite for the library Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const libraryModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/library.js' ),
	languagesModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/languages.js' ),
	LabelData = require( '../../../../resources/ext.wikilambda.edit/store/classes/LabelData.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	mockApiResponseFor = require( '../../fixtures/mocks.js' ).mockApiResponseFor,
	mockApiZids = require( '../../fixtures/mocks.js' ).mockApiZids;

const mockLabels = {
	Z1: new LabelData( 'Z1', 'Object', 'Z1002' ),
	Z6: new LabelData( 'Z6', 'String', 'Z1002' )
};

let state,
	context,
	getMock;

describe( 'library module', () => {
	beforeEach( () => {
		getMock = jest.fn().mockResolvedValue( mockApiResponseFor( [ 'Z1', 'Z2', 'Z6' ] ) );
		mw.Api = jest.fn( () => ( { get: getMock } ) );
		state = JSON.parse( JSON.stringify( libraryModule.state ) );
		context = Object.assign( {}, {
			commit: jest.fn( ( mutationType, payload ) => {
				if ( mutationType in libraryModule.mutations ) {
					return libraryModule.mutations[ mutationType ]( state, payload );
				}
			} ),
			getters: {
				getUserRequestedLang: languagesModule.getters.getUserRequestedLang( state ),
				getUserLangZid: languagesModule.getters.getUserLangZid( state )
			},
			state: state,
			rootGetters: [ 'en' ]
		} );
	} );

	describe( 'Getters', () => {

		describe( 'getLabelData', () => {
			it( 'Returns untitled LabelData if label is not available in the state', () => {
				const labelData = libraryModule.getters.getLabelData( state, context.getters )( 'Z10000' );
				expect( labelData.zid ).toEqual( 'Z10000' );
				expect( labelData.label ).toEqual( 'Z10000' );
				expect( labelData.isUntitled ).toBe( true );
				expect( labelData.labelOrUntitled ).toBe( 'Untitled' );
			} );

			it( 'Returns the label data if available in the state', () => {
				state.labels = mockLabels;
				context.getters.getLanguageIsoCodeOfZLang = () => 'en';
				const labelData = libraryModule.getters.getLabelData( state, context.getters )( 'Z6' );
				expect( labelData.zid ).toEqual( 'Z6' );
				expect( labelData.label ).toEqual( 'String' );
				expect( labelData.isUntitled ).toBe( false );
				expect( labelData.labelOrUntitled ).toBe( 'String' );
			} );

			it( 'Returns raw zids when the requested language is qqx', () => {
				state.labels = mockLabels;
				mw.language.getFallbackLanguageChain = () => [ 'qqx', 'en' ];
				context.getters.getUserRequestedLang = languagesModule.getters.getUserRequestedLang( state );
				context.getters.getUserLangZid = languagesModule.getters.getUserLangZid( state );
				const labelData = libraryModule.getters.getLabelData( state, context.getters )( 'Z6' );
				expect( labelData.zid ).toEqual( 'Z6' );
				expect( labelData.label ).toEqual( '(Z6)' );
				expect( labelData.isUntitled ).toBe( false );
				expect( labelData.labelOrUntitled ).toBe( '(Z6)' );
			} );
		} );

		describe( 'getStoredObject', () => {
			it( 'Returns if the zid is not available in the state', () => {
				expect( libraryModule.getters.getStoredObject( state )( 'Z10000' ) ).toEqual( undefined );
			} );

			it( 'Returns the whole object if available in the state', () => {
				state.objects = mockApiZids;
				expect( libraryModule.getters.getStoredObject( state )( 'Z6' ) ).toEqual( mockApiZids.Z6 );
			} );
		} );

		describe( 'getExpectedTypeOfKey', () => {
			beforeEach( () => {
				state.objects = mockApiZids;
			} );

			it( 'Returns Z_PERSISTENTOBJECT if the key is undefined', () => {
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( undefined ) )
					.toEqual( Constants.Z_PERSISTENTOBJECT );
			} );

			it( 'Returns Z_OBJECT is the key is local', () => {
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( 'K1' ) ).toEqual( Constants.Z_OBJECT );
			} );

			it( 'Returns Z_OBJECT is the key is not found', () => {
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( 'Z10000K1' ) ).toEqual( Constants.Z_OBJECT );
			} );

			it( 'Returns the terminal type of a global key', () => {
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( 'Z6K1' ) ).toEqual( Constants.Z_STRING );
			} );

			it( 'Returns the generic type of a global key', () => {
				const expected = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_LIST,
					Z881K1: Constants.Z_STRING
				};
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( 'Z31K2' ) ).toEqual( expected );
			} );

			it( 'Returns the argument type of a key if the zid is that of a function', () => {
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( 'Z881K1' ) ).toEqual( Constants.Z_TYPE );
			} );

			it( 'Returns Z_OBJECT if the key is not from a type or a function', () => {
				expect( libraryModule.getters.getExpectedTypeOfKey( state )( 'Z10001K1' ) ).toEqual( Constants.Z_OBJECT );
			} );
		} );

		describe( 'isIdentityKey', () => {
			beforeEach( () => {
				state.objects = mockApiZids;
			} );

			it( 'returns false if the key is undefined', () => {
				expect( libraryModule.getters.isIdentityKey( state )( undefined ) ).toBe( false );
			} );

			it( 'returns false if the key is local', () => {
				expect( libraryModule.getters.isIdentityKey( state )( 'K1' ) ).toBe( false );
			} );

			it( 'returns false if the key is of a typed list item', () => {
				expect( libraryModule.getters.isIdentityKey( state )( '1' ) ).toBe( false );
			} );

			it( 'returns false if the key is unknown', () => {
				expect( libraryModule.getters.isIdentityKey( state )( 'Z1234K567' ) ).toBe( false );
			} );

			it( 'returns false if the key is not a type key', () => {
				expect( libraryModule.getters.isIdentityKey( state )( 'Z881K1' ) ).toBe( false );
			} );

			it( 'returns false if the key has no is identity/Z3K4 key', () => {
				expect( libraryModule.getters.isIdentityKey( state )( 'Z20007K1' ) ).toBe( false );
			} );

			it( 'returns false if the key has is identity/Z3K4 key set to false', () => {
				expect( libraryModule.getters.isIdentityKey( state )( 'Z20007K2' ) ).toBe( false );
			} );

			it( 'returns false if the key has is identity/Z3K4 key set to ref(true)', () => {
				expect( libraryModule.getters.isIdentityKey( state )( 'Z20007K3' ) ).toBe( true );
			} );

			it( 'returns false if the key has is identity/Z3K4 key set to boolean(true)', () => {
				expect( libraryModule.getters.isIdentityKey( state )( 'Z20007K4' ) ).toBe( true );
			} );
		} );

		describe( 'getLanguageIsoCodeOfZLang', () => {
			beforeEach( () => {
				state.objects = mockApiZids;
			} );

			it( 'Returns the language zid if the object hasn not been fetched', () => {
				expect( libraryModule.getters.getLanguageIsoCodeOfZLang( state )( 'Z1002' ) ).toEqual( 'Z1002' );
			} );

			it( 'Returns the zid if it is of the wrong type', () => {
				expect( libraryModule.getters.getLanguageIsoCodeOfZLang( state )( 'Z6' ) ).toEqual( 'Z6' );
			} );

			it( 'Returns the language ISO code if available', () => {
				expect( libraryModule.getters.getLanguageIsoCodeOfZLang( state )( 'Z1003' ) ).toEqual( 'es' );
			} );
		} );

		describe( 'getConnectedObjects', () => {
			it( 'Returns empty array if the zid is not available in the state', () => {
				expect(
					libraryModule.getters.getConnectedObjects( state )( 'Z802', Constants.Z_FUNCTION_IMPLEMENTATIONS )
				).toEqual( [] );
			} );

			it( 'Returns empty array if the zid is not of a function', () => {
				state.objects = mockApiZids;
				expect(
					libraryModule.getters.getConnectedObjects( state )( 'Z6', Constants.Z_FUNCTION_IMPLEMENTATIONS )
				).toEqual( [] );
			} );

			it( 'Returns array with the implementations of a given function', () => {
				state.objects = mockApiZids;
				expect(
					libraryModule.getters.getConnectedObjects( state )( 'Z802', Constants.Z_FUNCTION_IMPLEMENTATIONS )
				).toEqual( [ 'Z902' ] );
			} );

			it( 'Returns array with the tests of a given function', () => {
				state.objects = mockApiZids;
				expect(
					libraryModule.getters.getConnectedObjects( state )( 'Z802', Constants.Z_FUNCTION_TESTERS )
				).toEqual( [ 'Z8020', 'Z8021' ] );
			} );

			it( 'Returns empty array if key not valid', () => {
				state.objects = mockApiZids;
				expect(
					libraryModule.getters.getConnectedObjects( state )( 'Z802' )
				).toEqual( [] );
			} );
		} );

		describe( 'getInputsOfFunctionZid', () => {
			beforeEach( () => {
				state.objects = mockApiZids;
			} );

			it( 'Returns empty array when the zid has not been fetched ', () => {
				expect( libraryModule.getters.getInputsOfFunctionZid( state )( 'Z999999' ) ).toHaveLength( 0 );
			} );

			it( 'Returns empty array when the zid is not a function', () => {
				expect( libraryModule.getters.getInputsOfFunctionZid( state )( 'Z32' ) ).toHaveLength( 0 );
			} );

			it( 'Returns one argument with a one-argument function', () => {
				const args = libraryModule.getters.getInputsOfFunctionZid( state )( 'Z881' );
				expect( args ).toHaveLength( 1 );
				expect( args[ 0 ].Z17K2 ).toEqual( 'Z881K1' );
			} );

			it( 'Returns all arguments with a three-argument function', () => {
				const args = libraryModule.getters.getInputsOfFunctionZid( state )( 'Z802' );
				expect( args ).toHaveLength( 3 );
				expect( args[ 0 ].Z17K2 ).toEqual( 'Z802K1' );
				expect( args[ 1 ].Z17K2 ).toEqual( 'Z802K2' );
				expect( args[ 2 ].Z17K2 ).toEqual( 'Z802K3' );
			} );
		} );

		describe( 'getFunctionZidOfImplementation', () => {
			beforeEach( () => {
				state.objects = mockApiZids;
			} );

			it( 'returns undefined if the implementation is not found', () => {
				const zid = 'Z20055';
				const expected = undefined;
				const actual = libraryModule.getters.getFunctionZidOfImplementation( state )( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns undefined if the object is not an implementation', () => {
				const zid = 'Z6';
				const expected = undefined;
				const actual = libraryModule.getters.getFunctionZidOfImplementation( state )( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns function zid of the implementation', () => {
				const zid = 'Z20005';
				const expected = 'Z20000';
				const actual = libraryModule.getters.getFunctionZidOfImplementation( state )( zid );
				expect( actual ).toBe( expected );
			} );
		} );

		describe( 'getTypeOfImplementation', () => {
			beforeEach( () => {
				state.objects = mockApiZids;
			} );

			it( 'returns undefined if the implementation is not found', () => {
				const zid = 'Z20055';
				const expected = undefined;
				const actual = libraryModule.getters.getTypeOfImplementation( state )( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns undefined if the object is not an implementation', () => {
				const zid = 'Z6';
				const expected = undefined;
				const actual = libraryModule.getters.getTypeOfImplementation( state )( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'returns type of code implementation', () => {
				const zid = 'Z20005';
				const expected = 'Z14K3';
				const actual = libraryModule.getters.getTypeOfImplementation( state )( zid );
				expect( actual ).toBe( expected );
			} );
		} );

		describe( 'getLanguageOfImplementation', () => {
			beforeEach( () => {
				state.objects = mockApiZids;
			} );

			it( 'gets language of a code implementation with a referenced programming language', () => {
				const zid = 'Z20005';
				const expected = 'Z600';
				const actual = libraryModule.getters.getLanguageOfImplementation( state )( zid );
				expect( actual ).toBe( expected );
			} );

			it( 'gets language of a code implementation with a literal programming language', () => {
				const zid = 'Z20006';
				const expected = 'javascript';
				const actual = libraryModule.getters.getLanguageOfImplementation( state )( zid );
				expect( actual ).toBe( expected );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'prefetchZids', () => {
			it( 'prefetchZids function performs expected actions', () => {
				context.dispatch = jest.fn();
				context.getters = {
					getUserLangZid: jest.fn().mockReturnValue( 'Z1002' )
				};

				libraryModule.actions.prefetchZids( context );

				expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
				// No need to check specific prefetched keys, just that keys are being fetched
				expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', expect.anything() );
			} );
		} );

		describe( 'fetchZids', () => {
			beforeEach( () => {
				context.state.objects = {};
				context.state.requests = {};
				context.dispatch = jest.fn( ( key, payload ) => {
					// Only run performFetchZids action
					if ( key === 'performFetchZids' ) {
						return libraryModule.actions.performFetchZids( context, payload );
					}
				} );
			} );

			it( 'Call api.get if the zId is not already in the state', () => {
				const zids = [ 'Z1' ];

				return libraryModule.actions.fetchZids( context, { zids } ).then( () => {
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

			it( 'Call api.get with multiple Zids as a string separated by | ', () => {
				const zids = [ 'Z1', 'Z6' ];
				const expectedWikiLambdaloadZids = 'Z1|Z6';

				return libraryModule.actions.fetchZids( context, { zids } ).then( () => {
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

			it( 'Will NOT call the APi if the Zids are already fetched', () => {
				const zids = [ 'Z1', 'Z6' ];
				context.state.objects = mockApiZids;

				return libraryModule.actions.fetchZids( context, { zids } ).then( () => {
					expect( mw.Api ).toHaveBeenCalledTimes( 0 );
					expect( getMock ).toHaveBeenCalledTimes( 0 );
				} );
			} );

			it( 'Will call the APi only with the Zids that are not yet fetched', () => {
				const zids = [ 'Z1', 'Z2', 'Z6' ];
				const expectedWikiLambdaloadZids = 'Z2|Z6';
				context.state.objects = {
					Z1: mockApiZids.Z1
				};

				return libraryModule.actions.fetchZids( context, { zids } ).then( () => {
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

			it( 'Will Update the stored collection with the objects in the API response', () => {
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

				return libraryModule.actions.fetchZids( context, { zids } ).then( () => {
					expect( mw.Api ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledTimes( 1 );
					expect( context.commit ).toHaveBeenCalledWith( 'setStoredObject', expectedAddZ1 );
					expect( context.commit ).toHaveBeenCalledWith( 'setStoredObject', expectedAddZ2 );
					expect( context.commit ).toHaveBeenCalledWith( 'setStoredObject', expectedAddZ6 );
				} );
			} );

			it( 'fetches zids in batches of 50', () => {
				// 123 zids, three batches of lengths: 50, 50, 23
				const zids = [];
				for ( let i = 1; i <= 123; i++ ) {
					zids.push( `Z${ i }` );
				}
				const batch1 = zids.slice( 0, 50 );
				const batch2 = zids.slice( 50, 100 );
				const batch3 = zids.slice( 100, 123 );

				return libraryModule.actions.fetchZids( context, { zids } ).then( () => {
					expect( getMock ).toHaveBeenCalledTimes( 3 );
					expect( getMock ).toHaveBeenNthCalledWith( 1, {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						wikilambdaload_zids: batch1.join( '|' ),
						wikilambdaload_language: context.rootGetters.zLang,
						wikilambdaload_get_dependencies: 'true'
					} );
					expect( getMock ).toHaveBeenNthCalledWith( 2, {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						wikilambdaload_zids: batch2.join( '|' ),
						wikilambdaload_language: context.rootGetters.zLang,
						wikilambdaload_get_dependencies: 'true'
					} );
					expect( getMock ).toHaveBeenNthCalledWith( 3, {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						wikilambdaload_zids: batch3.join( '|' ),
						wikilambdaload_language: context.rootGetters.zLang,
						wikilambdaload_get_dependencies: 'true'
					} );
				} );
			} );

			it( 'request only the zids that have not been requested before', () => {
				const first = [ 'Z1', 'Z2', 'Z3', 'Z4' ];
				const second = [ 'Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6' ];

				context.dispatch = jest.fn().mockResolvedValue( true );

				// Run two inmediate calls with repeated zids
				libraryModule.actions.fetchZids( context, { zids: first } );
				return libraryModule.actions.fetchZids( context, { zids: second } ).then( () => {
					expect( context.dispatch ).toHaveBeenCalledTimes( 2 );
					expect( context.dispatch ).toHaveBeenNthCalledWith( 1, 'performFetchZids', { zids: first } );
					expect( context.dispatch ).toHaveBeenNthCalledWith( 2, 'performFetchZids', { zids: [ 'Z5', 'Z6' ] } );
				} );
			} );

			describe( 'Fetch dependencies', () => {
				it( 'requests the language Zids of the returned labels', () => {
					const zids = [ 'Z20001' ];
					getMock = jest.fn().mockResolvedValue( mockApiResponseFor( zids ) );

					return libraryModule.actions.fetchZids( context, { zids } ).then( () => {
						expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: [ 'Z1003', 'Z1002' ] } );
					} );
				} );

				it( 'requests the renderer/parser Zids of the returned type', () => {
					const zids = [ 'Z20002' ];
					getMock = jest.fn().mockResolvedValue( mockApiResponseFor( zids ) );

					return libraryModule.actions.fetchZids( context, { zids } ).then( () => {
						expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: [ 'Z1002', 'Z20020', 'Z20030' ] } );
						expect( context.commit ).toHaveBeenCalledWith( 'setRenderer', { type: 'Z20002', renderer: 'Z20020' } );
						expect( context.commit ).toHaveBeenCalledWith( 'setParser', { type: 'Z20002', parser: 'Z20030' } );
					} );
				} );
			} );
		} );
	} );
} );
