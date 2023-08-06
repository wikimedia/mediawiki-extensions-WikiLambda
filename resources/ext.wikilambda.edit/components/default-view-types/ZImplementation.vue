<!--
	WikiLambda Vue component for Z14/Implementation objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-implementation"
		data-testid="implementation"
	>
		<!-- Function selection block -->
		<div
			class="ext-wikilambda-implementation-function"
			data-testid="implementation-function"
		>
			<wl-z-object-key-value
				:key="functionRowId"
				:row-id="functionRowId"
				:skip-indent="true"
				:edit="edit && !isTypeBuiltin"
			></wl-z-object-key-value>
		</div>
		<!-- Implementation type block -->
		<div class="ext-wikilambda-implementation-type">
			<div class="ext-wikilambda-key-block">
				<label>{{ implementationLabel }}</label>
			</div>
			<div class="ext-wikilambda-value-block">
				<!-- Show warning message for builtins -->
				<cdx-message
					v-if="isTypeBuiltin"
					:inline="true">
					{{ $i18n( 'wikilambda-implementation-selector-none' ).text() }}
				</cdx-message>
				<!-- Show radio button for code or composition -->
				<template v-else>
					<span
						v-if="!edit"
						class="ext-wikilambda-value-text"
					>{{ implementationTypeLabel }}</span>
					<div
						v-else
						class="ext-wikilambda-value-input"
						data-testid="implementation-radio"
					>
						<cdx-radio
							v-for="radio in radioChoices"
							:key="'radio-' + radio.value"
							v-model="implementationType"
							:input-value="radio.value"
							:name="'implementation-radios-' + rowId"
							:inline="true"
						>
							{{ radio.label }}
						</cdx-radio>
					</div>
				</template>
			</div>
		</div>
		<!-- Implementation content block -->
		<div
			v-if="!isTypeBuiltin"
			class="ext-wikilambda-implementation-content"
		>
			<div
				v-if="!isTypeCode"
				class="ext-wikilambda-key-block"
			>
				<label>{{ implementationTypeLabel }}</label>
			</div>
			<wl-z-object-key-value
				:key="implementationContentRowId"
				:skip-key="true"
				:skip-indent="isTypeCode"
				:row-id="implementationContentRowId"
				:error-id="implementationContentRowId"
				:edit="edit"
				data-testid="implementation-content-block"
			></wl-z-object-key-value>
		</div>
	</div>
</template>

<script>
var CdxRadio = require( '@wikimedia/codex' ).CdxRadio,
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-implementation',
	components: {
		'cdx-message': CdxMessage,
		'cdx-radio': CdxRadio
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

	computed: $.extend(
		mapGetters( [
			'getZImplementationFunctionRowId',
			'getZImplementationContentType',
			'getZImplementationContentRowId',
			'getLabel'
		] ),
		{
			/**
			 * Returns the row Id of the target function key: Z14K1
			 *
			 * @return {number|undefined}
			 */
			functionRowId: function () {
				return this.getZImplementationFunctionRowId( this.rowId );
			},

			/**
			 * Active implementation key, that which contains the implementation
			 * content. The values are Z14K2 for composition, Z14K3 for code or
			 * Z14K4 for built-in.
			 */
			implementationType: {
				/**
				 * Returns the implementation type or key which is selected
				 *
				 * @return {string}
				 */
				get: function () {
					return this.getZImplementationContentType( this.rowId );
				},
				/**
				 * Sets the implementation type and initializes the value
				 * to a blank scaffolding depending on what key is selected
				 *
				 * @param {string} value
				 */
				set: function ( value ) {
					if ( this.edit ) {
						this.$emit( 'set-value', {
							keyPath: [ value ],
							value: ''
						} );
					}
				}
			},

			/**
			 * Returns the human readable label for the implementation type
			 *
			 * @return {string}
			 */
			implementationTypeLabel: function () {
				return this.getLabel( this.implementationType );
			},

			/**
			 * Returns the human readable label for "Implementation"
			 *
			 * @return {string}
			 */
			implementationLabel: function () {
				return this.getLabel( Constants.Z_IMPLEMENTATION );
			},

			/**
			 * Whether the implementation content is of type code (Z14K3)
			 *
			 * @return {boolean}
			 */
			isTypeCode: function () {
				return ( this.implementationType === Constants.Z_IMPLEMENTATION_CODE );
			},

			/**
			 * Whether the implementation content is of type builtin (Z14K4)
			 *
			 * @return {boolean}
			 */
			isTypeBuiltin: function () {
				return ( this.implementationType === Constants.Z_IMPLEMENTATION_BUILT_IN );
			},

			/**
			 * Returns the ID of the row where the implementation content
			 * starts, depending on which implementation type is selected.
			 *
			 * @return {number|undefined}
			 */
			implementationContentRowId: function () {
				return this.getZImplementationContentRowId(
					this.rowId,
					this.implementationType
				);
			},

			/**
			 * Returns the formatted choices for the Codex Radio component
			 * to select the type of implementation (code vs composition)
			 *
			 * @return {Array}
			 */
			radioChoices: function () {
				return [
					{
						label: this.getLabel( Constants.Z_IMPLEMENTATION_CODE ),
						value: Constants.Z_IMPLEMENTATION_CODE
					},
					{
						label: this.getLabel( Constants.Z_IMPLEMENTATION_COMPOSITION ),
						value: Constants.Z_IMPLEMENTATION_COMPOSITION
					}
				];
			}
		}
	),
	beforeCreate: function () {
		// Need to delay require of ZObjectKeyValue to avoid loop
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-implementation {
	.ext-wikilambda-implementation-function {
		.ext-wikilambda-key-block {
			margin-bottom: 0;

			label {
				font-weight: bold;
				color: @color-base;
			}
		}
	}

	.ext-wikilambda-implementation-type {
		padding-top: @spacing-75;

		& > .ext-wikilambda-key-block {
			margin-bottom: 0;

			label {
				font-weight: bold;
				color: @color-base;
			}
		}

		& > .ext-wikilambda-value-block {
			margin-bottom: @spacing-75;

			.ext-wikilambda-value-input {
				margin-top: @spacing-25;
			}
		}
	}

	.ext-wikilambda-implementation-content {
		padding-top: @spacing-75;

		& > .ext-wikilambda-key-block {
			margin-bottom: 0;

			label {
				font-weight: bold;
				color: @color-base;
			}
		}
	}
}
</style>
