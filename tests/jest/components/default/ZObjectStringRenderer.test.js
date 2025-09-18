/*!
 * WikiLambda unit test suite for the ZObjectStringRenderer component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { shallowMount } = require( '@vue/test-utils' );
const { dialogGlobalStubs } = require( '../../helpers/dialogTestHelpers.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const convertSetToMap = require( '../../fixtures/metadata.js' ).convertSetToMap;
const createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock;
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ZObjectStringRenderer = require( '../../../../resources/ext.wikilambda.app/components/types/ZObjectStringRenderer.vue' );

// General use
const keyPath = 'main.Z2K2';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z30000' },
	Z30000K1: { Z1K1: 'Z6', Z6K1: 'dd' },
	Z30000K2: { Z1K1: 'Z6', Z6K1: 'mm' },
	Z30000K3: { Z1K1: 'Z6', Z6K1: 'yyyy' }
};

const blankObjectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z30000' },
	Z30000K1: { Z1K1: 'Z6', Z6K1: '' },
	Z30000K2: { Z1K1: 'Z6', Z6K1: '' },
	Z30000K3: { Z1K1: 'Z6', Z6K1: '' }
};

const typeZid = 'Z30000';
const rendererZid = 'Z30010';
const renderedString = 'dd/mm/yyyy';
const rendererResponse = {
	response: {
		Z1K1: 'Z22',
		Z22K1: renderedString,
		Z22K2: convertSetToMap( {} )
	}
};

const parserZid = 'Z30020';
const parsedObject = {
	Z1K1: 'Z30000',
	Z30000K1: 'dd',
	Z30000K2: 'mm',
	Z30000K3: 'yyyy'
};
const parserResponse = {
	response: {
		Z1K1: 'Z22',
		Z22K1: parsedObject,
		Z22K2: convertSetToMap( {} )
	},
	resolver: { resolve: jest.fn() }
};
const parserBadResponse = {
	response: {
		Z1K1: 'Z22',
		Z22K1: 'some other type',
		Z22K2: convertSetToMap( {} )
	},
	resolver: { resolve: jest.fn() }
};

const canonicalBlankObject = {
	Z1K1: 'Z30000',
	Z30000K1: '',
	Z30000K2: '',
	Z30000K3: ''
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

const storedObjects = {
	Z30000: {
		Z2K2: {
			Z1K1: 'Z4',
			Z4K2: [ 'Z17',
				{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z30000K1' },
				{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z30000K2' },
				{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z30000K3' }
			]
		}
	},
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
			Z20K2: { Z1K1: 'Z7', Z7K1: 'Z866' }
		}
	}
};

describe( 'ZObjectStringRenderer', () => {
	let store;

	beforeEach( () => {
		jest.clearAllMocks();
		store = useMainStore();

		store.createObjectByType = createGettersWithFunctionsMock( canonicalBlankObject );
		store.getCurrentView = 'view';
		store.getLabelData = createLabelDataMock();
		store.getPassingTestZids = createGettersWithFunctionsMock( [] );
		store.getParserZid = createGettersWithFunctionsMock( parserZid );
		store.getRendererZid = createGettersWithFunctionsMock( rendererZid );
		store.getRendererExamples = createGettersWithFunctionsMock( [] );
		store.getStoredObject = jest.fn().mockImplementation( ( zid ) => storedObjects[ zid ] );
		store.getUserLangCode = 'en';
		store.getUserLangZid = 'Z1002';
		store.isCreateNewPage = false;
		store.getErrors = createGettersWithFunctionsMock( [] );

		store.getTestResults = jest.fn().mockResolvedValue();
		store.runParser = jest.fn().mockResolvedValue( parserResponse );
		store.runRenderer = jest.fn().mockResolvedValue( rendererResponse );
	} );

	describe( 'in view and edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					type: typeZid,
					expanded: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-app-object-string-renderer' ).exists() ).toBe( true );
		} );

		it( 'generates the rendered text on mount', () => {
			shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					type: typeZid,
					expanded: false
				}
			} );

			expect( store.runRenderer ).toHaveBeenCalledWith( {
				rendererZid,
				zobject: parsedObject,
				zlang: 'Z1002'
			} );
		} );
	} );

	describe( 'in view mode', () => {
		it( 'when collapsed, shows a loading state when running the renderer and then shows result in text', async () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					type: typeZid,
					expanded: false
				}
			} );

			const text = wrapper.find( '[data-testid="zobject-string-renderer-text"]' );
			expect( text.exists() ).toBe( true );
			// Initially, the text should show "Running…"
			await waitFor( () => expect( wrapper.vm.$data.rendererRunning ).toBeTruthy() );
			expect( text.text() ).toBe( 'Running…' );
			// After the renderer is done, the text should show the rendered string
			await waitFor( () => expect( text.text() ).toContain( renderedString ) );
		} );

		it( 'when expanded, falls back to ZObjectKeyValueSet', async () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
					edit: false,
					type: typeZid,
					expanded: true
				}
			} );

			wrapper.setData( { initialized: true } );
			await wrapper.vm.$nextTick();

			const text = wrapper.find( '[data-testid="zobject-string-renderer-text"]' );
			expect( text.exists() ).toBe( false );

			const keyValueSet = wrapper.findComponent( { name: 'wl-z-object-key-value-set' } );
			expect( keyValueSet.exists() ).toBe( true );
			expect( keyValueSet.props( 'keyPath' ) ).toBe( keyPath );
			expect( keyValueSet.props( 'objectValue' ) ).toEqual( objectValue );
			expect( keyValueSet.props( 'edit' ) ).toBe( false );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'when collapsed, shows a loading state when running the renderer and then shows result in text field', async () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			const text = wrapper.findComponent( { name: 'cdx-text-input' } );
			expect( text.exists() ).toBe( true );
			// Initially, the input value should show "Running…"
			await waitFor( () => expect( wrapper.vm.$data.rendererRunning ).toBeTruthy() );
			expect( text.vm.modelValue ).toBe( 'Running…' );
			// After the renderer is done, the input value should show the rendered string
			await waitFor( () => expect( text.vm.modelValue ).toBe( renderedString ) );
		} );

		it( 'when expanded, falls back to ZObjectKeyValueSet', async () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
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
			expect( keyValueSet.props( 'keyPath' ) ).toBe( keyPath );
			expect( keyValueSet.props( 'objectValue' ) ).toEqual( objectValue );
			expect( keyValueSet.props( 'edit' ) ).toBe( true );
		} );

		it( 'on collapse event, runs renderer', async () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
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

			// Update expanded prop
			wrapper.setProps( { expanded: false } );
			await wrapper.vm.$nextTick();

			await waitFor( () => expect( store.runRenderer ).toHaveBeenCalledWith( {
				rendererZid,
				zobject: parsedObject,
				zlang: 'Z1002'
			} ) );
		} );

		it( 'on renderer field update, runs parser', () => {
			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			const newValue = 'some new value';
			const text = wrapper.findComponent( { name: 'cdx-text-input' } );
			text.vm.$emit( 'change', { target: { value: newValue } } );
			expect( store.runParser ).toHaveBeenCalledWith( {
				parserZid,
				zobject: newValue,
				zlang: 'Z1002',
				wait: true,
				signal: expect.any( Object )
			} );
		} );

		it( 'runs test results on mount', () => {
			shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			expect( store.getTestResults ).toHaveBeenCalledWith( {
				zFunctionId: rendererZid
			} );
		} );

		it( 'if no passing tests, and is special page, trigger expansion', async () => {
			store.isCreateNewPage = true;

			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			await waitFor( () => expect( wrapper.emitted( 'expand' ) ).toBeTruthy() );
		} );

		it( 'computes passing tests to generate examples, tests not fetched', async () => {
			store.getPassingTestZids = createGettersWithFunctionsMock( [ 'Z30030', 'Z30031' ] );

			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			await waitFor( () => expect( wrapper.vm.validRendererTests.length ).toBe( 0 ) );
		} );

		it( 'computes passing tests to generate examples, tests fetched', async () => {
			store.getPassingTestZids = createGettersWithFunctionsMock( [ 'Z30030', 'Z30031' ] );

			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
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
						zobject: storedObjects.Z30030.Z2K2
					},
					{
						zid: 'Z30031',
						zobject: storedObjects.Z30031.Z2K2
					}
				] );
			} );
		} );

		it( 'excludes not wellformed tests', async () => {
			store.getPassingTestZids = createGettersWithFunctionsMock( [ 'Z30030', 'Z30031', 'Z30032' ] );

			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
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
						zobject: storedObjects.Z30030.Z2K2
					},
					{
						zid: 'Z30031',
						zobject: storedObjects.Z30031.Z2K2
					}
				] );
			} );
		} );

		it( 'runs tests with user language', async () => {
			store.getPassingTestZids = createGettersWithFunctionsMock( [ 'Z30030', 'Z30031' ] );

			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			await waitFor( () => {
				expect( wrapper.vm.validRendererTests.length ).toBe( 2 );
				expect( store.runRendererTest ).toHaveBeenCalledWith( {
					rendererZid,
					testZid: 'Z30030',
					test: storedObjects.Z30030.Z2K2,
					zlang: 'Z1002'
				} );
				expect( store.runRendererTest ).toHaveBeenCalledWith( {
					rendererZid,
					testZid: 'Z30031',
					test: storedObjects.Z30031.Z2K2,
					zlang: 'Z1002'
				} );
			} );
		} );

		it( 'uses first example as placeholder', () => {
			store.getRendererExamples = createGettersWithFunctionsMock( [
				{ testZid: 'Z30030', result: 'example one' },
				{ testZid: 'Z30031', result: 'example two' }
			] );

			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					type: typeZid,
					expanded: false
				}
			} );

			const text = wrapper.findComponent( { name: 'cdx-text-input' } );
			expect( text.attributes( 'placeholder' ) ).toBe( 'E.g. example one' );
		} );

		describe( 'renderer error handling', () => {
			it( 'renderer returns void, no examples', async () => {
				store.runRenderer = jest.fn().mockResolvedValue( errorResponse );

				shallowMount( ZObjectStringRenderer, {
					props: {
						keyPath,
						objectValue,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );

				const errorPayload = {
					errorId: keyPath,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessage: 'Some error message'
				};

				await waitFor( () => expect( store.setError ).toHaveBeenCalledWith( errorPayload ) );
			} );

			it( 'renderer returns void, available examples', async () => {
				store.getRendererExamples = createGettersWithFunctionsMock( [
					{ testZid: 'Z30030', result: 'example one' },
					{ testZid: 'Z30031', result: 'example two' }
				] );
				store.runRenderer = jest.fn().mockResolvedValue( errorResponse );

				shallowMount( ZObjectStringRenderer, {
					props: {
						keyPath,
						objectValue,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );

				const errorPayload = {
					errorId: keyPath,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessage: 'Some error message'
				};

				await waitFor( () => expect( store.setError ).toHaveBeenCalledWith( errorPayload ) );
			} );

			it( 'renderer returns wrong type', async () => {
				store.runRenderer = jest.fn().mockResolvedValue( parserResponse );

				shallowMount( ZObjectStringRenderer, {
					props: {
						keyPath,
						objectValue,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );

				const errorPayload = {
					errorId: keyPath,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessage: `[[${ rendererZid }|Display function]] returned an unexpected result.`
				};

				await waitFor( () => expect( store.setError ).toHaveBeenCalledWith( errorPayload ) );
			} );
		} );

		describe( 'parser error handling', () => {
			it( 'parser returns void, no examples', async () => {
				store.runParser = jest.fn().mockResolvedValue( errorResponse );

				const wrapper = shallowMount( ZObjectStringRenderer, {
					props: {
						keyPath,
						objectValue,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );

				const text = wrapper.findComponent( { name: 'cdx-text-input' } );
				text.vm.$emit( 'change', { target: { value: 'some new value' } } );

				const errorPayload = {
					errorId: keyPath,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessage: 'Some error message'
				};

				await waitFor( () => expect( store.setError ).toHaveBeenCalledWith( errorPayload ) );
			} );

			it( 'parser returns void, available examples', async () => {
				store.getRendererExamples = createGettersWithFunctionsMock( [
					{ testZid: 'Z30030', result: 'example one' },
					{ testZid: 'Z30031', result: 'example two' }
				] );
				store.runParser = jest.fn().mockResolvedValue( errorResponse );

				const wrapper = shallowMount( ZObjectStringRenderer, {
					props: {
						keyPath,
						objectValue,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );

				const text = wrapper.findComponent( { name: 'cdx-text-input' } );
				text.vm.$emit( 'change', { target: { value: 'some new value' } } );

				const errorPayload = {
					errorId: keyPath,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessage: 'Some error message'
				};

				await waitFor( () => expect( store.setError ).toHaveBeenCalledWith( errorPayload ) );
			} );

			it( 'parser returns wrong type', async () => {
				store.runParser = jest.fn().mockResolvedValue( parserBadResponse );

				const wrapper = shallowMount( ZObjectStringRenderer, {
					props: {
						keyPath,
						objectValue,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );

				const text = wrapper.findComponent( { name: 'cdx-text-input' } );
				text.vm.$emit( 'change', { target: { value: 'some new value' } } );

				const errorPayload = {
					errorId: keyPath,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessage: `[[${ parserZid }|Reading function]] returned an unexpected result.`
				};

				await waitFor( () => expect( store.setError ).toHaveBeenCalledWith( errorPayload ) );
			} );
		} );

		it( 'creates an examples dialog window', async () => {
			const rendererLabel = 'Renderer function label';
			store.getLabelData = createLabelDataMock( { [ rendererZid ]: rendererLabel } );
			store.getRendererExamples = createGettersWithFunctionsMock( [
				{ testZid: 'Z30030', result: 'example one' },
				{ testZid: 'Z30031', result: 'example two' }
			] );

			const wrapper = shallowMount( ZObjectStringRenderer, {
				props: {
					keyPath,
					objectValue,
					edit: true,
					type: typeZid,
					expanded: false
				},
				global: { stubs: dialogGlobalStubs }
			} );

			// Open dialog window
			wrapper.setData( { showExamplesDialog: true } );
			await wrapper.vm.$nextTick();

			const exampleList = wrapper.find( '.ext-wikilambda-app-object-string-renderer__examples' );
			const examples = exampleList.findAll( 'li' );
			expect( examples.length ).toBe( 2 );
			expect( examples[ 0 ].text() ).toBe( 'example one' );
			expect( examples[ 1 ].text() ).toBe( 'example two' );

			const dialogFooter = wrapper.find( '.cdx-dialog__footer' );
			const link = dialogFooter.find( 'a' );
			expect( link.attributes( 'href' ) ).toContain( rendererZid );
			expect( link.text() ).toBe( rendererLabel );
		} );

		describe( 'in edit mode with blank object', () => {
			beforeEach( () => {
				store.runRenderer = jest.fn().mockResolvedValue( rendererResponse );
			} );

			it( 'does not run renderer with empty values', async () => {
				shallowMount( ZObjectStringRenderer, {
					props: {
						keyPath,
						objectValue: blankObjectValue,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );
				await waitFor( () => expect( store.runRenderer ).not.toHaveBeenCalled() );
			} );

			// FIXME: this test, when run in isolation, works. However, when run along with the suite
			// it detects 18 calls to runRenderer, instead of zero.
			it.skip( 'initializes blank object when type object is available', async () => {
				store.getStoredObject = createGettersWithFunctionsMock( undefined );
				const wrapper = shallowMount( ZObjectStringRenderer, {
					props: {
						keyPath,
						objectValue: blankObjectValue,
						edit: true,
						type: typeZid,
						expanded: false
					}
				} );

				expect( wrapper.vm.blankObject ).toBe( undefined );

				store.getStoredObject = ( zid ) => storedObjects[ zid ];
				await wrapper.vm.$nextTick();

				expect( wrapper.vm.blankObject ).toEqual( canonicalBlankObject );
				await waitFor( () => expect( store.runRenderer ).not.toHaveBeenCalled() );
			} );
		} );
	} );
} );
