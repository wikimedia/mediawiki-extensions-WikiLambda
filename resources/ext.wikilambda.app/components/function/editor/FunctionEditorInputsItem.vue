<!--
	WikiLambda Vue component for an individual input to be set for a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-editor-inputs-item" data-testid="input-list-item">
		<!-- Per-input label -->
		<div class="ext-wikilambda-app-function-editor-inputs-item__header">
			<span class="ext-wikilambda-app-function-editor-inputs-item__label">
				{{ inputFieldLabel }}
			</span>
			<cdx-button
				v-if="canEditType"
				weight="quiet"
				class="ext-wikilambda-app-function-editor-inputs-item__action-delete"
				:aria-label="$i18n( 'wikilambda-function-definition-inputs-item-remove' ).text()"
				data-testid="remove-input"
				@click="removeInput"
			>
				<cdx-icon
					:icon="iconTrash"
					class="ext-wikilambda-app-function-editor-inputs-item__icon-trash"></cdx-icon>
			</cdx-button>
		</div>

		<!-- Input fields -->
		<div class="ext-wikilambda-app-function-editor-inputs-item__body">
			<!-- Label field: always active -->
			<cdx-field
				class="ext-wikilambda-app-function-editor-inputs-item__field"
				data-testid="function-editor-input-item-label"
			>
				<template #label>
					{{ inputLabelTitle }}
				</template>
				<cdx-text-input
					:lang="input ? langLabelData.langCode : undefined"
					:dir="input ? langLabelData.langDir : undefined"
					:model-value="input ? input.value : ''"
					:placeholder="inputLabelFieldPlaceholder"
					:aria-label="inputLabelFieldPlaceholder"
					:maxlength="maxInputLabelChars"
					@input="updateRemainingChars"
					@change="persistInputLabel"
				></cdx-text-input>
				<div class="ext-wikilambda-app-function-editor-inputs-item__counter">
					{{ remainingChars }}
				</div>
			</cdx-field>
			<!-- Type field: only first block -->
			<wl-type-selector
				v-if="isMainLanguageBlock && input"
				class="ext-wikilambda-app-function-editor-inputs-item__field"
				data-testid="function-editor-input-item-type"
				:key-path="input.typeKeyPath"
				:object-value="input.type"
				:label-data="inputTypeLabel"
				:disabled="!canEditType"
				:placeholder="inputTypeFieldPlaceholder"
			></wl-type-selector>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const icons = require( './../../../../lib/icons.json' );
const LabelData = require( '../../../store/classes/LabelData.js' );
const useMainStore = require( '../../../store/index.js' );

// Base components
const TypeSelector = require( '../../base/TypeSelector.vue' );
// Codex components
const { CdxButton, CdxField, CdxIcon, CdxTextInput } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-inputs-item',
	components: {
		'wl-type-selector': TypeSelector,
		'cdx-button': CdxButton,
		'cdx-field': CdxField,
		'cdx-icon': CdxIcon,
		'cdx-text-input': CdxTextInput
	},
	props: {
		/**
		 * Input data with key, type and label for the given language
		 */
		input: {
			type: Object,
			required: true
		},
		/**
		 * Index for this input in the list of inputs (zero-lead, excluding benjamin item)
		 */
		index: {
			type: Number,
			required: true
		},
		/**
		 * If this input is in the main language block
		 */
		isMainLanguageBlock: {
			type: Boolean,
			required: true
		},
		/**
		 * if user has permissions to edit the input type
		 */
		canEditType: {
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
			required: true
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
			maxInputLabelChars: Constants.INPUT_CHARS_MAX,
			remainingChars: Constants.INPUT_CHARS_MAX,
			iconTrash: icons.cdxIconTrash
		};
	},
	computed: {
		/**
		 * Returns the label and index for the current input.
		 * If not active, returns label, index and selected type.
		 *
		 * @return {string}
		 */
		inputFieldLabel: function () {
			const inputNumber = this.index + 1;
			return this.$i18n( 'wikilambda-function-viewer-details-input-number', inputNumber ).text();
		},
		/**
		 * Returns the title for the input label field
		 *
		 * @return {string}
		 */
		inputLabelTitle: function () {
			return this.$i18n( 'wikilambda-function-definition-input-item-label' ).text();
		},
		/**
		 * Returns the placeholder for the input label field
		 *
		 * @return {string}
		 */
		inputLabelFieldPlaceholder: function () {
			return this.$i18n( 'wikilambda-function-definition-inputs-item-input-placeholder' ).text();
		},
		/**
		 * Returns the title for the input type field
		 *
		 * @return {string}
		 */
		inputTypeLabel: function () {
			return LabelData.fromString(
				this.$i18n( 'wikilambda-function-definition-input-item-type' ).text()
			);
		},
		/**
		 * Returns the placeholder for the input type field
		 *
		 * @return {string}
		 */
		inputTypeFieldPlaceholder: function () {
			return this.$i18n( 'wikilambda-function-definition-inputs-item-selector-placeholder' ).text();
		}
	},
	methods: Object.assign( {}, mapActions( useMainStore, [
		'setZMonolingualString'
	] ), {
		/**
		 * Updates the remainingChars data property as the user types into the Z2K2 field
		 *
		 * @param {Event} event - the event object that is automatically passed in on input
		 */
		updateRemainingChars: function ( event ) {
			const { length } = event.target.value;
			this.remainingChars = this.maxInputLabelChars - length;
		},
		/**
		 * Removes the input given by its index (zero-lead, excluding benjamin item)
		 */
		removeInput: function () {
			this.$emit( 'remove', this.index );
		},
		/**
		 * Persist the new input label in the globally stored object
		 *
		 * @param {Object} event
		 */
		persistInputLabel: function ( event ) {
			this.setZMonolingualString( {
				parentKeyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_ARGUMENTS,
					String( this.index + 1 ),
					Constants.Z_ARGUMENT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				],
				itemKeyPath: this.input ? this.input.keyPath : undefined,
				value: event.target.value,
				lang: this.zLanguage
			} );
			this.$emit( 'argument-label-updated' );
		}
	} ),
	mounted: function () {
		this.$nextTick( function () {
			this.remainingChars = this.maxInputLabelChars - ( this.input ? this.input.value.length : 0 );
		} );
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-editor-inputs-item {
	border-radius: @border-radius-base;
	border: @border-subtle;
	padding: @spacing-35 @spacing-75 @spacing-75;
	margin-bottom: @spacing-100;

	.ext-wikilambda-app-function-editor-inputs-item__counter {
		color: @color-subtle;
		margin-left: @spacing-50;
		display: flex;
		justify-content: flex-end;
	}

	.ext-wikilambda-app-function-editor-inputs-item__header {
		display: flex;
		flex-direction: row;
		margin-bottom: @spacing-100;
		margin-right: -@spacing-35;
		align-items: center;
	}

	.ext-wikilambda-app-function-editor-inputs-item__label {
		flex-grow: 1;
		font-weight: @font-weight-bold;
		display: inline-block;
	}

	.ext-wikilambda-app-function-editor-inputs-item__action-delete {
		flex-grow: 0;
	}

	.ext-wikilambda-app-function-editor-inputs-item__body {
		width: 100%;
		box-sizing: border-box;
		padding: 0;
	}

	.ext-wikilambda-app-function-editor-inputs-item__field {
		margin-bottom: @spacing-100;

		&:last-child {
			margin-bottom: 0;
		}

		.cdx-label__label__text {
			font-weight: @font-weight-normal;
		}
	}
}
</style>
