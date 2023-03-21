<!-- eslint-disable vue/no-unsupported-features -->
<!-- eslint-disable vue/no-v-model-argument -->
<template>
	<!--
		WikiLambda Vue component for a context-menu

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div
		v-clickout="clickToClose"
		class="ext-wikilambda-context-menu"
	>
		<cdx-button
			weight="quiet"
			:aria-label="$i18n( 'wikilambda-context-menu' ).text()"
			@click="showMenu = !showMenu"
		>
			<cdx-icon :icon="icons.cdxIconEllipsis"></cdx-icon>
		</cdx-button>
		<!--
			TODO: this type of usage of cdx-menu is generally discouraged in the docs -
			it's worth following up to see if a component like this could be added to core
		-->
		<cdx-menu
			v-model:expanded="showMenu"
			v-model:selected="selected"
			class="ext-wikilambda-context-menu__items"
			:menu-items="menuItems"
			@update:selected="emitSelection"
		>
		</cdx-menu>
	</div>
</template>

<script>
var CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxMenu = require( '@wikimedia/codex' ).CdxMenu,
	icons = require( '../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'wl-context-menu',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'cdx-menu': CdxMenu
	},
	directives: {
		// detect clickout events to know when to close the menu
		clickout: {
			beforeMount: function ( el, binding ) {
				el.clickout = {
					stop: function ( e ) {
						e.stopPropagation();
					}
				};

				document.body.addEventListener( 'click', binding.value );
				el.addEventListener( 'click', el.clickout.stop );
			},
			unmounted: function ( el, binding ) {
				document.body.removeEventListener( 'click', binding.value );
				el.removeEventListener( 'click', el.clickout.stop );
			}
		}
	},
	props: {
		// the list of items to display in the menu
		menuItems: {
			type: Array,
			required: true
		}
	},
	data: function () {
		return {
			showMenu: false,
			icons: icons
		};
	},
	methods: {
		emitSelection: function ( selection ) {
			this.$emit( 'context-action', selection );
		},
		clickToClose: function () {
			this.showMenu = false;
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-context-menu {
	&__items {
		width: fit-content;
		left: unset;
		margin-left: 1em;
		margin-top: -1.5em;
	}
}
</style>
