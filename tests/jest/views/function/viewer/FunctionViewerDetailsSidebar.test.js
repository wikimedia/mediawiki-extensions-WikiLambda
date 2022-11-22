/*!
 * WikiLambda unit test suite for the function-viewer-details-sidebar component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const Constants = require( '../../../../../resources/ext.wikilambda.edit/Constants.js' );

var VueTestUtils = require( '@vue/test-utils' ),
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionViewerSidebar = require( '../../../../../resources/ext.wikilambda.edit/views/function/details/FunctionViewerDetailsSidebar.vue' );

describe( 'FunctionViewerDetailsSidebar', function () {
	var getters;
	const idLangOne = 1;
	const idLangTwo = 2;
	const idLangThree = 3;
	const idLangOneChild = 4;
	const idZ17K3 = 5;
	const idZ12K1 = 6;
	beforeEach( function () {
		getters = {
			getCurrentZObjectId: jest.fn( function () {
				return 'Z12345';
			} ),
			getAllItemsFromListById: createGettersWithFunctionsMock( [
				{
					id: idLangOne,
					key: '1',
					value: 'object',
					parent: 2
				}
			] ),
			getZObjectChildrenById: jest.fn( function () {
				return function ( id ) {
					switch ( id ) {
						case idLangOne:
							return [
								{
									id: idLangOneChild,
									key: '2',
									value: 'array',
									parent: 2
								}
							];
						case idZ17K3:
							return [
								{
									id: idZ12K1,
									key: 'Z12K1',
									value: 'array',
									parent: 5
								}
							];
						default:
							return [
								{
									id: idZ17K3,
									key: 'Z17K3',
									value: 'object',
									parent: 6
								}
							];
					}
				};
			} ),
			getNestedZObjectById: createGettersWithFunctionsMock( { id: idLangOne, value: Constants.Z_STRING } ),
			getZkeyLabels: jest.fn( function () {
				return {};
			} ),
			getCurrentZLanguage: jest.fn(),
			getZObjectTypeById: createGettersWithFunctionsMock( Constants.Z_REFERENCE )
		};

		global.store.hotUpdate( {
			getters: getters
		} );
		mw.Title = jest.fn( function ( title ) {
			return {
				getUrl: jest.fn( function () {
					return '/wiki/' + title;
				} )
			};
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerSidebar );

		expect( wrapper.find( '.ext-wikilambda-function-viewer-details-sidebar' ).exists() ).toBeTruthy();
	} );

	it( 'returns the correct url for creating an implementation', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerSidebar );
		var link = wrapper.find( '#ext-wikilambda-function-viewer-details-sidebar__link--implementation' );

		expect( link.attributes( 'href' ) ).toBeTruthy();
		expect( link.attributes().href ).toBe( '/wiki/Special:CreateZObject?zid=Z14&Z14K1=Z12345' );

	} );

	it( 'returns the correct url for creating a tester', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerSidebar );
		var link = wrapper.find( '#ext-wikilambda-function-viewer-details-sidebar__link--tester' );

		expect( link.attributes( 'href' ) ).toBeTruthy();
		expect( link.attributes().href ).toBe( '/wiki/Special:CreateZObject?zid=Z20&Z20K1=Z12345' );

	} );

	it( 'does not render the show more languages button if there is only one language', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerSidebar );

		expect( wrapper.find( '.ext-wikilambda-function-viewer-details-sidebar__button' ).exists() ).toBeFalsy();
	} );

	it( 'renders the show more languages button if there are multiple languages for any argument', async function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerSidebar );
		getters.getAllItemsFromListById = createGettersWithFunctionsMock( [
			{
				id: idLangOne,
				key: '1',
				value: 'object',
				parent: 2
			},
			{
				id: idLangTwo,
				key: '2',
				value: 'object',
				parent: 2
			},
			{
				id: idLangThree,
				key: '2',
				value: 'object',
				parent: 2
			}
		] );

		global.store.hotUpdate( {
			getters: getters
		} );

		await wrapper.vm.$nextTick();
		expect( wrapper.find( '.ext-wikilambda-function-viewer-details-sidebar__button' ).exists() ).toBeTruthy();
	} );
} );
