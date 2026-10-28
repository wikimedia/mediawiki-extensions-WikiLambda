/*!
 * WikiLambda unit test suite for the useFragmentDrag composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { nextTick } = require( 'vue' );
const loadComposable = require( '../helpers/loadComposable.js' );
const useFragmentDrag = require( '../../../resources/ext.wikilambda.app/composables/useFragmentDrag.js' );

describe( 'useFragmentDrag', () => {
	// A list of three fragments, each 20px high, from y=100 to y=160
	const listRect = { top: 100, left: 0, right: 200, height: 60 };
	const fragmentRects = [
		{ top: 100, left: 0, right: 200, height: 20 },
		{ top: 120, left: 0, right: 200, height: 20 },
		{ top: 140, left: 0, right: 200, height: 20 }
	];

	let drag;
	let wrapper;
	let onDrop;
	// Distance that the page scrolled down since the start of the test
	let scrolled;
	// Height of the gap that the list opens at the target
	let gap;
	// Distance that the fragments moved down in the list since the drag started
	let moved;

	/**
	 * Move a rectangle as the page scroll moves it in the viewport.
	 *
	 * @param {Object} rect
	 * @return {Object}
	 */
	const shift = ( rect ) => Object.assign( {}, rect, { top: rect.top - scrolled } );

	/**
	 * Dispatch a pointer event on the window, as the browser does during a drag.
	 *
	 * @param {string} type
	 * @param {Object} properties
	 */
	const firePointer = ( type, properties = {} ) => {
		const event = new Event( type, { bubbles: true, cancelable: true } );
		Object.assign( event, { pointerId: 1, clientX: 0, clientY: 0 }, properties );
		window.dispatchEvent( event );
	};

	/**
	 * Build the pointer down event that the drag handle gives to startDrag.
	 *
	 * @param {Object} properties
	 * @return {Object}
	 */
	const pointerDown = ( properties = {} ) => Object.assign(
		{ pointerId: 1, button: 0, clientX: 50, clientY: 110 },
		properties
	);

	beforeEach( () => {
		scrolled = 0;
		gap = 0;
		moved = 0;
		onDrop = jest.fn();
		const [ result, testWrapper ] = loadComposable( () => useFragmentDrag( {
			getListRect: () => shift( listRect ),
			getFragmentRects: () => fragmentRects.map( shift )
				.map( ( rect ) => Object.assign( rect, { top: rect.top + moved } ) ),
			getGapHeight: () => gap,
			onDrop
		} ) );
		drag = result;
		wrapper = testWrapper;
	} );

	afterEach( () => {
		drag.cancelDrag();
		wrapper.unmount();
	} );

	describe( 'starting a drag', () => {
		it( 'does not start a drag before the pointer moves', () => {
			drag.startDrag( pointerDown(), 1 );

			expect( drag.isDragging.value ).toBe( false );
			expect( drag.draggedIndex.value ).toBe( 1 );
			expect( drag.insertionPoint.value ).toBeNull();
		} );

		it( 'does not start a drag for a move shorter than the threshold', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 52, clientY: 112 } );

			expect( drag.isDragging.value ).toBe( false );
		} );

		it( 'starts a drag when the pointer moves far enough', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 130 } );

			expect( drag.isDragging.value ).toBe( true );
		} );

		it( 'ignores a drag from a button other than the primary one', () => {
			drag.startDrag( pointerDown( { button: 2 } ), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 130 } );

			expect( drag.isDragging.value ).toBe( false );
			expect( drag.draggedIndex.value ).toBeNull();
		} );

		it( 'does not let the pointer down start a text selection', () => {
			const event = pointerDown( { preventDefault: jest.fn() } );
			drag.startDrag( event, 1 );

			expect( event.preventDefault ).toHaveBeenCalled();
		} );

		it( 'stops a text selection during the drag', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );

			const event = new Event( 'selectstart', { bubbles: true, cancelable: true } );
			document.body.dispatchEvent( event );

			expect( event.defaultPrevented ).toBe( true );
		} );

		it( 'allows a text selection after the drag', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			firePointer( 'pointerup', { clientX: 50, clientY: 155 } );

			const event = new Event( 'selectstart', { bubbles: true, cancelable: true } );
			document.body.dispatchEvent( event );

			expect( event.defaultPrevented ).toBe( false );
		} );

		it( 'ignores the moves of another pointer', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { pointerId: 2, clientX: 50, clientY: 900 } );

			expect( drag.isDragging.value ).toBe( false );
		} );
	} );

	describe( 'following the pointer', () => {
		it( 'gives the insertion point for the pointer position', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );

			expect( drag.insertionPoint.value ).toBe( 4 );
		} );

		it( 'keeps the insertion point when the pointer leaves the list sideways', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			firePointer( 'pointermove', { clientX: 400, clientY: 155 } );

			expect( drag.insertionPoint.value ).toBe( 4 );
		} );

		it( 'gives the offset of the line that shows the insertion point', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 135 } );

			// The pointer passed the middle of the first two fragments
			expect( drag.insertionPoint.value ).toBe( 3 );
			expect( drag.insertionOffset.value ).toBe( 40 );
		} );
	} );

	describe( 'dropping a fragment', () => {
		it( 'moves the fragment to the target position', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			firePointer( 'pointerup', { clientX: 50, clientY: 155 } );

			expect( onDrop ).toHaveBeenCalledTimes( 1 );
			expect( onDrop ).toHaveBeenCalledWith( 1, 3 );
		} );

		it( 'moves the fragment up the list', () => {
			drag.startDrag( pointerDown( { clientY: 150 } ), 3 );
			firePointer( 'pointermove', { clientX: 50, clientY: 105 } );
			firePointer( 'pointerup', { clientX: 50, clientY: 105 } );

			expect( onDrop ).toHaveBeenCalledWith( 3, 1 );
		} );

		it( 'does not move the fragment when the order stays the same', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 115 } );
			firePointer( 'pointerup', { clientX: 50, clientY: 115 } );

			expect( onDrop ).not.toHaveBeenCalled();
		} );

		it( 'moves the fragment when the drop is beside the list', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 400, clientY: 155 } );
			firePointer( 'pointerup', { clientX: 400, clientY: 155 } );

			expect( onDrop ).toHaveBeenCalledWith( 1, 3 );
		} );

		it( 'does not move the fragment for a click on the drag handle', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointerup', { clientX: 50, clientY: 110 } );

			expect( onDrop ).not.toHaveBeenCalled();
		} );

		it( 'clears the state of the drag after the drop', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			firePointer( 'pointerup', { clientX: 50, clientY: 155 } );

			expect( drag.isDragging.value ).toBe( false );
			expect( drag.draggedIndex.value ).toBeNull();
			expect( drag.insertionPoint.value ).toBeNull();
		} );

		it( 'stops listening for the pointer after the drop', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			firePointer( 'pointerup', { clientX: 50, clientY: 155 } );
			firePointer( 'pointermove', { clientX: 50, clientY: 105 } );

			expect( drag.insertionPoint.value ).toBeNull();
			expect( onDrop ).toHaveBeenCalledTimes( 1 );
		} );
	} );

	describe( 'stopping a drag', () => {
		it( 'stops the drag when the browser takes the pointer', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			firePointer( 'pointercancel' );

			expect( drag.isDragging.value ).toBe( false );
			expect( onDrop ).not.toHaveBeenCalled();
		} );

		it( 'stops the drag when the user presses Escape', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );

			const event = new Event( 'keydown', { bubbles: true, cancelable: true } );
			event.key = 'Escape';
			window.dispatchEvent( event );

			expect( drag.isDragging.value ).toBe( false );
			expect( onDrop ).not.toHaveBeenCalled();
		} );

		it( 'keeps the drag for a key other than Escape', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );

			const event = new Event( 'keydown', { bubbles: true, cancelable: true } );
			event.key = 'a';
			window.dispatchEvent( event );

			expect( drag.isDragging.value ).toBe( true );
		} );

		it( 'stops the drag when the component goes away', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );

			wrapper.unmount();
			firePointer( 'pointerup', { clientX: 50, clientY: 155 } );

			expect( onDrop ).not.toHaveBeenCalled();
		} );

		it( 'keeps the Escape of a drag from the other listeners', () => {
			const otherListener = jest.fn();
			document.addEventListener( 'keydown', otherListener );
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );

			const event = new Event( 'keydown', { bubbles: true, cancelable: true } );
			event.key = 'Escape';
			document.body.dispatchEvent( event );

			expect( drag.isDragging.value ).toBe( false );
			expect( otherListener ).not.toHaveBeenCalled();
			document.removeEventListener( 'keydown', otherListener );
		} );

		it( 'lets the Escape through when the drag did not start', () => {
			const otherListener = jest.fn();
			document.addEventListener( 'keydown', otherListener );
			drag.startDrag( pointerDown(), 1 );

			const event = new Event( 'keydown', { bubbles: true, cancelable: true } );
			event.key = 'Escape';
			document.body.dispatchEvent( event );

			expect( otherListener ).toHaveBeenCalledTimes( 1 );
			document.removeEventListener( 'keydown', otherListener );
		} );
	} );

	describe( 'opening a gap at the target', () => {
		it( 'finds the target with the gap open', () => {
			gap = 20;
			drag.startDrag( pointerDown( { clientY: 150 } ), 3 );
			// The pointer passes the middle of the first fragment, so the gap opens before the second
			firePointer( 'pointermove', { clientX: 50, clientY: 115 } );
			expect( drag.insertionPoint.value ).toBe( 2 );

			// The pointer is in the gap, which moved the second fragment down to 140–160
			firePointer( 'pointermove', { clientX: 50, clientY: 135 } );

			expect( drag.insertionPoint.value ).toBe( 2 );
		} );

		it( 'shows the line at the top of the gap', () => {
			gap = 20;
			drag.startDrag( pointerDown( { clientY: 150 } ), 3 );
			firePointer( 'pointermove', { clientX: 50, clientY: 115 } );

			expect( drag.insertionOffset.value ).toBe( 20 );
		} );

		it( 'shows the target at the old place when a drop keeps the order', () => {
			gap = 30;
			drag.startDrag( pointerDown(), 1 );
			// The pointer passes the middle of the dragged fragment only
			firePointer( 'pointermove', { clientX: 50, clientY: 125 } );

			expect( drag.insertionPoint.value ).toBe( 2 );
			expect( drag.isInPlace.value ).toBe( true );
			// The line is at the top of the old place
			expect( drag.insertionOffset.value ).toBe( 0 );
			// The old place gives its 20px to the ghost, so the gap after it needs 10px more
			expect( drag.gapPoint.value ).toBe( 2 );
			expect( drag.gapShift.value ).toBe( 10 );
		} );

		it( 'opens no gap at the old place for a ghost that fits in it', () => {
			gap = 15;
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 125 } );

			expect( drag.gapShift.value ).toBe( 0 );
		} );

		it( 'opens a gap of the full height when a drop changes the order', () => {
			gap = 30;
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 135 } );

			expect( drag.isInPlace.value ).toBe( false );
			expect( drag.gapPoint.value ).toBe( 3 );
			expect( drag.gapShift.value ).toBe( 30 );
		} );

		it( 'measures the places again when the dragged fragment collapses', async () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 145 } );
			expect( drag.insertionPoint.value ).toBe( 3 );

			// The dragged fragment collapses, so the fragments move up 10px
			moved = -10;
			await nextTick();

			// The pointer now passes the middle of all three fragments
			expect( drag.insertionPoint.value ).toBe( 4 );
		} );

		it( 'uses the places of the fragments from the start of the drag', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 125 } );

			// The gap moves the fragments, but the target must not follow them
			moved = 100;
			firePointer( 'pointermove', { clientX: 50, clientY: 135 } );

			expect( drag.insertionPoint.value ).toBe( 3 );
		} );
	} );

	describe( 'scrolling the page', () => {
		let frames;

		beforeEach( () => {
			frames = [];
			jest.spyOn( window, 'requestAnimationFrame' ).mockImplementation( ( callback ) => {
				frames.push( callback );
				return frames.length;
			} );
			jest.spyOn( window, 'cancelAnimationFrame' ).mockImplementation( () => {} );
			jest.spyOn( window, 'scrollBy' ).mockImplementation( () => {} );
		} );

		afterEach( () => {
			jest.restoreAllMocks();
		} );

		/**
		 * Run the animation frames that the drag asked for so far.
		 */
		const runFrames = () => {
			const pending = frames;
			frames = [];
			pending.forEach( ( callback ) => callback() );
		};

		it( 'follows the page when it scrolls under the pointer', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 135 } );
			expect( drag.insertionPoint.value ).toBe( 3 );

			scrolled = 20;
			window.dispatchEvent( new Event( 'scroll' ) );

			// The fragments moved up under the pointer, which now passes all three
			expect( drag.insertionPoint.value ).toBe( 4 );
		} );

		it( 'scrolls the page down when the pointer is near the bottom edge', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: window.innerHeight - 5 } );
			runFrames();

			expect( window.scrollBy ).toHaveBeenCalledTimes( 1 );
			expect( window.scrollBy.mock.calls[ 0 ][ 1 ] ).toBeGreaterThan( 0 );
			// It goes on while the pointer stays near the edge
			expect( frames.length ).toBe( 1 );
		} );

		it( 'scrolls the page up when the pointer is near the top edge', () => {
			drag.startDrag( pointerDown( { clientY: 100 } ), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 5 } );
			runFrames();

			expect( window.scrollBy.mock.calls[ 0 ][ 1 ] ).toBeLessThan( 0 );
		} );

		it( 'does not scroll the page when the pointer is away from the edges', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			runFrames();

			expect( window.scrollBy ).not.toHaveBeenCalled();
			expect( frames.length ).toBe( 0 );
		} );

		it( 'stops scrolling the page after the drop', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: window.innerHeight - 5 } );
			firePointer( 'pointerup', { clientX: 50, clientY: window.innerHeight - 5 } );
			runFrames();

			expect( window.cancelAnimationFrame ).toHaveBeenCalled();
			expect( window.scrollBy ).not.toHaveBeenCalled();
		} );
	} );

	describe( 'the click after the drop', () => {
		let clickListener;

		beforeEach( () => {
			clickListener = jest.fn();
			document.body.addEventListener( 'click', clickListener );
		} );

		afterEach( () => {
			document.body.removeEventListener( 'click', clickListener );
		} );

		const click = () => document.body.dispatchEvent( new Event( 'click', { bubbles: true, cancelable: true } ) );

		it( 'swallows the click that follows the drop', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			firePointer( 'pointerup', { clientX: 50, clientY: 155 } );
			click();

			expect( clickListener ).not.toHaveBeenCalled();
		} );

		it( 'keeps a later click', async () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointermove', { clientX: 50, clientY: 155 } );
			firePointer( 'pointerup', { clientX: 50, clientY: 155 } );
			await new Promise( ( resolve ) => {
				setTimeout( resolve );
			} );
			click();

			expect( clickListener ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'keeps the click on the drag handle when the drag did not start', () => {
			drag.startDrag( pointerDown(), 1 );
			firePointer( 'pointerup', { clientX: 50, clientY: 110 } );
			click();

			expect( clickListener ).toHaveBeenCalledTimes( 1 );
		} );
	} );
} );
