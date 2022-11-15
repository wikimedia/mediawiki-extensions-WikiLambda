/*!
 * WikiLambda unit test suite for the default ZReference component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ZReference = require( '../../../../resources/ext.wikilambda.edit/components/default/ZReference.vue' ),
	ZObjectSelector = require( '../../../../resources/ext.wikilambda.edit/components/ZObjectSelector.vue' );

describe( 'ZReference', () => {
	var getters;
	beforeEach( () => {
		getters = {
			getLabel: createGettersWithFunctionsMock( { zid: 'Z6', label: 'String', lang: 'Z1002' } ),
			getZReferenceTerminalValue: createGettersWithFunctionsMock( 'Z6' ),
			getZObjectKeyByRowId: createGettersWithFunctionsMock( '0' )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZReference, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays the reference link with its label if there is one', () => {
			var wrapper = shallowMount( ZReference, {
				props: {
					edit: false
				}
			} );

			const referenceLink = wrapper.get( 'a' );
			expect( referenceLink.attributes().href ).toBe( '/wiki/Z6' );
			expect( referenceLink.text() ).toBe( 'String' );
		} );

		it( 'displays the reference link with its value if there is no label', () => {
			getters.getLabel = createGettersWithFunctionsMock();

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( ZReference, {
				props: {
					edit: false
				}
			} );

			const referenceLink = wrapper.get( 'a' );
			expect( referenceLink.attributes().href ).toBe( '/wiki/Z6' );
			expect( referenceLink.text() ).toBe( 'Z6' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZReference, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays a selector and emits the value with a Z_REFERENCE_ID (Z9K1) keyPath if its key is not a Z_REFERENCE_ID', async () => {
			var wrapper = shallowMount( ZReference, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-reference__selector' ).exists() ).toBeTruthy();

			await wrapper.getComponent( ZObjectSelector ).vm.$emit( 'input', 'String' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ 'Z9K1' ], value: 'String' } ] ] );
		} );

		it( 'displays a selector and emits the value with an empty keyPath if its key is a Z_REFERENCE_ID (Z9K1)', async () => {
			getters = {
				getLabel: createGettersWithFunctionsMock( { zid: 'Z6', label: 'String', lang: 'Z1002' } ),
				getZReferenceTerminalValue: createGettersWithFunctionsMock( 'Z6' ),
				getZObjectKeyByRowId: createGettersWithFunctionsMock( 'Z9K1' )
			};
			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( ZReference, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-reference__selector' ).exists() ).toBeTruthy();

			await wrapper.getComponent( ZObjectSelector ).vm.$emit( 'input', 'String' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: 'String' } ] ] );
		} );

		it( 'binds the input type to the selector', async () => {
			var wrapper = shallowMount( ZReference, {
				props: {
					edit: true,
					expectedType: Constants.Z_ARGUMENT_KEY
				}
			} );

			expect( wrapper.vm.selectType ).toBe( Constants.Z_ARGUMENT_KEY );
		} );

		it( 'adds focus styling on selector focus', async () => {
			getters.getErrors = createGettersWithFunctionsMock( {} );

			var actions = {
				fetchZKeys: jest.fn( function () {
					return true;
				} )
			};

			global.store.hotUpdate( {
				getters: getters,
				actions: actions
			} );

			var wrapper = mount( ZReference, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-reference__selector' ) ).toBeTruthy();

			var selector = wrapper.get( '.ext-wikilambda-reference' ).getComponent( ZObjectSelector );
			selector.vm.$emit( 'focus' );
			await wrapper.vm.$nextTick();

			expect( wrapper.find( '.ext-wikilambda-reference__selector' ).exists() ).toBeFalsy();
			expect( wrapper.find( '.ext-wikilambda-reference__selector-active' ).exists() ).toBeTruthy();

			selector.vm.$emit( 'focus-out' );
			await wrapper.vm.$nextTick();

			expect( wrapper.find( '.ext-wikilambda-reference__selector' ).exists() ).toBeTruthy();
			expect( wrapper.find( '.ext-wikilambda-reference__selector-active' ).exists() ).toBeFalsy();
		} );
	} );
} );
