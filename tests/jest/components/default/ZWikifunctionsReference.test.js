/*!
 * WikiLambda unit test suite for the Wikifunctions object reference component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const { createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ZWikifunctionsReference = require( '../../../../resources/ext.wikilambda.app/components/types/ZWikifunctionsReference.vue' );
const wikifunctionsIconSvg = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/wikifunctionsIconSvg.js' );

const keyPath = 'main.Z2K2.Z20K2.Z40327K2';

const objectValueWithZid = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z96' },
	Z96K1: { Z1K1: 'Z6', Z6K1: 'Z802' }
};

const objectValueEmpty = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z96' },
	Z96K1: { Z1K1: 'Z6', Z6K1: '' }
};

const objectValueInvalid = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z96' },
	Z96K1: { Z1K1: 'Z6', Z6K1: 'not a ZID' }
};

const objectValueFunctionCall = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z96' },
	Z96K1: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
		Z7K1: { Z1K1: 'Z9', Z9K1: 'Z28231' },
		Z28231K1: { Z1K1: 'Z9', Z9K1: 'Z801' }
	}
};

describe( 'ZWikifunctionsReference', () => {
	let store;

	/**
	 * Helper function to render the ZWikifunctionsReference component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @return {Object} Mounted wrapper
	 */
	function renderWikifunctionsReference( props = {} ) {
		const defaultProps = {
			keyPath,
			objectValue: objectValueWithZid,
			edit: false
		};
		return shallowMount( ZWikifunctionsReference, { props: { ...defaultProps, ...props } } );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getLabelData = createLabelDataMock( { Z802: 'If' } );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderWikifunctionsReference();
		expect( wrapper.find( '.ext-wikilambda-app-wikifunctions-reference' ).exists() ).toBe( true );
	} );

	describe( 'in view mode', () => {
		it( 'renders the logo and a link to the referenced object', () => {
			const wrapper = renderWikifunctionsReference();

			const icon = wrapper.findComponent( { name: 'cdx-icon' } );
			expect( icon.props( 'icon' ) ).toBe( wikifunctionsIconSvg );

			const link = wrapper.find( '.ext-wikilambda-app-wikifunctions-reference__link' );
			expect( link.attributes( 'href' ) ).toBe( '/view/en/Z802' );
			expect( link.attributes( 'lang' ) ).toBe( 'en' );
			expect( link.text() ).toBe( 'If' );
		} );

		it( 'renders the value without a link when it is not a valid ZID', () => {
			const wrapper = renderWikifunctionsReference( { objectValue: objectValueInvalid } );

			expect( wrapper.find( '.ext-wikilambda-app-wikifunctions-reference__link' ).exists() ).toBe( false );
			expect( wrapper.find( '.ext-wikilambda-app-wikifunctions-reference__unknown' ).text() ).toBe( 'not a ZID' );
		} );

		it( 'renders a placeholder when the value is empty', () => {
			const wrapper = renderWikifunctionsReference( { objectValue: objectValueEmpty } );

			expect( wrapper.find( '.ext-wikilambda-app-wikifunctions-reference__empty' ).text() )
				.toBe( 'No object selected' );
		} );

		it( 'falls back to z-object-to-string when the ZID is returned by a function call', () => {
			const wrapper = renderWikifunctionsReference( { objectValue: objectValueFunctionCall } );

			const objectToString = wrapper.findComponent( { name: 'wl-z-object-to-string' } );
			expect( objectToString.exists() ).toBe( true );
			expect( objectToString.props( 'objectValue' ) ).toEqual( objectValueFunctionCall );
			expect( wrapper.find( '.ext-wikilambda-app-wikifunctions-reference__read' ).exists() ).toBe( false );
		} );

		it( 'emits expand when the fallback asks to expand', () => {
			const wrapper = renderWikifunctionsReference( { objectValue: objectValueFunctionCall } );

			wrapper.findComponent( { name: 'wl-z-object-to-string' } ).vm.$emit( 'expand' );
			expect( wrapper.emitted( 'expand' )[ 0 ] ).toEqual( [ true ] );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders the object selector with the logo and the selected ZID', () => {
			const wrapper = renderWikifunctionsReference( { edit: true, disabled: true } );

			const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
			expect( selector.props( 'selectedZid' ) ).toBe( 'Z802' );
			expect( selector.props( 'icon' ) ).toBe( wikifunctionsIconSvg );
			expect( selector.props( 'placeholder' ) ).toBe( 'Select Wikifunctions object' );
			expect( selector.props( 'disabled' ) ).toBe( true );
			expect( selector.props( 'type' ) ).toBeUndefined();
		} );

		it( 'sets the selected ZID as a string', () => {
			const wrapper = renderWikifunctionsReference( { edit: true, objectValue: objectValueEmpty } );

			wrapper.findComponent( { name: 'wl-z-object-selector' } ).vm.$emit( 'select-item', 'Z14310' );
			expect( wrapper.emitted( 'set-value' )[ 0 ] ).toEqual( [ {
				keyPath: [ Constants.Z_WIKIFUNCTIONS_REFERENCE_ID, Constants.Z_STRING_VALUE ],
				value: 'Z14310'
			} ] );
		} );

		it( 'falls back to z-object-to-string when the ZID is returned by a function call', () => {
			const wrapper = renderWikifunctionsReference( { edit: true, objectValue: objectValueFunctionCall } );

			expect( wrapper.findComponent( { name: 'wl-z-object-selector' } ).exists() ).toBe( false );
			expect( wrapper.findComponent( { name: 'wl-z-object-to-string' } ).exists() ).toBe( true );
		} );
	} );

	describe( 'label fetching', () => {
		it( 'fetches the label of the referenced object', () => {
			renderWikifunctionsReference();
			expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z802' ] } );
		} );

		it( 'does not fetch when the value is not a valid ZID', () => {
			renderWikifunctionsReference( { objectValue: objectValueInvalid } );
			renderWikifunctionsReference( { objectValue: objectValueEmpty } );
			renderWikifunctionsReference( { objectValue: objectValueFunctionCall } );
			expect( store.fetchZids ).not.toHaveBeenCalled();
		} );

		it( 'fetches the label again when the referenced ZID changes', async () => {
			const wrapper = renderWikifunctionsReference( { objectValue: objectValueEmpty } );
			expect( store.fetchZids ).not.toHaveBeenCalled();

			await wrapper.setProps( { objectValue: objectValueWithZid } );
			expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z802' ] } );
		} );
	} );
} );
