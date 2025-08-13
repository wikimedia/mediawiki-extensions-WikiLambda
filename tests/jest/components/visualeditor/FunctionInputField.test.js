'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const FunctionInputField = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionInputField.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const LabelData = require( '../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );

describe( 'FunctionInputField', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock( { Z123: 'Test Label' } );
		store.isEnumType = createGettersWithFunctionsMock( false );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionInputField, {
			props: {
				labelData: new LabelData( 'Z123K1', 'Test Label', 'Z1002', 'en' ),
				inputType: 'Z456',
				showValidation: true
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-field' ).exists() ).toBe( true );
	} );

	it( 'displays the correct label', () => {
		const wrapper = shallowMount( FunctionInputField, {
			props: {
				labelData: new LabelData( 'Z123K1', 'Test Label', 'Z1002', 'en' ),
				inputType: 'Z456',
				showValidation: true
			},
			global: { stubs: { CdxField: false, CdxLabel: false } }
		} );
		expect( wrapper.find( 'span' ).text() ).toBe( 'Test Label' );
	} );

	it( 'emits update event when input value changes', async () => {
		const wrapper = shallowMount( FunctionInputField, {
			props: {
				labelData: new LabelData( 'Z123K1', 'Test Label', 'Z1002', 'en' ),
				inputType: 'Z456',
				showValidation: true
			},
			global: { stubs: { CdxField: false, CdxLabel: false } }
		} );
		wrapper.getComponent( { name: 'wl-function-input-string' } ).vm.$emit( 'update', 'New value' );
		expect( wrapper.emitted().update[ 0 ] ).toEqual( [ 'New value' ] );
	} );

	it( 'emits update:modelValue event when input value changes', () => {
		const wrapper = shallowMount( FunctionInputField, {
			props: {
				labelData: new LabelData( 'Z123K1', 'Test Label', 'Z1002', 'en' ),
				inputType: 'Z456',
				showValidation: true
			},
			global: { stubs: { CdxField: false, CdxLabel: false } }
		} );
		wrapper.getComponent( { name: 'wl-function-input-string' } ).vm.$emit( 'input', 'Updated value' );
		expect( wrapper.emitted()[ 'update:modelValue' ][ 0 ] ).toEqual( [ 'Updated value' ] );
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
		wrapper.getComponent( { name: 'wl-function-input-string' } ).vm.$emit( 'validate', { isValid: true, errorMessage: undefined } );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true, errorMessage: undefined } ] );
	} );

	it( 'computes status as "error" when errorMessage is present and showValidation is true', () => {
		const wrapper = shallowMount( FunctionInputField, {
			props: {
				labelData: new LabelData( 'Z123K1', 'Test Label', 'Z1002', 'en' ),
				inputType: 'Z456',
				showValidation: true,
				errorMessage: 'An error occurred'
			}
		} );
		expect( wrapper.vm.status ).toBe( 'error' );
	} );

	it( 'computes status as "default" when errorMessage is present but showValidation is false', () => {
		const wrapper = shallowMount( FunctionInputField, {
			props: {
				labelData: new LabelData( 'Z123K1', 'Test Label', 'Z1002', 'en' ),
				inputType: 'Z456',
				showValidation: false,
				errorMessage: 'An error occurred'
			}
		} );
		expect( wrapper.vm.status ).toBe( 'default' );
	} );

	describe( 'field type selection', () => {
		const labelData = new LabelData( 'Z123K1', 'Test Label', 'Z1002', 'en' );

		it( 'determines component type as "wl-function-input-string" for string type', () => {
			const wrapper = shallowMount( FunctionInputField, {
				props: {
					labelData,
					inputType: 'Z6',
					showValidation: true
				}
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-string' );
		} );

		it( 'determines component type as "wl-function-input-language" for language type', () => {
			const wrapper = shallowMount( FunctionInputField, {
				props: {
					labelData,
					inputType: 'Z60',
					showValidation: true
				}
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-language' );
		} );

		it( 'determines component type as "wl-function-input-wikidata" for wikidata item type', () => {
			const wrapper = shallowMount( FunctionInputField, {
				props: {
					labelData,
					inputType: 'Z6001',
					showValidation: true
				}
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-wikidata' );
		} );

		it( 'determines component type as "wl-function-input-wikidata" for wikidata item reference type', () => {
			const wrapper = shallowMount( FunctionInputField, {
				props: {
					labelData,
					inputType: 'Z6091',
					showValidation: true
				}
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-wikidata' );
		} );

		it( 'determines component type as "wl-function-input-wikidata" for wikidata lexeme type', () => {
			const wrapper = shallowMount( FunctionInputField, {
				props: {
					labelData,
					inputType: 'Z6005',
					showValidation: true
				}
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-wikidata' );
		} );

		it( 'determines component type as "wl-function-input-wikidata" for wikidata lexeme reference type', () => {
			const wrapper = shallowMount( FunctionInputField, {
				props: {
					labelData,
					inputType: 'Z6095',
					showValidation: true
				}
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-wikidata' );
		} );

		it( 'determines component type as "wl-function-input-enum" for enum types', () => {
			store.isEnumType = createGettersWithFunctionsMock( true );
			store.hasParser = createGettersWithFunctionsMock( false );
			const wrapper = shallowMount( FunctionInputField, {
				props: {
					labelData,
					inputType: 'Z456',
					showValidation: true
				}
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-enum' );
		} );

		it( 'determines component type as "wl-function-input-parser" for types with parser', () => {
			store.isEnumType = createGettersWithFunctionsMock( false );
			store.hasParser = createGettersWithFunctionsMock( true );
			const wrapper = shallowMount( FunctionInputField, {
				props: {
					labelData,
					inputType: 'Z456',
					showValidation: true
				}
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-parser' );
		} );

		it( 'determines component type as "wl-function-input-string" as a fallback', () => {
			store.isEnumType = createGettersWithFunctionsMock( false );
			store.hasParser = createGettersWithFunctionsMock( false );
			const wrapper = shallowMount( FunctionInputField, {
				props: {
					labelData,
					inputType: 'Z456',
					showValidation: true
				}
			} );
			expect( wrapper.vm.componentType ).toBe( 'wl-function-input-string' );
		} );
	} );
} );
