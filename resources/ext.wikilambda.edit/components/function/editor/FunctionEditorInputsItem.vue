<!--
	WikiLambda Vue component for an individual input to be set for a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-editor-input-list-item" role="inputs-item-container">
		<!-- Per-input label if we are in mobile -->
		<div
			v-if="isMobile"
			class="ext-wikilambda-editor-input-list-item__header"
			:class="{ 'ext-wikilambda-editor-input-list-item__header--active': isActive }"
		>
			<cdx-button
				weight="quiet"
				class="ext-wikilambda-editor-input-list-item__header__action-expand"
				@click="toggleActive"
			>
				<cdx-icon :icon="icons.cdxIconExpand"></cdx-icon>
			</cdx-button>
			<span class="ext-wikilambda-editor-input-list-item__header__text">
				{{ inputFieldLabel }}
			</span>
			<cdx-button
				v-if="canEditType"
				weight="quiet"
				class="ext-wikilambda-editor-input-list-item__header__action-delete"
				@click="removeInput"
			>
				<cdx-icon :icon="icons.cdxIconTrash"></cdx-icon>
			</cdx-button>
		</div>
		<!-- Input field -->
		<div class="ext-wikilambda-editor-input-list-item__body">
			<span
				v-if="isMobile"
				class="ext-wikilambda-editor-input-list-item__body__description"
			>
				{{ inputFieldDescription }}
				<a :href="listObjectsUrl" target="_blank">{{ listObjectsLink }}</a>
			</span>
			<div
				v-if="isMainLanguageBlock"
				data-testid="function-editor-input-item-type"
				class="ext-wikilambda-editor-input-list-item__body__entry"
			>
				<span
					v-if="index === 0 || isMobile"
					class="ext-wikilambda-editor-input-list-item__body__entry-text"
				>
					{{ inputTypeTitle }}
				</span>
				<wl-z-object-selector
					v-if="( !canEditType && inputType ) || canEditType"
					class="
						ext-wikilambda-editor-input-list-item__body__entry-field
						ext-wikilambda-editor-input-list-item__selector"
					:disabled="!canEditType"
					:placeholder="inputTypeFieldPlaceholder"
					:row-id="inputTypeRowId"
					:selected-zid="inputType"
					:type="typeZid"
					@input="persistInputType"
				></wl-z-object-selector>
			</div>
			<div
				data-testid="function-editor-input-item-label"
				class="ext-wikilambda-editor-input-list-item__body__entry"
			>
				<span
					v-if="index === 0 || isMobile"
					class="ext-wikilambda-editor-input-list-item__body__entry-text"
				>
					{{ inputLabelTitle }}
				</span>
				<cdx-text-input
					:model-value="inputLabel"
					class="
						ext-wikilambda-editor-input-list-item__body__entry-field
						ext-wikilambda-editor-input-list-item__label"
					:placeholder="inputLabelFieldPlaceholder"
					:aria-label="inputLabelFieldPlaceholder"
					:max-chars="maxLabelChars"
					@change="persistInputLabel"
				></cdx-text-input>
				<!-- TODO: Add a character counter to tell users they can't write messages that are too long. -->
			</div>
			<cdx-button
				v-if="canEditType && !isMobile"
				weight="quiet"
				class="ext-wikilambda-editor-input-list-item__header__action-delete"
				:aria-label="$i18n( 'wikilambda-function-definition-inputs-item-remove' ).text()"
				@click="removeInput"
			>
				<cdx-icon :icon="icons.cdxIconTrash"></cdx-icon>
			</cdx-button>
		</div>
	</div>
</template>

<script>
const Constants = require( '../../../Constants.js' ),
	ZObjectSelector = require( '../../ZObjectSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput,
	icons = require( './../../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-editor-inputs-item',
	components: {
		'wl-z-object-selector': ZObjectSelector,
		'cdx-icon': CdxIcon,
		'cdx-button': CdxButton,
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
		},
		/**
		 * device screensize is mobile
		 */
		isMobile: {
			type: Boolean,
			default: false
		},
		isActive: {
			type: Boolean,
			default: false
		},
		showIndex: {
			type: Boolean,
			default: false
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
		'getLabel',
		'getRowByKeyPath',
		'getZArgumentLabelForLanguage',
		'getZArgumentTypeRowId',
		'getUserLangCode',
		'getZMonolingualTextValue',
		'getZTypeStringRepresentation'
	] ), {
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
		 * Returns the string value of the current input type
		 * or empty string if not defined.
		 *
		 * @return {string}
		 */
		inputType: function () {
			return this.inputTypeRowId ?
				this.getZTypeStringRepresentation( this.inputTypeRowId ) :
				'';
		},
		/**
		 * Returns the label of the string value of the current
		 * input type or empty stirng if not defined
		 *
		 * @return {string}
		 */
		inputTypeLabel: function () {
			return this.inputType ? this.getLabel( this.inputType ) : '';
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
		},
		/**
		 * Returns the label and index for the current input.
		 * If not active, returns label, index and selected type.
		 *
		 * @return {string}
		 */
		inputFieldLabel: function () {
			const inputNumber = this.showIndex ? this.index + 1 : '';
			return this.$i18n( 'wikilambda-function-viewer-details-input-number', inputNumber ).text() +
				( this.inputTypeLabel && !this.isActive ? ': ' + this.inputTypeLabel : '' );
		},
		/**
		 * Returns the description for the inputs field
		 *
		 * @return {string}
		 */
		inputFieldDescription: function () {
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
			this.removeItemFromTypedList( { rowId: this.rowId } );
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
		},
		/**
		 * Persist the new input type in the global store
		 *
		 * @param {string|null} value
		 */
		persistInputType: function ( value ) {
			this.setValueByRowIdAndPath( {
				rowId: this.inputTypeRowId,
				keyPath: [ Constants.Z_REFERENCE_ID ],
				value: value || ''
			} );
		},
		/**
		 * On mobile, toggles active/inactive state of the
		 * input field group.
		 */
		toggleActive: function () {
			const index = this.isActive ? -1 : this.index;
			this.$emit( 'active-input', index );
		}
	} )
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-editor-input-list-item {
	flex-direction: column;
	padding-bottom: @spacing-50;

	&__label {
		width: 100%;
	}

	&__body {
		width: 100%;
		display: none;
		flex-direction: column;
		margin-bottom: 0;
		align-items: flex-start;

		&__entry {
			display: flex;
			align-items: center;
			gap: @spacing-100;
			margin-bottom: @spacing-50;

			&-text {
				font-weight: @font-weight-bold;
				min-width: @size-300;
			}

			&-field {
				flex: 1;
			}
		}

		&__description {
			color: @color-subtle;
			font-size: @font-size-small;
			line-height: @line-height-small;
			display: inline-block;
			margin-bottom: @spacing-25;
		}
	}

	&__action-delete {
		.cdx-icon {
			width: @size-100;
			height: @size-100;
		}
	}

	&__header {
		display: flex;
		justify-content: space-between;
		width: 100%;

		&__text {
			flex-grow: 1;
			font-weight: @font-weight-bold;
			display: inline-block;
			line-height: @size-200;
			margin-left: @spacing-50;
		}

		&__action-expand {
			flex-grow: 0;

			.cdx-icon {
				width: @size-100;
				height: @size-100;
				transform: rotate( 180deg );
			}
		}

		&__action-delete {
			flex-grow: 0;

			.cdx-icon {
				width: @size-100;
				height: @size-100;
			}
		}

		&--active {
			.ext-wikilambda-editor-input-list-item__header__action-expand {
				.cdx-icon {
					transform: rotate( 0deg );
				}
			}

			+ .ext-wikilambda-editor-input-list-item__body {
				display: flex;
			}
		}
	}

	/* DESKTOP styles */
	@media screen and ( min-width: @min-width-breakpoint-tablet ) {
		padding: 0;
		flex-direction: row;
		border-bottom: 0;

		&:first-child {
			margin-top: 0;
		}

		&__row:first-of-type {
			.ext-wikilambda-editor-input-list-item__header__action-delete {
				margin-top: @spacing-200;
			}
		}

		&__body {
			display: flex;
			flex-direction: row;
			margin-bottom: @spacing-50;

			&__entry {
				margin-top: 0;
				margin-right: @spacing-50;
				display: block;
				margin-bottom: 0;

				&-text {
					display: block;
					line-height: @spacing-200;
				}
			}
		}

		&__selector {
			width: auto;
		}

		&__input {
			width: auto;
		}
	}
}
</style>
