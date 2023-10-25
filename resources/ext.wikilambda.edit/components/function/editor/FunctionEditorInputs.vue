<!--
	WikiLambda Vue component for setting the inputs of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-definition-inputs">
		<!-- Global inputs label if we are in desktop -->
		<div
			v-if="!isMobile"
			:id="inputsFieldId"
			class="ext-wikilambda-function-definition-inputs__label"
		>
			<div class="ext-wikilambda-function-definition-inputs__label-block">
				<label
					class="ext-wikilambda-app__text-regular"
					aria-labelledby="wikilambda-function-definition-inputs-label"
				>
					{{ inputsLabel }}
					<span>{{ inputsOptional }}</span>
				</label>
				<wl-tooltip
					v-if="tooltipMessage && !canEdit"
					:content="tooltipMessage"
				>
					<cdx-icon
						v-if="tooltipIcon"
						class="ext-wikilambda-function-definition-inputs__tooltip-icon"
						:icon="tooltipIcon">
					</cdx-icon>
				</wl-tooltip>
			</div>
			<span class="ext-wikilambda-function-definition-inputs__description">
				{{ inputsFieldDescription }}
				<a :href="listObjectsUrl" target="_blank">{{ listObjectsLink }}</a>
			</span>
		</div>
		<!-- List of input fields -->
		<div
			:aria-labelledby="inputsFieldId"
			class="ext-wikilambda-function-definition-inputs__inputs"
			:class="{ 'ext-wikilambda-function-definition-inputs__padded': isMainLanguageBlock }"
		>
			<wl-function-editor-inputs-item
				v-for="( input, index ) in inputs"
				:key="'input-item-' + zLanguage + '-' + input.key"
				data-testid="function-editor-input-item"
				:row-id="input.id"
				:index="index"
				class="ext-wikilambda-function-definition-inputs__row"
				:z-language="zLanguage"
				:can-edit-type="canEdit"
				:is-mobile="isMobile"
				:is-active="activeInputIndex === index"
				:is-main-language-block="isMainLanguageBlock"
				:show-index="inputs.length > 1"
				@update-argument-label="updateArgumentLabel"
				@active-input="setActiveInput"
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
	</div>
</template>

<script>
const Constants = require( '../../../Constants.js' ),
	FunctionEditorInputsItem = require( './FunctionEditorInputsItem.vue' ),
	Tooltip = require( '../../base/Tooltip.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( './../../../../lib/icons.json' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-function-editor-inputs',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'wl-function-editor-inputs-item': FunctionEditorInputsItem,
		'wl-tooltip': Tooltip
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
		 * device screensize is mobile
		 */
		isMobile: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			icons: icons,
			activeInputIndex: this.isMainLanguageBlock ? 0 : -1
		};
	},
	computed: $.extend( mapGetters( [
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
			// return this.getLabel( Constants.Z_FUNCTION_ARGUMENTS );
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
			return `ext-wikilambda-function-definition-inputs__label_${this.zLanguage}`;
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
				'ext-wikilambda-function-definition-inputs__add-input-button' :
				'ext-wikilambda-function-definition-inputs__add-another-input-button';
		}
	} ),
	methods: $.extend( mapActions( [
		'changeType'
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
			} ).then( () => {
				this.setActiveInput( this.inputs.length - 1 );
			} );
		},
		/**
		 * Sets the given input index as active
		 *
		 * @param {number} index
		 */
		setActiveInput: function ( index ) {
			this.activeInputIndex = index;
		},
		/**
		 * Emits the event updated-argument-label
		 */
		updateArgumentLabel: function () {
			this.$emit( 'updated-argument-label' );
		}
	} )
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-definition-inputs {
	display: flex;
	margin-bottom: @spacing-150;

	&__label-block {
		display: flex;
		align-items: center;

		& > label {
			line-height: @spacing-200;
			font-weight: @font-weight-bold;

			& > span {
				color: @color-subtle;
				font-weight: @font-weight-normal;
			}
		}
	}

	&__label {
		display: flex;
		flex-direction: column;
		width: @wl-field-label-width;
		margin-right: @spacing-150;
	}

	& > div:first-of-type {
		width: @wl-field-label-width;
		flex-direction: column;
	}

	&__tooltip-icon {
		margin-left: @spacing-50;
		width: @size-100;
		height: @size-100;
	}

	&__description {
		color: @color-subtle;
		font-size: @font-size-small;
		line-height: @line-height-small;
		display: inline-block;
	}

	&__row {
		display: flex;
		gap: @spacing-50;
	}

	/* DESKTOP styles */
	@media screen and ( min-width: @min-width-breakpoint-tablet ) {
		&__row:last-of-type {
			margin-bottom: @spacing-50;
		}

		&__row:first-of-type {
			.ext-wikilambda-editor-input-list-item__header__action-delete {
				margin-top: @spacing-200;
			}
		}
	}

	/* MOBILE styles */
	@media screen and ( max-width: @max-width-breakpoint-mobile ) {
		display: block;

		&__row {
			display: block;
		}

		&__label {
			& > label {
				line-height: inherit;
			}
		}

		&__description {
			margin-bottom: @spacing-50;
		}

		& > div:first-of-type {
			width: auto;
		}
	}
}
</style>
