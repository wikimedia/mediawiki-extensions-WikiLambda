/*!
 * WikiLambda unit test suite for the eventLogMixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const eventLogMixin = require( '../../../resources/ext.wikilambda.app/mixins/eventLogMixin.js' );

describe( 'eventLogMixin mixin', () => {
	let wrapper;

	beforeEach( () => {
		// Mocking a Vue component to test the mixin
		const TestComponent = {
			template: '<div></div>',
			mixins: [ eventLogMixin ]
		};
		wrapper = shallowMount( TestComponent );
	} );

	describe( 'methods', () => {
		describe( 'removeNullUndefined', () => {
			it( 'removes null-valued property', () => {
				const original = {
					zobjectid: 'Z801',
					zobjecttype: 'Z8',
					implementationtype: null,
					zlang: 'Z1002'
				};
				const expected = {
					zobjectid: 'Z801',
					zobjecttype: 'Z8',
					zlang: 'Z1002'
				};
				const result = wrapper.vm.removeNullUndefined( original );
				expect( result ).toStrictEqual( expected );
			} );

			it( 'removes undefined property', () => {
				const original = {
					zobjectid: 'Z801',
					zobjecttype: 'Z8',
					implementationtype: undefined,
					zlang: 'Z1002'
				};
				const expected = {
					zobjectid: 'Z801',
					zobjecttype: 'Z8',
					zlang: 'Z1002'
				};
				const result = wrapper.vm.removeNullUndefined( original );
				expect( result ).toStrictEqual( expected );
			} );

			it( 'removes null-valued property from singleton object', () => {
				const original = {
					implementationtype: null
				};
				const expected = {};
				const result = wrapper.vm.removeNullUndefined( original );
				expect( result ).toStrictEqual( expected );
			} );

			it( 'removes undefined property from singleton object', () => {
				const original = {
					implementationtype: undefined
				};
				const expected = {};
				const result = wrapper.vm.removeNullUndefined( original );
				expect( result ).toStrictEqual( expected );
			} );

			it( 'removes nothing from empty object', () => {
				const original = {};
				const expected = {};
				const result = wrapper.vm.removeNullUndefined( original );
				expect( result ).toStrictEqual( expected );
			} );
		} );

		it( 'removes multiple blank properties', () => {
			const original = {
				aaaa: null,
				zobjectid: 'Z801',
				bbbb: null,
				cccc: null,
				zobjecttype: 'Z8',
				implementationtype: undefined,
				zlang: 'Z1002',
				dddd: undefined
			};
			const expected = {
				zobjectid: 'Z801',
				zobjecttype: 'Z8',
				zlang: 'Z1002'
			};
			const result = wrapper.vm.removeNullUndefined( original );
			expect( result ).toStrictEqual( expected );
		} );
	} );

	describe( 'getNamespace', () => {
		it( 'gets the correct namespace', () => {
			expect( wrapper.vm.getNamespace( Constants.Z_FUNCTION ) ).toStrictEqual( 'editFunction' );
			expect( wrapper.vm.getNamespace( Constants.Z_IMPLEMENTATION ) ).toStrictEqual( 'editImplementation' );
			expect( wrapper.vm.getNamespace( Constants.Z_TESTER ) ).toStrictEqual( 'editTester' );
			expect( wrapper.vm.getNamespace( Constants.Z_TYPE ) ).toStrictEqual( 'editType' );
			expect( wrapper.vm.getNamespace() ).toStrictEqual( 'editZObject' );
		} );
	} );
} );
