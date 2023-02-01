'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	ZFunction = require( '../../../resources/ext.wikilambda.edit/components/main-types/ZFunction.vue' );
const Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' );

const currentZObjectId = 123;

describe( 'ZFunction', () => {
	var actions;
	beforeEach( () => {
		actions = {
			fetchZKeys: jest.fn(),
			fetchZImplementations: jest.fn(),
			fetchZTesters: jest.fn()
		};
		global.store.hotUpdate( {
			actions: actions,
			getters: {
				getCurrentZObjectId: () => currentZObjectId,
				getNestedZObjectById: () => () => {
					return { value: 'abc' };
				},
				getZObjectChildrenById: () => () => {
					return [
						{ key: Constants.Z_FUNCTION_ARGUMENTS, id: 111 },
						{ key: Constants.Z_FUNCTION_IMPLEMENTATIONS, id: 222 },
						{ key: Constants.Z_FUNCTION_TESTERS, id: 333 }
					];
				},
				getZkeyLabels: () => {
					return {};
				}
			}
		} );
	} );

	it( 'renders without errors', () => {
		var wrapper = VueTestUtils.shallowMount( ZFunction );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'fetches keys, testers, and implementations after mounting', ( done ) => {
		var wrapper = VueTestUtils.shallowMount( ZFunction );

		wrapper.vm.$nextTick( () => {
			expect( actions.fetchZKeys ).toHaveBeenCalledWith( expect.anything(), { zids: [ Constants.Z_ARGUMENT ] } );
			expect( actions.fetchZImplementations ).toHaveBeenCalledWith( expect.anything(), currentZObjectId );
			expect( actions.fetchZTesters ).toHaveBeenCalledWith( expect.anything(), currentZObjectId );
			done();
		} );
	} );
} );
