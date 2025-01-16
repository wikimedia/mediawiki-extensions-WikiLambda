<!--
	WikiLambda Vue component for rendering a ZObjectKeyValue.
	This component handles all the complex logic behind figuring out
	what key-values can be editted, what are their bound types (if any)
	and what kind of view will be rendered, expanded or simple.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-object-key-value" data-testid="z-object-key-value">
		<wl-key-value-block
			field-overrides
			:has-pre-column="hasPreColumn"
			:has-expanded-mode="hasExpandedMode"
			:has-expanded-border="expanded"
			:expanded="expanded"
			:edit="edit"
			:disable-edit="disableEdit"
			:expanded-disabled="edit && disableEdit"
			:depth="depth"
			:no-indent="!hasPreColumn"
			@toggle-expand="setExpanded( !expanded )">
			<!-- Main content: either only one row with value, or top row with key and then value -->
			<!-- Key and Mode: render only when key is shown -->
			<template v-if="showKeyLabel" #key>
				<wl-localized-label :label-data="keyLabel"></wl-localized-label>
				<!-- Mode: never rendered in view mode -->
				<wl-mode-selector
					v-if="edit"
					:row-id="rowId"
					:disabled="disableEdit"
					:parent-expected-type="expectedType"
					@set-type="setType"
					@delete-list-item="deleteListItem"
					@move-before="moveBefore"
					@move-after="moveAfter"
				></wl-mode-selector>
			</template>
			<!-- Value: will always be rendered -->
			<template #value>
				<component
					:is="zobjectComponent"
					:edit="edit"
					:disabled="disableEdit"
					:expanded="expanded"
					:depth="depth"
					:row-id="rowId"
					:type="type"
					:expected-type="expectedType"
					:parent-expected-type="parentExpectedType"
					:parent-id="parentRowId"
					:parent-disable-edit="disableEdit"
					@set-value="setValue"
					@set-type="setType"
					@add-list-item="addListItem"
					@change-event="changeEvent"
					@expand="setExpanded"
				></component>
			</template>
		</wl-key-value-block>
	</div>
</template>

<script>
const { CdxButton, CdxIcon, CdxMessage } = require( '@wikimedia/codex' );
const { defineComponent } = require( 'vue' );
const Constants = require( '../../Constants.js' ),
	ExpandedToggle = require( '../base/ExpandedToggle.vue' ),
	LocalizedLabel = require( '../base/LocalizedLabel.vue' ),
	ModeSelector = require( '../base/ModeSelector.vue' ),
	ZArgumentReference = require( './ZArgumentReference.vue' ),
	ZMonolingualString = require( './ZMonolingualString.vue' ),
	ZObjectKeyValueSet = require( './ZObjectKeyValueSet.vue' ),
	ZObjectStringRenderer = require( './ZObjectStringRenderer.vue' ),
	ZString = require( './ZString.vue' ),
	ZCode = require( './ZCode.vue' ),
	ZReference = require( './ZReference.vue' ),
	ZBoolean = require( './ZBoolean.vue' ),
	ZFunctionCall = require( './ZFunctionCall.vue' ),
	ZImplementation = require( './ZImplementation.vue' ),
	KeyValueBlock = require( '../base/KeyValueBlock.vue' ),
	ZTester = require( './ZTester.vue' ),
	ZTypedList = require( './ZTypedList.vue' ),
	WikidataItem = require( './wikidata/Item.vue' ),
	WikidataLexeme = require( './wikidata/Lexeme.vue' ),
	WikidataLexemeForm = require( './wikidata/LexemeForm.vue' ),
	WikidataProperty = require( './wikidata/Property.vue' ),
	LabelData = require( '../../store/classes/LabelData.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	errorUtils = require( '../../mixins/errorUtils.js' ),
	{ mapActions, mapGetters } = require( 'vuex' );

module.exports = exports = defineComponent( {
	name: 'wl-z-object-key-value',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'cdx-message': CdxMessage,
		'wl-expanded-toggle': ExpandedToggle,
		'wl-key-value-block': KeyValueBlock,
		'wl-localized-label': LocalizedLabel,
		'wl-mode-selector': ModeSelector,
		'wl-wikidata-item': WikidataItem,
		'wl-wikidata-lexeme': WikidataLexeme,
		'wl-wikidata-lexeme-form': WikidataLexemeForm,
		'wl-wikidata-property': WikidataProperty,
		'wl-z-argument-reference': ZArgumentReference,
		'wl-z-boolean': ZBoolean,
		'wl-z-code': ZCode,
		'wl-z-function-call': ZFunctionCall,
		'wl-z-implementation': ZImplementation,
		'wl-z-monolingual-string': ZMonolingualString,
		'wl-z-object-key-value-set': ZObjectKeyValueSet,
		'wl-z-object-string-renderer': ZObjectStringRenderer,
		'wl-z-reference': ZReference,
		'wl-z-string': ZString,
		'wl-z-tester': ZTester,
		'wl-z-typed-list': ZTypedList
	},
	mixins: [ typeUtils, errorUtils ],
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		},
		listItemType: {
			type: [ String, Object ],
			default: null
		},
		skipKey: {
			type: Boolean,
			required: false,
			default: false
		},
		skipIndent: {
			type: Boolean,
			required: false,
			default: false
		},
		errorId: {
			type: Number,
			required: false,
			default: null
		},
		parentDisableEdit: {
			type: Boolean,
			required: false
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
			expanded: false
		};
	},
	computed: Object.assign(
		mapGetters( [
			'createObjectByType',
			'getCurrentZObjectId',
			'getDepthByRowId',
			'getErrors',
			'getExpectedTypeOfKey',
			'getLabelData',
			'getParentRowId',
			'getTypedListItemType',
			'getZFunctionCallFunctionId',
			'getZKeyIsIdentity',
			'getZKeyTypeRowId',
			'getZObjectKeyByRowId',
			'getZObjectTypeByRowId',
			'getZObjectValueByRowId',
			'hasRenderer',
			'hasParser',
			'isCreateNewPage',
			'isIdentityKey',
			'isMainObject',
			'isWikidataLiteral',
			'isWikidataFetch',
			'isWikidataReference'
		] ),
		{
			/**
			 * Returns whether there are any errors
			 *
			 * @return {boolean}
			 */
			hasErrors: function () {
				return this.errors.length > 0;
			},

			/**
			 * Returns the errors associated to the given errorId
			 *
			 * @return {Array}
			 */
			errors: function () {
				return this.errorId ? this.getErrors( this.errorId ) : [];
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
				// If parentDisableEdit, all children must disableEdit
				if ( this.parentDisableEdit ) {
					return true;
				}

				// If this is the identity key of the root object, disableEdit
				if (
					this.isIdentityKey( this.key ) &&
					( this.parentKey === Constants.Z_PERSISTENTOBJECT_VALUE )
				) {
					return true;
				}

				// If the key is that of a typed list type (zero):
				// 1. If parent expected type is Z1: return false (allow edit)
				// 2. If parent expected type is Z881(Z1): return false (allow edit)
				// 3. If parent expected type is Z881(Zn): return true (disable edit)
				if ( this.isKeyTypedListType( this.key ) ) {
					return !(
						( this.parentExpectedType === Constants.Z_OBJECT ) ||
						( this.parentExpectedType[ Constants.Z_TYPED_LIST_TYPE ] === Constants.Z_OBJECT )
					);
				}

				// If the key is that of a key type/Z3K1 and:
				// * the key is identity/Z3K4 is true
				// return true (disable edit)
				if ( this.key === Constants.Z_KEY_TYPE ) {
					return this.getZKeyIsIdentity( this.parentRowId );
				}

				// If the key is that of Object type/Z1K1 and:
				// * the parent type is bound, or
				// * the parent key is Z2K2 and we are editing this object
				// return true (disable edit)
				return ( ( this.key === Constants.Z_OBJECT_TYPE ) && (
					( this.parentExpectedType !== Constants.Z_OBJECT ) ||
					( ( this.parentKey === Constants.Z_PERSISTENTOBJECT_VALUE ) && !this.isCreateNewPage )
				) );
			},

			/**
			 * Returns the key of the key-value pair of this component.
			 *
			 * @return {string}
			 */
			key: function () {
				return this.getZObjectKeyByRowId( this.rowId );
			},

			/**
			 * Returns the rowId of the parent of this key-value.
			 *
			 * @return {string}
			 */
			parentRowId: function () {
				return this.getParentRowId( this.rowId );
			},

			/**
			 * Returns the key of the parent of this key-value.
			 *
			 * @return {string}
			 */
			parentKey: function () {
				return this.getZObjectKeyByRowId( this.parentRowId );
			},

			/**
			 * Returns the value of the ZObject key-value pair represented
			 * in this component.
			 *
			 * @return {string}
			 */
			value: function () {
				return this.getZObjectValueByRowId( this.rowId );
			},

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
					return LabelData.fromString( this.$i18n( 'wikilambda-list-item-label', this.key ).text() );
				}
				if ( this.isKeyTypedListType( this.key ) ) {
					return LabelData.fromString( this.$i18n( 'wikilambda-list-items-type-label' ).text() );
				}
				return this.getLabelData( this.key );
			},

			/**
			 * Returns the depth of this key value to dynamically calculate
			 * the style of the nesting line. It returns 0 for the first level,
			 * and the following levels looping from [1..n], where n is the
			 * maximum number of levels (colors) set in our Constants.
			 *
			 * @return {number}
			 */
			depth: function () {
				const depth = this.getDepthByRowId( this.rowId );
				return ( ( depth - 1 ) % Constants.COLOR_NESTING_LEVELS ) + 1;
			},

			/**
			 * Returns the simple string type of the value of the the ZObject represented
			 * in this component. When it's not set, it's undefined.
			 *
			 * @return {string}
			 */
			type: function () {
				const noArgs = true;
				return this.typeToString( this.getZObjectTypeByRowId( this.rowId ), noArgs );
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
					const typedListRowId = this.getParentRowId( this.parentRowId );
					return this.getTypedListItemType( typedListRowId );
				}

				// If ZnKn shaped key, get expected from the key definition
				return this.getExpectedTypeOfKey( this.parentKey );
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
				// the type of the list is, or Z1 if listItemType is undefined
				if ( this.isKeyTypedListItem( this.key ) ) {
					return this.listItemType || Constants.Z_OBJECT;
				}

				return this.getExpectedTypeOfKey( this.key );
			},

			/**
			 * Returns the function call function Id if the object
			 * represented is a function call. Else returns undefined
			 *
			 * @return {string|undefined}
			 */
			functionCallFunctionId: function () {
				return this.type === Constants.Z_FUNCTION_CALL ?
					this.getZFunctionCallFunctionId( this.rowId ) :
					undefined;
			},

			/**
			 * Returns whether this key-value can be expanded into an expanded mode.
			 * This contains the logic for detecting terminal key-values and
			 * not enter infinite UX recursion.
			 *
			 * @return {boolean}
			 */
			hasExpandedMode: function () {
				// TERMINAL rule for string and reference
				if (
					( this.type === Constants.Z_REFERENCE ) ||
					( this.type === Constants.Z_STRING )
				) {
					return false;
				}

				// TERMINAL rules for implementation:
				// * no expansion allowed for implementation component
				// * no expansion allowed for target function reference
				// * no expansion allowed for code component
				//   * TODO (T296815): This is because the programming language selection
				//     is hardcoded and it must only set literal Z61 with very limited values.
				//     Once this is fixed, we will be able to edit this, and select reference
				//     to persisted languages. When that happens, we'll need to remove this
				//     restriction and allow for code component to be expanded.
				if (
					( this.type === Constants.Z_IMPLEMENTATION ) ||
					( this.key === Constants.Z_IMPLEMENTATION_CODE ) ||
					( this.key === Constants.Z_IMPLEMENTATION_FUNCTION )
				) {
					return false;
				}

				// TERMINAL rules for tester:
				// * no expansion allowed for tester component
				// * no expansion allowed for target function reference
				if (
					( this.type === Constants.Z_TESTER ) ||
					( this.key === Constants.Z_TESTER_FUNCTION )
				) {
					return false;
				}

				// If the type doesn't have any builting component, it must
				// be always shown in its expanded-mode representation--the set
				// of key values, so we won't show the expanded mode toggle.
				if (
					!Object.keys( Constants.BUILTIN_COMPONENTS ).includes( this.type ) &&
					!( this.hasRenderer( this.type ) && this.hasParser( this.type ) )
				) {
					return false;
				}

				// Fallback: anything else can be expanded
				return true;
			},

			/**
			 * Selects the component to render in place of the dynamic component.
			 * There are different strategies to choose the component. The first
			 * one, by key. If the key of this key-value is Z1K1, we will render
			 * the special ZObjectType component, which will handle type and mode
			 * selection. Else, the second strategy is by the type of the value.
			 * All custom built components should be listed here, in order from
			 * more to less complex.
			 *
			 * @return {string}
			 */
			zobjectComponent: function () {
				// BY KEY
				// Argument Reference Key/Z18K1 should be rendered with the same component
				// as the parent Argument Reference/Z18 object when this is expanded.
				if ( this.key === Constants.Z_ARGUMENT_REFERENCE_KEY ) {
					return 'wl-z-argument-reference';
				}

				// BY TYPE
				// The typed list is a component that should not be shown with
				// ZObjectKeyValueSet, so it handles the expanded mode internally.
				// ZTypedList component will be in charge of handling the type,
				// binding it if necessary (E.g. if the parentType is bound)
				// or allowing for its edition.
				if ( this.type === Constants.Z_TYPED_LIST ) {
					return 'wl-z-typed-list';
				}
				// Implementation doesn't have an expanded mode
				if ( this.type === Constants.Z_IMPLEMENTATION ) {
					return 'wl-z-implementation';
				}
				// Code doesn't have an expanded mode
				if ( this.type === Constants.Z_CODE ) {
					return 'wl-z-code';
				}
				// Tester doesn't have an expanded mode
				if ( this.type === Constants.Z_TESTER ) {
					return 'wl-z-tester';
				}
				// Wikidata Entities and References
				if ( (
					this.isWikidataFetch( this.rowId ) ||
					this.isWikidataReference( this.rowId ) ||
					this.isWikidataLiteral( this.rowId ) ) && !!this.wikidataComponent && !this.expanded ) {
					return this.wikidataComponent;
				}
				if ( ( this.type === Constants.Z_ARGUMENT_REFERENCE ) && !this.expanded ) {
					return 'wl-z-argument-reference';
				}
				if ( ( this.type === Constants.Z_FUNCTION_CALL ) && !this.expanded ) {
					return 'wl-z-function-call';
				}
				if ( ( this.type === Constants.Z_MONOLINGUALSTRING ) && !this.expanded ) {
					return 'wl-z-monolingual-string';
				}
				if ( ( this.type === Constants.Z_REFERENCE ) && !this.expanded ) {
					return 'wl-z-reference';
				}
				if ( ( this.type === Constants.Z_STRING ) && !this.expanded ) {
					return 'wl-z-string';
				}
				if ( ( this.type === Constants.Z_BOOLEAN ) && !this.expanded ) {
					return 'wl-z-boolean';
				}

				// If there's no built-in component, check if there's a string renderer.
				// TODO (T359669): Currently there are no type distinctions between renderers,
				// all are string renderers. Whenever we create more types of renderers,
				// we should consider checking the right type in here.
				if ( this.hasRenderer( this.type ) && this.hasParser( this.type ) ) {
					return 'wl-z-object-string-renderer';
				}

				// If there's no builtin component or renderer, always show expanded mode
				this.setExpanded( true );
				return 'wl-z-object-key-value-set';
			},

			/**
			 * Return the wikidata component
			 *
			 * @return {string|undefined}
			 */
			wikidataComponent: function () {
				const wikidataComponent = this.functionCallFunctionId ?
					Constants.WIKIDATA_BUILTIN_COMPONENTS[ this.functionCallFunctionId ] :
					Constants.WIKIDATA_BUILTIN_COMPONENTS[ this.type ];
				return wikidataComponent;
			},

			/**
			 * Whether the main block is preceded by the button and
			 * indentation column.
			 *
			 * @return {boolean}
			 */
			hasPreColumn: function () {
				return !this.skipIndent || this.hasExpandedMode;
			}
		}
	),
	methods: Object.assign( mapActions( [
		'changeType',
		'clearType',
		'setDirty',
		'setValueByRowIdAndPath',
		'setZFunctionCallArguments',
		'setZImplementationContentType',
		'removeItemFromTypedList',
		'moveItemInTypedList',
		'navigate'
	] ),
	{
		/**
		 * Adds an item of the given value to the list
		 *
		 * @param {Object} payload
		 */
		addListItem: function ( payload ) {
			this.changeType( {
				id: this.rowId,
				type: payload.value,
				append: true
			} );
		},
		/**
		 * Handles the modification of the ZObject when the changed key-value
		 * is a type. This needs to call the changeType action, which handles
		 * the clearing of the old content and the initialization of a new
		 * scaffolding object representing the new type.
		 *
		 * @param {Object} payload
		 * @param {Object} payload.keyPath sequence of keys till the value to edit
		 * @param {Object | Array | string} payload.value new value
		 */
		setType: function ( payload ) {
			// If setType with no payload, clear the current object of
			// all its keys, except the Object type/Z1K1, and exit
			if ( !payload ) {
				this.clearType( this.rowId );
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
			this.changeType( {
				id: this.rowId,
				type: payload.value,
				append: false,
				literal
			} );

			// If we are setting the type of a Z1K1 key, we are changing the mode,
			// which means that we need to propagate and change the parent type
			// to clear the keys: emit a setType event with no payload
			if ( this.key === Constants.Z_OBJECT_TYPE ) {
				this.$emit( 'set-type' );
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

			// If the type of a typed list changed, notify the parent to take action
			if ( this.isKeyTypedListType( this.parentKey ) || this.isKeyTypedListType( this.key ) ) {
				this.changeEvent( payload );
			}

			// If the key Z3K4/is identity changed, notify the parent to take action
			if ( ( this.key === Constants.Z_BOOLEAN_IDENTITY ) && ( this.parentKey === Constants.Z_KEY_IS_IDENTITY ) ) {
				// 1. If the change is done on expanded boolean, let the parent handle it completely
				payload.keyPath = [ this.key, ...payload.keyPath ];
				this.$emit( 'set-value', payload );
				return;
			}
			if ( ( this.key === Constants.Z_KEY_IS_IDENTITY ) && ( payload.value === Constants.Z_BOOLEAN_TRUE ) ) {
				// 2. If the change is done on collapsed mode, get the parent to set Z3K1/type
				const keyTypeRowId = this.getZKeyTypeRowId( this.parentRowId );
				const keyTypeType = this.getZObjectTypeByRowId( keyTypeRowId );

				let identityPayload;
				if ( keyTypeType === Constants.Z_REFERENCE ) {
					identityPayload = {
						keyPath: [ Constants.Z_KEY_TYPE, Constants.Z_REFERENCE_ID ],
						value: this.getCurrentZObjectId
					};
				} else {
					const refObject = this.createObjectByType( {
						type: Constants.Z_REFERENCE,
						value: this.getCurrentZObjectId
					} );
					identityPayload = {
						keyPath: [ Constants.Z_KEY_TYPE ],
						value: refObject
					};
				}

				this.$emit( 'set-value', identityPayload );
			}

			// If the value of Z1K1 changes, tell parent key to change its type
			if ( this.key === Constants.Z_OBJECT_TYPE ) {
				if ( Array.isArray( payload.value ) ) {
					this.$emit( 'set-value', payload );
				} else {
					this.$emit( 'set-type', payload );
				}
				return;
			}

			// CHANGES ARE RESPONSIBILITY OF THIS COMPONENT:
			this.setDirtyIfMainObject();

			// If we are changing an implementation type, we need to clear
			// the unselected key and fill the other one with a blank value.
			if ( this.type === Constants.Z_IMPLEMENTATION ) {
				const contentType = payload.keyPath[ 0 ];
				this.setZImplementationContentType( {
					parentId: this.rowId,
					key: contentType
				} );
				return;
			}

			// If the value of Z7K1 changes, we need to change all keys, which
			// probably means that we need to pass up the responsability the way we
			// have done it with Z1K1.
			if ( this.key === Constants.Z_FUNCTION_CALL_FUNCTION ) {
				// Set new function call arguments and remove old ones and
				// continue to have this key set by setValueByRowIdAndPath
				this.setZFunctionCallArguments( {
					parentId: this.parentRowId,
					functionZid: payload.value
				} );
			}

			// Simple changes:
			// They don't affect the rest of the ZObject, only this key-value
			this.setValueByRowIdAndPath( {
				rowId: this.rowId,
				keyPath: payload.keyPath ? payload.keyPath : [],
				value: payload.value
			} ).then( () => {
				if ( payload.callback ) {
					payload.callback();
				}
			} );
		},

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
		 * Generic handler to bubble up change events. This can be utilized by any component
		 * that acts as a wrapper to ZObjectKeyValue and wants to recieve events from children.
		 *
		 * It is currently used by ZTypedListType, to be notified of a type change to a list
		 *
		 * @param {Object} payload
		 */
		changeEvent: function ( payload ) {
			this.$emit( 'change-event', payload );
		},

		/**
		 * Sets the expanded flag to a given value. If the type
		 * cannot be expanded (because it's terminal), it persistently
		 * sets the expanded flag to false.
		 *
		 * @param {boolean} value
		 */
		setExpanded: function ( value ) {
			// Never allow expansion of references and strings, as they are terminal
			if ( this.type === Constants.Z_REFERENCE || this.type === Constants.Z_STRING ) {
				this.expanded = false;
				return;
			}
			this.expanded = value;
		},

		/**
		 * Sets object isDirty flag as true only if the changes
		 * are made in the main page object.
		 */
		setDirtyIfMainObject: function () {
			if ( this.isMainObject( this.rowId ) ) {
				this.setDirty();
			}
		},

		/**
		 * Process delete item action
		 */
		deleteListItem: function () {
			// TODO (T331132): can we create a 'revert delete' workflow?
			this.setDirtyIfMainObject();
			this.removeItemFromTypedList( { rowId: this.rowId } );
		},
		/**
		 * Process move-before list item action
		 */
		moveBefore: function () {
			this.setDirtyIfMainObject();
			this.moveItemInTypedList( {
				parentRowId: this.parentRowId,
				key: this.key,
				offset: -1
			} );
		},
		/**
		 * Process move-after list item action
		 */
		moveAfter: function () {
			this.setDirtyIfMainObject();
			this.moveItemInTypedList( {
				parentRowId: this.parentRowId,
				key: this.key,
				offset: 1
			} );
		}

	} )
} );
</script>
