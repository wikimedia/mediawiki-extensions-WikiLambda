/*!
 * WikiLambda unit test suite for the typeUtils mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const {
	isGenericType,
	isValidZidFormat,
	typeToString,
	isGlobalKey,
	getZidOfGlobalKey,
	getScaffolding,
	getKeyFromKeyList,
	getArgFromArgList,
	isKeyTypedListType,
	isKeyTypedListItem,
	initializePayloadForType,
	isTruthyOrEqual
} = require( '../../../resources/ext.wikilambda.app/utils/typeUtils.js' );

describe( 'typeUtils', () => {

	describe( 'isGenericType', () => {
		it( 'returns false if canonical referenced type', () => {
			const type = Constants.Z_MONOLINGUALSTRING;
			const isGeneric = isGenericType( type );
			expect( isGeneric ).toBe( false );
		} );

		it( 'returns false if normal referenced type', () => {
			const type = {
				Z1K1: Constants.Z_REFERENCE,
				Z9K1: Constants.Z_MONOLINGUALSTRING
			};
			const isGeneric = isGenericType( type );
			expect( isGeneric ).toBe( false );
		} );

		it( 'returns true if function call', () => {
			const type = {
				Z1K1: Constants.Z_FUNCTION_CALL,
				Z7K1: Constants.Z_TYPED_LIST,
				Z881K1: Constants.Z_STRING
			};
			const isGeneric = isGenericType( type );
			expect( isGeneric ).toBe( true );
		} );
	} );

	describe( 'isValidZidFormat', () => {
		it( 'return true if string is ZID format', () => {
			const result = isValidZidFormat( 'Z123' );
			expect( result ).toBeTruthy();
		} );
		it( 'return false if string is not a Zid', () => {
			const result = isValidZidFormat( 'fakeValue' );
			expect( result ).toBeFalsy();
		} );
	} );

	describe( 'typeToString', () => {
		it( 'return empty string when type is undefined', () => {
			const type = typeToString( undefined );
			expect( type ).toBe( '' );
		} );
		describe( 'Return persisted type zid', () => {
			it( 'when value is string', () => {
				const type = typeToString( Constants.Z_STRING );
				expect( type ).toBe( Constants.Z_STRING );
			} );
			it( 'when value is a reference to a string', () => {
				const type = typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
					[ Constants.Z_REFERENCE_ID ]: Constants.Z_STRING
				} );
				expect( type ).toBe( Constants.Z_STRING );
			} );
			it( 'when value is a literal', () => {
				const type = typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_TYPE,
					[ Constants.Z_TYPE_IDENTITY ]: Constants.Z_STRING
				} );
				expect( type ).toBe( Constants.Z_STRING );
			} );
			it( 'when value is a literal and identity is a normal reference', () => {
				const type = typeToString( {
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
				const type = typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: 'Z10000'
				} );
				expect( type ).toBe( 'Z10000()' );
			} );
			it( 'with zero arguments and normal reference', () => {
				const type = typeToString( {
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
				const type = typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
					[ Constants.Z_TYPED_LIST_TYPE ]: Constants.Z_STRING
				} );
				expect( type ).toBe( `${ Constants.Z_TYPED_LIST }(${ Constants.Z_STRING })` );
			} );
			it( 'with more than one argument', () => {
				const type = typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_PAIR,
					[ Constants.Z_TYPED_PAIR_TYPE1 ]: Constants.Z_STRING,
					[ Constants.Z_TYPED_PAIR_TYPE2 ]: Constants.Z_BOOLEAN
				} );
				expect( type ).toBe( `${ Constants.Z_TYPED_PAIR }(${ Constants.Z_STRING },${ Constants.Z_BOOLEAN })`
				);
			} );
			it( 'nested function calls - list of lists of strings', () => {
				const type = typeToString( {
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
				const type = typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: 'Z10000'
				}, true );
				expect( type ).toBe( 'Z10000' );
			} );
			it( 'with zero arguments and normal reference', () => {
				const type = typeToString( {
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
				const type = typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
					[ Constants.Z_TYPED_LIST_TYPE ]: Constants.Z_STRING
				}, true );
				expect( type ).toBe( Constants.Z_TYPED_LIST );
			} );
			it( 'with more than one argument', () => {
				const type = typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_PAIR,
					[ Constants.Z_TYPED_PAIR_TYPE1 ]: Constants.Z_STRING,
					[ Constants.Z_TYPED_PAIR_TYPE2 ]: Constants.Z_BOOLEAN
				}, true );
				expect( type ).toBe( Constants.Z_TYPED_PAIR );
			} );
			it( 'nested function calls - list of lists of strings', () => {
				const type = typeToString( {
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
				const type = typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_ARGUMENT_REFERENCE,
					[ Constants.Z_ARGUMENT_REFERENCE_KEY ]: 'Z10000K1'
				}, true );
				expect( type ).toBe( 'Z10000K1' );
			} );
		} );

		describe( 'Not a type', () => {
			it( 'returns an empty string', () => {
				const type = typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_NATURAL_LANGUAGE,
					[ Constants.Z_NATURAL_LANGUAGE_ISO_CODE ]: 'en'
				}, true );
				expect( type ).toBe( '' );
			} );
		} );
	} );

	describe( 'isGlobalKey', () => {
		it( 'return true if string is a valid global Key', () => {
			const result = isGlobalKey( 'Z123K123' );
			expect( result ).toBeTruthy();
		} );
		it( 'return false if string is not a valid global Key', () => {
			const result = isGlobalKey( 'Z123K12K' );
			expect( result ).toBeFalsy();
		} );
	} );

	describe( 'getZidOfGlobalKey', () => {
		it( 'return Zid of a global key', () => {
			const result = getZidOfGlobalKey( 'Z123K123' );
			expect( result ).toBe( 'Z123' );
		} );
	} );

	describe( 'getScaffolding', () => {
		describe( 'return empty object', () => {
			it( `of reference if type is ${ Constants.Z_OBJECT }`, () => {
				const result = getScaffolding( Constants.Z_OBJECT );
				expect( result ).toStrictEqual( {
					[ Constants.Z_OBJECT_TYPE ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
						[ Constants.Z_REFERENCE_ID ]: ''
					}
				} );
			} );
			it( `of normal string if type is ${ Constants.Z_STRING }`, () => {
				const result = getScaffolding( Constants.Z_STRING );
				expect( result ).toStrictEqual( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
					[ Constants.Z_STRING_VALUE ]: ''
				} );
			} );
			it( `of monolingual string if type is ${ Constants.Z_MONOLINGUALSTRING }`, () => {
				const result = getScaffolding( Constants.Z_MONOLINGUALSTRING );
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
				const result = getScaffolding( 'Z123' );
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
			const result = getKeyFromKeyList( key, list );
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
			const result = getArgFromArgList( key, list );
			expect( result ).toStrictEqual( keyObject );
		} );
	} );

	describe( 'isKeyTypedListType', () => {
		it( 'returns true if key is 0', () => {
			expect( isKeyTypedListType( '0' ) ).toBe( true );
		} );
		it( 'returns false if key is other than 0', () => {
			expect( isKeyTypedListType( '1' ) ).toBe( false );
			expect( isKeyTypedListType( '5' ) ).toBe( false );
		} );
	} );

	describe( 'isKeyTypedListItem', () => {
		it( 'returns false if key is 0', () => {
			expect( isKeyTypedListItem( '0' ) ).toBe( false );
		} );
		it( 'returns true if key is other than 0', () => {
			expect( isKeyTypedListItem( '1' ) ).toBe( true );
			expect( isKeyTypedListItem( '5' ) ).toBe( true );
		} );
	} );

	describe( 'initializePayloadForType', () => {
		it( 'initializes payload for linked types', () => {
			const type = Constants.Z_TESTER;
			const expected = {
				type: Constants.Z_REFERENCE
			};
			const payload = initializePayloadForType( type );
			expect( payload ).toEqual( expected );
		} );

		it( 'initializes payload for literal types', () => {
			const type = Constants.Z_MONOLINGUALSTRING;
			const expected = {
				type: Constants.Z_MONOLINGUALSTRING
			};
			const payload = initializePayloadForType( type );
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
			const payload = initializePayloadForType( type );
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
			const payload = initializePayloadForType( type );
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
			const payload = initializePayloadForType( type );
			expect( payload ).toEqual( expected );
		} );
	} );

	describe( 'isTruthyOrEqual', () => {
		describe( 'without equality parameter', () => {
			it( 'returns false if key chain is empty and object is falsy', () => {
				const object = undefined;
				const keys = [];
				expect( isTruthyOrEqual( object, keys ) ).toBe( false );
			} );

			it( 'returns true if key chain is empty and object is truthy', () => {
				const object = 'some value';
				const keys = [];
				expect( isTruthyOrEqual( object, keys ) ).toBe( true );
			} );

			it( 'returns false if value is not found by one key', () => {
				const object = {
					Z1K1: 'Z6',
					Z6K1: 'string value'
				};
				const keys = [ 'Z11K1' ];
				expect( isTruthyOrEqual( object, keys ) ).toBe( false );
			} );

			it( 'returns true if value is found by one key', () => {
				const object = {
					Z1K1: 'Z6',
					Z6K1: 'string value'
				};
				const keys = [ 'Z6K1' ];
				expect( isTruthyOrEqual( object, keys ) ).toBe( true );
			} );

			it( 'returns false if value is found by one key but empty', () => {
				const object = {
					Z1K1: 'Z6',
					Z6K1: ''
				};
				const keys = [ 'Z6K1' ];
				expect( isTruthyOrEqual( object, keys ) ).toBe( false );
			} );

			it( 'returns false if value is not found by a chain of keys', () => {
				const object = {
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'string value'
				};
				const keys = [ 'Z11K1', 'Z60K1', 'Z6K1' ];
				expect( isTruthyOrEqual( object, keys ) ).toBe( false );
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
				expect( isTruthyOrEqual( object, keys ) ).toBe( true );
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
				expect( isTruthyOrEqual( object, keys ) ).toBe( false );
			} );
		} );

		describe( 'with equality parameter', () => {
			it( 'returns false if key chain is empty and object is not equal', () => {
				const object = 'some value';
				const keys = [];
				const equals = 'something else';
				expect( isTruthyOrEqual( object, keys, equals ) ).toBe( false );
			} );

			it( 'returns true if key chain is empty and object is truthy', () => {
				const object = 'some value';
				const keys = [];
				const equals = 'some value';
				expect( isTruthyOrEqual( object, keys, equals ) ).toBe( true );
			} );

			it( 'returns false if value is not found by one key', () => {
				const object = {
					Z1K1: 'Z6',
					Z6K1: 'string value'
				};
				const keys = [ 'Z11K1' ];
				const equals = 'some value';
				expect( isTruthyOrEqual( object, keys, equals ) ).toBe( false );
			} );

			it( 'returns true if value is found and equal by one key', () => {
				const object = {
					Z1K1: 'Z6',
					Z6K1: 'string value'
				};
				const keys = [ 'Z6K1' ];
				const equals = 'string value';
				expect( isTruthyOrEqual( object, keys, equals ) ).toBe( true );
			} );

			it( 'returns false if value is found by one key but not equal', () => {
				const object = {
					Z1K1: 'Z6',
					Z6K1: 'string value'
				};
				const keys = [ 'Z6K1' ];
				const equals = 'some other value';
				expect( isTruthyOrEqual( object, keys, equals ) ).toBe( false );
			} );

			it( 'returns false if value is not found by a chain of keys', () => {
				const object = {
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'string value'
				};
				const keys = [ 'Z11K1', 'Z60K1', 'Z6K1' ];
				const equals = 'some value';
				expect( isTruthyOrEqual( object, keys, equals ) ).toBe( false );
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
				expect( isTruthyOrEqual( object, keys, equals ) ).toBe( true );
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
				expect( isTruthyOrEqual( object, keys, equals ) ).toBe( false );
			} );
		} );
	} );
} );
