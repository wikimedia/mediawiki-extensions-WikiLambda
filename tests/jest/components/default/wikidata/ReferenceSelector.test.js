/*!
 * WikiLambda unit test suite for the Wikidata Reference Selector component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const ReferenceSelector = require( '../../../../../resources/ext.wikilambda.app/components/types/wikidata/ReferenceSelector.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'ReferenceSelector', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.fetchZids = jest.fn().mockResolvedValue();
		store.getStoredObject = jest.fn( ( zid ) => {
			const referenceData = {
				[ Constants.Z_WIKIDATA_REFERENCE_ITEM ]: {},
				[ Constants.Z_WIKIDATA_REFERENCE_PROPERTY ]: {},
				[ Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM ]: {},
				[ Constants.Z_WIKIDATA_REFERENCE_LEXEME ]: {},
				[ Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE ]: {}
			};
			return referenceData[ zid ] || null;
		} );
		store.getLabelData = jest.fn( ( zid ) => {
			const labelData = {
				[ Constants.Z_WIKIDATA_REFERENCE_ITEM ]: { label: 'Wikidata item reference' },
				[ Constants.Z_WIKIDATA_REFERENCE_PROPERTY ]: { label: 'Wikidata property reference' },
				[ Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM ]: { label: 'Wikidata lexeme form reference' },
				[ Constants.Z_WIKIDATA_REFERENCE_LEXEME ]: { label: 'Wikidata lexeme reference' },
				[ Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE ]: { label: 'Wikidata lexeme sense reference' }
			};
			return labelData[ zid ] || { label: '' };
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( ReferenceSelector, {
			props: {
				selectedZid: '',
				disabled: false
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-wikidata-reference-selector' ).exists() ).toBe( true );
	} );

	it( 'disables the select when disabled prop is true', () => {
		const wrapper = shallowMount( ReferenceSelector, {
			props: {
				selectedZid: '',
				disabled: true
			}
		} );
		const select = wrapper.findComponent( { name: 'cdx-select' } );
		expect( select.props( 'disabled' ) ).toBe( true );
	} );

	it( 'fetches Zids on mount', () => {
		shallowMount( ReferenceSelector, {
			props: {
				selectedZid: '',
				disabled: false
			}
		} );
		expect( store.fetchZids ).toHaveBeenCalledWith( { zids: Object.values( Constants.WIKIDATA_REFERENCE_TYPES ) } );
	} );

	it( 'emits select-item event when a value is selected', async () => {
		const wrapper = shallowMount( ReferenceSelector, {
			props: {
				selectedZid: '',
				disabled: false
			}
		} );
		const select = wrapper.findComponent( { name: 'cdx-select' } );
		select.vm.$emit( 'update:selected', Constants.Z_WIKIDATA_REFERENCE_ITEM );
		expect( wrapper.emitted() ).toHaveProperty( 'select-item', [ [ Constants.Z_WIKIDATA_REFERENCE_ITEM ] ] );
	} );

	it( 'does not emit select-item event when the same value is selected', async () => {
		const wrapper = shallowMount( ReferenceSelector, {
			props: {
				selectedZid: Constants.Z_WIKIDATA_REFERENCE_ITEM,
				disabled: false
			}
		} );
		const select = wrapper.findComponent( { name: 'cdx-select' } );
		select.vm.$emit( 'update:selected', Constants.Z_WIKIDATA_REFERENCE_ITEM );
		expect( wrapper.emitted() ).not.toHaveProperty( 'select-item' );
	} );

	it( 'displays the correct menu items', () => {
		const wrapper = shallowMount( ReferenceSelector, {
			props: {
				selectedZid: '',
				disabled: false
			}
		} );
		const select = wrapper.findComponent( { name: 'cdx-select' } );
		expect( select.props( 'menuItems' ) ).toEqual( [
			{ label: 'Wikidata item reference', value: Constants.Z_WIKIDATA_REFERENCE_ITEM },
			{ label: 'Wikidata property reference', value: Constants.Z_WIKIDATA_REFERENCE_PROPERTY },
			{ label: 'Wikidata lexeme reference', value: Constants.Z_WIKIDATA_REFERENCE_LEXEME },
			{ label: 'Wikidata lexeme form reference', value: Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM },
			{ label: 'Wikidata lexeme sense reference', value: Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE }
		] );
	} );
} );
