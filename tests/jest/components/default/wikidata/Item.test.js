/*!
 * WikiLambda unit test suite for the default Wikidata Item component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const WikidataItem = require( '../../../../../resources/ext.wikilambda.app/components/default-view-types/wikidata/Item.vue' );
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

describe( 'WikidataItem', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getItemData = createGettersWithFunctionsMock();
		store.getItemIdRow = createGettersWithFunctionsMock( { id: 1 } );
		store.getItemId = createGettersWithFunctionsMock( itemId );
		store.getZStringTerminalValue = createGettersWithFunctionsMock( itemId );
		store.getUserLangCode = 'en';
	} );

	describe( 'in view mode', () => {
		it( 'renders wikidata item reference without errors', () => {
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-item' ).exists() ).toBe( true );
		} );

		it( 'renders wikidata item fetch function without errors', () => {
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: false,
					type: Constants.Z_FUNCTION_CALL
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-item' ).exists() ).toBe( true );
		} );

		it( 'renders the item external link if data is available', () => {
			store.getItemData = createGettersWithFunctionsMock( itemData );

			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				}
			} );
			const link = wrapper.find( '.ext-wikilambda-app-wikidata-item__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `${ itemId }` );
			expect( link.text() ).toBe( itemLabel );
		} );

		it( 'renders the item external link if data is not available', () => {
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				}
			} );
			const link = wrapper.find( '.ext-wikilambda-app-wikidata-item__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `${ itemId }` );
			expect( link.text() ).toBe( itemId );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-item' ).exists() ).toBe( true );
		} );

		it( 'renders blank wikidata entity selector', () => {
			store.getZStringTerminalValue = createGettersWithFunctionsMock();

			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				}
			} );
			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
		} );

		it( 'renders wikidata entity selector', () => {
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				}
			} );
			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
		} );

		it( 'initializes wikidata entity selector', async () => {
			store.getItemData = createGettersWithFunctionsMock( itemData );

			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				}
			} );
			await wrapper.vm.$nextTick();

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.vm.entityId ).toBe( itemId );
			expect( lookup.vm.entityLabel ).toBe( itemLabel );
			expect( store.fetchItems ).toHaveBeenCalledWith( { ids: [ itemId ] } );
		} );

		it( 'initializes wikidata entity selector input value with delayed fetch response', async () => {
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				}
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.vm.entityId ).toBe( itemId );
			expect( lookup.vm.entityLabel ).toBe( itemId );

			store.getItemData = createGettersWithFunctionsMock( itemData );

			await wrapper.vm.$nextTick();

			expect( lookup.vm.entityId ).toBe( itemId );
			expect( lookup.vm.entityLabel ).toBe( itemLabel );
			expect( store.fetchItems ).toHaveBeenCalledWith( { ids: [ itemId ] } );
		} );

		it( 'sets item reference ID when selecting option from the menu', async () => {
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				}
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', itemId );

			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: itemId,
				keyPath: [
					Constants.Z_WIKIDATA_REFERENCE_ITEM_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );

		it( 'sets item fetch function ID when selecting option from the menu', async () => {
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: true,
					type: Constants.Z_FUNCTION_CALL
				}
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', itemId );

			await wrapper.vm.$nextTick();
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
