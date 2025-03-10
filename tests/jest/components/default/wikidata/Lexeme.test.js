/*!
 * WikiLambda unit test suite for the default Wikidata Lexeme component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const WikidataLexeme = require( '../../../../../resources/ext.wikilambda.app/components/default-view-types/wikidata/Lexeme.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );

const lexemeId = 'L333333';
const lexemeLabel = 'turtle';
const lexemeData = {
	title: 'Lexeme:L333333',
	lemmas: {
		en: { language: 'en', value: 'turtle' }
	},
	forms: []
};

describe( 'WikidataLexeme', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getLexemeData = createGettersWithFunctionsMock();
		store.getLexemeIdRow = createGettersWithFunctionsMock( { id: 1 } );
		store.getLexemeId = createGettersWithFunctionsMock( lexemeId );
		store.getZStringTerminalValue = createGettersWithFunctionsMock( lexemeId );
		store.getUserLangCode = 'en';
	} );

	describe( 'in view mode', () => {
		it( 'renders wikidata lexeme reference without errors', () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme' ).exists() ).toBe( true );
		} );

		it( 'renders wikidata lexeme fetch function without errors', () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: false,
					type: Constants.Z_FUNCTION_CALL
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme' ).exists() ).toBe( true );
		} );

		it( 'renders the lexeme external link if data is available', () => {
			store.getLexemeData = createGettersWithFunctionsMock( lexemeData );

			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				}
			} );
			const link = wrapper.find( '.ext-wikilambda-app-wikidata-lexeme__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `Lexeme:${ lexemeId }` );
			expect( link.text() ).toBe( lexemeLabel );
		} );

		it( 'renders the lexeme external link if data is not available', () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				}
			} );
			const link = wrapper.find( '.ext-wikilambda-app-wikidata-lexeme__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `Lexeme:${ lexemeId }` );
			expect( link.text() ).toBe( lexemeId );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme' ).exists() ).toBe( true );
		} );

		it( 'renders blank wikidata entity selector', () => {
			store.getZStringTerminalValue = createGettersWithFunctionsMock();

			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				}
			} );
			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
		} );

		it( 'renders wikidata entity selector', () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				}
			} );
			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
		} );

		it( 'initializes wikidata entity selector', async () => {
			store.getLexemeData = createGettersWithFunctionsMock( lexemeData );

			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				}
			} );
			await wrapper.vm.$nextTick();

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.vm.entityId ).toBe( lexemeId );
			expect( lookup.vm.entityLabel ).toBe( lexemeLabel );
			expect( store.fetchLexemes ).toHaveBeenCalledWith( { ids: [ lexemeId ] } );
		} );

		it( 'initializes wikidata entity selector input value with delayed fetch response', async () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				}
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.vm.entityId ).toBe( lexemeId );
			expect( lookup.vm.entityLabel ).toBe( lexemeId );

			store.getLexemeData = createGettersWithFunctionsMock( lexemeData );

			await wrapper.vm.$nextTick();

			expect( lookup.vm.entityId ).toBe( lexemeId );
			expect( lookup.vm.entityLabel ).toBe( lexemeLabel );
			expect( store.fetchLexemes ).toHaveBeenCalledWith( { ids: [ lexemeId ] } );
		} );

		it( 'sets lexeme reference ID when selecting option from the menu', async () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				}
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', lexemeId );

			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: lexemeId,
				keyPath: [
					Constants.Z_WIKIDATA_REFERENCE_LEXEME_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );

		it( 'sets lexeme fetch function ID when selecting option from the menu', async () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_FUNCTION_CALL
				}
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', lexemeId );

			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: lexemeId,
				keyPath: [
					Constants.Z_WIKIDATA_FETCH_LEXEME_ID,
					Constants.Z_WIKIDATA_REFERENCE_LEXEME_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );
	} );
} );
