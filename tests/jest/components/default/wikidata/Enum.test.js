/*!
 * WikiLambda unit test suite for the default Wikidata Enum component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const WikidataEnum = require( '../../../../../resources/ext.wikilambda.app/components/default-view-types/wikidata/Enum.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'WikidataEnum', () => {
	let store;
	const enumType = 'Z111111'; // Example enum type
	const entityType = Constants.Z_WIKIDATA_REFERENCE_ITEM;
	const wikidataIds = [ 'Q111111', 'Q222222', 'Q333333' ];

	beforeEach( () => {
		store = useMainStore();
		store.getTypeOfWikidataEnum = jest.fn().mockReturnValue( entityType );
		store.getReferencesIdsOfWikidataEnum = jest.fn().mockReturnValue( wikidataIds );
		store.getRowByKeyPath = jest.fn().mockImplementation( ( keyPath ) => {
			if ( keyPath[ 0 ] === `${ enumType }K1` ) {
				return { id: 10 };
			}
			if ( keyPath[ 0 ] === `${ entityType }K1` ) {
				return { id: 20 };
			}
			return undefined;
		} );
		store.getZStringTerminalValue = jest.fn().mockReturnValue( 'Q111111' );
		store.getWikidataEntityLabelData = jest.fn().mockImplementation( ( type, id ) => ( {
			label: `Label for ${ id }`
		} ) );
		store.fetchWikidataEntitiesByType = jest.fn();
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( WikidataEnum, {
			props: {
				rowId: 1,
				edit: false,
				type: enumType
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-wikidata-enum' ).exists() ).toBe( true );
	} );

	it( 'renders select in edit mode', () => {
		const wrapper = shallowMount( WikidataEnum, {
			props: {
				rowId: 1,
				edit: true,
				type: enumType
			}
		} );
		expect( wrapper.findComponent( { name: 'cdx-select' } ).exists() ).toBe( true );
	} );

	it( 'emits set-value event when selecting an enum value', async () => {
		const wrapper = shallowMount( WikidataEnum, {
			props: {
				rowId: 1,
				edit: true,
				type: enumType
			}
		} );
		const select = wrapper.findComponent( { name: 'cdx-select' } );
		select.vm.$emit( 'update:selected', 'Q222222' );
		await wrapper.vm.$nextTick();
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
		const wrapper = shallowMount( WikidataEnum, {
			props: {
				rowId: 1,
				edit: true,
				type: enumType
			}
		} );
		const select = wrapper.findComponent( { name: 'cdx-select' } );
		expect( select.props( 'menuItems' ) ).toEqual( [
			{ label: 'Label for Q111111', value: 'Q111111' },
			{ label: 'Label for Q222222', value: 'Q222222' },
			{ label: 'Label for Q333333', value: 'Q333333' }
		] );
	} );

	it( 'fetches entities on mount and when wikidataIds change', async () => {
		const wrapper = shallowMount( WikidataEnum, {
			props: {
				rowId: 1,
				edit: true,
				type: enumType
			}
		} );
		expect( store.fetchWikidataEntitiesByType ).toHaveBeenCalledWith( { type: entityType, ids: wikidataIds } );

		// Simulate change in wikidataIds
		const newType = 'Z222222';
		const newIds = [ 'Q111111', 'Q222222', 'Q333333', 'Q444444' ];
		store.getTypeOfWikidataEnum.mockReturnValue( entityType );
		store.getReferencesIdsOfWikidataEnum.mockReturnValue( newIds );

		await wrapper.setProps( { type: newType } );
		await wrapper.vm.$nextTick();

		expect( store.fetchWikidataEntitiesByType ).toHaveBeenCalledWith( { type: entityType, ids: newIds } );
	} );
} );
