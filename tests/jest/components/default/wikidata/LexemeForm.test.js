/*!
 * WikiLambda unit test suite for the default Wikidata Lexeme form component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' ),
	{ createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' ),
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' ),
	WikidataLexemeForm = require( '../../../../../resources/ext.wikilambda.app/components/default-view-types/wikidata/LexemeForm.vue' );

const dataIcons = () => ( {
	icons: {
		cdxIconLogoWikidata: 'wikidata',
		cdxIconLinkExternal: 'link'
	}
} );
const lexemeFormId = 'L333333-F5';
const lexemeFormLabel = 'turtled';
const [ lexemeId, formId ] = lexemeFormId.split( '-' );
const lexemeFormData = {
	id: 'L333333-F5',
	representations: {
		en: { language: 'en', value: 'turtled' }
	},
	grammaticalFeatures: [ 'Q1230649' ],
	claims: {}
};

describe( 'WikidataLexemeForm', () => {
	let store;
	beforeEach( () => {
		store = useMainStore();
		store.getLexemeFormData = createGettersWithFunctionsMock();
		store.getLexemeFormIdRow = createGettersWithFunctionsMock( { id: 1 } );
		store.getZStringTerminalValue = createGettersWithFunctionsMock( lexemeFormId );
		store.getUserLangCode = 'en';
	} );

	describe( 'in view mode', () => {
		it( 'renders wikidata lexeme form reference without errors', () => {
			const wrapper = shallowMount( WikidataLexemeForm, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM
				},
				data: dataIcons
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-form' ).exists() ).toBe( true );
		} );

		it( 'renders wikidata lexeme form fetch function without errors', () => {
			const wrapper = shallowMount( WikidataLexemeForm, {
				props: {
					edit: false,
					type: Constants.Z_FUNCTION_CALL
				},
				data: dataIcons
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-form' ).exists() ).toBe( true );
		} );

		it( 'renders the lexeme form external link if data is available', () => {
			store.getLexemeFormData = createGettersWithFunctionsMock( lexemeFormData );

			const wrapper = shallowMount( WikidataLexemeForm, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM
				},
				data: dataIcons
			} );
			const link = wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-form__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `Lexeme:${ lexemeId }#${ formId }` );
			expect( link.text() ).toBe( lexemeFormLabel );
		} );

		it( 'renders the lexeme external link if data is not available', () => {
			const wrapper = shallowMount( WikidataLexemeForm, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM
				},
				data: dataIcons
			} );
			const link = wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-form__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `Lexeme:${ lexemeId }#${ formId }` );
			expect( link.text() ).toBe( lexemeFormId );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( WikidataLexemeForm, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM
				},
				data: dataIcons
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-form' ).exists() ).toBe( true );
		} );

		it( 'renders blank wikidata entity selector', () => {
			const wrapper = shallowMount( WikidataLexemeForm, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM
				},
				data: dataIcons
			} );
			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
		} );

		it( 'renders wikidata entity selector', () => {
			const wrapper = shallowMount( WikidataLexemeForm, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM
				},
				data: dataIcons
			} );
			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
		} );

		it( 'initializes wikidata entity selector', async () => {
			store.getLexemeFormData = createGettersWithFunctionsMock( lexemeFormData );

			const wrapper = shallowMount( WikidataLexemeForm, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM
				},
				data: dataIcons
			} );
			await wrapper.vm.$nextTick();

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.vm.entityId ).toBe( lexemeFormId );
			expect( lookup.vm.entityLabel ).toBe( lexemeFormLabel );
			expect( store.fetchLexemes ).toHaveBeenCalledWith( { ids: [ lexemeId ] } );
		} );

		it( 'initializes wikidata entity selector input value with delayed fetch response', async () => {
			const wrapper = shallowMount( WikidataLexemeForm, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM
				},
				data: dataIcons
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.vm.entityId ).toBe( lexemeFormId );
			expect( lookup.vm.entityLabel ).toBe( lexemeFormId );

			store.getLexemeFormData = createGettersWithFunctionsMock( lexemeFormData );

			await wrapper.vm.$nextTick();

			expect( lookup.vm.entityId ).toBe( lexemeFormId );
			expect( lookup.vm.entityLabel ).toBe( lexemeFormLabel );
			expect( store.fetchLexemes ).toHaveBeenCalledWith( { ids: [ lexemeId ] } );
		} );

		it( 'sets lexeme form reference ID when selecting option from the menu', async () => {
			const wrapper = shallowMount( WikidataLexemeForm, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM
				},
				data: dataIcons
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', lexemeFormId );

			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: lexemeFormId,
				keyPath: [
					Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );

		it( 'sets lexeme form fetch function ID when selecting option from the menu', async () => {
			const wrapper = shallowMount( WikidataLexemeForm, {
				props: {
					edit: true,
					type: Constants.Z_FUNCTION_CALL
				},
				data: dataIcons
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', lexemeFormId );

			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: lexemeFormId,
				keyPath: [
					Constants.Z_WIKIDATA_FETCH_LEXEME_FORM_ID,
					Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );
	} );
} );
