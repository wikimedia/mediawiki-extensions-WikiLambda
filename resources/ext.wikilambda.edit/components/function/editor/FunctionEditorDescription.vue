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
				class="ext-wikilambda-app__text-regular">
				<!-- TODO: Instead fetch this from the Z2 via `getLabel( Constants.Z_PERSISTENTOBJECT_DESCRIPTION )` -->
				{{ $i18n( 'wikilambda-function-definition-description-label' ).text() }}
				<span>{{ $i18n( 'parentheses', [ $i18n( 'wikilambda-optional' ).text() ] ).text() }}</span>
			</label>
			<span class="ext-wikilambda-function-definition-description__description">
				{{ $i18n( 'wikilambda-function-definition-description-description' ).text() }}
			</span>
		</div>
		<wl-text-input
			:id="descriptionInputId"
			v-model="monolingualDescriptionString"
			:model-value="monolingualDescriptionString"
			class="ext-wikilambda-function-definition-description__input"
			:aria-label="descriptionLabel"
			:placeholder="descriptionInputPlaceholder"
			:max-chars="maxDescriptionChars"
			@input="persistDescription"
		></wl-text-input>
		<!-- TODO: Add a character counter to tell users they can't write messages that are too long. -->
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	TextInput = require( '../../base/TextInput.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-editor-description',
	components: {
		'wl-text-input': TextInput
	},
	props: {
		zLang: {
			type: String,
			required: true
		}
	},
	data: function () {
		return {
			descriptionInputId: `ext-wikilambda-function-definition-description__input${this.zLang}`,
			maxDescriptionChars: Constants.LABEL_CHARS_MAX,
			monolingualDescriptionString: ''
		};
	},
	computed: $.extend( mapGetters( [
		'getZPersistentDescription',
		'getZMonolingualTextValue',
		'getRowByKeyPath'
	] ),

	{
		/**
		 * Returns the Short Description (Z2K5) row for the
		 * appropriate language
		 *
		 * @return {Object|undefined}
		 */
		descriptionObject: function () {
			if ( this.zLang === '' ) {
				return '';
			}
			return this.getZPersistentDescription( this.zLang );
		},
		/**
		 * Returns true if the current zObject has a description object
		 *
		 * @return {boolean}
		 */
		hasDescriptionObject: function () {
			return this.descriptionObject !== undefined;
		},
		/**
		 * Returns the i18n message for the description field placeholder
		 *
		 * @return {string}
		 */
		descriptionInputPlaceholder: function () {
			return this.$i18n( 'wikilambda-function-definition-description-placeholder' ).text();
		}

	} ),
	methods: $.extend( mapActions( [
		'changeType',
		'setValueByRowIdAndPath',
		'removeItemFromTypedList'
	] ), {
		persistDescription: function ( event ) {
			var value = event.target.value;
			if ( this.hasDescriptionObject ) {
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
					lang: this.zLang,
					value,
					append: true
				} );
			}
			this.$emit( 'updated-description' );
		}
	} ),
	beforeMount: function () {
		// fetch and populate the description string before
		// initial render
		this.monolingualDescriptionString = this.hasDescriptionObject ? this.getZMonolingualTextValue( this.descriptionObject.rowId ) : '';
	}
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
				font-weight: @font-weight-normal;
			}
		}
	}

	&__description {
		opacity: 0.8;
		color: @color-subtle;
		font-size: @wl-font-size-description;
		line-height: @wl-line-height-description;
		display: inline-block;
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
