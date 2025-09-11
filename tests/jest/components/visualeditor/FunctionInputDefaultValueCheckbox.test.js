'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const FunctionInputDefaultValueCheckbox = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionInputDefaultValueCheckbox.vue' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );

describe( 'FunctionInputDefaultValueCheckbox', () => {
	const defaultProps = {
		inputType: Constants.Z_GREGORIAN_CALENDAR_DATE,
		isChecked: false
	};

	const globalStubs = { stubs: { CdxCheckbox: false } };

	const renderFunctionInputDefaultValueCheckbox = ( props = {} ) => shallowMount( FunctionInputDefaultValueCheckbox, {
		props: {
			...defaultProps,
			...props
		},
		global: globalStubs
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionInputDefaultValueCheckbox();
		expect( wrapper.find( '.ext-wikilambda-app-function-input-default-value-checkbox' ).exists() ).toBe( true );
		expect( wrapper.findComponent( { name: 'cdx-checkbox' } ).exists() ).toBe( true );
	} );

	it( 'emits update:isChecked when checkbox changes', () => {
		const wrapper = renderFunctionInputDefaultValueCheckbox();

		// Test the handleCheckboxChange method directly
		wrapper.vm.handleCheckboxChange( true );
		expect( wrapper.emitted( 'update:isChecked' ) ).toBeTruthy();
		expect( wrapper.emitted( 'update:isChecked' )[ 0 ] ).toEqual( [ true ] );
	} );

	it( 'returns correct label for date input type', () => {
		const wrapper = renderFunctionInputDefaultValueCheckbox( {
			inputType: Constants.Z_GREGORIAN_CALENDAR_DATE
		} );
		expect( wrapper.vm.checkboxLabel ).toBe( 'Use today\'s date and keep result up-to-date' );
	} );

	it( 'returns correct label for Wikidata item input type', () => {
		const wrapper = renderFunctionInputDefaultValueCheckbox( {
			inputType: Constants.Z_WIKIDATA_ITEM
		} );
		expect( wrapper.vm.checkboxLabel ).toBe( 'Use this page\'s default Wikidata item' );
	} );

	it( 'returns correct label for Wikidata reference item input type', () => {
		const wrapper = renderFunctionInputDefaultValueCheckbox( {
			inputType: Constants.Z_WIKIDATA_REFERENCE_ITEM
		} );
		expect( wrapper.vm.checkboxLabel ).toBe( 'Use this page\'s default Wikidata item' );
	} );

	it( 'returns correct label for natural language input type', () => {
		const wrapper = renderFunctionInputDefaultValueCheckbox( {
			inputType: Constants.Z_NATURAL_LANGUAGE
		} );
		expect( wrapper.vm.checkboxLabel ).toBe( 'Use this page\'s default language' );
	} );

	it( 'hides checkbox for unknown input type', () => {
		const wrapper = renderFunctionInputDefaultValueCheckbox( {
			inputType: 'Z_UNKNOWN_TYPE'
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-default-value-checkbox' ).exists() ).toBe( false );
	} );
} );
