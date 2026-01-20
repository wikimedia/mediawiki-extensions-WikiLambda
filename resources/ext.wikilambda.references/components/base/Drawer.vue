<!--
	WikiLambda Vue interface module for drawer component.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<Teleport to="body">
		<transition name="ext-wikilambda-drawer-slide" appear>
			<div v-if="open" class="ext-wikilambda-drawer-wrapper">
				<div class="ext-wikilambda-drawer-overlay" @click="onOverlayClick"></div>
				<section
					ref="drawerEl"
					class="ext-wikilambda-drawer"
					role="dialog"
					aria-modal="true"
					tabindex="-1"
				>
					<header class="ext-wikilambda-drawer__header">
						<div class="ext-wikilambda-drawer__title">
							{{ title }}
						</div>
						<cdx-button
							weight="quiet"
							aria-label="Close"
							@click="close"
						>
							<cdx-icon :icon="closeIcon"></cdx-icon>
						</cdx-button>
					</header>
					<div class="ext-wikilambda-drawer__body">
						<slot></slot>
					</div>
				</section>
			</div>
		</transition>
	</Teleport>
</template>

<script>
const { defineComponent, computed, ref, watch, onUnmounted } = require( 'vue' );
const { CdxButton, CdxIcon } = require( '../../../codex.js' );
const icons = require( '../../../lib/icons.json' );
const useScrollLock = require( '../../composables/useScrollLock.js' );
const useFocusTrap = require( '../../composables/useFocusTrap.js' );

module.exports = exports = defineComponent( {
	name: 'wl-drawer',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	props: {
		open: {
			type: Boolean,
			required: true
		},
		title: {
			type: String,
			default: ''
		}
	},
	emits: [ 'close' ],
	/**
	 * Setup function for the Drawer component.
	 *
	 * @param {Object} props - Component props
	 * @param {boolean} props.open - Whether the drawer is open
	 * @param {string} props.title - Drawer title
	 * @param {Object} root0 - Destructured context
	 * @param {Function} root0.emit - Vue emit function
	 * @return {Object} Component setup return object
	 *
	 * @todo When upstreaming to Codex, consider:
	 * - Scrollbar compensation for layout shift
	 * - Positioning options (left, right, bottom, top)
	 * - Size variants (small, medium, large, full)
	 * - Backdrop customization
	 * - Multiple drawer support
	 */
	setup( props, { emit } ) {
		const closeIcon = icons.cdxIconClose;
		const drawerEl = ref( null );
		const isOpen = computed( () => props.open );

		useScrollLock( {
			isActive: isOpen
		} );

		useFocusTrap( {
			getRootEl: () => drawerEl.value,
			isActive: isOpen
		} );

		function close() {
			emit( 'close' );
		}

		function onOverlayClick() {
			close();
		}

		function handleKeydown( e ) {
			if ( e.key === 'Escape' && props.open ) {
				close();
			}
		}

		watch( isOpen, ( open ) => {
			if ( open ) {
				document.addEventListener( 'keydown', handleKeydown );
			} else {
				document.removeEventListener( 'keydown', handleKeydown );
			}
		}, { immediate: true } );

		onUnmounted( () => {
			document.removeEventListener( 'keydown', handleKeydown );
		} );

		return {
			drawerEl,
			close,
			onOverlayClick,
			closeIcon
		};
	}
} );
</script>

<style lang="less">
@import ( reference ) 'mediawiki.skin.variables.less';

.ext-wikilambda-drawer-wrapper {
	position: fixed;
	inset: 0;
	z-index: @z-index-overlay;
}

.ext-wikilambda-drawer-overlay {
	position: fixed;
	inset: 0;
	background-color: @background-color-backdrop-light;
	z-index: @z-index-overlay;
}

.ext-wikilambda-drawer {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: @background-color-base;
	box-shadow: @box-shadow-large;
	border-top: @border-base;
	margin: 0 auto;
	z-index: @z-index-overlay;
	max-height: 70vh;
	min-height: @size-800;
	display: flex;
	flex-direction: column;

	// Remove default outline on focus
	&:focus {
		outline: 0;
	}

	// Add visible outline for keyboard navigation
	&:focus-visible {
		outline: 2px solid var( --color-progressive, #36c );
	}
}

.ext-wikilambda-drawer-slide-enter-active,
.ext-wikilambda-drawer-slide-leave-active {
	transition-property: @transition-property-fade;
	transition-duration: @transition-duration-medium;
	transition-timing-function: @transition-timing-function-system;
}

.ext-wikilambda-drawer-slide-enter-active .ext-wikilambda-drawer-overlay,
.ext-wikilambda-drawer-slide-leave-active .ext-wikilambda-drawer-overlay {
	transition-property: @transition-property-fade;
	transition-duration: @transition-duration-medium;
	transition-timing-function: @transition-timing-function-system;
}

.ext-wikilambda-drawer-slide-enter-active .ext-wikilambda-drawer,
.ext-wikilambda-drawer-slide-leave-active .ext-wikilambda-drawer {
	transition-property: transform;
	transition-duration: @transition-duration-medium;
	transition-timing-function: @transition-timing-function-system;
}

.ext-wikilambda-drawer-slide-enter-from,
.ext-wikilambda-drawer-slide-leave-to {
	opacity: @opacity-transparent;
}

.ext-wikilambda-drawer-slide-enter-from .ext-wikilambda-drawer-overlay,
.ext-wikilambda-drawer-slide-leave-to .ext-wikilambda-drawer-overlay {
	opacity: @opacity-transparent;
}

.ext-wikilambda-drawer-slide-enter-from .ext-wikilambda-drawer,
.ext-wikilambda-drawer-slide-leave-to .ext-wikilambda-drawer {
	transform: translateY( 100% );
}

.ext-wikilambda-drawer__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: @spacing-75 @spacing-100;
}

.ext-wikilambda-drawer__title {
	font-weight: @font-weight-bold;
	color: @color-base;
}

.ext-wikilambda-drawer__body {
	padding: 0 @spacing-100 @spacing-100 @spacing-100;
	overflow: auto;
}
</style>
