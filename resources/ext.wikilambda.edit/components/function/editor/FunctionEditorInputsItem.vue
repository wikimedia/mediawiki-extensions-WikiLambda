<!--
	WikiLambda Vue component for an individual input to be set for a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-editor-input-list-item">
		<!-- Per-input label -->
		<div class="ext-wikilambda-editor-input-list-item__header">
			<span class="ext-wikilambda-editor-input-list-item__header__text">
				{{ inputFieldLabel }}
			</span>
			<cdx-button
				v-if="canEditType"
				weight="quiet"
				class="ext-wikilambda-editor-input-list-item__header__action-delete"
				:aria-label="$i18n( 'wikilambda-function-definition-inputs-item-remove' ).text()"
				@click="removeInput"
			>
				<cdx-icon :icon="icons.cdxIconTrash"></cdx-icon>
			</cdx-button>
		</div>

		<!-- Input fields -->
		<div class="ext-wikilambda-editor-input-list-item__body">
			<!-- Label field: always active -->
			<cdx-field
				class="ext-wikilambda-editor-input-list-item__body__field"
				data-testid="function-editor-input-item-label"
			>
				<template #label>
					{{ inputLabelTitle }}
				</template>
				<cdx-text-input
					:model-value="inputLabel"
					:placeholder="inputLabelFieldPlaceholder"
					:aria-label="inputLabelFieldPlaceholder"
					:max-chars="maxLabelChars"
					@change="persistInputLabel"
				></cdx-text-input>
			</cdx-field>
			<!-- Type field: only first block -->
			<wl-type-selector
				v-if="isMainLanguageBlock"
				class="ext-wikilambda-editor-input-list-item__body__field"
				data-testid="function-editor-input-item-type"
				:row-id="inputTypeRowId"
				:type="typeZid"
				:label="inputTypeTitle"
				:disabled="!canEditType"
				:placeholder="inputTypeFieldPlaceholder"
			></wl-type-selector>
		</div>
	</div>
</template>

<script>
const Constants = require( '../../../Constants.js' ),
	TypeSelector = require( '../../base/TypeSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxField = require( '@wikimedia/codex' ).CdxField,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput,
	icons = require( './../../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-editor-inputs-item',
	components: {
		'wl-type-selector': TypeSelector,
		'cdx-button': CdxButton,
		'cdx-field': CdxField,
		'cdx-icon': CdxIcon,
		'cdx-text-input': CdxTextInput
	},
	props: {
		rowId: {
			type: Number,
			required: true
		},
		/**
		 * Index for this input in the list of inputs (zero-lead)
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
		}
	},
	data: function () {
		return {
			typeZid: Constants.Z_TYPE,
			maxLabelChars: Constants.LABEL_CHARS_MAX,
			icons: icons
		};
	},
	computed: $.extend( mapGetters( [
		'getRowByKeyPath',
		'getZArgumentLabelForLanguage',
		'getZArgumentTypeRowId',
		'getUserLangCode',
		'getZMonolingualTextValue'
	] ), {
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
		 * Returns the row of the input label in the given language
		 * or undefined if not found.
		 *
		 * @return {Object|undefined}
		 */
		inputLabelRow: function () {
			return this.getZArgumentLabelForLanguage( this.rowId, this.zLanguage );
		},
		/**
		 * Returns the string value of the input label in the given
		 * language or empty string if undefined.
		 *
		 * @return {string}
		 */
		inputLabel: function () {
			return this.inputLabelRow ?
				this.getZMonolingualTextValue( this.inputLabelRow.id ) :
				'';
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
		 * Returns the row Id of the current input type
		 * or undefined if not found.
		 *
		 * @return {number|undefined}
		 */
		inputTypeRowId: function () {
			return this.getZArgumentTypeRowId( this.rowId );
		},
		/**
		 * Returns the title for the input type field
		 *
		 * @return {string}
		 */
		inputTypeTitle: function () {
			return this.$i18n( 'wikilambda-function-definition-input-item-type' ).text();
		},
		/**
		 * Returns the placeholder for the input type field
		 *
		 * @return {string}
		 */
		inputTypeFieldPlaceholder: function () {
			return this.$i18n( 'wikilambda-function-definition-inputs-item-selector-placeholder' ).text();
		}
	} ),
	methods: $.extend( mapActions( [
		'changeType',
		'setValueByRowIdAndPath',
		'removeItemFromTypedList'
	] ), {
		/**
		 * Removes the input given by this rowId
		 */
		removeInput: function () {
			this.$emit( 'remove', this.rowId );
		},
		/**
		 * Persist the new input label in the globally stored object
		 *
		 * @param {Object} event
		 */
		persistInputLabel: function ( event ) {
			const value = event.target.value;
			if ( this.inputLabelRow ) {
				if ( value === '' ) {
					this.removeItemFromTypedList( { rowId: this.inputLabelRow.id } );
				} else {
					this.setValueByRowIdAndPath( {
						rowId: this.inputLabelRow.id,
						keyPath: [
							Constants.Z_MONOLINGUALSTRING_VALUE,
							Constants.Z_STRING_VALUE
						],
						value
					} );
				}
			} else {
				// If this.inputLabelRow is undefined, there's no monolingual string
				// for the given language, so we create a new monolingual string
				// with the new value and append to the parent list.
				const parentRow = this.getRowByKeyPath( [
					Constants.Z_ARGUMENT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				], this.rowId );
				this.changeType( {
					id: parentRow.id,
					type: Constants.Z_MONOLINGUALSTRING,
					lang: this.zLanguage,
					value,
					append: true
				} );
			}
			this.$emit( 'update-argument-label' );
		}
	} )
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-editor-input-list-item {
	border-radius: @border-radius-base;
	border: @border-subtle;
	padding: @spacing-35 @spacing-75 @spacing-75;
	margin-bottom: @spacing-100;

	&__header {
		display: flex;
		flex-direction: row;
		margin-bottom: @spacing-100;
		margin-right: -@spacing-35;

		&__text {
			flex-grow: 1;
			font-weight: @font-weight-bold;
			display: inline-block;
			line-height: @size-200;
		}

		&__action-delete {
			flex-grow: 0;

			.cdx-icon {
				width: @size-100;
				height: @size-100;
			}
		}
	}

	&__body {
		width: 100%;
		box-sizing: border-box;
		padding: 0;

		&__field {
			margin-bottom: @spacing-100;

			&:last-child {
				margin-bottom: 0;
			}

			.cdx-label__label__text {
				font-weight: @font-weight-normal;
			}
		}
	}
}
</style>
