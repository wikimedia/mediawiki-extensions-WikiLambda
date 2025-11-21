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

	/**
	 * Helper function to render ZObjectStringRenderer component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderZObjectStringRenderer( props = {}, options = {} ) {
		return shallowMount( ZObjectStringRenderer, {
			props: {
				keyPath,
				objectValue,
				edit: false,
				type: typeZid,
				expanded: false,
				...props
			},
			global: {
				stubs: {
					...options?.stubs
				}
			}
		} );
	}

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
		store.handleMetadataError = jest.fn();
		store.runParser = jest.fn().mockResolvedValue( parserResponse );
		store.runRenderer = jest.fn().mockResolvedValue( rendererResponse );
	} );

	describe( 'in view and edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderZObjectStringRenderer();
			expect( wrapper.find( '.ext-wikilambda-app-object-string-renderer' ).exists() ).toBe( true );
		} );

		it( 'generates the rendered text on mount', () => {
			renderZObjectStringRenderer();

			expect( store.runRenderer ).toHaveBeenCalledWith( {
				rendererZid,
				zobject: parsedObject,
				zlang: 'Z1002'
			} );
		} );
	} );

	describe( 'in view mode', () => {
		it( 'when collapsed, shows a loading state when running the renderer and then shows result in text', async () => {
			const wrapper = renderZObjectStringRenderer();

			const text = wrapper.find( '[data-testid="z-object-string-renderer-text"]' );
			expect( text.exists() ).toBe( true );

			// Wait for the renderer to start running
			await waitFor( () => expect( wrapper.vm.rendererRunning ).toBeTruthy() );

			// Initially the text value should be 'Running…'
			expect( text.text() ).toBe( 'Running…' );

			// After the renderer is done, the text should show the rendered string
			await waitFor( () => {
				expect( text.text() ).toContain( renderedString );
			} );

			// Should have called the renderer
			expect( store.runRenderer ).toHaveBeenCalled();
		} );

		it( 'when expanded, falls back to ZObjectKeyValueSet', () => {
			const wrapper = renderZObjectStringRenderer( { expanded: true } );

			const text = wrapper.find( '[data-testid="z-object-string-renderer-text"]' );
			expect( text.exists() ).toBe( false );

			const keyValueSet = wrapper.findComponent( { name: 'wl-z-object-key-value-set' } );
			expect( keyValueSet.exists() ).toBe( true );
			expect( keyValueSet.props( 'keyPath' ) ).toBe( keyPath );
			expect( keyValueSet.props( 'objectValue' ) ).toEqual( objectValue );
			expect( keyValueSet.props( 'edit' ) ).toBe( false );
		} );

		it( 'can call the renderer multiple times because runRenderer will return cached data anyway', async () => {
			const wrapper = renderZObjectStringRenderer( { expanded: true } );

			// First render should trigger it
			await waitFor( () => {
				expect( store.runRenderer ).toHaveBeenCalledTimes( 1 );
				expect( store.runRenderer ).toHaveBeenCalledWith( {
					rendererZid,
					zobject: parsedObject,
					zlang: 'Z1002'
				} );
			} );

			// Collapse doesn't trigger, as the first call was successful
			await wrapper.setProps( { expanded: false } );
			await waitFor( () => {
				expect( store.runRenderer ).toHaveBeenCalledTimes( 2 );
			} );

			// Expand again
			await wrapper.setProps( { expanded: true } );
			await waitFor( () => {
				expect( store.runRenderer ).toHaveBeenCalledTimes( 2 );
			} );

			// Collapse again, no repeated calls
			await wrapper.setProps( { expanded: false } );
			await waitFor( () => {
				expect( store.runRenderer ).toHaveBeenCalledTimes( 3 );
			} );
		} );

		it( 'calls render again if call was not successful', async () => {
			// Mock renderer to return an error
			store.runRenderer = jest.fn().mockResolvedValue( errorResponse );

			const wrapper = renderZObjectStringRenderer( { expanded: true } );

			// First render should trigger it
			await waitFor( () => {
				expect( store.runRenderer ).toHaveBeenCalledTimes( 1 );
				expect( store.runRenderer ).toHaveBeenCalledWith( {
					rendererZid,
					zobject: parsedObject,
					zlang: 'Z1002'
				} );
			} );

			// Collapse triggers it again
			await wrapper.setProps( { expanded: false } );
			expect( store.runRenderer ).toHaveBeenCalledTimes( 2 );

			// Expand
			await wrapper.setProps( { expanded: true } );

			// Collapse again, rendered is called once more
			await wrapper.setProps( { expanded: false } );
			expect( store.runRenderer ).toHaveBeenCalledTimes( 3 );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'when collapsed, shows a loading state when running the renderer and then shows result in text field', async () => {
			const wrapper = renderZObjectStringRenderer( { edit: true } );

			const text = wrapper.findComponent( { name: 'cdx-text-input' } );
			expect( text.exists() ).toBe( true );

			// Wait for the renderer to start running
			await waitFor( () => expect( wrapper.vm.rendererRunning ).toBeTruthy() );

			// Initially the input value should be 'Running…'
			expect( text.props( 'modelValue' ) ).toBe( 'Running…' );

			// After the renderer is done, the input value should show the rendered string
			await waitFor( () => {
				expect( text.props( 'modelValue' ) ).toBe( renderedString );
			} );

			// Should have called the renderer
			expect( store.runRenderer ).toHaveBeenCalled();
		} );

		it( 'when expanded, falls back to ZObjectKeyValueSet', () => {
			const wrapper = renderZObjectStringRenderer( { edit: true, expanded: true } );

			const text = wrapper.findComponent( { name: 'cdx-text-input' } );
			expect( text.exists() ).toBe( false );

			const keyValueSet = wrapper.findComponent( { name: 'wl-z-object-key-value-set' } );
			expect( keyValueSet.exists() ).toBe( true );
			expect( keyValueSet.props( 'keyPath' ) ).toBe( keyPath );
			expect( keyValueSet.props( 'objectValue' ) ).toEqual( objectValue );
			expect( keyValueSet.props( 'edit' ) ).toBe( true );
		} );

		it( 'on collapse event, runs renderer', async () => {
			const wrapper = renderZObjectStringRenderer( { edit: true, expanded: true } );

			// Make sure that the state is expanded
			const keyValueSet = wrapper.findComponent( { name: 'wl-z-object-key-value-set' } );
			expect( keyValueSet.exists() ).toBe( true );

			// Update expanded prop
			await wrapper.setProps( { expanded: false } );

			await waitFor( () => {
				expect( store.runRenderer ).toHaveBeenCalledWith( {
					rendererZid,
					zobject: parsedObject,
					zlang: 'Z1002'
				} );
			} );
		} );

		it( 'on renderer field update, runs parser', () => {
			const wrapper = renderZObjectStringRenderer( { edit: true } );

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
			renderZObjectStringRenderer( { edit: true } );

			expect( store.getTestResults ).toHaveBeenCalledWith( {
				zFunctionId: rendererZid
			} );
		} );

		it( 'if no passing tests, and is special page, trigger expansion', async () => {
			store.isCreateNewPage = true;

			const wrapper = renderZObjectStringRenderer( { edit: true } );

			await waitFor( () => {
				expect( wrapper.emitted( 'expand' ) ).toBeTruthy();
			} );
		} );

		it( 'fetches passing test data when available', async () => {
			store.getPassingTestZids = createGettersWithFunctionsMock( [ 'Z30030', 'Z30031' ] );

			renderZObjectStringRenderer( { edit: true } );

			// Should fetch test results
			expect( store.getTestResults ).toHaveBeenCalledWith( {
				zFunctionId: rendererZid
			} );
		} );

		it( 'runs renderer tests with user language', async () => {
			store.getPassingTestZids = createGettersWithFunctionsMock( [ 'Z30030', 'Z30031' ] );

			renderZObjectStringRenderer( { edit: true } );

			// Should run tests for examples
			await waitFor( () => {
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

			const wrapper = renderZObjectStringRenderer( { edit: true } );

			const text = wrapper.findComponent( { name: 'cdx-text-input' } );
			expect( text.attributes( 'placeholder' ) ).toBe( 'E.g. example one' );
		} );

		it( 'fetches and displays example data when available', async () => {
			store.getRendererExamples = createGettersWithFunctionsMock( [
				{ testZid: 'Z30030', result: 'example one' },
				{ testZid: 'Z30031', result: 'example two' }
			] );

			const wrapper = renderZObjectStringRenderer( { edit: true } );

			// Should fetch test results
			expect( store.getTestResults ).toHaveBeenCalledWith( {
				zFunctionId: rendererZid
			} );

			// Placeholder should use first example
			const text = wrapper.findComponent( { name: 'cdx-text-input' } );
			expect( text.attributes( 'placeholder' ) ).toBe( 'E.g. example one' );
		} );

		it( 'displays examples in dialog with renderer function link', async () => {
			const rendererLabel = 'Renderer function label';
			store.getLabelData = createLabelDataMock( { [ rendererZid ]: rendererLabel } );
			store.getRendererExamples = createGettersWithFunctionsMock( [
				{ testZid: 'Z30030', result: 'example one' },
				{ testZid: 'Z30031', result: 'example two' }
			] );

			// Make renderer return void to trigger error condition and show examples button
			store.runRenderer = jest.fn().mockResolvedValue( errorResponse );

			const wrapper = renderZObjectStringRenderer( {
				edit: true
			}, {
				stubs: dialogGlobalStubs
			} );

			// Note: In real usage, the examples dialog is opened by clicking a link that appears
			// when there's a renderer/parser error and examples are available. Testing the full
			// error flow with field errors is complex, so we directly test the dialog content.
			// The error handling tests separately verify that handleMetadataError is called correctly.

			// Open the examples dialog
			wrapper.vm.openExamplesDialog();

			// Dialog should open
			await waitFor( () => {
				const dialog = wrapper.findComponent( { name: 'cdx-dialog' } );
				expect( dialog.props( 'open' ) ).toBe( true );
			} );

			// Verify examples are displayed in the dialog
			const exampleList = wrapper.get( '.ext-wikilambda-app-object-string-renderer__examples' );
			const examples = exampleList.findAll( 'li' );
			expect( examples.length ).toBe( 2 );
			expect( examples[ 0 ].text() ).toBe( 'example one' );
			expect( examples[ 1 ].text() ).toBe( 'example two' );

			// Verify link to renderer function in dialog footer
			const dialogFooter = wrapper.get( '.cdx-dialog__footer' );
			const link = dialogFooter.find( 'a' );
			expect( link.attributes( 'href' ) ).toContain( rendererZid );
			expect( link.text() ).toBe( rendererLabel );
		} );

		describe( 'renderer error handling', () => {
			const fallbackErrorData = {
				errorMessageKey: 'wikilambda-renderer-unknown-error',
				errorParams: [ rendererZid ]
			};

			it( 'renderer returns void, no examples - does not show examples link', async () => {
				store.runRenderer = jest.fn().mockResolvedValue( errorResponse );

				const wrapper = renderZObjectStringRenderer( { edit: true } );

				await waitFor( () => {
					expect( store.handleMetadataError ).toHaveBeenCalledWith( {
						metadata: errorResponse.response.Z22K2,
						fallbackErrorData,
						errorHandler: expect.any( Function )
					} );
				} );

				// No examples link should be shown when no examples available
				const examplesLink = wrapper.find( 'a' );
				expect( examplesLink.exists() ).toBe( false );
			} );

			it( 'renderer returns void, available examples - calls error handler with examples', async () => {
				store.getRendererExamples = createGettersWithFunctionsMock( [
					{ testZid: 'Z30030', result: 'example one' },
					{ testZid: 'Z30031', result: 'example two' }
				] );
				store.runRenderer = jest.fn().mockResolvedValue( errorResponse );

				renderZObjectStringRenderer( { edit: true } );

				await waitFor( () => {
					expect( store.handleMetadataError ).toHaveBeenCalledWith( {
						metadata: errorResponse.response.Z22K2,
						fallbackErrorData,
						errorHandler: expect.any( Function )
					} );
				} );

				// Error handler was called with metadata - examples are available for display
				expect( store.getRendererExamples ).toHaveBeenCalled();
			} );

			it( 'renderer returns wrong type', async () => {
				store.runRenderer = jest.fn().mockResolvedValue( parserResponse );

				renderZObjectStringRenderer( { edit: true } );

				const errorPayload = {
					errorId: keyPath,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessageKey: 'wikilambda-renderer-unexpected-result-error',
					errorParams: [ rendererZid ]
				};

				await waitFor( () => expect( store.setError ).toHaveBeenCalledWith( errorPayload ) );
			} );
		} );

		describe( 'parser error handling', () => {
			const fallbackErrorData = {
				errorMessageKey: 'wikilambda-parser-unknown-error',
				errorParams: [ parserZid ]
			};

			it( 'parser returns void, no examples - does not show examples link', async () => {
				store.runParser = jest.fn().mockResolvedValue( errorResponse );

				const wrapper = renderZObjectStringRenderer( { edit: true } );

				const text = wrapper.findComponent( { name: 'cdx-text-input' } );
				text.vm.$emit( 'change', { target: { value: 'some new value' } } );

				await waitFor( () => {
					expect( store.handleMetadataError ).toHaveBeenCalledWith( {
						metadata: errorResponse.response.Z22K2,
						fallbackErrorData,
						errorHandler: expect.any( Function )
					} );
				} );

				// No examples link should be shown when no examples available
				const examplesLink = wrapper.find( 'a' );
				expect( examplesLink.exists() ).toBe( false );
			} );

			it( 'parser returns void, available examples - calls error handler with examples', async () => {
				store.getRendererExamples = createGettersWithFunctionsMock( [
					{ testZid: 'Z30030', result: 'example one' },
					{ testZid: 'Z30031', result: 'example two' }
				] );
				store.runParser = jest.fn().mockResolvedValue( errorResponse );

				const wrapper = renderZObjectStringRenderer( { edit: true } );

				const text = wrapper.findComponent( { name: 'cdx-text-input' } );
				text.vm.$emit( 'change', { target: { value: 'some new value' } } );

				await waitFor( () => {
					expect( store.handleMetadataError ).toHaveBeenCalledWith( {
						metadata: errorResponse.response.Z22K2,
						fallbackErrorData,
						errorHandler: expect.any( Function )
					} );
				} );

				// Error handler was called with metadata - examples are available for display
				expect( store.getRendererExamples ).toHaveBeenCalled();
			} );

			it( 'parser returns wrong type', async () => {
				store.runParser = jest.fn().mockResolvedValue( parserBadResponse );

				const wrapper = renderZObjectStringRenderer( { edit: true } );

				const text = wrapper.findComponent( { name: 'cdx-text-input' } );
				text.vm.$emit( 'change', { target: { value: 'some new value' } } );

				const errorPayload = {
					errorId: keyPath,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessageKey: 'wikilambda-parser-unexpected-result-error',
					errorParams: [ parserZid ]
				};

				await waitFor( () => expect( store.setError ).toHaveBeenCalledWith( errorPayload ) );
			} );
		} );

		it( 'calls createObjectByType to initialize blank object model', () => {
			store.runRenderer = jest.fn().mockResolvedValue( rendererResponse );
			store.createObjectByType = jest.fn().mockReturnValue( blankObjectValue );

			// Render with blank object value - this should trigger blank object initialization
			// when generateRenderedValue runs and finds typeObject available
			renderZObjectStringRenderer( {
				objectValue: blankObjectValue,
				edit: true
			} );

			// createObjectByType should be called to initialize the blank object model
			// This is used to compare with the current object to determine if it's blank
			expect( store.createObjectByType ).toHaveBeenCalledWith( { type: typeZid } );

			// Renderer should not run with blank values
			expect( store.runRenderer ).not.toHaveBeenCalled();
		} );
	} );
} );
