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
				{{ inputsLabel }}
				<span>{{ inputsOptional }}</span>
			</label>
		</template>
		<template #description>
			{{ inputsFieldDescription }}
			<a :href="listObjectsUrl" target="_blank">{{ listObjectsLink }}</a>
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
					:class="addInputButtonClass"
					@click="addNewItem"
				>
					<cdx-icon :icon="iconAdd"></cdx-icon>
					{{ addNewItemText }}
				</cdx-button>
			</div>
		</template>
	</wl-function-editor-field>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

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
	data: function () {
		return {
			iconAdd: icons.cdxIconAdd
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getZFunctionInputLabels',
		'getUserLangCode'
	] ), {
		/**
		 * List of inputs, in hybrid format (without benjamin item)
		 *
		 * @return {Array}
		 */
		inputs: function () {
			return this.getZFunctionInputLabels( this.zLanguage );
		},
		/**
		 * Returns the label for the inputs field
		 *
		 * @return {string}
		 */
		inputsLabel: function () {
			// TODO (T335583): Replace i18n message with key label
			// return this.getLabelData( Constants.Z_FUNCTION_ARGUMENTS );
			return this.$i18n( 'wikilambda-function-definition-inputs-label' ).text();
		},
		/**
		 * Returns the "optional" caption for the inputs field
		 *
		 * @return {string}
		 */
		inputsOptional: function () {
			return this.$i18n( 'parentheses', [ this.$i18n( 'wikilambda-optional' ).text() ] ).text();
		},
		/**
		 * Returns the id for the input field
		 *
		 * @return {string}
		 */
		inputsFieldId: function () {
			return `ext-wikilambda-app-function-editor-inputs__label-${ this.zLanguage }`;
		},
		/**
		 * Returns the description for the inputs field
		 *
		 * @return {string}
		 */
		inputsFieldDescription: function () {
			return this.$i18n( 'wikilambda-function-definition-inputs-description' ).text();
		},
		/**
		 * Returns the URL to the Special page List Object by Type
		 *
		 * @return {string}
		 */
		listObjectsUrl: function () {
			return new mw.Title( Constants.PATHS.LIST_OBJECTS_BY_TYPE_TYPE )
				.getUrl( { uselang: this.getUserLangCode } );
		},
		/**
		 * Returns the text for the link to the Special page List Object by Type
		 *
		 * @return {string}
		 */
		listObjectsLink: function () {
			return this.$i18n( 'wikilambda-function-definition-input-types' ).text();
		},
		/**
		 * Returns the text of the button to add a new input
		 *
		 * @return {string}
		 */
		addNewItemText: function () {
			return this.inputs.length === 0 ?
				this.$i18n( 'wikilambda-function-definition-inputs-item-add-first-input-button' ).text() :
				this.$i18n( 'wikilambda-function-definition-inputs-item-add-input-button' ).text();
		},
		/**
		 * Returns the class name of the button to add a new input
		 *
		 * @return {string}
		 */
		addInputButtonClass: function () {
			return this.inputs.length === 0 ?
				'ext-wikilambda-app-function-editor-inputs__action-add' :
				'ext-wikilambda-app-function-editor-inputs__action-add-another';
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'createObjectByType',
		'pushItemsByKeyPath',
		'deleteListItemsByKeyPath'
	] ), {
		/**
		 * Add a new input item to the function inputs list
		 */
		addNewItem: function () {
			const value = canonicalToHybrid( this.createObjectByType( { type: Constants.Z_ARGUMENT } ) );
			this.pushItemsByKeyPath( {
				keyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_ARGUMENTS
				],
				values: [ value ]
			} );
		},
		/**
		 * Removes an item from the list of inputs
		 *
		 * @param {number} index
		 */
		removeItem: function ( index ) {
			const itemIndex = String( ( Number( index ) + 1 ) );
			this.deleteListItemsByKeyPath( {
				keyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_ARGUMENTS
				],
				indexes: [ itemIndex ]
			} );
		},
		/**
		 * Emits the event argument-label-updated
		 */
		updateArgumentLabel: function () {
			this.$emit( 'argument-label-updated' );
		}
	} )
} );
</script>
