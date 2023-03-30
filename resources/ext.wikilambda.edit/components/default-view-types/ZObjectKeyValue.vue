<template>
	<!--
		WikiLambda Vue component for rendering a ZObjectKeyValue.
		This component handles all the complex logic behind figuring out
		what key-values can be editted, what are their bound types (if any)
		and what kind of view will be rendered, expanded or simple.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div :class="rootClass">
		<!-- Key -->
		<p
			v-if="renderKeyBlock"
			class="ext-wikilambda-key-block"
			:class="[ expandedModeClass, nestingDepthClass, editModeClass ]"
		>
			<wl-expanded-toggle
				v-if="hasExpandedMode"
				:expanded="expanded"
				@toggle="toggleExpanded"
			></wl-expanded-toggle>
			<wl-localized-label
				v-if="keyLabel"
				:class="expandedModeLabelClass"
				:label-data="keyLabel"
			></wl-localized-label>
			<!-- Optional context menu for displaying key/value actions -->
			<wl-context-menu
				v-if="showContextMenu"
				class="ext-wikilambda-key-block__context-menu"
				:menu-items="contextMenuItems"
				@context-action="contextMenuAction"
			></wl-context-menu>
		</p>
		<!-- Value -->
		<p
			class="ext-wikilambda-value-block"
			:class="paddedClass"
		>
			<component
				:is="zobjectComponent"
				:class="shiftLeft"
				:edit="edit"
				:disabled="disableEdit"
				:expanded="expanded"
				:depth="depth"
				:row-id="rowId"
				:expected-type="expectedType"
				:parent-id="parentRowId"
				:list-type="listType"
				@set-value="setValue"
				@set-type="setType"
				@change-event="changeEvent"
			></component>
		</p>
	</div>
</template>

<script>
var
	Constants = require( '../../Constants.js' ),
	ExpandedToggle = require( '../base/ExpandedToggle.vue' ),
	ContextMenu = require( '../base/ContextMenu.vue' ),
	LocalizedLabel = require( '../base/LocalizedLabel.vue' ),
	ZMonolingualString = require( './ZMonolingualString.vue' ),
	ZObjectKeyValueSet = require( './ZObjectKeyValueSet.vue' ),
	ZObjectType = require( './ZObjectType.vue' ),
	ZString = require( './ZString.vue' ),
	ZCode = require( './ZCode.vue' ),
	ZReference = require( './ZReference.vue' ),
	ZBoolean = require( './ZBoolean.vue' ),
	ZFunctionCall = require( './ZFunctionCall.vue' ),
	ZTypedList = require( './ZTypedList.vue' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-object-key-value',
	components: {
		'wl-expanded-toggle': ExpandedToggle,
		'wl-localized-label': LocalizedLabel,
		'wl-context-menu': ContextMenu,
		'wl-z-code': ZCode,
		'wl-z-function-call': ZFunctionCall,
		'wl-z-monolingual-string': ZMonolingualString,
		'wl-z-object-key-value-set': ZObjectKeyValueSet,
		'wl-z-object-type': ZObjectType,
		'wl-z-string': ZString,
		'wl-z-reference': ZReference,
		'wl-z-boolean': ZBoolean,
		'wl-z-typed-list': ZTypedList
	},
	mixins: [ typeUtils ],
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
		listType: {
			type: String,
			default: null
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
	computed: $.extend(
		mapGetters( [
			'getUserZlangZID',
			'getLabelData',
			'getExpectedTypeOfKey',
			'getDepthByRowId',
			'getParentRowId',
			'getZObjectKeyByRowId',
			'getZObjectValueByRowId',
			'getZObjectTypeByRowId'
		] ),
		{
			/**
			 * Returns whether we want to disable the edit mode for a given key-value.
			 * Note that this is not the same thing as bounding the type, or disabling
			 * expanded mode. This does not coerce the component to render in view mode,
			 * just disables the selectability of the component.
			 * FIXME: Validate the cases for doing this
			 * FIXME: Do we have to show "Type: Persistent object" or should we remove it?
			 *
			 * @return {boolean}
			 */
			disableEdit: function () {
				// if the item is a typed list and the type of that list is enforced, the edit should be disabled
				if ( this.isKeyTypedListType( this.parentKey ) || this.isKeyTypedListType( this.key ) ) {
					return this.expectedType !== Constants.Z_OBJECT;
				}

				// if this is an item in a typed list and the type of that item,
				// it should be disabled unless the list is of type 'any'
				// an item can have multiple input fields (ex: monolingual string),
				// so this should be limited to the object type field
				if ( ( this.key === Constants.Z_OBJECT_TYPE ) &&
					( this.isKeyTypedListItem( this.parentKey ) || this.isKeyTypedListItem( this.key ) )
				) {
					return this.listType !== Constants.Z_OBJECT;
				}

				// the root ZObject type (it will always be a Literal Persistent Object).
				return ( this.key === Constants.Z_OBJECT_TYPE ) &&
					( this.parentExpectedType === Constants.Z_PERSISTENTOBJECT );
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
			 * Returns the label data object of the given key.
			 *
			 * @return {LabelData}
			 */
			keyLabel: function () {
				// since the FE represents typed lists in canonical form, we need to hardcode typed list keys
				if ( this.isKeyTypedListItem( this.key ) &&
					this.expanded &&
					this.hasExpandedMode
				) {
					return {
						zid: `${Constants.Z_TYPED_LIST}K${this.key}`,
						label: this.$i18n( 'wikilambda-list-item-label' ).text(),
						lang: this.getUserZlangZID
					};
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
			 * Returns the css class that identifies the nesting level
			 *
			 * @return {string}
			 */
			nestingDepthClass: function () {
				return `ext-wikilambda-key-level-${this.depth}`;
			},

			/**
			 * Returns the css class that identifies the expanded mode
			 *
			 * @return {string}
			 */
			expandedModeClass: function () {
				return ( this.expanded && this.hasExpandedMode ) ? 'ext-wikilambda-expanded-on' : 'ext-wikilambda-expanded-off';
			},

			expandedModeLabelClass: function () {
				return ( this.hasExpandedMode ) ? 'ext-wikilambda-key-block__label' : '';
			},

			/**
			 * Returns the css class that identifies the edit or view mode
			 *
			 * @return {string}
			 */
			editModeClass: function () {
				return this.edit ? 'ext-wikilambda-edit-on' : 'ext-wikilambda-edit-off';
			},

			/**
			 * Finds the correct root class depending on if the item is part of a list or not
			 *
			 * @return {string}
			 */
			rootClass: function () {
				var classList = [ 'ext-wikilambda-key-value' ];

				if ( this.isKeyTypedListType( this.key ) && this.edit && !this.expanded ) {
					classList.push( 'ext-wikilambda-key-value-flex' );
				}

				// this class is only required for non-terminal items in collapsed mode
				if ( this.listType && !this.expanded && this.hasExpandedMode ) {
					classList.push( 'ext-wikilambda-key-value-inherit' );
				}
				// string list items require different treatment because
				// they have a <li> bullet point (but only in view mode)
				if ( this.listType && this.type === Constants.Z_STRING && !this.edit ) {
					classList.push( 'ext-wikilambda-key-value-inline-table' );
				}

				return classList;
			},

			paddedClass: function () {
				var classList = [];

				if ( this.edit && this.isKeyTypedListType( this.key ) ) {
					return classList;
				}

				// typed lists will manage padding independently
				if ( this.type === Constants.Z_TYPED_LIST ) {
					return classList;
				}

				// non-terminal list items with labels should be indented when they are collapsed
				if ( this.listType ) {

					if ( this.edit && !this.expanded && this.hasExpandedMode && this.keyLabel ) {
						classList.push( 'ext-wikilambda-value-block__padded' );
					}
				} else if ( this.hasExpandedMode && !this.expanded ) {
					classList.push( 'ext-wikilambda-value-block__padded' );
				}

				return classList;
			},

			/**
			 * Returns the type of the value of the the ZObject represented
			 * in this component. When it's not set, it's undefined.
			 *
			 * @return {string}
			 */
			type: function () {
				return this.getZObjectTypeByRowId( this.rowId );
			},

			/**
			 * Returns the expected type of the parent key
			 *
			 * @return {string}
			 */
			parentExpectedType: function () {
				return this.getExpectedTypeOfKey( this.parentKey );
			},

			/**
			 * Returns the expected (or bound) type for the value of
			 * the key-value pair represented in this component.
			 *
			 * @return {string}
			 */
			expectedType: function () {
				// if this is the type of a list
				if ( this.isKeyTypedListType( this.key ) ) {
					return this.typedListStringToType( this.parentExpectedType );
				}

				// if the type of a list is expanded, we will be nested
				// so need to go two levels up to get the expected type
				// this is required to limit the select options in edit mode
				if ( this.isKeyTypedListType( this.parentKey ) ) {
					// get the grandparent expected type
					const grandparentRowId = this.getParentRowId( this.parentRowId );
					const grandparentKey = this.getZObjectKeyByRowId( grandparentRowId );
					const grandparentExpectedType = this.getExpectedTypeOfKey( grandparentKey );

					return this.typedListStringToType( grandparentExpectedType );
				}

				// list types and list items don't have real keys - their keys are just list indices
				// if the item is list item, the type of each item must be whatever the type of the list is
				if (
					( this.isKeyTypedListItem( this.parentKey ) || this.isKeyTypedListItem( this.key ) ) &&
					this.listType !== Constants.Z_OBJECT
				) {
					return this.listType;
				}

				// FIXME: expected type changes if this is a resolver type
				if ( this.key === Constants.Z_REFERENCE_ID ) {
					return this.parentExpectedType;
				}
				if ( this.key === Constants.Z_OBJECT_TYPE ) {
					return this.parentExpectedType;
				}

				return this.getExpectedTypeOfKey( this.key );
			},

			/**
			 * Returns whether this key-value can be expanded into an expanded mode.
			 * This contains the logic for detecting terminal key-values and
			 * not enter infinite UX recursion.
			 *
			 * @return {boolean}
			 */
			hasExpandedMode: function () {
				if ( this.edit ) {
					// TERMINAL rules for edit:
					// If the key is terminal Z6K1 or Z9K1, no expanded mode
					if (
						( this.key === Constants.Z_STRING_VALUE ) ||
						( this.key === Constants.Z_REFERENCE_ID )
					) {
						return false;
					}
				} else {
					// TERMINAL rules for view:
					// If the type is string or reference, no expanded mode
					if (
						( this.type === Constants.Z_STRING ) ||
						( this.type === Constants.Z_REFERENCE )
					) {
						return false;
					}
				}

				// TERMINAL rules for both view and edit:
				// If the key is Z1K1:
				if ( this.key === Constants.Z_OBJECT_TYPE ) {
					// If the parent type is bound, no have expanded mode
					if ( this.parentExpectedType !== Constants.Z_OBJECT ) {
						return false;
					}

					// If the type is any but literal (resolvers like reference,
					// function call or argument reference) then no expanded mode
					if ( Constants.RESOLVER_TYPES.indexOf( this.value ) > -1 ) {
						return false;
					}
				}

				// If the type doesn't have any builting component, it must
				// be always shown in its expanded-mode representation--the set
				// of key values, so we won't show the expanded mode toggle
				if ( Object.keys( Constants.BUILTIN_COMPONENTS ).indexOf( this.type ) < 0 ) {
					return false;
				}
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
				// Z1K1 has a special component to handle ZObjectType and mode:
				if ( ( this.key === Constants.Z_OBJECT_TYPE ) && !this.expanded ) {
					return 'wl-z-object-type';
				}

				// BY TYPE
				// The typed list is a component that should not be shown
				// with ZObjectKeyValueSet, so it lacks expanded mode. The
				// ZTypedList component will then be in charge of handling
				// the type, binding it if necessary (E.g. if the parentType is
				// bound) or allowing for its edition.
				if ( this.type === Constants.Z_TYPED_LIST ) {
					return 'wl-z-typed-list';
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
				if ( ( this.type === Constants.Z_CODE ) && !this.expanded ) {
					return 'wl-z-code';
				}

				// If there's no builtin component, always show expanded mode
				return 'wl-z-object-key-value-set';
			},

			/**
			 * Logic for when to render the context menu. It can be used to display
			 * actions for a key/value. Currently the only use cases involve typed lists.
			 * TODO (T330189): create a case for adding an item to a typed list
			 *
			 * @return {boolean}
			 */
			showContextMenu: function () {
				// only allow actions in edit mode
				if ( !this.edit ) {
					return false;
				}

				// CASE: delete items from a typed list
				// it is only rendered for a ZTypedListItem that IS expanded
				if ( this.isKeyTypedListItem( this.key ) && this.expanded ) {
					return true;
				}
				return false;
			},

			/**
			 * The list of action items for the context menu to display.
			 *
			 * @return {Array}
			 */
			contextMenuItems: function () {
				// case 1: add items to a typed list
				if ( this.type === Constants.Z_TYPED_LIST && !this.expanded ) {
					return [ {
						label: this.$i18n( 'wikilambda-add-list-item' ).text(),
						value: Constants.contextMenuItems.ADD_LIST_ITEM
					} ];
				}

				// case 2: delete items from a typed list
				if ( this.isKeyTypedListItem( this.key ) && this.expanded ) {
					return [ {
						label: this.$i18n( 'wikilambda-delete-list-item' ).text(),
						value: Constants.contextMenuItems.DELETE_LIST_ITEM
					} ];
				}
			},

			/**
			 * Do not render the key block if none of the conditions exist.
			 * The <p> tag has default padding that we do not want if no content is rendered.
			 *
			 * @return {boolean}
			 */
			renderKeyBlock: function () {
				return this.hasExpandedMode || this.keyLabel || this.showContextMenu;
			}
		} ),
	methods: $.extend( mapActions( [
		'changeType',
		'setValueByRowIdAndPath',
		'setZFunctionCallArguments',
		'removeItemFromTypedList'
	] ),
	{
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
			this.changeType( {
				id: this.rowId,
				type: payload.value,
				append: payload.append ? payload.append : false
			} );
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
			// if the type of a typed list changed, notify the parent to take action
			if ( this.isKeyTypedListType( this.parentKey ) || this.isKeyTypedListType( this.key ) ) {
				this.$emit( 'change-event', payload );
			}

			// COMPLEX changes
			// They affect the rest of the ZObject, not only this key-value

			// 1. If the value of Z1K1 changes, tell parent key to change its type
			if ( this.key === Constants.Z_OBJECT_TYPE ) {
				this.$emit( 'set-type', payload );
				return;
			}

			// 2. If the value of Z1K1.Z9K1 changes, pass the set value responsability
			if ( ( this.key === Constants.Z_REFERENCE_ID ) &&
				( this.parentKey === Constants.Z_OBJECT_TYPE ) ) {
				this.$emit( 'set-value', payload );
				return;
			}

			// 3. If the value of Z7K1 changes, we need to change all keys, which
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

			// SIMPLE changes
			// They don't affect the rest of the ZObject, only this key-value
			this.setValueByRowIdAndPath( {
				rowId: this.rowId,
				keyPath: payload.keyPath ? payload.keyPath : [],
				value: payload.value
			} );
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
			this.$parent.$emit( 'change-event', payload );
		},

		/**
		 * Toggles on and off the expanded flag
		 */
		toggleExpanded: function () {
			this.expanded = !this.expanded;
		},

		/**
		 * Process context menu actions
		 *
		 * @param {string} action
		 */
		contextMenuAction: function ( action ) {
			if ( action === Constants.contextMenuItems.DELETE_LIST_ITEM ) {
				// TODO(T324242): replace with new setter when it exists
				// TODO(T331132): can we create a 'revert delete' workflow?
				this.removeItemFromTypedList( {
					rowId: this.rowId
				} );
			}
		}
	} )
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-key-value {
	flex: 1;

	.ext-wikilambda-key-value-inherit {
		display: inherit;
	}

	.ext-wikilambda-key-value-inline-table {
		display: inline-table;
	}

	.ext-wikilambda-key-value-flex {
		display: flex;
	}

	.ext-wikilambda-key-block {
		display: flex;
		align-items: center;
		color: @color-subtle;

		&__label {
			margin-left: @spacing-50;
		}

		&__context-menu {
			margin-left: @spacing-50;
		}

		label {
			text-transform: capitalize;
			line-height: @size-125;
		}

		&.ext-wikilambda-expanded-off {
			color: @color-subtle;
			font-weight: @font-weight-normal;

			&.ext-wikilambda-edit-on {
				margin-bottom: @spacing-50;
			}
		}

		&.ext-wikilambda-expanded-on {
			font-weight: @font-weight-normal;

			& > .cdx-icon {
				color: inherit;
			}

			&.ext-wikilambda-key-level-0 {
				color: @wl-key-value-color-0;
			}

			&.ext-wikilambda-key-level-1 {
				color: @wl-key-value-color-1;
			}

			&.ext-wikilambda-key-level-2 {
				color: @wl-key-value-color-2;
			}

			&.ext-wikilambda-key-level-3 {
				color: @wl-key-value-color-3;
			}

			&.ext-wikilambda-key-level-4 {
				color: @wl-key-value-color-4;
			}

			&.ext-wikilambda-key-level-5 {
				color: @wl-key-value-color-5;
			}

			&.ext-wikilambda-key-level-6 {
				color: @wl-key-value-color-6;
			}
		}
	}
	/* stylelint-disable declaration-block-no-redundant-longhand-properties */
	.ext-wikilambda-value-block {
		flex: 1;
		margin-top: @wl-key-value-margin-top;
		margin-right: @wl-key-value-margin-right;
		margin-bottom: @wl-key-value-margin-bottom;
		margin-left: @wl-key-value-margin-left;

		&__padded {
			margin-left: @spacing-150;
		}

		.ext-wikilambda-key-value-set {
			padding-top: @wl-key-value-set-margin-top;
			margin-right: @wl-key-value-set-margin-right;
			margin-bottom: @wl-key-value-set-margin-bottom;
			margin-left: @wl-key-value-set-margin-left;
		}
	}
}
</style>
