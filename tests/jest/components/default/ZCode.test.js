/*!
 * WikiLambda unit test suite for the default ZCode component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const CodeEditor = require( '../../../../resources/ext.wikilambda.app/components/base/CodeEditor.vue' );
const ZCode = require( '../../../../resources/ext.wikilambda.app/components/types/ZCode.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );

// General use
const keyPath = 'main.Z2K2.Z14K3';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z16' },
	Z16K1: { Z1K1: 'Z9', Z9K1: 'Z610' },
	Z16K2: { Z1K1: 'Z6', Z6K1: 'some_code();' }
};

// Empty values
const emptyValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z16' },
	Z16K1: { Z1K1: 'Z9', Z9K1: '' },
	Z16K2: { Z1K1: 'Z6', Z6K1: '' }
};

// Parent is a converter
const converterKeyPath = 'main.Z2K2.Z46K3';

describe( 'ZCode', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.isCreateNewPage = false;
		store.getErrors = createGettersWithFunctionsMock( [] );
		store.getCurrentTargetFunctionZid = 'Z10001';
		store.getCurrentZObjectId = 'Z0';
		store.getLabelData = createLabelDataMock();
		store.hasErrorByCode = createLabelDataMock( false );
		store.getInputsOfFunctionZid = createGettersWithFunctionsMock( [
			{ Z17K2: 'Z10001K1' },
			{ Z17K2: 'Z10001K2' }
		] );
		store.getAllProgrammingLangs = [
			{
				Z1K1: Constants.Z_PERSISTENTOBJECT,
				Z2K1: {
					Z1K1: Constants.Z_STRING,
					Z6K1: Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT
				},
				Z2K2: {
					Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
					Z61K1: 'javascript',
					Z61K2: 'JavaScript'
				}
			},
			{
				Z1K1: Constants.Z_PERSISTENTOBJECT,
				Z2K1: {
					Z1K1: Constants.Z_STRING,
					Z6K1: Constants.Z_PROGRAMMING_LANGUAGES.PYTHON
				},
				Z2K2: {
					Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
					Z61K1: 'python',
					Z61K2: 'Python'
				}
			}
		];
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZCode, {
				props: {
					keyPath,
					objectValue,
					edit: false
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays the ace editor', () => {
			const wrapper = shallowMount( ZCode, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-code__code-editor' ).exists() ).toBe( true );
		} );

		it( 'editor is in read only mode', () => {
			const wrapper = shallowMount( ZCode, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'readOnly' ) ).toBe( true );
		} );

		it( 'should not show a warning message when clicking the code editor', () => {
			const wrapper = shallowMount( ZCode, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );
			wrapper.findComponent( { name: 'code-editor' } ).trigger( 'click' );
			expect( wrapper.find( '.cdx-message--warning.ext-wikilambda-app-code__inline-error' ).exists() ).toBe( false );
		} );

		describe( 'when current programming language is initialized', () => {
			it( 'computes the programming language values', () => {
				const wrapper = shallowMount( ZCode, {
					props: {
						keyPath,
						objectValue,
						edit: true
					}
				} );
				expect( wrapper.vm.programmingLanguageZid ).toBe( Constants.Z_PROGRAMMING_LANGUAGES.PYTHON );
				expect( wrapper.vm.programmingLanguageLiteral ).toBe( 'python' );
			} );
		} );

	} );

	describe( 'in edit mode', () => {
		it( 'enables programming language selector and code editor when not in read-only or view mode', () => {
			const wrapper = shallowMount( ZCode, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-code__language-selector' ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'readOnly' ) ).toBe( false );
		} );

		it( 'disables the code editor when no programming language is set on load', () => {
			const wrapper = shallowMount( ZCode, {
				props: {
					keyPath,
					objectValue: emptyValue,
					edit: true
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-code__language-selector' ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'disabled' ) ).toBe( true );
		} );

		it( 'should show a warning message when clicking the code editor and no programming language is set', async () => {
			store.getErrors = createGettersWithFunctionsMock( [ {
				message: 'Select programming language',
				type: 'warning'
			} ] );

			const wrapper = shallowMount( ZCode, {
				props: {
					keyPath,
					objectValue: emptyValue,
					edit: true
				},
				global: {
					stubs: {
						WlKeyValueBlock: false,
						CdxMessage: false
					}
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-code__language-selector' ).exists() ).toBe( true );

			wrapper.findComponent( { name: 'code-editor' } ).trigger( 'click' );

			await waitFor( () => expect( store.setError ).toHaveBeenCalledWith( {
				errorMessage: 'Select programming language',
				errorType: 'warning',
				errorId: `${ keyPath }.${ Constants.Z_CODE_LANGUAGE }`
			} ) );

			expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-editor-label-select-programming-language-empty' );

			expect( wrapper.findComponent( { name: 'cdx-message' } ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'cdx-message' } ).text() ).toContain( 'Select programming language' );
		} );

		describe( 'when current programming language is changed', () => {
			it( 'updates the programming language to JavaScript when selected and initializes the editor with JavaScript boilerplate code', async () => {
				const wrapper = shallowMount( ZCode, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false
						}
					}
				} );

				wrapper.findComponent( { name: 'cdx-select' } )
					.vm.$emit( 'update:selected', Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT );

				await wrapper.vm.$nextTick();

				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_LANGUAGE, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT
				} ], [ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'function Z10001( Z10001K1, Z10001K2 ) {\n\n}'
				} ] ] );
			} );

			it( 'updates the programming language to Python when selected and initializes the editor with Python boilerplate code', async () => {

				const wrapper = shallowMount( ZCode, {
					props: {
						keyPath,
						objectValue: emptyValue,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false
						}
					}
				} );
				wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected',
					Constants.Z_PROGRAMMING_LANGUAGES.PYTHON );
				await wrapper.vm.$nextTick();
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_LANGUAGE, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_PROGRAMMING_LANGUAGES.PYTHON
				} ],
				[ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'def Z10001(Z10001K1, Z10001K2):\n\t'
				} ] ] );
			} );

			it( 'updates the code in the editor when valid code strings are inputted', async () => {
				const wrapper = shallowMount( ZCode, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false
						}
					}
				} );
				wrapper.getComponent( CodeEditor ).vm.$emit( 'change', 'def() {}' );
				await wrapper.vm.$nextTick();
				expect( wrapper.emitted( 'set-value' ) ).toBeTruthy();
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'def() {}'
				} ] ] );
			} );
		} );

		describe( 'when parent of code is a converter', () => {
			it( 'initializes code box with the right function name and arguments', async () => {
				store.isCreateNewPage = false;
				store.getCurrentZObjectId = 'Z12345';

				const wrapper = shallowMount( ZCode, {
					props: {
						keyPath: converterKeyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false
						}
					}
				} );

				// No notice message when edit
				const message = wrapper.findComponent( { name: 'cdx-message' } );
				expect( message.exists() ).toBe( false );

				wrapper.findComponent( { name: 'cdx-select' } )
					.vm.$emit( 'update:selected', Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT );

				await wrapper.vm.$nextTick();

				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_LANGUAGE, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT
				} ], [ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'function Z12345( Z12345K1 ) {\n\n}'
				} ] ] );
			} );

			it( 'displays notice message when creating a new converter', async () => {
				store.isCreateNewPage = true;

				const wrapper = shallowMount( ZCode, {
					props: {
						keyPath: converterKeyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false
						}
					}
				} );

				const message = wrapper.findComponent( { name: 'cdx-message' } );
				expect( message.exists() ).toBe( true );
				expect( message.props( 'type' ) ).toBe( 'notice' );
			} );
		} );
	} );
} );
