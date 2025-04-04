<!--
	WikiLambda Vue component for Z14/Implementation objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-implementation"
		data-testid="z-implementation"
	>
		<!-- Function selection block -->
		<div
			class="ext-wikilambda-app-implementation__function"
			data-testid="implementation-function"
		>
			<wl-key-block :key-bold="true">
				<label
					:lang="functionLabelData.langCode"
					:dir="functionLabelData.langDir"
				>{{ functionLabelData.label }}</label>
			</wl-key-block>
			<wl-z-object-key-value
				:key="functionRowId"
				:row-id="functionRowId"
				:skip-key="true"
				:skip-indent="true"
				:edit="edit && !isTypeBuiltin"
			></wl-z-object-key-value>
		</div>
		<!-- Implementation type block -->
		<div
			class="ext-wikilambda-app-implementation__type"
			data-testid="implementation-type">
			<wl-key-value-block :key-bold="true">
				<template #key>
					<label
						:lang="implementationLabelData.langCode"
						:dir="implementationLabelData.langDir"
					>{{ implementationLabelData.label }}</label>
				</template>
				<template #value>
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
							class="ext-wikilambda-app-implementation__value-text"
							:lang="implementationTypeLabelData.langCode"
							:dir="implementationTypeLabelData.langDir"
						>{{ implementationTypeLabelData.label }}</span>
						<div
							v-else
							class="ext-wikilambda-app-implementation__value-input"
							data-testid="implementation-radio"
						>
							<cdx-radio
								v-for="radio in radioChoices"
								:key="'radio-' + radio.value"
								v-model="implementationType"
								:disabled="!functionZid"
								:input-value="radio.value"
								:name="'implementation-radios-' + rowId"
								:inline="true"
							>
								<span
									:lang="radio.labelData.langCode"
									:dir="radio.labelData.langDir"
								>{{ radio.labelData.label }}</span>
							</cdx-radio>
						</div>
					</template>
				</template>
			</wl-key-value-block>
		</div>

		<div
			v-if="!isTypeBuiltin && functionZid"
			class="ext-wikilambda-app-implementation__content"
			data-testid="implementation-content"
		>
			<wl-key-block v-if="!isTypeCode" :key-bold="true">
				<label
					:lang="implementationTypeLabelData.langCode"
					:dir="implementationTypeLabelData.langDir"
				>{{ implementationTypeLabelData.label }}</label>
			</wl-key-block>
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
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );
const { CdxMessage, CdxRadio } = require( '../../../codex.js' );
const Constants = require( '../../Constants.js' );
const KeyBlock = require( '../base/KeyBlock.vue' );
const KeyValueBlock = require( '../base/KeyValueBlock.vue' );
const useMainStore = require( '../../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-implementation',
	components: {
		'cdx-message': CdxMessage,
		'cdx-radio': CdxRadio,
		'wl-key-block': KeyBlock,
		'wl-key-value-block': KeyValueBlock
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

	computed: Object.assign( {},
		mapState( useMainStore, [
			'getZImplementationFunctionRowId',
			'getZImplementationContentType',
			'getZImplementationContentRowId',
			'getZImplementationFunctionZid',
			'getLabelData'
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
			 * Returns the LabelData object for the implementation Function/Z14K1 key
			 *
			 * @return {LabelData}
			 */
			functionLabelData: function () {
				return this.getLabelData( Constants.Z_IMPLEMENTATION_FUNCTION );
			},

			/**
			 * Return the zid of the target function for this implementation
			 *
			 * @return {string | undefined }
			 */
			functionZid: function () {
				return this.getZImplementationFunctionZid( this.rowId );
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
			 * Returns the LabelData object for the implementation type
			 *
			 * @return {LabelData}
			 */
			implementationTypeLabelData: function () {
				return this.getLabelData( this.implementationType );
			},

			/**
			 * Returns the LabelData object for the type zid Implementation/Z14
			 *
			 * @return {LabelData}
			 */
			implementationLabelData: function () {
				return this.getLabelData( Constants.Z_IMPLEMENTATION );
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
						labelData: this.getLabelData( Constants.Z_IMPLEMENTATION_CODE ),
						value: Constants.Z_IMPLEMENTATION_CODE
					},
					{
						labelData: this.getLabelData( Constants.Z_IMPLEMENTATION_COMPOSITION ),
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
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-implementation {
	.ext-wikilambda-app-implementation__type {
		padding-top: @spacing-75;
	}

	.ext-wikilambda-app-implementation__content {
		padding-top: @spacing-75;
	}
}
</style>
