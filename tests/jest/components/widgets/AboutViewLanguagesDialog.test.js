/*!
 * WikiLambda unit test suite for About View Languages Dialog
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { config, mount } = require( '@vue/test-utils' ),
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	AboutViewLanguagesDialog = require( '../../../../resources/ext.wikilambda.app/components/widgets/AboutViewLanguagesDialog.vue' );

// Ignore all "teleport" behavior for the purpose of testing Dialog;
// see https://test-utils.vuejs.org/guide/advanced/teleport.html
config.global.stubs = {
	teleport: true
};

describe( 'AboutViewLanguagesDialog', () => {

	const langs = {
		en: { langIsoCode: 'en', langZid: 'Z1002', rowId: 0 },
		es: { langIsoCode: 'es', langZid: 'Z1003', rowId: 1 },
		eu: { langIsoCode: 'eu', langZid: 'Z1314', rowId: 2 },
		qu: { langIsoCode: 'qu', langZid: 'Z1678', rowId: 3 },
		it: { langIsoCode: 'it', langZid: 'Z1787', rowId: 4 },
		hr: { langIsoCode: 'hr', langZid: 'Z1272', rowId: 5 },
		te: { langIsoCode: 'te', langZid: 'Z1429', rowId: 6 }
	};

	let getters,
		actions;
	const lookupMock = jest.fn( () => [] );

	beforeEach( () => {
		getters = Object.assign( getters || {}, {
			getMetadataLanguages: createGettersWithFunctionsMock( [ langs.en.langZid, langs.es.langZid ] ),
			getZPersistentName: () => ( langZid ) => {
				const names = {
					[ langs.en.langZid ]: langs.en,
					[ langs.es.langZid ]: langs.es
				};
				return names[ langZid ];
			},
			getZMonolingualTextValue: () => ( rowId ) => rowId === 0 ? 'name' : 'nombre',
			getLabelData: createLabelDataMock( {
				[ langs.en.langZid ]: 'English',
				[ langs.es.langZid ]: 'español'
			} )
		} );

		actions = {
			fetchZids: jest.fn(),
			lookupZObjectLabels: lookupMock
		};

		global.store.hotUpdate( { getters: getters, actions: actions } );
	} );

	describe( 'From 2 to 5 languages available', () => {
		it( 'renders without errors', () => {
			const wrapper = mount( AboutViewLanguagesDialog, { props: {
				open: true,
				canEdit: true
			} } );

			expect( wrapper.find( '.ext-wikilambda-about-language-list' ).exists() ).toBe( true );
		} );

		it( 'renders without language search box', () => {
			const wrapper = mount( AboutViewLanguagesDialog, { props: {
				open: true,
				canEdit: true
			} } );
			expect( wrapper.find( '.ext-wikilambda-about-language-list-search' ).exists() ).toBe( false );
		} );

		it( 'renders all available languages', () => {
			const wrapper = mount( AboutViewLanguagesDialog, { props: {
				open: true,
				canEdit: true
			} } );
			const items = wrapper.findAll( '.ext-wikilambda-about-language-item' );
			expect( items ).toHaveLength( 2 );
		} );

		it( 'renders enabled add language button', () => {
			const wrapper = mount( AboutViewLanguagesDialog, { props: {
				open: true,
				canEdit: true
			} } );
			// ASSERT: Default action is disabled
			const addLanguage = wrapper.find( '.cdx-dialog__footer__default-action' );
			expect( addLanguage.attributes( 'disabled' ) ).not.toBeDefined();
		} );
	} );

	describe( 'More than 5 languages available', () => {
		beforeEach( () => {
			// en, es, eu and qu have name, the rest don't
			getters = Object.assign( getters, {
				getMetadataLanguages: createGettersWithFunctionsMock( [
					langs.en.langZid,
					langs.es.langZid,
					langs.eu.langZid,
					langs.qu.langZid,
					langs.it.langZid,
					langs.hr.langZid,
					langs.te.langZid
				] ),
				getZPersistentName: () => ( langZid ) => {
					const names = {
						[ langs.en.langZid ]: langs.en,
						[ langs.es.langZid ]: langs.es,
						[ langs.eu.langZid ]: langs.eu,
						[ langs.qu.langZid ]: langs.qu
					};
					return names[ langZid ];
				},
				getZMonolingualTextValue: () => ( rowId ) => {
					const names = [ 'Name', 'Nombre', 'Izena', 'Suti' ];
					return names[ rowId ];
				},
				getLabelData: createLabelDataMock( {
					[ langs.en.langZid ]: 'English',
					[ langs.es.langZid ]: 'español',
					[ langs.eu.langZid ]: 'euskara',
					[ langs.qu.langZid ]: 'Quechua',
					[ langs.it.langZid ]: 'Italian',
					[ langs.hr.langZid ]: 'Croatian',
					[ langs.te.langZid ]: 'Telugu'
				} )
			} );

			global.store.hotUpdate( { getters: getters, actions: actions } );
		} );

		it( 'renders without errors', () => {
			const wrapper = mount( AboutViewLanguagesDialog, { props: {
				open: true,
				canEdit: true
			} } );
			expect( wrapper.find( '.ext-wikilambda-about-language-list' ).exists() ).toBe( true );
		} );

		it( 'renders with language search box', () => {
			const wrapper = mount( AboutViewLanguagesDialog, { props: {
				open: true,
				canEdit: true
			} } );
			expect( wrapper.find( '.ext-wikilambda-about-language-list-search' ).exists() ).toBe( true );
		} );

		it( 'renders all available languages', () => {
			const wrapper = mount( AboutViewLanguagesDialog, { props: {
				open: true,
				canEdit: true
			} } );
			const items = wrapper.findAll( '.ext-wikilambda-about-language-item' );
			expect( items ).toHaveLength( 7 );
		} );

		it( 'renders items with their name or untitled', () => {
			const wrapper = mount( AboutViewLanguagesDialog, { props: {
				open: true,
				canEdit: true
			} } );
			const items = wrapper.findAll( '.ext-wikilambda-about-language-item' );

			const basque = items[ 2 ];
			const telugu = items[ 6 ];

			// ASSERT: languages with set name show the correct name
			expect( basque.find( '.ext-wikilambda-about-language-item-title' ).text() ).toBe( 'euskara' );
			expect( basque.find( '.ext-wikilambda-about-language-item-field' ).text() ).toBe( 'Izena' );
			expect( basque.find( '.ext-wikilambda-about-language-item-untitled' ).exists() ).toBe( false );

			// ASSERT: languages with unset name show untitled string and class
			expect( telugu.find( '.ext-wikilambda-about-language-item-title' ).text() ).toBe( 'Telugu' );
			expect( telugu.find( '.ext-wikilambda-about-language-item-field' ).text() ).toBe( 'Untitled' );
			expect( telugu.find( '.ext-wikilambda-about-language-item-untitled' ).exists() ).toBe( true );
		} );

		it( 'emits change-selected-language and open-edit-language event when clicking on an item', () => {
			const wrapper = mount( AboutViewLanguagesDialog, { props: {
				open: true,
				canEdit: true
			} } );
			const items = wrapper.findAll( '.ext-wikilambda-about-language-item' );

			// ACT: click on quechua item
			const quechua = items[ 3 ];
			quechua.trigger( 'click' );

			// ASSERT: event open-edit-language is emitted with the right data
			expect( wrapper.emitted( 'change-selected-language' ) ).toBeTruthy();
			expect( wrapper.emitted( 'open-edit-language' ) ).toBeTruthy();
			expect( wrapper.emitted() ).toHaveProperty( 'change-selected-language', [ [ 'Z1678' ] ] );
		} );
	} );

	describe( 'No edit rights', () => {
		it( 'renders without errors', () => {
			const wrapper = mount( AboutViewLanguagesDialog, { props: {
				open: true,
				canEdit: false
			} } );
			expect( wrapper.find( '.ext-wikilambda-about-language-list' ).exists() ).toBe( true );
		} );

		it( 'renders disabled add language button', () => {
			const wrapper = mount( AboutViewLanguagesDialog, { props: {
				open: true,
				canEdit: false
			} } );
			// ASSERT: Default action is disabled
			const addLanguage = wrapper.find( '.cdx-dialog__footer__default-action' );
			expect( addLanguage.attributes( 'disabled' ) ).toBeDefined();
		} );
	} );
} );
