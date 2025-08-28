/*!
 * WikiLambda unit test suite for About Language Block component from the About widget.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../../helpers/getterHelpers.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const AboutLanguageBlock = require( '../../../../../resources/ext.wikilambda.app/components/widgets/about/AboutLanguageBlock.vue' );

describe( 'AboutLanguageBlock', () => {
	let wrapper, store, viewData, fieldLangs;

	beforeEach( () => {
		store = useMainStore();
		store.getFallbackLanguageZids = [ 'Z1003', 'Z1002' ];
		store.getLabelData = createLabelDataMock( {
			Z2K3: 'name',
			Z2K4: 'aliases',
			Z2K5: 'description',
			Z1002: 'English',
			Z1003: 'español',
			Z1841: 'estremeñu',
			Z11K1: 'language',
			Z10000K1: 'first',
			Z10000K2: 'second'
		} );
		store.getZFunctionInputs = [];
		store.getZFunctionOutput = { Z1K1: 'Z9', Z9K1: 'Z6' };
		store.getZPersistentAlias = createGettersWithFunctionsMock( undefined );
		store.getZPersistentDescription = createGettersWithFunctionsMock( undefined );
		store.getZPersistentName = createGettersWithFunctionsMock( {
			keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
			value: 'Nombre'
		} );
	} );

	afterEach( () => {
		wrapper.unmount();
	} );

	describe( 'Read mode', () => {
		beforeEach( () => {
			viewData = {
				name: {
					keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
					value: 'Nombre'
				},
				description: { keyPath: undefined, value: '' },
				aliases: { keyPath: undefined, value: [] },
				inputs: []
			};
			fieldLangs = {
				name: [ 'Z1003' ],
				description: [],
				aliases: [],
				inputs: []
			};
		} );

		it( 'renders read block without errors', () => {
			wrapper = shallowMount( AboutLanguageBlock, { props: {
				edit: false,
				isFunction: false,
				language: 'Z1003',
				viewData,
				fieldLangs
			} } );

			expect( wrapper.find( '.ext-wikilambda-app-about-language-block__read' ).exists() ).toBe( true );
		} );

		it( 'shows placeholder for no content', () => {
			wrapper = shallowMount( AboutLanguageBlock, { props: {
				edit: false,
				isFunction: false,
				language: 'Z1003',
				viewData,
				fieldLangs
			} } );

			const placeholder = wrapper.find( '.ext-wikilambda-app-about-language-block__unavailable' );
			expect( placeholder.exists() ).toBe( true );
			expect( placeholder.text() ).toBe( 'No description or aliases provided.' );
		} );

		it( 'shows placeholder for no aliases', () => {
			viewData.description = {
				keyPath: 'main.Z2K5.Z12K1.1.Z11K2.Z6K1',
				value: 'Descripción'
			};
			fieldLangs.description = [ 'Z1003' ];
			wrapper = shallowMount( AboutLanguageBlock, { props: {
				edit: false,
				isFunction: false,
				language: 'Z1003',
				viewData,
				fieldLangs
			} } );

			const placeholder = wrapper.find( '.ext-wikilambda-app-about-language-block__unavailable' );
			expect( placeholder.exists() ).toBe( true );
			expect( placeholder.text() ).toBe( 'No aliases provided.' );
		} );

		it( 'shows placeholder for no description', () => {
			viewData.aliases = {
				keyPath: 'main.Z2K4.Z32K1.1.Z31K2',
				value: [ 'un alias' ]
			};
			fieldLangs.aliases = [ 'Z1003' ];
			wrapper = shallowMount( AboutLanguageBlock, { props: {
				edit: false,
				isFunction: false,
				language: 'Z1003',
				viewData,
				fieldLangs
			} } );

			const placeholder = wrapper.find( '.ext-wikilambda-app-about-language-block__unavailable' );
			expect( placeholder.exists() ).toBe( true );
			expect( placeholder.text() ).toBe( 'No description provided.' );
		} );

		it( 'shows description and aliases', () => {
			viewData.description = {
				keyPath: 'main.Z2K5.Z12K1.1.Z11K2.Z6K1',
				value: 'Descripción'
			};
			viewData.aliases = {
				keyPath: 'main.Z2K4.Z32K1.1.Z31K2',
				value: [ 'un alias' ]
			};
			fieldLangs.description = [ 'Z1003' ];
			fieldLangs.aliases = [ 'Z1003' ];
			wrapper = shallowMount( AboutLanguageBlock, {
				props: {
					edit: false,
					isFunction: false,
					language: 'Z1003',
					viewData,
					fieldLangs
				},
				global: { stubs: { CdxInfoChip: false } }
			} );

			const description = wrapper.find( '.ext-wikilambda-app-about-language-block__description' );
			expect( description.exists() ).toBe( true );
			expect( description.text() ).toBe( 'Descripción' );

			const aliases = wrapper.find( '.ext-wikilambda-app-about-language-block__aliases' );
			expect( aliases.exists() ).toBe( true );
			expect( aliases.text() ).toContain( 'un alias' );

			// No function section
			expect( wrapper.find( '.ext-wikilambda-app-about-language-block__function-fields' ).exists() ).toBe( false );
		} );

		it( 'shows only three aliases when there are more', async () => {
			viewData.aliases = {
				keyPath: 'main.Z2K4.Z32K1.1.Z31K2',
				value: [ 'uno', 'dos', 'tres', 'cuatro', 'cinco' ]
			};
			fieldLangs.aliases = [ 'Z1003' ];
			wrapper = shallowMount( AboutLanguageBlock, {
				props: {
					edit: false,
					isFunction: false,
					language: 'Z1003',
					viewData,
					fieldLangs
				},
				global: { stubs: { CdxInfoChip: false } }
			} );

			let aliases = wrapper.findAll( '.ext-wikilambda-app-about-language-block__alias' );
			let aliasMore = wrapper.find( '.ext-wikilambda-app-about-language-block__aliases-more' );

			expect( aliases.length ).toBe( 3 );
			expect( aliases[ 0 ].text() ).toBe( 'uno' );
			expect( aliases[ 1 ].text() ).toBe( 'dos' );
			expect( aliases[ 2 ].text() ).toBe( 'tres' );
			expect( aliasMore.text() ).toContain( '+2' );

			aliasMore.trigger( 'click' );
			await wrapper.vm.$nextTick();

			aliases = wrapper.findAll( '.ext-wikilambda-app-about-language-block__alias' );
			aliasMore = wrapper.find( '.ext-wikilambda-app-about-language-block__aliases-more' );

			expect( aliases.length ).toBe( 5 );
			expect( aliasMore.exists() ).toBe( false );
		} );

		it( 'shows inputs and output type for functions', () => {
			viewData.inputs = [ {
				keyPath: undefined,
				value: '',
				key: 'Z1000K1',
				type: { Z1K1: 'Z9', Z9K1: 'Z6' },
				typeKeyPath: 'main.Z2K2.Z8K1.1.Z17K1'
			}, {
				keyPath: 'main.Z2K2.Z8K1.2.Z17K3.Z12K1.1.Z11K2',
				value: 'segundo',
				key: 'Z1000K2',
				type: { Z1K1: 'Z9', Z9K1: 'Z6' },
				typeKeyPath: 'main.Z2K2.Z8K1.2.Z17K1'
			} ];

			fieldLangs.inputs = [ [ 'Z1002', 'Z1003' ], [ 'Z1002', 'Z1003' ] ];
			wrapper = shallowMount( AboutLanguageBlock, { props: {
				edit: false,
				isFunction: true,
				language: 'Z1003',
				viewData,
				fieldLangs
			} } );

			const functionFields = wrapper.find( '.ext-wikilambda-app-about-language-block__function-fields' );

			// Input labels and types:
			const inputs = functionFields.findAll( '.ext-wikilambda-app-about-language-block__input' );
			expect( inputs.length ).toBe( 2 );

			expect( inputs[ 0 ].find( '.ext-wikilambda-app-about-language-block__input-label' ).text() ).toBe( 'Untitled:' );
			expect( inputs[ 0 ].findComponent( { name: 'wl-z-object-to-string' } ).vm.keyPath ).toBe( 'main.Z2K2.Z8K1.1.Z17K1' );
			expect( inputs[ 0 ].findComponent( { name: 'wl-z-object-to-string' } ).vm.objectValue ).toEqual( { Z1K1: 'Z9', Z9K1: 'Z6' } );

			expect( inputs[ 1 ].find( '.ext-wikilambda-app-about-language-block__input-label' ).text() ).toBe( 'segundo:' );
			expect( inputs[ 1 ].findComponent( { name: 'wl-z-object-to-string' } ).vm.keyPath ).toBe( 'main.Z2K2.Z8K1.2.Z17K1' );
			expect( inputs[ 1 ].findComponent( { name: 'wl-z-object-to-string' } ).vm.objectValue ).toEqual( { Z1K1: 'Z9', Z9K1: 'Z6' } );

			// Output type:
			const output = functionFields.find( '.ext-wikilambda-app-about-language-block__output' );
			expect( output.exists() ).toBe( true );
			expect( output.findComponent( { name: 'wl-z-object-to-string' } ).vm.keyPath ).toBe( 'main.Z2K2.Z8K2' );
			expect( output.findComponent( { name: 'wl-z-object-to-string' } ).vm.objectValue ).toEqual( { Z1K1: 'Z9', Z9K1: 'Z6' } );
		} );
	} );

	describe( 'Edit mode', () => {
		beforeEach( () => {
			viewData = {
				name: { keyPath: undefined, value: '' },
				description: { keyPath: undefined, value: '' },
				aliases: { keyPath: undefined, value: [] },
				inputs: []
			};
			fieldLangs = {
				name: [],
				description: [],
				aliases: [],
				inputs: []
			};
		} );

		it( 'renders edit block without errors', () => {
			wrapper = shallowMount( AboutLanguageBlock, {
				global: { stubs: { CdxField: false } },
				props: {
					edit: true,
					isFunction: false,
					language: 'Z1003',
					viewData,
					editData: JSON.parse( JSON.stringify( viewData ) ),
					fieldLangs
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-about-language-block__edit' ).exists() ).toBe( true );
		} );

		it( 'renders edit block for non-function', () => {
			wrapper = shallowMount( AboutLanguageBlock, {
				global: { stubs: { CdxField: false } },
				props: {
					edit: true,
					isFunction: false,
					language: 'Z1003',
					viewData,
					editData: JSON.parse( JSON.stringify( viewData ) ),
					fieldLangs
				}
			} );

			expect( wrapper.find( '[data-testid="about-name-field"]' ).exists() ).toBe( true );
			expect( wrapper.find( '[data-testid="about-description-field"]' ).exists() ).toBe( true );
			expect( wrapper.find( '[data-testid="about-aliases-field"]' ).exists() ).toBe( true );
			expect( wrapper.findAll( '[data-testid="about-input-field"]' ).length ).toBe( 0 );
		} );

		it( 'renders edit block for function', () => {
			viewData.inputs = [ {
				keyPath: undefined,
				value: '',
				key: 'Z1000K1',
				type: { Z1K1: 'Z9', Z9K1: 'Z6' },
				typeKeyPath: 'main.Z2K2.Z8K1.1.Z17K1'
			}, {
				keyPath: undefined,
				value: '',
				key: 'Z1000K2',
				type: { Z1K1: 'Z9', Z9K1: 'Z6' },
				typeKeyPath: 'main.Z2K2.Z8K1.2.Z17K1'
			} ];
			fieldLangs.inputs = [ [], [] ];
			wrapper = shallowMount( AboutLanguageBlock, {
				global: { stubs: { CdxField: false } },
				props: {
					edit: true,
					isFunction: true,
					language: 'Z1003',
					viewData,
					editData: JSON.parse( JSON.stringify( viewData ) ),
					fieldLangs
				}
			} );

			expect( wrapper.find( '[data-testid="about-name-field"]' ).exists() ).toBe( true );
			expect( wrapper.find( '[data-testid="about-description-field"]' ).exists() ).toBe( true );
			expect( wrapper.find( '[data-testid="about-aliases-field"]' ).exists() ).toBe( true );
			expect( wrapper.findAll( '[data-testid="about-input-field"]' ).length ).toBe( 2 );
		} );

		it( 'initializes fields with content and character counter', () => {
			viewData = {
				name: {
					keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
					value: 'Name'
				},
				description: {
					keyPath: 'main.Z2K5.Z12K1.1.Z11K2.Z6K1',
					value: 'Description'
				},
				aliases: {
					keyPath: 'main.Z2K4.Z32K1.1.Z31K2',
					value: [ 'one alias' ]
				},
				inputs: [ {
					keyPath: 'main.Z2K2.Z8K1.1.Z17K3.Z12K1.1.Z11K2',
					value: 'input one',
					key: 'Z1000K1',
					type: { Z1K1: 'Z9', Z9K1: 'Z6' },
					typeKeyPath: 'main.Z2K2.Z8K1.1.Z17K1'
				} ]
			};
			fieldLangs = {
				name: [ 'Z1002' ],
				description: [ 'Z1002' ],
				aliases: [ 'Z1002' ],
				inputs: [ [ 'Z1002' ] ]
			};
			wrapper = shallowMount( AboutLanguageBlock, {
				global: { stubs: { CdxField: false } },
				props: {
					edit: true,
					isFunction: true,
					language: 'Z1002',
					viewData,
					editData: JSON.parse( JSON.stringify( viewData ) ),
					fieldLangs
				}
			} );

			const name = wrapper.find( '[data-testid="about-name-field"]' );
			expect( name.findComponent( { name: 'cdx-text-input' } ).props( 'modelValue' ) ).toBe( 'Name' );
			expect( name.find( '.ext-wikilambda-app-about-language-block__edit-field-caption' ).text() ).toBe( '' );
			expect( name.find( '.ext-wikilambda-app-about-language-block__edit-field-counter' ).text() ).toBe( '46' );

			const desc = wrapper.find( '[data-testid="about-description-field"]' );
			expect( desc.findComponent( { name: 'cdx-text-area' } ).props( 'modelValue' ) ).toBe( 'Description' );
			expect( desc.find( '.ext-wikilambda-app-about-language-block__edit-field-caption' ).text() ).toBe( '' );
			expect( desc.find( '.ext-wikilambda-app-about-language-block__edit-field-counter' ).text() ).toBe( '189' );

			const alias = wrapper.find( '[data-testid="about-aliases-field"]' );
			expect( alias.findComponent( { name: 'cdx-chip-input' } ).props( 'inputChips' )[ 0 ].value ).toBe( 'one alias' );
			expect( alias.find( '.cdx-field__help-text' ).text() ).toBe( '' );

			const input = wrapper.find( '[data-testid="about-input-field"]' );
			expect( input.findComponent( { name: 'cdx-text-input' } ).props( 'modelValue' ) ).toBe( 'input one' );
			expect( input.find( '.ext-wikilambda-app-about-language-block__edit-field-caption' ).text() ).toBe( '' );
			expect( input.find( '.ext-wikilambda-app-about-language-block__edit-field-counter' ).text() ).toBe( '41' );
		} );

		describe( 'Fallback hints', () => {
			it( 'shows fallback name hint', () => {
				fieldLangs.name = [ 'Z1003', 'Z1002' ];
				store.getZPersistentName = ( langZid ) => {
					const names = {
						Z1003: { keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1', value: 'Nombre' },
						Z1002: { keyPath: 'main.Z2K3.Z12K1.2.Z11K2.Z6K1', value: 'Name' }
					};
					return names[ langZid ];
				};

				wrapper = shallowMount( AboutLanguageBlock, {
					global: { stubs: { CdxField: false } },
					props: {
						edit: true,
						isFunction: false,
						language: 'Z1841',
						viewData,
						editData: JSON.parse( JSON.stringify( viewData ) ),
						fieldLangs
					}
				} );

				const field = wrapper.find( '[data-testid="about-name-field"]' );

				expect( field.findComponent( { name: 'cdx-text-input' } ).props( 'modelValue' ) ).toBe( '' );
				expect( field.find( '.cdx-field__help-text' ).text() ).toContain( 'español:' );
				expect( field.find( '.cdx-field__help-text' ).text() ).toContain( 'Nombre' );
			} );

			it( 'shows fallback description hint', () => {
				fieldLangs.description = [ 'Z1003' ];
				store.getZPersistentDescription = ( langZid ) => {
					const descriptions = {
						Z1003: { keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1', value: 'Descripción' }
					};
					return descriptions[ langZid ];
				};

				wrapper = shallowMount( AboutLanguageBlock, {
					global: { stubs: { CdxField: false } },
					props: {
						edit: true,
						isFunction: false,
						language: 'Z1841',
						viewData,
						editData: JSON.parse( JSON.stringify( viewData ) ),
						fieldLangs
					}
				} );

				const field = wrapper.find( '[data-testid="about-description-field"]' );

				expect( field.findComponent( { name: 'cdx-text-area' } ).props( 'modelValue' ) ).toBe( '' );
				expect( field.find( '.cdx-field__help-text' ).text() ).toContain( 'español:' );
				expect( field.find( '.cdx-field__help-text' ).text() ).toContain( 'Descripción' );
			} );

			it( 'shows fallback aliases hint', () => {
				fieldLangs.aliases = [ 'Z1002' ];
				store.getZPersistentAlias = ( langZid ) => {
					const aliases = {
						Z1002: { keyPath: 'main.Z2K4.Z32K1.1.Z31K2', value: [ 'one', 'two' ] }
					};
					return aliases[ langZid ];
				};

				wrapper = shallowMount( AboutLanguageBlock, {
					global: { stubs: { CdxField: false } },
					props: {
						edit: true,
						isFunction: false,
						language: 'Z1841',
						viewData,
						editData: JSON.parse( JSON.stringify( viewData ) ),
						fieldLangs
					}
				} );

				const field = wrapper.find( '[data-testid="about-aliases-field"]' );

				expect( field.findComponent( { name: 'cdx-chip-input' } ).props( 'inputChips' ) ).toEqual( [] );
				expect( field.find( '.cdx-field__help-text' ).text() ).toContain( 'English:' );
				expect( field.find( '.cdx-field__help-text' ).text() ).toContain( 'one, two' );
			} );

			it( 'shows fallback input label hint', () => {
				fieldLangs.inputs = [ [ 'Z1841', 'Z1002' ], [ 'Z1002' ], [ 'Z1002', 'Z1003' ] ];

				viewData.inputs = [ {
					keyPath: 'main.Z2K2.Z8K1.1.Z17K3.Z12K1.1.Z11K2',
					value: 'primeru',
					key: 'Z1000K1',
					type: { Z1K1: 'Z9', Z9K1: 'Z6' },
					typeKeyPath: 'main.Z2K2.Z8K1.1.Z17K1'
				}, {
					keyPath: undefined,
					value: '',
					key: 'Z1000K2',
					type: { Z1K1: 'Z9', Z9K1: 'Z6' },
					typeKeyPath: 'main.Z2K2.Z8K1.2.Z17K1'
				}, {
					keyPath: undefined,
					value: '',
					key: 'Z1000K3',
					type: { Z1K1: 'Z9', Z9K1: 'Z6' },
					typeKeyPath: 'main.Z2K2.Z8K1.3.Z17K1'
				} ];

				store.getZFunctionInputs = [
					{ Z17K3: { Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'first' },
						{ Z1K1: 'Z11', Z11K1: 'Z1841', Z11K2: 'primeru' }
					] } },
					{ Z17K3: { Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'second' }
					] } },
					{ Z17K3: { Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'third' },
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'tercero' }
					] } }
				];

				wrapper = shallowMount( AboutLanguageBlock, {
					global: { stubs: { CdxField: false } },
					props: {
						edit: true,
						isFunction: true,
						language: 'Z1841',
						viewData,
						editData: JSON.parse( JSON.stringify( viewData ) ),
						fieldLangs
					}
				} );

				const fields = wrapper.findAll( '[data-testid="about-input-field"]' );

				expect( fields.length ).toBe( 3 );
				// First input has name in user language
				expect( fields[ 0 ].findComponent( { name: 'cdx-text-input' } ).props( 'modelValue' ) ).toBe( 'primeru' );
				expect( fields[ 0 ].find( '.ext-wikilambda-app-about-language-block__edit-field-caption' ).text() ).toBe( '' );
				// Second input has fallback in English
				expect( fields[ 1 ].findComponent( { name: 'cdx-text-input' } ).props( 'modelValue' ) ).toBe( '' );
				expect( fields[ 1 ].find( '.cdx-field__help-text' ).text() ).toContain( 'English:' );
				expect( fields[ 1 ].find( '.cdx-field__help-text' ).text() ).toContain( 'second' );
				// Third input has fallback in Spanish and English (Spanish is the best choice)
				expect( fields[ 2 ].findComponent( { name: 'cdx-text-input' } ).props( 'modelValue' ) ).toBe( '' );
				expect( fields[ 2 ].find( '.cdx-field__help-text' ).text() ).toContain( 'español:' );
				expect( fields[ 2 ].find( '.cdx-field__help-text' ).text() ).toContain( 'tercero' );
			} );
		} );

		describe( 'Update and change events', () => {
			beforeEach( () => {
				viewData = {
					name: {
						keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
						value: 'Name'
					},
					description: {
						keyPath: 'main.Z2K5.Z12K1.1.Z11K2.Z6K1',
						value: 'Description'
					},
					aliases: {
						keyPath: 'main.Z2K4.Z32K1.1.Z31K2',
						value: [ 'one alias' ]
					},
					inputs: [ {
						keyPath: 'main.Z2K2.Z8K1.1.Z17K3.Z12K1.1.Z11K2',
						value: 'input one',
						key: 'Z1000K1',
						type: { Z1K1: 'Z9', Z9K1: 'Z6' },
						typeKeyPath: 'main.Z2K2.Z8K1.1.Z17K1'
					} ]
				};
				fieldLangs = {
					name: [ 'Z1002' ],
					description: [ 'Z1002' ],
					aliases: [ 'Z1002' ],
					inputs: [ [ 'Z1002' ] ]
				};
				wrapper = shallowMount( AboutLanguageBlock, {
					global: { stubs: { CdxField: false } },
					props: {
						edit: true,
						isFunction: true,
						language: 'Z1002',
						viewData,
						editData: JSON.parse( JSON.stringify( viewData ) ),
						fieldLangs
					}
				} );
			} );

			it( 'emits an update event when updating name field', () => {
				const field = wrapper.find( '[data-testid="about-name-field"]' );
				const input = field.findComponent( { name: 'cdx-text-input' } );
				input.vm.$emit( 'update:modelValue', 'Name!' );

				expect( wrapper.emitted( 'update-edit-value' ) ).toEqual( [ [ {
					data: { keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1', value: 'Name' },
					value: 'Name!'
				} ] ] );
			} );

			it( 'emits a change event when changing name field', () => {
				const field = wrapper.find( '[data-testid="about-name-field"]' );
				const input = field.findComponent( { name: 'cdx-text-input' } );
				input.vm.$emit( 'change' );

				expect( wrapper.emitted() ).toHaveProperty( 'change-value' );
			} );

			it( 'emits an update event when updating description field', () => {
				const field = wrapper.find( '[data-testid="about-description-field"]' );
				const input = field.findComponent( { name: 'cdx-text-area' } );
				input.vm.$emit( 'update:modelValue', 'Description!' );

				expect( wrapper.emitted( 'update-edit-value' ) ).toEqual( [ [ {
					data: { keyPath: 'main.Z2K5.Z12K1.1.Z11K2.Z6K1', value: 'Description' },
					value: 'Description!'
				} ] ] );
			} );

			it( 'emits a change event when changing description field', () => {
				const field = wrapper.find( '[data-testid="about-description-field"]' );
				const input = field.findComponent( { name: 'cdx-text-area' } );
				input.vm.$emit( 'change' );

				expect( wrapper.emitted() ).toHaveProperty( 'change-value' );
			} );

			it( 'emits update and change events when updating alias field', () => {
				const field = wrapper.find( '[data-testid="about-aliases-field"]' );
				const input = field.findComponent( { name: 'cdx-chip-input' } );
				input.vm.$emit( 'update:inputChips', [ { value: 'one alias' }, { value: 'new alias' } ] );

				expect( wrapper.emitted( 'update-edit-value' ) ).toEqual( [ [ {
					data: {
						keyPath: 'main.Z2K4.Z32K1.1.Z31K2',
						value: [ 'one alias' ]
					},
					value: [ 'one alias', 'new alias' ]
				} ] ] );
				expect( wrapper.emitted() ).toHaveProperty( 'change-value' );
			} );

			it( 'emits an update event when updating input label field', () => {
				const field = wrapper.find( '[data-testid="about-input-field"]' );
				const input = field.findComponent( { name: 'cdx-text-input' } );
				input.vm.$emit( 'update:modelValue', 'input one!' );

				expect( wrapper.emitted( 'update-edit-value' ) ).toEqual( [ [ {
					data: {
						key: 'Z1000K1',
						keyPath: 'main.Z2K2.Z8K1.1.Z17K3.Z12K1.1.Z11K2',
						value: 'input one',
						type: { Z1K1: 'Z9', Z9K1: 'Z6' },
						typeKeyPath: 'main.Z2K2.Z8K1.1.Z17K1'
					},
					value: 'input one!'
				} ] ] );
			} );

			it( 'emits a change event when changing input field', () => {
				const field = wrapper.find( '[data-testid="about-input-field"]' );
				const input = field.findComponent( { name: 'cdx-text-input' } );
				input.vm.$emit( 'change' );

				expect( wrapper.emitted() ).toHaveProperty( 'change-value' );
			} );
		} );

	} );
} );
