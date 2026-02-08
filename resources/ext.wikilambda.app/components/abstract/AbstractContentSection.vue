<!--
	WikiLambda Vue component for an Abstract Content section.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-abstract-content-section">
		<!-- Section title: label of section Qid in the user language -->
		<div class="ext-wikilambda-app-abstract-content-section-title">
			<h2>
				{{ section.labelData.label }} <span>({{ section.qid }})</span>
			</h2>
		</div>
		<!-- Section fragments -->
		<template v-for="( fragment, index ) in section.fragments">
			<!-- TODO: we should probably remove the benjamin item from the
			fragments list, then we can remove the v-if and wrapper template -->
			<wl-abstract-content-fragment
				v-if="index !== 0"
				:key="`${ section.fragmentsPath }-${ index }`"
				class="ext-wikilambda-app-abstract-content-section-fragment"
				:edit="edit"
				:key-path="`${ section.fragmentsPath }.${ index }`"
				:fragment="fragment"
				@action="performAction( $event, index )"
			></wl-abstract-content-fragment>
		</template>
		<!-- Add fragment button in edit mode -->
		<cdx-button
			v-if="edit"
			title="Add new fragment"
			aria-label="Add new fragment"
			@click="addFragment"
		>
			<cdx-icon :icon="iconAdd"></cdx-icon>
		</cdx-button>
	</div>
</template>

<script>
const { defineComponent, inject } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMenuAction = require( '../../composables/useMenuAction.js' );
const icons = require( '../../../lib/icons.json' );

// Abstract components
const AbstractContentFragment = require( './AbstractContentFragment.vue' );
// Codex components
const { CdxButton, CdxIcon } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-content-section',
	components: {
		'wl-abstract-content-fragment': AbstractContentFragment,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	props: {
		section: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	setup( props ) {
		const menuActions = inject( 'useMenuAction', useMenuAction );
		const {
			addAfter,
			addBefore,
			addListItem,
			moveAfter,
			moveBefore,
			deleteListItem
		} = menuActions();

		const iconAdd = icons.cdxIconAdd;

		/**
		 * Adds a new fragment at the end of the list
		 */
		function addFragment() {
			addListItem(
				{ type: Constants.Z_FUNCTION_CALL },
				props.section.fragmentsPath,
				props.section.fragments.length
			);
		}

		/**
		 * Handles all actions triggered from the fragment component
		 *
		 * @param {Object} payload
		 * @param {string} payload.action
		 * @param {number} itemKey
		 */
		function performAction( payload, itemKey ) {
			const itemKeyPath = `${ props.section.fragmentsPath }.${ itemKey }`;

			if ( payload.action === Constants.LIST_MENU_OPTIONS.MOVE_BEFORE ) {
				moveBefore( itemKeyPath );
				return;
			}

			if ( payload.action === Constants.LIST_MENU_OPTIONS.MOVE_AFTER ) {
				moveAfter( itemKeyPath );
				return;
			}

			if ( payload.action === Constants.LIST_MENU_OPTIONS.ADD_BEFORE ) {
				addBefore( { type: Constants.Z_FUNCTION_CALL }, itemKeyPath );
				return;
			}

			if ( payload.action === Constants.LIST_MENU_OPTIONS.ADD_AFTER ) {
				addAfter( { type: Constants.Z_FUNCTION_CALL }, itemKeyPath );
				return;
			}

			if ( payload.action === Constants.LIST_MENU_OPTIONS.DELETE_ITEM ) {
				deleteListItem( itemKeyPath );
				return;
			}
		}

		return {
			addFragment,
			performAction,
			iconAdd
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-content-section {
	margin-bottom: @spacing-150;
}
</style>
