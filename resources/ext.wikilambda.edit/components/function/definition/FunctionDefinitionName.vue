<template>
	<!--
		WikiLambda Vue component for setting the name of a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-name">
		<div class="ext-wikilambda-function-definition-name__label">
			<label
				:for="'ext-wikilambda-function-definition-name__input' + zLang"
				class="ext-wikilambda-app__text-regular">
				{{ functionNameLabel }}
			</label>
			<span class="ext-wikilambda-function-definition-name__description">
				{{ $i18n( 'wikilambda-function-definition-name-description' ).text() }}
			</span>
		</div>

		<cdx-text-input
			:id="'ext-wikilambda-function-definition-name__input' + zLang"
			v-model="zobjectLabel"
			class="ext-wikilambda-function-definition-name__input"
			:aria-label="$i18n( 'wikilambda-function-definition-name-label' ).text()"
			:placeholder="$i18n( 'wikilambda-function-definition-name-placeholder' ).text()"
		></cdx-text-input>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	CdxTextInput = require( '@wikimedia/codex' ).CdxTextInput;

// @vue/component
module.exports = exports = {
	name: 'function-definition-name',
	components: {
		'cdx-text-input': CdxTextInput
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
					this.addZMonolingualString( {
						parentId: this.getFunctionNameMultilingualId,
						lang: this.zLang
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
		},
		functionNameLabel: function () {
			return this.$i18n( 'wikilambda-function-definition-name-label' ).text() + ' (' + this.$i18n( 'wikilambda-optional' ).text() + ')';
		}
	} ),
	methods: $.extend( mapActions( [
		'setPageZObjectValue',
		'addZMonolingualString'
	] ) ),
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
	margin-bottom: 26px;

	&__label {
		display: flex;
		flex-direction: column;
		width: 153px;
	}

	&__input {
		width: 300px;
	}

	&__description {
		color: @wmui-color-base20;
	}

	@media screen and ( max-width: @width-breakpoint-tablet ) {
		& {
			flex-direction: column;

			&__input {
				width: 100%;
			}

			&__label {
				width: auto;
			}
		}
	}
}
</style>
