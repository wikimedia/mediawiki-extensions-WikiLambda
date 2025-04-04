'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const ExpandableDescription = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/ExpandableDescription.vue' );
const LabelData = require( '../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );

describe( 'ExpandableDescription', () => {
	let description;

	beforeEach( () => {
		description = new LabelData( 'Z123', 'Test description', 'Z1002', 'en' );
	} );

	it( 'renders the description text', () => {
		const wrapper = shallowMount( ExpandableDescription, {
			props: { description }
		} );

		expect( wrapper.find( '.ext-wikilambda-app-expandable-description__text' ).text() ).toBe( 'Test description' );
	} );

	it( 'toggles expanded state when button is clicked', async () => {
		const wrapper = shallowMount( ExpandableDescription, {
			props: { description }
		} );

		// Simulate the description being expandable
		await wrapper.setData( { isExpandable: true } );

		// Ensure the button is rendered
		expect( wrapper.find( '.ext-wikilambda-app-expandable-description__toggle-button' ).exists() ).toBe( true );

		const button = wrapper.find( '.ext-wikilambda-app-expandable-description__toggle-button' );
		expect( wrapper.vm.isExpanded ).toBe( false );

		await button.trigger( 'click' );
		expect( wrapper.vm.isExpanded ).toBe( true );

		await button.trigger( 'click' );
		expect( wrapper.vm.isExpanded ).toBe( false );
	} );

	it( 'checks clamping on mount', () => {
		// Spy on the checkClamped method before mounting
		const checkClampedSpy = jest.spyOn( ExpandableDescription.methods, 'checkClamped' );

		// Mount the component
		shallowMount( ExpandableDescription, {
			props: { description }
		} );

		// Assert that checkClamped was called
		expect( checkClampedSpy ).toHaveBeenCalled();
	} );

	it( 'updates isExpandable when description changes', async () => {
		const wrapper = shallowMount( ExpandableDescription, {
			props: { description }
		} );

		// Mock the checkClamped method
		const checkClampedSpy = jest.spyOn( wrapper.vm, 'checkClamped' );

		// Update the description prop
		await wrapper.setProps( {
			description: new LabelData( 'Z123', 'Updated description', 'Z1002', 'en' )
		} );

		expect( checkClampedSpy ).toHaveBeenCalled();
	} );
} );
