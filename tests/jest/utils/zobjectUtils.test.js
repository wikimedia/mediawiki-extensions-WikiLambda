/*!
 * WikiLambda unit test suite for the zobjectUtils util
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const zobjectUtils = require( '../../../resources/ext.wikilambda.app/utils/zobjectUtils.js' );
const { canonicalToHybrid } = require( '../../../resources/ext.wikilambda.app/utils/schemata.js' );

describe( 'zobjectUtils', () => {

	describe( 'getZObjectType', () => {
		it( 'returns undefined when value is undefined', () => {
			const zobject = undefined;
			const expected = undefined;
			expect( zobjectUtils.getZObjectType( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZObjectType( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns string when value is a string', () => {
			const zobject = 'Just a string';
			const expected = 'Z6';
			expect( zobjectUtils.getZObjectType( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZObjectType( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns reference when value matches a ZID format', () => {
			const zobject = 'Z123';
			const expected = 'Z9';
			expect( zobjectUtils.getZObjectType( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZObjectType( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns untyped list when value is an empty array', () => {
			const zobject = [];
			const expected = {
				Z1K1: 'Z7',
				Z7K1: 'Z881',
				Z881K1: 'Z1'
			};
			expect( zobjectUtils.getZObjectType( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZObjectType( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns typed list when value is a non-empty array', () => {
			const zobject = [ 'Z6', 'zobject' ];
			const expected = {
				Z1K1: 'Z7',
				Z7K1: 'Z881',
				Z881K1: 'Z6'
			};
			expect( zobjectUtils.getZObjectType( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZObjectType( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns undefined when zobject type is not defined ', () => {
			const zobject = {};
			const expected = undefined;
			expect( zobjectUtils.getZObjectType( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZObjectType( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns value of zobject type', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'some value'
			};
			const expected = 'Z11';
			expect( zobjectUtils.getZObjectType( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZObjectType( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns nested zobject type', () => {
			const zobject = [ {
				Z1K1: 'Z7',
				Z7K1: 'Z882',
				Z882K1: 'Z6',
				Z882K2: 'Z40'
			} ];
			const expected = {
				Z1K1: 'Z7',
				Z7K1: 'Z881',
				Z881K1: {
					Z1K1: 'Z7',
					Z7K1: 'Z882',
					Z882K1: 'Z6',
					Z882K2: 'Z40'
				}
			};
			expect( zobjectUtils.getZObjectType( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZObjectType( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );
	} );

	describe( 'resolveZObjectByKeyPath', () => {
		describe( 'failed resolution', () => {
			it( 'throws error when key path is empty', () => {
				const zobject = {};
				const keyPath = [];

				expect( () => {
					zobjectUtils.resolveZObjectByKeyPath( zobject, keyPath );
				} ).toThrowError( 'Unable to resolve key path: Key path must be a non-empty array' );
			} );

			it( 'throws error when key path points to a non-object', () => {
				const zobject = {
					a: {
						b: null
					}
				};
				const keyPath = [ 'a', 'b', 'c' ];

				expect( () => {
					zobjectUtils.resolveZObjectByKeyPath( zobject, keyPath );
				} ).toThrowError( 'Unable to resolve key path: Key path points to a non-object at "b"' );
			} );

			it( 'throws error when intermediate key does not exist', () => {
				const zobject = {
					a: {}
				};
				const keyPath = [ 'a', 'missingKey', 'c' ];

				expect( () => {
					zobjectUtils.resolveZObjectByKeyPath( zobject, keyPath );
				} ).toThrowError( 'Unable to resolve key path: Key path points to a non-object at "missingKey"' );
			} );
		} );

		describe( 'resolution via reference, not copy', () => {
			it( 'returns a reference to the original object, not a copy', () => {
				const zobject = {
					a: {
						b: {
							c: 'initial'
						}
					}
				};
				const keyPath = [ 'a', 'b', 'c' ];

				const { target, finalKey } = zobjectUtils.resolveZObjectByKeyPath( zobject, keyPath );

				// Mutate the target via returned reference
				target[ finalKey ] = 'modified';

				// Ensure the original object reflects the change
				expect( zobject.a.b.c ).toBe( 'modified' );

				// Also confirm it’s not a deep copy
				expect( target ).toBe( zobject.a.b );
			} );
		} );

		describe( 'successful resolution', () => {
			it( 'returns target and final key', () => {
				const zobject = {
					a: {
						b: {
							c: 'value'
						}
					}
				};
				const keyPath = [ 'a', 'b', 'c' ];

				const { target, finalKey } = zobjectUtils.resolveZObjectByKeyPath( zobject, keyPath );
				expect( target ).toEqual( { c: 'value' } );
				expect( finalKey ).toBe( 'c' );
			} );

			it( 'returns correct target and finalKey for single key path', () => {
				const zobject = {
					a: {
						something: true
					}
				};
				const keyPath = [ 'a' ];

				const { target, finalKey } = zobjectUtils.resolveZObjectByKeyPath( zobject, keyPath );
				expect( target ).toEqual( zobject );
				expect( finalKey ).toBe( 'a' );
			} );

			it( 'returns correct target when terminal value is an array', () => {
				const zobject = {
					a: {
						b: [ 'x', 'y', 'z' ]
					}
				};
				const keyPath = [ 'a', 'b' ];

				const { target, finalKey } = zobjectUtils.resolveZObjectByKeyPath( zobject, keyPath );
				expect( target ).toEqual( { b: [ 'x', 'y', 'z' ] } );
				expect( finalKey ).toBe( 'b' );
			} );

			it( 'returns correct target when terminal value is an array item', () => {
				const zobject = {
					a: {
						b: [ 'x', 'y', 'z' ]
					}
				};
				const keyPath = [ 'a', 'b', 1 ];

				const { target, finalKey } = zobjectUtils.resolveZObjectByKeyPath( zobject, keyPath );
				expect( target ).toEqual( [ 'x', 'y', 'z' ] );
				expect( finalKey ).toBe( 1 );
				expect( target[ finalKey ] ).toBe( 'y' );
			} );

			it( 'returns correct target when terminal value is an array item (string index)', () => {
				const zobject = {
					a: {
						b: [ 'x', 'y', 'z' ]
					}
				};
				const keyPath = [ 'a', 'b', '1' ];

				const { target, finalKey } = zobjectUtils.resolveZObjectByKeyPath( zobject, keyPath );
				expect( target ).toEqual( [ 'x', 'y', 'z' ] );
				expect( finalKey ).toBe( '1' );
				expect( target[ finalKey ] ).toBe( 'y' );
			} );

			it( 'returns correct target when intermediate node is an array', () => {
				const zobject = {
					a: {
						b: [ 'x', { c: { d: 'e' }, f: { g: 'h' } }, 'z' ]
					}
				};
				const keyPath = [ 'a', 'b', 1, 'f', 'g' ];

				const { target, finalKey } = zobjectUtils.resolveZObjectByKeyPath( zobject, keyPath );
				expect( target ).toEqual( { g: 'h' } );
				expect( finalKey ).toBe( 'g' );
			} );
		} );
	} );

	describe( 'getListItemKey', () => {
		it( 'returns a stable key for the same object reference', () => {
			const item = { Z1K1: 'Z6', Z6K1: 'one' };

			const first = zobjectUtils.getListItemKey( item, 1 );
			// Same reference at a different index yields the same key, so Vue
			// relocates the instance (with its state) rather than reusing it.
			expect( zobjectUtils.getListItemKey( item, 2 ) ).toBe( first );
		} );

		it( 'returns distinct keys for distinct object references', () => {
			const itemA = { Z1K1: 'Z6', Z6K1: 'same' };
			const itemB = { Z1K1: 'Z6', Z6K1: 'same' };

			// Equal content but different references must not share a key.
			expect( zobjectUtils.getListItemKey( itemA, 1 ) )
				.not.toBe( zobjectUtils.getListItemKey( itemB, 2 ) );
		} );

		it( 'keys primitive items positionally', () => {
			expect( zobjectUtils.getListItemKey( 'foo', 3 ) ).toBe( 'item-3' );
			expect( zobjectUtils.getListItemKey( 42, 4 ) ).toBe( 'item-4' );
			expect( zobjectUtils.getListItemKey( null, 5 ) ).toBe( 'item-5' );
		} );
	} );

	describe( 'getZStringTerminalValue', () => {
		it( 'returns undefined when object is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZStringTerminalValue( zobject ) ).toBe( expected );
		} );

		it( 'returns empty string', () => {
			const zobject = '';
			const expected = '';

			expect( zobjectUtils.getZStringTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZStringTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value', () => {
			const zobject = 'string value';
			const expected = 'string value';

			expect( zobjectUtils.getZStringTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZStringTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns undefined when object is not a string', () => {
			const zobject = { Z1K1: 'Z9', Z9K1: 'Z1002' };
			const expected = undefined;

			expect( zobjectUtils.getZStringTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZStringTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZReferenceTerminalValue', () => {
		it( 'returns undefined when object is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZReferenceTerminalValue( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when object is not a reference', () => {
			const zobject = '';
			const expected = undefined;

			expect( zobjectUtils.getZReferenceTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZReferenceTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value', () => {
			const zobject = 'Z34';
			const expected = 'Z34';

			expect( zobjectUtils.getZReferenceTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZReferenceTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns undefined when object is not a reference (but has explicit type)', () => {
			const zobject = { Z1K1: 'Z60', Z60K1: 'es' };
			const expected = undefined;

			expect( zobjectUtils.getZReferenceTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZReferenceTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZMonolingualTextValue', () => {
		it( 'returns undefined when value is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualTextValue( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is not an object', () => {
			const zobject = 'not an object';
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualTextValue( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is of the wrong type', () => {
			const zobject = { Z1K1: 'Z60', Z60K1: 'es' };
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualTextValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZMonolingualTextValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value', () => {
			const zobject = { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'terminal value' };
			const expected = 'terminal value';

			expect( zobjectUtils.getZMonolingualTextValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZMonolingualTextValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns empty terminal value', () => {
			const zobject = { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: '' };
			const expected = '';

			expect( zobjectUtils.getZMonolingualTextValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZMonolingualTextValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZMonolingualLangValue', () => {
		it( 'returns undefined when value is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualLangValue( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is not an object', () => {
			const zobject = 'not an object';
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualLangValue( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is of the wrong type', () => {
			const zobject = { Z1K1: 'Z60', Z60K1: 'es' };
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualLangValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZMonolingualLangValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns empty terminal value of language reference', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: { Z1K1: 'Z9', Z9K1: '' },
				Z11K2: 'terminal value'
			};
			const expected = '';

			expect( zobjectUtils.getZMonolingualLangValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZMonolingualLangValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value of language reference', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'terminal value'
			};
			const expected = 'Z1002';

			expect( zobjectUtils.getZMonolingualLangValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZMonolingualLangValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value of literal language', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: {
					Z1K1: 'Z60',
					Z60K1: 'ext'
				},
				Z11K2: 'terminal value'
			};
			const expected = 'ext';

			expect( zobjectUtils.getZMonolingualLangValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZMonolingualLangValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZLangTerminalValue', () => {
		it( 'returns undefined when value is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZLangTerminalValue( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is of the wrong type', () => {
			const zobject = { Z1K1: 'Z6', Z6K1: 'es' };
			const expected = undefined;

			expect( zobjectUtils.getZLangTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZLangTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns empty terminal value of literal language', () => {
			const zobject = {
				Z1K1: 'Z60',
				Z60K1: ''
			};
			const expected = '';

			expect( zobjectUtils.getZLangTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZLangTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value of literal language', () => {
			const zobject = {
				Z1K1: 'Z60',
				Z60K1: 'eu'
			};
			const expected = 'eu';

			expect( zobjectUtils.getZLangTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZLangTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZBooleanValue', () => {
		it( 'returns undefined when value is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZBooleanValue( zobject ) ).toBe( expected );
		} );

		it( 'returns terminal value when boolean is a reference', () => {
			const zobject = 'Z41';
			const expected = 'Z41';

			expect( zobjectUtils.getZBooleanValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZBooleanValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns terminal value when boolean is a literal', () => {
			const zobject = {
				Z1K1: 'Z40',
				Z40K1: 'Z42'
			};
			const expected = 'Z42';

			expect( zobjectUtils.getZBooleanValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZBooleanValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZFunctionCallFunctionId', () => {
		it( 'returns undefined when value is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZFunctionCallFunctionId( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is of the wrong type', () => {
			const zobject = {
				Z1K1: 'Z40',
				Z40K1: 'Z42'
			};
			const expected = undefined;

			expect( zobjectUtils.getZFunctionCallFunctionId( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZFunctionCallFunctionId( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns terminal value', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z10001'
			};
			const expected = 'Z10001';

			expect( zobjectUtils.getZFunctionCallFunctionId( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZFunctionCallFunctionId( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns undefined when Z7K1 is defined by a function call', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: {
					Z1K1: 'Z7',
					Z7K1: 'Z10002'
				}
			};
			const expected = undefined;

			expect( zobjectUtils.getZFunctionCallFunctionId( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZFunctionCallFunctionId( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns undefined Z7K1 is defined by an argument reference', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: {
					Z1K1: 'Z18',
					Z18K1: 'Z10000K1'
				}
			};
			const expected = undefined;

			expect( zobjectUtils.getZFunctionCallFunctionId( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZFunctionCallFunctionId( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns terminal value when Z7K1 is defined by an argument reference and nested flag is true', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: {
					Z1K1: 'Z18',
					Z18K1: 'Z10000K1'
				}
			};
			const expected = 'Z10000K1';
			expect( zobjectUtils.getZFunctionCallFunctionId( zobject, true ) ).toBe( expected );
			expect( zobjectUtils.getZFunctionCallFunctionId( canonicalToHybrid( zobject ), true ) ).toBe( expected );
		} );

		it( 'returns terminal value when Z7K1 is defined by a function call and nested flag is true', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: {
					Z1K1: 'Z7',
					Z7K1: 'Z10002'
				}
			};
			const expected = 'Z10002';
			expect( zobjectUtils.getZFunctionCallFunctionId( zobject, true ) ).toBe( expected );
			expect( zobjectUtils.getZFunctionCallFunctionId( canonicalToHybrid( zobject ), true ) ).toBe( expected );
		} );

		it( 'returns terminal value when Z7K1 has a deeply nested function call and nested flag is true', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: {
					Z1K1: 'Z7',
					Z7K1: {
						Z1K1: 'Z7',
						Z7K1: 'Z10003'
					}
				}
			};
			const expected = 'Z10003';
			expect( zobjectUtils.getZFunctionCallFunctionId( zobject, true ) ).toBe( expected );
			expect( zobjectUtils.getZFunctionCallFunctionId( canonicalToHybrid( zobject ), true ) ).toBe( expected );
		} );
	} );

	describe( 'getZFunctionCallArgumentKeys', () => {
		it( 'returns empty array when value is undefined', () => {
			const zobject = undefined;
			const expected = [];

			expect( zobjectUtils.getZFunctionCallArgumentKeys( zobject ) ).toEqual( expected );
		} );

		it( 'returns empty array when value is of the wrong type', () => {
			const zobject = {
				Z1K1: 'Z40',
				Z40K1: 'Z42'
			};
			const expected = [];

			expect( zobjectUtils.getZFunctionCallArgumentKeys( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZFunctionCallArgumentKeys( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns empty array with zero-argument function call', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z10001'
			};
			const expected = [];

			expect( zobjectUtils.getZFunctionCallArgumentKeys( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZFunctionCallArgumentKeys( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns global argument keys', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z10001',
				Z10001K1: 'one',
				Z10001K2: 'two'
			};
			const expected = [ 'Z10001K1', 'Z10001K2' ];

			expect( zobjectUtils.getZFunctionCallArgumentKeys( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZFunctionCallArgumentKeys( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns local argument keys', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: {
					Z1K1: 'Z7',
					Z7K1: 'Z10001'
				},
				K1: 'one',
				K2: 'two',
				K3: 'three'
			};
			const expected = [ 'K1', 'K2', 'K3' ];

			expect( zobjectUtils.getZFunctionCallArgumentKeys( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZFunctionCallArgumentKeys( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );
	} );

	describe( 'getZMonolingualStringsetValues', () => {
		it( 'returns undefined when value is undefined', () => {
			const zobject = undefined;
			const expected = [];

			expect( zobjectUtils.getZMonolingualStringsetValues( zobject ) ).toEqual( expected );
		} );

		it( 'returns undefined when value is not an object', () => {
			const zobject = 'not an object';
			const expected = [];

			expect( zobjectUtils.getZMonolingualStringsetValues( zobject ) ).toEqual( expected );
		} );

		it( 'returns undefined when value is of the wrong type', () => {
			const zobject = { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'terminal value' };
			const expected = [];

			expect( zobjectUtils.getZMonolingualStringsetValues( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZMonolingualStringsetValues( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns correct terminal values', () => {
			const zobject = {
				Z1K1: 'Z31',
				Z31K1: 'Z1002',
				Z31K2: [ 'Z6', 'terminal value' ]
			};
			const expected = [ 'terminal value' ];

			expect( zobjectUtils.getZMonolingualStringsetValues( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZMonolingualStringsetValues( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns correct terminal values (empty array)', () => {
			const zobject = {
				Z1K1: 'Z31',
				Z31K1: 'Z1002',
				Z31K2: [ 'Z6' ]
			};
			const expected = [];

			expect( zobjectUtils.getZMonolingualStringsetValues( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZMonolingualStringsetValues( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );
	} );

	describe( 'getZMonolingualStringsetLang', () => {
		it( 'returns undefined when value is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualStringsetLang( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is not an object', () => {
			const zobject = 'not an object';
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualStringsetLang( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is of the wrong type', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'terminal value'
			};
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualStringsetLang( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZMonolingualStringsetLang( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns empty terminal value of language reference', () => {
			const zobject = {
				Z1K1: 'Z31',
				Z31K1: { Z1K1: 'Z9', Z9K1: '' },
				Z31K2: [ 'Z6', 'terminal value' ]
			};
			const expected = '';

			expect( zobjectUtils.getZMonolingualStringsetLang( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZMonolingualStringsetLang( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value of language reference', () => {
			const zobject = {
				Z1K1: 'Z31',
				Z31K1: 'Z1002',
				Z31K2: [ 'Z6' ]
			};
			const expected = 'Z1002';

			expect( zobjectUtils.getZMonolingualStringsetLang( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZMonolingualStringsetLang( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value of literal language', () => {
			const zobject = {
				Z1K1: 'Z31',
				Z31K1: {
					Z1K1: 'Z60',
					Z60K1: 'ext'
				},
				Z31K2: [ 'Z6' ]
			};
			const expected = 'ext';

			expect( zobjectUtils.getZMonolingualStringsetLang( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZMonolingualStringsetLang( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZArgumentReferenceTerminalValue', () => {
		it( 'returns undefined when object is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZArgumentReferenceTerminalValue( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is not an object', () => {
			const zobject = 'not an object';
			const expected = undefined;

			expect( zobjectUtils.getZArgumentReferenceTerminalValue( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is not an argument reference', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'terminal value'
			};
			const expected = undefined;

			expect( zobjectUtils.getZArgumentReferenceTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZArgumentReferenceTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value', () => {
			const zobject = {
				Z1K1: 'Z18',
				Z18K1: 'Z10001K1'
			};
			const expected = 'Z10001K1';

			expect( zobjectUtils.getZArgumentReferenceTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZArgumentReferenceTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZTesterFunctionZid', () => {
		it( 'returns undefined when object is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZTesterFunctionZid( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is not an object', () => {
			const zobject = 'not an object';
			const expected = undefined;

			expect( zobjectUtils.getZTesterFunctionZid( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is of the wrong type', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'terminal value'
			};
			const expected = undefined;

			expect( zobjectUtils.getZTesterFunctionZid( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZTesterFunctionZid( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns empty terminal value', () => {
			const zobject = {
				Z1K1: 'Z20',
				Z20K1: { Z1K1: 'Z9', Z9K1: '' }
			};
			const expected = '';

			expect( zobjectUtils.getZTesterFunctionZid( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZTesterFunctionZid( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value', () => {
			const zobject = {
				Z1K1: 'Z20',
				Z20K1: 'Z10001'
			};
			const expected = 'Z10001';

			expect( zobjectUtils.getZTesterFunctionZid( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZTesterFunctionZid( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZImplementationFunctionZid', () => {
		it( 'returns undefined when object is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZImplementationFunctionZid( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is not an object', () => {
			const zobject = 'not an object';
			const expected = undefined;

			expect( zobjectUtils.getZImplementationFunctionZid( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is not an implementation', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'terminal value'
			};
			const expected = undefined;

			expect( zobjectUtils.getZImplementationFunctionZid( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZImplementationFunctionZid( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns empty terminal value', () => {
			const zobject = {
				Z1K1: 'Z14',
				Z14K1: { Z1K1: 'Z9', Z9K1: '' }
			};
			const expected = '';

			expect( zobjectUtils.getZImplementationFunctionZid( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZImplementationFunctionZid( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value', () => {
			const zobject = {
				Z1K1: 'Z14',
				Z14K1: 'Z10001'
			};
			const expected = 'Z10001';

			expect( zobjectUtils.getZImplementationFunctionZid( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZImplementationFunctionZid( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZImplementationContentType', () => {
		it( 'returns undefined when object is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZImplementationContentType( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is not an object', () => {
			const zobject = 'not an object';
			const expected = undefined;

			expect( zobjectUtils.getZImplementationContentType( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is of the wrong type', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'terminal value'
			};
			const expected = undefined;

			expect( zobjectUtils.getZImplementationContentType( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZImplementationContentType( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns undefined if content is not defined', () => {
			const zobject = {
				Z1K1: 'Z14',
				Z14K1: 'Z10001'
			};
			const expected = undefined;

			expect( zobjectUtils.getZImplementationContentType( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZImplementationContentType( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns composition as terminal value', () => {
			const zobject = {
				Z1K1: 'Z14',
				Z14K1: 'Z10001',
				Z14K2: { Z1K1: 'Z7', Z7K1: 'Z801', Z801K1: 'booh' }
			};
			const expected = 'Z14K2';

			expect( zobjectUtils.getZImplementationContentType( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZImplementationContentType( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns code as terminal value', () => {
			const zobject = {
				Z1K1: 'Z14',
				Z14K1: 'Z10001',
				Z14K3: { Z1K1: 'Z16', Z16K1: 'Z600', Z16K2: 'some_code();' }
			};
			const expected = 'Z14K3';

			expect( zobjectUtils.getZImplementationContentType( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZImplementationContentType( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns builtin as terminal value', () => {
			const zobject = {
				Z1K1: 'Z14',
				Z14K1: 'Z10001',
				Z14K4: 'Z90009'
			};
			const expected = 'Z14K4';

			expect( zobjectUtils.getZImplementationContentType( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZImplementationContentType( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZCodeProgrammingLanguageId', () => {
		it( 'returns undefined when value is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZCodeProgrammingLanguageId( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is not an object', () => {
			const zobject = 'not an object';
			const expected = undefined;

			expect( zobjectUtils.getZCodeProgrammingLanguageId( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is of the wrong type', () => {
			const zobject = { Z1K1: 'Z60', Z60K1: 'es' };
			const expected = undefined;

			expect( zobjectUtils.getZCodeProgrammingLanguageId( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZCodeProgrammingLanguageId( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns empty terminal value of programming language reference', () => {
			const zobject = {
				Z1K1: 'Z16',
				Z16K1: { Z1K1: 'Z9', Z9K1: '' },
				Z16K2: 'someCode();'
			};
			const expected = '';

			expect( zobjectUtils.getZCodeProgrammingLanguageId( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZCodeProgrammingLanguageId( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value of programming language reference', () => {
			const zobject = {
				Z1K1: 'Z16',
				Z16K1: 'Z600',
				Z16K2: 'someCode();'
			};
			const expected = 'Z600';

			expect( zobjectUtils.getZCodeProgrammingLanguageId( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZCodeProgrammingLanguageId( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZCodeString', () => {
		it( 'returns undefined when value is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZCodeString( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is not an object', () => {
			const zobject = 'not an object';
			const expected = undefined;

			expect( zobjectUtils.getZCodeString( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is of the wrong type', () => {
			const zobject = { Z1K1: 'Z60', Z60K1: 'es' };
			const expected = undefined;

			expect( zobjectUtils.getZCodeString( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZCodeString( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns empty terminal value', () => {
			const zobject = {
				Z1K1: 'Z16',
				Z16K1: 'Z600',
				Z16K2: ''
			};
			const expected = '';

			expect( zobjectUtils.getZCodeString( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZCodeString( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value', () => {
			const zobject = {
				Z1K1: 'Z16',
				Z16K1: 'Z600',
				Z16K2: 'someCode();'
			};
			const expected = 'someCode();';

			expect( zobjectUtils.getZCodeString( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZCodeString( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZHTMLFragmentTerminalValue', () => {
		it( 'returns undefined when value is undefined', () => {
			const zobject = undefined;
			const expected = undefined;

			expect( zobjectUtils.getZHTMLFragmentTerminalValue( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is not an object', () => {
			const zobject = 'not an object';
			const expected = undefined;

			expect( zobjectUtils.getZHTMLFragmentTerminalValue( zobject ) ).toBe( expected );
		} );

		it( 'returns undefined when value is of the wrong type', () => {
			const zobject = { Z1K1: 'Z60', Z60K1: 'es' };
			const expected = undefined;

			expect( zobjectUtils.getZHTMLFragmentTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZHTMLFragmentTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns empty terminal value', () => {
			const zobject = {
				Z1K1: 'Z89',
				Z89K1: ''
			};
			const expected = '';

			expect( zobjectUtils.getZHTMLFragmentTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZHTMLFragmentTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns correct terminal value', () => {
			const zobject = {
				Z1K1: 'Z89',
				Z89K1: '<b>So bold</b>'
			};
			const expected = '<b>So bold</b>';

			expect( zobjectUtils.getZHTMLFragmentTerminalValue( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZHTMLFragmentTerminalValue( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZKeyIsIdentity', () => {
		it( 'returns false when value is undefined', () => {
			const zobject = undefined;
			const expected = false;

			expect( zobjectUtils.getZKeyIsIdentity( zobject ) ).toBe( expected );
		} );

		it( 'returns false when value is not an object', () => {
			const zobject = 'not an object';
			const expected = false;

			expect( zobjectUtils.getZKeyIsIdentity( zobject ) ).toBe( expected );
		} );

		it( 'returns false when value is of the wrong type', () => {
			const zobject = { Z1K1: 'Z60', Z60K1: 'es' };
			const expected = false;

			expect( zobjectUtils.getZKeyIsIdentity( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZKeyIsIdentity( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns true with literal boolean flag', () => {
			const zobject = {
				Z1K1: 'Z3',
				Z3K4: {
					Z1K1: 'Z40',
					Z40K1: 'Z41'
				}
			};
			const expected = true;

			expect( zobjectUtils.getZKeyIsIdentity( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZKeyIsIdentity( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns true with referenced boolean flag', () => {
			const zobject = {
				Z1K1: 'Z3',
				Z3K4: 'Z41'
			};
			const expected = true;

			expect( zobjectUtils.getZKeyIsIdentity( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZKeyIsIdentity( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false with literal boolean flag', () => {
			const zobject = {
				Z1K1: 'Z3',
				Z3K4: {
					Z1K1: 'Z40',
					Z40K1: 'Z42'
				}
			};
			const expected = false;

			expect( zobjectUtils.getZKeyIsIdentity( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZKeyIsIdentity( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false with referenced boolean flag', () => {
			const zobject = {
				Z1K1: 'Z3',
				Z3K4: 'Z42'
			};
			const expected = false;

			expect( zobjectUtils.getZKeyIsIdentity( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZKeyIsIdentity( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false with empty referenced boolean flag', () => {
			const zobject = {
				Z1K1: 'Z3',
				Z3K4: { Z1K1: 'Z9', Z9K1: '' }
			};
			const expected = false;

			expect( zobjectUtils.getZKeyIsIdentity( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZKeyIsIdentity( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false with empty literal boolean flag', () => {
			const zobject = {
				Z1K1: 'Z3',
				Z3K4: {
					Z1K1: 'Z40',
					Z40K1: { Z1K1: 'Z9', Z9K1: '' }
				}
			};
			const expected = false;

			expect( zobjectUtils.getZKeyIsIdentity( zobject ) ).toBe( expected );
			expect( zobjectUtils.getZKeyIsIdentity( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'getZMultilingualLangs', () => {
		it( 'returns empty array when value is undefined', () => {
			const zobject = undefined;
			const expected = [];

			expect( zobjectUtils.getZMultilingualLangs( zobject ) ).toEqual( expected );
		} );

		it( 'returns empty array when value is not an object', () => {
			const zobject = 'not an object';
			const expected = [];

			expect( zobjectUtils.getZMultilingualLangs( zobject ) ).toEqual( expected );
		} );

		it( 'returns empty array when value is of the wrong type', () => {
			const zobject = { Z1K1: 'Z60', Z60K1: 'es' };
			const expected = [];

			expect( zobjectUtils.getZMultilingualLangs( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZMultilingualLangs( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns empty array for empty multilingual string', () => {
			const zobject = {
				Z1K1: 'Z12',
				Z12K1: [ 'Z11' ]
			};
			const expected = [];

			expect( zobjectUtils.getZMultilingualLangs( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZMultilingualLangs( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns array with language references', () => {
			const zobject = {
				Z1K1: 'Z12',
				Z12K1: [ 'Z11',
					{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'terminal one' },
					{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'terminal two' },
					{ Z1K1: 'Z11', Z11K1: 'Z1004', Z11K2: 'terminal three' }
				]
			};
			const expected = [ 'Z1002', 'Z1003', 'Z1004' ];

			expect( zobjectUtils.getZMultilingualLangs( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZMultilingualLangs( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns array with language codes', () => {
			const zobject = {
				Z1K1: 'Z12',
				Z12K1: [ 'Z11',
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: 'ext' }, Z11K2: 'estremeñu' },
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: 'gl' }, Z11K2: 'galego' },
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: 'eu' }, Z11K2: 'euskara' },
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: 'ca' }, Z11K2: 'català' }
				]
			};
			const expected = [ 'ext', 'gl', 'eu', 'ca' ];

			expect( zobjectUtils.getZMultilingualLangs( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZMultilingualLangs( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns array with empty languages', () => {
			const zobject = {
				Z1K1: 'Z12',
				Z12K1: [ 'Z11',
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: '' }, Z11K2: 'empty literal' },
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z9', Z9K1: '' }, Z11K2: 'empty reference' }
				]
			};
			const expected = [ '', '' ];

			expect( zobjectUtils.getZMultilingualLangs( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZMultilingualLangs( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );
	} );

	describe( 'getZMultilingualStringsetLangs', () => {
		it( 'returns empty array when value is undefined', () => {
			const zobject = undefined;
			const expected = [];

			expect( zobjectUtils.getZMultilingualStringsetLangs( zobject ) ).toEqual( expected );
		} );

		it( 'returns empty array when value is not an object', () => {
			const zobject = 'not an object';
			const expected = [];

			expect( zobjectUtils.getZMultilingualStringsetLangs( zobject ) ).toEqual( expected );
		} );

		it( 'returns empty array when value is of the wrong type', () => {
			const zobject = { Z1K1: 'Z60', Z60K1: 'es' };
			const expected = [];

			expect( zobjectUtils.getZMultilingualStringsetLangs( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZMultilingualStringsetLangs( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns empty array for empty multilingual string', () => {
			const zobject = {
				Z1K1: 'Z32',
				Z32K1: [ 'Z31' ]
			};
			const expected = [];

			expect( zobjectUtils.getZMultilingualStringsetLangs( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZMultilingualStringsetLangs( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns array with language references', () => {
			const zobject = {
				Z1K1: 'Z32',
				Z32K1: [ 'Z31',
					{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'terminal one' ] },
					{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6', 'terminal two' ] },
					{ Z1K1: 'Z31', Z31K1: 'Z1004', Z31K2: [ 'Z6', 'terminal three' ] }
				]
			};
			const expected = [ 'Z1002', 'Z1003', 'Z1004' ];

			expect( zobjectUtils.getZMultilingualStringsetLangs( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZMultilingualStringsetLangs( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns array with language codes', () => {
			const zobject = {
				Z1K1: 'Z32',
				Z32K1: [ 'Z31',
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: 'ext' }, Z31K2: [ 'Z6', 'estremeñu' ] },
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: 'gl' }, Z31K2: [ 'Z6', 'galego' ] },
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: 'eu' }, Z31K2: [ 'Z6', 'euskara' ] },
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: 'ca' }, Z31K2: [ 'Z6', 'català' ] }
				]
			};
			const expected = [ 'ext', 'gl', 'eu', 'ca' ];

			expect( zobjectUtils.getZMultilingualStringsetLangs( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZMultilingualStringsetLangs( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns array with empty languages', () => {
			const zobject = {
				Z1K1: 'Z32',
				Z32K1: [ 'Z31',
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: '' }, Z31K2: [ 'Z6', 'empty literal' ] },
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z9', Z9K1: '' }, Z31K2: [ 'Z6', 'empty reference' ] }
				]
			};
			const expected = [ '', '' ];

			expect( zobjectUtils.getZMultilingualStringsetLangs( zobject ) ).toEqual( expected );
			expect( zobjectUtils.getZMultilingualStringsetLangs( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );
	} );

	describe( 'getZMonolingualItemForLang', () => {
		it( 'returns undefined when value is undefined', () => {
			const zobject = undefined;
			const lang = 'Z1003';
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualItemForLang( zobject, lang ) ).toEqual( expected );
		} );

		it( 'returns undefined when value is not an object', () => {
			const zobject = 'not an object';
			const lang = 'Z1003';
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualItemForLang( zobject, lang ) ).toEqual( expected );
		} );

		it( 'returns undefined when value is of the wrong type', () => {
			const zobject = { Z1K1: 'Z60', Z60K1: 'es' };
			const lang = 'Z1003';
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualItemForLang( zobject, lang ) ).toEqual( expected );
			expect( zobjectUtils.getZMonolingualItemForLang( canonicalToHybrid( zobject ), lang ) ).toEqual( expected );
		} );

		it( 'returns undefined for empty multilingual string', () => {
			const zobject = {
				Z1K1: 'Z12',
				Z12K1: [ 'Z11' ]
			};
			const lang = 'Z1003';
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualItemForLang( zobject, lang ) ).toEqual( expected );
			expect( zobjectUtils.getZMonolingualItemForLang( canonicalToHybrid( zobject ), lang ) ).toEqual( expected );
		} );

		it( 'returns undefined if the lang was not found', () => {
			const zobject = {
				Z1K1: 'Z12',
				Z12K1: [ 'Z11',
					{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'terminal one' },
					{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'terminal two' },
					{ Z1K1: 'Z11', Z11K1: 'Z1004', Z11K2: 'terminal three' }
				]
			};
			const lang = 'Z1005';
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualItemForLang( zobject, lang ) ).toEqual( expected );
			expect( zobjectUtils.getZMonolingualItemForLang( canonicalToHybrid( zobject ), lang ) ).toEqual( expected );
		} );

		it( 'returns index and terminal value of matched object with literal languages', () => {
			const zobject = {
				Z1K1: 'Z12',
				Z12K1: [ 'Z11',
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: 'ext' }, Z11K2: 'estremeñu' },
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: 'gl' }, Z11K2: 'galego' },
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: 'eu' }, Z11K2: 'euskara' },
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: 'ca' }, Z11K2: 'català' }
				]
			};
			const lang = 'eu';
			const expected = { index: 3, value: 'euskara' };

			expect( zobjectUtils.getZMonolingualItemForLang( zobject, lang ) ).toEqual( expected );
			expect( zobjectUtils.getZMonolingualItemForLang( canonicalToHybrid( zobject ), lang ) ).toEqual( expected );
		} );

		it( 'returns index and terminal value of matched object with language references', () => {
			const zobject = {
				Z1K1: 'Z12',
				Z12K1: [ 'Z11',
					{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'terminal one' },
					{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'terminal two' },
					{ Z1K1: 'Z11', Z11K1: 'Z1004', Z11K2: 'terminal three' }
				]
			};
			const lang = 'Z1003';
			const expected = { index: 2, value: 'terminal two' };

			expect( zobjectUtils.getZMonolingualItemForLang( zobject, lang ) ).toEqual( expected );
			expect( zobjectUtils.getZMonolingualItemForLang( canonicalToHybrid( zobject ), lang ) ).toEqual( expected );
		} );
	} );

	describe( 'getZMonolingualStringsetForLang', () => {
		it( 'returns undefined when value is undefined', () => {
			const zobject = undefined;
			const lang = 'Z1003';
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualStringsetForLang( zobject, lang ) ).toEqual( expected );
		} );

		it( 'returns undefined when value is not an object', () => {
			const zobject = 'not an object';
			const lang = 'Z1003';
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualStringsetForLang( zobject, lang ) ).toEqual( expected );
		} );

		it( 'returns undefined when value is of the wrong type', () => {
			const zobject = { Z1K1: 'Z60', Z60K1: 'es' };
			const lang = 'Z1003';
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualStringsetForLang( zobject, lang ) ).toEqual( expected );
			expect( zobjectUtils.getZMonolingualStringsetForLang( canonicalToHybrid( zobject ), lang ) ).toEqual( expected );
		} );

		it( 'returns undefined for empty multilingual string', () => {
			const zobject = {
				Z1K1: 'Z32',
				Z32K1: [ 'Z31' ]
			};
			const lang = 'Z1003';
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualStringsetForLang( zobject, lang ) ).toEqual( expected );
			expect( zobjectUtils.getZMonolingualStringsetForLang( canonicalToHybrid( zobject ), lang ) ).toEqual( expected );
		} );

		it( 'returns undefined if the lang was not found', () => {
			const zobject = {
				Z1K1: 'Z32',
				Z32K1: [ 'Z31',
					{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'terminal one' ] },
					{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6', 'terminal two' ] },
					{ Z1K1: 'Z31', Z31K1: 'Z1004', Z31K2: [ 'Z6', 'terminal three' ] }
				]
			};
			const lang = 'Z1005';
			const expected = undefined;

			expect( zobjectUtils.getZMonolingualStringsetForLang( zobject, lang ) ).toEqual( expected );
			expect( zobjectUtils.getZMonolingualStringsetForLang( canonicalToHybrid( zobject ), lang ) ).toEqual( expected );
		} );

		it( 'returns index and terminal value of matched object with literal languages', () => {
			const zobject = {
				Z1K1: 'Z32',
				Z32K1: [ 'Z31',
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: 'ext' }, Z31K2: [ 'Z6', 'estremeñu' ] },
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: 'gl' }, Z31K2: [ 'Z6', 'galego' ] },
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: 'eu' }, Z31K2: [ 'Z6', 'euskara', 'euskera' ] },
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: 'ca' }, Z31K2: [ 'Z6', 'català' ] }
				]
			};
			const lang = 'eu';
			const expected = { index: 3, value: [ 'euskara', 'euskera' ] };

			expect( zobjectUtils.getZMonolingualStringsetForLang( zobject, lang ) ).toEqual( expected );
			expect( zobjectUtils.getZMonolingualStringsetForLang( canonicalToHybrid( zobject ), lang ) ).toEqual( expected );
		} );

		it( 'returns index and terminal value of matched object with language references', () => {
			const zobject = {
				Z1K1: 'Z32',
				Z32K1: [ 'Z31',
					{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6', 'terminal one' ] },
					{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6', 'terminal two' ] },
					{ Z1K1: 'Z31', Z31K1: 'Z1004', Z31K2: [ 'Z6', 'terminal three' ] }
				]
			};
			const lang = 'Z1003';
			const expected = { index: 2, value: [ 'terminal two' ] };

			expect( zobjectUtils.getZMonolingualStringsetForLang( zobject, lang ) ).toEqual( expected );
			expect( zobjectUtils.getZMonolingualStringsetForLang( canonicalToHybrid( zobject ), lang ) ).toEqual( expected );
		} );
	} );

	describe( 'isWikidataLiteral', () => {
		it( 'returns false when called with undefined', () => {
			const zobject = undefined;
			const expected = false;
			expect( zobjectUtils.isWikidataLiteral( zobject ) ).toBe( expected );
			expect( zobjectUtils.isWikidataLiteral( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false when called with string', () => {
			const zobject = 'Q123';
			const expected = false;
			expect( zobjectUtils.isWikidataLiteral( zobject ) ).toBe( expected );
			expect( zobjectUtils.isWikidataLiteral( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false when object is not a wikidata reference type', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'not a function call'
			};
			const expected = false;
			expect( zobjectUtils.isWikidataLiteral( zobject ) ).toBe( expected );
			expect( zobjectUtils.isWikidataLiteral( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false when object is a wikidata entity represented by a fetch function call', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z6825',
				Z6825K1: 'L111111'
			};
			const expected = false;
			expect( zobjectUtils.isWikidataLiteral( zobject ) ).toBe( expected );
			expect( zobjectUtils.isWikidataLiteral( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false when object is a wikidata reference type', () => {
			const zobject = {
				Z1K1: 'Z6095',
				Z6095K1: 'L111111'
			};
			const expected = false;
			expect( zobjectUtils.isWikidataLiteral( zobject ) ).toBe( expected );
			expect( zobjectUtils.isWikidataLiteral( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns true when object is a wikidata literal', () => {
			const zobject = {
				Z1K1: 'Z6005',
				Z6005K1: {
					Z1K1: 'Z6095',
					Z6095K1: 'L111111'
				}
			};
			const expected = true;
			expect( zobjectUtils.isWikidataLiteral( zobject ) ).toBe( expected );
			expect( zobjectUtils.isWikidataLiteral( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'isWikidataFetch', () => {
		it( 'returns false when called with undefined', () => {
			const zobject = undefined;
			const expected = false;
			expect( zobjectUtils.isWikidataFetch( zobject ) ).toBe( expected );
			expect( zobjectUtils.isWikidataFetch( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false when called with string', () => {
			const zobject = 'Q123';
			const expected = false;
			expect( zobjectUtils.isWikidataFetch( zobject ) ).toBe( expected );
			expect( zobjectUtils.isWikidataFetch( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false when row belongs to something other than a function call', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'not a function call'
			};
			const expected = false;
			expect( zobjectUtils.isWikidataFetch( zobject ) ).toBe( expected );
			expect( zobjectUtils.isWikidataFetch( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false when function call is not to a wikidata fetch function', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z801',
				Z801K1: 'some function call'
			};
			const expected = false;
			expect( zobjectUtils.isWikidataFetch( zobject ) ).toBe( expected );
			expect( zobjectUtils.isWikidataFetch( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns true when function call is to a wikidata fetch function', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z6825',
				Z6825K1: {
					Z1K1: 'Z6095',
					Z6095K1: 'L111111'
				}
			};
			const expected = true;
			expect( zobjectUtils.isWikidataFetch( zobject ) ).toBe( expected );
			expect( zobjectUtils.isWikidataFetch( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'isWikidataReference', () => {
		it( 'returns false when called with undefined', () => {
			const zobject = undefined;
			const expected = false;
			expect( zobjectUtils.isWikidataReference( zobject ) ).toEqual( expected );
			expect( zobjectUtils.isWikidataReference( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false when called with string', () => {
			const zobject = 'Q123';
			const expected = false;
			expect( zobjectUtils.isWikidataReference( zobject ) ).toEqual( expected );
			expect( zobjectUtils.isWikidataReference( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false when object is not a wikidata reference type', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'not a function call'
			};
			const expected = false;
			expect( zobjectUtils.isWikidataReference( zobject ) ).toEqual( expected );
			expect( zobjectUtils.isWikidataReference( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false when object is a wikidata entity represented by a fetch function call', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z6825',
				Z6825K1: 'L111111'
			};
			const expected = false;
			expect( zobjectUtils.isWikidataReference( zobject ) ).toEqual( expected );
			expect( zobjectUtils.isWikidataReference( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns false when object is a wikidata literal', () => {
			const zobject = {
				Z1K1: 'Z6005',
				Z6005K1: {
					Z1K1: 'Z6095',
					Z6095K1: 'L111111'
				}
			};
			const expected = false;
			expect( zobjectUtils.isWikidataReference( zobject ) ).toEqual( expected );
			expect( zobjectUtils.isWikidataReference( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );

		it( 'returns true when object is a wikidata reference type', () => {
			const zobject = {
				Z1K1: 'Z6095',
				Z6095K1: 'L111111'
			};
			const expected = true;
			expect( zobjectUtils.isWikidataReference( zobject ) ).toEqual( expected );
			expect( zobjectUtils.isWikidataReference( canonicalToHybrid( zobject ) ) ).toBe( expected );
		} );
	} );

	describe( 'isWikidataEntity', () => {
		it( 'returns false when called with undefined', () => {
			const zobject = undefined;
			const expected = false;
			expect( zobjectUtils.isWikidataEntity( zobject ) ).toEqual( expected );
			expect( zobjectUtils.isWikidataEntity( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns false when called with string', () => {
			const zobject = 'Q123';
			const expected = false;
			expect( zobjectUtils.isWikidataEntity( zobject ) ).toEqual( expected );
			expect( zobjectUtils.isWikidataEntity( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns false when object is not a wikidata entity', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'not a function call'
			};
			const expected = false;
			expect( zobjectUtils.isWikidataEntity( zobject ) ).toEqual( expected );
			expect( zobjectUtils.isWikidataEntity( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns true when object is a wikidata literal', () => {
			const zobject = {
				Z1K1: 'Z6005',
				Z6005K1: {
					Z1K1: 'Z6095',
					Z6095K1: 'L111111'
				}
			};
			const expected = true;
			expect( zobjectUtils.isWikidataEntity( zobject ) ).toEqual( expected );
			expect( zobjectUtils.isWikidataEntity( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns true when object is a wikidata reference', () => {
			const zobject = {
				Z1K1: 'Z6095',
				Z6095K1: 'L111111'
			};
			const expected = true;
			expect( zobjectUtils.isWikidataEntity( zobject ) ).toEqual( expected );
			expect( zobjectUtils.isWikidataEntity( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );

		it( 'returns true when object is a wikidata fetch function call', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z6825',
				Z6825K1: {
					Z1K1: 'Z6095',
					Z6095K1: 'L111111'
				}
			};
			const expected = true;
			expect( zobjectUtils.isWikidataEntity( zobject ) ).toEqual( expected );
			expect( zobjectUtils.isWikidataEntity( canonicalToHybrid( zobject ) ) ).toEqual( expected );
		} );
	} );

	describe( 'getWikidataEntityReference', () => {
		it( 'returns undefined when called with undefined', () => {
			const zobject = undefined;
			const wikidataType = 'Z6005';
			const expected = undefined;
			expect( zobjectUtils.getWikidataEntityReference( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityReference( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns undefined when called with string', () => {
			const zobject = 'Q123';
			const wikidataType = 'Z6005';
			const expected = undefined;
			expect( zobjectUtils.getWikidataEntityReference( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityReference( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns undefined when object is not a wikidata entity', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'not a function call'
			};
			const wikidataType = 'Z6005';
			const expected = undefined;
			expect( zobjectUtils.getWikidataEntityReference( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityReference( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns undefined when object is a function call to a different function', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z801',
				Z801K1: 'L111111'
			};
			const wikidataType = 'Z6005';
			const expected = undefined;
			expect( zobjectUtils.getWikidataEntityReference( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityReference( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns undefined when the wikidata entity type is wrong', () => {
			const zobject = {
				Z1K1: 'Z6005',
				Z6005K1: {
					Z1K1: 'Z6095',
					Z6095K1: 'L111111'
				}
			};
			const wikidataType = 'Z6001'; // mismatching type
			const expected = undefined;
			expect( zobjectUtils.getWikidataEntityReference( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityReference( canonicalToHybrid( zobject ), wikidataType ) )
				.toEqual( canonicalToHybrid( expected ) );
		} );

		it( 'returns reference object when input object is a wikidata literal', () => {
			const zobject = {
				Z1K1: 'Z6005',
				Z6005K1: {
					Z1K1: 'Z6095',
					Z6095K1: 'L111111'
				}
			};
			const wikidataType = 'Z6005';
			const expected = {
				Z1K1: 'Z6095',
				Z6095K1: 'L111111'
			};
			expect( zobjectUtils.getWikidataEntityReference( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityReference( canonicalToHybrid( zobject ), wikidataType ) )
				.toEqual( canonicalToHybrid( expected ) );
		} );

		it( 'returns reference object when input object is a wikidata reference', () => {
			const zobject = {
				Z1K1: 'Z6095',
				Z6095K1: 'L111111'
			};
			const wikidataType = 'Z6005';
			const expected = {
				Z1K1: 'Z6095',
				Z6095K1: 'L111111'
			};
			expect( zobjectUtils.getWikidataEntityReference( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityReference( canonicalToHybrid( zobject ), wikidataType ) )
				.toEqual( canonicalToHybrid( expected ) );
		} );

		it( 'returns reference object when input object is a wikidata fetch function call', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z6825',
				Z6825K1: {
					Z1K1: 'Z6095',
					Z6095K1: 'L111111'
				}
			};
			const wikidataType = 'Z6005';
			const expected = {
				Z1K1: 'Z6095',
				Z6095K1: 'L111111'
			};
			expect( zobjectUtils.getWikidataEntityReference( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityReference( canonicalToHybrid( zobject ), wikidataType ) )
				.toEqual( canonicalToHybrid( expected ) );
		} );

		it( 'returns non terminal reference', () => {
			const zobject = {
				Z1K1: 'Z6005',
				Z6005K1: {
					Z1K1: 'Z18',
					Z18K1: 'Z10000K1'
				}
			};
			const wikidataType = 'Z6005';
			const expected = {
				Z1K1: 'Z18',
				Z18K1: 'Z10000K1'
			};
			expect( zobjectUtils.getWikidataEntityReference( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityReference( canonicalToHybrid( zobject ), wikidataType ) )
				.toEqual( canonicalToHybrid( expected ) );
		} );

		it( 'returns reference with non terminal Id', () => {
			const zobject = {
				Z1K1: 'Z6005',
				Z6005K1: {
					Z1K1: 'Z6095',
					Z6095K1: {
						Z1K1: 'Z7',
						Z7K1: 'Z801',
						Z801K1: 'L111111'
					}
				}
			};
			const wikidataType = 'Z6005';
			const expected = {
				Z1K1: 'Z6095',
				Z6095K1: {
					Z1K1: 'Z7',
					Z7K1: 'Z801',
					Z801K1: 'L111111'
				}
			};
			expect( zobjectUtils.getWikidataEntityReference( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityReference( canonicalToHybrid( zobject ), wikidataType ) )
				.toEqual( canonicalToHybrid( expected ) );
		} );

		it( 'returns empty reference object', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z6825',
				Z6825K1: {
					Z1K1: 'Z6095',
					Z6095K1: ''
				}
			};
			const wikidataType = 'Z6005';
			const expected = {
				Z1K1: 'Z6095',
				Z6095K1: ''
			};
			expect( zobjectUtils.getWikidataEntityReference( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityReference( canonicalToHybrid( zobject ), wikidataType ) )
				.toEqual( canonicalToHybrid( expected ) );
		} );
	} );

	describe( 'getWikidataEntityId', () => {
		it( 'returns undefined when called with undefined', () => {
			const zobject = undefined;
			const wikidataType = 'Z6005';
			const expected = undefined;
			expect( zobjectUtils.getWikidataEntityId( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityId( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns undefined when called with string', () => {
			const zobject = 'Q123';
			const wikidataType = 'Z6005';
			const expected = undefined;
			expect( zobjectUtils.getWikidataEntityId( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityId( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns undefined when object is not a wikidata entity', () => {
			const zobject = {
				Z1K1: 'Z11',
				Z11K1: 'Z1002',
				Z11K2: 'not a function call'
			};
			const wikidataType = 'Z6005';
			const expected = undefined;
			expect( zobjectUtils.getWikidataEntityId( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityId( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns undefined when object is a function call to a different function', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z801',
				Z801K1: 'L111111'
			};
			const wikidataType = 'Z6005';
			const expected = undefined;
			expect( zobjectUtils.getWikidataEntityId( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityId( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns undefined when the wikidata entity type is wrong', () => {
			const zobject = {
				Z1K1: 'Z6005',
				Z6005K1: {
					Z1K1: 'Z6095',
					Z6095K1: 'L111111'
				}
			};
			const wikidataType = 'Z6001'; // mismatching type
			const expected = undefined;
			expect( zobjectUtils.getWikidataEntityId( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityId( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns identity when object is a wikidata literal', () => {
			const zobject = {
				Z1K1: 'Z6005',
				Z6005K1: {
					Z1K1: 'Z6095',
					Z6095K1: 'L111111'
				}
			};
			const wikidataType = 'Z6005';
			const expected = 'L111111';
			expect( zobjectUtils.getWikidataEntityId( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityId( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns identity when object is a wikidata reference', () => {
			const zobject = {
				Z1K1: 'Z6095',
				Z6095K1: 'L111111'
			};
			const wikidataType = 'Z6005';
			const expected = 'L111111';
			expect( zobjectUtils.getWikidataEntityId( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityId( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns identity when object is a wikidata fetch function call', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z6825',
				Z6825K1: {
					Z1K1: 'Z6095',
					Z6095K1: 'L111111'
				}
			};
			const wikidataType = 'Z6005';
			const expected = 'L111111';
			expect( zobjectUtils.getWikidataEntityId( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityId( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns undefined when wikidata entity reference is not terminal', () => {
			const zobject = {
				Z1K1: 'Z6005',
				Z6005K1: {
					Z1K1: 'Z18',
					Z18K1: 'Z10000K1'
				}
			};
			const wikidataType = 'Z6005';
			const expected = undefined;
			expect( zobjectUtils.getWikidataEntityId( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityId( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns undefined when wikidata entity reference Id is not terminal', () => {
			const zobject = {
				Z1K1: 'Z6005',
				Z6005K1: {
					Z1K1: 'Z6095',
					Z6095K1: {
						Z1K1: 'Z7',
						Z7K1: 'Z801',
						Z801K1: 'L111111'
					}
				}
			};
			const wikidataType = 'Z6005';
			const expected = undefined;
			expect( zobjectUtils.getWikidataEntityId( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityId( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );

		it( 'returns empty string when reference Id is unset', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z6825',
				Z6825K1: {
					Z1K1: 'Z6095',
					Z6095K1: ''
				}
			};
			const wikidataType = 'Z6005';
			const expected = '';
			expect( zobjectUtils.getWikidataEntityId( zobject, wikidataType ) ).toEqual( expected );
			expect( zobjectUtils.getWikidataEntityId( canonicalToHybrid( zobject ), wikidataType ) ).toEqual( expected );
		} );
	} );

	describe( 'validateGenericType', () => {
		const keyPath = [ 'main', 'Z2K2', 'Z8K2' ];

		it( 'unset reference is not valid', () => {
			const zobject = {
				Z1K1: 'Z9',
				Z9K1: ''
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z8K2', isValid: false }
			];

			const canonical = zobjectUtils.validateGenericType( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateGenericType( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );

		it( 'set reference is valid', () => {
			const zobject = {
				Z1K1: 'Z9',
				Z9K1: 'Z6'
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z8K2', isValid: true }
			];

			const canonical = zobjectUtils.validateGenericType( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateGenericType( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );

		it( 'unset function call is not valid', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: { Z1K1: 'Z9', Z9K1: '' }
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z8K2.Z7K1', isValid: false }
			];

			const canonical = zobjectUtils.validateGenericType( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateGenericType( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );

		it( 'unset function call argument is not valid', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z881',
				Z881K1: { Z1K1: 'Z9', Z9K1: '' }
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z8K2.Z7K1', isValid: true },
				{ keyPath: 'main.Z2K2.Z8K2.Z881K1', isValid: false }
			];

			const canonical = zobjectUtils.validateGenericType( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateGenericType( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );

		it( 'nested function call argument is not valid', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z881',
				Z881K1: {
					Z1K1: 'Z7',
					Z7K1: 'Z881',
					Z881K1: {
						Z1K1: 'Z9',
						Z9K1: ''
					}
				}
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z8K2.Z7K1', isValid: true },
				{ keyPath: 'main.Z2K2.Z8K2.Z881K1.Z7K1', isValid: true },
				{ keyPath: 'main.Z2K2.Z8K2.Z881K1.Z881K1', isValid: false }
			];

			const canonical = zobjectUtils.validateGenericType( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateGenericType( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );
	} );

	describe( 'validateFunctionCall', () => {
		const keyPath = [ 'main', 'Z2K2', 'Z20K2' ];

		it( 'unset arg reference is not valid', () => {
			const zobject = {
				Z1K1: 'Z18',
				Z18K1: ''
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z20K2.Z18K1', isValid: false }
			];

			const canonical = zobjectUtils.validateFunctionCall( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateFunctionCall( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );

		it( 'unset arg reference with no Z18K1 is not valid', () => {
			const zobject = {
				Z1K1: 'Z18'
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z20K2', isValid: false }
			];

			const canonical = zobjectUtils.validateFunctionCall( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateFunctionCall( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );

		it( 'set arg reference is valid', () => {
			const zobject = {
				Z1K1: 'Z18',
				Z18K1: 'Z10000K1'
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z20K2.Z18K1', isValid: true }
			];

			const canonical = zobjectUtils.validateFunctionCall( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateFunctionCall( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );

		it( 'unset function call without Z7K1 is not valid', () => {
			const zobject = {
				Z1K1: 'Z7'
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z20K2', isValid: false }
			];

			const canonical = zobjectUtils.validateFunctionCall( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateFunctionCall( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );

		it( 'unset function call is not valid', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: { Z1K1: 'Z9', Z9K1: '' }
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z20K2.Z7K1', isValid: false }
			];

			const canonical = zobjectUtils.validateFunctionCall( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateFunctionCall( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );

		it( 'set function call is valid', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: 'Z10000'
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z20K2.Z7K1', isValid: true }
			];

			const canonical = zobjectUtils.validateFunctionCall( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateFunctionCall( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );

		it( 'unset argument reference in function call is not valid', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: { Z1K1: 'Z18', Z18K1: '' }
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z20K2.Z7K1', isValid: false },
				{ keyPath: 'main.Z2K2.Z20K2.Z7K1.Z18K1', isValid: false }
			];

			const canonical = zobjectUtils.validateFunctionCall( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateFunctionCall( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );

		it( 'set argument reference in function call is valid', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: { Z1K1: 'Z18', Z18K1: 'Z10000K1' }
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z20K2.Z7K1', isValid: true },
				{ keyPath: 'main.Z2K2.Z20K2.Z7K1.Z18K1', isValid: true }
			];

			const canonical = zobjectUtils.validateFunctionCall( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateFunctionCall( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );

		it( 'unset nested function call is not valid', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: {
					Z1K1: 'Z7',
					Z7K1: { Z1K1: 'Z9', Z9K1: '' }
				}
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z20K2.Z7K1', isValid: false },
				{ keyPath: 'main.Z2K2.Z20K2.Z7K1.Z7K1', isValid: false }
			];

			const canonical = zobjectUtils.validateFunctionCall( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateFunctionCall( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );

		it( 'set nested function call is valid', () => {
			const zobject = {
				Z1K1: 'Z7',
				Z7K1: {
					Z1K1: 'Z7',
					Z7K1: 'Z10000'
				}
			};

			const expected = [
				{ keyPath: 'main.Z2K2.Z20K2.Z7K1', isValid: true },
				{ keyPath: 'main.Z2K2.Z20K2.Z7K1.Z7K1', isValid: true }
			];

			const canonical = zobjectUtils.validateFunctionCall( keyPath, zobject );
			expect( canonical ).toEqual( expected );

			const hybrid = zobjectUtils.validateFunctionCall( keyPath, canonicalToHybrid( zobject ) );
			expect( hybrid ).toEqual( expected );
		} );
	} );

	describe( 'createParserCall', () => {
		it( 'creates a function call to a given parser zid', () => {
			const expectedCall = {
				Z1K1: 'Z7',
				Z7K1: 'Z20808',
				Z20808K1: '31-08-2026',
				Z20808K2: 'Z1003'
			};
			expect( zobjectUtils.createParserCall( {
				parserZid: 'Z20808',
				zobject: '31-08-2026',
				zlang: 'Z1003'
			} ) ).toEqual( expectedCall );
		} );
	} );

	describe( 'createRendererCall', () => {
		it( 'creates a function call to a given render zid', () => {
			const number = {
				Z1K1: 'Z13518',
				Z13518K1: '34'
			};
			const expectedCall = {
				Z1K1: 'Z7',
				Z7K1: 'Z14280',
				Z14280K1: number,
				Z14280K2: 'Z1002'
			};
			expect( zobjectUtils.createParserCall( {
				parserZid: 'Z14280',
				zobject: number,
				zlang: 'Z1002'
			} ) ).toEqual( expectedCall );
		} );
	} );

	describe( 'walkZObject', () => {
		it( 'returns empty array when obj is undefined', () => {
			const visitor = jest.fn().mockReturnValue( [] );
			expect( zobjectUtils.walkZObject( undefined, [], visitor ) ).toEqual( [] );
			expect( visitor ).not.toHaveBeenCalled();
		} );

		it( 'returns empty array when obj is a string', () => {
			const visitor = jest.fn().mockReturnValue( [] );
			expect( zobjectUtils.walkZObject( 'hello', [], visitor ) ).toEqual( [] );
			expect( visitor ).not.toHaveBeenCalled();
		} );

		it( 'returns empty array when obj is null', () => {
			const visitor = jest.fn().mockReturnValue( [] );
			expect( zobjectUtils.walkZObject( null, [], visitor ) ).toEqual( [] );
			expect( visitor ).not.toHaveBeenCalled();
		} );

		it( 'calls visitor on the root object with the initial path', () => {
			const obj = { Z1K1: 'Z6', Z6K1: 'foo' };
			const visitor = jest.fn().mockReturnValue( [ 'bar' ] );

			const result = zobjectUtils.walkZObject( obj, [ 'main' ], visitor );

			expect( visitor ).toHaveBeenCalledTimes( 1 );
			expect( visitor ).toHaveBeenCalledWith( obj, [ 'main' ] );
			expect( result ).toEqual( [ 'bar' ] );
		} );

		it( 'recurses into nested zobjects', () => {
			const ref = { Z1K1: 'Z9', Z9K1: 'Z10000' };
			const str = { Z1K1: 'Z6', Z6K1: 'foo' };
			const call = {
				Z1K1: 'Z7',
				Z7K1: ref,
				Z1000K1: str
			};
			const visitor = jest.fn().mockReturnValue( [] );

			zobjectUtils.walkZObject( call, [ 'main' ], visitor );

			// one for main call, one for reference, one for string
			expect( visitor ).toHaveBeenCalledTimes( 3 );
			expect( visitor ).toHaveBeenCalledWith( call, [ 'main' ] );
			expect( visitor ).toHaveBeenCalledWith( ref, [ 'main', 'Z7K1' ] );
			expect( visitor ).toHaveBeenCalledWith( str, [ 'main', 'Z1000K1' ] );
		} );

		it( 'recurses into array items with index appended to path', () => {
			const en = { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' };
			const es = { Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'en español' };
			const multi = {
				Z1K1: 'Z12',
				Z12K1: [ 'Z11', en, es ]
			};
			const visitor = jest.fn().mockReturnValue( [] );

			zobjectUtils.walkZObject( multi, [ 'main', 'Z2K3' ], visitor );

			expect( visitor ).toHaveBeenCalledTimes( 3 );
			expect( visitor ).toHaveBeenCalledWith( multi, [ 'main', 'Z2K3' ] );
			expect( visitor ).toHaveBeenCalledWith( en, [ 'main', 'Z2K3', 'Z12K1', 1 ] );
			expect( visitor ).toHaveBeenCalledWith( es, [ 'main', 'Z2K3', 'Z12K1', 2 ] );
		} );

		it( 'accumulates results from the root zobject and all their children', () => {
			const obj = {
				Z1K1: 'Z7',
				Z7K1: { Z1K1: 'Z9', Z9K1: 'Z801' },
				Z801K1: { Z1K1: 'Z6', Z6K1: 'booh!' }
			};
			const visitor = jest.fn()
				.mockReturnValueOnce( [ 'call' ] )
				.mockReturnValueOnce( [ 'ref' ] )
				.mockReturnValueOnce( [ 'str' ] );

			const result = zobjectUtils.walkZObject( obj, [], visitor );

			expect( result ).toEqual( [ 'call', 'ref', 'str' ] );
		} );
	} );

	describe( 'walkAndTransformZObject', () => {
		it( 'returns a terminal value without matching or transforming', () => {
			const matcher = jest.fn();
			const transformer = jest.fn();

			expect( zobjectUtils.walkAndTransformZObject( 'hello', matcher, transformer ) ).toBe( 'hello' );
			expect( zobjectUtils.walkAndTransformZObject( undefined, matcher, transformer ) ).toBe( undefined );
			expect( zobjectUtils.walkAndTransformZObject( null, matcher, transformer ) ).toBe( null );
			expect( matcher ).not.toHaveBeenCalled();
			expect( transformer ).not.toHaveBeenCalled();
		} );

		it( 'returns transformer result when root zobject matches', () => {
			const initial = { Z1K1: 'Z6', Z6K1: 'foo' };
			const transformed = { Z1K1: 'Z6', Z6K1: 'bar' };

			const matcher = jest.fn().mockReturnValue( true );
			const transformer = jest.fn().mockReturnValue( transformed );

			const result = zobjectUtils.walkAndTransformZObject( initial, matcher, transformer );

			expect( result ).toBe( transformed );
			expect( transformer ).toHaveBeenCalledWith( initial );
		} );

		it( 'does not recurse into a matched node', () => {
			const ref = { Z1K1: 'Z9', Z9K1: 'Z10000' };
			const str = { Z1K1: 'Z6', Z6K1: 'foo' };
			const call = {
				Z1K1: 'Z7',
				Z7K1: ref,
				Z1000K1: str
			};

			const matcher = jest.fn()
				.mockReturnValueOnce( true ) // root matches; stop here
				.mockReturnValue( false );
			const transformer = jest.fn().mockReturnValue( 'bar' );

			zobjectUtils.walkAndTransformZObject( call, matcher, transformer );

			// transformer is called once and inner is never visited
			expect( transformer ).toHaveBeenCalledTimes( 1 );
			expect( matcher ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'recurses into non-matching nested objects and transforms matching descendants', () => {
			const ref = { Z1K1: 'Z9', Z9K1: 'Z10000' };
			const foo = { Z1K1: 'Z6', Z6K1: 'foo' };
			const bar = { Z1K1: 'Z6', Z6K1: 'bar' };

			const initial = { Z1K1: 'Z7', Z7K1: ref, Z1000K1: foo };
			const transformed = { Z1K1: 'Z7', Z7K1: ref, Z1000K1: bar };

			const matcher = ( node ) => node.Z6K1 === 'foo';
			const transformer = jest.fn().mockReturnValue( bar );

			const result = zobjectUtils.walkAndTransformZObject( initial, matcher, transformer );

			expect( result ).toEqual( transformed );
			expect( transformer ).toHaveBeenCalledWith( foo );
		} );

		it( 'does not mutate the original object', () => {
			const obj = { Z1K1: 'Z7', Z7K1: { Z1K1: 'Z9', Z9K1: '' } };
			const original = JSON.parse( JSON.stringify( obj ) );
			const matcher = ( node ) => node.Z9K1 === '';
			const transformer = () => ( { Z1K1: 'Z9', Z9K1: 'Z10000' } );

			zobjectUtils.walkAndTransformZObject( obj, matcher, transformer );

			expect( obj ).toEqual( original );
		} );

		it( 'maps over array items and transforms matching ones', () => {
			const en = { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' };
			const es = { Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'en español' };
			const multi = { Z1K1: 'Z12', Z12K1: [ 'Z11', en, es ] };

			const bigen = { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'IN ENGLISH' };
			const bigmulti = { Z1K1: 'Z12', Z12K1: [ 'Z11', bigen, es ] };

			const matcher = ( node ) => node.Z11K1 === 'Z1002';
			const transformer = ( node ) => {
				node.Z11K2 = node.Z11K2.toUpperCase();
				return node;
			};

			const result = zobjectUtils.walkAndTransformZObject( multi, matcher, transformer );

			expect( result ).toEqual( bigmulti );
		} );

		it( 'applies matcher to the array itself before mapping its items', () => {
			const en = { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' };
			const es = { Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'en español' };
			const multi = { Z1K1: 'Z12', Z12K1: [ 'Z11', en, es ] };

			const matcher = ( node ) => Array.isArray( node );
			const transformer = ( node ) => node[ 0 ] === 'Z11' ? `${ node.length - 1 } items` : node;

			const result = zobjectUtils.walkAndTransformZObject( multi, matcher, transformer );

			expect( result ).toEqual( { Z1K1: 'Z12', Z12K1: '2 items' } );
		} );

		it( 'transforms all matching nodes in a deeply nested structure', () => {
			const obj = {
				Z1K1: 'Z7',
				Z7K1: 'Z881',
				Z881K1: {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
					Z7K1: { Z1K1: 'Z9', Z9K1: 'Z881' },
					Z881K2: { Z1K1: 'Z9', Z9K1: '' }
				}
			};
			const matcher = ( node ) => node && node.Z9K1 === '';
			const transformer = () => ( { Z1K1: 'Z9', Z9K1: 'Z6' } );

			const result = zobjectUtils.walkAndTransformZObject( obj, matcher, transformer );

			expect( result.Z881K1.Z881K2 ).toEqual( { Z1K1: 'Z9', Z9K1: 'Z6' } );
			expect( result.Z1K1 ).toBe( 'Z7' );
			expect( result.Z881K1.Z7K1.Z9K1 ).toBe( 'Z881' );
		} );
	} );

	describe( 'hasPendingMetadata', () => {
		it( 'returns false when no metadata', () => {
			expect( zobjectUtils.hasPendingMetadata( undefined ) ).toBe( false );
		} );

		it( 'returns false when bad metadata', () => {
			expect( zobjectUtils.hasPendingMetadata( 'Z24' ) ).toBe( false );
		} );

		it( 'returns false when metadata map is empty', () => {
			const emptyMetadata = { Z1K1: 'Z883', K1: [ { Z1K1: 'Z882' } ] };
			expect( zobjectUtils.hasPendingMetadata( emptyMetadata ) ).toBe( false );
		} );

		it( 'returns false when metadata map has no pending key', () => {
			const someMetadata = { Z1K1: 'Z883', K1: [ { Z1K1: 'Z882' },
				{ Z1K2: 'Z882', K1: 'someData', K2: 'woho!' }
			] };
			expect( zobjectUtils.hasPendingMetadata( someMetadata ) ).toBe( false );
		} );

		it( 'returns true when metadata map has a pending key', () => {
			const pendingMetadata = { Z1K1: 'Z883', K1: [ { Z1K1: 'Z882' },
				{ Z1K2: 'Z882', K1: 'pending', K2: 'Z41' }
			] };
			expect( zobjectUtils.hasPendingMetadata( pendingMetadata ) ).toBe( true );
		} );

		it( 'returns true when metadata map has a pending key among others', () => {
			const pendingMetadata = { Z1K1: 'Z883', K1: [ { Z1K1: 'Z882' },
				{ Z1K2: 'Z882', K1: 'someKey', K2: { Z1K1: 'Z6', Z6K1: 'some value' } },
				{ Z1K2: 'Z882', K1: 'pending', K2: 'Z41' },
				{ Z1K2: 'Z882', K1: 'anotherKey', K2: 'another value' }
			] };
			expect( zobjectUtils.hasPendingMetadata( pendingMetadata ) ).toBe( true );
		} );
	} );

	describe( 'countMetadataWarnings', () => {
		const warning = {
			Z1K1: 'Z5',
			Z5K1: 'Z591',
			Z5K2: { Z1K1: { Z1K1: 'Z7', Z7K1: 'Z885', Z885K1: 'Z591' }, Z591K1: '480 MiB' }
		};
		const metadataWith = ( entries ) => ( { Z1K1: 'Z883', K1: [ { Z1K1: 'Z882' } ].concat(
			entries.map( ( [ key, value ] ) => ( { Z1K1: 'Z882', K1: key, K2: value } ) )
		) } );

		it( 'returns zero when there is no metadata', () => {
			expect( zobjectUtils.countMetadataWarnings( undefined ) ).toBe( 0 );
		} );

		it( 'returns zero when the metadata is not a map', () => {
			expect( zobjectUtils.countMetadataWarnings( 'Z24' ) ).toBe( 0 );
		} );

		it( 'returns zero when the metadata has no warnings key', () => {
			expect( zobjectUtils.countMetadataWarnings( metadataWith( [
				[ 'orchestrationDuration', '70 ms' ]
			] ) ) ).toBe( 0 );
		} );

		it( 'returns zero when the list of warnings is empty', () => {
			expect( zobjectUtils.countMetadataWarnings( metadataWith( [
				[ 'warnings', [ 'Z5' ] ]
			] ) ) ).toBe( 0 );
		} );

		it( 'counts the warnings of the function call', () => {
			expect( zobjectUtils.countMetadataWarnings( metadataWith( [
				[ 'warnings', [ 'Z5', warning, warning ] ]
			] ) ) ).toBe( 2 );
		} );

		it( 'counts the warnings of the nested function calls too', () => {
			const child = metadataWith( [ [ 'warnings', [ 'Z5', warning ] ] ] );
			const grandChild = metadataWith( [ [ 'warnings', [ 'Z5', warning, warning ] ] ] );
			const parent = metadataWith( [
				[ 'warnings', [ 'Z5', warning ] ],
				[ 'nestedMetadata', [ { Z1K1: 'Z883' }, child, metadataWith( [
					[ 'nestedMetadata', [ { Z1K1: 'Z883' }, grandChild ] ]
				] ) ] ]
			] );

			expect( zobjectUtils.countMetadataWarnings( parent ) ).toBe( 4 );
		} );

		it( 'counts the warnings of the nested function calls when the parent raised none', () => {
			const child = metadataWith( [ [ 'warnings', [ 'Z5', warning ] ] ] );
			const parent = metadataWith( [
				[ 'orchestrationDuration', '70 ms' ],
				[ 'nestedMetadata', [ { Z1K1: 'Z883' }, child ] ]
			] );

			expect( zobjectUtils.countMetadataWarnings( parent ) ).toBe( 1 );
		} );
	} );
} );
