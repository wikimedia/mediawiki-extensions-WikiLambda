<template>
	<div class="ext-wikilambda-app-mode-selector" data-testid="mode-selector">
		<cdx-menu-button
			v-if="menuItems.length > 0"
			data-testid="mode-selector-button"
			class="ext-wikilambda-app-mode-selector__menu-button"
			:selected="selected"
			:menu-items="menuItems"
			:aria-label="$i18n( 'wikilambda-mode-selector-button-label' ).text()"
			:disabled="disabled"
			@update:selected="selectMode"
		>
			<cdx-icon :icon="icon"></cdx-icon>
		</cdx-menu-button>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );
const { CdxIcon, CdxMenuButton } = require( '../../../codex.js' );
const Constants = require( '../../Constants.js' );
const typeUtils = require( '../../mixins/typeUtils.js' );
const useMainStore = require( '../../store/index.js' );
const icons = require( '../../../lib/icons.json' );

module.exports = exports = defineComponent( {
	name: 'wl-mode-selector',
	components: {
		'cdx-icon': CdxIcon,
		'cdx-menu-button': CdxMenuButton
	},
	mixins: [ typeUtils ],
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		parentExpectedType: {
			type: [ String, Object ],
			required: false,
			default: Constants.Z_OBJECT
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			icon: icons.cdxIconEllipsis
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getChildrenByParentRowId',
		'getLabelData',
		'getParentRowId',
		'getZObjectTypeByRowId',
		'getZObjectKeyByRowId',
		'isCustomEnum',
		'isInsideComposition',
		'isWikidataFetch'
	] ), {
		/**
		 * Returns the key of the key-value pair of this component.
		 *
		 * @return {string}
		 */
		key: function () {
			return this.getZObjectKeyByRowId( this.rowId );
		},
		/**
		 * Returns the type of the value of the the ZObject represented
		 * in this component. When it's not set, it's undefined.
		 *
		 * @return {string | Object | undefined}
		 */
		type: function () {
			return this.getZObjectTypeByRowId( this.rowId );
		},
		/**
		 * Value of the selected option or Z1/Object if unselected
		 *
		 * @return {string}
		 */
		selected: function () {
			return this.type ? this.typeToString( this.type, true ) : Constants.Z_OBJECT;
		},
		/**
		 * Whether the value is a Wikidata entity, currently
		 * represented by a function call to one of the Wikidata
		 * fetch functions.
		 *
		 * @return {boolean}
		 */
		isWikidataItem: function () {
			return this.isWikidataFetch( this.rowId );
		},
		/**
		 * Whether the key expects a Wikidata item type.
		 *
		 * @return {boolean}
		 */
		expectsWikidataItem: function () {
			return Constants.WIKIDATA_TYPES.includes( this.parentExpectedType );
		},
		/**
		 * Returns whether the key expected type can be persisted and
		 * hence can be referenced.
		 *
		 * @return {boolean}
		 */
		canBeReferenced: function () {
			return !Constants.EXCLUDE_FROM_PERSISTENT_CONTENT.includes( this.parentExpectedType );
		},
		/**
		 * Whether the selected mode is a resolver or a literal type
		 *
		 * @return {boolean}
		 */
		isResolver: function () {
			return [
				Constants.Z_FUNCTION_CALL,
				Constants.Z_ARGUMENT_REFERENCE,
				Constants.Z_REFERENCE
			].includes( this.selected );
		},
		/**
		 * Returns the available options for the type mode selector.
		 * The available options are all the available resolver types
		 * (Z9/Reference, Z7/Function call and Z18/Argument reference
		 * if we are inside an implementation composition) and the
		 * literal type.
		 * The literal type is specific if selected or bound by key,
		 * else it will allow the selection for any literal type (Object)
		 *
		 * @return {Array} Array of codex MenuItemData objects
		 */
		menuItems: function () {
			// Literals and resolvers, sorted by label:
			const resolvers = this.getResolverMenuItems();
			const literals = this.getLiteralMenuItems();
			const options = [ ...literals, ...resolvers ];
			options.sort( ( a, b ) => ( a.label < b.label ) ? -1 :
				( a.label > b.label ) ? 1 : 0 );

			// If it's a list item, add list item operations:
			// * Move item one position before
			// * Move item one position after
			// * Delete item
			if ( this.isKeyTypedListItem( this.key ) ) {
				const isFirst = this.key === '1';
				const isLast = this.key === String( this.listCount );
				options.push( ...[ {
					label: this.$i18n( 'wikilambda-move-before-list-item' ).text(),
					value: Constants.LIST_MENU_OPTIONS.MOVE_BEFORE,
					icon: icons.cdxIconTableMoveRowBefore,
					disabled: isFirst,
					class: 'ext-wikilambda-app-mode-selector__move-before'
				}, {
					label: this.$i18n( 'wikilambda-move-after-list-item' ).text(),
					value: Constants.LIST_MENU_OPTIONS.MOVE_AFTER,
					icon: icons.cdxIconTableMoveRowAfter,
					disabled: isLast,
					class: 'ext-wikilambda-app-mode-selector__move-after'
				}, {
					label: this.$i18n( 'wikilambda-delete-list-item' ).text(),
					value: Constants.LIST_MENU_OPTIONS.DELETE_ITEM,
					icon: icons.cdxIconTrash,
					action: 'destructive',
					class: 'ext-wikilambda-app-mode-selector__delete'
				} ] );
			}
			return options;
		},
		/**
		 * If the key belongs to a typed list item, it returns the
		 * list item count (not including the type element)
		 *
		 * @return {number}
		 */
		listCount: function () {
			if ( this.isKeyTypedListItem( this.key ) ) {
				const parentRowId = this.getParentRowId( this.rowId );
				const children = this.getChildrenByParentRowId( parentRowId );
				return children.length - 1;
			}
			return 0;
		}
	} ),
	methods: {
		/**
		 * Emit the event that corresponds to the selected menu item
		 *
		 * @param {string} value
		 */
		selectMode: function ( value ) {
			// List actions:
			if ( value === Constants.LIST_MENU_OPTIONS.DELETE_ITEM ) {
				this.$emit( 'delete-list-item' );
				return;
			}
			if ( value === Constants.LIST_MENU_OPTIONS.MOVE_BEFORE ) {
				this.$emit( 'move-before' );
				return;
			}
			if ( value === Constants.LIST_MENU_OPTIONS.MOVE_AFTER ) {
				this.$emit( 'move-after' );
				return;
			}

			if ( value !== this.selected ) {
				const newType = this.menuItems.find( ( menu ) => menu.value === value );
				this.$emit( 'set-type', {
					keypath: [],
					value: newType.type,
					literal: true
				} );
			}
		},
		/**
		 * Return the menu options for creating resolver types
		 *
		 * @return {Array}
		 */
		getResolverMenuItems: function () {
			const resolvers = [];

			// Function call: Always available as long as:
			// * is not containing a wikidata entity (already a function call)
			if ( !this.expectsWikidataItem ) {
				resolvers.push( {
					label: this.getLabelData( Constants.Z_FUNCTION_CALL ).label,
					value: Constants.Z_FUNCTION_CALL,
					type: Constants.Z_FUNCTION_CALL,
					icon: icons.cdxIconFunction
				} );
			}

			// Reference: Always available as long as:
			// * is not containing a wikidata entity
			// * the key expected type can be referenced
			if ( this.canBeReferenced ) {
				resolvers.push( {
					label: this.getLabelData( Constants.Z_REFERENCE ).label,
					value: Constants.Z_REFERENCE,
					type: Constants.Z_REFERENCE,
					icon: icons.cdxIconInstance
				} );
			}

			// Argument reference: Only available if inside a composition
			if ( this.isInsideComposition( this.rowId ) ) {
				resolvers.push( {
					label: this.getLabelData( Constants.Z_ARGUMENT_REFERENCE ).label,
					value: Constants.Z_ARGUMENT_REFERENCE,
					type: Constants.Z_ARGUMENT_REFERENCE,
					icon: icons.cdxIconFunctionArgument
				} );
			}
			return resolvers;
		},
		/**
		 * Return the menu options for creating literal types
		 *
		 * @return {Array}
		 */
		getLiteralMenuItems: function () {
			const literals = [];

			// Add literal parent expected type when:
			// * Key is not Z1K1/Object type; no literal Z4/Types
			// * Key is not "0" type of a typed list; no literal Z4/Types
			// * Is not a custom enum type; should never be a literal, always referenced
			// * Does not expect a Wikidata entity
			const parentTypeString = this.typeToString( this.parentExpectedType, true );
			if (
				this.key !== Constants.Z_OBJECT_TYPE &&
				!this.isKeyTypedListType( this.key ) &&
				!this.isCustomEnum( this.parentExpectedType ) &&
				!this.expectsWikidataItem
			) {
				literals.push( {
					label: this.$i18n( 'wikilambda-literal-type', this.getLabelData( parentTypeString ).label ).text(),
					value: parentTypeString,
					type: this.parentExpectedType,
					icon: icons.cdxIconLiteral
				} );
			}

			// Also add selected type when:
			// * type is not a Wikidata item
			// * type is selected and valid,
			// * type is not a resolver (Z9/Z7/Z18), and
			// * parent expected type is Z1/Object.
			// This means that whenever the parent expected type is Z1
			// but a valid type is selected, we will be showing both:
			// * Literal Object
			// * Literal <Selected type>
			const typeString = this.typeToString( this.type, true );
			if (
				!this.isWikidataItem &&
				!!this.type && !!typeString &&
				!this.isResolver &&
				this.parentExpectedType === Constants.Z_OBJECT
			) {
				literals.push( {
					label: this.$i18n( 'wikilambda-literal-type', this.getLabelData( typeString ).label ).text(),
					value: typeString,
					type: this.type,
					icon: icons.cdxIconLiteral
				} );
			}

			return literals;
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-mode-selector {
	position: relative;

	.ext-wikilambda-app-mode-selector__move-before {
		box-shadow: 0 -1px 0 0 @border-color-subtle;
	}

	.ext-wikilambda-app-mode-selector__delete {
		box-shadow: 0 -1px 0 0 @border-color-subtle;
	}
}
</style>
