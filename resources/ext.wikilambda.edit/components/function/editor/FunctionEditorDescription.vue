<!--
	WikiLambda Vue component for setting the description of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-definition-description">
		<div class="ext-wikilambda-function-definition-description__label">
			<label
				:for="descriptionInputId"
				class="ext-wikilambda-app__text-regular"
			>
				{{ descriptionLabel }}
				<span>{{ descriptionOptional }}</span>
			</label>
		</div>
		<cdx-text-input
			:id="descriptionInputId"
			:model-value="description"
			class="ext-wikilambda-function-definition-description__input"
			:aria-label="descriptionLabel"
			:placeholder="descriptionInputPlaceholder"
			:max-chars="maxDescriptionChars"
			@change="persistDescription"
		></cdx-text-input>
		<!-- TODO: Add a character counter to tell users they can't write messages that are too long. -->
	</div>
</template>

<script>
const Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput;

// @vue/component
module.exports = exports = {
	name: 'wl-function-editor-description',
	components: {
		'cdx-text-input': CdxTextInput
	},
	props: {
		zLanguage: {
			type: String,
			required: true
		}
	},
	data: function () {
		return {
			maxDescriptionChars: Constants.LABEL_CHARS_MAX
		};
	},
	computed: $.extend( mapGetters( [
		'getRowByKeyPath',
		'getZMonolingualTextValue',
		'getZPersistentDescription'
	] ), {
		/**
		 * Returns the Short Description (Z2K5) row for the
		 * appropriate language
		 *
		 * @return {Object|undefined}
		 */
		descriptionObject: function () {
			return this.zLanguage ?
				this.getZPersistentDescription( this.zLanguage ) :
				undefined;
		},
		/**
		 * Returns true if the current zObject has a description object
		 *
		 * @return {boolean}
		 */
		hasDescription: function () {
			return this.descriptionObject !== undefined;
		},
		/**
		 * Returns the description value for the given language.
		 * If value is not available, returns empty string
		 *
		 * @return {string}
		 */
		description: function () {
			return this.hasDescription ?
				this.getZMonolingualTextValue( this.descriptionObject.rowId ) :
				'';
		},
		/**
		 * Returns the label for the description field
		 *
		 * @return {string}
		 */
		descriptionLabel: function () {
			// TODO (T335583): Replace i18n message with key label
			// return this.getLabel( Constants.Z_PERSISTENTOBJECT_DESCRIPTION );
			return this.$i18n( 'wikilambda-function-definition-description-label' ).text();
		},
		/**
		 * Returns the i18n message for the description field placeholder
		 *
		 * @return {string}
		 */
		descriptionInputPlaceholder: function () {
			return this.$i18n( 'wikilambda-function-definition-description-placeholder' ).text();
		},
		/**
		 * Returns the "optional" caption for the description field
		 *
		 * @return {string}
		 */
		descriptionOptional: function () {
			return this.$i18n( 'parentheses', [ this.$i18n( 'wikilambda-optional' ).text() ] ).text();
		},
		/**
		 * Returns the id for the input field
		 *
		 * @return {string}
		 */
		descriptionInputId: function () {
			return `ext-wikilambda-function-definition-description__input${this.zLanguage}`;
		}
	} ),
	methods: $.extend( mapActions( [
		'changeType',
		'removeItemFromTypedList',
		'setValueByRowIdAndPath'
	] ), {
		/**
		 * Persist the new name value in the globally stored object
		 *
		 * @param {Object} event
		 */
		persistDescription: function ( event ) {
			const value = event.target.value;
			if ( this.hasDescription ) {
				if ( value === '' ) {
					this.removeItemFromTypedList( { rowId: this.descriptionObject.rowId } );
				} else {
					this.setValueByRowIdAndPath( {
						rowId: this.descriptionObject.rowId,
						keyPath: [
							Constants.Z_MONOLINGUALSTRING_VALUE,
							Constants.Z_STRING_VALUE
						],
						value
					} );
				}
			} else {
				// If this.descriptionObject is undefined, there's no monolingual string
				// for the given language, so we create a new monolingual string
				// with the new value and append to the parent list.
				const parentRow = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_DESCRIPTION,
					Constants.Z_MULTILINGUALSTRING_VALUE
				] );
				if ( !parentRow ) {
					// This should never happen because all Z2Kn's are initialized
					return;
				}
				this.changeType( {
					id: parentRow.id,
					type: Constants.Z_MONOLINGUALSTRING,
					lang: this.zLanguage,
					value,
					append: true
				} );
			}
			this.$emit( 'updated-description' );
		}
	} )
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-definition-description {
	display: flex;
	margin-bottom: @spacing-150;

	&__label {
		display: flex;
		flex-direction: column;
		width: @wl-field-label-width;
		margin-right: @spacing-150;

		& > label {
			line-height: @size-200;
			font-weight: @font-weight-bold;

			& > span {
				color: @color-subtle;
				font-weight: @font-weight-normal;
			}
		}
	}

	/* MOBILE styles */
	@media screen and ( max-width: @width-breakpoint-tablet ) {
		& {
			flex-direction: column;

			&__input {
				width: 100%;
			}

			&__label {
				width: auto;

				& > label {
					margin-bottom: @spacing-25;
					line-height: inherit;
				}
			}

			&__description {
				font-size: @wl-font-size-description-mobile;
				line-height: @wl-line-height-description-mobile;
				letter-spacing: @wl-letter-spacing-description-mobile;
				margin-bottom: @spacing-50;
			}
		}
	}
}
</style>
