/*!
 * WikiLambda unit test suite for the functionEditor Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const zobjectToRows = require( '../../helpers/zObjectTableHelpers.js' ).zobjectToRows,
	zobjectModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobject.js' ),
	zFunctionModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zFunction.js' );

describe( 'zFunction Vuex module', () => {
	let getters;

	describe( 'Getters', () => {
		describe( 'getZFunctionInputs', () => {
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
			} );

			it( 'returns empty list when row is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = [];
				expect( zFunctionModule.getters.getZFunctionInputs( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns empty list when row does not exist', () => {
				state.zobject = [];
				const rowId = 1;
				const expected = [];
				expect( zFunctionModule.getters.getZFunctionInputs( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns empty array when no inputs', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17' ] } } );
				const rowId = 0;
				const inputs = zFunctionModule.getters.getZFunctionInputs( state, getters )( rowId );
				expect( inputs ).toHaveLength( 0 );
			} );

			it( 'returns one function input row', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const rowId = 0;
				const inputs = zFunctionModule.getters.getZFunctionInputs( state, getters )( rowId );
				expect( inputs ).toHaveLength( 1 );
				expect( inputs[ 0 ].key ).toEqual( '1' );
			} );

			it( 'returns two function input rows', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const rowId = 0;
				const inputs = zFunctionModule.getters.getZFunctionInputs( state, getters )( rowId );
				expect( inputs ).toHaveLength( 2 );
				expect( inputs[ 0 ].key ).toEqual( '1' );
				expect( inputs[ 1 ].key ).toEqual( '2' );
			} );
		} );

		describe( 'getZFunctionInputLangs', () => {
			beforeEach( () => {
				getters = {};
				/* From zObject module */
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZMonolingualLangValue = zobjectModule.getters.getZMonolingualLangValue( state, getters );
				getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZMultilingualLanguageList = zobjectModule.getters.getZMultilingualLanguageList(
					state, getters );
				/* From zKeys module */
				getters.getLanguageIsoCodeOfZLang = ( key ) => ( key === 'Z1002' ? 'en' : 'es' );
				/* From zFunction module */
				getters.getZFunctionInputs = zFunctionModule.getters.getZFunctionInputs( state, getters );
			} );

			it( 'returns empty array when row is not found', () => {
				state.zobject = [];
				const rowId = 0;
				const expected = [];
				const current = zFunctionModule.getters.getZFunctionInputLangs( state, getters )( rowId );
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns empty array when function has no inputs', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17' ] } } );
				const expected = [];
				const current = zFunctionModule.getters.getZFunctionInputLangs( state, getters )();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns empty array when function inputs have no labels', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const expected = [];
				const current = zFunctionModule.getters.getZFunctionInputLangs( state, getters )();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns array with one language', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' }
					] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input two' }
					] } }
				] } } );
				const expected = [
					{ langZid: 'Z1002', langIsoCode: 'en', rowId: 24 },
					{ langZid: 'Z1002', langIsoCode: 'en', rowId: 52 }
				];
				const current = zFunctionModule.getters.getZFunctionInputLangs( state, getters )();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns array with two languages', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' },
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'primer argumento' }
					] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const expected = [
					{ langZid: 'Z1002', langIsoCode: 'en', rowId: 24 },
					{ langZid: 'Z1003', langIsoCode: 'es', rowId: 34 }
				];
				const current = zFunctionModule.getters.getZFunctionInputLangs( state, getters )();
				expect( current ).toStrictEqual( expected );
			} );
		} );

		describe( 'getZFunctionLanguages', () => {
			beforeEach( () => {
				getters = {};
				getters.getZPersistentNameLangs = () => [];
				getters.getZPersistentDescriptionLangs = () => [];
				getters.getZPersistentAliasLangs = () => [];
				getters.getZFunctionInputLangs = () => [];
			} );

			it( 'returns empty array when there is no metadata', () => {
				const expected = [];
				const current = zFunctionModule.getters.getZFunctionLanguages( state, getters )();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns array with one language', () => {
				getters.getZPersistentNameLangs = () => [ { langZid: 'Z1002', langIsoCode: 'en', rowId: 1 } ];
				getters.getZPersistentDescriptionLangs = () => [ { langZid: 'Z1002', langIsoCode: 'en', rowId: 2 } ];
				getters.getZPersistentAliasLangs = () => [ { langZid: 'Z1002', langIsoCode: 'en', rowId: 4 } ];
				getters.getZFunctionInputLangs = () => [ { langZid: 'Z1002', langIsoCode: 'en', rowId: 5 } ];

				const expected = [ 'Z1002' ];
				const current = zFunctionModule.getters.getZFunctionLanguages( state, getters )();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns array with four non overlapping languages', () => {
				getters.getZPersistentNameLangs = () => [ { langZid: 'Z1003', langIsoCode: 'es', rowId: 1 } ];
				getters.getZPersistentDescriptionLangs = () => [ { langZid: 'Z1002', langIsoCode: 'en', rowId: 2 } ];
				getters.getZPersistentAliasLangs = () => [ { langZid: 'Z1004', langIsoCode: 'fr', rowId: 4 } ];
				getters.getZFunctionInputLangs = () => [ { langZid: 'Z1006', langIsoCode: 'zh', rowId: 5 } ];

				const expected = [ 'Z1003', 'Z1002', 'Z1004', 'Z1006' ];
				const current = zFunctionModule.getters.getZFunctionLanguages( state, getters )();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns array with two overlapping languages', () => {
				getters.getZPersistentNameLangs = () => [
					{ langZid: 'Z1002', langIsoCode: 'en', rowId: 1 },
					{ langZid: 'Z1003', langIsoCode: 'es', rowId: 2 }
				];
				getters.getZPersistentDescriptionLangs = () => [
					{ langZid: 'Z1002', langIsoCode: 'en', rowId: 3 },
					{ langZid: 'Z1003', langIsoCode: 'es', rowId: 4 }
				];
				getters.getZPersistentAliasLangs = () => [
					{ langZid: 'Z1002', langIsoCode: 'en', rowId: 5 },
					{ langZid: 'Z1003', langIsoCode: 'es', rowId: 6 }
				];
				getters.getZFunctionInputLangs = () => [
					{ langZid: 'Z1002', langIsoCode: 'en', rowId: 7 },
					{ langZid: 'Z1003', langIsoCode: 'es', rowId: 8 }
				];

				const expected = [ 'Z1002', 'Z1003' ];
				const current = zFunctionModule.getters.getZFunctionLanguages( state, getters )();
				expect( current ).toStrictEqual( expected );
			} );
		} );

		describe( 'getZFunctionOutput', () => {
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
			} );

			it( 'returns undefined when row is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				expect( zFunctionModule.getters.getZFunctionOutput( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				state.zobject = [];
				const rowId = 1;
				const expected = undefined;
				expect( zFunctionModule.getters.getZFunctionOutput( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns output row', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K2: 'Z6' } } );
				const rowId = 0;
				const expected = { id: 2, key: 'Z8K2', parent: 1, value: 'object' };
				expect( zFunctionModule.getters.getZFunctionOutput( state, getters )( rowId ) )
					.toEqual( expected );
			} );
		} );

		describe( 'getZFunctionIdentity', () => {
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
			} );

			it( 'returns undefined when row is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const current = zFunctionModule.getters.getZFunctionIdentity( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const current = zFunctionModule.getters.getZFunctionIdentity( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns function identity string representation', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K5: 'Z12345' } } );
				const rowId = 0;
				const expected = 'Z12345';
				const current = zFunctionModule.getters.getZFunctionIdentity( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );
		} );

		describe( 'getZArgumentTypeRowId', () => {
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
			} );

			it( 'returns undefined when row is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const current = zFunctionModule.getters.getZArgumentTypeRowId( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const current = zFunctionModule.getters.getZArgumentTypeRowId( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns argument type row Id given the argument row Id', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					/* Arg 1: rowId 6, type is rowId 10 */
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					/* Arg 2: rowId 24, type is rowId 28 */
					{ Z1K1: 'Z17', Z17K1: 'Z40', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );

				expect( zFunctionModule.getters.getZArgumentTypeRowId( state, getters )( 6 ) )
					.toEqual( 10 );
				expect( zFunctionModule.getters.getZArgumentTypeRowId( state, getters )( 24 ) )
					.toEqual( 28 );
			} );

		} );

		describe( 'getZArgumentLabelForLanguage', () => {
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
				getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( state, getters );
				getters.getZMonolingualLangValue = zobjectModule.getters.getZMonolingualLangValue( state, getters );
			} );

			it( 'returns undefined when row is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const current = zFunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const current = zFunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when the language is not available', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					/* Arg 1: rowId 6 */
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' }
					] } }
				] } } );

				// First argument in an unavailable language
				expect( zFunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( 6, 'Z1003' ) )
					.toEqual( undefined );
			} );

			it( 'returns label given argument rowId and language Zid', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					/* Arg 1: rowId 6 */
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' },
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'primer argumento' }
					] } },
					/* Arg 2: rowId 44 */
					{ Z1K1: 'Z17', Z17K1: 'Z40', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input two' },
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'segundo argumento' }
					] } }
				] } } );

				let row;

				// First argument in English
				row = zFunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( 6, 'Z1002' );
				expect( row.id ).toEqual( 24 );
				expect( zobjectModule.getters.getZMonolingualTextValue( state, getters )( row.id ) )
					.toEqual( 'input one' );

				// First argument in Spanish
				row = zFunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( 6, 'Z1003' );
				expect( row.id ).toEqual( 34 );
				expect( zobjectModule.getters.getZMonolingualTextValue( state, getters )( row.id ) )
					.toEqual( 'primer argumento' );

				// Second argument in English
				row = zFunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( 44, 'Z1002' );
				expect( row.id ).toEqual( 62 );
				expect( zobjectModule.getters.getZMonolingualTextValue( state, getters )( row.id ) )
					.toEqual( 'input two' );

				// Second argument in Spanish
				row = zFunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( 44, 'Z1003' );
				expect( row.id ).toEqual( 72 );
				expect( zobjectModule.getters.getZMonolingualTextValue( state, getters )( row.id ) )
					.toEqual( 'segundo argumento' );
			} );
		} );
	} );
} );
