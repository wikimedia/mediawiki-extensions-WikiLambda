<template>
	<!--
		WikiLambda Vue component for viewing and modifying a ZObject type and mode.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-type-mode">
		<template v-if="edit">
			<!-- Zero state, select a literal type -->
			<z-object-selector
				v-if="!value"
				class="ext-wikilambda-type-mode__selector"
				:type="selectType"
				:zobject-id="rowId"
				:fit-width="true"
				@input="setValue"
			></z-object-selector>
			<!-- Non-Zero state, select mode -->
			<!-- eslint-disable vue/no-v-model-argument -->
			<!-- eslint-disable vue/no-unsupported-features -->
			<div v-else class="ext-wikilambda-type-mode__select">
				<wl-select
					v-model:selected="value"
					:menu-items="typeOptions"
					:fit-width="true"
					@update:selected="setValue"
				></wl-select>
			</div>
		</template>
		<template v-else>
			<a
				class="ext-wikilambda-edit-link"
				:href="valueUrl">{{ valueLabel }}</a>
		</template>
	</div>
</template>

<script>
var
	Constants = require( '../../Constants.js' ),
	icons = require( '../../../lib/icons.json' ),
	Select = require( '../base/Select.vue' ),
	ZObjectSelector = require( './../ZObjectSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'z-object-type',
	components: {
		'z-object-selector': ZObjectSelector,
		'wl-select': Select
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
		},
		expectedType: {
			type: String,
			default: ''
		}
	},
	data: function () {
		return {
			selectType: Constants.Z_TYPE
		};
	},
	computed: $.extend(
		mapGetters( [
			'getLabel',
			'getZObjectKeyByRowId',
			'getZReferenceTerminalValue',
			'isInsideComposition',
			'getParentExpectedType'
		] ),
		{
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
			typeOptions: function () {
				// Resolver types: reference and function always available
				const options = [
					{
						label: this.getOptionLabel( Constants.Z_REFERENCE ),
						value: Constants.Z_REFERENCE,
						icon: icons.cdxIconLink
					},
					{
						label: this.getOptionLabel( Constants.Z_FUNCTION_CALL ),
						value: Constants.Z_FUNCTION_CALL,
						// TODO: Decide final icon for function call
						icon: icons.cdxIconCode
					}
				];
				// Resolver types: argument reference only if we are inside a composition
				if ( this.isInsideComposition( this.rowId ) ) {
					options.push( {
						label: this.getOptionLabel( Constants.Z_ARGUMENT_REFERENCE ),
						value: Constants.Z_ARGUMENT_REFERENCE,
						// TODO: Decide final icon for argument reference
						icon: icons.cdxIconMarkup
					} );
				}

				// Literal type:
				if ( Constants.RESOLVER_TYPES.indexOf( this.value ) < 0 ) {
					// If literal is selected, show its label
					options.push( {
						label: this.valueLabel,
						value: this.value,
						// TODO: Decide final icon for literal
						icon: icons.cdxIconEdit
					} );
				} else {
					// Else, show the bound type if any
					options.push( {
						label: this.getOptionLabel( this.expectedType ),
						value: this.expectedType,
						// TODO: Decide final icon for literal
						icon: icons.cdxIconEdit
					} );
				}

				return options;
			},

			/**
			 * Returns the value of the selected type
			 *
			 * @return {string}
			 */
			value: function () {
				return this.getZReferenceTerminalValue( this.rowId );
			},

			/**
			 * Returns the label object for the selected type or undefined
			 * if no label is found.
			 * TODO implement Label class and update JSDoc
			 *
			 * @return {Object|undefined}
			 */
			valueLabelObj: function () {
				return this.value ? this.getLabel( this.value ) : undefined;
			},

			/**
			 * Returns the string value of the label for the selected type.
			 * If no label is found, returns the key.
			 *
			 * @return {string}
			 */
			valueLabel: function () {
				return this.valueLabelObj ? this.valueLabelObj.label : this.value;
			},

			/**
			 * Returns the link to the page of the selected type.
			 *
			 * @return {string}
			 */
			valueUrl: function () {
				if ( this.value ) {
					return new mw.Title( this.value ).getUrl();
				}
			}
		} ),
	methods: {
		/**
		 * Given a option value, fetches the label object and, if available
		 * returns the label string for displaying in the type option selector.
		 * Else, returns the type Zid.
		 *
		 * @param {string} type
		 * @return {string}
		 */
		getOptionLabel: function ( type ) {
			// TODO if the label is in a different language than the user's,
			// should we return the language chip of the available label?
			// How can we show the language fallback information in the selector?
			const labelObj = this.getLabel( type );
			return ( labelObj === undefined ) ?
				type :
				labelObj.label;
		},

		/**
		 * Emits the event setValue so that ZObjectKey can update
		 * the terminal value in the ZObject data table.
		 *
		 * @param {string} value
		 */
		setValue: function ( value ) {
			// Do not emit a value if there's no change to avoid
			// unnecessarily altering the rest of the ZObject
			if ( value !== this.value ) {
				this.$emit( 'set-value', {
					keyPath: [],
					value: value
				} );
			}
		}
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';
@import '../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-type-mode {
	&__select {
		.cdx-select.cdx-select--enabled.cdx-select--expanded {
			width: 100%;
			display: inline-block;
		}

		.cdx-select {
			width: auto;
			display: inline-block;
		}

		@media screen and ( min-width: @width-breakpoint-tablet ) {
			.cdx-select.cdx-select--enabled.cdx-select--expanded {
				width: 50%;
				display: inline-block;
			}
		}
	}

	&__selector {
		.cdx-lookup {
			display: inline-block;
		}
	}

	&__selector-active {
		.cdx-lookup {
			width: 100%;
		}

		@media screen and ( min-width: @width-breakpoint-tablet ) {
			.cdx-lookup {
				width: 50%;
			}
		}
	}
}
</style>
