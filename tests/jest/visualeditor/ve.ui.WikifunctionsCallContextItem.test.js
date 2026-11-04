/*!
 * WikiLambda unit test suite for the VisualEditor WikifunctionsCall context item.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { flushPromises } = require( '@vue/test-utils' );

describe( 've.ui.WikifunctionsCallContextItem', () => {
	let piniaStore;

	// Minimal stand-ins for the VisualEditor and OOUI pieces the context item uses.
	function LinearContextItem( context, model ) {
		this.context = context;
		this.model = model;
		this.$element = $( '<div>' );
		this.$body = $( '<div>' );
	}
	LinearContextItem.static = {};

	beforeAll( () => {
		piniaStore = {
			fetchZids: jest.fn(),
			getLabelData: jest.fn(),
			getDescription: jest.fn(),
			submitVEInteraction: jest.fn()
		};

		global.OO = {
			inheritClass: ( targetFn, originFn ) => {
				targetFn.super = originFn;
				targetFn.prototype = Object.create( originFn.prototype );
				targetFn.static = Object.create( originFn.static );
			},
			ui: {
				deferMsg: jest.fn(),
				msg: jest.fn()
			}
		};
		global.ve = {
			ui: {
				LinearContextItem,
				contextItemFactory: { register: jest.fn() }
			},
			dm: { WikifunctionsCallNode: function () {} },
			init: { mw: { WikifunctionsCall: {
				vueAppLoaded: Promise.resolve(),
				piniaStore
			} } },
			getProp: ( obj, ...keys ) => keys.reduce( ( value, key ) => value && value[ key ], obj )
		};

		require( '../../../resources/ext.wikilambda.visualeditor/ve.ui.WikifunctionsCallContextItem.js' );
	} );

	afterAll( () => {
		delete global.OO;
		delete global.ve;
	} );

	beforeEach( () => {
		piniaStore.fetchZids.mockResolvedValue();
		piniaStore.getLabelData.mockReturnValue( { label: 'Join strings', isUntitled: false } );
		piniaStore.getDescription.mockReturnValue( { label: 'Joins two strings', isUntitled: false } );
	} );

	async function renderContextItem() {
		const attributes = {
			mw: { parts: [ { parserfunction: { params: { 1: { wt: 'Z10000' } } } } ] },
			isError: false
		};
		const model = { getAttribute: ( key ) => attributes[ key ] };
		const context = { updateDimensions: jest.fn() };
		const contextItem = new global.ve.ui.WikifunctionsCallContextItem( context, model );

		contextItem.renderBody();
		await flushPromises();
		return contextItem;
	}

	it( 'does not log a function link click when it renders', async () => {
		const contextItem = await renderContextItem();

		expect( contextItem.$body.find( 'a' ).text() ).toBe( 'Join strings' );
		expect( piniaStore.submitVEInteraction ).not.toHaveBeenCalled();
	} );

	it( 'logs a function link click each time the function link is clicked', async () => {
		const contextItem = await renderContextItem();
		const $link = contextItem.$body.find( 'a' );

		$link.trigger( 'click' );
		$link.trigger( 'click' );

		expect( piniaStore.submitVEInteraction ).toHaveBeenCalledTimes( 2 );
		expect( piniaStore.submitVEInteraction ).toHaveBeenNthCalledWith( 1, 'function-link-click' );
		expect( piniaStore.submitVEInteraction ).toHaveBeenNthCalledWith( 2, 'function-link-click' );
	} );
} );
