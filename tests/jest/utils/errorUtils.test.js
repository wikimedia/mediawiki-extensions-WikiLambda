/*!
 * WikiLambda unit test suite for the error utils file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const errorUtils = require( '../../../resources/ext.wikilambda.app/utils/errorUtils.js' );

describe( 'errorUtils', () => {
	const nestedErrorObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/nestedErrorObject.json' ) ) ),
		nestedErrorObjectLocalKeys = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/nestedErrorObject_LocalKeys.json' ) ) );

	describe( 'extractErrorData', () => {
		it( 'returns undefined if object is not a zerror but a string', () => {
			expect( errorUtils.extractErrorData( 'not a zerror' ) ).toBe( undefined );
		} );

		it( 'returns undefined if object is not a zerror but another object', () => {
			const anotherObject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'something else'
			};
			expect( errorUtils.extractErrorData( anotherObject ) ).toBe( undefined );
		} );

		it( 'extracts error structure from simple error object', () => {
			const oldSyntaxError = {
				Z1K1: 'Z5',
				Z5K1: 'Z500',
				Z5K2: {
					Z1K1: {
						Z1K1: 'Z7',
						Z7K1: 'Z885',
						Z885K1: 'Z500'
					},
					Z500K1: 'Arbitrary handcrafted message'
				}
			};
			const expectedErrorStructure = {
				errorType: 'Z500',
				children: [],
				stringArgs: [
					{ key: 'Z500K1', value: 'Arbitrary handcrafted message' }
				]
			};
			expect( errorUtils.extractErrorData( oldSyntaxError ) ).toEqual( expectedErrorStructure );
		} );

		it( 'extracts error structure from nested error object', () => {
			const expectedErrorStructure = {
				errorType: 'Z502',
				children: [ {
					errorType: 'Z509',
					children: [ {
						errorType: 'Z532',
						children: [],
						stringArgs: []
					}, {
						errorType: 'Z535',
						children: [],
						stringArgs: []
					}, {
						errorType: 'Z511',
						children: [],
						stringArgs: []
					} ],
					stringArgs: []
				} ],
				stringArgs: [ { key: 'Z502K1', value: 'Z509' } ]
			};
			expect( errorUtils.extractErrorData( nestedErrorObject ) ).toEqual( expectedErrorStructure );
		} );

		it( 'extracts error structure from nested error object with local keys, and returns global keys', () => {
			const expectedErrorStructure = {
				errorType: 'Z502',
				children: [ {
					errorType: 'Z509',
					children: [ {
						errorType: 'Z532',
						children: [],
						stringArgs: []
					}, {
						errorType: 'Z535',
						children: [],
						stringArgs: []
					}, {
						errorType: 'Z511',
						children: [],
						stringArgs: []
					} ],
					stringArgs: []
				} ],
				stringArgs: [ { key: 'Z502K1', value: 'Z509' } ]
			};
			expect( errorUtils.extractErrorData( nestedErrorObjectLocalKeys ) ).toEqual( expectedErrorStructure );
		} );

		it( 'extracts error structure from custom build error object', () => {
			const customError = {
				Z1K1: 'Z5',
				Z5K1: 'Z10000',
				Z5K2: {
					Z1K1: {
						Z1K1: 'Z7',
						Z7K1: 'Z885',
						Z885K1: 'Z10000'
					},
					Z10000K1: 'some',
					Z10000K2: 'custom',
					Z10000K3: 'error'
				}
			};

			const expectedErrorStructure = {
				errorType: 'Z10000',
				children: [],
				stringArgs: [
					{ key: 'Z10000K1', value: 'some' },
					{ key: 'Z10000K2', value: 'custom' },
					{ key: 'Z10000K3', value: 'error' }
				]
			};
			expect( errorUtils.extractErrorData( customError ) ).toEqual( expectedErrorStructure );
		} );

		it( 'keeps the local keys of an error object with a literal error type', () => {
			const literalTypeError = {
				Z1K1: 'Z5',
				Z5K1: {
					Z1K1: 'Z50',
					Z50K2: 'Z500'
				},
				Z5K2: {
					Z1K1: {
						Z1K1: 'Z7',
						Z7K1: 'Z885',
						Z885K1: 'Z500'
					},
					K1: 'Arbitrary handcrafted message'
				}
			};

			const expectedErrorStructure = {
				errorType: { Z1K1: 'Z50', Z50K2: 'Z500' },
				children: [],
				stringArgs: [
					{ key: 'K1', value: 'Arbitrary handcrafted message' }
				]
			};
			expect( errorUtils.extractErrorData( literalTypeError ) ).toEqual( expectedErrorStructure );
		} );
	} );

	describe( 'extractWarningsData', () => {
		const warning = ( zid, args = {} ) => ( {
			Z1K1: 'Z5',
			Z5K1: zid,
			Z5K2: Object.assign( { Z1K1: { Z1K1: 'Z7', Z7K1: 'Z885', Z885K1: zid } }, args )
		} );

		it( 'returns an empty array if there are no warnings', () => {
			expect( errorUtils.extractWarningsData( undefined ) ).toEqual( [] );
		} );

		it( 'returns an empty array if the list of warnings is empty', () => {
			expect( errorUtils.extractWarningsData( [ 'Z5' ] ) ).toEqual( [] );
		} );

		it( 'returns an empty array if the value is not an error', () => {
			expect( errorUtils.extractWarningsData( 'Z24' ) ).toEqual( [] );
		} );

		it( 'extracts the data of every warning in the list', () => {
			const warnings = [ 'Z5', warning( 'Z591', { Z591K1: '480 MiB' } ), warning( 'Z593' ) ];

			expect( errorUtils.extractWarningsData( warnings ) ).toEqual( [
				{ errorType: 'Z591', children: [], stringArgs: [ { key: 'Z591K1', value: '480 MiB' } ] },
				{ errorType: 'Z593', children: [], stringArgs: [] }
			] );
		} );

		it( 'returns global keys for the warnings which use local keys', () => {
			const warnings = [
				'Z5',
				warning( 'Z591', { K1: '480 MiB', K2: '512 MiB' } ),
				warning( 'Z592', { Z592K1: '88212', Z592K2: '10240' } )
			];

			expect( errorUtils.extractWarningsData( warnings ) ).toEqual( [ {
				errorType: 'Z591',
				children: [],
				stringArgs: [
					{ key: 'Z591K1', value: '480 MiB' },
					{ key: 'Z591K2', value: '512 MiB' }
				]
			}, {
				errorType: 'Z592',
				children: [],
				stringArgs: [
					{ key: 'Z592K1', value: '88212' },
					{ key: 'Z592K2', value: '10240' }
				]
			} ] );
		} );

		it( 'ignores the items of the list which are not errors', () => {
			const warnings = [ 'Z5', warning( 'Z591' ), 'Z24', { Z1K1: 'Z6', Z6K1: 'not a warning' } ];

			expect( errorUtils.extractWarningsData( warnings ) ).toEqual( [
				{ errorType: 'Z591', children: [], stringArgs: [] }
			] );
		} );

		it( 'extracts the data of a single warning which is not in a list', () => {
			expect( errorUtils.extractWarningsData( warning( 'Z591' ) ) ).toEqual( [
				{ errorType: 'Z591', children: [], stringArgs: [] }
			] );
		} );
	} );
} );
