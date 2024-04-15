/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { CdxRadio } = require( '@wikimedia/codex' );
const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ZBoolean = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZBoolean.vue' );

describe( 'ZBoolean', () => {
	let getters;
	beforeEach( () => {
		getters = {
			getZBooleanValue: createGettersWithFunctionsMock( 14 ),
			getLabel: createGettersWithFunctionsMock( 'false' )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );
	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZBoolean, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'does not load the radio codex component', () => {
			const wrapper = shallowMount( ZBoolean, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.findComponent( { name: 'cdx-radio' } ).exists() ).toBe( false );
		} );

		it( 'displays the boolean value label', () => {
			const wrapper = shallowMount( ZBoolean, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-edit-link' ).exists() ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-edit-link' ).text() ).toBe( 'false' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'loads the radio codex component', () => {
			const wrapper = shallowMount( ZBoolean, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.findComponent( CdxRadio ).exists() ).toBe( true );
		} );

		it( 'changes the boolean value when selected', async () => {
			const wrapper = shallowMount( ZBoolean, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.getComponent( CdxRadio ).exists() ).toBeTruthy();
			await wrapper.getComponent( CdxRadio ).vm.$emit( 'update:modelValue', 'Z41' );
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ Constants.Z_BOOLEAN_IDENTITY, Constants.Z_REFERENCE_ID ], value: 'Z41' } ] ] );

		} );
	} );
} );
