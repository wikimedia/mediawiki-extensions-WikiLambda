/*!
 * WikiLambda unit test suite for the default Wikidata Lexeme form component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const WikidataLexemeForm = require( '../../../../../resources/ext.wikilambda.app/components/types/wikidata/LexemeForm.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );

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

// General configuration: wikidata reference
const keyPath = 'main.Z2K2';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6094' },
	Z6094K1: { Z1K1: 'Z6', Z6K1: 'L333333-F5' }
};

// Fetch form
const objectValueFetch = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6824' },
	Z6824K1: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6094' },
		Z6094K1: { Z1K1: 'Z6', Z6K1: 'L333333-F5' }
	}
};

// Non terminal ID
const objectValueNonTerminal = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6824' },
	Z6824K1: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
		Z18K1: { Z1K1: 'Z6', Z6K1: 'Z10000K1' }
	}
};

describe( 'WikidataLexemeForm', () => {
	let store;

	/**
	 * Helper function to render WikidataLexemeForm component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderWikidataLexemeForm( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false,
			type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM
		};
		return shallowMount( WikidataLexemeForm, { props: { ...defaultProps, ...props }, ...options } );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getLexemeFormData = createGettersWithFunctionsMock();
		store.getUserLangCode = 'en';
	} );

	describe( 'in view mode', () => {
		it( 'renders wikidata lexeme form reference without errors', () => {
			const wrapper = renderWikidataLexemeForm();
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-form' ).exists() ).toBe( true );
		} );

		it( 'falls back to z-object-to-string when entity ID is not terminal', () => {
			const wrapper = renderWikidataLexemeForm( {
				objectValue: objectValueNonTerminal
			} );
			expect( wrapper.findComponent( { name: 'wl-z-object-to-string' } ).exists() ).toBe( true );
		} );

		it( 'renders wikidata lexeme form fetch function without errors', () => {
			const wrapper = renderWikidataLexemeForm( {
				objectValue: objectValueFetch,
				type: Constants.Z_FUNCTION_CALL
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-form' ).exists() ).toBe( true );
		} );

		it( 'renders the lexeme form external link if data is available', () => {
			store.getLexemeFormData = createGettersWithFunctionsMock( lexemeFormData );

			const wrapper = renderWikidataLexemeForm();
			const link = wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-form__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `Lexeme:${ lexemeId }#${ formId }` );
			expect( link.text() ).toBe( lexemeFormLabel );
		} );

		it( 'renders the lexeme external link if data is not available', () => {
			const wrapper = renderWikidataLexemeForm();
			const link = wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-form__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `Lexeme:${ lexemeId }#${ formId }` );
			expect( link.text() ).toBe( lexemeFormId );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderWikidataLexemeForm( {
				edit: true
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-form' ).exists() ).toBe( true );
		} );

		it( 'falls back to z-object-to-string when entity ID is not terminal', () => {
			const wrapper = renderWikidataLexemeForm( {
				edit: true,
				objectValue: objectValueNonTerminal
			} );
			expect( wrapper.findComponent( { name: 'wl-z-object-to-string' } ).exists() ).toBe( true );
		} );

		it( 'initializes wikidata entity selector', async () => {
			store.getLexemeFormData = createGettersWithFunctionsMock( lexemeFormData );

			const wrapper = renderWikidataLexemeForm( {
				edit: true
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.vm.entityId ).toBe( lexemeFormId );
			expect( lookup.vm.entityLabel ).toBe( lexemeFormLabel );
			expect( store.fetchLexemes ).toHaveBeenCalledWith( { ids: [ lexemeId ] } );
		} );

		it( 'sets lexeme form reference ID when selecting option from the menu', async () => {
			const wrapper = renderWikidataLexemeForm( {
				edit: true
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', lexemeFormId );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: lexemeFormId,
				keyPath: [
					Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );

		it( 'sets lexeme form fetch function ID when selecting option from the menu', async () => {
			const wrapper = renderWikidataLexemeForm( {
				objectValue: objectValueFetch,
				edit: true,
				type: Constants.Z_FUNCTION_CALL
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', lexemeFormId );

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
