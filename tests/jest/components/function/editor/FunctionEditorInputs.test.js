/*!
 * WikiLambda unit test suite for the Function Editor inputs component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../../helpers/getterHelpers.js' );
const FunctionEditorInputs = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorInputs.vue' );
const LabelData = require( '../../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

const langLabelData = new LabelData( 'Z1002', 'English', 'Z1002', 'en', 'ltr' );

describe( 'FunctionEditorInputs', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock( { Z1002: 'English' } );
		store.getZFunctionInputs = createGettersWithFunctionsMock( [] );
		store.getRowByKeyPath = createGettersWithFunctionsMock( undefined );
		store.getUserLangCode = 'en';
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionEditorInputs, {
			props: {
				zLanguage: 'Z1002',
				langLabelData,
				isMainLanguageBlock: true
			},
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		expect( wrapper.find( '.ext-wikilambda-app-function-editor-inputs' ).exists() ).toBeTruthy();
	} );

	it( 'displays the "add input" button if the user has edit permission and there are no arguments', () => {
		store.getZFunctionInputs = createGettersWithFunctionsMock( [] );
		const wrapper = shallowMount( FunctionEditorInputs, {
			props: {
				zLanguage: 'Z1002',
				langLabelData,
				isMainLanguageBlock: true,
				canEdit: true
			},
			global: {
				stubs: { WlFunctionEditorField: false, CdxButton: false }
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-app-function-editor-inputs__action-add' ).text() )
			.toEqual( 'Add input' );
	} );

	it( 'displays the "add another input" button if the user has edit permissions and there is an existing input', () => {
		store.getZFunctionInputs = createGettersWithFunctionsMock( [
			{ id: 2, key: '1', parent: 1, value: Constants.ROW_VALUE_OBJECT }
		] );
		const wrapper = shallowMount( FunctionEditorInputs, {
			props: {
				zLanguage: 'Z1002',
				langLabelData,
				isMainLanguageBlock: true,
				canEdit: true
			},
			global: {
				stubs: { WlFunctionEditorField: false, CdxButton: false }
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-app-function-editor-inputs__action-add-another' ).text() )
			.toEqual( 'Add another input' );
	} );

	it( 'does not display the any add button if the user does not have edit permissions', () => {
		const wrapper = shallowMount( FunctionEditorInputs, {
			props: {
				zLanguage: 'Z1002',
				langLabelData,
				isMainLanguageBlock: true,
				canEdit: false
			},
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		expect( wrapper.findComponent( { name: 'cdx-button' } ).exists() ).toBeFalsy();
	} );

	it( 'displays as many input components as arguments are in the function', () => {
		store.getZFunctionInputs = createGettersWithFunctionsMock( [
			{ id: 2, key: '1', parent: 1, value: Constants.ROW_VALUE_OBJECT },
			{ id: 3, key: '2', parent: 1, value: Constants.ROW_VALUE_OBJECT },
			{ id: 4, key: '3', parent: 1, value: Constants.ROW_VALUE_OBJECT }
		] );
		const wrapper = shallowMount( FunctionEditorInputs, {
			props: {
				zLanguage: 'Z1002',
				langLabelData,
				isMainLanguageBlock: true,
				canEdit: true
			},
			global: {
				stubs: { CdxButton: false, WlFunctionEditorField: false }
			}
		} );

		expect( wrapper.findAllComponents( { name: 'wl-function-editor-inputs-item' } ).length ).toBe( 3 );
	} );

	it( 'emits an update argument label event when an input changes its label', async () => {
		store.getZFunctionInputs = createGettersWithFunctionsMock( [
			{ id: 2, key: '1', parent: 1, value: Constants.ROW_VALUE_OBJECT }
		] );
		const wrapper = shallowMount( FunctionEditorInputs, {
			props: {
				zLanguage: 'Z1002',
				langLabelData,
				isMainLanguageBlock: true,
				canEdit: true
			},
			global: {
				stubs: { CdxButton: false, WlFunctionEditorField: false }
			}
		} );

		const inputItem = wrapper.findComponent( { name: 'wl-function-editor-inputs-item' } );
		inputItem.vm.$emit( 'argument-label-updated' );
		await wrapper.vm.$nextTick();

		// ASSERT: does not emit name-updated
		expect( wrapper.emitted( 'argument-label-updated' ) ).toBeTruthy();
	} );
} );
