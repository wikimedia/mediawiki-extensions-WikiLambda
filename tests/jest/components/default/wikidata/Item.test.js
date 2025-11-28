/*!
 * WikiLambda unit test suite for the default Wikidata Item component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const WikidataItem = require( '../../../../../resources/ext.wikilambda.app/components/types/wikidata/Item.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );

const itemId = 'Q223044';
const itemLabel = 'turtle';
const itemData = {
	title: 'Q223044',
	labels: {
		en: { language: 'en', value: 'turtle' }
	}
};

// General configuration: wikidata reference
const keyPath = 'main.Z2K2';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6091' },
	Z6091K1: { Z1K1: 'Z6', Z6K1: 'Q223044' }
};

// Fetch form
const objectValueFetch = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6821' },
	Z6821K1: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6091' },
		Z6091K1: { Z1K1: 'Z6', Z6K1: 'Q223044' }
	}
};

// Non terminal ID
const objectValueNonTerminal = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6821' },
	Z6821K1: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
		Z18K1: { Z1K1: 'Z6', Z6K1: 'Z10000K1' }
	}
};

describe( 'WikidataItem', () => {
	let store;

	/**
	 * Helper function to render WikidataItem component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderWikidataItem( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false,
			type: Constants.Z_WIKIDATA_REFERENCE_ITEM
		};
		return shallowMount( WikidataItem, { props: { ...defaultProps, ...props }, ...options } );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getItemData = createGettersWithFunctionsMock();
		store.getUserLangCode = 'en';
	} );

	describe( 'in view mode', () => {
		it( 'renders wikidata item reference without errors', () => {
			const wrapper = renderWikidataItem();

			expect( wrapper.find( '.ext-wikilambda-app-wikidata-item' ).exists() ).toBe( true );
		} );

		it( 'falls back to z-object-to-string when entity ID is not terminal', () => {
			const wrapper = renderWikidataItem( {
				objectValue: objectValueNonTerminal
			} );
			expect( wrapper.findComponent( { name: 'wl-z-object-to-string' } ).exists() ).toBe( true );
		} );

		it( 'renders wikidata item fetch function without errors', () => {
			const wrapper = renderWikidataItem( {
				objectValue: objectValueFetch,
				type: Constants.Z_FUNCTION_CALL
			} );

			expect( wrapper.find( '.ext-wikilambda-app-wikidata-item' ).exists() ).toBe( true );
		} );

		it( 'renders the item external link if data is available', () => {
			store.getItemData = createGettersWithFunctionsMock( itemData );

			const wrapper = renderWikidataItem();

			const link = wrapper.find( '.ext-wikilambda-app-wikidata-item__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `${ itemId }` );
			expect( link.text() ).toBe( itemLabel );
		} );

		it( 'renders the item external link if data is not available', () => {
			const wrapper = renderWikidataItem();

			const link = wrapper.find( '.ext-wikilambda-app-wikidata-item__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `${ itemId }` );
			expect( link.text() ).toBe( itemId );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderWikidataItem( { edit: true } );

			expect( wrapper.find( '.ext-wikilambda-app-wikidata-item' ).exists() ).toBe( true );
		} );

		it( 'falls back to z-object-to-string when entity ID is not terminal', () => {
			const wrapper = renderWikidataItem( {
				edit: true,
				objectValue: objectValueNonTerminal
			} );

			expect( wrapper.findComponent( { name: 'wl-z-object-to-string' } ).exists() ).toBe( true );
		} );

		it( 'initializes wikidata entity selector', async () => {
			store.getItemData = createGettersWithFunctionsMock( itemData );

			const wrapper = renderWikidataItem( { edit: true } );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.vm.entityId ).toBe( itemId );
			expect( lookup.vm.entityLabel ).toBe( itemLabel );
			expect( store.fetchItems ).toHaveBeenCalledWith( { ids: [ itemId ] } );
		} );

		it( 'sets item reference ID when selecting option from the menu', async () => {
			const wrapper = renderWikidataItem( { edit: true } );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', itemId );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: itemId,
				keyPath: [
					Constants.Z_WIKIDATA_REFERENCE_ITEM_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );

		it( 'sets item fetch function ID when selecting option from the menu', async () => {
			const wrapper = renderWikidataItem( {
				objectValue: objectValueFetch,
				edit: true,
				type: Constants.Z_FUNCTION_CALL
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', itemId );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: itemId,
				keyPath: [
					Constants.Z_WIKIDATA_FETCH_ITEM_ID,
					Constants.Z_WIKIDATA_REFERENCE_ITEM_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );
	} );
} );
