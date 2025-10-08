<template>
	<div class="ext-wikilambda-app-mode-selector" data-testid="mode-selector">
		<cdx-menu-button
			v-if="menuItems.length > 0"
			data-testid="mode-selector-button"
			class="ext-wikilambda-app-mode-selector__menu-button"
			:selected="selected"
			:menu-items="menuItems"
			:aria-label="i18n( 'wikilambda-mode-selector-button-label' ).text()"
			:disabled="disabled"
			@update:selected="selectMode"
		>
			<cdx-icon :icon="icon"></cdx-icon>
		</cdx-menu-button>
	</div>
</template>

<script>
const { computed, defineComponent, inject, ref } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useType = require( '../../composables/useType.js' );
const useZObject = require( '../../composables/useZObject.js' );
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
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const { typeToString, isKeyTypedListItem, isKeyTypedListType, isLocalKey } = useType();
		const {
			getZObjectType,
			isWikidataFetch,
			key,
			parentKey
		} = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		// Reactive data
		const icon = ref( icons.cdxIconEllipsis );

		// Computed properties
		/**
		 * Returns the type of the value of the the ZObject represented
		 * in this component. When it's not set, it's undefined.
		 *
		 * @return {string|Object|undefined}
		 */
		const typeObject = computed( () => getZObjectType( props.objectValue ) );

		/**
		 * Returns the string representation of the ZObject type;
		 * if the type is a function call, does not include the args.
		 *
		 * @return {string}
		 */
		const typeString = computed( () => typeToString( typeObject.value, true ) );

		/**
		 * Value of the selected option or Z1/Object if unselected
		 *
		 * @return {string}
		 */
		const selected = computed( () => typeObject.value ? typeString.value : Constants.Z_OBJECT );

		/**
		 * Whether the value is a Wikidata entity represented by a
		 * function call to one of the Wikidata fetch functions.
		 *
		 * @return {boolean}
		 */
		const isWikidataItem = computed( () => isWikidataFetch( props.objectValue ) );

		/**
		 * Returns whether the current path is child of an implementation
		 * composition (Z14K2), which will determine whether
		 * we can use argument references in its type selectors.
		 *
		 * @return {boolean}
		 */
		const isInsideComposition = computed( () => props.keyPath.split( '.' ).includes( Constants.Z_IMPLEMENTATION_COMPOSITION ) );

		/**
		 * Whether the key expects a Wikidata item type.
		 *
		 * @return {boolean}
		 */
		const expectsWikidataItem = computed( () => Constants.WIKIDATA_TYPES.includes( props.expectedType ) );

		/**
		 * Returns whether the key expected type can be persisted and
		 * hence can be referenced.
		 *
		 * @return {boolean}
		 */
		const canBeReferenced = computed( () => !Constants.EXCLUDE_FROM_PERSISTENT_CONTENT
			.includes( props.expectedType )
		);

		/**
		 * Whether the selected mode is a resolver or a literal type
		 *
		 * @return {boolean}
		 */
		const isResolver = computed( () => [
			Constants.Z_FUNCTION_CALL,
			Constants.Z_ARGUMENT_REFERENCE,
			Constants.Z_REFERENCE
		].includes( selected.value ) );

		/**
		 * Whether to allow resolvers from the menu.
		 *
		 * @return {boolean}
		 */
		const allowResolvers = computed( () => parentKey.value !== Constants.Z_MULTILINGUALSTRING_VALUE );

		/**
		 * Whether to allow literals from the menu.
		 *
		 * @return {boolean}
		 */
		const allowLiterals = computed( () => parentKey.value !== Constants.Z_MULTILINGUALSTRING_VALUE );

		/**
		 * Whether to allow move actions
		 *
		 * @return {boolean}
		 */
		const allowMove = computed( () => parentKey.value !== Constants.Z_MULTILINGUALSTRING_VALUE );

		/**
		 * Returns the list count if this is a typed list item
		 *
		 * @return {number}
		 */
		const listCount = computed( () => isKeyTypedListItem( key.value ) ?
			store.getParentListCount( props.keyPath.split( '.' ) ) :
			0
		);

		// Helper methods for menu items
		/**
		 * Return the menu options for resolver types
		 *
		 * @return {Array}
		 */
		const getResolverMenuItems = () => {
			const resolvers = [];

			// Function call: Always available
			resolvers.push( {
				label: store.getLabelData( Constants.Z_FUNCTION_CALL ).label,
				value: Constants.Z_FUNCTION_CALL,
				type: Constants.Z_FUNCTION_CALL,
				icon: icons.cdxIconFunction
			} );

			// Reference: Always available as long as:
			// * is not containing a wikidata entity
			// * the key expected type can be referenced
			if ( canBeReferenced.value ) {
				resolvers.push( {
					label: store.getLabelData( Constants.Z_REFERENCE ).label,
					value: Constants.Z_REFERENCE,
					type: Constants.Z_REFERENCE,
					icon: icons.cdxIconInstance
				} );
			}

			// Argument reference: Only available if inside a composition
			if ( isInsideComposition.value ) {
				resolvers.push( {
					label: store.getLabelData( Constants.Z_ARGUMENT_REFERENCE ).label,
					value: Constants.Z_ARGUMENT_REFERENCE,
					type: Constants.Z_ARGUMENT_REFERENCE,
					icon: icons.cdxIconFunctionArgument
				} );
			}
			return resolvers;
		};

		/**
		 * Return the menu options for creating literal types
		 *
		 * @return {Array}
		 */
		const getLiteralMenuItems = () => {
			const literals = [];

			// Add literal parent expected type when:
			// * Key is not Z1K1/Object type; no literal Z4/Types
			// * Key is not "0" type of a typed list; no literal Z4/Types
			// * Is not a custom enum type; enums should never be literals, always referenced
			// * Does not expect a Wikidata entity
			// * Is not in EXCLUDE_FROM_LITERAL_MODE_SELECTION
			const parentTypeString = typeToString( props.expectedType, true );
			if (
				key.value !== Constants.Z_OBJECT_TYPE &&
				!isKeyTypedListType( key.value ) &&
				!store.isCustomEnum( props.expectedType ) &&
				!expectsWikidataItem.value &&
				!Constants.EXCLUDE_FROM_LITERAL_MODE_SELECTION.includes( props.expectedType )
			) {
				literals.push( {
					label: i18n( 'wikilambda-literal-type', store.getLabelData( parentTypeString ).label ).text(),
					value: parentTypeString,
					type: props.expectedType,
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
				!isWikidataItem.value &&
				!!typeObject.value && !!typeString.value &&
				!isResolver.value &&
				props.expectedType === Constants.Z_OBJECT &&
				!Constants.EXCLUDE_FROM_LITERAL_MODE_SELECTION.includes( typeString.value )
			) {
				literals.push( {
					label: i18n( 'wikilambda-literal-type', store.getLabelData( typeString.value ).label ).text(),
					value: typeString.value,
					type: typeObject.value,
					icon: icons.cdxIconLiteral
				} );
			}

			return literals;
		};

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
		const menuItems = computed( () => {
			const items = [];
			// Literals and resolvers, sorted by label:
			const resolvers = getResolverMenuItems();
			const literals = getLiteralMenuItems();
			const options = [
				...( allowLiterals.value ? literals : [] ),
				...( allowResolvers.value ? resolvers : [] )
			]
				.sort( ( a, b ) => ( a.label < b.label ) ? -1 :
					( a.label > b.label ) ? 1 : 0 );

			// If there are literals and resolvers, add them to the menu
			if ( options.length ) {
				items.push( {
					label: i18n( 'wikilambda-mode-selector-types-group-label' ).text(),
					hideLabel: true,
					items: options
				} );
			}

			// If it's a list item, add list item operations:
			// * Move item one position before
			// * Move item one position after
			// * Delete item
			if ( isKeyTypedListItem( key.value ) ) {
				const isFirst = key.value === '1';
				const isLast = key.value === String( listCount.value );
				const moveActionsGroup = {
					label: i18n( 'wikilambda-mode-selector-move-group-label' ).text(),
					hideLabel: true,
					items: [
						{
							label: i18n( 'wikilambda-move-before-list-item' ).text(),
							value: Constants.LIST_MENU_OPTIONS.MOVE_BEFORE,
							icon: icons.cdxIconTableMoveRowBefore,
							disabled: isFirst
						}, {
							label: i18n( 'wikilambda-move-after-list-item' ).text(),
							value: Constants.LIST_MENU_OPTIONS.MOVE_AFTER,
							icon: icons.cdxIconTableMoveRowAfter,
							disabled: isLast
						}
					]
				};
				const deleteActionGroup = {
					label: i18n( 'wikilambda-mode-selector-delete-group-label' ).text(),
					hideLabel: true,
					items: [
						{
							label: i18n( 'wikilambda-delete-list-item' ).text(),
							value: Constants.LIST_MENU_OPTIONS.DELETE_ITEM,
							icon: icons.cdxIconTrash,
							action: 'destructive'
						}
					]
				};
				// Only show the move actions if allowed
				if ( allowMove.value ) {
					items.push( moveActionsGroup );
				}
				// Always show the delete action
				items.push( deleteActionGroup );
			}

			// If we are setting a function call function Id with a non-ref,
			// enable the option of adding args manually:
			if (
				( key.value === Constants.Z_FUNCTION_CALL_FUNCTION && typeString.value !== Constants.Z_REFERENCE ) ||
				( key.value === Constants.Z_OBJECT_TYPE && typeString.value !== Constants.Z_REFERENCE )
			) {
				const addArgumentActionGroup = {
					label: i18n( 'wikilambda-mode-selector-local-key-group-label' ),
					hideLabel: true,
					items: [
						{
							label: i18n( 'wikilambda-add-local-key-to-function-call' ).text(),
							value: Constants.LIST_MENU_OPTIONS.ADD_ARG,
							icon: icons.cdxIconAdd
						}
					]
				};
				items.push( addArgumentActionGroup );
			}

			// If this is a local key, enable the option of removing it manually:
			if ( isLocalKey( key.value ) ) {
				const deleteArgumentActionGroup = {
					label: i18n( 'wikilambda-mode-selector-local-key-group-label' ),
					hideLabel: true,
					items: [
						{
							label: i18n( 'wikilambda-delete-local-key-from-function-call' ).text(),
							value: Constants.LIST_MENU_OPTIONS.DELETE_ARG,
							icon: icons.cdxIconTrash,
							action: 'destructive'
						}
					]
				};
				items.push( deleteArgumentActionGroup );
			}

			return items;
		} );

		// Methods
		/**
		 * Emit the event that corresponds to the selected menu item
		 *
		 * @param {string} value
		 */
		const selectMode = ( value ) => {
			// List actions:
			if ( value === Constants.LIST_MENU_OPTIONS.DELETE_ITEM ) {
				emit( 'delete-list-item' );
				return;
			}
			if ( value === Constants.LIST_MENU_OPTIONS.MOVE_BEFORE ) {
				emit( 'move-before' );
				return;
			}
			if ( value === Constants.LIST_MENU_OPTIONS.MOVE_AFTER ) {
				emit( 'move-after' );
				return;
			}
			if ( value === Constants.LIST_MENU_OPTIONS.ADD_ARG ) {
				emit( 'add-arg' );
				return;
			}
			if ( value === Constants.LIST_MENU_OPTIONS.DELETE_ARG ) {
				emit( 'delete-arg' );
				return;
			}

			if ( value !== selected.value ) {
				const newType = menuItems.value[ 0 ].items.find( ( menu ) => menu.value === value );
				emit( 'set-type', {
					keypath: [],
					value: newType.type,
					literal: true
				} );
			}
		};

		// Return all properties and methods for the template
		return {
			icon,
			menuItems,
			selectMode,
			selected,
			i18n
		};
	}
} );
</script>
