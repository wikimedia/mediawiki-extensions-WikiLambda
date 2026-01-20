/*!
 * WikiLambda Vue references: useReferenceTriggers composable
 *
 * @module ext.wikilambda.references.composables.useReferenceTriggers
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
const { onMounted } = require( 'vue' );

/**
 * Composable for managing reference triggers in the DOM.
 * Handles finding, upgrading, and attaching event handlers to reference triggers.
 *
 * TODO(iteration): If we later want to support References in embedded content (VE),
 * we might need to move this to Vanilla JS and keep only the Popover/Drawer in Vue.
 * So we can lazy load Vue. That way we can avoid the overhead of Vue in read mode.
 * When mouseover on a trigger is called we do need to check if the Vue app is mounted,
 * so we can show the Popover/Drawer.
 *
 * @param {Object} handlers - Event handlers configuration
 * @param {Function} handlers.onMouseenter - Handler for mouseenter events
 * @param {Function} handlers.onMouseleave - Handler for mouseleave events
 * @param {Function} handlers.onClick - Handler for click events
 * @return {Object} Object with initialization function
 */
module.exports = function useReferenceTriggers( handlers ) {
	/**
	 * Create a button element for a reference trigger.
	 * The button content ([*]) is set via CSS ::before pseudo-element.
	 *
	 * @return {HTMLButtonElement} The created button element
	 */
	function createButtonElement() {
		const button = document.createElement( 'button' );
		button.type = 'button';
		button.className = 'ext-wikilambda-reference__button';
		// Content is set via CSS ::before pseudo-element
		button.setAttribute( 'aria-label', 'Open reference' );
		button.setAttribute( 'aria-expanded', 'false' );
		return button;
	}

	/**
	 * Attach event handlers to a button element.
	 *
	 * @param {HTMLButtonElement} button - The button to attach handlers to
	 */
	function attachButtonEventHandlers( button ) {
		if ( handlers.onMouseenter ) {
			button.addEventListener( 'mouseenter', () => {
				handlers.onMouseenter( button );
			} );
		}
		if ( handlers.onMouseleave ) {
			button.addEventListener( 'mouseleave', () => {
				handlers.onMouseleave( button );
			} );
		}
		if ( handlers.onClick ) {
			button.addEventListener( 'click', () => {
				handlers.onClick( button );
			} );
		}
	}

	/**
	 * Upgrade trigger element to button structure.
	 * Transforms: <sup class="ext-wikilambda-reference">Reference text...</sup>
	 * Into: <sup class="ext-wikilambda-reference" data-wikilambda-reference-init="1">
	 *   <button class="ext-wikilambda-reference__button"></button>
	 *   <span class="ext-wikilambda-reference__note">Reference text...</span>
	 * </sup>
	 *
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

	function initInContainer( containerEl ) {
		if ( !containerEl || !containerEl.querySelectorAll ) {
			return;
		}

		const triggers = containerEl.querySelectorAll( '.ext-wikilambda-reference:not([data-wikilambda-reference-init])' );
		Array.prototype.forEach.call( triggers, ( trigger ) => {
			upgradeTriggerToButton( trigger );
		} );
	}

	function getContainerElement( container ) {
		return container && container[ 0 ] ? container[ 0 ] : container;
	}

	function init() {
		initInContainer( document.body );

		if ( typeof mw === 'undefined' || !mw.hook ) {
			return;
		}

		mw.hook( 'wikipage.content' ).add( ( content ) => {
			const container = getContainerElement( content ) || document.body;
			initInContainer( container );
		} );

		mw.hook( 'wikilambda.references.content' ).add( ( content ) => {
			const container = getContainerElement( content ) || document.body;
			initInContainer( container );
		} );
	}

	onMounted( () => {
		init();
	} );

	return {
		init,
		initInContainer,
		upgradeTriggerToButton
	};
};
