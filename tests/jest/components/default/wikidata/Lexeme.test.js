/*!
 * WikiLambda unit test suite for the default Wikidata Lexeme component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' ),
	{ waitFor } = require( '@testing-library/vue' ),
	{ createGetterMock, createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' ),
	{ mockLookupLexemes } = require( '../../../fixtures/mocks.js' ),
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	WikidataLexeme = require( '../../../../../resources/ext.wikilambda.app/components/default-view-types/wikidata/Lexeme.vue' );

const dataIcons = () => ( {
	icons: {
		cdxIconLogoWikidata: 'wikidata',
		cdxIconLinkExternal: 'link'
	}
} );
const lexemeId = 'L333333';
const lexemeData = {
	title: 'Lexeme:L333333',
	lemmas: {
		en: { language: 'en', value: 'turtle' }
	}
};

describe( 'WikidataLexeme', () => {
	let getters, actions;
	beforeEach( () => {
		getters = {
			getLexemeData: createGettersWithFunctionsMock(),
			getLexemeIdRow: createGettersWithFunctionsMock( { id: 1 } ),
			getZStringTerminalValue: createGettersWithFunctionsMock( lexemeId ),
			getUserLangCode: createGetterMock( 'en' )
		};
		actions = {
			fetchLexemes: jest.fn(),
			lookupLexemes: jest.fn()
		};
		global.store.hotUpdate( { actions, getters } );
	} );

	describe( 'in view mode', () => {
		it( 'renders wikidata reference without errors', () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				},
				data: dataIcons
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme' ).exists() ).toBe( true );
		} );

		it( 'renders wikidata entity without errors', () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: false,
					type: Constants.Z_FUNCTION_CALL
				},
				data: dataIcons
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme' ).exists() ).toBe( true );
		} );

		it( 'renders the lexeme external link if data is available', () => {
			getters.getLexemeData = createGettersWithFunctionsMock( lexemeData );
			global.store.hotUpdate( { getters } );
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				},
				data: dataIcons
			} );
			const link = wrapper.find( '.ext-wikilambda-app-wikidata-lexeme__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `Lexeme:${ lexemeId }` );
			expect( link.text() ).toBe( 'turtle' );
		} );

		it( 'renders the lexeme external link if data is not available', () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				},
				data: dataIcons
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
				},
				data: dataIcons
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-lexeme' ).exists() ).toBe( true );
		} );

		it( 'renders empty lexeme lookup component', () => {
			getters.getZStringTerminalValue = createGettersWithFunctionsMock();
			global.store.hotUpdate( { getters } );
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				},
				data: dataIcons
			} );
			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			expect( lookup.exists() ).toBe( true );
		} );

		it( 'renders lexeme lookup component', () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				},
				data: dataIcons
			} );
			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			expect( lookup.exists() ).toBe( true );
		} );

		it( 'initializes lexeme lookup component', async () => {
			getters.getLexemeData = createGettersWithFunctionsMock( lexemeData );
			global.store.hotUpdate( { getters } );
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				},
				data: dataIcons
			} );
			await wrapper.vm.$nextTick();

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.vm.inputValue ).toBe( 'turtle' );
			expect( actions.fetchLexemes ).toHaveBeenCalledWith( expect.anything(), { ids: [ lexemeId ] } );
		} );

		it( 'initializes lexeme lookup input value with delayed fetch response', async () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				},
				data: dataIcons
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			expect( lookup.vm.inputValue ).toBe( '' );

			getters.getLexemeData = createGettersWithFunctionsMock( lexemeData );
			global.store.hotUpdate( { getters } );
			await wrapper.vm.$nextTick();

			expect( lookup.vm.inputValue ).toBe( 'turtle' );
			expect( actions.fetchLexemes ).toHaveBeenCalledWith( expect.anything(), { ids: [ lexemeId ] } );
		} );

		it( 'clears state when clearing the input field', () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				},
				data: dataIcons
			} );

			wrapper.setData( { lookupResults: [ {
				description: 'English, noun',
				label: 'pangolin',
				value: 'L290326'
			} ] } );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:inputValue', '' );
			expect( wrapper.vm.lookupResults.length ).toBe( 0 );
		} );

		it( 'performs lookup when updating input value field', async () => {
			actions.lookupLexemes = jest.fn().mockResolvedValue( mockLookupLexemes );
			global.store.hotUpdate( { actions } );

			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				},
				data: dataIcons
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:inputValue', 'pangoli' );

			// Wait for lookup API to be called:
			await waitFor( () => expect( actions.lookupLexemes ).toHaveBeenCalledWith( expect.anything(), 'pangoli' ) );

			expect( wrapper.vm.lookupConfig.searchQuery ).toBe( 'pangoli' );
			expect( lookup.vm.menuItems.length ).toBe( 2 );
			expect( lookup.vm.menuItems[ 0 ] ).toEqual( {
				description: 'English, noun',
				label: 'pangolin',
				value: 'L290326'
			} );
			expect( lookup.vm.menuItems[ 1 ] ).toEqual( {
				description: 'Italian, noun',
				label: 'pangolino',
				value: 'L1208742'
			} );
		} );

		describe( 'on blur', () => {
			it( 'resets to previous value when input has no match', () => {
				getters.getLexemeData = createGettersWithFunctionsMock( lexemeData );
				global.store.hotUpdate( { getters } );
				const wrapper = shallowMount( WikidataLexeme, {
					props: {
						edit: true,
						type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
					},
					data: dataIcons
				} );

				// Previously selected value: turtle
				expect( wrapper.vm.inputValue ).toBe( 'turtle' );

				// Search for "pangol" generated two results: none fully match
				wrapper.setData( {
					inputValue: 'pangol',
					lookupResults: [ {
						description: 'English, noun',
						label: 'pangolin',
						value: 'L290326'
					}, {
						description: 'Italian, noun',
						label: 'pangolino',
						value: 'L1208742'
					} ]
				} );

				const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
				lookup.vm.$emit( 'blur' );

				// Reset to previous value
				expect( wrapper.vm.inputValue ).toBe( 'turtle' );
			} );

			it( 'sets new value when input has a match', () => {
				getters.getLexemeData = createGettersWithFunctionsMock( lexemeData );
				global.store.hotUpdate( { getters } );
				const wrapper = shallowMount( WikidataLexeme, {
					props: {
						edit: true,
						type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
					},
					data: dataIcons
				} );

				// Previously selected value: turtle
				expect( wrapper.vm.inputValue ).toBe( 'turtle' );

				// Search for "pangolin" generated two results: one fully matches
				wrapper.setData( {
					inputValue: 'pangolin',
					lookupResults: [ {
						description: 'English, noun',
						label: 'pangolin',
						value: 'L290326'
					}, {
						description: 'Italian, noun',
						label: 'pangolino',
						value: 'L1208742'
					} ]
				} );

				const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
				lookup.vm.$emit( 'blur' );

				// Set new value
				expect( wrapper.vm.inputValue ).toBe( 'pangolin' );
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					value: 'L290326',
					keyPath: [
						Constants.Z_WIKIDATA_REFERENCE_LEXEME_ID,
						Constants.Z_STRING_VALUE
					]
				} ] ] );
			} );
		} );

		it( 'sets lexeme reference ID when selecting option from the menu', async () => {
			const wrapper = shallowMount( WikidataLexeme, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_LEXEME
				},
				data: dataIcons
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:selected', 'L1208742' );

			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: 'L1208742',
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
				},
				data: dataIcons
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:selected', 'L1208742' );

			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: 'L1208742',
				keyPath: [
					Constants.Z_WIKIDATA_FETCH_LEXEME_ID,
					Constants.Z_WIKIDATA_REFERENCE_LEXEME_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );
	} );
} );
