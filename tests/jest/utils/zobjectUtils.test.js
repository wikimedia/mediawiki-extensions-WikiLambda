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
					Z60K1: 'ast'
				},
				Z11K2: 'terminal value'
			};
			const expected = 'ast';

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
					Z60K1: 'ast'
				},
				Z31K2: [ 'Z6' ]
			};
			const expected = 'ast';

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
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: 'ast' }, Z11K2: 'asturianu' },
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: 'gl' }, Z11K2: 'galego' },
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: 'eu' }, Z11K2: 'euskara' },
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: 'ca' }, Z11K2: 'català' }
				]
			};
			const expected = [ 'ast', 'gl', 'eu', 'ca' ];

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
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: 'ast' }, Z31K2: [ 'Z6', 'asturianu' ] },
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: 'gl' }, Z31K2: [ 'Z6', 'galego' ] },
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: 'eu' }, Z31K2: [ 'Z6', 'euskara' ] },
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: 'ca' }, Z31K2: [ 'Z6', 'català' ] }
				]
			};
			const expected = [ 'ast', 'gl', 'eu', 'ca' ];

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
					{ Z1K1: 'Z11', Z11K1: { Z1K1: 'Z60', Z60K1: 'ast' }, Z11K2: 'asturianu' },
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
					{ Z1K1: 'Z31', Z31K1: { Z1K1: 'Z60', Z60K1: 'ast' }, Z31K2: [ 'Z6', 'asturianu' ] },
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
} );
