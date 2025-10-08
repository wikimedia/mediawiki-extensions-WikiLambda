/*!
 * WikiLambda unit test suite for the default Wikidata Enum component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const WikidataEnum = require( '../../../../../resources/ext.wikilambda.app/components/types/wikidata/Enum.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

const enumType = 'Z111111'; // Example enum type
const entityType = Constants.Z_WIKIDATA_REFERENCE_ITEM;
const wikidataIds = [ 'Q111111', 'Q222222', 'Q333333' ];

const keyPath = 'main.Z2K2';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z111111' },
	Z111111K1: { Z1K1: 'Z9', Z9K1: 'Z111111' }
};

describe( 'WikidataEnum', () => {
	let store;

	/**
	 * Helper function to render WikidataEnum component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderWikidataEnum( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false,
			type: enumType
		};
		return shallowMount( WikidataEnum, { props: { ...defaultProps, ...props }, ...options } );
	}

	beforeEach( () => {
		store = useMainStore();
		// Getters
		store.getTypeOfWikidataEnum = jest.fn().mockReturnValue( entityType );
		store.getReferencesIdsOfWikidataEnum = jest.fn().mockReturnValue( wikidataIds );
		store.getWikidataEntityLabelData = jest.fn().mockImplementation( ( type, id ) => ( {
			label: `Label for ${ id }`
		} ) );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderWikidataEnum();

		expect( wrapper.find( '.ext-wikilambda-app-wikidata-enum' ).exists() ).toBe( true );
	} );

	it( 'renders select in edit mode', () => {
		const wrapper = renderWikidataEnum( { edit: true } );

		expect( wrapper.findComponent( { name: 'cdx-select' } ).exists() ).toBe( true );
	} );

	it( 'emits set-value event when selecting an enum value', async () => {
		const wrapper = renderWikidataEnum( { edit: true } );

		const select = wrapper.findComponent( { name: 'cdx-select' } );
		select.vm.$emit( 'update:selected', 'Q222222' );

		expect( wrapper.emitted()[ 'set-value' ][ 0 ][ 0 ] ).toEqual( {
			value: 'Q222222',
			keyPath: [
				`${ enumType }K1`,
				`${ entityType }K1`,
				Constants.Z_STRING_VALUE
			]
		} );
	} );

	it( 'shows correct menu items', () => {
		const wrapper = renderWikidataEnum( { edit: true } );

		const select = wrapper.findComponent( { name: 'cdx-select' } );
		expect( select.props( 'menuItems' ) ).toEqual( [
			{ label: 'Label for Q111111', value: 'Q111111' },
			{ label: 'Label for Q222222', value: 'Q222222' },
			{ label: 'Label for Q333333', value: 'Q333333' }
		] );
	} );

	it( 'fetches entities on mount and when wikidataIds change', async () => {
		const wrapper = renderWikidataEnum( { edit: true } );

		expect( store.fetchWikidataEntitiesByType ).toHaveBeenCalledWith( { type: entityType, ids: wikidataIds } );

		// Simulate change in wikidataIds
		const newType = 'Z222222';
		const newIds = [ 'Q111111', 'Q222222', 'Q333333', 'Q444444' ];
		store.getTypeOfWikidataEnum.mockReturnValue( entityType );
		store.getReferencesIdsOfWikidataEnum.mockReturnValue( newIds );

		await wrapper.setProps( { type: newType } );

		expect( store.fetchWikidataEntitiesByType ).toHaveBeenCalledWith( { type: entityType, ids: newIds } );
	} );
} );
