/*!
 * WikiLambda unit test suite for the shareUrlMixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { mockWindowLocation, restoreWindowLocation } = require( '../fixtures/location.js' );
const shareUrlMixin = require( '../../../resources/ext.wikilambda.app/mixins/shareUrlMixin.js' );

describe( 'shareUrlMixin', () => {
	let wrapper;

	// Create a test component that uses the mixin
	const TestComponent = {
		template: '<div></div>',
		mixins: [ shareUrlMixin ]
	};

	beforeEach( () => {
		jest.clearAllMocks();
	} );

	afterEach( () => {
		if ( wrapper ) {
			wrapper.unmount();
		}
		restoreWindowLocation();
	} );

	describe( 'loadFunctionCallFromUrl', () => {
		it( 'should do nothing if no call parameter is present', () => {
			mockWindowLocation( 'http://example.com/wiki/Special:RunFunction' );
			wrapper = shallowMount( TestComponent );

			wrapper.vm.loadFunctionCallFromUrl();

			expect( wrapper.vm.sharedFunctionCall ).toBeNull();
			expect( wrapper.vm.shareUrlError ).toBeNull();
		} );

		it( 'should parse and set valid function call from URL', () => {
			const functionCall = {
				Z1K1: 'Z7',
				Z7K1: 'Z801',
				Z801K1: 'hello'
			};
			const encodedJson = encodeURIComponent( JSON.stringify( functionCall ) );
			mockWindowLocation( `http://example.com/wiki/Special:RunFunction?call=${ encodedJson }` );

			wrapper = shallowMount( TestComponent );
			wrapper.vm.loadFunctionCallFromUrl();

			expect( wrapper.vm.sharedFunctionCall ).toEqual( functionCall );
			expect( wrapper.vm.shareUrlError ).toBeNull();
		} );

		it( 'should set error for invalid JSON', () => {
			mockWindowLocation( 'http://example.com/wiki/Special:RunFunction?call=invalid-json' );

			wrapper = shallowMount( TestComponent );
			wrapper.vm.loadFunctionCallFromUrl();

			expect( wrapper.vm.sharedFunctionCall ).toBeNull();
			expect( wrapper.vm.shareUrlError ).toContain( 'Cannot load function call: Invalid JSON format in URL parameter.' );
		} );

		it( 'should set error for non-Z7 object', () => {
			const notFunctionCall = {
				Z1K1: 'Z6',
				Z6K1: 'just a string'
			};
			const encodedJson = encodeURIComponent( JSON.stringify( notFunctionCall ) );
			mockWindowLocation( `http://example.com/wiki/Special:RunFunction?call=${ encodedJson }` );

			wrapper = shallowMount( TestComponent );
			wrapper.vm.loadFunctionCallFromUrl();

			expect( wrapper.vm.sharedFunctionCall ).toBeNull();
			expect( wrapper.vm.shareUrlError ).toContain( 'Cannot load function call: Invalid ZObject structure in URL parameter.' );
		} );

		it( 'should set error for function call without Z7K1', () => {
			const invalidFunctionCall = {
				Z1K1: 'Z7'
				// Missing Z7K1
			};
			const encodedJson = encodeURIComponent( JSON.stringify( invalidFunctionCall ) );
			mockWindowLocation( `http://example.com/wiki/Special:RunFunction?call=${ encodedJson }` );

			wrapper = shallowMount( TestComponent );
			wrapper.vm.loadFunctionCallFromUrl();

			expect( wrapper.vm.sharedFunctionCall ).toBeNull();
			expect( wrapper.vm.shareUrlError ).toContain( 'Cannot load function call: Invalid ZObject structure in URL parameter.' );
		} );

		it( 'should validate against expectedFunctionZid when provided', () => {
			const functionCall = {
				Z1K1: 'Z7',
				Z7K1: 'Z801',
				Z801K1: 'test'
			};
			const encodedJson = encodeURIComponent( JSON.stringify( functionCall ) );
			mockWindowLocation( `http://example.com/wiki/Z866?call=${ encodedJson }` );

			wrapper = shallowMount( TestComponent );
			wrapper.vm.loadFunctionCallFromUrl( 'Z866' ); // Expected Z866, but got Z801

			expect( wrapper.vm.sharedFunctionCall ).toBeNull();
			expect( wrapper.vm.shareUrlError ).toContain( 'Cannot load function call: Invalid ZObject structure in URL parameter.' );
		} );

		it( 'should accept function call when expectedFunctionZid matches', () => {
			const functionCall = {
				Z1K1: 'Z7',
				Z7K1: 'Z801',
				Z801K1: 'test'
			};
			const encodedJson = encodeURIComponent( JSON.stringify( functionCall ) );
			mockWindowLocation( `http://example.com/wiki/Z801?call=${ encodedJson }` );

			wrapper = shallowMount( TestComponent );
			wrapper.vm.loadFunctionCallFromUrl( 'Z801' ); // Matches!

			expect( wrapper.vm.sharedFunctionCall ).toEqual( functionCall );
			expect( wrapper.vm.shareUrlError ).toBeNull();
		} );

		it( 'should handle URL-encoded special characters correctly', () => {
			const functionCall = {
				Z1K1: 'Z7',
				Z7K1: 'Z801',
				Z801K1: 'hello & world = test'
			};
			const encodedJson = encodeURIComponent( JSON.stringify( functionCall ) );
			mockWindowLocation( `http://example.com/wiki/Special:RunFunction?call=${ encodedJson }` );

			wrapper = shallowMount( TestComponent );
			wrapper.vm.loadFunctionCallFromUrl();

			expect( wrapper.vm.sharedFunctionCall ).toEqual( functionCall );
			expect( wrapper.vm.shareUrlError ).toBeNull();
		} );
	} );
} );
