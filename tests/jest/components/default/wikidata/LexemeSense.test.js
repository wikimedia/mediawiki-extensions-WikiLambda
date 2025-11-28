/*!
 * WikiLambda unit test suite for the default Wikidata Lexeme sense component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const WikidataLexemeSense = require( '../../../../../resources/ext.wikilambda.app/components/types/wikidata/LexemeSense.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../../helpers/getterHelpers.js' );

const lexemeSenseId = 'L333333-S2';
const [ lexemeId, senseId ] = lexemeSenseId.split( '-' );
// Removed unused lexemeSenseData variable

const lexemeData = {
	title: 'L333333',
	lemmas: {
		en: { language: 'en', value: 'run' }
	},
	senses: [
		{
			id: 'L333333-S1',
			glosses: {
				en: { language: 'en', value: 'to move quickly on foot' }
			}
		},
		{
			id: 'L333333-S2',
			glosses: {
				en: { language: 'en', value: 'to compete for an office or a position' }
			}
		}
	]
};

// General configuration: wikidata reference
const keyPath = 'main.Z2K2';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6096' },
	Z6096K1: { Z1K1: 'Z6', Z6K1: 'L333333-S2' }
};

// Fetch sense
const objectValueFetch = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6826' },
	Z6826K1: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6096' },
		Z6096K1: { Z1K1: 'Z6', Z6K1: 'L333333-S2' }
	}
};

// Non terminal ID
const objectValueNonTerminal = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6826' },
	Z6826K1: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
		Z18K1: { Z1K1: 'Z6', Z6K1: 'Z10000K1' }
	}
};

describe( 'WikidataLexemeSense', () => {
	let store;

	/**
	 * Helper function to render WikidataLexemeSense component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderWikidataLexemeSense( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false,
			type: Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE
		};
		return shallowMount( WikidataLexemeSense, { props: { ...defaultProps, ...props }, ...options } );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getLexemeSenseData = createGettersWithFunctionsMock();
		store.getLexemeData = createGettersWithFunctionsMock();
		store.getLexemeDataAsync = createGettersWithFunctionsMock();
		store.getLexemeSensesData = createGettersWithFunctionsMock();
		store.fetchLexemeSenses = jest.fn().mockResolvedValue();
		store.getUserLangCode = 'en';
	} );

	describe( 'in view mode', () => {
		it( 'renders wikidata lexeme sense reference without errors', () => {
			const wrapper = renderWikidataLexemeSense();
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-sense' ).exists() ).toBe( true );
		} );

		it( 'falls back to z-object-to-string when entity ID is not terminal', () => {
			const wrapper = renderWikidataLexemeSense( {
				objectValue: objectValueNonTerminal
			} );
			expect( wrapper.findComponent( { name: 'wl-z-object-to-string' } ).exists() ).toBe( true );
		} );

		it( 'renders wikidata lexeme sense fetch function without errors', () => {
			const wrapper = renderWikidataLexemeSense( {
				objectValue: objectValueFetch,
				type: Constants.Z_FUNCTION_CALL
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-sense' ).exists() ).toBe( true );
		} );

		it( 'renders the lexeme sense external link if data is available', () => {
			store.getLexemeSenseData = createGettersWithFunctionsMock( lexemeData.senses[ 1 ] );

			const wrapper = renderWikidataLexemeSense();
			const link = wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-sense__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `Lexeme:${ lexemeId }#${ senseId }` );
			expect( link.text() ).toBe( 'to compete for an office or a position' );
		} );

		it( 'renders the lexeme sense external link if data is not available', () => {
			store.getLexemeSenseData = createGettersWithFunctionsMock( {
				zid: lexemeSenseId,
				label: lexemeSenseId,
				langCode: null,
				langDir: null
			} );

			const wrapper = renderWikidataLexemeSense();
			const link = wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-sense__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `Lexeme:${ lexemeId }#${ senseId }` );
			expect( link.text() ).toBe( lexemeSenseId );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderWikidataLexemeSense( {
				edit: true
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme-sense' ).exists() ).toBe( true );
		} );

		it( 'falls back to z-object-to-string when entity ID is not terminal', () => {
			const wrapper = renderWikidataLexemeSense( {
				edit: true,
				objectValue: objectValueNonTerminal
			} );
			expect( wrapper.findComponent( { name: 'wl-z-object-to-string' } ).exists() ).toBe( true );
		} );

		it( 'renders lexeme selector and sense selector', async () => {
			const wrapper = renderWikidataLexemeSense( {
				edit: true
			} );

			await waitFor( () => {
				const lexemeSelector = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
				const senseSelector = wrapper.findComponent( { name: 'cdx-select' } );
				expect( lexemeSelector.exists() ).toBe( true );
				expect( senseSelector.exists() ).toBe( true );
			} );
		} );

		it( 'initializes with lexeme and sense data when available', async () => {
			store.getLexemeSensesData = createGettersWithFunctionsMock( lexemeData.senses );
			store.getLexemeSenseData = createGettersWithFunctionsMock( lexemeData.senses[ 1 ] );
			store.getLexemeLabelData = createLabelDataMock( { L333333: 'run' } );

			const wrapper = renderWikidataLexemeSense( {
				edit: true
			} );

			await waitFor( () => {
				const lexemeSelector = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
				const senseSelector = wrapper.findComponent( { name: 'cdx-select' } );

				expect( lexemeSelector.exists() ).toBe( true );
				expect( lexemeSelector.vm.entityId ).toBe( lexemeId );
				expect( lexemeSelector.vm.entityLabel ).toBe( 'run' );
				expect( senseSelector.vm.selected ).toBe( lexemeSenseId );
				expect( store.fetchLexemeSenses ).toHaveBeenCalledWith( { lexemeIds: [ lexemeId ] } );
			} );
		} );

		it( 'populates sense selector with available senses from lexeme', async () => {
			store.getLexemeSensesData = createGettersWithFunctionsMock( lexemeData.senses );
			store.getLexemeSenseData = jest.fn( ( id ) => id === 'L333333-S2' ? lexemeData.senses[ 1 ] : lexemeData.senses[ 0 ] );

			const wrapper = renderWikidataLexemeSense( {
				edit: true
			} );

			await waitFor( () => {
				const senseSelector = wrapper.findComponent( { name: 'cdx-select' } );
				expect( senseSelector.exists() ).toBe( true );
				expect( senseSelector.vm.menuItems ).toHaveLength( 2 );
				expect( senseSelector.vm.menuItems[ 0 ].label ).toBe( 'to move quickly on foot' );
				expect( senseSelector.vm.menuItems[ 0 ].value ).toBe( 'L333333-S1' );
				expect( senseSelector.vm.menuItems[ 1 ].label ).toBe( 'to compete for an office or a position' );
				expect( senseSelector.vm.menuItems[ 1 ].value ).toBe( 'L333333-S2' );
			} );
		} );

		it( 'disables sense selector when lexeme has no senses', async () => {
			store.getLexemeLabelData = createGettersWithFunctionsMock();

			const wrapper = renderWikidataLexemeSense( {
				objectValue: {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6096' },
					Z6096K1: { Z1K1: 'Z6', Z6K1: '' }
				},
				edit: true
			} );
			const senseSelector = wrapper.findComponent( { name: 'cdx-select' } );
			expect( senseSelector.vm.disabled ).toBe( true );
		} );

		it( 'shows no senses message when lexeme has no senses', async () => {
			// Mock empty senses data
			store.getLexemeSensesData = createGettersWithFunctionsMock( [] );

			const wrapper = renderWikidataLexemeSense( {
				objectValue: {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6096' },
					Z6096K1: { Z1K1: 'Z6', Z6K1: '' }
				},
				edit: true
			} );

			// Wait for component to initialize
			await waitFor( () => {
				const senseSelector = wrapper.findComponent( { name: 'cdx-select' } );
				expect( senseSelector.exists() ).toBe( true );
				// Initially has a disabled sense selector
				expect( senseSelector.vm.disabled ).toBe( true );
			} );

			// Change lexeme
			const lexemeSelector = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lexemeSelector.vm.$emit( 'select-wikidata-entity', 'L444444' );

			await waitFor( () => {
				const message = wrapper.findComponent( { name: 'cdx-message' } );
				expect( message.exists() ).toBe( true );
				expect( message.attributes().inline ).toBe( 'true' );
			} );
		} );

		it( 'sets lexeme sense reference ID when selecting option from the menu', async () => {
			const wrapper = renderWikidataLexemeSense( {
				edit: true
			} );

			const senseSelector = wrapper.findComponent( { name: 'cdx-select' } );
			senseSelector.vm.$emit( 'update:selected', lexemeSenseId );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: lexemeSenseId,
				keyPath: [
					Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );

		it( 'sets lexeme sense fetch function ID when selecting option from the menu', async () => {
			const wrapper = renderWikidataLexemeSense( {
				objectValue: objectValueFetch,
				edit: true,
				type: Constants.Z_FUNCTION_CALL
			} );

			const senseSelector = wrapper.findComponent( { name: 'cdx-select' } );
			senseSelector.vm.$emit( 'update:selected', lexemeSenseId );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: lexemeSenseId,
				keyPath: [
					Constants.Z_WIKIDATA_FETCH_LEXEME_SENSE_ID,
					Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );

		it( 'clears sense selection when lexeme changes', async () => {
			store.getLexemeSensesData = createGettersWithFunctionsMock( lexemeData.senses );

			const wrapper = renderWikidataLexemeSense( {
				edit: true
			} );

			await waitFor( () => {
				// Initially has a sense selected
				const senseSelector = wrapper.findComponent( { name: 'cdx-select' } );
				expect( senseSelector.exists() ).toBe( true );
				expect( senseSelector.vm.selected ).toBe( lexemeSenseId );
			} );

			// Change lexeme
			const lexemeSelector = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lexemeSelector.vm.$emit( 'select-wikidata-entity', 'L444444' );

			// Should emit set-value to clear the sense
			await waitFor( () => {
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					value: '',
					keyPath: [
						Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE_ID,
						Constants.Z_STRING_VALUE
					]
				} ] ] );
			} );
		} );
	} );
} );
