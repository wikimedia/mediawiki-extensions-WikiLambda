/*!
 * WikiLambda unit test suite for the zKeys Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var zkeysModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zKeys.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	mockApiReponse = require( '../../fixtures/mocks.js' ).mockApiReponse,
	mockApiZkeys = require( '../../fixtures/mocks.js' ).mockApiZkeys,
	mockLabels = {
		Z1: { zid: 'Z1', label: 'Object', lang: 'Z1002' },
		Z6: { zid: 'Z6', label: 'String', lang: 'Z1002' }
	},
	state,
	context,
	getMock,
	getResolveMock;

describe( 'zkeys Vuex module', function () {
	beforeEach( function () {
		getResolveMock = jest.fn( function ( thenFunction ) {
			return thenFunction( mockApiReponse );
		} );
		getMock = jest.fn( function () {
			return {
				then: getResolveMock
			};
		} );
		state = JSON.parse( JSON.stringify( zkeysModule.state ) );
		context = $.extend( {}, {
			commit: jest.fn( function ( mutationType, payload ) {
				return zkeysModule.mutations[ mutationType ]( state, payload );
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

		// TODO (T329107): Deprecate
		describe( 'getZkeys', function () {
			it( 'Returns empty object if no zKeys are defined in the state', function () {
				expect( zkeysModule.getters.getZkeys( state ) ).toEqual( {} );
			} );

			it( 'Returns the zKeys defined in the state', function () {
				state.zKeys = mockApiZkeys;
				expect( zkeysModule.getters.getZkeys( state ) ).toEqual( mockApiZkeys );
			} );
		} );

		describe( 'getLabel', function () {
			beforeEach( function () {
				context.getters.getLabelData = zkeysModule.getters.getLabelData( state );
			} );

			it( 'Returns the zid or key if label is not available in the state', function () {
				expect( zkeysModule.getters.getLabel( state, context.getters )( 'Z10000' ) ).toEqual( 'Z10000' );
			} );

			it( 'Returns the label if available in the state', function () {
				state.labels = mockLabels;
				expect( zkeysModule.getters.getLabel( state, context.getters )( 'Z6' ) ).toEqual( 'String' );
			} );
		} );

		describe( 'getLabelData', function () {
			it( 'Returns undefined if label is not available in the state', function () {
				expect( zkeysModule.getters.getLabelData( state, context.getters )( 'Z10000' ) ).toEqual( undefined );
			} );

			it( 'Returns the label data if available in the state', function () {
				state.labels = mockLabels;
				expect( zkeysModule.getters.getLabelData( state, context.getters )( 'Z6' ) ).toEqual( { zid: 'Z6', label: 'String', lang: 'Z1002' } );
			} );
		} );

		describe( 'getPersistedObject', function () {
			it( 'Returns if the zid is not available in the state', function () {
				expect( zkeysModule.getters.getPersistedObject( state )( 'Z10000' ) ).toEqual( undefined );
			} );

			it( 'Returns the whole object if available in the state', function () {
				state.zKeys = mockApiZkeys;
				expect( zkeysModule.getters.getPersistedObject( state )( 'Z6' ) ).toEqual( mockApiZkeys.Z6 );
			} );
		} );

		describe( 'getExpectedTypeOfKey', function () {
			beforeEach( function () {
				state.zKeys = mockApiZkeys;
			} );

			it( 'Returns Z_PERSISTENTOBJECT if the key is undefined', function () {
				expect( zkeysModule.getters.getExpectedTypeOfKey( state )( undefined ) )
					.toEqual( Constants.Z_PERSISTENTOBJECT );
			} );

			it( 'Returns Z_OBJECT is the key is local', function () {
				expect( zkeysModule.getters.getExpectedTypeOfKey( state )( 'K1' ) ).toEqual( Constants.Z_OBJECT );
			} );

			it( 'Returns Z_OBJECT is the key is not found', function () {
				expect( zkeysModule.getters.getExpectedTypeOfKey( state )( 'Z10000K1' ) ).toEqual( Constants.Z_OBJECT );
			} );

			it( 'Returns the value type of a key if the zid is that of a type', function () {
				expect( zkeysModule.getters.getExpectedTypeOfKey( state )( 'Z6K1' ) ).toEqual( Constants.Z_STRING );
			} );

			it( 'Returns the argument type of a key if the zid is that of a function', function () {
				expect( zkeysModule.getters.getExpectedTypeOfKey( state )( 'Z881K1' ) ).toEqual( Constants.Z_TYPE );
			} );

			it( 'Returns Z_OBJECT if the key is not from a type or a function', function () {
				expect( zkeysModule.getters.getExpectedTypeOfKey( state )( 'Z10001K1' ) ).toEqual( Constants.Z_OBJECT );
			} );
		} );

		describe( 'getLanguageIsoCodeOfZLang', function () {
			beforeEach( function () {
				state.zKeys = mockApiZkeys;
			} );

			it( 'Returns the language zid if the object hasn not been fetched', function () {
				expect( zkeysModule.getters.getLanguageIsoCodeOfZLang( state )( 'Z1002' ) ).toEqual( 'Z1002' );
			} );

			it( 'Returns the zid if it is of the wrong type', function () {
				expect( zkeysModule.getters.getLanguageIsoCodeOfZLang( state )( 'Z6' ) ).toEqual( 'Z6' );
			} );

			it( 'Returns the language ISO code if available', function () {
				expect( zkeysModule.getters.getLanguageIsoCodeOfZLang( state )( 'Z1003' ) ).toEqual( 'es' );
			} );
		} );

		describe( 'getAttachedImplementations', function () {
			it( 'Returns empty array if the zid is not available in the state', function () {
				expect( zkeysModule.getters.getAttachedImplementations( state )( 'Z802' ) ).toEqual( [] );
			} );

			it( 'Returns empty array if the zid is not of a function', function () {
				state.zKeys = mockApiZkeys;
				expect( zkeysModule.getters.getAttachedImplementations( state )( 'Z6' ) ).toEqual( [] );
			} );

			it( 'Returns array with the implementations of a given function', function () {
				state.zKeys = mockApiZkeys;
				expect( zkeysModule.getters.getAttachedImplementations( state )( 'Z802' ) ).toEqual( [ 'Z902' ] );
			} );
		} );
	} );

	describe( 'Actions', function () {
		describe( 'fetchZKeys', function () {
			beforeEach( function () {
				context.dispatch = jest.fn( function ( key, payload ) {
					return new Promise( function ( resolve ) {
						zkeysModule.actions.performZKeyFetch( context, payload );
						resolve( payload.zids );
					} );
				} );
			} );

			it( 'Call api.get if the zId is not already in the state', function () {
				var zIdsToSearch = [ 'Z1' ];
				return zkeysModule.actions.fetchZKeys( context, { zids: zIdsToSearch } ).then( function () {
					expect( mw.Api ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						wikilambdaload_zids: 'Z1',
						wikilambdaload_language: context.rootGetters.zLang,
						wikilambdaload_canonical: 'true'
					} );
				} );
			} );
			it( 'Call api.get with multiple Zids as a string separated by | ', function () {
				var zIdsToSearch = [ 'Z1', 'Z6' ],
					expectedWikilambdaloadZids = 'Z1|Z6';
				return zkeysModule.actions.fetchZKeys( context, { zids: zIdsToSearch } ).then( function () {
					expect( mw.Api ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						wikilambdaload_zids: expectedWikilambdaloadZids,
						wikilambdaload_language: context.rootGetters.zLang,
						wikilambdaload_canonical: 'true'
					} );
				} );
			} );
			it( 'Will NOT call the APi if the Zids is already part of the zKeys', function () {
				var zIdsToSearch = [ 'Z1' ];
				context.state.zKeys = mockApiZkeys;

				zkeysModule.actions.fetchZKeys( context, { zids: zIdsToSearch } );

				expect( mw.Api ).toHaveBeenCalledTimes( 0 );
				expect( getMock ).toHaveBeenCalledTimes( 0 );
			} );
			it( 'Will call the APi only with the Zids that are not already in zKeys', function () {
				var zIdsToSearch = [ 'Z1', 'Z2', 'Z6' ],
					expectedWikilambdaloadZids = 'Z2|Z6';
				context.state.zKeys = {
					Z1: mockApiZkeys.Z1
				};

				return zkeysModule.actions.fetchZKeys( context, { zids: zIdsToSearch } ).then( function () {
					expect( mw.Api ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						wikilambdaload_zids: expectedWikilambdaloadZids,
						wikilambdaload_language: context.rootGetters.zLang,
						wikilambdaload_canonical: 'true'
					} );

					Promise.resolve();
				} );
			} );
			it( 'Will Update the ZKeys with the API response', function () {
				var zIdsToSearch = [ 'Z1', 'Z2', 'Z6' ],
					expectedAddZKeyInfoCall = expect.objectContaining( {
						zid: expect.any( String ),
						info: expect.any( Object )
					} ),
					expectedAddAllZKeyLabelsCall = expect.arrayContaining( [
						{
							zid: expect.any( String ),
							lang: expect.any( String ),
							label: expect.any( String )
						},
						{
							zid: expect.any( String ),
							lang: expect.any( String ),
							label: expect.any( String )
						}
					] );

				zkeysModule.actions.performZKeyFetch( context, { zids: zIdsToSearch } );

				return new Promise( function ( resolve ) {
					expect( mw.Api ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledTimes( 1 );
					expect( getResolveMock ).toHaveBeenCalledTimes( 1 );
					expect( context.commit ).toHaveBeenCalledTimes( 17 );
					expect( context.commit ).toHaveBeenCalledWith( 'addZKeyInfo', expectedAddZKeyInfoCall );
					expect( context.commit ).toHaveBeenCalledWith( 'addAllZKeyLabels', expectedAddAllZKeyLabelsCall );
					resolve();
				}, 1000 );
			} );
		} );
	} );
} );
