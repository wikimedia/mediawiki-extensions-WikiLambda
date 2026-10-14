/*!
 * WikiLambda unit test suite for the DialogItemList component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const DialogItemList = require( '../../../../resources/ext.wikilambda.app/components/base/DialogItemList.vue' );

describe( 'DialogItemList', () => {
	const groups = [
		{ id: 'first', items: [ { zid: 'Z1002', name: 'English' } ] },
		{ id: 'second', title: 'Other', items: [
			{ zid: 'Z1003', name: 'Spanish' },
			{ zid: 'Z1004', name: 'French' }
		] }
	];

	function renderList( props = {} ) {
		return mount( DialogItemList, {
			props: { groups, itemKey: 'zid', ...props },
			slots: {
				item: '<template #item="{ item }"><span class="item-name">{{ item.name }}</span></template>'
			}
		} );
	}

	function findButtons( wrapper ) {
		return wrapper.findAll( '.ext-wikilambda-app-dialog-item-list__button' );
	}

	function keydownEnter( button ) {
		const event = new KeyboardEvent( 'keydown', { key: 'Enter', bubbles: true, cancelable: true } );
		button.element.dispatchEvent( event );
		return event;
	}

	it( 'renders one list per group, with a title only for titled groups', () => {
		const wrapper = renderList();

		const groupElements = wrapper.findAll( '.ext-wikilambda-app-dialog-item-list__group' );
		expect( groupElements.length ).toBe( 2 );
		expect( groupElements[ 0 ].find( 'h3' ).exists() ).toBe( false );
		expect( groupElements[ 0 ].find( 'ul' ).attributes( 'aria-labelledby' ) ).toBeUndefined();

		const title = groupElements[ 1 ].find( 'h3' );
		expect( title.text() ).toBe( 'Other' );
		expect( groupElements[ 1 ].find( 'ul' ).attributes( 'aria-labelledby' ) ).toBe( title.attributes( 'id' ) );
	} );

	it( 'renders each item in a button with the slot content', () => {
		const wrapper = renderList();

		const buttons = findButtons( wrapper );
		expect( buttons.length ).toBe( 3 );
		expect( buttons.map( ( button ) => button.text() ) ).toEqual( [ 'English', 'Spanish', 'French' ] );
		expect( buttons[ 0 ].attributes( 'type' ) ).toBe( 'button' );
	} );

	it( 'gives the group titles of two lists in the same app different ids', () => {
		const wrapper = mount( {
			components: { 'wl-dialog-item-list': DialogItemList },
			data: () => ( { groups } ),
			template: '<div><wl-dialog-item-list :groups="groups"></wl-dialog-item-list>' +
				'<wl-dialog-item-list :groups="groups"></wl-dialog-item-list></div>'
		} );

		const titles = wrapper.findAll( 'h3' );
		expect( titles.length ).toBe( 2 );
		expect( titles[ 0 ].attributes( 'id' ) ).not.toBe( titles[ 1 ].attributes( 'id' ) );
	} );

	it( 'emits select with the item on click', async () => {
		const wrapper = renderList();

		await findButtons( wrapper )[ 1 ].trigger( 'click' );

		expect( wrapper.emitted( 'select' ) ).toEqual( [ [ groups[ 1 ].items[ 0 ] ] ] );
	} );

	it( 'selects on Enter keyup after a keydown on the same item, and cancels the keydown', async () => {
		const wrapper = renderList();
		const buttons = findButtons( wrapper );

		// Cancelling keydown stops the browser from clicking the item on keydown,
		// which would let the keyup reopen the dialog from the button that opened it.
		expect( keydownEnter( buttons[ 2 ] ).defaultPrevented ).toBe( true );
		await wrapper.vm.$nextTick();
		expect( wrapper.emitted( 'select' ) ).toBeUndefined();

		await buttons[ 2 ].trigger( 'keyup', { key: 'Enter' } );
		expect( wrapper.emitted( 'select' ) ).toEqual( [ [ groups[ 1 ].items[ 1 ] ] ] );
	} );

	it( 'does not select on an Enter keyup without a keydown on the same item', async () => {
		const wrapper = renderList();
		const buttons = findButtons( wrapper );

		// E.g. the Enter that opened the dialog: its keyup lands on the first item
		await buttons[ 0 ].trigger( 'keyup', { key: 'Enter' } );
		// Keydown on one item, keyup on another
		keydownEnter( buttons[ 1 ] );
		await buttons[ 2 ].trigger( 'keyup', { key: 'Enter' } );

		expect( wrapper.emitted( 'select' ) ).toBeUndefined();
	} );

	it( 'ignores clicks and keys once unmounted, and keeps the focus where it is', () => {
		// A closing Codex dialog unmounts its content at once but keeps it on screen,
		// still clickable, while it fades out
		const wrapper = renderList();
		const buttons = findButtons( wrapper ).map( ( button ) => button.element );
		wrapper.unmount();

		buttons[ 0 ].dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) );
		buttons[ 1 ].dispatchEvent( new KeyboardEvent( 'keydown', { key: 'Enter', bubbles: true, cancelable: true } ) );
		buttons[ 1 ].dispatchEvent( new KeyboardEvent( 'keyup', { key: 'Enter', bubbles: true } ) );
		const mousedown = new MouseEvent( 'mousedown', { bubbles: true, cancelable: true } );
		buttons[ 2 ].dispatchEvent( mousedown );

		expect( wrapper.emitted( 'select' ) ).toBeUndefined();
		expect( mousedown.defaultPrevented ).toBe( true );
	} );

	it( 'keeps the default mousedown behaviour while mounted', () => {
		const wrapper = renderList();

		const mousedown = new MouseEvent( 'mousedown', { bubbles: true, cancelable: true } );
		findButtons( wrapper )[ 0 ].element.dispatchEvent( mousedown );

		expect( mousedown.defaultPrevented ).toBe( false );
	} );
} );
