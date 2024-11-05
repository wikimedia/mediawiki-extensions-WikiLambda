/*!
 * WikiLambda unit test suite for the default Wikidata Item component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' ),
	{ createGetterMock, createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' ),
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	WikidataItem = require( '../../../../../resources/ext.wikilambda.app/components/default-view-types/wikidata/Item.vue' );

const dataIcons = () => ( {
	icons: {
		cdxIconLogoWikidata: 'wikidata',
		cdxIconLinkExternal: 'link'
	}
} );
const itemId = 'Q223044';
const itemLabel = 'turtle';
const itemData = {
	title: 'Q223044',
	labels: {
		en: { language: 'en', value: 'turtle' }
	}
};

describe( 'WikidataItem', () => {
	let getters, actions;
	beforeEach( () => {
		getters = {
			getItemData: createGettersWithFunctionsMock(),
			getItemIdRow: createGettersWithFunctionsMock( { id: 1 } ),
			getZStringTerminalValue: createGettersWithFunctionsMock( itemId ),
			getUserLangCode: createGetterMock( 'en' )
		};
		actions = {
			fetchItems: jest.fn()
		};
		global.store.hotUpdate( { actions, getters } );
	} );

	describe( 'in view mode', () => {
		it( 'renders wikidata item reference without errors', () => {
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				},
				data: dataIcons
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-item' ).exists() ).toBe( true );
		} );

		it( 'renders wikidata item fetch function without errors', () => {
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: false,
					type: Constants.Z_FUNCTION_CALL
				},
				data: dataIcons
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-item' ).exists() ).toBe( true );
		} );

		it( 'renders the item external link if data is available', () => {
			getters.getItemData = createGettersWithFunctionsMock( itemData );
			global.store.hotUpdate( { getters } );
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				},
				data: dataIcons
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
				},
				data: dataIcons
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
				},
				data: dataIcons
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-item' ).exists() ).toBe( true );
		} );

		it( 'renders blank wikidata entity selector', () => {
			getters.getZStringTerminalValue = createGettersWithFunctionsMock();
			global.store.hotUpdate( { getters } );
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				},
				data: dataIcons
			} );
			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
		} );

		it( 'renders wikidata entity selector', () => {
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				},
				data: dataIcons
			} );
			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
		} );

		it( 'initializes wikidata entity selector', async () => {
			getters.getItemData = createGettersWithFunctionsMock( itemData );
			global.store.hotUpdate( { getters } );
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				},
				data: dataIcons
			} );
			await wrapper.vm.$nextTick();

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.vm.entityId ).toBe( itemId );
			expect( lookup.vm.entityLabel ).toBe( itemLabel );
			expect( actions.fetchItems ).toHaveBeenCalledWith( expect.anything(), { ids: [ itemId ] } );
		} );

		it( 'initializes wikidata entity selector input value with delayed fetch response', async () => {
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				},
				data: dataIcons
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.vm.entityId ).toBe( itemId );
			expect( lookup.vm.entityLabel ).toBe( itemId );

			getters.getItemData = createGettersWithFunctionsMock( itemData );
			global.store.hotUpdate( { getters } );
			await wrapper.vm.$nextTick();

			expect( lookup.vm.entityId ).toBe( itemId );
			expect( lookup.vm.entityLabel ).toBe( itemLabel );
			expect( actions.fetchItems ).toHaveBeenCalledWith( expect.anything(), { ids: [ itemId ] } );
		} );

		it( 'sets item reference ID when selecting option from the menu', async () => {
			const wrapper = shallowMount( WikidataItem, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_ITEM
				},
				data: dataIcons
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
				},
				data: dataIcons
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
