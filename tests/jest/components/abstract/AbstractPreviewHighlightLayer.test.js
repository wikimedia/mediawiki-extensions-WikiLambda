/*!
 * WikiLambda unit test suite for the AbstractPreviewHighlightLayer component.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { ref } = require( 'vue' );
const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractPreviewHighlightLayer = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractPreviewHighlightLayer.vue' );

const hoveredKeyPath = 'abstractwiki.sections.Q8776414.fragments.1';
const selectedKeyPath = 'abstractwiki.sections.Q8776414.fragments.2';

const RECT_SELECTOR = '.ext-wikilambda-app-abstract-preview__highlight-layer-rect';
const SELECTED_SELECTOR = '.ext-wikilambda-app-abstract-preview__highlight-layer-rect--selected';

/**
 * Build an element-like node that reports fixed bounds.
 *
 * @param {number} top
 * @return {Object}
 */
function elementNode( top ) {
	return {
		nodeType: 1,
		getBoundingClientRect: () => ( { top: top, left: 10, width: 100, height: 20 } )
	};
}

describe( 'AbstractPreviewHighlightLayer', () => {
	let store;

	const nodesByKeyPath = {};

	function renderLayer() {
		return shallowMount( AbstractPreviewHighlightLayer, {
			global: {
				provide: {
					previewBodyRef: ref( {
						getBoundingClientRect: () => ( { top: 0, left: 0 } )
					} ),
					fragmentHighlightRegistry: {
						getFragmentNodes: ( keyPath ) => nodesByKeyPath[ keyPath ] || null
					}
				}
			}
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getHighlightedFragment = undefined;
		store.getSelectedFragment = undefined;

		nodesByKeyPath[ hoveredKeyPath ] = [ elementNode( 100 ) ];
		nodesByKeyPath[ selectedKeyPath ] = [ elementNode( 300 ) ];
	} );

	it( 'renders no rectangles when nothing is hovered or selected', () => {
		const wrapper = renderLayer();

		expect( wrapper.findAll( RECT_SELECTOR ) ).toHaveLength( 0 );
	} );

	it( 'renders a rectangle for the hovered fragment', async () => {
		const wrapper = renderLayer();

		store.getHighlightedFragment = hoveredKeyPath;

		await waitFor( () => {
			const rects = wrapper.findAll( RECT_SELECTOR );
			expect( rects ).toHaveLength( 1 );
			expect( rects[ 0 ].classes() ).not.toContain( SELECTED_SELECTOR.slice( 1 ) );
			expect( rects[ 0 ].attributes( 'style' ) ).toContain( 'top: 100px' );
		} );
	} );

	it( 'renders a distinct rectangle for the selected fragment', async () => {
		const wrapper = renderLayer();

		store.getSelectedFragment = selectedKeyPath;

		await waitFor( () => {
			const selected = wrapper.findAll( SELECTED_SELECTOR );
			expect( selected ).toHaveLength( 1 );
			expect( selected[ 0 ].attributes( 'style' ) ).toContain( 'top: 300px' );
		} );
	} );

	it( 'renders the hovered and the selected fragment at the same time', async () => {
		const wrapper = renderLayer();

		store.getHighlightedFragment = hoveredKeyPath;
		store.getSelectedFragment = selectedKeyPath;

		await waitFor( () => {
			expect( wrapper.findAll( RECT_SELECTOR ) ).toHaveLength( 2 );
			expect( wrapper.findAll( SELECTED_SELECTOR ) ).toHaveLength( 1 );
		} );
	} );

	it( 'keeps the selected rectangle when the pointer highlight goes away', async () => {
		const wrapper = renderLayer();

		store.getSelectedFragment = selectedKeyPath;
		store.getHighlightedFragment = hoveredKeyPath;
		await waitFor( () => expect( wrapper.findAll( RECT_SELECTOR ) ).toHaveLength( 2 ) );

		store.getHighlightedFragment = undefined;

		await waitFor( () => {
			expect( wrapper.findAll( RECT_SELECTOR ) ).toHaveLength( 1 );
			expect( wrapper.findAll( SELECTED_SELECTOR ) ).toHaveLength( 1 );
		} );
	} );
} );
