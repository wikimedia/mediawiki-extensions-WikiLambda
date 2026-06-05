/*!
 * WikiLambda image: Vanilla JS initialization
 * Handles broken-image recovery by replacing failed <img> elements with CSS-only placeholders.
 *
 * @module ext.wikilambda.image
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

/**
 * Replace a broken image with a CSS-only placeholder.
 *
 * @memberof module:ext.wikilambda.image
 * @param {HTMLImageElement} img - The broken image element
 */
function replaceBrokenImage( img ) {
	const figure = img.closest( 'figure.ext-wikilambda-image' );
	if ( !figure ) {
		return;
	}

	const width = img.getAttribute( 'width' ) || '250';
	const height = img.getAttribute( 'height' ) || '188';
	// Anchor the figure to the original image's width so its display:table layout
	// has something definite to apply max-width:50% against once the <img> (a
	// replaced element that could shrink on its own) is gone.
	figure.style.width = `${ width }px`;
	// Padding-bottom % carries the aspect ratio; resolved against the cell width
	// so it scales when max-width:50% clamps the figure on narrow parents.
	const ratio = ( ( parseFloat( height ) / parseFloat( width ) ) * 100 ).toFixed( 4 );

	const placeholder = document.createElement( 'div' );
	placeholder.className = 'ext-wikilambda-image__placeholder';
	placeholder.style.cssText = `padding-bottom:${ ratio }%;`;
	// Carry the original alt text onto the placeholder as aria-label so screen
	// readers still know what the broken image was meant to be. Mirrors the
	// PHP renderer's behaviour for server-side render failures.
	const alt = img.getAttribute( 'alt' );
	if ( alt ) {
		placeholder.setAttribute( 'aria-label', alt );
	}

	const placeholderIcon = document.createElement( 'span' );
	placeholderIcon.className = 'ext-wikilambda-image__placeholder-icon';
	placeholder.appendChild( placeholderIcon );

	img.replaceWith( placeholder );
	figure.classList.add( 'ext-wikilambda-image--error' );

	let figcaption = figure.querySelector( 'figcaption' );
	if ( !figcaption ) {
		figcaption = document.createElement( 'figcaption' );
		figure.appendChild( figcaption );
	}

	const captionIcon = document.createElement( 'span' );
	captionIcon.className = 'ext-wikilambda-image__caption-icon';
	captionIcon.setAttribute( 'aria-hidden', 'true' );

	// Add a space after the message text in case the figcaption already has content.
	figcaption.prepend( captionIcon, `${ mw.message( 'wikilambda-commons-image-error-not-found' ).text() } ` );
}

/**
 * Bind onerror handlers to images inside ext-wikilambda-image figures.
 * A data attribute guards against double-binding when a container is scanned more than once.
 *
 * @memberof module:ext.wikilambda.image
 * @param {HTMLElement} containerEl - The container element to scan
 */
function initInContainer( containerEl ) {
	if ( !containerEl || !containerEl.querySelectorAll ) {
		return;
	}

	const imgs = containerEl.querySelectorAll(
		'figure.ext-wikilambda-image img:not([data-wl-img-init])'
	);
	[ ...imgs ].forEach( ( img ) => {
		img.setAttribute( 'data-wl-img-init', '1' );
		img.addEventListener( 'error', () => replaceBrokenImage( img ) );
	} );
}

/**
 * Get container element from a jQuery object or a plain DOM element.
 *
 * @memberof module:ext.wikilambda.image
 * @param {jQuery|HTMLElement} container
 * @return {HTMLElement}
 */
function getContainerElement( container ) {
	return container && container[ 0 ] ? container[ 0 ] : container;
}

/**
 * Initialize all image error handlers in the document.
 *
 * @memberof module:ext.wikilambda.image
 */
function init() {
	initInContainer( document.body );

	if ( typeof mw === 'undefined' || !mw.hook ) {
		return;
	}

	// Initialize images when page content is loaded (standard page or cached article)
	mw.hook( 'wikipage.content' ).add( ( content ) => {
		const container = getContainerElement( content ) || document.body;
		initInContainer( container );
	} );

	// Initialize images when image content is loaded asynchronously in a fragment
	mw.hook( 'wikilambda.image.content' ).add( ( content ) => {
		const container = getContainerElement( content ) || document.body;
		initInContainer( container );
	} );
}

// Initialize on DOM ready
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
