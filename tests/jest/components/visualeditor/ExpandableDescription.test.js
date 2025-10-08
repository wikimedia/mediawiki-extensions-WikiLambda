'use strict';

const { mount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const ExpandableDescription = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/ExpandableDescription.vue' );
const LabelData = require( '../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );

function setWindowWidth( width ) {
	Object.defineProperty( window, 'innerWidth', { writable: true, configurable: true, value: width } );
	window.dispatchEvent( new Event( 'resize' ) );
}

function mockClamped( el, isClamped = true ) {
	Object.defineProperty( el, 'scrollHeight', { configurable: true, value: isClamped ? 200 : 100 } );
	Object.defineProperty( el, 'clientHeight', { configurable: true, value: 100 } );
}

describe( 'ExpandableDescription', () => {
	function renderExpandableDescription( props = {}, options = {} ) {
		const defaultProps = {
			description: new LabelData( 'Z123', 'Test description', 'Z1002', 'en' )
		};

		return mount( ExpandableDescription, {
			props: { ...defaultProps, ...props },
			...options
		} );
	}
	let description;

	beforeEach( () => {
		jest.useFakeTimers();
		description = new LabelData( 'Z123', 'Test description', 'Z1002', 'en' );
		setWindowWidth( 500 );
	} );

	afterAll( () => {
		jest.useRealTimers();
	} );

	it( 'renders the description text', () => {
		const wrapper = renderExpandableDescription( { description } );
		expect( wrapper.get( '.ext-wikilambda-app-expandable-description__text' ).text() ).toBe( 'Test description' );
	} );

	it( 'handles expandable behavior when text is clamped', async () => {
		const longDescription = new LabelData(
			'Z123',
			'This is a very long description that should definitely be clamped because it contains enough text to exceed the line clamp limit and trigger the expandable functionality. This text should be long enough to wrap to multiple lines and trigger the clamping behavior in the test environment.',
			'Z1002',
			'en'
		);

		const wrapper = renderExpandableDescription( { description: longDescription } );

		const textEl = wrapper.get( '.ext-wikilambda-app-expandable-description__text' ).element;
		mockClamped( textEl, true );

		// advance timers so checkClamped() runs after mount
		jest.advanceTimersByTime( 300 );
		await waitFor( () => expect( wrapper.find( '.ext-wikilambda-app-expandable-description__toggle-button' ).exists() ).toBe( true ) );

		const button = wrapper.get( '.ext-wikilambda-app-expandable-description__toggle-button' );
		expect( button.text() ).toContain( 'Read more' );

		await button.trigger( 'click' );
		await waitFor( () => expect( wrapper.get( '.ext-wikilambda-app-expandable-description__text' ).classes().includes( 'ext-wikilambda-app-expandable-description__text--expanded' ) ) );

		const textElement = wrapper.get( '.ext-wikilambda-app-expandable-description__text' );
		expect( textElement.classes() ).toContain( 'ext-wikilambda-app-expandable-description__text--expanded' );
		expect( button.text() ).toContain( 'Read less' );

		await button.trigger( 'click' );
		await waitFor( () => expect( wrapper.get( '.ext-wikilambda-app-expandable-description__text' ).classes().includes( 'ext-wikilambda-app-expandable-description__text--expanded' ) ) );

		expect( textElement.classes() ).not.toContain( 'ext-wikilambda-app-expandable-description__text--expanded' );
		expect( button.text() ).toContain( 'Read more' );
	} );

	it( 'does not show expand button when text is not clamped', async () => {
		const shortDescription = new LabelData( 'Z123', 'Short text', 'Z1002', 'en' );

		const wrapper = renderExpandableDescription( { description: shortDescription } );

		const textEl = wrapper.get( '.ext-wikilambda-app-expandable-description__text' ).element;
		mockClamped( textEl, false );

		jest.advanceTimersByTime( 300 );
		await waitFor( () => expect( wrapper.find( '.ext-wikilambda-app-expandable-description__toggle-button' ).exists() ).toBe( false ) );

	} );

	it( 'updates when description changes', async () => {
		const wrapper = renderExpandableDescription( { description } );

		expect( wrapper.get( '.ext-wikilambda-app-expandable-description__text' ).text() ).toBe( 'Test description' );

		const newDescription = new LabelData( 'Z123', 'Updated description', 'Z1002', 'en' );
		await wrapper.setProps( { description: newDescription } );

		jest.advanceTimersByTime( 20 );
		await waitFor( () => expect( wrapper.get( '.ext-wikilambda-app-expandable-description__text' ).text() ).toBe( 'Updated description' ) );

	} );

	it( 'applies correct language and direction attributes', () => {
		const arabicDescription = new LabelData( 'Z123', 'وصف باللغة العربية', 'Z1002', 'ar' );

		const wrapper = renderExpandableDescription( { description: arabicDescription } );

		const textElement = wrapper.get( '.ext-wikilambda-app-expandable-description__text' );
		expect( textElement.attributes( 'lang' ) ).toBe( 'ar' );
		expect( textElement.attributes( 'dir' ) ).toBeDefined();
	} );

	it( 'handles window resize events and recalculates clamping', async () => {
		const longDescription = new LabelData(
			'Z123',
			'This is a very long description that should definitely be clamped because it contains enough text to exceed the line clamp limit and trigger the expandable functionality',
			'Z1002',
			'en'
		);

		const wrapper = renderExpandableDescription( { description: longDescription } );

		const textEl = wrapper.get( '.ext-wikilambda-app-expandable-description__text' ).element;

		// Initially clamped
		mockClamped( textEl, true );
		jest.advanceTimersByTime( 300 );
		await waitFor( () => expect( wrapper.find( '.ext-wikilambda-app-expandable-description__toggle-button' ).exists() ).toBe( true ) );

		// Resize and unclamp
		mockClamped( textEl, false );
		setWindowWidth( 1200 );
		jest.advanceTimersByTime( 300 );
		await waitFor( () => expect( wrapper.find( '.ext-wikilambda-app-expandable-description__toggle-button' ).exists() ).toBe( false ) );

	} );
} );
