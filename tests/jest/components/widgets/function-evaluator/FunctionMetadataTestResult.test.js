/*!
 * WikiLambda unit test suite for the FunctionMetadataTestResult component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const { canonicalToHybrid } = require( '../../../../../resources/ext.wikilambda.app/utils/schemata.js' );
const FunctionMetadataTestResult = require(
	'../../../../../resources/ext.wikilambda.app/components/widgets/function-evaluator/FunctionMetadataTestResult.vue'
);

describe( 'FunctionMetadataTestResult', () => {
	function render( props = {} ) {
		return shallowMount( FunctionMetadataTestResult, {
			props: {
				value: 'ok',
				...props
			}
		} );
	}

	it( 'renders a string value and no toggle when value is a string', () => {
		const wrapper = render( { value: 'hello' } );

		expect( wrapper.vm.isZObject ).toBe( false );
		expect( wrapper.find( '.ext-wikilambda-app-function-metadata-test-result__string' ).text() )
			.toBe( 'hello' );
		expect( wrapper.find( '.ext-wikilambda-app-function-metadata-test-result__toggle' ).exists() )
			.toBe( false );
	} );

	it( 'renders zobject view by default and computes a hybrid value', () => {
		// Canonical Z6 in object form; canonicalToHybrid should return a hybrid object (no mocking).
		const value = { Z1K1: 'Z6', Z6K1: 'hello' };
		const wrapper = render( { value } );

		expect( wrapper.vm.isZObject ).toBe( true );
		expect( wrapper.vm.zobjectValue ).toEqual( canonicalToHybrid( value ) );
		expect( wrapper.find( '.ext-wikilambda-app-function-metadata-test-result__zobject' ).exists() )
			.toBe( true );
		expect( wrapper.find( 'wl-z-object-key-value-stub' ).exists() ).toBe( true );
		expect( wrapper.find( '.ext-wikilambda-app-function-metadata-test-result__toggle' ).exists() )
			.toBe( true );
	} );

	it( 'renders empty string values as non-zobjects (covers falsy value branch)', () => {
		const wrapper = render( { value: '' } );

		expect( wrapper.vm.isZObject ).toBeFalsy();
		expect( wrapper.find( '.ext-wikilambda-app-function-metadata-test-result__toggle' ).exists() )
			.toBe( false );
		expect( wrapper.find( '.ext-wikilambda-app-function-metadata-test-result__string' ).text() )
			.toBe( '' );
	} );

	it( 'shows raw JSON view when toggled on for zobject values', async () => {
		const value = { Z1K1: 'Z6', Z6K1: 'hello' };
		const wrapper = render( { value } );

		expect( wrapper.find( '[data-testid="code-editor"]' ).exists() ).toBe( false );
		wrapper.vm.showRawJson = true;

		await waitFor( () => expect( wrapper.find( '[data-testid="code-editor"]' ).exists() ).toBe( true ) );
		expect( wrapper.find( 'code-editor-stub' ).exists() ).toBe( true );
		expect( wrapper.vm.stringValue ).toContain( '"Z1K1"' );
	} );

	it( 'uses keyString to build keyPath and data-testid, and toggles rendered class', async () => {
		const value = { Z1K1: 'Z6', Z6K1: 'hello' };
		const wrapper = render( { value, keyString: 'expected' } );

		expect( wrapper.attributes( 'data-testid' ) ).toBe( 'function-metadata-test-result-expected' );
		expect( wrapper.vm.keyPath ).toBe( 'metadata.expected.value' );
		expect( wrapper.classes() ).toContain( 'ext-wikilambda-app-function-metadata-test-result--rendered' );

		wrapper.vm.showRawJson = true;

		await waitFor( () => expect( wrapper.classes() ).not.toContain( 'ext-wikilambda-app-function-metadata-test-result--rendered' ) );
	} );

} );
