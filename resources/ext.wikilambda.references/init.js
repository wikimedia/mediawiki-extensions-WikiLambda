/*!
 * WikiLambda references: Vanilla JS initialization
 * Handles DOM scanning and decorating. Vue app is lazy-loaded on interaction.
 *
 * @module ext.wikilambda.references
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

let appReady = null;

/**
 * Lazy load Vue app and get handlers
 *
 * @memberof module:ext.wikilambda.references
 * @return {Promise} Promise that resolves to handlers object
 */
function ensureApp() {
	if ( appReady ) {
		return appReady;
	}

	appReady = mw.loader.using( 'ext.wikilambda.references.vue' )
		.then( () => require( 'ext.wikilambda.references.vue' ) );

	return appReady;
}

/**
 * Create button element for reference trigger
 *
 * @memberof module:ext.wikilambda.references
 * @return {HTMLButtonElement} The created button element
 */
function createButtonElement() {
	const button = document.createElement( 'button' );
	button.type = 'button';
	button.className = 'ext-wikilambda-reference__button';
	button.setAttribute( 'aria-label', mw.message( 'wikilambda-reference' ).text() );
	button.setAttribute( 'aria-expanded', 'false' );
	return button;
}

/**
 * Upgrade trigger element to button structure.
 * Transforms: <sup class="ext-wikilambda-reference">Reference text...</sup>
 * Into: <sup class="ext-wikilambda-reference" data-wikilambda-reference-init="1">
 *   <button class="ext-wikilambda-reference__button"></button>
 *   <span class="ext-wikilambda-reference__note">Reference text...</span>
 * </sup>
 *
 * @memberof module:ext.wikilambda.references
 * @param {HTMLElement} trigger - The trigger element to upgrade
 */
function upgradeTriggerToButton( trigger ) {
	if ( trigger.querySelector( '.ext-wikilambda-reference__button' ) ) {
		return;
	}

	const textContent = trigger.textContent || trigger.innerText || '';

	let supElement = trigger;
	if ( trigger.tagName.toLowerCase() !== 'sup' ) {
		supElement = document.createElement( 'sup' );
		supElement.className = 'ext-wikilambda-reference';
		trigger.parentNode.replaceChild( supElement, trigger );
	}

	const button = createButtonElement();
	const noteSpan = document.createElement( 'span' );
	noteSpan.className = 'ext-wikilambda-reference__note';
	noteSpan.innerHTML = textContent;

	supElement.textContent = '';
	supElement.appendChild( button );
	supElement.appendChild( noteSpan );
	supElement.setAttribute( 'data-wikilambda-reference-init', '1' );

	attachButtonEventHandlers( button );
}

/**
 * Attach event handlers that lazy-load Vue on interaction
 *
 * @memberof module:ext.wikilambda.references
 * @param {HTMLButtonElement} button - The button to attach handlers to
 */
function attachButtonEventHandlers( button ) {
	button.addEventListener( 'mouseenter', () => ensureApp()
		.then( ( { handleMouseenter } ) => handleMouseenter( button ) )
	);

	button.addEventListener( 'mouseleave', () => ensureApp()
		.then( ( { handleMouseleave } ) => handleMouseleave( button ) )
	);

	button.addEventListener( 'click', () => ensureApp()
		.then( ( { handleClick } ) => handleClick( button ) )
	);
}

/**
 * Initialize references in a container element
 *
 * @memberof module:ext.wikilambda.references
 * @param {HTMLElement} containerEl - The container element to scan
 */
function initInContainer( containerEl ) {
	if ( !containerEl || !containerEl.querySelectorAll ) {
		return;
	}

	const triggers = containerEl.querySelectorAll( '.ext-wikilambda-reference:not([data-wikilambda-reference-init])' );
	Array.prototype.forEach.call( triggers, ( trigger ) => {
		upgradeTriggerToButton( trigger );
	} );
}

/**
 * Get container element from a jQuery object or a plain DOM element
 *
 * @memberof module:ext.wikilambda.references
 * @param {jQuery|HTMLElement} container - The container element to get
 * @return {HTMLElement} The container element
 */
function getContainerElement( container ) {
	return container && container[ 0 ] ? container[ 0 ] : container;
}

/**
 * Initialize all reference triggers in the document
 *
 * @memberof module:ext.wikilambda.references
 */
function init() {
	initInContainer( document.body );

	if ( typeof mw === 'undefined' || !mw.hook ) {
		return;
	}

	// Initialize references when the page content is loaded
	mw.hook( 'wikipage.content' ).add( ( content ) => {
		const container = getContainerElement( content ) || document.body;
		initInContainer( container );
	} );

	// Initialize references when references are loaded asynchronously
	mw.hook( 'wikilambda.references.content' ).add( ( content ) => {
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
