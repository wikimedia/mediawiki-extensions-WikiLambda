/*!
 * WikiLambda unit test suite for the function-viewer-about-examples component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	TableComponent = require( '../../../../../resources/ext.wikilambda.edit/components/base/Table.vue' ),
	FunctionViewerExamples = require( '../../../../../resources/ext.wikilambda.edit/components/function/viewer/about/FunctionViewerAboutExamples.vue' );

describe( 'FunctionViewerAboutExamples', function () {
	beforeEach( function () {
		var getters = {
			getCurrentZObjectId: jest.fn( function () {
				return 'Z1002';
			} ),
			getZkeys: jest.fn( function () {
				return {
					Z1002: {
						Z2K2: {
							Z8K3: [ 'Z1003' ]
						}
					}
				};
			} ),
			getTestInputOutputByZIDs: jest.fn( function () {
				return function () {
					return [ {
						input: 'testInput',
						output: 'testOutput'
					} ];
				};
			} )
		};

		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerExamples );

		expect( wrapper.find( '.ext-wikilambda-function-viewer-about-aliases' ).exists() ).toBeTruthy();
	} );

	it( 'table component is rendered without errors', function () {
		var wrapper = VueTestUtils.mount( FunctionViewerExamples );
		expect( wrapper.findComponent( TableComponent ).exists() ).toBeTruthy();
	} );

	it( 'table component has title', function () {
		const fakeTitle = 'fake title';
		const wrapper = VueTestUtils.mount( FunctionViewerExamples, {
			data() {
				return { title: fakeTitle };
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-function-viewer-about-aliases__table-title' ).text() ).toEqual( fakeTitle );
	} );

} );
