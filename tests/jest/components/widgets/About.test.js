/*!
 * WikiLambda unit test suite for About Widget.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	About = require( '../../../../resources/ext.wikilambda.edit/components/widgets/About.vue' ),
	AboutEditMetadataDialog = require( '../../../../resources/ext.wikilambda.edit/components/widgets/AboutEditMetadataDialog.vue' ),
	AboutViewLanguagesDialog = require( '../../../../resources/ext.wikilambda.edit/components/widgets/AboutViewLanguagesDialog.vue' );

describe( 'About', () => {
	var getters,
		actions;

	beforeEach( () => {
		getters = {
			getRowByKeyPath: createGettersWithFunctionsMock( undefined ),
			getMetadataLanguages: createGettersWithFunctionsMock( [] ),
			getZMonolingualTextValue: createGettersWithFunctionsMock( '' ),
			getZMonolingualStringsetValues: createGettersWithFunctionsMock( [] ),
			getZPersistentAliasLangs: createGettersWithFunctionsMock( [] ),
			getZPersistentDescriptionLangs: createGettersWithFunctionsMock( [] ),
			getZPersistentNameLangs: createGettersWithFunctionsMock( [] ),
			getZPersistentAlias: createGettersWithFunctionsMock( undefined ),
			getZPersistentDescription: createGettersWithFunctionsMock( undefined ),
			getZPersistentName: createGettersWithFunctionsMock( undefined ),
			getErrors: createGettersWithFunctionsMock( {} ),
			getUserZlangZID: jest.fn().mockReturnValue( 'Z1002' ),
			getLabel: () => ( key ) => {
				const labels = {
					Z2K3: 'name',
					Z2K4: 'also known as',
					Z2K5: 'description',
					Z1002: 'English',
					Z11K1: 'language'
				};
				return labels[ key ] || 'label';
			}
		};

		actions = { fetchZids: jest.fn() };
		global.store.hotUpdate( { getters: getters, actions: actions } );
	} );

	describe( 'Zero-blank state', () => {
		it( 'renders without errors', () => {
			const wrapper = mount( About, { props: { edit: true } } );
			expect( wrapper.find( '.ext-wikilambda-about' ).exists() ).toBe( true );
		} );

		it( 'renders name block with empty placeholder', () => {
			const wrapper = mount( About, { props: { edit: true } } );
			const nameBlock = wrapper.find( '.ext-wikilambda-about-name' );
			expect( nameBlock.find( '.ext-wikilambda-about-title' ).exists() ).toBe( true );
			expect( nameBlock.find( '.ext-wikilambda-about-title' ).text() ).toBe( 'name' );
			expect( nameBlock.find( '.ext-wikilambda-about-value' ).exists() ).toBe( true );
			expect( nameBlock.find( '.ext-wikilambda-about-value' ).text() ).toBe( 'Untitled' );
			expect( nameBlock.find( '.ext-wikilambda-about-name-untitled' ).exists() ).toBe( true );
			expect( nameBlock.find( '.ext-wikilambda-about-name-untitled' ).text() ).toBe( 'Untitled' );
		} );

		it( 'renders edit button in the header', () => {
			const wrapper = mount( About, { props: { edit: true } } );
			const header = wrapper.find( '.ext-wikilambda-widget-base-header' );
			expect( header.findComponent( { name: 'cdx-button' } ).exists() ).toBe( true );
		} );

		it( 'does not render view languages button', () => {
			const wrapper = mount( About, { props: { edit: true } } );
			expect( wrapper.find( '.ext-wikilambda-content-buttons' ).exists() ).toBe( false );
		} );

		it( 'opens empty metadata dialog when clicking edit', async () => {
			const wrapper = mount( About, {
				props: {
					edit: true
				}
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
	} );

	describe( 'Only user language available', () => {
		beforeEach( () => {
			const name = { langIsoCode: 'en', langZid: 'Z1002', rowId: 1 };
			const description = { langIsoCode: 'en', langZid: 'Z1002', rowId: 2 };
			const alias = { langIsoCode: 'en', langZid: 'Z1002', rowId: 3 };
			const aliasValues = [ { rowId: 4, value: 'one' }, { rowId: 5, value: 'two' } ];

			getters = $.extend( getters, {
				getMetadataLanguages: createGettersWithFunctionsMock( [ 'Z1002' ] ),
				getZPersistentAliasLangs: createGettersWithFunctionsMock( [ alias ] ),
				getZPersistentDescriptionLangs: createGettersWithFunctionsMock( [ description ] ),
				getZPersistentNameLangs: createGettersWithFunctionsMock( [ name ] ),
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
			const wrapper = mount( About, { props: { edit: true } } );
			expect( wrapper.find( '.ext-wikilambda-about' ).exists() ).toBe( true );
		} );

		it( 'renders selected values', () => {
			const wrapper = mount( About, { props: { edit: true } } );

			// ASSERT: Renders name
			const nameBlock = wrapper.find( '.ext-wikilambda-about-name' );
			expect( nameBlock.find( '.ext-wikilambda-about-value' ).text() ).toBe( 'name' );

			// ASSERT: Renders description
			const descriptionBlock = wrapper.find( '.ext-wikilambda-about-description' );
			expect( descriptionBlock.find( '.ext-wikilambda-about-value' ).text() ).toBe( 'some description' );

			// ASSERT: Renders comma-separated aliases
			const aliasBlock = wrapper.find( '.ext-wikilambda-about-aliases' );
			expect( aliasBlock.find( '.ext-wikilambda-about-value' ).text() ).toContain( 'one,' );
			expect( aliasBlock.find( '.ext-wikilambda-about-value' ).text() ).toContain( 'two' );
			expect( aliasBlock.find( '.ext-wikilambda-about-value' ).html() ).toContain( '&nbsp;' );
		} );

		it( 'does not render view languages button', () => {
			const wrapper = mount( About, { props: { edit: true } } );
			expect( wrapper.find( '.ext-wikilambda-content-buttons' ).exists() ).toBe( false );
		} );

		it( 'opens metadata dialog with the user language values', async () => {
			const wrapper = mount( About, {
				props: {
					edit: true
				}
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
	} );

	describe( 'From 2 to 5 languages available', () => {
		beforeEach( () => {
			const name = { langIsoCode: 'en', langZid: 'Z1003', rowId: 1 };
			const description = { langIsoCode: 'en', langZid: 'Z1002', rowId: 2 };
			const alias = { langIsoCode: 'en', langZid: 'Z1002', rowId: 3 };
			const aliasValues = [ { rowId: 4, value: 'one' }, { rowId: 5, value: 'two' } ];

			getters = $.extend( getters, {
				getMetadataLanguages: createGettersWithFunctionsMock( [ 'Z1002', 'Z1003' ] ),
				getZPersistentAliasLangs: createGettersWithFunctionsMock( [ alias ] ),
				getZPersistentDescriptionLangs: createGettersWithFunctionsMock( [ description ] ),
				getZPersistentNameLangs: createGettersWithFunctionsMock( [ name ] ),
				getZPersistentAlias: createGettersWithFunctionsMock( alias ),
				getZPersistentDescription: createGettersWithFunctionsMock( description ),
				getZPersistentName: createGettersWithFunctionsMock( name ),
				getZMonolingualStringsetValues: createGettersWithFunctionsMock( aliasValues ),
				getZMonolingualTextValue: () => ( rowId ) => {
					return rowId === 1 ? 'nombre' : 'some description';
				}
			} );

			global.store.hotUpdate( { getters: getters, actions: actions } );
		} );

		it( 'renders without errors', () => {
			const wrapper = mount( About, { props: { edit: true } } );
			expect( wrapper.find( '.ext-wikilambda-about' ).exists() ).toBe( true );
		} );

		it( 'renders selected values', () => {
			const wrapper = mount( About, { props: { edit: true } } );

			// ASSERT: Renders name in non-user language
			const nameBlock = wrapper.find( '.ext-wikilambda-about-name' );
			expect( nameBlock.find( '.ext-wikilambda-about-value' ).text() ).toBe( 'nombre' );

			// ASSERT: Renders description
			const descriptionBlock = wrapper.find( '.ext-wikilambda-about-description' );
			expect( descriptionBlock.find( '.ext-wikilambda-about-value' ).text() ).toBe( 'some description' );

			// ASSERT: Renders comma-separated aliases
			const aliasBlock = wrapper.find( '.ext-wikilambda-about-aliases' );
			expect( aliasBlock.find( '.ext-wikilambda-about-value' ).text() ).toContain( 'one,' );
			expect( aliasBlock.find( '.ext-wikilambda-about-value' ).text() ).toContain( 'two' );
			expect( aliasBlock.find( '.ext-wikilambda-about-value' ).html() ).toContain( '&nbsp;' );
		} );

		it( 'renders view languages button', () => {
			const wrapper = mount( About, {
				props: { edit: true }
			} );
			const buttons = wrapper.find( '.ext-wikilambda-content-buttons' );
			expect( buttons.exists() ).toBe( true );
			expect( buttons.find( '.cdx-button' ).text() ).toBe( '{{PLURAL:$1|$1 language|$1 languages}}' );
		} );

		it( 'opens metadata dialog when clicking header edit button', async () => {
			const wrapper = mount( About, {
				props: { edit: true }
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
				props: { edit: true }
			} );

			// ACT: Get button and trigger click
			const buttons = wrapper.find( '.ext-wikilambda-content-buttons' );
			buttons.findComponent( { name: 'cdx-button' } ).vm.$emit( 'click' );
			await wrapper.vm.$nextTick();

			// ASSERT: Languages dialog is open
			const langDialog = wrapper.findComponent( AboutViewLanguagesDialog );
			expect( langDialog.vm.open ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-about-language-list' ).exists() ).toBe( true );
		} );
	} );
} );
