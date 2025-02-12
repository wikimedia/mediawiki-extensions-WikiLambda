/*!
 * WikiLambda unit test suite for FunctionEvaluator Widget.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const ClipboardManager = require( '../../../../resources/ext.wikilambda.app/components/base/ClipboardManager.vue' );

describe( 'ClipboardManager', () => {
	let wrapper;

	beforeEach( () => {

		// Mock window.addEventListener
		window.addEventListener = jest.fn();
		window.removeEventListener = jest.fn();

		navigator.clipboard = {
			writeText: jest.fn()
		};

		wrapper = shallowMount( ClipboardManager, {
			propsData: {
				classNames: [ 'test-class' ]
			}
		} );

	} );

	afterEach( () => {
		// Clean up wrapper after each test
		wrapper.unmount();
	} );

	it( 'sets data-copied attribute and innerText on displayCopiedMessage call', async () => {
		const mockElement = document.createElement( 'div' );
		wrapper.vm.displayCopiedMessage( mockElement );
		expect( mockElement.getAttribute( 'data-copied' ) ).toBe( 'true' );
		expect( mockElement.innerText ).toBe( wrapper.vm.getCopiedText );
	} );

	it( 'removes data-copied attribute and sets innerText on clearCopiedMessage call', async () => {
		const mockElement = document.createElement( 'div' );
		const value = 'Original Value';
		wrapper.vm.clearCopiedMessage( mockElement, value );

		expect( mockElement.hasAttribute( 'data-copied' ) ).toBe( false );
		expect( mockElement.innerText ).toBe( value );
	} );

	it( 'handles window click event to copy text', async () => {
		const mockElement = document.createElement( 'div' );
		mockElement.classList.add( 'test-class' );
		mockElement.textContent = 'Copy Me';
		document.body.appendChild( mockElement );

		jest.spyOn( wrapper.vm, 'copyToClipboard' );

		// Directly invoke handleWindowClick instead of simulating a click event
		await wrapper.vm.handleWindowClick( { target: mockElement } );

		// expect( wrapper.vm.copyToClipboard ).toHaveBeenCalledWith( 'Copy Me' );
		expect( wrapper.vm.copyToClipboard ).toHaveBeenCalledWith(
			'Copy Me',
			expect.any( Function ), // Matcher for displayCopiedMessage function
			expect.any( Function ) // Matcher for clearCopiedMessage function
		);

		expect( navigator.clipboard.writeText ).toHaveBeenCalledWith( 'Copy Me' );
		expect( mockElement.getAttribute( 'data-copied' ) ).toBe( 'true' );

		document.body.removeChild( mockElement );
	} );

	it( 'does not copy text if clicked element does not match classNames', async () => {
		const mockElement = document.createElement( 'div' );
		mockElement.textContent = 'Do Not Copy Me';
		document.body.appendChild( mockElement );

		// Directly invoke handleWindowClick instead of simulating a click event
		await wrapper.vm.handleWindowClick( { target: mockElement } );

		expect( navigator.clipboard.writeText ).not.toHaveBeenCalled();
		expect( mockElement.getAttribute( 'data-copied' ) ).toBeNull();

		document.body.removeChild( mockElement );
	} );

	it( 'does not copy any text if no classNames are set as props', async () => {
		const wrapperWithoutClasses = shallowMount( ClipboardManager );

		const mockElement = document.createElement( 'div' );
		mockElement.textContent = 'Do Not Copy Me';
		document.body.appendChild( mockElement );

		// Directly invoke handleWindowClick instead of simulating a click event
		await wrapperWithoutClasses.vm.handleWindowClick( { target: mockElement } );

		expect( navigator.clipboard.writeText ).not.toHaveBeenCalled();
		expect( mockElement.getAttribute( 'data-copied' ) ).toBeNull();

		document.body.removeChild( mockElement );
	} );

	it( 'attaches click event listener on mount', () => {
		// Expect window.addEventListener to be called with 'click' event and handleWindowClick function
		expect( global.window.addEventListener ).toHaveBeenCalledWith( 'click', wrapper.vm.handleWindowClick );
	} );

	it( 'removes click event listener on unmount', () => {
		// Unmount the component
		wrapper.unmount();

		// Expect window.removeEventListener to be called with 'click' event and handleWindowClick function
		expect( global.window.removeEventListener ).toHaveBeenCalledWith( 'click', wrapper.vm.handleWindowClick );
	} );
} );
