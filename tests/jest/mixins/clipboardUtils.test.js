/*!
 * WikiLambda unit test suite for the utilsMixins mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const clipboardUtils = require( '../../../resources/ext.wikilambda.app/mixins/clipboardUtils.js' );

describe( 'clipboardUtils', () => {
	let wrapper, copySpy, clearSpy;

	beforeEach( () => {
		// Mocking a Vue component to test the mixin
		const TestComponent = {
			template: '<div></div>',
			mixins: [ clipboardUtils ]
		};
		wrapper = shallowMount( TestComponent );

		navigator.clipboard = {
			writeText: jest.fn()
		};
		copySpy = jest.fn();
		clearSpy = jest.fn();

		// Enable fake timers before each test
		jest.useFakeTimers();
	} );

	afterEach( () => {
		// Restore the original timers after each test
		jest.useRealTimers();
	} );

	it( 'copies value to clipboard and adds to itemsCopied', async () => {
		const value = 'Test Value';

		await wrapper.vm.copyToClipboard( value );

		expect( navigator.clipboard.writeText ).toHaveBeenCalledWith( value );
		expect( wrapper.vm.itemsCopied ).toContain( value );
	} );

	it( 'clears the copied message after a delay', async () => {
		const value = 'Test Value';

		await wrapper.vm.copyToClipboard( value );

		expect( wrapper.vm.itemsCopied ).toContain( value );

		jest.advanceTimersByTime( 2000 ); // Fast-forward timer

		expect( wrapper.vm.itemsCopied ).not.toContain( value );
	} );

	it( 'shows copied message if value is in itemsCopied', () => {
		const value = 'Test Value';

		wrapper.setData( { itemsCopied: [ value ] } );

		expect( wrapper.vm.showValueOrCopiedMessage( value ) ).toBe( 'Copied!' );
	} );

	it( 'shows original value if value is not in itemsCopied', () => {
		const value = 'Another Value';

		wrapper.setData( { itemsCopied: [ 'Test Value' ] } );

		expect( wrapper.vm.showValueOrCopiedMessage( value ) ).toBe( value );
	} );

	it( 'calls custom copyFunction when provided', async () => {
		const value = 'Test Value';

		await wrapper.vm.copyToClipboard( value, copySpy, clearSpy );

		expect( navigator.clipboard.writeText ).toHaveBeenCalledWith( value );
		expect( copySpy ).toHaveBeenCalled();
	} );

	it( 'calls custom clearFunction after delay when provided', async () => {
		const value = 'Test Value';

		await wrapper.vm.copyToClipboard( value, copySpy, clearSpy );

		jest.advanceTimersByTime( 2000 ); // Fast-forward timer

		expect( clearSpy ).toHaveBeenCalled();
	} );
} );
