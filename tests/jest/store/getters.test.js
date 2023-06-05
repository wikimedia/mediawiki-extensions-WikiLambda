/*!
 * WikiLambda unit test suite for the root Vuex getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var getters = require( '../../../resources/ext.wikilambda.edit/store/getters.js' );

describe( 'Vuex root getters', function () {
	it( 'gets current view mode', function () {
		// Jest defaults viewmode to true
		expect( getters.getViewMode() ).toBe( true );
	} );

	it( 'correctly paginates pages', function () {
		const mockTesterList = [
			'Tester 1',
			'Tester 2',
			'Tester 3',
			'Tester 4',
			'Tester 5',
			'Tester 6',
			'Tester 7'
		];
		expect( getters.paginateList( undefined )( mockTesterList ) ).toEqual(
			{
				1: [ 'Tester 1', 'Tester 2', 'Tester 3', 'Tester 4', 'Tester 5' ],
				2: [ 'Tester 6', 'Tester 7' ]
			}
		);
	} );
} );
