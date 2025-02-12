/*!
 * WikiLambda unit test suite for About Widget.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../../helpers/getterHelpers.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const About = require( '../../../../../resources/ext.wikilambda.app/components/widgets/about/About.vue' );

describe( 'About', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		const mockLabels = {
			Z1002: 'English',
			Z1003: 'español',
			Z1732: 'asturianu'
		};
		store.getFallbackLanguageZids = [ 'Z1003', 'Z1002' ];
		store.getLabelData = createLabelDataMock( mockLabels );
		store.getMultilingualDataLanguages = createGettersWithFunctionsMock( [] );
		store.getRowByKeyPath = createGettersWithFunctionsMock( undefined );
		store.getUserLangZid = 'Z1002';
		store.getZArgumentLabelForLanguage = createGettersWithFunctionsMock( undefined );
		store.getZArgumentTypeRowId = createGettersWithFunctionsMock( undefined );
		store.getZArgumentKey = createGettersWithFunctionsMock( undefined );
		store.getZFunctionInputs = createGettersWithFunctionsMock( [] );
		store.getZFunctionInputLangs = createGettersWithFunctionsMock( [] );
		store.getZMonolingualTextValue = createGettersWithFunctionsMock( '' );
		store.getZMonolingualStringsetValues = createGettersWithFunctionsMock( [] );
		store.getZPersistentName = createGettersWithFunctionsMock( undefined );
		store.getZPersistentNameLangs = createGettersWithFunctionsMock( [] );
		store.getZPersistentDescription = createGettersWithFunctionsMock( undefined );
		store.getZPersistentDescriptionLangs = createGettersWithFunctionsMock( [] );
		store.getZPersistentAlias = createGettersWithFunctionsMock( undefined );
		store.getZPersistentAliasLangs = createGettersWithFunctionsMock( [] );
		store.isDirty = false;
		store.isUserLoggedIn = true;
		store.isCreateNewPage = true;
		// pageTitle mixin getters:
		store.getLanguageIsoCodeOfZLang = createGettersWithFunctionsMock( 'en' );
		store.getZReferenceTerminalValue = createGettersWithFunctionsMock( undefined );
	} );

	describe( 'View page', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( About, {
				props: { edit: false, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false } }
			} );
			expect( wrapper.find( '.ext-wikilambda-app-about' ).exists() ).toBe( true );
		} );

		describe( 'Multilingual data available in the user language', () => {
			beforeEach( () => {
				store.getMultilingualDataLanguages = createGettersWithFunctionsMock( [ 'Z1002' ] );
				store.getZPersistentNameLangs = createGettersWithFunctionsMock( [ 'Z1002' ] );
				store.getZPersistentName = createGettersWithFunctionsMock( { id: 10 } );
				store.getZMonolingualTextValue = createGettersWithFunctionsMock( 'Some name' );
			} );

			it( 'renders user language block: only name in user language', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: false, type: 'Z6' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );

				await wrapper.vm.$nextTick();

				const blocks = wrapper.findAllComponents( { name: 'cdx-accordion' } );
				expect( blocks.length ).toBe( 1 );

				expect( blocks[ 0 ].attributes( 'open' ) ).toBeDefined();
				expect( blocks[ 0 ].find( 'summary' ).text() ).toContain( 'English' );
				expect( blocks[ 0 ].find( 'summary' ).text() ).toContain( 'Some name' );

				const languageBlock = blocks[ 0 ].findComponent( { name: 'wl-about-language-block' } );
				expect( languageBlock.exists() ).toBe( true );
				expect( languageBlock.vm.language ).toBe( 'Z1002' );
				expect( languageBlock.vm.edit ).toBe( false );
				expect( languageBlock.vm.viewData.name ).toEqual( {
					rowId: 10,
					value: 'Some name'
				} );
			} );

			it( 'renders user language block: name, description and aliases in user language', async () => {
				const aliases = [ { rowId: 31, value: 'alias one' }, { rowId: 32, value: 'alias two' } ];
				store.getZPersistentDescriptionLangs = createGettersWithFunctionsMock( [ 'Z1002' ] );
				store.getZPersistentDescription = createGettersWithFunctionsMock( { id: 20 } );
				store.getZPersistentAliasLangs = createGettersWithFunctionsMock( [ 'Z1002' ] );
				store.getZPersistentAlias = createGettersWithFunctionsMock( { id: 30 } );
				store.getZMonolingualTextValue = ( rowId ) => rowId === 10 ? 'Some name' : 'Some description';
				store.getZMonolingualStringsetValues = createGettersWithFunctionsMock( aliases );

				const wrapper = shallowMount( About, {
					props: { edit: false, type: 'Z6' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );

				await wrapper.vm.$nextTick();

				const blocks = wrapper.findAllComponents( { name: 'cdx-accordion' } );
				expect( blocks.length ).toBe( 1 );

				expect( blocks[ 0 ].attributes( 'open' ) ).toBeDefined();
				expect( blocks[ 0 ].find( 'summary' ).text() ).toContain( 'English' );
				expect( blocks[ 0 ].find( 'summary' ).text() ).toContain( 'Some name' );

				const languageBlock = blocks[ 0 ].findComponent( { name: 'wl-about-language-block' } );
				expect( languageBlock.exists() ).toBe( true );
				expect( languageBlock.vm.language ).toBe( 'Z1002' );
				expect( languageBlock.vm.edit ).toBe( false );
				expect( languageBlock.vm.viewData.name ).toEqual( {
					rowId: 10,
					value: 'Some name'
				} );
				expect( languageBlock.vm.viewData.description ).toEqual( {
					rowId: 20,
					value: 'Some description'
				} );
				expect( languageBlock.vm.viewData.aliases ).toEqual( {
					rowId: 30,
					value: aliases
				} );
			} );
		} );

		describe( 'Multilingual data available in fallback languages', () => {
			beforeEach( () => {
				// User language: Asturian, Fallback chain: [ Asturian, Spanish, English ]
				store.getFallbackLanguageZids = [ 'Z1732', 'Z1003', 'Z1002' ];
				store.getUserLangZid = 'Z1732';
				store.getMultilingualDataLanguages = createGettersWithFunctionsMock( [ 'Z1002' ] );
				store.getZPersistentNameLangs = createGettersWithFunctionsMock( [ 'Z1002' ] );
				store.getZPersistentName = ( lang ) => lang === 'Z1002' ? { id: 10 } : undefined;
				store.getZMonolingualTextValue = createGettersWithFunctionsMock( 'Some name' );
			} );

			it( 'renders user language and fallback blocks', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: false, type: 'Z6' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );

				await wrapper.vm.$nextTick();

				const blocks = wrapper.findAllComponents( { name: 'cdx-accordion' } );
				expect( blocks.length ).toBe( 2 );

				// User language: no title
				expect( blocks[ 0 ].attributes( 'open' ) ).toBeDefined();
				expect( blocks[ 0 ].find( 'summary' ).text() ).toContain( 'asturianu' );
				expect( blocks[ 0 ].find( 'summary' ).text() ).toContain( 'Untitled' );

				const uselangBlock = blocks[ 0 ].findComponent( { name: 'wl-about-language-block' } );
				expect( uselangBlock.exists() ).toBe( true );
				expect( uselangBlock.vm.language ).toBe( 'Z1732' );
				expect( uselangBlock.vm.viewData.name ).toEqual( {
					rowId: undefined,
					value: ''
				} );

				// Fallback language: available title
				expect( blocks[ 1 ].attributes( 'open' ) ).not.toBeDefined();
				expect( blocks[ 1 ].find( 'summary' ).text() ).toContain( 'English' );
				expect( blocks[ 1 ].find( 'summary' ).text() ).toContain( 'Some name' );

				const fallbackBlock = blocks[ 1 ].findComponent( { name: 'wl-about-language-block' } );
				expect( fallbackBlock.exists() ).toBe( true );
				expect( fallbackBlock.vm.language ).toBe( 'Z1002' );
				expect( fallbackBlock.vm.viewData.name ).toEqual( {
					rowId: 10,
					value: 'Some name'
				} );
			} );
		} );

		describe( 'Multilingual data for functions available in fallback languages', () => {
			const inputs = [ { id: 40 }, { id: 50 } ];

			beforeEach( () => {
				// User language: Asturian, Fallback chain: [ Asturian, Spanish, English ]
				store.getFallbackLanguageZids = [ 'Z1732', 'Z1003', 'Z1002' ];
				store.getUserLangZid = 'Z1732';
				store.getMultilingualDataLanguages = createGettersWithFunctionsMock( [ 'Z1002', 'Z1003' ] );
				// Name available in English
				store.getZPersistentNameLangs = createGettersWithFunctionsMock( [ 'Z1002' ] );
				store.getZPersistentName = ( lang ) => lang === 'Z1002' ? { id: 10 } : undefined;
				// Input labels available in Spanish
				store.getZFunctionInputs = createGettersWithFunctionsMock( inputs );
				store.getZFunctionInputLangs = createGettersWithFunctionsMock( [ 'Z1003' ] );
				store.getZArgumentTypeRowId = ( rowId ) => rowId === 40 ? 41 : 51;
				store.getZArgumentKey = ( rowId ) => rowId === 40 ? 'K1' : 'K2';
				store.getZArgumentLabelForLanguage = ( rowId, lang ) => {
					if ( lang === 'Z1003' ) {
						return rowId === 40 ? { id: 42 } : { id: 52 };
					}
					return undefined;
				};
				// Name and input label values
				store.getZMonolingualTextValue = ( rowId ) => {
					const values = { 10: 'Some name', 42: 'primero', 52: 'segundo' };
					return values[ rowId ];
				};
			} );

			it( 'renders user language and fallback blocks', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: false, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );

				await wrapper.vm.$nextTick();

				const blocks = wrapper.findAllComponents( { name: 'cdx-accordion' } );
				expect( blocks.length ).toBe( 3 );

				// User language: no title and no labels
				expect( blocks[ 0 ].attributes( 'open' ) ).toBeDefined();
				expect( blocks[ 0 ].find( 'summary' ).text() ).toContain( 'asturianu' );
				expect( blocks[ 0 ].find( 'summary' ).text() ).toContain( 'Untitled' );

				const uselangBlock = blocks[ 0 ].findComponent( { name: 'wl-about-language-block' } );
				expect( uselangBlock.exists() ).toBe( true );
				expect( uselangBlock.vm.language ).toBe( 'Z1732' );
				expect( uselangBlock.vm.viewData.name ).toEqual( {
					rowId: undefined,
					value: ''
				} );
				expect( uselangBlock.vm.viewData.inputs ).toEqual( [
					{ inputRowId: 40, key: 'K1', typeRowId: 41, labelRowId: undefined, value: '' },
					{ inputRowId: 50, key: 'K2', typeRowId: 51, labelRowId: undefined, value: '' }
				] );

				// Fallback language 1: Spanish, available input labels
				expect( blocks[ 1 ].attributes( 'open' ) ).not.toBeDefined();
				expect( blocks[ 1 ].find( 'summary' ).text() ).toContain( 'español' );
				expect( blocks[ 1 ].find( 'summary' ).text() ).toContain( 'Untitled' );

				const fallbackBlock1 = blocks[ 1 ].findComponent( { name: 'wl-about-language-block' } );
				expect( fallbackBlock1.exists() ).toBe( true );
				expect( fallbackBlock1.vm.language ).toBe( 'Z1003' );
				expect( fallbackBlock1.vm.viewData.name ).toEqual( {
					rowId: undefined,
					value: ''
				} );
				expect( fallbackBlock1.vm.viewData.inputs ).toEqual( [
					{ inputRowId: 40, key: 'K1', typeRowId: 41, labelRowId: 42, value: 'primero' },
					{ inputRowId: 50, key: 'K2', typeRowId: 51, labelRowId: 52, value: 'segundo' }
				] );

				// Fallback language 2: English, available title
				expect( blocks[ 2 ].attributes( 'open' ) ).not.toBeDefined();
				expect( blocks[ 2 ].find( 'summary' ).text() ).toContain( 'English' );
				expect( blocks[ 2 ].find( 'summary' ).text() ).toContain( 'Some name' );

				const fallbackBlock2 = blocks[ 2 ].findComponent( { name: 'wl-about-language-block' } );
				expect( fallbackBlock2.exists() ).toBe( true );
				expect( fallbackBlock2.vm.language ).toBe( 'Z1002' );
				expect( fallbackBlock2.vm.viewData.name ).toEqual( {
					rowId: 10,
					value: 'Some name'
				} );
				expect( uselangBlock.vm.viewData.inputs ).toEqual( [
					{ inputRowId: 40, key: 'K1', typeRowId: 41, labelRowId: undefined, value: '' },
					{ inputRowId: 50, key: 'K2', typeRowId: 51, labelRowId: undefined, value: '' }
				] );
			} );
		} );

		describe( 'Quick edit', () => {
			beforeEach( () => {
				store.getRowByKeyPath = createGettersWithFunctionsMock( { id: 1 } );
				store.getMultilingualDataLanguages = createGettersWithFunctionsMock( [ 'Z1002' ] );
				store.getZPersistentNameLangs = createGettersWithFunctionsMock( [ 'Z1002' ] );
				store.getZPersistentName = createGettersWithFunctionsMock( { id: 10 } );
				store.getZMonolingualTextValue = createGettersWithFunctionsMock( 'Some name' );
			} );

			it( 'goes into edit mode when click accordion action button', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: false, type: 'Z6' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );

				await wrapper.vm.$nextTick();

				const blocks = wrapper.findAllComponents( { name: 'cdx-accordion' } );
				const languageBlock = blocks[ 0 ].findComponent( { name: 'wl-about-language-block' } );
				expect( languageBlock.vm.edit ).toBe( false );
				expect( languageBlock.vm.editData ).toBe( undefined );

				// Click edit:
				const editButton = blocks[ 0 ].find( '.cdx-accordion__action' );
				editButton.trigger( 'click' );
				await wrapper.vm.$nextTick();

				expect( languageBlock.vm.edit ).toBe( true );
				expect( languageBlock.vm.editData ).toEqual( {
					name: { rowId: 10, value: 'Some name' },
					description: { rowId: undefined, value: '' },
					aliases: { rowId: undefined, value: [] },
					inputs: []
				} );
			} );

			it( 'cancels edit and discards changes when click cancel button', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: false, type: 'Z6' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );

				await wrapper.vm.$nextTick();
				const blocks = wrapper.findAllComponents( { name: 'cdx-accordion' } );
				const languageBlock = blocks[ 0 ].findComponent( { name: 'wl-about-language-block' } );

				// Click edit:
				const editButton = blocks[ 0 ].find( '.cdx-accordion__action' );
				editButton.trigger( 'click' );
				await wrapper.vm.$nextTick();

				// Make some changes:
				languageBlock.vm.$emit( 'update-edit-value', {
					data: languageBlock.vm.editData.name,
					value: 'Some other name'
				} );
				expect( languageBlock.vm.editData.name.value ).toBe( 'Some other name' );

				// Click cancel:
				const cancelButton = wrapper.find( '.ext-wikilambda-app-about__button-cancel' );
				cancelButton.trigger( 'click' );
				await wrapper.vm.$nextTick();

				// Assert that changes are discarded:
				expect( languageBlock.vm.edit ).toBe( false );
				expect( languageBlock.vm.editData ).toBe( undefined );
				expect( languageBlock.vm.viewData.name.value ).toBe( 'Some name' );
			} );

			it( 'persists changes and initiates publish flow when click publish button', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: false, type: 'Z6' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );

				await wrapper.vm.$nextTick();
				const blocks = wrapper.findAllComponents( { name: 'cdx-accordion' } );
				const languageBlock = blocks[ 0 ].findComponent( { name: 'wl-about-language-block' } );

				// Click edit:
				const editButton = blocks[ 0 ].find( '.cdx-accordion__action' );
				editButton.trigger( 'click' );
				await wrapper.vm.$nextTick();

				// Make some changes:
				languageBlock.vm.$emit( 'update-edit-value', {
					data: languageBlock.vm.editData.name,
					value: 'Some other name'
				} );
				expect( languageBlock.vm.editData.name.value ).toBe( 'Some other name' );

				// Spy on persistName
				jest.spyOn( wrapper.vm, 'persistState' );

				// Click publish:
				const publishButton = wrapper.find( '.ext-wikilambda-app-about__button-publish' );
				publishButton.trigger( 'click' );
				await wrapper.vm.$nextTick();

				// Assert that persistState is called:
				expect( wrapper.vm.persistState ).toHaveBeenCalled();

				// Assert that publish dialog is set to open:
				expect( wrapper.vm.showPublishDialog ).toBe( true );
			} );

			it( 'does not persist state with change-value events', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: false, type: 'Z6' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );

				await wrapper.vm.$nextTick();
				const blocks = wrapper.findAllComponents( { name: 'cdx-accordion' } );
				const languageBlock = blocks[ 0 ].findComponent( { name: 'wl-about-language-block' } );

				// Spy on persistState
				jest.spyOn( wrapper.vm, 'persistState' );

				// Language block emits a change-value event
				languageBlock.vm.$emit( 'change-value' );

				// persistState should not have been called
				await wrapper.vm.$nextTick();
				expect( wrapper.vm.persistState ).not.toHaveBeenCalled();
			} );
		} );
	} );

	describe( 'Edit page', () => {
		beforeEach( () => {
			// User language: Asturian, Fallback chain: [ Asturian, Spanish, English ]
			store.getFallbackLanguageZids = [ 'Z1732', 'Z1003', 'Z1002' ];
			store.getUserLangZid = 'Z1732';
			store.getMultilingualDataLanguages = createGettersWithFunctionsMock( [ 'Z1002' ] );
			store.getZPersistentNameLangs = createGettersWithFunctionsMock( [ 'Z1002' ] );
			store.getZPersistentName = jest.fn( ( lang ) => lang === 'Z1002' ? { id: 10 } : undefined );
			store.getZMonolingualTextValue = createGettersWithFunctionsMock( 'Some name' );
		} );

		it( 'renders all blocks in edit mode', async () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
			} );

			await wrapper.vm.$nextTick();

			// No edit buttons in the accordion components:
			const accordions = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			expect( accordions.length ).toBe( 2 );
			expect( accordions[ 0 ].vm.actionIcon ).toBeFalsy();
			expect( accordions[ 1 ].vm.actionIcon ).toBeFalsy();

			// All language blocks set to edit:
			const blocks = wrapper.findAllComponents( { name: 'wl-about-language-block' } );
			expect( blocks.length ).toBe( 2 );
			expect( blocks[ 0 ].vm.edit ).toBe( true );
			expect( blocks[ 1 ].vm.edit ).toBe( true );

			// All edit data is initialized with a copy of current persisted state
			expect( blocks[ 0 ].vm.editData ).toEqual( wrapper.vm.displayLanguageData[ 0 ].viewData );
			expect( blocks[ 1 ].vm.editData ).toEqual( wrapper.vm.displayLanguageData[ 1 ].viewData );
		} );

		it( 'does not render local publish and cancel buttons', async () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
			} );

			await wrapper.vm.$nextTick();
			expect( wrapper.find( '.ext-wikilambda-app-about__button-cancel' ).exists() ).toBe( false );
			expect( wrapper.find( '.ext-wikilambda-app-about__button-publish' ).exists() ).toBe( false );
		} );

		it( 'persists state with change-value events', async () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
			} );

			await wrapper.vm.$nextTick();
			const blocks = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			const languageBlock = blocks[ 0 ].findComponent( { name: 'wl-about-language-block' } );

			// Spy on persistState
			jest.spyOn( wrapper.vm, 'persistState' );

			// Language block emits a change-value event
			languageBlock.vm.$emit( 'change-value' );
			await wrapper.vm.$nextTick();

			// persistState should have been called
			expect( wrapper.vm.persistState ).toHaveBeenCalled();
		} );
	} );

	describe( 'Persist changes in the state', () => {
		beforeEach( () => {
			store.getZFunctionInputs = createGettersWithFunctionsMock( [ { id: 40 } ] );
			store.getZArgumentKey = createGettersWithFunctionsMock( 'K1' );
			store.getZArgumentTypeRowId = createGettersWithFunctionsMock( 41 );
			store.getRowByKeyPath = createGettersWithFunctionsMock( { id: 1 } );
		} );

		it( 'calls no persist methods when fields have no changes', async () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z8' },
				global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
			} );
			await wrapper.vm.$nextTick();

			jest.spyOn( wrapper.vm, 'persistName' );
			jest.spyOn( wrapper.vm, 'persistDescription' );
			jest.spyOn( wrapper.vm, 'persistAlias' );
			jest.spyOn( wrapper.vm, 'persistInputLabel' );

			wrapper.vm.persistState();

			expect( wrapper.vm.persistName ).toHaveBeenCalledTimes( 0 );
			expect( wrapper.vm.persistDescription ).toHaveBeenCalledTimes( 0 );
			expect( wrapper.vm.persistAlias ).toHaveBeenCalledTimes( 0 );
			expect( wrapper.vm.persistInputLabel ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'calls persist methods for each field with changes', async () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z8' },
				global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
			} );
			await wrapper.vm.$nextTick();

			jest.spyOn( wrapper.vm, 'persistName' );
			jest.spyOn( wrapper.vm, 'persistDescription' );
			jest.spyOn( wrapper.vm, 'persistAlias' );
			jest.spyOn( wrapper.vm, 'persistInputLabel' );

			// Mock the changes in the editData object
			wrapper.vm.displayLanguages[ 0 ].editData.name.value = 'New name';
			wrapper.vm.displayLanguages[ 0 ].editData.description.value = 'New description';
			wrapper.vm.displayLanguages[ 0 ].editData.aliases.value = [ { value: 'New alias' } ];
			wrapper.vm.displayLanguages[ 0 ].editData.inputs[ 0 ].value = 'New input label';

			wrapper.vm.persistState();

			expect( wrapper.vm.persistName ).toHaveBeenCalledWith( undefined, 'New name', 'Z1002' );
			expect( wrapper.vm.persistDescription ).toHaveBeenCalledWith( undefined, 'New description', 'Z1002' );
			expect( wrapper.vm.persistAlias ).toHaveBeenCalledWith( undefined, [ { value: 'New alias' } ], 'Z1002' );
			expect( wrapper.vm.persistInputLabel ).toHaveBeenCalledWith( {
				key: 'K1',
				value: '',
				inputRowId: 40,
				typeRowId: 41,
				labelRowId: undefined
			}, 'New input label', 'Z1002' );
		} );

		describe( 'persistZMonolingualString', () => {
			/**
			 * persistZMonolingualString is used by persistName, persistDescription
			 * and persistInputLabel, hence testing all its branches once as part of
			 * this test case.
			 */
			it( 'inserts new monolingual string when there was none for this language', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();

				wrapper.vm.persistZMonolingualString( 1, undefined, 'New name', 'Z1002' );

				expect( store.setDirty ).toHaveBeenCalledWith( true );
				expect( store.changeType ).toHaveBeenCalledWith( {
					id: 1,
					type: 'Z11',
					lang: 'Z1002',
					value: 'New name',
					append: true
				} );
			} );

			it( 'sets new value of an existing monolingual string', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();

				wrapper.vm.persistZMonolingualString( 1, 10, 'New name', 'Z1002' );

				expect( store.setDirty ).toHaveBeenCalledWith( true );
				expect( store.setValueByRowIdAndPath ).toHaveBeenCalledWith( {
					rowId: 10,
					keyPath: [ 'Z11K2', 'Z6K1' ],
					value: 'New name'
				} );
			} );

			it( 'removes existing monolingual string when new value is empty', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();

				wrapper.vm.persistZMonolingualString( 1, 10, '', 'Z1002' );

				expect( store.setDirty ).toHaveBeenCalledWith( true );
				expect( store.removeItemFromTypedList ).toHaveBeenCalledWith( {
					rowId: 10
				} );
			} );
		} );

		describe( 'persistName', () => {
			it( 'sets new name when there was none', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();
				jest.spyOn( wrapper.vm, 'persistName' );
				jest.spyOn( wrapper.vm, 'persistZMonolingualString' );

				// Mock the changes in the editData object
				wrapper.vm.displayLanguages[ 0 ].editData.name.value = 'New name';

				// Run persistState
				wrapper.vm.persistState();

				expect( wrapper.vm.persistName ).toHaveBeenCalledWith( undefined, 'New name', 'Z1002' );
				expect( wrapper.vm.persistZMonolingualString ).toHaveBeenCalledWith( 1, undefined, 'New name', 'Z1002' );
			} );

			it( 'sets new name value when there was one', async () => {
				store.getZPersistentNameLangs = createGettersWithFunctionsMock( [ 'Z1002' ] );
				store.getZPersistentName = createGettersWithFunctionsMock( { id: 10 } );

				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();
				jest.spyOn( wrapper.vm, 'persistName' );
				jest.spyOn( wrapper.vm, 'persistZMonolingualString' );

				// Mock the changes in the editData object
				wrapper.vm.displayLanguages[ 0 ].editData.name.value = 'New name';

				// Run persistState
				wrapper.vm.persistState();

				expect( wrapper.vm.persistName ).toHaveBeenCalledWith( 10, 'New name', 'Z1002' );
				expect( wrapper.vm.persistZMonolingualString ).toHaveBeenCalledWith( 1, 10, 'New name', 'Z1002' );
			} );
		} );

		describe( 'persistDescription', () => {
			it( 'sets new description when there was none', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();
				jest.spyOn( wrapper.vm, 'persistDescription' );
				jest.spyOn( wrapper.vm, 'persistZMonolingualString' );

				// Mock the changes in the editData object
				wrapper.vm.displayLanguages[ 0 ].editData.description.value = 'New description';

				// Run persistState
				wrapper.vm.persistState();

				expect( wrapper.vm.persistDescription ).toHaveBeenCalledWith( undefined, 'New description', 'Z1002' );
				expect( wrapper.vm.persistZMonolingualString ).toHaveBeenCalledWith( 1, undefined, 'New description', 'Z1002' );
			} );

			it( 'sets new description value when there was one', async () => {
				store.getZPersistentDescriptionLangs = createGettersWithFunctionsMock( [ 'Z1002' ] );
				store.getZPersistentDescription = createGettersWithFunctionsMock( { id: 10 } );

				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();
				jest.spyOn( wrapper.vm, 'persistDescription' );
				jest.spyOn( wrapper.vm, 'persistZMonolingualString' );

				// Mock the changes in the editData object
				wrapper.vm.displayLanguages[ 0 ].editData.description.value = 'New description';

				// Run persistState
				wrapper.vm.persistState();

				expect( wrapper.vm.persistDescription ).toHaveBeenCalledWith( 10, 'New description', 'Z1002' );
				expect( wrapper.vm.persistZMonolingualString ).toHaveBeenCalledWith( 1, 10, 'New description', 'Z1002' );
			} );
		} );

		describe( 'persistInputLabel', () => {
			it( 'sets new input label when there was none', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();
				jest.spyOn( wrapper.vm, 'persistInputLabel' );
				jest.spyOn( wrapper.vm, 'persistZMonolingualString' );

				// Mock the changes in the editData object
				wrapper.vm.displayLanguages[ 0 ].editData.inputs[ 0 ].value = 'New input label';

				// Run persistState
				wrapper.vm.persistState();

				expect( wrapper.vm.persistInputLabel ).toHaveBeenCalledWith( {
					key: 'K1',
					value: '',
					inputRowId: 40,
					typeRowId: 41,
					labelRowId: undefined
				}, 'New input label', 'Z1002' );
				expect( wrapper.vm.persistZMonolingualString ).toHaveBeenCalledWith( 1, undefined, 'New input label', 'Z1002' );
			} );

			it( 'sets new input label value when there was one', async () => {
				store.getZArgumentLabelForLanguage = createGettersWithFunctionsMock( { id: 42 } );
				store.getZMonolingualTextValue = createGettersWithFunctionsMock( 'Input label' );

				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();
				jest.spyOn( wrapper.vm, 'persistInputLabel' );
				jest.spyOn( wrapper.vm, 'persistZMonolingualString' );

				// Mock the changes in the editData object
				wrapper.vm.displayLanguages[ 0 ].editData.inputs[ 0 ].value = 'New input label';

				// Run persistState
				wrapper.vm.persistState();

				expect( wrapper.vm.persistInputLabel ).toHaveBeenCalledWith( {
					key: 'K1',
					value: 'Input label',
					inputRowId: 40,
					typeRowId: 41,
					labelRowId: 42
				}, 'New input label', 'Z1002' );
				expect( wrapper.vm.persistZMonolingualString ).toHaveBeenCalledWith( 1, 42, 'New input label', 'Z1002' );
			} );
		} );

		describe( 'persistAlias', () => {
			it( 'sets new aliases for a language that has none', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();
				jest.spyOn( wrapper.vm, 'persistAlias' );
				jest.spyOn( wrapper.vm, 'persistZMonolingualStringset' );

				// Mock the changes in the editData object
				const aliases = [ { rowId: undefined, value: 'one' } ];
				wrapper.vm.displayLanguages[ 0 ].editData.aliases.value = aliases;

				// Run persistState
				wrapper.vm.persistState();

				expect( wrapper.vm.persistAlias ).toHaveBeenCalledWith( undefined, aliases, 'Z1002' );
				expect( wrapper.vm.persistZMonolingualStringset ).toHaveBeenCalledWith( 1, undefined, [ 'one' ], 'Z1002' );

				expect( store.setDirty ).toHaveBeenCalledWith( true );
				expect( store.changeType ).toHaveBeenCalledWith( {
					id: 1,
					type: 'Z31',
					lang: 'Z1002',
					value: [ 'one' ],
					append: true
				} );
			} );

			it( 'sets new aliases value for a language with existing values', async () => {
				const aliases = [ { rowId: 31, value: 'one' } ];
				store.getZPersistentAliasLangs = createGettersWithFunctionsMock( [ 'Z1002' ] );
				store.getZPersistentAlias = createGettersWithFunctionsMock( { id: 30 } );
				store.getZMonolingualStringsetValues = createGettersWithFunctionsMock( aliases.slice() );

				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();
				jest.spyOn( wrapper.vm, 'persistAlias' );
				jest.spyOn( wrapper.vm, 'persistZMonolingualStringset' );

				// Mock the changes in the editData object
				aliases.push( { rowId: undefined, value: 'two' } );
				wrapper.vm.displayLanguages[ 0 ].editData.aliases.value = aliases;

				// Run persistState
				wrapper.vm.persistState();

				expect( wrapper.vm.persistAlias ).toHaveBeenCalledWith( 30, aliases, 'Z1002' );
				expect( wrapper.vm.persistZMonolingualStringset ).toHaveBeenCalledWith( 1, 30, [ 'one', 'two' ], 'Z1002' );

				expect( store.setDirty ).toHaveBeenCalledWith( true );
				expect( store.setValueByRowIdAndPath ).toHaveBeenCalledWith( {
					rowId: 30,
					keyPath: [ 'Z31K2' ],
					value: [ 'Z6', 'one', 'two' ]
				} );
			} );

			it( 'removes all aliases for a language', async () => {
				const aliases = [ { rowId: 31, value: 'one' } ];
				store.getZPersistentAliasLangs = createGettersWithFunctionsMock( [ 'Z1002' ] );
				store.getZPersistentAlias = createGettersWithFunctionsMock( { id: 30 } );
				store.getZMonolingualStringsetValues = createGettersWithFunctionsMock( aliases );

				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();
				jest.spyOn( wrapper.vm, 'persistAlias' );
				jest.spyOn( wrapper.vm, 'persistZMonolingualStringset' );

				// Mock the changes in the editData object
				wrapper.vm.displayLanguages[ 0 ].editData.aliases.value = [];

				// Run persistState
				wrapper.vm.persistState();

				expect( wrapper.vm.persistAlias ).toHaveBeenCalledWith( 30, [], 'Z1002' );
				expect( wrapper.vm.persistZMonolingualStringset ).toHaveBeenCalledWith( 1, 30, [], 'Z1002' );

				expect( store.setDirty ).toHaveBeenCalledWith( true );
				expect( store.removeItemFromTypedList ).toHaveBeenCalledWith( {
					rowId: 30
				} );
			} );
		} );
	} );

	describe( 'Add a new language', () => {
		beforeEach( () => {
			store.getMultilingualDataLanguages = createGettersWithFunctionsMock( [ 'Z1002' ] );
			store.getZPersistentNameLangs = createGettersWithFunctionsMock( [ 'Z1002' ] );
			store.getZPersistentName = createGettersWithFunctionsMock( { id: 10 } );
			store.getZMonolingualTextValue = createGettersWithFunctionsMock( 'Some name' );
		} );

		it( 'adds a new language in read mode', async () => {
			const wrapper = shallowMount( About, {
				props: { edit: false, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
			} );
			await wrapper.vm.$nextTick();

			const languagesDialog = wrapper.findComponent( { name: 'wl-about-languages-dialog' } );
			languagesDialog.vm.$emit( 'add-language', 'Z1003' );
			await wrapper.vm.$nextTick();

			// English and Spanish language blocks
			const blocks = wrapper.findAllComponents( { name: 'wl-about-language-block' } );
			expect( blocks.length ).toBe( 2 );
			expect( blocks[ 0 ].vm.language ).toBe( 'Z1002' );
			expect( blocks[ 1 ].vm.language ).toBe( 'Z1003' );
			expect( blocks[ 1 ].vm.edit ).toBe( false );
			expect( blocks[ 1 ].vm.editData ).toBe( undefined );
		} );

		it( 'adds a new language block in edit mode', async () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
			} );
			await wrapper.vm.$nextTick();

			const languagesDialog = wrapper.findComponent( { name: 'wl-about-languages-dialog' } );
			languagesDialog.vm.$emit( 'add-language', 'Z1003' );
			await wrapper.vm.$nextTick();

			// English and Spanish language blocks
			const blocks = wrapper.findAllComponents( { name: 'wl-about-language-block' } );
			expect( blocks.length ).toBe( 2 );
			expect( blocks[ 0 ].vm.language ).toBe( 'Z1002' );
			expect( blocks[ 1 ].vm.language ).toBe( 'Z1003' );
			expect( blocks[ 1 ].vm.edit ).toBe( true );
			expect( blocks[ 1 ].vm.editData ).toEqual( {
				name: { rowId: 10, value: 'Some name' },
				description: { rowId: undefined, value: '' },
				aliases: { rowId: undefined, value: [] },
				inputs: []
			} );
		} );

		it( 'does nothing if language block already exists', async () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
			} );
			await wrapper.vm.$nextTick();

			const languagesDialog = wrapper.findComponent( { name: 'wl-about-languages-dialog' } );
			languagesDialog.vm.$emit( 'add-language', 'Z1002' );
			await wrapper.vm.$nextTick();

			// English and Spanish language blocks
			const blocks = wrapper.findAllComponents( { name: 'wl-about-language-block' } );
			expect( blocks.length ).toBe( 1 );
			expect( blocks[ 0 ].vm.language ).toBe( 'Z1002' );
		} );
	} );
} );
