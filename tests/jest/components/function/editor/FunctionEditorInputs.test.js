/*!
 * WikiLambda unit test suite for the Function Editor inputs component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createLabelDataMock = require( '../../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	FunctionEditorInputs = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorInputs.vue' );

const langLabelData = {
	zid: 'Z1002',
	label: 'English',
	lang: 'Z1002',
	langCode: 'en',
	langDir: 'ltr'
};

describe( 'FunctionEditorInputs', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getLabelData: createLabelDataMock( { Z1002: 'English' } ),
			getZFunctionInputs: createGettersWithFunctionsMock( [] ),
			getRowByKeyPath: createGettersWithFunctionsMock( undefined ),
			getUserLangCode: createGetterMock( 'en' )
		};

		actions = {
			changeType: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
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
		getters.getZFunctionInputs = createGettersWithFunctionsMock( [] );
		global.store.hotUpdate( { getters: getters } );
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
		getters.getZFunctionInputs = createGettersWithFunctionsMock( [
			{ id: 2, key: '1', parent: 1, value: Constants.ROW_VALUE_OBJECT }
		] );
		global.store.hotUpdate( { getters: getters } );
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
		getters.getZFunctionInputs = createGettersWithFunctionsMock( [
			{ id: 2, key: '1', parent: 1, value: Constants.ROW_VALUE_OBJECT },
			{ id: 3, key: '2', parent: 1, value: Constants.ROW_VALUE_OBJECT },
			{ id: 4, key: '3', parent: 1, value: Constants.ROW_VALUE_OBJECT }
		] );
		global.store.hotUpdate( { getters: getters } );
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
		getters.getZFunctionInputs = createGettersWithFunctionsMock( [
			{ id: 2, key: '1', parent: 1, value: Constants.ROW_VALUE_OBJECT }
		] );
		global.store.hotUpdate( { getters: getters } );
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
		inputItem.vm.$emit( 'update-argument-label' );
		await wrapper.vm.$nextTick();

		// ASSERT: does not emit updated-name
		expect( wrapper.emitted( 'updated-argument-label' ) ).toBeTruthy();
	} );
} );
