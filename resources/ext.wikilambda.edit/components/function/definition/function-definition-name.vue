<template>
	<!--
		WikiLambda Vue component for setting the name of a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-name">
		<div>
			<label for="ext-wikilambda-function-definition-name__input" class="ext-wikilambda-app__text-regular">
				{{ functionNameLabel }}
			</label>
			<!-- TODO: replace href with correct URL: T298479 -->
			<a href="#" class="ext-wikilambda-app__text-smaller">
				{{ $i18n( 'wikilambda-function-definition-name-example' ) }}
			</a>
		</div>

		<input
			id="ext-wikilambda-function-definition-name__input"
			:value="zobjectLabel"
			class="ext-wikilambda-text-input"
			:aria-label="$i18n( 'wikilambda-function-definition-name-label' )"
			:placeholder="$i18n( 'wikilambda-function-definition-name-placeholder' )"
			@input="zobjectLabel = $event.target.value"
		>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = {
	name: 'FunctionDefinitionName',
	props: {
		zobjectId: {
			type: Number,
			default: 0
		}
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getZkeyLabels',
		'getUserZlangZID',
		'getNextObjectId',
		'getCurrentZLanguage'
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
		getFunctionMonolingualNames: function () {
			return this.getZObjectChildrenById( this.getFunctionNameMultilingualId );
		},
		getFunctionName: function () {
			var labelObject,
				label;

			for ( var index in this.getFunctionMonolingualNames ) {
				var maybeLabel = this.getFunctionMonolingualNames[ index ],
					language = this.getNestedZObjectById( maybeLabel.id, [
						Constants.Z_MONOLINGUALSTRING_LANGUAGE,
						Constants.Z_REFERENCE_ID
					] );

				if ( language.value === this.getCurrentZLanguage ) {
					labelObject = maybeLabel;
				}
			}

			if ( labelObject ) {
				label = this.getNestedZObjectById( labelObject.id, [
					Constants.Z_MONOLINGUALSTRING_VALUE,
					Constants.Z_STRING_VALUE
				] );
			}

			return label;
		},
		zobjectLabel: {
			get: function () {
				return this.getFunctionName ? this.getFunctionName.value : '';
			},
			set: function ( value ) {
				var payload = {
					id: this.getFunctionName.id,
					value: value
				};
				this.setPageZObjectValue( payload );
			}
		},
		functionNameLabel: function () {
			return this.$i18n( 'wikilambda-function-definition-name-label' ) + ' ( ' + this.$i18n( 'wikilambda-optional' ) + ' )';
		}
	} ),
	methods: $.extend( mapActions( [
		'setPageZObjectValue'
	] ) )
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-definition-name {
	display: flex;
	margin-bottom: 26px;

	& > div {
		display: flex;
		flex-direction: column;
		width: 153px;
	}

	input {
		width: 300px;
		height: 20px;
		padding: 4px 6px;
	}
}
</style>
