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

	const multilingualDataLanguages = {
		name: [],
		descriptions: [],
		aliases: [],
		inputs: [],
		all: []
	};

	beforeEach( () => {
		store = useMainStore();
		store.getFallbackLanguageZids = [ 'Z1003', 'Z1002' ];
		store.getMultilingualDataLanguages = multilingualDataLanguages;
		store.getLabelData = createLabelDataMock( {
			Z1002: 'English',
			Z1003: 'español',
			Z1732: 'asturianu'
		} );
		store.getUserLangZid = 'Z1002';
		store.getZFunctionInputLabels = createGettersWithFunctionsMock( [] );
		store.getZPersistentName = createGettersWithFunctionsMock( undefined );
		store.getZPersistentDescription = createGettersWithFunctionsMock( undefined );
		store.getZPersistentAlias = createGettersWithFunctionsMock( undefined );
		store.isDirty = false;
		store.isUserLoggedIn = true;
		store.isCreateNewPage = true;
		// pageTitle mixin getters:
		store.getLanguageIsoCodeOfZLang = createGettersWithFunctionsMock( 'en' );
		store.getZObjectByKeyPath = createGettersWithFunctionsMock();
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
			it( 'renders user language block: only name in user language', async () => {
				multilingualDataLanguages.name = [ 'Z1002' ];
				multilingualDataLanguages.all = [ 'Z1002' ];
				store.getZPersistentName = createGettersWithFunctionsMock( {
					keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
					value: 'Some name'
				} );

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
					keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
					value: 'Some name'
				} );
			} );

			it( 'renders user language block: name, description and aliases in user language', async () => {
				multilingualDataLanguages.name = [ 'Z1002' ];
				multilingualDataLanguages.description = [ 'Z1002' ];
				multilingualDataLanguages.aliases = [ 'Z1002' ];
				multilingualDataLanguages.all = [ 'Z1002' ];

				store.getZPersistentName = createGettersWithFunctionsMock( {
					keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
					value: 'Some name'
				} );

				store.getZPersistentDescription = createGettersWithFunctionsMock( {
					keyPath: 'main.Z2K5.Z12K1.1.Z11K2.Z6K1',
					value: 'Some description'
				} );

				store.getZPersistentAlias = createGettersWithFunctionsMock( {
					keyPath: 'main.Z2K4.Z32K1.1.Z31K2',
					value: [ 'alias one', 'alias two' ]
				} );

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
					keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
					value: 'Some name'
				} );
				expect( languageBlock.vm.viewData.description ).toEqual( {
					keyPath: 'main.Z2K5.Z12K1.1.Z11K2.Z6K1',
					value: 'Some description'
				} );
				expect( languageBlock.vm.viewData.aliases ).toEqual( {
					keyPath: 'main.Z2K4.Z32K1.1.Z31K2',
					value: [ 'alias one', 'alias two' ]
				} );
			} );
		} );

		describe( 'Multilingual data available in fallback languages', () => {
			beforeEach( () => {
				// User language: Asturian, Fallback chain: [ Asturian, Spanish, English ]
				store.getFallbackLanguageZids = [ 'Z1732', 'Z1003', 'Z1002' ];
				store.getUserLangZid = 'Z1732';
				multilingualDataLanguages.name = [ 'Z1002' ];
				multilingualDataLanguages.all = [ 'Z1002' ];

				// Return name for fallback but not for userlang
				store.getZPersistentName = ( lang ) => {
					const names = {
						Z1002: { keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1', value: 'Some name' }
					};
					return names[ lang ];
				};
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
					keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
					value: 'Some name'
				} );
			} );
		} );

		describe( 'Multilingual data for functions available in fallback languages', () => {
			beforeEach( () => {
				// User language: Asturian, Fallback chain: [ Asturian, Spanish, English ]
				store.getFallbackLanguageZids = [ 'Z1732', 'Z1003', 'Z1002' ];
				store.getUserLangZid = 'Z1732';

				multilingualDataLanguages.all = [ 'Z1002', 'Z1003' ];
				// Name available in English
				multilingualDataLanguages.name = [ 'Z1002' ];
				store.getZPersistentName = ( lang ) => {
					const names = {
						Z1002: { keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1', value: 'Some name' }
					};
					return names[ lang ];
				};
				// Input labels available in Spanish
				multilingualDataLanguages.inputs = [ 'Z1003' ];
				store.getZFunctionInputLabels = ( lang ) => {
					const defaultValues = [
						{ value: '', key: 'Z10000K1' },
						{ value: '', key: 'Z10000K2' }
					];
					const labels = {
						Z1003: [ {
							keyPath: 'main.Z2K2.Z8K1.1.Z17K3.Z12K1.1.Z11K2',
							value: 'first string',
							key: 'Z10000K1'
						}, {
							keyPath: 'main.Z2K2.Z8K1.2.Z17K3.Z12K1.1.Z11K2',
							value: 'second string',
							key: 'Z10000K2'
						} ]
					};
					return labels[ lang ] || defaultValues;
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
					keyPath: undefined,
					value: ''
				} );
				expect( uselangBlock.vm.viewData.inputs ).toEqual( [
					{ value: '', key: 'Z10000K1' },
					{ value: '', key: 'Z10000K2' }
				] );

				// Fallback language 1: Spanish, available input labels
				expect( blocks[ 1 ].attributes( 'open' ) ).not.toBeDefined();
				expect( blocks[ 1 ].find( 'summary' ).text() ).toContain( 'español' );
				expect( blocks[ 1 ].find( 'summary' ).text() ).toContain( 'Untitled' );

				const fallbackBlock1 = blocks[ 1 ].findComponent( { name: 'wl-about-language-block' } );
				expect( fallbackBlock1.exists() ).toBe( true );
				expect( fallbackBlock1.vm.language ).toBe( 'Z1003' );
				expect( fallbackBlock1.vm.viewData.name ).toEqual( {
					keyPath: undefined,
					value: ''
				} );
				expect( fallbackBlock1.vm.viewData.inputs ).toEqual( [ {
					keyPath: 'main.Z2K2.Z8K1.1.Z17K3.Z12K1.1.Z11K2',
					value: 'first string',
					key: 'Z10000K1'
				}, {
					keyPath: 'main.Z2K2.Z8K1.2.Z17K3.Z12K1.1.Z11K2',
					value: 'second string',
					key: 'Z10000K2'
				} ] );

				// Fallback language 2: English, available title
				expect( blocks[ 2 ].attributes( 'open' ) ).not.toBeDefined();
				expect( blocks[ 2 ].find( 'summary' ).text() ).toContain( 'English' );
				expect( blocks[ 2 ].find( 'summary' ).text() ).toContain( 'Some name' );

				const fallbackBlock2 = blocks[ 2 ].findComponent( { name: 'wl-about-language-block' } );
				expect( fallbackBlock2.exists() ).toBe( true );
				expect( fallbackBlock2.vm.language ).toBe( 'Z1002' );
				expect( fallbackBlock2.vm.viewData.name ).toEqual( {
					keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
					value: 'Some name'
				} );
				expect( fallbackBlock2.vm.viewData.inputs ).toEqual( [
					{ value: '', key: 'Z10000K1' },
					{ value: '', key: 'Z10000K2' }
				] );
			} );
		} );

		describe( 'Quick edit', () => {
			beforeEach( () => {
				multilingualDataLanguages.name = [ 'Z1002' ];
				multilingualDataLanguages.all = [ 'Z1002' ];
				store.getZPersistentName = createGettersWithFunctionsMock( {
					keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
					value: 'Some name'
				} );
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
					name: {
						keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
						value: 'Some name'
					},
					description: { value: '' },
					aliases: { value: [] },
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
			multilingualDataLanguages.name = [ 'Z1002' ];
			multilingualDataLanguages.all = [ 'Z1002' ];
			store.getZPersistentName = createGettersWithFunctionsMock( {
				keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
				value: 'Some name'
			} );
		} );

		it( 'renders all blocks in edit mode', async () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
			} );

			await wrapper.vm.$nextTick();

			// No edit buttons in the accordion components:
			const accordions = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			expect( accordions.length ).toBe( 3 );
			expect( accordions[ 0 ].vm.actionIcon ).toBeFalsy();
			expect( accordions[ 1 ].vm.actionIcon ).toBeFalsy();
			expect( accordions[ 2 ].vm.actionIcon ).toBeFalsy();

			// All language blocks set to edit:
			const blocks = wrapper.findAllComponents( { name: 'wl-about-language-block' } );
			expect( blocks.length ).toBe( 3 );
			expect( blocks[ 0 ].vm.edit ).toBe( true );
			expect( blocks[ 1 ].vm.edit ).toBe( true );
			expect( blocks[ 2 ].vm.edit ).toBe( true );

			// All edit data is initialized with a copy of current persisted state
			expect( blocks[ 0 ].vm.editData ).toEqual( wrapper.vm.displayData[ 0 ].viewData );
			expect( blocks[ 1 ].vm.editData ).toEqual( wrapper.vm.displayData[ 1 ].viewData );
			expect( blocks[ 2 ].vm.editData ).toEqual( wrapper.vm.displayData[ 2 ].viewData );
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
			store.getZFunctionInputLabels = createGettersWithFunctionsMock( [
				{ value: '', key: 'Z10000K1' },
				{ value: '', key: 'Z10000K2' }
			] );

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
			expect( wrapper.vm.persistInputLabel ).toHaveBeenCalledWith( undefined, 1, 'New input label', 'Z1002' );
		} );

		describe( 'Persist multilingual data', () => {
			it( 'calls persist monolingual string with name changes', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();

				wrapper.vm.persistName( 'item.key.path', 'New name', 'Z1002' );

				expect( store.setDirty ).toHaveBeenCalledWith( true );
				expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
					parentKeyPath: [ 'main', 'Z2K3', 'Z12K1' ],
					itemKeyPath: 'item.key.path',
					value: 'New name',
					lang: 'Z1002'
				} );
			} );

			it( 'calls persist monolingual string with description changes', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();

				wrapper.vm.persistDescription( 'item.key.path', 'New description', 'Z1002' );

				expect( store.setDirty ).toHaveBeenCalledWith( true );
				expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
					parentKeyPath: [ 'main', 'Z2K5', 'Z12K1' ],
					itemKeyPath: 'item.key.path',
					value: 'New description',
					lang: 'Z1002'
				} );
			} );

			it( 'calls persist monolingual string with input label changes', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();

				wrapper.vm.persistInputLabel( 'item.key.path', 1, 'New input label', 'Z1002' );

				expect( store.setDirty ).toHaveBeenCalledWith( true );
				expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
					parentKeyPath: [ 'main', 'Z2K2', 'Z8K1', 1, 'Z17K3', 'Z12K1' ],
					itemKeyPath: 'item.key.path',
					value: 'New input label',
					lang: 'Z1002'
				} );
			} );

			it( 'calls persist monolingual stringset with alias changes', async () => {
				const wrapper = shallowMount( About, {
					props: { edit: true, type: 'Z8' },
					global: { stubs: { WlWidgetBase: false, CdxAccordion: false } }
				} );
				await wrapper.vm.$nextTick();

				wrapper.vm.persistAlias( 'item.key.path', [ 'New alias' ], 'Z1002' );

				expect( store.setDirty ).toHaveBeenCalledWith( true );
				expect( store.setZMonolingualStringset ).toHaveBeenCalledWith( {
					parentKeyPath: [ 'main', 'Z2K4', 'Z32K1' ],
					itemKeyPath: 'item.key.path',
					value: [ 'New alias' ],
					lang: 'Z1002'
				} );
			} );
		} );
	} );

	describe( 'Add a new language', () => {
		beforeEach( () => {
			multilingualDataLanguages.name = [ 'Z1002' ];
			multilingualDataLanguages.all = [ 'Z1002' ];
			store.getZPersistentName = createGettersWithFunctionsMock( {
				keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1',
				value: 'Some name'
			} );
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
				name: { keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1', value: 'Some name' },
				description: { value: '' },
				aliases: { value: [] },
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
