/*!
 * WikiLambda unit test suite for the ZObjectStringRenderer component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' ),
	shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ZObjectStringRenderer = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZObjectStringRenderer.vue' ),
	convertSetToMap = require( '../../fixtures/metadata.js' ).convertSetToMap;

describe( 'ZObjectStringRenderer', () => {
	let getters, actions;

	const typeZid = 'Z30000';
	const rendererZid = 'Z30010';
	const parserZid = 'Z30020';

	const renderedString = 'dd/mm/yyyy';
	const parsedObject = {
		Z1K1: 'Z30000',
		Z30000K1: 'dd',
		Z30000K2: 'mm',
		Z30000K3: 'yyyy'
	};
	const blankObject = {
		Z1K1: 'Z30000',
		Z30000K1: '',
		Z30000K2: '',
		Z30000K3: ''
	};

	const rendererResponse = {
		response: {
			Z1K1: 'Z22',
			Z22K1: renderedString,
			Z22K2: convertSetToMap( {} )
		}
	};
	const parserResponse = {
		response: {
			Z1K1: 'Z22',
			Z22K1: parsedObject,
			Z22K2: convertSetToMap( {} )
		},
		resolver: {
			resolve: jest.fn()
		}
	};

	const parserBadResponse = {
		response: {
			Z1K1: 'Z22',
			Z22K1: 'some other type',
			Z22K2: convertSetToMap( {} )
		},
		resolver: {
			resolve: jest.fn()
		}
	};

	const customError = {
		Z1K1: 'Z5',
		Z5K1: 'Z500',
		Z5K2: {
			Z1K1: {
				Z1K1: 'Z7',
				Z7K1: 'Z885',
				Z885K1: 'Z500'
			},
			Z500K1: 'Some error message'
		}
	};

	const errorResponse = {
		response: {
			Z1K1: 'Z22',
			Z22K1: Constants.Z_VOID,
			Z22K2: convertSetToMap( { errors: customError } )
		},
		resolver: {
			resolve: jest.fn()
		}
	};

	const storedTests = {
		Z30030: {
			Z2K2: {
				Z1K1: 'Z20',
				Z20K1: rendererZid,
				Z20K2: {
					Z1K1: 'Z7',
					Z7K1: rendererZid,
					[ rendererZid + 'K1' ]: 'first test object',
					[ rendererZid + 'K2' ]: 'Z1003'
				}
			}
		},
		Z30031: {
			Z2K2: {
				Z1K1: 'Z20',
				Z20K1: rendererZid,
				Z20K2: {
					Z1K1: 'Z7',
					Z7K1: rendererZid,
					[ rendererZid + 'K1' ]: 'second test object',
					[ rendererZid + 'K2' ]: 'Z1003'
				}
			}
		},
		Z30032: {
			Z2K2: {
				Z1K1: 'Z20',
				Z20K1: 'Z866',
				Z20K2: {
					Z1K1: 'Z7',
					Z7K1: 'Z866'
				}
			}
		}
	};

	beforeEach( () => {
		getters = {
			createObjectByType: createGettersWithFunctionsMock( blankObject ),
			getCurrentView: createGetterMock(),
			getLabel: createGettersWithFunctionsMock(),
			getPassingTestZids: createGettersWithFunctionsMock( [] ),
			getParserZid: createGettersWithFunctionsMock( parserZid ),
			getRendererZid: createGettersWithFunctionsMock( rendererZid ),
			getRendererExamples: createGettersWithFunctionsMock( [] ),
			getStoredObject: createGettersWithFunctionsMock(),
			getUserLangCode: createGetterMock( 'en' ),
			getUserLangZid: createGetterMock( 'Z1002' ),
			getZObjectAsJsonById: createGettersWithFunctionsMock( parsedObject ),
			isCreateNewPage: createGetterMock(),
			getErrors: createGettersWithFunctionsMock( [] )
		};
		actions = {
			clearErrors: jest.fn(),
			getTestResults: jest.fn( () => {
				return {
					then: ( fn ) => fn()
				};
			} ),
			runRendererTest: jest.fn(),
			runRenderer: jest.fn( () => {
				return {
					then: ( fn ) => fn( rendererResponse )
				};
			} ),
			runParser: jest.fn( () => {
				return {
					then: ( fn ) => fn( parserResponse )
				};
			} ),
			setError: jest.fn()
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	describe( 'in view and edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					edit: false,
					type: typeZid,
					expanded: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-zobject-string-renderer' ).exists() ).toBe( true );
		} );

		it( 'generates the rendered text on mount', () => {
			shallowMount( ZObjectStringRenderer, {
				props: {
					edit: false,
					type: typeZid,
					expanded: false
				}
			} );

			expect( actions.runRenderer ).toHaveBeenCalledWith( expect.anything(), {
				rendererZid,
				zobject: parsedObject,
				zlang: 'Z1002'
			} );
		} );
	} );

	describe( 'in view mode', () => {
		it( 'when collapsed, runs renderer and shows result in text', async () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					edit: false,
					type: typeZid,
					expanded: false
				}
			} );

			const text = wrapper.find( '[data-testid="rendered-text"]' );
			expect( text.exists() ).toBe( true );
			await waitFor( () => expect( text.text() ).toContain( renderedString ) );
		} );

		it( 'when expanded, falls back to ZObjectKeyValueSet', async () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					rowId: 1,
					depth: 2,
					edit: false,
					type: typeZid,
					expanded: true
				}
			} );

			wrapper.setData( { initialized: true } );
			await wrapper.vm.$nextTick();

			const text = wrapper.find( '[data-testid="rendered-text"]' );
			expect( text.exists() ).toBe( false );

			const keyValueSet = wrapper.findComponent( { name: 'wl-z-object-key-value-set' } );
			expect( keyValueSet.exists() ).toBe( true );
			expect( keyValueSet.props( 'rowId' ) ).toBe( 1 );
			expect( keyValueSet.props( 'depth' ) ).toBe( 2 );
			expect( keyValueSet.props( 'edit' ) ).toBe( false );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'when collapsed, runs renderer and shows result in text field', async () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			const text = wrapper.findComponent( { name: 'cdx-text-input' } );
			expect( text.exists() ).toBe( true );
			await waitFor( () => expect( text.vm.modelValue ).toBe( renderedString ) );
		} );

		it( 'when expanded, falls back to ZObjectKeyValueSet', async () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					rowId: 1,
					depth: 2,
					edit: true,
					type: typeZid,
					expanded: true
				}
			} );

			wrapper.setData( { initialized: true } );
			await wrapper.vm.$nextTick();

			const text = wrapper.findComponent( { name: 'cdx-text-input' } );
			expect( text.exists() ).toBe( false );

			const keyValueSet = wrapper.findComponent( { name: 'wl-z-object-key-value-set' } );
			expect( keyValueSet.exists() ).toBe( true );
			expect( keyValueSet.props( 'rowId' ) ).toBe( 1 );
			expect( keyValueSet.props( 'depth' ) ).toBe( 2 );
			expect( keyValueSet.props( 'edit' ) ).toBe( true );
		} );

		it( 'on collapse event, runs renderer', async () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					edit: true,
					type: typeZid,
					expanded: true
				}
			} );

			wrapper.setData( { initialized: true } );
			await wrapper.vm.$nextTick();

			// Make sure that the state is collapsed
			const keyValueSet = wrapper.findComponent( { name: 'wl-z-object-key-value-set' } );
			expect( keyValueSet.exists() ).toBe( true );

			// Clear runRenderer action
			actions.runRenderer = jest.fn();
			global.store.hotUpdate( { actions: actions } );

			// Update expanded prop
			wrapper.setProps( { expanded: false } );
			await wrapper.vm.$nextTick();

			await waitFor( () => expect( actions.runRenderer ).toHaveBeenCalledWith( expect.anything(), {
				rendererZid,
				zobject: parsedObject,
				zlang: 'Z1002'
			} ) );
		} );

		it( 'on renderer field update, runs parser', () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			const newValue = 'some new value';
			const text = wrapper.findComponent( { name: 'cdx-text-input' } );
			text.vm.$emit( 'change', { target: { value: newValue } } );
			expect( actions.runParser ).toHaveBeenCalledWith( expect.anything(), {
				parserZid,
				zobject: newValue,
				zlang: 'Z1002',
				wait: true
			} );
		} );

		it( 'runs test results on mount', () => {
			shallowMount( ZObjectStringRenderer, {
				props: {
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			expect( actions.getTestResults ).toHaveBeenCalledWith( expect.anything(), {
				zFunctionId: rendererZid
			} );
		} );

		it( 'if no passing tests, and is special page, trigger expansion', async () => {
			getters.isCreateNewPage = createGetterMock( true );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			await waitFor( () => expect( wrapper.emitted( 'expand' ) ).toBeTruthy() );
		} );

		it( 'computes passing tests to generate examples, tests not fetched', async () => {
			getters.getPassingTestZids = createGettersWithFunctionsMock( [ 'Z30030', 'Z30031' ] );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			await waitFor( () => expect( wrapper.vm.validRendererTests.length ).toBe( 0 ) );
		} );

		it( 'computes passing tests to generate examples, tests fetched', async () => {
			getters.getPassingTestZids = createGettersWithFunctionsMock( [ 'Z30030', 'Z30031' ] );
			getters.getStoredObject = () => ( zid ) => storedTests[ zid ];
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			await waitFor( () => {
				expect( wrapper.vm.validRendererTests.length ).toBe( 2 );
				expect( wrapper.vm.validRendererTests ).toEqual( [
					{
						zid: 'Z30030',
						zobject: storedTests.Z30030.Z2K2
					},
					{
						zid: 'Z30031',
						zobject: storedTests.Z30031.Z2K2
					}
				] );
			} );
		} );

		it( 'excludes not wellformed tests', async () => {
			getters.getPassingTestZids = createGettersWithFunctionsMock( [ 'Z30030', 'Z30031', 'Z30032' ] );
			getters.getStoredObject = () => ( zid ) => storedTests[ zid ];
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			await waitFor( () => {
				expect( wrapper.vm.validRendererTests.length ).toBe( 2 );
				expect( wrapper.vm.validRendererTests ).toEqual( [
					{
						zid: 'Z30030',
						zobject: storedTests.Z30030.Z2K2
					},
					{
						zid: 'Z30031',
						zobject: storedTests.Z30031.Z2K2
					}
				] );
			} );
		} );

		it( 'runs tests with user language', async () => {
			getters.getStoredObject = () => ( zid ) => storedTests[ zid ];
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			getters.getPassingTestZids = createGettersWithFunctionsMock( [ 'Z30030', 'Z30031' ] );
			global.store.hotUpdate( { getters: getters } );

			await waitFor( () => {
				expect( wrapper.vm.validRendererTests.length ).toBe( 2 );
				expect( actions.runRendererTest ).toHaveBeenCalledWith( expect.anything(), {
					rendererZid,
					testZid: 'Z30030',
					test: storedTests.Z30030.Z2K2,
					zlang: 'Z1002'
				} );
				expect( actions.runRendererTest ).toHaveBeenCalledWith( expect.anything(), {
					rendererZid,
					testZid: 'Z30031',
					test: storedTests.Z30031.Z2K2,
					zlang: 'Z1002'
				} );
			} );
		} );

		it( 'uses first example as placeholder', () => {
			getters.getRendererExamples = createGettersWithFunctionsMock( [
				{ testZid: 'Z30030', result: 'example one' },
				{ testZid: 'Z30031', result: 'example two' }
			] );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			const text = wrapper.findComponent( { name: 'cdx-text-input' } );
			expect( text.attributes( 'placeholder' ) ).toBe( 'E.g. $1' );
			expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-string-renderer-field-example', 'example one' );
		} );

		describe( 'renderer error handling', () => {
			it( 'renderer returns void, no examples', async () => {
				actions.runRenderer = jest.fn( () => {
					return {
						then: ( fn ) => fn( errorResponse )
					};
				} );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );
				shallowMount( ZObjectStringRenderer, {
					props: {
						rowId: 1,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );

				const errorPayload = {
					rowId: 1,
					errorType: Constants.errorTypes.ERROR,
					errorMessage: 'Some error message'
				};

				await waitFor( () => expect( actions.setError ).toHaveBeenCalledWith( expect.anything(), errorPayload ) );
			} );

			it( 'renderer returns void, available examples', async () => {
				getters.getRendererExamples = createGettersWithFunctionsMock( [
					{ testZid: 'Z30030', result: 'example one' },
					{ testZid: 'Z30031', result: 'example two' }
				] );
				actions.runRenderer = jest.fn( () => {
					return {
						then: ( fn ) => fn( errorResponse )
					};
				} );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );
				shallowMount( ZObjectStringRenderer, {
					props: {
						rowId: 1,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );

				const errorPayload = {
					rowId: 1,
					errorType: Constants.errorTypes.ERROR,
					errorMessage: 'Some error message'
				};

				await waitFor( () => expect( actions.setError ).toHaveBeenCalledWith( expect.anything(), errorPayload ) );
			} );

			it( 'renderer returns wrong type', async () => {
				actions.runRenderer = jest.fn( () => {
					return {
						then: ( fn ) => fn( parserResponse )
					};
				} );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );
				shallowMount( ZObjectStringRenderer, {
					props: {
						rowId: 1,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );

				const errorPayload = {
					rowId: 1,
					errorType: Constants.errorTypes.ERROR,
					errorMessage: '[[$1|Display function]] returned an unexpected result.'
				};

				await waitFor( () => expect( actions.setError ).toHaveBeenCalledWith( expect.anything(), errorPayload ) );
				expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-renderer-unexpected-result-error', rendererZid );
			} );
		} );

		describe( 'parser error handling', () => {
			it( 'parser returns void, no examples', async () => {
				actions.runParser = jest.fn( () => {
					return {
						then: ( fn ) => fn( errorResponse )
					};
				} );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );
				const wrapper = shallowMount( ZObjectStringRenderer, {
					props: {
						rowId: 1,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );

				const text = wrapper.findComponent( { name: 'cdx-text-input' } );
				text.vm.$emit( 'change', { target: { value: 'some new value' } } );

				const errorPayload = {
					rowId: 1,
					errorType: Constants.errorTypes.ERROR,
					errorMessage: 'Some error message'
				};

				await waitFor( () => expect( actions.setError ).toHaveBeenCalledWith( expect.anything(), errorPayload ) );
			} );

			it( 'parser returns void, available examples', async () => {
				getters.getRendererExamples = createGettersWithFunctionsMock( [
					{ testZid: 'Z30030', result: 'example one' },
					{ testZid: 'Z30031', result: 'example two' }
				] );
				actions.runParser = jest.fn( () => {
					return {
						then: ( fn ) => fn( errorResponse )
					};
				} );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );
				const wrapper = shallowMount( ZObjectStringRenderer, {
					props: {
						rowId: 1,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );

				const text = wrapper.findComponent( { name: 'cdx-text-input' } );
				text.vm.$emit( 'change', { target: { value: 'some new value' } } );

				const errorPayload = {
					rowId: 1,
					errorType: Constants.errorTypes.ERROR,
					errorMessage: 'Some error message'
				};

				await waitFor( () => expect( actions.setError ).toHaveBeenCalledWith( expect.anything(), errorPayload ) );
			} );

			it( 'parser returns wrong type', async () => {
				actions.runParser = jest.fn( () => {
					return {
						then: ( fn ) => fn( parserBadResponse )
					};
				} );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );
				const wrapper = shallowMount( ZObjectStringRenderer, {
					props: {
						rowId: 1,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );

				const text = wrapper.findComponent( { name: 'cdx-text-input' } );
				text.vm.$emit( 'change', { target: { value: 'some new value' } } );

				const errorPayload = {
					rowId: 1,
					errorType: Constants.errorTypes.ERROR,
					errorMessage: '[[$1|Reading function]] returned an unexpected result.'
				};

				await waitFor( () => expect( actions.setError ).toHaveBeenCalledWith( expect.anything(), errorPayload ) );
				expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-parser-unexpected-result-error', parserZid );
			} );
		} );

		it( 'creates an examples dialog window', async () => {
			const rendererLabel = 'Renderer function label';
			getters.getLabel = createGettersWithFunctionsMock( rendererLabel );
			getters.getRendererExamples = createGettersWithFunctionsMock( [
				{ testZid: 'Z30030', result: 'example one' },
				{ testZid: 'Z30031', result: 'example two' }
			] );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					rowId: 1,
					edit: true,
					type: typeZid,
					expanded: false
				},
				global: { stubs: { CdxDialog: false, teleport: true } }
			} );

			// Open dialog window
			wrapper.setData( { showExamplesDialog: true } );
			await wrapper.vm.$nextTick();

			const exampleList = wrapper.find( '.ext-wikilambda-zobject-string-renderer-examples' );
			const examples = exampleList.findAll( 'li' );
			expect( examples.length ).toBe( 2 );
			expect( examples[ 0 ].text() ).toBe( 'example one' );
			expect( examples[ 1 ].text() ).toBe( 'example two' );

			const dialogFooter = wrapper.find( '.cdx-dialog__footer' );
			const link = dialogFooter.find( 'a' );
			expect( link.attributes( 'href' ) ).toContain( rendererZid );
			expect( link.text() ).toBe( rendererLabel );
		} );
	} );
} );
