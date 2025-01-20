/*!
 * WikiLambda unit test suite for the zFunction Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { setActivePinia, createPinia } = require( 'pinia' );
const { zobjectToRows } = require( '../../helpers/zObjectTableHelpers.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { waitFor } = require( '@testing-library/vue' );

describe( 'zFunction Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.zobject = [];
	} );

	describe( 'Getters', () => {
		describe( 'getZFunctionInputs', () => {
			it( 'returns empty list when row is undefined', () => {
				const rowId = undefined;
				const expected = [];
				expect( store.getZFunctionInputs( rowId ) ).toEqual( expected );
			} );

			it( 'returns empty list when row does not exist', () => {
				const rowId = 1;
				const expected = [];
				expect( store.getZFunctionInputs( rowId ) ).toEqual( expected );
			} );

			it( 'returns empty array when no inputs', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17' ] } } );
				const rowId = 0;
				const inputs = store.getZFunctionInputs( rowId );
				expect( inputs ).toHaveLength( 0 );
			} );

			it( 'returns one function input row', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const rowId = 0;
				const inputs = store.getZFunctionInputs( rowId );
				expect( inputs ).toHaveLength( 1 );
				expect( inputs[ 0 ].key ).toEqual( '1' );
			} );

			it( 'returns two function input rows', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const rowId = 0;
				const inputs = store.getZFunctionInputs( rowId );
				expect( inputs ).toHaveLength( 2 );
				expect( inputs[ 0 ].key ).toEqual( '1' );
				expect( inputs[ 1 ].key ).toEqual( '2' );
			} );
		} );

		describe( 'getZFunctionInputLangs', () => {
			it( 'returns empty array when row is not found', () => {
				const rowId = 0;
				const expected = [];
				const current = store.getZFunctionInputLangs( rowId );
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns empty array when function has no inputs', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17' ] } } );
				const expected = [];
				const current = store.getZFunctionInputLangs();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns empty array when function inputs have no label key', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1' },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2' }
				] } } );
				const expected = [ [], [] ];
				const current = store.getZFunctionInputLangs();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns empty array when function inputs have no labels', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const expected = [ [], [] ];
				const current = store.getZFunctionInputLangs();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns array with one language', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' }
					] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input two' }
					] } }
				] } } );
				const expected = [ [ 'Z1002' ], [ 'Z1002' ] ];
				const current = store.getZFunctionInputLangs();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns array with two languages', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' },
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'primer argumento' }
					] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const expected = [ [ 'Z1002', 'Z1003' ], [] ];
				const current = store.getZFunctionInputLangs();
				expect( current ).toStrictEqual( expected );
			} );
		} );

		describe( 'getZFunctionOutput', () => {
			it( 'returns undefined when row is undefined', () => {
				const rowId = undefined;
				const expected = undefined;
				expect( store.getZFunctionOutput( rowId ) ).toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				const rowId = 1;
				const expected = undefined;
				expect( store.getZFunctionOutput( rowId ) ).toEqual( expected );
			} );

			it( 'returns output row', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K2: 'Z6' } } );
				const rowId = 0;
				const expected = { id: 2, key: 'Z8K2', parent: 1, value: Constants.ROW_VALUE_OBJECT };
				expect( store.getZFunctionOutput( rowId ) ).toEqual( expected );
			} );
		} );

		describe( 'getZFunctionIdentity', () => {
			it( 'returns undefined when row is undefined', () => {
				const rowId = undefined;
				const expected = undefined;
				const current = store.getZFunctionIdentity( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				const rowId = 0;
				const expected = undefined;
				const current = store.getZFunctionIdentity( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns function identity string representation', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K5: 'Z12345' } } );
				const rowId = 0;
				const expected = 'Z12345';
				const current = store.getZFunctionIdentity( rowId );
				expect( current ).toEqual( expected );
			} );
		} );

		describe( 'getZArgumentTypeRowId', () => {
			it( 'returns undefined when row is undefined', () => {
				const rowId = undefined;
				const expected = undefined;
				const current = store.getZArgumentTypeRowId( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				const rowId = 0;
				const expected = undefined;
				const current = store.getZArgumentTypeRowId( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns argument type row Id given the argument row Id', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					/* Arg 1: rowId 6, type is rowId 10 */
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					/* Arg 2: rowId 24, type is rowId 28 */
					{ Z1K1: 'Z17', Z17K1: 'Z40', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );

				expect( store.getZArgumentTypeRowId( 6 ) ).toEqual( 10 );
				expect( store.getZArgumentTypeRowId( 24 ) ).toEqual( 28 );
			} );
		} );

		describe( 'getZArgumentKey', () => {
			it( 'returns undefined when row is undefined', () => {
				const rowId = undefined;
				const expected = undefined;
				const current = store.getZArgumentKey( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when row is not found', () => {
				const rowId = 100;
				const expected = undefined;
				const current = store.getZArgumentKey( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns argument key given the argument row Id', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					/* Arg 1: rowId 6, type is rowId 10 */
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					/* Arg 2: rowId 24, type is rowId 28 */
					{ Z1K1: 'Z17', Z17K1: 'Z40', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );

				expect( store.getZArgumentKey( 6 ) ).toEqual( 'Z12345K1' );
				expect( store.getZArgumentKey( 24 ) ).toEqual( 'Z12345K2' );
			} );
		} );

		describe( 'getZArgumentLabelForLanguage', () => {
			it( 'returns undefined when row is undefined', () => {
				const rowId = undefined;
				const expected = undefined;
				const current = store.getZArgumentLabelForLanguage( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				const rowId = 0;
				const expected = undefined;
				const current = store.getZArgumentLabelForLanguage( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when the language is not available', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					/* Arg 1: rowId 6 */
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' }
					] } }
				] } } );

				// First argument in an unavailable language
				expect( store.getZArgumentLabelForLanguage( 6, 'Z1003' ) ).toEqual( undefined );
			} );

			it( 'returns label given argument rowId and language Zid', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
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
				row = store.getZArgumentLabelForLanguage( 6, 'Z1002' );
				expect( row.id ).toEqual( 24 );
				expect( store.getZMonolingualTextValue( row.id ) ).toEqual( 'input one' );

				// First argument in Spanish
				row = store.getZArgumentLabelForLanguage( 6, 'Z1003' );
				expect( row.id ).toEqual( 34 );
				expect( store.getZMonolingualTextValue( row.id ) ).toEqual( 'primer argumento' );

				// Second argument in English
				row = store.getZArgumentLabelForLanguage( 44, 'Z1002' );
				expect( row.id ).toEqual( 62 );
				expect( store.getZMonolingualTextValue( row.id ) ).toEqual( 'input two' );

				// Second argument in Spanish
				row = store.getZArgumentLabelForLanguage( 44, 'Z1003' );
				expect( row.id ).toEqual( 72 );
				expect( store.getZMonolingualTextValue( row.id ) ).toEqual( 'segundo argumento' );
			} );
		} );

		describe( 'getConnectedTests and getConnectedImplementations', () => {
			beforeEach( () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z2',
					Z2K2: {
						Z1K1: 'Z8',
						Z8K1: [ 'Z17' ],
						Z8K2: 'Z6',
						Z8K3: [ 'Z20', 'Z10002', 'Z10003' ],
						Z8K4: [ 'Z14', 'Z10004', 'Z10005' ]
					}
				} );
			} );
			it( 'return attached tests', () => {
				expect( store.getConnectedTests( 0 ) ).toEqual( [ 'Z10002', 'Z10003' ] );
			} );
			it( 'return attached implementations', () => {
				expect( store.getConnectedImplementations( 0 ) ).toEqual( [ 'Z10004', 'Z10005' ] );
			} );
			it( 'returns empty array if test and implementations rows are not found', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z2',
					Z2K2: {
						Z1K1: 'Z8',
						Z8K1: [ 'Z17' ],
						Z8K2: 'Z6'
					}
				} );
				expect( store.getConnectedTests( 0 ) ).toEqual( [] );
				expect( store.getConnectedImplementations( 0 ) ).toEqual( [] );
			} );
		} );

		describe( 'getInvalidOutputFields', () => {
			it( 'returns empty array when output is filled reference', () => {
				store.zobject = zobjectToRows( { Z2K2: {
					Z8K2: 'Z6'
				} } );

				const invalidOutput = store.getInvalidOutputFields;
				const expected = [];
				expect( invalidOutput ).toEqual( expected );
			} );

			it( 'returns empty array when output is filled function call', () => {
				store.zobject = zobjectToRows( { Z2K2: {
					Z8K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z881',
						Z881K1: 'Z6'
					}
				} } );

				const invalidOutput = store.getInvalidOutputFields;
				const expected = [];
				expect( invalidOutput ).toEqual( expected );
			} );

			it( 'returns empty array when output is filled nested function call', () => {
				store.zobject = zobjectToRows( { Z2K2: {
					Z8K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z882',
						Z882K1: 'Z6',
						Z882K2: {
							Z1K1: 'Z7',
							Z7K1: 'Z881',
							Z881K1: 'Z6'
						}
					}
				} } );

				const invalidOutput = store.getInvalidOutputFields;
				const expected = [];
				expect( invalidOutput ).toEqual( expected );
			} );

			it( 'returns error when output is empty reference', () => {
				store.zobject = zobjectToRows( { Z2K2: {
					Z8K2: '' // rowId 2
				} } );

				const invalidOutput = store.getInvalidOutputFields;
				const expected = [ 2 ];
				expect( invalidOutput ).toEqual( expected );
			} );

			it( 'returns error when output is empty function call', () => {
				store.zobject = zobjectToRows( { Z2K2: {
					Z8K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z881',
						Z881K1: '' // rowId 9
					}
				} } );

				const expected = [ 9 ];
				expect( store.getInvalidOutputFields ).toEqual( expected );
			} );

			it( 'returns all errors when output is empty nested function call', () => {
				store.zobject = zobjectToRows( { Z2K2: {
					Z8K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z882',
						Z882K1: '', // rowId 9
						Z882K2: {
							Z1K1: 'Z7',
							Z7K1: 'Z881',
							Z881K1: '' // rowId 19
						}
					}
				} } );

				const expected = [ 9, 19 ];
				expect( store.getInvalidOutputFields ).toEqual( expected );
			} );
		} );

		describe( 'getInvalidInputFields', () => {
			it( 'returns empty array when no inputs', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17' ] } } );

				expect( store.getInvalidInputFields.length ).toEqual( 0 );
			} );

			it( 'returns empty array when all inputs have set type', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{
						Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K1',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					},
					{
						Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K2',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ] }
					}
				] } } );

				expect( store.getInvalidInputFields.length ).toEqual( 0 );
			} );

			it( 'returns empty array when inputs have no type and no label', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K1',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					},
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K2',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					}
				] } } );

				expect( store.getInvalidInputFields.length ).toEqual( 0 );
			} );

			it( 'returns input with empty type but non empty label', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K1',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ] }
					},
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K2',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					}
				] } } );

				// Expect first input to be invalid
				const expected = [ 10 ];
				expect( store.getInvalidInputFields ).toEqual( expected );
			} );

			it( 'returns all inputs with empty type but non empty label', () => {
				store.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K1',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'first' } ] }
					},
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K2',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'segunda' } ] }
					}
				] } } );

				// Expect first and second inputs to be invalid
				const expected = [ 10, 38 ];
				expect( store.getInvalidInputFields ).toEqual( expected );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'Connect and disconnect tests and implementations', () => {
			beforeEach( () => {
				store.setZObject = jest.fn();
				store.updateStoredObject = jest.fn();
				store.submitZObject = jest.fn().mockResolvedValue();

				const initialFunction = {
					Z1K1: 'Z2',
					Z2K2: {
						Z1K1: 'Z8',
						Z8K1: [ 'Z17' ],
						Z8K2: 'Z6',
						Z8K3: [ 'Z20', 'Z10002', 'Z10003' ],
						Z8K4: [ 'Z14', 'Z10004', 'Z10005' ]
					}
				};
				store.zobject = zobjectToRows( initialFunction );
				store.errors = {};
			} );

			describe( 'connect', () => {
				it( 'connects given tests', () => {
					store.connectTests( { rowId: 0, zids: [ 'Z777', 'Z888' ] } );

					expect( store.submitZObject ).toHaveBeenCalledWith(
						{ summary: 'Added $1 to the approved list of test cases' }
					);
					expect( store.getZObjectAsJson ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z2' },
						Z2K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z8' },
							Z8K1: [ { Z1K1: 'Z9', Z9K1: 'Z17' } ],
							Z8K2: { Z1K1: 'Z9', Z9K1: 'Z6' },
							Z8K3: [
								{ Z1K1: 'Z9', Z9K1: 'Z20' },
								{ Z1K1: 'Z9', Z9K1: 'Z10002' },
								{ Z1K1: 'Z9', Z9K1: 'Z10003' },
								{ Z1K1: 'Z9', Z9K1: 'Z777' },
								{ Z1K1: 'Z9', Z9K1: 'Z888' }
							],
							Z8K4: [
								{ Z1K1: 'Z9', Z9K1: 'Z14' },
								{ Z1K1: 'Z9', Z9K1: 'Z10004' },
								{ Z1K1: 'Z9', Z9K1: 'Z10005' }
							]
						}
					} );
				} );

				it( 'connects given implementations', async () => {
					store.connectImplementations( { rowId: 0, zids: [ 'Z777', 'Z888' ] } );

					expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Added $1 to the approved list of implementations' } );
					expect( store.getZObjectAsJson ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z2' },
						Z2K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z8' },
							Z8K1: [ { Z1K1: 'Z9', Z9K1: 'Z17' } ],
							Z8K2: { Z1K1: 'Z9', Z9K1: 'Z6' },
							Z8K3: [
								{ Z1K1: 'Z9', Z9K1: 'Z20' },
								{ Z1K1: 'Z9', Z9K1: 'Z10002' },
								{ Z1K1: 'Z9', Z9K1: 'Z10003' }
							],
							Z8K4: [
								{ Z1K1: 'Z9', Z9K1: 'Z14' },
								{ Z1K1: 'Z9', Z9K1: 'Z10004' },
								{ Z1K1: 'Z9', Z9K1: 'Z10005' },
								{ Z1K1: 'Z9', Z9K1: 'Z777' },
								{ Z1K1: 'Z9', Z9K1: 'Z888' }
							]
						}
					} );

					await waitFor( () => {
						expect( store.updateStoredObject ).toHaveBeenCalled();
					} );
				} );
			} );

			describe( 'disconnect', () => {
				it( 'disconnects given testers', () => {
					store.disconnectTests( { rowId: 0, zids: [ 'Z10002', 'Z10003' ] } );

					expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Removed $1 from the approved list of test cases' } );
					expect( store.getZObjectAsJson ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z2' },
						Z2K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z8' },
							Z8K1: [ { Z1K1: 'Z9', Z9K1: 'Z17' } ],
							Z8K2: { Z1K1: 'Z9', Z9K1: 'Z6' },
							Z8K3: [
								{ Z1K1: 'Z9', Z9K1: 'Z20' }
							],
							Z8K4: [
								{ Z1K1: 'Z9', Z9K1: 'Z14' },
								{ Z1K1: 'Z9', Z9K1: 'Z10004' },
								{ Z1K1: 'Z9', Z9K1: 'Z10005' }
							]
						}
					} );
				} );

				it( 'disconnects given implementations', async () => {
					store.disconnectImplementations( { rowId: 0, zids: [ 'Z10004', 'Z10005' ] } );

					expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Removed $1 from the approved list of implementations' } );
					expect( store.getZObjectAsJson ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z2' },
						Z2K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z8' },
							Z8K1: [ { Z1K1: 'Z9', Z9K1: 'Z17' } ],
							Z8K2: { Z1K1: 'Z9', Z9K1: 'Z6' },
							Z8K3: [
								{ Z1K1: 'Z9', Z9K1: 'Z20' },
								{ Z1K1: 'Z9', Z9K1: 'Z10002' },
								{ Z1K1: 'Z9', Z9K1: 'Z10003' }
							],
							Z8K4: [
								{ Z1K1: 'Z9', Z9K1: 'Z14' }
							]
						}
					} );
					await waitFor( () => {
						expect( store.updateStoredObject ).toHaveBeenCalled();
					} );
				} );
			} );

			describe( 'revert zObject to previous state if api fails', () => {
				const initialZObject = zobjectToRows( {
					Z1K1: 'Z2',
					Z2K2: {
						Z1K1: 'Z8',
						Z8K1: [ 'Z17' ],
						Z8K2: 'Z6',
						Z8K3: [ 'Z20' ],
						Z8K4: [ 'Z14' ]
					}
				} );
				let zObjectCopy;

				beforeEach( () => {
					store.zobject = initialZObject;
					zObjectCopy = store.getZObjectCopy;
					store.submitZObject = jest.fn().mockRejectedValue( 'error' );
				} );

				it( 'connectTests', async () => {
					try {
						await store.connectTests( { rowId: 0, zids: [ 'Z777', 'Z888' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Added $1 to the approved list of test cases' } );
						expect( store.setZObject ).toHaveBeenCalledWith( zObjectCopy );
					}
				} );

				it( 'disconnectTests', async () => {
					try {
						await store.disconnectTests( { rowId: 0, zids: [ 'Z111', 'Z333' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Removed $1 from the approved list of test cases' } );
						expect( store.setZObject ).toHaveBeenCalledWith( zObjectCopy );
					}
				} );

				it( 'connectImplementations', async () => {
					try {
						await store.connectImplementations( { rowId: 0, zids: [ 'Z777', 'Z888' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Added $1 to the approved list of implementations' } );
						expect( store.updateStoredObject ).not.toHaveBeenCalled();
						expect( store.setZObject ).toHaveBeenCalledWith( zObjectCopy );
					}
				} );

				it( 'disconnectImplementations', async () => {
					try {
						await store.disconnectImplementations( { rowId: 0, zids: [ 'Z444', 'Z666' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Removed $1 from the approved list of implementations' } );
						expect( store.updateStoredObject ).not.toHaveBeenCalled();
						expect( store.setZObject ).toHaveBeenCalledWith( zObjectCopy );
					}
				} );
			} );
		} );

		describe( 'fetch tests and implementations', () => {
			let getMock, getResolveMock;
			const mockApiResponse = {
				batchcomplete: '',
				query: {
					wikilambdafn_search: [
						{
							page_namespace: 0,
							zid: 'Z10001'
						},
						{
							page_namespace: 0,
							zid: 'Z10002'
						}
					]
				}
			};

			beforeEach( () => {
				store.fetchZids = jest.fn().mockResolvedValue();
				getResolveMock = jest.fn( ( thenFunction ) => Promise.resolve( thenFunction( mockApiResponse ) ) );
				getMock = jest.fn( () => ( {
					then: getResolveMock
				} ) );
				mw.Api = jest.fn( () => ( {
					get: getMock
				} ) );
			} );

			it( 'calls api.get for tests and returns their zids', async () => {
				const functionZid = 'Z801';
				const zids = await store.fetchTests( functionZid );
				expect( zids ).toEqual( [ 'Z10001', 'Z10002' ] );
				expect( getMock ).toHaveBeenCalledWith( {
					action: 'query',
					list: 'wikilambdafn_search',
					format: 'json',
					wikilambdafn_zfunction_id: 'Z801',
					wikilambdafn_type: 'Z20',
					wikilambdafn_limit: 100
				} );
				expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z10001', 'Z10002' ] } );
			} );

			it( 'calls api.get for implementations and returns their zids', async () => {
				const functionZid = 'Z801';
				const zids = await store.fetchImplementations( functionZid );

				expect( zids ).toEqual( [ 'Z10001', 'Z10002' ] );
				expect( getMock ).toHaveBeenCalledWith( {
					action: 'query',
					list: 'wikilambdafn_search',
					format: 'json',
					wikilambdafn_zfunction_id: 'Z801',
					wikilambdafn_type: 'Z14',
					wikilambdafn_limit: 100
				} );
				expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z10001', 'Z10002' ] } );
			} );
		} );
	} );
} );
