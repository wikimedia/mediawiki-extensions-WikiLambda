<!--
	WikiLambda Vue component for rendering a ZObjectKeyValue.
	This component handles all the complex logic behind figuring out
	what key-values can be editted, what are their bound types (if any)
	and what kind of view will be rendered, expanded or simple.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		:id="idValue"
		class="ext-wikilambda-app-object-key-value"
		data-testid="z-object-key-value">
		<wl-key-value-block
			field-overrides
			:edit="edit"
			:expanded="isExpanded"
			:disable-edit="disableEdit"
			:has-expanded-border="isExpanded"
			:has-expanded-mode="hasToggle"
			:has-pre-column="hasPreColumn"
			:no-indent="!hasPreColumn"
			@toggle-expand="setExpanded( !isExpanded )">
			<!-- Main content: either only one row with value, or top row with key and then value -->
			<!-- Key and Mode: render only when key is shown -->
			<template v-if="showKeyLabel" #key>
				<wl-localized-label :label-data="keyLabel"></wl-localized-label>
				<!-- Mode: never rendered in view mode -->
				<wl-mode-selector
					v-if="edit"
					:key-path="keyPath"
					:object-value="objectValue"
					:disabled="disableEdit"
					:expected-type="expectedType"
					@set-type="setType"
					@delete-list-item="deleteListItem( keyPath )"
					@move-before="moveBefore( keyPath )"
					@move-after="moveAfter( keyPath )"
					@add-arg="addArgument"
					@delete-arg="deleteArgument"
				></wl-mode-selector>
			</template>
			<!-- Value: will always be rendered -->
			<template #value>
				<component
					:is="renderComponent"
					v-if="renderComponent"
					:key-path="keyPath"
					:object-value="objectValue"
					:edit="edit"
					:type="type"
					:disabled="disableEdit"
					:expanded="isExpanded"
					:expected-type="expectedType"
					:parent-expected-type="parentExpectedType"
					:parent-list-item-type="parentListItemType"
					@set-value="setValue"
					@set-type="setType"
					@add-list-item="addListItem( $event, keyPath, listItemCount )"
					@expand="setExpanded"
				></component>
			</template>
		</wl-key-value-block>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onBeforeUnmount, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const useError = require( '../../composables/useError.js' );
const useType = require( '../../composables/useType.js' );
const useZObject = require( '../../composables/useZObject.js' );
const useMenuAction = require( '../../composables/useMenuAction.js' );
const LabelData = require( '../../store/classes/LabelData.js' );

// Base components
const ExpandedToggle = require( '../base/ExpandedToggle.vue' );
const KeyValueBlock = require( '../base/KeyValueBlock.vue' );
const LocalizedLabel = require( '../base/LocalizedLabel.vue' );
const ModeSelector = require( '../base/ModeSelector.vue' );
// Type components
const ZString = require( './ZString.vue' );
const ZReference = require( './ZReference.vue' );
const ZMonolingualString = require( './ZMonolingualString.vue' );
const ZMultilingualString = require( './ZMultilingualString.vue' );
const ZObjectKeyValueSet = require( './ZObjectKeyValueSet.vue' );
const ZObjectStringRenderer = require( './ZObjectStringRenderer.vue' );
const ZTypedList = require( './ZTypedList.vue' );
const ZBoolean = require( './ZBoolean.vue' );
const ZFunctionCall = require( './ZFunctionCall.vue' );
const ZHTMLFragment = require( './ZHTMLFragment.vue' );
const ZTester = require( './ZTester.vue' );
const ZImplementation = require( './ZImplementation.vue' );
const ZCode = require( './ZCode.vue' );
const ZArgumentReference = require( './ZArgumentReference.vue' );
// Wikidata Type components
const WikidataItem = require( './wikidata/Item.vue' );
const WikidataEnum = require( './wikidata/Enum.vue' );
const WikidataLexeme = require( './wikidata/Lexeme.vue' );
const WikidataLexemeForm = require( './wikidata/LexemeForm.vue' );
const WikidataLexemeSense = require( './wikidata/LexemeSense.vue' );
const WikidataProperty = require( './wikidata/Property.vue' );
const WikidataStatement = require( './wikidata/Statement.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-z-object-key-value',
	components: {
		// Base components
		'wl-expanded-toggle': ExpandedToggle,
		'wl-key-value-block': KeyValueBlock,
		'wl-localized-label': LocalizedLabel,
		// Type components
		'wl-mode-selector': ModeSelector,
		'wl-z-object-key-value-set': ZObjectKeyValueSet,
		'wl-z-object-string-renderer': ZObjectStringRenderer,
		'wl-z-string': ZString,
		'wl-z-reference': ZReference,
		'wl-z-monolingual-string': ZMonolingualString,
		'wl-z-multilingual-string': ZMultilingualString,
		'wl-z-typed-list': ZTypedList,
		'wl-z-boolean': ZBoolean,
		'wl-z-function-call': ZFunctionCall,
		'wl-z-html-fragment': ZHTMLFragment,
		'wl-z-tester': ZTester,
		'wl-z-implementation': ZImplementation,
		'wl-z-code': ZCode,
		'wl-z-argument-reference': ZArgumentReference,
		// Wikidata type components
		'wl-wikidata-enum': WikidataEnum,
		'wl-wikidata-item': WikidataItem,
		'wl-wikidata-lexeme': WikidataLexeme,
		'wl-wikidata-lexeme-form': WikidataLexemeForm,
		'wl-wikidata-property': WikidataProperty,
		'wl-wikidata-lexeme-sense': WikidataLexemeSense,
		'wl-wikidata-statement': WikidataStatement
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: [ Object, Array ],
			required: false,
			default: undefined
		},
		edit: {
			type: Boolean,
			required: true
		},
		// Layout config
		skipKey: {
			type: Boolean,
			default: false
		},
		skipIndent: {
			type: Boolean,
			default: false
		},
		// Parent inherited
		parentDisableEdit: {
			type: Boolean,
			default: false
		},
		parentListItemType: {
			type: [ String, Object ],
			default: undefined
		},
		// Default initial expansion state
		defaultExpanded: {
			type: Boolean,
			default: false
		}
	},
	emits: [ 'set-value', 'set-type', 'add-list-item', 'typed-list-type-changed' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();
		const { typeToString, isKeyTypedListItem, isKeyTypedListType } = useType();
		const {
			getZKeyIsIdentity,
			getZMonolingualLangValue,
			getZObjectType,
			isWikidataFetch,
			key,
			parentKey,
			getZFunctionCallFunctionId
		} = useZObject( { keyPath: props.keyPath } );
		const { hasFieldErrors, hasChildErrors } = useError( { keyPath: props.keyPath } );
		const {
			setDirtyKeyPath,
			moveBefore,
			moveAfter,
			addListItem,
			deleteListItem
		} = useMenuAction();

		// Expansion state
		/**
		 * Expanded is a property of the key-value and it
		 * passes down only into its direct child. Every
		 * ZObjectKeyValue component sets its data property
		 * 'expanded' independently.
		 */
		const expanded = ref( props.defaultExpanded );

		/**
		 * Track whether this component has been auto-expanded due to errors.
		 * This prevents forcing expansion after the user manually collapses.
		 */
		const hasBeenAutoExpanded = ref( false );

		// Key label
		/**
		 * Returns whether to show the key label or not
		 *
		 * @return {boolean}
		 */
		const showKeyLabel = computed( () => {
			if ( props.skipKey ) {
				return false;
			}
			if ( isKeyTypedListItem( key.value ) ) {
				return props.edit || expanded.value;
			}
			return true;
		} );

		/**
		 * Returns the label data object of the given key.
		 * * If the key is a numeral, return hardcoded typed list labels
		 * * If the key is not available, return the key id
		 *
		 * @return {LabelData}
		 */
		const keyLabel = computed( () => {
			// since the FE represents typed lists in canonical form, we need to hardcode typed list keys
			if ( isKeyTypedListItem( key.value ) ) {
				// For multilingual strings, use language name as label or "No language selected" for blanks
				if ( store.isInMultilingualStringList( props.keyPath ) ) {
					const langZid = getZMonolingualLangValue( props.objectValue );
					if ( langZid ) {
						return store.getLabelData( langZid );
					} else {
						return LabelData.fromString( i18n( 'wikilambda-editor-monolingual-string-nolanguage' ).text() );
					}
				}
				return LabelData.fromString( i18n( 'wikilambda-list-item-label', key.value ).text() );
			}
			if ( isKeyTypedListType( key.value ) ) {
				return LabelData.fromString( i18n( 'wikilambda-list-items-type-label' ).text() );
			}
			return store.getLabelData( key.value );
		} );

		const listItemCount = computed( () => Array.isArray( props.objectValue ) ?
			props.objectValue.length :
			undefined );

		// Type data
		/**
		 * Returns the type of the object represented in this node,
		 * in string format, and without arguments if it's a function call.
		 * E.g. "Z9", "Z7", "Z881"
		 *
		 * @return {string}
		 */
		const type = computed( () => typeToString( getZObjectType( props.objectValue ), true ) );

		/**
		 * Returns the expected (or bound) type for the value of
		 * the key-value pair represented in this component.
		 *
		 * @return {string|Object|undefined}
		 */
		const expectedType = computed( () => {
			// If key is a numerical index, this is the key of a typed list type/item
			// 1. If index is zero, it should always expect a Z4/Type
			if ( isKeyTypedListType( key.value ) ) {
				return Constants.Z_TYPE;
			}
			// 2. If index is > zero, the type of each item must be whatever
			// the type of the list is, or Z1 if parentListItemType is undefined
			if ( isKeyTypedListItem( key.value ) ) {
				return props.parentListItemType || Constants.Z_OBJECT;
			}
			// If ZnKn shaped key, get expected from the key definition
			return key.value ? store.getExpectedTypeOfKey( key.value ) : undefined;
		} );

		// Parent type data
		/**
		 * Returns the expected type of the parent key. If the key is of
		 * a typed list item, it returns the list item expected type.
		 *
		 * @return {string|Object|undefined}
		 */
		const parentExpectedType = computed( () => {
			// If parent key is a numerical index, it's the key of a typed list type/item
			// 1. If index is zero, it should always expect a Z4/Type in any mode
			if ( isKeyTypedListType( parentKey.value ) ) {
				return Constants.Z_TYPE;
			}
			// 2. If item index (not zero), it should expect the typed list type
			if ( isKeyTypedListItem( parentKey.value ) ) {
				return props.parentListItemType || Constants.Z_OBJECT;
			}
			// If ZnKn shaped key, get expected from the key definition
			return parentKey.value ? store.getExpectedTypeOfKey( parentKey.value ) : undefined;
		} );

		// Layout configuration
		/**
		 * Returns the layout configuration for the object value.
		 * The layout config contains the following config properties:
		 * * hasBuiltin: whether the value has a builtin component.
		 * * component: name of the builtin component, if any, else null.
		 * * allowExpansion: whether the ZObjectKeyValue should show the expansion
		 *   toggle and switch between expanded/collapsed. E.g. Some components like
		 *   ZReference should not be expanded, while others like ZMonolingualString
		 *   should.
		 * * expandToSelf: (optional) if allowExpansion is true, by default the expanded
		 *   version renders ZObjectKeyValueSet instead of the builtin component,
		 *   but if expandToSelf is true, the expansion version will still render
		 *   the builtin component and the expansion state will be handled
		 *   internally. E.g. ZTypedList component has both collapsed/expanded
		 *   states, but the builtin component handles both, it nevers falls
		 *   back to ZObjectKeyValueSet.
		 *
		 * The default configuration per type is stored in Constants.BUILTIN_TYPE_CONFIG,
		 * but other special behavior (E.g. determined by key, or determined by a
		 * callable like isWikidataEnum) is added computationally.
		 *
		 * If the object doesn't have any specified layout config, the default is
		 * returned:
		 * * hasBuiltin: false
		 * * component: null
		 * * allowExpansion: true
		 *
		 * Other computed properties that define the layout of the component
		 * to be rendered will use the object returned by layoutConfig.
		 * E.g. renderComponent, hasToggle, isExpanded
		 *
		 * @return {Object}
		 */
		const layoutConfig = computed( () => {
			// Initial layout config, by type or blank:
			const layout = Object.assign( {
				hasBuiltin: false,
				component: null,
				allowExpansion: true
			}, Constants.BUILTIN_TYPE_CONFIG[ type.value ] || {} );

			// Set layout config for terminal key of Argument Reference
			// If type is string, but key is argument reference key (Z18K1), we render
			// the value using the argument reference component, but configure it as terminal
			if ( key.value === Constants.Z_ARGUMENT_REFERENCE_KEY ) {
				return Object.assign( {},
					Constants.BUILTIN_TYPE_CONFIG[ Constants.Z_ARGUMENT_REFERENCE ],
					{ allowExpansion: false }
				);
			}

			// If type is a Wikidata enum, we render the value using the Wikidata enum component
			if ( store.isWikidataEnum( type.value ) ) {
				return {
					hasBuiltin: true,
					component: 'wl-wikidata-enum',
					allowExpansion: false
				};
			}

			// If type is a Wikidata statement, we render the value using the Wikidata statement component
			// but only if we are in read mode
			if ( type.value === Constants.Z_WIKIDATA_STATEMENT && !props.edit ) {
				return {
					hasBuiltin: true,
					component: 'wl-wikidata-statement',
					allowExpansion: true,
					expandToSelf: false
				};
			}

			// Set layout config for Wikidata fetch functions:
			// If type is function call, but the call is to a fetch Wikidata entity
			// we use the layout config of the the Wikidata component instead of the Function Call one
			if ( isWikidataFetch( props.objectValue ) ) {
				const fetchFunctionZid = getZFunctionCallFunctionId( props.objectValue );
				const wdType = Constants.WIKIDATA_SIMPLIFIED_TYPES[ fetchFunctionZid ];
				return Constants.BUILTIN_TYPE_CONFIG[ wdType ];
			}

			// Set layout config for types with renderer:
			// If there's no built-in component yet, check if the type has a string renderer.
			// The renderer component will allow expansion but will handle expansion internally.
			if ( !layout.component && store.hasRenderer( type.value ) && store.hasParser( type.value ) ) {
				// TODO (T359669): Currently there are no type distinctions between renderers,
				// all are string renderers. Whenever we create more types of renderers,
				// we should consider checking the right type in here.
				return {
					hasBuiltin: true,
					component: 'wl-z-object-string-renderer',
					allowExpansion: true,
					expandToSelf: true
				};
			}

			return layout;
		} );

		// Component rendering
		/**
		 * Returns the name of the child component to render, depending on:
		 * * the layoutConfig, which depends on the type
		 * * the current state of the flag isExpanded
		 *
		 * @return {string}
		 */
		const renderComponent = computed( () => {
			const config = layoutConfig.value;
			// Generic component configuration.
			// Render the builtin component, when:
			// * there's a layoutConfig for this type, and
			// * it has a builtin component, and
			// * it cannot be expanded, or
			//   it is currently collapsed, or
			//   it is expanded, but it's handled internally by the builtin component
			if (
				config &&
				config.hasBuiltin &&
				( !config.allowExpansion || !expanded.value || config.expandToSelf )
			) {
				return config.component;
			}

			// If there's no builtin component or renderer, always show expanded mode
			return 'wl-z-object-key-value-set';
		} );

		// Expansion display and actions
		/**
		 * Whether to show the expansion toggle icon (chevron) or a bullet icon.
		 *
		 * @return {boolean}
		 */
		const hasToggle = computed( () => layoutConfig.value.hasBuiltin && layoutConfig.value.allowExpansion );

		/**
		 * Whether the component is expanded or collapsed.
		 * * If the component cannot be collapsed (layoutConfig.hasBuiltin
		 *   is false), always return true.
		 * * If the component cannot be expanded (layoutConfig.allowExpansion
		 *   is false), always return false.
		 * * Else, fall back to the local variable that captures the expanded state
		 *   (watchers handle auto-expansion when errors appear)
		 *
		 * @return {boolean}
		 */
		const isExpanded = computed( () => {
			// If there's no builtin, always expanded:
			if ( !layoutConfig.value.hasBuiltin ) {
				return true;
			}
			// If expanded is disallowed, always collapsed:
			if ( !layoutConfig.value.allowExpansion ) {
				return false;
			}
			// Else, expanded state as stored locally:
			return expanded.value;
		} );

		/**
		 * Sets the expanded flag to a given value. If the type
		 * cannot be expanded (because it's terminal), it persistently
		 * sets the expanded flag to false.
		 *
		 * @param {boolean} value
		 */
		function setExpanded( value ) {
			expanded.value = value;
		}

		// Edit state
		/**
		 * Returns whether the key-value should be in disabled edit mode
		 *
		 * @return {boolean}
		 */
		const disableEdit = computed( () => {
			// If parentDisableEdit, all children must disableEdit=true
			if ( props.parentDisableEdit ) {
				return true;
			}

			// If this is the identity key of the root object, disableEdit=true
			// E.g. Z4K1
			if (
				store.isIdentityKey( key.value ) &&
				( parentKey.value === Constants.Z_PERSISTENTOBJECT_VALUE )
			) {
				return true;
			}

			// If the key is that of a typed list type (zero)
			if ( isKeyTypedListType( key.value ) ) {
				// 1. If the parent key is Z6884K2 (Wikidata enum references), disableEdit=true
				//    because the type of the keys is bound to the type of the enum (Z6884K1).
				if ( parentKey.value === Constants.Z_WIKIDATA_ENUM_REFERENCES ) {
					return true;
				}

				// 2. If parent expected type is Z1: disableEdit=false
				// 3. If parent expected type is Z881(Z1): disableEdit=false
				// 4. If parent expected type is Z881(Zn): disableEdit=true
				const parentUnbound = parentExpectedType.value === Constants.Z_OBJECT;
				const parentUnboundList =
					parentExpectedType.value[ Constants.Z_TYPED_LIST_TYPE ] === Constants.Z_OBJECT;

				return !( parentUnbound || parentUnboundList );
			}

			// If the key is "Key type"/Z3K1 and the sister key "Is identity"/Z3K4 is true, disableEdit=true
			if ( key.value === Constants.Z_KEY_TYPE ) {
				const parentObjectValue = store.getZObjectByKeyPath( props.keyPath.split( '.' ).slice( 0, -1 ) );
				return getZKeyIsIdentity( parentObjectValue );
			}

			// If this is the identity key of a wikidata enum, disableEdit=true
			if ( key.value === Constants.Z_WIKIDATA_ENUM_IDENTITY ) {
				return true;
			}

			// If the key is "Object type"/Z1K1 and:
			// * the parent type is bound, or
			// * the parent key is Z2K2 and we are editing this object
			// return disableEdit=true
			return key.value === Constants.Z_OBJECT_TYPE && (
				parentExpectedType.value !== Constants.Z_OBJECT ||
				( parentKey.value === Constants.Z_PERSISTENTOBJECT_VALUE && !store.isCreateNewPage )
			);
		} );

		// UI display
		/**
		 * Whether the main block is preceded by the button and
		 * indentation column.
		 *
		 * @return {boolean}
		 */
		const hasPreColumn = computed( () => !props.skipIndent || hasToggle.value );

		/**
		 * Returns the id value for the key-value div
		 *
		 * @return {string}
		 */
		const idValue = computed( () => props.keyPath.replace( /\./g, '-' ) );

		// Helpers

		/**
		 * If the current object is the main object and we are creating a new page,
		 * set the page title to the appropriate create page title.
		 *
		 * @param {string} typeValue
		 */
		function setPageCreateTitle( typeValue ) {
			// If this is an edit existing object page, do nothing
			if ( !store.isCreateNewPage ) {
				return;
			}
			let pageTitle;
			switch ( typeValue ) {
				case Constants.Z_TYPE:
					pageTitle = i18n( 'wikilambda-special-create-type' ).text();
					break;
				case Constants.Z_FUNCTION:
					pageTitle = i18n( 'wikilambda-special-create-function' ).text();
					break;
				case Constants.Z_IMPLEMENTATION:
					pageTitle = i18n( 'wikilambda-special-create-implementation' ).text();
					break;
				case Constants.Z_TESTER:
					pageTitle = i18n( 'wikilambda-special-create-test' ).text();
					break;
				default:
					pageTitle = i18n( 'wikilambda-special-createobject' ).text();
			}
			document.getElementById( 'firstHeading' ).textContent = pageTitle;
		}

		// Type actions
		/**
		 * Handles the modification of the ZObject when the changed key-value
		 * is a type. To set a new type, the mutations must:
		 * * Clear all the old keys and values, and
		 * * Set a new blank content with the keys of the new type
		 *
		 * @param {Object|undefined} payload
		 * @param {Object|Array|string} payload.value new type to create
		 * @param {boolean|undefined} payload.literal force new type to be created as literal
		 */
		function setType( payload ) {
			// If setType with no payload, clear the current object of
			// all its keys, except the Object type/Z1K1, and exit
			if ( !payload ) {
				store.clearTypeByKeyPath( { keyPath: props.keyPath.split( '.' ) } );
				return;
			}

			// If payload.value is reference or string, set expanded to false;
			// else, set expanded to true by default.
			expanded.value = (
				( payload.value !== Constants.Z_REFERENCE ) &&
				( payload.value !== Constants.Z_STRING )
			);

			// Force literal object if it's root object or request comes from mode selector
			const literal = payload.literal || key.value === Constants.Z_PERSISTENTOBJECT_VALUE;

			// Set the type
			store.changeTypeByKeyPath( {
				keyPath: props.keyPath.split( '.' ),
				type: payload.value,
				literal
			} );

			// If we are setting the type of a Z1K1 key, we are changing the mode,
			// which means that we need to propagate and change the parent type
			// to clear the keys: emit a setType event with no payload
			if ( key.value === Constants.Z_OBJECT_TYPE ) {
				emit( 'set-type' );
			}

			// If we change the type of a Z7K1 key, is as if we cleared its
			// value, so we need to clear the function call arguments.
			if ( key.value === Constants.Z_FUNCTION_CALL_FUNCTION ) {
				store.setFunctionCallArguments( {
					keyPath: props.keyPath.split( '.' ).slice( 0, -1 ) // keyPath of the Z7
				} );
			}

			// If we are setting Z2K2 type
			if ( key.value === Constants.Z_PERSISTENTOBJECT_VALUE ) {
				// check if we need to reset the page title
				setPageCreateTitle( payload.value );
				// if we set it to Function/Z8, redirect to function editor
				if ( payload.value === Constants.Z_FUNCTION ) {
					store.navigate( { to: Constants.VIEWS.FUNCTION_EDITOR } );
					return;
				}
			}

			// Else remain in default view page and set to dirty
			setDirtyKeyPath( props.keyPath );
		}

		// Value actions
		/**
		 * Handles the modification of the ZObject when the changed key-value
		 * is a value.
		 *
		 * @param {Object} payload
		 * @param {Array} payload.keyPath path to the key to change
		 * @param {Object|Array|string} payload.value new value to set
		 * @param {Function} payload.callback optional callback to execute after mutation
		 */
		function setValue( payload ) {
			// If value is null or undefined, do nothing
			if ( payload.value === null || payload.value === undefined ) {
				return;
			}

			// If we are in Abstract Content and we selected the arg ref Z825K1 for a
			// key that expects Wikidata item, we set it to Z6821(Z18(Z825K1)) instead.
			if ( store.isAbstractContent() && payload.value === Constants.Z_ABSTRACT_RENDER_FUNCTION_QID ) {
				// Find the right keyPath to modify depending on the expanded status
				const argRefCollapsed = ( type.value === Constants.Z_ARGUMENT_REFERENCE &&
					expectedType.value === Constants.Z_WIKIDATA_ITEM );

				const argRefExpanded = ( key.value === Constants.Z_ARGUMENT_REFERENCE_KEY &&
					parentExpectedType.value === Constants.Z_WIKIDATA_ITEM );

				const keyPath = argRefCollapsed ? props.keyPath.split( '.' ) :
					argRefExpanded ? props.keyPath.split( '.' ).slice( 0, -1 ) : false;

				// If set, bypass the normal setter and exit. Else continue to normal behavior.
				if ( keyPath ) {
					store.setValueByKeyPath( {
						keyPath,
						value: store.createObjectByType( { type: Constants.Z_WIKIDATA_ITEM } )
					} );
					return;
				}
			}

			// FULLY DELEGATE TO PARENT:
			// If we are setting a Z1K1 as typed list, this means we need to
			// render the typed list component: we delegate change to the parent;
			if (
				( key.value === Constants.Z_FUNCTION_CALL_FUNCTION ) &&
				( parentKey.value === Constants.Z_OBJECT_TYPE ) &&
				( payload.value === Constants.Z_TYPED_LIST )
			) {
				emit( 'set-value', { keyPath: [], value: [ Constants.Z_OBJECT ] } );
				return;
			}

			// If the key Z3K4/identity.Z40K1 changed, fully delegate the mutation to the parent
			if (
				( key.value === Constants.Z_BOOLEAN_IDENTITY ) &&
				( parentKey.value === Constants.Z_KEY_IS_IDENTITY )
			) {
				payload.keyPath = [ key.value, ...payload.keyPath ];
				emit( 'set-value', payload );
				return;
			}

			// If we are changing an implementation type, we need to clear
			// the unselected key and fill the other one with a blank value.
			if ( type.value === Constants.Z_IMPLEMENTATION ) {
				store.setImplementationContentType( {
					keyPath: [ ...props.keyPath.split( '.' ), ...payload.keyPath ]
				} );
				// Exit early; there's no value to set
				return;
			}

			// PROCEED WITH THE MUTATION:
			store.setValueByKeyPath( {
				keyPath: [ ...props.keyPath.split( '.' ), ...payload.keyPath ],
				value: payload.value
			} );

			// EXTRA ACTIONS, ADITIONAL TO MAIN MUTATION:
			// If the value of Z1K1 has changed, tell parent key to change its type
			if ( key.value === Constants.Z_OBJECT_TYPE ) {
				if ( Array.isArray( payload.value ) ) {
					// When selecting Z1K1=(Z7K1=Z881), Z7K1 emits set-value to its parent Z1K1.
					// If Z1K1 receives a payload.value of a new array, it should again delegate
					// to its parent to set the list value:
					emit( 'set-value', payload );
				} else {
					// Every other change on Z1K1 must be handled by the setType of the parent:
					emit( 'set-type', payload );
				}
			}

			// If the key Z3K4/identity changed, ask the parent to set Z3K1/type
			if (
				( key.value === Constants.Z_KEY_IS_IDENTITY ) &&
				( payload.value === Constants.Z_BOOLEAN_TRUE )
			) {
				store.setKeyType( {
					keyPath: props.keyPath.split( '.' ),
					value: store.getCurrentZObjectId
				} );
			}

			// If a Wikidata enum reference type (Z6884K1) has changed, we update the type
			// of its associated keys/references (Z6884K2) to match the new enum type.
			if ( key.value === Constants.Z_WIKIDATA_ENUM_TYPE ) {
				// Keypath of the parent, without the last key:
				store.setWikidataEnumReferenceType( {
					keyPath: props.keyPath.split( '.' ).slice( 0, -1 ),
					value: payload.value
				} );
			}

			// If the value of Z7K1 has changed, we need to remove old arguments and set
			// new ones, for which we propagate event so the parent node can handle it
			if ( key.value === Constants.Z_FUNCTION_CALL_FUNCTION ) {
				store.setFunctionCallArguments( {
					keyPath: props.keyPath.split( '.' ).slice( 0, -1 ), // keyPath of the Z7
					functionZid: payload.value
				} );
			}

			// If the type of a typed list has changed, propagate event to the parent
			// ZTypedList component so that it marks items as potentially invalid
			if ( isKeyTypedListType( key.value ) ) {
				emit( 'typed-list-type-changed', payload );
			}

			// All mutations have been done, if payload has a callback, execute it.
			// This is mostly used by the string renderer component, to stop the
			// user from taking definite actions (e.g. Publish) before the renderer
			// value has been parsed and stored in the object.
			if ( payload.callback ) {
				payload.callback();
			}

			setDirtyKeyPath( props.keyPath );
		}

		// Function call argument actions
		/**
		 * Handles the modification of the ZObject when the changed key-value
		 * is a function call and the user adds a new argument.
		 */
		function addArgument() {
			store.addLocalArgumentToFunctionCall( { keyPath: props.keyPath.split( '.' ) } );
			setDirtyKeyPath( props.keyPath );
		}

		/**
		 * Handles the modification of the ZObject when the changed key-value
		 * is a function call and the user deletes an argument.
		 *
		 * @param {string} argKey
		 */
		function deleteArgument( argKey ) {
			store.deleteLocalArgumentFromFunctionCall( {
				keyPath: props.keyPath.split( '.' ),
				key: argKey
			} );
			setDirtyKeyPath( props.keyPath );
		}

		// Watch
		/**
		 * Auto-expand when field errors appear (only the first time)
		 *
		 * @param {boolean} newValue
		 */
		watch( hasFieldErrors, ( newValue ) => {
			if ( newValue && !hasBeenAutoExpanded.value ) {
				expanded.value = true;
				hasBeenAutoExpanded.value = true;
			}
		} );

		/**
		 * Auto-expand when child errors appear (only the first time)
		 *
		 * @param {boolean} newValue
		 */
		watch( hasChildErrors, ( newValue ) => {
			if ( newValue && !hasBeenAutoExpanded.value ) {
				expanded.value = true;
				hasBeenAutoExpanded.value = true;
			}
		} );

		// Lifecycle
		onBeforeUnmount( () => {
			store.clearErrors( props.keyPath, true );
		} );

		// Return all properties and methods for the template
		return {
			addArgument,
			addListItem,
			deleteArgument,
			deleteListItem,
			disableEdit,
			expectedType,
			hasPreColumn,
			hasToggle,
			idValue,
			isExpanded,
			keyLabel,
			listItemCount,
			moveAfter,
			moveBefore,
			parentExpectedType,
			renderComponent,
			setExpanded,
			setType,
			setValue,
			showKeyLabel,
			type
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-object-key-value {
	width: 100%;
}
</style>
