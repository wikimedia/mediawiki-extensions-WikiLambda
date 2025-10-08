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
	WikidataProperty = require( '../../../../../resources/ext.wikilambda.app/components/types/wikidata/Property.vue' );

const propertyId = 'P642';
const propertyLabel = 'of';
const propertyData = {
	title: 'Property:P642',
	labels: {
		en: { language: 'en', value: 'of' }
	}
};

// General configuration: wikidata reference
const keyPath = 'main.Z2K2';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6092' },
	Z6092K1: { Z1K1: 'Z6', Z6K1: 'P642' }
};

// Fetch form
const objectValueFetch = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6822' },
	Z6822K1: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6092' },
		Z6092K1: { Z1K1: 'Z6', Z6K1: 'P642' }
	}
};

describe( 'WikidataProperty', () => {
	let store;

	/**
	 * Helper function to render WikidataProperty component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderWikidataProperty( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false,
			type: Constants.Z_WIKIDATA_REFERENCE_PROPERTY
		};
		return shallowMount( WikidataProperty, { props: { ...defaultProps, ...props }, ...options } );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getPropertyData = createGettersWithFunctionsMock();
		store.getUserLangCode = 'en';
	} );

	describe( 'in view mode', () => {
		it( 'renders wikidata property reference without errors', () => {
			const wrapper = renderWikidataProperty();

			expect( wrapper.find( '.ext-wikilambda-app-wikidata-property' ).exists() ).toBe( true );
		} );

		it( 'renders wikidata property fetch function without errors', () => {
			const wrapper = renderWikidataProperty( {
				objectValue: objectValueFetch,
				type: Constants.Z_FUNCTION_CALL
			} );
			expect( wrapper.find( '.ext-wikilambda-app-wikidata-property' ).exists() ).toBe( true );
		} );

		it( 'renders the property external link if data is available', () => {
			store.getPropertyData = createGettersWithFunctionsMock( propertyData );

			const wrapper = renderWikidataProperty();

			const link = wrapper.find( '.ext-wikilambda-app-wikidata-property__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `${ propertyId }` );
			expect( link.text() ).toBe( propertyLabel );
		} );

		it( 'renders the property external link if data is not available', () => {
			const wrapper = renderWikidataProperty();

			const link = wrapper.find( '.ext-wikilambda-app-wikidata-property__link' );
			expect( link.exists() ).toBe( true );
			expect( link.attributes().href ).toContain( `${ propertyId }` );
			expect( link.text() ).toBe( propertyId );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderWikidataProperty( { edit: true } );

			expect( wrapper.find( '.ext-wikilambda-app-wikidata-property' ).exists() ).toBe( true );
		} );

		it( 'initializes wikidata entity selector', async () => {
			store.getPropertyData = createGettersWithFunctionsMock( propertyData );

			const wrapper = renderWikidataProperty( { edit: true } );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.vm.entityId ).toBe( propertyId );
			expect( lookup.vm.entityLabel ).toBe( propertyLabel );
			expect( store.fetchProperties ).toHaveBeenCalledWith( { ids: [ propertyId ] } );
		} );

		it( 'sets property reference ID when selecting option from the menu', async () => {
			const wrapper = renderWikidataProperty( { edit: true } );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', propertyId );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				value: propertyId,
				keyPath: [
					Constants.Z_WIKIDATA_REFERENCE_PROPERTY_ID,
					Constants.Z_STRING_VALUE
				]
			} ] ] );
		} );

		it( 'sets property fetch function ID when selecting option from the menu', async () => {
			const wrapper = renderWikidataProperty( {
				objectValue: objectValueFetch,
				edit: true,
				type: Constants.Z_FUNCTION_CALL
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'select-wikidata-entity', propertyId );

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
