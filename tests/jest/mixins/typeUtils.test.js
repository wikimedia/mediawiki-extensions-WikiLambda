/*!
 * WikiLambda unit test suite for the typeUtils mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const typeUtils = require( '../../../resources/ext.wikilambda.app/mixins/typeUtils.js' ).methods;

describe( 'typeUtils mixin', () => {

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

	describe( 'getZObjectType', () => {
		describe( 'Return String ZID', () => {
			it( 'when value is null', () => {
				const type = typeUtils.getZObjectType();
				expect( type ).toBe( Constants.Z_STRING );
			} );
			it( 'when value is a string', () => {
				const dummyValue = 'Just a string';

				const type = typeUtils.getZObjectType( dummyValue );
				expect( type ).toBe( Constants.Z_STRING );
			} );
		} );

		describe( 'Return reference ZID', () => {
			it( 'when value matches a ZID format', () => {
				const dummyValue = 'Z123';

				const type = typeUtils.getZObjectType( dummyValue );
				expect( type ).toBe( Constants.Z_REFERENCE );
			} );
		} );

		describe( 'Return List ZID', () => {
			it( 'when value is an empty array', () => {
				const dummyValue = [];

				const type = typeUtils.getZObjectType( dummyValue );
				expect( type ).toBe( Constants.Z_TYPED_LIST );
			} );
			it( 'when value is a filled array', () => {
				const dummyValue = [ 'dummyValue' ];

				const type = typeUtils.getZObjectType( dummyValue );
				expect( type ).toBe( Constants.Z_TYPED_LIST );
			} );
		} );

		describe( 'Return zObject ZID when value is an object', () => {
			it( 'without a zObjectType ', () => {
				const dummyValue = {};

				const type = typeUtils.getZObjectType( dummyValue );
				expect( type ).toBe( Constants.Z_OBJECT );
			} );
		} );

		describe( 'Return type included in the value', () => {
			it( 'when argumet include an object type', () => {
				const expectedReturnType = 'ZDummyReturn';
				const dummyValue = {};
				dummyValue[ Constants.Z_OBJECT_TYPE ] = expectedReturnType;

				const type = typeUtils.getZObjectType( dummyValue );
				expect( type ).toBe( expectedReturnType );
			} );
		} );
	} );

	describe( 'findKeyInArray', () => {
		describe( 'return false', () => {
			it( 'when key is not defined', () => {
				const arrayItem = typeUtils.findKeyInArray();
				expect( arrayItem ).toBeFalsy();
			} );
			it( 'when array is not defined', () => {
				const arrayItem = typeUtils.findKeyInArray( 'dummyKey' );
				expect( arrayItem ).toBeFalsy();
			} );
			it( 'when array paramether is not an array', () => {
				const arrayItem = typeUtils.findKeyInArray( 'dummyKey', 'shouldHaveBeenAnArray' );
				expect( arrayItem ).toBeFalsy();
			} );
			it( 'when array is empty aramether is not an array', () => {
				const arrayItem = typeUtils.findKeyInArray( 'dummyKey', [] );
				expect( arrayItem ).toBeFalsy();
			} );
			it( 'when key is not present in array', () => {
				const arrayItem = typeUtils.findKeyInArray( 'dummyKey', [ { key: 'different' } ] );
				expect( arrayItem ).toBeFalsy();
			} );
		} );

		describe( 'when key is a string', () => {
			it( 'returns the array item with matching key', () => {

				const dummyArray = [
					{ key: 'one', value: 'firstOccurance' },
					{ key: 'two', value: 'two' }
				];
				const arrayItem = typeUtils.findKeyInArray( 'one', dummyArray );
				expect( arrayItem.value ).toBe( dummyArray[ 0 ].value );
			} );
			it( 'returns the first instance with matching key', () => {

				const dummyArray = [
					{ key: 'one', value: 'firstOccurance' },
					{ key: 'two', value: 'two' },
					{ key: 'one', value: 'secondOccurance' }
				];
				const arrayItem = typeUtils.findKeyInArray( 'one', dummyArray );
				expect( arrayItem.value ).toBe( dummyArray[ 0 ].value );
			} );
		} );

		describe( 'when key is an array', () => {
			it( 'return the false if no key are found', () => {

				const dummyArray = [
					{ key: 'one', value: 'firstOccurance' },
					{ key: 'two', value: 'two' }
				];
				const arrayItem = typeUtils.findKeyInArray( [ 'three' ], dummyArray );
				expect( arrayItem.value ).toBeFalsy();
			} );

			it( 'return the first item of the key array if found', () => {

				const dummyArray = [
					{ key: 'one', value: 'firstOccurance' },
					{ key: 'two', value: 'two' }
				];
				const arrayItem = typeUtils.findKeyInArray( [ 'one', 'three' ], dummyArray );
				expect( arrayItem.value ).toBe( dummyArray[ 0 ].value );
			} );

			it( 'return the second item of the key array if the first is not available', () => {

				const dummyArray = [
					{ key: 'one', value: 'firstOccurance' },
					{ key: 'two', value: 'two' }
				];
				const arrayItem = typeUtils.findKeyInArray( [ 'three', 'two' ], dummyArray );
				expect( arrayItem.value ).toBe( dummyArray[ 1 ].value );
			} );

			it( 'when multiple items are found, it return the first one', () => {

				const dummyArray = [
					{ key: 'one', value: 'firstOccurance' },
					{ key: 'two', value: 'two' }
				];
				const arrayItem = typeUtils.findKeyInArray( [ 'two', 'one' ], dummyArray );
				expect( arrayItem.value ).toBe( dummyArray[ 1 ].value );
			} );
		} );
	} );

	describe( 'isValidZidFormat', () => {
		it( 'return true if string is ZID format', () => {
			const result = typeUtils.isValidZidFormat( 'Z123' );
			expect( result ).toBeTruthy();
		} );
		it( 'return false if string is not a Zid', () => {
			const result = typeUtils.isValidZidFormat( 'fakeValue' );
			expect( result ).toBeFalsy();
		} );
	} );

	describe( 'typeToString', () => {
		it( 'return empty string when type is undefined', () => {
			const type = typeUtils.typeToString( undefined );
			expect( type ).toBe( '' );
		} );
		describe( 'Return persisted type zid', () => {
			it( 'when value is string', () => {
				const type = typeUtils.typeToString( Constants.Z_STRING );
				expect( type ).toBe( Constants.Z_STRING );
			} );
			it( 'when value is a reference to a string', () => {
				const type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
					[ Constants.Z_REFERENCE_ID ]: Constants.Z_STRING
				} );
				expect( type ).toBe( Constants.Z_STRING );
			} );
			it( 'when value is a literal', () => {
				const type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_TYPE,
					[ Constants.Z_TYPE_IDENTITY ]: Constants.Z_STRING
				} );
				expect( type ).toBe( Constants.Z_STRING );
			} );
			it( 'when value is a literal and identity is a normal reference', () => {
				const type = typeUtils.typeToString( {
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

		describe( 'Return function call identity', () => {
			it( 'with zero arguments', () => {
				const type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: 'Z10000'
				} );
				expect( type ).toBe( 'Z10000()' );
			} );
			it( 'with zero arguments and normal reference', () => {
				const type = typeUtils.typeToString( {
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
			it( 'with one argument', () => {
				const type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
					[ Constants.Z_TYPED_LIST_TYPE ]: Constants.Z_STRING
				} );
				expect( type ).toBe( `${ Constants.Z_TYPED_LIST }(${ Constants.Z_STRING })` );
			} );
			it( 'with more than one argument', () => {
				const type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_PAIR,
					[ Constants.Z_TYPED_PAIR_TYPE1 ]: Constants.Z_STRING,
					[ Constants.Z_TYPED_PAIR_TYPE2 ]: Constants.Z_BOOLEAN
				} );
				expect( type ).toBe( `${ Constants.Z_TYPED_PAIR }(${ Constants.Z_STRING },${ Constants.Z_BOOLEAN })`
				);
			} );
			it( 'nested function calls - list of lists of strings', () => {
				const type = typeUtils.typeToString( {
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

		describe( 'Return function call identity with no args', () => {
			it( 'with zero arguments', () => {
				const type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: 'Z10000'
				}, true );
				expect( type ).toBe( 'Z10000' );
			} );
			it( 'with zero arguments and normal reference', () => {
				const type = typeUtils.typeToString( {
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
			it( 'with one argument', () => {
				const type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
					[ Constants.Z_TYPED_LIST_TYPE ]: Constants.Z_STRING
				}, true );
				expect( type ).toBe( Constants.Z_TYPED_LIST );
			} );
			it( 'with more than one argument', () => {
				const type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_PAIR,
					[ Constants.Z_TYPED_PAIR_TYPE1 ]: Constants.Z_STRING,
					[ Constants.Z_TYPED_PAIR_TYPE2 ]: Constants.Z_BOOLEAN
				}, true );
				expect( type ).toBe( Constants.Z_TYPED_PAIR );
			} );
			it( 'nested function calls - list of lists of strings', () => {
				const type = typeUtils.typeToString( {
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

	describe( 'isGlobalKey', () => {
		it( 'return true if string is a valid global Key', () => {
			const result = typeUtils.isGlobalKey( 'Z123K123' );
			expect( result ).toBeTruthy();
		} );
		it( 'return false if string is not a valid global Key', () => {
			const result = typeUtils.isGlobalKey( 'Z123K12K' );
			expect( result ).toBeFalsy();
		} );
	} );

	describe( 'getZidOfGlobalKey', () => {
		it( 'return Zid of a global key', () => {
			const result = typeUtils.getZidOfGlobalKey( 'Z123K123' );
			expect( result ).toBe( 'Z123' );
		} );
	} );

	describe( 'getScaffolding', () => {
		describe( 'return empty object', () => {
			it( `of reference if type is ${ Constants.Z_OBJECT }`, () => {
				const result = typeUtils.getScaffolding( Constants.Z_OBJECT );
				expect( result ).toStrictEqual( {
					[ Constants.Z_OBJECT_TYPE ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
						[ Constants.Z_REFERENCE_ID ]: ''
					}
				} );
			} );
			it( `of string if type is ${ Constants.Z_STRING }`, () => {
				const result = typeUtils.getScaffolding( Constants.Z_STRING );
				expect( result ).toBe( '' );
			} );
			it( `of monolingual string if type is ${ Constants.Z_MONOLINGUALSTRING }`, () => {
				const result = typeUtils.getScaffolding( Constants.Z_MONOLINGUALSTRING );
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
		describe( 'return undefined', () => {
			it( 'if type is other than reference, string, or monolingual string', () => {
				const result = typeUtils.getScaffolding( 'Z123' );
				expect( result ).toBeUndefined();
			} );
		} );
	} );

	describe( 'getKeyFromKeyList', () => {
		it( `return the ${ Constants.Z_KEY } object if given a key string from a list of ${ Constants.Z_KEY } items`, () => {
			const key = Constants.Z_MONOLINGUALSTRING_LANGUAGE;
			const keyObject = {
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
			const list = [
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
			const result = typeUtils.getKeyFromKeyList( key, list );
			expect( result ).toStrictEqual( keyObject );
		} );
	} );

	describe( 'getArgFromArgList', () => {
		it( `return the ${ Constants.Z_ARGUMENT } object if given a key string from a list of ${ Constants.Z_ARGUMENT } items`, () => {
			const key = 'Z801K1';
			const keyObject = {
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
			const list = [
				Constants.Z_ARGUMENT,
				keyObject
			];
			const result = typeUtils.getArgFromArgList( key, list );
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

	describe( 'isTruthyOrEqual', () => {
		describe( 'without equality parameter', () => {
			it( 'returns false if key chain is empty and object is falsy', () => {
				const object = undefined;
				const keys = [];
				expect( typeUtils.isTruthyOrEqual( object, keys ) ).toBe( false );
			} );

			it( 'returns true if key chain is empty and object is truthy', () => {
				const object = 'some value';
				const keys = [];
				expect( typeUtils.isTruthyOrEqual( object, keys ) ).toBe( true );
			} );

			it( 'returns false if value is not found by one key', () => {
				const object = {
					Z1K1: 'Z6',
					Z6K1: 'string value'
				};
				const keys = [ 'Z11K1' ];
				expect( typeUtils.isTruthyOrEqual( object, keys ) ).toBe( false );
			} );

			it( 'returns true if value is found by one key', () => {
				const object = {
					Z1K1: 'Z6',
					Z6K1: 'string value'
				};
				const keys = [ 'Z6K1' ];
				expect( typeUtils.isTruthyOrEqual( object, keys ) ).toBe( true );
			} );

			it( 'returns false if value is found by one key but empty', () => {
				const object = {
					Z1K1: 'Z6',
					Z6K1: ''
				};
				const keys = [ 'Z6K1' ];
				expect( typeUtils.isTruthyOrEqual( object, keys ) ).toBe( false );
			} );

			it( 'returns false if value is not found by a chain of keys', () => {
				const object = {
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'string value'
				};
				const keys = [ 'Z11K1', 'Z60K1', 'Z6K1' ];
				expect( typeUtils.isTruthyOrEqual( object, keys ) ).toBe( false );
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
				expect( typeUtils.isTruthyOrEqual( object, keys ) ).toBe( true );
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
				expect( typeUtils.isTruthyOrEqual( object, keys ) ).toBe( false );
			} );
		} );

		describe( 'with equality parameter', () => {
			it( 'returns false if key chain is empty and object is not equal', () => {
				const object = 'some value';
				const keys = [];
				const equals = 'something else';
				expect( typeUtils.isTruthyOrEqual( object, keys, equals ) ).toBe( false );
			} );

			it( 'returns true if key chain is empty and object is truthy', () => {
				const object = 'some value';
				const keys = [];
				const equals = 'some value';
				expect( typeUtils.isTruthyOrEqual( object, keys, equals ) ).toBe( true );
			} );

			it( 'returns false if value is not found by one key', () => {
				const object = {
					Z1K1: 'Z6',
					Z6K1: 'string value'
				};
				const keys = [ 'Z11K1' ];
				const equals = 'some value';
				expect( typeUtils.isTruthyOrEqual( object, keys, equals ) ).toBe( false );
			} );

			it( 'returns true if value is found and equal by one key', () => {
				const object = {
					Z1K1: 'Z6',
					Z6K1: 'string value'
				};
				const keys = [ 'Z6K1' ];
				const equals = 'string value';
				expect( typeUtils.isTruthyOrEqual( object, keys, equals ) ).toBe( true );
			} );

			it( 'returns false if value is found by one key but not equal', () => {
				const object = {
					Z1K1: 'Z6',
					Z6K1: 'string value'
				};
				const keys = [ 'Z6K1' ];
				const equals = 'some other value';
				expect( typeUtils.isTruthyOrEqual( object, keys, equals ) ).toBe( false );
			} );

			it( 'returns false if value is not found by a chain of keys', () => {
				const object = {
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'string value'
				};
				const keys = [ 'Z11K1', 'Z60K1', 'Z6K1' ];
				const equals = 'some value';
				expect( typeUtils.isTruthyOrEqual( object, keys, equals ) ).toBe( false );
			} );

			it( 'returns true if value is found by a chain of keys and is equal', () => {
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
				const equals = 'en';
				expect( typeUtils.isTruthyOrEqual( object, keys, equals ) ).toBe( true );
			} );

			it( 'returns false if value is found by a chain of keys but not equal', () => {
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
				const equals = 'fr';
				expect( typeUtils.isTruthyOrEqual( object, keys, equals ) ).toBe( false );
			} );
		} );
	} );
} );
