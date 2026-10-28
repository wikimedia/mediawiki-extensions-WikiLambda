/*!
 * WikiLambda unit test suite for the AbstractContentSection component.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock;
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractContentSection = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractContentSection.vue' );
const { sha256, stabilize } = require( '../../../../resources/ext.wikilambda.app/utils/miscUtils.js' );

const keyPath = 'abstractwiki.sections.Q8776414.fragments.1';
const benjaminType = { Z1K1: 'Z9', Z9K1: 'Z89' };
const fragmentCall = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z444' },
	Z444K1: { Z1K1: 'Z6', Z6K1: 'some composition' }
};
const section = {
	index: 0,
	qid: 'Q8776414',
	labelData: { label: 'Abstract Wikipedia' },
	fragments: [ benjaminType, fragmentCall ],
	fragmentsPath: 'abstractwiki.sections.Q8776414.fragments'
};

describe( 'AbstractContentSection', () => {
	let mockMenuActions;
	let store;

	function renderSection( props = {}, mountOptions = {} ) {
		return shallowMount( AbstractContentSection, {
			props: {
				section,
				edit: true,
				...props
			},
			global: {
				provide: {
					useMenuAction: () => mockMenuActions
				},
				stubs: {
					'wl-abstract-content-fragment': true,
					'cdx-menu-button': true,
					'cdx-icon': true
				}
			},
			...mountOptions
		} );
	}

	beforeEach( () => {
		mockMenuActions = {
			addAfter: jest.fn(),
			addBefore: jest.fn(),
			addListItem: jest.fn(),
			moveAfter: jest.fn(),
			moveBefore: jest.fn(),
			moveTo: jest.fn(),
			deleteListItem: jest.fn(),
			openFunctionCallLink: jest.fn()
		};
		store = useMainStore();
		store.setFunctionCallArguments = jest.fn();
		store.getStoredObject = jest.fn().mockReturnValue( {
			Z2K2: { Z1K1: 'Z8', Z8K2: 'Z89' }
		} );
		store.getSuggestedHtmlFunctions = [ 'Z10001', 'Z10002' ];
		store.getLabelData = createLabelDataMock( {
			Z10001: 'section title',
			Z10002: 'paragraph'
		} );
		store.copyToClipboard = jest.fn();
		store.getInteractionData = {
			zobjectid: 'Q42',
			zobjecttype: 'abstractwiki',
			zlang: 'Z1002',
			action_source: 'abstractwiki'
		};
	} );

	describe( 'Event logging', () => {
		const identity = {
			zobjectid: 'Q42',
			zobjecttype: 'abstractwiki',
			zlang: 'Z1002',
			action_source: 'abstractwiki'
		};

		it( 'emits change event when adding an empty fragment', () => {
			const wrapper = renderSection();

			wrapper.findComponent( { name: 'cdx-menu-button' } )
				.vm.$emit( 'update:selected', Constants.LIST_MENU_OPTIONS.ADD_FRAGMENT );

			expect( mw.testKitchen.getInstrument().send ).toHaveBeenCalledWith(
				'change',
				Object.assign( {}, identity, { action_subtype: 'add_fragment_empty' } )
			);
		} );

		it( 'emits change event with the function zid when adding a suggested fragment', () => {
			const wrapper = renderSection();

			wrapper.findComponent( { name: 'cdx-menu-button' } ).vm.$emit( 'update:selected', 'Z10001' );

			expect( mw.testKitchen.getInstrument().send ).toHaveBeenCalledWith(
				'change',
				Object.assign( {}, identity, {
					selectedfunctionzid: 'Z10001',
					action_subtype: 'add_fragment_suggested'
				} )
			);
		} );

		it( 'emits change event when deleting a fragment', () => {
			const wrapper = renderSection();

			wrapper.findComponent( { name: 'wl-abstract-content-fragment' } )
				.trigger( 'action', { action: Constants.LIST_MENU_OPTIONS.DELETE_ITEM } );

			expect( mw.testKitchen.getInstrument().send ).toHaveBeenCalledWith(
				'change',
				Object.assign( {}, identity, { action_subtype: 'delete_fragment' } )
			);
		} );

		it( 'emits change event when moving a fragment', () => {
			const wrapper = renderSection();

			wrapper.findComponent( { name: 'wl-abstract-content-fragment' } )
				.trigger( 'action', { action: Constants.LIST_MENU_OPTIONS.MOVE_BEFORE } );

			expect( mw.testKitchen.getInstrument().send ).toHaveBeenCalledWith(
				'change',
				Object.assign( {}, identity, { action_subtype: 'move_fragment_before' } )
			);
		} );

		it( 'emits no change event for the clipboard actions, which log copy and paste', () => {
			const wrapper = renderSection();
			const fragment = wrapper.findComponent( { name: 'wl-abstract-content-fragment' } );

			fragment.trigger( 'action', { action: Constants.LIST_MENU_OPTIONS.COPY_CLIPBOARD } );
			fragment.trigger( 'action', { action: Constants.LIST_MENU_OPTIONS.PASTE_CLIPBOARD } );

			expect( mw.testKitchen.getInstrument().send ).not.toHaveBeenCalledWith(
				'change',
				expect.anything()
			);
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderSection();

		expect( wrapper.find( '.ext-wikilambda-app-abstract-content-section' ).exists() ).toBe( true );
	} );

	it( 'renders section title with label and qid', () => {
		const wrapper = renderSection();

		expect( wrapper.text() ).toContain( 'Abstract Wikipedia' );
		expect( wrapper.text() ).toContain( '(Q8776414)' );
	} );

	it( 'renders fragments, excluding the benjamin item (index 0)', () => {
		const wrapper = renderSection();

		const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );

		expect( fragments.length ).toBe( 1 );
		expect( fragments[ 0 ].props( 'keyPath' ) ).toBe( keyPath );
	} );

	it( 'passes edit prop to fragments', () => {
		const wrapper = renderSection();

		const fragment = wrapper.findComponent( {
			name: 'wl-abstract-content-fragment'
		} );

		expect( fragment.props( 'edit' ) ).toBe( true );
	} );

	it( 'does not show add fragment menu button when edit=false', () => {
		const wrapper = renderSection( { edit: false } );

		const button = wrapper.findComponent( { name: 'cdx-menu-button' } );
		expect( button.exists() ).toBe( false );
	} );

	it( 'shows add fragment menu button when edit=true', () => {
		const wrapper = renderSection();

		const button = wrapper.findComponent( { name: 'cdx-menu-button' } );
		expect( button.exists() ).toBe( true );
	} );

	it( 'adds special function fragments to the menu button', () => {
		const wrapper = renderSection();

		const menuButton = wrapper.findComponent( { name: 'cdx-menu-button' } );
		const menuItems = menuButton.props( 'menuItems' );

		// Expect two sections
		expect( menuItems.length ).toBe( 2 );
		// Expect second section to contain two items
		expect( menuItems[ 1 ].items.length ).toBe( 2 );
		expect( menuItems[ 1 ].items[ 0 ].value ).toBe( 'Z10001' );
		expect( menuItems[ 1 ].items[ 0 ].label ).toBe( 'Add section title' );
		expect( menuItems[ 1 ].items[ 1 ].value ).toBe( 'Z10002' );
		expect( menuItems[ 1 ].items[ 1 ].label ).toBe( 'Add paragraph' );
	} );

	it( 'adds a fragment at the end when clicking add fragment', () => {
		const wrapper = renderSection();

		const menuButton = wrapper.findComponent( { name: 'cdx-menu-button' } );
		menuButton.vm.$emit( 'update:selected', Constants.LIST_MENU_OPTIONS.ADD_FRAGMENT );

		expect( mockMenuActions.addListItem ).toHaveBeenCalledWith(
			{ type: Constants.Z_FUNCTION_CALL },
			section.fragmentsPath,
			section.fragments.length
		);
	} );

	it( 'adds a function fragment at the end when clicking add special fragment', () => {
		const wrapper = renderSection();

		const menuButton = wrapper.findComponent( { name: 'cdx-menu-button' } );
		menuButton.vm.$emit( 'update:selected', 'Z10001' );

		expect( mockMenuActions.addListItem ).toHaveBeenCalledWith(
			{ type: Constants.Z_FUNCTION_CALL, value: 'Z10001' },
			section.fragmentsPath,
			section.fragments.length
		);

		expect( store.setFunctionCallArguments ).toHaveBeenCalledWith( {
			keyPath: 'abstractwiki.sections.Q8776414.fragments.2'.split( '.' ),
			functionZid: 'Z10001'
		} );
	} );

	it( 'moves a fragment up one position', () => {
		const wrapper = renderSection();

		const fragment = wrapper.findComponent( { name: 'wl-abstract-content-fragment' } );
		fragment.trigger( 'action', { action: Constants.LIST_MENU_OPTIONS.MOVE_BEFORE } );

		expect( mockMenuActions.moveBefore ).toHaveBeenCalledWith( keyPath );
	} );

	it( 'moves a fragment down one position', () => {
		const wrapper = renderSection();

		const fragment = wrapper.findComponent( { name: 'wl-abstract-content-fragment' } );
		fragment.trigger( 'action', { action: Constants.LIST_MENU_OPTIONS.MOVE_AFTER } );

		expect( mockMenuActions.moveAfter ).toHaveBeenCalledWith( keyPath );
	} );

	it( 'adds a fragment before current position', () => {
		const wrapper = renderSection();

		const fragment = wrapper.findComponent( { name: 'wl-abstract-content-fragment' } );
		fragment.trigger( 'action', { action: Constants.LIST_MENU_OPTIONS.ADD_BEFORE } );

		const objectPayload = { type: Constants.Z_FUNCTION_CALL };
		expect( mockMenuActions.addBefore ).toHaveBeenCalledWith( objectPayload, keyPath );
	} );

	it( 'adds a fragment after current position', () => {
		const wrapper = renderSection();

		const fragment = wrapper.findComponent( { name: 'wl-abstract-content-fragment' } );
		fragment.trigger( 'action', { action: Constants.LIST_MENU_OPTIONS.ADD_AFTER } );

		const objectPayload = { type: Constants.Z_FUNCTION_CALL };
		expect( mockMenuActions.addAfter ).toHaveBeenCalledWith( objectPayload, keyPath );
	} );

	it( 'deletes the selected fragment', () => {
		const wrapper = renderSection();

		const fragment = wrapper.findComponent( { name: 'wl-abstract-content-fragment' } );
		fragment.trigger( 'action', { action: Constants.LIST_MENU_OPTIONS.DELETE_ITEM } );

		expect( mockMenuActions.deleteListItem ).toHaveBeenCalledWith( keyPath );
	} );

	it( 'opens the function call of the selected fragment on Wikifunctions', () => {
		const wrapper = renderSection();

		const fragment = wrapper.findComponent( { name: 'wl-abstract-content-fragment' } );
		fragment.trigger( 'action', { action: Constants.LIST_MENU_OPTIONS.TRY_FUNCTION_CALL } );

		expect( mockMenuActions.openFunctionCallLink ).toHaveBeenCalledWith( keyPath );
	} );

	it( 'refreshes a fragment hash when fragment child component detects a change', async () => {
		const fragmentHash = await sha256( JSON.stringify( stabilize( fragmentCall ) ) );

		store.setAbstractFragmentHash = jest.fn();
		const wrapper = renderSection();

		const fragment = wrapper.findComponent( { name: 'wl-abstract-content-fragment' } );
		fragment.trigger( 'rehash' );

		await waitFor( () => expect( store.setAbstractFragmentHash ).toHaveBeenCalledTimes( 1 ) );
		expect( store.setAbstractFragmentHash ).toHaveBeenCalledWith( section.qid, 0, fragmentHash );
	} );
	describe( 'dragging a fragment', () => {
		const threeFragments = Object.assign( {}, section, {
			fragments: [ benjaminType, fragmentCall, fragmentCall, fragmentCall ]
		} );

		/**
		 * Give the list and the fragments a layout, because jsdom draws nothing.
		 * Three fragments, each 20px high, from y=100 to y=160.
		 *
		 * @param {Object} wrapper
		 */
		function setLayout( wrapper ) {
			const list = wrapper.vm.listRef;
			list.getBoundingClientRect = () => ( { top: 100, left: 0, right: 200, height: 60 } );
			const rows = list.querySelectorAll( '.ext-wikilambda-app-abstract-content-section-fragment' );
			expect( rows.length ).toBe( 3 );
			rows.forEach( ( row, position ) => {
				row.getBoundingClientRect = () => (
					{ top: 100 + ( position * 20 ), left: 0, right: 200, height: 20 }
				);
			} );
		}

		/**
		 * Dispatch a pointer event on the window, as the browser does during a drag.
		 *
		 * @param {string} type
		 * @param {Object} properties
		 */
		function firePointer( type, properties = {} ) {
			const event = new Event( type, { bubbles: true, cancelable: true } );
			Object.assign( event, { pointerId: 1, clientX: 0, clientY: 0 }, properties );
			window.dispatchEvent( event );
		}

		it( 'passes the drag state to the fragments', () => {
			const wrapper = renderSection( { section: threeFragments } );

			const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			expect( fragments[ 0 ].props( 'dragging' ) ).toBe( false );
			expect( fragments[ 0 ].props( 'dragged' ) ).toBe( false );
		} );

		it( 'marks the dragged fragment while the user drags it', async () => {
			const wrapper = renderSection( { section: threeFragments } );
			setLayout( wrapper );

			const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			fragments[ 0 ].vm.$emit( 'dragstart', { pointerId: 1, button: 0, clientX: 50, clientY: 110 } );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			await wrapper.vm.$nextTick();

			const dragged = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			expect( dragged[ 0 ].props( 'dragging' ) ).toBe( true );
			expect( dragged[ 0 ].props( 'dragged' ) ).toBe( true );
			expect( dragged[ 1 ].props( 'dragged' ) ).toBe( false );

			firePointer( 'pointercancel' );
		} );

		it( 'shows the line that gives the target position during a drag', async () => {
			const wrapper = renderSection( { section: threeFragments } );
			setLayout( wrapper );

			expect( wrapper.find( '.ext-wikilambda-app-abstract-content-section-insertion' ).exists() )
				.toBe( false );

			const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			fragments[ 0 ].vm.$emit( 'dragstart', { pointerId: 1, button: 0, clientX: 50, clientY: 110 } );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			await wrapper.vm.$nextTick();

			const line = wrapper.find( '.ext-wikilambda-app-abstract-content-section-insertion' );
			expect( line.exists() ).toBe( true );
			expect( line.attributes( 'style' ) ).toContain( 'top: 60px' );

			firePointer( 'pointercancel' );
		} );

		it( 'moves the fragment to the target position on drop', () => {
			const wrapper = renderSection( { section: threeFragments } );
			setLayout( wrapper );

			const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			fragments[ 0 ].vm.$emit( 'dragstart', { pointerId: 1, button: 0, clientX: 50, clientY: 110 } );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			firePointer( 'pointerup', { clientX: 50, clientY: 155 } );

			expect( mockMenuActions.moveTo ).toHaveBeenCalledTimes( 1 );
			expect( mockMenuActions.moveTo )
				.toHaveBeenCalledWith( 'abstractwiki.sections.Q8776414.fragments.1', 3 );
		} );

		it( 'does not move the fragment when the drop keeps the order', () => {
			const wrapper = renderSection( { section: threeFragments } );
			setLayout( wrapper );

			const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			fragments[ 0 ].vm.$emit( 'dragstart', { pointerId: 1, button: 0, clientX: 50, clientY: 110 } );
			firePointer( 'pointermove', { clientX: 50, clientY: 115 } );
			firePointer( 'pointerup', { clientX: 50, clientY: 115 } );

			expect( mockMenuActions.moveTo ).not.toHaveBeenCalled();
		} );

		it( 'marks the list while the user drags a fragment', async () => {
			const wrapper = renderSection( { section: threeFragments } );
			setLayout( wrapper );
			const list = wrapper.find( '.ext-wikilambda-app-abstract-content-section-fragments' );

			expect( list.classes() ).not.toContain( 'ext-wikilambda-app-abstract-content-section-fragments__dragging' );

			const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			fragments[ 0 ].vm.$emit( 'dragstart', { pointerId: 1, button: 0, clientX: 50, clientY: 110 } );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			await wrapper.vm.$nextTick();

			expect( list.classes() ).toContain( 'ext-wikilambda-app-abstract-content-section-fragments__dragging' );

			firePointer( 'pointercancel' );
		} );

		it( 'shows a copy of the dragged fragment under the line', async () => {
			const wrapper = renderSection( { section: threeFragments } );
			setLayout( wrapper );
			const rows = wrapper.vm.listRef.querySelectorAll( '.ext-wikilambda-app-abstract-content-section-fragment' );
			rows[ 0 ].id = 'fragment-one';
			rows[ 0 ].innerHTML = '<span id="inner-one">first fragment</span>' +
				'<span class="ext-wikilambda-app-abstract-content-fragment-menu">menu</span>';
			// The old place can be hidden and moved during the drag
			rows[ 0 ].classList.add(
				'ext-wikilambda-app-abstract-content-fragment__dragged',
				'ext-wikilambda-app-abstract-content-fragment__in-place'
			);
			rows[ 0 ].style.transform = 'translateY( 30px )';

			const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			fragments[ 0 ].vm.$emit( 'dragstart', { pointerId: 1, button: 0, clientX: 50, clientY: 110 } );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			await wrapper.vm.$nextTick();
			await wrapper.vm.$nextTick();

			const ghost = wrapper.find( '.ext-wikilambda-app-abstract-content-section-ghost' );
			expect( ghost.exists() ).toBe( true );
			expect( ghost.attributes( 'aria-hidden' ) ).toBe( 'true' );
			// The target is after the last fragment, at 60px in the list
			expect( ghost.attributes( 'style' ) ).toContain( 'top: 60px' );
			// The copy shows the fragment without its actions menu
			expect( ghost.text() ).toBe( 'first fragment' );
			// The copy shows no state of the old place
			const copy = ghost.element.firstElementChild;
			expect( Array.from( copy.classList ).filter(
				( name ) => name.startsWith( 'ext-wikilambda-app-abstract-content-fragment__' )
			) ).toEqual( [] );
			expect( copy.getAttribute( 'style' ) ).toBeNull();
			// The copy repeats no id, and it is not a fragment of the list
			expect( ghost.element.querySelectorAll( '[id]' ).length ).toBe( 0 );
			expect( ghost.element.querySelectorAll( '.ext-wikilambda-app-abstract-content-section-fragment' ).length )
				.toBe( 0 );

			firePointer( 'pointercancel' );
		} );

		it( 'keeps a checked radio button of the dragged fragment checked', async () => {
			const wrapper = renderSection( { section: threeFragments }, { attachTo: document.body } );
			setLayout( wrapper );
			const rows = wrapper.vm.listRef.querySelectorAll( '.ext-wikilambda-app-abstract-content-section-fragment' );
			rows[ 0 ].innerHTML = '<input type="radio" name="fragment-one-bool" value="Z41" checked>' +
				'<input type="radio" name="fragment-one-bool" value="Z42">';
			const original = rows[ 0 ].querySelector( 'input[value="Z41"]' );

			const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			fragments[ 0 ].vm.$emit( 'dragstart', { pointerId: 1, button: 0, clientX: 50, clientY: 110 } );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			await wrapper.vm.$nextTick();
			await wrapper.vm.$nextTick();

			const ghost = wrapper.find( '.ext-wikilambda-app-abstract-content-section-ghost' );
			// The copy has no field names, so it joins no group of the original
			expect( ghost.element.querySelectorAll( '[name]' ).length ).toBe( 0 );
			expect( ghost.element.querySelector( 'input[value="Z41"]' ).checked ).toBe( true );
			expect( original.checked ).toBe( true );

			firePointer( 'pointercancel' );
			wrapper.unmount();
		} );

		it( 'opens a gap for the copy at the target', async () => {
			jest.spyOn( HTMLElement.prototype, 'offsetHeight', 'get' ).mockReturnValue( 30 );
			const wrapper = renderSection( { section: threeFragments } );
			setLayout( wrapper );

			// Drag the last fragment above the first one
			const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			fragments[ 2 ].vm.$emit( 'dragstart', { pointerId: 1, button: 0, clientX: 50, clientY: 150 } );
			firePointer( 'pointermove', { clientX: 50, clientY: 105 } );
			await wrapper.vm.$nextTick();
			await wrapper.vm.$nextTick();

			// The gap is the height of the copy, and a little space
			const rows = wrapper.findAll( '.ext-wikilambda-app-abstract-content-section-fragment' );
			rows.forEach( ( row ) => {
				expect( row.attributes( 'style' ) ).toContain( 'translateY( 34px )' );
			} );
			expect( wrapper.find( '.ext-wikilambda-app-abstract-content-section-fragments' ).attributes( 'style' ) )
				.toContain( 'padding-bottom: 34px' );

			firePointer( 'pointercancel' );
			jest.restoreAllMocks();
		} );

		it( 'shows the line and the copy at the old place when the drop keeps the order', async () => {
			const wrapper = renderSection( { section: threeFragments } );
			setLayout( wrapper );

			// Drag the second fragment a little down, over its own place
			const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			fragments[ 1 ].vm.$emit( 'dragstart', { pointerId: 1, button: 0, clientX: 50, clientY: 125 } );
			firePointer( 'pointermove', { clientX: 50, clientY: 135 } );
			await wrapper.vm.$nextTick();

			// The second fragment starts 20px down the list
			const ghost = wrapper.find( '.ext-wikilambda-app-abstract-content-section-ghost' );
			expect( ghost.exists() ).toBe( true );
			expect( ghost.attributes( 'style' ) ).toContain( 'top: 20px' );
			const line = wrapper.find( '.ext-wikilambda-app-abstract-content-section-insertion' );
			expect( line.exists() ).toBe( true );
			expect( line.attributes( 'style' ) ).toContain( 'top: 20px' );
			// The old place does not show, and the copy fits in its room
			const dragged = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			expect( dragged[ 1 ].props( 'inPlace' ) ).toBe( true );
			expect( dragged[ 0 ].props( 'inPlace' ) ).toBe( false );
			wrapper.findAll( '.ext-wikilambda-app-abstract-content-section-fragment' ).forEach( ( row ) => {
				expect( row.attributes( 'style' ) ).toBeUndefined();
			} );

			firePointer( 'pointercancel' );
		} );

		it( 'keeps the copy and the line when the pointer leaves the list sideways', async () => {
			const wrapper = renderSection( { section: threeFragments } );
			setLayout( wrapper );

			const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			fragments[ 0 ].vm.$emit( 'dragstart', { pointerId: 1, button: 0, clientX: 50, clientY: 110 } );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			firePointer( 'pointermove', { clientX: 400, clientY: 155 } );
			await wrapper.vm.$nextTick();

			expect( wrapper.find( '.ext-wikilambda-app-abstract-content-section-ghost' ).exists() ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-app-abstract-content-section-insertion' ).exists() ).toBe( true );

			firePointer( 'pointercancel' );
		} );

		it( 'removes the copy of the dragged fragment after the drop', async () => {
			const wrapper = renderSection( { section: threeFragments } );
			setLayout( wrapper );

			const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			fragments[ 0 ].vm.$emit( 'dragstart', { pointerId: 1, button: 0, clientX: 50, clientY: 110 } );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			firePointer( 'pointerup', { clientX: 50, clientY: 155 } );
			await wrapper.vm.$nextTick();

			expect( wrapper.find( '.ext-wikilambda-app-abstract-content-section-ghost' ).exists() ).toBe( false );
			expect( wrapper.find( '.ext-wikilambda-app-abstract-content-section-insertion' ).exists() ).toBe( false );
			// The gap closes
			wrapper.findAll( '.ext-wikilambda-app-abstract-content-section-fragment' ).forEach( ( row ) => {
				expect( row.attributes( 'style' ) ).toBeUndefined();
			} );
		} );
	} );

	describe( 'moving fragments', () => {
		const fragmentA = JSON.parse( JSON.stringify( fragmentCall ) );
		const fragmentB = JSON.parse( JSON.stringify( fragmentCall ) );

		it( 'keeps the fragment components when the fragments move', async () => {
			const wrapper = renderSection( {
				section: Object.assign( {}, section, { fragments: [ benjaminType, fragmentA, fragmentB ] } )
			} );
			const before = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } )
				.map( ( fragment ) => fragment.vm );

			await wrapper.setProps( {
				section: Object.assign( {}, section, { fragments: [ benjaminType, fragmentB, fragmentA ] } )
			} );

			// The components move with their fragments: Vue does not destroy and recreate them
			const after = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } )
				.map( ( fragment ) => fragment.vm );
			expect( after[ 0 ] ).toBe( before[ 1 ] );
			expect( after[ 1 ] ).toBe( before[ 0 ] );
		} );

		it( 'gives the focus back after a move with the actions menu', async () => {
			const button = document.createElement( 'button' );
			// The browser takes the focus away from a node that moves
			mockMenuActions.moveBefore = jest.fn( () => button.blur() );
			const wrapper = renderSection( {
				section: Object.assign( {}, section, { fragments: [ benjaminType, fragmentA, fragmentB ] } )
			}, { attachTo: document.body } );
			const rows = wrapper.vm.listRef.querySelectorAll( '.ext-wikilambda-app-abstract-content-section-fragment' );
			rows[ 1 ].appendChild( button );
			button.focus();

			const fragments = wrapper.findAllComponents( { name: 'wl-abstract-content-fragment' } );
			fragments[ 1 ].vm.$emit( 'action', { action: Constants.LIST_MENU_OPTIONS.MOVE_BEFORE } );
			await wrapper.vm.$nextTick();

			expect( mockMenuActions.moveBefore ).toHaveBeenCalledWith( `${ section.fragmentsPath }.2` );
			expect( document.activeElement ).toBe( button );
			wrapper.unmount();
		} );
	} );

} );
