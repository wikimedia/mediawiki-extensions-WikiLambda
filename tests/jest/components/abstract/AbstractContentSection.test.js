/*!
 * WikiLambda unit test suite for the AbstractContentSection component.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const AbstractContentSection = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractContentSection.vue' );

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

	function renderSection( props = {} ) {
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
					'cdx-button': true,
					'cdx-icon': true
				}
			}
		} );
	}

	beforeEach( () => {
		mockMenuActions = {
			addAfter: jest.fn(),
			addBefore: jest.fn(),
			addListItem: jest.fn(),
			moveAfter: jest.fn(),
			moveBefore: jest.fn(),
			deleteListItem: jest.fn()
		};
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

	it( 'does not show add fragment button when edit=false', () => {
		const wrapper = renderSection( { edit: false } );

		const button = wrapper.findComponent( { name: 'cdx-button' } );
		expect( button.exists() ).toBe( false );
	} );

	it( 'shows add fragment button when edit=true', () => {
		const wrapper = renderSection();

		const button = wrapper.findComponent( { name: 'cdx-button' } );
		expect( button.exists() ).toBe( true );
	} );

	it( 'adds a fragment at the end when clicking add fragment', () => {
		const wrapper = renderSection();

		wrapper.findComponent( { name: 'cdx-button' } ).trigger( 'click' );

		expect( mockMenuActions.addListItem ).toHaveBeenCalledWith(
			{ type: Constants.Z_FUNCTION_CALL },
			section.fragmentsPath,
			section.fragments.length
		);
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
} );
