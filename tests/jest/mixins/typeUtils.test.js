var typeUtils = require( '../../../resources/ext.wikilambda.edit/mixins/typeUtils.js' ).methods,
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'typeUtils mixin', function () {

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
		describe( 'zObjectToString', function () {
			it( 'return an empty string if zObject is undefined', function () {
				var returnedString = typeUtils.zObjectToString();
				expect( returnedString ).toBe( '' );
			} );
			it( 'return the function paramether if of type string', function () {
				var object = 'I am a simple string';
				var returnedString = typeUtils.zObjectToString( object );
				expect( returnedString ).toBe( object );
			} );
			it( 'return a formatted string if value is Array', function () {
				var object = [ 'one', 'two' ];
				var returnedString = typeUtils.zObjectToString( object );
				expect( returnedString ).toBe( '[ one, two ]' );
			} );
			describe( 'when the object is a boolean', function () {
				it( 'return true if the boolean identity if true', function () {
					var object = {
						Z1K1: Constants.Z_BOOLEAN,
						Z40K1: Constants.Z_BOOLEAN_TRUE
					};
					var returnedString = typeUtils.zObjectToString( object );
					expect( returnedString ).toBeTruthy();
				} );
				it( 'return false if the boolean identity if false', function () {
					var object = {
						Z1K1: Constants.Z_BOOLEAN,
						Z40K1: Constants.Z_BOOLEAN_FALSE
					};
					var returnedString = typeUtils.zObjectToString( object );
					expect( returnedString ).toBeFalsy();
				} );
			} );
			it( 'return the stringify JSON as a default for obect', function () {
				var object = {
					Z1K1: 'fakeObject'
				};
				var returnedString = typeUtils.zObjectToString( object );
				expect( returnedString ).toBe( JSON.stringify( object ) );

			} );
		} );
		describe( 'typedListToArray', function () {
			it( 'return an empty array if provided list is empty', function () {
				var typeList = {
					Z1K1: {
						Z1K1: 'FakeTypedListDeclaration'
					}
				};
				var formattedArray = typeUtils.typedListToArray( typeList );
				expect( formattedArray ).toEqual( [] );

			} );

			describe( 'returns the formatted array', function () {
				it( 'when typed list has a single string value', function () {
					var typeList = {
						Z1K1: {
							Z1K1: 'FakeTypedListDeclaration'
						},
						K1: 'test',
						K2: {
							Z1K1: {
								Z1K1: 'FakeTypedListDeclaration'
							}
						}
					};
					var formattedArray = typeUtils.typedListToArray( typeList );
					expect( formattedArray ).toEqual( [ 'test' ] );
				} );
				it( 'when typed list has a multiple string values', function () {
					var typeList = {
						Z1K1: {
							Z1K1: 'FakeTypedListDeclaration'
						},
						K1: 'test',
						K2: {
							Z1K1: {
								Z1K1: 'FakeTypedListDeclaration'
							},
							K1: 'test2',
							K2: {
								Z1K1: {
									Z1K1: 'FakeTypedListDeclaration'
								},
								K1: 'test3',
								K2: {
									Z1K1: {
										Z1K1: 'FakeTypedListDeclaration'
									}
								}
							}
						}
					};
					var formattedArray = typeUtils.typedListToArray( typeList );
					expect( formattedArray ).toEqual( [ 'test', 'test2', 'test3' ] );
				} );
				it( 'when typed list has a single object array', function () {
					var dummyValue = {
						Z1K1: 'complexType',
						Z123K4: 'ComplexValue'
					};
					var typeList = {
						Z1K1: {
							Z1K1: 'FakeTypedListDeclaration'
						},
						K1: dummyValue,
						K2: {
							Z1K1: {
								Z1K1: 'FakeTypedListDeclaration'
							}
						}
					};
					var formattedArray = typeUtils.typedListToArray( typeList );
					expect( formattedArray.length ).toBe( 1 );
					expect( formattedArray[ 0 ] ).toBe( dummyValue );
				} );
			} );
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
				} );
				expect( type ).toBe( 'Z10000' );
			} );
			it( 'with one argument', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
					[ Constants.Z_TYPED_LIST_TYPE ]: Constants.Z_STRING
				} );
				expect( type ).toBe( `${Constants.Z_TYPED_LIST}(${Constants.Z_STRING})` );
			} );
			it( 'with more than one argument', function () {
				var type = typeUtils.typeToString( {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_PAIR,
					[ Constants.Z_TYPED_PAIR_TYPE1 ]: Constants.Z_STRING,
					[ Constants.Z_TYPED_PAIR_TYPE2 ]: Constants.Z_BOOLEAN
				} );
				expect( type ).toBe( `${Constants.Z_TYPED_PAIR}(${Constants.Z_STRING},${Constants.Z_BOOLEAN})`
				);
			} );
		} );
	} );
} );
