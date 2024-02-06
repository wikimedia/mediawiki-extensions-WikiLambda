/*!
 * WikiLambda unit test suite for the typeUtils mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var typeUtils = require( '../../../resources/ext.wikilambda.edit/mixins/typeUtils.js' ).methods,
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'typeUtils mixin', function () {

	describe( 'isGenericType', () => {
		it( 'returns false if canonical referenced type', () => {
			const type = Constants.Z_MONOLINGUALSTRING;
			const isGeneric = typeUtils.isGenericType( type );
			expect( isGeneric ).toBe( false );
		} );

		it( 'returns false if normal referenced type', () => {
			const type = {
				Z1K1: Constants.Z_REFERENCE,
				Z9K1: Constants.Z_MONOLINGUALSTRING
			};
			const isGeneric = typeUtils.isGenericType( type );
			expect( isGeneric ).toBe( false );
		} );

		it( 'returns true if function call', () => {
			const type = {
				Z1K1: Constants.Z_FUNCTION_CALL,
				Z7K1: Constants.Z_TYPED_LIST,
				Z881K1: Constants.Z_STRING
			};
			const isGeneric = typeUtils.isGenericType( type );
			expect( isGeneric ).toBe( true );
		} );
	} );

	describe( 'getZObjectType', function () {
		describe( 'Return String ZID', function () {
			it( 'when value is null', function () {
				var type = typeUtils.getZObjectType();
				expect( type ).toBe( Constants.Z_STRING );
			} );
			it( 'when value is a string', function () {
				var dummyValue = 'Just a string';

				var type = typeUtils.getZObjectType( dummyValue );
				expect( type ).toBe( Constants.Z_STRING );
			} );
		} );

		describe( 'Return reference ZID', function () {
			it( 'when value matches a ZID format', function () {
				var dummyValue = 'Z123';

				var type = typeUtils.getZObjectType( dummyValue );
				expect( type ).toBe( Constants.Z_REFERENCE );
			} );
		} );

		describe( 'Return List ZID', function () {
			it( 'when value is an empty array', function () {
				var dummyValue = [];

				var type = typeUtils.getZObjectType( dummyValue );
				expect( type ).toBe( Constants.Z_TYPED_LIST );
			} );
			it( 'when value is a filled array', function () {
				var dummyValue = [ 'dummyValue' ];

				var type = typeUtils.getZObjectType( dummyValue );
				expect( type ).toBe( Constants.Z_TYPED_LIST );
			} );
		} );

		describe( 'Return zObject ZID when value is an object', function () {
			it( 'without a zObjectType ', function () {
				var dummyValue = {};

				var type = typeUtils.getZObjectType( dummyValue );
				expect( type ).toBe( Constants.Z_OBJECT );
			} );
		} );

		describe( 'Return type included in the value', function () {
			it( 'when argumet include an object type', function () {
				var expectedReturnType = 'ZDummyReturn';
				var dummyValue = {};
				dummyValue[ Constants.Z_OBJECT_TYPE ] = expectedReturnType;

				var type = typeUtils.getZObjectType( dummyValue );
				expect( type ).toBe( expectedReturnType );
			} );
		} );
	} );

	describe( 'findKeyInArray', function () {
		describe( 'return false', function () {
			it( 'when key is not defined', function () {
				var arrayItem = typeUtils.findKeyInArray();
				expect( arrayItem ).toBeFalsy();
			} );
			it( 'when array is not defined', function () {
				var arrayItem = typeUtils.findKeyInArray( 'dummyKey' );
				expect( arrayItem ).toBeFalsy();
			} );
			it( 'when array paramether is not an array', function () {
				var arrayItem = typeUtils.findKeyInArray( 'dummyKey', 'shouldHaveBeenAnArray' );
				expect( arrayItem ).toBeFalsy();
			} );
			it( 'when array is empty aramether is not an array', function () {
				var arrayItem = typeUtils.findKeyInArray( 'dummyKey', [] );
				expect( arrayItem ).toBeFalsy();
			} );
			it( 'when key is not present in array', function () {
				var arrayItem = typeUtils.findKeyInArray( 'dummyKey', [ { key: 'different' } ] );
				expect( arrayItem ).toBeFalsy();
			} );
		} );

		describe( 'when key is a string', function () {
			it( 'returns the array item with matching key', function () {

				var dummyArray = [
					{ key: 'one', value: 'firstOccurance' },
					{ key: 'two', value: 'two' }
				];
				var arrayItem = typeUtils.findKeyInArray( 'one', dummyArray );
				expect( arrayItem.value ).toBe( dummyArray[ 0 ].value );
			} );
			it( 'returns the first instance with matching key', function () {

				var dummyArray = [
					{ key: 'one', value: 'firstOccurance' },
					{ key: 'two', value: 'two' },
					{ key: 'one', value: 'secondOccurance' }
				];
				var arrayItem = typeUtils.findKeyInArray( 'one', dummyArray );
				expect( arrayItem.value ).toBe( dummyArray[ 0 ].value );
			} );
		} );

		describe( 'when key is an array', function () {
			it( 'return the false if no key are found', function () {

				var dummyArray = [
					{ key: 'one', value: 'firstOccurance' },
					{ key: 'two', value: 'two' }
				];
				var arrayItem = typeUtils.findKeyInArray( [ 'three' ], dummyArray );
				expect( arrayItem.value ).toBeFalsy();
			} );

			it( 'return the first item of the key array if found', function () {

				var dummyArray = [
					{ key: 'one', value: 'firstOccurance' },
					{ key: 'two', value: 'two' }
				];
				var arrayItem = typeUtils.findKeyInArray( [ 'one', 'three' ], dummyArray );
				expect( arrayItem.value ).toBe( dummyArray[ 0 ].value );
			} );

			it( 'return the second item of the key array if the first is not available', function () {

				var dummyArray = [
					{ key: 'one', value: 'firstOccurance' },
					{ key: 'two', value: 'two' }
				];
				var arrayItem = typeUtils.findKeyInArray( [ 'three', 'two' ], dummyArray );
				expect( arrayItem.value ).toBe( dummyArray[ 1 ].value );
			} );

			it( 'when multiple items are found, it return the first one', function () {

				var dummyArray = [
					{ key: 'one', value: 'firstOccurance' },
					{ key: 'two', value: 'two' }
				];
				var arrayItem = typeUtils.findKeyInArray( [ 'two', 'one' ], dummyArray );
				expect( arrayItem.value ).toBe( dummyArray[ 1 ].value );
			} );
		} );
	} );

	describe( 'isValidZidFormat', function () {
		it( 'return true if string is ZID format', function () {
			var result = typeUtils.isValidZidFormat( 'Z123' );
			expect( result ).toBeTruthy();
		} );
		it( 'return false if string is not a Zid', function () {
			var result = typeUtils.isValidZidFormat( 'fakeValue' );
			expect( result ).toBeFalsy();
		} );
	} );

	describe( 'typeToString', function () {
		describe( 'Return persisted type zid', function () {
			it( 'when value is string', function () {
				var type = typeUtils.typeToString( Constants.Z_STRING );
				expect( type ).toBe( Constants.Z_STRING );
			} );
			it( 'when value is a reference to a string', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
					[ Constants.Z_REFERENCE_ID ]: Constants.Z_STRING
				} );
				expect( type ).toBe( Constants.Z_STRING );
			} );
			it( 'when value is a literal', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_TYPE,
					[ Constants.Z_TYPE_IDENTITY ]: Constants.Z_STRING
				} );
				expect( type ).toBe( Constants.Z_STRING );
			} );
			it( 'when value is a literal and identity is a normal reference', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
						[ Constants.Z_REFERENCE_ID ]: Constants.Z_TYPE
					},
					[ Constants.Z_TYPE_IDENTITY ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
						[ Constants.Z_REFERENCE_ID ]: Constants.Z_STRING
					}
				} );
				expect( type ).toBe( Constants.Z_STRING );
			} );
		} );

		describe( 'Return function call identity', function () {
			it( 'with zero arguments', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: 'Z10000'
				} );
				expect( type ).toBe( 'Z10000()' );
			} );
			it( 'with zero arguments and normal reference', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
						[ Constants.Z_REFERENCE_ID ]: Constants.Z_FUNCTION_CALL
					},
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
						[ Constants.Z_REFERENCE_ID ]: 'Z10000'
					}
				} );
				expect( type ).toBe( 'Z10000()' );
			} );
			it( 'with one argument', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
					[ Constants.Z_TYPED_LIST_TYPE ]: Constants.Z_STRING
				} );
				expect( type ).toBe( `${ Constants.Z_TYPED_LIST }(${ Constants.Z_STRING })` );
			} );
			it( 'with more than one argument', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_PAIR,
					[ Constants.Z_TYPED_PAIR_TYPE1 ]: Constants.Z_STRING,
					[ Constants.Z_TYPED_PAIR_TYPE2 ]: Constants.Z_BOOLEAN
				} );
				expect( type ).toBe( `${ Constants.Z_TYPED_PAIR }(${ Constants.Z_STRING },${ Constants.Z_BOOLEAN })`
				);
			} );
			it( 'nested function calls - list of lists of strings', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
					[ Constants.Z_TYPED_LIST_TYPE ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
						[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
						[ Constants.Z_TYPED_LIST_TYPE ]: Constants.Z_STRING
					}
				} );
				expect( type ).toBe( `${ Constants.Z_TYPED_LIST }(${ Constants.Z_TYPED_LIST }(${ Constants.Z_STRING }))`
				);
			} );
		} );

		describe( 'Return function call identity with no args', function () {
			it( 'with zero arguments', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: 'Z10000'
				}, true );
				expect( type ).toBe( 'Z10000' );
			} );
			it( 'with zero arguments and normal reference', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
						[ Constants.Z_REFERENCE_ID ]: Constants.Z_FUNCTION_CALL
					},
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
						[ Constants.Z_REFERENCE_ID ]: 'Z10000'
					}
				}, true );
				expect( type ).toBe( 'Z10000' );
			} );
			it( 'with one argument', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
					[ Constants.Z_TYPED_LIST_TYPE ]: Constants.Z_STRING
				}, true );
				expect( type ).toBe( Constants.Z_TYPED_LIST );
			} );
			it( 'with more than one argument', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_PAIR,
					[ Constants.Z_TYPED_PAIR_TYPE1 ]: Constants.Z_STRING,
					[ Constants.Z_TYPED_PAIR_TYPE2 ]: Constants.Z_BOOLEAN
				}, true );
				expect( type ).toBe( Constants.Z_TYPED_PAIR );
			} );
			it( 'nested function calls - list of lists of strings', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
					[ Constants.Z_TYPED_LIST_TYPE ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
						[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
						[ Constants.Z_TYPED_LIST_TYPE ]: Constants.Z_STRING
					}
				}, true );
				expect( type ).toBe( Constants.Z_TYPED_LIST );
			} );
		} );

		describe( 'Return argument reference key', () => {
			it( 'returns the referenced key', () => {
				const type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_ARGUMENT_REFERENCE,
					[ Constants.Z_ARGUMENT_REFERENCE_KEY ]: 'Z10000K1'
				}, true );
				expect( type ).toBe( 'Z10000K1' );
			} );
		} );

		describe( 'Not a type', () => {
			it( 'returns undefined', () => {
				const type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_NATURAL_LANGUAGE,
					[ Constants.Z_NATURAL_LANGUAGE_ISO_CODE ]: 'en'
				}, true );
				expect( type ).toBe( undefined );
			} );
		} );
	} );

	describe( 'isGlobalKey', function () {
		it( 'return true if string is a valid global Key', function () {
			var result = typeUtils.isGlobalKey( 'Z123K123' );
			expect( result ).toBeTruthy();
		} );
		it( 'return false if string is not a valid global Key', function () {
			var result = typeUtils.isGlobalKey( 'Z123K12K' );
			expect( result ).toBeFalsy();
		} );
	} );

	describe( 'getZidOfGlobalKey', function () {
		it( 'return Zid of a global key', function () {
			var result = typeUtils.getZidOfGlobalKey( 'Z123K123' );
			expect( result ).toBe( 'Z123' );
		} );
	} );

	describe( 'getScaffolding', function () {
		describe( 'return empty object', function () {
			it( `of reference if type is ${ Constants.Z_OBJECT }`, function () {
				var result = typeUtils.getScaffolding( Constants.Z_OBJECT );
				expect( result ).toStrictEqual( {
					[ Constants.Z_OBJECT_TYPE ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
						[ Constants.Z_REFERENCE_ID ]: ''
					}
				} );
			} );
			it( `of string if type is ${ Constants.Z_STRING }`, function () {
				var result = typeUtils.getScaffolding( Constants.Z_STRING );
				expect( result ).toBe( '' );
			} );
			it( `of monolingual string if type is ${ Constants.Z_MONOLINGUALSTRING }`, function () {
				var result = typeUtils.getScaffolding( Constants.Z_MONOLINGUALSTRING );
				expect( result ).toStrictEqual( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
					[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
						[ Constants.Z_REFERENCE_ID ]: ''
					},
					[ Constants.Z_MONOLINGUALSTRING_VALUE ]: ''
				} );
			} );
		} );
		describe( 'return undefined', function () {
			it( 'if type is other than reference, string, or monolingual string', function () {
				var result = typeUtils.getScaffolding( 'Z123' );
				expect( result ).toBeUndefined();
			} );
		} );
	} );

	describe( 'getKeyFromKeyList', function () {
		it( `return the ${ Constants.Z_KEY } object if given a key string from a list of ${ Constants.Z_KEY } items`, function () {
			var key = Constants.Z_MONOLINGUALSTRING_LANGUAGE;
			var keyObject = {
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_KEY,
				[ Constants.Z_KEY_TYPE ]: Constants.Z_NATURAL_LANGUAGE,
				[ Constants.Z_KEY_ID ]: Constants.Z_MONOLINGUALSTRING_LANGUAGE,
				[ Constants.Z_KEY_LABEL ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
					[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
						Constants.Z_MONOLINGUALSTRING,
						{
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
							[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
							[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'language'
						}
					]
				}
			};
			var list = [
				Constants.Z_KEY,
				keyObject,
				{
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_KEY,
					[ Constants.Z_KEY_TYPE ]: Constants.Z_STRING,
					[ Constants.Z_KEY_ID ]: Constants.Z_MONOLINGUALSTRING_VALUE,
					[ Constants.Z_KEY_LABEL ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
						[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
							Constants.Z_MONOLINGUALSTRING,
							{
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
								[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
								[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'text'
							}
						]
					}
				}
			];
			var result = typeUtils.getKeyFromKeyList( key, list );
			expect( result ).toStrictEqual( keyObject );
		} );
	} );

	describe( 'getArgFromArgList', function () {
		it( `return the ${ Constants.Z_ARGUMENT } object if given a key string from a list of ${ Constants.Z_ARGUMENT } items`, function () {
			var key = 'Z801K1';
			var keyObject = {
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_ARGUMENT,
				[ Constants.Z_ARGUMENT_TYPE ]: Constants.Z_OBJECT,
				[ Constants.Z_ARGUMENT_KEY ]: 'Z801K1',
				[ Constants.Z_ARGUMENT_LABEL ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
					[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
						Constants.Z_MONOLINGUALSTRING,
						{
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
							[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
							[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'input argument'
						}
					]
				}
			};
			var list = [
				Constants.Z_ARGUMENT,
				keyObject
			];
			var result = typeUtils.getArgFromArgList( key, list );
			expect( result ).toStrictEqual( keyObject );
		} );
	} );

	describe( 'isKeyTypedListType', () => {
		it( 'returns true if key is 0', () => {
			expect( typeUtils.isKeyTypedListType( '0' ) ).toBe( true );
		} );
		it( 'returns false if key is other than 0', () => {
			expect( typeUtils.isKeyTypedListType( '1' ) ).toBe( false );
			expect( typeUtils.isKeyTypedListType( '5' ) ).toBe( false );
		} );
	} );

	describe( 'isKeyTypedListItem', () => {
		it( 'returns false if key is 0', () => {
			expect( typeUtils.isKeyTypedListItem( '0' ) ).toBe( false );
		} );
		it( 'returns true if key is other than 0', () => {
			expect( typeUtils.isKeyTypedListItem( '1' ) ).toBe( true );
			expect( typeUtils.isKeyTypedListItem( '5' ) ).toBe( true );
		} );
	} );

	describe( 'initializePayloadForType', () => {
		it( 'initializes payload for linked types', () => {
			const type = Constants.Z_TESTER;
			const expected = {
				type: Constants.Z_REFERENCE
			};
			const payload = typeUtils.initializePayloadForType( type );
			expect( payload ).toEqual( expected );
		} );

		it( 'initializes payload for literal types', () => {
			const type = Constants.Z_MONOLINGUALSTRING;
			const expected = {
				type: Constants.Z_MONOLINGUALSTRING
			};
			const payload = typeUtils.initializePayloadForType( type );
			expect( payload ).toEqual( expected );
		} );

		it( 'initializes payload for typed list', () => {
			const type = {
				Z1K1: Constants.Z_FUNCTION_CALL,
				Z7K1: Constants.Z_TYPED_LIST,
				Z881K1: Constants.Z_STRING
			};
			const expected = {
				type: Constants.Z_TYPED_LIST,
				value: Constants.Z_STRING
			};
			const payload = typeUtils.initializePayloadForType( type );
			expect( payload ).toEqual( expected );
		} );

		it( 'initializes payload for typed pair', () => {
			const type = {
				Z1K1: Constants.Z_FUNCTION_CALL,
				Z7K1: Constants.Z_TYPED_PAIR,
				Z882K1: Constants.Z_STRING,
				Z882K2: Constants.Z_BOOLEAN
			};
			const expected = {
				type: Constants.Z_TYPED_PAIR,
				values: [ Constants.Z_STRING, Constants.Z_BOOLEAN ]
			};
			const payload = typeUtils.initializePayloadForType( type );
			expect( payload ).toEqual( expected );
		} );

		it( 'initializes payload for typed map', () => {
			const type = {
				Z1K1: Constants.Z_FUNCTION_CALL,
				Z7K1: Constants.Z_TYPED_MAP,
				Z883K1: Constants.Z_STRING,
				Z883K2: Constants.Z_BOOLEAN
			};
			const expected = {
				type: Constants.Z_TYPED_MAP,
				values: [ Constants.Z_STRING, Constants.Z_BOOLEAN ]
			};
			const payload = typeUtils.initializePayloadForType( type );
			expect( payload ).toEqual( expected );
		} );
	} );

	describe( 'isValueTruthy', () => {
		it( 'returns false if key chain is empty and object is falsy', () => {
			const object = undefined;
			const keys = [];
			expect( typeUtils.isValueTruthy( object, keys ) ).toBe( false );
		} );

		it( 'returns true if key chain is empty and object is truthy', () => {
			const object = 'some value';
			const keys = [];
			expect( typeUtils.isValueTruthy( object, keys ) ).toBe( true );
		} );

		it( 'returns false if value is not found by one key', () => {
			const object = {
				Z1K1: 'Z6',
				Z6K1: 'string value'
			};
			const keys = [ 'Z11K1' ];
			expect( typeUtils.isValueTruthy( object, keys ) ).toBe( false );
		} );

		it( 'returns true if value is found by one key', () => {
			const object = {
				Z1K1: 'Z6',
				Z6K1: 'string value'
			};
			const keys = [ 'Z6K1' ];
			expect( typeUtils.isValueTruthy( object, keys ) ).toBe( true );
		} );

		it( 'returns false if value is found by one key but empty', () => {
			const object = {
				Z1K1: 'Z6',
				Z6K1: ''
			};
			const keys = [ 'Z6K1' ];
			expect( typeUtils.isValueTruthy( object, keys ) ).toBe( false );
		} );

		it( 'returns false if value is not found by a chain of keys', () => {
			const object = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'string value'
			};
			const keys = [ 'Z11K1', 'Z60K1', 'Z6K1' ];
			expect( typeUtils.isValueTruthy( object, keys ) ).toBe( false );
		} );

		it( 'returns true if value is found by a chain of keys', () => {
			const object = {
				Z1K1: 'Z11',
				Z11K1: {
					Z1K1: 'Z60',
					Z60K1: {
						Z1K1: 'Z6',
						Z6K1: 'en'
					}
				},
				Z11K2: 'string value'
			};
			const keys = [ 'Z11K1', 'Z60K1', 'Z6K1' ];
			expect( typeUtils.isValueTruthy( object, keys ) ).toBe( true );
		} );

		it( 'returns false if value is found by a chain of keys but empty', () => {
			const object = {
				Z1K1: 'Z11',
				Z11K1: {
					Z1K1: 'Z60',
					Z60K1: {
						Z1K1: 'Z6',
						Z6K1: ''
					}
				},
				Z11K2: 'string value'
			};
			const keys = [ 'Z11K1', 'Z60K1', 'Z6K1' ];
			expect( typeUtils.isValueTruthy( object, keys ) ).toBe( false );
		} );
	} );
} );
