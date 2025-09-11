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

		it( 'extracts error structure from nested error object with local keys', () => {
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
				stringArgs: [ { key: 'K1', value: 'Z509' } ]
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
	} );
} );
