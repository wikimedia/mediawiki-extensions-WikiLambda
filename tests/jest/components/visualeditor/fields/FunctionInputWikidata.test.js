'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const FunctionInputWikidata = require( '../../../../../resources/ext.wikilambda.app/components/visualeditor/fields/FunctionInputWikidata.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const ErrorData = require( '../../../../../resources/ext.wikilambda.app/store/classes/ErrorData.js' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );

describe( 'FunctionInputWikidata', () => {
	const entityType = Constants.Z_WIKIDATA_ITEM;
	const entityId = 'Q123';
	const label = 'Test Label';
	const entityData = { id: entityId, label };
	const errorLexeme = new ErrorData( 'wikilambda-visualeditor-wikifunctionscall-error-wikidata-lexeme', [], null, 'error' );
	const errorItem = new ErrorData( 'wikilambda-visualeditor-wikifunctionscall-error-wikidata-item', [], null, 'error' );

	let store;

	// Helper function to render FunctionInputWikidata with common configuration
	const renderFunctionInputWikidata = ( props = {}, options = {} ) => {
		const defaultProps = {
			inputType: entityType,
			value: entityId
		};
		const defaultOptions = {
			global: {
				stubs: {
					CdxField: false,
					CdxLabel: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( FunctionInputWikidata, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	};

	beforeEach( () => {
		store = useMainStore();
		store.getWikidataEntityLabelData = createGettersWithFunctionsMock( { label } );
		store.getWikidataEntityDataAsync = jest.fn().mockResolvedValue( entityData );
		store.fetchWikidataEntitiesByType = jest.fn().mockResolvedValue();
		store.getDefaultValueForType = createGettersWithFunctionsMock( entityId );
		store.hasDefaultValueForType = createGettersWithFunctionsMock( false );
		// Mock isNewParameterSetup to false for tests that expect auto-checking behavior
		store.isNewParameterSetup = false;
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionInputWikidata();

		// The entity selector should be present
		expect( wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } ).exists() ).toBe( true );
	} );

	it( 'validates on mount with non-empty value', async () => {
		const wrapper = renderFunctionInputWikidata();

		// Wait for validation to finish
		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );

		// First, emits invalid (while validating), then emits valid
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: true } ] );
	} );

	it( 'validates on mount with empty value (lexemes should not be empty)', async () => {
		const wrapper = renderFunctionInputWikidata( {
			inputType: Constants.Z_WIKIDATA_LEXEME,
			value: ''
		} );

		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ {
			isValid: false,
			error: errorLexeme
		} ] );
	} );

	it( 'validates on mount with empty value (items can be empty)', async () => {
		const wrapper = renderFunctionInputWikidata( {
			inputType: Constants.Z_WIKIDATA_ITEM,
			value: ''
		} );

		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true } ] );
	} );

	it( 'emits input, update and validate events when a value is selected', async () => {
		const wrapper = renderFunctionInputWikidata( {
			value: ''
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

		const wrapper = renderFunctionInputWikidata( {
			value: ''
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

		const wrapper = renderFunctionInputWikidata( {
			value: 'Q999'
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

		const wrapper = renderFunctionInputWikidata();

		// Wait for validation to finish
		await waitFor( () => expect( wrapper.vm.isValidating ).toBe( false ) );

		// Should emit invalid (while validating)
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false } ] );

		// Should have called fetch with correct arguments
		expect( store.fetchWikidataEntitiesByType ).toHaveBeenCalledWith( { type: entityType, ids: [ entityId ] } );
		// Should emit valid after successful fetch
		expect( wrapper.emitted().validate[ 1 ] ).toEqual( [ { isValid: true } ] );
	} );

	describe( 'default value functionality', () => {
		it( 'shows default value label as placeholder when shouldUseDefaultValue is true', () => {
			store.getWikidataEntityLabelData = createGettersWithFunctionsMock( { zid: entityId, label: 'Universe' } );

			const wrapper = renderFunctionInputWikidata( {
				inputType: entityType,
				shouldUseDefaultValue: true,
				defaultValue: entityId
			} );

			expect( wrapper.vm.placeholder ).toBe( 'Universe' );
		} );

		it( 'shows empty placeholder when shouldUseDefaultValue is false', () => {
			const wrapper = renderFunctionInputWikidata( {
				inputType: entityType,
				shouldUseDefaultValue: false
			} );

			expect( wrapper.vm.placeholder ).toBe( '' );
		} );
	} );

} );
