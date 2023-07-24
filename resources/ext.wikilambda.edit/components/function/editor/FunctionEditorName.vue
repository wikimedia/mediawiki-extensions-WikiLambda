<!--
	WikiLambda Vue component for setting the name of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-definition-name">
		<div class="ext-wikilambda-function-definition-name__label">
			<label
				:for="inputId"
				class="ext-wikilambda-app__text-regular">
				<!-- TODO: Instead fetch this from the Z2 via `getLabel( Constants.Z_PERSISTENTOBJECT_LABEL )` -->
				{{ $i18n( 'wikilambda-function-definition-name-label' ).text() }}
				<span>({{ $i18n( 'wikilambda-optional' ).text() }})</span>
			</label>
			<span class="ext-wikilambda-function-definition-name__description">
				{{ $i18n( 'wikilambda-function-definition-name-description' ).text() }}
			</span>
		</div>

		<wl-text-input
			:id="inputId"
			:model-value="zobjectLabel"
			class="ext-wikilambda-function-definition-name__input"
			:aria-label="$i18n( 'wikilambda-function-definition-name-label' ).text()"
			:placeholder="$i18n( 'wikilambda-function-definition-name-placeholder' ).text()"
			:max-chars="maxLabelChars"
			@input="setZObjectLabel"
		></wl-text-input>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	TextInput = require( '../../base/TextInput.vue' ),
	debounceSetZObjectLabelTimeout = 300;

// @vue/component
module.exports = exports = {
	name: 'wl-function-editor-name',
	components: {
		'wl-text-input': TextInput
	},
	props: {
		zobjectId: {
			type: Number,
			default: 0
		},
		isMainZObject: {
			type: Boolean
		},
		/**
		 * zID of item label language
		 *
		 * @example Z1014
		 *
		 */
		zLang: {
			type: String,
			required: true
		}
	},
	data: function () {
		return {
			maxLabelChars: Constants.LABEL_CHARS_MAX,
			debounceSetZObjectLabel: null
		};
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getZObjectLabel'
	] ), {
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		getFunctionNameMultilingualId: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			] ).id;
		},
		inputId: function () {
			return `ext-wikilambda-function-definition-name__input${this.zLang}`;
		},
		getFunctionName: function () {
			if ( this.zLang === '' ) {
				return '';
			}
			return this.getZObjectLabel( this.zLang );
		},
		zobjectLabel: {
			get: function () {
				return this.getFunctionName ? this.getFunctionName.value : '';
			},
			set: function ( value ) {
				var id = this.getFunctionName.id;
				if ( !id ) {
					this.changeType( {
						type: Constants.Z_MONOLINGUALSTRING,
						lang: this.zLang,
						id: this.getFunctionNameMultilingualId,
						append: true
					} );
				}
				var payload = {
					id: this.getFunctionName.id,
					value: value,
					isMainZObject: this.isMainZObject
				};
				this.setPageZObjectValue( payload );
				this.$emit( 'updated-name' );
			}
		}
	} ),
	methods: $.extend( mapActions( [
		'setPageZObjectValue',
		'changeType'
	] ), {
		/**
		 * This method debounces the change in the model for performance
		 *
		 * @param {Event} event The input event
		 */
		setZObjectLabel( event ) {
			const input = event.target.value;
			clearTimeout( this.debounceSetZObjectLabel );
			this.debounceSetZObjectLabel = setTimeout( function () {
				this.zobjectLabel = input;
			}.bind( this ), debounceSetZObjectLabelTimeout );
		}
	} ),
	watch: {
		zLang: function () {
			this.zobjectLabel = null;
		}
	}
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-definition-name {
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
