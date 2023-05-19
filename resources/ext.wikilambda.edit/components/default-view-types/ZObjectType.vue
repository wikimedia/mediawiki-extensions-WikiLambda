<template>
	<!--
		WikiLambda Vue component for viewing and modifying a ZObject type and mode.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-type-mode">
		<div
			v-if="edit"
			class="ext-wikilambda-type-mode__select"
		>
			<!-- Zero state, select a literal type -->
			<wl-z-object-selector
				v-if="!value"
				:edit="edit"
				:fit-width="true"
				:row-id="rowId"
				:type="selectType"
				@input="setValue"
			></wl-z-object-selector>
			<!-- Non-Zero state, select mode -->
			<wl-select
				v-else
				v-model:selected="value"
				:menu-items="typeOptions"
				:fit-width="true"
				:disabled="disabled"
				@update:selected="setValue"
			></wl-select>
		</div>
		<a
			v-else
			class="ext-wikilambda-edit-link"
			:href="valueUrl"
		>
			{{ valueLabel }}
		</a>
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
	name: 'wl-z-object-type',
	components: {
		'wl-z-object-selector': ZObjectSelector,
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
		},
		disabled: {
			type: Boolean,
			default: false
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
			'getZReferenceTerminalValue',
			'isInsideComposition'
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
						label: this.getLabel( Constants.Z_REFERENCE ),
						value: Constants.Z_REFERENCE,
						icon: icons.cdxIconInstance
					},
					{
						label: this.getLabel( Constants.Z_FUNCTION_CALL ),
						value: Constants.Z_FUNCTION_CALL,
						icon: icons.cdxIconFunction
					}
				];
				// Resolver types: argument reference only if we are inside a composition
				if ( this.isInsideComposition( this.rowId ) ) {
					options.push( {
						label: this.getLabel( Constants.Z_ARGUMENT_REFERENCE ),
						value: Constants.Z_ARGUMENT_REFERENCE,
						icon: icons.cdxIconFunctionArgument
					} );
				}

				// Literal type: if type is unbound and selected type is not a resolver,
				// add selected literal type
				if (
					( this.expectedType === Constants.Z_OBJECT ) &&
					( Constants.RESOLVER_TYPES.indexOf( this.value ) < 0 )
				) {
					options.push( {
						label: this.valueLabel,
						value: this.value,
						icon: icons.cdxIconLiteral
					} );
				}

				// Literal type: add expected literal type
				options.push( {
					label: this.getLabel( this.expectedType ),
					value: this.expectedType,
					icon: icons.cdxIconLiteral
				} );

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
			 * Returns the label object for the selected type or the value
			 * if no label is found.
			 *
			 * @return {string}
			 */
			valueLabel: function () {
				return this.value ? this.getLabel( this.value ) : undefined;
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
}
</style>
