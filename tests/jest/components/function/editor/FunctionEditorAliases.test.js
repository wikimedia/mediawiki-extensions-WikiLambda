/*!
 * WikiLambda unit test suite for the function-definition-aliases component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	typeUtils = require( '../../../../../resources/ext.wikilambda.edit/mixins/typeUtils.js' ),
	Constants = require( '../../../../../resources/ext.wikilambda.edit/Constants.js' ),
	FunctionEditorAliases = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorAliases.vue' ),
	ChipContainer = require( '../../../../../resources/ext.wikilambda.edit/components/base/ChipContainer.vue' );

const multilingualStringsetValueId = 1;
const monolingualStringsetId = 2;
const monolingualStringsetLanguageId = 3;
const monolingualStringsetValueId = 4;
const stringId = 5;
const stringValueId = 6;
const nextId = 7;

const createWrapper = () => VueTestUtils.shallowMount( FunctionEditorAliases, {
	props: {
		zLang: Constants.Z_NATURAL_LANGUAGE_ENGLISH
	},
	global: {
		mixins: [ typeUtils ]
	}
} );

describe( 'FunctionEditorAliases', () => {
	var getters,
		actions,
		strings;

	beforeEach( () => {
		strings = [];
		getters = {
			getZObjectChildrenById: () => ( parentId ) => {
				if ( parentId === monolingualStringsetId ) {
					return [
						{ id: monolingualStringsetLanguageId, key: Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE },
						{ id: monolingualStringsetValueId, key: Constants.Z_MONOLINGUALSTRINGSET_VALUE }
					];
				}
			},
			getNestedZObjectById: () => ( id, keys ) => {
				if ( id === 0 && keys.length === 2 &&
					keys[ 0 ] === Constants.Z_PERSISTENTOBJECT_ALIASES &&
					keys[ 1 ] === Constants.Z_MULTILINGUALSTRINGSET_VALUE ) {
					return { id: multilingualStringsetValueId };
				} else if ( id === monolingualStringsetId && keys.length === 1 &&
					keys[ 0 ] === Constants.Z_MONOLINGUALSTRINGSET_VALUE ) {
					return { id: monolingualStringsetValueId };
				} else if ( id === monolingualStringsetId && keys.length === 2 &&
					keys[ 0 ] === Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE &&
					keys[ 1 ] === Constants.Z_REFERENCE_ID ) {
					return { value: Constants.Z_NATURAL_LANGUAGE_ENGLISH };
				} else if ( id === monolingualStringsetLanguageId && keys.length === 1 &&
					keys[ 0 ] === Constants.Z_REFERENCE_ID ) {
					return { value: Constants.Z_NATURAL_LANGUAGE_ENGLISH };
				} else if ( id === stringId && keys.length === 1 &&
					keys[ 0 ] === Constants.Z_STRING_VALUE ) {
					return { id: stringValueId, value: 'existing alias' };
				}
			},
			getAllItemsFromListById: () => ( parentId ) => {
				if ( parentId === multilingualStringsetValueId ) {
					return [ { id: monolingualStringsetId } ];
				} else if ( parentId === monolingualStringsetValueId ) {
					return strings;
				}
			},
			getZObjectById: () => ( id ) => {
				if ( id === stringValueId ) {
					return { parent: stringId };
				} else if ( id === stringId ) {
					return { id: stringId, parent: monolingualStringsetValueId };
				}
			},
			getNextObjectId: () => nextId
		};

		actions = {
			setZObjectValue: jest.fn(),
			addZObject: jest.fn(),
			changeType: jest.fn(),
			injectZObject: jest.fn(),
			removeZObjectChildren: jest.fn(),
			removeZObject: jest.fn(),
			recalculateZListIndex: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );

	} );

	it( 'renders without errors', () => {
		var wrapper = createWrapper();

		expect( wrapper.find( '.ext-wikilambda-function-definition-aliases' ).exists() ).toBe( true );
	} );
	it( 'does not pass any chips to chip container if there are no aliases', () => {
		var wrapper = createWrapper();

		expect( wrapper.getComponent( ChipContainer ).props( 'chips' ) ).toHaveLength( 0 );
	} );
	it( 'passes chips to chip container if there are aliases', () => {
		strings.push( { id: stringId, key: '1', value: 'object' } );
		var wrapper = createWrapper();

		const chipsProp = wrapper.getComponent( ChipContainer ).props( 'chips' );
		expect( chipsProp ).toHaveLength( 1 );
		expect( chipsProp[ 0 ] ).toEqual( { id: stringValueId, value: 'existing alias' } );
	} );
	it( 'removes alias when chip removed from chip container', () => {
		strings.push( { id: stringId, key: '1', value: 'object' } );
		var wrapper = createWrapper();

		wrapper.getComponent( ChipContainer ).vm.$emit( 'remove-chip', stringValueId );

		expect( actions.removeZObjectChildren ).toHaveBeenCalledWith( expect.anything(), stringId );
		expect( actions.removeZObject ).toHaveBeenCalledWith( expect.anything(), stringId );
		expect( actions.recalculateZListIndex ).toHaveBeenCalledWith( expect.anything(), monolingualStringsetValueId );
	} );
	describe( 'When a new chip is added in chip container', () => {
		it( 'for an existing language, adds new alias', () => {
			var wrapper = createWrapper();

			wrapper.getComponent( ChipContainer ).vm.$emit( 'add-chip', 'new alias' );

			expect( actions.changeType ).toHaveBeenCalledWith( expect.anything(), {
				type: Constants.Z_STRING,
				id: monolingualStringsetValueId,
				value: 'new alias',
				append: true
			} );
		} );
		it( 'for an new language, adds new alias', () => {
			var wrapper = VueTestUtils.shallowMount( FunctionEditorAliases, {
				props: {
					zLang: Constants.Z_NATURAL_LANGUAGE_CHINESE
				},
				global: {
					mixins: [ typeUtils ]
				}
			} );

			wrapper.getComponent( ChipContainer ).vm.$emit( 'add-chip', 'new alias' );

			expect( actions.changeType ).toHaveBeenCalledWith( expect.anything(), {
				type: Constants.Z_MONOLINGUALSTRINGSET,
				lang: Constants.Z_NATURAL_LANGUAGE_CHINESE,
				value: 'new alias',
				id: multilingualStringsetValueId,
				append: true
			} );
		} );
		it( 'with a value that matches an existing alias in the current language, ' +
			'error is displayed and new alias is not added', async () => {
			strings.push( { id: stringId, key: '1', value: 'object' } );
			var wrapper = createWrapper();

			wrapper.getComponent( ChipContainer ).vm.$emit( 'add-chip', 'existing alias' );

			await wrapper.vm.$nextTick();

			expect( wrapper.get( '.ext-wikilambda-function-definition-aliases__error' ).exists() ).toBe( true );

			expect( actions.changeType ).not.toHaveBeenCalled();
		} );
	} );
} );
