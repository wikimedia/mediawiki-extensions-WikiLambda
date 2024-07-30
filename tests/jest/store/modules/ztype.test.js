/*!
 * WikiLambda unit test suite for the types Vuex module, which
 * handles type renderers and parsers.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const ztypeModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/ztype.js' );

describe( 'ztype Vuex module', () => {
	let state, context;
	const typeZid = 'Z30000';
	const rendererZid = 'Z30001';
	const parserZid = 'Z30002';

	beforeEach( () => {
		state = {
			renderers: {},
			parsers: {},
			rendererExamples: {}
		};
	} );

	describe( 'Getters', () => {
		describe( 'getRendererZid', () => {
			it( 'returns renderer zid when set', () => {
				state.renderers = {
					[ typeZid ]: rendererZid
				};
				expect( ztypeModule.getters.getRendererZid( state )( typeZid ) ).toBe( rendererZid );
			} );

			it( 'returns undefined when not set', () => {
				state.renderers = {};
				expect( ztypeModule.getters.getRendererZid( state )( typeZid ) ).toBe( undefined );
			} );
		} );

		describe( 'getParserZid', () => {
			it( 'returns parser zid when set', () => {
				state.parsers = {
					[ typeZid ]: parserZid
				};
				expect( ztypeModule.getters.getParserZid( state )( typeZid ) ).toBe( parserZid );
			} );

			it( 'returns undefined when not set', () => {
				state.renderers = {};
				expect( ztypeModule.getters.getRendererZid( state )( typeZid ) ).toBe( undefined );
			} );
		} );

		describe( 'hasRenderer', () => {
			it( 'returns false when renderer is not set', () => {
				expect( ztypeModule.getters.hasRenderer( state )( typeZid ) ).toBe( false );
			} );

			it( 'returns false when renderer is set but falsy', () => {
				state.renderers = {
					[ typeZid ]: undefined
				};
				expect( ztypeModule.getters.hasRenderer( state )( typeZid ) ).toBe( false );
			} );

			it( 'returns true when renderer is set', () => {
				state.renderers = {
					[ typeZid ]: rendererZid
				};
				expect( ztypeModule.getters.hasRenderer( state )( typeZid ) ).toBe( true );
			} );
		} );

		describe( 'hasParser', () => {
			it( 'returns false when parser is not set', () => {
				expect( ztypeModule.getters.hasParser( state )( typeZid ) ).toBe( false );
			} );

			it( 'returns false when parser is set but falsy', () => {
				state.parsers = {
					[ typeZid ]: undefined
				};
				expect( ztypeModule.getters.hasParser( state )( typeZid ) ).toBe( false );
			} );

			it( 'returns true when parser is set', () => {
				state.parsers = {
					[ typeZid ]: parserZid
				};
				expect( ztypeModule.getters.hasParser( state )( typeZid ) ).toBe( true );
			} );
		} );

		describe( 'getRendererExamples', () => {
			it( 'returns empty array when no examples are set', () => {
				const expected = [];
				expect( ztypeModule.getters.getRendererExamples( state )( rendererZid ) ).toEqual( expected );
			} );

			it( 'returns empty array when no examples are set for the renderer', () => {
				state.rendererExamples = {
					[ rendererZid ]: {}
				};
				const expected = [];
				expect( ztypeModule.getters.getRendererExamples( state )( rendererZid ) ).toEqual( expected );
			} );

			it( 'returns empty array when examples are undefined', () => {
				state.rendererExamples = {
					[ rendererZid ]: {
						Z30010: undefined,
						Z30011: undefined
					}
				};
				const expected = [];
				expect( ztypeModule.getters.getRendererExamples( state )( rendererZid ) ).toEqual( expected );
			} );

			it( 'returns array of examples', () => {
				state.rendererExamples = {
					[ rendererZid ]: {
						Z30010: 'one',
						Z30011: 'two'
					}
				};
				const expected = [
					{ testZid: 'Z30010', result: 'one' },
					{ testZid: 'Z30011', result: 'two' }
				];
				expect( ztypeModule.getters.getRendererExamples( state )( rendererZid ) ).toEqual( expected );
			} );

			it( 'returns example for a given test', () => {
				state.rendererExamples = {
					[ rendererZid ]: {
						Z30010: 'one',
						Z30011: 'two'
					}
				};
				const expected = [
					{ testZid: 'Z30011', result: 'two' }
				];
				expect( ztypeModule.getters.getRendererExamples( state )( rendererZid, 'Z30011' ) ).toEqual( expected );
			} );
		} );
	} );

	describe( 'Mutations', () => {
		describe( 'setRenderer', () => {
			it( 'sets renderer in the store', () => {
				const payload = {
					type: typeZid,
					renderer: rendererZid
				};
				const expected = {
					[ typeZid ]: rendererZid
				};
				ztypeModule.mutations.setRenderer( state, payload );
				expect( state.renderers ).toEqual( expected );
			} );
		} );

		describe( 'setParser', () => {
			it( 'sets parser in the store', () => {
				const payload = {
					type: typeZid,
					parser: parserZid
				};
				const expected = {
					[ typeZid ]: parserZid
				};
				ztypeModule.mutations.setParser( state, payload );
				expect( state.parsers ).toEqual( expected );
			} );
		} );

		describe( 'setRendererExample', () => {
			it( 'sets renderer example when store is empty', () => {
				const payload = {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					example: 'one'
				};
				const expected = {
					[ rendererZid ]: {
						Z30010: 'one'
					}
				};
				ztypeModule.mutations.setRendererExample( state, payload );
				expect( state.rendererExamples ).toEqual( expected );
			} );

			it( 'sets renderer example when store has more examples', () => {
				state.rendererExamples = {
					[ rendererZid ]: {
						Z30010: 'one'
					}
				};
				const payload = {
					rendererZid: rendererZid,
					testZid: 'Z30011',
					example: 'two'
				};
				const expected = {
					[ rendererZid ]: {
						Z30010: 'one',
						Z30011: 'two'
					}
				};
				ztypeModule.mutations.setRendererExample( state, payload );
				expect( state.rendererExamples ).toEqual( expected );
			} );
		} );
	} );

	describe( 'Actions', () => {
		let postMock, data;

		beforeEach( () => {
			context = Object.assign( {}, {
				commit: jest.fn(),
				dispatch: jest.fn(),
				getters: {}
			} );
			data = '{ "Z1K1": "Z6", "Z6K1": "some response" }';
			postMock = jest.fn( () => new Promise( ( resolve ) => {
				resolve( {
					query: {
						wikilambda_function_call: { data }
					}
				} );
			} ) );
			mw.Api = jest.fn( () => ( {
				post: postMock
			} ) );
		} );

		describe( 'runRenderer', () => {
			it( 'builds a function call and runs it', () => {
				const payload = {
					rendererZid: rendererZid,
					zobject: { some: 'object' },
					zlang: 'Z1002'
				};
				const functionCall = {
					Z1K1: 'Z7',
					Z7K1: rendererZid,
					[ rendererZid + 'K1' ]: { some: 'object' },
					[ rendererZid + 'K2' ]: 'Z1002'
				};
				ztypeModule.actions.runRenderer( context, payload );
				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					wikilambda_function_call_zobject: JSON.stringify( functionCall )
				} );
			} );
		} );

		describe( 'runParser', () => {
			it( 'builds a function call and runs it', () => {
				const payload = {
					parserZid: parserZid,
					zobject: 'some string',
					zlang: 'Z1002'
				};
				const functionCall = {
					Z1K1: 'Z7',
					Z7K1: parserZid,
					[ parserZid + 'K1' ]: 'some string',
					[ parserZid + 'K2' ]: 'Z1002'
				};
				ztypeModule.actions.runParser( context, payload );
				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					wikilambda_function_call_zobject: JSON.stringify( functionCall )
				} );
			} );

			it( 'builds a function call and runs it, also when blocking', () => {
				const payload = {
					parserZid: parserZid,
					zobject: 'some string',
					zlang: 'Z1002',
					wait: 'wait for me, Henry!'
				};
				const functionCall = {
					Z1K1: 'Z7',
					Z7K1: parserZid,
					[ parserZid + 'K1' ]: 'some string',
					[ parserZid + 'K2' ]: 'Z1002'
				};
				ztypeModule.actions.runParser( context, payload );
				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					wikilambda_function_call_zobject: JSON.stringify( functionCall )
				} );
			} );

		} );

		describe( 'runRendererTest', () => {
			const testObject = {
				Z1K1: 'Z20',
				Z20K1: rendererZid,
				Z20K2: {
					Z1K1: 'Z7',
					Z7K1: rendererZid,
					[ rendererZid + 'K1' ]: 'some object',
					[ rendererZid + 'K2' ]: 'Z1003'
				},
				Z20K3: {
					Z1K1: 'Z7',
					Z7K1: 'Z866',
					Z866K2: 'rendered result'
				}
			};

			it( 'does not run the test if it has been run', () => {
				state.rendererExamples = {
					[ rendererZid ]: {
						Z30010: 'one'
					}
				};
				context.getters = {
					getRendererExamples: ztypeModule.getters.getRendererExamples( state )
				};
				const payload = {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					test: testObject,
					zlang: 'Z1002'
				};

				ztypeModule.actions.runRendererTest( context, payload );
				expect( postMock ).not.toHaveBeenCalled();
				expect( context.commit ).not.toHaveBeenCalled();
			} );

			it( 'edits and runs the renderer test', () => {
				// Empty rendererExamples
				state.rendererExamples = {};
				context.getters = {
					getRendererExamples: ztypeModule.getters.getRendererExamples( state )
				};

				const payload = {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					test: testObject,
					zlang: 'Z1002'
				};
				const functionCall = {
					Z1K1: 'Z7',
					Z7K1: rendererZid,
					[ rendererZid + 'K1' ]: 'some object',
					[ rendererZid + 'K2' ]: 'Z1002'
				};
				ztypeModule.actions.runRendererTest( context, payload );

				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					wikilambda_function_call_zobject: JSON.stringify( functionCall )
				} );
			} );

			it( 'on successful response, set renderer test', async () => {
				// Empty rendererExamples
				state.rendererExamples = {};
				context.getters = {
					getRendererExamples: ztypeModule.getters.getRendererExamples( state )
				};
				// Mock successful response
				const successfulResponse = {
					Z1K1: 'Z22',
					Z22K1: 'example one',
					Z22K2: 'metadata'
				};
				postMock = jest.fn( () => new Promise( ( resolve ) => {
					resolve( {
						query: {
							wikilambda_function_call: { data: JSON.stringify( successfulResponse ) }
						}
					} );
				} ) );
				mw.Api = jest.fn( () => ( { post: postMock } ) );

				const payload = {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					test: testObject,
					zlang: 'Z1002'
				};
				await ztypeModule.actions.runRendererTest( context, payload );

				expect( context.commit ).toHaveBeenCalledTimes( 2 );
				expect( context.commit ).toHaveBeenCalledWith( 'setRendererExample', {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					example: undefined
				} );
				expect( context.commit ).toHaveBeenCalledWith( 'setRendererExample', {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					example: 'example one'
				} );
			} );

			it( 'on failed response, leave renderer test as undefined', async () => {
				state.rendererExamples = {};
				context.getters = {
					getRendererExamples: ztypeModule.getters.getRendererExamples( state )
				};
				const failedResponse = {
					Z1K1: 'Z22',
					Z22K1: 'Z24',
					Z22K2: 'metadata'
				};
				postMock = jest.fn( () => new Promise( ( resolve ) => {
					resolve( {
						query: {
							wikilambda_function_call: { data: JSON.stringify( failedResponse ) }
						}
					} );
				} ) );
				mw.Api = jest.fn( () => ( { post: postMock } ) );

				const payload = {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					test: testObject,
					zlang: 'Z1002'
				};
				await ztypeModule.actions.runRendererTest( context, payload );

				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setRendererExample', {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					example: undefined
				} );
			} );
		} );
	} );
} );
