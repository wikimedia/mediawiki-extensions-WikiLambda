<!--
	WikiLambda Vue component for Z18/Argument Reference objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-argument-reference"
		data-testid="z-argument-reference"
	>
		<template v-if="!edit">
			<cdx-icon :icon="icon"></cdx-icon>
			<span
				:lang="argumentLabelData.langCode"
				:dir="argumentLabelData.langDir"
			>{{ argumentLabelData.label }}</span>
		</template>
		<cdx-select
			v-else
			:selected="argumentKey"
			:menu-items="argumentOptions"
			:default-label="i18n( 'wikilambda-argument-reference-selector-placeholder' ).text()"
			:status="errorSelectStatus"
			@update:selected="setValue"
		></cdx-select>
		<div
			v-if="hasFieldErrors"
			class="ext-wikilambda-app-argument-reference__errors"
		>
			<cdx-message
				v-for="( error, index ) in fieldErrors"
				:key="`field-error-${ index }`"
				:type="error.type"
				:inline="true"
			>
				<wl-safe-message :error="error"></wl-safe-message>
			</cdx-message>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useError = require( '../../composables/useError.js' );
const useZObject = require( '../../composables/useZObject.js' );
const useMainStore = require( '../../store/index.js' );
const { isTypeCompatible } = require( '../../utils/typeUtils.js' );
const icons = require( '../../../lib/icons.json' );

// Base components:
const SafeMessage = require( '../base/SafeMessage.vue' );
// Codex components
const { CdxIcon, CdxMessage, CdxSelect } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-argument-reference',
	components: {
		'cdx-select': CdxSelect,
		'cdx-icon': CdxIcon,
		'cdx-message': CdxMessage,
		'wl-safe-message': SafeMessage
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		expectedType: {
			type: [ String, Object ],
			required: true
		},
		parentExpectedType: {
			type: [ String, Object ],
			required: true
		}
	},
	emits: [ 'set-value' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const { hasFieldErrors, fieldErrors } = useError( { keyPath: props.keyPath } );
		const {
			getZArgumentReferenceTerminalValue,
			getZStringTerminalValue,
			key
		} = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		// Constants
		const icon = icons.cdxIconFunctionArgument;

		// Argument data
		/**
		 * Returns the key of the selected argument reference,
		 * if any. Else, returns empty string.
		 *
		 * @return {string}
		 */
		const argumentKey = computed( () => key.value === Constants.Z_ARGUMENT_REFERENCE_KEY ?
			getZStringTerminalValue( props.objectValue ) :
			getZArgumentReferenceTerminalValue( props.objectValue ) );

		/**
		 * Returns the label of the selected argument reference,
		 * if any. Else returns the argument reference key.
		 *
		 * @return {LabelData}
		 */
		const argumentLabelData = computed( () => store.getLabelData( argumentKey.value ) );

		/**
		 * Whether to disable the argument item in the selector, depending
		 * on whether the argument type is compatible with the expectedType
		 * for the key.
		 *
		 * NOTE: We only show disabled arguments inside Abstract Content fragments,
		 * where page arguments are known and controlled. Also, we consider wikidata
		 * reference fully compatible to use in both and wikidata item and item
		 * reference keys.
		 *
		 * @param {Mixed} actual - canonical form for the type of the argument
		 * @return {boolean}
		 */
		function checkDisabledByType( actual ) {
			// Don't disable arguments in Wikifunctions, only in AW Content
			if ( store.isAbstractContent() ) {
				// If component is expanded, the expected type is the parent's one, else this
				const expected = key.value === Constants.Z_ARGUMENT_REFERENCE_KEY ?
					props.parentExpectedType :
					props.expectedType;
				// Any slot that expects Wikidata Item can also use the Wikidata Item Reference arg
				const unifiedWikidataTypes = expected === Constants.Z_WIKIDATA_ITEM ?
					Constants.Z_WIKIDATA_REFERENCE_ITEM :
					expected;
				return !isTypeCompatible( actual, unifiedWikidataTypes );
			}
			return false;
		}

		/**
		 * Returns the available argument references options
		 * formatted for the CdxSelect component.
		 * The options will be the union of all the argument references
		 * of the function being implemented in the current composition.
		 *
		 * @return {Array} Array of codex MenuItemData objects
		 */
		const argumentOptions = computed( () => store
			.getInputsOfFunctionZid( store.getCurrentTargetFunctionZid )
			.map( ( arg ) => ( {
				value: arg[ Constants.Z_ARGUMENT_KEY ],
				label: store.getLabelData( arg[ Constants.Z_ARGUMENT_KEY ] ).label,
				icon: icons.cdxIconFunctionArgument,
				disabled: checkDisabledByType( arg[ Constants.Z_ARGUMENT_TYPE ] )
			} ) ) );

		// Select

		/**
		 * Status property for the Select component (ValidateStatusType).
		 * Can take the values 'default' or 'error':
		 * https://doc.wikimedia.org/codex/latest/components/types-and-constants.html#validationstatustype
		 *
		 * @return {string}
		 */
		const errorSelectStatus = computed( () => hasFieldErrors.value ? 'error' : 'default' );

		/**
		 * Emits the event setValue so that ZObjectKey can update
		 * the terminal value in the ZObject data table. This component can
		 * be shown both in the collapsed version (hence set the value of the
		 * Z18K1->Z6K1 sequence of keys) or in the expanded one (hence just
		 * setting the string value Z6K1 of the current Z18K1 key).
		 *
		 * @param {string} value
		 */
		function setValue( value ) {
			let keyPath;
			if ( key.value === Constants.Z_ARGUMENT_REFERENCE_KEY ) {
				keyPath = [ Constants.Z_STRING_VALUE ];
			} else {
				keyPath = [
					Constants.Z_ARGUMENT_REFERENCE_KEY,
					Constants.Z_STRING_VALUE
				];
			}
			emit( 'set-value', { keyPath, value } );
		}

		return {
			argumentKey,
			argumentLabelData,
			argumentOptions,
			i18n,
			errorSelectStatus,
			fieldErrors,
			hasFieldErrors,
			icon,
			setValue
		};
	}
} );

</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-argument-reference {
	.ext-wikilambda-app-argument-reference__errors {
		margin-top: @spacing-50;
	}
}
</style>
