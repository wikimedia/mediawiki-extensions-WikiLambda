/*!
 * WikiLambda unit test suite for the ZFunctionCall component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	ZFunctionCall = require( '../../../resources/ext.wikilambda.edit/components/main-types/ZFunctionCall.vue' );
const { CdxButton } = require( '@wikimedia/codex' );
const Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' );

const zobjectId = 0;
const resultId = 1;
const functionZid = 'Z123';

describe( 'ZFunctionCall', () => {
	beforeEach( () => {
		global.store.hotUpdate( {
			getters: {
				getZObjectChildrenById: () => ( id ) => {
					if ( id === zobjectId ) {
						return [ { key: Constants.Z_FUNCTION_CALL_FUNCTION, value: functionZid } ];
					}
				},
				getZObjectAsJsonById: () => ( id ) => {
					if ( id === resultId ) {
						return 'json';
					}
				},
				getZkeys: () => {
					return { [ functionZid ]: {
						[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
							[ Constants.Z_FUNCTION_ARGUMENTS ]: []
						},
						[ Constants.Z_PERSISTENTOBJECT_ID ]: {
							[ Constants.Z_STRING_VALUE ]: functionZid
						}
					} };
				}
			},
			actions: {
				fetchZKeys: jest.fn(),
				removeZObject: jest.fn(),
				removeZObjectChildren: jest.fn(),
				initializeResultId: () => Promise.resolve( resultId ),
				callZFunction: () => Promise.resolve(),
				injectZObject: () => Promise.resolve()
			}
		} );

	} );
	it( 'renders successfully', () => {
		var wrapper = VueTestUtils.shallowMount( ZFunctionCall, { props: { zobjectId: zobjectId } } );

		expect( wrapper.find( '.ext-wikilambda-function-call-block' ).exists() ).toBe( true );
	} );

	it( 'shows results section when "Call function" button is clicked', async () => {
		var wrapper = VueTestUtils.shallowMount( ZFunctionCall, { props: { zobjectId: zobjectId } } );

		wrapper.get( '.ext-wikilambda-function-call-button' ).getComponent( CdxButton ).vm.$emit( 'click' );
		// The component takes 6 ticks to settle after calling function.
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();

		expect( wrapper.find( '.ext-wikilambda-function-call-block' ).exists() ).toBe( true );
		expect( wrapper.find( '.ext-wikilambda-orchestrated-result' ).exists() ).toBe( true );
	} );

	it( 'hides results section when function is cleared following "Call function" button being clicked', async () => {
		var wrapper = VueTestUtils.shallowMount( ZFunctionCall, { props: { zobjectId: zobjectId } } );
		wrapper.get( '.ext-wikilambda-function-call-button' ).getComponent( CdxButton ).vm.$emit( 'click' );
		// The component takes 6 ticks to settle after calling function.
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();

		wrapper.get( '.ext-wikilambda-function-call-clear-function-button' ).getComponent( CdxButton )
			.vm.$emit( 'click' );
		await wrapper.vm.$nextTick();

		expect( wrapper.find( '.ext-wikilambda-orchestrated-result' ).exists() ).toBe( false );
	} );
} );
