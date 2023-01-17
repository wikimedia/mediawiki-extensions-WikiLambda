<template>
	<!--
		WikiLambda Vue component for rendering a ZObjectKeyValue.
		This component handles all the complex logic behind figuring out
		what key-values can be editted, what are their bound types (if any)
		and what kind of view will be rendered, expanded or simple.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-key-value">
		<!-- Key -->
		<p
			class="ext-wikilambda-key-block"
			:class="[ expandedModeClass, nestingDepthClass, editModeClass ]"
		>
			<wl-expanded-toggle
				v-if="hasExpandedMode"
				:expanded="expanded"
				@click="( expanded = !expanded )"
			></wl-expanded-toggle>
			<label v-if="key">{{ keyLabel }}</label>
		</p>
		<!-- Value -->
		<p
			class="ext-wikilambda-value-block"
			:class="{ 'ext-wikilambda-value-block__padded': ( hasExpandedMode && !expanded ) }"
		>
			<component
				:is="zobjectComponent"
				:edit="editComponent"
				:expanded="expanded"
				:depth="depth"
				:row-id="rowId"
				:expected-type="expectedType"
				@set-value="setValue"
				@set-type="setType"
			></component>
		</p>
	</div>
</template>

<script>
var
	Constants = require( '../../Constants.js' ),
	ExpandedToggle = require( '../base/ExpandedToggle.vue' ),
	ZMonolingualString = require( './ZMonolingualString.vue' ),
	ZObjectKeyValueSet = require( './ZObjectKeyValueSet.vue' ),
	ZObjectType = require( './ZObjectType.vue' ),
	ZString = require( './ZString.vue' ),
	ZReference = require( './ZReference.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'z-object-key-value',
	components: {
		'wl-expanded-toggle': ExpandedToggle,
		'z-monolingual-string': ZMonolingualString,
		'z-object-key-value-set': ZObjectKeyValueSet,
		'z-object-type': ZObjectType,
		'z-string': ZString,
		'z-reference': ZReference
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
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
			'getLabel',
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
			 * expanded mode. This is for very special cases, such as the root ZObject
			 * type (it will always be a Literal Persistent Object).
			 * Currently there are no other cases of key-values that, in edit mode,
			 * should be prevented from being editted.
			 * FIXME: Challenge this assumption
			 * FIXME: Do we have to show "Type: Persistent object" or should we remove it?
			 *
			 * @return {boolean}
			 */
			disableEdit: function () {
				return (
					( this.key === Constants.Z_OBJECT_TYPE ) &&
					( this.parentExpectedType === Constants.Z_PERSISTENTOBJECT )
				);
			},

			/**
			 * Returns whether the component will be shown in edit mode, which
			 * depends on the global edit state but can be intervened with disableEdit.
			 *
			 * @return {boolean}
			 */
			editComponent: function () {
				return this.edit && !this.disableEdit;
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
			 * Returns the object { label, lang, zid } with the linguistic
			 * information of the key in the user language or undefined
			 * if the key doesn't exist or wasn't found.
			 * TODO: Create Label class or interface
			 *
			 * @return {Object|undefined}
			 */
			keyLabelObj: function () {
				return this.key ? this.getLabel( this.key ) : undefined;
			},

			/**
			 * Returns the label of the key in the user language or
			 * the raw key if the label wasn't found.
			 *
			 * @return {string}
			 */
			keyLabel: function () {
				return this.keyLabelObj ? this.keyLabelObj.label : this.key;
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

			/**
			 * Returns the css class that identifies the edit or view mode
			 *
			 * @return {string}
			 */
			editModeClass: function () {
				return this.editComponent ? 'ext-wikilambda-edit-on' : 'ext-wikilambda-edit-off';
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
				// FIXME: expected type changes if this is a typed list
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
				// be always shown in its expanded-mode rerepsentation--the set
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
					return 'z-object-type';
				}

				// BY TYPE

				// TODO: Create typed list component.
				// The typed list is a component that should not be shown
				// with ZObjectKeyValueSet, so it lacks expanded mode. The
				// ZObjectList component will then be in charge of handling
				// the type, binding it if necessary (E.g. if the parentType is
				// bound) or allowing for its edition.
				// When we have a typed list component, do:
				// if ( this.type === Constants.Z_TYPED_LIST ) {
				//   return 'z-object-typed-list'
				// }

				if ( ( this.type === Constants.Z_MONOLINGUALSTRING ) && !this.expanded ) {
					return 'z-monolingual-string';
				}
				if ( ( this.type === Constants.Z_REFERENCE ) && !this.expanded ) {
					return 'z-reference';
				}
				if ( ( this.type === Constants.Z_STRING ) && !this.expanded ) {
					return 'z-string';
				}

				// If there's no builtin component, always show expanded mode
				return 'z-object-key-value-set';
			}
		} ),
	methods: $.extend(
		mapActions( [ 'setValueByRowIdAndPath', 'changeType' ] ),
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
					type: payload.value
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

				// FIXME If the value of Z7K1 changes, we need to change all keys, which
				// probably means that we need to pass up the responsability the way we
				// have done it with Z1K1.
				if ( this.key === Constants.Z_FUNCTION_CALL_FUNCTION ) {
					return;
				}

				// SIMPLE changes
				// They don't affect the rest of the ZObject, only this key-value
				this.setValueByRowIdAndPath( {
					rowId: this.rowId,
					keyPath: payload.keyPath ? payload.keyPath : [],
					value: payload.value
				} );
			}
		} )
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-key-value {
	.ext-wikilambda-key-block {
		margin: 0;
		display: flex;
		align-items: center;
		color: @color-subtle;

		label {
			text-transform: capitalize;
			line-height: @size-125;
		}

		&.ext-wikilambda-expanded-off {
			color: @color-subtle;
			font-weight: @font-weight-normal;

			&.ext-wikilambda-edit-on {
				margin-bottom: @spacing-25;
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
