/*!
 * WikiLambda unit test suite for the zFunction Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { setActivePinia, createPinia } = require( 'pinia' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { canonicalToHybrid } = require( '../../../../resources/ext.wikilambda.app/utils/schemata.js' );

describe( 'zFunction Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.jsonObject = { main: {} };
	} );

	describe( 'Getters', () => {
		describe( 'getZFunctionInputs', () => {
			it( 'returns empty list when when object is undefined', () => {
				const expected = [];
				expect( store.getZFunctionInputs ).toEqual( expected );
			} );

			it( 'returns empty list when args is malformed', () => {
				store.jsonObject.main = canonicalToHybrid( {
					Z2K2: { Z8K1: 'malformed' }
				} );
				const expected = [];
				expect( store.getZFunctionInputs ).toEqual( expected );
			} );

			it( 'returns empty array when no inputs', () => {
				store.jsonObject.main = canonicalToHybrid( {
					Z2K2: { Z8K1: [ 'Z17' ] }
				} );
				const inputs = store.getZFunctionInputs;
				expect( inputs ).toHaveLength( 0 );
			} );

			it( 'returns one function input row', () => {
				store.jsonObject.main = canonicalToHybrid( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const inputs = store.getZFunctionInputs;
				expect( inputs ).toHaveLength( 1 );
				expect( inputs[ 0 ].Z17K2 ).toEqual( { Z1K1: 'Z6', Z6K1: 'Z12345K1' } );
			} );

			it( 'returns two function input rows', () => {
				store.jsonObject.main = canonicalToHybrid( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const inputs = store.getZFunctionInputs;
				expect( inputs ).toHaveLength( 2 );
				expect( inputs[ 0 ].Z17K2 ).toEqual( { Z1K1: 'Z6', Z6K1: 'Z12345K1' } );
				expect( inputs[ 1 ].Z17K2 ).toEqual( { Z1K1: 'Z6', Z6K1: 'Z12345K2' } );
			} );
		} );

		describe( 'getZFunctionOutput', () => {
			it( 'returns undefined when object is undefined', () => {
				const expected = undefined;
				expect( store.getZFunctionOutput ).toEqual( expected );
			} );

			it( 'returns output type', () => {
				store.jsonObject.main = canonicalToHybrid( { Z2K2: { Z8K2: 'Z6' } } );
				const expected = { Z1K1: 'Z9', Z9K1: 'Z6' };
				expect( store.getZFunctionOutput ).toEqual( expected );
			} );
		} );

		describe( 'getConnectedTests and getConnectedImplementations', () => {
			beforeEach( () => {
				store.jsonObject.main = canonicalToHybrid( {
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
				expect( store.getConnectedTests ).toEqual( [ 'Z10002', 'Z10003' ] );
			} );

			it( 'return attached implementations', () => {
				expect( store.getConnectedImplementations ).toEqual( [ 'Z10004', 'Z10005' ] );
			} );

			it( 'returns empty array if test and implementations rows are not found', () => {
				store.jsonObject.main = canonicalToHybrid( {
					Z1K1: 'Z2',
					Z2K2: {
						Z1K1: 'Z8',
						Z8K1: [ 'Z17' ],
						Z8K2: 'Z6'
					}
				} );
				expect( store.getConnectedTests ).toEqual( [] );
				expect( store.getConnectedImplementations ).toEqual( [] );
			} );
		} );

		describe( 'getValidatedOutputFields', () => {
			it( 'returns one valid field when output is a valid reference', () => {
				// Set state
				const zobject = { Z2K2: { Z8K2: 'Z6' } };
				store.jsonObject = { main: canonicalToHybrid( zobject ) };

				const fields = store.getValidatedOutputFields;
				const expected = [
					{ keyPath: 'main.Z2K2.Z8K2', isValid: true }
				];

				expect( fields ).toEqual( expected );
			} );

			it( 'returns one invalid field when output is an empty reference', () => {
				// Set state
				const zobject = { Z2K2: { Z8K2: { Z1K1: 'Z9', Z9K1: '' } } };
				store.jsonObject = { main: canonicalToHybrid( zobject ) };

				const fields = store.getValidatedOutputFields;
				const expected = [
					{ keyPath: 'main.Z2K2.Z8K2', isValid: false }
				];

				expect( fields ).toEqual( expected );
			} );

			it( 'returns all valid fields when output is a valid function call', () => {
				// Set state
				const zobject = { Z2K2: {
					Z8K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z881',
						Z881K1: 'Z6'
					}
				} };
				store.jsonObject = { main: canonicalToHybrid( zobject ) };

				const fields = store.getValidatedOutputFields;
				const expected = [
					{ keyPath: 'main.Z2K2.Z8K2.Z7K1', isValid: true },
					{ keyPath: 'main.Z2K2.Z8K2.Z881K1', isValid: true }
				];
				expect( fields ).toEqual( expected );
			} );

			it( 'returns invalid field when output is an empty function call', () => {
				// Set state
				const zobject = { Z2K2: {
					Z8K2: {
						Z1K1: 'Z7',
						Z7K1: { Z1K1: 'Z9', Z9K1: '' }
					}
				} };
				store.jsonObject = { main: canonicalToHybrid( zobject ) };

				const fields = store.getValidatedOutputFields;
				const expected = [
					{ keyPath: 'main.Z2K2.Z8K2.Z7K1', isValid: false }
				];
				expect( fields ).toEqual( expected );
			} );

			it( 'returns invalid fields when output is function call with an empty arg', () => {
				// Set state
				const zobject = { Z2K2: {
					Z8K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z881',
						Z881K1: { Z1K1: 'Z9', Z9K1: '' }
					}
				} };
				store.jsonObject = { main: canonicalToHybrid( zobject ) };

				const fields = store.getValidatedOutputFields;
				const expected = [
					{ keyPath: 'main.Z2K2.Z8K2.Z7K1', isValid: true },
					{ keyPath: 'main.Z2K2.Z8K2.Z881K1', isValid: false }
				];
				expect( fields ).toEqual( expected );
			} );

			it( 'returns invalid fields when output is a nested function call with empty args', () => {
				// Set state
				const zobject = { Z2K2: {
					Z8K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z882',
						Z882K1: { Z1K1: 'Z9', Z9K1: '' },
						Z882K2: {
							Z1K1: 'Z7',
							Z7K1: 'Z881',
							Z881K1: { Z1K1: 'Z9', Z9K1: '' }
						}
					}
				} };
				store.jsonObject = { main: canonicalToHybrid( zobject ) };

				const fields = store.getValidatedOutputFields;
				const expected = [
					{ keyPath: 'main.Z2K2.Z8K2.Z7K1', isValid: true },
					{ keyPath: 'main.Z2K2.Z8K2.Z882K1', isValid: false },
					{ keyPath: 'main.Z2K2.Z8K2.Z882K2.Z7K1', isValid: true },
					{ keyPath: 'main.Z2K2.Z8K2.Z882K2.Z881K1', isValid: false }
				];
				expect( fields ).toEqual( expected );
			} );
		} );

		describe( 'getValidatedInputFields', () => {
			it( 'returns empty array when no inputs', () => {
				const zobject = { Z2K2: { Z8K1: [ 'Z17' ] } };
				store.jsonObject = { main: canonicalToHybrid( zobject ) };

				const fields = store.getValidatedInputFields;
				const expected = [];

				expect( fields ).toEqual( expected );
			} );

			it( 'returns all valid fields when all inputs have a type', () => {
				const zobject = { Z2K2: { Z8K1: [ 'Z17',
					{
						Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K1',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					},
					{
						Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K2',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ] }
					}
				] } };
				store.jsonObject = { main: canonicalToHybrid( zobject ) };

				const fields = store.getValidatedInputFields;
				const expected = [
					{ keyPath: 'main.Z2K2.Z8K1.1.Z17K1', isValid: true },
					{ keyPath: 'main.Z2K2.Z8K1.2.Z17K1', isValid: true }
				];

				expect( fields ).toEqual( expected );
			} );

			it( 'returns empty array when inputs have no type and no label', () => {
				const zobject = { Z2K2: { Z8K1: [ 'Z17',
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K1',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					},
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K2',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					}
				] } };
				store.jsonObject = { main: canonicalToHybrid( zobject ) };

				const fields = store.getValidatedInputFields;
				const expected = [];

				expect( fields ).toEqual( expected );
			} );

			it( 'returns one non valid input with empty type but non empty label', () => {
				const zobject = { Z2K2: { Z8K1: [ 'Z17',
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K1',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ] }
					},
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K2',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					}
				] } };
				store.jsonObject = { main: canonicalToHybrid( zobject ) };

				const fields = store.getValidatedInputFields;
				const expected = [
					{ keyPath: 'main.Z2K2.Z8K1.1.Z17K1', isValid: false }
				];

				expect( fields ).toEqual( expected );
			} );

			it( 'returns all non valid inputs with empty type but non empty label', () => {
				const zobject = { Z2K2: { Z8K1: [ 'Z17',
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K1',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'first' } ] }
					},
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K2',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'segunda' } ] }
					}
				] } };
				store.jsonObject = { main: canonicalToHybrid( zobject ) };

				const fields = store.getValidatedInputFields;
				const expected = [
					{ keyPath: 'main.Z2K2.Z8K1.1.Z17K1', isValid: false },
					{ keyPath: 'main.Z2K2.Z8K1.2.Z17K1', isValid: false }
				];

				expect( fields ).toEqual( expected );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'Connect and disconnect tests and implementations', () => {
			beforeEach( () => {
				store.setJsonObject = jest.fn();
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
				store.jsonObject.main = canonicalToHybrid( initialFunction );
				store.errors = {};
			} );

			describe( 'connect', () => {
				it( 'connects given tests', () => {
					store.connectTests( { zids: [ 'Z777', 'Z888' ] } );

					expect( store.submitZObject ).toHaveBeenCalledWith(
						{ summary: 'Added $1 to the approved list of test cases' }
					);
					expect( store.getJsonObject( 'main' ) ).toEqual( {
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
					store.connectImplementations( { zids: [ 'Z777', 'Z888' ] } );

					expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Added $1 to the approved list of implementations' } );
					expect( store.getJsonObject( 'main' ) ).toEqual( {
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
					store.disconnectTests( { zids: [ 'Z10002', 'Z10003' ] } );

					expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Removed $1 from the approved list of test cases' } );
					expect( store.getJsonObject( 'main' ) ).toEqual( {
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
					store.disconnectImplementations( { zids: [ 'Z10004', 'Z10005' ] } );

					expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Removed $1 from the approved list of implementations' } );
					expect( store.getJsonObject( 'main' ) ).toEqual( {
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

				let restorePayload;

				beforeEach( () => {
					const initialZObject = canonicalToHybrid( {
						Z1K1: 'Z2',
						Z2K2: {
							Z1K1: 'Z8',
							Z8K1: [ 'Z17' ],
							Z8K2: 'Z6',
							Z8K3: [ 'Z20' ],
							Z8K4: [ 'Z14' ]
						}
					} );
					store.submitZObject = jest.fn().mockRejectedValue( 'error' );
					store.jsonObject.main = initialZObject;
					restorePayload = {
						namespace: 'main',
						zobject: JSON.parse( JSON.stringify( initialZObject ) )
					};
				} );

				it( 'connectTests', async () => {
					try {
						await store.connectTests( { zids: [ 'Z777', 'Z888' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Added $1 to the approved list of test cases' } );
						expect( store.setJsonObject ).toHaveBeenCalledWith( restorePayload );
					}
				} );

				it( 'disconnectTests', async () => {
					try {
						await store.disconnectTests( { zids: [ 'Z111', 'Z333' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Removed $1 from the approved list of test cases' } );
						expect( store.setJsonObject ).toHaveBeenCalledWith( restorePayload );
					}
				} );

				it( 'connectImplementations', async () => {
					try {
						await store.connectImplementations( { zids: [ 'Z777', 'Z888' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Added $1 to the approved list of implementations' } );
						expect( store.updateStoredObject ).not.toHaveBeenCalled();
						expect( store.setJsonObject ).toHaveBeenCalledWith( restorePayload );
					}
				} );

				it( 'disconnectImplementations', async () => {
					try {
						await store.disconnectImplementations( { zids: [ 'Z444', 'Z666' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( store.submitZObject ).toHaveBeenCalledWith( { summary: 'Removed $1 from the approved list of implementations' } );
						expect( store.updateStoredObject ).not.toHaveBeenCalled();
						expect( store.setJsonObject ).toHaveBeenCalledWith( restorePayload );
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
					formatversion: '2',
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
					formatversion: '2',
					wikilambdafn_zfunction_id: 'Z801',
					wikilambdafn_type: 'Z14',
					wikilambdafn_limit: 100
				} );
				expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z10001', 'Z10002' ] } );
			} );
		} );
	} );
} );
