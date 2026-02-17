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
		<!-- Add fragment menu button in edit mode -->
		<cdx-menu-button
			v-if="edit"
			class="ext-wikilambda-app-abstract-content-section-fragment-menu"
			action="default"
			weight="normal"
			:aria-label="i18n( 'wikilambda-abstract-menu-fragments-accessible-label' ).text()"
			:menu-items="menuItems"
			:selected="null"
			@update:selected="addFragment"
		>
			<cdx-icon :icon="iconAdd"></cdx-icon>
		</cdx-menu-button>
	</div>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const useMenuAction = require( '../../composables/useMenuAction.js' );
const icons = require( '../../../lib/icons.json' );

// Abstract components
const AbstractContentFragment = require( './AbstractContentFragment.vue' );
// Codex components
const { CdxMenuButton, CdxIcon } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-content-section',
	components: {
		'wl-abstract-content-fragment': AbstractContentFragment,
		'cdx-menu-button': CdxMenuButton,
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
		const store = useMainStore();
		const i18n = inject( 'i18n' );
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

		const menuItems = computed( () => {
			const basicActionGroup = {
				label: i18n( 'wikilambda-abstract-menu-group-basic-fragments' ).text(),
				hideLabel: true,
				items: [ {
					label: i18n( 'wikilambda-abstract-menu-option-add-empty-fragment' ).text(),
					value: Constants.LIST_MENU_OPTIONS.ADD_FRAGMENT
				} ]
			};
			const specialActionGroup = {
				label: i18n( 'wikilambda-abstract-menu-group-special-fragments' ).text(),
				hideLabel: true,
				items: store.getSuggestedHtmlFunctions.map( ( zid ) => ( {
					label: i18n( 'wikilambda-abstract-menu-option-add-named-fragment',
						store.getLabelData( zid ).label ).text(),
					value: zid
				} ) )
			};
			return store.getSuggestedHtmlFunctions.length > 0 ?
				[ basicActionGroup, specialActionGroup ] :
				[ basicActionGroup ];
		} );

		/**
		 * Adds a new fragment at the end of the list
		 *
		 * @param {string} value
		 */
		function addFragment( value ) {
			if ( value === Constants.LIST_MENU_OPTIONS.ADD_FRAGMENT ) {
				addListItem(
					{ type: Constants.Z_FUNCTION_CALL },
					props.section.fragmentsPath,
					props.section.fragments.length
				);
				return;
			}

			// Any other value is a zid, we need to:
			// * make sure it's a function zid
			// * make sure function returns HTML
			// * create function call to this function
			// * insert it as a fragment
			const obj = store.getStoredObject( value );
			if ( !obj ) {
				// Not found object, do nothing
				return;
			}

			const inner = obj[ Constants.Z_PERSISTENTOBJECT_VALUE ];
			const type = inner[ Constants.Z_OBJECT_TYPE ];
			if ( type !== Constants.Z_FUNCTION ) {
				// Not a function, do nothing
				return;
			}

			const output = inner[ Constants.Z_FUNCTION_RETURN_TYPE ];
			if ( output !== Constants.Z_HTML_FRAGMENT ) {
				// Return type is not HTML, do nothing
				return;
			}

			// All good, insert function call to given function zid
			const newItemPath = `${ props.section.fragmentsPath }.${ props.section.fragments.length }`;
			addListItem(
				{ type: Constants.Z_FUNCTION_CALL, value },
				props.section.fragmentsPath,
				props.section.fragments.length
			);
			store.setFunctionCallArguments( {
				keyPath: newItemPath.split( '.' ),
				functionZid: value
			} );
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
			menuItems,
			performAction,
			iconAdd,
			i18n
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
