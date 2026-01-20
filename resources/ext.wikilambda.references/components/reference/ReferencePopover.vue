<!--
	WikiLambda Vue interface module for reference popover component.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div ref="container">
		<cdx-popover
			class="ext-wikilambda-reference-popover"
			:open="open"
			:anchor="anchor"
			:render-in-place="true"
			:title="title"
			:use-close-button="true"
			tabindex="-1"
			@update:open="onUpdateOpen"
			@mouseenter="onMouseenter"
			@mouseleave="onMouseleave"
		>
			<!-- eslint-disable-next-line vue/no-v-html -->
			<div v-html="html"></div>
		</cdx-popover>
	</div>
</template>

<script>
const { defineComponent, ref, computed } = require( 'vue' );
const { CdxPopover } = require( '../../../codex.js' );
const useFocusTrap = require( '../../composables/useFocusTrap.js' );

module.exports = exports = defineComponent( {
	name: 'wl-reference-popover',
	components: {
		'cdx-popover': CdxPopover
	},
	props: {
		open: {
			type: Boolean,
			required: true
		},
		title: {
			type: String,
			required: true
		},
		html: {
			type: String,
			default: ''
		},
		anchor: {
			type: [ Object, null ],
			default: null
		},
		mode: {
			type: String,
			default: null // 'hover' | 'click' | null
		}
	},
	emits: [ 'update:open', 'mouseenter', 'mouseleave' ],
	setup( props, { emit } ) {
		const container = ref( null );

		function onUpdateOpen( value ) {
			emit( 'update:open', value );
		}

		function onMouseenter( e ) {
			emit( 'mouseenter', e );
		}

		function onMouseleave( e ) {
			emit( 'mouseleave', e );
		}

		function getPopoverRoot() {
			if ( !container.value ) {
				return null;
			}
			return container.value.querySelector( '.cdx-popover.ext-wikilambda-reference-popover' );
		}

		// Only trap focus in 'click' mode to prevent unwanted focus outlines in 'hover' mode
		useFocusTrap( {
			getRootEl: getPopoverRoot,
			isActive: computed( () => props.open && props.mode !== 'hover' )
		} );

		return {
			container,
			onUpdateOpen,
			onMouseenter,
			onMouseleave
		};
	}
} );
</script>

<style lang="less">
@import ( reference ) 'mediawiki.skin.variables.less';

.ext-wikilambda-reference-popover {
	// Remove default outline on focus
	&:focus {
		outline: 0;
	}

	// Add visible outline for keyboard navigation only
	&:focus-visible {
		outline: 2px solid var( --color-progressive, #36c );
	}
}
</style>
