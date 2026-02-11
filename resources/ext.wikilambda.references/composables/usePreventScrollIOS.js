/*!
 * WikiLambda Vue references: usePreventScrollIOS composable
 * Prevents scrolling on iOS Safari when a modal/overlay is open.
 *
 * @module ext.wikilambda.references.composables.usePreventScrollIOS
 * @see https://github.com/adobe/react-spectrum/blob/main/packages/@react-aria/overlays/src/usePreventScroll.ts
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { watch, onBeforeUnmount } = require( 'vue' );

const visualViewport = typeof document !== 'undefined' && window.visualViewport;

/**
 * Check if an element is scrollable.
 *
 * @module ext.wikilambda.references.composables.usePreventScrollIOS.isScrollable
 * @param {Element|null} element - The element to check
 * @return {boolean} True if element is scrollable
 */
function isScrollable( element ) {
	if ( !element ) {
		return false;
	}
	const style = window.getComputedStyle( element );
	return style.overflowY === 'auto' || style.overflowY === 'scroll' ||
		style.overflowX === 'auto' || style.overflowX === 'scroll';
}

/**
 * Get the scroll parent of an element.
 *
 * @module ext.wikilambda.references.composables.usePreventScrollIOS.getScrollParent
 * @param {Element|null} element - The element to find scroll parent for
 * @param {boolean} [includeSelf=false] - Whether to include the element itself if it's scrollable
 * @return {Element} The scroll parent element
 */
function getScrollParent( element, includeSelf = false ) {
	if ( !element ) {
		return document.documentElement;
	}
	if ( includeSelf && isScrollable( element ) ) {
		return element;
	}
	let parent = element.parentElement;
	while ( parent ) {
		if ( isScrollable( parent ) ) {
			return parent;
		}
		parent = parent.parentElement;
	}
	return document.documentElement;
}

/**
 * Check if an element will open the keyboard when focused.
 *
 * @module ext.wikilambda.references.composables.usePreventScrollIOS.willOpenKeyboard
 * @param {Element|null} element - The element to check
 * @return {boolean} True if element will open keyboard
 */
function willOpenKeyboard( element ) {
	if ( !element ) {
		return false;
	}
	return element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement ||
		( element instanceof HTMLElement && element.isContentEditable );
}

/**
 * Scroll an element into view within its scrollable parent.
 * Based on React Spectrum's usePreventScroll implementation.
 *
 * @module ext.wikilambda.references.composables.usePreventScrollIOS.scrollIntoView
 * @param {Element} target - The element to scroll into view
 */
function scrollIntoView( target ) {
	const root = ( document.scrollingElement !== undefined && document.scrollingElement !== null ) ?
		document.scrollingElement :
		document.documentElement;
	let nextTarget = target;
	while ( nextTarget && nextTarget !== root ) {
		const scrollable = getScrollParent( nextTarget );
		if (
			scrollable !== document.documentElement &&
			scrollable !== document.body &&
			scrollable !== nextTarget
		) {
			const scrollableRect = scrollable.getBoundingClientRect();
			const targetRect = nextTarget.getBoundingClientRect();
			const nextTargetHeight = nextTarget.clientHeight;
			if (
				targetRect.top < scrollableRect.top ||
				targetRect.bottom > scrollableRect.top + nextTargetHeight
			) {
				let bottom = scrollableRect.bottom;
				if ( visualViewport ) {
					bottom = Math.min(
						bottom,
						visualViewport.offsetTop + visualViewport.height
					);
				}

				const adjustment = ( targetRect.top - scrollableRect.top ) -
					( ( bottom - scrollableRect.top ) / 2 - targetRect.height / 2 );
				scrollable.scrollTo( {
					top: Math.max(
						0,
						Math.min(
							scrollable.scrollHeight - scrollable.clientHeight,
							scrollable.scrollTop + adjustment
						)
					),
					behavior: 'smooth'
				} );
			}
		}

		nextTarget = scrollable.parentElement;
	}
}

/**
 * Scroll an element into view without scrolling the whole page.
 * Based on React Spectrum's usePreventScroll implementation.
 *
 * @module ext.wikilambda.references.composables.usePreventScrollIOS.scrollIntoViewWhenReady
 * @param {Element} target - The element to scroll into view
 * @param {boolean} wasKeyboardVisible - Whether the keyboard was already visible
 */
function scrollIntoViewWhenReady( target, wasKeyboardVisible ) {
	if ( wasKeyboardVisible || !visualViewport ) {
		scrollIntoView( target );
	} else {
		visualViewport.addEventListener(
			'resize',
			() => scrollIntoView( target ),
			{ once: true }
		);
	}
}

/**
 * Composable to prevent scrolling on iOS Safari when a modal/overlay is open.
 * Based on React Spectrum's usePreventScroll implementation.
 *
 * Handles iOS Safari behavior where overflow: hidden still allows scroll in many
 * situations, and when tapping an input the page scrolls to center it.
 *
 * @param {Object} isActive - Vue ref (boolean); when true, scroll prevention is active
 */
function usePreventScrollIOS( isActive ) {
	let scrollableElement = null;
	let allowTouchMove = false;

	let originalFocus;
	let styleElement = null;

	function onTouchStart( event ) {
		const target = event.target;
		scrollableElement = isScrollable( target ) ? target : getScrollParent( target, true );
		allowTouchMove = false;

		const selection = target.ownerDocument.defaultView && target.ownerDocument.defaultView.getSelection();
		if (
			selection &&
			!selection.isCollapsed &&
			selection.containsNode( target, true )
		) {
			allowTouchMove = true;
		}

		const path = event.composedPath();
		if ( path.some( ( el ) => el instanceof HTMLInputElement && el.type === 'range' ) ) {
			allowTouchMove = true;
		}

		if (
			'selectionStart' in target &&
			'selectionEnd' in target &&
			target.selectionStart < target.selectionEnd &&
			target.ownerDocument.activeElement === target
		) {
			allowTouchMove = true;
		}
	}

	function onTouchMove( event ) {
		if ( event.touches.length === 2 || allowTouchMove ) {
			return;
		}

		if (
			!scrollableElement ||
			scrollableElement === document.documentElement ||
			scrollableElement === document.body
		) {
			event.preventDefault();
			return;
		}

		if (
			scrollableElement.scrollHeight === scrollableElement.clientHeight &&
			scrollableElement.scrollWidth === scrollableElement.clientWidth
		) {
			event.preventDefault();
		}
	}

	function onBlur( event ) {
		const target = event.target;
		const relatedTarget = event.relatedTarget;
		if ( relatedTarget && willOpenKeyboard( relatedTarget ) ) {
			relatedTarget.focus( { preventScroll: true } );
			scrollIntoViewWhenReady(
				relatedTarget,
				willOpenKeyboard( target )
			);
		} else if ( !relatedTarget ) {
			const focusable = target.parentElement && target.parentElement.closest( '[tabindex]' );
			if ( focusable ) {
				focusable.focus( { preventScroll: true } );
			}
		}
	}

	function enable() {
		styleElement = document.createElement( 'style' );
		styleElement.textContent = `
			@layer {
				* {
					overscroll-behavior: contain;
				}
			}`.trim();
		document.head.prepend( styleElement );

		const proto = HTMLElement.prototype;
		originalFocus = proto.focus;
		proto.focus = function ( opts ) {
			const wasKeyboardVisible = document.activeElement !== null &&
				willOpenKeyboard( document.activeElement );

			const focusOpts = opts ? Object.assign( {}, opts, { preventScroll: true } ) : { preventScroll: true };
			originalFocus.call( this, focusOpts );

			if ( !opts || !opts.preventScroll ) {
				scrollIntoViewWhenReady( this, wasKeyboardVisible );
			}
		};

		document.addEventListener( 'touchstart', onTouchStart, { passive: false, capture: true } );
		document.addEventListener( 'touchmove', onTouchMove, { passive: false, capture: true } );
		document.addEventListener( 'blur', onBlur, true );
	}

	function disable() {
		document.removeEventListener( 'touchstart', onTouchStart, { capture: true } );
		document.removeEventListener( 'touchmove', onTouchMove, { capture: true } );
		document.removeEventListener( 'blur', onBlur, true );

		if ( originalFocus ) {
			HTMLElement.prototype.focus = originalFocus;
		}

		if ( styleElement ) {
			styleElement.remove();
			styleElement = null;
		}

		scrollableElement = null;
		allowTouchMove = false;
	}

	watch( isActive, ( active ) => {
		if ( active ) {
			enable();
		} else {
			disable();
		}
	}, { immediate: true } );

	onBeforeUnmount( () => {
		if ( isActive.value ) {
			disable();
		}
	} );
}

module.exports = usePreventScrollIOS;
