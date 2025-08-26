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
					@delete-list-item="deleteListItem"
					@move-before="moveBefore"
					@move-after="moveAfter"
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
					@set-expanded="setExpanded"
					@add-list-item="addListItem"
					@expand="setExpanded"
				></component>
			</template>
		</wl-key-value-block>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const typeMixin = require( '../../mixins/typeMixin.js' );
const zobjectMixin = require( '../../mixins/zobjectMixin.js' );
const LabelData = require( '../../store/classes/LabelData.js' );
const { canonicalToHybrid } = require( '../../utils/schemata.js' );

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
		'wl-wikidata-lexeme-sense': WikidataLexemeSense
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
	data: function () {
		return {
			/**
			 * Expanded is a property of the key-value and it
			 * passes down only into its direct child. Every
			 * ZObjectKeyValue component sets its data property
			 * 'expanded' independently.
			 */
			expanded: this.defaultExpanded
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'isIdentityKey',
		'isCreateNewPage',
		'hasRenderer',
		'hasParser',
		'getCurrentZObjectId',
		'getLabelData',
		'getExpectedTypeOfKey',
		'getZObjectByKeyPath',
		'isWikidataEnum',
		'isInMultilingualStringList'
	] ), {

		// ==============
		// Key properties
		// ==============

		/**
		 * Returns whether to show the key label or not
		 *
		 * @return {boolean}
		 */
		showKeyLabel: function () {
			if ( this.skipKey ) {
				return false;
			}
			if ( this.isKeyTypedListItem( this.key ) ) {
				return this.edit || this.expanded;
			}
			return true;
		},
		/**
		 * Returns the label data object of the given key.
		 * * If the key is a numeral, return hardcoded typed list labels
		 * * If the key is not available, return the key id
		 *
		 * @return {LabelData}
		 */
		keyLabel: function () {
			// since the FE represents typed lists in canonical form, we need to hardcode typed list keys
			if ( this.isKeyTypedListItem( this.key ) ) {
				// For multilingual strings, use language name as label or "No language selected" for blanks
				if ( this.isInMultilingualStringList( this.keyPath ) ) {
					const langZid = this.getZMonolingualLangValue( this.objectValue );
					if ( langZid ) {
						return this.getLabelData( langZid );
					} else {
						return LabelData.fromString( this.$i18n( 'wikilambda-editor-monolingual-string-nolanguage' ).text() );
					}
				}
				return LabelData.fromString( this.$i18n( 'wikilambda-list-item-label', this.key ).text() );
			}
			if ( this.isKeyTypedListType( this.key ) ) {
				return LabelData.fromString( this.$i18n( 'wikilambda-list-items-type-label' ).text() );
			}
			return this.getLabelData( this.key );
		},

		// ===============
		// Type properties
		// ===============

		/**
		 * Returns the type of the object represented in this node,
		 * in string format, and without arguments if it's a function call.
		 * E.g. "Z9", "Z7", "Z881"
		 *
		 * @return {string}
		 */
		type: function () {
			return this.typeToString( this.getZObjectType( this.objectValue ), true );
		},

		/**
		 * Returns the expected (or bound) type for the value of
		 * the key-value pair represented in this component.
		 *
		 * @return {string|Object|undefined}
		 */
		expectedType: function () {
			// If key is a numerical index, this is the key of a typed list type/item
			// 1. If index is zero, it should always expect a Z4/Type
			if ( this.isKeyTypedListType( this.key ) ) {
				return Constants.Z_TYPE;
			}
			// 2. If index is > zero, the type of each item must be whatever
			// the type of the list is, or Z1 if parentListItemType is undefined
			if ( this.isKeyTypedListItem( this.key ) ) {
				return this.parentListItemType || Constants.Z_OBJECT;
			}
			// If ZnKn shaped key, get expected from the key definition
			return this.key ? this.getExpectedTypeOfKey( this.key ) : undefined;
		},

		/**
		 * Returns the expected type of the parent key. If the key is of
		 * a typed list item, it returns the list item expected type.
		 *
		 * @return {string|Object|undefined}
		 */
		parentExpectedType: function () {
			// If parent key is a numerical index, it's the key of a typed list type/item
			// 1. If index is zero, it should always expect a Z4/Type in any mode
			if ( this.isKeyTypedListType( this.parentKey ) ) {
				return Constants.Z_TYPE;
			}
			// 2. If item index (not zero), it should expect the typed list type
			if ( this.isKeyTypedListItem( this.parentKey ) ) {
				return this.parentListItemType || Constants.Z_OBJECT;
			}
			// If ZnKn shaped key, get expected from the key definition
			return this.parentKey ? this.getExpectedTypeOfKey( this.parentKey ) : undefined;
		},

		// ===================================
		// Configuration and layout properties
		// ===================================

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
		layoutConfig: function () {
			// Intial layout config, by type or blank:
			const layout = Object.assign( {
				hasBuiltin: false,
				component: null,
				allowExpansion: true
			}, Constants.BUILTIN_TYPE_CONFIG[ this.type ] || {} );

			// Set layout config for terminal key of Argument Reference
			// If type is string, but key is argument reference key (Z18K1), we render
			// the value using the argument reference component, but configure it as terminal
			if ( this.key === Constants.Z_ARGUMENT_REFERENCE_KEY ) {
				return Object.assign( {},
					Constants.BUILTIN_TYPE_CONFIG[ Constants.Z_ARGUMENT_REFERENCE ],
					{ allowExpansion: false }
				);
			}

			if ( this.isWikidataEnum( this.type ) ) {
				return {
					hasBuiltin: true,
					component: 'wl-wikidata-enum',
					allowExpansion: false
				};
			}

			// Set layout config for Wikidata fetch functions:
			// If type is function call, but the call is to a fetch Wikidata entity
			// we use the layout config of the the Wikidata component instead of the Function Call one
			if ( this.isWikidataFetch( this.objectValue ) ) {
				const fetchFunctionZid = this.getZFunctionCallFunctionId( this.objectValue );
				const wdType = Constants.WIKIDATA_SIMPLIFIED_TYPES[ fetchFunctionZid ];
				return Constants.BUILTIN_TYPE_CONFIG[ wdType ];
			}

			// Set layout config for types with renderer:
			// If there's no built-in component yet, check if the type has a string renderer.
			// The renderer component will allow expansion but will handle expansion internally.
			if ( !layout.component && this.hasRenderer( this.type ) && this.hasParser( this.type ) ) {
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
		},
		/**
		 * Returns the name of the child component to render, depending on:
		 * * the layoutConfig, which depends on the type
		 * * the current state of the flag isExpanded
		 *
		 * @return {string}
		 */
		renderComponent: function () {
			// Generic component configuration.
			// Render the builtin component, when:
			// * there's a layoutConfig for this type, and
			// * it has a builtin component, and
			// * it cannot be expanded, or
			//   it is currently collapsed, or
			//   it is expanded, but it's handled internally by the builtin component
			if (
				this.layoutConfig &&
				this.layoutConfig.hasBuiltin &&
				( !this.layoutConfig.allowExpansion || !this.isExpanded || this.layoutConfig.expandToSelf )
			) {
				return this.layoutConfig.component;
			}

			// If there's no builtin component or renderer, always show expanded mode
			return 'wl-z-object-key-value-set';
		},
		/**
		 * Whether to show the expansion toggle icon (chevron) or a bullet icon.
		 *
		 * @return {boolean}
		 */
		hasToggle: function () {
			return this.layoutConfig.hasBuiltin && this.layoutConfig.allowExpansion;
		},
		/**
		 * Whether the component is expanded or collapsed.
		 * * If the component cannot be collapsed (layoutConfig.hasBuiltin
		 *   is false), always return true.
		 * * If the component cannot be expanded (layoutConfig.allowExpansion
		 *   is false), always return false.
		 * * Else, fall back to the local variable that captures the expanded state
		 *
		 * @return {boolean}
		 */
		isExpanded: function () {
			// If there's no builtin, always expanded:
			if ( !this.layoutConfig.hasBuiltin ) {
				return true;
			}
			// If expanded is disallowed, always collapsed:
			if ( !this.layoutConfig.allowExpansion ) {
				return false;
			}
			// Else, expanded state as stored locally:
			return this.expanded;
		},
		/**
		 * Whether the main block is preceded by the button and
		 * indentation column.
		 *
		 * @return {boolean}
		 */
		hasPreColumn: function () {
			return !this.skipIndent || this.hasToggle;
		},
		/**
		 * Returns whether we want to disable the edit mode for a given key-value.
		 * Note that this is not the same thing as bounding the type, or disabling
		 * expanded mode. This does not coerce the component to render in view mode,
		 * just disables the selectability of the component.
		 *
		 * @return {boolean}
		 */
		disableEdit: function () {
			// If parentDisableEdit, all children must disableEdit=true
			if ( this.parentDisableEdit ) {
				return true;
			}

			// If this is the identity key of the root object, disableEdit=true
			// E.g. Z4K1
			if (
				this.isIdentityKey( this.key ) &&
				( this.parentKey === Constants.Z_PERSISTENTOBJECT_VALUE )
			) {
				return true;
			}

			// If the key is that of a typed list type (zero)
			if ( this.isKeyTypedListType( this.key ) ) {
				// 1. If the parent key is Z6884K2 (Wikidata enum references), disableEdit=true
				//    because the type of the keys is bound to the type of the enum (Z6884K1).
				if ( this.parentKey === Constants.Z_WIKIDATA_ENUM_REFERENCES ) {
					return true;
				}

				// 2. If parent expected type is Z1: disableEdit=false
				// 3. If parent expected type is Z881(Z1): disableEdit=false
				// 4. If parent expected type is Z881(Zn): disableEdit=true
				const parentUnbound = this.parentExpectedType === Constants.Z_OBJECT;
				const parentUnboundList =
					this.parentExpectedType[ Constants.Z_TYPED_LIST_TYPE ] === Constants.Z_OBJECT;

				return !( parentUnbound || parentUnboundList );
			}

			// If the key is "Key type"/Z3K1 and the sister key "Is identity"/Z3K4 is true, disableEdit=true
			if ( this.key === Constants.Z_KEY_TYPE ) {
				const parentObjectValue = this.getZObjectByKeyPath( this.keyPath.split( '.' ).slice( 0, -1 ) );
				return this.getZKeyIsIdentity( parentObjectValue );
			}

			// If this is the identity key of a wikidata enum, disableEdit=true
			if ( this.key === Constants.Z_WIKIDATA_ENUM_IDENTITY ) {
				return true;
			}

			// If the key is "Object type"/Z1K1 and:
			// * the parent type is bound, or
			// * the parent key is Z2K2 and we are editing this object
			// return disableEdit=true
			return ( ( this.key === Constants.Z_OBJECT_TYPE ) && (
				( this.parentExpectedType !== Constants.Z_OBJECT ) ||
				( ( this.parentKey === Constants.Z_PERSISTENTOBJECT_VALUE ) && !this.isCreateNewPage )
			) );
		},

		/**
		 * Returns a unique id for the DOM element.
		 *
		 * @return {string}
		 */
		idValue: function () {
			return this.keyPath.replace( /\./g, '-' );
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'addLocalArgumentToFunctionCall',
		'changeTypeByKeyPath',
		'clearTypeByKeyPath',
		'createObjectByType',
		'deleteListItemsByKeyPath',
		'deleteLocalArgumentFromFunctionCall',
		'moveListItemByKeyPath',
		'navigate',
		'pushItemsByKeyPath',
		'setDirty',
		'setFunctionCallArguments',
		'setImplementationContentType',
		'setKeyType',
		'setValueByKeyPath',
		'setWikidataEnumReferenceType'
	] ), {

		// =============
		// Value updates
		// =============

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
		setType: function ( payload ) {
			// If setType with no payload, clear the current object of
			// all its keys, except the Object type/Z1K1, and exit
			if ( !payload ) {
				this.clearTypeByKeyPath( { keyPath: this.keyPath.split( '.' ) } );
				return;
			}

			// If payload.value is reference or string, set expanded to false;
			// else, set expanded to true by default.
			this.expanded = (
				( payload.value !== Constants.Z_REFERENCE ) &&
				( payload.value !== Constants.Z_STRING )
			);

			// Force literal object if it's root object or request comes from mode selector
			const literal = payload.literal || this.key === Constants.Z_PERSISTENTOBJECT_VALUE;

			// Set the type
			this.changeTypeByKeyPath( {
				keyPath: this.keyPath.split( '.' ),
				type: payload.value,
				literal
			} );

			// If we are setting the type of a Z1K1 key, we are changing the mode,
			// which means that we need to propagate and change the parent type
			// to clear the keys: emit a setType event with no payload
			if ( this.key === Constants.Z_OBJECT_TYPE ) {
				this.$emit( 'set-type' );
			}

			// If we change the type of a Z7K1 key, is as if we cleared its
			// value, so we need to clear the function call arguments.
			if ( this.key === Constants.Z_FUNCTION_CALL_FUNCTION ) {
				this.setFunctionCallArguments( {
					keyPath: this.keyPath.split( '.' ).slice( 0, -1 ) // keyPath of the Z7
				} );
			}

			// If we are setting Z2K2 type
			if ( this.key === Constants.Z_PERSISTENTOBJECT_VALUE ) {
				// check if we need to reset the page title
				this.setPageCreateTitle( payload.value );
				// if we set it to Function/Z8, redirect to function editor
				if ( payload.value === Constants.Z_FUNCTION ) {
					this.navigate( { to: Constants.VIEWS.FUNCTION_EDITOR } );
					return;
				}
			}

			// Else remain in default view page and set to dirty
			this.setDirtyIfMainObject();
		},
		/**
		 * Handles the modification of the state value for the key-value
		 * represented in this component. Depending on the whether this
		 * change involves further changes, it will emit the event further
		 * up.
		 *
		 * @param {Object} payload
		 * @param {Object} payload.keyPath sequence of keys till the value to edit
		 * @param {Object | Array | string} payload.value new value
		 */
		setValue: function ( payload ) {
			// If value is null or undefined, do nothing
			if ( payload.value === null || payload.value === undefined ) {
				return;
			}

			// FULLY DELEGATE TO PARENT:
			// If we are setting a Z1K1 as typed list, this means we need to
			// render the typed list component: we delegate change to the parent;
			if (
				( this.key === Constants.Z_FUNCTION_CALL_FUNCTION ) &&
				( this.parentKey === Constants.Z_OBJECT_TYPE ) &&
				( payload.value === Constants.Z_TYPED_LIST )
			) {
				this.$emit( 'set-value', { keyPath: [], value: [ Constants.Z_OBJECT ] } );
				return;
			}

			// If the key Z3K4/identity.Z40K1 changed, fully delegate the mutation to the parent
			if (
				( this.key === Constants.Z_BOOLEAN_IDENTITY ) &&
				( this.parentKey === Constants.Z_KEY_IS_IDENTITY )
			) {
				payload.keyPath = [ this.key, ...payload.keyPath ];
				this.$emit( 'set-value', payload );
				return;
			}

			// If we are changing an implementation type, we need to clear
			// the unselected key and fill the other one with a blank value.
			if ( this.type === Constants.Z_IMPLEMENTATION ) {
				this.setImplementationContentType( {
					keyPath: [ ...this.keyPath.split( '.' ), ...payload.keyPath ]
				} );
				// Exit early; there's no value to set
				return;
			}

			// PROCEED WITH THE MUTATION:
			this.setValueByKeyPath( {
				keyPath: [ ...this.keyPath.split( '.' ), ...payload.keyPath ],
				value: payload.value
			} );

			// EXTRA ACTIONS, ADITIONAL TO MAIN MUTATION:
			// If the value of Z1K1 has changed, tell parent key to change its type
			if ( this.key === Constants.Z_OBJECT_TYPE ) {
				if ( Array.isArray( payload.value ) ) {
					// When selecting Z1K1=(Z7K1=Z881), Z7K1 emits set-value to its parent Z1K1.
					// If Z1K1 receives a payload.value of a new array, it should again delegate
					// to its parent to set the list value:
					this.$emit( 'set-value', payload );
				} else {
					// Every other change on Z1K1 must be handled by the setType of the parent:
					this.$emit( 'set-type', payload );
				}
			}

			// If the key Z3K4/identity changed, ask the parent to set Z3K1/type
			if (
				( this.key === Constants.Z_KEY_IS_IDENTITY ) &&
				( payload.value === Constants.Z_BOOLEAN_TRUE )
			) {
				this.setKeyType( {
					keyPath: this.keyPath.split( '.' ),
					value: this.getCurrentZObjectId
				} );
			}

			// If a Wikidata enum reference type (Z6884K1) has changed, we update the type
			// of its associated keys/references (Z6884K2) to match the new enum type.
			if ( this.key === Constants.Z_WIKIDATA_ENUM_TYPE ) {
				// Keypath of the parent, without the last key:
				this.setWikidataEnumReferenceType( {
					keyPath: this.keyPath.split( '.' ).slice( 0, -1 ),
					value: payload.value
				} );
			}

			// If the value of Z7K1 has changed, we need to remove old arguments and set
			// new ones, for which we propagate event so the parent node can handle it
			if ( this.key === Constants.Z_FUNCTION_CALL_FUNCTION ) {
				this.setFunctionCallArguments( {
					keyPath: this.keyPath.split( '.' ).slice( 0, -1 ), // keyPath of the Z7
					functionZid: payload.value
				} );
			}

			// If the type of a typed list has changed, propagate event to the parent
			// ZTypedList component so that it marks items as potentially invalid
			if ( this.isKeyTypedListType( this.key ) ) {
				this.$emit( 'typed-list-type-changed', payload );
			}

			// All mutations have been done, if payload has a callback, execute it.
			// This is mostly used by the string renderer component, to stop the
			// user from taking definite actions (e.g. Publish) before the renderer
			// value has been parsed and stored in the object.
			if ( payload.callback ) {
				payload.callback();
			}

			// Mutation done, set object as dirty
			this.setDirtyIfMainObject();
		},
		/**
		 * Adds an item of the given value to the list
		 *
		 * @param {Object} payload
		 * @param {string} payload.type
		 * @param {string} payload.lang
		 */
		addListItem: function ( payload ) {
			const value = canonicalToHybrid( this.createObjectByType( payload ) );
			this.pushItemsByKeyPath( {
				keyPath: this.keyPath.split( '.' ),
				values: [ value ]
			} );
			this.setDirtyIfMainObject();
		},
		/**
		 * Deletes this item from the list.
		 * TODO (T331132): Create a 'revert delete' workflow.
		 */
		deleteListItem: function () {
			const listKeyPath = this.keyPath.split( '.' ).slice( 0, -1 );
			const lastItem = this.keyPath.split( '.' ).slice( -1 );
			this.deleteListItemsByKeyPath( {
				keyPath: listKeyPath,
				indexes: lastItem
			} );
			this.setDirtyIfMainObject();
		},
		/**
		 * Moves this item one position before in the list.
		 */
		moveBefore: function () {
			this.moveListItemByKeyPath( {
				keyPath: this.keyPath.split( '.' ),
				offset: -1
			} );
			this.setDirtyIfMainObject();
		},
		/**
		 * Moves this item one position after in the list.
		 */
		moveAfter: function () {
			this.moveListItemByKeyPath( {
				keyPath: this.keyPath.split( '.' ),
				offset: 1
			} );
			this.setDirtyIfMainObject();
		},
		/**
		 * Adds a new local argument to the function call.
		 */
		addArgument: function () {
			this.addLocalArgumentToFunctionCall( {
				keyPath: this.keyPath.split( '.' )
			} );
			this.setDirtyIfMainObject();
		},
		/**
		 * Deletes a local argument from the function call.
		 */
		deleteArgument: function () {
			this.deleteLocalArgumentFromFunctionCall( {
				keyPath: this.keyPath.split( '.' )
			} );
			this.setDirtyIfMainObject();
		},
		/**
		 * Sets object isDirty flag as true only if the changes
		 * are made in the main page object.
		 */
		setDirtyIfMainObject: function () {
			if ( this.keyPath.split( '.' )[ 0 ] === Constants.STORED_OBJECTS.MAIN ) {
				this.setDirty();
			}
		},

		// ================================
		// Configuration and layout methods
		// ================================

		/**
		 * Sets the page title to a more specific string for types,
		 * functions, implementations and tests.
		 *
		 * @param {string} type
		 */
		setPageCreateTitle: function ( type ) {
			// If this is an edit existing object page, do nothing
			if ( !this.isCreateNewPage ) {
				return;
			}
			let pageTitle;
			switch ( type ) {
				case Constants.Z_TYPE:
					pageTitle = this.$i18n( 'wikilambda-special-create-type' ).text();
					break;
				case Constants.Z_FUNCTION:
					pageTitle = this.$i18n( 'wikilambda-special-create-function' ).text();
					break;
				case Constants.Z_IMPLEMENTATION:
					pageTitle = this.$i18n( 'wikilambda-special-create-implementation' ).text();
					break;
				case Constants.Z_TESTER:
					pageTitle = this.$i18n( 'wikilambda-special-create-test' ).text();
					break;
				default:
					pageTitle = this.$i18n( 'wikilambda-special-createobject' ).text();
			}
			document.getElementById( 'firstHeading' ).textContent = pageTitle;
		},
		/**
		 * Sets the expanded flag to a given value. If the type
		 * cannot be expanded (because it's terminal), it persistently
		 * sets the expanded flag to false.
		 *
		 * @param {boolean} value
		 */
		setExpanded: function ( value ) {
			this.expanded = value;
		}

	} )
} );
</script>
