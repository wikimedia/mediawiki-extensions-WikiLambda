/*!
 * WikiLambda unit test suite for Clipboard Dialog
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { dialogGlobalStubs } = require( '../../helpers/dialogTestHelpers.js' );
const { createLabelDataMock } = require( '../../helpers/getterHelpers.js' );

const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ClipboardDialog = require( '../../../../resources/ext.wikilambda.app/components/base/ClipboardDialog.vue' );

// Note: Using custom teleport stub to render content inline instead of teleporting to document body
// This allows us to test dialog content within the component wrapper
// see https://test-utils.vuejs.org/guide/advanced/teleport.html

describe( 'ClipboardDialog', () => {
	let store;

	function renderClipboardDialog( props = {}, options = {} ) {
		const defaultProps = {
			open: true,
			expectedType: 'Z1'
		};
		const defaultOptions = {
			global: {
				stubs: {
					...dialogGlobalStubs,
					...options?.stubs
				}
			}
		};
		return shallowMount( ClipboardDialog, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getClipboardItems = [];
		store.getClearClipboard = jest.fn();
		store.getLabelData = createLabelDataMock( {
			Z1: 'Object',
			Z7: 'Function call',
			Z6: 'String',
			Z11: 'Monolingual string'
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderClipboardDialog();
		expect( wrapper.find( '.ext-wikilambda-app-clipboard' ).exists() ).toBe( true );
	} );

	it( 'does not render search field and button when empty', () => {
		const wrapper = renderClipboardDialog();
		expect( wrapper.find( '.ext-wikilambda-app-clipboard' ).exists() ).toBe( true );
		expect( wrapper.find( '.ext-wikilambda-app-clipboard__actions' ).exists() ).toBe( false );
		expect( wrapper.find( '.ext-wikilambda-app-clipboard__items' ).text() ).toContain( 'There are no items' );
	} );

	it( 'renders search field and button when not empty', () => {
		store.getClipboardItems = [ {
			itemId: 'call#1',
			originKey: 'Z20K2',
			originSlotType: 'Z7',
			objectType: 'Z6',
			resolvingType: 'Z6',
			value: { Z1K1: 'Z6', Z6K1: 'foo' }
		} ];

		const wrapper = renderClipboardDialog();
		expect( wrapper.find( '.ext-wikilambda-app-clipboard' ).exists() ).toBe( true );

		const actions = wrapper.find( '.ext-wikilambda-app-clipboard__actions' );
		expect( actions.findComponent( { name: 'cdx-search-input' } ).exists() ).toBe( true );
		expect( actions.findComponent( { name: 'cdx-button' } ).exists() ).toBe( true );
	} );

	it( 'renders all the items stored in the clipboard store', () => {
		store.getClipboardItems = [ {
			itemId: 'call#1',
			originKey: 'Z20K2',
			originSlotType: 'Z7',
			objectType: 'Z6',
			resolvingType: 'Z6',
			value: { Z1K1: 'Z6', Z6K1: 'foo' }
		}, {
			itemId: 'call#2',
			originKey: 'Z20K2',
			originSlotType: 'Z7',
			objectType: 'Z6',
			resolvingType: 'Z6',
			value: { Z1K1: 'Z6', Z6K1: 'bar' }
		} ];

		const wrapper = renderClipboardDialog();

		const items = wrapper.findAll( '.ext-wikilambda-app-clipboard__item' );

		expect( items.length ).toBe( 2 );
		expect( items[ 0 ].text() ).toContain( 'call#1' );
		expect( items[ 1 ].text() ).toContain( 'call#2' );
	} );

	it( 'renders the item resolving type', () => {
		store.getClipboardItems = [ {
			itemId: 'call#1',
			originKey: 'Z20K2',
			originSlotType: 'Z7',
			objectType: 'Z6',
			resolvingType: 'Z6',
			value: { Z1K1: 'Z6', Z6K1: 'foo' }
		} ];

		const wrapper = renderClipboardDialog();

		const item = wrapper.findAll( '.ext-wikilambda-app-clipboard__item' )[ 0 ];

		const head = item.find( '.ext-wikilambda-app-clipboard__item-head' );
		const type = head.findComponent( { name: 'wl-z-object-to-string' } );
		expect( type.exists() ).toBe( true );
		expect( type.props( 'edit' ) ).toBe( false );
		expect( type.props( 'objectValue' ) ).toBe( 'Z6' );
	} );

	it( 'renders the item resolving type when something other than a reference', () => {
		const typedList = { Z1K1: 'Z7', Z7K1: 'Z881', Z881K1: 'Z6' };
		store.getClipboardItems = [ {
			itemId: 'call#1',
			originKey: 'Z20K2',
			originSlotType: 'Z7',
			objectType: 'Z7',
			resolvingType: typedList,
			value: { Z1K1: 'Z7', Z7K1: 'Z10000', Z10000K1: 'foo' }
		} ];

		const wrapper = renderClipboardDialog();

		const item = wrapper.findAll( '.ext-wikilambda-app-clipboard__item' )[ 0 ];

		const head = item.find( '.ext-wikilambda-app-clipboard__item-head' );
		const type = head.findComponent( { name: 'wl-z-object-to-string' } );
		expect( type.exists() ).toBe( true );
		expect( type.props( 'edit' ) ).toBe( false );
		expect( type.props( 'objectValue' ) ).toBe( typedList );
	} );

	it( 'renders the item value', () => {
		const copiedValue = { Z1K1: 'Z7', Z7K1: 'Z10000', Z10000K1: 'foo' };
		store.getClipboardItems = [ {
			itemId: 'call#1',
			originKey: 'Z20K2',
			originSlotType: 'Z7',
			objectType: 'Z7',
			resolvingType: 'Z6',
			value: copiedValue
		} ];

		const wrapper = renderClipboardDialog();

		const item = wrapper.findAll( '.ext-wikilambda-app-clipboard__item' )[ 0 ];

		const body = item.find( '.ext-wikilambda-app-clipboard__item-body' );
		const value = body.findComponent( { name: 'wl-z-object-to-string' } );
		expect( value.exists() ).toBe( true );
		expect( value.props( 'edit' ) ).toBe( false );
		expect( value.props( 'objectValue' ) ).toBe( copiedValue );
	} );

	describe( 'type compatibility', () => {
		it( 'shows all items as compatible when expectedType is unbound', () => {
			store.getClipboardItems = [ {
				itemId: 'item#1',
				originKey: '1',
				value: '',
				// Function call with bound output
				originSlotType: 'Z1',
				objectType: 'Z7',
				resolvingType: 'Z6'
			}, {
				itemId: 'item#2',
				originKey: '1',
				value: '',
				// Very bound typed
				originSlotType: 'Z6',
				objectType: 'Z6',
				resolvingType: 'Z6'
			}, {
				itemId: 'item#3',
				originKey: '1',
				value: '',
				// Very loosely typed
				originSlotType: 'Z1',
				objectType: 'Z7',
				resolvingType: 'Z1'
			} ];

			const wrapper = renderClipboardDialog( {
				expectedType: 'Z1'
			} );

			const items = wrapper.findAll( '.ext-wikilambda-app-clipboard__item' );

			// item#1 is enabled
			expect( items[ 0 ].text() ).toContain( 'item#1' );
			expect( items[ 0 ].classes() ).not.toContain( 'ext-wikilambda-app-clipboard__item--disabled' );
			// item#2 is enabled
			expect( items[ 1 ].text() ).toContain( 'item#2' );
			expect( items[ 1 ].classes() ).not.toContain( 'ext-wikilambda-app-clipboard__item--disabled' );
			// item#3 is enabled
			expect( items[ 2 ].text() ).toContain( 'item#3' );
			expect( items[ 2 ].classes() ).not.toContain( 'ext-wikilambda-app-clipboard__item--disabled' );
		} );

		it( 'shows some items as compatible when expectedType is bound', () => {
			store.getClipboardItems = [ {
				itemId: 'item#1',
				originKey: '1',
				value: '',
				// Function call with bound output: allowed
				originSlotType: 'Z1',
				objectType: 'Z7',
				resolvingType: 'Z6'
			}, {
				itemId: 'item#2',
				originKey: '1',
				value: '',
				// Very bound typed: allowed
				originSlotType: 'Z6',
				objectType: 'Z6',
				resolvingType: 'Z6'
			}, {
				itemId: 'item#3',
				originKey: '1',
				value: '',
				// Loosely typed but comes from a bound slot: allowed
				originSlotType: 'Z6',
				objectType: 'Z7',
				resolvingType: 'Z1'
			}, {
				itemId: 'item#4',
				originKey: '1',
				value: '',
				// Very loosely typed: not allowed
				originSlotType: 'Z1',
				objectType: 'Z7',
				resolvingType: 'Z1'
			} ];

			const wrapper = renderClipboardDialog( {
				expectedType: 'Z6'
			} );

			const items = wrapper.findAll( '.ext-wikilambda-app-clipboard__item' );

			// item#1 is enabled
			expect( items[ 0 ].text() ).toContain( 'item#1' );
			expect( items[ 0 ].classes() ).not.toContain( 'ext-wikilambda-app-clipboard__item--disabled' );
			// item#2 is enabled
			expect( items[ 1 ].text() ).toContain( 'item#2' );
			expect( items[ 1 ].classes() ).not.toContain( 'ext-wikilambda-app-clipboard__item--disabled' );
			// item#3 is enabled
			expect( items[ 2 ].text() ).toContain( 'item#3' );
			expect( items[ 2 ].classes() ).not.toContain( 'ext-wikilambda-app-clipboard__item--disabled' );
			// item#4 is disabled
			expect( items[ 3 ].text() ).toContain( 'item#4' );
			expect( items[ 3 ].classes() ).toContain( 'ext-wikilambda-app-clipboard__item--disabled' );
		} );
	} );

	describe( 'filter by type or key', () => {
		it( 'filters by item name', async () => {
			store.getClipboardItems = [ {
				itemId: 'name#1',
				originKey: '1',
				value: '',
				originSlotType: 'Z6',
				objectType: 'Z6',
				resolvingType: 'Z6'
			}, {
				itemId: 'foo#1',
				originKey: '1',
				value: '',
				originSlotType: 'Z6',
				objectType: 'Z6',
				resolvingType: 'Z6'
			}, {
				itemId: 'gregorian calendar date#3',
				originKey: '1',
				value: '',
				originSlotType: 'Z6',
				objectType: 'Z6',
				resolvingType: 'Z6'
			}, {
				itemId: 'Language Name#4',
				originKey: '1',
				value: '',
				originSlotType: 'Z6',
				objectType: 'Z6',
				resolvingType: 'Z6'
			} ];

			const wrapper = renderClipboardDialog();
			expect( wrapper.findAll( '.ext-wikilambda-app-clipboard__item' ).length ).toBe( 4 );

			const search = wrapper.findComponent( { name: 'cdx-search-input' } );
			await search.vm.$emit( 'update:modelValue', 'NAM' );

			const items = wrapper.findAll( '.ext-wikilambda-app-clipboard__item' );
			expect( items.length ).toBe( 2 );

			expect( items[ 0 ].text() ).toContain( 'name#1' );
			expect( items[ 1 ].text() ).toContain( 'Language Name#4' );
		} );

		it( 'filters by item name', async () => {
			store.getClipboardItems = [ {
				itemId: 'item#1',
				originKey: '1',
				value: '',
				// Matches "String" as objectType
				originSlotType: 'Z1',
				objectType: 'Z6',
				resolvingType: 'Z6'
			}, {
				itemId: 'item#2',
				originKey: '1',
				value: '',
				// No match
				originSlotType: 'Z1',
				objectType: 'Z7',
				resolvingType: 'Z1'
			}, {
				itemId: 'item#3',
				originKey: '1',
				value: '',
				// Matches "Monolingual string" as resolvingType
				originSlotType: 'Z1',
				objectType: 'Z7',
				resolvingType: 'Z11'
			}, {
				itemId: 'item#4',
				originKey: '1',
				value: '',
				// Matches "String" as originSlotType
				originSlotType: 'Z6',
				objectType: 'Z7',
				resolvingType: 'Z1'
			} ];

			const wrapper = renderClipboardDialog();
			expect( wrapper.findAll( '.ext-wikilambda-app-clipboard__item' ).length ).toBe( 4 );

			const search = wrapper.findComponent( { name: 'cdx-search-input' } );
			await search.vm.$emit( 'update:modelValue', 'STR' );

			const items = wrapper.findAll( '.ext-wikilambda-app-clipboard__item' );
			expect( items.length ).toBe( 3 );

			expect( items[ 0 ].text() ).toContain( 'item#1' );
			expect( items[ 1 ].text() ).toContain( 'item#3' );
			expect( items[ 2 ].text() ).toContain( 'item#4' );
		} );
	} );

	describe( 'item selection', () => {
		beforeEach( () => {
			store.getClipboardItems = [ {
				itemId: 'item#1',
				originKey: '1',
				value: '',
				// Function call with bound output: allowed
				originSlotType: 'Z1',
				objectType: 'Z7',
				resolvingType: 'Z6'
			}, {
				itemId: 'item#2',
				originKey: '1',
				value: '',
				// Very loosely typed: not allowed
				originSlotType: 'Z1',
				objectType: 'Z7',
				resolvingType: 'Z1'
			} ];
		} );

		it( 'does nothing when disabled item is clicked', async () => {
			const wrapper = renderClipboardDialog( {
				expectedType: 'Z6'
			} );

			const items = wrapper.findAll( '.ext-wikilambda-app-clipboard__item' );

			// Make sure second item is disabled
			expect( items[ 1 ].text() ).toContain( 'item#2' );
			expect( items[ 1 ].classes() ).toContain( 'ext-wikilambda-app-clipboard__item--disabled' );

			// Click on it
			await items[ 1 ].trigger( 'click' );

			// Nothing happens
			expect( wrapper.emitted( 'paste' ) ).toBeUndefined();
			expect( wrapper.emitted( 'close-dialog' ) ).toBeUndefined();
		} );

		it( 'emits paste and closes dialog when enabled item is clicked', async () => {
			store.getCurrentZObjectType = 'Z14';

			const wrapper = renderClipboardDialog( {
				expectedType: 'Z6'
			} );

			const items = wrapper.findAll( '.ext-wikilambda-app-clipboard__item' );

			// Make sure first item is enabled
			expect( items[ 0 ].text() ).toContain( 'item#1' );
			expect( items[ 0 ].classes() ).not.toContain( 'ext-wikilambda-app-clipboard__item--disabled' );

			// Click on it
			await items[ 0 ].trigger( 'click' );

			// Paste and close dialog happen
			expect( wrapper.emitted( 'paste' ) ).toEqual( [ [ {
				isCompatible: true,
				isExpanded: false,
				itemId: 'item#1',
				originKey: '1',
				value: '',
				originSlotType: 'Z1',
				objectType: 'Z7',
				resolvingType: 'Z6'
			} ] ] );

			const streamName = 'mediawiki.product_metrics.wikifunctions_ui';
			const schemaID = '/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0';
			const interactionData = {
				zobjectid: 'Z0',
				zobjecttype: 'Z14',
				zlang: 'Z1002'
			};
			expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith( streamName, schemaID, 'paste', interactionData );

			expect( wrapper.emitted( 'close-dialog' ) ).toBeTruthy();
		} );
	} );
} );
