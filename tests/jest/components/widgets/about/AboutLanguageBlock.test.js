/*!
 * WikiLambda unit test suite for About Language Block component from the About widget.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' ),
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	AboutLanguageBlock = require( '../../../../../resources/ext.wikilambda.app/components/widgets/about/AboutLanguageBlock.vue' );

describe( 'AboutLanguageBlock', () => {
	let wrapper, getters, viewData, fieldLangs;

	beforeEach( () => {
		const mockLabels = {
			Z2K3: 'name',
			Z2K4: 'aliases',
			Z2K5: 'description',
			Z1002: 'English',
			Z1003: 'español',
			Z1732: 'asturianu',
			Z11K1: 'language',
			Z10000K1: 'first',
			Z10000K2: 'second'
		};
		getters = {
			getFallbackLanguageZids: createGetterMock( [ 'Z1003', 'Z1002' ] ),
			getLabelData: createLabelDataMock( mockLabels ),
			getZArgumentLabelForLanguage: createGettersWithFunctionsMock( undefined ),
			getZFunctionOutput: createGettersWithFunctionsMock( { id: 30 } ),
			getZMonolingualTextValue: createGettersWithFunctionsMock( undefined ),
			getZMonolingualStringsetValues: createGettersWithFunctionsMock( [] ),
			getZPersistentAlias: createGettersWithFunctionsMock( undefined ),
			getZPersistentDescription: createGettersWithFunctionsMock( undefined ),
			getZPersistentName: createGettersWithFunctionsMock( { id: 1 } )
		};
		global.store.hotUpdate( { getters: getters } );
	} );

	afterEach( () => {
		wrapper.unmount();
	} );

	describe( 'Read mode', () => {
		beforeEach( () => {
			viewData = {
				name: { rowId: 1, value: 'Nombre' },
				description: { rowId: undefined, value: '' },
				aliases: { rowId: undefined, value: [] },
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
			viewData.description = { rowId: 2, value: 'Descripción' };
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
			viewData.aliases = { rowId: 3, value: [ { rowId: 4, value: 'un alias' } ] };
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
			viewData.description = { rowId: 2, value: 'Descripción' };
			viewData.aliases = { rowId: 3, value: [ { rowId: 4, value: 'un alias' } ] };
			fieldLangs.description = [ 'Z1003' ];
			fieldLangs.aliases = [ 'Z1003' ];
			wrapper = shallowMount( AboutLanguageBlock, { props: {
				edit: false,
				isFunction: false,
				language: 'Z1003',
				viewData,
				fieldLangs
			} } );

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
			viewData.aliases = { rowId: 3, value: [
				{ rowId: 4, value: 'uno' },
				{ rowId: 5, value: 'dos' },
				{ rowId: 6, value: 'tres' },
				{ rowId: 7, value: 'cuatro' },
				{ rowId: 8, value: 'cinco' }
			] };
			fieldLangs.aliases = [ 'Z1003' ];
			wrapper = shallowMount( AboutLanguageBlock, { props: {
				edit: false,
				isFunction: false,
				language: 'Z1003',
				viewData,
				fieldLangs
			} } );

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
			viewData.inputs = [
				{ key: 'Z10001K1', value: '', inputRowId: 11, labelRowId: undefined, typeRowId: 13 },
				{ key: 'Z10001K2', value: 'segundo', inputRowId: 21, labelRowId: 22, typeRowId: 23 }
			];
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
			expect( inputs[ 0 ].findComponent( { name: 'wl-z-object-to-string' } ).vm.rowId ).toBe( 13 );

			expect( inputs[ 1 ].find( '.ext-wikilambda-app-about-language-block__input-label' ).text() ).toBe( 'segundo:' );
			expect( inputs[ 1 ].findComponent( { name: 'wl-z-object-to-string' } ).vm.rowId ).toBe( 23 );

			// Output type:
			const output = functionFields.find( '.ext-wikilambda-app-about-language-block__output' );
			expect( output.exists() ).toBe( true );
			expect( output.findComponent( { name: 'wl-z-object-to-string' } ).vm.rowId ).toBe( 30 );
		} );
	} );

	describe( 'Edit mode', () => {
		beforeEach( () => {
			viewData = {
				name: { rowId: undefined, value: '' },
				description: { rowId: undefined, value: '' },
				aliases: { rowId: undefined, value: [] },
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
			viewData.inputs = [
				{ key: 'Z10001K1', value: '', inputRowId: 11, typeRowId: 13 },
				{ key: 'Z10001K2', value: '', inputRowId: 21, typeRowId: 23 }
			];
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
				name: { rowId: 1, value: 'Name' },
				description: { rowId: 2, value: 'Description' },
				aliases: { rowId: 3, value: [ { rowId: 4, value: 'one alias' } ] },
				inputs: [ { key: 'Z10001K1', value: 'input one', inputRowId: 11, labelRowId: 12, typeRowId: 13 } ]
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
				getters.getZPersistentName = () => ( langZid ) => {
					const rows = { Z1003: { id: 101 }, Z1002: { id: 102 } };
					return rows[ langZid ];
				};
				getters.getZMonolingualTextValue = () => ( rowId ) => {
					const rows = { 101: 'Nombre', 102: 'Name' };
					return rows[ rowId ];
				};
				global.store.hotUpdate( { getters: getters } );

				wrapper = shallowMount( AboutLanguageBlock, {
					global: { stubs: { CdxField: false } },
					props: {
						edit: true,
						isFunction: false,
						language: 'Z1732',
						viewData,
						editData: JSON.parse( JSON.stringify( viewData ) ),
						fieldLangs
					}
				} );

				const field = wrapper.find( '[data-testid="about-name-field"]' );

				expect( field.findComponent( { name: 'cdx-text-input' } ).props( 'modelValue' ) ).toBe( '' );
				expect( field.find( '.cdx-field__help-text' ).text() ).toContain( 'español: Nombre' );
			} );

			it( 'shows fallback description hint', () => {
				fieldLangs.description = [ 'Z1003' ];
				getters.getZPersistentDescription = () => ( langZid ) => {
					const rows = { Z1003: { id: 201 } };
					return rows[ langZid ];
				};
				getters.getZMonolingualTextValue = () => ( rowId ) => {
					const rows = { 201: 'Descripción' };
					return rows[ rowId ];
				};
				global.store.hotUpdate( { getters: getters } );

				wrapper = shallowMount( AboutLanguageBlock, {
					global: { stubs: { CdxField: false } },
					props: {
						edit: true,
						isFunction: false,
						language: 'Z1732',
						viewData,
						editData: JSON.parse( JSON.stringify( viewData ) ),
						fieldLangs
					}
				} );

				const field = wrapper.find( '[data-testid="about-description-field"]' );

				expect( field.findComponent( { name: 'cdx-text-area' } ).props( 'modelValue' ) ).toBe( '' );
				expect( field.find( '.cdx-field__help-text' ).text() ).toContain( 'español: Descripción' );
			} );

			it( 'shows fallback aliases hint', () => {
				fieldLangs.aliases = [ 'Z1002' ];
				getters.getZPersistentAlias = () => ( langZid ) => {
					const rows = { Z1002: { id: 301 } };
					return rows[ langZid ];
				};
				getters.getZMonolingualStringsetValues = () => ( rowId ) => {
					const rows = { 301: [ { rowId: 31, value: 'one' }, { rowId: 32, value: 'two' } ] };
					return rows[ rowId ] || [];
				};
				global.store.hotUpdate( { getters: getters } );

				wrapper = shallowMount( AboutLanguageBlock, {
					global: { stubs: { CdxField: false } },
					props: {
						edit: true,
						isFunction: false,
						language: 'Z1732',
						viewData,
						editData: JSON.parse( JSON.stringify( viewData ) ),
						fieldLangs
					}
				} );

				const field = wrapper.find( '[data-testid="about-aliases-field"]' );

				expect( field.findComponent( { name: 'cdx-chip-input' } ).props( 'inputChips' ) ).toEqual( [] );
				expect( field.find( '.cdx-field__help-text' ).text() ).toContain( 'English: one, two' );
			} );

			it( 'shows fallback input label hint', () => {
				viewData.inputs = [
					{ key: 'Z10001K1', value: 'primeru', labelRowId: 402, inputRowId: 11, typeRowId: 13 },
					{ key: 'Z10001K2', value: '', inputRowId: 21, typeRowId: 23 },
					{ key: 'Z10001K3', value: '', inputRowId: 31, typeRowId: 33 }
				];
				fieldLangs.inputs = [ [ 'Z1732', 'Z1002' ], [ 'Z1002' ], [ 'Z1002', 'Z1003' ] ];
				getters.getZArgumentLabelForLanguage = () => ( rowId, langZid ) => {
					const rows = {
						11: { Z1002: { id: 401 }, Z1732: { id: 402 } },
						21: { Z1002: { id: 501 } },
						31: { Z1002: { id: 601 }, Z1003: { id: 602 } }
					};
					return rows[ rowId ] ? rows[ rowId ][ langZid ] : undefined;
				};
				getters.getZMonolingualTextValue = () => ( rowId ) => {
					const rows = { 401: 'first', 402: 'primeru', 501: 'second', 601: 'third', 602: 'tercero' };
					return rows[ rowId ];
				};
				global.store.hotUpdate( { getters: getters } );

				wrapper = shallowMount( AboutLanguageBlock, {
					global: { stubs: { CdxField: false } },
					props: {
						edit: true,
						isFunction: true,
						language: 'Z1732',
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
				expect( fields[ 1 ].find( '.cdx-field__help-text' ).text() ).toContain( 'English: second' );
				// Third input has fallback in Spanish and English (Spanish is the best choice)
				expect( fields[ 2 ].findComponent( { name: 'cdx-text-input' } ).props( 'modelValue' ) ).toBe( '' );
				expect( fields[ 2 ].find( '.cdx-field__help-text' ).text() ).toContain( 'español: tercero' );
			} );
		} );

		describe( 'Update and change events', () => {
			beforeEach( () => {
				viewData = {
					name: { rowId: 1, value: 'Name' },
					description: { rowId: 2, value: 'Description' },
					aliases: { rowId: 3, value: [ { rowId: 4, value: 'one alias' } ] },
					inputs: [ { key: 'Z10001K1', value: 'input one', inputRowId: 11, labelRowId: 12, typeRowId: 13 } ]
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
					data: { rowId: 1, value: 'Name' },
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
					data: { rowId: 2, value: 'Description' },
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
					data: { rowId: 3, value: [ { rowId: 4, value: 'one alias' } ] },
					value: [ { value: 'one alias' }, { value: 'new alias' } ]
				} ] ] );
				expect( wrapper.emitted() ).toHaveProperty( 'change-value' );
			} );

			it( 'emits an update event when updating input label field', () => {
				const field = wrapper.find( '[data-testid="about-input-field"]' );
				const input = field.findComponent( { name: 'cdx-text-input' } );
				input.vm.$emit( 'update:modelValue', 'input one!' );

				expect( wrapper.emitted( 'update-edit-value' ) ).toEqual( [ [ {
					data: {
						key: 'Z10001K1',
						value: 'input one',
						inputRowId: 11,
						labelRowId: 12,
						typeRowId: 13
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