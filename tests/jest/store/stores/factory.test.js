/*!
 * WikiLambda unit test suite for the zobject Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../../fixtures/location.js' );
const { buildUrl } = require( '../../helpers/urlHelpers.js' );

describe( 'factory Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.errors = {};
		store.objects = {};
	} );

	afterEach( () => {
		restoreWindowLocation();
	} );

	describe( 'Getters', () => {
		describe( 'createObjectByType', () => {
			beforeEach( () => {
				Object.defineProperty( store, 'isCustomEnum', {
					value: jest.fn( ( zid ) => zid === 'Z30000' )
				} );
				Object.defineProperty( store, 'getUserLangZid', {
					value: 'Z1003'
				} );
				Object.defineProperty( store, 'getCurrentZObjectId', {
					value: 'Z0'
				} );
			} );

			describe( 'avoid infinite recursion with circular dependencies', () => {
				it( 'defaults to Z9/Reference when a type has an attribute of its own type', () => {
					const types = {
						Z10001: { Z2K2: { Z1K1: 'Z4', Z4K2: [ 'Z3', { Z1K1: 'Z3', Z3K1: 'Z10001', Z3K2: 'Z10001K1' } ] } }
					};
					Object.defineProperty( store, 'getStoredObject', {
						value: jest.fn( ( zid ) => types[ zid ] )
					} );

					const payload = { type: 'Z10001' };
					const expected = {
						Z1K1: 'Z10001',
						Z10001K1: { Z1K1: 'Z9', Z9K1: '' }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'defaults to Z9/Reference when a type has self references through different levels', () => {
					const types = {
						Z20001: { Z2K2: { Z1K1: 'Z4', Z4K2: [ 'Z3', { Z1K1: 'Z3', Z3K1: 'Z20002', Z3K2: 'Z20001K1' } ] } },
						Z20002: { Z2K2: { Z1K1: 'Z4', Z4K2: [ 'Z3', { Z1K1: 'Z3', Z3K1: 'Z20003', Z3K2: 'Z20002K1' } ] } },
						Z20003: { Z2K2: { Z1K1: 'Z4', Z4K2: [ 'Z3', { Z1K1: 'Z3', Z3K1: 'Z20002', Z3K2: 'Z20003K1' } ] } }
					};
					Object.defineProperty( store, 'getStoredObject', {
						value: jest.fn( ( zid ) => types[ zid ] )
					} );

					const payload = { type: 'Z20001' };
					const expected = {
						Z1K1: 'Z20001',
						Z20001K1: {
							Z1K1: 'Z20002',
							Z20002K1: {
								Z1K1: 'Z20003',
								Z20003K1: { Z1K1: 'Z9', Z9K1: '' }
							}
						}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'does not restrict type repetition when it happens across argument branches', () => {
					const types = {
						Z10001: { Z2K2: { Z1K1: 'Z4', Z4K2: [ 'Z3', { Z1K1: 'Z3', Z3K1: 'Z10001', Z3K2: 'Z10001K1' } ] } },
						Z20004: { Z2K2: { Z1K1: 'Z4', Z4K2: [ 'Z3',
							{ Z1K1: 'Z3', Z3K1: 'Z10001', Z3K2: 'Z20004K1' },
							{ Z1K1: 'Z3', Z3K1: 'Z10001', Z3K2: 'Z20004K2' },
							{ Z1K1: 'Z3', Z3K1: 'Z10001', Z3K2: 'Z20004K3' }
						] } }
					};
					Object.defineProperty( store, 'getStoredObject', {
						value: jest.fn( ( zid ) => types[ zid ] )
					} );

					const payload = { type: 'Z20004' };
					const expected = {
						Z1K1: 'Z20004',
						Z20004K1: { Z1K1: 'Z10001', Z10001K1: { Z1K1: 'Z9', Z9K1: '' } },
						Z20004K2: { Z1K1: 'Z10001', Z10001K1: { Z1K1: 'Z9', Z9K1: '' } },
						Z20004K3: { Z1K1: 'Z10001', Z10001K1: { Z1K1: 'Z9', Z9K1: '' } }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZPersistentObject', () => {
				it( 'creates a blank persistent object with first label in userlang', () => {
					const payload = { type: Constants.Z_PERSISTENTOBJECT };
					const expected = {
						Z1K1: 'Z2',
						Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
						Z2K2: { Z1K1: { Z1K1: 'Z9', Z9K1: '' } },
						Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' }, Z11K2: '' }
						] },
						Z2K4: { Z1K1: 'Z32', Z32K1: [ 'Z31' ] },
						Z2K5: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank persistent object with no label when userlang undefined', () => {
					Object.defineProperty( store, 'getUserLangZid', {
						value: undefined
					} );
					const payload = { type: Constants.Z_PERSISTENTOBJECT };
					const expected = {
						Z1K1: 'Z2',
						Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
						Z2K2: { Z1K1: { Z1K1: 'Z9', Z9K1: '' } },
						Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
						Z2K4: { Z1K1: 'Z32', Z32K1: [ 'Z31' ] },
						Z2K5: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZMonolingualString', () => {
				it( 'creates a blank monolingual string object', () => {
					const payload = { type: Constants.Z_MONOLINGUALSTRING };
					const expected = {
						Z1K1: 'Z11',
						Z11K1: { Z1K1: 'Z9', Z9K1: '' },
						Z11K2: ''
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank monolingual string object with initial values', () => {
					const payload = {
						type: Constants.Z_MONOLINGUALSTRING,
						lang: 'Z1004',
						value: 'test label'
					};
					const expected = {
						Z1K1: 'Z11',
						Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
						Z11K2: 'test label'
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZMultilingualString', () => {
				it( 'creates a blank multilingual string object', () => {
					const payload = { type: Constants.Z_MULTILINGUALSTRING };
					const expected = {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ]
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank multilingual string object with empty monolingual', () => {
					const payload = {
						type: Constants.Z_MULTILINGUALSTRING,
						value: ''
					};
					const expected = {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11', {
							Z1K1: 'Z11',
							Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' },
							Z11K2: ''
						} ]
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank multilingual string object with initial values', () => {
					const payload = {
						type: Constants.Z_MULTILINGUALSTRING,
						lang: 'Z1004',
						value: 'test label'
					};
					const expected = {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11', {
							Z1K1: 'Z11',
							Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
							Z11K2: 'test label'
						} ]
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZMonolingualStringSet', () => {
				it( 'creates a blank monolingual stringset object', () => {
					const payload = { type: Constants.Z_MONOLINGUALSTRINGSET };
					const expected = {
						Z1K1: 'Z31',
						Z31K1: { Z1K1: 'Z9', Z9K1: '' },
						Z31K2: [ 'Z6' ]
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank monolingual stringset object with initial value', () => {
					const payload = {
						type: Constants.Z_MONOLINGUALSTRINGSET,
						lang: 'Z1004',
						value: [ 'test alias' ]
					};
					const expected = {
						Z1K1: 'Z31',
						Z31K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
						Z31K2: [ 'Z6', 'test alias' ]
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank monolingual stringset object with two initial values', () => {
					const payload = {
						type: Constants.Z_MONOLINGUALSTRINGSET,
						lang: 'Z1004',
						value: [ 'one', 'two' ]
					};
					const expected = {
						Z1K1: 'Z31',
						Z31K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
						Z31K2: [ 'Z6', 'one', 'two' ]
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZString', () => {
				it( 'creates a valid empty string', () => {
					const payload = { type: Constants.Z_STRING };
					const expected = '';

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a valid string with initial value', () => {
					const payload = { type: Constants.Z_STRING, value: 'Hello world' };
					const expected = 'Hello world';

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZReference', () => {
				it( 'creates a blank reference', () => {
					const payload = { type: Constants.Z_REFERENCE };
					const expected = { Z1K1: 'Z9', Z9K1: '' };

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a valid reference with initial value', () => {
					const payload = { type: Constants.Z_REFERENCE, value: 'Z1' };
					const expected = { Z1K1: 'Z9', Z9K1: 'Z1' };

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZWikidataEnum', () => {
				const enumType = 'Z10004';

				beforeEach( () => {
					Object.defineProperty( store, 'isWikidataEnum', {
						value: jest.fn( () => true )
					} );
					Object.defineProperty( store, 'getTypeOfWikidataEnum', {
						value: jest.fn( () => 'Z6095' )
					} );
				} );

				it( 'creates a wikidata enum instance', () => {
					const payload = { type: enumType };
					const expected = {
						Z1K1: 'Z10004',
						Z10004K1: {
							Z1K1: 'Z6095',
							Z6095K1: ''
						}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a wikidata enum instance with an initial value', () => {
					const payload = { type: enumType, value: 'L12345' };
					const expected = {
						Z1K1: 'Z10004',
						Z10004K1: {
							Z1K1: 'Z6095',
							Z6095K1: 'L12345'
						}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZBoolean', () => {
				it( 'creates a blank boolean object', () => {
					const payload = { type: Constants.Z_BOOLEAN };
					const expected = {
						Z1K1: 'Z40',
						Z40K1: { Z1K1: 'Z9', Z9K1: '' }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a boolean object with initial value', () => {
					const payload = { type: Constants.Z_BOOLEAN, value: Constants.Z_BOOLEAN_FALSE };
					const expected = {
						Z1K1: 'Z40',
						Z40K1: { Z1K1: 'Z9', Z9K1: 'Z42' }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZType', () => {
				it( 'creates a reference by default', () => {
					const payload = { type: Constants.Z_TYPE };
					const expected = { Z1K1: 'Z9', Z9K1: '' };

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank type object if explicitly requested literal', () => {
					const payload = { type: Constants.Z_TYPE, literal: true };
					const expected = {
						Z1K1: 'Z4',
						Z4K1: { Z1K1: 'Z9', Z9K1: 'Z0' },
						Z4K2: [ 'Z3' ],
						Z4K3: { Z1K1: 'Z9', Z9K1: 'Z101' },
						Z4K4: { Z1K1: 'Z9', Z9K1: '' },
						Z4K5: { Z1K1: 'Z9', Z9K1: '' },
						Z4K6: { Z1K1: 'Z9', Z9K1: '' },
						Z4K7: [ 'Z46' ],
						Z4K8: [ 'Z64' ]
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZArgument', () => {
				it( 'creates a blank argument object', () => {
					const payload = { type: Constants.Z_ARGUMENT };
					const expected = {
						Z1K1: 'Z17',
						Z17K1: { Z1K1: 'Z9', Z9K1: '' },
						Z17K2: 'Z0K1',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates an argument with initialized argument key', () => {
					const payload = { type: Constants.Z_ARGUMENT, value: 'Z400K2' };
					const expected = {
						Z1K1: 'Z17',
						Z17K1: { Z1K1: 'Z9', Z9K1: '' },
						Z17K2: 'Z400K2',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZFunctionCall', () => {
				it( 'creates a blank function call object', () => {
					const payload = { type: Constants.Z_FUNCTION_CALL };
					const expected = {
						Z1K1: 'Z7',
						Z7K1: { Z1K1: 'Z9', Z9K1: '' }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a function call object with initial function zid value', () => {
					const payload = { type: Constants.Z_FUNCTION_CALL, value: 'Z10001' };
					const expected = {
						Z1K1: 'Z7',
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10001' }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZImplementation', () => {
				it( 'creates a blank reference by default', () => {
					const payload = { type: Constants.Z_IMPLEMENTATION };
					const expected = { Z1K1: 'Z9', Z9K1: '' };

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank implementation object if explicitly requested literal', () => {
					const payload = { type: Constants.Z_IMPLEMENTATION, literal: true };
					const expected = {
						Z1K1: 'Z14',
						Z14K1: { Z1K1: 'Z9', Z9K1: '' },
						Z14K2: { Z1K1: 'Z7', Z7K1: { Z1K1: 'Z9', Z9K1: '' } }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank implementation object with preset function zid if provided in the url', () => {
					mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, {
						title: Constants.PATHS.CREATE_OBJECT_TITLE,
						zid: Constants.Z_IMPLEMENTATION,
						[ Constants.Z_IMPLEMENTATION_FUNCTION ]: 'Z10001'
					} ) );

					const payload = {
						type: Constants.Z_IMPLEMENTATION,
						literal: true
					};
					const expected = {
						Z1K1: 'Z14',
						Z14K1: { Z1K1: 'Z9', Z9K1: 'Z10001' },
						Z14K2: { Z1K1: 'Z7', Z7K1: { Z1K1: 'Z9', Z9K1: '' } }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZCode', () => {
				it( 'creates a blank code object', () => {
					const payload = { type: Constants.Z_CODE };
					const expected = {
						Z1K1: 'Z16',
						Z16K1: { Z1K1: 'Z9', Z9K1: '' },
						Z16K2: ''
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZFunction', () => {
				it( 'creates a blank reference by default', () => {
					const payload = { type: Constants.Z_FUNCTION };
					const expected = { Z1K1: 'Z9', Z9K1: '' };

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank function object if explicitly requested literal', () => {
					const payload = { type: Constants.Z_FUNCTION, literal: true };
					const expected = {
						Z1K1: 'Z8',
						Z8K1: [ 'Z17', {
							Z1K1: 'Z17',
							Z17K1: { Z1K1: 'Z9', Z9K1: '' },
							Z17K2: 'Z0K1',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						} ],
						Z8K2: { Z1K1: 'Z9', Z9K1: '' },
						Z8K3: [ 'Z20' ],
						Z8K4: [ 'Z14' ],
						Z8K5: { Z1K1: 'Z9', Z9K1: 'Z0' }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank function object with set zid', () => {
					Object.defineProperty( store, 'getCurrentZObjectId', {
						value: 'Z10000'
					} );

					const payload = { type: Constants.Z_FUNCTION, literal: true };
					const expected = {
						Z1K1: 'Z8',
						Z8K1: [ 'Z17', {
							Z1K1: 'Z17',
							Z17K1: { Z1K1: 'Z9', Z9K1: '' },
							Z17K2: 'Z10000K1',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						} ],
						Z8K2: { Z1K1: 'Z9', Z9K1: '' },
						Z8K3: [ 'Z20' ],
						Z8K4: [ 'Z14' ],
						Z8K5: { Z1K1: 'Z9', Z9K1: 'Z10000' }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZTester', () => {
				it( 'creates a blank reference by default', () => {
					const payload = { type: Constants.Z_TESTER };
					const expected = { Z1K1: 'Z9', Z9K1: '' };

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank tester object if explicitly requested literal', () => {
					const payload = { type: Constants.Z_TESTER, literal: true };
					const expected = {
						Z1K1: 'Z20',
						Z20K1: { Z1K1: 'Z9', Z9K1: '' },
						Z20K2: { Z1K1: 'Z7', Z7K1: { Z1K1: 'Z9', Z9K1: '' } },
						Z20K3: { Z1K1: 'Z7', Z7K1: { Z1K1: 'Z9', Z9K1: '' } }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank tester object with preset function zid if provided in the url', () => {
					mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, {
						title: Constants.PATHS.CREATE_OBJECT_TITLE,
						zid: Constants.Z_TESTER,
						[ Constants.Z_TESTER_FUNCTION ]: 'Z10001'
					} ) );

					const payload = {
						type: Constants.Z_TESTER,
						literal: true
					};
					const expected = {
						Z1K1: 'Z20',
						Z20K1: { Z1K1: 'Z9', Z9K1: 'Z10001' },
						Z20K2: { Z1K1: 'Z7', Z7K1: { Z1K1: 'Z9', Z9K1: '' } },
						Z20K3: { Z1K1: 'Z7', Z7K1: { Z1K1: 'Z9', Z9K1: '' } }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZTypedList', () => {
				it( 'creates a blank typed list', () => {
					const payload = { type: Constants.Z_TYPED_LIST };
					const expected = [
						{ Z1K1: 'Z9', Z9K1: 'Z1' }
					];

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank typed list of a given type', () => {
					const payload = { type: Constants.Z_TYPED_LIST, value: 'Z11' };
					const expected = [
						{ Z1K1: 'Z9', Z9K1: 'Z11' }
					];

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank typed list with generic type definition input', () => {
					const payload = {
						type: {
							Z1K1: 'Z7',
							Z7K1: 'Z881',
							Z881K1: 'Z11'
						}
					};
					const expected = [
						{ Z1K1: 'Z9', Z9K1: 'Z11' }
					];

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZTypedPair', () => {
				it( 'creates a blank typed pair', () => {
					const payload = { type: Constants.Z_TYPED_PAIR };
					const expected = {
						Z1K1: {
							Z1K1: 'Z7',
							Z7K1: 'Z882',
							Z882K1: { Z1K1: 'Z9', Z9K1: '' },
							Z882K2: { Z1K1: 'Z9', Z9K1: '' }
						},
						K1: {},
						K2: {}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank typed pair with initial types', () => {
					const payload = { type: Constants.Z_TYPED_PAIR, values: [ 'Z6', 'Z11' ] };
					const expected = {
						Z1K1: {
							Z1K1: 'Z7',
							Z7K1: 'Z882',
							Z882K1: { Z1K1: 'Z9', Z9K1: 'Z6' },
							Z882K2: { Z1K1: 'Z9', Z9K1: 'Z11' }
						},
						K1: '',
						K2: { Z1K1: 'Z11', Z11K1: { Z1K1: 'Z9', Z9K1: '' }, Z11K2: '' }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createZTypedMap', () => {
				it( 'creates a blank typed map', () => {
					const payload = { type: Constants.Z_TYPED_MAP };
					const expected = {
						Z1K1: {
							Z1K1: 'Z7',
							Z7K1: 'Z883',
							Z883K1: { Z1K1: 'Z9', Z9K1: '' },
							Z883K2: { Z1K1: 'Z9', Z9K1: '' }
						}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a typed map with initial types', () => {
					const payload = { type: Constants.Z_TYPED_MAP, values: [ 'Z6', 'Z1' ] };
					const expected = {
						Z1K1: {
							Z1K1: 'Z7',
							Z7K1: 'Z883',
							Z883K1: { Z1K1: 'Z9', Z9K1: 'Z6' },
							Z883K2: { Z1K1: 'Z9', Z9K1: 'Z1' }
						}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createWikidataEntity', () => {
				it( 'creates a blank wikidata item represented as a fetch function call', () => {
					const payload = { type: Constants.Z_WIKIDATA_ITEM };
					const expected = {
						Z1K1: 'Z7',
						Z7K1: 'Z6821',
						Z6821K1: {
							Z1K1: 'Z6091',
							Z6091K1: ''
						}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank wikidata lexeme represented as a fetch function call', () => {
					const payload = { type: Constants.Z_WIKIDATA_LEXEME };
					const expected = {
						Z1K1: 'Z7',
						Z7K1: 'Z6825',
						Z6825K1: {
							Z1K1: 'Z6095',
							Z6095K1: ''
						}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank wikidata lexeme form represented as a fetch function call', () => {
					const payload = { type: Constants.Z_WIKIDATA_LEXEME_FORM };
					const expected = {
						Z1K1: 'Z7',
						Z7K1: 'Z6824',
						Z6824K1: {
							Z1K1: 'Z6094',
							Z6094K1: ''
						}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank wikidata property represented as a fetch function call', () => {
					const payload = { type: Constants.Z_WIKIDATA_PROPERTY };
					const expected = {
						Z1K1: 'Z7',
						Z7K1: 'Z6822',
						Z6822K1: {
							Z1K1: 'Z6092',
							Z6092K1: ''
						}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a wikidata item represented as a fetch function call with an initialization value', () => {
					const payload = { type: Constants.Z_WIKIDATA_ITEM, value: 'Q42' };
					const expected = {
						Z1K1: 'Z7',
						Z7K1: 'Z6821',
						Z6821K1: {
							Z1K1: 'Z6091',
							Z6091K1: 'Q42'
						}
					};
					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createWikidataReference', () => {
				it( 'creates a blank Wikidata item reference', () => {
					const payload = { type: Constants.Z_WIKIDATA_REFERENCE_ITEM };
					const expected = {
						Z1K1: Constants.Z_WIKIDATA_REFERENCE_ITEM,
						Z6091K1: ''
					};
					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank Wikidata lexeme reference', () => {
					const payload = { type: Constants.Z_WIKIDATA_REFERENCE_LEXEME };
					const expected = {
						Z1K1: Constants.Z_WIKIDATA_REFERENCE_LEXEME,
						Z6095K1: ''
					};
					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank Wikidata lexeme form reference', () => {
					const payload = { type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM };
					const expected = {
						Z1K1: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM,
						Z6094K1: ''
					};
					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a blank Wikidata property reference', () => {
					const payload = { type: Constants.Z_WIKIDATA_REFERENCE_PROPERTY };
					const expected = {
						Z1K1: Constants.Z_WIKIDATA_REFERENCE_PROPERTY,
						Z6092K1: ''
					};
					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a Wikidata item reference with an initialization value', () => {
					const payload = { type: Constants.Z_WIKIDATA_REFERENCE_ITEM, value: 'Q42' };
					const expected = {
						Z1K1: Constants.Z_WIKIDATA_REFERENCE_ITEM,
						Z6091K1: 'Q42'
					};
					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'createGenericObject', () => {
				it( 'creates a valid object of a type defined by a function call', () => {
					const payload = { type: { Z1K1: 'Z7', Z7K1: 'Z10001', Z10001K1: 'Z6' } };
					const expected = {
						Z1K1: {
							Z1K1: 'Z7',
							Z7K1: 'Z10001',
							Z10001K1: 'Z6'
						}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a valid ZTypedPair with empty values', () => {
					const payload = { type: { Z1K1: 'Z7', Z7K1: 'Z882', Z882K1: 'Z6', Z882K2: 'Z6' } };
					const expected = {
						Z1K1: {
							Z1K1: 'Z7',
							Z7K1: 'Z882',
							Z882K1: 'Z6',
							Z882K2: 'Z6'
						}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a valid ZTypedMap with empty values', () => {
					const payload = { type: { Z1K1: 'Z7', Z7K1: 'Z883', Z883K1: 'Z6', Z883K2: 'Z6' } };
					const expected = {
						Z1K1: {
							Z1K1: 'Z7',
							Z7K1: 'Z883',
							Z883K1: 'Z6',
							Z883K2: 'Z6'
						}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a valid object of known type', () => {
					const types = {
						Z3: { Z2K2: { Z1K1: 'Z4', Z4K2: [ 'Z3',
							{ Z1K1: 'Z3', Z3K1: 'Z4', Z3K2: 'Z3K1' },
							{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z3K2' },
							{ Z1K1: 'Z3', Z3K1: 'Z12', Z3K2: 'Z3K3' },
							{ Z1K1: 'Z3', Z3K1: 'Z40', Z3K2: 'Z3K4' }
						] } }
					};
					Object.defineProperty( store, 'getStoredObject', {
						value: jest.fn( ( zid ) => types[ zid ] )
					} );

					const payload = { type: Constants.Z_KEY };
					const expected = {
						Z1K1: 'Z3',
						Z3K1: { Z1K1: 'Z9', Z9K1: '' },
						Z3K2: '',
						Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
						Z3K4: { Z1K1: 'Z40', Z40K1: { Z1K1: 'Z9', Z9K1: '' } }
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a valid object of known type with typed lists', () => {
					const types = {
						Z32: { Z2K2: { Z1K1: 'Z4', Z4K2: [ 'Z3',
							{ Z1K1: 'Z3', Z3K1: { Z1K1: 'Z7', Z7K1: 'Z881', Z881K1: 'Z31' }, Z3K2: 'Z32K1' }
						] } }
					};
					Object.defineProperty( store, 'getStoredObject', {
						value: jest.fn( ( zid ) => types[ zid ] )
					} );

					const payload = { type: Constants.Z_MULTILINGUALSTRINGSET };
					const expected = {
						Z1K1: 'Z32',
						Z32K1: [ { Z1K1: 'Z9', Z9K1: 'Z31' } ]
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a valid object of an unknown type', () => {
					const payload = { type: 'Z10000' };
					const expected = {
						Z1K1: 'Z10000'
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );

			describe( 'custom enumerations', () => {
				beforeEach( () => {
					const types = {
						Z30000: { Z2K2: { Z1K1: 'Z4', Z4K2: [ 'Z3', { Z1K1: 'Z3', Z3K1: 'Z30000', Z3K2: 'Z30000K1' } ] } }
					};
					Object.defineProperty( store, 'getStoredObject', {
						value: jest.fn( ( zid ) => types[ zid ] )
					} );
					Object.defineProperty( store, 'isCustomEnum', {
						value: jest.fn( () => true )
					} );
				} );

				it( 'creates a reference when type is a custom enumeration', () => {
					const payload = { type: 'Z30000' };
					const expected = { Z1K1: 'Z9', Z9K1: '' };

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'creates a literal when type is a custom enumeration and explicitly requested', () => {
					const payload = { type: 'Z30000', literal: true };
					const expected = {
						Z1K1: 'Z30000',
						Z30000K1: {
							Z1K1: 'Z9',
							Z9K1: ''
						}
					};

					const result = store.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );
		} );
	} );
} );
