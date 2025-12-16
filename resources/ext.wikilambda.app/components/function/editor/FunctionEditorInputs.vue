<!--
	WikiLambda Vue component for setting the list of inputs of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-function-editor-field
		class="ext-wikilambda-app-function-editor-inputs"
		:show-tooltip="tooltipMessage && !canEdit"
		:tooltip-message="tooltipMessage"
		:tooltip-icon="tooltipIcon">
		<template #label>
			<label :id="inputsFieldId">
				{{ i18n( 'wikilambda-function-definition-inputs-label' ).text() }}
				<span>{{ i18n( 'parentheses', [ i18n( 'wikilambda-optional' ).text() ] ).text() }}</span>
			</label>
		</template>
		<template #description>
			{{ i18n( 'wikilambda-function-definition-inputs-description' ).text() }}
			<a :href="listObjectsUrl" target="_blank">
				{{ i18n( 'wikilambda-function-definition-input-types' ).text() }}
			</a>
		</template>
		<template #body>
			<div :aria-labelledby="inputsFieldId">
				<wl-function-editor-inputs-item
					v-for="( input, index ) in inputs"
					:key="`input-${ input.key }-lang-${ zLanguage }`"
					data-testid="function-editor-input-item"
					:index="index"
					:input="input"
					:lang-label-data="langLabelData"
					:z-language="zLanguage"
					:can-edit-type="canEdit"
					:is-main-language-block="isMainLanguageBlock"
					@remove="removeItem"
					@argument-label-updated="updateArgumentLabel"
				></wl-function-editor-inputs-item>
				<cdx-button
					v-if="canEdit"
					:class="inputs.length === 0 ?
						'ext-wikilambda-app-function-editor-inputs__action-add' :
						'ext-wikilambda-app-function-editor-inputs__action-add-another'"
					@click="addNewItem"
				>
					<cdx-icon :icon="iconAdd"></cdx-icon>
					{{ inputs.length === 0 ?
						i18n( 'wikilambda-function-definition-inputs-item-add-first-input-button' ).text() :
						i18n( 'wikilambda-function-definition-inputs-item-add-input-button' ).text() }}
				</cdx-button>
			</div>
		</template>
	</wl-function-editor-field>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const icons = require( './../../../../lib/icons.json' );
const LabelData = require( '../../../store/classes/LabelData.js' );
const useMainStore = require( '../../../store/index.js' );
const { canonicalToHybrid } = require( '../../../utils/schemata.js' );

// Function editor components
const FunctionEditorField = require( './FunctionEditorField.vue' );
const FunctionEditorInputsItem = require( './FunctionEditorInputsItem.vue' );
// Codex components
const { CdxButton, CdxIcon, CdxTooltip } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-inputs',
	directives: {
		tooltip: CdxTooltip
	},
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'wl-function-editor-field': FunctionEditorField,
		'wl-function-editor-inputs-item': FunctionEditorInputsItem
	},
	props: {
		/**
		 * zID of item label language
		 *
		 * @example Z1014
		 */
		zLanguage: {
			type: String,
			default: ''
		},
		/**
		 * whether is the first language in the page
		 */
		isMainLanguageBlock: {
			type: Boolean,
			required: true
		},
		/**
		 * whether user has permission to edit the function
		 */
		canEdit: {
			type: Boolean,
			default: false
		},
		/**
		 * icon that will display a tooltip
		 */
		tooltipIcon: {
			type: [ String, Object ],
			default: null
		},
		/**
		 * message the tooltip displays
		 */
		tooltipMessage: {
			type: String,
			default: null
		},
		/**
		 * label data for the language
		 */
		langLabelData: {
			type: LabelData,
			default: null
		}
	},
	emits: [ 'argument-label-updated' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		// Constants
		const iconAdd = icons.cdxIconAdd;

		// Inputs data
		/**
		 * List of inputs, in hybrid format (without benjamin item)
		 *
		 * @return {Array}
		 */
		const inputs = computed( () => store.getZFunctionInputLabels( props.zLanguage ) );

		// Field display
		/**
		 * Returns the id for the input field
		 *
		 * @return {string}
		 */
		const inputsFieldId = computed( () => `ext-wikilambda-app-function-editor-inputs__label-${ props.zLanguage }` );

		/**
		 * Returns the URL to the Special page List Object by Type
		 *
		 * @return {string}
		 */
		const listObjectsUrl = computed( () => new mw.Title( Constants.PATHS.LIST_OBJECTS_BY_TYPE_TYPE )
			.getUrl( { uselang: store.getUserLangCode } )
		);

		// Actions
		/**
		 * Add a new input item to the function inputs list
		 */
		function addNewItem() {
			const value = canonicalToHybrid( store.createObjectByType( { type: Constants.Z_ARGUMENT } ) );
			store.pushItemsByKeyPath( {
				keyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_ARGUMENTS
				],
				values: [ value ]
			} );
		}

		/**
		 * Removes an item from the list of inputs
		 *
		 * @param {number} index
		 */
		function removeItem( index ) {
			const itemIndex = String( ( Number( index ) + 1 ) );
			store.deleteListItemsByKeyPath( {
				keyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_ARGUMENTS
				],
				indexes: [ itemIndex ]
			} );
		}

		/**
		 * Emits the event argument-label-updated
		 */
		function updateArgumentLabel() {
			emit( 'argument-label-updated' );
		}

		return {
			addNewItem,
			iconAdd,
			inputs,
			inputsFieldId,
			i18n,
			listObjectsUrl,
			removeItem,
			updateArgumentLabel
		};
	}
} );
</script>
