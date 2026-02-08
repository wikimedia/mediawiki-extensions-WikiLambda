/*!
 * WikiLambda unit test suite for the zobject Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { setActivePinia, createPinia } = require( 'pinia' );
const { mockStoredObjects } = require( '../../fixtures/mocks.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../../fixtures/location.js' );
const { buildUrl } = require( '../../helpers/urlHelpers.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { canonicalToHybrid, hybridToCanonical } = require( '../../../../resources/ext.wikilambda.app/utils/schemata.js' );

describe( 'zobject Pinia store', () => {

	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.jsonObject = { main: {} };
	} );

	describe( 'Getters', () => {
		describe( 'getJsonObject', () => {
			it( 'returns undefined with unknown namespace', () => {
				store.jsonObject.main = 'value';
				expect( store.getJsonObject( 'call' ) ).toBe( undefined );
			} );

			it( 'returns the stored value under the given namespace', () => {
				store.jsonObject.main = 'value';
				expect( store.getJsonObject( 'main' ) ).toBe( 'value' );
			} );

			it( 'returns reference to the stored object', () => {
				const zobject = {
					Z1K1: 'Z6',
					Z6K1: 'initial value'
				};
				store.jsonObject.main = zobject;

				const stored = store.getJsonObject( 'main' );
				stored.Z6K1 = 'updated value';

				expect( zobject ).toEqual( { Z1K1: 'Z6', Z6K1: 'updated value' } );
				expect( store.getJsonObject( 'main' ) ).toEqual( { Z1K1: 'Z6', Z6K1: 'updated value' } );
			} );
		} );

		describe( 'getZObjectByKeyPath', () => {
			it( 'returns undefined with an empty key path', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z6',
						Z6K1: 'terminal value'
					}
				};
				store.jsonObject.main = zobject;

				const keyPath = [];
				const stored = store.getZObjectByKeyPath( keyPath );

				expect( stored ).toBe( undefined );
			} );

			it( 'returns undefined if key path is not found', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z6',
						Z6K1: 'terminal value'
					}
				};
				store.jsonObject.main = zobject;

				const keyPath = [ 'main', 'Z2K3', 'Z12K1' ];
				const stored = store.getZObjectByKeyPath( keyPath );

				expect( stored ).toBe( undefined );
			} );

			it( 'returns the terminal value by its key path', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z6',
						Z6K1: 'terminal value'
					}
				};
				store.jsonObject.main = zobject;

				const keyPath = [ 'main', 'Z2K2', 'Z6K1' ];
				const stored = store.getZObjectByKeyPath( keyPath );

				expect( stored ).toBe( 'terminal value' );
			} );

			it( 'returns the non terminal object by its key path', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z6',
						Z6K1: 'terminal value'
					}
				};
				store.jsonObject.main = zobject;

				const keyPath = [ 'main', 'Z2K2' ];
				const stored = store.getZObjectByKeyPath( keyPath );

				expect( stored ).toEqual( { Z1K1: 'Z6', Z6K1: 'terminal value' } );
			} );

			it( 'returns the non terminal object by reference', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z6',
						Z6K1: 'initial value'
					}
				};
				store.jsonObject.main = zobject;

				const keyPath = [ 'main', 'Z2K2' ];
				const stored = store.getZObjectByKeyPath( keyPath );

				// Mutate a key
				stored.Z6K1 = 'updated value';

				expect( stored ).toEqual( { Z1K1: 'Z6', Z6K1: 'updated value' } );
				expect( store.jsonObject.main ).toEqual( { Z2K2: { Z1K1: 'Z6', Z6K1: 'updated value' } } );
			} );
		} );

		describe( 'getCurrentZObjectType', () => {
			it( 'returns undefined if no object is set on main namespace', () => {
				expect( store.getCurrentZObjectType ).toBe( undefined );
			} );

			it( 'returns the type of the inner object in the main namespace (simple)', () => {
				store.jsonObject.main = {
					Z2K2: {
						Z1K1: 'Z6',
						Z6K1: 'initial value'
					}
				};

				expect( store.getCurrentZObjectType ).toBe( 'Z6' );
			} );

			it( 'returns the type of the inner object in the main namespace (typed list)', () => {
				store.jsonObject.main = {
					Z2K2: [ 'Z6' ]
				};

				const expected = {
					Z1K1: 'Z7',
					Z7K1: 'Z881',
					Z881K1: 'Z6'
				};

				expect( store.getCurrentZObjectType ).toEqual( expected );
			} );
		} );

		describe( 'getCurrentTargetFunctionZid', () => {
			it( 'returns undefined if no object is set in the main space', () => {
				expect( store.getCurrentTargetFunctionZid ).toBe( undefined );
			} );

			it( 'returns undefined if the object in main space is not a tester or an implementation', () => {
				store.jsonObject.main = {
					Z2K2: {
						Z1K1: 'Z6',
						Z6K1: 'initial value'
					}
				};

				expect( store.getCurrentTargetFunctionZid ).toBe( undefined );
			} );

			it( 'returns empty string if tester function is not set', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z20',
						Z20K1: { Z1K1: 'Z9', Z9K1: '' }
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const expected = '';

				expect( store.getCurrentTargetFunctionZid ).toBe( expected );
			} );

			it( 'returns empty string if implementation function is not set', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z14',
						Z14K1: { Z1K1: 'Z9', Z9K1: '' }
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const expected = '';

				expect( store.getCurrentTargetFunctionZid ).toBe( expected );
			} );

			it( 'returns the reference of a tester target function', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z20',
						Z20K1: 'Z10001'
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const expected = 'Z10001';

				expect( store.getCurrentTargetFunctionZid ).toBe( expected );
			} );

			it( 'returns the reference of an implementation target function', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z14',
						Z14K1: 'Z10002'
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const expected = 'Z10002';

				expect( store.getCurrentTargetFunctionZid ).toBe( expected );
			} );
		} );

		describe( 'getCurrentZImplementationType', () => {
			it( 'returns undefined if no object is set in the main space', () => {
				expect( store.getCurrentZImplementationType ).toBe( undefined );
			} );

			it( 'returns undefined if the object in main space is not an implementation', () => {
				store.jsonObject.main = {
					Z2K2: {
						Z1K1: 'Z6',
						Z6K1: 'initial value'
					}
				};

				expect( store.getCurrentZImplementationType ).toBe( undefined );
			} );

			it( 'returns undefined if implementation does not have a type set', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z14',
						Z14K1: 'Z10002'
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );

				expect( store.getCurrentZImplementationType ).toBe( undefined );
			} );

			it( 'returns composition key', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z14',
						Z14K1: 'Z10002',
						Z14K2: 'some composition'
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const expected = 'Z14K2';

				expect( store.getCurrentZImplementationType ).toBe( expected );
			} );

			it( 'returns code key', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z14',
						Z14K1: 'Z10002',
						Z14K3: 'some code'
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const expected = 'Z14K3';

				expect( store.getCurrentZImplementationType ).toBe( expected );
			} );

			it( 'returns builtin key', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z14',
						Z14K1: 'Z10002',
						Z14K4: 'some builtin'
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const expected = 'Z14K4';

				expect( store.getCurrentZImplementationType ).toBe( expected );
			} );
		} );

		describe( 'getParentListCount', () => {
			it( 'returns undefined if no object is set in the main space', () => {
				const keyPath = [ 'main', 'Z2K2' ];
				expect( store.getParentListCount( keyPath ) ).toBe( undefined );
			} );

			it( 'returns undefined if key path has no elements', () => {
				const zobject = {
					Z2K2: [ 'Z6', 'cave', 'water', 'hurricane' ]
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const keyPath = [];

				expect( store.getParentListCount( keyPath ) ).toBe( undefined );
			} );

			it( 'returns number of key path takes to a non-list', () => {
				const zobject = {
					Z2K2: { Z1K1: 'Z6', Z6K1: 'terminal value' }
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const keyPath = [ 'main', 'Z2K2', 'Z6K1' ];

				expect( store.getParentListCount( keyPath ) ).toBe( undefined );
			} );

			it( 'returns number of items in the parent list given the key path of a list item', () => {
				const zobject = {
					Z2K2: [ 'Z6', 'cave', 'water', 'hurricane' ]
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const keyPath = [ 'main', 'Z2K2', 2 ];

				expect( store.getParentListCount( keyPath ) ).toBe( 3 );
			} );
		} );

		describe( 'getMultilingualDataLanguages', () => {
			it( 'returns empty arrays when there is no metadata', () => {
				const expected = {
					name: [],
					description: [],
					aliases: [],
					inputs: [],
					all: []
				};

				const current = store.getMultilingualDataLanguages;
				expect( current ).toEqual( expected );
			} );

			it( 'returns available languages with missing descriptions and aliases', () => {
				const zobject = {
					Z2K2: 'not a function',
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'name one' },
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'name two' }
						]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );

				const expected = {
					name: [ 'Z1002', 'Z1003' ],
					description: [],
					aliases: [],
					inputs: [],
					all: [ 'Z1002', 'Z1003' ]
				};

				const current = store.getMultilingualDataLanguages;
				expect( current ).toEqual( expected );
			} );

			it( 'returns all available languages in the multilingual data for a non-function', () => {
				const zobject = {
					Z2K2: 'not a function',
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'name one' },
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'name two' }
						]
					},
					Z2K4: {
						Z1K1: 'Z32',
						Z32K1: [ 'Z31',
							{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'alias one' ] },
							{ Z1K1: 'Z31', Z31K1: 'Z1004', Z31K2: [ 'Z6', 'alias two' ] },
							{ Z1K1: 'Z31', Z31K1: 'Z1005', Z31K2: [ 'Z6', 'alias three' ] }
						]
					},
					Z2K5: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'description one' },
							{ Z1K1: 'Z11', Z11K1: 'Z1006', Z11K2: 'description two' },
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'repeated lang' }
						]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );

				const expected = {
					name: [ 'Z1002', 'Z1003' ],
					description: [ 'Z1003', 'Z1006' ],
					aliases: [ 'Z1002', 'Z1004', 'Z1005' ],
					inputs: [],
					all: [ 'Z1002', 'Z1003', 'Z1006', 'Z1004', 'Z1005' ]
				};

				const current = store.getMultilingualDataLanguages;
				expect( current ).toEqual( expected );
			} );

			it( 'returns all available languages in the multilingual data for a function', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z8',
						Z8K1: [ 'Z17', {
							Z1K1: 'Z17',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' },
								{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'input uno' }
							] }
						}, {
							Z1K1: 'Z17',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input two' },
								{ Z1K1: 'Z11', Z11K1: 'Z1005', Z11K2: 'input dos' },
								{ Z1K1: 'Z11', Z11K1: 'Z1005', Z11K2: 'repeated' }
							] }
						} ]
					},
					Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'function name' }
					] }
				};
				store.jsonObject.main = canonicalToHybrid( zobject );

				const expected = {
					name: [ 'Z1002' ],
					description: [],
					aliases: [],
					inputs: [ [ 'Z1002', 'Z1003' ], [ 'Z1002', 'Z1005' ] ],
					all: [ 'Z1002', 'Z1003', 'Z1005' ]
				};

				const current = store.getMultilingualDataLanguages;
				expect( current ).toEqual( expected );
			} );
		} );

		describe( 'getZPersistentName', () => {
			it( 'returns name row in the given language if available', () => {
				const zobject = {
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' },
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'en español' }
						]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );

				const langZid = 'Z1003';
				const expected = {
					keyPath: 'main.Z2K3.Z12K1.2.Z11K2.Z6K1',
					value: 'en español'
				};
				const metadata = store.getZPersistentName( langZid );
				expect( metadata ).toEqual( expected );
			} );

			it( 'returns undefined if the given language is not available', () => {
				const zobject = {
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' }
						]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const langZid = 'Z1003';
				const expected = undefined;
				const metadata = store.getZPersistentName( langZid );
				expect( metadata ).toEqual( expected );
			} );
		} );

		describe( 'getZPersistentDescription', () => {
			it( 'returns description row in the given language if available', () => {
				const zobject = {
					Z2K5: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' },
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'en español' }
						]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const langZid = 'Z1003';
				const expected = {
					keyPath: 'main.Z2K5.Z12K1.2.Z11K2.Z6K1',
					value: 'en español'
				};
				const metadata = store.getZPersistentDescription( langZid );
				expect( metadata ).toEqual( expected );
			} );

			it( 'returns undefined if the given language is not available', () => {
				const zobject = {
					Z2K5: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' }
						]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const langZid = 'Z1003';
				const expected = undefined;
				const metadata = store.getZPersistentDescription( langZid );
				expect( metadata ).toEqual( expected );
			} );
		} );

		describe( 'getZPersistentAlias', () => {
			it( 'returns alias row in the given language if available', () => {
				const zobject = {
					Z2K4: {
						Z1K1: 'Z32',
						Z32K1: [ 'Z31',
							{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'in', 'english' ] },
							{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6', 'en', 'español' ] }
						]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const langZid = 'Z1003';
				const expected = {
					keyPath: 'main.Z2K4.Z32K1.2.Z31K2',
					value: [ 'en', 'español' ]
				};
				const metadata = store.getZPersistentAlias( langZid );
				expect( metadata ).toEqual( expected );
			} );

			it( 'returns undefined if the given language is not available', () => {
				const zobject = {
					Z2K4: {
						Z1K1: 'Z32',
						Z32K1: [ 'Z31',
							{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'in', 'english' ] }
						]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				const langZid = 'Z1003';
				const expected = undefined;
				const metadata = store.getZPersistentAlias( langZid );
				expect( metadata ).toEqual( expected );
			} );
		} );

		describe( 'getNextKey', () => {
			beforeEach( () => {
				Object.defineProperty( store, 'getCurrentZObjectId', {
					value: 'Z0'
				} );
			} );

			it( 'Returns first ID for argument', () => {
				const zobject = {
					Z1K1: 'Z8',
					Z8K1: [ 'Z17' ]
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				expect( store.getNextKey ).toEqual( 'Z0K1' );
			} );

			it( 'Returns second ID for argument', () => {
				const zobject = {
					Z1K1: 'Z8',
					Z8K1: [ 'Z17', {
						Z1K1: 'Z17',
						Z17K1: 'Z6',
						Z17K2: 'Z0K1'
					} ]
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
				expect( store.getNextKey ).toEqual( 'Z0K2' );
			} );
		} );

		describe( 'getLanguagesInParentMultilingualList', () => {
			beforeEach( () => {
				const zobject = {
					Z2K2: { Z1K1: 'Z12',
						Z12K1: [ 'Z17',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'English text' },
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'Spanish text' },
							{ Z1K1: 'Z11', Z11K1: 'Z1004', Z11K2: 'French text' },
							{ Z1K1: 'Z11', Z11K1: '', Z11K2: '' }
						]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
			} );

			it( 'extracts languages from multilingual list with item keyPath', () => {
				const keyPath = 'main.Z2K2.Z12K1.2.Z11K1';
				const languages = store.getLanguagesInParentMultilingualList( keyPath );

				expect( languages ).toContain( 'Z1002' );
				expect( languages ).toContain( 'Z1003' );
				expect( languages ).toContain( 'Z1004' );
				expect( languages ).not.toContain( '' );
			} );

			it( 'extracts languages from multilingual list with list item keyPath', () => {
				const keyPath = 'main.Z2K2.Z12K1.2';
				const languages = store.getLanguagesInParentMultilingualList( keyPath );

				expect( languages ).toContain( 'Z1002' );
				expect( languages ).toContain( 'Z1003' );
				expect( languages ).toContain( 'Z1004' );
				expect( languages ).not.toContain( '' );
			} );

			it( 'returns empty array when multilingual list not found', () => {
				const keyPath = 'main.Z2K2.Z99K1.2.Z11K1';
				const languages = store.getLanguagesInParentMultilingualList( keyPath );

				expect( languages ).toEqual( [] );
			} );

			it( 'returns empty array when keyPath does not contain Z12K1', () => {
				const keyPath = 'main.Z2K2.Z8K1.2.Z11K1';
				const languages = store.getLanguagesInParentMultilingualList( keyPath );

				expect( languages ).toEqual( [] );
			} );
		} );

		describe( 'getEmptyReferencesKeyPaths', () => {
			it( 'returns empty array when no empty references exist', () => {
				const zobject = {
					Z1K1: 'Z2',
					Z2K2: {
						Z1K1: 'Z8',
						Z8K2: { Z1K1: 'Z9', Z9K1: 'Z6' }
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );

				const result = store.getEmptyReferencesKeyPaths();
				expect( result ).toEqual( [] );
			} );

			it( 'finds single empty Z9K1 reference', () => {
				const zobject = {
					Z1K1: 'Z2',
					Z2K2: {
						Z1K1: 'Z8',
						Z8K2: { Z1K1: 'Z9', Z9K1: '' }
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );

				const result = store.getEmptyReferencesKeyPaths();
				expect( result ).toEqual( [ 'main.Z2K2.Z8K2' ] );
			} );

			it( 'finds multiple nested empty Z9K1 references', () => {
				const zobject = {
					Z1K1: 'Z2',
					Z2K2: {
						Z1K1: 'Z8',
						Z8K1: [
							'Z17',
							{
								Z1K1: 'Z17',
								Z17K1: { Z1K1: 'Z9', Z9K1: '' },
								Z17K2: 'Z123K1'
							}
						],
						Z8K2: { Z1K1: 'Z9', Z9K1: '' }
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );

				const result = store.getEmptyReferencesKeyPaths();
				expect( result ).toEqual( [
					'main.Z2K2.Z8K1.1.Z17K1',
					'main.Z2K2.Z8K2'
				] );
			} );

			it( 'ignores non-empty Z9K1 references', () => {
				const zobject = {
					Z1K1: 'Z2',
					Z2K2: {
						Z1K1: 'Z8',
						Z8K2: { Z1K1: 'Z9', Z9K1: 'Z6' },
						Z8K5: { Z1K1: 'Z9', Z9K1: 'Z123' }
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );

				const result = store.getEmptyReferencesKeyPaths();
				expect( result ).toEqual( [] );
			} );

			it( 'returns empty array for empty or undefined zobject', () => {
				store.jsonObject.main = {};
				expect( store.getEmptyReferencesKeyPaths() ).toEqual( [] );

				store.jsonObject.main = undefined;
				expect( store.getEmptyReferencesKeyPaths() ).toEqual( [] );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'setJsonObject', () => {
			it( 'Updates the zobject main namespace', () => {
				const zobject = {
					Z1K1: 'Z2',
					Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
					Z2K2: '',
					Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
				};
				store.setJsonObject( { namespace: 'main', zobject } );
				expect( store.jsonObject.main ).toEqual( zobject );
			} );

			it( 'Updates the function call main namespace', () => {
				const zobject = {
					Z1K1: 'Z7',
					Z7K1: 'Z801',
					Z801K1: 'echo echo'
				};
				store.setJsonObject( { namespace: 'call', zobject } );
				expect( store.jsonObject.call ).toEqual( zobject );
			} );
		} );

		describe( 'initializeView', () => {
			const mockMWGetConfig = ( configVars ) => {
				mw.config = {
					get: jest.fn( ( varName ) => configVars[ varName ] || null )
				};
			};

			afterEach( () => {
				restoreWindowLocation();
			} );

			it( 'calls initializeCreateNewPage when creating new page', async () => {
				store.initializeCreateNewPage = jest.fn();

				mockMWGetConfig( {
					wgWikiLambda: {
						zlang: 'en',
						zlangZid: 'Z1002',
						createNewPage: true,
						runFunction: false,
						zId: null
					}
				} );

				await store.initializeView();

				expect( store.initializeCreateNewPage ).toHaveBeenCalled();
			} );

			it( 'calls initializeEvaluateFunction when opening the function evaluator', async () => {
				store.initializeEvaluateFunction = jest.fn();

				mockMWGetConfig( {
					wgWikiLambda: {
						zlang: 'en',
						zlangZid: 'Z1002',
						createNewPage: false,
						runFunction: true,
						zId: null
					}
				} );

				await store.initializeView();

				expect( store.initializeEvaluateFunction ).toHaveBeenCalled();
			} );

			it( 'calls initializeEvaluateFunction when no info available', async () => {
				store.initializeEvaluateFunction = jest.fn();
				mockMWGetConfig( {
					wgWikiLambda: {
						zlang: 'en',
						zlangZid: 'Z1002',
						createNewPage: false,
						runFunction: false,
						zId: null
					}
				} );

				await store.initializeView();

				expect( store.initializeEvaluateFunction ).toHaveBeenCalled();
			} );

			it( 'calls initializeRootZObject when viewing or editing an object', async () => {
				store.initializeRootZObject = jest.fn();
				mockMWGetConfig( {
					wgWikiLambda: {
						zlang: 'en',
						zlangZid: 'Z1002',
						createNewPage: false,
						runFunction: false,
						zId: 'Z10000'
					}
				} );

				await store.initializeView();

				expect( store.initializeRootZObject ).toHaveBeenCalledWith( 'Z10000' );
			} );

			it( 'calls initializeAbstractWikiContent when viewing or editing abstract content', async () => {
				store.initializeAbstractWikiContent = jest.fn();
				mockMWGetConfig( {
					wgWikiLambda: {
						abstractContent: true,
						createNewPage: false,
						runFunction: false,
						zId: null
					}
				} );

				await store.initializeView();

				expect( store.initializeAbstractWikiContent ).toHaveBeenCalled();
			} );

			describe( 'initializeCreateNewPage', () => {
				beforeEach( () => {
					Object.defineProperty( store, 'createObjectByType', {
						value: () => ( {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
							Z2K2: '',
							Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						} )
					} );
					Object.defineProperty( store, 'getStoredObject', {
						value: () => ( { Z2K2: { Z1K1: 'Z4', Z4K2: [ 'Z3' ] } } )
					} );
				} );

				it( 'initializes ZObject, create new page, no initial type', async () => {
					store.fetchZids = jest.fn().mockResolvedValue();
					store.setCreateNewPage = jest.fn();
					store.setCurrentZid = jest.fn();
					store.setJsonObject = jest.fn();
					store.changeTypeByKeyPath = jest.fn();
					store.setInitialized = jest.fn();

					const expectedSetJsonObject = {
						namespace: Constants.STORED_OBJECTS.MAIN,
						zobject: canonicalToHybrid( {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
							Z2K2: '',
							Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						} )
					};

					await store.initializeCreateNewPage();

					expect( store.setCreateNewPage ).toHaveBeenCalledWith( true );
					expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z0' );
					expect( store.setJsonObject ).toHaveBeenCalledWith( expectedSetJsonObject );
					expect( store.changeTypeByKeyPath ).toHaveBeenCalledTimes( 0 );
					expect( store.setInitialized ).toHaveBeenCalledWith( true );
				} );

				it( 'initializes ZObject, create new page, zid url parameter not well formed', async () => {
					store.fetchZids = jest.fn().mockResolvedValue();
					store.setCreateNewPage = jest.fn();
					store.setCurrentZid = jest.fn();
					store.setJsonObject = jest.fn();
					store.changeTypeByKeyPath = jest.fn();
					store.setInitialized = jest.fn();

					const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ Constants.PATHS.CREATE_OBJECT_TITLE }`;
					const queryParams = { zid: 'notAzid' };
					mockWindowLocation( buildUrl( baseUrl, queryParams ) );

					Object.defineProperty( store, 'getStoredObject', {
						value: () => undefined
					} );

					const expectedSetJsonObject = {
						namespace: Constants.STORED_OBJECTS.MAIN,
						zobject: canonicalToHybrid( {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
							Z2K2: '',
							Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						} )
					};

					await store.initializeCreateNewPage();

					expect( store.setCreateNewPage ).toHaveBeenCalledWith( true );
					expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z0' );
					expect( store.setJsonObject ).toHaveBeenCalledTimes( 1 );
					expect( store.setJsonObject ).toHaveBeenCalledWith( expectedSetJsonObject );
					expect( store.changeTypeByKeyPath ).toHaveBeenCalledTimes( 0 );
					expect( store.setInitialized ).toHaveBeenCalledWith( true );
				} );

				it( 'initializes ZObject, create new page, zid url parameter not a type', async () => {
					store.fetchZids = jest.fn().mockResolvedValue();
					store.setCreateNewPage = jest.fn();
					store.setCurrentZid = jest.fn();
					store.setJsonObject = jest.fn();
					store.changeTypeByKeyPath = jest.fn();
					store.setInitialized = jest.fn();

					const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ Constants.PATHS.CREATE_OBJECT_TITLE }`;
					const queryParams = { zid: 'Z1002' };
					mockWindowLocation( buildUrl( baseUrl, queryParams ) );

					Object.defineProperty( store, 'getStoredObject', {
						value: () => ( { Z2K2: { Z1K1: 'Z60', Z60K1: 'en' } } )
					} );

					const expectedSetJsonObject = {
						namespace: Constants.STORED_OBJECTS.MAIN,
						zobject: canonicalToHybrid( {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
							Z2K2: '',
							Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						} )
					};

					await store.initializeCreateNewPage();

					expect( store.setCreateNewPage ).toHaveBeenCalledWith( true );
					expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z0' );
					expect( store.setJsonObject ).toHaveBeenCalledTimes( 1 );
					expect( store.setJsonObject ).toHaveBeenCalledWith( expectedSetJsonObject );
					expect( store.changeTypeByKeyPath ).toHaveBeenCalledTimes( 0 );
					expect( store.setInitialized ).toHaveBeenCalledWith( true );
				} );

				it( 'initializes ZObject, create new page, initial type for Z2K2', async () => {
					store.fetchZids = jest.fn().mockResolvedValue();
					store.setCreateNewPage = jest.fn();
					store.setCurrentZid = jest.fn();
					store.setJsonObject = jest.fn();
					store.changeTypeByKeyPath = jest.fn();
					store.setInitialized = jest.fn();

					const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ Constants.PATHS.CREATE_OBJECT_TITLE }`;
					const queryParams = { zid: Constants.Z_BOOLEAN };
					mockWindowLocation( buildUrl( baseUrl, queryParams ) );

					// Checks that query param zid is a literal type by looking at its type and identity keys
					Object.defineProperty( store, 'getStoredObject', {
						value: () => ( { Z2K2: { Z1K1: 'Z4', Z4K1: 'Z40' } } )
					} );

					const expectedChangeTypePayload = {
						keyPath: [ Constants.STORED_OBJECTS.MAIN, Constants.Z_PERSISTENTOBJECT_VALUE ],
						type: Constants.Z_BOOLEAN,
						literal: true
					};
					const expectedSetJsonObject = {
						namespace: Constants.STORED_OBJECTS.MAIN,
						zobject: canonicalToHybrid( {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
							Z2K2: '',
							Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						} )
					};

					await store.initializeCreateNewPage();

					expect( store.setCreateNewPage ).toHaveBeenCalledWith( true );
					expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z0' );
					expect( store.setJsonObject ).toHaveBeenCalledTimes( 1 );
					expect( store.setJsonObject ).toHaveBeenCalledWith( expectedSetJsonObject );
					expect( store.changeTypeByKeyPath ).toHaveBeenCalledTimes( 1 );
					expect( store.changeTypeByKeyPath ).toHaveBeenCalledWith( expectedChangeTypePayload );
					expect( store.setInitialized ).toHaveBeenCalledWith( true );
				} );
			} );

			describe( 'initializeRootZObject', () => {
				it( 'requests initial ZObject for an old revision', async () => {
					store.fetchZids = jest.fn().mockResolvedValue();
					const response = { query: { wikilambdaload_zobjects: {
						Z10001: { data: {} }
					} } };
					const getMock = jest.fn().mockResolvedValueOnce( response );
					mw.Api = jest.fn( () => ( { get: getMock } ) );

					const queryParams = {
						title: 'Z10001',
						oldid: '10002'
					};
					const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ queryParams.title }`;
					mockWindowLocation( buildUrl( baseUrl, queryParams ) );

					const expectedPayload = {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						formatversion: '2',
						wikilambdaload_get_dependencies: 'false',
						wikilambdaload_language: undefined,
						wikilambdaload_zids: 'Z10001',
						wikilambdaload_revisions: '10002'
					};

					await store.initializeRootZObject( 'Z10001' );

					expect( getMock ).toHaveBeenCalledWith( expectedPayload, { signal: undefined } );
				} );

				it( 'requests initial ZObject without revision', async () => {
					store.fetchZids = jest.fn().mockResolvedValue();
					const response = { query: { wikilambdaload_zobjects: {
						Z10001: { data: {} }
					} } };
					const getMock = jest.fn().mockResolvedValueOnce( response );
					mw.Api = jest.fn( () => ( { get: getMock } ) );
					const queryParams = {
						title: 'Z10001'
					};
					const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ queryParams.title }`;
					mockWindowLocation( buildUrl( baseUrl, queryParams ) );
					const expectedPayload = {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						formatversion: '2',
						wikilambdaload_get_dependencies: 'false',
						wikilambdaload_language: undefined,
						wikilambdaload_zids: 'Z10001',
						wikilambdaload_revisions: undefined
					};

					await store.initializeRootZObject( 'Z10001' );

					expect( getMock ).toHaveBeenCalledWith( expectedPayload, { signal: undefined } );
				} );

				it( 'initializes empty description and alias fields', async () => {
					store.setCurrentZid = jest.fn();
					store.saveMultilingualDataCopy = jest.fn();
					store.setJsonObject = jest.fn();
					store.setInitialized = jest.fn();
					store.fetchZids = jest.fn().mockResolvedValue();

					const Z1234 = {
						Z1K1: 'Z2',
						Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
						Z2K2: 'test',
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'test' }
							]
						}
					};

					const mockApiResponse = {
						batchcomplete: '',
						query: {
							wikilambdaload_zobjects: {
								Z1234: {
									success: '',
									data: Z1234
								}
							}
						}
					};
					const getMock = jest.fn().mockResolvedValueOnce( mockApiResponse );
					mw.Api = jest.fn( () => ( { get: getMock } ) );

					const expectedZObjectJson = {
						Z1K1: 'Z2',
						Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
						Z2K2: 'test',
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'test' }
							]
						},
						Z2K4: {
							Z1K1: 'Z32',
							Z32K1: [ 'Z31' ]
						},
						Z2K5: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11' ]
						}
					};
					const expectedSetJsonObject = {
						namespace: Constants.STORED_OBJECTS.MAIN,
						zobject: canonicalToHybrid( expectedZObjectJson )
					};

					const expectedFetchZidsPayload = {
						zids: [ 'Z1', 'Z2', 'Z6', 'Z1234', 'Z12', 'Z11', 'Z1002', 'Z32', 'Z31' ]
					};

					await store.initializeRootZObject( 'Z1234' );

					expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z1234' );
					expect( store.saveMultilingualDataCopy ).toHaveBeenCalledWith( expectedZObjectJson );
					expect( store.setJsonObject ).toHaveBeenCalledWith( expectedSetJsonObject );
					expect( store.fetchZids ).toHaveBeenCalledWith( expectedFetchZidsPayload );
					expect( store.setInitialized ).toHaveBeenCalledWith( true );
				} );

				describe( 'For users with type editing permissions', () => {
					beforeEach( () => {
						Object.defineProperty( store, 'userCanEditTypes', {
							value: true
						} );
					} );

					it( 'initializes undefined type functions', async () => {
						store.setCurrentZid = jest.fn();
						store.saveMultilingualDataCopy = jest.fn();
						store.setJsonObject = jest.fn();
						store.setInitialized = jest.fn();
						store.fetchZids = jest.fn().mockResolvedValue();

						const Z1234 = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3' ],
								Z4K7: [ 'Z46' ],
								Z4K8: [ 'Z64' ]
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};

						const mockApiResponse = {
							batchcomplete: '',
							query: {
								wikilambdaload_zobjects: {
									Z1234: {
										success: '',
										data: Z1234
									}
								}
							}
						};
						const getMock = jest.fn().mockResolvedValueOnce( mockApiResponse );
						mw.Api = jest.fn( () => ( { get: getMock } ) );

						const expectedZObjectJson = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3' ],
								Z4K3: { Z1K1: 'Z9', Z9K1: '' },
								Z4K4: { Z1K1: 'Z9', Z9K1: '' },
								Z4K5: { Z1K1: 'Z9', Z9K1: '' },
								Z4K6: { Z1K1: 'Z9', Z9K1: '' },
								Z4K7: [ 'Z46' ],
								Z4K8: [ 'Z64' ]
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};
						const expectedSetJsonObject = {
							namespace: Constants.STORED_OBJECTS.MAIN,
							zobject: canonicalToHybrid( expectedZObjectJson )
						};

						await store.initializeRootZObject( 'Z1234' );

						expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z1234' );
						expect( store.saveMultilingualDataCopy ).toHaveBeenCalledWith( expectedZObjectJson );
						expect( store.setJsonObject ).toHaveBeenCalledWith( expectedSetJsonObject );
						expect( store.setInitialized ).toHaveBeenCalledWith( true );
					} );

					it( 'initializes undefined identity flags for every key', async () => {
						store.setCurrentZid = jest.fn();
						store.saveMultilingualDataCopy = jest.fn();
						store.setJsonObject = jest.fn();
						store.setInitialized = jest.fn();
						store.fetchZids = jest.fn().mockResolvedValue();
						const Z1234 = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3',
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K2', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: 'Z41' },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K3', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K4', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: 'Z42' }
								],
								Z4K3: 'Z10001',
								Z4K4: 'Z10002',
								Z4K5: 'Z10003',
								Z4K6: 'Z10004',
								Z4K7: [ 'Z46' ],
								Z4K8: [ 'Z64' ]
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};

						const mockApiResponse = {
							batchcomplete: '',
							query: {
								wikilambdaload_zobjects: {
									Z1234: {
										success: '',
										data: Z1234
									}
								}
							}
						};
						const getMock = jest.fn().mockResolvedValueOnce( mockApiResponse );
						mw.Api = jest.fn( () => ( { get: getMock } ) );

						const expectedZObjectJson = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3',
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: { Z1K1: 'Z40', Z40K1: 'Z42' } },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K2', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: 'Z41' },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K3', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: { Z1K1: 'Z40', Z40K1: 'Z42' } },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K4', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: 'Z42' }
								],
								Z4K3: 'Z10001',
								Z4K4: 'Z10002',
								Z4K5: 'Z10003',
								Z4K6: 'Z10004',
								Z4K7: [ 'Z46' ],
								Z4K8: [ 'Z64' ]
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};
						const expectedSetJsonObject = {
							namespace: Constants.STORED_OBJECTS.MAIN,
							zobject: canonicalToHybrid( expectedZObjectJson )
						};

						await store.initializeRootZObject( 'Z1234' );

						expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z1234' );
						expect( store.saveMultilingualDataCopy ).toHaveBeenCalledWith( expectedZObjectJson );
						expect( store.setJsonObject ).toHaveBeenCalledWith( expectedSetJsonObject );
						expect( store.setInitialized ).toHaveBeenCalledWith( true );
					} );

					it( 'initializes undefined converter lists for type editor', async () => {
						store.setCurrentZid = jest.fn();
						store.saveMultilingualDataCopy = jest.fn();
						store.setJsonObject = jest.fn();
						store.setInitialized = jest.fn();
						store.fetchZids = jest.fn().mockResolvedValue();
						const Z1234 = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3' ],
								Z4K3: 'Z10001',
								Z4K4: 'Z10002',
								Z4K5: 'Z10003',
								Z4K6: 'Z10004'
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};

						const mockApiResponse = {
							batchcomplete: '',
							query: {
								wikilambdaload_zobjects: {
									Z1234: {
										success: '',
										data: Z1234
									}
								}
							}
						};
						const getMock = jest.fn().mockResolvedValueOnce( mockApiResponse );
						mw.Api = jest.fn( () => ( { get: getMock } ) );

						const expectedZObjectJson = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3' ],
								Z4K3: 'Z10001',
								Z4K4: 'Z10002',
								Z4K5: 'Z10003',
								Z4K6: 'Z10004',
								Z4K7: [ 'Z46' ],
								Z4K8: [ 'Z64' ]
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};
						const expectedSetJsonObject = {
							namespace: Constants.STORED_OBJECTS.MAIN,
							zobject: canonicalToHybrid( expectedZObjectJson )
						};

						await store.initializeRootZObject( 'Z1234' );

						expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z1234' );
						expect( store.saveMultilingualDataCopy ).toHaveBeenCalledWith( expectedZObjectJson );
						expect( store.setJsonObject ).toHaveBeenCalledWith( expectedSetJsonObject );
						expect( store.setInitialized ).toHaveBeenCalledWith( true );
					} );
				} );

				describe( 'For users without type editing permissions', () => {
					beforeEach( () => {
						Object.defineProperty( store, 'userCanEditTypes', {
							value: false
						} );
					} );

					it( 'does not initialize undefined keys and type keys to falsy values', async () => {
						store.setCurrentZid = jest.fn();
						store.saveMultilingualDataCopy = jest.fn();
						store.setJsonObject = jest.fn();
						store.setInitialized = jest.fn();
						store.fetchZids = jest.fn().mockResolvedValue();
						const Z1234 = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3',
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K2', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: 'Z41' },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K3', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K4', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: 'Z42' }
								]
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};

						const mockApiResponse = {
							batchcomplete: '',
							query: {
								wikilambdaload_zobjects: {
									Z1234: {
										success: '',
										data: Z1234
									}
								}
							}
						};
						const getMock = jest.fn().mockResolvedValueOnce( mockApiResponse );
						mw.Api = jest.fn( () => ( { get: getMock } ) );

						const expectedSetJsonObject = {
							namespace: Constants.STORED_OBJECTS.MAIN,
							zobject: canonicalToHybrid( Z1234 )
						};

						await store.initializeRootZObject( 'Z1234' );

						expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z1234' );
						expect( store.saveMultilingualDataCopy ).toHaveBeenCalledWith( Z1234 );
						expect( store.setJsonObject ).toHaveBeenCalledWith( expectedSetJsonObject );
						expect( store.setInitialized ).toHaveBeenCalledWith( true );
					} );
				} );
			} );

			describe( 'initializeEvaluateFunction', () => {
				it( 'initializes evaluate function call page', async () => {
					store.setCurrentZid = jest.fn();
					store.setJsonObject = jest.fn();
					store.changeTypeByKeyPath = jest.fn().mockResolvedValue();
					store.setInitialized = jest.fn();

					const expectedSetJsonObject = {
						namespace: Constants.STORED_OBJECTS.FUNCTION_CALL,
						zobject: {}
					};
					const expectedChangeTypePayload = {
						keyPath: [ Constants.STORED_OBJECTS.FUNCTION_CALL ],
						type: Constants.Z_FUNCTION_CALL
					};

					Object.defineProperty( store, 'getStoredObject', {
						value: () => ( { Z1K1: 'test', Z2K1: 'test' } )
					} );

					await store.initializeEvaluateFunction();

					expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z0' );
					expect( store.setJsonObject ).toHaveBeenCalledWith( expectedSetJsonObject );
					expect( store.changeTypeByKeyPath ).toHaveBeenCalledWith( expectedChangeTypePayload );
					expect( store.setInitialized ).toHaveBeenCalledWith( true );
				} );
			} );
		} );

		describe( 'setValueByKeyPath', () => {
			beforeEach( () => {
				store.jsonObject.main = canonicalToHybrid( {
					Z2K5: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'some name' },
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'un nombre' }
						]
					}
				} );
			} );

			it( 'throws error when keypath is not found', () => {
				expect( () => {
					store.setValueByKeyPath( {
						keyPath: [ 'main', 'Z2K3', 'does', 'not', 'exist' ],
						value: 'new value'
					} );
				} ).toThrowError();
			} );

			it( 'sets terminal value', () => {
				// Full path in the hybrid object
				store.setValueByKeyPath( {
					keyPath: [ 'main', 'Z2K5', 'Z12K1', 2, 'Z11K2', 'Z6K1' ],
					value: 'new value'
				} );

				expect( store.jsonObject.main.Z2K5.Z12K1[ 2 ].Z11K2 ).toEqual( { Z1K1: 'Z6', Z6K1: 'new value' } );
			} );

			it( 'sets non terminal value and converts object to hybrid', () => {
				const canonicalValue = { Z1K1: 'Z11', Z11K1: 'Z1004', Z11K2: 'new value' };
				const hybridValue = canonicalToHybrid( canonicalValue );

				// Full path in the hybrid object
				store.setValueByKeyPath( {
					keyPath: [ 'main', 'Z2K5', 'Z12K1', 1 ],
					value: canonicalValue
				} );

				expect( store.jsonObject.main.Z2K5.Z12K1[ 1 ] ).toEqual( hybridValue );
			} );
		} );

		describe( 'unsetPropertyByKeyPath', () => {
			beforeEach( () => {
				store.jsonObject.main = canonicalToHybrid( {
					Z2K5: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'some name' },
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'un nombre' }
						]
					}
				} );
			} );

			it( 'throws error when keypath is not found', () => {
				expect( () => {
					store.unsetPropertyByKeyPath( {
						keyPath: [ 'main', 'Z2K3', 'does', 'not', 'exist' ]
					} );
				} ).toThrowError();
			} );

			it( 'unsets terminal value', () => {
				store.unsetPropertyByKeyPath( {
					keyPath: [ 'main', 'Z2K5', 'Z12K1', 2, 'Z11K2', 'Z6K1' ]
				} );

				expect( store.jsonObject.main.Z2K5.Z12K1[ 2 ].Z11K2 ).toEqual( { Z1K1: 'Z6' } );
			} );

			it( 'unsets non terminal value', () => {
				store.unsetPropertyByKeyPath( {
					keyPath: [ 'main', 'Z2K5', 'Z12K1' ]
				} );

				const expected = { Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' } };
				expect( store.jsonObject.main.Z2K5 ).toEqual( expected );
			} );
		} );

		describe( 'pushItemsByKeyPath', () => {
			beforeEach( () => {
				store.jsonObject.main = canonicalToHybrid( {
					Z2K1: { Z1K1: 'Z6', Z6K1: 'Z123' },
					Z2K2: [ 'Z1', 'una', 'dola' ]
				} );
			} );

			it( 'throws error when keypath is not found', () => {
				expect( () => {
					store.pushItemsByKeyPath( {
						keyPath: [ 'main', 'Z2K3', 'does', 'not', 'exist' ],
						values: [ 'tela', 'catola' ]
					} );
				} ).toThrowError();
			} );

			it( 'throws error when keypath target is not an array', () => {
				expect( () => {
					store.pushItemsByKeyPath( {
						keyPath: [ 'main', 'Z2K1' ],
						values: [ 'bad', 'behavior' ]
					} );
				} ).toThrowError();
			} );

			it( 'throws error when values is not an array', () => {
				expect( () => {
					store.pushItemsByKeyPath( {
						keyPath: [ 'main', 'Z2K2' ],
						values: 'only one object'
					} );
				} ).toThrowError();
			} );

			it( 'pushes one item to the array', () => {
				store.pushItemsByKeyPath( {
					keyPath: [ 'main', 'Z2K2' ],
					values: [
						{ Z1K1: 'Z6', Z6K1: 'tela' }
					]
				} );
				const expected = [
					{ Z1K1: 'Z9', Z9K1: 'Z1' },
					{ Z1K1: 'Z6', Z6K1: 'una' },
					{ Z1K1: 'Z6', Z6K1: 'dola' },
					{ Z1K1: 'Z6', Z6K1: 'tela' }
				];

				expect( store.jsonObject.main.Z2K2 ).toEqual( expected );
			} );

			it( 'pushes multiple items to the array', () => {
				store.pushItemsByKeyPath( {
					keyPath: [ 'main', 'Z2K2' ],
					values: [
						{ Z1K1: 'Z6', Z6K1: 'tela' },
						{ Z1K1: 'Z6', Z6K1: 'catola' }
					]
				} );
				const expected = [
					{ Z1K1: 'Z9', Z9K1: 'Z1' },
					{ Z1K1: 'Z6', Z6K1: 'una' },
					{ Z1K1: 'Z6', Z6K1: 'dola' },
					{ Z1K1: 'Z6', Z6K1: 'tela' },
					{ Z1K1: 'Z6', Z6K1: 'catola' }
				];

				expect( store.jsonObject.main.Z2K2 ).toEqual( expected );
			} );
		} );

		describe( 'deleteListItemsByKeyPath', () => {
			beforeEach( () => {
				store.jsonObject.main = canonicalToHybrid( {
					Z2K1: { Z1K1: 'Z6', Z6K1: 'Z123' },
					Z2K2: [ 'Z1', 'una', 'dola', 'tela', 'catola' ]
				} );
			} );

			it( 'throws error when keypath is not found', () => {
				expect( () => {
					store.deleteListItemsByKeyPath( {
						keyPath: [ 'main', 'Z2K3', 'does', 'not', 'exist' ],
						indexes: [ 1 ]
					} );
				} ).toThrowError();
			} );

			it( 'throws error when keypath target is not an array', () => {
				expect( () => {
					store.deleteListItemsByKeyPath( {
						keyPath: [ 'main', 'Z2K1' ],
						indexes: [ 1 ]
					} );
				} ).toThrowError( 'Unable to mutate state: Expected Array at key path, found object' );
			} );

			it( 'throws error when indexes is not an array', () => {
				expect( () => {
					store.deleteListItemsByKeyPath( {
						keyPath: [ 'main', 'Z2K2' ],
						indexes: 1
					} );
				} ).toThrowError( 'Unable to mutate state: Expected Array of indexes, found number' );
			} );

			it( 'throws error when array index is not correct', () => {
				expect( () => {
					store.deleteListItemsByKeyPath( {
						keyPath: [ 'main', 'Z2K2' ],
						indexes: [ 'badindex' ]
					} );
				} ).toThrowError( 'Unable to mutate state: Invalid array index: "NaN"' );
			} );

			it( 'throws error when trying to delete benjamin item', () => {
				expect( () => {
					store.deleteListItemsByKeyPath( {
						keyPath: [ 'main', 'Z2K2' ],
						indexes: [ 0 ]
					} );
				} ).toThrowError( 'Unable to mutate state: Invalid array index: "0"' );
			} );

			it( 'deletes one item from the array', () => {
				store.deleteListItemsByKeyPath( {
					keyPath: [ 'main', 'Z2K2' ],
					indexes: [ 1 ]
				} );
				const expected = [
					{ Z1K1: 'Z9', Z9K1: 'Z1' },
					{ Z1K1: 'Z6', Z6K1: 'dola' },
					{ Z1K1: 'Z6', Z6K1: 'tela' },
					{ Z1K1: 'Z6', Z6K1: 'catola' }
				];

				expect( store.jsonObject.main.Z2K2 ).toEqual( expected );
			} );

			it( 'deletes multiple items from the array', () => {
				store.deleteListItemsByKeyPath( {
					keyPath: [ 'main', 'Z2K2' ],
					indexes: [ 1, 4 ]
				} );
				const expected = [
					{ Z1K1: 'Z9', Z9K1: 'Z1' },
					{ Z1K1: 'Z6', Z6K1: 'dola' },
					{ Z1K1: 'Z6', Z6K1: 'tela' }
				];

				expect( store.jsonObject.main.Z2K2 ).toEqual( expected );
			} );
		} );

		describe( 'clearTypeByKeyPath', () => {
			beforeEach( () => {
				store.jsonObject.main = canonicalToHybrid( {
					Z2K2: {
						Z1K1: 'Z4',
						Z4K1: 'Z1234',
						Z4K2: [ 'Z3' ],
						Z4K7: [ 'Z46' ],
						Z4K8: [ 'Z64' ]
					},
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ]
					}
				} );
			} );

			it( 'throws error when keypath is not found', () => {
				expect( () => {
					store.clearTypeByKeyPath( {
						keyPath: [ 'main', 'path', 'does', 'not', 'exist' ]
					} );
				} ).toThrowError();
			} );

			it( 'throws error when keypath target is not an object', () => {
				expect( () => {
					store.clearTypeByKeyPath( {
						keyPath: [ 'main', 'Z2K2', 'Z4K2' ]
					} );
				} ).toThrowError( 'Unable to mutate state: Expected Object at key path' );
			} );

			it( 'eliminates all child keys except the object type key', () => {
				store.clearTypeByKeyPath( {
					keyPath: [ 'main', 'Z2K2' ]
				} );

				const expected = {
					Z2K2: { Z1K1: 'Z4' },
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ]
					}
				};
				expect( store.jsonObject.main ).toEqual( canonicalToHybrid( expected ) );
			} );
		} );

		describe( 'changeTypeByKeyPath', () => {
			beforeEach( () => {
				store.fetchZids = jest.fn();
				store.jsonObject.main = canonicalToHybrid( {
					Z2K2: [
						'Z1',
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'some monolingual' },
						[ 'Z6', 'some nested list' ]
					],
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ]
					}
				} );

				// Create blank string, in canonical form
				Object.defineProperty( store, 'createObjectByType', {
					value: jest.fn( () => '' )
				} );
			} );

			it( 'changes type of the root persistent content', () => {
				store.changeTypeByKeyPath( {
					keyPath: [ 'main', 'Z2K2' ],
					type: 'Z6'
				} );

				const expectedCreateObjectPayload = {
					type: 'Z6',
					isRoot: true
				};

				expect( store.createObjectByType ).toHaveBeenCalledWith( expectedCreateObjectPayload );
				expect( store.jsonObject.main.Z2K2 ).toEqual( { Z1K1: 'Z6', Z6K1: '' } );
			} );

			it( 'changes type of a nested object', () => {
				store.changeTypeByKeyPath( {
					keyPath: [ 'main', 'Z2K2', 1 ],
					type: 'Z6'
				} );

				const expectedCreateObjectPayload = {
					type: 'Z6',
					isRoot: false
				};

				expect( store.createObjectByType ).toHaveBeenCalledWith( expectedCreateObjectPayload );
				expect( store.jsonObject.main.Z2K2[ 1 ] ).toEqual( { Z1K1: 'Z6', Z6K1: '' } );
			} );

			it( 'changes type of a nested array', () => {
				store.changeTypeByKeyPath( {
					keyPath: [ 'main', 'Z2K2', 2 ],
					type: 'Z6'
				} );

				const expectedCreateObjectPayload = {
					type: 'Z6',
					isRoot: false
				};

				expect( store.createObjectByType ).toHaveBeenCalledWith( expectedCreateObjectPayload );
				expect( store.jsonObject.main.Z2K2[ 2 ] ).toEqual( { Z1K1: 'Z6', Z6K1: '' } );
			} );

			it( 'passes additional properties to createObjectByType', () => {
				store.changeTypeByKeyPath( {
					keyPath: [ 'main', 'Z2K2', 2 ],
					type: 'Z6',
					literal: true,
					value: 'some value'
				} );

				const expectedCreateObjectPayload = {
					type: 'Z6',
					isRoot: false,
					literal: true,
					value: 'some value'
				};

				expect( store.createObjectByType ).toHaveBeenCalledWith( expectedCreateObjectPayload );
			} );

			it( 'requests all new zids', () => {
				Object.defineProperty( store, 'createObjectByType', {
					value: jest.fn( () => ( {
						Z1K1: 'Z10001',
						Z10001K1: { Z1K1: 'Z40', Z40K1: 'Z41' },
						Z10001K2: { Z1K1: 'Z60', Z60K1: 'Z1002' }
					} ) )
				} );

				store.fetchZids = jest.fn().mockResolvedValue();
				store.changeTypeByKeyPath( {
					keyPath: [ 'main', 'Z2K2', 2 ],
					type: 'Z10001'
				} );

				const expectedFetchZidsPayload = { zids: [ 'Z1', 'Z9', 'Z10001', 'Z40', 'Z41', 'Z60', 'Z1002' ] };
				expect( store.fetchZids ).toHaveBeenCalledWith( expectedFetchZidsPayload );
			} );
		} );

		describe( 'moveListItemByKeyPath', () => {
			beforeEach( () => {
				store.jsonObject.main = canonicalToHybrid( {
					Z2K1: { Z1K1: 'Z6', Z6K1: 'Z123' },
					Z2K2: [ 'Z1', 'una', 'dola', 'tela', 'catola' ]
				} );
			} );

			it( 'throws error when keypath is not found', () => {
				expect( () => {
					store.moveListItemByKeyPath( {
						keyPath: [ 'main', 'Z2K3', 'does', 'not', 'exist' ],
						offset: 1
					} );
				} ).toThrowError();
			} );

			it( 'throws error when keypath target is not an item in an array', () => {
				expect( () => {
					store.moveListItemByKeyPath( {
						keyPath: [ 'main', 'Z2K1' ],
						offset: 1
					} );
				} ).toThrowError( 'Unable to mutate state: Expected Array at key path, found object' );
			} );

			it( 'throws error when last key is not a valid Array index', () => {
				expect( () => {
					store.moveListItemByKeyPath( {
						keyPath: [ 'main', 'Z2K2', 'bad index' ],
						offset: 1
					} );
				} ).toThrowError( 'Unable to mutate state: Invalid array index: "bad index"' );
			} );

			it( 'throws error when new index is out of bounds (upper)', () => {
				expect( () => {
					store.moveListItemByKeyPath( {
						keyPath: [ 'main', 'Z2K2', 4 ],
						offset: 1
					} );
				} ).toThrowError( 'Unable to mutate state: New index "5" out of bounds' );
			} );

			it( 'throws error when new index is out of bounds (lower)', () => {
				expect( () => {
					store.moveListItemByKeyPath( {
						keyPath: [ 'main', 'Z2K2', 0 ],
						offset: -1
					} );
				} ).toThrowError( 'Unable to mutate state: New index "-1" out of bounds' );
			} );

			it( 'moves an item one position forward', () => {
				store.moveListItemByKeyPath( {
					keyPath: [ 'main', 'Z2K2', 1 ],
					offset: 1
				} );

				const canonical = hybridToCanonical( store.jsonObject.main.Z2K2 );
				expect( canonical ).toEqual( [ 'Z1', 'dola', 'una', 'tela', 'catola' ] );
			} );

			it( 'moves an item one position back', () => {
				store.moveListItemByKeyPath( {
					keyPath: [ 'main', 'Z2K2', 4 ],
					offset: -1
				} );

				const canonical = hybridToCanonical( store.jsonObject.main.Z2K2 );
				expect( canonical ).toEqual( [ 'Z1', 'una', 'dola', 'catola', 'tela' ] );
			} );
		} );

		describe( 'addLocalArgumentToFunctionCall', () => {
			it( 'adds first local key to function call without keys', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z7',
						Z7K1: { Z1K1: 'Z18', Z18K1: 'Z10000K1' }
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );

				store.addLocalArgumentToFunctionCall( {
					keyPath: [ 'main', 'Z2K2', 'Z7K1' ]
				} );

				const canonical = hybridToCanonical( store.jsonObject.main.Z2K2 );
				expect( canonical ).toEqual( {
					Z1K1: 'Z7',
					Z7K1: { Z1K1: 'Z18', Z18K1: 'Z10000K1' },
					K1: { Z1K1: 'Z1' }
				} );
			} );

			it( 'adds third local key to function call with two keys', () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z7',
						Z7K1: { Z1K1: 'Z18', Z18K1: 'Z10000K1' },
						K1: 'one',
						K2: 'two'
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );

				store.addLocalArgumentToFunctionCall( {
					keyPath: [ 'main', 'Z2K2', 'Z7K1' ]
				} );

				const canonical = hybridToCanonical( store.jsonObject.main.Z2K2 );
				expect( canonical ).toEqual( {
					Z1K1: 'Z7',
					Z7K1: { Z1K1: 'Z18', Z18K1: 'Z10000K1' },
					K1: 'one',
					K2: 'two',
					K3: { Z1K1: 'Z1' }
				} );
			} );
		} );

		describe( 'deleteLocalArgumentFromFunctionCall', () => {
			beforeEach( () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z7',
						Z7K1: { Z1K1: 'Z18', Z18K1: 'Z10000K1' },
						K1: 'one',
						K2: { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'two' }
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
			} );

			it( 'deletes the tail key from function call', () => {
				store.deleteLocalArgumentFromFunctionCall( {
					keyPath: [ 'main', 'Z2K2', 'K2' ]
				} );

				const canonical = hybridToCanonical( store.jsonObject.main.Z2K2 );
				expect( canonical ).toEqual( {
					Z1K1: 'Z7',
					Z7K1: { Z1K1: 'Z18', Z18K1: 'Z10000K1' },
					K1: 'one'
				} );
			} );

			it( 'deletes a middle key from function call and renames the following ones', () => {
				store.deleteLocalArgumentFromFunctionCall( {
					keyPath: [ 'main', 'Z2K2', 'K1' ]
				} );

				const canonical = hybridToCanonical( store.jsonObject.main.Z2K2 );
				expect( canonical ).toEqual( {
					Z1K1: 'Z7',
					Z7K1: { Z1K1: 'Z18', Z18K1: 'Z10000K1' },
					K1: { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'two' }
				} );
			} );
		} );

		describe( 'setWikidataEnumReferenceType', () => {
			beforeEach( () => {
				const zobject = {
					Z2K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z6884',
						Z6884K1: 'Z6095',
						Z6884K2: [ 'Z6095',
							{ Z1K1: 'Z6095', Z6095K1: 'L313289' },
							{ Z1K1: 'Z6095', Z6095K1: 'L313272' },
							{ Z1K1: 'Z6095', Z6095K1: 'L338656' }
						],
						Z6884K3: { Z1K1: 'Z6', Z6K1: 'Z25663' }
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
			} );

			it( 'sets the type of a Wikidata enum typed list', () => {
				store.setWikidataEnumReferenceType( {
					keyPath: [ 'main', 'Z2K2' ],
					value: 'Z6091'
				} );

				expect( store.jsonObject.main.Z2K2.Z6884K2[ 0 ] ).toEqual( { Z1K1: 'Z9', Z9K1: 'Z6091' } );
			} );
		} );

		describe( 'setKeyType', () => {
			it( 'sets existing reference to itself', () => {
				store.jsonObject.main = canonicalToHybrid( { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z10001K1',
					Z3K4: 'Z42'
				} } );

				store.setKeyType( {
					keyPath: [ 'main', 'Z2K2', 'Z3K1' ],
					value: 'Z10001'
				} );

				const expected = canonicalToHybrid( {
					Z1K1: 'Z3',
					Z3K1: 'Z10001',
					Z3K2: 'Z10001K1',
					Z3K4: 'Z42'
				} );
				expect( store.jsonObject.main.Z2K2 ).toEqual( expected );
			} );

			it( 'sets generic type to reference', () => {
				store.jsonObject.main = canonicalToHybrid( { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: { Z1K1: 'Z7', Z7K1: 'Z881', Z881K1: 'Z6' },
					Z3K2: 'Z10001K1',
					Z3K4: 'Z42'
				} } );

				store.setKeyType( {
					keyPath: [ 'main', 'Z2K2', 'Z3K1' ],
					value: 'Z10001'
				} );

				const expected = canonicalToHybrid( {
					Z1K1: 'Z3',
					Z3K1: 'Z10001',
					Z3K2: 'Z10001K1',
					Z3K4: 'Z42'
				} );
				expect( store.jsonObject.main.Z2K2 ).toEqual( expected );
			} );

			it( 'sets type correctly when key path is another child', () => {
				store.jsonObject.main = canonicalToHybrid( { Z2K2: {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z10001K1',
					Z3K4: 'Z42'
				} } );

				store.setKeyType( {
					keyPath: [ 'main', 'Z2K2', 'Z3K4' ],
					value: 'Z10001'
				} );

				const expected = canonicalToHybrid( {
					Z1K1: 'Z3',
					Z3K1: 'Z10001',
					Z3K2: 'Z10001K1',
					Z3K4: 'Z42'
				} );
				expect( store.jsonObject.main.Z2K2 ).toEqual( expected );
			} );
		} );

		describe( 'setFunctionCallArguments', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
				store.jsonObject.main = canonicalToHybrid( { Z2K2: {
					Z1K1: 'Z7',
					Z7K1: 'Z882',
					Z882K1: 'Z6',
					Z882K2: 'Z1'
				} } );

				store.fetchZids = jest.fn().mockResolvedValue();
			} );

			it( 'unsets current args and sets none if functionId is null or undefined', () => {
				store.setFunctionCallArguments( {
					keyPath: [ 'main', 'Z2K2' ],
					functionZid: null
				} );

				const expected = {
					Z1K1: 'Z7',
					Z7K1: 'Z882'
				};

				expect( hybridToCanonical( store.jsonObject.main.Z2K2 ) ).toEqual( expected );
				expect( store.fetchZids ).not.toHaveBeenCalled();
			} );

			it( 'unsets current arguments and sets one argument for the given function', async () => {
				Object.defineProperty( store, 'getInputsOfFunctionZid', {
					value: jest.fn( () => [
						{ Z1K1: 'Z17', Z17K1: 'Z4', Z17K2: 'Z881K1' }
					] )
				} );

				store.setFunctionCallArguments( {
					keyPath: [ 'main', 'Z2K2' ],
					functionZid: 'Z881'
				} );

				const expected = {
					Z1K1: 'Z7',
					Z7K1: 'Z882',
					Z881K1: { Z1K1: 'Z9', Z9K1: '' }
				};

				await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledTimes( 2 ) );

				const expectedArgTypeZids = { zids: [ 'Z4' ] };
				expect( store.fetchZids ).toHaveBeenNthCalledWith( 1, expectedArgTypeZids );

				const expectedFinalZids = { zids: [ 'Z881', 'Z1', 'Z9' ] };
				expect( store.fetchZids ).toHaveBeenNthCalledWith( 2, expectedFinalZids );

				expect( hybridToCanonical( store.jsonObject.main.Z2K2 ) ).toEqual( expected );
			} );

			it( 'sets three function arguments for the function If', async () => {
				Object.defineProperty( store, 'getInputsOfFunctionZid', {
					value: jest.fn( () => [
						{ Z1K1: 'Z17', Z17K1: 'Z40', Z17K2: 'Z802K1' },
						{ Z1K1: 'Z17', Z17K1: 'Z1', Z17K2: 'Z802K2' },
						{ Z1K1: 'Z17', Z17K1: 'Z1', Z17K2: 'Z802K3' }
					] )
				} );

				store.setFunctionCallArguments( {
					keyPath: [ 'main', 'Z2K2' ],
					functionZid: 'Z802'
				} );

				const expected = {
					Z1K1: 'Z7',
					Z7K1: 'Z882',
					Z802K1: { Z1K1: 'Z40', Z40K1: { Z1K1: 'Z9', Z9K1: '' } },
					Z802K2: { Z1K1: { Z1K1: 'Z9', Z9K1: '' } },
					Z802K3: { Z1K1: { Z1K1: 'Z9', Z9K1: '' } }
				};

				await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledTimes( 2 ) );

				const expectedArgTypeZids = { zids: [ 'Z40', 'Z1' ] };
				expect( store.fetchZids ).toHaveBeenNthCalledWith( 1, expectedArgTypeZids );

				const expectedFinalZids = { zids: [ 'Z802', 'Z1', 'Z40', 'Z9' ] };
				expect( store.fetchZids ).toHaveBeenNthCalledWith( 2, expectedFinalZids );

				expect( hybridToCanonical( store.jsonObject.main.Z2K2 ) ).toEqual( expected );
			} );

			it( 'makes no changes when the new function zid is the same as the old', () => {
				store.setValueByKeyPath = jest.fn();
				store.unsetPropertyByKeyPath = jest.fn();

				Object.defineProperty( store, 'getInputsOfFunctionZid', {
					value: jest.fn( () => [
						{ Z1K1: 'Z17', Z17K1: 'Z1', Z17K2: 'Z882K1' },
						{ Z1K1: 'Z17', Z17K1: 'Z1', Z17K2: 'Z882K2' }
					] )
				} );

				expect( store.setValueByKeyPath ).not.toHaveBeenCalled();
				expect( store.unsetPropertyByKeyPath ).not.toHaveBeenCalled();
				expect( store.fetchZids ).not.toHaveBeenCalled();
			} );

			it( 'sets only the second argument when its parent is a tester result validation call', async () => {
				store.jsonObject.main = canonicalToHybrid( { Z2K2: {
					Z1K1: 'Z20',
					Z20K3: {
						Z1K1: 'Z7',
						Z7K1: 'Z882'
					}
				} } );

				store.setFunctionCallArguments( {
					keyPath: [ 'main', 'Z2K2', 'Z20K3' ],
					functionZid: 'Z882'
				} );

				const expected = {
					Z1K1: 'Z20',
					Z20K3: {
						Z1K1: 'Z7',
						Z7K1: 'Z882',
						Z882K2: { Z1K1: 'Z9', Z9K1: '' }
					}
				};

				await waitFor( () => expect( store.fetchZids ).toHaveBeenCalledTimes( 2 ) );

				const expectedArgTypeZids = { zids: [ 'Z4' ] };
				expect( store.fetchZids ).toHaveBeenNthCalledWith( 1, expectedArgTypeZids );

				const expectedFinalZids = { zids: [ 'Z882', 'Z1', 'Z9' ] };
				expect( store.fetchZids ).toHaveBeenNthCalledWith( 2, expectedFinalZids );

				expect( hybridToCanonical( store.jsonObject.main.Z2K2 ) ).toEqual( expected );
			} );
		} );

		describe( 'setImplementationContentType', () => {
			const blankCode = {
				Z1K1: 'Z16',
				Z16K1: { Z1K1: 'Z9', Z9K1: '' },
				Z16K2: ''
			};
			const blankComposition = {
				Z1K1: 'Z7',
				Z7K1: { Z1K1: 'Z9', Z9K1: '' }
			};

			beforeEach( () => {
				Object.defineProperty( store, 'createObjectByType', {
					value: jest.fn( ( payload ) => payload.type === 'Z16' ? blankCode : blankComposition )
				} );
			} );

			it( 'unsets composition (Z14K2) and sets code (Z14K3)', () => {
				store.jsonObject.main = canonicalToHybrid( { Z2K2: {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z10002',
						Z10002K1: 'uno',
						Z10002K2: 'dos'
					}
				} } );

				store.setImplementationContentType( {
					keyPath: [ 'main', 'Z2K2', 'Z14K3' ]
				} );

				const expected = {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K3: blankCode
				};

				expect( hybridToCanonical( store.jsonObject.main.Z2K2 ) ).toEqual( expected );
			} );

			it( 'unsets code (Z14K3) and sets composition (Z14K2)', () => {
				store.jsonObject.main = canonicalToHybrid( { Z2K2: {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K3: {
						Z1K1: 'Z16',
						Z16K1: 'Z600',
						Z16K2: '() => "hello world";'
					}
				} } );

				store.setImplementationContentType( {
					keyPath: [ 'main', 'Z2K2', 'Z14K2' ]
				} );

				const expected = {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K2: blankComposition
				};

				expect( hybridToCanonical( store.jsonObject.main.Z2K2 ) ).toEqual( expected );
			} );
		} );

		describe( 'setZMonolingualString', () => {
			beforeEach( () => {
				const zobject = {
					Z2K2: 'some content',
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'name one' },
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'name two' }
						]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
			} );

			it( 'sets value of existing monolingual text if language is available', () => {
				store.setZMonolingualString( {
					parentKeyPath: [ 'main', 'Z2K3', 'Z12K1' ],
					itemKeyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1', // hybrid format
					value: 'new name',
					lang: 'Z1002'
				} );

				expect( store.jsonObject.main.Z2K3.Z12K1.length ).toBe( 3 );
				expect( store.jsonObject.main.Z2K3.Z12K1[ 1 ].Z11K2 ).toEqual( { Z1K1: 'Z6', Z6K1: 'new name' } );
			} );

			it( 'adds new monolingual text if language is not available', () => {
				store.setZMonolingualString( {
					parentKeyPath: [ 'main', 'Z2K3', 'Z12K1' ],
					itemKeyPath: undefined,
					value: 'new name',
					lang: 'Z1004'
				} );

				expect( store.jsonObject.main.Z2K3.Z12K1.length ).toBe( 4 );
				expect( store.jsonObject.main.Z2K3.Z12K1[ 3 ].Z11K1 ).toEqual( { Z1K1: 'Z9', Z9K1: 'Z1004' } );
				expect( store.jsonObject.main.Z2K3.Z12K1[ 3 ].Z11K2 ).toEqual( { Z1K1: 'Z6', Z6K1: 'new name' } );
			} );
		} );

		describe( 'setZMonolingualStringset', () => {
			beforeEach( () => {
				const zobject = {
					Z2K2: 'some content',
					Z2K3: {
						Z1K1: 'Z32',
						Z32K1: [ 'Z31',
							{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'name one' ] },
							{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6', 'name two' ] }
						]
					}
				};
				store.jsonObject.main = canonicalToHybrid( zobject );
			} );

			it( 'sets value of existing monolingual stringset if language is available', () => {
				store.setZMonolingualStringset( {
					parentKeyPath: [ 'main', 'Z2K3', 'Z32K1' ],
					itemKeyPath: 'main.Z2K3.Z32K1.1.Z31K2', // hybrid format
					value: [ 'one name', 'another name' ],
					lang: 'Z1002'
				} );

				const expected = [ 'Z6', 'one name', 'another name' ];

				expect( store.jsonObject.main.Z2K3.Z32K1.length ).toBe( 3 );
				expect( hybridToCanonical( store.jsonObject.main.Z2K3.Z32K1[ 1 ].Z31K2 ) ).toEqual( expected );
			} );

			it( 'adds new monolingual stringset if language is not available', () => {
				store.setZMonolingualStringset( {
					parentKeyPath: [ 'main', 'Z2K3', 'Z32K1' ],
					itemKeyPath: undefined,
					value: [ 'one name', 'another name' ],
					lang: 'Z1004'
				} );

				const expected = [ 'Z6', 'one name', 'another name' ];

				expect( store.jsonObject.main.Z2K3.Z32K1.length ).toBe( 4 );
				expect( store.jsonObject.main.Z2K3.Z32K1[ 3 ].Z31K1 ).toEqual( { Z1K1: 'Z9', Z9K1: 'Z1004' } );
				expect( hybridToCanonical( store.jsonObject.main.Z2K3.Z32K1[ 3 ].Z31K2 ) ).toEqual( expected );
			} );
		} );
	} );
} );
