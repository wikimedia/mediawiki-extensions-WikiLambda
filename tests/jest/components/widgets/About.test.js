/*!
 * WikiLambda unit test suite for About Widget.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { config, mount, shallowMount } = require( '@vue/test-utils' ),
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	About = require( '../../../../resources/ext.wikilambda.edit/components/widgets/About.vue' ),
	AboutEditMetadataDialog = require( '../../../../resources/ext.wikilambda.edit/components/widgets/AboutEditMetadataDialog.vue' ),
	AboutViewLanguagesDialog = require( '../../../../resources/ext.wikilambda.edit/components/widgets/AboutViewLanguagesDialog.vue' );

// Ignore all "teleport" behavior for the purpose of testing Dialog;
// see https://test-utils.vuejs.org/guide/advanced/teleport.html
config.global.stubs = {
	teleport: true
};

describe( 'About', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getZArgumentTypeRowId: createGettersWithFunctionsMock( undefined ),
			getZArgumentKey: createGettersWithFunctionsMock( undefined ),
			getZFunctionInputs: createGettersWithFunctionsMock( [] ),
			getZFunctionOutput: createGettersWithFunctionsMock( undefined ),
			getMetadataLanguages: createGettersWithFunctionsMock( [ 'Z1002' ] ),
			getZMonolingualTextValue: createGettersWithFunctionsMock( '' ),
			getZMonolingualStringsetValues: createGettersWithFunctionsMock( [] ),
			getZPersistentName: createGettersWithFunctionsMock( undefined ),
			getZPersistentAlias: createGettersWithFunctionsMock( undefined ),
			getZPersistentDescription: createGettersWithFunctionsMock( undefined ),
			getUserLangZid: createGetterMock( 'Z1002' ),
			isUserLoggedIn: createGetterMock( true ),
			isCreateNewPage: createGetterMock( true ),
			isDirty: createGetterMock( false ),
			getLabelData: createLabelDataMock( {
				Z2K3: 'name',
				Z2K4: 'also known as',
				Z2K5: 'description',
				Z1002: 'English',
				Z11K1: 'language',
				Z10000K1: 'first',
				Z10000K2: 'second'
			} )
		};

		actions = { fetchZids: jest.fn() };
		global.store.hotUpdate( { getters: getters, actions: actions } );
	} );

	describe( 'Blank state', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false } }
			} );
			expect( wrapper.find( '.ext-wikilambda-about' ).exists() ).toBe( true );
		} );

		it( 'renders fields block with empty placeholder', () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false } }
			} );
			const nameBlock = wrapper.find( '.ext-wikilambda-about-fields' );
			expect( nameBlock.find( '.ext-wikilambda-about-unavailable' ).exists() ).toBe( true );
			expect( nameBlock.find( '.ext-wikilambda-about-unavailable' ).text() ).toBe( 'No description or aliases provided.' );
		} );

		it( 'renders view languages button', () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false } }
			} );
			expect( wrapper.find( '.ext-wikilambda-about-button' ).exists() ).toBe( true );
		} );

		it( 'opens empty metadata dialog when clicking edit', async () => {
			const wrapper = mount( About, {
				props: { edit: true, type: 'Z6' }
			} );

			// ACT: Get header button and trigger click
			const header = wrapper.find( '.ext-wikilambda-widget-base-header' );
			header.findComponent( { name: 'cdx-button' } ).vm.$emit( 'click' );
			await wrapper.vm.$nextTick();

			// ASSERT: Metadata dialog is open
			const metadataDialog = wrapper.findComponent( AboutEditMetadataDialog );
			expect( metadataDialog.vm.open ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-about-edit-metadata' ).exists() ).toBe( true );

			// ASSERT: Language is intiialized to user language
			expect( metadataDialog.vm.forLanguage ).toBe( 'Z1002' );
		} );

		it( 'does not render function fields', () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false } }
			} );
			expect( wrapper.find( '.ext-wikilambda-about-function-fields' ).exists() ).toBe( false );
		} );
	} );

	describe( 'One or more languages available', () => {
		beforeEach( () => {
			const name = { langIsoCode: 'en', langZid: 'Z1002', rowId: 1 };
			const description = { langIsoCode: 'en', langZid: 'Z1002', rowId: 2 };
			const alias = { langIsoCode: 'en', langZid: 'Z1002', rowId: 3 };
			const aliasValues = [ { rowId: 4, value: 'one' }, { rowId: 5, value: 'two' } ];

			getters = Object.assign( getters, {
				getMetadataLanguages: createGettersWithFunctionsMock( [ 'Z1002' ] ),
				getZPersistentAliasLangs: createGettersWithFunctionsMock( [ alias ] ),
				getZPersistentDescriptionLangs: createGettersWithFunctionsMock( [ description ] ),
				getZPersistentAlias: createGettersWithFunctionsMock( alias ),
				getZPersistentDescription: createGettersWithFunctionsMock( description ),
				getZPersistentName: createGettersWithFunctionsMock( name ),
				getZMonolingualStringsetValues: createGettersWithFunctionsMock( aliasValues ),
				getZMonolingualTextValue: () => ( rowId ) => {
					return rowId === 1 ? 'name' : 'some description';
				}
			} );

			global.store.hotUpdate( { getters: getters, actions: actions } );
		} );

		it( 'renders without errors', () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false } }
			} );
			expect( wrapper.find( '.ext-wikilambda-about' ).exists() ).toBe( true );
		} );

		it( 'renders selected values', () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false } }
			} );

			// ASSERT: Renders description
			const descriptionBlock = wrapper.find( '.ext-wikilambda-about-description' );
			expect( descriptionBlock.find( '.ext-wikilambda-about-value' ).text() ).toBe( 'some description' );

			// ASSERT: Renders comma-separated aliases
			const aliasBlock = wrapper.find( '.ext-wikilambda-about-aliases' );
			const aliases = aliasBlock.findAll( '.ext-wikilambda-about-alias' );
			expect( aliases.length ).toBe( 2 );
			expect( aliases[ 0 ].text() ).toContain( 'one' );
			expect( aliases[ 1 ].text() ).toContain( 'two' );
		} );

		it( 'renders view languages button', () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false } }
			} );
			expect( wrapper.find( '.ext-wikilambda-about-button' ).exists() ).toBe( true );
		} );

		it( 'opens metadata dialog with the user language values', async () => {
			const wrapper = mount( About, {
				props: { edit: true, type: 'Z6' }
			} );

			// ACT: Get header button and trigger click
			const header = wrapper.find( '.ext-wikilambda-widget-base-header' );
			header.findComponent( { name: 'cdx-button' } ).vm.$emit( 'click' );
			await wrapper.vm.$nextTick();

			// ASSERT: Metadata dialog is open
			const metadataDialog = wrapper.findComponent( AboutEditMetadataDialog );
			expect( metadataDialog.vm.open ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-about-edit-metadata' ).exists() ).toBe( true );

			// ASSERT: Language is intiialized to user language
			expect( metadataDialog.vm.forLanguage ).toBe( 'Z1002' );
		} );

		it( 'opens view languages dialog when clicking language count button', async () => {
			const wrapper = mount( About, {
				props: { edit: true, type: 'Z6' }
			} );

			// ACT: Get button and trigger click
			const buttons = wrapper.find( '.ext-wikilambda-about-button' );
			buttons.findComponent( { name: 'cdx-button' } ).vm.$emit( 'click' );
			await wrapper.vm.$nextTick();

			// ASSERT: Languages dialog is open
			const langDialog = wrapper.findComponent( AboutViewLanguagesDialog );
			expect( langDialog.vm.open ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-about-language-list' ).exists() ).toBe( true );
		} );

		it( 'shows description but no aliases', () => {
			getters.getZPersistentAlias = createGettersWithFunctionsMock( undefined );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false } }
			} );

			// ASSERT: Renders description
			const descriptionBlock = wrapper.find( '.ext-wikilambda-about-description' );
			expect( descriptionBlock.find( '.ext-wikilambda-about-value' ).text() ).toBe( 'some description' );

			// ASSERT: Renders comma-separated aliases
			const aliasBlock = wrapper.find( '.ext-wikilambda-about-unavailable' );
			expect( aliasBlock.text() ).toBe( 'No aliases provided.' );
		} );

		it( 'shows aliases but no description', () => {
			getters.getZPersistentDescription = createGettersWithFunctionsMock( undefined );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false } }
			} );

			// ASSERT: Renders unavailable description
			const descriptionBlock = wrapper.find( '.ext-wikilambda-about-unavailable' );
			expect( descriptionBlock.text() ).toBe( 'No description provided.' );

			// ASSERT: Renders comma-separated aliases
			const aliasBlock = wrapper.find( '.ext-wikilambda-about-aliases' );
			const aliases = aliasBlock.findAll( '.ext-wikilambda-about-alias' );
			expect( aliases.length ).toBe( 2 );
			expect( aliases[ 0 ].text() ).toContain( 'one' );
			expect( aliases[ 1 ].text() ).toContain( 'two' );
		} );

		it( 'shows only first three aliases', () => {
			const aliasValues = [
				{ rowId: 4, value: 'one' },
				{ rowId: 5, value: 'two' },
				{ rowId: 6, value: 'three' },
				{ rowId: 7, value: 'four' },
				{ rowId: 8, value: 'five' }
			];
			getters.getZMonolingualStringsetValues = createGettersWithFunctionsMock( aliasValues );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false } }
			} );

			// ASSERT: Renders comma-separated aliases
			const aliasBlock = wrapper.find( '.ext-wikilambda-about-aliases' );
			const aliases = aliasBlock.findAll( '.ext-wikilambda-about-alias' );
			expect( aliases.length ).toBe( 3 );
			expect( aliases[ 0 ].text() ).toContain( 'one' );
			expect( aliases[ 1 ].text() ).toContain( 'two' );
			expect( aliases[ 2 ].text() ).toContain( 'three' );

			const aliasMore = aliasBlock.find( '.ext-wikilambda-about-aliases-more' );
			expect( aliasMore.text() ).toBe( '+2' );
		} );

		it( 'does not render function fields', () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z6' },
				global: { stubs: { WlWidgetBase: false } }
			} );
			expect( wrapper.find( '.ext-wikilambda-about-function-fields' ).exists() ).toBe( false );
		} );
	} );

	describe( 'About widget in Function View', () => {
		beforeEach( () => {
			const output = { id: 10 };
			const inputs = [ { id: 20 }, { id: 30 } ];
			getters = Object.assign( getters, {
				getZFunctionInputs: createGettersWithFunctionsMock( inputs ),
				getZFunctionOutput: createGettersWithFunctionsMock( output ),
				getZArgumentTypeRowId: () => ( id ) => {
					return id === 20 ? 21 : 31;
				},
				getZArgumentKey: () => ( id ) => {
					return id === 20 ? 'Z10000K1' : 'Z10000K2';
				}
			} );
			global.store.hotUpdate( { getters: getters, actions: actions } );
		} );

		it( 'renders without errors', () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z8' },
				global: { stubs: { WlWidgetBase: false } }
			} );
			expect( wrapper.find( '.ext-wikilambda-about' ).exists() ).toBe( true );
		} );

		it( 'renders function fields', () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z8' },
				global: { stubs: { WlWidgetBase: false } }
			} );
			expect( wrapper.find( '.ext-wikilambda-about-function-fields' ).exists() ).toBe( true );
		} );

		it( 'shows function inputs', () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z8' },
				global: { stubs: { WlWidgetBase: false } }
			} );

			const inputBlock = wrapper.find( '.ext-wikilambda-about-function-input' );
			expect( inputBlock.find( '.ext-wikilambda-about-function-field-title' ).text() ).toBe( 'Inputs' );

			const inputs = inputBlock.findAll( '.ext-wikilambda-about-function-field-value' );
			expect( inputs.length ).toBe( 2 );
			// Check labels:
			expect( inputs[ 0 ].text() ).toContain( 'first:' );
			expect( inputs[ 1 ].text() ).toContain( 'second:' );
			// Check types:
			const inputOne = inputs[ 0 ].findComponent( { name: 'wl-z-object-to-string' } );
			const inputTwo = inputs[ 1 ].findComponent( { name: 'wl-z-object-to-string' } );
			expect( inputOne.exists() ).toBe( true );
			expect( inputOne.props( 'rowId' ) ).toBe( 21 );
			expect( inputTwo.exists() ).toBe( true );
			expect( inputTwo.props( 'rowId' ) ).toBe( 31 );
		} );

		it( 'shows function output type', () => {
			const wrapper = shallowMount( About, {
				props: { edit: true, type: 'Z8' },
				global: { stubs: { WlWidgetBase: false } }
			} );

			const outputBlock = wrapper.find( '.ext-wikilambda-about-function-output' );
			expect( outputBlock.find( '.ext-wikilambda-about-function-field-title' ).text() ).toBe( 'Output' );

			const outputType = outputBlock.findComponent( { name: 'wl-z-object-to-string' } );
			expect( outputType.exists() ).toBe( true );
			expect( outputType.props( 'rowId' ) ).toBe( 10 );
		} );
	} );
} );
