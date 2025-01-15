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
					:key="'input-' + input.id + '-lang-' + zLanguage"
					data-testid="function-editor-input-item"
					:row-id="input.id"
					:index="index"
					:lang-label-data="langLabelData"
					:z-language="zLanguage"
					:can-edit-type="canEdit"
					:is-main-language-block="isMainLanguageBlock"
					@remove="removeItem"
					@update-argument-label="updateArgumentLabel"
				></wl-function-editor-inputs-item>
				<cdx-button
					v-if="canEdit"
					:class="addInputButtonClass"
					@click="addNewItem"
				>
					<cdx-icon :icon="icons.cdxIconAdd"></cdx-icon>
					{{ addNewItemText }}
				</cdx-button>
			</div>
		</template>
	</wl-function-editor-field>
</template>

<script>
const { CdxButton, CdxIcon, CdxTooltip } = require( '@wikimedia/codex' );
const { defineComponent } = require( 'vue' );
const Constants = require( '../../../Constants.js' ),
	LabelData = require( '../../../store/classes/LabelData.js' ),
	FunctionEditorField = require( './FunctionEditorField.vue' ),
	FunctionEditorInputsItem = require( './FunctionEditorInputsItem.vue' ),
	icons = require( './../../../../lib/icons.json' ),
	{ mapActions, mapGetters } = require( 'vuex' );

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
		rowId: {
			type: Number,
			default: 0
		},
		isMainLanguageBlock: {
			type: Boolean,
			required: true
		},
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
		 * icon that will display a tooltip
		 */
		tooltipIcon: {
			type: [ String, Object ],
			default: null
		},
		/**
		 * if a user has permission to edit a function
		 */
		canEdit: {
			type: Boolean,
			default: false
		},
		/**
		 * message the tooltip displays
		 */
		tooltipMessage: {
			type: String,
			default: null
		},
		/**
		 * Label data for the language
		 */
		langLabelData: {
			type: LabelData,
			default: null
		}
	},
	data: function () {
		return {
			icons: icons
		};
	},
	computed: Object.assign( mapGetters( [
		'getZFunctionInputs',
		'getRowByKeyPath',
		'getUserLangCode'
	] ), {
		/**
		 * List of inputs
		 *
		 * @return {Array}
		 */
		inputs: function () {
			return this.getZFunctionInputs();
		},
		/**
		 * Returns the rowId of the inputs list
		 *
		 * @return {number}
		 */
		inputsListRowId: function () {
			return this.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_ARGUMENTS
			], this.rowId ).id;
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
	methods: Object.assign( mapActions( [
		'changeType',
		'removeItemFromTypedList'
	] ), {
		/**
		 * Add a new input item to the function inputs list
		 */
		addNewItem: function () {
			this.changeType( {
				type: Constants.Z_ARGUMENT,
				id: this.inputsListRowId,
				lang: this.zLanguage,
				append: true
			} );
		},
		/**
		 * Removes an item from the list of inputs
		 *
		 * @param {number} rowId
		 */
		removeItem: function ( rowId ) {
			this.removeItemFromTypedList( { rowId } );
		},
		/**
		 * Emits the event updated-argument-label
		 */
		updateArgumentLabel: function () {
			this.$emit( 'updated-argument-label' );
		}
	} )
} );
</script>
