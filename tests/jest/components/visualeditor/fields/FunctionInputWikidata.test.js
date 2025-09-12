'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const FunctionInputWikidata = require( '../../../../../resources/ext.wikilambda.app/components/visualeditor/fields/FunctionInputWikidata.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const ErrorData = require( '../../../../../resources/ext.wikilambda.app/store/classes/ErrorData.js' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );

describe( 'FunctionInputWikidata', () => {
	const entityType = Constants.Z_WIKIDATA_ITEM;
	const entityId = 'Q123';
	const label = 'Test Label';
	const entityData = { id: entityId, label };
	const errorLexeme = new ErrorData( 'wikilambda-visualeditor-wikifunctionscall-error-wikidata-lexeme', [], null, 'error' );
	const errorItem = new ErrorData( 'wikilambda-visualeditor-wikifunctionscall-error-wikidata-item', [], null, 'error' );

	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getWikidataEntityLabelData = jest.fn().mockReturnValue( { label } );
		store.getWikidataEntityDataAsync = jest.fn().mockResolvedValue( entityData );
		store.fetchWikidataEntitiesByType = jest.fn().mockResolvedValue();
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionInputWikidata, {
			props: { inputType: entityType, value: entityId }
		} );

		// The entity selector should be present
		expect( wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } ).exists() ).toBe( true );
	} );

	it( 'validates on mount with non-empty value', async () => {
		const wrapper = shallowMount( FunctionInputWikidata, {
			props: { inputType: entityType, value: entityId }
		} );

		// Wait for validation to finish
		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );

		// First, emits invalid (while validating), then emits valid
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: true } ] );
	} );

	it( 'validates on mount with empty value (lexemes should not be empty)', async () => {
		const wrapper = shallowMount( FunctionInputWikidata, {
			props: { inputType: Constants.Z_WIKIDATA_LEXEME, value: '' }
		} );

		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ {
			isValid: false,
			error: errorLexeme
		} ] );
	} );

	it( 'validates on mount with empty value (items can be empty)', async () => {
		const wrapper = shallowMount( FunctionInputWikidata, {
			props: { inputType: Constants.Z_WIKIDATA_ITEM, value: '' }
		} );

		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true } ] );
	} );

	it( 'emits input, update and validate events when a value is selected', async () => {
		const wrapper = shallowMount( FunctionInputWikidata, {
			props: { inputType: entityType, value: '' }
		} );
		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );

		// Should emit valid for the initial empty value
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true } ] );

		// ACT: Simulate user selecting an entity
		wrapper.vm.onSelect( entityId );

		// Should emit input event
		await waitFor( () => expect( wrapper.emitted().input ).toBeTruthy() );

		// Progress indicator should be visible while validating
		expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( true );

		// Should emit validate (invalid while validating)
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: false } ] );

		// Wait for validation to finish (progress indicator gone)
		await waitFor( () => expect( wrapper.findComponent( { name: 'cdx-progress-indicator' } ).exists() ).toBe( false ) );

		// Should emit update event after successful validation
		expect( wrapper.emitted().update ).toBeTruthy();
		// Should emit validate (valid)
		expect( wrapper.emitted().validate[ 2 ] ).toEqual( [ { isValid: true } ] );
	} );

	it( 'emits update event after fetch fallback when a value is selected', async () => {
		store.getWikidataEntityDataAsync = jest.fn()
			.mockRejectedValueOnce( new Error( 'Not found' ) )
			.mockResolvedValueOnce( entityData );

		const wrapper = shallowMount( FunctionInputWikidata, {
			props: { inputType: entityType, value: '' }
		} );

		// Wait for any initial validation to finish
		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );

		// ACT:  Simulate user selecting an entity, which triggers validateEntity with emitUpdate = true
		wrapper.vm.onSelect( entityId );

		// Wait for the update event to be emitted after the fetch fallback
		await waitFor( () => expect( wrapper.emitted().update ).toBeTruthy() );

		// Ensure the store's fetch method was called with the correct arguments
		expect( store.fetchWikidataEntitiesByType ).toHaveBeenCalledWith( { type: entityType, ids: [ entityId ] } );
	} );

	it( 'emits validate event with isValid false for invalid entity', async () => {
		store.getWikidataEntityDataAsync = jest.fn().mockRejectedValue( new Error( 'Not found' ) );

		const wrapper = shallowMount( FunctionInputWikidata, {
			props: { inputType: entityType, value: 'Q999' }
		} );

		// Wait for validation to finish
		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );

		// Should emit invalid (while validating)
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );
		// Should emit invalid with error message after fetch fails
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: false, error: errorItem } ] );
	} );

	it( 'tries to fetch entity if not found, then validates again', async () => {
		store.getWikidataEntityDataAsync = jest.fn()
			.mockRejectedValueOnce( new Error( 'Not found' ) )
			.mockResolvedValueOnce( entityData );
		const wrapper = shallowMount( FunctionInputWikidata, {
			props: { inputType: entityType, value: entityId }
		} );

		// Wait for validation to finish
		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );

		// Should emit invalid (while validating)
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );

		// Should have called fetch with correct arguments
		expect( store.fetchWikidataEntitiesByType ).toHaveBeenCalledWith( { type: entityType, ids: [ entityId ] } );
		// Should emit valid after successful fetch
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: true } ] );
	} );
} );
