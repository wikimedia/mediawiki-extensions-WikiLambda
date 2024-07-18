<template>
	<div class="ext-wikilambda-mode-selector" data-testid="mode-selector">
		<cdx-menu-button
			data-testid="mode-selector-button"
			class="ext-wikilambda-mode-selector-menu-button"
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
const CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxMenuButton = require( '@wikimedia/codex' ).CdxMenuButton,
	Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	icons = require( '../../../lib/icons.json' ),
	mapGetters = require( 'vuex' ).mapGetters;

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
	computed: Object.assign( mapGetters( [
		'getChildrenByParentRowId',
		'getLabelData',
		'getParentRowId',
		'getZObjectTypeByRowId',
		'getZObjectKeyByRowId',
		'isCustomEnum',
		'isInsideComposition'
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
			// Resolver types:
			// * Reference and function are always available
			// * Argument reference only if we are inside a composition
			const resolvers = [
				{
					label: this.getLabelData( Constants.Z_REFERENCE ).label,
					value: Constants.Z_REFERENCE,
					type: Constants.Z_REFERENCE,
					icon: icons.cdxIconInstance
				},
				{
					label: this.getLabelData( Constants.Z_FUNCTION_CALL ).label,
					value: Constants.Z_FUNCTION_CALL,
					type: Constants.Z_FUNCTION_CALL,
					icon: icons.cdxIconFunction
				}
			];
			if ( this.isInsideComposition( this.rowId ) ) {
				resolvers.push( {
					label: this.getLabelData( Constants.Z_ARGUMENT_REFERENCE ).label,
					value: Constants.Z_ARGUMENT_REFERENCE,
					type: Constants.Z_ARGUMENT_REFERENCE,
					icon: icons.cdxIconFunctionArgument
				} );
			}

			// Literal types:
			// * if parent expects a given type and parent is not Z1K1:
			//   * Add "Literal <Expected Type>"
			// * If parent expects any type:
			//   * Add "Literal Object"
			//   * If type is defined, add "Literal <Selected Type>"
			const literals = [];
			let typeString;
			if ( this.key !== Constants.Z_OBJECT_TYPE &&
				!this.isKeyTypedListType( this.key ) &&
				!this.isCustomEnum( this.parentExpectedType )
			) {
				typeString = this.typeToString( this.parentExpectedType, true );
				literals.push( {
					label: this.$i18n( 'wikilambda-literal-type', this.getLabelData( typeString ).label ).text(),
					value: typeString,
					type: this.parentExpectedType,
					icon: icons.cdxIconLiteral
				} );
			}
			if ( !!this.type && !this.isResolver && ( this.parentExpectedType === Constants.Z_OBJECT ) ) {
				typeString = this.typeToString( this.type, true );
				literals.push( {
					label: this.$i18n( 'wikilambda-literal-type', this.getLabelData( typeString ).label ).text(),
					value: typeString,
					type: this.type,
					icon: icons.cdxIconLiteral
				} );
			}

			// Return literals and resolvers, sorted by label
			const options = [ ...literals, ...resolvers ];
			options.sort( ( a, b ) => ( a.label < b.label ) ? -1 :
				( a.label > b.label ) ? 1 : 0 );

			// If it's a list item, add "Move before" and "Move after" items
			if ( this.isKeyTypedListItem( this.key ) ) {
				const isFirst = this.key === '1';
				const isLast = this.key === String( this.listCount );
				options.push( ...[ {
					label: this.$i18n( 'wikilambda-move-before-list-item' ).text(),
					value: Constants.LIST_MENU_OPTIONS.MOVE_BEFORE,
					icon: icons.cdxIconTableMoveRowBefore,
					disabled: isFirst,
					class: 'ext-wikilambda-mode-selector-move-before'
				}, {
					label: this.$i18n( 'wikilambda-move-after-list-item' ).text(),
					value: Constants.LIST_MENU_OPTIONS.MOVE_AFTER,
					icon: icons.cdxIconTableMoveRowAfter,
					disabled: isLast,
					class: 'ext-wikilambda-mode-selector-move-after'
				}, {
					label: this.$i18n( 'wikilambda-delete-list-item' ).text(),
					value: Constants.LIST_MENU_OPTIONS.DELETE_ITEM,
					icon: icons.cdxIconTrash,
					action: 'destructive',
					class: 'ext-wikilambda-mode-selector-delete'
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
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-mode-selector {
	position: relative;

	.ext-wikilambda-mode-selector-move-before {
		box-shadow: 0 -1px 0 0 @border-color-subtle;
	}

	.ext-wikilambda-mode-selector-delete {
		box-shadow: 0 -1px 0 0 @border-color-subtle;
	}
}
</style>
