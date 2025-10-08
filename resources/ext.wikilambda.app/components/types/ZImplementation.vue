<!--
	WikiLambda Vue component for Z14/Implementation objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-implementation" data-testid="z-implementation">
		<!-- Function selection block -->
		<wl-key-value-block
			:key-bold="true"
			class="ext-wikilambda-app-implementation__function"
			data-testid="implementation-function"
		>
			<template #key>
				<label
					:lang="functionLabelData.langCode"
					:dir="functionLabelData.langDir"
				>{{ functionLabelData.label }}</label>
			</template>
			<template #value>
				<wl-z-object-key-value
					:key-path="`${ keyPath }.${ functionKey }`"
					:object-value="objectValue[ functionKey ]"
					:edit="edit && !isTypeBuiltin"
					:skip-key="true"
					:skip-indent="true"
				></wl-z-object-key-value>
			</template>
		</wl-key-value-block>

		<!-- Implementation type block -->
		<wl-key-value-block
			:key-bold="true"
			class="ext-wikilambda-app-implementation__type"
			data-testid="implementation-type"
		>
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
					{{ i18n( 'wikilambda-implementation-selector-none' ).text() }}
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
							:key="`radio-${ radio.value }`"
							v-model="implementationType"
							:disabled="!functionZid"
							:input-value="radio.value"
							name="implementation-type-radio"
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

		<!-- Implementation content block -->
		<wl-key-value-block
			v-if="!isTypeBuiltin && functionZid"
			:key-bold="true"
			class="ext-wikilambda-app-implementation__content"
			data-testid="implementation-content"
		>
			<template v-if="!isTypeCode" #key>
				<label
					:lang="implementationTypeLabelData.langCode"
					:dir="implementationTypeLabelData.langDir"
				>{{ implementationTypeLabelData.label }}</label>
			</template>
			<template #value>
				<wl-z-object-key-value
					:key-path="`${ keyPath }.${ implementationType }`"
					:object-value="objectValue[ implementationType ]"
					:edit="edit"
					:skip-key="true"
					:skip-indent="isTypeCode"
					data-testid="implementation-content-block"
				></wl-z-object-key-value>
			</template>
		</wl-key-value-block>
	</div>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const useZObject = require( '../../composables/useZObject.js' );

// Base components
const KeyValueBlock = require( '../base/KeyValueBlock.vue' );
// Codex components
const { CdxMessage, CdxRadio } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-implementation',
	components: {
		'cdx-message': CdxMessage,
		'cdx-radio': CdxRadio,
		'wl-key-value-block': KeyValueBlock
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: [ String, Object ],
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const {
			getZImplementationContentType,
			getZImplementationFunctionZid
		} = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		// Data
		const functionKey = Constants.Z_IMPLEMENTATION_FUNCTION;

		// Computed properties
		/**
		 * Returns the LabelData object for the implementation Function/Z14K1 key
		 *
		 * @return {LabelData}
		 */
		const functionLabelData = computed( () => store.getLabelData( Constants.Z_IMPLEMENTATION_FUNCTION ) );

		/**
		 * Return the zid of the target function for this implementation
		 *
		 * @return {string | undefined }
		 */
		const functionZid = computed( () => getZImplementationFunctionZid( props.objectValue ) );

		/**
		 * Active implementation key, that which contains the implementation
		 * content. The values are Z14K2 for composition, Z14K3 for code or
		 * Z14K4 for built-in.
		 */
		const implementationType = computed( {
			/**
			 * Returns the implementation type or key which is selected
			 *
			 * @return {string}
			 */
			get: () => getZImplementationContentType( props.objectValue ),
			/**
			 * Sets the implementation type and initializes the value
			 * to a blank scaffolding depending on what key is selected
			 *
			 * @param {string} value
			 */
			set: ( value ) => {
				if ( props.edit ) {
					emit( 'set-value', {
						keyPath: [ value ],
						value: ''
					} );
				}
			}
		} );

		/**
		 * Returns the LabelData object for the implementation type
		 *
		 * @return {LabelData}
		 */
		const implementationTypeLabelData = computed( () => store.getLabelData( implementationType.value ) );

		/**
		 * Returns the LabelData object for the type zid Implementation/Z14
		 *
		 * @return {LabelData}
		 */
		const implementationLabelData = computed( () => store.getLabelData( Constants.Z_IMPLEMENTATION ) );

		/**
		 * Whether the implementation content is of type code (Z14K3)
		 *
		 * @return {boolean}
		 */
		const isTypeCode = computed( () => implementationType.value === Constants.Z_IMPLEMENTATION_CODE );

		/**
		 * Whether the implementation content is of type builtin (Z14K4)
		 *
		 * @return {boolean}
		 */
		const isTypeBuiltin = computed( () => implementationType.value === Constants.Z_IMPLEMENTATION_BUILT_IN );

		/**
		 * Returns the formatted choices for the Codex Radio component
		 * to select the type of implementation (code vs composition)
		 *
		 * @return {Array}
		 */
		const radioChoices = computed( () => [
			{
				labelData: store.getLabelData( Constants.Z_IMPLEMENTATION_CODE ),
				value: Constants.Z_IMPLEMENTATION_CODE
			},
			{
				labelData: store.getLabelData( Constants.Z_IMPLEMENTATION_COMPOSITION ),
				value: Constants.Z_IMPLEMENTATION_COMPOSITION
			}
		] );

		return {
			functionKey,
			functionLabelData,
			functionZid,
			implementationLabelData,
			implementationType,
			implementationTypeLabelData,
			isTypeBuiltin,
			isTypeCode,
			radioChoices,
			i18n
		};
	},
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
