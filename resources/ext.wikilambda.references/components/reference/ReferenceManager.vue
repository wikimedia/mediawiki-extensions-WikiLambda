<!--
	WikiLambda Vue interface module for reference manager component.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div>
		<!-- Mobile: Drawer -->
		<wl-drawer
			v-if="isMobile"
			:open="drawerOpen"
			:title="referenceTitle"
			@close="closeDrawer"
		>
			<!-- eslint-disable-next-line vue/no-v-html -->
			<div v-html="referenceHtml"></div>
		</wl-drawer>
		<!-- Desktop: Popover -->
		<wl-reference-popover
			v-else
			:open="popoverOpen"
			:title="referenceTitle"
			:html="referenceHtml"
			:anchor="anchor"
			:mode="popoverMode"
			@update:open="setPopoverOpen"
			@mouseenter="handlePopoverMouseenter"
			@mouseleave="handlePopoverMouseleave"
		></wl-reference-popover>
	</div>
</template>

<script>
const { defineComponent, ref, computed, onUnmounted } = require( 'vue' );
const Drawer = require( '../base/Drawer.vue' );
const ReferencePopover = require( './ReferencePopover.vue' );
const useBreakpoints = require( '../../composables/useBreakpoints.js' );
const useReferenceTriggers = require( '../../composables/useReferenceTriggers.js' );
const Constants = require( '../../Constants.js' );

module.exports = exports = defineComponent( {
	name: 'wl-reference-manager',
	components: {
		'wl-drawer': Drawer,
		'wl-reference-popover': ReferencePopover
	},
	setup() {
		const breakpoint = useBreakpoints( Constants.BREAKPOINTS );
		const isMobile = computed( () => breakpoint.current.value === Constants.BREAKPOINT_TYPES.MOBILE );

		// Shared state
		const referenceTitle = mw.message( 'wikilambda-reference' ).text();
		const referenceHtml = ref( '' );
		const anchor = ref( null );

		// Drawer state (mobile)
		const drawerOpen = ref( false );

		/**
		 * Close the drawer.
		 */
		function closeDrawer() {
			drawerOpen.value = false;
			updateAriaExpanded( false );
			refocusAnchor();
			anchor.value = null;
		}

		// Popover state (desktop)
		const popoverOpen = ref( false );
		// 'hover': open on mouse hover, close when leaving trigger+popover
		// 'click': open via click/keyboard; close handled by Codex
		const popoverMode = ref( null );
		let hoverCloseTimeout = null;
		const HOVER_CLOSE_DELAY = 300;

		/**
		 * Cancel the hover close timeout.
		 */
		function cancelHoverClose() {
			if ( !hoverCloseTimeout ) {
				return;
			}
			clearTimeout( hoverCloseTimeout );
			hoverCloseTimeout = null;
		}

		/**
		 * Schedule the hover close timeout.
		 */
		function scheduleHoverClose() {
			cancelHoverClose();
			if ( popoverMode.value !== 'hover' ) {
				return;
			}
			hoverCloseTimeout = setTimeout( () => {
				setPopoverOpen( false );
				hoverCloseTimeout = null;
			}, HOVER_CLOSE_DELAY );
		}

		/**
		 * Check if the mouse is moving back to the trigger button.
		 *
		 * @param {MouseEvent} e - The mouseleave event
		 * @return {boolean} True if moving to trigger, false otherwise
		 */
		function isMovingToTrigger( e ) {
			const relatedTarget = e.relatedTarget;
			return anchor.value && relatedTarget && anchor.value.contains( relatedTarget );
		}

		/**
		 * Cancel close delay when mouse enters popover.
		 */
		function handlePopoverMouseenter() {
			cancelHoverClose();
		}

		/**
		 * Schedule close when mouse leaves popover (only in hover mode).
		 *
		 * @param {MouseEvent} e
		 */
		function handlePopoverMouseleave( e ) {
			if ( popoverMode.value !== 'hover' ) {
				return;
			}

			// If moving back to the trigger button, don't close
			if ( isMovingToTrigger( e ) ) {
				return;
			}

			scheduleHoverClose();
		}

		/**
		 * Open the popover.
		 */
		function openPopover() {
			popoverOpen.value = true;
		}

		/**
		 * Close the popover.
		 */
		function closePopover() {
			refocusAnchor();
			updateAriaExpanded( false );
			popoverMode.value = null;
			popoverOpen.value = false;
		}

		/**
		 * Set the popover open state.
		 *
		 * @param {boolean} value - The value to set the popover open state to
		 */
		function setPopoverOpen( value ) {
			cancelHoverClose();

			if ( value ) {
				openPopover();
			} else {
				closePopover();
			}
		}

		// Shared functions
		/**
		 * Refocus the anchor when closing drawer or popover.
		 * Only refocuses if popover mode is not 'hover' (i.e., 'click' mode or drawer).
		 */
		function refocusAnchor() {
			// Don't refocus if popover was opened via hover (mouse-only)
			// or if the anchor is not a focusable element
			if ( popoverMode.value === 'hover' || !anchor.value || typeof anchor.value.focus !== 'function' ) {
				return;
			}
			anchor.value.focus();
		}

		/**
		 * Find the note HTML for a trigger.
		 * The note is the span element inside the same <sup> parent that contains the reference content.
		 *
		 * @param {HTMLElement} button - The button element to find the note HTML for
		 * @return {string|null} The note HTML or null if not found
		 */
		function findNoteHtmlForTrigger( button ) {
			const parent = button.parentNode;
			if ( !parent ) {
				return null;
			}

			const note = parent.querySelector( '.ext-wikilambda-reference__note' );
			if ( note ) {
				return note.innerHTML;
			}
			return null;
		}

		/**
		 * Update the aria-expanded attribute on the current anchor button.
		 *
		 * @param {boolean} value - The value to set the aria-expanded attribute to
		 */
		function updateAriaExpanded( value ) {
			if ( anchor.value ) {
				anchor.value.setAttribute( 'aria-expanded', value ? 'true' : 'false' );
			}
		}

		/**
		 * Open the reference for a trigger.
		 *
		 * @param {HTMLElement} button - The button element to open the reference for
		 */
		function openReferenceForTrigger( button ) {
			const noteHtml = findNoteHtmlForTrigger( button );
			if ( !noteHtml ) {
				return;
			}

			referenceHtml.value = noteHtml;
			anchor.value = button;
			updateAriaExpanded( true );

			if ( isMobile.value ) {
				drawerOpen.value = true;
			} else {
				setPopoverOpen( true );
			}
		}

		// DOM scanning and initialization
		const triggerHandlers = {
			onMouseenter: ( button ) => {
				// Desktop hover-open (mouse only)
				// Do nothing if:
				// - Mobile
				// - Popover is pinned open
				if ( isMobile.value || popoverMode.value === 'click' ) {
					return;
				}
				popoverMode.value = 'hover';
				openReferenceForTrigger( button );
			},
			onMouseleave: () => {
				// Do nothing if:
				// - Mobile
				// - Popover mode is not hover
				if ( isMobile.value || popoverMode.value !== 'hover' ) {
					return;
				}
				// Schedule close with delay to allow mouse to move into popover.
				// If mouse enters popover, its mouseenter handler will cancel this.
				scheduleHoverClose();
			},
			onClick: ( button ) => {
				// Mobile: open drawer
				if ( isMobile.value ) {
					return openReferenceForTrigger( button );
				}

				// Desktop: Popover
				popoverMode.value = 'click';

				// Click always pins the popover open (disables hover-close logic).
				// If it was hover-opened, clicking converts it to pinned mode instead of closing.
				if ( popoverOpen.value && anchor.value === button ) {
					return setPopoverOpen( false );
				}

				cancelHoverClose();
				openReferenceForTrigger( button );
			}
		};

		// Initialize reference triggers
		useReferenceTriggers( triggerHandlers );

		onUnmounted( () => {
			cancelHoverClose();
		} );

		return {
			isMobile,
			drawerOpen,
			popoverOpen,
			anchor,
			referenceTitle,
			referenceHtml,
			popoverMode,
			closeDrawer,
			setPopoverOpen,
			handlePopoverMouseenter,
			handlePopoverMouseleave
		};
	}
} );
</script>
