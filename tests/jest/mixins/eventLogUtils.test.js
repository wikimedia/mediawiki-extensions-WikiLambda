/*!
 * WikiLambda unit test suite for the eventLogUtils mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const eventLogUtils = require( '../../../resources/ext.wikilambda.app/mixins/eventLogUtils.js' ).methods;

describe( 'eventLogUtils mixin', () => {
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
			const result = eventLogUtils.removeNullUndefined( original );
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
			const result = eventLogUtils.removeNullUndefined( original );
			expect( result ).toStrictEqual( expected );
		} );

		it( 'removes null-valued property from singleton object', () => {
			const original = {
				implementationtype: null
			};
			const expected = {};
			const result = eventLogUtils.removeNullUndefined( original );
			expect( result ).toStrictEqual( expected );
		} );

		it( 'removes undefined property from singleton object', () => {
			const original = {
				implementationtype: undefined
			};
			const expected = {};
			const result = eventLogUtils.removeNullUndefined( original );
			expect( result ).toStrictEqual( expected );
		} );

		it( 'removes nothing from empty object', () => {
			const original = {};
			const expected = {};
			const result = eventLogUtils.removeNullUndefined( original );
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
		const result = eventLogUtils.removeNullUndefined( original );
		expect( result ).toStrictEqual( expected );
	} );

	it( 'gets the correct namespace', () => {
		expect( eventLogUtils.getNamespace( Constants.Z_FUNCTION ) ).toStrictEqual( 'editFunction' );
		expect( eventLogUtils.getNamespace( Constants.Z_IMPLEMENTATION ) ).toStrictEqual( 'editImplementation' );
		expect( eventLogUtils.getNamespace( Constants.Z_TESTER ) ).toStrictEqual( 'editTester' );
		expect( eventLogUtils.getNamespace( Constants.Z_TYPE ) ).toStrictEqual( 'editType' );
		expect( eventLogUtils.getNamespace() ).toStrictEqual( 'editZObject' );
	} );
} );
