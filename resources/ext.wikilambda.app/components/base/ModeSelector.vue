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

const Constants = require( '../../Constants.js' );
const typeMixin = require( '../../mixins/typeMixin.js' );
const zobjectMixin = require( '../../mixins/zobjectMixin.js' );
const useMainStore = require( '../../store/index.js' );
const icons = require( '../../../lib/icons.json' );

// Codex components
const { CdxIcon, CdxMenuButton } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-mode-selector',
	components: {
		'cdx-icon': CdxIcon,
		'cdx-menu-button': CdxMenuButton
	},
	mixins: [ typeMixin, zobjectMixin ],
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: [ Object, Array ],
			required: true
		},
		expectedType: {
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
		'getParentListCount',
		'getLabelData',
		'isCustomEnum'
	] ), {
		/**
		 * Returns the type of the value of the the ZObject represented
		 * in this component. When it's not set, it's undefined.
		 *
		 * @return {string|Object|undefined}
		 */
		typeObject: function () {
			return this.getZObjectType( this.objectValue );
		},
		/**
		 * Returns the string representation of the ZObject type;
		 * if the type is a function call, does not include the args.
		 *
		 * @return {string}
		 */
		typeString: function () {
			return this.typeToString( this.typeObject, true );
		},
		/**
		 * Value of the selected option or Z1/Object if unselected
		 *
		 * @return {string}
		 */
		selected: function () {
			return this.typeObject ? this.typeString : Constants.Z_OBJECT;
		},
		/**
		 * Whether the value is a Wikidata entity represented by a
		 * function call to one of the Wikidata fetch functions.
		 *
		 * @return {boolean}
		 */
		isWikidataItem: function () {
			return this.isWikidataFetch( this.objectValue );
		},
		/**
		 * Returns whether the current path is child of an implementation
		 * composition (Z14K2), which will determine whether
		 * we can use argument references in its type selectors.
		 *
		 * @return {boolean}
		 */
		isInsideComposition: function () {
			return this.keyPath.split( '.' ).includes( Constants.Z_IMPLEMENTATION_COMPOSITION );
		},
		/**
		 * Whether the key expects a Wikidata item type.
		 *
		 * @return {boolean}
		 */
		expectsWikidataItem: function () {
			return Constants.WIKIDATA_TYPES.includes( this.expectedType );
		},
		/**
		 * Returns whether the key expected type can be persisted and
		 * hence can be referenced.
		 *
		 * @return {boolean}
		 */
		canBeReferenced: function () {
			return !Constants.EXCLUDE_FROM_PERSISTENT_CONTENT.includes( this.expectedType );
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
			const menuItems = [];
			// Literals and resolvers, sorted by label:
			const resolvers = this.getResolverMenuItems();
			const literals = this.getLiteralMenuItems();
			const options = [ ...literals, ...resolvers ]
				.sort( ( a, b ) => ( a.label < b.label ) ? -1 :
					( a.label > b.label ) ? 1 : 0 );

			// If there are literals and resolvers, add them to the menu
			if ( options.length ) {
				menuItems.push( {
					label: this.$i18n( 'wikilambda-mode-selector-types-group-label' ).text(),
					hideLabel: true,
					items: options
				} );
			}

			// If it's a list item, add list item operations:
			// * Move item one position before
			// * Move item one position after
			// * Delete item
			if ( this.isKeyTypedListItem( this.key ) ) {
				const isFirst = this.key === '1';
				const isLast = this.key === String( this.listCount );
				const moveActionsGroup = {
					label: this.$i18n( 'wikilambda-mode-selector-move-group-label' ).text(),
					hideLabel: true,
					items: [
						{
							label: this.$i18n( 'wikilambda-move-before-list-item' ).text(),
							value: Constants.LIST_MENU_OPTIONS.MOVE_BEFORE,
							icon: icons.cdxIconTableMoveRowBefore,
							disabled: isFirst
						}, {
							label: this.$i18n( 'wikilambda-move-after-list-item' ).text(),
							value: Constants.LIST_MENU_OPTIONS.MOVE_AFTER,
							icon: icons.cdxIconTableMoveRowAfter,
							disabled: isLast
						}
					]
				};
				const deleteActionGroup = {
					label: this.$i18n( 'wikilambda-mode-selector-delete-group-label' ).text(),
					hideLabel: true,
					items: [
						{
							label: this.$i18n( 'wikilambda-delete-list-item' ).text(),
							value: Constants.LIST_MENU_OPTIONS.DELETE_ITEM,
							icon: icons.cdxIconTrash,
							action: 'destructive'
						}
					]
				};
				menuItems.push( moveActionsGroup, deleteActionGroup );
			}

			// If we are setting a function call function Id with a non-ref,
			// enable the option of adding args manually:
			if ( this.key === Constants.Z_FUNCTION_CALL_FUNCTION && this.typeString !== Constants.Z_REFERENCE ) {
				const addArgumentActionGroup = {
					label: this.$i18n( 'wikilambda-mode-selector-local-key-group-label' ),
					hideLabel: true,
					items: [
						{
							label: this.$i18n( 'wikilambda-add-local-key-to-function-call' ).text(),
							value: Constants.LIST_MENU_OPTIONS.ADD_ARG,
							icon: icons.cdxIconAdd
						}
					]
				};
				menuItems.push( addArgumentActionGroup );
			}

			// If this is a local key, enable the option of removing it manually:
			if ( this.isLocalKey( this.key ) ) {
				const deleteArgumentActionGroup = {
					label: this.$i18n( 'wikilambda-mode-selector-local-key-group-label' ),
					hideLabel: true,
					items: [
						{
							label: this.$i18n( 'wikilambda-delete-local-key-from-function-call' ).text(),
							value: Constants.LIST_MENU_OPTIONS.DELETE_ARG,
							icon: icons.cdxIconTrash,
							action: 'destructive'
						}
					]
				};
				menuItems.push( deleteArgumentActionGroup );
			}

			return menuItems;
		},
		/**
		 * If the key belongs to a typed list item, it returns the
		 * list item count (not including the type element)
		 *
		 * @return {number}
		 */
		listCount: function () {
			return this.isKeyTypedListItem( this.key ) ?
				this.getParentListCount( this.keyPath.split( '.' ) ) :
				0;
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
			if ( value === Constants.LIST_MENU_OPTIONS.ADD_ARG ) {
				this.$emit( 'add-arg' );
				return;
			}
			if ( value === Constants.LIST_MENU_OPTIONS.DELETE_ARG ) {
				this.$emit( 'delete-arg' );
				return;
			}

			if ( value !== this.selected ) {
				const newType = this.menuItems[ 0 ].items.find( ( menu ) => menu.value === value );
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

			// Function call: Always available
			resolvers.push( {
				label: this.getLabelData( Constants.Z_FUNCTION_CALL ).label,
				value: Constants.Z_FUNCTION_CALL,
				type: Constants.Z_FUNCTION_CALL,
				icon: icons.cdxIconFunction
			} );

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
			if ( this.isInsideComposition ) {
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
			// * Is not a custom enum type; enums should never be literals, always referenced
			// * Does not expect a Wikidata entity
			// * Is not in EXCLUDE_FROM_LITERAL_MODE_SELECTION
			const parentTypeString = this.typeToString( this.expectedType, true );
			if (
				this.key !== Constants.Z_OBJECT_TYPE &&
				!this.isKeyTypedListType( this.key ) &&
				!this.isCustomEnum( this.expectedType ) &&
				!this.expectsWikidataItem &&
				!Constants.EXCLUDE_FROM_LITERAL_MODE_SELECTION.includes( this.expectedType )
			) {
				literals.push( {
					label: this.$i18n( 'wikilambda-literal-type', this.getLabelData( parentTypeString ).label ).text(),
					value: parentTypeString,
					type: this.expectedType,
					icon: icons.cdxIconLiteral
				} );
			}

			// Also add selected type when:
			// * type is not a Wikidata item
			// * type is selected and valid,
			// * type is not a resolver (Z9/Z7/Z18), and
			// * parent expected type is Z1/Object.
			// * type is not in EXCLUDE_FROM_LITERAL_MODE_SELECTION
			if (
				!this.isWikidataItem &&
				!!this.typeObject && !!this.typeString &&
				!this.isResolver &&
				this.expectedType === Constants.Z_OBJECT &&
				!Constants.EXCLUDE_FROM_LITERAL_MODE_SELECTION.includes( this.typeString )
			) {
				literals.push( {
					label: this.$i18n( 'wikilambda-literal-type', this.getLabelData( this.typeString ).label ).text(),
					value: this.typeString,
					type: this.typeObject,
					icon: icons.cdxIconLiteral
				} );
			}

			return literals;
		}
	}
} );
</script>
