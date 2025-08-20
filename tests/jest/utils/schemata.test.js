/*!
 * WikiLambda unit test suite for the schemata util
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const schemata = require( '../../../resources/ext.wikilambda.app/utils/schemata.js' );

const extractZIDs = schemata.extractZIDs;
const extractErrorData = schemata.extractErrorData;
const hybridToCanonical = schemata.hybridToCanonical;
const canonicalToHybrid = schemata.canonicalToHybrid;

describe( 'schemata', () => {
	const hybridInitialZObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/hybridInitialZObject.json' ) ) ),
		canonicalInitialZObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalInitialZObject.json' ) ) ),
		canonicalResultWithLargeZQuote = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalResultWithLargeZQuote.json' ) ) ),
		hybridResultWithLargeZQuote = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/hybridResultWithLargeZQuote.json' ) ) ),
		hybridZFunction = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/hybridZFunction.json' ) ) ),
		canonicalZFunction = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalZFunction.json' ) ) ),
		hybridZList = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/hybridZList.json' ) ) ),
		canonicalZList = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalZList.json' ) ) ),
		normalZList = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/normalZList.json' ) ) ),
		normalFunctionCall = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/normalFunctionCall.json' ) ) ),
		canonicalFunctionCall = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalFunctionCall.json' ) ) ),
		nestedErrorObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/nestedErrorObject.json' ) ) ),
		nestedErrorObjectLocalKeys = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/nestedErrorObject_LocalKeys.json' ) ) );

	describe( 'extractZIDs', () => {
		it( 'extracts ZID from normal string', () => {
			expect( extractZIDs( { Z1K1: Constants.Z_STRING, Z6K1: 'Hello, Test!' } ) ).toEqual(
				[ 'Z1', 'Z6' ]
			);
		} );

		it( 'extracts no ZID from canonical string', () => {
			expect( extractZIDs( 'Hello' ) ).toEqual(
				[]
			);
		} );

		it( 'extracts ZID from canonical reference', () => {
			expect( extractZIDs( 'Z10023' ) ).toEqual(
				[ 'Z10023' ]
			);
		} );

		it( 'extracts ZIDs from hybrid function', () => {
			expect( extractZIDs( hybridZFunction ) ).toEqual(
				[ 'Z1', 'Z9', 'Z2', 'Z6', 'Z10023', 'Z8', 'Z17', 'Z12', 'Z11', 'Z14', 'Z16', 'Z600' ]
			);
		} );

		it( 'extracts ZIDs from canonical function', () => {
			expect( extractZIDs( canonicalZFunction ) ).toEqual(
				[ 'Z1', 'Z2', 'Z6', 'Z10023', 'Z8', 'Z17', 'Z12', 'Z11', 'Z14', 'Z16', 'Z600' ]
			);
		} );
	} );

	describe( 'extractErrorData', () => {
		it( 'returns undefined if object is not a zerror but a string', () => {
			expect( extractErrorData( 'not a zerror' ) ).toBe( undefined );
		} );

		it( 'returns undefined if object is not a zerror but another object', () => {
			const anotherObject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'something else'
			};
			expect( extractErrorData( anotherObject ) ).toBe( undefined );
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
			expect( extractErrorData( oldSyntaxError ) ).toEqual( expectedErrorStructure );
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
			expect( extractErrorData( nestedErrorObject ) ).toEqual( expectedErrorStructure );
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
			expect( extractErrorData( nestedErrorObjectLocalKeys ) ).toEqual( expectedErrorStructure );
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
			expect( extractErrorData( customError ) ).toEqual( expectedErrorStructure );
		} );
	} );

	describe( 'hybridToCanonical', () => {
		it( 'canonicalizes strings', () => {
			expect( hybridToCanonical( { Z1K1: Constants.Z_STRING, Z6K1: 'Hello, Test!' } ) ).toEqual( 'Hello, Test!' );
		} );

		it( 'canonicalizes references', () => {
			expect( hybridToCanonical( { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z400' } ) ).toEqual( 'Z400' );
		} );

		it( 'canonicalizes empty reference', () => {
			expect( hybridToCanonical( { Z1K1: Constants.Z_REFERENCE, Z9K1: '' } ) ).toEqual( { Z1K1: Constants.Z_REFERENCE, Z9K1: '' } );
		} );

		it( 'canonicalizes real suspicious-lookin\' Z6s', () => {
			expect( hybridToCanonical( { Z1K1: Constants.Z_STRING, Z6K1: 'Z400' } ) ).toEqual( { Z1K1: Constants.Z_STRING, Z6K1: 'Z400' } );
		} );

		it( 'hybridToCanonical handles Z0 because the front end uses it', () => {
			expect( hybridToCanonical( { Z1K1: Constants.Z_REFERENCE, Z9K1: Constants.NEW_ZID_PLACEHOLDER } ) ).toEqual( 'Z0' );
		} );

		it( 'canonicalizes hybrid input - initial ZObject', () => {
			expect( hybridToCanonical( hybridInitialZObject ) ).toEqual( canonicalInitialZObject );
		} );

		it( 'canonicalized canonical input is identical - initial ZObject', () => {
			expect( hybridToCanonical( canonicalInitialZObject ) ).toEqual( canonicalInitialZObject );
		} );

		it( 'canonicalizes hybrid input - Large ZQuote example', () => {
			expect( hybridToCanonical( hybridResultWithLargeZQuote ) ).toEqual( canonicalResultWithLargeZQuote );
		} );

		it( 'canonicalized canonical input is identical - Large ZQuote example', () => {
			expect( hybridToCanonical( canonicalResultWithLargeZQuote ) ).toEqual( canonicalResultWithLargeZQuote );
		} );

		it( 'canonicalizes hybrid input - ZFunction example', () => {
			expect( hybridToCanonical( hybridZFunction ) ).toEqual( canonicalZFunction );
		} );

		it( 'canonicalized canonical input is identical - ZFunction example', () => {
			expect( hybridToCanonical( canonicalZFunction ) ).toEqual( canonicalZFunction );
		} );
		it( 'hybrid ZList is correctly canonicalized', () => {
			expect( hybridToCanonical( hybridZList ) ).toEqual( canonicalZList );
		} );

		it( 'normal ZList is correctly canonicalized', () => {
			expect( hybridToCanonical( normalZList ) ).toEqual( canonicalZList );
		} );

		it( 'normal function call is correctly canonicalized', () => {
			expect( hybridToCanonical( normalFunctionCall ) ).toEqual( canonicalFunctionCall );
		} );

		it( 'canonicalize an undefined string value as an empty string', () => {
			expect( hybridToCanonical( { Z1K1: Constants.Z_STRING } ) ).toEqual( '' );
		} );

		it( 'canonicalize an undefined reference ID as an empty reference object', () => {
			expect( hybridToCanonical( { Z1K1: Constants.Z_REFERENCE } ) ).toEqual( { Z1K1: Constants.Z_REFERENCE, Z9K1: '' } );
		} );

		it( 'canonicalize an undefined zobject as undefined', () => {
			expect( hybridToCanonical( undefined ) ).toEqual( undefined );
		} );
	} );

	describe( 'canonicalToHybrid', () => {
		it( 'hybridizes canonical input - initial ZObject', () => {
			expect( canonicalToHybrid( canonicalInitialZObject ) ).toEqual( hybridInitialZObject );
		} );

		it( 'hybridized hybrid input is identical - initial ZObject', () => {
			expect( canonicalToHybrid( hybridInitialZObject ) ).toEqual( hybridInitialZObject );
		} );

		it( 'hybridizes canonical input - Large ZQuote example', () => {
			expect( canonicalToHybrid( canonicalResultWithLargeZQuote ) ).toEqual( hybridResultWithLargeZQuote );
		} );

		it( 'hybridized hybrid input is identical - Large ZQuote example', () => {
			expect( canonicalToHybrid( hybridResultWithLargeZQuote ) ).toEqual( hybridResultWithLargeZQuote );
		} );

		it( 'hybridizes canonical input - ZFunction example', () => {
			expect( canonicalToHybrid( canonicalZFunction ) ).toEqual( hybridZFunction );
		} );

		it( 'hybridizes supremely sketch Z6s', () => {
			expect( canonicalToHybrid( { Z1K1: Constants.Z_STRING, Z6K1: 'Z400' } ) ).toEqual( { Z1K1: Constants.Z_STRING, Z6K1: 'Z400' } );
		} );

		it( 'hybridizes Z9s', () => {
			expect( canonicalToHybrid( 'Z400' ) ).toEqual( { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z400' } );
		} );

		it( 'hybridizes Z6s', () => {
			expect( canonicalToHybrid( 'not a reference' ) ).toEqual( { Z1K1: Constants.Z_STRING, Z6K1: 'not a reference' } );
		} );

		it( 'hybridized hybrid input is identical - ZFunction example', () => {
			expect( canonicalToHybrid( hybridZFunction ) ).toEqual( hybridZFunction );
		} );

		it( 'canonical ZList is correctly hybridized', () => {
			expect( canonicalToHybrid( canonicalZList ) ).toEqual( hybridZList );
		} );

		it( 'hybridize an undefined zobject as undefined', () => {
			expect( canonicalToHybrid( undefined ) ).toEqual( undefined );
		} );
	} );
} );
