/*!
 * WikiLambda unit test suite for the Wikidata Entity Selector component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const WikidataEntitySelector = require( '../../../../../resources/ext.wikilambda.app/components/types/wikidata/EntitySelector.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const { mockLookupLexemes } = require( '../../../fixtures/mocks.js' );

// Mock data constants
const mockTurtleLookupResults = {
	search: [
		{
			id: 'L45131',
			description: 'English, noun',
			label: 'turtle'
		},
		{
			id: 'L333333',
			description: 'English, verb',
			label: 'turtle'
		}
	],
	searchContinue: null
};

const mockPangolinLookupResults = {
	search: [
		{
			id: 'L290326',
			description: 'English, noun',
			label: 'pangolin'
		},
		{
			id: 'L1208742',
			description: 'Italian, noun',
			label: 'pangolino'
		}
	],
	searchContinue: null
};

describe( 'WikidataEntitySelector', () => {
	let store;

	/**
	 * Helper function to render WikidataEntitySelector component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderEntitySelector( props = {}, options = {} ) {
		const defaultProps = {
			entityId: null,
			entityLabel: '',
			type: Constants.Z_WIKIDATA_LEXEME
		};
		return shallowMount( WikidataEntitySelector, { props: { ...defaultProps, ...props }, ...options } );
	}

	beforeEach( () => {
		store = useMainStore();
		store.lookupWikidataEntities.mockResolvedValue();
	} );

	it( 'renders for lexeme without errors', () => {
		const wrapper = renderEntitySelector();

		expect( wrapper.find( '.ext-wikilambda-app-wikidata-entity-selector' ).exists() ).toBe( true );
	} );

	it( 'renders for lexeme form without errors', () => {
		const wrapper = renderEntitySelector( {
			type: Constants.Z_WIKIDATA_LEXEME_FORM
		} );

		expect( wrapper.find( '.ext-wikilambda-app-wikidata-entity-selector' ).exists() ).toBe( true );
	} );

	it( 'renders for item without errors', () => {
		const wrapper = renderEntitySelector( {
			type: Constants.Z_WIKIDATA_ITEM
		} );

		expect( wrapper.find( '.ext-wikilambda-app-wikidata-entity-selector' ).exists() ).toBe( true );
	} );

	it( 'initializes selected lexeme', async () => {
		const wrapper = renderEntitySelector( {
			entityId: 'L333333',
			entityLabel: 'turtle'
		} );

		const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
		await waitFor( () => {
			expect( lookup.exists() ).toBe( true );
			expect( lookup.props( 'selected' ) ).toBe( 'L333333' );
			expect( lookup.props( 'inputValue' ) ).toBe( 'turtle' );
		} );
	} );

	it( 're-initializes selected lexeme', async () => {
		const wrapper = renderEntitySelector();

		const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

		expect( lookup.props( 'inputValue' ) ).toBe( '' );

		wrapper.setProps( { entityId: 'L333333', entityLabel: 'turtle' } );

		await waitFor( () => {
			expect( lookup.props( 'selected' ) ).toBe( 'L333333' );
			expect( lookup.props( 'inputValue' ) ).toBe( 'turtle' );
		} );
	} );

	describe( 'on update inputValue', () => {
		it( 'clears lookup results when clearing the input field', async () => {
			store.lookupWikidataEntities.mockResolvedValue( mockLookupLexemes );

			const wrapper = renderEntitySelector( {
				entityId: 'L333333',
				entityLabel: 'turtle'
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

			// First, populate lookup results by entering text
			lookup.vm.$emit( 'update:inputValue', 'pangoli' );

			// Wait for the debounced lookup to complete
			await waitFor( () => {
				// Test that the lookup component is working by checking if it exists and has the right input value
				expect( lookup.props( 'inputValue' ) ).toBe( 'pangoli' );
				expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
			} );

			// Now clear the input
			lookup.vm.$emit( 'update:inputValue', '' );

			// Verify results are cleared by checking the lookup component
			await waitFor( () => {
				expect( lookup.props( 'inputValue' ) ).toBe( '' );
			} );
			expect( lookup.props( 'menuItems' ).length ).toBe( 0 );
		} );

		it( 'performs lookup when updating input value field', async () => {
			store.lookupWikidataEntities.mockResolvedValue( mockLookupLexemes );

			const wrapper = renderEntitySelector();

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:inputValue', 'pangoli' );

			// Wait for lookup API to be called:
			await waitFor( () => expect( store.lookupWikidataEntities ).toHaveBeenCalledWith( {
				search: 'pangoli',
				type: 'lexeme',
				searchContinue: null,
				signal: expect.any( Object )
			} ) );

			expect( lookup.props( 'inputValue' ) ).toBe( 'pangoli' );
			expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
			expect( lookup.props( 'menuItems' )[ 0 ] ).toEqual( {
				description: 'English, noun',
				title: 'English, noun', // Added to show in htmlattribute
				label: 'pangolin',
				value: 'L290326'
			} );
			expect( lookup.props( 'menuItems' )[ 1 ] ).toEqual( {
				description: 'Italian, noun',
				title: 'Italian, noun', // Added to show in htmlattribute
				label: 'pangolino',
				value: 'L1208742'
			} );
		} );

		it( 'resets the lookup when fetch fails', async () => {
			store.lookupWikidataEntities.mockRejectedValue( 'some error' );

			const wrapper = renderEntitySelector();

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:inputValue', 'pangoli' );

			// Wait for lookup API to be called:
			await waitFor( () => expect( store.lookupWikidataEntities )
				.toHaveBeenCalledWith( {
					search: 'pangoli',
					type: 'lexeme',
					searchContinue: null,
					signal: expect.any( Object )
				} ) );

			expect( lookup.props( 'inputValue' ) ).toBe( 'pangoli' );
			expect( lookup.props( 'menuItems' ).length ).toBe( 0 );
		} );

		it( 'appends lookup results when loading more', async () => {
			jest.useFakeTimers();
			try {
				const firstBatch = {
					search: [ {
						id: 'L1',
						label: 'turtle',
						description: 'English, noun'
					} ],
					searchContinue: 'continue-1'
				};
				const secondBatch = {
					search: [ {
						id: 'L2',
						label: 'turtles',
						description: 'English, plural noun'
					} ],
					searchContinue: null
				};

				store.lookupWikidataEntities.mockReset();
				store.lookupWikidataEntities
					.mockResolvedValueOnce( firstBatch )
					.mockResolvedValueOnce( secondBatch );

				const wrapper = renderEntitySelector();
				const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

				lookup.vm.$emit( 'update:inputValue', 'turtle' );
				jest.runAllTimers();

				await waitFor( () => {
					expect( lookup.props( 'menuItems' ).length ).toBe( 1 );
					expect( lookup.props( 'menuItems' )[ 0 ].value ).toBe( 'L1' );
				} );

				lookup.vm.$emit( 'load-more' );

				await waitFor( () => {
					expect( store.lookupWikidataEntities ).toHaveBeenCalledTimes( 2 );
					expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
					expect( lookup.props( 'menuItems' ).map( ( item ) => item.value ) ).toEqual( [ 'L1', 'L2' ] );
				} );
			} finally {
				jest.useRealTimers();
			}
		} );
	} );

	describe( 'on blur', () => {
		beforeEach( () => {
			jest.useFakeTimers();
		} );

		afterEach( () => {
			jest.useRealTimers();
		} );

		it( 'does nothing when input value is the same as selected value', async () => {
			// Mock lookup to return two "turtle" results
			store.lookupWikidataEntities.mockResolvedValue( mockTurtleLookupResults );

			const wrapper = renderEntitySelector( {
				entityId: 'L333333',
				entityLabel: 'turtle'
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

			await waitFor( () => {
				// Previously selected value: turtle
				expect( lookup.props( 'inputValue' ) ).toBe( 'turtle' );
			} );
			// Search for "turtle" which generates two results
			lookup.vm.$emit( 'update:inputValue', 'turtle' );

			// Run all pending timers (including the 300ms debounce)
			jest.runAllTimers();

			// Wait for lookup results to be populated
			await waitFor( () => {
				// Test that lookup results are available by checking component state
				expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
			} );

			// Blur without selecting anything
			lookup.vm.$emit( 'blur' );

			// Do nothing - input value stays the same
			expect( lookup.props( 'inputValue' ) ).toBe( 'turtle' );
			expect( wrapper.emitted() ).not.toHaveProperty( 'select-wikidata-entity' );
		} );

		it( 'resets to previous value when input has no match', async () => {
			// Mock lookup to return "pangolin" results
			store.lookupWikidataEntities.mockResolvedValue( mockPangolinLookupResults );

			const wrapper = renderEntitySelector( {
				entityId: 'L333333',
				entityLabel: 'turtle'
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

			await waitFor( () => {
				// Previously selected value: turtle
				expect( lookup.props( 'inputValue' ) ).toBe( 'turtle' );
			} );

			// Search for "pangol" which generates two results: none fully match
			lookup.vm.$emit( 'update:inputValue', 'pangol' );

			// Run all pending timers (including the 300ms debounce)
			jest.runAllTimers();

			// Wait for lookup results to be populated
			await waitFor( () => {
				// Test that lookup results are available by checking component state
				expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
			} );

			// Blur without selecting anything
			lookup.vm.$emit( 'blur' );

			// Reset to previous value

			await waitFor( () => {
				expect( lookup.props( 'inputValue' ) ).toBe( 'turtle' );
			} );
		} );

		it( 'sets new value when input has a match', async () => {
			// Mock lookup to return "pangolin" results
			store.lookupWikidataEntities.mockResolvedValue( mockPangolinLookupResults );

			const wrapper = renderEntitySelector( {
				entityId: 'L333333',
				entityLabel: 'turtle'
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

			await waitFor( () => {
				// Previously selected value: turtle
				expect( lookup.props( 'inputValue' ) ).toBe( 'turtle' );
			} );

			// Search for "pangolin" which generates two results: one fully matches
			lookup.vm.$emit( 'update:inputValue', 'pangolin' );

			// Run all pending timers (including the 300ms debounce)
			jest.runAllTimers();

			// Wait for lookup results to be populated
			await waitFor( () => {
				// Test that lookup results are available by checking component state
				expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
			} );

			// Blur without selecting anything from the menu
			lookup.vm.$emit( 'blur' );

			// Set new value because input exactly matches a result
			expect( lookup.props( 'inputValue' ) ).toBe( 'pangolin' );
			expect( wrapper.emitted() ).toHaveProperty( 'select-wikidata-entity', [ [ 'L290326' ] ] );
		} );
	} );

	describe( 'on update selected', () => {
		it( 'does nothing if lookup emits empty select event', async () => {
			const wrapper = renderEntitySelector();

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:selected', null );

			expect( wrapper.emitted() ).not.toHaveProperty( 'select-wikidata-entity' );
		} );

		it( 'does nothing if lookup emits already selected value', async () => {
			const wrapper = renderEntitySelector( {
				entityId: 'L333333',
				entityLabel: 'turtle'
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:selected', 'L333333' );

			expect( wrapper.emitted() ).not.toHaveProperty( 'select-wikidata-entity' );
		} );

		it( 'emits select event when when selecting valid option from the menu', async () => {
			const wrapper = renderEntitySelector();

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:selected', 'L1208742' );

			expect( wrapper.emitted() ).toHaveProperty( 'select-wikidata-entity', [ [ 'L1208742' ] ] );
		} );
	} );
} );
