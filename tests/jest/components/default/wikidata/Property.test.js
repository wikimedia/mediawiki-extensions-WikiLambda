/*!
 * WikiLambda unit test suite for the default Wikidata Property component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' ),
	{ createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' ),
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' ),
	WikidataProperty = require( '../../../../../resources/ext.wikilambda.app/components/default-view-types/wikidata/Property.vue' );

const dataIcons = () => ( {
	icons: {
		cdxIconLogoWikidata: 'wikidata',
		cdxIconLinkExternal: 'link'
	}
} );
const propertyId = 'P642';
const propertyLabel = 'of';
const propertyData = {
	title: 'Property:P642',
	labels: {
		en: { language: 'en', value: 'of' }
	}
};

describe( 'WikidataProperty', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getPropertyData = createGettersWithFunctionsMock();
		store.getPropertyIdRow = createGettersWithFunctionsMock( { id: 1 } );
		store.getZStringTerminalValue = createGettersWithFunctionsMock( propertyId );
		store.getUserLangCode = 'en';
	} );

	describe( 'in view mode', () => {
		it( 'renders wikidata property reference without errors', () => {
			const wrapper = shallowMount( WikidataProperty, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_PROPERTY
				},
				data: dataIcons
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-property' ).exists() ).toBe( true );
		} );

		it( 'renders wikidata property fetch function without errors', () => {
			const wrapper = shallowMount( WikidataProperty, {
				props: {
					edit: false,
					type: Constants.Z_FUNCTION_CALL
				},
				data: dataIcons
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-property' ).exists() ).toBe( true );
		} );

		it( 'renders the property external link if data is available', () => {
			store.getPropertyData = createGettersWithFunctionsMock( propertyData );

			const wrapper = shallowMount( WikidataProperty, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_PROPERTY
				},
				data: dataIcons
			} );
			const link = wrapper.find( '.ext-wikilambda-app-wikidata-property__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `${ propertyId }` );
			expect( link.text() ).toBe( propertyLabel );
		} );

		it( 'renders the property external link if data is not available', () => {
			const wrapper = shallowMount( WikidataProperty, {
				props: {
					edit: false,
					type: Constants.Z_WIKIDATA_REFERENCE_PROPERTY
				},
				data: dataIcons
			} );
			const link = wrapper.find( '.ext-wikilambda-app-wikidata-property__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `${ propertyId }` );
			expect( link.text() ).toBe( propertyId );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( WikidataProperty, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_PROPERTY
				},
				data: dataIcons
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-property' ).exists() ).toBe( true );
		} );

		it( 'renders blank wikidata entity selector', () => {
			store.getZStringTerminalValue = createGettersWithFunctionsMock();

			const wrapper = shallowMount( WikidataProperty, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_PROPERTY
				},
				data: dataIcons
			} );
			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
		} );

		it( 'renders wikidata entity selector', () => {
			const wrapper = shallowMount( WikidataProperty, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_PROPERTY
				},
				data: dataIcons
			} );
			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
		} );

		it( 'initializes wikidata entity selector', async () => {
			store.getPropertyData = createGettersWithFunctionsMock( propertyData );

			const wrapper = shallowMount( WikidataProperty, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_PROPERTY
				},
				data: dataIcons
			} );
			await wrapper.vm.$nextTick();

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.vm.entityId ).toBe( propertyId );
			expect( lookup.vm.entityLabel ).toBe( propertyLabel );
			expect( store.fetchProperties ).toHaveBeenCalledWith( { ids: [ propertyId ] } );
		} );

		it( 'initializes wikidata entity selector input value with delayed fetch response', async () => {
			const wrapper = shallowMount( WikidataProperty, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_PROPERTY
				},
				data: dataIcons
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.vm.entityId ).toBe( propertyId );
			expect( lookup.vm.entityLabel ).toBe( propertyId );

			store.getPropertyData = createGettersWithFunctionsMock( propertyData );

			await wrapper.vm.$nextTick();

			expect( lookup.vm.entityId ).toBe( propertyId );
			expect( lookup.vm.entityLabel ).toBe( propertyLabel );
			expect( store.fetchProperties ).toHaveBeenCalledWith( { ids: [ propertyId ] } );
		} );

		it( 'sets property reference ID when selecting option from the menu', async () => {
			const wrapper = shallowMount( WikidataProperty, {
				props: {
					edit: true,
					type: Constants.Z_WIKIDATA_REFERENCE_PROPERTY
				},
				data: dataIcons
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', propertyId );

			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: propertyId,
				keyPath: [
					Constants.Z_WIKIDATA_REFERENCE_PROPERTY_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );

		it( 'sets property fetch function ID when selecting option from the menu', async () => {
			const wrapper = shallowMount( WikidataProperty, {
				props: {
					edit: true,
					type: Constants.Z_FUNCTION_CALL
				},
				data: dataIcons
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', propertyId );

			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: propertyId,
				keyPath: [
					Constants.Z_WIKIDATA_FETCH_PROPERTY_ID,
					Constants.Z_WIKIDATA_REFERENCE_PROPERTY_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );
	} );
} );
