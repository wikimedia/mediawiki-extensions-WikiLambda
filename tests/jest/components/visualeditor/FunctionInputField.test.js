'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const FunctionInputField = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionInputField.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const LabelData = require( '../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );
const ErrorData = require( '../../../../resources/ext.wikilambda.app/store/classes/ErrorData.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );

describe( 'FunctionInputField', () => {
	const mockErrorData = new ErrorData( null, [], 'An error occurred', 'error' );
	let store;

	const defaultProps = {
		labelData: new LabelData( 'Z123K1', 'Test Label', 'Z1002', 'en' ),
		inputType: 'Z456',
		showValidation: true
	};

	const renderFunctionInputField = ( props = {}, options = {} ) => shallowMount( FunctionInputField, {
		props: {
			...defaultProps,
			...props
		},
		global: {
			stubs: {
				CdxField: false,
				CdxLabel: false,
				...options.stubs
			}
		}
	} );

	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock( { Z123: 'Test Label' } );
		store.isEnumType = createGettersWithFunctionsMock( false );
		store.hasParser = createGettersWithFunctionsMock( false );
		store.hasDefaultValueForType = createGettersWithFunctionsMock( false );
		store.getDefaultValueForType = createGettersWithFunctionsMock( '' );
		store.isNewParameterSetup = false;
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionInputField();
		expect( wrapper.find( '.ext-wikilambda-app-function-input-field' ).exists() ).toBe( true );
	} );

	it( 'displays the correct label', () => {
		const wrapper = renderFunctionInputField();
		expect( wrapper.find( 'span' ).text() ).toBe( 'Test Label' );
	} );

	it( 'passes correct props to child components', () => {
		store.getDefaultValueForType = createGettersWithFunctionsMock( 'default value' );
		const wrapper = renderFunctionInputField();
		const childComponent = wrapper.getComponent( { name: 'wl-function-input-string' } );
		expect( childComponent.props( 'shouldUseDefaultValue' ) ).toBe( false );
		expect( childComponent.props( 'defaultValue' ) ).toBe( 'default value' );
	} );

	it( 'forwards events from child components', () => {
		const wrapper = renderFunctionInputField( {
			inputType: 'Z6'
		} );

		const childComponent = wrapper.getComponent( { name: 'wl-function-input-string' } );

		// Test update event forwarding
		childComponent.vm.$emit( 'update', 'New value' );
		expect( wrapper.emitted().update[ 0 ] ).toEqual( [ 'New value' ] );

		// Test input event forwarding
		childComponent.vm.$emit( 'input', 'Updated value' );
		expect( wrapper.emitted()[ 'update:modelValue' ][ 0 ] ).toEqual( [ 'Updated value' ] );

		// Test loading events forwarding
		childComponent.vm.$emit( 'loading-start' );
		expect( wrapper.emitted()[ 'loading-start' ] ).toBeTruthy();

		childComponent.vm.$emit( 'loading-end' );
		expect( wrapper.emitted()[ 'loading-end' ] ).toBeTruthy();
	} );

	it( 'emits validate event when validation occurs', async () => {
		const wrapper = shallowMount( FunctionInputField, {
			props: {
				labelData: new LabelData( 'Z123K1', 'Test Label', 'Z1002', 'en' ),
				inputType: 'Z456',
				showValidation: true
			},
			global: { stubs: { CdxField: false, CdxLabel: false } }
		} );
		wrapper.getComponent( { name: 'wl-function-input-string' } ).vm.$emit( 'validate', { isValid: true, error: mockErrorData } );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true, error: mockErrorData } ] );
	} );

	describe( 'field type selection', () => {
		it( 'determines component type as "wl-function-input-string" for string type', () => {
			const wrapper = renderFunctionInputField( {
				inputType: 'Z6'
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-string' );
		} );

		it( 'determines component type as "wl-function-input-language" for language type', () => {
			const wrapper = renderFunctionInputField( {
				inputType: 'Z60'
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-language' );
		} );

		it( 'determines component type as "wl-function-input-wikidata" for wikidata item type', () => {
			const wrapper = renderFunctionInputField( {
				inputType: 'Z6001'
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-wikidata' );
		} );

		it( 'determines component type as "wl-function-input-wikidata" for wikidata item reference type', () => {
			const wrapper = renderFunctionInputField( {
				inputType: 'Z6091'
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-wikidata' );
		} );

		it( 'determines component type as "wl-function-input-wikidata" for wikidata lexeme type', () => {
			const wrapper = renderFunctionInputField( {
				inputType: 'Z6005'
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-wikidata' );
		} );

		it( 'determines component type as "wl-function-input-wikidata" for wikidata lexeme reference type', () => {
			const wrapper = renderFunctionInputField( {
				inputType: 'Z6095'
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-wikidata' );
		} );

		it( 'determines component type as "wl-function-input-enum" for enum types', () => {
			store.isEnumType = createGettersWithFunctionsMock( true );
			store.hasParser = createGettersWithFunctionsMock( false );

			const wrapper = renderFunctionInputField();
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-enum' );
		} );

		it( 'determines component type as "wl-function-input-parser" for types with parser', () => {
			store.isEnumType = createGettersWithFunctionsMock( false );
			store.hasParser = createGettersWithFunctionsMock( true );

			const wrapper = renderFunctionInputField();
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-parser' );
		} );

		it( 'determines component type as "wl-function-input-string" as a fallback', () => {
			store.isEnumType = createGettersWithFunctionsMock( false );
			store.hasParser = createGettersWithFunctionsMock( false );

			const wrapper = renderFunctionInputField();
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-string' );
		} );
	} );

	describe( 'default value functionality', () => {
		it( 'shows default value checkbox for types that have default values', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420' // Date type
			} );
			expect( wrapper.findComponent( { name: 'wl-function-input-default-value-checkbox' } ).exists() ).toBe( true );
		} );

		it( 'does not show default value checkbox for types that do not have default values', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( false );
			const wrapper = renderFunctionInputField();
			expect( wrapper.findComponent( { name: 'wl-function-input-default-value-checkbox' } ).exists() ).toBe( false );
		} );

		it( 'handles default value checkbox toggle correctly', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420',
				modelValue: 'some value'
			} );

			const checkbox = wrapper.findComponent( { name: 'wl-function-input-default-value-checkbox' } );
			checkbox.vm.$emit( 'update:is-checked', true );

			expect( wrapper.vm.shouldUseDefaultValue ).toBe( true );
			expect( wrapper.emitted()[ 'update:modelValue' ][ 0 ] ).toEqual( [ '' ] );
			expect( wrapper.emitted().update[ 0 ] ).toEqual( [ '' ] );
			expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true } ] );
		} );

		it( 'passes shouldUseDefaultValue prop to child components', async () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420'
			} );

			// Toggle checkbox
			const checkbox = wrapper.findComponent( { name: 'wl-function-input-default-value-checkbox' } );
			checkbox.vm.$emit( 'update:is-checked', true );

			// Wait for the component to update
			await wrapper.vm.$nextTick();

			const childComponent = wrapper.getComponent( { name: 'wl-function-input-string' } );
			expect( childComponent.props( 'shouldUseDefaultValue' ) ).toBe( true );
		} );

		it( 'automatically initializes default value checkbox when field is empty and has default value', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			store.isNewParameterSetup = false;

			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420',
				modelValue: ''
			} );

			expect( wrapper.vm.shouldUseDefaultValue ).toBe( true );
		} );

		it( 'does not initialize default value checkbox when field has a value', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			store.isNewParameterSetup = false;

			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420',
				modelValue: 'some value'
			} );

			expect( wrapper.vm.shouldUseDefaultValue ).toBe( false );
		} );

		it( 'does not initialize default value checkbox when creating new parameter', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			store.isNewParameterSetup = true;

			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420',
				modelValue: ''
			} );

			expect( wrapper.vm.shouldUseDefaultValue ).toBe( false );
		} );
	} );
} );
